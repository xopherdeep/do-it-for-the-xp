// Setup wizard e2e: a fresh device offers the wizard; one hero, two rooms, Begin; the bestiary and the quest list fill.

/** Counts the rows of one Ionic storage database (`_ionickv`) in the app's own window */
const countRows = (win, dbName) =>
  new Cypress.Promise((resolve) => {
    const opening = win.indexedDB.open(dbName);
    opening.onerror = () => resolve(0);
    opening.onsuccess = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains("_ionickv")) {
        db.close();
        resolve(0);
        return;
      }
      const counting = db.transaction("_ionickv", "readonly").objectStore("_ionickv").count();
      counting.onsuccess = () => {
        db.close();
        resolve(counting.result);
      };
      counting.onerror = () => {
        db.close();
        resolve(0);
      };
    };
  });

/** The device starts empty: IndexedDB outlives a test, and a stale bestiary would suppress the offer */
const forgetDatabases = (win) => {
  try {
    win.indexedDB.databases().then((known) => known.forEach((db) => win.indexedDB.deleteDatabase(db.name)));
  } catch {
    // chemx-allow: best-effort, no IndexedDB in this window means the device holds nothing to forget
  }
};

const hashRouting = Cypress.env("hashRouting");

describe("Setup wizard", () => {
  it("offers itself on an empty device and stocks the game", () => {
    cy.visit(hashRouting ? "/#/xp-profile" : "/xp-profile", { timeout: 120000, onBeforeLoad: forgetDatabases });
    cy.tapToWakeAudio();

    // 1. Family: one hero with a name and an age (the age stepper starts at "?")
    cy.get('[data-test="step-family"]', { timeout: 60000 }).should("be.visible");
    cy.get('[data-test="gm-name"]').find("input").type("Mom", { force: true });
    cy.get('[data-test="gm-pin"]').find("input").type("1234", { force: true });
    cy.get('[data-test="add-hero"]').click();
    cy.get('[data-test="hero-name"]').find("input").type("Rowan", { force: true });
    cy.get('[data-test="hero-row"]').last().find('[data-test="age-up"]').click();
    cy.get('[data-test="hero-row"]').last().find('[data-test="age"]').invoke("text").then((text) => {
      expect(Number(text.trim()), "the age stepper moved off ?").to.be.greaterThan(0);
    });
    cy.get('[data-test="hero-row"]').last().find('[data-test="age-up"]').click({ multiple: true });
    cy.screenshot("setup-1-family", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 2. House: two rooms
    cy.get('[data-test="step-house"]').should("be.visible");
    cy.get('[data-test="room-chip"]').eq(0).click();
    cy.get('[data-test="room-chip"]').eq(1).click();
    cy.get('[data-test="room-chip"][aria-pressed="true"]').should("have.length.at.least", 2);
    cy.screenshot("setup-2-house", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 3. Review: the pre-ticked chores stay
    cy.get('[data-test="step-review"]').should("be.visible");
    cy.get('[data-test="beast-card"]').should("have.length.at.least", 1);
    cy.screenshot("setup-3-review", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 4. Extras: left on
    cy.get('[data-test="step-extras"]').should("be.visible");
    cy.get('[data-test="extras-toggle"]').should("have.class", "toggle-checked");
    cy.screenshot("setup-4-extras", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 5. Summary, then Begin
    cy.get('[data-test="step-summary"]').should("be.visible");
    cy.screenshot("setup-5-summary", { capture: "viewport" });
    cy.get('[data-test="submit"]').click();

    cy.get('[data-test="setup-error"]').should("not.exist");
    // The toast text lives in ion-toast's shadow root, so read the `message` property of the host
    cy.get("ion-toast", { timeout: 30000 }).should(($toasts) => {
      const messages = Array.from($toasts).map((toast) => String(toast.message));
      expect(messages.join(" | ")).to.match(/Setup done|world is ready/);
    });
    cy.window().then((win) => cy.wrap(countRows(win, "__beasts"))).should("be.greaterThan", 0);
    cy.window().then((win) => cy.wrap(countRows(win, "__achievements"))).should("be.greaterThan", 0);
  });
});
