// The Moving Day temple walk-through: a Game Master builds the Moving House pack with the temple option on, a hero finds
// The Old House on the Hometown plaza, walks in from the front door to a bedroom and opens its quest room.
// Keeps a screenshot of every step at 390x844 in tests/e2e/screenshots/moving-temple.spec.js.
// Run (dev server first; a server that reloads mid-run breaks the walk, so use one that does not):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/moving-temple.spec.js

const shot = (name) => {
  cy.wait(600);
  cy.screenshot(name, { capture: "viewport", overwrite: true });
};

const TEMPLE = "gen-move-house";

// Cypress clears localStorage between tests; the hero has already answered the one-time ambush-alert ask
const quietAlerts = (win) => win.localStorage.setItem("xp.battleAlerts", "off");

/** Local "YYYY-MM-DD", the way the dialog's date field reads it. */
const localKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const inDays = (days) => {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return localKey(day);
};

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
    cy.visit("/", {
      timeout: 300000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
      },
    });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "development seam window.__xp").to.be.an("object");
    });
    cy.window().then((win) => win.__xp.signInSeedGameMaster());
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(family), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser("gm-1"), "Dad is signed in").to.eq(true);
    });
  });
};

describe("Moving Day temple", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    seedFamily();
  });

  it("offers the temple in the Moving House dialog, on by default, and builds it with the pack", () => {
    cy.visit("/xp-settings/general", { timeout: 300000 });
    cy.tapToWakeAudio();
    cy.contains("ion-item", "Moving House", { timeout: 60000 }).then(($item) => $item[0].scrollIntoView({ block: "center" }));
    cy.contains("ion-item", "Moving House").click();
    cy.get(".moving-house-modal", { timeout: 20000 }).should("be.visible");

    // The move is today, so every phase has opened and the rooms of the old house are awake
    cy.get(".moving-house-modal .moving-date").clear().type(inDays(0)).should("have.value", inDays(0));

    // The temple option sits above the build button and is ticked
    cy.get(".moving-house-modal .moving-temple-check").scrollIntoView().should("be.visible").and("have.class", "is-on");
    cy.get(".moving-house-modal .moving-temple-check").should("have.attr", "aria-checked", "true");
    cy.get(".moving-house-modal .moving-preview").should("contain", "-room temple");
    shot("01-dialog-temple-option");

    // Off: the preview drops the temple. On again: it is back.
    cy.get(".moving-house-modal .moving-temple-check").click().should("not.have.class", "is-on");
    cy.get(".moving-house-modal .moving-preview").should("not.contain", "temple");
    cy.get(".moving-house-modal .moving-temple-check").click().should("have.class", "is-on");
    cy.get(".moving-house-modal .moving-preview").should("contain", "-room temple");

    cy.get(".moving-house-modal .moving-build").should("be.visible").and("not.have.attr", "disabled");
    cy.get(".moving-house-modal .moving-build").click();
    cy.get(".moving-house-modal .moving-summary", { timeout: 30000 })
      .should("be.visible")
      .invoke("text")
      .should("match", /^Added \d+ quests? and \d+ beasts? for 3 heroes\./);
    cy.get(".moving-house-modal .moving-summary").should("contain", "The Old House is open in Hometown");
    shot("02-summary-with-temple");

    cy.window().then((win) => {
      win.__beforeReload = true;
    });
    cy.contains(".moving-house-modal ion-button", "Reload app").click();
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__beforeReload, "a fresh page").to.eq(undefined);
      expect(win.__xp, "seam after reload").to.be.an("object");
    });
  });

  it("puts The Old House on the Hometown plaza for a hero and walks in", () => {
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-1"), "Max is signed in").to.eq(true);
    });
    cy.visit("/my-portal/hero-1/home-town", { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();
    cy.get(".xp-building-model-wrapper[title='Enter The Old House']", { timeout: 60000 }).should("be.visible");
    cy.wait(1200);
    shot("03-hometown-old-house");
    cy.get(".xp-building-model-wrapper[title='Enter The Old House']").click();

    cy.location("pathname", { timeout: 30000 }).should("eq", `/temple/${TEMPLE}/hero-1`);
    // The front door: the hall runs east
    cy.get("ion-fab ion-fab-button", { timeout: 60000 }).should("exist");
    cy.wait(1500);
    shot("04-front-door");
  });

  it("opens a bedroom's quest room: the hero's own packing quest waits there", () => {
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-2"), "Pip is signed in").to.eq(true);
    });
    // Pip has no run in the temple yet, so the route's start position holds. Pip's bedroom is the third room north of
    // the hall for this family (row 1, column 3).
    cy.visit(`/temple/${TEMPLE}/hero-2/3/1`, { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();
    // The room's beast is the quest's beast; tapping it opens the room's sheet with the quest on it
    cy.get(".xp-monster-model-wrapper", { timeout: 60000 }).should("be.visible").and("have.attr", "title", "Attack Plush Pile Gremlin");
    cy.wait(1500);
    shot("05-bedroom-quest-room");
    cy.get(".xp-monster-model-wrapper").click();
    cy.get("[data-cy=choice-reveal]", { timeout: 20000 }).should("be.visible");
    // The sheet reads: A Monster approaches! / the beast / the quest and when it is due / Fight
    cy.get("[data-cy=choice-reveal]").should("contain", "Plush Pile Gremlin").and("contain", "Fight");
    cy.get("[data-cy=choice-body]").should("contain", "Stuffed Animals");
    cy.wait(4000); // the beast shows first, then the sheet slides in over the room
    shot("06-quest-room-sheet");
  });
});
