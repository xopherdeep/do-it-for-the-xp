// The quest book on a phone: the quest card's fab and every button it opens stay on screen in thumb reach, a tap
// on the avatar just after the menu opened by itself goes straight to the fight, the card names a weekly quest's
// due day, and a stale list row cannot pay a quest twice.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/quest-detail-fab.spec.js

const shot = (name) => {
  cy.wait(300);
  cy.screenshot(name, { capture: "viewport" });
};

const localKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKLY_STARTED_DAYS_AGO = 2;

/**
 * The battle fixture's hero with one extra quest: a weekly chore due at 18:00. Its weeks count from the day it
 * starts (two days ago), so the window it is in now ends four days from now.
 */
const withWeeklyChore = (backup) => {
  const world = JSON.parse(JSON.stringify(backup));
  const socks = world.stores.__achievements[0].value;
  const startsOn = new Date();
  startsOn.setDate(startsOn.getDate() - WEEKLY_STARTED_DAYS_AGO);
  startsOn.setHours(0, 0, 0, 0);
  world.stores.__achievements.push({
    key: "quest-weekly",
    value: {
      ...socks,
      id: "quest-weekly",
      achievementName: "Wash the car",
      beastId: "",
      basicSchedule: "weekly",
      startsOn: startsOn.toISOString(),
      dueByTime: "18:00",
      adventureType: "simple",
    },
  });
  return world;
};

/** Seeds the world, opens the quest book and the card of `questId`. */
const openCard = (questId, title, backupFor = (backup) => backup) => {
  cy.fixture("battle-backup.json").then((backup) => {
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
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(backupFor(backup)), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded").to.eq(true);
    });
  });
  cy.visit("/my-tasks/hero-1", { timeout: 120000 });
  cy.tapToWakeAudio();
  cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
  cy.get(`ion-card#${questId}`, { timeout: 30000 }).scrollIntoView().should("be.visible");
  cy.get(`ion-card#${questId}`).click();
  cy.get("ion-modal ion-card-title", { timeout: 20000 }).should("contain", title);
};

/** Where every fab control sits, in viewport pixels. */
const fabBoxes = (win) => {
  const rect = (el) => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    return { left, right, top, bottom };
  };
  const boxes = { avatar: rect(win.document.querySelector("ion-modal ion-fab ion-fab-button")) };
  win.document.querySelectorAll("ion-modal ion-fab ion-fab-list ion-button").forEach((el) => {
    boxes[el.textContent.trim()] = rect(el);
  });
  return boxes;
};

const expectFabOnScreen = () => {
  cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).should("be.visible");
  cy.wait(600);
  cy.window().then((win) => {
    const boxes = fabBoxes(win);
    expect(Object.keys(boxes).sort(), "fab controls").to.deep.eq(["Fight!", "Goods", "Magic", "Run", "avatar"]);
    Object.entries(boxes).forEach(([name, box]) => {
      expect(box.left, `${name} left`).to.be.at.least(0);
      expect(box.right, `${name} right`).to.be.at.most(win.innerWidth);
      expect(box.bottom, `${name} bottom`).to.be.at.most(win.innerHeight);
      // Thumb reach: the lower half of the screen
      expect(box.top, `${name} top`).to.be.at.least(win.innerHeight / 2);
    });
  });
};

describe("Quest detail fab", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("keeps the fab and every button it opens on screen, low on the phone", () => {
    openCard("quest-socks", "Socktopus");
    expectFabOnScreen();
    shot("fab-open-390");
  });

  it("keeps them on screen on a narrow phone too", () => {
    cy.viewport(320, 568);
    openCard("quest-socks", "Socktopus");
    expectFabOnScreen();
    shot("fab-open-320");
  });

  it("goes straight to the fight when Fight! is tapped the moment the menu appears", () => {
    openCard("quest-socks", "Socktopus");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).click();
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/battle\/hero-1\//);
  });

  it("goes straight to the fight when the avatar is tapped while the menu is opening", () => {
    openCard("quest-socks", "Socktopus");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).should("be.visible");
    cy.get("ion-modal ion-fab ion-fab-button").first().click();
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/battle\/hero-1\//);
  });

  it("closes the menu on a later tap on the avatar, as Ionic does", () => {
    openCard("quest-socks", "Socktopus");
    cy.contains("ion-modal ion-fab-list ion-button", "Fight!", { timeout: 20000 }).should("be.visible");
    cy.wait(2200);
    cy.get("ion-modal ion-fab ion-fab-button").first().click();
    cy.get("ion-modal ion-fab-list.fab-list-active").should("not.exist");
    cy.location("pathname").should("not.match", /^\/battle\//);
  });

  it("names a weekly quest's due day on the card", () => {
    openCard("quest-weekly", "Wash The Car", withWeeklyChore);
    // Due on the last day of its week: four days from now, named by weekday
    const lastDay = DAY_NAMES[(new Date().getDay() + 6 - WEEKLY_STARTED_DAYS_AGO) % 7];
    cy.contains("ion-modal ion-card-subtitle", "Due @")
      .invoke("text")
      .should((text) => expect(text.trim()).to.eq(`Due @ ${lastDay} 6:00PM`));
    shot("weekly-due-day");
  });

  it("refuses a stale list row that the quest log already shows done", () => {
    cy.fixture("battle-backup.json").then((backup) => {
      const now = new Date();
      const doneToday = JSON.parse(JSON.stringify(backup));
      doneToday.stores.__questLog.push({
        key: "entry-stale",
        value: {
          id: "entry-stale",
          questId: "quest-socks",
          questName: "Tame the Socktopus",
          userId: "hero-1",
          completedAt: now.toISOString(),
          dayKey: localKey(now),
          status: "approved",
          source: "claim",
          rewards: { xp: 120, gp: 30, ap: 2 },
          rewardsApplied: true,
        },
      });
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
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(backup), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded").to.eq(true);
      });
      cy.visit("/my-tasks/hero-1", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.contains("ion-title", "Quest Log", { timeout: 60000 }).should("exist");
      cy.contains("ion-segment-button", "List", { timeout: 30000 }).click();
      cy.contains(".quest-row", /tame the socktopus/i, { timeout: 20000 }).should("be.visible");
      // Another screen finishes the quest while this row is on show: the log now has today's clear
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(doneToday), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded again").to.eq(true);
      });
      cy.window().then((win) => {
        cy.wrap(win.__xp.getUser("hero-1").stats.gp.wallet).as("walletBefore");
      });
      cy.contains(".quest-row", /tame the socktopus/i).find("ion-button.quest-row-done").click();
      cy.contains("ion-action-sheet button", "Done!", { timeout: 10000 }).click();
      // The toast keeps its text in properties (it renders in a shadow root)
      cy.get("ion-toast", { timeout: 10000 }).should(($toast) => {
        expect($toast[0].header, "toast header").to.match(/tame the socktopus/i);
        expect($toast[0].message, "toast message").to.eq("You already tamed this quest.");
      });
      cy.window().then((win) => {
        cy.get("@walletBefore").then((walletBefore) => {
          expect(win.__xp.getUser("hero-1").stats.gp.wallet, "the stale row paid nothing").to.eq(walletBefore);
        });
      });
      shot("stale-row-refused");
    });
  });
});
