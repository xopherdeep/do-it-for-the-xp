// Project Towers, a whole project from the Game Master's first tap to the trophy on the plaza. Dad (Game Master) starts
// Spring Cleaning in the wizard with two rooms and the suggested chores; Max (a hero) stands in the tower's header with
// the x2 offer, walks to the stairs and finds them shut, does every 1F chore (through the window.__xp seam, which claims
// them the way the quest book does), is told "Floor cleared!" and climbs to 2F; the rest of the tower is fast-forwarded
// the same way, and the roof's victory plays the credits and shows the trophy in Hometown.
// Keeps a screenshot of every step at 390x844 in tests/e2e/screenshots/project-tower.spec.js (not committed).
// Run (this worktree's own dev server on :8123; the shared :8100 serves another checkout's files, and a server that
// reloads mid-run breaks the walk):
//   pnpm vue-cli-service serve --port 8123
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8123 --spec tests/e2e/specs/project-tower.spec.js

const GM = "gm-1";
const HERO = "hero-1";
const TOWER = "gen-project-spring-cleaning";
/** The temple page that is shown (an earlier page may linger under it) */
const PAGE = ".temple-grounds-engine:not(.ion-page-hidden)";
/** The four move buttons, by where ion-fab puts them (the map's own fab sits bottom-left, the room's in the middle) */
const ARROW = {
  north: `${PAGE} ion-fab.fab-vertical-top.fab-horizontal-center ion-fab-button`,
  south: `${PAGE} ion-fab.fab-vertical-bottom.fab-horizontal-center ion-fab-button`,
  east: `${PAGE} ion-fab.fab-vertical-center.fab-horizontal-end ion-fab-button`,
  west: `${PAGE} ion-fab.fab-vertical-center.fab-horizontal-start ion-fab-button`,
};
/** What one step in each direction does to [row, col] */
const STEP = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

// Cypress clears localStorage between tests; the hero has already answered the one-time ambush-alert ask
const quietAlerts = (win) => win.localStorage.setItem("xp.battleAlerts", "off");

const routerOf = (win) => win.document.querySelector("#app").__vue_app__.config.globalProperties.$router;
/** Goes to a page without reloading the app, so the hero's run in the tower stays where it is */
const go = (path) => cy.window().then((win) => routerOf(win).push(path));

// Animations stay on: the credits roll and the prompts are CSS animations, which a still would otherwise jump to their end
const shot = (name) => {
  cy.wait(600);
  cy.screenshot(name, { capture: "viewport", overwrite: true, disableTimersAndAnimations: false });
};

/** Opens the app so the seam exists, then signs the person in; a later visit keeps them signed in */
const signIn = (userId) => {
  cy.visit("/", { timeout: 300000, onBeforeLoad: quietAlerts });
  cy.window({ timeout: 60000 }).should((win) => {
    expect(win.__xp, "development seam window.__xp").to.be.an("object");
  });
  cy.window().then((win) => {
    expect(win.__xp.loginUser(userId), `${userId} is signed in`).to.eq(true);
  });
};

/** The running project, as the record holds it */
const project = () => cy.window().then((win) => cy.wrap(win.__xp.getProject(), { timeout: 30000 }));

/** Every chore of the floor, done by the hero (what a long day of battles would do) */
const claimFloor = (floorKey) => cy.window().then((win) => cy.wrap(win.__xp.claimFloor(HERO, floorKey), { timeout: 120000 }));

/** A room of the floor is somewhere to stand unless it is a wall or a void; the record's rooms table says which */
const isOpen = (record, floor, [row, col]) => {
  const { maze, rooms } = record.dungeonLayout;
  const token = maze[floor][row] && maze[floor][row][col];
  const room = token && rooms[token];
  return Boolean(room) && !["wall", "void"].includes(room.type);
};

/** The moves of the shortest walk from one room of the floor to another, as directions */
const pathOf = (record, floor, from, to) => {
  const seen = new Set([from.join(",")]);
  const queue = [{ at: from, moves: [] }];
  while (queue.length) {
    const { at, moves } = queue.shift();
    if (at.join(",") === to.join(",")) return moves;
    Object.entries(STEP).forEach(([direction, [dRow, dCol]]) => {
      const next = [at[0] + dRow, at[1] + dCol];
      if (seen.has(next.join(",")) || !isOpen(record, floor, next)) return;
      seen.add(next.join(","));
      queue.push({ at: next, moves: [...moves, direction] });
    });
  }
  throw new Error(`no way from ${from} to ${to} on ${floor}`);
};

/** Where the stairs up of 1F are, read off the tower's record: [row, col] */
const stairsOf = (record) => {
  const { maze, rooms } = record.dungeonLayout;
  const isStairs = (token) => rooms[token] && rooms[token].type === "stairs-up";
  const row = maze["1F"].findIndex((cells) => cells.some(isStairs));
  expect(row, "1F has stairs up").to.be.at.least(0);
  return [row, maze["1F"][row].findIndex(isStairs)];
};

/** Where the hero stands, as the engine holds the run (the development seam window.__xpTemples.state); retries until it is */
const expectAt = (level, [row, col]) => {
  cy.window({ timeout: 30000 }).should((win) => {
    const run = win.__xpTemples.state(TOWER);
    expect(run, "a run in the tower").to.be.an("object");
    expect(`${run.currentLevel} (${run.currentPosition.join(",")})`, "where the hero stands").to.eq(`${level} (${row},${col})`);
  });
};

/** A boss or guardian's banner covers the room for a moment: tap it away when it is up */
const dismissBannerIfUp = () => {
  cy.get("body").then(($body) => {
    const banner = $body.find("[data-cy=boss-banner]")[0];
    if (banner) banner.click();
  });
};

/** One step with the arrow control; the hero lands in the next room */
const walk = (level, from, moves) => {
  let at = from;
  moves.forEach((direction) => {
    cy.get(ARROW[direction], { timeout: 30000 }).click({ force: true });
    at = [at[0] + STEP[direction][0], at[1] + STEP[direction][1]];
    expectAt(level, at);
    cy.wait(700);
    dismissBannerIfUp();
  });
};

/** The room's sheet (the beast, or the room itself): the hero taps the fab in the middle */
const openSheet = () => {
  cy.wait(1500);
  dismissBannerIfUp();
  cy.get(`${PAGE} .xp-monster-model-wrapper, ${PAGE} #room-action ion-fab-button`, { timeout: 60000 }).first().click({ force: true });
  cy.get(`${PAGE} [data-cy=choice-reveal]`, { timeout: 20000 }).should("be.visible");
  cy.wait(800);
};

/** Reads the reveal prompt a line at a time (a tap finishes a line that is typing, the next turns the page) until `text` shows */
const readPromptTo = (text) => {
  for (let tap = 0; tap < 5; tap += 1) {
    cy.get("[data-cy=reveal-text]", { timeout: 30000 }).then(($line) => {
      if (!$line.text().includes(text)) $line[0].click();
    });
    cy.wait(900);
  }
  cy.get("[data-cy=reveal-text]").should("contain", text);
};

/** Skips to the last line of the reveal prompt, where its choices open */
const skipToLastLine = () => {
  cy.get("body").then(($body) => {
    const skip = $body.find("[data-cy=reveal-skip]")[0];
    if (skip) skip.click();
  });
};

/** Taps the reveal prompt's Onward, when there is one up */
const onwardIfAsked = () => {
  cy.wait(2000);
  cy.get("body").then(($body) => {
    const onward = $body.find("[data-cy=reveal-choice-onward]")[0];
    if (onward) onward.click();
  });
};

describe("a Project Tower, from the wizard to the trophy", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("the Game Master starts Spring Cleaning with two rooms and the suggested chores", () => {
    cy.seedWorld("family/family-backup.json", GM);
    cy.visit("/xp-settings/packs", { timeout: 300000 });
    cy.tapToWakeAudio();
    cy.get("[data-cy=packs-project]", { timeout: 60000 }).scrollToCenter().click();

    // 1. The project
    cy.get("[data-test=type-spring-cleaning]", { timeout: 30000 }).click();
    shot("01-project-step");
    cy.get("[data-test=next]").click();

    // 2. The house: a kitchen and one bedroom, nothing else
    ["bedroom", "bedroom", "bathroom", "bathroom"].forEach((room) => cy.get(`[data-test=room-less-${room}]`).click());
    ["living", "dining", "laundry", "storage", "garage", "yard"].forEach((room) => cy.get(`[data-test=room-toggle-${room}]`).click());
    cy.get("[data-test=room-count-bedroom]").should("have.text", "1");
    cy.get("[data-test=room-toggle-kitchen]").should("have.class", "is-on");
    shot("02-house-step");
    cy.get("[data-test=next]").click();

    // 3. The chores: the suggested list, floor by floor, with the roof's finale
    cy.get("[data-test=phase-declutter] [data-test=chore-row]").should("have.length.at.least", 1);
    cy.get("[data-test=phase-roof] [data-test=chore-row]").should("have.length", 1);
    shot("03-chores-step");
    cy.get("[data-test=next]").click();

    // 4. The dates and the family reward, then Build
    cy.get("[data-test=reward]").type("Pizza night");
    cy.get("[data-test=next]").click();
    shot("04-build-step");
    cy.get("[data-test=submit]").click();
    cy.get("[data-test=submit]", { timeout: 30000 }).should("not.exist");

    project().then((record) => {
      expect(record.typeId).to.eq("spring-cleaning");
      expect(record.status).to.eq("active");
      expect(record.templeId).to.eq(TOWER);
      expect(record.reward.text).to.eq("Pizza night");
      const rooms = Object.entries(record.house.rooms).filter(([, count]) => count > 0);
      expect(rooms, "two rooms").to.have.length(2);
      expect(record.chores.length, "the suggested chores").to.be.greaterThan(4);
    });
  });

  it("the hero sees the x2 offer, finds the stairs shut, clears 1F, is told so and climbs to 2F", () => {
    signIn(HERO);
    cy.visit(`/temple/${TOWER}/${HERO}`, { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();

    // The header clock names the floor, and clearing it today earns double
    cy.get("[data-cy=temple-floor-clock-line]", { timeout: 60000 }).should("contain", "Declutter");
    cy.get("[data-cy=temple-floor-offer]", { timeout: 30000 }).should("be.visible").and("contain", "×2");
    shot("05-floor-clock-and-offer");

    cy.window().then((win) => cy.wrap(win.__xp.getTemple(TOWER), { timeout: 30000 })).then((record) => {
      // The hero walks from the front door to the stairs
      const [, row, col] = record.dungeonLayout.entrance;
      const door = [row, col];
      const stairs = stairsOf(record);
      expectAt("1F", door);
      walk("1F", door, pathOf(record, "1F", door, stairs));
      shot("06-at-the-stairs");

      // The stairs wait for the floor: the hero is told what bars the way and is offered no Climb
      openSheet();
      cy.get(`${PAGE} [data-cy=choice-subtitle]`).should("contain", "Clear every chore on this floor to climb");
      cy.get(`${PAGE} [data-cy=choice-reveal]`).should("not.contain", "Climb");
      shot("07-stairs-shut");
      cy.get(`${PAGE} [data-cy=choice-reveal]`).type("{esc}");
      cy.get(`${PAGE} [data-cy=choice-reveal]`, { timeout: 20000 }).should("not.exist");

      // Every chore of 1F is done; the hero is told on coming back to the tower, standing where they were
      claimFloor("1F").should("be.greaterThan", 0);
      go(`/my-portal/${HERO}/home-town`);
      cy.wait(1500);
      go(`/temple/${TOWER}/${HERO}`);
      cy.get("[data-cy=reveal-prompt]", { timeout: 60000 }).should("contain", "Floor cleared!");
      readPromptTo("×2");
      shot("08-floor-cleared");
      cy.get("[data-cy=reveal-choice-onward]", { timeout: 20000 }).should("not.be.disabled").click();
      expectAt("1F", stairs);

      // The stairs are open now: Climb takes the hero to 2F, where the next phase is on the clock
      openSheet();
      cy.contains(`${PAGE} [data-cy=choice-reveal] [data-cy^=choice-]`, "Climb", { timeout: 20000 }).click();
      cy.window({ timeout: 30000 }).should((win) => {
        expect(win.__xpTemples.state(TOWER).currentLevel, "the hero stands on").to.eq("2F");
      });
      onwardIfAsked();
      cy.get("[data-cy=temple-floor-clock-line]", { timeout: 30000 }).should("contain", "Deep Clean");
      shot("09-on-2F");
    });

    project().then((record) => {
      const first = record.floors.find((floor) => floor.floorKey === "1F");
      expect(first.clearedAt, "1F is settled").to.be.a("string");
      expect(first.multiplier, "the early bonus").to.eq(2);
      const second = record.floors.find((floor) => floor.floorKey === "2F");
      expect(second.wokenAt, "2F is awake").to.be.a("string");
    });
  });

  it("the rest is fast-forwarded; the roof's victory plays the credits and the trophy stands in Hometown", () => {
    signIn(HERO);

    // Floor after floor, up to the roof (each settled floor wakes the next)
    project().then((record) => {
      record.floors
        .map((floor) => floor.floorKey)
        .filter((key) => key !== "1F")
        .forEach((key) => claimFloor(key).should("be.greaterThan", 0));
    });
    cy.window().then((win) => cy.wrap(win.__xp.getProject(), { timeout: 30000 })).should("equal", null);
    cy.window().then((win) => cy.wrap(win.__xp.getTrophy(), { timeout: 30000 })).then((trophy) => {
      expect(trophy.status).to.eq("cleared");
      expect(trophy.reward.text).to.eq("Pizza night");
    });

    // Back on the plaza the hero is told what the family earned, then the credits roll
    cy.visit(`/my-portal/${HERO}/home-town`, { timeout: 300000, onBeforeLoad: quietAlerts });
    cy.tapToWakeAudio();
    cy.get("[data-cy=reveal-prompt]", { timeout: 90000 }).should("contain", "Family reward unlocked!");
    readPromptTo("Pizza night");
    shot("10-family-reward");
    skipToLastLine();
    cy.get("[data-cy=reveal-choice-onward]", { timeout: 30000 }).should("not.be.disabled").click();

    cy.get("[data-test=credits]", { timeout: 60000 }).should("be.visible");
    shot("11-credits-heroes");
    // The makers roll by in their time: the names only, with their roles
    cy.contains("[data-test=credits-maker]", "Xopher Pollard aka XP", { timeout: 120000 }).should("be.visible");
    cy.get("[data-test=credits]").invoke("text").should("not.match", /\b(age|aged|born|years? old)\b|\b\d{1,2} years\b/i);
    shot("12-credits-makers");
    cy.get("[data-test=credits-skip]").click();
    cy.get("[data-test=credits]", { timeout: 20000 }).should("not.exist");

    // The cleared tower stays on the plaza as the trophy; a tap opens it
    cy.get(".xp-building-model-wrapper[title='Enter The Spring Spire']", { timeout: 60000 }).should("be.visible");
    cy.wait(1200);
    shot("13-hometown-trophy");
    cy.get(".xp-building-model-wrapper[title='Enter The Spring Spire']").click();
    cy.get("[data-test=trophy]", { timeout: 20000 }).should("be.visible").and("contain", "The Spring Spire").and("contain", "Pizza night");
    cy.get("[data-test=trophy-floor]").should("have.length.at.least", 4);
    shot("14-trophy-sheet");
  });
});
