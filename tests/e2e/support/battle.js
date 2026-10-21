// Shared Battle Field helpers for the e2e specs (battle, quest-grudge, quest-rooms, moving-pack).
// The default skin draws the command menu as a radial cluster of pills (XpBattleRadialMenu.vue); the old
// `.menu-item` buttons only exist in the retro skin. The intro and the result lines read themselves out
// (autoLine in src/lib/services/battle/battleService/dialogLines.ts), so a spec waits for the menu instead of
// tapping the box, and taps only the lines that wait for a tap (a level up, the parting strike's wrap-up).

/** The command pills, by what they do. */
export const ACTION = {
  tackle: "[data-cy=action-attack]",
  powers: "[data-cy=action-powers]",
  defend: "[data-cy=action-defend]",
  goods: "[data-cy=action-goods]",
  run: "[data-cy=action-run]",
  confirmRun: "[data-cy=action-confirm-run]",
  keepFighting: "[data-cy=action-keep-fighting]",
};

const MENU = "[data-cy=battle-radial-menu]";
const DIALOG = "[data-cy=battle-dialog]";
/** The five-pill command menu (Tackle, Powers, Defend, Goods, Run Away). */
const COMMAND_PILLS = `${MENU} .radial-cluster:not(.cluster-confirm) .battle-pill`;

/** True once the page's command menu is up (the box has nothing left to say). */
export const hasMenu = ($body) => $body.find(`${MENU} .battle-pill`).length > 0;

/**
 * Waits for the five-pill command menu: the intro and every auto line have read themselves out. The menu can drop away
 * again for one more line and come back as new buttons, so it must still be there after a short pause: a pill found
 * in between would be gone by the time it is pressed.
 */
export const waitForMenu = (timeout = 30000) => {
  cy.get(COMMAND_PILLS, { timeout }).should("have.length", 5);
  cy.wait(400);
  return cy.get(COMMAND_PILLS, { timeout }).should("have.length", 5);
};

/** Presses one command pill (see ACTION). */
export const tapAction = (name) => cy.get(ACTION[name], { timeout: 10000 }).click();

/** Taps the message box once. The box can read itself away between the look and the tap, so a missing box is no error. */
export const tapDialog = () =>
  cy.get("body").then(($body) => {
    const box = $body.find(DIALOG)[0];
    if (box) box.click();
  });

/** Taps through whatever the box is saying until the command menu is back. */
export const readUntilMenu = (maxTaps = 8) => {
  const step = (left) => {
    cy.get("body").then(($body) => {
      if (hasMenu($body) || left === 0) return;
      tapDialog();
      cy.wait(350);
      step(left - 1);
    });
  };
  step(maxTaps);
  waitForMenu();
};

/** Waits (taps only the lines that wait for one) until the box says `text`. */
export const tapUntilSays = (text, maxTaps = 8) => {
  const step = (left) => {
    cy.get(DIALOG, { timeout: 20000 }).then(($box) => {
      if ($box.text().includes(text) || left === 0) return;
      tapDialog();
      cy.wait(350);
      step(left - 1);
    });
  };
  step(maxTaps);
  cy.get(DIALOG, { timeout: 10000 }).should("contain", text);
};

/** Run Away, confirm, and wait for the parting strike line. */
export const runAway = () => {
  tapAction("run");
  cy.get("[data-cy=radial-prompt]").should("contain", "Run away?");
  tapAction("confirmRun");
  tapUntilSays("flees!");
};

/** Opens the checklist and confirms one chore by name. */
export const finishChore = (name) => {
  tapAction("tackle");
  cy.get("[data-cy=task-sheet]", { timeout: 10000 }).should("be.visible");
  cy.contains(".battle-task-item", name).click();
  cy.get("[data-cy=task-confirm]", { timeout: 5000 }).should("be.visible");
  cy.wait(300); // Done! ignores taps for 250 ms after the row is selected (double-tap guard)
};
