// Temple edits show up without reloading the app: the Game Master saves a change, the hero sees it.
// The save goes through TempleDb.setTemple like every save of the temple editor (dev-only seam window.__xpTemples,
// src/lib/engine/core/dungeons/templeFreshness.ts); nothing here reloads the page after the temple is open.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/temple-edit.spec.js

// A temple of its own for each run, so a hero's saved run from an earlier run can not be in it
const TEMPLE = `e2e-edit-temple-${Date.now()}`;

/** Entrance, a middle room, a last hall: the one thing the Game Master edits is the middle room. */
const record = (middle) => ({
  id: TEMPLE,
  customName: "Edit Test Temple",
  categoryIds: [],
  dungeonLayout: {
    entrance: [0, 0],
    maze: [["ENT", "MID", "END"]],
    rooms: { ENT: { type: "entrance" }, MID: middle, END: { type: "empty" } },
  },
});
const saveTemple = (middle) => {
  cy.window().then((win) => cy.wrap(win.__xpTemples.save(record(middle)), { timeout: 20000 }));
};
const router = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;

const EAST = "ion-fab-button i.fa-arrow-alt-right";
const WEST = "ion-fab-button i.fa-arrow-alt-left";

describe("Editing a temple", () => {
  before(() => {
    cy.seedWorld();
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xpTemples, "development seam window.__xpTemples").to.be.an("object");
    });
    saveTemple({ type: "wall" });
  });

  // A page that starts music the instant it opens can have its play() interrupted by the next track; that is audio
  // noise, not what this spec is about.
  beforeEach(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("plays a saved change in the open temple, keeps the hero's place, and has no stale copy on the next visit", () => {
    cy.visit(`/temple/${TEMPLE}/hero-1`, { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get("#room-action", { timeout: 60000 }).should("exist");
    cy.get(EAST).should("not.exist"); // the room next to the entrance is a wall

    // The Game Master turns the wall into a hall: the way east opens, with no reload
    saveTemple({ type: "empty" });
    cy.get(EAST, { timeout: 10000 }).should("exist");

    // The hero walks in
    cy.get(EAST).click({ force: true });
    cy.get(WEST, { timeout: 10000 }).should("exist");

    // The Game Master turns the room the hero stands in into a wall: the hero is back at the entrance, in a temple
    // where the room east of it is a wall again
    saveTemple({ type: "wall" });
    cy.get(WEST, { timeout: 10000 }).should("not.exist");
    cy.get(EAST).should("not.exist");
    cy.screenshot("temple-edit-hero-back-at-entrance", { capture: "viewport" });

    // The hero leaves; the temple is edited while nobody is in it; the next visit plays the edit, not the old copy
    cy.window().then((win) => router(win).replace("/my-portal/hero-1/home-town"));
    cy.get(".temple-grounds-engine", { timeout: 20000 }).should("not.exist");
    saveTemple({ type: "empty" });
    cy.window().then((win) => router(win).push(`/temple/${TEMPLE}/hero-1`));
    cy.get(EAST, { timeout: 30000 }).should("exist");
  });
});
