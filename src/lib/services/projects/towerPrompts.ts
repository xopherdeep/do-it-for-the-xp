/**
 * What the tower says in the game's own prompt (never a native alert): the fanfare for a floor just cleared, with the
 * early bonus when there was one, and the Game Master's last question before a project is given up. The wording is the
 * `projectTower.*` lines of the copy catalogue; this turns it into the prompt to show, so the screens stay thin and the
 * words are tested without one.
 */
import { yesNoOf, type RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import type { ProjectFloor } from "./projectRecord";

/** The multiplier above which a cleared floor earned a bonus */
const NO_BONUS = 1;

/** Who asks the Game Master before a project is given up */
const TOWER_KEEPER = "Tower Keeper";

/**
 * "Floor cleared!" for a floor of the record: the phase's name, and the early-finish multiplier when it was above x1
 * (coins rise with a bonus, the tablet without one). One Onward goes on; Escape is Onward too.
 */
export const floorClearedPrompt = (floor: ProjectFloor, phaseName: string, voice: Voice): RevealPromptOptions => {
  const multiplier = floor.multiplier ?? NO_BONUS;
  const hasBonus = multiplier > NO_BONUS;
  const lines = [copyFor("projectTower.floorCleared.name", voice, { phase: phaseName })];
  if (hasBonus) lines.push(copyFor("projectTower.floorCleared.bonus", voice, { multiplier: multiplier.toFixed(1) }));
  return {
    title: copyFor("projectTower.floorCleared.title", voice),
    sprite: hasBonus ? "coins" : "tablet",
    glow: "gold",
    lines,
    choices: [{ id: "onward", label: "Onward", icon: "arrow-right", tone: "primary" }],
    cancelId: "onward",
  };
};

/** "Abandon The Spring Spire? ...": yes gives the project up, no (or Escape) keeps it */
export const abandonPrompt = (towerName: string, voice: Voice): RevealPromptOptions =>
  yesNoOf(TOWER_KEEPER, copyFor("projectTower.abandon.ask", voice, { tower: towerName }), { yes: "Abandon", no: "Keep it" }, { accent: "townHall", sprite: "tablet" });
