// New hero: the add-profile form starts in the 3D builder (with "Use a 2D portrait instead" one tap away), and saving a
// new hero plays the reveal: the hero as a glowing shape, a burst of colour and confetti from every edge, a dance.
// Screenshots (390x844) land in tests/e2e/screenshots/new-hero.spec.js.
const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;

/** Loads the battle world and leaves nobody signed in (restoring needs a throwaway Game Master, as in visual.spec.js). */
const seedFamily = () => {
  cy.fixture("battle-backup.json").then((backup) => {
    cy.visit("/xp-intro", {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
      },
    });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(backup), { timeout: 60000 }));
    cy.tapToWakeAudio();
  });
};

/** Opens the add-profile modal from the profile chooser, the way a parent does. */
const openNewProfile = () => {
  seedFamily();
  cy.window().then((win) => routerOf(win).push("/xp-profile"));
  cy.location("pathname", { timeout: 30000 }).should("eq", "/xp-profile");
  cy.get(".profile-card-col", { timeout: 30000 }).should("have.length.greaterThan", 0);
  cy.get("ion-fab.fab-pulse ion-fab-button", { timeout: 30000 }).filter(":visible").first().click({ force: true });
  cy.get(".gamer-card", { timeout: 20000 }).should("be.visible");
};

/** Chrome's own switch for "reduce motion" (the emulated media feature), the same one the phone's setting flips. */
const emulateMotion = (value) =>
  cy.then(() =>
    Cypress.automation("remote:debugger:protocol", {
      command: "Emulation.setEmulatedMedia",
      params: { media: "", features: [{ name: "prefers-reduced-motion", value }] },
    }),
  );

const shot = (name, wait = 0) => {
  if (wait) cy.wait(wait);
  cy.screenshot(name, { capture: "viewport", overwrite: true, disableTimersAndAnimations: false });
};

/** Sets form fields on the AddProfile component that owns the card (the class and food pickers are covered elsewhere). */
const fillForm = (values) =>
  cy.get(".gamer-card").then(($el) => {
    let instance = $el[0].__vueParentComponent;
    while (instance && !("favoriteFood" in (instance.proxy || {}))) instance = instance.parent;
    expect(instance, "the AddProfile component above the card").to.be.an("object");
    Object.assign(instance.proxy, values);
  });

const buildAndSave = (name, { reduceMotion = false } = {}) => {
  cy.get("ion-input.rpg-input").first().find("input").type(name, { force: true });
  fillForm({ favoriteFood: "Pizza", favoriteThing: "Space", jobClass: "Mage" });
  cy.get("#avatar-trigger").click({ force: true });
  cy.get("ion-modal.look-modal canvas", { timeout: 60000 }).should("exist");
  cy.wait(1800);
  cy.get("ion-modal.look-modal .look-done").click({ force: true });
  cy.get("ion-modal.look-modal", { timeout: 10000 }).should("have.class", "overlay-hidden");
  cy.get(".gamer-card .main-avatar.has-voxel", { timeout: 20000 }).should("exist");
  // The reveal reads the setting when it starts: flip it just before Save
  if (reduceMotion) emulateMotion("reduce");
  cy.contains("ion-button", /^\s*Save/).click({ force: true });
};

/** The 2D way: the builder gives way to the portraits, one is picked, and the hero is saved with it. */
const portraitAndSave = (name) => {
  cy.get("ion-input.rpg-input").first().find("input").type(name, { force: true });
  fillForm({ favoriteFood: "Pizza", favoriteThing: "Space", jobClass: "Knight" });
  cy.get("#avatar-trigger").click({ force: true });
  cy.get("[data-cy=look-use-portrait]", { timeout: 60000 }).click({ force: true });
  cy.get(".face-modal .face-tile", { timeout: 20000 }).eq(9).click({ force: true });
  cy.get("ion-modal.face-modal").should("have.class", "overlay-hidden");
  cy.contains("ion-button", /^\s*Save/).click({ force: true });
};

describe("New hero", () => {
  it("starts in the 3D builder and offers the 2D portraits instead", () => {
    openNewProfile();
    shot("01-form", 800);
    cy.get(".avatar-caption").should("contain.text", "build your hero");

    // Tapping the avatar opens the 3D builder first
    cy.get("#avatar-trigger").click({ force: true });
    cy.get("ion-modal.look-modal canvas", { timeout: 60000 }).should("exist");
    cy.get("ion-modal.face-modal").should("have.class", "overlay-hidden");
    shot("02-builder", 2500);

    // One tap to the 2D portraits, and a portrait picked there is what the hero uses
    cy.get("[data-cy=look-use-portrait]").click({ force: true });
    cy.get(".face-modal .face-tile", { timeout: 20000 }).should("have.length.greaterThan", 3);
    shot("03-portraits", 600);
    cy.get(".face-modal .face-tile").eq(4).click({ force: true });
    cy.get("ion-modal.face-modal").should("have.class", "overlay-hidden");
    cy.get(".gamer-card .main-avatar.has-voxel").should("not.exist");

    // A hero on a portrait gets the portrait picker next time, with the 3D builder one tap away
    cy.get("#avatar-trigger").click({ force: true });
    cy.get(".face-modal .face-tile", { timeout: 20000 }).should("have.length.greaterThan", 3);
    cy.get(".face-build").should("be.visible");
  });

  it("plays the reveal when a new hero is saved", () => {
    openNewProfile();
    buildAndSave("Luna Bee");

    cy.get("[data-cy=hero-fanfare]", { timeout: 20000 }).should("exist");
    // In the dark: the hero is a glowing shape, nothing else yet
    shot("04-fanfare-dark", 250);
    // The burst: colour, a flash, confetti from every edge
    cy.get("[data-cy=hero-fanfare].is-burst, [data-cy=hero-fanfare].is-typing", { timeout: 10000 }).should("exist");
    shot("05-fanfare-burst-a", 150);
    shot("06-fanfare-burst-b", 500);
    // The line is typed, the name and class light up, the button is live
    cy.get("[data-cy=hero-fanfare].is-ready", { timeout: 15000 }).should("exist");
    shot("07-fanfare-ready", 600);
    // Later the confetti has settled and the hero is still dancing
    shot("08-fanfare-settled", 4500);
    cy.get("[data-cy=hero-fanfare-card]").should("contain.text", "Luna Bee").and("contain.text", "Mage");
    cy.get("[data-cy=hero-fanfare-line]").should("contain.text", "A new hero joins the party!");

    // The button hands back: the modal closes and the hero is in the family
    cy.get("[data-cy=hero-fanfare-begin]").click({ force: true });
    cy.get(".gamer-card", { timeout: 10000 }).should("not.exist");
    cy.get(".profile-card-col", { timeout: 20000 }).should("contain.text", "Luna");
    shot("09-family", 800);
  });

  it("is a still sparkle, not a burst, for someone who wants less motion", () => {
    openNewProfile();
    buildAndSave("Luna Bee", { reduceMotion: true });
    cy.get("[data-cy=hero-fanfare].is-ready", { timeout: 15000 }).should("exist");
    // The sparkle is the only thing that moves, and it only fades; no confetti canvas is drawn on
    cy.get("[data-cy=hero-fanfare-twinkle]").should("exist");
    shot("10-fanfare-reduced-motion", 700);
    cy.get(".confetti-burst").then(($canvas) => {
      const ctx = $canvas[0].getContext("2d");
      const pixels = ctx.getImageData(0, 0, $canvas[0].width, $canvas[0].height).data;
      expect(Array.from(pixels).some((value) => value !== 0), "no confetti painted").to.eq(false);
    });
    cy.get("[data-cy=hero-fanfare-begin]").click({ force: true });
    cy.get(".gamer-card", { timeout: 10000 }).should("not.exist");
    emulateMotion("no-preference");
  });

  it("plays the same reveal with the portrait for a hero who has no 3D look", () => {
    openNewProfile();
    portraitAndSave("Rex");
    cy.get("[data-cy=hero-fanfare]", { timeout: 20000 }).should("exist");
    cy.get("[data-cy=hero-fanfare] .hero-fanfare__portrait img", { timeout: 10000 }).should("exist");
    cy.get("[data-cy=hero-fanfare].is-ready", { timeout: 15000 }).should("exist");
    shot("11-fanfare-portrait", 700);
    cy.get("[data-cy=hero-fanfare-card]").should("contain.text", "Rex").and("contain.text", "Knight");
    cy.get("[data-cy=hero-fanfare-begin]").click({ force: true });
    cy.get(".gamer-card", { timeout: 10000 }).should("not.exist");
  });
});
