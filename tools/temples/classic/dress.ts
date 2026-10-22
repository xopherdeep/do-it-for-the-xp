/**
 * The dress step: a converted classic dungeon (tools/temples/classic/dungeons/<id>.json, written by convert.py) as a
 * playable temple module of ours, src/lib/engine/temples/<id>.ts, under the game's rules and the temple's chore plan
 * (dressPlans.ts). Design: docs/superpowers/specs/2026-10-18-classic-dungeon-temples-design.md, "Dressing".
 *
 *   node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild tools/temples/classic/dress.ts \
 *     --bundle --platform=node --format=cjs --outfile=/tmp/dress-temples.cjs && node /tmp/dress-temples.cjs [id]
 *
 * (esbuild reads the "@/" paths from tsconfig.json; use the esbuild version that sits in node_modules/.pnpm.)
 *
 * The same JSON and plan give the same temple, so the module's header is enough to rebuild it. To change a temple,
 * change its plan (or the converter's overrides) and run the script; `chemx test tests/unit/ClassicTemples.spec.ts`
 * then says whether the new layout still keeps every rule.
 *
 * The steps, each in its own module: the board (dressBoard: one thing per cell, the rest moved, the Master Room beside
 * the boss), the doors (dressDoors: the side table, the Boss door, Bomb chests before cracked walls on the only way),
 * the chores (dressChores: mini-bosses, must-clear monsters, side rooms), the rooms (dressRooms: tokens, content, the
 * maze), and here the extras in the empty cells and the module itself.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { GeneratedTemple } from "@/lib/engine/dungeons/generator/templeGenerator";
import { buildTempleGraph, reachableFrom, type TempleGraph, type TempleLayout } from "@/lib/engine/dungeons/generator/templeGraph";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { renderModule } from "../renderModule";
import type { ClassicDungeon } from "./classicDungeon";
import { allSlots, buildBoard, openNear, type Board, type CellRef, type ClassicCompaction, type ClassicDrop, type ClassicMove, type FloorShift } from "./dressBoard";
import { planChores } from "./dressChores";
import { demoteShortcutWarps, drawSides, hopsFrom, placeBombChests, plainBigKeyDoors, sidesKey, type PlainBigKeyDoor } from "./dressDoors";
import { CLASSIC_IDS, CLASSIC_PLANS, DUNGEON_DIR, loadDungeon, type ClassicPlan } from "./dressPlans";
import { buildRooms, type ClassicPlacement } from "./dressRooms";

export { CLASSIC_IDS, CLASSIC_PLANS, loadDungeon };
export type { ClassicPlan, ClassicPlacement, ClassicMove, ClassicDrop, ClassicCompaction, FloorShift, PlainBigKeyDoor, CellRef };

/** What the dressing did with a dungeon, for the tests and the build report */
export interface ClassicReport {
  /** Must-clear monster rooms (mini-bosses not counted) */
  mustClear: number;
  /** Beasts a must-clear room had to repeat */
  repeats: string[];
  /** Starter beasts given a side room because the must-clear rooms ran out */
  overflow: string[];
  /** Plan beasts that found no room */
  left: string[];
  /** Content that left the cell it was converted in, and where it went */
  moves: ClassicMove[];
  /** Content with nowhere to go (a riddle, a hole or a circle displaced from its cell) */
  dropped: ClassicDrop[];
  /** Enemies of a screen folded into their LTTP room's one fight */
  merged: ClassicDrop[];
  /** Where a Bomb waits before a cracked wall on the only way to the boss */
  bombChests: CellRef[];
  /** Island cells (walled on every side, reached by a link) moved from far off next to their floor's used cells */
  compacted: ClassicCompaction[];
  /** Floors whose cells all moved up and left once their empty leading rows and columns were cut */
  shifted: FloorShift[];
  /** Big-Key doors LTTP keyed between two ordinary rooms, drawn as plain doors */
  plainBigKeyDoors: PlainBigKeyDoor[];
  /** Every room of the temple, what it is and where it came from */
  placements: ClassicPlacement[];
}

export interface DressedTemple {
  temple: GeneratedTemple;
  report: ClassicReport;
}

/** The layout as registration reads it: the drawn sides become locks and barriers, which is what the graph walks */
const asRegistered = (layout: { entrance: number[]; maze: Record<string, string[][]>; rooms: Record<string, Room> }): TempleLayout => ({
  entrance: layout.entrance,
  maze: layout.maze,
  rooms: Object.fromEntries(Object.entries(layout.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
});

/**
 * The shop: on the entrance floor, in the empty converted cell nearest the entrance that the hero reaches without
 * passing a must-clear seal (the sealed fights and the boss blocked); with none, a room added beside the entrance. So
 * every temple sells Bombs and potions before its first fight.
 */
const placeShop = (board: Board, graph: TempleGraph, hops: Map<string, number>): void => {
  const entrance = allSlots(board).find((slot) => slot.item?.kind === "entrance");
  if (!entrance) throw new Error(`${board.dungeon.id}: no entrance cell`);
  const sealed = new Set(allSlots(board).filter((slot) => slot.item?.kind === "mustClearFight" || slot.item?.kind === "boss").map((slot) => sidesKey(slot.at)));
  const beforeAnySeal = new Set(graph.entrance ? reachableFrom(graph, graph.entrance, sealed) : []);
  const far = Number.MAX_SAFE_INTEGER;
  const free = allSlots(board)
    .filter((slot) => slot.cell && !slot.item && slot.at.floor === entrance.at.floor && beforeAnySeal.has(sidesKey(slot.at)))
    .sort((a, b) => (hops.get(sidesKey(a.at)) ?? far) - (hops.get(sidesKey(b.at)) ?? far) || a.at.row - b.at.row || a.at.col - b.at.col);
  const shop = free[0] ?? openNear(board, entrance);
  shop.item = { kind: "shop", origin: shop.at, room: shop.cell?.room ?? "" };
  const isAdded = !shop.cell;
  if (isAdded) board.moves.push({ what: "shop", from: entrance.at, to: shop.at, grown: true });
};

/**
 * The extras in the empty converted cells, nearest the entrance first (path distance over every door, floors in the
 * dungeon's order then reading order among equals): the shop (placeShop), one save, then one camp per floor, the rest
 * empty rooms. A dungeon with no empty cell at all (the Tower of Hera) has the shop added beside its entrance and no
 * save or camp.
 */
const placeExtras = (board: Board, plan: ClassicPlan): void => {
  const sides = drawSides(board);
  const graph = buildTempleGraph(asRegistered(buildRooms(board, plan, sides)));
  const hops = graph.entrance ? hopsFrom(graph, graph.entrance) : new Map<string, number>();
  placeShop(board, graph, hops);
  const floors = board.floors.map((floor) => floor.name);
  const far = Number.MAX_SAFE_INTEGER;
  const free = allSlots(board)
    .filter((slot) => slot.cell && !slot.item)
    .sort((a, b) => (hops.get(sidesKey(a.at)) ?? far) - (hops.get(sidesKey(b.at)) ?? far) || floors.indexOf(a.at.floor) - floors.indexOf(b.at.floor) || a.at.row - b.at.row || a.at.col - b.at.col);
  const kinds: Array<"save"> = ["save"];
  const camped = new Set<string>();
  for (const slot of free) {
    const next = kinds.shift();
    const kind = next ?? (camped.has(slot.at.floor) ? "empty" : "camp");
    const isCamp = kind === "camp";
    if (isCamp) camped.add(slot.at.floor);
    slot.item = { kind, origin: slot.at, room: slot.cell!.room };
  }
};

/** A converted dungeon as a temple of ours, under `plan`. Pure: the same dungeon and plan give the same temple. */
export const dressDungeon = (dungeon: ClassicDungeon, plan: ClassicPlan): DressedTemple => {
  const board = buildBoard(dungeon);
  demoteShortcutWarps(board, () => asRegistered(buildRooms(board, plan, drawSides(board))));
  const provisional = buildRooms(board, plan, drawSides(board));
  const chores = planChores(board, plan, buildTempleGraph(asRegistered(provisional)), drawSides(board));
  const bombChests = placeBombChests(board, () => asRegistered(buildRooms(board, plan, drawSides(board), chores.roles)));
  placeExtras(board, plan);
  const built = buildRooms(board, plan, drawSides(board), chores.roles);
  const temple: GeneratedTemple = {
    id: dungeon.id,
    name: plan.name,
    entrance: built.entrance,
    maze: built.maze,
    rooms: built.rooms,
    visitedPositions: new Set<string>(),
    seed: dungeon.id,
    themeId: plan.theme,
    element: plan.element,
    criticalPath: [],
    attempts: 1,
  };
  const report: ClassicReport = {
    mustClear: chores.mustClear,
    repeats: chores.repeats,
    overflow: chores.overflow,
    left: chores.left,
    moves: board.moves,
    dropped: board.dropped,
    merged: board.merged,
    bombChests,
    compacted: board.compacted,
    shifted: board.shifted,
    plainBigKeyDoors: plainBigKeyDoors(board),
    placements: built.placements,
  };
  return { temple, report };
};

const planOf = (id: string): ClassicPlan => {
  const plan = CLASSIC_PLANS[id];
  if (!plan) throw new Error(`${id} has no classic plan (dressPlans.ts)`);
  return plan;
};

/** The temple of a classic dungeon, dressed under its plan */
export const dressClassic = (id: string): GeneratedTemple => dressDungeon(loadDungeon(id), planOf(id)).temple;

/** What the dressing did with a classic dungeon */
export const classicReport = (id: string): ClassicReport => dressDungeon(loadDungeon(id), planOf(id)).report;

/** The temple as a module in the shape wind-temple.ts has, under a header naming the dress step and the dungeon's source */
export const renderClassicModule = (id: string, temple: GeneratedTemple): string =>
  renderModule(id, temple, [
    `// Generated by tools/temples/classic/dress.ts from ${DUNGEON_DIR}/${id}.json: change the plan there or the JSON and run it again instead of editing this file.`,
    `// source: ${JSON.stringify(loadDungeon(id).source)}`,
    "// Floors run bottom to top (a basement first); every flight of stairs and every circle names the floor and the cell it lands on.",
    '// "_" is a wall; each other token is one room. The Master Room holds the Pegasus chest and sits right behind the boss.',
  ]);

const isRunDirectly = require.main === module;
if (isRunDirectly) {
  // The plan's starters come from StarterWorld, which pulls the app's browser stores along; their init fails under
  // node after the modules load and has nothing to do with the dressing, which is synchronous. Anything else is real.
  process.on("unhandledRejection", (reason) => {
    const isBrowserStorageInit = /No available storage method/.test(String(reason));
    if (!isBrowserStorageInit) throw reason;
  });
  const folder = join(process.cwd(), "src/lib/engine/temples");
  const asked = process.argv.slice(2);
  const ids = asked.length ? asked : CLASSIC_IDS;
  for (const id of ids) {
    const { temple, report } = dressDungeon(loadDungeon(id), planOf(id));
    writeFileSync(join(folder, `${id}.ts`), renderClassicModule(id, temple));
    const floors = Object.keys(temple.maze);
    console.log(`${id}: ${floors.length} floors, ${Object.keys(temple.rooms).length - 1} rooms, ${report.mustClear} must-clear, ${report.moves.length} moved, ${report.dropped.length} dropped, ${report.bombChests.length} Bomb chests`);
    const hasNotes = report.repeats.length || report.overflow.length || report.left.length;
    if (hasNotes) console.log(`  repeats: [${report.repeats}] overflow: [${report.overflow}] left: [${report.left}]`);
  }
}
