// The Town Hall: the read-only tabs (News, Board, Events, Updates) and the clerk's menu, with the site stubbed.
// The live site is never touched: every request to it is answered by a fixture below.
const CORS = { "access-control-allow-origin": "*", "access-control-expose-headers": "X-WP-TotalPages,X-WP-Total" };
const json = (body, extra = {}) => ({ statusCode: 200, body, headers: { ...CORS, ...extra } });

const post = (id, title, excerpt, extra = {}) => ({
  id,
  date: "2026-10-01T09:00:00",
  title: { rendered: title },
  excerpt: { rendered: `<p>${excerpt}</p>` },
  content: { rendered: `<p>${excerpt}</p>` },
  link: `https://doit.forthexp.com/?p=${id}`,
  _embedded: { "wp:term": [[{ name: "News" }]] },
  ...extra,
});

const BOARDS = [
  { id: 11, slug: "feature-requests", name: "Feature Requests", description: "Ideas for new features", count: 2 },
  { id: 12, slug: "ideas-suggestions", name: "Ideas &amp; Suggestions", description: "", count: 0 },
  { id: 13, slug: "comments-feedback", name: "Comments &amp; Feedback", description: "", count: 0 },
  { id: 14, slug: "suggestion-box", name: "Suggestion Box", description: "", count: 0 },
  { id: 15, slug: "noo", name: "Noo", description: "Not a Town Hall board", count: 9 },
];

const topic = (id, title, body, author) => ({
  id,
  date: "2026-10-02T10:00:00",
  title: { rendered: title },
  content: { rendered: `<p>${body}</p>` },
  _embedded: { author: [{ name: author }] },
});

/** Answers every read the Town Hall makes; a case overrides one by stubbing it again afterwards. */
function stubSite() {
  cy.intercept("GET", "**/wp-json/wp/v2/categories?slug=patch-notes*", json([{ id: 7 }])).as("category");
  cy.intercept(
    "GET",
    "**/wp/v2/posts?_embed*",
    json([post(101, "The Hero&#8217;s Welcome", "Welcome to the Town Hall."), post(102, "Harvest Festival", "Bring your best chores.")], { "X-WP-TotalPages": "1" })
  ).as("news");
  cy.intercept("GET", "**/wp/v2/posts?categories=7*", json([post(201, "0.3.0", "The Town Hall opens its doors.")])).as("patchNotes");
  cy.intercept("GET", "**/wp/v2/cafeteria_board*", json(BOARDS)).as("boards");
  cy.intercept(
    "GET",
    "**/wp/v2/cafeteria_topic*",
    json([topic(301, "Add a pet dragon", "Please let me ride one.", "Max"), topic(302, "More sword skins", "Blue ones.", "Ana")], { "X-WP-TotalPages": "1" })
  ).as("topics");
  cy.intercept(
    "GET",
    "**/wp/v2/comments?post=*",
    json([{ id: 401, author_name: "Mom", date: "2026-10-02T11:00:00", content: { rendered: "<p>Great news, heroes!</p>" } }])
  ).as("comments");
}

function openTownHall(heroId, fixture = "town-hall-backup.json", subpage = "") {
  cy.seedWorld(fixture, heroId);
  cy.visit(`/town-hall/${heroId}${subpage}`, { timeout: 120000 });
  cy.tapToWakeAudio();
}

describe("Town Hall", () => {
  before(() => {
    // The soundtrack's play() is interrupted by the next track on a route change: noise, not a defect of the page
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  beforeEach(() => {
    stubSite();
  });

  it("keeps its four tabs at the bottom of the screen", () => {
    openTownHall("hero-1");
    ["news", "board", "events", "updates"].forEach((id) => {
      cy.get(`[data-cy=th-tab-${id}]`, { timeout: 30000 }).should("be.visible");
    });
    cy.get("[data-cy=th-tab-news]").then(($tab) => {
      expect($tab[0].getBoundingClientRect().top).to.be.greaterThan(Cypress.config("viewportHeight") / 2);
    });
    cy.screenshot("town-hall-01-tabs", { capture: "viewport" });
  });

  it("News shows the posts, and a post's comments toggle shows its comments", () => {
    openTownHall("hero-1");
    cy.contains("The Hero’s Welcome", { timeout: 30000 });
    cy.contains("Harvest Festival");
    cy.get("[data-cy=th-comments-toggle]").first().click();
    cy.contains("[data-cy=th-comment-item]", "Great news, heroes!", { timeout: 20000 });
    cy.screenshot("town-hall-02-news", { capture: "viewport" });
  });

  it("Board shows the four board chips (never a stranger's board) and the first board's topics", () => {
    openTownHall("hero-1");
    cy.get("[data-cy=th-tab-board]", { timeout: 30000 }).click();
    cy.get("[data-cy=th-board-feature-requests]", { timeout: 20000 }).should("be.visible");
    ["feature-requests", "ideas-suggestions", "comments-feedback", "suggestion-box"].forEach((slug) => {
      cy.get(`[data-cy=th-board-${slug}]`).should("exist");
    });
    cy.get("[data-cy=th-board-noo]").should("not.exist");
    cy.contains("[data-cy=th-topic]", "Add a pet dragon", { timeout: 20000 });
    cy.contains("[data-cy=th-topic]", "More sword skins");
    cy.screenshot("town-hall-03-board", { capture: "viewport" });
  });

  it("Updates shows the patch notes above the game statistics", () => {
    openTownHall("hero-1");
    cy.get("[data-cy=th-tab-updates]", { timeout: 30000 }).click();
    cy.contains("[data-cy=th-patch-note]", "0.3.0", { timeout: 20000 });
    cy.get("[data-cy=th-stats]").should("be.visible");
    cy.contains("[data-cy=th-stats]", "Heroes");
    cy.screenshot("town-hall-04-updates", { capture: "viewport" });
  });

  it("Updates says there are no patch notes yet while the site has no such category", () => {
    cy.intercept("GET", "**/wp-json/wp/v2/categories?slug=patch-notes*", json([])).as("noCategory");
    openTownHall("hero-1");
    cy.get("[data-cy=th-tab-updates]", { timeout: 30000 }).click();
    cy.contains("[data-cy=th-no-patch-notes]", "No patch notes yet", { timeout: 20000 });
    cy.get("[data-cy=th-stats]").should("be.visible");
  });

  it("the header button opens Family Chat, and its close button returns to the Town Hall", () => {
    openTownHall("hero-1");
    cy.get("[data-cy=th-family-chat]", { timeout: 30000 }).click();
    cy.url({ timeout: 20000 }).should("match", /\/town-hall\/hero-1\/chat$/);
    cy.contains(".xp-chat ion-title", "Family Chat", { timeout: 20000 }).should("be.visible");
    cy.screenshot("town-hall-07-family-chat", { capture: "viewport" });
    cy.get(".xp-chat .xp-close-button").click();
    cy.url({ timeout: 20000 }).should("match", /\/town-hall\/hero-1\/?$/);
    cy.get("[data-cy=th-tab-news]", { timeout: 20000 }).should("be.visible");
  });

  it("a Family Chat link opened cold shows Family Chat, and its close button goes up to the Town Hall", () => {
    openTownHall("hero-1", "town-hall-backup.json", "/chat");
    cy.contains(".xp-chat ion-title", "Family Chat", { timeout: 30000 }).should("be.visible");
    cy.get("[data-cy=th-tab-news]").should("not.exist");
    cy.get(".xp-chat .xp-close-button").click();
    cy.url({ timeout: 20000 }).should("match", /\/town-hall\/hero-1\/?$/);
    cy.get("[data-cy=th-tab-news]", { timeout: 20000 }).should("be.visible");
  });

  it("the clerk offers Family Registration to a Game Master, not to a hero", () => {
    openTownHall("hero-1");
    cy.get("[data-cy=th-clerk]", { timeout: 30000 }).click();
    cy.get("[data-cy=reveal-choice-board]", { timeout: 20000 }).should("exist");
    cy.get("[data-cy=reveal-choice-bug]").should("exist");
    cy.get("[data-cy=reveal-choice-registration]").should("not.exist");
    cy.get("[data-cy=reveal-choice-never]").click({ force: true });

    openTownHall("gm-1");
    cy.get("[data-cy=th-clerk]", { timeout: 30000 }).click();
    cy.get("[data-cy=reveal-choice-registration]", { timeout: 20000 }).should("exist");
    cy.contains("[data-cy=reveal-choice-registration]", "Family Registration").should("not.be.disabled");
    cy.screenshot("town-hall-05-clerk-gm", { capture: "viewport" });
  });

  it("the clerk says the courier is late when the news does not arrive", () => {
    cy.intercept("GET", "**/wp/v2/posts?_embed*", { statusCode: 503, body: { code: "down" }, headers: CORS }).as("newsDown");
    openTownHall("hero-1");
    cy.contains("[data-cy=reveal-text]", "The courier hasn't arrived", { timeout: 30000 });
    cy.get("[data-cy=reveal-choice-retry]", { timeout: 20000 }).should("not.be.disabled");
    cy.screenshot("town-hall-06-courier-late", { capture: "viewport" });
  });

  it("Try again asks the courier once more, and the news arrives", () => {
    let calls = 0;
    cy.intercept("GET", "**/wp/v2/posts?_embed*", (req) => {
      calls += 1;
      if (calls === 1) req.reply({ statusCode: 503, body: { code: "down" }, headers: CORS });
      else req.reply(json([post(103, "Back on the road", "The courier made it.")], { "X-WP-TotalPages": "1" }));
    }).as("newsRetry");
    openTownHall("hero-1");
    cy.get("[data-cy=reveal-choice-retry]", { timeout: 30000 }).should("not.be.disabled").click();
    cy.contains("[data-cy=th-post]", "Back on the road", { timeout: 20000 });
  });

  describe("Family Registration", () => {
    // Production builds route by hash: WordPress then puts its answer before the fragment, as /?query#/town-hall/gm-1
    const hash = Cypress.env("hashRouting");
    const SITE = "https://doit.forthexp.com";
    const APP_ID = "7606ce60-29c7-43b6-9533-2063ee726df4";
    const LINK_QUERY = "site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=abcd+efgh";
    const MOM_BASIC = `Basic ${btoa("mom:abcd efgh")}`;

    const withQuery = (address, query) => {
      const [base, fragment] = address.split("#");
      return fragment === undefined ? `${base}?${query}` : `${base}?${query}#${fragment}`;
    };
    const returnPath = (query) => (hash ? `/?${query}#/town-hall/gm-1` : `/town-hall/gm-1?${query}`);
    const townHallPath = hash ? "/#/town-hall/gm-1" : "/town-hall/gm-1";

    // The site answers the new password's check and, for a request carrying Authorization, the CORS preflight before it
    function stubLinkSite() {
      cy.intercept("OPTIONS", `${SITE}/**`, {
        statusCode: 204,
        headers: {
          ...CORS,
          "access-control-allow-headers": "authorization,content-type,accept,x-wp-nonce",
          "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
        },
      });
      cy.intercept("GET", "**/wp/v2/users/me?context=edit*", json({ name: "Mom" })).as("me");
      cy.intercept("GET", "**/application-passwords/introspect*", json({ uuid: "u-1" })).as("introspect");
      cy.intercept("DELETE", "**/application-passwords/u-1*", json({ deleted: true })).as("removeConnection");
    }

    // IndexedDB outlives a Cypress test: clear the link an earlier test saved on this device (the open page may hold the database)
    function forgetDeviceLink() {
      cy.window().then(
        (win) =>
          new Cypress.Promise((resolve, reject) => {
            win.indexedDB.databases().then((known) => {
              if (!known.some((db) => db.name === "__xp_town_hall")) return resolve();
              const opening = win.indexedDB.open("__xp_town_hall");
              opening.onerror = () => reject(opening.error);
              opening.onsuccess = () => {
                const db = opening.result;
                if (!db.objectStoreNames.contains("_ionickv")) {
                  db.close();
                  return resolve();
                }
                const clearing = db.transaction("_ionickv", "readwrite").objectStore("_ionickv").delete("link");
                clearing.onerror = () => reject(clearing.error);
                clearing.transaction.oncomplete = () => {
                  db.close();
                  resolve();
                };
              };
            }, reject);
          })
      );
    }

    /** As the Game Master gm-1 on a device with no link, at `path` (the Town Hall, or what WordPress sends the parent back to) */
    function openRegistration(path, { wpApiSettings } = {}) {
      cy.seedWorld("town-hall-backup.json", "gm-1");
      forgetDeviceLink();
      cy.visit(path, {
        timeout: 120000,
        onBeforeLoad(win) {
          if (wpApiSettings) win.wpApiSettings = wpApiSettings;
        },
      });
      cy.tapToWakeAudio();
    }

    const openRegistrationQuestion = () => {
      cy.get("[data-cy=th-clerk]", { timeout: 30000 }).click();
      cy.get("[data-cy=reveal-choice-registration]", { timeout: 20000 }).should("not.be.disabled").click();
    };
    // The question for an unregistered family is several lines long and its menu opens at the last: Skip goes there
    const skipToRegistrationMenu = () => cy.get("[data-cy=reveal-skip]", { timeout: 20000 }).click();
    const dismissNotice = () => cy.get("[data-cy=reveal-choice-ok]", { timeout: 20000 }).should("not.be.disabled").click();

    beforeEach(() => {
      stubLinkSite();
    });

    it("coming back from WordPress with a new password links the family, takes the password out of the address, and offers Unlink", () => {
      // The site is slow to check the password: the address must already be clean while the check is still pending
      cy.intercept("GET", "**/wp/v2/users/me?context=edit*", { ...json({ name: "Mom" }), delay: 2000 }).as("meSlow");
      openRegistration(returnPath(LINK_QUERY));
      cy.location("search", { timeout: 30000 }).should("eq", "");
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!").should("not.exist");
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
      cy.url().should("not.contain", "password");
      cy.url().should("not.contain", "abcd");
      cy.location("search").should("eq", "");
      // vue-router writes history.state.current back to the entry's address when the app navigates on
      cy.window().then((win) => {
        expect(JSON.stringify(win.history.state)).to.not.contain("password");
        expect(win.history.state.current).to.eq("/town-hall/gm-1");
      });
      cy.wait("@meSlow").its("request.headers.authorization").should("eq", MOM_BASIC);
      cy.screenshot("town-hall-08-registered", { capture: "viewport" });
      dismissNotice();

      openRegistrationQuestion();
      cy.contains("[data-cy=reveal-text]", "Your family is registered as Mom.", { timeout: 20000 });
      cy.contains("[data-cy=reveal-choice-unlink]", "Unlink this device").should("not.be.disabled");
    });

    it("leaving the Town Hall after the return and coming Back does not bring the password back or link again", () => {
      openRegistration(returnPath(LINK_QUERY));
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
      dismissNotice();
      cy.get("[data-cy=th-family-chat]").click();
      cy.url({ timeout: 20000 }).should("match", /\/town-hall\/gm-1\/chat$/);
      cy.go("back");
      cy.get("[data-cy=th-tab-news]", { timeout: 20000 }).should("be.visible");
      cy.location("search").should("eq", "");
      cy.url().should("not.contain", "password");
      cy.wait(1500); // a second link would ask the site again right after the page opens
      cy.get("@me.all").should("have.length", 1);
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!").should("not.exist");
    });

    it("a refusal at WordPress comes back as 'Maybe another time' and registers nothing", () => {
      openRegistration(returnPath("success=false"));
      cy.contains("[data-cy=reveal-text]", "Maybe another time.", { timeout: 30000 });
      cy.url().should("not.contain", "success=false");
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-have]", { timeout: 20000 }).should("exist");
      cy.get("[data-cy=reveal-choice-unlink]").should("not.exist");
    });

    it("a password the site does not accept saves nothing and says so", () => {
      cy.intercept("GET", "**/wp/v2/users/me?context=edit*", { statusCode: 401, body: { code: "incorrect_password" }, headers: CORS }).as("meRefused");
      openRegistration(returnPath(LINK_QUERY));
      cy.contains("[data-cy=reveal-text]", "The registration didn't go through, and nothing was saved.", { timeout: 30000 });
      cy.url().should("not.contain", "password");
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-have]", { timeout: 20000 }).should("exist");
    });

    it("asks an unregistered family to register, and says first when it is already signed in through the website", () => {
      openRegistration(townHallPath);
      openRegistrationQuestion();
      cy.contains("[data-cy=reveal-text]", "To post for your family, register it with the Town Hall.", { timeout: 20000 });
      cy.contains("[data-cy=reveal-text]", "signed in through the website").should("not.exist");
      skipToRegistrationMenu();
      cy.contains("[data-cy=reveal-text]", "Your display name on the site is public", { timeout: 20000 });
      cy.contains("[data-cy=reveal-choice-have]", "I have an account").should("not.be.disabled");
      cy.contains("[data-cy=reveal-choice-create]", "Create one").should("not.be.disabled");
      cy.screenshot("town-hall-09-registration", { capture: "viewport" });

      openRegistration(townHallPath, { wpApiSettings: { root: `${SITE}/wp-json/`, nonce: "host-nonce" } });
      openRegistrationQuestion();
      cy.contains("[data-cy=reveal-text]", "You're signed in through the website.", { timeout: 20000 });
    });

    it("Create one opens the site's sign-up page in a new tab", () => {
      openRegistration(townHallPath);
      cy.window().then((win) => cy.stub(win, "open").as("open"));
      openRegistrationQuestion();
      skipToRegistrationMenu();
      cy.get("[data-cy=reveal-choice-create]", { timeout: 20000 }).should("not.be.disabled").click();
      cy.get("@open").should("have.been.calledWith", "https://www.forthexp.com/wp-signup.php");
    });

    it("I have an account sends the parent to the site's authorize page, and WordPress sends them back linked", () => {
      cy.intercept("GET", `${SITE}/wp-admin/authorize-application.php*`, (req) => {
        const back = new URL(req.url).searchParams.get("success_url");
        req.reply({ statusCode: 302, headers: { location: withQuery(back, LINK_QUERY) } });
      }).as("authorize");
      openRegistration(townHallPath);
      openRegistrationQuestion();
      skipToRegistrationMenu();
      cy.get("[data-cy=reveal-choice-have]", { timeout: 20000 }).should("not.be.disabled").click();
      cy.wait("@authorize").then(({ request }) => {
        const asked = new URL(request.url).searchParams;
        expect(asked.get("app_id")).to.eq(APP_ID);
        expect(asked.get("app_name")).to.match(/^Do It For The XP – /);
        expect(asked.get("success_url")).to.eq(asked.get("reject_url"));
        expect(asked.get("success_url")).to.match(/\/town-hall\/gm-1$/);
      });
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
      cy.url().should("not.contain", "password");
    });

    it("Unlink this device removes the connection on the site and forgets the link", () => {
      openRegistration(returnPath(LINK_QUERY));
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-unlink]", { timeout: 20000 }).should("not.be.disabled").click();
      cy.wait("@removeConnection").its("request.headers.authorization").should("eq", MOM_BASIC);
      cy.contains("[data-cy=reveal-text]", "This device no longer posts for your family.", { timeout: 20000 });
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-have]", { timeout: 20000 }).should("exist");
    });

    it("Unlink tells the parent to finish on the site when the site cannot be asked", () => {
      cy.intercept("DELETE", "**/application-passwords/u-1*", { statusCode: 503, body: { code: "down" }, headers: CORS }).as("removeRefused");
      openRegistration(returnPath(LINK_QUERY));
      cy.contains("[data-cy=reveal-text]", "Welcome, Mom!", { timeout: 30000 });
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-unlink]", { timeout: 20000 }).should("not.be.disabled").click();
      cy.contains("[data-cy=reveal-text]", "To finish, remove", { timeout: 20000 });
      dismissNotice();

      openRegistrationQuestion();
      cy.get("[data-cy=reveal-choice-have]", { timeout: 20000 }).should("exist");
    });
  });
});
