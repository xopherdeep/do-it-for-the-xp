// Phone resolutions: the battle fits every phone from the iPhone SE (320x568) to the Pro Max (430x932), in both menu
// skins. Nothing the thumb needs may poke past the screen, and the beast keeps a real size on short phones.
// The message box is measured in the retro skin, where it stays up holding the command menu (its tallest state); the
// intro line reads itself away a few seconds after the battle mounts, before a slow load event lets a spec look, so
// no test waits for it.
// Run (dev server on :8100 first):
//   pnpm vue-cli-service test:e2e --headless --browser chrome --url http://localhost:8100 --spec tests/e2e/specs/battle-rez.spec.js

import { waitForMenu } from "../support/battle";

const PHONES = [
  ["iPhone SE 1st gen", 320, 568],
  ["small Android", 360, 640],
  ["iPhone 8", 375, 667],
  ["iPhone 14", 390, 844],
  ["Pixel 7", 412, 915],
  ["iPhone Pro Max", 430, 932],
];

/** The Earthbound box draws its rings 16 px outside its element. */
const RING = 16;
/** A beast smaller than this is a smudge. */
const MIN_BEAST = 96;

const inside = (el, phone, width, height, what, margin = 0) => {
  const r = el.getBoundingClientRect();
  expect(r.left - margin, `${phone}: ${what} left edge`).to.be.at.least(-1);
  expect(r.right + margin, `${phone}: ${what} right edge`).to.be.at.most(width + 1);
  expect(r.top - margin, `${phone}: ${what} top edge`).to.be.at.least(-1);
  expect(r.bottom + margin, `${phone}: ${what} bottom edge`).to.be.at.most(height + 1);
};

const visitBattle = (width, height, skin) => {
  cy.viewport(width, height);
  cy.visit("/battle/hero-1/free/beast-dishgoblin", {
    timeout: 120000,
    onBeforeLoad(win) {
      win.localStorage.setItem("fabStyle", skin);
    },
  });
  cy.tapToWakeAudio();
  cy.get(".battlefield", { timeout: 60000 }).should("exist");
};

/** The message box, with its rings, whatever it is saying or showing at this moment. */
const checkBox = (phone, width, height) =>
  cy.get("[data-cy=battle-dialog]", { timeout: 30000 }).then(($box) => inside($box[0], phone, width, height, "message box", RING));

const checkStage = (phone, width, height) => {
  cy.get(".attack-timer").then(($t) => inside($t[0], phone, width, height, "attack clock"));
  cy.get(".enemy-sprite-container").then(($s) => {
    expect($s[0].getBoundingClientRect().height, `${phone}: beast height`).to.be.at.least(MIN_BEAST);
  });
};

describe("Battle Field on every phone", () => {
  before(() => {
    cy.seedWorld();
  });

  // Nothing but the Google web fonts leaves the machine (as in visual.spec.js): a slow music stream or site call would
  // hold back the page's load event, and the intro line would have read itself away before the first check.
  beforeEach(() => {
    cy.intercept({ url: /^https?:\/\/(?!localhost|127\.0\.0\.1|fonts\.googleapis\.com|fonts\.gstatic\.com)/ }, { statusCode: 404, body: {} });
  });

  it("fits the radial command menu, the message box and the beast (modern skin)", () => {
    PHONES.forEach(([phone, width, height]) => {
      visitBattle(width, height, "modern");
      cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Dish Goblin");
      waitForMenu();
      cy.get("[data-cy=battle-radial-menu] .battle-pill").should("have.length", 5).each(($pill) => {
        inside($pill[0], phone, width, height, `${$pill.text().trim()} pill`);
      });
      checkStage(phone, width, height);
    });
  });

  it("fits the command menu inside the message box (retro skin)", () => {
    PHONES.forEach(([phone, width, height]) => {
      visitBattle(width, height, "retro");
      cy.get(".enemy-name", { timeout: 30000 }).should("contain", "Dish Goblin");
      cy.get("[data-cy=battle-dialog] .dialog-menu .menu-item", { timeout: 30000 }).should("have.length", 5).each(($row) => {
        inside($row[0], phone, width, height, `${$row.text().trim()} row`);
      });
      checkBox(phone, width, height);
      cy.get(".attack-timer").then(($t) => inside($t[0], phone, width, height, "attack clock"));
    });
  });
});
