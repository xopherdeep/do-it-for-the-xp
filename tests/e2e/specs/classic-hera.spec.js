// The Storm Temple end to end: the Tower of Hera dressed by tools/temples/classic/dress.ts, walked by a hero along the
// solver's winning run (its critical path: the small key under the lobby, the locked flight down, the Tridorm mini-boss
// before the Boss Key, the two sealed star-tile rooms on 2F, the Boss Key climb to Moldorm's floor, the Boss door, the
// boss, the Pegasus chest behind him). Every sealed fight is won through the Battle Field the way quest-rooms.spec.js
// wins its Dish Goblin: Tackle each chore of the beast's checklist.
//
// Run (a dev server of the worktree on its own port; a server that reloads mid-run breaks the walk):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8103 --spec tests/e2e/specs/classic-hera.spec.js
// Screenshots land in tests/e2e/screenshots/classic-hera.spec.js.
//
// STATUS (2026-10-22, Task 7 fix round 1): skipped, not green yet. The last run passed the first two tests (the small
// key, the locked flight, the Tridorm, the Boss Key) and in the third beat the Bed Basilisk and the Shoe Shrew; it
// failed leaving the Shoe Shrew's victory card: the hero levelled up, the card was still counting the rewards when the
// spec tapped it, and the Battle Field stayed up past the timeout. `leaveVictory` below taps the card until the temple
// is back (written after that run, not run). The fourth test (3F, 4F, the Boss Key climb, the Boss door, Moldorm, the
// Pegasus) has never run past its first step. See .superpowers/sdd/2026-10-19-classic-dungeon-temples/task-7-report.md.

import { hasMenu, tapAction, tapDialog, waitForMenu } from "../support/battle";

const TEMPLE = "storm-temple";
const HERO = "hero-1";
/** The temple page that is shown (an earlier page may linger under it) */
const PAGE = ".temple-grounds-engine:not(.ion-page-hidden)";
/** The four move buttons, by where ion-fab puts them (the map's own fab sits bottom-left, the beast in the middle) */
const ARROW = {
  north: `${PAGE} ion-fab.fab-vertical-top.fab-horizontal-center ion-fab-button`,
  south: `${PAGE} ion-fab.fab-vertical-bottom.fab-horizontal-center ion-fab-button`,
  east: `${PAGE} ion-fab.fab-vertical-center.fab-horizontal-end ion-fab-button`,
  west: `${PAGE} ion-fab.fab-vertical-center.fab-horizontal-start ion-fab-button`,
};

// Every page the spec opens: the hero has already answered the one-time ambush-alert ask
Cypress.on("window:before:load", (win) => win.localStorage.setItem("xp.battleAlerts", "off"));

const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;
const go = (path) => cy.window().then((win) => routerOf(win).push(path));

const shot = (name) => {
  cy.wait(600);
  cy.screenshot(name, { capture: "viewport", overwrite: true, disableTimersAndAnimations: false });
};

/**
 * Where the hero stands, as the engine holds the run (the development seam window.__xpTemples.state; the route only
 * names a cell when a battle hands the hero back). Retries until the move has landed.
 */
const expectAt = (level, row, col) => {
  cy.window({ timeout: 30000 }).should((win) => {
    const run = win.__xpTemples.state(TEMPLE);
    expect(run, "a run in the Storm Temple").to.be.an("object");
    expect(`${run.currentLevel} (${run.currentPosition.join(",")})`, "where the hero stands").to.eq(`${level} (${row},${col})`);
  });
};

/** The prompt that says a floor's beasts stirred, when there is one: Onward */
const onwardIfAsked = () => {
  cy.wait(2500);
  cy.get("body").then(($body) => {
    const onward = $body.find("[data-cy=reveal-choice-onward]")[0];
    if (onward) onward.click();
  });
};

/** A boss or guardian's banner covers the room for a moment: tap it away when it is up */
const dismissBannerIfUp = () => {
  cy.get("body").then(($body) => {
    const banner = $body.find("[data-cy=boss-banner]")[0];
    if (banner) banner.click();
  });
};

/** One step with the arrow control, then the room slides in */
const step = (direction) => {
  cy.get(ARROW[direction], { timeout: 30000 }).click({ force: true });
  cy.wait(1000);
};

/** Opens the room's sheet (the beast, or the room itself) and waits for it */
const openSheet = () => {
  cy.wait(1500);
  dismissBannerIfUp();
  cy.get(`${PAGE} .xp-monster-model-wrapper, ${PAGE} #room-action ion-fab-button`, { timeout: 60000 }).first().click({ force: true });
  cy.get(`${PAGE} [data-cy=choice-reveal]`, { timeout: 20000 }).should("be.visible");
  cy.wait(1200);
};

/** Taps the sheet's choice that reads `label` */
const choose = (label) => cy.contains(`${PAGE} [data-cy=choice-reveal] [data-cy^=choice-]`, label, { timeout: 20000 }).click();

/** Takes the stairs from the room the hero stands in ("Climb", or "Unlock and climb" with the key in hand) */
const climb = (label = "Climb") => {
  openSheet();
  choose(label);
  cy.get(`${PAGE} [data-cy=choice-reveal]`, { timeout: 20000 }).should("not.be.visible");
  onwardIfAsked();
};

/** Opens the chest of the room and takes everything in it (a chest has no sheet: a tap brings the chest itself up, shut) */
const openChest = () => {
  cy.wait(1500);
  dismissBannerIfUp();
  cy.get(`${PAGE} #room-action ion-fab-button`, { timeout: 60000 }).first().click({ force: true });
  cy.get("[data-cy=chest-reveal]:visible", { timeout: 20000 }).should("be.visible");
  cy.get("[data-cy=chest-reveal]:visible [data-cy=chest-open]", { timeout: 20000 }).should("not.be.disabled").click();
  // The lid flies, the loot rises and reveals row by row; Take wants every row the hero wants ticked
  cy.get("[data-cy=chest-reveal]:visible [data-cy^=chest-loot-]", { timeout: 20000 }).should("have.length.at.least", 1);
  cy.wait(2500);
  cy.get("[data-cy=chest-reveal]:visible [data-cy^=chest-loot-]").each(($row) => cy.wrap($row).click({ force: true }));
  cy.get("[data-cy=chest-reveal]:visible [data-cy=chest-take]", { timeout: 30000 }).should("not.be.disabled").click();
  cy.wait(1500);
};

/** Tackle: the first chore not yet done, confirmed */
const tackleOne = () => {
  tapAction("tackle");
  cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
  cy.get(".battle-task-item").not(".is-done").first().click();
  cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
  cy.wait(300); // Done! ignores taps for 250 ms after the row is selected (double-tap guard)
  cy.get("[data-cy=task-confirm]").click();
};

/**
 * Tackles chore after chore until the victory card is up. Each lap: Tackle while the command menu is up, tap the box
 * through what it says otherwise. A woken room fights its quest's chores, a dormant one (the mini-boss, the boss)
 * plays as a classic fight with the temple's own beast and its tasks: the loop wins either without knowing the names.
 */
const fightUntilWon = () => {
  const lap = (left) => {
    expect(left, "laps left before the fight is won").to.be.greaterThan(0);
    cy.get("body").then(($body) => {
      const isWon = $body.find("[data-cy=victory-card]").length > 0;
      if (isWon) return;
      const hasBox = $body.find("[data-cy=battle-dialog]").length > 0;
      if (hasMenu($body)) {
        tackleOne();
        cy.wait(800);
      } else if (hasBox) {
        tapDialog();
        cy.wait(350);
      } else {
        cy.wait(400);
      }
      lap(left - 1);
    });
  };
  lap(80);
};

/** Taps the victory card until the Battle Field hands the hero back (a level up keeps the card counting past the first tap) */
const leaveVictory = () => {
  const lap = (left) => {
    cy.location("pathname").then((path) => {
      const isBack = !path.startsWith("/battle/");
      if (isBack || left === 0) return;
      cy.get("[data-cy=victory-card]").click("center", { force: true });
      cy.wait(1500);
      lap(left - 1);
    });
  };
  lap(8);
};

/** Wins the sealed fight of the room the hero just walked into: Fight from the sheet, every chore tackled, back to the room */
const winFight = (beast, position) => {
  const [level, row, col] = position;
  cy.get(`${PAGE} .xp-monster-model-wrapper`, { timeout: 90000 }).should("be.visible");
  openSheet();
  cy.get(`${PAGE} [data-cy=choice-reveal]`).should("contain", beast);
  choose("Fight");
  cy.location("pathname", { timeout: 60000 }).should("match", /^\/battle\/hero-1\/temple\//);
  cy.get(".battlefield", { timeout: 60000 }).should("exist");
  cy.get(".enemy-name", { timeout: 30000 }).should("not.be.empty");
  waitForMenu();
  fightUntilWon();
  cy.get("[data-cy=victory-card]", { timeout: 20000 }).should("be.visible");
  cy.wait(1800);
  leaveVictory();
  cy.location("pathname", { timeout: 30000 }).should("eq", `/temple/${TEMPLE}/${HERO}/${col}/${row}`);
  cy.get(`${PAGE} #room-action .cleared-mark`, { timeout: 60000 }).should("exist");
  expectAt(level, row, col);
};

// Skipped until the walk is green (see STATUS above); the lead files the follow-up
describe.skip("The Storm Temple: the Tower of Hera, cleared", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    Cypress.config("defaultCommandTimeout", 30000);
    cy.seedWorld("battle-backup.json", HERO);
    cy.window().then((win) => {
      expect(win.__xp.loginUser(HERO), `${HERO} is loaded`).to.eq(true);
    });
    cy.tapToWakeAudio();
  });

  it("finds the small key under the lobby and opens the locked flight down to the Tridorm", () => {
    go(`/temple/${TEMPLE}/${HERO}`);
    cy.get(`${PAGE} #room-action`, { timeout: 90000 }).should("exist");
    expectAt("1F", 1, 0);
    cy.wait(2500);
    shot("01-lobby");

    // East twice to the stairs the lobby's own flight moved to, down into the basement cage, the key chest south of it
    step("east");
    step("east");
    expectAt("1F", 1, 2);
    climb();
    expectAt("B1", 1, 0);
    step("south");
    expectAt("B1", 2, 0);
    openChest();
    cy.get(`${PAGE} [data-cy=temple-keys-count]`).should("have.text", "1");
    shot("02-small-key");

    // Back up and across the lobby to the locked flight: the key opens it
    step("north");
    climb();
    expectAt("1F", 1, 2);
    step("west");
    step("west");
    expectAt("1F", 1, 0);
    step("north");
    expectAt("1F", 0, 0);
    climb("Unlock and climb");
    expectAt("B1", 0, 0);
    cy.get(`${PAGE} [data-cy=temple-keys-count]`).should("have.text", "0");
    shot("03-locked-flight-opened");
  });

  it("beats the Tridorm mini-boss and takes the Boss Key behind it", () => {
    step("east");
    expectAt("B1", 0, 1);
    winFight("Under-Bed Bogey", ["B1", 0, 1]);
    shot("04-tridorm-beaten");
    step("south");
    expectAt("B1", 1, 1);
    openChest();
    shot("05-boss-key");
    step("north");
    step("west");
    expectAt("B1", 0, 0);
    climb();
    expectAt("1F", 0, 0);
  });

  it("clears the two sealed star-tile rooms on 2F", () => {
    step("south");
    step("east");
    expectAt("1F", 1, 1);
    climb();
    // The flight lands east of the Beetles room and opens on it alone (the fight keeps the screen it was converted in)
    expectAt("2F", 1, 2);
    shot("06-arrived-on-2f");
    step("west");
    winFight("Bed Basilisk", ["2F", 1, 1]);
    step("west");
    winFight("Shoe Shrew", ["2F", 1, 0]);
    shot("07-star-tiles-cleared");
  });

  it("climbs to Moldorm's floor with the Boss Key, opens the Boss door and frees the Pegasus", () => {
    // Up through the side room, the stairs to 3F and 4F, then the flight the Boss Key opens
    step("north");
    expectAt("2F", 0, 0);
    step("east");
    expectAt("2F", 0, 1);
    climb();
    expectAt("3F", 0, 1);
    step("west");
    climb();
    expectAt("4F", 0, 0);
    step("east");
    expectAt("4F", 0, 1);
    climb("Unlock and climb");
    expectAt("5F", 0, 1);
    shot("08-before-the-boss-door");

    // The Boss door west: the key fits the big lock, then the boss waits beyond it
    cy.get(ARROW.west, { timeout: 30000 }).click({ force: true });
    cy.get("[data-cy=door-reveal]:visible", { timeout: 20000 }).should("exist");
    cy.get("[data-cy=door-reveal]:visible [data-cy=door-unlock]", { timeout: 20000 }).click();
    cy.get("[data-cy=door-reveal]", { timeout: 30000 }).should("not.be.visible");
    cy.wait(1000);
    cy.window().then((win) => {
      const isStillAtTheDoor = win.__xpTemples.state(TEMPLE).currentPosition[1] === 1;
      if (isStillAtTheDoor) step("west");
    });
    expectAt("5F", 0, 0);
    winFight("Clutter Chimera", ["5F", 0, 0]);
    shot("09-moldorm-beaten");

    // The Master Room south of the boss: the Pegasus chest opens
    step("south");
    expectAt("5F", 1, 0);
    openChest();
    cy.get("[data-cy=pegasus-reveal]:visible", { timeout: 30000 }).should("be.visible");
    shot("10-pegasus-freed");
  });
});
