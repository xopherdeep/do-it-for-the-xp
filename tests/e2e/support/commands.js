// Custom Cypress commands for the Do It For The XP e2e suite.
// Seeding goes through the development-only `window.__xp` seam in src/main.ts, which restores a
// backup file into every local store (the same code path as Settings > Restore) and signs a hero in.

/**
 * Quiets the one-time first-run seams that would otherwise cover a screen under test: the ambush-alert
 * ask (battle.guard) and the portal's first-run tour (XpFirstRunTour, keyed `xp.tour.<heroId>` in
 * src/lib/services/tutorial/firstRunTour.ts). Call it inside an `onBeforeLoad` with the window and the
 * heroes the spec signs in. Every `cy.visit` already runs it for the fixture cast (see the overwrite
 * below), so a spec only needs it for a hero outside that cast.
 */
const FIXTURE_CAST = ["gm-1", "hero-1", "hero-2"];
Cypress.quietSeams = (win, heroIds = FIXTURE_CAST) => {
  win.localStorage.setItem("xp.battleAlerts", "off");
  heroIds.forEach((heroId) => win.localStorage.setItem(`xp.tour.${heroId}`, "seen"));
};

/**
 * A copy of `backup` whose heroes have already heard the Guide's welcome (`guide.introSeen` on the profile,
 * src/lib/services/guide/guideState.ts). That record rides in backups, so the Guide's "Your big quest" prompt
 * is quieted by restoring this copy rather than by a localStorage key. Use it around every inline restore.
 */
Cypress.withGuideSeen = (backup) => {
  const copy = JSON.parse(JSON.stringify(backup));
  const profiles = copy && copy.stores && copy.stores.__profiles;
  if (!Array.isArray(profiles)) return copy;
  profiles.forEach((entry) => {
    entry.value.guide = { ...entry.value.guide, introSeen: true };
  });
  return copy;
};

/**
 * Loads a backup fixture into the app's stores and signs `heroId` in.
 * Visits the app root first so the seam exists, then the caller navigates wherever the test needs.
 */
Cypress.Commands.add("seedWorld", (fixtureName = "battle-backup.json", heroId = "hero-1") => {
  cy.fixture(fixtureName).then((backup) => {
    cy.visit("/", {
      timeout: 120000,
      // The hero has already answered the one-time ambush-alert ask (see battle.guard), so its dialog
      // never covers a spec.
      onBeforeLoad(win) {
        Cypress.quietSeams(win, [heroId]);
      },
    });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    // Restore is Game Master only: sign in as a throwaway Game Master first (the restore drops that profile)
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(backup)), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser(heroId), `hero ${heroId} is loaded`).to.eq(true);
    });
  });
});

/**
 * Brings the subject to the middle of the screen with the browser's own scrollIntoView. Cypress's `.scrollIntoView()` does
 * not reach the scroller inside `ion-content` (a shadow root), so a row below the fold stays "not visible" and `click()`
 * scrolls it under the fixed header. This one scrolls the page's real scroller.
 */
Cypress.Commands.add("scrollToCenter", { prevSubject: "element" }, (subject) => {
  subject[0].scrollIntoView({ block: "center" });
  return cy.wrap(subject, { log: false });
});

/**
 * Picks the Game Style (`rpg`, e.g. "zelda") and the menu skin (`fabStyle`, "retro" or "modern") for the next load.
 * Both are read from localStorage when the app starts (src/lib/utils/gameStyle.ts, src/lib/store/stores/game.ts), so call
 * it after cy.seedWorld() has opened the app and follow it with a cy.visit.
 */
Cypress.Commands.add("useGameStyle", (rpg, fabStyle) => {
  cy.window().then((win) => {
    win.localStorage.setItem("xp.themeChoice", JSON.stringify({ ui: "nintendo", rpg }));
    win.localStorage.setItem("fabStyle", fabStyle);
  });
});

/** Marks the page as user-interacted so the app's sound effects do not throw autoplay errors. */
Cypress.Commands.add("tapToWakeAudio", () => {
  cy.document().then((doc) => doc.documentElement.setAttribute("data-user-interacted", "true"));
});

/**
 * Every visit skips the studio splash (src/components/organisms/Splash) so the first tap of a test
 * reaches the page instead of dismissing the splash. The flag is read on app start, so it has to be
 * in localStorage before the page scripts run; the caller's own onBeforeLoad still runs after it.
 */
Cypress.Commands.overwrite("visit", (originalFn, url, options = {}) => {
  const callerBeforeLoad = options.onBeforeLoad;
  return originalFn(url, {
    ...options,
    onBeforeLoad(win) {
      win.localStorage.setItem("xpSkipSplash", "1");
      Cypress.quietSeams(win);
      const hasCallerHook = typeof callerBeforeLoad === "function";
      if (hasCallerHook) callerBeforeLoad(win);
    },
  });
});
