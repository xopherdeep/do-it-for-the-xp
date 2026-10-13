/**
 * The Old House written as a temple layout: every placed cell of the plan becomes the room the temple screen knows,
 * on floors of tokens with a rooms table, the way the seeded generator writes its temples.
 *
 * Pure: no storage, no Vue. Each room gets a token of its own (its type's letter and a counter, in reading order), so
 * a lock on one room never locks another. The door into the locked wing is locked on the room the wing was placed
 * beside, a flight of stairs names the floor and the cell of its twin, and the hero comes in on the porch.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { DIRECTIONS, STEP, type Direction } from "@/lib/engine/dungeons/generator";
import { $__$, ____, CAMP, H__P, K___, MK__, Q__Q, SAVE, ST_D, ST_U, X__X, _00_, q__q, x__x } from "@/lib/engine/dungeons/roomTypes";
import type { HouseCell, HouseCellKind } from "./houseRooms";
import type { HousePlan, PlacedCell } from "./housePlanner";

/** The layout a temple record keeps: the entrance as [floor index, row, col], a grid per floor, the rooms table */
export interface HouseLayout {
  entrance: number[];
  maze: Record<string, string[][]>;
  rooms: Record<string, Room>;
}

/** What the camp and the heal room give back */
const HEAL_POINTS = 15;

/** The cells that seal on entry; a sealed room holds one quest, since a second would throw the hero straight back in */
const SEALED: ReadonlySet<HouseCellKind> = new Set(["guard", "boss"]);

/** The quests a cell's room holds: all of them in an open room, the first alone in a sealed one */
export const heldQuestIds = (cell: HouseCell): string[] => (SEALED.has(cell.kind) ? cell.questIds.slice(0, 1) : [...cell.questIds]);

/** The difficulty of the biggest quest in the list: what sizes the room and sets its tier */
export const biggestDifficulty = (questIds: readonly string[], quests: ReadonlyMap<string, Achievement>): number =>
  Math.max(0, ...questIds.map((id) => Number(quests.get(id)?.difficulty) || 0));

/** A room as it is written: the letter its token starts with, and the room itself */
interface Written {
  char: string;
  room: Room;
}

/** What a cell's room needs beyond the cell: the size of its biggest quest, and the stairs it stands over or under */
interface Context {
  biggest: number;
  twin?: PlacedCell;
}

/** A room of this type that carries the cell's name, so the screen can say where in the house the hero stands */
const named = (char: string, type: string, cell: HouseCell, content: RoomContent = {}, extra: Partial<Room> = {}): Written => ({
  char,
  room: { type, ...extra, content: { name: cell.name, ...content } },
});

const dungeonChest = (char: string, dungeon: string) => (cell: HouseCell): Written => named(char, "loot", cell, { chest: "dungeon", dungeon });

/** Stairs land on their twin: the floor it is on and its cell, so the screen never guesses */
const stairs = (char: string, type: string) => (cell: HouseCell, { twin }: Context): Written =>
  named(char, type, cell, twin ? { targetLevel: twin.cell.floor, targetCoords: { x: twin.col, y: twin.row } } : {});

/** Each kind of cell as the room it is written as */
const WRITERS: Record<HouseCellKind, (cell: HouseCell, context: Context) => Written> = {
  entrance: (cell) => named(_00_, "entrance", cell, {}, { visited: true }),
  quest: (cell, { biggest }) => {
    const isEasy = biggest <= 1;
    return named(isEasy ? q__q : Q__Q, "monster", cell, { questIds: heldQuestIds(cell), difficulty: isEasy ? "easy" : "normal" });
  },
  guard: (cell) => named(x__x, "miniboss", cell, { questIds: heldQuestIds(cell), difficulty: "hard", lockOnEnter: true }),
  boss: (cell) =>
    named(X__X, "boss", cell, { questIds: heldQuestIds(cell), difficulty: "boss", lockOnEnter: true }, { locked: { master: true } }),
  master: (cell) => named($__$, "master", cell, { chest: "dungeon", dungeon: "Pegasus", pegasus: true }),
  masterKey: dungeonChest(MK__, "master-key"),
  key: dungeonChest(K___, "key"),
  map: dungeonChest($__$, "map"),
  compass: dungeonChest($__$, "compass"),
  camp: (cell) => named(CAMP, "camp", cell, { healthPoints: HEAL_POINTS }),
  heal: (cell) => named(H__P, "health", cell, { healthPoints: HEAL_POINTS }),
  save: (cell) => named(SAVE, "save", cell),
  stairsUp: stairs(ST_U, "stairs-up"),
  stairsDown: stairs(ST_D, "stairs-down"),
  loot: (cell) => named($__$, "loot", cell, { chest: "consumable", items: ["potion"] }),
};

/** The side of one cell that faces the other, for two cells side by side on a floor */
const sideFacing = (from: PlacedCell, to: PlacedCell): Direction | undefined =>
  DIRECTIONS.find((direction) => from.row + STEP[direction][0] === to.row && from.col + STEP[direction][1] === to.col);

/** Every flight of stairs by its cell id, paired with the one it stands over or under */
const twinsOf = (cells: readonly PlacedCell[]): Map<string, PlacedCell> => {
  const byId = new Map(cells.map((placed) => [placed.cell.id, placed]));
  const twins = new Map<string, PlacedCell>();
  for (const placed of cells) {
    const twin = placed.cell.twinOf ? byId.get(placed.cell.twinOf) : undefined;
    if (!twin) continue;
    twins.set(placed.cell.id, twin);
    twins.set(twin.cell.id, placed);
  }
  return twins;
};

/**
 * The layout of a planned house: each floor of the plan as a grid of the plan's size (the same frame on every floor,
 * so stairs keep their cell), its rooms named in reading order, floor by floor, and the porch as the entrance.
 */
export function houseLayout(plan: HousePlan, quests: ReadonlyMap<string, Achievement>): HouseLayout {
  const byId = new Map(plan.cells.map((placed) => [placed.cell.id, placed]));
  const twins = twinsOf(plan.cells);
  const written = new Map(
    plan.cells.map((placed) => {
      const context: Context = { biggest: biggestDifficulty(heldQuestIds(placed.cell), quests), twin: twins.get(placed.cell.id) };
      return [placed.cell.id, WRITERS[placed.cell.kind](placed.cell, context)];
    }),
  );

  // The wing's one door is locked on the side of the room it was placed beside (not always its first parent)
  for (const wing of plan.cells.filter((placed) => placed.cell.lockedFromParent)) {
    const beside = wing.via ? byId.get(wing.via) : undefined;
    const side = beside ? sideFacing(beside, wing) : undefined;
    if (!beside || !side) continue;
    const room = written.get(beside.cell.id)!.room;
    room.locked = { ...room.locked, [side]: true };
  }

  const counters = new Map<string, number>();
  const rooms: Record<string, Room> = { [____]: { type: "wall" } };
  const maze: Record<string, string[][]> = {};
  for (const floor of plan.floors) {
    const grid = Array.from({ length: plan.rows }, () => Array.from({ length: plan.cols }, () => ____));
    const onFloor = plan.cells.filter((placed) => placed.cell.floor === floor).sort((a, b) => a.row - b.row || a.col - b.col);
    for (const placed of onFloor) {
      const { char, room } = written.get(placed.cell.id)!;
      const count = (counters.get(char) ?? 0) + 1;
      counters.set(char, count);
      const token = `${char}${String(count).padStart(3, "0")}`;
      rooms[token] = room;
      grid[placed.row][placed.col] = token;
    }
    maze[floor] = grid;
  }

  const porch = plan.cells.find((placed) => placed.cell.kind === "entrance");
  const entrance = porch ? [plan.floors.indexOf(porch.cell.floor), porch.row, porch.col] : [];
  return { entrance, maze, rooms };
}
