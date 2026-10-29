// Moving Out replaces the Old House (the file keeps its old name: it used to walk the Moving Day temple the Moving House
// dialog built, which is gone). A family that built the temple has The Old House on the Hometown plaza. The Game Master
// builds the Moving House pack in its dialog (no temple option any more), takes the moving chores into a tower with the
// dialog's own button, the project wizard opens on Moving Out with those chores in the list, and building it retires the
// Old House: its temple record goes and the plaza shows the tower instead.
// Keeps a screenshot of every step at 390x844 in tests/e2e/screenshots/moving-temple.spec.js (not committed).
// Run (dev server first; a server that reloads mid-run breaks the walk, so use one that does not):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/moving-temple.spec.js

const shot = (name) => {
  cy.wait(600);
  cy.screenshot(name, { capture: "viewport", overwrite: true });
};

const OLD_HOUSE = "gen-move-house";
const OLD_HOUSE_SPOT = ".xp-building-model-wrapper[title='Enter The Old House']";
const TOWER_SPOT = ".xp-building-model-wrapper[title='Enter The Moving Keep']";

// Cypress clears localStorage between tests; the hero has already answered the one-time ambush-alert ask
const quietAlerts = (win) => win.localStorage.setItem("xp.battleAlerts", "off");

/** A family of three on top of the battle fixture: Dad (Game Master), Max (9, plays as a Kid) and Pip (6, a Little). */
const seedFamily = () => {
  cy.fixture("battle-backup.json").then((backup) => {
    const max = backup.stores.__profiles[0].value;
    const person = (id, nick, extra) => {
      const profile = JSON.parse(JSON.stringify(max));
      return { key: id, value: Object.assign(profile, { id, name: { full: nick, first: nick, last: "Power", middle: "", nick }, inventory: [] }, extra) };
    };
    const family = JSON.parse(JSON.stringify(backup));
    family.stores.__profiles = [
      person("gm-1", "Dad", { isAdult: true, birthday: "1984-03-02" }),
      backup.stores.__profiles[0],
      person("hero-2", "Pip", { isAdult: false, birthday: "2020-06-15" }),
    ];
    cy.visit("/", { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
      expect(win.__xpTemples, "development seam window.__xpTemples").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(family)), { timeout: 60000 }));
    // The family built the Moving Day temple before this version: its record is in the temple store (a bare one is
    // enough for the plaza to show the building and for Moving Out to retire it)
    cy.window().then((win) =>
      cy.wrap(win.__xpTemples.save({ id: OLD_HOUSE, name: "The Old House", customName: "The Old House", categoryIds: [] }), { timeout: 30000 })
    );
  });
};

const signIn = (userId) => {
  cy.visit("/", { timeout: 300000, onBeforeLoad: quietAlerts });
  cy.window({ timeout: 60000 }).should((win) => {
    expect(win.__xp, "development seam window.__xp").to.be.an("object");
  });
  cy.window().then((win) => {
    expect(win.__xp.loginUser(userId), `${userId} is signed in`).to.eq(true);
  });
};

describe("Moving Out replaces the Old House", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    seedFamily();
  });

  it("starts with The Old House on the Hometown plaza", () => {
    signIn("hero-1");
    cy.visit("/my-portal/hero-1/home-town", { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();
    cy.get(OLD_HOUSE_SPOT, { timeout: 60000 }).should("be.visible");
    cy.get(TOWER_SPOT).should("not.exist");
    cy.wait(1200);
    shot("01-hometown-old-house");
  });

  it("builds the pack, takes its chores into a Moving Out tower and retires the Old House", () => {
    signIn("gm-1");
    cy.visit("/xp-settings/packs", { timeout: 300000 });
    cy.tapToWakeAudio();
    cy.contains("ion-card", "Moving House", { timeout: 60000 }).then(($card) => $card[0].scrollIntoView({ block: "center" }));
    cy.contains("ion-card", "Moving House").contains("ion-button", "Set up").click();
    cy.get(".moving-house-modal", { timeout: 20000 }).should("be.visible");

    // The old house is not built here any more: no temple option and no floors question, only the pack
    cy.get(".moving-house-modal .moving-temple-check").should("not.exist");
    cy.get("[data-cy=moving-floors-2]").should("not.exist");
    cy.get(".moving-house-modal .moving-preview").scrollIntoView().should("contain", "This builds").and("not.contain", "temple");
    shot("02-dialog-no-temple");
    cy.get(".moving-house-modal .moving-build").should("be.visible").and("not.have.attr", "disabled");
    cy.get(".moving-house-modal .moving-build").click();
    cy.get(".moving-house-modal .moving-summary", { timeout: 30000 })
      .should("be.visible")
      .invoke("text")
      .should("match", /^Added \d+ quests? and \d+ beasts? for 3 heroes\./);
    cy.get(".moving-house-modal .moving-summary").should("not.contain", "temple");
    shot("03-summary-with-tower-button");

    // The tower button opens the project wizard on Moving Out, on the house step
    cy.get("[data-cy=moving-to-tower]").should("be.visible").click();
    cy.get("[data-test=step-house]", { timeout: 30000 }).should("be.visible");
    cy.get("[data-test=room-count-bedroom]").should("have.text", "3");
    shot("04-wizard-on-moving-out");
    cy.get("[data-test=next]").click();

    // The moving chores that were open are in the list as the Game Master's own chores, and the roof keeps its finale
    cy.get("[data-test=chore-row][data-custom=true]", { timeout: 20000 }).should("have.length.at.least", 10);
    cy.get("[data-test=phase-roof] [data-test=chore-row]").should("have.length", 1);
    shot("05-wizard-chores-carried");
    cy.get("[data-test=next]").click();
    cy.get("[data-test=reward]").type("A night at the new house");
    cy.get("[data-test=next]").click();
    cy.get("[data-test=submit]").click();
    cy.get("[data-test=submit]", { timeout: 30000 }).should("not.exist");

    // The tower stands, and the Old House's record is gone
    cy.window().then((win) => cy.wrap(win.__xp.getProject(), { timeout: 30000 })).then((record) => {
      expect(record.typeId).to.eq("moving-out");
      expect(record.status).to.eq("active");
      expect(record.chores.filter((chore) => chore.custom).length, "carried chores").to.be.at.least(10);
    });
    cy.window().then((win) => cy.wrap(win.__xp.getTemple(OLD_HOUSE), { timeout: 30000 })).should("equal", null);
    cy.window().then((win) => cy.wrap(win.__xp.getTemple("gen-project-moving-out"), { timeout: 30000 })).should("not.equal", null);
  });

  it("puts the Moving Out tower where The Old House stood", () => {
    signIn("hero-1");
    cy.visit("/my-portal/hero-1/home-town", { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();
    cy.get(TOWER_SPOT, { timeout: 60000 }).should("be.visible");
    cy.get(OLD_HOUSE_SPOT).should("not.exist");
    cy.wait(1200);
    shot("06-hometown-moving-keep");
  });
});
