/**
 * The chore plan of each classic temple: the theme's beasts the dress step deals out to the rooms of the converted
 * dungeon (tools/temples/classic/dungeons/<id>.json), with the temple's relic, riddle and trap. One entry per shipped
 * temple: eight follow an LTTP palace, the Wind Temple Zelda 1's Eagle with the owner's own east rooms.
 *
 * `mustClear` lists the candidates for the must-clear monster rooms in priority order: the beasts of today's starter
 * quests first (STARTER_QUESTS, so a family's first chores fill rooms at once), then the rest of the theme. A dungeon
 * takes as many as it has must-clear rooms; a starter beyond that count gets a side room of its own (classicReport's
 * `overflow`), any other extra leaves the temple (`left`) unless the plan keeps every chore, and a plan shorter than
 * the count repeats (`repeats`).
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { ClassicCell, ClassicDungeon } from "./classicDungeon";
import type { CellRef } from "./dressBoard";
import type { PlanQuest } from "../questPlan";

/**
 * A room the plan draws onto the dungeon itself, in the converter's own schema (a cell and the floor it stands on): the
 * dress step reads it as one more cell of that floor (withHandRooms), so it is dressed by the same rules. The Wind
 * Temple keeps the owner's four east rooms so, his way to his Boss Key, which Zelda's Eagle does not have.
 */
export interface HandRoom extends ClassicCell {
  floor: string;
}

export interface ClassicPlan {
  /** "Storm Temple": the name the Temple Creator lists the temple under */
  name: string;
  /** The world the temple stands in (the registry's `world`): the theme written on its monster rooms */
  theme: string;
  element: string;
  /** What the Big Chest holds: the temple's relic */
  relic: string;
  /**
   * The temple's relics beyond the first (a dungeon has one Big Chest): in order, each in place of the gold of the
   * dungeon's `other` chest nearest the entrance by path distance (every door open), the next for the next
   */
  extraRelics?: string[];
  /** What the shop (the first empty cell from the entrance) stocks, when the temple has one */
  shop?: string;
  /** The temple's trap, kept for the plan's shape: no converted cell is a trap today */
  trap: [string, number];
  /** A riddle of RoomInteractions (`generic` when the temple has none of its own) */
  puzzle: string;
  /** The must-clear chores in priority order (see the top of this file) */
  mustClear: PlanQuest[];
  /** One per mini-boss room: dealt easiest first in path order from the entrance, as the must-clear chores are */
  minibosses: PlanQuest[];
  /**
   * The LTTP rooms that hold mini-bosses whatever the design's rule finds, taken first (the rule fills the rest of
   * `minibosses`): the room that keeps the Boss Key out of reach when the rule's choice does not (the solver's R4), or
   * one whose mini-boss the converter could not read (GT's Lanmolas count as the Quad Pot's enemies, the Ice Armos room
   * reads none). A named room seals on entry; with no enemies it fights in its screen that holds the Big Key (which
   * then waits behind the fight), else in its first screen.
   */
  minibossRooms?: string[];
  boss: PlanQuest;
  /** Rooms of the temple's own beyond the dungeon's (HandRoom), each where the dungeon has no cell */
  handRooms?: HandRoom[];
  /**
   * The converted cell the shop stands in, by its own position, when the dungeon names a room for it (the Eagle's old
   * man's room), wherever it lies; without it the shop takes the first empty cell the hero reaches with nothing in hand
   */
  shopAt?: CellRef;
  /**
   * A side fight that shares its cell with a plain chest (a map, a compass, a key, gold) keeps the cell and hands the
   * chest out once won, as Zelda 1 leaves an item in the room its enemies stand in; without it the chest keeps the cell
   * and the fight moves
   */
  guardedChests?: boolean;
  /**
   * Every chore of `mustClear` the must-clear rooms leave takes a side room of its own, nearest the entrance first,
   * starter or not (`overflow`); without it only a starter does and the rest leave (`left`)
   */
  keepsEveryChore?: boolean;
}

/** Every side a door, as the owner drew his east rooms in the Temple Creator */
const OPEN_ALL_ROUND: ClassicCell["sides"] = { north: "open", east: "open", south: "open", west: "open" };

/**
 * The owner's four east rooms of the Wind Temple (src/lib/engine/temples/wind-temple.ts at 61d7b718), kept as he drew
 * them, every side a door: his Boss Key chest (L0503), the key room (M0404), the Cobweb Widow's mini-boss room (m0504)
 * and his circle (T0505). Zelda's Eagle has no Big Key: his is the temple's Boss Key. His circle rides to the bow's
 * basement, as the Eagle's stairway at (0,1) does, so the dressing adds it a circle there beside the Wind Whistle.
 */
const WIND_EAST_ROOMS: HandRoom[] = [
  { floor: "1F", row: 3, col: 5, room: "Owner's Boss Key Room", sides: OPEN_ALL_ROUND, enemies: 0, chest: "big-key" },
  { floor: "1F", row: 4, col: 4, room: "Owner's Key Room", sides: OPEN_ALL_ROUND, enemies: 0, potKey: true },
  { floor: "1F", row: 4, col: 5, room: "Owner's Mini-boss Room", sides: OPEN_ALL_ROUND, enemies: 1 },
  { floor: "1F", row: 5, col: 5, room: "Owner's Circle", sides: OPEN_ALL_ROUND, enemies: 0, teleport: { to: "B1", row: 0, col: 0 } },
];

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
  // The Desert Palace: school chores. Five must-clear rooms take today's five beasts, the starter (the backpack) first;
  // the Homework Hydra guards the Big Key in the Compass Room, the Pop Quiz Poltergeist waits upstairs.
  "light-temple": {
    name: "Light Temple",
    theme: "desert",
    element: "light",
    relic: "Dawnbreaker Bow",
    shop: "LuminousOrb",
    trap: ["blindingFlash", 4],
    puzzle: "prismAlignment",
    mustClear: [["backpack-boggart", 1, "school bed"], ["paperwork-pixie", 1, "school"], ["bookwyrm", 2, "daily"], ["sum-sphinx", 2, "school"], ["desk-drake", 2, "weekly"]],
    minibosses: [["homework-hydra", 5, "school"]],
    boss: ["pop-quiz-poltergeist", 8, "weekly"],
  },
  // The Swamp Palace: bathroom chores. Three must-clear rooms take today's three easiest beasts (no starter quest has
  // a water beast); the rest of today's plan leaves. No sealed room stands before the Big Key, so the Drain Drake takes
  // Trench 2 Blocks, the one fight in front of its alcove; the Potty Poltergeist waits at the top of the palace.
  "water-temple": {
    name: "Water Temple",
    theme: "islands",
    element: "water",
    relic: "Trident of Tides",
    shop: "WaterBreathingPotion",
    trap: ["whirlpool", 5],
    puzzle: "waterLevels",
    mustClear: [["soggy-slug", 1, "daily"], ["bare-roll-imp", 1, "daily"], ["toothpaste-serpent", 2, "daily bed"], ["puddle-phantom", 2, "daily"], ["smudge-specter", 2, "weekly"]],
    minibosses: [["drain-drake", 5, "weekly"]],
    minibossRooms: ["Swamp Trench 2 Blocks"],
    boss: ["potty-poltergeist", 8, "weekly"],
  },
  // The Palace of Darkness (the swamps keep it; Misery Mire was offered and not chosen): kitchen chores. Five must-clear
  // rooms take today's four starters (set and clear the table, the crumbs, the dishwasher), then the Mug Thug; the
  // rest leave. The Arena before the Big Chest leaves the Big Key in reach, so the Stickyfoot Slime takes the Middle
  // Cage, the one sealed room it lies behind; the Grease Gorgon waits in the basement.
  "shadow-temple": {
    name: "Shadow Temple",
    theme: "swamps",
    element: "shadow",
    relic: "Void Dagger",
    shop: "ShadowVeil",
    trap: ["voidTrap", 8],
    puzzle: "shadowReflection",
    mustClear: [
      ["plate-pixie", 1, "daily"],
      ["gravy-ghoul", 1, "daily"],
      ["crumb-gremlin", 1, "daily"],
      ["dish-goblin", 2, "daily"],
      ["mug-thug", 1, "daily"],
      ["cupboard-kobold", 2, "daily am"],
      ["garbage-gargoyle", 2, "weekly"],
    ],
    minibosses: [["stickyfoot-slime", 5, "weekly"]],
    minibossRooms: ["PoD Middle Cage"],
    boss: ["grease-gorgon", 8, "weekly"],
  },
  // The Ice Palace: laundry and cold-store chores. Thirteen must-clear rooms for nine ice beasts: today's three (the
  // socks starter first), then the other six of the theme, the first four repeating. The Pengator Switch before the Big
  // Key leaves it in reach (its stairs come up from B2), so the Leftover Lich takes the Floor Switch, the sealed room
  // the Big Key lies behind; the Laundry Lurker waits at the bottom of the palace.
  "ice-temple": {
    name: "Ice Temple",
    theme: "ice",
    element: "ice",
    relic: "Frost Wand",
    shop: "FrostResistPotion",
    trap: ["iceSpikes", 6],
    puzzle: "mirrorIce",
    mustClear: [
      ["socktopus", 2, "weekly"],
      ["hamper-hound", 1, "daily bed"],
      ["wrinkle-wyvern", 2, "weekly"],
      ["wardrobe-wraith", 1, "daily"],
      ["lint-lizard", 1, "weekly"],
      ["pantry-phantom", 1, "weekly"],
      ["bedsheet-banshee", 2, "weekly"],
      ["freezer-yeti", 2, "weekly"],
      ["slush-golem", 2, "weekly"],
    ],
    minibosses: [["leftover-lich", 5, "weekly"]],
    minibossRooms: ["Ice Floor Switch"],
    boss: ["laundry-lurker", 13, "weekly"],
  },
  // Turtle Rock: kitchen-fire and garage chores. Seven must-clear rooms for the five fire beasts left once the mini-boss
  // and the boss have theirs: today's two starters (breakfast, cooking), today's other two, then the car; the first two
  // repeat. The Big Key lies at a crossroads of the Lava Dual Pipes that no set of fights closes off (the solver's R4),
  // so the Grime Griffin fights in that room's Big Key screen and the Boss Key waits behind it; the Junkpile Jotun (13)
  // waits at the bottom of the rock.
  "fire-temple": {
    name: "Fire Temple",
    theme: "mountains",
    element: "fire",
    relic: "Flame Shield",
    shop: "FireResistPotion",
    trap: ["fire", 5],
    puzzle: "fireSequence",
    mustClear: [["hangry-hob", 1, "daily am"], ["simmer-salamander", 2, "weekly"], ["snack-snatcher", 2, "daily"], ["cardboard-golem", 2, "weekly"], ["backseat-beastie", 2, "weekly"]],
    minibosses: [["grime-griffin", 5, "weekly"]],
    minibossRooms: ["TR Lava Dual Pipes"],
    boss: ["junkpile-jotun", 13, "monthly"],
  },
  // Ganon's Tower: morning and bedtime habits. Its many must-clear rooms take the seven moon beasts the mini-bosses and
  // the boss leave, today's six (every one a starter) then the vitamins, each repeating. Two mini-bosses: the Quad Pot,
  // whose enemies are GT's Lanmolas, and the Ice Armos, the shutter room in front of the Big Key (LTTP's Armos refight,
  // which the converter reads no enemies in); the nearer, the Ice Armos, gets the easier. One Big Chest: it holds the
  // Lunar Pendant, and the Moon Shard takes the gold chest nearest the entrance.
  "moon-temple": {
    name: "Moon Temple",
    theme: "moon",
    element: "moon",
    relic: "Lunar Pendant",
    extraRelics: ["Moon Shard"],
    trap: ["moonquake", 5],
    puzzle: "generic",
    mustClear: [
      ["fang-fairy", 2, "daily am+night"],
      ["scroll-troll", 2, "daily bed"],
      ["snooze-sloth", 2, "daily am"],
      ["pajama-pooka", 1, "daily am"],
      ["grubgoblin", 1, "daily"],
      ["hairball-harpy", 1, "daily am"],
      ["sniffle-sprite", 1, "daily am"],
    ],
    minibosses: [["stinkwisp", 5, "daily"], ["glowleech", 3, "daily bed"]],
    minibossRooms: ["GT Quad Pot", "GT Ice Armos"],
    boss: ["night-owlbear", 8, "daily bed"],
  },
  // Zelda 1's Level 1, the Eagle, with the owner's four east rooms (WIND_EAST_ROOMS): quick, easy chores, today's nine.
  // His way to his Boss Key: the Eagle's key drops open its locked doors up to the push-block steps at (0,1), whose
  // circle rides down to the Wind Whistle in the bow's basement; a second circle there rides on to his circle at (5,5),
  // past the Cobweb Widow. Five must-clear rooms (the Eagle's key drops but the one before the boss door) take five
  // chores, the Spill Sprite the side room behind the entrance's locked door, where it stood (keepsEveryChore); the
  // Dust Bunny King fights in the key room before the boss door, the Fluffalo waits behind it. The old man's room is
  // the shop (sells Bombs, as today); the side fights stand over the map, the compass and the boomerang's gold.
  "wind-temple": {
    name: "Wind Temple",
    theme: "plains",
    element: "wind",
    relic: "Wind Whistle",
    trap: ["gust", 4],
    puzzle: "generic",
    mustClear: [
      ["cushion-croc", 1, "daily"],
      ["mustwisp", 1, "daily am"],
      ["mailbox-mimic", 1, "daily"],
      ["gravel-gnome", 2, "weekly"],
      ["crumb-crawler", 2, "daily"],
      ["spill-sprite", 1, "daily"],
    ],
    minibosses: [["dust-bunny-king", 3, "weekly"], ["cobweb-widow", 3, "weekly"]],
    minibossRooms: ["Eagle (2,4)", "Owner's Mini-boss Room"],
    boss: ["fluffalo", 8, "weekly"],
    handRooms: WIND_EAST_ROOMS,
    shopAt: { floor: "1F", row: 2, col: 0 },
    guardedChests: true,
    keepsEveryChore: true,
  },
};

export const CLASSIC_IDS = Object.keys(CLASSIC_PLANS);

/** Where the converter writes the dungeons, from the repo root (the script and jest both run there) */
export const DUNGEON_DIR = "tools/temples/classic/dungeons";

/** The converted dungeon of a temple, as convert.py wrote it */
export const loadDungeon = (id: string): ClassicDungeon => JSON.parse(readFileSync(join(process.cwd(), DUNGEON_DIR, `${id}.json`), "utf8")) as ClassicDungeon;

/** A cell that hands out a small key: a key chest, a key drop, a key in the pots */
const isSmallKeyCell = (cell: ClassicCell): boolean => cell.chest === "small-key" || cell.keyDrop === "small" || Boolean(cell.potKey);

/**
 * The dungeon the dress step reads: the converter's, with the plan's own rooms (`handRooms`) added to their floors, each
 * floor grown to hold them, and the report counting them. A copy: the converter's dungeon is left as it was, and comes
 * back itself when the plan draws none. A hand room on a converted cell, or on a floor the dungeon lacks, throws.
 */
export const withHandRooms = (dungeon: ClassicDungeon, plan: Pick<ClassicPlan, "handRooms">): ClassicDungeon => {
  const hand = plan.handRooms ?? [];
  const isDrawnAsIs = hand.length === 0;
  if (isDrawnAsIs) return dungeon;
  const floors = dungeon.floors.map((level) => ({ ...level, cells: [...level.cells] }));
  for (const { floor, ...cell } of hand) {
    const level = floors.find((entry) => entry.name === floor);
    if (!level) throw new Error(`${dungeon.id}: the hand room ${cell.room} names the floor ${floor}, which the dungeon does not have`);
    const isOnACell = level.cells.some((other) => other.row === cell.row && other.col === cell.col);
    if (isOnACell) throw new Error(`${dungeon.id}: the hand room ${cell.room} stands on the converted cell ${floor} (${cell.row},${cell.col})`);
    level.cells.push(cell);
    level.rows = Math.max(level.rows, cell.row + 1);
    level.cols = Math.max(level.cols, cell.col + 1);
  }
  const cellsPerFloor = Object.fromEntries(floors.map((level) => [level.name, level.cells.length]));
  const smallKeys = dungeon.report.smallKeys + hand.filter(isSmallKeyCell).length;
  return { ...dungeon, floors, report: { ...dungeon.report, cellsPerFloor, smallKeys } };
};
