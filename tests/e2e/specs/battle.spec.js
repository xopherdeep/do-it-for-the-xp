// Battle Field walk-through: renders the real page in Chrome and keeps a screenshot of every phase.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/battle.spec.js

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
  cy.get(".menu-item", { timeout: 10000 }).should("have.length", 5);
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
    cy.get(".chores-left-label").should("have.text", "3 tasks left");
    cy.get(".attack-timer-label").should("contain", ":");
    shot("03-menu");

    // Tackle = the checklist. Picking a chore asks for an in-row confirmation, never an alert.
    finishChore("Sort the socks");
    cy.get("ion-alert").should("not.exist");
    shot("04-checklist-confirm");
    cy.get("[data-cy=task-confirm]").click();
    cy.get("[data-cy=task-sheet]").should("not.exist");
    cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", "2 tasks left");
    shot("05-chore-done");
    readUntilMenu();

    // Run Away asks first: finished chores would not count.
    cy.contains(".menu-item", "Run Away").click();
    cy.get(".dialog-prompt").should("contain", "Run away?");
    shot("06-run-confirm");
    cy.contains(".menu-item", "Keep fighting").click();
    cy.get(".menu-item").should("have.length", 5);

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
    cy.get(".chores-left-label", { timeout: 5000 }).should("have.text", "1 task left");
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

/** A fresh seeded world and a fresh fight: the fixture hero has 20/42 HP, 300 MP, two Health Potions and the Stop Power. */
const enterFight = () => {
  cy.seedWorld();
  cy.visit("/battle/hero-1/free/beast-socktopus", { timeout: 120000 });
  cy.tapToWakeAudio();
  cy.get(".battlefield", { timeout: 60000 }).should("exist");
  cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Socktopus");
  cy.wait(400);
  readUntilMenu(3);
  cy.get(".attack-timer-label").should("contain", ":");
};

describe("Battle Field: Goods and Powers", () => {
  beforeEach(() => {
    enterFight();
  });

  it("Goods: the Ice Wand buys time and a potion heals", () => {
    // Goods opens the same Equipment bag as everywhere else, in battle mode (tiles tap, nothing drags).
    cy.get(".menu-item").should("have.length", 5);
    cy.contains(".menu-item", "Goods").click();
    cy.get(".xp-equipment-modal", { timeout: 10000 }).should("be.visible");
    cy.get(".xp-equipment-modal .grid-item .fa-wand-magic.ice", { timeout: 10000 }).should("be.visible");
    shot("10-bag");

    // The Ice Wand's card has a Use button; using it adds ten minutes to the clock.
    cy.get(".xp-equipment-modal .grid-item .fa-wand-magic.ice").click();
    cy.get("[data-cy=item-use]", { timeout: 10000 }).should("be.visible").and("not.be.disabled").click();
    cy.get("[data-cy=battle-dialog]", { timeout: 10000 }).should("contain", "+10 minutes");
    readUntilMenu();
    // The clock starts at 9:27 (3 chores x 3 minutes plus 9 s of Agility each); +10 minutes, minus the seconds spent getting here
    cy.get(".attack-timer-label").invoke("text").should("match", /^(18|19):\d\d$/);

    // Goods again: Bottles opens the potion sheet and a Health Potion heals the hero (20 of 42 HP).
    cy.get("[data-cy=hero-card] .hp-value").should("have.text", "20");
    cy.contains(".menu-item", "Goods").click();
    cy.get(".xp-equipment-modal .grid-item .fa-flask-potion", { timeout: 10000 }).should("be.visible").click();
    cy.get("[data-cy=potion-sheet]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=potion-health-potion]").should("be.visible").and("contain", "x2");
    shot("11-potions");
    cy.get("[data-cy=potion-health-potion]").click();
    cy.get("[data-cy=battle-dialog]", { timeout: 10000 }).should("contain", "You drink a Health Potion");
    cy.get("[data-cy=potion-sheet]").should("not.exist");
    cy.get("[data-cy=hero-card] .hp-value", { timeout: 10000 }).should("have.text", "42");
    // One potion left in the pack
    cy.window().then((win) => {
      const pack = win.__xp.getUser("hero-1").inventory;
      expect(pack, "the pack after one drink").to.have.length(1);
      expect(pack[0].qty).to.eq(1);
    });
    readUntilMenu();
  });

  it("Powers: Stop freezes the clock", () => {
    // The clock is running: the label moves on within two seconds
    cy.get(".attack-timer-label").invoke("text").then((running) => {
      cy.wait(1500);
      cy.get(".attack-timer-label").invoke("text").should("not.eq", running);
    });
    cy.contains(".menu-item", "Powers").click();
    cy.get("[data-cy=powers-sheet]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=powers-sheet] .cast-btn", { timeout: 10000 }).should("have.length", 1).and("not.be.disabled");
    shot("12-powers");
    cy.get("[data-cy=powers-sheet] .cast-btn").click();
    cy.get("[data-cy=battle-dialog]", { timeout: 10000 }).should("contain", "casts Stop!");
    cy.get("[data-cy=battle-dialog]").should("contain", "15 minutes");
    cy.get("[data-cy=powers-sheet]").should("not.exist");
    readUntilMenu();
    // Frozen: the label stands where the ice caught it
    cy.get(".attack-timer-label").invoke("text").then((frozen) => {
      cy.wait(2500);
      cy.get(".attack-timer-label").invoke("text").should("eq", frozen);
    });
    // The 25 MP spell was paid (23 with a Warrior's discount); the HUD rolls down from 300
    cy.get("[data-cy=hero-card] .mp-value").should(($mp) => {
      expect(Number($mp.text().trim()), "MP after the cast").to.be.within(270, 299);
    });
  });
});
