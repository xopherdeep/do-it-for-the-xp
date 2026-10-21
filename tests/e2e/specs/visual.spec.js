// Visual baseline harness: one phone-sized (390x844) screenshot per screen, so a styles-only refactor
// (theme split, colour/font tokens, shared keyframes) can be proven pixel-neutral.
//
// Use (development server only: the spec needs the `window.__xp` seam):
//   1. Serve the code you want as the "before" (a clean checkout of HEAD, not a tree that is being edited) and run
//        pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:<port> --spec tests/e2e/specs/visual.spec.js
//      The pictures land in tests/e2e/screenshots/visual.spec.js/ (390x844 PNGs named by screen). Copy them away:
//      that folder is the baseline. 00-warm-up.png is a throwaway and is never compared.
//   2. Make the change, serve it, run the same command, and compare each picture with its baseline twin, e.g.
//        compare -metric AE -fuzz 1% base/<screen>.png after/<screen>.png diff/<screen>.png   (prints the differing pixels)
//      Run the baseline twice first: a screen that already differs between two identical runs is noise, and the
//      baseline's own noise floor is what an "after" run is allowed to differ by.
//   3. `--env visualOnly=14,15,world` (comma or semicolon list of words in the screen names) runs just those screens.
//
// Every screen is its own test: it loads a fresh page, restores a seeded world (the battle fixture plus a Game Master,
// a second hero, quests, approvals and a purchase) through the dev seam, opens the screen by driving the real router,
// freezes motion, and screenshots the viewport. Nothing but the Google web fonts leaves the machine (the Compass news is
// stubbed, the XP Pro server and the music bucket are refused), so the screens never depend on the network.
// Motion is frozen with the Web Animations API (finite animations jump to their end, endless ones stop at a fixed frame),
// so keyframes still take part in the picture; canvases (weather, the voxel hero, battle and temple scenery) are hidden
// because WebGL / 2D frames are not deterministic. Things that run on their own clocks (battle timers, a typed line,
// a script-driven swing) are hidden or stilled per screen in `shot()`'s arguments.

const GM_ID = "gm-1";
const HERO_ID = "hero-1";
const HERO2_ID = "hero-2";

/** Everything that moves on its own, or is not deterministic, is parked before a shot. */
const FREEZE_CSS = `
*, *::before, *::after { caret-color: transparent !important; scroll-behavior: auto !important; }
canvas { visibility: hidden !important; }
`;

// ---------------------------------------------------------------------------------------------------------------
// The seeded world
// ---------------------------------------------------------------------------------------------------------------


/** What the Compass site's news feed answers (Town Hall > News). */
const NEWS = [
  {
    id: 101,
    date: "2026-09-01T12:00:00",
    title: { rendered: "The Great Sock Uprising" },
    excerpt: { rendered: "<p>Heroes everywhere report matching pairs. The Socktopus has been spotted near the laundry.</p>" },
    content: { rendered: "" },
    link: "https://example.invalid/the-great-sock-uprising",
    featured_media: 0,
    categories: [1],
    _embedded: { "wp:term": [[{ name: "Bestiary" }]] },
  },
  {
    id: 102,
    date: "2026-08-12T09:30:00",
    title: { rendered: "New Temple Opens" },
    excerpt: { rendered: "<p>The Howling Spire is open to any hero who has freed a Pegasus.</p>" },
    content: { rendered: "" },
    link: "https://example.invalid/new-temple-opens",
    featured_media: 0,
    categories: [2],
    _embedded: { "wp:term": [[{ name: "Temples" }, { name: "News" }]] },
  },
];

const hero = (base, patch) => ({ ...base, ...patch });

/** The battle fixture (hero-1 Max, Socktopus, one quest) plus the rest of a family. */
const buildWorld = (fixture) => {
  const backup = JSON.parse(JSON.stringify(fixture));
  const stores = backup.stores;
  const max = stores.__profiles[0].value;
  // Max has freed two Pegasi, so the overworld and the regions are open to him; Luna is still on foot
  max.stats.pegasi = [true, true, false, false, false, false, false, false, false];

  const gm = hero(max, {
    id: GM_ID,
    passcode: "1234",
    name: { full: "Chris Power", first: "Chris", last: "Power", middle: "", nick: "Dad" },
    birthday: "1984-02-03",
    avatar: "010-gamer",
    favoriteThing: "coffee",
    favoriteFood: "burger",
    jobClass: "paladin",
    isAdult: true,
    inventory: [],
  });
  const luna = hero(max, {
    id: HERO2_ID,
    name: { full: "Luna Power", first: "Luna", last: "Power", middle: "", nick: "Luna" },
    birthday: "2019-09-20",
    avatar: "007-gamer",
    favoriteThing: "unicorns",
    favoriteFood: "cake",
    jobClass: "mage",
    isAdult: false,
    stats: { ...max.stats, pegasi: [false, false, false, false, false, false, false, false, false], level: 2, xp: { ...max.stats.xp, now: 150, next_level: 400 }, gp: { ...max.stats.gp, wallet: 12, savings: 30 } },
    inventory: [],
  });
  stores.__profiles.push({ key: GM_ID, value: gm }, { key: HERO2_ID, value: luna });

  stores.__abilities.push({
    key: "ability-screen-time",
    value: {
      id: "ability-screen-time",
      name: "Extra Screen Time",
      description: "Thirty bonus minutes of screen time.",
      type: "real-life",
      frequency: "daily",
      mpCost: 0,
      apRequirement: { amount: 2, period: "daily" },
      icon: "fa-tv",
      prerequisites: [],
      isPreset: false,
      position: { x: 120, y: 0 },
    },
  });

  stores.__achievementCategories.push({ key: "cat-pets", value: { id: "cat-pets", name: "Pets and Plants" } });
  const quest = (id, name, categoryId, patch) => ({
    key: id,
    value: {
      ...stores.__achievements[0].value,
      id,
      achievementName: name,
      categoryId,
      beastId: "",
      ...patch,
    },
  });
  stores.__achievements.push(
    quest("quest-dishes", "Banish the Dish Goblin", "cat-home", { beastId: "beast-dishgoblin", assignee: [HERO_ID, HERO2_ID], difficulty: 3, xp: 90, gp: 20, ap: 1 }),
    quest("quest-dog", "Feed the Wolfhound", "cat-pets", { adventureType: "quest", assignee: [HERO_ID], requiresApproval: true, xp: 60, gp: 15, ap: 1, dueByTime: "18:00" }),
    quest("quest-plants", "Water the Mandrakes", "cat-pets", { adventureType: "quest", assignee: [HERO2_ID], basicSchedule: "weekly", xp: 40, gp: 10, ap: 1 }),
    quest("quest-bonus", "Rake the Haunted Leaves", "cat-home", { adventureType: "quest", assignee: [HERO_ID], bonusAchievement: true, xp: 200, gp: 60, ap: 3, difficulty: 4 }),
  );
  stores.__beasts[1].value.achievementIds = ["quest-dishes"];

  stores.__questLog.push(
    {
      key: "log-1",
      value: {
        id: "log-1",
        questId: "quest-dog",
        questName: "Feed the Wolfhound",
        userId: HERO_ID,
        completedAt: "2026-10-09T15:30:00.000Z",
        dayKey: "2026-10-09",
        status: "pending",
        source: "claim",
        rewards: { xp: 60, gp: 15, ap: 1 },
        rewardsApplied: false,
      },
    },
    {
      key: "log-2",
      value: {
        id: "log-2",
        questId: "quest-socks",
        questName: "Tame the Socktopus",
        userId: HERO2_ID,
        completedAt: "2026-10-08T14:00:00.000Z",
        dayKey: "2026-10-08",
        status: "approved",
        source: "battle",
        rewards: { xp: 120, gp: 30, ap: 2 },
        rewardsApplied: true,
        reviewedAt: "2026-10-08T18:00:00.000Z",
        reviewedBy: GM_ID,
      },
    },
  );

  stores.__purchaseLog = [
    {
      key: "buy-1",
      value: { id: "buy-1", userId: HERO_ID, itemId: "item-ice-cream", itemName: "Ice Cream Trip", price: 40, status: "pending", createdAt: "2026-10-09T16:00:00.000Z" },
    },
  ];
  return backup;
};

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;

/** Walks the Vue component tree and returns the first instance matching `test`. */
const findInstance = (win, test) => {
  const root = win.document.querySelector("#app").__vue_app__._instance;
  const walk = (vnode) => {
    if (!vnode) return null;
    const instance = vnode.component;
    if (instance && test(instance)) return instance;
    if (instance) {
      const inner = walk(instance.subTree);
      if (inner) return inner;
    }
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        const found = child && typeof child === "object" ? walk(child) : null;
        if (found) return found;
      }
    }
    if (vnode.suspense && vnode.suspense.activeBranch) return walk(vnode.suspense.activeBranch);
    return null;
  };
  return walk(root.subTree);
};

/** Calls a method of the page component that owns the element (Ionic's own ion-page wrapper sits in between, so walk up). */
const callPageMethod = (selector, method, ...args) =>
  cy.get(selector, { timeout: 30000 }).then(($el) => {
    let instance = $el[0].__vueParentComponent;
    while (instance && !(instance.proxy && typeof instance.proxy[method] === "function")) instance = instance.parent;
    expect(instance, `a component with ${method}() above ${selector}`).to.be.an("object");
    // not returned: some of these (the bank's menu) only resolve when the sheet is dismissed
    instance.proxy[method](...args);
  });

/** Sets a piece of state on the page component that owns the element (a segment's v-model, where a synthetic click would not reach). */
const setPageData = (selector, key, value) =>
  cy.get(selector, { timeout: 30000 }).then(($el) => {
    let instance = $el[0].__vueParentComponent;
    while (instance && !(instance.proxy && key in instance.proxy)) instance = instance.parent;
    expect(instance, `a component with ${key} above ${selector}`).to.be.an("object");
    instance.proxy[key] = value;
  });

/**
 * A fresh world in a fresh page: loads the app, restores the seeded backup (Game Master only, so as the throwaway
 * Game Master the dev seam offers), then signs `loginId` in. Pass null to leave nobody signed in.
 */
const seed = (loginId, { random } = {}) => {
  cy.fixture("battle-backup.json").then((fixture) => {
    const backup = buildWorld(fixture);
    // Nothing but the Google web fonts leaves the machine: the Compass news, the XP Pro server and the music bucket are
    // stubbed or refused, so what the screens show never depends on the network.
    cy.intercept({ url: /^https?:\/\/(?!localhost|127\.0\.0\.1|fonts\.googleapis\.com|fonts\.gstatic\.com)/ }, { statusCode: 404, body: {} });
    cy.intercept({ url: /^https:\/\/doit\.forthexp\.com\/wp-json\/wp\/v2\/posts/ }, { statusCode: 200, headers: { "X-WP-TotalPages": "1" }, body: NEWS });
    cy.visit("/xp-intro", {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
        // A page that rolls dice for what it shows (the party's online dots) gets the same roll every time
        if (random !== undefined) win.Math.random = () => random;
      },
    });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(backup)), { timeout: 60000 }));
    if (loginId) {
      cy.window().then((win) => {
        expect(win.__xp.loginUser(loginId), `${loginId} is loaded`).to.eq(true);
      });
    }
    cy.tapToWakeAudio();
  });
};

/**
 * Drives the real router to `path` and waits for it to land. A page that redirects (a hub that opens its first tab)
 * passes the prefix it may end under as `landsUnder`.
 */
const go = (path, landsUnder) => {
  cy.window().then((win) => routerOf(win).push(path));
  const wanted = path.split("?")[0].replace(/\/$/, "") || "/";
  cy.location("pathname", { timeout: 30000 }).should(landsUnder ? "satisfy" : "eq", landsUnder ? (value) => value.startsWith(landsUnder) : wanted);
};

/** Waits for the page to be quiet: webfonts loaded, images decoded, the page transition over. */
const settle = (ms = 1200) => {
  cy.wait(ms);
  cy.window().then((win) =>
    win.document.fonts.ready.then(() =>
      Promise.all(Array.from(win.document.images).map((img) => (img.decode ? img.decode().catch(() => undefined) : undefined))),
    ),
  );
};

/** Parks every running animation: finite ones jump to their last frame, endless ones stop at a fixed frame. */
const freezeMotion = (win) => {
  const doc = win.document;
  if (!doc.getElementById("xp-visual-freeze")) {
    const style = doc.createElement("style");
    style.id = "xp-visual-freeze";
    style.textContent = FREEZE_CSS;
    doc.head.appendChild(style);
  }
  const park = () => {
    doc.getAnimations().forEach((animation) => {
      try {
        const timing = animation.effect.getComputedTiming();
        if (Number.isFinite(timing.endTime)) {
          animation.finish();
          // A finite animation that ends invisible (a card that slides in, holds, and fades out) is parked halfway instead
          const target = animation.effect.target;
          const isCssAnimation = animation instanceof win.CSSAnimation;
          if (isCssAnimation && target && win.getComputedStyle(target).opacity === "0") {
            animation.pause();
            animation.currentTime = (timing.delay || 0) + timing.duration * 0.5;
          }
        } else {
          animation.pause();
          animation.currentTime = (timing.delay || 0) + 250;
        }
      } catch {
        // an animation that cannot be parked stays as it is; the noise check will flag the screen
      }
    });
  };
  park();
  if (doc.activeElement && doc.activeElement !== doc.body) doc.activeElement.blur();
  return new Promise((resolve) => win.setTimeout(() => { park(); resolve(); }, 120));
};

/**
 * Settles, freezes motion, and takes the viewport screenshot called `name`.
 * `hide` lists selectors for things that tick on their own (clocks, timers, typed lines) and are hidden for the shot;
 * `css` is extra CSS for the shot (to stop a script-driven animation that the Web Animations freeze cannot reach).
 */
const shot = (name, ms, hide = [], css = "") => {
  settle(ms);
  cy.window().then((win) => {
    const doc = win.document;
    const style = doc.getElementById("xp-visual-hide") || doc.head.appendChild(Object.assign(doc.createElement("style"), { id: "xp-visual-hide" }));
    style.textContent = `${hide.length ? `${hide.join(",")} { visibility: hidden !important; }` : ""}\n${css}`;
    return freezeMotion(win);
  });
  cy.wait(150);
  cy.screenshot(name, { capture: "viewport", overwrite: true, disableTimersAndAnimations: false });
};

/** Clicks the first visible match (ion pages stack, so hidden copies of a selector can exist underneath). */
const tap = (selector, options = {}) => {
  cy.get(`.ion-page:not(.ion-page-hidden) ${selector}, ${selector}`, { timeout: 30000 })
    .filter(":visible")
    .first()
    .click({ force: true, ...options });
};

/**
 * `it`, but `--env visualOnly=14,15,world` (comma or semicolon list) runs just the screens whose name contains
 * one of the words (handy while iterating). Without it every screen runs.
 */
const screen = (name, fn) => {
  const only = Cypress.env("visualOnly");
  const wanted = only === undefined ? [] : String(only).split(/[;,]/).map((word) => word.trim()).filter(Boolean);
  if (wanted.length && !wanted.some((word) => name.includes(word))) return it.skip(name, fn);
  return it(name, fn);
};

// ---------------------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------------------

describe("Visual baseline: signing in", () => {
  // The very first test of a Cypress run is laid out while the runner is still settling, so its picture is a pixel or
  // two off from one run to the next. This throwaway takes that hit; it is never compared (00-warm-up.png).
  it("00 warm up", () => {
    seed(null);
    go("/xp-intro");
    shot("00-warm-up", 1500);
  });

  screen("01 press start", () => {
    seed(null);
    go("/log-in");
    cy.get("#brand", { timeout: 30000 }).should("exist");
    // LogIn.animateLogo() swings #brand with requestAnimationFrame; the Web Animations freeze cannot reach it
    shot("01-press-start", 1500, [], "#brand { transform: none !important; }");
  });

  screen("02 choose a profile", () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    shot("02-choose-profile");
  });

  screen("03 choose a profile as a list", () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    tap(".view-toggle-btn");
    cy.get(".retro-view", { timeout: 10000 }).should("exist");
    shot("03-choose-profile-list");
  });
});

describe("Visual baseline: profiles", () => {
  screen("04 passcode pad", () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    cy.get(".profile-card-col .xp-profile-card").first().click({ force: true });
    cy.get(".dialpad-container", { timeout: 20000 }).should("be.visible");
    shot("04-passcode-pad");
  });

  screen("05 backup action sheet", () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    cy.get(".ion-page:not(.ion-page-hidden) ion-buttons[slot=end] ion-button").last().click({ force: true });
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    shot("05-backup-action-sheet");
  });

  screen("06 restore alert", () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    cy.get(".ion-page:not(.ion-page-hidden) ion-buttons[slot=end] ion-button").last().click({ force: true });
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    cy.wait(600);
    cy.contains("ion-action-sheet button", "Restore From Backup").click({ force: true });
    cy.get("ion-alert", { timeout: 20000 }).should("exist");
    shot("06-restore-alert");
  });

  const openNewProfile = () => {
    seed(null);
    go("/xp-profile");
    cy.get(".profile-card-col", { timeout: 30000 }).should("have.length", 3);
    tap("ion-fab.fab-pulse ion-fab-button");
    cy.get(".gamer-card", { timeout: 20000 }).should("be.visible");
  };

  screen("07 add profile: gamer card and form", () => {
    openNewProfile();
    shot("07-add-profile");
  });

  screen("08 add profile: pick a face", () => {
    openNewProfile();
    // Since 893414e6 the avatar opens the 3D builder first; the portraits are one tap away
    cy.get("#avatar-trigger").click({ force: true });
    cy.get("[data-cy=look-use-portrait]", { timeout: 60000 }).click({ force: true });
    cy.get(".face-modal .face-tile", { timeout: 20000 }).should("have.length.greaterThan", 3);
    shot("08-add-profile-faces", 1500);
  });

  screen("09 add profile: pick a class", () => {
    openNewProfile();
    cy.get("#class-trigger").click({ force: true });
    cy.get("ion-modal.job-class-selector", { timeout: 20000 }).should("exist");
    shot("09-add-profile-class");
  });

  screen("10 add profile: pick a food", () => {
    openNewProfile();
    cy.get("#food-trigger").click({ force: true });
    cy.get("ion-modal.food-selector-modal", { timeout: 20000 }).should("exist");
    shot("10-add-profile-food");
  });

  screen("11 add profile: 3D look", () => {
    openNewProfile();
    // The avatar opens the 3D builder directly (before 893414e6 it went through the portrait picker's "Build my hero in 3D")
    cy.get("#avatar-trigger").click({ force: true });
    cy.get("ion-modal.hero-builder [data-cy=starter-hero] img", { timeout: 60000 }).should("have.length", 9);
    shot("11-add-profile-look", 2500);
  });

  screen("12 intro", () => {
    seed(null);
    go("/xp-intro");
    // the intro plays its splash screens on a timer: the first one, with its typed line hidden
    shot("12-intro", 1500, [".splash-text"]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The hero's portal
// ---------------------------------------------------------------------------------------------------------------

/** A page that needs nothing but a signed-in hero and a route. */
const PAGES = [
  ["13-my-home", HERO_ID, `/my-portal/${HERO_ID}/my-home`],
  ["17-home-town", HERO_ID, `/my-portal/${HERO_ID}/home-town`],
  ["18-world-map", HERO_ID, `/my-portal/${HERO_ID}/world-map`],
  ["19-world-plains", HERO_ID, `/my-portal/${HERO_ID}/plains`],
  ["20-world-forest", HERO_ID, `/my-portal/${HERO_ID}/forest`],
  ["21-world-islands", HERO_ID, `/my-portal/${HERO_ID}/islands`],
  ["22-world-swamps", HERO_ID, `/my-portal/${HERO_ID}/swamps`],
  ["23-world-mountains", HERO_ID, `/my-portal/${HERO_ID}/mountains`],
  ["24-world-sands", HERO_ID, `/my-portal/${HERO_ID}/sands`],
  ["25-world-clouds", HERO_ID, `/my-portal/${HERO_ID}/clouds`],
  ["26-world-ice", HERO_ID, `/my-portal/${HERO_ID}/world-ice`],
  ["27-world-moon", HERO_ID, `/my-portal/${HERO_ID}/the-moon`],
  ["28-my-quests", HERO_ID, `/my-tasks/${HERO_ID}`],
  ["30-my-inventory", HERO_ID, `/my-inventory/${HERO_ID}`],
  ["31-my-abilities", HERO_ID, `/my-abilities/${HERO_ID}`],
  ["32-my-gold", HERO_ID, `/my-gold-points/${HERO_ID}`],
  ["33-my-profile", HERO_ID, `/my-portal/${HERO_ID}/my-profile`],
  ["35-shop", HERO_ID, `/shop/wrecked-ship/${HERO_ID}`],
  ["36-bank", HERO_ID, `/bank/${HERO_ID}`],
  ["37-hospital", HERO_ID, `/hospital/${HERO_ID}`],
  ["38-hotel", HERO_ID, `/hotel/${HERO_ID}`],
  ["39-town-hall", HERO_ID, `/town-hall/${HERO_ID}`],
  ["40-hero-stats", HERO_ID, `/user-stats/${HERO_ID}`],
  ["54-my-storage", HERO_ID, `/storage/${HERO_ID}`],
  ["55-my-kitchen", HERO_ID, `/cook-food/${HERO_ID}`],
  ["56-my-workbench", HERO_ID, `/craft-item/${HERO_ID}`],
];

describe("Visual baseline: the hero's portal", () => {
  // The party roster rolls Math.random for who is online and busy; every roll is fixed at 0.9 (everybody online, questing)
  screen("16-my-party", () => {
    seed(HERO_ID, { random: 0.9 });
    go(`/my-portal/${HERO_ID}/my-party`);
    shot("16-my-party", 1800);
  });

  PAGES.forEach(([name, who, path]) => {
    screen(name, () => {
      seed(who);
      go(path);
      shot(name, 1800);
    });
  });
});

/** Opens the hero's home with the avatar menu closed, ready for the overlay screens. */
const openHome = (who = HERO_ID) => {
  seed(who);
  go(`/my-portal/${who}/my-home`);
  cy.get(".xp-bottom-nav", { timeout: 30000 }).should("be.visible");
};

describe("Visual baseline: overlays on the hero's portal", () => {
  screen("14 avatar menu", () => {
    openHome();
    tap(".fab-user .avatar-button");
    cy.get(".fab-user .menu-title", { timeout: 10000 }).should("be.visible");
    shot("14-avatar-menu", 1500);
  });

  screen("15 profile modal", () => {
    openHome();
    tap(".xp-bottom-nav button[aria-label='Hero Profile']");
    cy.get("ion-modal.user-profile-modal .profile-content", { timeout: 20000 }).should("be.visible");
    shot("15-profile-modal", 1500);
  });

  screen("34 my look: the builder over my profile", () => {
    seed(HERO_ID);
    go(`/my-portal/${HERO_ID}/my-profile`);
    tap(".my-look-button");
    cy.get("ion-modal.hero-builder [data-cy=starter-hero] img", { timeout: 60000 }).should("have.length", 9);
    shot("34-my-look", 2500);
  });

  screen("41 class codex", () => {
    openHome();
    tap(".xp-bottom-nav__area");
    cy.get("[data-cy=change-class]", { timeout: 20000 }).click({ force: true });
    cy.get("ion-modal.class-codex-modal", { timeout: 20000 }).should("exist");
    shot("41-class-codex", 1800);
  });

  screen("41 class picker in the profile modal", () => {
    openHome();
    tap(".xp-bottom-nav button[aria-label='Hero Profile']");
    cy.get("ion-modal.user-profile-modal .class-box", { timeout: 20000 }).click({ force: true });
    cy.wait(800);
    shot("41-class-picker", 1500);
  });

  screen("42 equipment modal", () => {
    openHome();
    tap(".xp-bottom-nav__area");
    cy.get("ion-modal.xp-equipment-modal .grid-item", { timeout: 20000 }).should("exist");
    shot("42-equipment-modal", 1500);
  });

  screen("43 equipment item card", () => {
    openHome();
    tap(".xp-bottom-nav__area");
    cy.get("ion-modal.xp-equipment-modal .grid-item", { timeout: 20000 }).first().click({ force: true });
    cy.get("ion-modal.xp-equipment-modal [data-cy=equipment-detail] .detail-name", { timeout: 20000 }).should("be.visible");
    shot("43-equipment-item", 1500);
  });

  screen("44 pegasus modal", () => {
    openHome();
    tap(".fab-user .avatar-button");
    cy.contains(".fab-user .menu-item", "Pegasus", { timeout: 10000 }).click({ force: true });
    cy.get("ion-modal", { timeout: 20000 }).should("exist");
    shot("44-pegasus-modal", 1800);
  });

  screen("45 save and quit", () => {
    openHome();
    tap(".fab-user .avatar-button");
    cy.contains(".fab-user .menu-item", "Save & Quit", { timeout: 10000 }).click({ force: true });
    cy.get("ion-modal", { timeout: 20000 }).should("exist");
    shot("45-save-and-quit", 1500);
  });

  screen("46 side menu", () => {
    openHome();
    tap(".fab-user .avatar-button");
    cy.contains(".fab-user .menu-item", "Menu", { timeout: 10000 }).click({ force: true });
    cy.wait(800);
    shot("46-side-menu", 1500, [".xp-music-player .track-info"]);
  });

  screen("47 quest card", () => {
    seed(HERO_ID);
    go(`/my-tasks/${HERO_ID}`);
    cy.contains("ion-button, button", /view quest/i, { timeout: 30000 }).click({ force: true });
    cy.get("ion-modal.show-modal", { timeout: 20000 }).should("exist");
    shot("47-quest-card", 1800);
  });

  screen("48 shop clerk menu", () => {
    seed(HERO_ID);
    go(`/shop/wrecked-ship/${HERO_ID}`);
    cy.get(".accessory-shop", { timeout: 30000 }).should("exist");
    cy.wait(800);
    callPageMethod(".ion-page.accessory-shop", "clerkMenu");
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    shot("48-shop-clerk-menu", 1200);
  });

  screen("49 bank dialog and menu", () => {
    seed(HERO_ID);
    go(`/bank/${HERO_ID}`);
    tap("ion-fab-button");
    cy.get(".banker-dialog-box", { timeout: 20000 }).should("be.visible");
    shot("49-bank-dialog", 4000);
    callPageMethod(".ion-page.gold-bank", "presentActionSheet");
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    shot("49-bank-menu", 1200);
  });

  screen("50 hospital dialog and menu", () => {
    seed(HERO_ID);
    go(`/hospital/${HERO_ID}`);
    tap("ion-fab-button");
    shot("50-hospital-dialog", 4000);
    callPageMethod(".ion-page.hospital-hub", "showActionSheet");
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    shot("50-hospital-menu", 1200);
  });

  screen("51 hotel dialog and menu", () => {
    seed(HERO_ID);
    go(`/hotel/${HERO_ID}`);
    tap("ion-fab-button");
    shot("51-hotel-dialog", 4000);
    callPageMethod(".ion-page.hotel-hub", "presentActionSheet");
    cy.get("ion-action-sheet", { timeout: 20000 }).should("exist");
    shot("51-hotel-menu", 1200);
  });

  screen("52 rpg toast", () => {
    seed(HERO_ID);
    go(`/shop/wrecked-ship/${HERO_ID}`);
    cy.get(".accessory-shop", { timeout: 30000 }).should("exist");
    cy.wait(800);
    // A real toast from the shop, then the same toast again with no timer, so the shot cannot race its dismissal
    callPageMethod(".ion-page.accessory-shop", "showToast", "Not enough GP! You need 460 more to buy Bigger Wallet.");
    cy.get("ion-toast", { timeout: 20000 }).should("exist");
    cy.window().then((win) => {
      const real = win.document.querySelector("ion-toast");
      const copy = win.document.createElement("ion-toast");
      Object.assign(copy, { message: real.message, position: real.position, cssClass: real.cssClass, swipeGesture: real.swipeGesture, buttons: real.buttons, duration: 0 });
      real.remove();
      win.document.querySelector("ion-app").appendChild(copy);
      return copy.present();
    });
    shot("52-rpg-toast", 1200);
  });

  screen("53 area title", () => {
    openHome();
    cy.window().then((win) => {
      const instance = findInstance(win, (candidate) => candidate.type && candidate.type.__name === "XpSceneTransition");
      expect(instance, "the scene transition component").to.be.an("object");
      instance.setupState.state.card = { title: "The Plains", subtitle: "Where the wind begins", element: "wind" };
    });
    cy.get(".area-title", { timeout: 10000 }).should("exist");
    shot("53-area-title", 1000);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Temples and battles
// ---------------------------------------------------------------------------------------------------------------

describe("Visual baseline: temple and battle", () => {
  screen("60 temple entrance", () => {
    seed(HERO_ID);
    go(`/temple/wind-temple/${HERO_ID}`);
    cy.get(".ion-page", { timeout: 60000 }).should("exist");
    cy.wait(1500);
    shot("60-temple-entrance", 3000);
  });

  /** Sets state the temple page keeps in setup(), to bring up a reveal that a real walk would reach only after many taps. */
  const setTempleState = (patch) =>
    cy.window().then((win) => {
      const instance = findInstance(win, (candidate) => candidate.setupState && "isChestOpen" in candidate.setupState);
      expect(instance, "the temple page").to.be.an("object");
      Object.assign(instance.setupState, patch);
    });

  screen("61 temple chest reveal", () => {
    seed(HERO_ID);
    go(`/temple/wind-temple/${HERO_ID}/2/0`);
    cy.get(".ion-page", { timeout: 60000 }).should("exist");
    cy.wait(1500);
    setTempleState({
      chestLootShown: [
        { value: "small-key", name: "Small Key", icon: "key", blurb: "Opens one locked door.", tier: "key" },
        { value: "gold", name: "40 GP", icon: "coins", blurb: "Spending money.", tier: "gold" },
      ],
      isChestClosed: true,
      isChestOpen: true,
    });
    cy.get("[data-cy=chest-reveal]", { timeout: 10000 }).should("exist");
    shot("61-temple-chest-reveal", 1500);
  });

  screen("61 temple door reveal", () => {
    seed(HERO_ID);
    go(`/temple/wind-temple/${HERO_ID}`);
    cy.get(".ion-page", { timeout: 60000 }).should("exist");
    cy.wait(1500);
    setTempleState({ doorShown: { kind: "locked", canOpen: true, header: "A locked door", line: "It needs a small key.", keys: 1 }, doorResult: null, isDoorOpen: true });
    cy.get(".door-reveal, [data-cy=door-reveal]", { timeout: 10000 }).should("exist");
    shot("61-temple-door-reveal", 1500);
  });

  /** Opens the seeded Socktopus fight and reads the intro down to the command menu (same flow as battle.spec.js). */
  const enterFight = () => {
    seed(HERO_ID);
    go(`/battle/${HERO_ID}/free/beast-socktopus`);
    cy.get(".battlefield", { timeout: 60000 }).should("exist");
    cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Socktopus");
    cy.wait(400);
    readUntilMenu(3);
  };
  const tapDialog = () => cy.get("[data-cy=battle-dialog]", { timeout: 20000 }).click("center", { force: true });
  const readUntilMenu = (maxTaps = 8) => {
    const step = (left) => {
      cy.get("body").then(($body) => {
        if ($body.find(".menu-item").length || left === 0) return;
        tapDialog();
        cy.wait(350);
        step(left - 1);
      });
    };
    step(maxTaps);
    cy.get(".menu-item", { timeout: 10000 }).should("have.length", 5);
  };
  const CLOCKS = [".attack-timer-label", ".attack-timer", ".timer-bar", "[class*=timer]"];

  screen("62 battle intro", () => {
    seed(HERO_ID);
    go(`/battle/${HERO_ID}/free/beast-socktopus`);
    cy.get(".battlefield", { timeout: 60000 }).should("exist");
    cy.get("[data-cy=battle-dialog]").should("contain", "From the dark forces of chaos comes Socktopus!!!");
    shot("62-battle-intro", 1500, CLOCKS);
  });

  screen("63 battle menu", () => {
    enterFight();
    shot("63-battle-menu", 1500, CLOCKS);
  });

  screen("64 battle checklist", () => {
    enterFight();
    cy.contains(".menu-item", "Tackle").click({ force: true });
    cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
    shot("64-battle-checklist", 1200, CLOCKS);
  });

  screen("65 battle chore confirm", () => {
    enterFight();
    cy.contains(".menu-item", "Tackle").click({ force: true });
    cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
    cy.contains(".battle-task-item", "Sort the socks").click({ force: true });
    cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
    shot("65-battle-chore-confirm", 1200, CLOCKS);
  });

  screen("66 battle potions", () => {
    enterFight();
    cy.contains(".menu-item", "Goods").click({ force: true });
    cy.get(".xp-equipment-modal .grid-item .fa-flask-potion", { timeout: 10000 }).should("be.visible").click({ force: true });
    cy.get("[data-cy=potion-sheet]", { timeout: 10000 }).should("be.visible");
    shot("66-battle-potions", 1200, CLOCKS);
  });

  screen("67 battle powers", () => {
    enterFight();
    cy.contains(".menu-item", "Powers").click({ force: true });
    cy.get("[data-cy=powers-sheet]", { timeout: 10000 }).should("be.visible");
    shot("67-battle-powers", 1200, CLOCKS);
  });

  screen("68 battle run away", () => {
    enterFight();
    cy.contains(".menu-item", "Run Away").click({ force: true });
    cy.get(".dialog-prompt").should("contain", "Run away?");
    shot("68-battle-run-away", 1200, CLOCKS);
  });

  screen("69 battle victory", () => {
    enterFight();
    ["Sort the socks", "Match the pairs", "Put them away"].forEach((chore, index) => {
      cy.contains(".menu-item", "Tackle").click({ force: true });
      cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
      cy.contains(".battle-task-item", chore).click({ force: true });
      cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
      cy.wait(350);
      cy.get("[data-cy=task-confirm]").click({ force: true });
      if (index < 2) readUntilMenu();
    });
    cy.get("[data-cy=victory-card]", { timeout: 15000 }).should("be.visible");
    cy.wait(2500);
    shot("69-battle-victory", 1500, [...CLOCKS, ".victory-work"]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The Game Master
// ---------------------------------------------------------------------------------------------------------------

/** Makes the family Pro for the Pro-gated Game Master pages (the temple creator). */
const goPro = () => {
  cy.window().then((win) => {
    const pinia = win.document.querySelector("#app").__vue_app__.config.globalProperties.$pinia;
    const pro = pinia._s.get("pro");
    pro.license = { key: "visual-baseline", plan: "yearly", expiresAt: "2099-01-01T00:00:00.000Z", env: "sandbox", pro: true, lastValidatedAt: new Date(Date.now() - 3600 * 1000).toISOString() };
  });
};

const GM_PAGES = [
  ["71-gm-dashboard", "/game-master/dashboard"],
  ["72-gm-chat", "/game-master/chat"],
  ["73-gm-do-this-not-that", "/game-master/do-this-not-that"],
  ["74-compendium-dashboard", "/game-master/compendium/dashboard"],
  ["75-compendium-quests", "/game-master/compendium/achievements"],
  ["76-compendium-quest-editor", "/game-master/compendium/achievements/config/quest-socks"],
  ["77-compendium-bestiary", "/game-master/compendium/bestiary"],
  ["78-compendium-abilities", "/game-master/compendium/abilities"],
  ["79-compendium-economy", "/game-master/compendium/economy/dashboard"],
  ["80-compendium-shops", "/game-master/compendium/economy/shops"],
  ["81-compendium-items", "/game-master/compendium/economy/items"],
  ["82-compendium-temples", "/game-master/compendium/temples"],
  ["83-compendium-temple-dashboard", "/game-master/compendium/temples/wind-temple/dashboard"],
  ["84-gm-add-beast", "/game-master/add-beast"],
  ["85-gm-add-ability", "/game-master/add-ability"],
];

describe("Visual baseline: the Game Master", () => {
  GM_PAGES.forEach(([name, path]) => {
    screen(name, () => {
      seed(GM_ID);
      goPro();
      go(path, path.split("/").slice(0, 2).join("/"));
      // the Game Master's guide types its lines out and the counters roll up: give them time to finish
      shot(name, 6000);
    });
  });

  ["achievements", "accessories", "history"].forEach((segment, index) => {
    screen(`86 approvals ${segment}`, () => {
      seed(GM_ID);
      go("/game-master/approvals");
      cy.get("ion-segment-button", { timeout: 30000 }).should("exist");
      if (index) setPageData(".ion-page.xp-approvals", "activeSegment", segment);
      shot(`86-approvals-${segment}`, 1500);
    });
  });

  screen("87 temple creator room", () => {
    seed(GM_ID);
    goPro();
    go("/game-master/compendium/temples/creator/wind-temple/rooms/5/2");
    cy.get(".xp-room-editor-page .center-room", { timeout: 60000 }).should("exist");
    shot("87-temple-creator-room", 2000);
  });

  screen("88 temple creator room type modal", () => {
    seed(GM_ID);
    goPro();
    go("/game-master/compendium/temples/creator/wind-temple/rooms/5/2");
    cy.get(".xp-room-editor-page .center-room", { timeout: 60000 }).click({ force: true });
    cy.get("ion-modal.room-type-modal", { timeout: 20000 }).should("exist");
    shot("88-temple-creator-room-types", 2000);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Settings, support and the rest
// ---------------------------------------------------------------------------------------------------------------

const OTHER_PAGES = [
  ["90-settings", "/xp-settings"],
  ["91-settings-general", "/xp-settings/general"],
  ["92-settings-family", "/xp-settings/family"],
  ["93-settings-sound", "/xp-settings/sound"],
  ["94-settings-notifications", "/xp-settings/notifications"],
  ["95-settings-packs", "/xp-settings/packs"],
  ["96-settings-pro", "/xp-settings/pro"],
  ["97-settings-theme", "/xp-settings/theme"],
  ["98-settings-chore", "/xp-settings/chore"],
  ["99-support", "/xp-support"],
  ["100-support-faq", "/support/faq"],
  ["101-about", "/about-xp"],
  ["102-about-xp", "/about-xp/xp"],
  ["103-membership", "/xp-membership"],
  ["105-tell-a-friend", "/tell-a-friend"],
  ["106-rpg-text-demo", "/rpg-text-demo"],
  ["107-game-over", "/game-over"],
  ["108-dev-component-showcase", "/dev/component-showcase"],
  ["109-dev-dialog-demo", "/dev/dialog-demo"],
];

describe("Visual baseline: settings and the rest", () => {
  OTHER_PAGES.forEach(([name, path]) => {
    screen(name, () => {
      seed(GM_ID);
      go(path, path.split("/").slice(0, 2).join("/"));
      if (name === "101-about") {
        // the first slide types a long text (a quarter of a minute): a tap on it finishes the line at once
        cy.get(".xp-typing-text", { timeout: 30000 }).first().click({ force: true });
      }
      // the other About pages and the text demo type shorter lines: wait for the last letter
      shot(name, /about|text-demo/.test(name) ? 9000 : 2000);
    });
  });
});
