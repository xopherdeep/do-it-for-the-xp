// Family Sync e2e (multiplayer part 3): a kid phone that plays the whole game.
// Four scenes at 390x844: the first pull opens the portal, the busy question and its two answers, the took-over line, and the
// board with its Pro line when the family has no Pro. The live site is never touched: every call to it is answered here
// (fixtures in tests/e2e/fixtures/family/), and a write nobody stubbed is turned away with a 599.
//
// The phone is linked the way a real one is: /link?code=... trades the code for a hero key (claim-device.json), the Pro store
// claims the family's licence (as pro.spec), and the sync store reads the family's records (records-page.json) from
// since=0 and again from the newest number, which is an empty page.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "X-WP-TotalPages,X-WP-Total",
};
const LIVE_SITE = "https://doit.forthexp.com";
const FAMILY = "**/wp-json/xp-family/v1";
const PRO = "**/compass/v1/gatekeeper/xp-pro";

const hash = Cypress.env("hashRouting");
const LINK_PATH = hash ? "/#/link?code=ABCDEFGH" : "/link?code=ABCDEFGH";
const HERO_PHONE_PATH = /\/hero-phone\/?$/;
const PORTAL_PATH = /\/my-portal\/hero-1\/my-home$/;
const HERO_KEY = "hero-key-e2e-123";
/** The family in claim-device.json: the licence is the family's, so the site knows it only by this id */
const FAMILY_ID = "e2e-family-1";

const LICENSE = {
  pro: true,
  license_key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expires_at: "2099-01-01T00:00:00Z",
  env: "production",
  family_id: FAMILY_ID,
};

/** The newest record number in records-page.json: a read from here on is an empty page */
const NEWEST_SEQ = 4;
/** The tablet's copy of the hero that the catch-up after a takeover lands */
const TABLET_FOOD = "tacos";

const isIgnoredAudioError = (error) => {
  const isAudioNoise = /play\(\)|AbortError|NotAllowedError/.test(error.message);
  return !isAudioNoise;
};

/** Whether this test's device was emptied: the first page load of a test does it, later loads (a reload) keep what the phone holds */
let isDeviceEmpty = false;

/**
 * A test starts from an empty device: IndexedDB outlives a test, and a stale link, licence or sync state would let one scene
 * lean on another. The window is brand new here, so nothing holds a database open.
 */
const forgetDatabases = (win) => {
  if (isDeviceEmpty) return;
  isDeviceEmpty = true;
  try {
    win.indexedDB.databases().then((known) => known.forEach((db) => win.indexedDB.deleteDatabase(db.name)));
  } catch {
    // chemx-allow: best-effort no IndexedDB in this window, so the device holds nothing to forget
  }
};

/** A call's `since` query, as a number */
const sinceOf = (req) => Number(new URL(req.url).searchParams.get("since") || 0);

/** Anything that reaches the live site and was not stubbed: reads are refused with a 404, writes with a 599 */
function stubCatchAll() {
  cy.intercept({ method: "GET", url: `${LIVE_SITE}/**` }, { statusCode: 404, body: { code: "e2e_unstubbed_read" }, headers: CORS }).as("unstubbedRead");
  cy.intercept({ method: /^(POST|PUT|PATCH|DELETE)$/, url: `${LIVE_SITE}/**` }, { statusCode: 599, body: { code: "e2e_unstubbed_write" }, headers: CORS }).as("unstubbedWrite");
}

/** The browser's preflight: the hero key header and PUT (the records route) have to be allowed */
function stubPreflight() {
  cy.intercept("OPTIONS", `${LIVE_SITE}/**`, {
    statusCode: 204,
    headers: {
      ...CORS,
      "access-control-allow-headers": "authorization,content-type,accept,x-wp-nonce,x-xp-hero-key",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
  });
}

/** The routes a linked phone calls whatever the scene: the claim, the card, the two-phone event feed, the licence */
function stubPhone({ pro }) {
  cy.intercept("POST", `${FAMILY}/devices/claim`, { statusCode: 200, fixture: "family/claim-device.json", headers: CORS }).as("claimDevice");
  cy.intercept("GET", `${FAMILY}/family`, { statusCode: 200, fixture: "family/get-family.json", headers: CORS }).as("getFamily");
  cy.intercept("POST", `${FAMILY}/events`, { statusCode: 200, body: { accepted: [], duplicate: [], rejected: [] }, headers: CORS }).as("sendEvents");
  // As the real Gatekeeper: a licence answers only for the family that bought it (a fresh install claims under its own random id
  // first, and again as the linked family's once the phone joins it); an unknown family or key gets the 404 that means "no licence"
  const licensed = { statusCode: 200, body: LICENSE, headers: CORS };
  const unlicensed = { statusCode: 404, body: { pro: false }, headers: CORS };
  cy.intercept("POST", `${PRO}/claim*`, (req) => req.reply(pro && req.body.family_id === FAMILY_ID ? licensed : unlicensed)).as("claimPro");
  cy.intercept("POST", `${PRO}/validate*`, (req) => req.reply(pro && req.body.license_key === LICENSE.license_key ? licensed : unlicensed)).as("validatePro");
}

/** The family device's feed: nothing, or one hero sheet (the board of a phone that is not the full game) */
function stubEvents({ sheet }) {
  const sheetEvent = {
    seq: 1,
    id: "ev-sheet-1",
    hero_id: "hero-1",
    device_id: "dev-family-tablet",
    kind: "hero.sheet",
    scope: "family",
    at: "2026-10-22T08:00:00Z",
    received_at: "2026-10-22T08:00:01Z",
    data: {
      stats: { level: 3, xp: 300, nextLevelXp: 900, gp: 40, ap: 4, hp: 20, maxHp: 42, mp: 300, maxMp: 300 },
      quests: [{ questId: "quest-socks", name: "Tame the Socktopus", difficulty: 2, xp: 120, gp: 30, ap: 2, needsApproval: false, photo: false, overdue: false }],
    },
  };
  cy.intercept("GET", `${FAMILY}/events*`, (req) => {
    const isFirstRead = sinceOf(req) < 1;
    req.reply({ statusCode: 200, body: sheet && isFirstRead ? [sheetEvent] : [], headers: CORS });
  }).as("pullEvents");
}

/**
 * The family's records: the fixture's page from the start, then whatever `served.after` holds (the numbers above the
 * fixture's), then an empty page. `delay` holds the first page back so the clerk's progress line has time to be seen.
 */
function stubRecords(served = { after: [] }, delay = 0) {
  cy.fixture("family/records-page.json").then((page) => {
    cy.intercept("GET", `${FAMILY}/records*`, (req) => {
      const since = sinceOf(req);
      const records = page.concat(served.after).filter((record) => record.seq > since);
      req.reply({ statusCode: 200, body: records, headers: CORS, delay: since === 0 ? delay : 0 });
    }).as("records");
  });
}

/** PUT /records keeps every record it is sent, numbered from the fixture's newest */
function stubPutAccepting() {
  cy.intercept("PUT", `${FAMILY}/records`, (req) => {
    const accepted = req.body.records.map((record, index) => ({ store: record.store, key: record.key, seq: 100 + index }));
    req.reply({ statusCode: 200, body: { accepted, refused: [] }, headers: CORS });
  }).as("putRecords");
}

/** The site's turn answers: `busy` unless the call is forced; the busy body names the tablet, seen five minutes ago */
function stubPlay(answerFor) {
  cy.fixture("family/play-granted.json").then((granted) => {
    cy.fixture("family/play-busy.json").then((busy) => {
      const seenAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const busyNow = { ...busy, device: { ...busy.device, last_seen_at: seenAt } };
      cy.intercept("POST", `${FAMILY}/heroes/hero-1/play`, (req) => {
        const isGranted = answerFor(req.body) === "granted";
        req.reply({ statusCode: 200, body: isGranted ? granted : busyNow, headers: CORS });
      }).as("play");
    });
  });
  cy.intercept("POST", `${FAMILY}/heroes/hero-1/rest`, { statusCode: 200, body: {}, headers: CORS }).as("rest");
}

/**
 * Links a fresh phone with the code in the address, in one session: the link claims the licence under the family the
 * phone joined at once, so the sync turns on, and the first pull, the hero's turn and the portal follow by themselves
 * (no second open needed; the Pro store adopts the family the phone joined).
 */
function openLinkedPhone() {
  cy.visit(LINK_PATH, {
    timeout: 120000,
    onBeforeLoad: (win) => win.localStorage.setItem("xp:multiplayer", "on"),
  });
  cy.tapToWakeAudio();
  cy.wait("@claimDevice");
}

/** The clerk's line on screen */
const clerkSays = (text, options = { timeout: 30000 }) => cy.contains("[data-cy=reveal-text]", text, options).should("be.visible");
/** The tablet rises and the line types out before a screenshot is worth taking (and the screenshot lets that animation run) */
const clerkSettles = () => cy.wait(2500);
/** A choice of the clerk's question, by its label */
const choose = (label) => cy.contains("[data-cy=reveal-choices] button", label, { timeout: 20000 }).click();

describe("Family Sync: a kid phone plays the whole game", () => {
  before(() => {
    Cypress.on("uncaught:exception", isIgnoredAudioError);
    Cypress.on("window:before:load", forgetDatabases);
  });
  after(() => {
    Cypress.off("uncaught:exception", isIgnoredAudioError);
    Cypress.off("window:before:load", forgetDatabases);
  });

  beforeEach(() => {
    isDeviceEmpty = false;
    stubCatchAll();
    stubPreflight();
  });

  // Nothing the spec did not stub may be written to the site; what it read is listed in the failure
  afterEach(() => {
    cy.get("@unstubbedWrite.all").then((calls) => expect(calls.map((call) => `${call.request.method} ${call.request.url}`), "writes nobody stubbed").to.deep.eq([]));
    cy.get("@unstubbedRead.all").then((calls) => expect(calls.map((call) => call.request.url), "reads nobody stubbed").to.deep.eq([]));
  });

  it("a kid phone with Pro pulls the world and opens the portal", () => {
    stubPhone({ pro: true });
    stubEvents({ sheet: false });
    stubRecords({ after: [] }, 2500);
    stubPutAccepting();
    stubPlay(() => "granted");
    openLinkedPhone();

    // The first pull: the clerk's progress line while the family's records come down
    cy.url().should("match", HERO_PHONE_PATH);
    clerkSays("Fetching your family's world");
    clerkSettles();
    cy.screenshot("family-sync-01-first-pull", { capture: "viewport", disableTimersAndAnimations: false });

    // From the start, then once more from the newest number: an empty page ends the pull
    cy.wait("@records").then(({ request }) => {
      expect(sinceOf(request), "the first read starts at the beginning").to.eq(0);
      expect(request.headers["x-xp-hero-key"], "a phone reads with its hero key").to.eq(HERO_KEY);
    });
    cy.wait("@records").then(({ request }) => {
      expect(sinceOf(request), "the second read starts after the newest record").to.eq(NEWEST_SEQ);
    });

    // The hero's turn is asked for, granted, and the portal opens on My Home
    cy.wait("@play").then(({ request }) => {
      expect(request.body.force, "the first ask is not a takeover").to.eq(false);
      expect(request.body.device_id, "the ask names this device").to.be.a("string").and.have.length.greaterThan(0);
      expect(request.headers["x-xp-hero-key"]).to.eq(HERO_KEY);
    });
    cy.location("pathname", { timeout: 30000 }).should("match", PORTAL_PATH);
    cy.get(".xp-bottom-nav", { timeout: 30000 }).should("exist");
    cy.get(".xp-main-hud", { timeout: 30000 }).should("exist");
    cy.window().then((win) => {
      const hero = win.__xp.getUser("hero-1");
      expect(hero, "the hero came down with the pull").to.be.an("object");
      expect(hero.name.nick).to.eq("Max");
    });
    cy.get("@rest.all").should("have.length", 0);
    // The licence was claimed under the family the phone joined, which is the one that bought it
    cy.get("@claimPro.all").then((calls) => {
      const families = calls.map((call) => call.request.body.family_id);
      expect(families, "the Pro store claimed for the linked family").to.include(FAMILY_ID);
    });
    cy.screenshot("family-sync-02-portal", { capture: "viewport" });
  });

  it("the busy line offers Play here and Not now", () => {
    stubPhone({ pro: true });
    stubEvents({ sheet: false });
    stubRecords();
    stubPutAccepting();
    // The tablet holds the hero until a call forces the turn
    stubPlay((body) => (body.force === true ? "granted" : "busy"));
    openLinkedPhone();

    // The first ask finds the tablet playing: the clerk asks, with the two answers
    clerkSays("Max is still playing on the family tablet");
    clerkSays("5 min ago");
    clerkSays("Play here anyway?");
    cy.contains("[data-cy=reveal-choices] button", "Play here").should("be.visible");
    cy.contains("[data-cy=reveal-choices] button", "Not now").should("be.visible");
    clerkSettles();
    cy.screenshot("family-sync-03-busy", { capture: "viewport", disableTimersAndAnimations: false });

    // Not now: the hero stays with the tablet, the phone stays on the hero's card, and Play is the way back in
    choose("Not now");
    cy.get("[data-cy=reveal-prompt]").should("not.exist");
    cy.url().should("match", HERO_PHONE_PATH);
    cy.get("[data-cy=hero-card]").should("be.visible");
    cy.get("[data-cy=play-button]").should("be.visible").and("not.be.disabled");
    cy.location("pathname").should("not.match", PORTAL_PATH);

    // Play asks again and is told the same; Play here forces the turn and the portal opens
    cy.get("[data-cy=play-button]").click();
    clerkSays("Max is still playing on the family tablet");
    choose("Play here");
    cy.location("pathname", { timeout: 30000 }).should("match", PORTAL_PATH);

    // The three asks, in order: the first pull's, Play's, and the forced one
    cy.get("@play.all").then((calls) => {
      const forces = calls.map((call) => call.request.body.force);
      expect(forces, "only Play here forces the turn").to.deep.eq([false, false, true]);
    });
  });

  it("the took-over line shows once after a refused record", () => {
    const served = { after: [] };
    let isTabletPlaying = false;
    stubPhone({ pro: true });
    stubEvents({ sheet: false });
    stubRecords(served);
    // The phone holds the hero until the tablet takes it over; then the site answers busy, naming the tablet
    stubPlay(() => (isTabletPlaying ? "busy" : "granted"));
    let refusals = 0;
    cy.intercept("PUT", `${FAMILY}/records`, (req) => {
      const isHeroRecord = req.body.records.some((record) => record.hero_id === "hero-1");
      refusals += isTabletPlaying && isHeroRecord ? 1 : 0;
      const refused = req.body.records.map((record) => ({ store: record.store, key: record.key, code: "xp_family_turn", message: "Another device is playing this hero." }));
      const accepted = req.body.records.map((record, index) => ({ store: record.store, key: record.key, seq: 100 + index }));
      req.reply({ statusCode: 200, body: isTabletPlaying ? { accepted: [], refused } : { accepted, refused: [] }, headers: CORS });
    }).as("putRecords");
    openLinkedPhone();

    // Granted: the portal opens and the hero plays here
    cy.location("pathname", { timeout: 60000 }).should("match", PORTAL_PATH);
    cy.get(".xp-main-hud", { timeout: 30000 }).should("exist");
    cy.get("[data-cy=reveal-prompt]").should("not.exist");

    // Meanwhile the tablet takes the hero over and writes its copy; this phone does not know yet
    cy.fixture("family/records-page.json").then((page) => {
      const profile = page.find((record) => record.store === "__profiles");
      const tabletCopy = { ...JSON.parse(profile.body), favoriteFood: TABLET_FOOD };
      served.after.push({
        ...profile,
        seq: NEWEST_SEQ + 1,
        body: JSON.stringify(tabletCopy),
        device_id: "dev-family-tablet",
        saved_at: "2026-10-22T08:05:00Z",
      });
    });
    cy.then(() => {
      isTabletPlaying = true;
    });

    // The hero changes here (a potion into the bag): the record goes up in about five seconds, and the site refuses it
    cy.window().then((win) => {
      const pinia = win.document.querySelector("#app").__vue_app__.config.globalProperties.$pinia;
      const added = pinia._s.get("user").addInventoryItem("hero-1", { name: "Health Potion", kind: "consumable", qty: 1 });
      expect(added, "the potion fits in the bag").to.eq(true);
    });
    cy.wait("@putRecords", { timeout: 30000 });

    // The phone reads on to the newest record, and the clerk says so, naming the tablet
    clerkSays("The family tablet took over Max's game while this one was away", { timeout: 60000 });
    clerkSays("This device has caught up.");
    clerkSettles();
    cy.screenshot("family-sync-04-took-over", { capture: "viewport", disableTimersAndAnimations: false });
    cy.window().then((win) => {
      expect(win.__xp.getUser("hero-1").favoriteFood, "the tablet's copy of the hero landed").to.eq(TABLET_FOOD);
    });
    cy.then(() => expect(refusals, "the site refused the hero's record").to.be.at.least(1));

    // OK: the tablet still has the hero, so the clerk asks whether to play here; Not now leaves it there, and the phone goes
    // back to the hero's card (the hero is signed out here), with Play to ask again
    choose("OK");
    clerkSays("Max is still playing on the family tablet");
    choose("Not now");
    cy.get("[data-cy=reveal-prompt]").should("not.exist");
    cy.location("pathname", { timeout: 20000 }).should("match", HERO_PHONE_PATH);
    cy.get("[data-cy=hero-card]").should("be.visible");
    cy.get("[data-cy=play-button]").should("be.visible");

    // Once: the line does not come back, however the phone goes on syncing
    cy.wait(6000);
    cy.contains("took over Max's game").should("not.exist");
    cy.get("[data-cy=reveal-prompt]").should("not.exist");
  });

  it("without Pro the board shows the Pro line", () => {
    stubPhone({ pro: false });
    stubEvents({ sheet: true });
    // The site would turn a family without Pro away from every sync route; the phone must not even ask
    const refusal = { statusCode: 403, fixture: "family/pro-required.json", headers: CORS };
    cy.intercept("GET", `${FAMILY}/records*`, refusal).as("recordsRefused");
    cy.intercept("PUT", `${FAMILY}/records`, refusal).as("putRefused");
    cy.intercept("POST", `${FAMILY}/heroes/hero-1/play`, refusal).as("playRefused");
    openLinkedPhone();

    cy.url({ timeout: 20000 }).should("match", HERO_PHONE_PATH);
    cy.get("[data-cy=hero-card]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-cy=hero-phone-board]", { timeout: 30000 }).should("be.visible");
    cy.contains("[data-cy=phone-quest]", "Tame the Socktopus").should("be.visible");
    cy.get("[data-cy=pro-required]")
      .should("be.visible")
      .and("contain", "Playing the whole game on this phone needs XP Pro. Ask your Game Master.");
    cy.screenshot("family-sync-05-pro-line", { capture: "viewport" });

    // Still the board: no Play button, no clerk question, and the phone stays put
    cy.get("[data-cy=play-button]").should("not.exist");
    cy.get("[data-cy=reveal-prompt]").should("not.exist");
    cy.wait(3000);
    cy.url().should("match", HERO_PHONE_PATH);
    cy.get("@recordsRefused.all").should("have.length", 0);
    cy.get("@putRefused.all").should("have.length", 0);
    cy.get("@playRefused.all").should("have.length", 0);
  });
});
