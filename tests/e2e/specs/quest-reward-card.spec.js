// The reward slide of the quest card: claiming a quest from its beast card opens the loot card (XP, GP and AP) and
// counts the loot up to what the quest pays, with no "beginCounter is not a function" error on the way.
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
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(withBedChore(backup))), { timeout: 60000 }));
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
    cy.contains(".xp-app-header__title", "Beast Log", { timeout: 60000 }).should("exist");
    cy.get("#quest-bed", { timeout: 30000 }).scrollIntoView().should("be.visible");
    cy.get("#quest-bed").click();
    cy.get("ion-modal.beast-card-modal .beast-plate__name", { timeout: 20000 }).should("be.visible");

    // Claim it: check off the chore's one step, which lights Claim, and Claim records it and opens the loot card
    cy.get("ion-modal.beast-card-modal .beast-step", { timeout: 20000 }).should("have.length.at.least", 1);
    cy.wait(600); // the sheet slides up and the steps take taps once it has settled
    cy.get("ion-modal.beast-card-modal .beast-step").each(($step) => cy.wrap($step).click());
    cy.get("ion-modal.beast-card-modal [data-test=claim]", { timeout: 10000 }).should("not.be.disabled").click();

    // The loot card (the battle's victory card, for a quest claimed from the Beast Log) counts the claim up
    cy.get("[data-test=rewards-overlay] [data-cy=victory-card]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-test=rewards-overlay] .victory-quest").invoke("text").should("match", /make the bed/i);

    // The count-up lands on what the quest pays: 60 XP, 10 GP, 3 AP, and the hero's real XP and AP moved by as much
    cy.wait(2500);
    cy.get("[data-test=rewards-overlay] .reward-value[data-stat=xp]").should("have.text", "60");
    cy.get("[data-test=rewards-overlay] .reward-value[data-stat=gp]").should("have.text", "10");
    cy.get("[data-test=rewards-overlay] .reward-value[data-stat=ap]").should("have.text", "3");
    cy.window().then((win) => {
      const { xp, ap } = win.__xp.getUser("hero-1").stats;
      expect(xp.now, "the claim paid its XP").to.be.greaterThan(300);
      expect(ap.total, "the claim paid its AP").to.be.greaterThan(4);
    });
    shot("quest-reward-card");

    cy.window().then((win) => {
      const beginCounterErrors = win.__consoleErrors.filter((line) => /beginCounter/.test(line));
      expect(beginCounterErrors, "beginCounter console errors").to.deep.eq([]);
    });
  });
});
