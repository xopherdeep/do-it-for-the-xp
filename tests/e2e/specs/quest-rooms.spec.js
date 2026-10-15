// Quest Rooms end to end (docs/Quest-Rooms-Spec.md section 13): a temple's combat rooms hold the family's real chores.
//
//   1. A Game Master wakes the Shadow temple's Dish Goblin quest for Max from the temple's Quests tab (the real Wake sheet).
//      The room lurks; winning the fight completes the quest (the board says Tamed) and clears the room; the next day the
//      beast is back.
//   2. A second fight: Run costs one parting strike, and one grudge mark shows on the beast at the next fight.
//   3. A lost fight with 40 GP in the wallet: Max is carried to the Hospital, treated to full HP and MP, billed 100 (40 from
//      the wallet, 60 owed) and GROUNDED; the Power's Cast is refused. A quest pays 60 GP, the Gold Bank takes the bill, the
//      chip goes and the Power casts.
//
// The tests run in order and share one seeded world (IndexedDB survives from one test to the next; Cypress only clears
// localStorage, so every test signs its hero in again).
//
// Time: the "next day" is a live offset on the page's Date (see installClock), not cy.clock. cy.clock freezes Date, and the
// battle's own guards read Date.now (the 250 ms double-tap guard on Done!, the strike clock), so a frozen Date would swallow
// taps and stop the clock. The offset keeps time moving and lets the spec also run the strike clock out (a lost fight) by
// moving Date forward ten minutes.
//
// Run (a dev server that does not reload mid-run; the Quests tab and the fights are long walks):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/quest-rooms.spec.js
// Screenshots land in tests/e2e/screenshots/quest-rooms.spec.js.

const TEMPLE = "shadow-temple";
/** The quest the Wake sheet makes for the Dish Goblin template: `tq-<temple>-<beast without "beast-">` */
const QUEST_ID = "tq-shadow-temple-dish-goblin";
/** Shadow temple, floor 3F, row 5, column 2: the Dish Goblin room (the route reads x as the column, y as the row) */
const ROOM = `/temple/${TEMPLE}/hero-1/2/5?level=3F`;
const CHORES = ["Scrape the plates", "Rinse and load them", "Add a pod and start it", "Wipe the counter"];

const DAY = 24 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

const PRO = {
  pro: true,
  license_key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expires_at: "2099-01-01T00:00:00Z",
  env: "production",
  family_id: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f",
};

// ---------------------------------------------------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------------------------------------------------

/** How far the page's Date is ahead of the real one. Read live, so changing it moves the open page too. */
let shiftMs = 0;

/** Replaces the page's Date with one that reports real time plus `shiftMs`. Runs before the page's own scripts. */
const installClock = (win) => {
  const RealDate = win.Date;
  if (RealDate.isShifted) return;
  function ShiftedDate() {
    if (!(this instanceof ShiftedDate)) return new RealDate(RealDate.now() + shiftMs).toString();
    const args = arguments.length ? Array.prototype.slice.call(arguments) : [RealDate.now() + shiftMs];
    return Reflect.construct(RealDate, args, ShiftedDate);
  }
  ShiftedDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(ShiftedDate, RealDate);
  ShiftedDate.now = () => RealDate.now() + shiftMs;
  ShiftedDate.isShifted = true;
  win.Date = ShiftedDate;
};

// Every page the spec opens: the clock offset, and the hero has already answered the one-time ambush-alert ask
Cypress.on("window:before:load", (win) => {
  win.localStorage.setItem("xp.battleAlerts", "off");
  installClock(win);
});

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------

const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;
const go = (path) => cy.window().then((win) => routerOf(win).push(path));

const shot = (name) => {
  cy.wait(600);
  // Cypress pauses CSS animations while it takes a screenshot, which leaves the room sheet's panel at its invisible first frame
  cy.screenshot(name, { capture: "viewport", overwrite: true, disableTimersAndAnimations: false });
};

/** A fresh page, the seam up, and `heroId` signed in (localStorage is cleared between tests, the stores are not). */
const signIn = (heroId) => {
  cy.visit("/", { timeout: 300000 });
  cy.window({ timeout: 60000 }).should((win) => {
    expect(win.__xp, "development seam window.__xp").to.be.an("object");
  });
  cy.window().then((win) => {
    expect(win.__xp.loginUser(heroId), `${heroId} is loaded`).to.eq(true);
  });
  cy.tapToWakeAudio();
};

/** What the page knows of Max right now. */
const maxStats = () => cy.window().then((win) => win.__xp.getUser("hero-1").stats);
/** Waits (it retries) until `read(Max)` is `expected`: the app saves a hero a moment after the tap that changed them. */
const expectOnMax = (message, read, expected) =>
  cy.window().should((win) => {
    expect(read(win.__xp.getUser("hero-1")), message).to.eq(expected);
  });

const tapDialog = () => cy.get("[data-cy=battle-dialog]", { timeout: 20000 }).click("center");
/** Taps through whatever the box is saying until the command menu is back. */
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
/** Taps through the box until it says `text` (a line types out, and a tap finishes it before the next tap moves on). */
const tapUntilSays = (text, maxTaps = 8) => {
  const step = (left) => {
    cy.get("[data-cy=battle-dialog]", { timeout: 20000 }).then(($box) => {
      if ($box.text().includes(text) || left === 0) return;
      tapDialog();
      cy.wait(350);
      step(left - 1);
    });
  };
  step(maxTaps);
  cy.get("[data-cy=battle-dialog]", { timeout: 10000 }).should("contain", text);
};

/** Taps the room's beast (or, in a cleared room, the room button) and waits for the sheet that carries `bodyText`. */
const openRoomSheet = (bodyText) => {
  // The run reads the hero's board a moment after the room draws; the classic sheet answers until it has
  cy.wait(2500);
  cy.get(".xp-monster-model-wrapper, #room-action ion-fab-button", { timeout: 90000 }).first().click({ force: true });
  cy.get("[data-cy=choice-reveal]", { timeout: 20000 }).should("be.visible");
  cy.get("[data-cy=choice-body]", { timeout: 20000 }).should("contain", bodyText);
  cy.wait(1500); // the beast shows first, then the sheet slides in over the room
};

/** The Dish Goblin fight, reached from the room: the sheet's first button is Fight. */
const fightFromTheRoom = () => {
  cy.get("[data-cy=choice-0]").should("contain", "Fight").click();
  cy.location("pathname", { timeout: 60000 }).should("match", /^\/battle\/hero-1\/temple\//);
  cy.get(".battlefield", { timeout: 60000 }).should("exist");
  cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Dish Goblin");
  cy.wait(400);
  readUntilMenu(4);
};

/** Run Away, confirm, and tap through to the parting strike line. */
const runAway = () => {
  cy.contains(".menu-item", "Run Away").click();
  cy.get(".dialog-prompt").should("contain", "Run away?");
  cy.contains(".menu-item", /^\s*Run\s*$/).click();
  tapUntilSays("flees!");
};

/** Tackle one chore by name and confirm it. */
const finishChore = (name) => {
  cy.contains(".menu-item", "Tackle").click();
  cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
  cy.contains(".battle-task-item", name).click();
  cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
  cy.wait(300); // Done! ignores taps for 250 ms after the row is selected (double-tap guard)
  cy.get("[data-cy=task-confirm]").click();
};

/**
 * Runs the strike clock out until the hero falls and the fight leaves the battle page. Each lap: while the command menu is
 * up, the page's Date moves ten minutes on (the clock's deadline passes within a tick and the beast strikes); otherwise tap
 * through the box ("attacks!", the damage, "has fallen!", "carried to the Hospital").
 */
const loseTheFight = () => {
  const step = (left) => {
    cy.location("pathname").then((path) => {
      if (!path.startsWith("/battle/")) return;
      expect(left, "laps left before the hero falls").to.be.greaterThan(0);
      cy.get("body").then(($body) => {
        const hasMenu = $body.find(".menu-item").length > 0;
        const hasBox = $body.find("[data-cy=battle-dialog]").length > 0;
        if (hasMenu) {
          shiftMs += TEN_MINUTES;
          cy.wait(500);
        } else if (hasBox) {
          tapDialog();
          cy.wait(350);
        } else {
          cy.wait(300);
        }
        step(left - 1);
      });
    });
  };
  step(120);
};

/** The battle fixture's family: Dad (Game Master) and Max, who is low on HP and has 20 GP and no savings. */
const seedFamily = () => {
  cy.intercept("**/compass/v1/gatekeeper/xp-pro/*", { statusCode: 200, body: PRO });
  cy.fixture("battle-backup.json").then((backup) => {
    const world = JSON.parse(JSON.stringify(backup));
    const max = world.stores.__profiles[0];
    // 20 GP now (the Dish Goblin quest pays 20 more: 40 in the wallet at the lost fight) and none in savings (so the
    // Hospital's 100 leaves 60 owed); 12 of 42 HP, so a couple of strikes end a fight
    max.value.stats.gp.wallet = 20;
    max.value.stats.gp.savings = 0;
    max.value.stats.hp.now = 12;

    const dad = JSON.parse(JSON.stringify(max));
    dad.key = "gm-1";
    Object.assign(dad.value, {
      id: "gm-1",
      name: { full: "Dad", first: "Dad", last: "Power", middle: "", nick: "Dad" },
      isAdult: true,
      birthday: "1984-03-02",
      inventory: [],
    });
    world.stores.__profiles = [dad, max];

    // One extra quest, a plain chore with no beast that pays 60 GP when it is claimed from the Quest Log
    const socks = world.stores.__achievements[0].value;
    world.stores.__achievements.push({
      key: "quest-bed",
      value: { ...socks, id: "quest-bed", achievementName: "Make the bed", beastId: "", adventureType: "simple", xp: 60, gp: 60, ap: 3 },
    });

    cy.visit("/", { timeout: 300000 });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(world), { timeout: 60000 }));
  });
};

describe("Quest rooms: a temple full of real chores", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    Cypress.config("defaultCommandTimeout", 30000);
    shiftMs = 0;
    seedFamily();
  });

  // -------------------------------------------------------------------------------------------------------------------
  // Flow 1: wake, win, clear, return
  // -------------------------------------------------------------------------------------------------------------------

  it("the Game Master wakes the Shadow temple's Dish Goblin quest for Max", () => {
    cy.intercept("**/compass/v1/gatekeeper/xp-pro/*", { statusCode: 200, body: PRO });
    signIn("gm-1");
    go(`/game-master/compendium/temples/${TEMPLE}/beasts`);
    cy.get(".quests-head", { timeout: 90000 }).should("be.visible");
    cy.get(".theme-line").should("contain", "Kitchen · Shadow");
    cy.get(".quest-row", { timeout: 30000 }).first().should("be.visible");
    cy.get(".wake-open").should("contain", "Wake quests").and("contain", "asleep");
    shot("01-shadow-quests-tab");

    cy.get(".wake-open").click();
    cy.get(".wake-modal", { timeout: 20000 }).should("be.visible");
    // Max (the hero) is picked, Dad (the Game Master) is not
    cy.get(".wake-modal .hero-chip.is-on").should("have.length", 1).and("contain", "Max");
    // Every sleeping quest starts ticked: tick none, then only the Dish Goblin's
    cy.contains(".wake-modal .wake-all button", "None").click();
    cy.contains(".wake-modal .wake-row[role=checkbox]", "Load the dishwasher").click();
    cy.get(".wake-modal .wake-confirm").should("contain", "Wake 1 quest for Max");
    shot("02-wake-sheet-one-ticked");

    cy.get(".wake-modal .wake-confirm").click();
    cy.get(".wake-modal .wake-report", { timeout: 20000 }).should("contain", "Woke 1 quest for Max").and("contain", "Load the dishwasher");
    shot("03-wake-done");
    cy.get(".wake-modal .wake-confirm").contains("Done").click();
    cy.get(".wake-modal").should("not.be.visible");

    // The room now holds the quest instead of sleeping
    cy.contains(".quest-row", "Load the dishwasher").should("have.class", "kind-quest").find(".dot-lurking").should("have.length", 1);
    cy.get(".wake-open").should("contain", "8 asleep");
  });

  it("the Dish Goblin room lurks, and winning the fight completes the quest and clears the room", () => {
    signIn("hero-1");
    go(ROOM);
    // The beast is the quest's: the sheet words the chore, when it is due and nothing about a grudge
    cy.get(".xp-monster-model-wrapper", { timeout: 90000 }).should("be.visible").and("have.attr", "title", "Attack Dish Goblin");
    openRoomSheet("Load the dishwasher");
    // The beast is named in the title itself, with nothing repeated under it
    cy.get("[data-cy=choice-reveal]").should("contain", "A Dish Goblin approaches!");
    cy.get("[data-cy=choice-subtitle]").should("not.exist");
    // The machine may be past 7pm: "Due 7:00pm" or "Was due 7:00pm"
    cy.get("[data-cy=choice-body]").invoke("text").should("match", /due/i);
    cy.get("[data-cy=choice-body]").should("not.contain", "Grudge");
    shot("04-room-lurks");

    maxStats().then((stats) => {
      expect(stats.gp.wallet, "wallet before the fight").to.eq(20);
    });
    fightFromTheRoom();
    cy.get(".chores-left-label").should("have.text", "4 tasks left");
    cy.get(".attack-timer-label").should("contain", ":");
    shot("05-fight-begins");

    CHORES.forEach((chore, index) => {
      finishChore(chore);
      if (index < CHORES.length - 1) {
        const left = CHORES.length - 1 - index;
        cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", `${left} ${left === 1 ? "task" : "tasks"} left`);
        readUntilMenu();
      }
    });
    cy.get("[data-cy=victory-card]", { timeout: 15000 }).should("be.visible");
    cy.wait(1800);
    shot("06-victory");
    cy.get("[data-cy=victory-card]").click("center");

    // Back in the temple: the quest paid its 20 GP (the formula is 10 x difficulty 2), the room is cleared and the beast is gone
    cy.location("pathname", { timeout: 30000 }).should("eq", `/temple/${TEMPLE}/hero-1/2/5`);
    cy.get("#room-action .cleared-mark", { timeout: 60000 }).should("exist");
    cy.get(".xp-monster-model-wrapper").should("not.exist");
    maxStats().then((stats) => {
      expect(stats.gp.wallet, "wallet after the win: the quest paid its 20 GP").to.eq(40);
    });
    openRoomSheet("Back tomorrow");
    cy.get("[data-cy=choice-reveal]").should("contain", "Nothing left here but the smell.");
    cy.get("[data-cy=choice-body]").should("contain", "Load the dishwasher");
    shot("07-room-cleared");
    cy.get("[data-cy=choice-leave]").click();

    // The board says the same: the quest is Tamed
    go("/my-tasks/hero-1");
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get(`ion-card#${QUEST_ID}`, { timeout: 30000 }).scrollIntoView().should("have.class", "is-tamed");
    cy.get(`ion-card#${QUEST_ID} .tamed-ribbon`).should("be.visible");
    shot("08-board-tamed");
  });

  it("the next day the beast is back", () => {
    shiftMs = DAY;
    signIn("hero-1");
    go("/my-tasks/hero-1");
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get(`ion-card#${QUEST_ID}`, { timeout: 30000 }).scrollIntoView().should("not.have.class", "is-tamed");
    shot("09-board-open-again");

    go(ROOM);
    cy.get(".xp-monster-model-wrapper", { timeout: 90000 }).should("be.visible").and("have.attr", "title", "Attack Dish Goblin");
    cy.get("#room-action .cleared-mark").should("not.exist");
    openRoomSheet("Load the dishwasher");
    cy.get("[data-cy=choice-reveal]").should("contain", "A Dish Goblin approaches!");
    cy.get("[data-cy=choice-body]").should("not.contain", "Grudge");
    shot("10-next-day-beast-is-back");
  });

  // -------------------------------------------------------------------------------------------------------------------
  // Flow 2: run, the parting strike and the grudge
  // -------------------------------------------------------------------------------------------------------------------

  it("running from the Dish Goblin costs one strike and leaves one grudge mark", () => {
    signIn("hero-1");
    go(ROOM);
    cy.get(".xp-monster-model-wrapper", { timeout: 90000 }).should("be.visible");
    openRoomSheet("Load the dishwasher");
    fightFromTheRoom();
    cy.get("[data-cy=grudge-marks]").should("not.exist");
    cy.window().then((win) => {
      win.Math.random = () => 0.5; // lands the parting strike (agility only dodges under its few percent)
    });

    maxStats().then((before) => {
      expect(before.hp.now, "HP going in: enough to take one strike").to.be.within(9, 12);
      runAway();
      cy.get("[data-cy=battle-dialog]").should(($box) => {
        expect($box.text()).to.match(/Dish Goblin strikes as Max flees! Max takes \d+ damage!/);
      });
      cy.get("[data-cy=battle-dialog]").then(($box) => {
        const damage = Number($box.text().match(/takes (\d+) damage/)[1]);
        // One strike is about 12% of Max's 42 max HP
        expect(damage, "the parting strike").to.be.within(3, 8);
        shot("11-parting-strike");
        tapUntilSays("Got away safely");
        tapDialog();
        cy.location("pathname", { timeout: 30000 }).should("eq", `/temple/${TEMPLE}/hero-1/2/5`);
        maxStats().then((after) => {
          expect(after.hp.now, "HP after the parting strike").to.eq(before.hp.now - damage);
        });
      });
    });
    expectOnMax("grudge marks after running", (max) => max.questGrudges?.[QUEST_ID]?.marks ?? 0, 1);
    // The beast still lurks: running does not clear a room
    cy.get(".xp-monster-model-wrapper", { timeout: 60000 }).should("be.visible");
    shot("12-back-in-the-room");
  });

  it("the next fight shows the grudge mark on the beast", () => {
    signIn("hero-1");
    go(ROOM);
    cy.get(".xp-monster-model-wrapper", { timeout: 90000 }).should("be.visible");
    openRoomSheet("Grudge x1");
    cy.get("[data-cy=choice-body]").should("contain", "Load the dishwasher");
    shot("13-room-says-grudge");
    fightFromTheRoom();
    cy.get("[data-cy=grudge-marks] .grudge-mark").should("have.length", 1);
    cy.get("[data-cy=grudge-marks]").should("have.attr", "aria-label", "Holds a grudge: 1 mark, hits 25% harder");
    shot("14-fight-with-one-mark");

    // -----------------------------------------------------------------------------------------------------------------
    // Flow 3: this fight is lost, with 40 GP in the wallet
    // -----------------------------------------------------------------------------------------------------------------
    cy.window().then((win) => {
      win.Math.random = () => 0.5;
    });
    maxStats().then((stats) => {
      expect(stats.gp.wallet, "wallet at the lost fight").to.eq(40);
      expect(stats.gp.savings, "savings at the lost fight").to.eq(0);
      expect(stats.hp.now, "HP at the lost fight is under three strikes").to.be.lessThan(12);
    });
    loseTheFight();
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/hospital\/hero-1\/?$/);

    // Nurse Joy reads the bill: her lines type themselves out, and a tap on a finished line moves on to the next
    cy.get(".nurse-dialog-box", { timeout: 30000 }).should("contain", "full HP and full MP.");
    shot("15-carried-to-the-hospital");
    cy.get(".nurse-dialog-overlay").click("center");
    cy.get(".nurse-dialog-box", { timeout: 30000 }).should("contain", "paid at the Gold Bank.");
    cy.get(".nurse-dialog-box").should("contain", "Treatment: ₲100. ₲40 from your wallet, ₲60 still owed.");
    shot("16-nurse-reads-the-bill");

    maxStats().then((stats) => {
      expect(stats.hp.now, "HP after treatment").to.eq(stats.hp.max);
      expect(stats.mp.now, "MP after treatment").to.eq(stats.mp.max);
      expect(stats.gp.wallet, "wallet after the bill").to.eq(0);
      expect(stats.gp.savings, "savings after the bill").to.eq(0);
      expect(stats.gp.hospitalBill, "the bill still owed").to.eq(60);
    });
  });

  it("Max is GROUNDED: the chip shows 60 owed and the Power's Cast is refused", () => {
    signIn("hero-1");
    go("/my-portal/hero-1/home-town");
    cy.get("[data-cy=grounded-chip]", { timeout: 60000 }).should("be.visible").and("contain", "GROUNDED").and("contain", "₲60");
    cy.wait(1500);
    shot("17-grounded-chip-on-the-hud");

    go("/my-abilities/hero-1/");
    cy.contains("ion-title", "My Powers", { timeout: 60000 }).should("exist");
    cy.get(".power-card[data-ability-id=ability-stop]", { timeout: 30000 }).scrollIntoView().within(() => {
      cy.get(".cast-btn").should("be.disabled");
      cy.get(".power-state").should("contain", "Grounded: pay your hospital bill at the Gold Bank.");
    });
    shot("18-cast-refused-while-grounded");
    // A tap on the disabled button does nothing: the MP stays whole
    cy.get(".power-card[data-ability-id=ability-stop] .cast-btn").click({ force: true });
    maxStats().then((stats) => {
      expect(stats.mp.now, "MP after the refused cast").to.eq(stats.mp.max);
    });

    // The room's beast still lurks after the lost fight, and the temple's own bar carries the same chip
    go(ROOM);
    cy.get(".xp-monster-model-wrapper", { timeout: 90000 }).should("be.visible");
    cy.get("[data-cy=grounded-chip]").should("be.visible").and("contain", "₲60");
    shot("19-temple-bar-grounded");
  });

  it("a quest pays 60 GP, the Gold Bank takes the bill and the chip goes", () => {
    signIn("hero-1");
    go("/my-tasks/hero-1");
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get("ion-card#quest-bed", { timeout: 30000 }).scrollIntoView().should("be.visible");
    cy.get("ion-card#quest-bed").click();
    cy.get("ion-modal ion-card-title", { timeout: 20000 }).should("contain", "Make The Bed");
    cy.contains("ion-modal ion-fab-list ion-button", "Claim", { timeout: 20000 }).should("be.visible");
    cy.wait(600);
    cy.contains("ion-modal ion-fab-list ion-button", "Claim").click();
    cy.contains("ion-alert button", "Yes", { timeout: 10000 }).click();
    cy.get("ion-modal ion-card.user-stats", { timeout: 20000 }).should("be.visible");
    maxStats().then((stats) => {
      expect(stats.gp.wallet, "the chore paid 60 GP").to.eq(60);
      expect(stats.gp.hospitalBill, "the bill is still owed").to.eq(60);
    });
    shot("20-claimed-60-gp");
    // The reward card is a modal of the Quest Log page, which Ionic keeps under the next page: close it first
    cy.window().then((win) => {
      win.document.querySelectorAll("ion-modal").forEach((modal) => modal.dismiss());
    });
    cy.get("ion-modal.show-modal", { timeout: 20000 }).should("not.exist");

    // The chip takes Max to the Gold Bank; the ATM pays the hospital bill first
    go("/my-portal/hero-1/home-town");
    cy.get("[data-cy=grounded-chip]", { timeout: 60000 }).should("be.visible").click();
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/bank\/hero-1\/?$/);
    cy.get(".ion-page.gold-bank", { timeout: 30000 }).should("exist");
    cy.wait(1000);
    cy.get(".ion-page.gold-bank ion-toolbar ion-buttons[slot=end] ion-button").click();
    // The ATM opens its action sheet by itself half a second later, over the account summary
    cy.get("ion-modal.atm-modal.show-modal", { timeout: 20000 }).should("exist");
    cy.get("ion-modal.atm-modal .hospital-bill-line").should("contain", "₲60");
    shot("21-atm-shows-the-bill");
    cy.contains("ion-action-sheet button", "Pay Hospital Bill", { timeout: 20000 }).click();
    cy.get("ion-alert", { timeout: 20000 }).should("exist");
    cy.get("ion-alert input").clear().type("60");
    cy.contains("ion-alert button", /^\s*Pay\s*$/).click();
    expectOnMax("the bill after paying", (max) => max.stats.gp.hospitalBill, 0);
    expectOnMax("wallet after paying 60", (max) => max.stats.gp.wallet, 0);
    cy.wait(800);
    shot("22-bill-paid");

    // Free: the chip is gone
    go("/my-portal/hero-1/home-town");
    cy.get("[data-cy=grounded-chip]", { timeout: 30000 }).should("not.exist");
    shot("23-chip-gone");
  });

  it("and with the bill paid the Power casts", () => {
    // A fresh page: the Powers page under the stack of screens the last test walked through is covered by them
    signIn("hero-1");
    go("/my-abilities/hero-1/");
    cy.contains("ion-title", "My Powers", { timeout: 60000 }).should("exist");
    cy.get(".power-card[data-ability-id=ability-stop] .cast-btn", { timeout: 30000 }).scrollIntoView().should("not.be.disabled");
    shot("24-cast-is-open");
    // Stop costs 25 MP. (The claim's XP levelled Max up, which settled his MP at the class's own number, so read it first.)
    maxStats().then((before) => {
      expect(before.mp.now, "MP before the cast covers the 25 MP").to.be.at.least(25);
      cy.get(".power-card[data-ability-id=ability-stop] .cast-btn").click();
      cy.get(".power-card[data-ability-id=ability-stop] .cast-btn", { timeout: 20000 }).should("be.disabled");
      expectOnMax("MP after the cast", (max) => max.stats.mp.now, before.mp.now - 25);
    });
    // The card no longer blames the Hospital: it is spent now (the card says what it needs next, not the grounding)
    cy.get(".power-card[data-ability-id=ability-stop] .power-state").should("not.contain", "Grounded");
    shot("25-power-cast");
  });
});
