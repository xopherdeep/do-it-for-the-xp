// The temple's Quests tab (docs/Quest-Rooms-Spec.md section 9): the theme and the size meter, quest rooms grouped by
// tier with their schedule, heroes and a status dot per hero, a tier mismatch flag, the dormant rooms, and Wake quests
// (pick heroes, tick the sleeping templates, the quests are made). Keeps a screenshot of every step at 390x844 in
// tests/e2e/screenshots/temple-quests-tab.spec.js.
// Run (dev server on :8100 first; a server that reloads mid-run needs the WebSocket stub below):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/temple-quests-tab.spec.js

const TEMPLE = "ice-temple";
const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;

const shot = (name) => {
  cy.wait(500);
  cy.screenshot(name, { capture: "viewport", overwrite: true });
};

const PRO = {
  pro: true,
  license_key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expires_at: "2099-01-01T00:00:00Z",
  env: "production",
  family_id: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f",
};

const quest = (id, achievementName, beastId, difficulty, extra = {}) => ({
  key: id,
  value: {
    id,
    achievementName,
    categoryId: "",
    beastId,
    subAchievementIds: [],
    requiresApproval: false,
    bonusAchievement: false,
    type: "individual",
    assignee: ["hero-1"],
    startsOn: "2026-01-01T00:00:00.000Z",
    endsOn: "",
    dueByTime: "",
    basicSchedule: "weekly",
    scheduleType: "basic",
    showDailyUntilComplete: false,
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    difficulty,
    xp: difficulty * 100,
    gp: difficulty * 10,
    ap: difficulty,
    adventureType: "beast",
    ...extra,
  },
});

const template = (beastId, difficulty, basicSchedule = "weekly", extra = {}) => ({ beastId, difficulty, basicSchedule, ...extra });

/** A family of two (Dad the Game Master, Max the hero) and the Ice temple the way the rebuild leaves it: quest rooms asleep. */
const seedWorld = () => {
  cy.intercept("**/compass/v1/gatekeeper/xp-pro/*", { statusCode: 200, body: PRO });
  cy.fixture("battle-backup.json").then((backup) => {
    const max = backup.stores.__profiles[0];
    const dad = JSON.parse(JSON.stringify(max));
    dad.key = "gm-1";
    Object.assign(dad.value, { id: "gm-1", name: { full: "Dad", first: "Dad", last: "Power", middle: "", nick: "Dad" }, isAdult: true, birthday: "1984-03-02", inventory: [] });
    const world = JSON.parse(JSON.stringify(backup));
    world.stores.__profiles = [dad, max];
    world.stores.__achievements = [
      // The starter quests the rebuild matches by beast: the Socktopus fills a monster room, the Laundry Lurker (a 3) sits in the boss room
      quest("quest-socks", "Tame the Socktopus", "beast-socktopus", 2, { assignee: ["hero-1", "gm-1"] }),
      quest("quest-laundry", "Corner the Laundry Lurker", "beast-laundry-lurker", 3, { requiresApproval: true }),
    ];
    cy.visit("/", {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
        // A dev server that reloads when someone edits a file would wipe the walk-through
        win.WebSocket = function () {
          return { close() {}, send() {}, addEventListener() {}, removeEventListener() {}, readyState: 3 };
        };
      },
    });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
      expect(win.__xpTemples, "development seam window.__xpTemples").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(world), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser("gm-1"), "Dad is signed in").to.eq(true);
    });
    cy.window().then((win) =>
      cy.wrap(
        win.__xpTemples.save({
          id: TEMPLE,
          customName: "Frostbite Hamper",
          categoryIds: [],
          dungeonLayout: {
            entrance: [0, 0],
            maze: [
              ["ENT", "R0001", "R0002", "R0003"],
              ["M001", "R0004", "R0005", "R0006"],
            ],
            rooms: {
              ENT: { type: "entrance", visited: true },
              R0001: { type: "monster", content: { quest: template("beast-hamper-hound", 1, "daily", { dueByTime: "20:30" }) } },
              R0002: { type: "monster", content: { quest: template("beast-socktopus", 2) } },
              R0003: { type: "monster", content: { quest: template("beast-wrinkle-wyvern", 2) } },
              M001: { type: "monster", content: { beasts: ["beast-dish-goblin"], xp: 200, gp: 20, ap: 2 } },
              R0004: { type: "miniboss", content: { quest: template("beast-leftover-lich", 5) } },
              R0005: { type: "boss", content: { quest: template("beast-laundry-lurker", 13), lockOnEnter: true } },
              R0006: { type: "monster", content: { quest: template("beast-lint-lizard", 1, "weekly", { repeatOnDays: ["sat"] }) } },
            },
          },
        }),
        { timeout: 20000 }
      )
    );
  });
};

describe("The temple's Quests tab", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    seedWorld();
  });

  it("shows the theme, the size meter, and the rooms grouped by tier", () => {
    cy.window().then((win) => routerOf(win).push(`/game-master/compendium/temples/${TEMPLE}/beasts`));
    cy.tapToWakeAudio();
    cy.get(".quests-head", { timeout: 60000 }).should("be.visible");
    cy.get(".theme-line").should("contain", "Laundry and fridge · Ice");
    // Socktopus 2 + Laundry Lurker 3 are awake; hamper 1, wyvern 2, lich 5, lizard 1 sleep
    cy.get(".meter-text").should("contain", "Size 14").and("contain", "of 21").and("contain", "9 if woken");
    cy.get(".tier-accordion").should("have.length", 3);
    // Every tier opens once the rooms are in
    cy.get(".quest-row").first().should("be.visible");
    shot("01-quests-tab");
    // The whole list at once: a phone screen scrolls, the picture does not
    cy.viewport(390, 1700);
    shot("01b-quests-tab-tall");
    cy.viewport(390, 844);
    cy.get(".xp-temple-beasts > ion-content").then(($content) => $content[0].scrollToBottom(0));
    shot("01c-bottom-of-the-list");

    // The boss room holds the family's Laundry Lurker quest, a 3: a miniboss in a boss room
    cy.contains(".quest-row", "Corner the Laundry Lurker").within(() => {
      cy.get(".flag").should("contain", "Boss room holds a Miniboss quest (3)");
      cy.get(".chip-approval").should("exist");
      cy.get(".dot").should("have.length", 2);
    });
    // The Socktopus quest fills its monster room for both heroes
    cy.contains(".quest-row", "Tame the Socktopus").find(".dot").should("have.length", 2);
    // A sleeping room says what it is waiting for
    cy.contains(".quest-row", "Dormant: Leftover Lich, no quest yet").should("have.class", "kind-dormant");
    // The classic Monster room keeps its card
    cy.get(".beast-card-wrapper").should("have.length", 1);
    cy.get(".classic-label").should("contain", "Classic beast rooms");
  });

  it("wakes the sleeping templates for the picked heroes, beside the quests the family already has", () => {
    cy.get(".wake-open").should("contain", "Wake quests").and("contain", "4 asleep");
    cy.get(".wake-open").click();
    cy.get(".wake-modal", { timeout: 20000 }).should("be.visible");
    // Max (the hero) is picked, Dad (the Game Master) is not; the four sleeping quests are ticked
    cy.get(".wake-modal .hero-chip.is-on").should("have.length", 1).and("contain", "Max");
    cy.get(".wake-modal .wake-row[role=checkbox]").should("have.length", 4);
    cy.get(".wake-modal .wake-confirm").should("contain", "Wake 4 quests for Max");
    // The two beasts the family already has a quest for are listed as awake, not tickable
    cy.get(".wake-modal .wake-row.is-static").should("have.length", 2);
    cy.contains(".wake-modal .wake-row.is-static", 'uses your quest "Tame the Socktopus"').should("exist");
    shot("02-wake-sheet");

    // Untick the Lint Lizard, pick Dad too
    cy.contains(".wake-modal .wake-row[role=checkbox]", "Lint Lizard").click();
    cy.get(".wake-modal .hero-chip").contains("Dad").click();
    cy.get(".wake-modal .wake-confirm").should("contain", "Wake 3 quests for Dad, Max");
    shot("03-wake-sheet-picked");

    cy.get(".wake-modal .wake-confirm").click();
    cy.get(".wake-modal .wake-report", { timeout: 20000 }).should("contain", "Woke 3 quests");
    shot("04-wake-done");
    cy.get(".wake-modal .wake-confirm").contains("Done").click();
    cy.get(".wake-modal").should("not.be.visible");

    // The three rooms now hold quests (named for the beasts' chores), the Lint Lizard still sleeps
    cy.contains(".quest-row", "Dormant: Lint Lizard, no quest yet").should("exist");
    cy.contains(".quest-row", "Dormant: Leftover Lich").should("not.exist");
    cy.contains(".quest-row", "Clean out the fridge").should("have.class", "kind-quest");
    cy.contains(".quest-row", "Fold the laundry").find(".dot").should("have.length", 2);
    cy.get(".wake-open").should("contain", "1 asleep");
    // Waking a template does not change the size: the quest has the template's difficulty
    cy.get(".meter-text").should("contain", "Size 14").and("contain", "1 if woken");
    shot("05-after-wake");
  });
});
