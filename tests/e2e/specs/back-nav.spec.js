// Back with no history: landing straight on a page (refresh, shared link, notification, app start) must not
// leave Back dead. With nothing to go back to, Back goes "up" to the place the page belongs to.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/back-nav.spec.js

/** Taps the back button of the page on screen (a stacked page underneath keeps its own, hidden one). */
const tapBack = () => {
  cy.get(".ion-page:not(.ion-page-hidden) ion-back-button.show-back-button", { timeout: 60000 })
    .first()
    .click({ force: true });
};

describe("Back with no history", () => {
  before(() => {
    cy.seedWorld();
    // The onboarding gate keeps a hero on foot to Home Town and the Plains: free the first Pegasus so the islands open
    cy.window().then((win) => win.unlockPegasus(0));
    cy.window().should((win) => {
      expect(win.__xp.getUser("hero-1").stats.pegasi, "a freed Pegasus").to.satisfy((pegasi) =>
        Object.values(pegasi || {}).some(Boolean),
      );
    });
    cy.wait(1000); // the profile is written to storage in the background
  });

  // A page that starts music the instant it opens can have its play() interrupted by the next track; that is audio
  // noise, not what this spec is about.
  beforeEach(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("goes from a shop opened by link to the world the shop stands in", () => {
    cy.visit("/shop/wrecked-ship/hero-1", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get(".accessory-shop", { timeout: 60000 }).should("exist");
    tapBack();
    cy.location("pathname", { timeout: 20000 }).should("eq", "/my-portal/hero-1/islands");
  });

  it("goes from the bank opened by link to Home Town", () => {
    cy.visit("/bank/hero-1", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get(".gold-bank, ion-page", { timeout: 60000 }).should("exist");
    tapBack();
    cy.location("pathname", { timeout: 20000 }).should("eq", "/my-portal/hero-1/home-town");
  });

  it("goes from the stats screen opened by link to Home Town", () => {
    cy.visit("/user-stats/hero-1", { timeout: 120000 });
    cy.tapToWakeAudio();
    tapBack();
    cy.location("pathname", { timeout: 20000 }).should("eq", "/my-portal/hero-1/home-town");
  });
});
