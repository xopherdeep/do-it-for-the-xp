// Kid Creations walk-through (board #1581): a maker kid draws a beast, adds its chores, sends it, makes a quest with it for
// his little sibling Pip; the Game Master sees the pair in Approvals > Creations, keeps the kid's choice and approves it, the
// beast stands in the Bestiary with the kid's name on it, the kid is paid AP and Pip finds the quest on his board (the design
// spec's section 10 walk). Keeps a screenshot of every phase.
// The world is tests/e2e/fixtures/kid-creations-backup.json: the battle world plus Dad (Game Master), Pip (a little sibling who
// is not a maker) and Settings > Party with Max, hero-1, as a maker.
// Run (dev server first, on any port; this one serves the worktree on :8102):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8102 --spec tests/e2e/specs/kid-creations.spec.js

const WORLD = "kid-creations-backup.json";
const KID = "hero-1";
const SIBLING = "hero-2";
const GAME_MASTER = "gm-1";

// What an approval pays a maker: creationAp("beast") is a size 3 quest's AP (4), creationAp("quest") a size 1 quest's (1),
// both from suggestedRewards (src/lib/services/quests/sizeRewards.ts)
const BEAST_AP = 4;
const QUEST_AP = 1;

// `live` leaves the page's own timers and animations running: a reveal is staged by them and would stay dark without
const shot = (name, { live = false } = {}) => {
  cy.wait(500);
  cy.screenshot(name, { capture: "viewport", disableTimersAndAnimations: !live });
};

/** The kid's AP total as the user store holds it right now (the development seam window.__xp) */
const apOf = (heroId) =>
  cy.window().then((win) => {
    const hero = win.__xp.getUser(heroId);
    expect(hero, `${heroId} is in the store`).to.be.an("object");
    return hero.stats.ap.total;
  });

/** The AP total is what `expected()` says once the earlier commands have run (a value read when the chain is built would be stale) */
const expectAp = (heroId, expected, why) =>
  apOf(heroId).then((ap) => {
    expect(ap, why).to.eq(expected());
  });

/** Signs a profile in (the store keeps it over the page loads that follow) */
const signInAs = (heroId) => {
  cy.window().then((win) => {
    expect(win.__xp.loginUser(heroId), `${heroId} is loaded`).to.eq(true);
  });
};

/** A page after a full load: the seam is up and the profiles are read from storage */
const waitForProfiles = () => {
  cy.window({ timeout: 60000 }).should((win) => {
    expect(win.__xp, "development seam window.__xp").to.be.an("object");
    expect(win.__xp.getUser(KID), "the kid's profile is loaded").to.be.an("object");
  });
  cy.tapToWakeAudio();
};

/** The kid's Beast Log with the world just seeded: Max is a maker, so the FAB offers Draw a Beast */
const openBeastLog = (heroId = KID) => {
  cy.visit(`/my-tasks/${heroId}`, { timeout: 120000 });
  waitForProfiles();
  cy.contains(".xp-app-header__title", "Beast Log", { timeout: 60000 }).should("exist");
};

/** FAB, then the action sheet's "Draw a Beast": the Maker opens on its first screen (nothing made yet, so no list) */
const openBeastMaker = (shotName) => {
  cy.get("[data-test=quests-fab]", { timeout: 30000 }).click();
  cy.get("ion-action-sheet", { timeout: 10000 }).should("exist");
  shot(shotName);
  cy.contains("ion-action-sheet .action-sheet-button", "Draw a Beast").click();
  cy.get("ion-modal.beast-maker [data-test=step-look]", { timeout: 20000 }).should("be.visible");
};

/** A page's own modal (`:is-open`) stays in the DOM when it closes, with Ionic's overlay-hidden class on it */
const modalShut = (modal) => cy.get(modal, { timeout: 20000 }).should("have.class", "overlay-hidden");

const maker = (selector) => cy.get(`ion-modal.beast-maker ${selector}`, { timeout: 20000 });
const wizard = (selector) => cy.get(`ion-modal.quest-wizard ${selector}`, { timeout: 20000 });

/** The hero reveal (the Maker's and the Quest Wizard's): wait for its Begin button to wake, then press it */
const finishFanfare = (modal, name) => {
  cy.get(`${modal} [data-cy=hero-fanfare-begin]`, { timeout: 30000 }).should("not.have.class", "is-waiting");
  shot(name, { live: true });
  cy.get(`${modal} [data-cy=hero-fanfare-begin]`).click({ force: true });
};

/** Name step then chores step then Ready: types the name, adds each chore, and leaves the Maker on the Ready card */
const nameAndChores = (name, chores, [nameShot, choresShot]) => {
  maker("[data-test=next]").click();
  maker("[data-test=step-name]").should("be.visible");
  maker("[data-test=name-input]").type(name);
  maker("[data-test=nameplate]").should("have.text", name);
  shot(nameShot);
  maker("[data-test=next]").click();

  maker("[data-test=step-chores]").should("be.visible");
  chores.forEach((chore) => {
    maker("[data-test=chore-input]").type(chore);
    maker("[data-test=chore-add]").click();
  });
  maker("[data-test=chore-row]").should("have.length", chores.length);
  shot(choresShot);
  maker("[data-test=next]").click();

  maker("[data-test=step-ready]").should("be.visible");
  maker("[data-test=ready-name]").should("have.text", name);
  maker("[data-test=ready-chores] li").should("have.length", chores.length);
};

/** The Game Master's side of one page: signed in as Dad, a fresh load of `path` */
const visitAsGameMaster = (path) => {
  signInAs(GAME_MASTER);
  cy.visit(path, { timeout: 120000 });
  waitForProfiles();
};

/** A toast's words live in its shadow root, so they are read from the element's own message property */
const toastSays = (words) =>
  cy.get("ion-toast", { timeout: 20000 }).should(($toast) => {
    expect($toast.toArray().map((toast) => String(toast.message))).to.satisfy((messages) => messages.some((message) => message.includes(words)));
  });

/** Ionic alerts are plain DOM in the document: a button by its text */
const tapAlert = (button) => cy.contains("ion-alert .alert-button", button, { timeout: 10000 }).click();

describe("Kid Creations", () => {
  before(() => {
    Cypress.on("uncaught:exception", (error) => !/play\(\)|AbortError|NotAllowedError/.test(error.message));
  });

  it("a maker draws a beast, makes a quest with it for Pip, and the Game Master approves the pair as sent", () => {
    const BEAST = "Sockzilla";
    const CHORES = ["Match the socks", "Fold them flat"];
    let apBefore = 0;

    // ---- The kid: Beast Log > FAB > Draw a Beast ---------------------------------------------------------------------
    cy.seedWorld(WORLD, KID);
    apOf(KID).then((ap) => {
      apBefore = ap;
    });
    openBeastLog();
    openBeastMaker("01-quests-fab");

    // Look: the library (the photo path is its own test below); a tile gives the beast a face on its battlefield
    maker("[data-test=look-library]").click();
    maker("[data-test=tile-beast]").first().should("be.visible").click();
    maker("[data-test=stage]").should("be.visible");
    shot("02-look-library");

    nameAndChores(BEAST, CHORES, ["03-name", "04-chores"]);
    maker("[data-test=ready-credit]").should("have.text", "Made by Max"); // a library look is made, a drawing is drawn
    shot("05-ready");

    // Send it: the reveal, then the beast once more with the two buttons
    maker("[data-test=submit]").click();
    finishFanfare("ion-modal.beast-maker", "06-beast-reveal");
    maker("[data-test=sent-name]").should("be.visible").and("have.text", BEAST);
    shot("07-sent");

    // ---- Make a quest with it: the Quest Wizard opens on the steps the beast brought ---------------------------------------
    maker("[data-test=sent-quest]").click();
    wizard("[data-test=step-steps]").should("be.visible");
    wizard("[data-test=step-row]").should("have.length", CHORES.length);
    shot("08-quest-steps");
    wizard("[data-test=next]").click(); // when
    wizard("[data-test=step-when]").should("be.visible");
    wizard("[data-test=next]").click(); // how big
    wizard("[data-test=step-size]").should("be.visible");
    wizard("[data-test=next]").click(); // who: a maker's tiles are Me, the others, Everyone (the Everyone tile is the wizard spec's)
    wizard("[data-test=step-who]").should("be.visible");
    // For Pip alone: Me off, Pip on
    wizard("[data-test=who-me]").click().should("have.attr", "aria-pressed", "false");
    wizard(`[data-test=hero-${SIBLING}]`).click().should("have.attr", "aria-pressed", "true");
    shot("09-quest-who-pip");
    wizard("[data-test=next]").click();
    wizard("[data-test=step-ready]").should("be.visible");
    wizard("[data-test=ready-name]").should("have.text", BEAST);
    wizard(".qw-card__party").should("contain", "Pip").and("not.contain", "Max");
    shot("10-quest-ready");
    wizard("[data-test=submit]").click();
    finishFanfare("ion-modal.quest-wizard", "11-quest-reveal");
    modalShut("ion-modal.quest-wizard");

    // Nothing is in the game yet: the pair waits for the Game Master, and the kid has been paid nothing
    expectAp(KID, () => apBefore, "nothing is paid while the pair waits");

    // ---- The Game Master: Approvals > Creations ----------------------------------------------------------------------------
    visitAsGameMaster("/game-master/compendium/bestiary");
    cy.contains(".beast-name", "Socktopus", { timeout: 60000 }).should("exist"); // the bestiary has loaded
    cy.contains(".beast-name", BEAST).should("not.exist"); // not among the beasts in play
    cy.contains("ion-segment-button", "Creations").click();
    cy.contains(".beast-selector-item", BEAST, { timeout: 20000 })
      .find("[data-test=beast-badge]")
      .should("have.text", "Waiting");
    shot("12-bestiary-waiting");

    cy.visit("/game-master/approvals?segment=creations", { timeout: 120000 });
    waitForProfiles();
    cy.get("[data-test=creation-meta]", { timeout: 60000 }).should("have.length", 1).and("contain", "Made by Max").and("contain", "2 chores");
    cy.contains(".claim__quest", BEAST).should("exist");
    cy.get("[data-test=creation-paired]").should("contain", "a quest for");
    shot("13-approvals-creations");

    // Approve: the target chooser (a box per profile; Max gave the quest to Pip, so Pip alone is ticked) kept as sent, then the confirm
    cy.get("[data-test=creation-approve]").click();
    cy.get("ion-alert .alert-title", { timeout: 10000 }).invoke("text").should("match", /^Who is ".+" for\?$/);
    cy.get("ion-alert .alert-checkbox-label").should("have.length", 3);
    cy.get("ion-alert .alert-checkbox-button[aria-checked=true]").should("have.length", 1).and("contain", "Pip");
    shot("14-approve-chooser");
    tapAlert("Next");
    cy.get("ion-alert", { timeout: 10000 }).should("contain", "Approve Beast");
    cy.get("ion-alert").should("contain", `Max earns ${BEAST_AP + QUEST_AP} AP.`);
    shot("15-approve-confirm");
    tapAlert("Approve");
    toastSays("is in the game");
    cy.contains("ion-item", "No creations waiting", { timeout: 20000 }).should("exist");
    shot("16-approved");

    // ---- The Bestiary: the beast is in play, with the kid's name on its card ---------------------------------------------
    cy.visit("/game-master/compendium/bestiary", { timeout: 120000 });
    waitForProfiles();
    cy.contains(".beast-selector-item", BEAST, { timeout: 60000 })
      .find("[data-test=beast-badge]")
      .should("have.text", "Made by Max");
    shot("17-bestiary-credit");

    // The AP lands on the kid's profile: the beast's and, with it, the quest's
    expectAp(KID, () => apBefore + BEAST_AP + QUEST_AP, "the beast and the quest are paid");

    // The quest is live for the one Max gave it to: Pip (not a maker) finds it on his own Beast Log
    signInAs(SIBLING);
    openBeastLog(SIBLING);
    cy.contains(".quest-log-row", new RegExp(BEAST, "i"), { timeout: 30000 }).should("exist");
    shot("18-sibling-board");

    // ...and not on Max's: the Game Master kept the choice as the kid sent it
    signInAs(KID);
    openBeastLog(KID);
    cy.get(".quest-log-row, .quest-empty", { timeout: 30000 }).should("exist");
    cy.contains(".quest-log-row", new RegExp(BEAST, "i")).should("not.exist");
  });

  it("a drawing: a photo from the file input is cropped into the beast's portrait and signed 'Drawn by'", () => {
    const BEAST = "Gruffle";
    let apBefore = 0;

    cy.seedWorld(WORLD, KID);
    apOf(KID).then((ap) => {
      apBefore = ap;
    });
    openBeastLog();
    openBeastMaker("30-photo-quests-fab");

    // Look: Take a picture opens a file input; a spec cannot drive the file dialog, so the file is handed to the input
    maker("[data-test=look-photo]").click();
    cy.get("ion-modal.beast-photo-modal [data-test=photo-input]", { timeout: 20000 }).should("exist");
    cy.fixture("drawing.png", "base64").then((base64) => {
      const blob = Cypress.Blob.base64StringToBlob(base64, "image/png");
      cy.get("[data-test=photo-input]").then(($input) => {
        const win = $input[0].ownerDocument.defaultView;
        const transfer = new win.DataTransfer();
        transfer.items.add(new win.File([blob], "drawing.png", { type: "image/png" }));
        $input[0].files = transfer.files;
        $input[0].dispatchEvent(new win.Event("change", { bubbles: true }));
      });
    });
    cy.get("[data-test=photo-frame]", { timeout: 20000 }).should("be.visible");
    shot("31-photo-crop");
    cy.get("[data-test=photo-use]").click();
    cy.get("ion-modal.beast-photo-modal").should("not.exist");
    maker("[data-test=stage]").should("be.visible");
    maker("[data-test=stage] img").should("have.attr", "src").and("match", /^data:image\//);
    shot("32-photo-look");

    nameAndChores(BEAST, ["Put the crayons away"], ["33-photo-name", "34-photo-chores"]);
    maker("[data-test=ready-credit]").should("have.text", "Drawn by Max");
    shot("35-photo-ready");
    maker("[data-test=submit]").click();
    finishFanfare("ion-modal.beast-maker", "36-photo-reveal");
    maker("[data-test=sent-done]").click();
    modalShut("ion-modal.beast-maker");

    // The Game Master sees the drawing itself on the row, and the beast alone (no quest came with it)
    visitAsGameMaster("/game-master/approvals?segment=creations");
    cy.get("[data-test=creation-meta]", { timeout: 60000 }).should("contain", "Drawn by Max").and("contain", "1 chore");
    cy.get("[data-test=creation-portrait]").should("have.attr", "src").and("match", /^data:image\//);
    cy.get("[data-test=creation-paired]").should("not.exist");
    shot("37-photo-approvals");
    cy.get("[data-test=creation-approve]").click();
    cy.get("ion-alert", { timeout: 10000 }).should("contain", "Approve Beast").and("contain", `Max earns ${BEAST_AP} AP.`);
    tapAlert("Approve");
    toastSays("is in the game");

    cy.visit("/game-master/compendium/bestiary", { timeout: 120000 });
    waitForProfiles();
    cy.contains(".beast-selector-item", BEAST, { timeout: 60000 })
      .find("[data-test=beast-badge]")
      .should("have.text", "Drawn by Max");
    shot("38-photo-bestiary");
    expectAp(KID, () => apBefore + BEAST_AP, "the beast is paid");
  });
});
