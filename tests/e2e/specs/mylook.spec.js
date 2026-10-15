// My Look: the "My Look" button on My Profile opens the full-screen hero builder. A hero who never built a look starts on
// the starter lineup; picking one opens the editor, a hair is chosen, and Done saves the look plus a real snapshot.
// Screenshots (390x844) land in tests/e2e/screenshots/mylook.spec.js.
describe("My Look", () => {
  before(() => { cy.seedWorld(); });
  it("builds a hero in the builder and saves the look with a snapshot", () => {
    cy.visit("/my-portal/hero-1/my-profile", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-button", /my look/i, { timeout: 30000 }).click({ force: true });
    // No look yet: the builder opens on the starter lineup (nine pictures of heroes, drawn by the one hidden renderer)
    cy.get("ion-modal.hero-builder [data-cy=starter-hero] img", { timeout: 60000 }).should("have.length", 9);
    cy.wait(1000);
    cy.screenshot("mylook-01-lineup", { capture: "viewport", overwrite: true });

    // Pick a starting hero, and the editor opens on it with the 3D hero on its stage
    cy.get("[data-cy=starter-hero]").first().click({ force: true });
    cy.get("ion-modal.hero-builder canvas", { timeout: 60000 }).should("exist");
    cy.get("[data-cy=builder-done]", { timeout: 20000 }).should("be.visible");
    cy.wait(1500);
    cy.screenshot("mylook-02-editor", { capture: "viewport", overwrite: true });

    // Hair tab, then a mohawk
    cy.contains("ion-modal.hero-builder button[role=tab]", /^\s*Hair\s*$/).click({ force: true });
    cy.get("[data-cy=look-tile][data-option=mohawk]", { timeout: 20000 }).click({ force: true });
    cy.wait(800);
    cy.screenshot("mylook-03-mohawk", { capture: "viewport", overwrite: true });

    // Done plays the victory pose for 800ms before it saves and closes
    cy.get("[data-cy=builder-done]").click({ force: true });
    cy.wait(1500);
    cy.get("ion-modal.hero-builder", { timeout: 10000 }).should("have.class", "overlay-hidden");
    cy.screenshot("mylook-04-saved", { capture: "viewport", overwrite: true });
    cy.window().then((win) => {
      const user = win.__xp.getUser("hero-1");
      expect(user.look, "look saved on the profile").to.include({ hair: "mohawk" });
      expect(String(user.avatarImage), "avatar snapshot is a PNG").to.match(/^data:image\/png;base64,/);
      expect(String(user.avatarImage).length, "avatar snapshot has content").to.be.greaterThan(5000);
    });
  });

  it("sends the retired My Look page to My Profile", () => {
    cy.visit("/my-portal/hero-1/my-look", { timeout: 120000 });
    cy.location("pathname", { timeout: 30000 }).should("eq", "/my-portal/hero-1/my-profile");
    cy.contains("ion-button", /my look/i, { timeout: 30000 }).should("exist");
  });

  it("opens the same builder over the profile sheet and keeps the sheet underneath", () => {
    cy.visit("/my-portal/hero-1/my-home", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get(".xp-bottom-nav button[aria-label='Hero Profile']", { timeout: 30000 }).filter(":visible").first().click({ force: true });
    cy.get("ion-modal.user-profile-modal .avatar-box", { timeout: 20000 }).click({ force: true });
    cy.get("ion-modal.hero-builder", { timeout: 60000 }).should("exist");
    // (the equipment modal shares the class; the sheet is the other one)
    cy.get("ion-modal.user-profile-modal:not(.xp-equipment-modal)").should("not.have.class", "overlay-hidden");
    cy.get("ion-modal.hero-builder [data-cy=starter-hero], ion-modal.hero-builder [data-cy=builder-done]", { timeout: 60000 }).should("exist");
    cy.wait(1500);
    cy.screenshot("mylook-05-over-profile-sheet", { capture: "viewport", overwrite: true });
  });
});
