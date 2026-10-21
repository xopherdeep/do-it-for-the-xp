// New hero: the add-profile wizard asks one question at a time (name, face, style, class, food, secret code), ends on a summary where every
// row jumps back to its step, and saving plays the reveal: the hero as a glowing shape, a burst of colour and confetti, a dance. An existing
// hero opens the same wizard on that summary.
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
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(backup)), { timeout: 60000 }));
    cy.tapToWakeAudio();
  });
};

/** Opens the add-profile wizard from the profile chooser, the way a parent does. */
const openNewProfile = () => {
  seedFamily();
  cy.window().then((win) => routerOf(win).push("/xp-profile"));
  cy.location("pathname", { timeout: 30000 }).should("eq", "/xp-profile");
  cy.get(".profile-card-col", { timeout: 30000 }).should("have.length.greaterThan", 0);
  cy.get("ion-fab.fab-pulse ion-fab-button", { timeout: 30000 }).filter(":visible").first().click({ force: true });
  cy.get(".hero-wizard", { timeout: 20000 }).should("be.visible");
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

const next = () => {
  cy.get(".wizard-btn--next").click({ force: true });
  cy.wait(500);
};

const kicker = () => cy.get(".wizard-kicker");

/** Walks the wizard to its summary: a name, no face yet, the default style, a class and a food. */
const walkToSummary = (name, { jobClass = "Mage", food = "Pizza" } = {}) => {
  cy.get("#hero-name input").type(name, { force: true });
  next(); // look
  kicker().should("contain.text", "Step 2 of 7");
  next(); // skipped the face: style
  kicker().should("contain.text", "Step 3 of 7");
  cy.get("[data-test=skin-modern]").should("have.class", "active");
  next(); // class
  cy.contains(".choice-card", jobClass).click({ force: true });
  next(); // food
  cy.contains(".choice-card", food).click({ force: true });
  next(); // secret code
  kicker().should("contain.text", "Step 6 of 7");
  next(); // summary
  cy.get(".summary-row", { timeout: 10000 }).should("have.length.greaterThan", 5);
};

describe("New hero", () => {
  it("asks one question at a time, and the summary jumps back to any answer", () => {
    openNewProfile();
    shot("01-name", 800);
    kicker().should("contain.text", "Step 1 of 7");
    // A hero cannot leave the name blank
    cy.get(".wizard-btn--next").click({ force: true });
    kicker().should("contain.text", "Step 1 of 7");

    walkToSummary("Luna Bee");
    shot("02-summary", 600);
    cy.get("[data-test=edit-class]").should("contain.text", "Mage");
    cy.get("[data-test=edit-food]").should("contain.text", "Pizza");

    // Tapping a row goes to its step; the class picked there is what the summary shows
    cy.get("[data-test=edit-class]").click({ force: true });
    cy.contains(".choice-card", "Monk").click({ force: true });
    next(); // food
    next(); // secret code
    next(); // summary
    cy.get("[data-test=edit-class]", { timeout: 10000 }).should("contain.text", "Monk");
  });

  it("starts the style step on the look and feel, with the Pro styles locked", () => {
    openNewProfile();
    cy.get("#hero-name input").type("Rex", { force: true });
    next();
    next();
    cy.get("[data-test=style-earthbound]").should("have.class", "active");
    cy.get("[data-test=style-pokemon]").should("have.class", "locked");
    shot("03-style", 600);
  });

  it("plays the reveal when a new hero is saved", () => {
    openNewProfile();
    walkToSummary("Luna Bee");
    cy.get(".wizard-btn--begin").click({ force: true });

    cy.get("[data-cy=hero-fanfare]", { timeout: 20000 }).should("exist");
    // In the dark: the hero is a glowing shape, nothing else yet
    shot("04-fanfare-dark", 250);
    // The burst: colour, a flash, confetti from every edge
    cy.get("[data-cy=hero-fanfare].is-burst, [data-cy=hero-fanfare].is-typing", { timeout: 10000 }).should("exist");
    shot("05-fanfare-burst", 400);
    // The line is typed, the name and class light up, the button is live
    cy.get("[data-cy=hero-fanfare].is-ready", { timeout: 15000 }).should("exist");
    cy.get("[data-cy=hero-fanfare-card]").should("contain.text", "Luna Bee").and("contain.text", "Mage");
    cy.get("[data-cy=hero-fanfare-line]").should("contain.text", "A new hero joins the party!");
    shot("06-fanfare-ready", 600);

    // The button hands back: the modal closes and the hero is in the family
    cy.get("[data-cy=hero-fanfare-begin]").click({ force: true });
    cy.get(".hero-wizard", { timeout: 10000 }).should("not.exist");
    cy.get(".profile-card-col", { timeout: 20000 }).should("contain.text", "Luna");
    shot("07-family", 800);
  });

  it("is a still sparkle, not a burst, for someone who wants less motion", () => {
    openNewProfile();
    walkToSummary("Luna Bee");
    // The reveal reads the setting when it starts: flip it just before Begin
    emulateMotion("reduce");
    cy.get(".wizard-btn--begin").click({ force: true });
    cy.get("[data-cy=hero-fanfare].is-ready", { timeout: 15000 }).should("exist");
    // The sparkle is the only thing that moves, and it only fades; no confetti canvas is drawn on
    cy.get("[data-cy=hero-fanfare-twinkle]").should("exist");
    cy.get(".confetti-burst").then(($canvas) => {
      const ctx = $canvas[0].getContext("2d");
      const pixels = ctx.getImageData(0, 0, $canvas[0].width, $canvas[0].height).data;
      expect(Array.from(pixels).some((value) => value !== 0), "no confetti painted").to.eq(false);
    });
    cy.get("[data-cy=hero-fanfare-begin]").click({ force: true });
    cy.get(".hero-wizard", { timeout: 10000 }).should("not.exist");
    emulateMotion("no-preference");
  });
});
