// Quest rooms in the temple room editor: Combat leads with "Quest room", the beast rooms sit behind "Classic", and the
// quest picker (This temple's theme | All quests | From the library) writes the pick into the room. Keeps a screenshot
// of every step at 390x844 in tests/e2e/screenshots/room-quest-picker.spec.js.
// Run (dev server on :8100 first; a server that reloads mid-run needs the WebSocket stub below):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/room-quest-picker.spec.js

const TEMPLE = "shadow-temple";
const EDITED = { row: 1, col: 0 }; // the shared classic monster token M001
const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;
const pinia = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$pinia;

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
    assignee: ["hero-1", "gm-1"],
    startsOn: "2026-01-01T00:00:00.000Z",
    endsOn: "",
    dueByTime: "",
    basicSchedule: "daily",
    scheduleType: "basic",
    showDailyUntilComplete: true,
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

/** A family of two (Dad the Game Master, Max the hero) with a few kitchen quests and a half-built Shadow temple. */
const seedWorld = () => {
  // Pro opens the Temple Creator. The app claims its license as it starts, so the stub is in place before the visit.
  cy.intercept("**/compass/v1/gatekeeper/xp-pro/*", { statusCode: 200, body: PRO });
  cy.fixture("battle-backup.json").then((backup) => {
    const max = backup.stores.__profiles[0];
    const dad = JSON.parse(JSON.stringify(max));
    dad.key = "gm-1";
    Object.assign(dad.value, { id: "gm-1", name: { full: "Dad", first: "Dad", last: "Power", middle: "", nick: "Dad" }, isAdult: true, birthday: "1984-03-02", inventory: [] });
    const world = JSON.parse(JSON.stringify(backup));
    world.stores.__profiles = [dad, max];
    world.stores.__achievements = [
      quest("q-dishes", "Banish the Dish Goblin", "beast-dish-goblin", 2, { dueByTime: "19:00" }),
      quest("q-trash", "Outwit the Trash Troll", "beast-trash-troll", 3, { basicSchedule: "weekly", requiresApproval: true }),
      quest("q-grease", "Scrub the stovetop", "beast-grease-gorgon", 8, { basicSchedule: "weekly", assignee: ["hero-1"] }),
      quest("q-weeds", "Slay the Weed Wyrm", "beast-weed-wyrm", 5, { basicSchedule: "weekly", assignee: ["gm-1"] }),
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
    // Entrance, two quest rooms already set, and the shared classic monster token M001 twice: the room we edit
    cy.window().then((win) =>
      cy.wrap(
        win.__xpTemples.save({
          id: TEMPLE,
          customName: "Moonveil Shrine",
          categoryIds: [],
          dungeonLayout: {
            entrance: [0, 0],
            maze: [
              ["ENT", "R0001", "R0002", "R0003"],
              ["M001", "M001", "BOSS", "WALL"],
            ],
            rooms: {
              WALL: { type: "wall" },
              ENT: { type: "entrance", visited: true },
              R0001: { type: "monster", content: { questId: "q-dishes" } },
              R0002: { type: "miniboss", content: { questId: "q-trash", lockOnEnter: true } },
              R0003: { type: "empty" },
              M001: { type: "monster", content: { beasts: ["beast-socktopus"], xp: 200, gp: 20, ap: 2 } },
              BOSS: { type: "boss", content: { beasts: ["beast-dishgoblin"], lockOnEnter: true } },
            },
          },
        }),
        { timeout: 20000 }
      )
    );
  });
};

const editorUrl = (row, col) => `/game-master/compendium/temples/creator/${TEMPLE}/rooms/${row}/${col}`;
const modal = ".room-type-modal";
const picker = ".room-quest-picker";

describe("Quest rooms in the room editor", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    seedWorld();
  });

  it("keeps a classic beast room as it was: Classic is open and its Monster is the one picked", () => {
    cy.window().then((win) => routerOf(win).push(editorUrl(EDITED.row, EDITED.col)));
    cy.tapToWakeAudio();
    cy.get(".center-room", { timeout: 60000 }).should("be.visible");
    shot("01-room-editor-classic-monster");

    cy.get(".center-room").click();
    cy.get(modal, { timeout: 20000 }).should("be.visible");
    // A classic Monster room opens on its config: Back goes to the shared configs, then to the types
    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} .rail-disclosure`).should("have.attr", "aria-expanded", "true");
    cy.get(`${modal} [data-pick=monster]`).should("have.attr", "aria-pressed", "true");
    cy.get(`${modal} .guide-confirm`).should("contain", "Confirm Monster");
    shot("02-classic-monster-selected");

    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} [data-pick=Combat]`).should("exist");
    cy.get(`${modal} .guide-page`).should("contain", "Classic beast rooms");
    shot("03-categories");
    cy.get(`${modal} .xp-close-button`).first().click();
    cy.get(modal).should("not.be.visible");
  });

  it("leads Combat with the quest room and folds the beast rooms behind Classic", () => {
    // An empty room: the type picker starts at the categories
    cy.window().then((win) => routerOf(win).replace(editorUrl(0, 3)));
    cy.get(".center-room:visible", { timeout: 30000 }).should("have.length", 1);
    cy.wait(1500); // the page of the room we left is torn down
    cy.get(".center-room:visible").click();
    cy.get(modal, { timeout: 20000 }).should("be.visible");
    // It opens on the category the room is in (Structure, for an empty one); Combat is on the rail
    cy.get(`${modal} [data-pick=Combat]`).click();
    cy.get(`${modal} .guide-confirm`).should("contain", "Choose Combat").click();

    cy.get(`${modal} .rail-disclosure`).should("have.attr", "aria-expanded", "false");
    cy.get(`${modal} .guide-rail [data-pick]`).then(($buttons) => {
      expect([...$buttons].map((button) => button.getAttribute("data-pick"))).to.deep.eq(["quest", "trap", "classic"]);
    });
    cy.get(`${modal} .guide-name`).should("contain", "Quest room");
    cy.get(`${modal} .guide-confirm`).should("contain", "Pick a quest");
    shot("04-combat-quest-room-first");

    cy.get(`${modal} .rail-disclosure`).click();
    cy.get(`${modal} .guide-rail [data-pick]`).then(($buttons) => {
      expect([...$buttons].map((button) => button.getAttribute("data-pick"))).to.deep.eq(["quest", "trap", "classic", "monster", "miniboss", "boss"]);
    });
    cy.get(`${modal} .guide-name`).should("contain", "Monster");
    shot("05-classic-open");
    cy.get(`${modal} .rail-disclosure`).click();
    cy.get(`${modal} .guide-name`).should("contain", "Quest room");
    cy.get(`${modal} .xp-close-button`).first().click();
    cy.get(modal).should("not.be.visible");

    // The classic room again: Quest room is one tap away on the rail
    cy.window().then((win) => routerOf(win).replace(editorUrl(EDITED.row, EDITED.col)));
    cy.get(".center-room:visible", { timeout: 30000 }).should("have.length", 1);
    cy.wait(1500); // the page of the room we left is torn down
    cy.get(".center-room:visible").click();
    cy.get(modal, { timeout: 20000 }).should("be.visible");
    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} [data-pick=quest]`).click();
    cy.get(`${modal} .guide-confirm`).should("contain", "Pick a quest");
  });

  it("opens the picker on the temple's theme, with the size meter and Confirm under the thumb", () => {
    cy.get(`${modal} .guide-confirm`).click();
    cy.get(picker, { timeout: 20000 }).should("be.visible");
    cy.get(`${picker} .segment.is-on`).should("contain", "This temple's theme");
    cy.get(`${picker} .theme-line`).should("contain", "Kitchen · Shadow");
    // The Shadow quests: the Dish Goblin, the Trash Troll and the Grease Gorgon quest; the Weed Wyrm is Earth
    cy.get(`${picker} .quest-row`).should("have.length", 3);
    cy.get(`${picker} .quest-row`).should("not.contain", "Slay the Weed Wyrm");
    cy.get(`${picker} .size-label`).should("contain", "Size 5 · full at 21");
    cy.get(`${picker} .picker-confirm`).should("be.disabled");
    shot("06-picker-theme");

    // Rows say tier, difficulty, schedule, heroes, approval and the ambush note
    cy.contains(`${picker} .quest-row`, "Outwit the Trash Troll").within(() => {
      cy.get(".chip-tier").should("contain", "Miniboss");
      cy.contains("Easy 3");
      cy.contains("Weekly");
      cy.contains("Approval");
      cy.contains("no due time: never ambushes");
    });
    cy.contains(`${picker} .quest-row`, "Banish the Dish Goblin").should("not.contain", "never ambushes");

    // Picking a boss-tier quest previews the new size
    cy.contains(`${picker} .quest-row`, "Scrub the stovetop").click();
    cy.get(`${picker} .size-label`).should("contain", "Size 5 → 13 · full at 21");
    cy.get(`${picker} .picker-confirm`).should("not.be.disabled");
    shot("07-picker-pick-boss");

    // Search narrows the page; All quests adds the Earth quest
    cy.get(`${picker} .search-input`).type("grease");
    cy.get(`${picker} .quest-row`).should("have.length", 1);
    cy.get(`${picker} .search-input`).clear();
    cy.get(`${picker} .segment`).contains("All quests").click();
    cy.get(`${picker} .quest-row`).should("have.length", 4);
    shot("08-picker-all");
  });

  it("makes a quest from a library beast and picks it", () => {
    cy.get(`${picker} .segment`).contains("From the library").click();
    cy.get(`${picker} .quest-row`).should("have.length.greaterThan", 3);
    // The Dish Goblin and the Trash Troll already have a quest, so the library does not offer them
    cy.get(`${picker} .quest-row`).should("not.contain", "Dish Goblin");
    shot("09-picker-library");

    cy.contains(`${picker} .quest-row`, "Wipe the table").click();
    cy.get(`${picker} .hero-chip`).should("have.length", 2).and("have.class", "is-on");
    cy.get(`${picker} .picker-confirm`).should("not.be.disabled");
    shot("10-library-form");

    cy.get(`${picker} .segment`).contains("Weekly").click();
    cy.get(`${picker} .step-button[aria-label=Harder]`).click().click();
    cy.get(`${picker} .difficulty-text`).should("contain", "Moderate 5");
    cy.get(`${picker} .difficulty-text`).should("contain", "Miniboss");
    cy.get(`${picker} .hero-chip`).contains("Dad").click();
    cy.get(`${picker} .hero-chip`).contains("Dad").should("not.have.class", "is-on");
    cy.get(`${picker} .picker-confirm`).click();

    // Back on the list with the new quest picked, in the theme's quests
    cy.get(`${picker} .segment.is-on`).should("contain", "This temple's theme");
    cy.contains(`${picker} .quest-row.is-selected`, "Wipe the table").should("be.visible");
    cy.get(`${picker} .size-label`).should("contain", "Size 5 → 10 · full at 21");
    shot("11-picker-created");
  });

  it("confirms the pick: the room becomes a quest room with its own symbol, and its config shows the quest", () => {
    cy.get(`${picker} .picker-confirm`).click();
    cy.get(picker).should("not.be.visible");
    cy.get(`${modal} .quest-config`, { timeout: 20000 }).should("be.visible");
    cy.get(`${modal} .quest-row`).should("contain", "Wipe the table").and("contain", "Miniboss");
    cy.contains(`${modal} .quest-button`, "Change quest");
    cy.contains(`${modal} .quest-button`, "Edit quest");
    cy.contains(`${modal} .quest-button`, "Test fight");
    shot("12-quest-room-config");

    // The cell took a symbol of its own and the other M001 cell kept the classic room
    cy.window().then((win) => {
      const store = pinia(win)._s.get("temple-creator");
      const maze = store.templeMaze;
      const symbol = maze[EDITED.row][EDITED.col];
      expect(symbol, "a symbol of its own").to.not.eq("M001");
      expect(store.roomsData[symbol].type).to.eq("miniboss");
      expect(store.roomsData[symbol].content.questId).to.be.a("string");
      expect(maze[1][1]).to.eq("M001");
      expect(store.roomsData.M001.type).to.eq("monster");
      expect(store.roomsData.M001.content.questId).to.eq(undefined);
    });

    // The header names the room by its tier
    cy.get(".xp-room-editor-page .room-name").should("contain", "Quest · Mini-boss");
  });

  it("changes the quest from the config and keeps the classic path one tap away", () => {
    cy.contains(`${modal} .quest-button`, "Change quest").click();
    cy.get(picker, { timeout: 20000 }).should("be.visible");
    cy.contains(`${picker} .quest-row.is-selected`, "Wipe the table");
    cy.get(`${picker} .size-label`).should("contain", "Size 10 · full at 21");
    cy.get(`${picker} .segment`).contains("All quests").click();
    cy.contains(`${picker} .quest-row`, "Scrub the stovetop").click();
    cy.get(`${picker} .size-label`).should("contain", "Size 10 → 13 · full at 21");
    cy.get(`${picker} .picker-confirm`).click();
    cy.get(`${modal} .quest-row`).should("contain", "Scrub the stovetop").and("contain", "Boss");
    cy.get(".xp-room-editor-page .room-name").should("contain", "Quest · Boss");

    // Back to the types: the quest room is the current one; Classic offers Monster again
    cy.get(`${modal} .guide-back`).click();
    cy.get(`${modal} [data-pick=quest]`).should("have.class", "is-current");
    // The room was a classic one when this modal opened, so Classic is still unfolded: unfold it only if it is not
    cy.get(`${modal} .rail-disclosure`).then(($fold) => {
      if ($fold.attr("aria-expanded") !== "true") cy.wrap($fold).click();
    });
    cy.get(`${modal} [data-pick=monster]`).click();
    cy.get(`${modal} .guide-confirm`).should("contain", "Confirm Monster");
    shot("13-back-to-classic");
  });

  it("edits the quest in the Compendium and comes back to the room's config; Test fight leaves for a free battle", () => {
    // The type picker is still open on the last test's classic Monster; leave it without confirming
    cy.get(`${modal} .xp-close-button`).first().click();
    cy.get(modal).should("not.be.visible");
    cy.get(".center-room:visible").click();
    // A quest room opens on its config
    cy.get(`${modal} .quest-config`, { timeout: 20000 }).should("be.visible");
    cy.get(`${modal} .quest-row`).should("contain", "Scrub the stovetop");

    cy.contains(`${modal} .quest-button`, "Edit quest").click();
    cy.location("pathname", { timeout: 30000 }).should("match", /\/achievements\/config\/q-grease\/dashboard$/);
    shot("14-quest-form");
    cy.window().then((win) => win.history.back());
    cy.get(`${modal} .quest-config`, { timeout: 30000 }).should("be.visible");
    cy.get(`${modal} .quest-row`).should("contain", "Scrub the stovetop");
    shot("15-back-from-quest-form");

    cy.contains(`${modal} .quest-button`, "Test fight").click();
    cy.location("pathname", { timeout: 30000 }).should("match", /\/battle\/gm-1\/free\/beast-grease-gorgon$/);
  });
});
