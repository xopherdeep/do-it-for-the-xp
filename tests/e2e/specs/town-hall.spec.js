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

function openTownHall(heroId, fixture = "town-hall-backup.json") {
  cy.seedWorld(fixture, heroId);
  cy.visit(`/town-hall/${heroId}`, { timeout: 120000 });
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
    cy.contains("[data-cy=th-comment]", "Great news, heroes!", { timeout: 20000 });
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
});
