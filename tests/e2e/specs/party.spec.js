// Party Tab E2E Test
// Checks:
// 1. Roster has no online status dots
// 2. Activity feed shows a seeded quest completion
// 3. The Raids tab starts a household raid and shows the beast, its health and every hero
// 4. Paid chores strike the raid, and every striker is paid once when the beast falls
// 5. The party switcher stays above the bottom nav, where a thumb reaches it
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/party.spec.js

const HERO_ID = "hero-1";
const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Two plain chores of size 2 for the raid to be struck with: each deals 20
  const socks = world.stores.__achievements[0].value;
  for (const [id, name] of [["quest-bed", "Make the bed"], ["quest-dishes", "Do the dishes"]]) {
    world.stores.__achievements.push({
      key: id,
      value: { ...socks, id, achievementName: name, beastId: "", adventureType: "simple", difficulty: 2 },
    });
  }

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

/**
 * The household's raid on the Socktopus, begun two and a half days ago: 230 of its 270 health is struck and 40 is left.
 * Max struck 60 of it two days ago, so today's chores are his first blows of the day.
 */
const wornDownRaid = () => {
  const now = Date.now();
  const strike = (key, heroId, damage, daysAgo) => ({ key, heroId, damage, at: new Date(now - daysAgo * DAY_MS).toISOString() });
  return {
    id: "raid-seeded",
    partyId: "home",
    beastId: "beast-socktopus",
    window: "quick",
    startedAt: new Date(now - 2.5 * DAY_MS).toISOString(),
    maxHp: 270,
    memberIds: [HERO_ID, "gm-1", "hero-2"],
    strikes: [
      strike("seed-1", "gm-1", 60, 2),
      strike("seed-2", "hero-2", 60, 2),
      strike("seed-3", HERO_ID, 60, 2),
      strike("seed-4", "gm-1", 50, 1),
    ],
  };
};

/** Loads the seeded household (Max, Dad, Luna), signs Max in, saves any raids the spec asks for, then opens My Party. */
const openMyParty = ({ raids } = {}) => {
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
    if (raids) {
      // The seam answers how many raids it kept: a raid that is not shaped right is dropped, which fails here
      cy.window().then((win) => cy.wrap(win.__xp.seedRaids(raids), { timeout: 30000 })).should("eq", raids.length);
    }
  });

  cy.visit(`/my-portal/${HERO_ID}/my-party`, {
    timeout: 120000,
    onBeforeLoad(win) {
      win.localStorage.setItem("xp.battleAlerts", "off");
    },
  });
};

/** Claims one chore as a hero through the real completion service, once the seam is on the page */
const claimChore = (questId) => {
  cy.window({ timeout: 30000 }).should((win) => {
    expect(win.__xp.claimQuest, "claimQuest seam").to.be.a("function");
  });
  cy.window().then((win) => cy.wrap(win.__xp.claimQuest(HERO_ID, questId), { timeout: 30000 })).should("eq", true);
};

describe("Party Tab", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("shows roster with no online dots and displays seeded quest in activity feed", () => {
    openMyParty();

    // 1. Roster tab check: no online status dots
    cy.get("[data-cy=party-roster]", { timeout: 30000 }).should("be.visible");
    cy.get(".status-dot").should("not.exist");
    cy.get("[data-cy=party-member-item]").should("have.length.at.least", 1);

    // 2. Activity feed check: shows seeded quest
    cy.contains("ion-segment-button", "Activity").click({ force: true }); // the segment value is a property, not an attribute
    cy.get("[data-cy=party-activity]", { timeout: 10000 }).should("be.visible");
    cy.contains("Luna finished Tame the Socktopus (+120 XP)").should("be.visible");
  });

  it("starts a household raid and shows the beast, its health and every hero", () => {
    openMyParty();

    cy.contains("ion-segment-button", "Raids", { timeout: 30000 }).click({ force: true });
    cy.get("[data-cy=party-start-raid]", { timeout: 30000 }).click();
    cy.get("[data-cy=raid-start]").should("be.visible");
    cy.get("[data-cy^=raid-beast-]").first().click();
    cy.get("[data-cy=raid-window-quick]").click();
    cy.get("[data-cy=raid-begin]").click();

    // Three heroes, three days, thirty a day: 270 health
    cy.get("[data-cy=raid-card]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=raid-hp]").should("contain", "270 / 270");
    cy.get("[data-cy=raid-status]").should("contain", "left");
    cy.get("[data-cy=raid-ledger-row]").should("have.length", 3);
  });

  it("strikes the raid with paid chores, and pays each striker once when the beast falls", () => {
    openMyParty({ raids: [wornDownRaid()] });

    cy.contains("ion-segment-button", "Raids", { timeout: 30000 }).click({ force: true });
    cy.get("[data-cy=raid-hp]", { timeout: 30000 }).should("contain", "40 / 270");

    // A chore of size 2 deals 20 (Max alone has struck today, so no synergy), and nobody may claim from a live beast
    claimChore("quest-bed");
    cy.get("[data-cy=raid-hp]", { timeout: 10000 }).should("contain", "20 / 270");
    cy.get("[data-cy^=raid-claim-]").should("not.exist");

    // The second chore fells it: the beast is down and every striker may claim
    claimChore("quest-dishes");
    cy.get("[data-cy=raid-status]", { timeout: 10000 }).should("contain", "Defeated");
    cy.get("[data-cy^=raid-claim-]").should("have.length", 3);

    // Claiming pays Max once: the button turns into the line of what was paid, and the hero's AP moved
    cy.window().then((win) => win.__xp.getUser(HERO_ID).stats.ap.total).as("apBefore");
    cy.get(`[data-cy=raid-claim-${HERO_ID}]`).click();
    cy.get(`[data-cy=raid-claimed-${HERO_ID}]`).should("contain", "XP");
    cy.get(`[data-cy=raid-claim-${HERO_ID}]`).should("not.exist");
    cy.get("@apBefore").then((before) => {
      cy.window().then((win) => {
        expect(win.__xp.getUser(HERO_ID).stats.ap.total, "the raid loot paid its AP").to.be.greaterThan(before);
      });
    });

    // A reload does not offer Max's loot again, and the other two strikers still have theirs waiting
    cy.reload();
    cy.contains("ion-segment-button", "Raids", { timeout: 60000 }).click({ force: true });
    cy.get(`[data-cy=raid-claimed-${HERO_ID}]`, { timeout: 30000 }).should("exist");
    cy.get(`[data-cy=raid-claim-${HERO_ID}]`).should("not.exist");
    cy.get("[data-cy^=raid-claim-]").should("have.length", 2);
  });

  it("keeps the party switcher above the bottom nav, where a thumb reaches it", () => {
    openMyParty();

    cy.get("[data-cy=party-chip-home]", { timeout: 30000 }).should("be.visible");
    cy.get("[data-cy=party-chip-new]").should("be.visible");
    cy.get("[data-cy=party-chip-home]").then(($chip) => {
      cy.get(".xp-bottom-nav").then(($nav) => {
        const chipBottom = $chip[0].getBoundingClientRect().bottom;
        const navTop = $nav[0].getBoundingClientRect().top;
        expect(chipBottom, "the switcher ends above the nav").to.be.at.most(navTop);
      });
    });
  });
});
