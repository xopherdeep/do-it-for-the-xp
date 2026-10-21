// Party Tab E2E Test
// Checks:
// 1. Roster has no online status dots
// 2. Activity feed shows a seeded quest completion

const HERO_ID = "hero-1";

const withSeededQuestLog = (backup) => {
  const world = JSON.parse(JSON.stringify(backup));
  const max = world.stores.__profiles[0].value;
  const gm = {
    ...max,
    id: "gm-1",
    name: { full: "Dad Power", nick: "Dad" },
    isAdult: true,
  };
  const luna = {
    ...max,
    id: "hero-2",
    name: { full: "Luna Power", nick: "Luna" },
    isAdult: false,
  };
  world.stores.__profiles.push(
    { key: "gm-1", value: gm },
    { key: "hero-2", value: luna }
  );

  world.stores.__questLog = [
    {
      key: "log-seed-1",
      value: {
        id: "log-seed-1",
        questId: "quest-socks",
        questName: "Tame the Socktopus",
        userId: "hero-2",
        completedAt: "2026-10-13T10:00:00.000Z",
        dayKey: "2026-10-13",
        status: "approved",
        source: "battle",
        rewards: { xp: 120, gp: 30, ap: 2 },
        rewardsApplied: true,
      },
    },
  ];
  return world;
};

describe("Party Tab", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("shows roster with no online dots and displays seeded quest in activity feed", () => {
    cy.fixture("battle-backup.json").then((fixture) => {
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
      cy.window().then((win) => cy.wrap(win.__xp.restoreBackup(Cypress.withGuideSeen(withSeededQuestLog(fixture))), { timeout: 60000 }));
      cy.window().then((win) => {
        expect(win.__xp.loginUser(HERO_ID), `${HERO_ID} is loaded`).to.eq(true);
      });
    });

    cy.visit(`/my-portal/${HERO_ID}/my-party`, {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.setItem("xp.battleAlerts", "off");
      },
    });

    // 1. Roster tab check: no online status dots
    cy.get("[data-cy=party-roster]", { timeout: 30000 }).should("be.visible");
    cy.get(".status-dot").should("not.exist");
    cy.get("[data-cy=party-member-item]").should("have.length.at.least", 1);

    // 2. Activity feed check: shows seeded quest
    cy.contains("ion-segment-button", "Activity").click({ force: true }); // the segment value is a property, not an attribute
    cy.get("[data-cy=party-activity]", { timeout: 10000 }).should("be.visible");
    cy.contains("Luna finished Tame the Socktopus (+120 XP)").should("be.visible");
  });
});
