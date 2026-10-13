// Moving House pack walk-through: a Game Master builds the pack in Settings, then a kid hero finds one of its
// quests in the quest book and takes it into battle. Then the Home chores pack on top of it: the dialog offers the
// day after the move, and the chores reach each hero's board by age. Keeps a screenshot of every step.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/moving-pack.spec.js

const shot = (name) => {
  cy.wait(600);
  cy.screenshot(name, { capture: "viewport" });
};

const tapDialog = () => cy.get("[data-cy=battle-dialog]", { timeout: 20000 }).click("center");
/** Taps through whatever the box is saying until the command menu is back. */
const readUntilMenu = (maxTaps = 8) => {
  const step = (left) => {
    cy.get("body").then(($body) => {
      if ($body.find(".menu-item").length || left === 0) return;
      tapDialog();
      cy.wait(350);
      step(left - 1);
    });
  };
  step(maxTaps);
  cy.get(".menu-item", { timeout: 10000 }).should("have.length", 5);
};

/** Taps through the box until it says `text` (a line types out, and a tap finishes it before the next tap moves on). */
const tapUntilSays = (text, maxTaps = 8) => {
  const step = (left) => {
    cy.get("[data-cy=battle-dialog]", { timeout: 20000 }).then(($box) => {
      if ($box.text().includes(text) || left === 0) return;
      tapDialog();
      cy.wait(350);
      step(left - 1);
    });
  };
  step(maxTaps);
  cy.get("[data-cy=battle-dialog]", { timeout: 10000 }).should("contain", text);
};

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
      timeout: 120000,
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

describe("Moving House pack", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
    seedFamily();
  });

  it("builds the pack in Settings as the Game Master", () => {
    cy.visit("/xp-settings/general", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-item", "Moving House", { timeout: 60000 }).then(($item) => $item[0].scrollIntoView({ block: "center" }));
    // It sits in the Backup & Restore group, on screen above the bottom edge
    cy.contains("ion-item", "Moving House").should(($item) => {
      const box = $item[0].getBoundingClientRect();
      expect(box.top, "row top").to.be.within(0, 700);
    });
    shot("01-settings-backup");
    cy.contains("ion-item", "Moving House").click();

    cy.get(".moving-house-modal", { timeout: 20000 }).should("be.visible");
    cy.get(".moving-house-modal .moving-date").should("be.visible");
    shot("02-dialog-top");

    // The date defaults to two weeks out; type one anyway
    const moveDate = inDays(14);
    cy.get(".moving-house-modal .moving-date").clear().type(moveDate).should("have.value", moveDate);

    // Default rooms stay. Heroes start as their profiles say: Dad grown-up, Max kid, Pip little
    cy.contains(".moving-house-modal .moving-hero", "Dad").find("button.is-on").should("have.text", "Grown-up");
    cy.contains(".moving-house-modal .moving-hero", "Max").find("button.is-on").should("have.text", "Kid");
    cy.contains(".moving-house-modal .moving-hero", "Pip").find("button.is-on").should("have.text", "Little");
    // Tap them anyway: a different pick moves the highlight, tapping back restores it
    cy.contains(".moving-house-modal .moving-hero", "Pip").contains("button", "Kid").click();
    cy.contains(".moving-house-modal .moving-hero", "Pip").find("button.is-on").should("have.text", "Kid");
    cy.contains(".moving-house-modal .moving-hero", "Pip").contains("button", "Little").click();
    cy.contains(".moving-house-modal .moving-hero", "Pip").find("button.is-on").should("have.text", "Little");
    cy.contains(".moving-house-modal .moving-hero", "Max").contains("button", "Kid").click();

    // The build button and the preview count are reachable at the bottom of the dialog
    cy.get(".moving-house-modal .moving-preview").scrollIntoView().should("contain", "This builds");
    shot("03-dialog-heroes");
    cy.get(".moving-house-modal .moving-build").should("be.visible").and("not.have.attr", "disabled");

    cy.get(".moving-house-modal .moving-build").click();
    cy.get(".moving-house-modal .moving-summary", { timeout: 30000 })
      .should("be.visible")
      .invoke("text")
      .should("match", /^Added \d+ quests? and \d+ beasts? for 3 heroes\./);
    cy.get(".moving-house-modal .moving-summary").should("contain", "First up:");
    shot("04-summary");

    // Reload app is a real button: tap it and the app comes back with the pack in every store
    cy.window().then((win) => {
      win.__beforeReload = true;
    });
    cy.contains(".moving-house-modal ion-button", "Reload app").click();
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__beforeReload, "a fresh page").to.eq(undefined);
      expect(win.__xp, "seam after reload").to.be.an("object");
    });
  });

  it("lists a moving quest for the kid and takes it into battle", () => {
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-1"), "Max is signed in").to.eq(true);
    });
    cy.visit("/my-tasks/hero-1", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "seam").to.be.an("object");
    });
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    shot("05-quest-book");

    // A moving quest is on Max's board; open its card
    cy.get("ion-card[id^=move-]", { timeout: 30000 }).should("have.length.greaterThan", 0);
    cy.get("ion-card#move-keep-donate-trash-hero-1", { timeout: 30000 }).scrollIntoView().should("be.visible");
    shot("06-quest-board-card");
    cy.get("ion-card#move-keep-donate-trash-hero-1").click();

    // The detail has a Fight! button behind the hero's fab
    cy.get("ion-modal.MyTask, ion-modal", { timeout: 20000 }).should("exist");
    cy.get("ion-modal ion-card-title", { timeout: 20000 }).should("contain", "Keep, Donate, Trash");
    cy.wait(800);
    // The hero's fab opens its buttons by itself a moment after the card appears (tapping it then would shut them)
    cy.get("ion-modal ion-fab-button").first().should("be.visible");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).should("be.visible");
    cy.wait(1200);
    shot("07-quest-detail-fab");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!").should("not.have.attr", "disabled");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!").click();

    // The battle opens with the quest's beast
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/battle\/hero-1\//);
    cy.get(".battlefield", { timeout: 60000 }).should("exist");
    cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Sorting Chimera");
    cy.get("[data-cy=hero-card]").should("contain", "Max");
    cy.wait(600);
    shot("08-battle-intro");
    cy.get("[data-cy=battle-dialog]").should("contain", "Sorting Chimera");
    readUntilMenu(4);
    cy.get(".chores-left-label").should("have.text", "5 chores left");
    cy.get(".attack-timer-label").should("contain", ":");

    shot("08b-battle-menu");
    // Tackle lists the checklist as the attacks
    cy.contains(".menu-item", "Tackle").click();
    cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
    cy.get(".battle-task-item").should("have.length", 5);
    cy.contains(".battle-task-item", "Make three piles: keep, donate, trash").should("be.visible");
    shot("09-battle-checklist");
    cy.get("[data-cy=task-back]").click();
    cy.get("[data-cy=task-sheet]").should("not.exist");

    // Run away. A run always works; a quest fight is not a free fight, so one parting strike lands on the way out.
    // A middling roll lands it every time (agility only dodges under its few percent).
    cy.window().then((win) => {
      win.Math.random = () => 0.5;
    });
    cy.get(".menu-item", { timeout: 10000 }).should("have.length", 5);
    cy.contains(".menu-item", "Run Away").click();
    cy.get(".dialog-prompt").should("contain", "Run away?");
    shot("10-run-confirm");
    cy.contains(".menu-item", /^\s*Run\s*$/).click();
    tapUntilSays("flees!");
    shot("10a-parting-strike");
    tapUntilSays("Got away safely");
    shot("10b-got-away");
    tapDialog();
    cy.location("pathname", { timeout: 30000 }).should("not.match", /^\/battle\//);
    cy.wait(1000);
    shot("11-after-run");
  });

  it("gives the little hero their own quests", () => {
    cy.visit("/", { timeout: 120000 });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "seam").to.be.an("object");
    });
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-2"), "Pip is signed in").to.eq(true);
    });
    cy.visit("/my-tasks/hero-2", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get("ion-card#move-toy-triage-hero-2", { timeout: 30000 }).scrollIntoView().should("be.visible");
    // The kid's and the grown-ups' quests are not on their board
    cy.get("ion-card#move-keep-donate-trash-hero-1").should("not.exist");
    cy.get("ion-card#move-supplies").should("not.exist");
    shot("12-little-quest-book");
  });

  it("builds the Home chores pack from Settings, offering the day after the move", () => {
    cy.visit("/", { timeout: 120000 });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "seam").to.be.an("object");
    });
    cy.window().then((win) => {
      expect(win.__xp.loginUser("gm-1"), "Dad is signed in").to.eq(true);
    });
    cy.visit("/xp-settings/general", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-item", "Home chores", { timeout: 60000 }).then(($item) => $item[0].scrollIntoView({ block: "center" }));
    // It sits next to Moving House, on screen above the bottom edge
    cy.contains("ion-item", "Home chores").should(($item) => {
      const box = $item[0].getBoundingClientRect();
      expect(box.top, "row top").to.be.within(0, 700);
    });
    shot("13-settings-home-chores");
    cy.contains("ion-item", "Home chores").click();

    cy.get(".home-chores-modal", { timeout: 20000 }).should("be.visible");
    // The Moving House pack is loaded (the move is two weeks out), so the first day is the day after it
    cy.get(".home-chores-modal .home-date").should("be.visible").and("have.value", inDays(15));
    shot("14-home-dialog-top");
    cy.contains(".home-chores-modal .home-hero", "Dad").find("button.is-on").should("have.text", "Grown-up");
    cy.contains(".home-chores-modal .home-hero", "Max").find("button.is-on").should("have.text", "Kid");
    cy.contains(".home-chores-modal .home-hero", "Pip").find("button.is-on").should("have.text", "Little");

    // Start today, so the chores are on the boards right away
    cy.get(".home-chores-modal .home-date").clear().type(inDays(0)).should("have.value", inDays(0));
    // The rooms are tick boxes and steppers: add a dog and see the count grow
    cy.get(".home-chores-modal .home-preview").scrollIntoView().invoke("text").then((before) => {
      cy.contains(".home-chores-modal .home-check", "Dog").click();
      cy.get(".home-chores-modal .home-preview").invoke("text").should("not.eq", before);
      cy.contains(".home-chores-modal .home-check", "Dog").click();
      cy.get(".home-chores-modal .home-preview").invoke("text").should("eq", before);
    });
    cy.get(".home-chores-modal .home-preview").should("contain", "This builds");
    shot("15-home-dialog-heroes");
    cy.get(".home-chores-modal .home-build").should("be.visible").and("not.have.attr", "disabled");

    cy.get(".home-chores-modal .home-build").click();
    cy.get(".home-chores-modal .home-summary", { timeout: 30000 })
      .should("be.visible")
      .invoke("text")
      .should("match", /^Added \d+ quests? and \d+ beasts? for 3 heroes, starting /);
    cy.get(".home-chores-modal .home-summary").should("contain", "First up:");
    shot("16-home-summary");

    cy.window().then((win) => {
      win.__beforeReload = true;
    });
    cy.contains(".home-chores-modal ion-button", "Reload app").click();
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__beforeReload, "a fresh page").to.eq(undefined);
      expect(win.__xp, "seam after reload").to.be.an("object");
    });
  });

  it("puts the home chores on each hero's board by age and takes one into battle", () => {
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-1"), "Max is signed in").to.eq(true);
    });
    cy.visit("/my-tasks/hero-1", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    // Max is a kid: his own and the shared chores are on his board, the grown-ups' are not
    cy.get("ion-card#home-cupboard-kobold", { timeout: 30000 }).scrollIntoView().should("be.visible");
    cy.get("ion-card#home-bed-basilisk").should("exist");
    cy.get("ion-card#home-gravy-ghoul").should("not.exist");
    cy.get("ion-card#home-grease-gorgon").should("not.exist");
    shot("17-home-kid-board");
    cy.get("ion-card#home-cupboard-kobold").click();

    // The card shows quest names in title case
    cy.contains("ion-modal ion-card-title", /unload the dishwasher/i, { timeout: 20000 }).should("exist");
    cy.wait(800);
    cy.get("ion-modal ion-fab-button").first().should("be.visible");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).should("be.visible");
    cy.wait(1200);
    shot("18-home-quest-detail");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!").should("not.have.attr", "disabled");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!").click();

    // The library beast's four chores are the attacks
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/battle\/hero-1\//);
    cy.get(".battlefield", { timeout: 60000 }).should("exist");
    cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Cupboard Kobold");
    cy.get("[data-cy=hero-card]").should("contain", "Max");
    cy.wait(600);
    shot("19-home-battle-intro");
    readUntilMenu(4);
    cy.get(".chores-left-label").should("have.text", "4 chores left");
    cy.contains(".menu-item", "Tackle").click();
    cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
    cy.get(".battle-task-item").should("have.length", 4);
    cy.contains(".battle-task-item", "Put away the plates and bowls").should("be.visible");
    shot("20-home-battle-checklist");
    cy.get("[data-cy=task-back]").click();
    cy.get("[data-cy=task-sheet]").should("not.exist");

    // Run away (it always works, at the cost of one parting strike), so the next test starts on a quiet map
    cy.window().then((win) => {
      win.Math.random = () => 0.5;
    });
    cy.get(".menu-item", { timeout: 10000 }).should("have.length", 5);
    cy.contains(".menu-item", "Run Away").click();
    cy.get(".dialog-prompt").should("contain", "Run away?");
    cy.contains(".menu-item", /^\s*Run\s*$/).click();
    tapUntilSays("Got away safely");
    shot("22-home-got-away");
    tapDialog();
    cy.location("pathname", { timeout: 30000 }).should("not.match", /^\/battle\//);
  });

  it("gives the little hero the little chores and not the kid's", () => {
    cy.visit("/", { timeout: 120000 });
    cy.window({ timeout: 60000 }).should((win) => {
      expect(win.__xp, "seam").to.be.an("object");
    });
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-2"), "Pip is signed in").to.eq(true);
    });
    cy.visit("/my-tasks/hero-2", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
    cy.get("ion-card#home-gravy-ghoul", { timeout: 30000 }).scrollIntoView().should("be.visible");
    cy.get("ion-card#home-fang-fairy").should("exist");
    cy.get("ion-card#home-cupboard-kobold").should("not.exist");
    cy.get("ion-card#home-grease-gorgon").should("not.exist");
    shot("21-home-little-board");
  });
});
