// Checking things off in the Beast Log: the beast card's steps pop, spark and light the Claim button when the last one falls,
// and a List-view Done stamps the row before it lands in Done. Screenshots are taken mid-animation.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/beast-log-checkoff.spec.js

const shot = (name) => cy.screenshot(name, { capture: "viewport" });

describe("Beast Log check-off feedback", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  beforeEach(() => {
    cy.seedWorld();
    cy.visit("/my-tasks/hero-1", {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
      },
    });
    cy.tapToWakeAudio();
    cy.contains(".xp-app-row", "Socktopus", { timeout: 60000 }).should("exist");
  });

  it("pops, sparks and lights the Claim button as the beast card's steps are checked", () => {
    cy.contains(".xp-app-row", "Socktopus").click();
    cy.get(".beast-step", { timeout: 20000 }).should("have.length", 3);
    cy.wait(600);

    cy.get(".beast-step").eq(0).click();
    cy.get(".beast-step").eq(0).should("have.class", "is-just-checked").find(".beast-step__spark").should("exist");
    cy.wait(120);
    shot("beast-step-pop");
    cy.get(".beast-step").eq(0).should("not.have.class", "is-just-checked");
    cy.get(".beast-steps").should("not.have.class", "is-complete");

    // Unchecking is quiet: a drop, no sparks
    cy.get(".beast-step").eq(0).click();
    cy.get(".beast-step").eq(0).should("have.class", "is-just-unchecked");
    cy.get(".beast-step__spark").should("not.exist");

    cy.get(".beast-step").each(($step) => cy.wrap($step).click());
    cy.get(".beast-steps").should("have.class", "is-complete").and("have.class", "is-just-complete");
    cy.get("[data-test=claim]").should("have.class", "is-ready").and("have.class", "is-just-ready");
    cy.wait(250);
    shot("beast-list-complete");
    cy.get(".beast-steps").should("not.have.class", "is-just-complete");
    cy.get("[data-test=claim]").should("have.class", "is-ready");
  });

  it("stamps a List row Tamed before it lands in Done", () => {
    cy.get("button[aria-label=List]").filter(":visible").first().click();
    cy.get(".quest-done-btn", { timeout: 20000 }).first().click();
    cy.get("ion-action-sheet button", { timeout: 10000 }).first().click();
    cy.get(".quest-log-row.is-celebrating", { timeout: 10000 }).should("exist");
    cy.get(".quest-stamp").should("contain", "Tamed");
    cy.wait(150);
    shot("beast-row-stamp");
    cy.get(".quest-log-row.is-landed", { timeout: 10000 }).should("exist");
    cy.get(".quest-log-row.is-celebrating").should("not.exist");
  });
});
