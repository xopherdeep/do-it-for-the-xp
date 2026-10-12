// Battle Field walk-through: renders the real page in Chrome and keeps a screenshot of every phase.
// Run (dev server on :8080 first):
//   pnpm exec cypress run --browser chrome --headless --config baseUrl=http://127.0.0.1:8080 --spec tests/e2e/specs/battle.spec.js

const shot = (name) => {
  cy.wait(500);
  cy.screenshot(name, { capture: "viewport" });
};
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
  cy.get(".menu-item", { timeout: 10000 }).should("have.length", 4);
};
/** Opens the checklist and confirms one chore by name. */
const finishChore = (name) => {
  cy.contains(".menu-item", "Tackle").click();
  cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
  cy.contains(".battle-task-item", name).click();
  cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
  cy.wait(300); // Done! ignores taps for 250 ms after the row is selected (double-tap guard)
};

describe("Battle Field", () => {
  before(() => {
    cy.seedWorld();
  });

  it("fights the Socktopus from the intro to the walk home", () => {
    cy.visit("/battle/hero-1/free/beast-socktopus", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get(".battlefield", { timeout: 60000 }).should("exist");
    cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Socktopus");
    cy.get("[data-cy=hero-card]").should("contain", "Max");

    // Intro: the line types out (a tap finishes it), the next tap starts the fight.
    cy.wait(400);
    shot("01-intro-typing");
    cy.get("[data-cy=battle-dialog]").should("contain", "From the dark forces of chaos comes Socktopus!!!");
    shot("02-intro-read");
    readUntilMenu(3);
    cy.get(".chores-left-label").should("have.text", "3 chores left");
    cy.get(".attack-timer-label").should("contain", ":");
    shot("03-menu");

    // Attack = the checklist. Picking a chore asks for an in-row confirmation, never an alert.
    finishChore("Sort the socks");
    cy.get("ion-alert").should("not.exist");
    shot("04-checklist-confirm");
    cy.get("[data-cy=task-confirm]").click();
    cy.get("[data-cy=task-sheet]").should("not.exist");
    cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", "2 chores left");
    shot("05-chore-done");
    readUntilMenu();

    // Run Away asks first: finished chores would not count.
    cy.contains(".menu-item", "Run Away").click();
    cy.get(".dialog-prompt").should("contain", "Run away?");
    shot("06-run-confirm");
    cy.contains(".menu-item", "Keep fighting").click();
    cy.get(".menu-item").should("have.length", 3);

    // Defend trades a glancing hit now for a fresh clock: the hit lands when the line is tapped away.
    cy.contains(".menu-item", "Defend").click();
    cy.get("[data-cy=battle-dialog]").should("contain", "braces!");
    cy.wait(1300);
    tapDialog();
    cy.get("[data-cy=battle-dialog]", { timeout: 5000 }).should("contain", "attacks!");
    tapDialog();
    cy.wait(300);
    tapDialog();
    cy.get("[data-cy=battle-dialog]", { timeout: 5000 }).should("contain", "braced: only");
    shot("07-glancing-hit");
    readUntilMenu();

    // Two more chores win the fight; rewards land at once and the victory card counts them up.
    finishChore("Match the pairs");
    cy.get("[data-cy=task-confirm]").click();
    cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", "1 chore left");
    readUntilMenu();
    finishChore("Put them away");
    cy.get("[data-cy=task-confirm]").click();
    cy.get("[data-cy=victory-card]", { timeout: 15000 }).should("be.visible");
    cy.wait(1800);
    cy.get(".reward-value[data-stat=ap]").should("have.text", "1"); // a free fight pays AP only
    shot("08-victory");
    cy.get("[data-cy=victory-card]").click("center");
    // Any level-up lines, then home
    cy.location("pathname", { timeout: 20000 }).should("match", /home-town|hometown|portal|my-portal/);
    shot("09-home");
  });
});
