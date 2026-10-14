// Family screen e2e tests: the family card, Link a phone, /link, /hero-phone, and unlinked.
// The live site is never touched: every call is intercepted with fixtures in tests/e2e/fixtures/family/.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "X-WP-TotalPages,X-WP-Total",
};
const LIVE_SITE = "https://doit.forthexp.com";

const hash = Cypress.env("hashRouting");
const LINK_QUERY = "site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=abcd%20efgh";
const STATE = "e2e-state-1";
const STATE_KEY = "xp:townHallLinkState";

const appended = (address, query) => {
  const hasQuestion = address.includes("?");
  const separator = hasQuestion ? "&" : "?";
  return `${address}${separator}${query}`;
};

const returnPath = (query, state = STATE) => {
  const base = hash ? "/#/town-hall/gm-1" : "/town-hall/gm-1";
  const fullQuery = state ? `th_state=${state}&${query}` : query;
  return appended(base, fullQuery);
};

const familySettingsPath = hash ? "/#/xp-settings/family" : "/xp-settings/family";

function stubCatchAllWrites() {
  cy.intercept(
    { method: /^(POST|PUT|PATCH|DELETE)$/, url: `${LIVE_SITE}/**` },
    { statusCode: 599, body: { code: "e2e_unstubbed_write" }, headers: CORS }
  ).as("unstubbedWrite");
}

function stubSite() {
  cy.intercept("OPTIONS", `${LIVE_SITE}/**`, {
    statusCode: 204,
    headers: {
      ...CORS,
      "access-control-allow-headers": "authorization,content-type,accept,x-wp-nonce,x-xp-hero-key",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    },
  });
  cy.intercept("GET", "**/wp/v2/users/me?context=edit*", { statusCode: 200, body: { name: "Mom" }, headers: CORS }).as("me");
  cy.intercept("GET", "**/application-passwords/introspect*", { statusCode: 200, body: { uuid: "u-1" }, headers: CORS }).as("introspect");
  cy.intercept("GET", "**/wp-json/wp/v2/categories?slug=patch-notes*", { statusCode: 200, body: [{ id: 7 }], headers: CORS });
  cy.intercept("GET", "**/wp/v2/posts?_embed*", { statusCode: 200, body: [], headers: { ...CORS, "X-WP-TotalPages": "1" } });
  cy.intercept("GET", "**/wp/v2/cafeteria_board*", { statusCode: 200, body: [], headers: CORS });
}

function stubFamilyServer() {
  cy.intercept("POST", "**/wp-json/xp-family/v1/family", { statusCode: 200, fixture: "family/bind-home.json", headers: CORS }).as("bindFamily");
  cy.intercept("GET", "**/wp-json/xp-family/v1/family", { statusCode: 200, fixture: "family/get-family.json", headers: CORS }).as("getFamily");
  cy.intercept("POST", "**/wp-json/xp-family/v1/heroes/*", { statusCode: 200, body: {}, headers: CORS }).as("saveHero");
  cy.intercept("POST", "**/wp-json/xp-family/v1/events", { statusCode: 200, body: { accepted: [], duplicate: [], rejected: [] }, headers: CORS }).as("events");
  cy.intercept("GET", "**/wp-json/xp-family/v1/devices", { statusCode: 200, body: [], headers: CORS }).as("listDevices");
}

function clearDatabases() {
  const onWindowObtained = (win) => {
    const handleDbPromise = (resolve) => {
      const hasIndexedDb = Boolean(win.indexedDB && win.indexedDB.databases);
      if (!hasIndexedDb) {
        resolve();
        return;
      }
      const onDatabasesListed = (known) => {
        const dbNames = ["__xp_town_hall", "__xp_hero_device", "__xp_family_events"];
        const toClear = known.filter((db) => dbNames.includes(db.name || ""));
        const hasNone = toClear.length === 0;
        if (hasNone) {
          resolve();
          return;
        }
        let remaining = toClear.length;
        const checkDone = () => {
          remaining -= 1;
          const isFinished = remaining <= 0;
          if (isFinished) resolve();
        };
        const clearSingleDb = (dbInfo) => {
          const name = dbInfo.name || "";
          const opening = win.indexedDB.open(name);
          opening.onerror = checkDone;
          opening.onsuccess = () => {
            const db = opening.result;
            const hasStore = db.objectStoreNames.contains("_ionickv");
            if (!hasStore) {
              db.close();
              checkDone();
              return;
            }
            const tx = db.transaction("_ionickv", "readwrite");
            tx.objectStore("_ionickv").clear();
            tx.onerror = () => {
              db.close();
              checkDone();
            };
            tx.oncomplete = () => {
              db.close();
              checkDone();
            };
          };
        };
        toClear.forEach(clearSingleDb);
      };
      win.indexedDB.databases().then(onDatabasesListed, () => resolve());
    };
    return new Cypress.Promise(handleDbPromise);
  };
  return cy.window().then(onWindowObtained);
}

function linkTownHall() {
  cy.seedWorld("family/family-backup.json", "gm-1");
  clearDatabases();
  const applyBeforeLoad = (win) => {
    win.localStorage.setItem("xp:multiplayer", "on");
    win.sessionStorage.setItem(
      STATE_KEY,
      JSON.stringify({ state: STATE, heroId: "gm-1", expiresAt: Date.now() + 600000 })
    );
  };
  cy.visit(returnPath(LINK_QUERY), {
    timeout: 120000,
    onBeforeLoad: applyBeforeLoad,
  });
  cy.tapToWakeAudio();
  cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
  cy.get("[data-cy=reveal-choice-ok]", { timeout: 20000 }).should("not.be.disabled").click();
}

const isIgnoredAudioError = (error) => {
  const isAudioNoise = /play\(\)|AbortError|NotAllowedError/.test(error.message);
  return !isAudioNoise;
};

describe("Family Screens", () => {
  before(() => {
    Cypress.on("uncaught:exception", isIgnoredAudioError);
  });

  beforeEach(() => {
    stubCatchAllWrites();
    stubSite();
    stubFamilyServer();
  });

  afterEach(() => {
    clearDatabases();
  });

  it("Family Settings shows the card with heroes and the age picker", () => {
    linkTownHall();
    const applyBeforeLoad = (win) => {
      win.localStorage.setItem("xp:multiplayer", "on");
    };
    cy.visit(familySettingsPath, {
      timeout: 120000,
      onBeforeLoad: applyBeforeLoad,
    });
    cy.tapToWakeAudio();

    cy.get("[data-cy=family-phones]", { timeout: 30000 }).should("be.visible");
    cy.get("[data-cy=family-hero][data-hero=hero-1]", { timeout: 20000 }).should("be.visible");
    cy.contains("[data-cy=family-hero][data-hero=hero-1] h2", "Max").should("be.visible");

    cy.get("[data-cy=age-hero-1-child]").should("be.visible");
    cy.get("[data-cy=age-hero-1-teen]").should("be.visible");
    cy.get("[data-cy=age-hero-1-adult]").should("be.visible");

    cy.get("[data-cy=age-hero-1-teen]").click();
    cy.get("[data-cy=age-hero-1-teen]").should("have.attr", "aria-pressed", "true");
    cy.get("[data-cy=age-hero-1-child]").should("have.attr", "aria-pressed", "false");
    cy.screenshot("family-01-settings", { capture: "viewport" });
  });

  it("Phones -> Link a phone shows QR image, ABCD-EFGH, countdown", () => {
    linkTownHall();
    const applyBeforeLoad = (win) => {
      win.localStorage.setItem("xp:multiplayer", "on");
    };
    cy.visit(familySettingsPath, {
      timeout: 120000,
      onBeforeLoad: applyBeforeLoad,
    });
    cy.tapToWakeAudio();

    cy.intercept("POST", "**/wp-json/xp-family/v1/heroes/hero-1/link-codes", {
      statusCode: 200,
      fixture: "family/link-code.json",
      headers: CORS,
    }).as("makeLinkCode");

    cy.get("[data-cy=family-hero][data-hero=hero-1] [data-cy=family-phones-open]", { timeout: 30000 })
      .should("not.be.disabled")
      .click();

    cy.contains("ion-title", "Max's phones", { timeout: 20000 }).should("be.visible");
    cy.get("[data-cy=link-phone]", { timeout: 20000 }).should("be.visible").click();
    cy.wait("@makeLinkCode");

    cy.get("[data-cy=qr-image]", { timeout: 20000 })
      .should("be.visible")
      .and("have.attr", "src")
      .should("include", "data:image/png;base64,");

    cy.get("[data-cy=link-code]").should("be.visible").and("contain", "ABCD-EFGH");
    cy.get("[data-cy=countdown]").should("be.visible").and("match", /^\d+:\d{2}$/);
    cy.screenshot("family-02-link-modal", { capture: "viewport" });
    cy.get("[data-cy=close-modal]").click();
  });

  it("/link?code=ABCDEFGH (fresh storage) lands on /hero-phone with nickname and level", () => {
    clearDatabases();
    cy.intercept("POST", "**/wp-json/xp-family/v1/devices/claim", {
      statusCode: 200,
      fixture: "family/claim-device.json",
      headers: CORS,
    }).as("claimDevice");
    cy.intercept("GET", "**/wp-json/xp-family/v1/family", {
      statusCode: 200,
      fixture: "family/get-family.json",
      headers: CORS,
    }).as("getFamilyCard");

    const linkWithCodePath = hash ? "/#/link?code=ABCDEFGH" : "/link?code=ABCDEFGH";
    const applyFreshStorage = (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem("xp:multiplayer", "on");
      win.localStorage.setItem("xpSkipSplash", "1");
    };
    cy.visit(linkWithCodePath, {
      timeout: 120000,
      onBeforeLoad: applyFreshStorage,
    });
    cy.tapToWakeAudio();
    cy.wait("@claimDevice");

    cy.url({ timeout: 20000 }).should("match", /\/hero-phone\/?$/);
    cy.get("[data-cy=hero-card]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-cy=hero-nickname]").should("contain", "Max");
    cy.get("[data-cy=hero-details]").should("contain", "Level 3");
    cy.get("[data-cy=hero-details]").should("contain", "warrior");
    cy.get("[data-cy=quests-elsewhere]").should("be.visible");
    cy.screenshot("family-03-hero-phone", { capture: "viewport" });
  });

  it("bad code shows the clerk's line", () => {
    clearDatabases();
    cy.intercept("POST", "**/wp-json/xp-family/v1/devices/claim", {
      statusCode: 400,
      fixture: "family/code-invalid.json",
      headers: CORS,
    }).as("claimBadCode");

    const linkPath = hash ? "/#/link" : "/link";
    const applyFreshStorage = (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem("xp:multiplayer", "on");
      win.localStorage.setItem("xpSkipSplash", "1");
    };
    cy.visit(linkPath, {
      timeout: 120000,
      onBeforeLoad: applyFreshStorage,
    });
    cy.tapToWakeAudio();

    cy.get("[data-cy=link-code-input]", { timeout: 20000 })
      .find("input")
      .type("ZZZZ9999", { force: true });
    cy.get("[data-cy=link-button]").should("not.be.disabled").click();
    cy.wait("@claimBadCode");

    cy.get("[data-cy=family-banner]", { timeout: 20000 })
      .should("be.visible")
      .and("contain", "That code didn't work. Ask your Game Master for a new one.");
    cy.screenshot("family-04-bad-code", { capture: "viewport" });
  });

  it("GET /family answering 401 xp_family_key_revoked shows unlinked screen, and Start fresh returns to profile chooser", () => {
    clearDatabases();
    cy.intercept("POST", "**/wp-json/xp-family/v1/devices/claim", {
      statusCode: 200,
      fixture: "family/claim-device.json",
      headers: CORS,
    }).as("claimForRevoke");
    cy.intercept("GET", "**/wp-json/xp-family/v1/family", {
      statusCode: 401,
      fixture: "family/key-revoked.json",
      headers: CORS,
    }).as("getFamilyRevoked");

    const linkWithCodePath = hash ? "/#/link?code=ABCDEFGH" : "/link?code=ABCDEFGH";
    const applyFreshStorage = (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem("xp:multiplayer", "on");
      win.localStorage.setItem("xpSkipSplash", "1");
    };
    cy.visit(linkWithCodePath, {
      timeout: 120000,
      onBeforeLoad: applyFreshStorage,
    });
    cy.tapToWakeAudio();
    cy.wait("@claimForRevoke");
    cy.wait("@getFamilyRevoked");

    cy.get("[data-cy=unlinked-card]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-cy=unlinked-text]").should(
      "contain",
      "This phone was unlinked. Ask your Game Master to link it again."
    );
    cy.screenshot("family-05-unlinked", { capture: "viewport" });

    cy.get("[data-cy=start-fresh-button]", { timeout: 20000 }).should("be.visible").click();
    cy.url({ timeout: 20000 }).should("match", /\/xp-profile\/?$/);
    cy.contains("Choose A Profile", { timeout: 20000 }).should("be.visible");
    cy.screenshot("family-06-profile-chooser", { capture: "viewport" });
  });
});
