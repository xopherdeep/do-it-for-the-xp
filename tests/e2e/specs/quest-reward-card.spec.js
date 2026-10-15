// The reward slide of the quest card: claiming a quest shows the hero's stat card (HP, MP, GP, XP and AP) and
// counts the XP and AP up to the hero's new totals, with no "beginCounter is not a function" error on the way.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/quest-reward-card.spec.js

const shot = (name) => {
  cy.wait(300);
  cy.screenshot(name, { capture: "viewport" });
};

/** The battle fixture's hero with one extra quest: a plain daily chore (claimed from the log, not fought). */
const withBedChore = (backup) => {
  const world = JSON.parse(JSON.stringify(backup));
  const socks = world.stores.__achievements[0].value;
  world.stores.__achievements.push({
    key: "quest-bed",
    value: {
      ...socks,
      id: "quest-bed",
      achievementName: "Make the bed",
      beastId: "",
      adventureType: "simple",
      xp: 60,
      gp: 10,
      ap: 3,
    },
  });
  return world;
};

describe("Quest reward card", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("shows the hero's stat card counting up after a claim, without a console error", () => {
    cy.fixture("battle-backup.json").then((backup) => {
      cy.visit("/", {
        timeout: 120000,
        onBeforeLoad(win) {
          win.localStorage.setItem("xp.battleAlerts", "off");
        },
      });
      cy.window({ timeout: 60000 }).should((win) => {
        expect(win.__xp, "development seam window.__xp").to.be.an("object");
      });
      cy.window().then((win) => win.__xp.signInSeedGameMaster());
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(withBedChore(backup)), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded").to.eq(true);
      });
    });

    // Collect every console error from here on, so a swallowed handler error still fails the check
    cy.visit("/my-tasks/hero-1", {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
        win.__consoleErrors = [];
        const original = win.console.error.bind(win.console);
        win.console.error = (...args) => {
          win.__consoleErrors.push(args.map(String).join(" "));
          original(...args);
        };
      },
    });
    cy.tapToWakeAudio();
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get("ion-card#quest-bed", { timeout: 30000 }).scrollIntoView().should("be.visible");
    cy.get("ion-card#quest-bed").click();
    cy.get("ion-modal ion-card-title", { timeout: 20000 }).should("contain", "Make The Bed");

    // Claim it: the fab menu opens by itself, "Claim" asks, "Yes" records it and slides to the rewards
    cy.contains("ion-modal ion-fab-list ion-button", "Claim", { timeout: 20000 }).should("be.visible");
    cy.wait(600);
    cy.contains("ion-modal ion-fab-list ion-button", "Claim").click();
    cy.contains("ion-alert button", "Yes", { timeout: 10000 }).click();

    // The reward slide carries the hero's own stat card
    cy.get("ion-modal ion-card.user-stats", { timeout: 20000 }).scrollIntoView().should("be.visible");
    cy.get("ion-modal ion-card.user-stats").should("contain", "Max");
    // The bars span the card beside the avatar (the header's flex column once shrank them to 75px)
    cy.get("ion-modal ion-card.user-stats ion-card-header ion-progress-bar").first().should(($bar) => {
      expect($bar[0].getBoundingClientRect().width, "HP bar width").to.be.greaterThan(150);
    });

    // The count-up lands on the hero's real level, XP and AP
    cy.window().then((win) => {
      const { xp, ap, level } = win.__xp.getUser("hero-1").stats;
      expect(xp.now, "the claim paid its XP").to.be.greaterThan(300);
      cy.get("ion-modal ion-card.user-stats", { timeout: 15000 }).should(($card) => {
        const text = $card.text().replace(/\s+/g, " ");
        expect(text).to.contain(`Level ${level}`);
        expect(text).to.contain(`${xp.now.toLocaleString("en-US")}XP`);
        expect(text).to.contain(`${ap.total.toLocaleString("en-US")} AP`);
        expect(text).to.contain(`/ ${xp.next_level}`);
      });
    });
    shot("quest-reward-card");

    cy.window().then((win) => {
      const beginCounterErrors = win.__consoleErrors.filter((line) => /beginCounter/.test(line));
      expect(beginCounterErrors, "beginCounter console errors").to.deep.eq([]);
    });
  });
});
