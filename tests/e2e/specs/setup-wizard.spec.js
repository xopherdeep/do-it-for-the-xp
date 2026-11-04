// Setup wizard e2e: a fresh device offers the wizard; one hero, two rooms, Begin; the stores hold the chores the review step showed.

const hashRouting = Cypress.env("hashRouting");
const route = (path) => (hashRouting ? `/#${path}` : path);

/** Every row of one Ionic storage database (`_ionickv`) in the app's own window, as [key, value] pairs */
const rowsOf = (win, dbName) =>
  new Cypress.Promise((resolve, reject) => {
    const opening = win.indexedDB.open(dbName);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains("_ionickv")) {
        db.close();
        resolve([]);
        return;
      }
      const store = db.transaction("_ionickv", "readonly").objectStore("_ionickv");
      const keys = store.getAllKeys();
      const values = store.getAll();
      values.onerror = () => {
        db.close();
        reject(values.error);
      };
      values.onsuccess = () => {
        db.close();
        resolve(keys.result.map((key, at) => [key, values.result[at]]));
      };
    };
  });

const rowsInStore = (name) => cy.window().then((win) => rowsOf(win, name));

/**
 * The device starts empty: IndexedDB outlives a test, and a stale bestiary would suppress the offer.
 * Awaited, and it empties the rows (not the databases) so a connection the app holds open cannot block it.
 */
const clearDatabases = (win) =>
  new Cypress.Promise((resolve, reject) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
    win.indexedDB.databases().then((known) => {
      const wipe = (info) =>
        new Promise((done, fail) => {
          const opening = win.indexedDB.open(info.name);
          opening.onerror = () => fail(opening.error);
          opening.onsuccess = () => {
            const db = opening.result;
            const names = Array.from(db.objectStoreNames);
            if (!names.length) {
              db.close();
              done();
              return;
            }
            const tx = db.transaction(names, "readwrite");
            names.forEach((name) => tx.objectStore(name).clear());
            tx.onerror = () => fail(tx.error);
            tx.oncomplete = () => {
              db.close();
              done();
            };
          };
        });
      Promise.all(known.map(wipe)).then(() => resolve(), reject);
    }, reject);
  });

/** A fresh load of the profile chooser: the first boot is only there to empty the device, the second one starts clean */
const visitEmptyDevice = () => {
  cy.visit(route("/xp-profile"), { timeout: 120000 });
  cy.window({ timeout: 60000 }).then((win) => clearDatabases(win));
  cy.visit(route("/xp-profile"), { timeout: 120000 });
  cy.tapToWakeAudio();
};

describe("Setup wizard", () => {
  it("offers itself on an empty device and stocks the game", () => {
    visitEmptyDevice();

    // The offer: the wizard opens by itself on its first step, over an empty game
    cy.get('[data-test="step-family"]', { timeout: 60000 }).should("be.visible");
    cy.get(".setup-wizard").should("exist");
    rowsInStore("__beasts").should("have.length", 0);
    rowsInStore("__achievements").should("have.length", 0);

    // 1. Family: a parent and one hero with a name and an age (a new hero starts at 8; an existing kid shows "?" until the first tap lands on 8)
    cy.get('[data-test="gm-name"]').find("input").type("Mom", { force: true });
    cy.get('[data-test="gm-pin"]').find("input").type("1234", { force: true });
    cy.get('[data-test="add-hero"]').click();
    cy.get('[data-test="hero-name"]').find("input").type("Rowan", { force: true });
    cy.get('[data-test="hero-row"]').last().find('[data-test="age-up"]').click();
    cy.get('[data-test="hero-row"]').last().find('[data-test="age"]').invoke("text").should((text) => {
      expect(Number(text.trim()), "the age stepper moved off ?").to.be.greaterThan(0);
    });
    cy.screenshot("setup-1-family", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 2. House: two rooms
    cy.get('[data-test="step-house"]').should("be.visible");
    cy.get('[data-test="room-chip"]').eq(0).click();
    cy.get('[data-test="room-chip"]').eq(1).click();
    cy.get('[data-test="room-chip"][aria-pressed="true"]').should("have.length", 2);
    cy.screenshot("setup-2-house", { capture: "viewport" });
    cy.get('[data-test="next"]').click();

    // 3. Review: the pre-ticked chores stay; remember what Rowan was shown (the second hero block)
    cy.get('[data-test="step-review"]').should("be.visible");
    cy.get('[data-test="review-hero"]').should("have.length", 2);
    const shown = [];
    cy.get('[data-test="review-hero"]')
      .eq(1)
      .find('[data-test="beast-card"]')
      .should("have.length.at.least", 1)
      .each(($card) => {
        shown.push({ beast: $card.find(".sw-beast__name").text().trim(), chore: $card.find(".sw-beast__chore").text().trim() });
      });
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
    cy.get(".setup-wizard", { timeout: 30000 }).should("not.exist");

    // The stores now hold what the review step showed, each chore assigned to the new hero
    rowsInStore("__beasts").should("have.length.at.least", 1);
    rowsInStore("__achievements").should("have.length.at.least", 1);
    rowsInStore("__profiles").then((profiles) => {
      const rowan = profiles.map(([, value]) => value).find((profile) => JSON.stringify(profile).includes("Rowan"));
      expect(rowan, "Rowan's profile was created").to.be.an("object");
      rowsInStore("__achievements").then((quests) => {
        rowsInStore("__beasts").then((beasts) => {
          expect(shown.length, "the review step showed chores").to.be.greaterThan(0);
          shown.forEach(({ beast, chore }) => {
            const quest = quests.map(([, value]) => value).find((entry) => entry.achievementName === chore);
            expect(quest, `a quest for "${chore}"`).to.be.an("object");
            expect(quest.assignee, `"${chore}" is assigned to Rowan`).to.include(rowan.id);
            const record = beasts.map(([, value]) => value).find((entry) => String(entry.id) === String(quest.beastId));
            expect(record, `the beast of "${chore}"`).to.be.an("object");
            expect(record.name, "the beast the review step showed").to.eq(beast);
          });
        });
      });
      cy.wrap(rowan.id).as("rowanId");
    });

    // The Compendium bestiary lists beasts and no longer offers to run setup (the Game Master Mom is signed in by the seam)
    cy.get("@rowanId").then(() => {
      rowsInStore("__profiles").then((profiles) => {
        const mom = profiles.map(([, value]) => value).find((profile) => JSON.stringify(profile).includes("Mom"));
        expect(mom, "Mom's profile was created").to.be.an("object");
        cy.visit(route("/xp-profile"), { timeout: 120000 });
        cy.window({ timeout: 60000 }).should((win) => {
          expect(win.__xp.getUser(mom.id), "Mom is loaded").to.be.an("object");
        });
        cy.window().then((win) => expect(win.__xp.loginUser(mom.id), "Mom signs in").to.eq(true));
        cy.visit(route("/game-master/compendium/bestiary"), { timeout: 120000 });
        cy.window({ timeout: 60000 }).should((win) => expect(win.__xp.getUser(mom.id)).to.be.an("object"));
        cy.get(".beast-selector-item", { timeout: 60000 }).should("have.length.at.least", 1);
        cy.get('[data-cy="bestiary-run-setup"]').should("not.exist");
        cy.screenshot("setup-6-bestiary", { capture: "viewport" });
      });
    });
  });
});
