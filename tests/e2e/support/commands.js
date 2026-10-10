// Custom Cypress commands for the Do It For The XP e2e suite.
// Seeding goes through the development-only `window.__xp` seam in src/main.ts, which restores a
// backup file into every local store (the same code path as Settings > Restore) and signs a hero in.

/**
 * Loads a backup fixture into the app's stores and signs `heroId` in.
 * Visits the app root first so the seam exists, then the caller navigates wherever the test needs.
 */
Cypress.Commands.add("seedWorld", (fixtureName = "battle-backup.json", heroId = "hero-1") => {
  cy.fixture(fixtureName).then((backup) => {
    cy.visit("/", { timeout: 120000 });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(backup), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser(heroId), `hero ${heroId} is loaded`).to.eq(true);
    });
  });
});

/** Marks the page as user-interacted so the app's sound effects do not throw autoplay errors. */
Cypress.Commands.add("tapToWakeAudio", () => {
  cy.document().then((doc) => doc.documentElement.setAttribute("data-user-interacted", "true"));
});
