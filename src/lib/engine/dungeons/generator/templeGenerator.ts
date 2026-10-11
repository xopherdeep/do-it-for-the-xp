/**
 * Seeded temple generator (section 3 of docs/Temple-Generation-Contract.md).
 *
 * `generateTemple(seed, options)` is a pure function of its arguments: the same seed and options give the same
 * temple (R11). It carves a tree of rooms on each floor, chains the floors with stairs, lays the critical path
 * (entrance, locks and keys, mini-boss, master key, boss door, boss, Pegasus chest), dresses the other rooms,
 * then runs the solver on the result. A layout the solver rejects is dressed again with the next sub-seed, at
 * most eight times, after which the generator throws: a thrown generator is a test failure, never a shipped
 * temple.
 *
 * The output is a `Dungeon` in the shape the authored temples use (floors of tokens, a `rooms` table) so
 * `registerTemple` accepts it. Every room gets a token of its own, so locks and chests are per room.
 */
import type { Dungeon, Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import {
  ____,
  _00_,
  O__O,
  X__X,
  x__x,
  q__q,
  Q__Q,
  H__P,
  CAMP,
  SAVE,
  K___,
  MK__,
  $__$,
  SHOP,
  _XX_,
  PUZL,
  PIT_,
  TELE,
  ST_U,
  ST_D,
} from "@/lib/engine/dungeons/roomTypes";
import { DIRECTIONS, STEP, type Direction, type RoomRef } from "./templeGraph";
import { solveTemple } from "./templeSolver";

export type TempleSize = "small" | "medium" | "large";

/** The nine elements of the authored temples; any other word is allowed for a custom one. */
export type TempleElement = "wind" | "earth" | "water" | "fire" | "ice" | "light" | "shadow" | "storm" | "moon" | string;

/** A quest a monster room can be bound to. */
export interface QuestRef {
  id: string;
  name?: string;
}

export interface GenerateOptions {
  /** A room of the house or a chore category: "Kitchen", "Yard", "Homework" */
  theme: string;
  floors?: 1 | 2 | 3;
  size?: TempleSize;
  /** Small-key locks on the way to the mini-boss */
  locks?: 0 | 1 | 2 | 3;
  element?: TempleElement;
  /** Quests the monster rooms draw from, round robin */
  quests?: QuestRef[];
  id?: string;
  name?: string;
}

export interface GeneratedTemple extends Dungeon {
  /** `[floorIndex, row, col]` */
  entrance: number[];
  seed: number | string;
  themeId: string;
  element?: TempleElement;
  /** The rooms that matter, in the order the solver's winning run reaches them */
  criticalPath: RoomRef[];
  /** How many dressings it took to pass the solver (1 is the norm) */
  attempts: number;
}

/** How many times a skeleton or a dressing is tried with the next sub-seed before the generator gives up. */
export const MAX_ATTEMPTS = 8;

// --- the seeded dice -------------------------------------------------------------------------------------------

type Rng = () => number;

/** xmur3: a string hashed into 32-bit seeds. */
const xmur3 = (text: string): (() => number) => {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

/** mulberry32: a fast 32-bit generator returning numbers in [0, 1). */
const mulberry32 = (seed: number): Rng => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const rngFor = (seed: string): Rng => mulberry32(xmur3(seed)());

const between = (rng: Rng, low: number, high: number): number => low + Math.floor(rng() * (high - low + 1));

const chance = (rng: Rng, probability: number): boolean => rng() < probability;

const pick = <T>(rng: Rng, list: T[]): T => list[Math.floor(rng() * list.length)];

const shuffle = <T>(rng: Rng, list: T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// --- the skeleton: rooms in a tree ----------------------------------------------------------------------------

type Kind =
  | "plain"
  | "entrance"
  | "boss"
  | "miniboss"
  | "pegasus"
  | "stairs-up"
  | "stairs-down"
  | "master"
  | "key"
  | "empty"
  | "monster"
  | "loot"
  | "trap"
  | "puzzle"
  | "shop"
  | "health"
  | "camp"
  | "save"
  | "teleport"
  | "pit";

interface Cell {
  key: string;
  floor: number;
  row: number;
  col: number;
  kind: Kind;
  /** The sides of this room that need a small key to leave by */
  locked: Partial<Record<Direction | "master", boolean>>;
  content?: RoomContent;
}

interface Skeleton {
  floors: number;
  rows: number;
  cols: number;
  cells: Map<string, Cell>;
  /** Neighbours of each room: the tree, then the loops the dressing adds */
  adjacency: Map<string, Set<string>>;
  /** Tree parent of each room, from the entrance */
  parent: Map<string, string | undefined>;
  depth: Map<string, number>;
  /** Entrance to boss, by room key */
  path: string[];
  /** Index into `path` of the mini-boss */
  minibossAt: number;
  pegasus: string;
}

const cellKey = (floor: number, row: number, col: number): string => `${floor}:${row},${col}`;

const SPAN_BY_SIZE: Record<TempleSize, [number, number]> = {
  small: [5, 6],
  medium: [6, 7],
  large: [7, 9],
};

const FLOORS_BY_SIZE: Record<TempleSize, 1 | 2 | 3> = {
  small: 1,
  medium: 2,
  large: 3,
};

const DEFAULT_LOCKS_BY_SIZE: Record<TempleSize, 1 | 2 | 3> = {
  small: 1,
  medium: 2,
  large: 3,
};

const dimensionsFor = (rng: Rng, options: GenerateOptions): { floors: number; rows: number; cols: number } => {
  const size = options.size ?? "medium";
  const span = SPAN_BY_SIZE[size];
  const floors = options.floors ?? FLOORS_BY_SIZE[size];
  return { floors, rows: between(rng, span[0], span[1]), cols: between(rng, span[0], span[1]) };
};

/** Cells next to a grid position, inside the grid. */
const around = (skeleton: Pick<Skeleton, "rows" | "cols">, floor: number, row: number, col: number): Array<[number, number, Direction]> =>
  DIRECTIONS.map((direction): [number, number, Direction] => [row + STEP[direction][0], col + STEP[direction][1], direction]).filter(
    ([r, c]) => r >= 0 && c >= 0 && r < skeleton.rows && c < skeleton.cols
  );

/** The rooms next to a grid position, whether or not it is a room itself. */
const roomNeighbours = (skeleton: Skeleton, floor: number, row: number, col: number): Cell[] =>
  around(skeleton, floor, row, col)
    .map(([r, c]) => skeleton.cells.get(cellKey(floor, r, c)))
    .filter((cell): cell is Cell => Boolean(cell));

const link = (skeleton: Skeleton, a: string, b: string): void => {
  skeleton.adjacency.get(a)!.add(b);
  skeleton.adjacency.get(b)!.add(a);
};

const addCell = (skeleton: Skeleton, floor: number, row: number, col: number, kind: Kind): Cell => {
  const cell: Cell = { key: cellKey(floor, row, col), floor, row, col, kind, locked: {} };
  skeleton.cells.set(cell.key, cell);
  skeleton.adjacency.set(cell.key, new Set());
  return cell;
};

/** Wall cells that touch exactly one room: adding one keeps the floor a tree. */
const growthFront = (skeleton: Skeleton, floor: number): Array<[number, number]> => {
  const front: Array<[number, number]> = [];
  for (let row = 0; row < skeleton.rows; row++) {
    for (let col = 0; col < skeleton.cols; col++) {
      if (skeleton.cells.has(cellKey(floor, row, col))) continue;
      if (roomNeighbours(skeleton, floor, row, col).length === 1) front.push([row, col]);
    }
  }
  return front;
};

/**
 * Carve one floor: a drunk walk from `start` that only ever steps onto a wall touching a single room, so the
 * rooms of the floor form a tree. Most steps continue from a recent room (corridors); the rest jump anywhere.
 */
const carveFloor = (skeleton: Skeleton, rng: Rng, floor: number, start: Cell, target: number): void => {
  const recent: Cell[] = [start];
  for (let count = 1; count < target; ) {
    const front = growthFront(skeleton, floor);
    if (!front.length) return;
    const tail = recent[recent.length - 1];
    const near = front.filter(([r, c]) => Math.abs(r - tail.row) + Math.abs(c - tail.col) === 1);
    const [row, col] = near.length && chance(rng, 0.65) ? pick(rng, near) : pick(rng, front);
    const cell = addCell(skeleton, floor, row, col, "plain");
    link(skeleton, cell.key, roomNeighbours(skeleton, floor, row, col).find((other) => other !== cell)!.key);
    recent.push(cell);
    count++;
  }
};

/** Breadth-first distances over the adjacency from one room. */
const distancesFrom = (skeleton: Skeleton, start: string): Map<string, number> => {
  const distance = new Map<string, number>([[start, 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    for (const next of skeleton.adjacency.get(queue[i]) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, distance.get(queue[i])! + 1);
      queue.push(next);
    }
  }
  return distance;
};

const isLeaf = (skeleton: Skeleton, key: string): boolean => skeleton.adjacency.get(key)!.size === 1;

/** The plain leaf of a floor farthest from `from`, the spot for stairs or a boss. */
const farthestLeaf = (skeleton: Skeleton, floor: number, from: string): Cell | undefined => {
  const distance = distancesFrom(skeleton, from);
  return [...skeleton.cells.values()]
    .filter((cell) => cell.floor === floor && cell.kind === "plain" && isLeaf(skeleton, cell.key))
    .sort((a, b) => (distance.get(b.key) ?? 0) - (distance.get(a.key) ?? 0))[0];
};

/** Carve every floor, each one starting under the stairs that lead up to it. */
const carveFloors = (skeleton: Skeleton, rng: Rng): Cell | undefined => {
  const target = Math.max(8, Math.ceil(skeleton.rows * skeleton.cols * 0.5));
  let start = addCell(skeleton, 0, between(rng, 0, skeleton.rows - 1), between(rng, 0, skeleton.cols - 1), "entrance");
  const entrance = start;
  for (let floor = 0; floor < skeleton.floors; floor++) {
    carveFloor(skeleton, rng, floor, start, target);
    if (floor === skeleton.floors - 1) break;
    const up = farthestLeaf(skeleton, floor, start.key);
    if (!up) return undefined;
    up.kind = "stairs-up";
    start = addCell(skeleton, floor + 1, up.row, up.col, "stairs-down");
    link(skeleton, up.key, start.key);
  }
  return entrance;
};

/** Tree parents and depths from the entrance. */
const rootTree = (skeleton: Skeleton, entrance: string): void => {
  skeleton.parent.set(entrance, undefined);
  skeleton.depth.set(entrance, 0);
  const queue = [entrance];
  for (let i = 0; i < queue.length; i++) {
    for (const next of skeleton.adjacency.get(queue[i])!) {
      if (skeleton.depth.has(next)) continue;
      skeleton.parent.set(next, queue[i]);
      skeleton.depth.set(next, skeleton.depth.get(queue[i])! + 1);
      queue.push(next);
    }
  }
};

/** Wall cells next to a room that touch no other room: where a Pegasus chest can hang off the boss. */
const freeWallsBeside = (skeleton: Skeleton, cell: Cell): Array<[number, number]> =>
  around(skeleton, cell.floor, cell.row, cell.col)
    .filter(([r, c]) => !skeleton.cells.has(cellKey(cell.floor, r, c)))
    .filter(([r, c]) => roomNeighbours(skeleton, cell.floor, r, c).length === 1)
    .map(([r, c]) => [r, c]);

/** The farthest plain leaf, at least three rooms from the entrance, with room beside it for the Pegasus chest. */
const chooseBoss = (skeleton: Skeleton): Cell | undefined =>
  [...skeleton.cells.values()]
    .filter((cell) => cell.kind === "plain" && isLeaf(skeleton, cell.key) && skeleton.depth.get(cell.key)! >= 3)
    .sort((a, b) => skeleton.depth.get(b.key)! - skeleton.depth.get(a.key)!)
    .find((cell) => freeWallsBeside(skeleton, cell).length > 0);

const pathTo = (skeleton: Skeleton, key: string): string[] => {
  const path: string[] = [];
  for (let at: string | undefined = key; at; at = skeleton.parent.get(at)) path.unshift(at);
  return path;
};

/** The mini-boss sits 55–75 % of the way to the boss, on a plain room, leaving room for `locks` doors before it. */
const chooseMiniboss = (skeleton: Skeleton, rng: Rng, locks: number): number | undefined => {
  const last = skeleton.path.length - 1;
  const wanted = Math.round(last * (0.55 + rng() * 0.2));
  const candidates = [...skeleton.path.keys()]
    .filter((index) => index >= 1 && index < last && skeleton.cells.get(skeleton.path[index])!.kind === "plain")
    .sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a);
  const roomy = candidates.filter((index) => index >= locks);
  return (roomy.length ? roomy : candidates)[0];
};

/** Steps 1 and 2: carve the floors and lay the critical path. Undefined when the dice gave too little room. */
const buildSkeleton = (rng: Rng, options: GenerateOptions, locks: number): Skeleton | undefined => {
  const dimensions = dimensionsFor(rng, options);
  const skeleton: Skeleton = { ...dimensions, cells: new Map(), adjacency: new Map(), parent: new Map(), depth: new Map(), path: [], minibossAt: 0, pegasus: "" };
  const entrance = carveFloors(skeleton, rng);
  if (!entrance) return undefined;
  rootTree(skeleton, entrance.key);
  const boss = chooseBoss(skeleton);
  if (!boss) return undefined;
  boss.kind = "boss";
  skeleton.path = pathTo(skeleton, boss.key);
  const minibossAt = chooseMiniboss(skeleton, rng, locks);
  if (minibossAt === undefined) return undefined;
  skeleton.minibossAt = minibossAt;
  skeleton.cells.get(skeleton.path[minibossAt])!.kind = "miniboss";
  const [row, col] = pick(rng, freeWallsBeside(skeleton, boss));
  const pegasus = addCell(skeleton, boss.floor, row, col, "pegasus");
  link(skeleton, boss.key, pegasus.key);
  skeleton.parent.set(pegasus.key, boss.key);
  skeleton.depth.set(pegasus.key, skeleton.depth.get(boss.key)! + 1);
  skeleton.pegasus = pegasus.key;
  return skeleton;
};

// --- the dressing: locks, keys, loops and rooms ----------------------------------------------------------------

interface Dressing {
  rng: Rng;
  skeleton: Skeleton;
  /** Doors the hero must pass, by "from>to": lock edges, the side lock, the boss door */
  gates: Set<string>;
  /** Rooms that already have a job */
  reserved: Set<string>;
}

const directionTo = (from: Cell, to: Cell): Direction => DIRECTIONS.find((direction) => from.row + STEP[direction][0] === to.row && from.col + STEP[direction][1] === to.col)!;

const edgeId = (from: string, to: string): string => `${from}>${to}`;

/** Rooms in the entrance's part of the tree once the edge `from`→`to` is cut. */
const beforeEdge = (skeleton: Skeleton, from: string, to: string): Set<string> => {
  const seen = new Set<string>([skeleton.path[0]]);
  const queue = [skeleton.path[0]];
  for (let i = 0; i < queue.length; i++) {
    for (const next of skeleton.adjacency.get(queue[i])!) {
      if (seen.has(next) || (queue[i] === from && next === to) || (queue[i] === to && next === from)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
};

/** The whole subtree hanging below `child` (its parent being `parent`). */
const subtreeOf = (skeleton: Skeleton, parent: string, child: string): Set<string> => {
  const seen = new Set<string>([child]);
  const queue = [child];
  for (let i = 0; i < queue.length; i++) {
    for (const next of skeleton.adjacency.get(queue[i])!) {
      if (seen.has(next) || next === parent) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
};

const onPath = (skeleton: Skeleton, key: string): boolean => skeleton.path.includes(key);

/** Free rooms among `pool`, off the critical path when there are any, else on it. */
const freeRooms = (dressing: Dressing, pool: Iterable<string>): string[] => {
  const free = [...pool].filter((key) => !dressing.reserved.has(key) && dressing.skeleton.cells.get(key)!.kind === "plain");
  const offPath = free.filter((key) => !onPath(dressing.skeleton, key));
  return offPath.length ? offPath : free;
};

const reserveAs = (dressing: Dressing, key: string, kind: Kind, content?: RoomContent): void => {
  const cell = dressing.skeleton.cells.get(key)!;
  cell.kind = kind;
  if (content) cell.content = content;
  dressing.reserved.add(key);
};

/** Lock the walking door `from`→`to` on the side the hero comes from, and remember it as a gate. */
const lockEdge = (dressing: Dressing, from: string, to: string): void => {
  const cells = dressing.skeleton.cells;
  cells.get(from)!.locked[directionTo(cells.get(from)!, cells.get(to)!)] = true;
  dressing.gates.add(edgeId(from, to));
};

/** Step 5: `locks` doors between the entrance and the mini-boss, each with a key chest before it. */
const placeCriticalLocks = (dressing: Dressing, locks: number): number => {
  const { skeleton, rng } = dressing;
  const edges = shuffle(rng, [...Array(skeleton.minibossAt).keys()]).slice(0, locks).sort((a, b) => a - b);
  let placed = 0;
  for (const index of edges) {
    const [from, to] = [skeleton.path[index], skeleton.path[index + 1]];
    const spots = freeRooms(dressing, beforeEdge(skeleton, from, to));
    if (!spots.length) continue;
    reserveAs(dressing, pick(rng, spots), "key");
    lockEdge(dressing, from, to);
    placed++;
  }
  return placed;
};

/** How many critical locks stand between the entrance and a room. */
const locksBefore = (dressing: Dressing, key: string): number =>
  pathTo(dressing.skeleton, key).filter((at, i, path) => i > 0 && dressing.gates.has(edgeId(path[i - 1], at))).length;

/**
 * An optional side lock (R3): a branch off the critical path with nothing reserved in it, locked at its root, with
 * a spare key placed no deeper into the temple than the lock itself.
 */
const placeSideLock = (dressing: Dressing): void => {
  const { skeleton, rng } = dressing;
  const branches = [...skeleton.cells.values()]
    .filter((cell) => !onPath(skeleton, cell.key) && skeleton.parent.get(cell.key) && onPath(skeleton, skeleton.parent.get(cell.key)!))
    .filter((cell) => skeleton.path.indexOf(skeleton.parent.get(cell.key)!) < skeleton.minibossAt)
    .filter((cell) => [...subtreeOf(skeleton, skeleton.parent.get(cell.key)!, cell.key)].every((key) => !dressing.reserved.has(key) && skeleton.cells.get(key)!.kind === "plain"));
  if (!branches.length) return;
  const child = pick(rng, branches);
  const parent = skeleton.parent.get(child.key)!;
  const zone = locksBefore(dressing, parent);
  const spots = freeRooms(dressing, [...beforeEdge(skeleton, parent, child.key)].filter((key) => locksBefore(dressing, key) <= zone));
  if (!spots.length) return;
  reserveAs(dressing, pick(rng, spots), "key");
  lockEdge(dressing, parent, child.key);
};

/** Step 4: the master key, in the mini-boss room's chest or in a leaf hanging off the path past the mini-boss. */
const placeMasterKey = (dressing: Dressing): void => {
  const { skeleton, rng } = dressing;
  const miniboss = skeleton.path[skeleton.minibossAt];
  const leaves = [...skeleton.cells.values()]
    .filter((cell) => cell.kind === "plain" && isLeaf(skeleton, cell.key) && !dressing.reserved.has(cell.key))
    .filter((cell) => {
      const anchor = pathTo(skeleton, cell.key).reverse().find((key) => onPath(skeleton, key))!;
      const index = skeleton.path.indexOf(anchor);
      return index >= skeleton.minibossAt && index < skeleton.path.length - 1;
    });
  if (chance(rng, 0.6) || !leaves.length) {
    reserveAs(dressing, miniboss, "miniboss", { lockOnEnter: true, difficulty: "hard", chest: "dungeon", dungeon: "master-key" });
    return;
  }
  reserveAs(dressing, miniboss, "miniboss", { lockOnEnter: true, difficulty: "hard" });
  reserveAs(dressing, pick(rng, leaves.map((cell) => cell.key)), "master");
};

/** Step 3: the boss door, locked with the master key on the boss room and barred on the room in front of it. */
const lockBossDoor = (dressing: Dressing): void => {
  const { skeleton } = dressing;
  const [approach, boss] = skeleton.path.slice(-2);
  lockEdge(dressing, approach, boss);
  skeleton.cells.get(boss)!.locked.master = true;
};

/**
 * Which gates stand between the entrance and each room (locks, the mini-boss fight, the boss door). Two rooms
 * may only be joined by a loop, a teleport or a pit when that would not let the hero skip a gate.
 */
const zoneSignatures = (dressing: Dressing): Map<string, string> => {
  const { skeleton } = dressing;
  const miniboss = skeleton.path[skeleton.minibossAt];
  const zones = new Map<string, string>();
  const walk = (key: string, from: string | undefined, passed: string[]): void => {
    const here = [...passed];
    if (from && dressing.gates.has(edgeId(from, key))) here.push(edgeId(from, key));
    if (key === miniboss) here.push("miniboss");
    zones.set(key, here.sort().join("|"));
    for (const next of skeleton.adjacency.get(key)!) if (next !== from) walk(next, key, here);
  };
  walk(skeleton.path[0], undefined, []);
  return zones;
};

const touchesBossOrPegasus = (skeleton: Skeleton, cells: Cell[]): boolean => cells.some((cell) => cell.kind === "boss" || cell.kind === "pegasus");

/** Step 1b: 10–20 % loops, each a wall turned into a room between rooms of one zone, so no lock is skipped. */
const addLoops = (dressing: Dressing, zones: Map<string, string>): void => {
  const { skeleton, rng } = dressing;
  const wanted = Math.round(skeleton.cells.size * (0.1 + rng() * 0.1));
  for (let added = 0; added < wanted; added++) {
    const spots: Array<[number, number, number, string]> = [];
    for (let floor = 0; floor < skeleton.floors; floor++) {
      for (let row = 0; row < skeleton.rows; row++) {
        for (let col = 0; col < skeleton.cols; col++) {
          if (skeleton.cells.has(cellKey(floor, row, col))) continue;
          const beside = roomNeighbours(skeleton, floor, row, col);
          const zone = zones.get(beside[0]?.key);
          if (beside.length < 2 || touchesBossOrPegasus(skeleton, beside) || !beside.every((cell) => zones.get(cell.key) === zone)) continue;
          spots.push([floor, row, col, zone!]);
        }
      }
    }
    if (!spots.length) return;
    const [floor, row, col, zone] = pick(rng, spots);
    const cell = addCell(skeleton, floor, row, col, "plain");
    zones.set(cell.key, zone);
    for (const other of roomNeighbours(skeleton, floor, row, col)) if (other !== cell) link(skeleton, cell.key, other.key);
  }
};

/** The nearest free room to `from`, by walking distance. */
const nearestFree = (dressing: Dressing, from: string, filter: (cell: Cell) => boolean = () => true): string | undefined => {
  const distance = distancesFrom(dressing.skeleton, from);
  return freeRooms(dressing, dressing.skeleton.cells.keys())
    .filter((key) => filter(dressing.skeleton.cells.get(key)!))
    .sort((a, b) => (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity))[0];
};

/** A heal or camp near the mini-boss, a save room near each flight of stairs, map and compass in the first third. */
const placeComforts = (dressing: Dressing): void => {
  const { skeleton, rng } = dressing;
  const heal = nearestFree(dressing, skeleton.path[skeleton.minibossAt]);
  if (heal) reserveAs(dressing, heal, chance(rng, 0.5) ? "camp" : "health", { healthPoints: 15 });

  for (const stairs of [...skeleton.cells.values()].filter((cell) => cell.kind === "stairs-up")) {
    const save = nearestFree(dressing, stairs.key, (cell) => cell.floor === stairs.floor);
    if (save) reserveAs(dressing, save, "save");
  }

  const deepest = Math.max(...skeleton.path.map((key) => skeleton.depth.get(key)!));
  const early = freeRooms(dressing, [...skeleton.cells.keys()].filter((key) => skeleton.depth.get(key)! <= Math.max(1, deepest / 3)));
  const fallback = freeRooms(dressing, skeleton.cells.keys()).sort((a, b) => skeleton.depth.get(a)! - skeleton.depth.get(b)!);
  for (const item of ["map", "compass"]) {
    const spot = early.find((key) => !dressing.reserved.has(key)) ?? fallback.find((key) => !dressing.reserved.has(key));
    if (spot) reserveAs(dressing, spot, "loot", { chest: "dungeon", dungeon: item });
  }

  if (chance(rng, 0.85)) {
    const shop = freeRooms(dressing, skeleton.cells.keys());
    if (shop.length) reserveAs(dressing, pick(rng, shop), "shop");
  }
};

/** A pair of teleports between two leaves of one zone, and a pit from a leaf onto a room of an earlier zone. */
const placeShortcuts = (dressing: Dressing, zones: Map<string, string>): void => {
  const { skeleton, rng } = dressing;
  const leaves = () => freeRooms(dressing, skeleton.cells.keys()).filter((key) => isLeaf(skeleton, key));

  if (skeleton.floors > 1 && chance(rng, 0.5)) {
    const byZone = new Map<string, string[]>();
    for (const key of leaves()) byZone.set(zones.get(key)!, [...(byZone.get(zones.get(key)!) ?? []), key]);
    const pairs = [...byZone.values()].filter((group) => group.length >= 2);
    if (pairs.length) {
      const [a, b] = shuffle(rng, pick(rng, pairs)).slice(0, 2);
      reserveAs(dressing, a, "teleport");
      reserveAs(dressing, b, "teleport");
    }
  }

  if (skeleton.floors > 1 && chance(rng, 0.5)) {
    const gatesOf = (key: string) => zones.get(key)!.split("|").filter(Boolean);
    const earlier = (landing: string, pit: string) => gatesOf(landing).every((gate) => gatesOf(pit).includes(gate));
    const pits = leaves().filter((key) => {
      const cell = skeleton.cells.get(key)!;
      const landing = skeleton.cells.get(cellKey(cell.floor - 1, cell.row, cell.col));
      return cell.floor > 0 && landing && !["pit", "boss", "pegasus", "teleport"].includes(landing.kind) && earlier(landing.key, key);
    });
    if (pits.length) reserveAs(dressing, pick(rng, pits), "pit");
  }
};

const FIGHT_REWARDS: Record<string, RoomContent> = {
  easy: { xp: 5, gp: 3, ap: 1 },
  normal: { xp: 10, gp: 6, ap: 1 },
  hard: { xp: 30, gp: 20, ap: 2 },
  boss: { xp: 100, gp: 50, ap: 5 },
};

/** Step 6: monsters (25–35 %, never past 40 % with the bosses), 10 % loot, 5 % traps, 5 % puzzles, the rest empty. */
const fillTheRest = (dressing: Dressing, options: GenerateOptions, themeId: string): void => {
  const { skeleton, rng } = dressing;
  const total = skeleton.cells.size;
  const monsters = Math.min(Math.round(total * (0.25 + rng() * 0.1)), Math.floor(total * 0.4)) - 2;
  const quotas: Array<[Kind, number]> = [
    ["monster", Math.max(0, monsters)],
    ["loot", Math.round(total * 0.1)],
    ["trap", Math.round(total * 0.05)],
    ["puzzle", Math.round(total * 0.05)],
  ];
  const queue = shuffle(rng, [...skeleton.cells.keys()].filter((key) => !dressing.reserved.has(key) && skeleton.cells.get(key)!.kind === "plain"));
  let quest = 0;
  for (const [kind, count] of quotas) {
    for (let i = 0; i < count && queue.length; i++) {
      const key = queue.shift()!;
      if (kind === "monster") {
        const difficulty = chance(rng, 0.6) ? "easy" : "normal";
        const bound = options.quests?.length ? { questId: options.quests[quest++ % options.quests.length].id } : {};
        reserveAs(dressing, key, "monster", { difficulty, theme: themeId, ...FIGHT_REWARDS[difficulty], ...bound });
      } else if (kind === "loot") reserveAs(dressing, key, "loot", { chest: "consumable", items: [chance(rng, 0.5) ? "potion" : "ether"] });
      else if (kind === "trap") reserveAs(dressing, key, "trap", { trapType: "spikes", damage: 5 });
      else reserveAs(dressing, key, "puzzle", { puzzleType: "generic" });
    }
  }
  for (const key of queue) reserveAs(dressing, key, "empty");
};

// --- the output ------------------------------------------------------------------------------------------------

const TOKEN_CHAR: Record<Kind, string> = {
  plain: O__O,
  empty: O__O,
  entrance: _00_,
  boss: X__X,
  miniboss: x__x,
  pegasus: $__$,
  "stairs-up": ST_U,
  "stairs-down": ST_D,
  master: MK__,
  key: K___,
  monster: q__q,
  loot: $__$,
  trap: _XX_,
  puzzle: PUZL,
  shop: SHOP,
  health: H__P,
  camp: CAMP,
  save: SAVE,
  teleport: TELE,
  pit: PIT_,
};

const ROOM_TYPE: Record<Kind, string> = {
  plain: "empty",
  empty: "empty",
  entrance: "entrance",
  boss: "boss",
  miniboss: "miniboss",
  pegasus: "loot",
  "stairs-up": "stairs-up",
  "stairs-down": "stairs-down",
  master: "loot",
  key: "loot",
  monster: "monster",
  loot: "loot",
  trap: "trap",
  puzzle: "puzzle",
  shop: "shop",
  health: "health",
  camp: "camp",
  save: "save",
  teleport: "teleport",
  pit: "pit",
};

/** The authored content a kind implies, when the dressing gave the room none. */
const contentFor = (cell: Cell, element: TempleElement | undefined): RoomContent | undefined => {
  if (cell.content) return cell.content;
  switch (cell.kind) {
    case "boss":
      return { lockOnEnter: true, difficulty: "boss", element, ...FIGHT_REWARDS.boss };
    case "pegasus":
      return { chest: "dungeon", dungeon: "Pegasus", pegasus: true };
    case "master":
      return { chest: "dungeon", dungeon: "master-key" };
    case "key":
      return { chest: "dungeon", dungeon: "key" };
    default:
      return undefined;
  }
};

/** Monster rooms with a normal fight are spelled with the bigger monster token. */
const tokenChar = (cell: Cell): string => (cell.kind === "monster" && cell.content?.difficulty === "normal" ? Q__Q : TOKEN_CHAR[cell.kind]);

/** Floors of tokens and the rooms table: one token per room, walls share "_". */
const layOut = (skeleton: Skeleton, element: TempleElement | undefined): { maze: Record<string, string[][]>; rooms: Record<string, Room> } => {
  const counters = new Map<string, number>();
  const rooms: Record<string, Room> = { [____]: { type: "wall" } };
  const maze: Record<string, string[][]> = {};
  for (let floor = 0; floor < skeleton.floors; floor++) {
    maze[`${floor + 1}F`] = Array.from({ length: skeleton.rows }, (_, row) =>
      Array.from({ length: skeleton.cols }, (__, col) => {
        const cell = skeleton.cells.get(cellKey(floor, row, col));
        if (!cell) return ____;
        const char = tokenChar(cell);
        const count = (counters.get(char) ?? 0) + 1;
        counters.set(char, count);
        const token = `${char}${String(count).padStart(3, "0")}`;
        const room: Room = { type: ROOM_TYPE[cell.kind] };
        const content = contentFor(cell, element);
        if (content) room.content = content;
        if (Object.keys(cell.locked).length) room.locked = { ...cell.locked };
        if (cell.kind === "entrance") room.visited = true;
        rooms[token] = room;
        return token;
      })
    );
  }
  return { maze, rooms };
};

const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "temple";

const titleCase = (text: string): string => text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

/** Steps 3 to 6 on a copy of the skeleton, with its own dice. */
const dress = (skeleton: Skeleton, rng: Rng, options: GenerateOptions, locks: number, themeId: string): Skeleton => {
  const copy: Skeleton = {
    ...skeleton,
    cells: new Map([...skeleton.cells].map(([key, cell]) => [key, { ...cell, locked: {}, content: undefined }])),
    adjacency: new Map([...skeleton.adjacency].map(([key, set]) => [key, new Set(set)])),
    parent: new Map(skeleton.parent),
    depth: new Map(skeleton.depth),
  };
  const dressing: Dressing = { rng, skeleton: copy, gates: new Set(), reserved: new Set() };
  for (const key of [copy.path[0], copy.pegasus, ...copy.path.slice(-1)]) dressing.reserved.add(key);
  for (const cell of copy.cells.values()) if (cell.kind === "stairs-up" || cell.kind === "stairs-down") dressing.reserved.add(cell.key);

  lockBossDoor(dressing);
  placeCriticalLocks(dressing, locks);
  if (chance(rng, 0.5)) placeSideLock(dressing);
  placeMasterKey(dressing);
  const zones = zoneSignatures(dressing);
  addLoops(dressing, zones);
  placeComforts(dressing);
  placeShortcuts(dressing, zones);
  fillTheRest(dressing, options, themeId);
  return copy;
};

const toTemple = (skeleton: Skeleton, seed: number | string, options: GenerateOptions, themeId: string): Omit<GeneratedTemple, "criticalPath" | "attempts"> => {
  const entrance = skeleton.cells.get(skeleton.path[0])!;
  const { maze, rooms } = layOut(skeleton, options.element);
  return {
    id: options.id ?? `${themeId}-temple-${slug(String(seed))}`,
    name: options.name ?? `${titleCase(options.theme)} Temple`,
    maze,
    rooms,
    visitedPositions: new Set<string>(),
    entrance: [entrance.floor, entrance.row, entrance.col],
    seed,
    themeId,
    element: options.element,
  };
};

/** A skeleton the dice can fill: tried with the next sub-seed until one has room for a critical path. */
const skeletonFor = (seed: string, options: GenerateOptions, locks: number): Skeleton => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const skeleton = buildSkeleton(rngFor(`${seed}/skeleton/${attempt}`), options, locks);
    if (skeleton) return skeleton;
  }
  throw new Error(`generateTemple: no skeleton with a critical path for seed "${seed}" after ${MAX_ATTEMPTS} attempts`);
};

/**
 * Generate a temple from a seed. Same seed and options, same temple (R11). Throws when eight dressings in a
 * row fail the solver, which the tests treat as a bug.
 */
export const generateTemple = (seed: number | string, options: GenerateOptions): GeneratedTemple => {
  const seedText = String(seed);
  const themeId = slug(options.theme);
  const locks = options.locks ?? DEFAULT_LOCKS_BY_SIZE[options.size ?? "medium"];
  const skeleton = skeletonFor(seedText, options, locks);
  const failures: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const dressed = dress(skeleton, rngFor(`${seedText}/dress/${attempt}`), options, locks, themeId);
    const temple = toTemple(dressed, seed, options, themeId);
    const verdict = solveTemple(temple);
    if (!verdict.reasons.length) return { ...temple, criticalPath: verdict.criticalPath, attempts: attempt + 1 };
    failures.push(`attempt ${attempt + 1}: ${verdict.reasons.join("; ")}`);
  }
  throw new Error(`generateTemple: seed "${seedText}" failed the solver ${MAX_ATTEMPTS} times\n${failures.join("\n")}`);
};
