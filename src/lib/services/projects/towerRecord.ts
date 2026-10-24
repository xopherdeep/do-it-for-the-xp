/**
 * A project tower written as a temple layout: the planned cells of every floor become the rooms the temple screen
 * knows, on floors of tokens with a rooms table, the way the Old House and the seeded generator write theirs.
 *
 * Pure: no storage, no Vue, no quests. Floors are keyed "1F" up to the roof, the next number above the last phase, so
 * the climbing order (floorOrder) puts the roof on top. Each room gets a token of its own (its type's letter and a
 * three-digit counter, in reading order, floor by floor). Every floor's cells stand on one shared frame, so a flight of
 * stairs keeps its row and column: the stairs up name the next floor and its arrival, the arrival names the stairs.
 *
 * The rooms follow the Old House's rules, stacked: every chore room is an open monster room with its biggest chore's
 * tier in `difficulty`; a floor's boss is an open monster room marked "boss", except the last phase's, which is the one
 * sealed mini-boss and drops the Boss Key; the roof's finale is the one boss room, behind the Boss Key door, and the
 * Trophy (the Pegasus chamber) waits behind it. The stairs up wait for their floor to be cleared.
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { $__$, ____, Q__Q, ST_D, ST_U, X__X, _00_, q__q, x__x } from "@/lib/engine/dungeons/roomTypes";
import { BOSS_KEY_ID } from "@/lib/services/temples/roomGrants";
import { questTier, type QuestTier } from "@/lib/services/temples/questRooms";

/** Floors 1F to `${phaseCount}F`, one per phase, then the roof */
export const towerFloorKeys = (phaseCount: number): string[] => Array.from({ length: phaseCount + 1 }, (_, index) => `${index + 1}F`);

/** The roof: the next numbered floor above the last phase, so it climbs on top */
export const roofFloorKey = (phaseCount: number): string => `${phaseCount + 1}F`;

/**
 * What a cell is in the tower: the way in, an arrival up the stairs, a room of chores, a floor's boss, the last phase's
 * boss with the Boss Key, the stairs up, the finale, the Trophy.
 */
export type TowerRole = "entrance" | "arrival" | "chores" | "floorBoss" | "keyGuard" | "stairsUp" | "finale" | "trophy";

export interface TowerCell {
  id: string;
  name: string;
  role: TowerRole;
  /** The quests the room holds, in list order; empty for rooms that are not fights */
  questIds: string[];
  /** The difficulty of its biggest chore, which sets a chore room's tier */
  biggest: number;
}

export interface PlacedTowerCell {
  cell: TowerCell;
  /** On the shared 9x9 frame */
  row: number;
  col: number;
}

export interface TowerFloor {
  key: string;
  cells: PlacedTowerCell[];
}

/** The layout a temple record keeps: the entrance as [floor index, row, col], a grid per floor, the rooms table */
export interface TowerLayout {
  entrance: number[];
  maze: Record<string, string[][]>;
  rooms: Record<string, Room>;
}

/** A room as it is written: the letter its token starts with, and the room */
interface Written {
  char: string;
  room: Room;
}

/** Where a flight of stairs lands: the floor and the cell of its twin */
interface Landing {
  floor: string;
  row: number;
  col: number;
}

/** What a cell's room needs beyond the cell: where its stairs land */
interface Context {
  landing?: Landing;
}

/** A chore room's `difficulty`: its biggest chore's tier, a one-pointer room "easy" */
const TIER_DIFFICULTY: Record<QuestTier, NonNullable<RoomContent["difficulty"]>> = { monster: "normal", miniboss: "hard", boss: "boss" };

const tierOf = (biggest: number): NonNullable<RoomContent["difficulty"]> => (biggest <= 1 ? "easy" : TIER_DIFFICULTY[questTier(biggest)]);

/** A room of this type that carries the cell's name, so the screen can say where in the house the hero stands */
const named = (char: string, type: string, cell: TowerCell, content: RoomContent = {}, extra: Partial<Room> = {}): Written => ({
  char,
  room: { type, ...extra, content: { name: cell.name, ...content } },
});

const landingOf = ({ landing }: Context): RoomContent =>
  landing ? { targetLevel: landing.floor, targetCoords: { x: landing.col, y: landing.row } } : {};

/** Each role as the room it is written as */
const WRITERS: Record<TowerRole, (cell: TowerCell, context: Context) => Written> = {
  entrance: (cell) => named(_00_, "entrance", cell, {}, { visited: true }),
  arrival: (cell, context) => named(ST_D, "stairs-down", cell, landingOf(context)),
  chores: (cell) => {
    const difficulty = tierOf(cell.biggest);
    return named(difficulty === "easy" ? q__q : Q__Q, "monster", cell, { questIds: [...cell.questIds], difficulty });
  },
  floorBoss: (cell) => named(Q__Q, "monster", cell, { questIds: [...cell.questIds], difficulty: "boss" }),
  keyGuard: (cell) =>
    named(x__x, "miniboss", cell, {
      questIds: [...cell.questIds],
      difficulty: "boss",
      lockOnEnter: true,
      drops: { chest: "dungeon", dungeon: BOSS_KEY_ID },
    }),
  stairsUp: (cell, context) => named(ST_U, "stairs-up", cell, { locked: "floorCleared", ...landingOf(context) }),
  finale: (cell) => named(X__X, "boss", cell, { questIds: [...cell.questIds], difficulty: "boss", lockOnEnter: true }, { locked: { master: true } }),
  trophy: (cell) => named($__$, "master", cell, { chest: "dungeon", dungeon: "Pegasus", pegasus: true }),
};

/** The one cell of a role on a floor, if it has one */
const roleOn = (floor: TowerFloor | undefined, role: TowerRole): PlacedTowerCell | undefined => floor?.cells.find((placed) => placed.cell.role === role);

/** Where a cell's stairs land: the stairs up on the next floor's arrival, an arrival on the stairs up below it */
const landingFor = (placed: PlacedTowerCell, floors: readonly TowerFloor[], index: number): Landing | undefined => {
  const isUp = placed.cell.role === "stairsUp";
  const isDown = placed.cell.role === "arrival";
  const isStairs = isUp || isDown;
  if (!isStairs) return undefined;
  const other = isUp ? floors[index + 1] : floors[index - 1];
  const twin = roleOn(other, isUp ? "arrival" : "stairsUp");
  if (!twin) return undefined;
  return { floor: other.key, row: twin.row, col: twin.col };
};

/** The floors moved to the smallest box that holds the cells of every floor together, so stairs keep their cell */
const trimmed = (floors: readonly TowerFloor[]): { floors: TowerFloor[]; rows: number; cols: number } => {
  const all = floors.flatMap((floor) => floor.cells);
  const hasNoCells = all.length === 0;
  if (hasNoCells) return { floors: [...floors], rows: 0, cols: 0 };
  const top = Math.min(...all.map((placed) => placed.row));
  const left = Math.min(...all.map((placed) => placed.col));
  return {
    floors: floors.map((floor) => ({ ...floor, cells: floor.cells.map((placed) => ({ ...placed, row: placed.row - top, col: placed.col - left })) })),
    rows: Math.max(...all.map((placed) => placed.row)) - top + 1,
    cols: Math.max(...all.map((placed) => placed.col)) - left + 1,
  };
};

/**
 * The layout of a planned tower: each floor as a grid of the shared box, bottom to top, its rooms named in reading
 * order, and the way in on the ground floor.
 */
export function towerLayout(planned: readonly TowerFloor[]): TowerLayout {
  const { floors, rows, cols } = trimmed(planned);
  const counters = new Map<string, number>();
  const rooms: Record<string, Room> = { [____]: { type: "wall" } };
  const maze: Record<string, string[][]> = {};

  floors.forEach((floor, index) => {
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ____));
    const inReadingOrder = [...floor.cells].sort((a, b) => a.row - b.row || a.col - b.col);
    for (const placed of inReadingOrder) {
      const { char, room } = WRITERS[placed.cell.role](placed.cell, { landing: landingFor(placed, floors, index) });
      const count = (counters.get(char) ?? 0) + 1;
      counters.set(char, count);
      const token = `${char}${String(count).padStart(3, "0")}`;
      rooms[token] = room;
      grid[placed.row][placed.col] = token;
    }
    maze[floor.key] = grid;
  });

  const door = roleOn(floors[0], "entrance");
  return { entrance: door ? [0, door.row, door.col] : [], maze, rooms };
}
