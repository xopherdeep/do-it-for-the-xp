// Voxel Quality: one screenshot set per Video tier (Super, Classic, Pocket) of the screens that draw voxels: the Video page
// preview, the Hero Builder tray, Home Town and a temple room. CI mocks WebGL, so nothing else shows whether Pocket's flat
// shading is muddy or Classic's 1.5x buffer is jagged: a person (or the next agent) looks at these first.
// Hand-run only. It is NOT in the e2e-smoke job of .github/workflows/tests.yml (that job names its three specs one by one).
// The tier is preset in localStorage 'xp.voxelQuality' before the app loads (device-only key, src/lib/services/graphics/deviceQuality.ts).
// The code under test must be what the dev server serves (the main checkout on this branch, or a worktree server on its own port).
// Headless Chrome may draw WebGL in software (SwiftShader): it shows the look, not the frame rate.
// Run (an already-running dev server; never start a second one):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/voxel-quality.spec.js
// Screenshots (390x844) land in tests/e2e/screenshots/voxel-quality.spec.js, named voxel-quality-<tier>-<screen>.

const TIERS = ["super", "classic", "pocket"];

describe("Voxel quality tiers", () => {
  TIERS.forEach((tier) => {
    describe(`${tier} tier`, () => {
      const shot = (name) => {
        cy.wait(1000);
        cy.screenshot(`voxel-quality-${tier}-${name}`, { capture: "viewport", overwrite: true });
      };
      // Every page load of this tier starts with the tier already chosen
      const presetTier = (win) => win.localStorage.setItem("xp.voxelQuality", tier);

      before(() => {
        cy.seedWorld();
      });

      beforeEach(() => {
        Cypress.on("window:before:load", presetTier);
      });

      afterEach(() => {
        Cypress.off("window:before:load", presetTier);
      });

      it("the Video page preview", () => {
        cy.visit("/xp-settings/video", { timeout: 120000, onBeforeLoad: presetTier });
        cy.tapToWakeAudio();
        cy.get("[data-cy=tier-preview] canvas", { timeout: 60000 }).should("exist");
        cy.get("[data-cy=video-tier]").should("have.prop", "value", tier);
        shot("01-video-page");
      });

      it("the Hero Builder tray", () => {
        cy.visit("/my-portal/hero-1/my-profile", { timeout: 120000, onBeforeLoad: presetTier });
        cy.tapToWakeAudio();
        cy.contains("ion-button", /my look/i, { timeout: 30000 }).click({ force: true });
        cy.get("ion-modal.hero-builder [data-cy=starter-hero] img", { timeout: 60000 }).should("have.length", 9);
        shot("02-builder-lineup");
        cy.get("[data-cy=starter-hero]").first().click({ force: true });
        cy.get("ion-modal.hero-builder canvas", { timeout: 60000 }).should("exist");
        cy.contains("ion-modal.hero-builder button[role=tab]", /^\s*Hat\s*$/).click({ force: true });
        cy.get("[data-cy=look-tile]", { timeout: 20000 }).should("have.length.greaterThan", 3);
        shot("03-builder-hat-tray");
      });

      it("Home Town", () => {
        cy.visit("/my-portal/hero-1/home-town", { timeout: 120000, onBeforeLoad: presetTier });
        cy.tapToWakeAudio();
        cy.get("canvas.building-canvas", { timeout: 60000 }).should("have.length.greaterThan", 3);
        cy.wait(1500);
        shot("04-home-town");
      });

      it("a temple room", () => {
        cy.visit("/temple/wind-temple/hero-1/2/0", { timeout: 120000, onBeforeLoad: presetTier });
        cy.get("canvas.room-canvas", { timeout: 60000 }).should("exist");
        cy.wait(1500);
        shot("05-temple-room");
      });
    });
  });
});
