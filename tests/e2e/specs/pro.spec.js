// XP Pro: the membership page, the Stripe return page and the Settings panel, with the Gatekeeper routes stubbed.
const PLANS = {
  monthly: { price: 5.49, mode: "subscription", interval: "month", trial_days: 7, store_product_id: "xp_pro_monthly", on_sale: true },
  yearly: { price: 41.25, mode: "subscription", interval: "year", trial_days: 7, store_product_id: "xp_pro_yearly", on_sale: true },
  lifetime: { price: 83, mode: "payment", interval: null, trial_days: 0, store_product_id: "xp_pro_lifetime", on_sale: true },
};
const LICENSE = {
  pro: true,
  license_key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expires_at: "2099-01-01T00:00:00Z",
  env: "production",
  family_id: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f",
};
// Production builds (and Capacitor) route by hash, `pnpm serve` by path: the Stripe return arrives as
// /#/pro/return?... on a production build. Run against a static dist with CYPRESS_hashRouting=1 to cover it.
const hash = Cypress.env("hashRouting") ? "/#" : "";
const route = (name) => `**/compass/v1/gatekeeper/xp-pro/${name}*`;

describe("XP Pro", () => {
  // IndexedDB outlives a test: forget any cached Pro license before each page load so tests stay independent
  const forgetLicense = (win) => {
    try {
      win.indexedDB.deleteDatabase("__xp_pro");
    } catch {
      // no IndexedDB: nothing cached
    }
  };
  before(() => Cypress.on("window:before:load", forgetLicense));
  after(() => Cypress.off("window:before:load", forgetLicense));

  // The Return page needs no sign-in (Stripe lands there after a full reload), so those tests run unseeded.
  // Go Pro and Settings sit behind sign-in and seed a hero first.
  it("the XP Pro page lists three plans with the server prices", () => {
    cy.seedWorld();
    cy.intercept("GET", route("plans"), { statusCode: 200, body: PLANS }).as("plans");
    cy.intercept("POST", route("claim"), { statusCode: 404, body: { pro: false } });
    cy.visit("/xp-membership", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.wait("@plans");
    cy.get('[data-cy="plan-price"]', { timeout: 20000 }).should("have.length", 3);
    cy.contains('[data-cy="plan-monthly"]', "$5.49");
    cy.contains('[data-cy="plan-yearly"]', "$41.25");
    cy.contains('[data-cy="plan-lifetime"]', "$83.00");
    cy.contains("7 days free");
    cy.screenshot("pro-01-xp-pro-page", { capture: "viewport" });
  });

  it("/pro redirects to the membership page", () => {
    cy.seedWorld();
    cy.intercept("GET", route("plans"), { statusCode: 200, body: PLANS });
    cy.intercept("POST", route("claim"), { statusCode: 404, body: { pro: false } });
    cy.visit("/pro", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.location("pathname", { timeout: 30000 }).should("match", /\/xp-membership$/);
    cy.get('[data-cy="plan-price"]', { timeout: 20000 }).should("have.length", 3);
  });

  it("the menu's XP Pro link opens the membership page", () => {
    cy.seedWorld();
    cy.intercept("GET", route("plans"), { statusCode: 200, body: PLANS });
    cy.intercept("POST", route("claim"), { statusCode: 404, body: { pro: false } });
    cy.visit("/xp-settings/pro", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get('[data-cy="restore-key-input"]', { timeout: 20000 });
    cy.get("ion-menu ion-item").contains("XP Pro").click({ force: true });
    cy.location("pathname", { timeout: 20000 }).should("match", /\/xp-membership$/);
    cy.contains("Your family's XP Pro", { timeout: 20000 });
  });

  it("/#/pro/return?session_id=cs_1&purchased=doitforthexp unlocks after one pending claim", () => {
    let claims = 0;
    cy.intercept("POST", route("claim"), (req) => {
      claims += 1;
      // claim 1 is the store's start-up check, claim 2 the Return page's first try: both find nothing yet
      if (claims <= 2) req.reply({ statusCode: 404, body: { pro: false } });
      else req.reply({ statusCode: 200, body: LICENSE });
    }).as("claim");
    cy.visit(`${hash}/pro/return?session_id=cs_1&purchased=doitforthexp`, { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.wait("@claim");
    cy.wait("@claim");
    cy.wait("@claim", { timeout: 15000 });
    cy.location({ timeout: 15000 }).should((loc) => expect(loc.href).not.to.include("/pro/return"));
    cy.screenshot("pro-02-return-unlocked", { capture: "viewport" });
    cy.then(() => expect(claims).to.be.at.least(3));
  });

  it("/#/pro/return?status=cancelled returns to the membership page without claiming", () => {
    let claims = 0;
    cy.intercept("POST", route("claim"), (req) => {
      claims += 1;
      req.reply({ statusCode: 404, body: { pro: false } });
    });
    cy.intercept("GET", route("plans"), { statusCode: 200, body: PLANS });
    cy.visit(`${hash}/pro/return?status=cancelled`, { timeout: 120000 });
    cy.location({ timeout: 20000 }).should((loc) => {
      expect(loc.href).to.match(/\/xp-membership(\?|$)/);
      expect(loc.href).not.to.include("return");
    });
    cy.then(() => expect(claims, "claim calls from the Return page").to.be.at.most(1));
  });

  it("Settings > XP Pro restores with a key", () => {
    cy.seedWorld();
    cy.intercept("POST", route("claim"), { statusCode: 404, body: { pro: false } });
    cy.intercept("POST", route("validate"), { statusCode: 200, body: LICENSE }).as("validate");
    cy.visit("/xp-settings/pro", { timeout: 120000 });
    cy.tapToWakeAudio();
    cy.get('[data-cy="restore-key-input"]', { timeout: 20000 }).find("input").type("XP-PRO-AAAA-BBBB-CCCC", { force: true });
    cy.get('[data-cy="restore-key-button"]').click({ force: true });
    cy.wait("@validate");
    cy.contains('[data-cy="pro-status"]', "XP Pro is on", { timeout: 10000 });
    cy.contains('[data-cy="pro-masked-key"]', "XP-PRO-****-****-CCCC");
    cy.screenshot("pro-03-settings-restored", { capture: "viewport" });
  });

  describe("gates (free family)", () => {
    beforeEach(() => {
      cy.intercept("POST", route("claim"), { statusCode: 404, body: { pro: false } });
      cy.intercept("POST", route("validate"), { statusCode: 404, body: { pro: false } });
      cy.seedWorld();
    });

    it("a free family can add a fourth kid", () => {
      cy.visit("/xp-settings/family", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.contains("ion-button, button", /add kid/i, { timeout: 20000 }).click({ force: true });
      cy.contains("is part of XP Pro").should("not.exist");
    });

    it("opening the room editor without Pro shows the upsell", () => {
      // headless Chrome rejects the upsell's open sound (no audio device) with an empty reason
      cy.on("uncaught:exception", (err) => !/unhandled promise rejection/i.test(err.message));
      cy.visit("/game-master/compendium/temples", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.contains("Temples", { timeout: 30000 });
      cy.wait(4000); // the page and the Pro store finish loading
      // an in-app navigation: refused with the upsell
      cy.window().then((win) => {
        win.document.querySelector("#app").__vue_app__.config.globalProperties.$router
          .push("/game-master/compendium/temples/creator/plains/rooms/0/0")
          .catch(() => undefined);
      });
      cy.get(".xp-pro-upsell-modal", { timeout: 20000 }).should(($m) => {
        expect($m[0].outerHTML.slice(0, 600)).to.contain("is part of XP Pro");
      });
      cy.screenshot("pro-04-upsell", { capture: "viewport" });
      cy.contains("ion-button, button", "Not now").click({ force: true });
    });

    it("a deep link to the room editor without Pro lands on the XP Pro page", () => {
      cy.intercept("GET", route("plans"), { statusCode: 200, body: PLANS });
      // a fresh load straight onto a Pro route (Cypress's visit is a first navigation)
      cy.window().then((win) => win.location.assign("/game-master/compendium/temples/creator/plains/rooms/0/0"));
      cy.location("pathname", { timeout: 40000 }).should("match", /\/xp-membership$/);
    });

    it("the dashboard New Temple asks for Pro when free", () => {
      cy.on("uncaught:exception", (err) => !/unhandled promise rejection/i.test(err.message));
      cy.visit("/game-master/dashboard", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.wait(4000); // the page and the Pro store finish loading
      cy.get("ion-fab-button:has(.fa-plus)", { timeout: 30000 }).first().click({ force: true });
      cy.contains("button.action-temple, .action-temple", "New Temple", { timeout: 10000 }).click({ force: true });
      cy.get(".xp-pro-upsell-modal", { timeout: 20000 }).should(($m) => {
        expect($m[0].outerHTML.slice(0, 600)).to.contain("is part of XP Pro");
      });
      cy.location("pathname").should("not.include", "temples/new");
      cy.screenshot("pro-05-new-temple-upsell", { capture: "viewport" });
    });

    it("the Bestiary create page opens without Pro", () => {
      cy.visit("/game-master/compendium/bestiary/create-update", { timeout: 120000 });
      cy.tapToWakeAudio();
      cy.location("pathname", { timeout: 20000 }).should("include", "bestiary/create-update");
      cy.contains("is part of XP Pro").should("not.exist");
    });
  });
});
