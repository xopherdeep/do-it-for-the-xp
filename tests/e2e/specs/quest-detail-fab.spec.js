// The quest book on a phone: a tap on a quest opens its beast card (XpBeastCardModal) with Hunt and Claim in thumb
// reach, Hunt goes straight to the fight, and a stale list row cannot pay a quest twice.
// (The file keeps its old name: it used to cover the legacy quest card's fab, retired with MyTask.)
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/quest-detail-fab.spec.js

const shot = (name) => {
  cy.wait(300);
  cy.screenshot(name, { capture: "viewport" });
};

const localKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Seeds the world, opens the quest book and the card of `questId`. */
const openCard = (questId, title) => {
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
    cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(backup)), { timeout: 60000 }));
    cy.window().then((win) => {
      expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded").to.eq(true);
    });
  });
  cy.visit("/my-tasks/hero-1", { timeout: 120000 });
  cy.tapToWakeAudio();
  cy.contains(".xp-app-header__title", "Beast Log", { timeout: 60000 }).should("exist");
  cy.get(`#${questId}`, { timeout: 30000 }).scrollIntoView().should("be.visible");
  cy.get(`#${questId}`).click();
  cy.get("ion-modal.beast-card-modal .beast-plate__name", { timeout: 20000 }).should("contain", title);
};

/**
 * Hunt and Claim sit on screen, in the lower half of the phone. The sheet slides up as the buttons first count as
 * visible, so each box is read inside a retrying `should`: it passes once the slide has settled.
 */
const expectButtonsInThumbReach = () => {
  cy.get("ion-modal.beast-card-modal [data-test=hunt]", { timeout: 20000 }).should("be.visible");
  cy.get("ion-modal.beast-card-modal [data-test=claim]").should("be.visible");
  ["hunt", "claim"].forEach((name) => {
    cy.get(`ion-modal.beast-card-modal [data-test=${name}]`).should(($button) => {
      const win = $button[0].ownerDocument.defaultView;
      const box = $button[0].getBoundingClientRect();
      expect(box.left, `${name} left`).to.be.at.least(0);
      expect(box.right, `${name} right`).to.be.at.most(win.innerWidth);
      expect(box.bottom, `${name} bottom`).to.be.at.most(win.innerHeight);
      expect(box.top, `${name} top`).to.be.at.least(win.innerHeight / 2);
    });
  });
};

describe("Quest beast card", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("keeps Hunt and Claim on screen, low on the phone", () => {
    openCard("quest-socks", "Socktopus");
    expectButtonsInThumbReach();
    shot("beast-card-390");
  });

  it("keeps them on screen on a narrow phone too", () => {
    cy.viewport(320, 568);
    openCard("quest-socks", "Socktopus");
    expectButtonsInThumbReach();
    shot("beast-card-320");
  });

  it("goes to the fight when Hunt is tapped", () => {
    openCard("quest-socks", "Socktopus");
    cy.get("ion-modal.beast-card-modal [data-test=hunt]", { timeout: 20000 }).should("not.be.disabled").click();
    cy.location("pathname", { timeout: 30000 }).should("match", /^\/battle\/hero-1\//);
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
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(backup)), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded").to.eq(true);
      });
      cy.visit("/my-tasks/hero-1", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.contains(".xp-app-header__title", "Beast Log", { timeout: 60000 }).should("exist");
      cy.get("button[aria-label=List]", { timeout: 30000 }).filter(":visible").first().click();
      cy.contains(".quest-log-row", /socktopus/i, { timeout: 20000 }).should("be.visible");
      // Another screen finishes the quest while this row is on show: the log now has today's clear
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(doneToday)), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser("hero-1"), "hero-1 is loaded again").to.eq(true);
      });
      cy.window().then((win) => {
        cy.wrap(win.__xp.getUser("hero-1").stats.gp.wallet).as("walletBefore");
      });
      cy.contains(".quest-log-row", /socktopus/i).find("button.quest-done-btn").click();
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
