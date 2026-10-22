/**
 * The chore plan of each classic temple: the theme's beasts the dress step deals out to the rooms of the converted
 * dungeon (tools/temples/classic/dungeons/<id>.json), with the temple's relic, riddle and trap. One entry per temple
 * that has moved from tools/temples/regenerate.ts to the classic dungeons; the eight are added one temple at a time.
 *
 * `mustClear` lists the candidates for the must-clear monster rooms in priority order: the beasts of today's starter
 * quests first (STARTER_QUESTS, so a family's first chores fill rooms at once), then the rest of the theme. A dungeon
 * takes as many as it has must-clear rooms; a starter beyond that count gets a side room of its own (classicReport's
 * `overflow`), any other extra leaves the temple (`left`), and a plan shorter than the count repeats (`repeats`).
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { ClassicDungeon } from "./classicDungeon";
import type { PlanQuest } from "../questPlan";

export interface ClassicPlan {
  /** "Storm Temple": the name the Temple Creator lists the temple under */
  name: string;
  /** The world the temple stands in (the registry's `world`): the theme written on its monster rooms */
  theme: string;
  element: string;
  /** What the Big Chest holds: the temple's relic */
  relic: string;
  /** What the shop (the first empty cell from the entrance) stocks, when the temple has one */
  shop?: string;
  /** The temple's trap, kept for the plan's shape: no converted cell is a trap today */
  trap: [string, number];
  /** A riddle of RoomInteractions (`generic` when the temple has none of its own) */
  puzzle: string;
  /** The must-clear chores in priority order (see the top of this file) */
  mustClear: PlanQuest[];
  /** One per mini-boss room, nearest the entrance first */
  minibosses: PlanQuest[];
  boss: PlanQuest;
}

export const CLASSIC_PLANS: Record<string, ClassicPlan> = {
  // The Tower of Hera: bedroom and clutter chores. Three starters (bed, shoes, toys), then the rest of today's plan.
  "storm-temple": {
    name: "Storm Temple",
    theme: "clouds",
    element: "storm",
    relic: "Lightning Rod",
    trap: ["lightning", 6],
    puzzle: "generic",
    mustClear: [["bed-basilisk", 1, "daily am"], ["shoe-shrew", 1, "daily"], ["toybox-troll", 2, "daily"], ["mess-hog", 2, "daily"], ["piece-poltergeist", 2, "weekly"]],
    minibosses: [["under-bed-bogey", 5, "weekly"]],
    boss: ["clutter-chimera", 8, "weekly"],
  },
  // Skull Woods: yard and pet chores. Five must-clear rooms take today's five beasts, every one a starter fill (Feed
  // the Loyal Familiar finds the Kibble Kobold through the library); the Leaf Lion guards the Big Key room.
  "earth-temple": {
    name: "Earth Temple",
    theme: "forest",
    element: "earth",
    relic: "Gaia's Hammer",
    shop: "EarthquakeScroll",
    trap: ["rockfall", 7],
    puzzle: "stonePillars",
    mustClear: [["kibble-kobold", 1, "daily am"], ["droop-dryad", 1, "weekly"], ["zoomie-zephyr", 2, "daily"], ["plop-golem", 2, "weekly"], ["weed-wyrm", 2, "weekly"]],
    minibosses: [["leaf-lion", 5, "weekly"]],
    boss: ["meadow-minotaur", 8, "weekly"],
  },
};

export const CLASSIC_IDS = Object.keys(CLASSIC_PLANS);

/** Where the converter writes the dungeons, from the repo root (the script and jest both run there) */
export const DUNGEON_DIR = "tools/temples/classic/dungeons";

/** The converted dungeon of a temple, as convert.py wrote it */
export const loadDungeon = (id: string): ClassicDungeon => JSON.parse(readFileSync(join(process.cwd(), DUNGEON_DIR, `${id}.json`), "utf8")) as ClassicDungeon;
