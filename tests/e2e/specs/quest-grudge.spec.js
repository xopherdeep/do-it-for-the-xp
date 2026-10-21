// Grudge marks walk-through (docs/Quest-Rooms-Spec.md 5.7): running from a quest fight leaves a red mark on the quest's
// beast, each mark makes its strikes 25% harder, and beating the beast clears them. Keeps a screenshot of every step.
// The fixture hero has 20/42 HP and some trained strength, so the numbers are read off the screen: each parting strike
// must cost more than the one before (+25% a mark) and the hero's HP must drop by exactly what the line says.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/quest-grudge.spec.js

import { readUntilMenu, runAway, tapAction, tapDialog, tapUntilSays, waitForMenu } from "../support/battle";

const QUEST_ID = "quest-socks";
const QUEST_FIGHT = `/battle/hero-1/quest/${QUEST_ID}`;

const shot = (name) => {
  cy.wait(500);
  cy.screenshot(name, { capture: "viewport" });
};

/** Signs Max in (localStorage is cleared between tests) and opens the Socktopus quest fight at a middling roll. */
const enterQuestFight = () => {
  cy.visit("/", { timeout: 120000 });
  cy.window({ timeout: 60000 }).should((win) => {
    expect(win.__xp, "development seam window.__xp").to.be.an("object");
  });
  cy.window().then((win) => {
    expect(win.__xp.loginUser("hero-1"), "Max is signed in").to.eq(true);
  });
  cy.visit(QUEST_FIGHT, { timeout: 120000 });
  cy.tapToWakeAudio();
  cy.window().then((win) => {
    win.Math.random = () => 0.5; // lands every strike (agility only dodges under its few percent)
  });
  cy.get(".battlefield", { timeout: 60000 }).should("exist");
  cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Socktopus");
  waitForMenu();
};

/** What each parting strike cost, in the order the fights ran. */
const damages = [];
/** Reads "Max takes N damage" off the box and keeps N. */
const rememberDamage = () =>
  cy.get("[data-cy=battle-dialog]").should(($box) => {
    expect($box.text()).to.match(/takes \d+ damage/);
  }).then(($box) => {
    damages.push(Number($box.text().match(/takes (\d+) damage/)[1]));
  });
/** Waits for the hero card to read the HP `expected()` gives (a function, so it is read when the check runs). */
const expectHp = (expected) =>
  cy.get("[data-cy=hero-card] .hp-value").should(($value) => {
    expect(Number($value.text()), "HP on the hero card").to.eq(expected());
  });

const marksOnHero = () =>
  cy.window().then((win) => win.__xp.getUser("hero-1").questGrudges?.[QUEST_ID]?.marks ?? 0);

describe("Grudge marks", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    cy.seedWorld();
  });

  it("a first fight shows no marks, and running costs a plain strike and leaves one mark", () => {
    enterQuestFight();
    cy.get("[data-cy=grudge-marks]").should("not.exist");
    expectHp(() => 20);
    shot("01-first-fight-no-marks");

    runAway();
    rememberDamage();
    shot("02-first-parting-strike");
    tapUntilSays("Got away safely");
    tapDialog();
    cy.location("pathname", { timeout: 30000 }).should("not.match", /^\/battle\//);
    marksOnHero().should("eq", 1);
  });

  it("the second fight: one red mark on the beast, a 25% harder strike, and another mark", () => {
    enterQuestFight();
    cy.get("[data-cy=grudge-marks] .grudge-mark").should("have.length", 1);
    cy.get("[data-cy=grudge-marks]").should("have.attr", "aria-label", "Holds a grudge: 1 mark, hits 25% harder");
    expectHp(() => 20 - damages[0]);
    shot("03-second-fight-one-mark");

    runAway();
    rememberDamage().then(() => expect(damages[1], "one mark hits harder").to.be.greaterThan(damages[0]));
    shot("04-second-parting-strike");
    tapUntilSays("Got away safely");
    tapDialog();
    cy.location("pathname", { timeout: 30000 }).should("not.match", /^\/battle\//);
    marksOnHero().should("eq", 2);
  });

  it("the third fight: two marks and a 50% harder strike", () => {
    enterQuestFight();
    cy.get("[data-cy=grudge-marks] .grudge-mark").should("have.length", 2);
    cy.get("[data-cy=grudge-marks]").should("have.attr", "aria-label", "Holds a grudge: 2 marks, hits 50% harder");
    expectHp(() => 20 - damages[0] - damages[1]);
    shot("05-third-fight-two-marks");

    runAway();
    rememberDamage().then(() => expect(damages[2], "two marks hit harder still").to.be.greaterThan(damages[1]));
    shot("06-third-parting-strike");
    tapUntilSays("Got away safely");
    tapDialog();
    cy.location("pathname", { timeout: 30000 }).should("not.match", /^\/battle\//);
    marksOnHero().should("eq", 3);
  });

  it("beating the beast clears the marks", () => {
    enterQuestFight();
    cy.get("[data-cy=grudge-marks] .grudge-mark").should("have.length", 3);
    shot("07-fourth-fight-three-marks");

    ["Sort the socks", "Match the pairs", "Put them away"].forEach((chore, index) => {
      tapAction("tackle");
      cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
      cy.contains(".battle-task-item", chore).click();
      cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
      cy.wait(300); // Done! ignores taps for 250 ms after the row is selected (double-tap guard)
      cy.get("[data-cy=task-confirm]").click();
      if (index < 2) {
        const left = 2 - index;
        cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", `${left} ${left === 1 ? "task" : "tasks"} left`);
        readUntilMenu();
      }
    });
    cy.get("[data-cy=victory-card]", { timeout: 15000 }).should("be.visible");
    cy.wait(1800);
    shot("08-victory");
    marksOnHero().should("eq", 0);
    cy.get("[data-cy=victory-card]").click("center");
  });
});
