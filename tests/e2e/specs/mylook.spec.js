// My Look: the voxel hero renders in Chrome (WebGL via SwiftShader) and Save stores a real snapshot as the avatar.
describe("My Look", () => {
  before(() => { cy.seedWorld(); });
  it("renders the voxel hero and saves a snapshot", () => {
    cy.visit("/my-portal/hero-1/my-look", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get("canvas", { timeout: 60000 }).should("exist");
    cy.wait(2500);
    cy.screenshot("mylook-01", { capture: "viewport" });
    cy.contains("button, ion-button", /save look/i, { timeout: 10000 }).click({ force: true });
    cy.wait(2000);
    cy.screenshot("mylook-02-saved", { capture: "viewport" });
    cy.window().then((win) => {
      const user = win.__xp.getUser("hero-1");
      expect(user.look, "look saved on the profile").to.include({ outfit: "tunic" });
      expect(String(user.avatarImage), "avatar snapshot is a PNG").to.match(/^data:image\/png;base64,/);
      expect(String(user.avatarImage).length, "avatar snapshot has content").to.be.greaterThan(5000);
    });
  });
});
