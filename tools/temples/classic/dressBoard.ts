/**
 * The board of a converted dungeon: every cell of every floor read as the things it holds (an entrance, a boss, a
 * fight, stairs, a chest...), one thing kept per cell and the rest moved, so each cell ends up as one room of ours.
 *
 * One fight per LTTP room (Review Focus 2): the screen with the most enemies fights, the other screens' enemies fold
 * into it. A room with a shutter or a key drop among its screens is must-clear; the key goes with the fight. So is a
 * room the plan names as a mini-boss's (`minibossRooms`), which fights even where the converter read no enemies.
 *
 * Precedence, one thing per cell: entrance > boss > must-clear fight > stairs > Big Key chest > Big Chest > other
 * chests and a key in the open > puzzle > circle > side fight > hole. A must-clear fight outranks the stairs that
 * share its screen because the fight is what gates the doors there; the stairs land next door instead (a flight can
 * name its landing, `targetCoords`). What loses its cell moves, and dressPlace says where: what a sealed fight held
 * goes beside the fight, else beside a room the hero reaches only through it (a chest or a key with no such room is
 * handed out by the fight), except a flight or a circle whose other end the hero reaches without the fight, which
 * stands beside it or in front of every seal (GT's Bob's Torch's flight, its twin in the lobby, stands beside Speed
 * Torch Upper); a hole or a circle goes to a dead end (a pit cuts a passage); a chest or a key stays within
 * reach of its cell with nothing in hand; anything else takes the nearest free cell. A room the dressing adds opens on
 * one neighbour only (its anchor), so it never shortcuts a lock. Only a displaced riddle is dropped and listed. Every
 * move, drop and merge goes in the report.
 */
import type { ClassicCell, ClassicDungeon, ClassicLink } from "./classicDungeon";
import { compactIslands, placeAntechamber, placeLandingCircles, shiftFloors } from "./dressLinks";
import { openNear, relocate } from "./dressPlace";

export interface CellRef {
  floor: string;
  row: number;
  col: number;
}

/** What a converted cell holds, one of which stays in it */
export type ItemKind =
  | "entrance"
  | "boss"
  | "mustClearFight"
  | "stairs"
  | "bigKey"
  | "bigChest"
  | "chest"
  | "potKey"
  | "puzzle"
  | "teleport"
  | "hole"
  | "sideFight"
  // Things the dressing adds: the Pegasus chamber, a Bomb before a cracked wall, the extras in the empty cells
  | "master"
  | "bombChest"
  | "shop"
  | "save"
  | "camp"
  | "empty";

/**
 * The precedence of the things a cell can hold: the first one found stays, the rest move or drop. A hole comes last:
 * a pit replaces the walking doors of its cell, so one on a screen the hero must cross would cut the dungeon in two.
 */
export const PRECEDENCE: ItemKind[] = ["entrance", "boss", "mustClearFight", "stairs", "bigKey", "bigChest", "chest", "potKey", "puzzle", "teleport", "sideFight", "hole"];

export interface Item {
  kind: ItemKind;
  /** The cell it was converted from */
  origin: CellRef;
  /** The LTTP room it belongs to */
  room: string;
  link?: ClassicLink;
  /** Where a circle or a pit the dressing made leads: a cell of the board (an added room has no link to name) */
  target?: CellRef;
  chest?: ClassicCell["chest"];
  keyDrop?: "small" | "big";
  enemies?: number;
  /** A sealed fight boxed in on every side: the chests and keys of its cell it hands out once won (its drops) */
  holds?: Item[];
}

/** A far-off island cell (walls on every side, reached by a link alone) moved next to its floor's used cells */
export interface ClassicCompaction {
  from: CellRef;
  to: CellRef;
}

/** One position of a floor's grid that is a room: a converted cell, or one the dressing added */
export interface Slot {
  at: CellRef;
  /** The converted cell at this position; none for a room the dressing added */
  cell?: ClassicCell;
  item?: Item;
  /** An added room opens on this neighbour only */
  anchor?: CellRef;
}

export interface BoardFloor {
  name: string;
  rows: number;
  cols: number;
  /** By "row,col" */
  slots: Map<string, Slot>;
}

export interface ClassicMove {
  what: string;
  from: CellRef;
  /** Where it went; the cell it came from when a boxed-in sealed fight hands it out once won (its drops) */
  to: CellRef;
  /** The thing went to a room the dressing added (a wall position or a grown row or column) */
  grown: boolean;
}

export interface ClassicDrop {
  what: string;
  at: CellRef;
  why: string;
}

export interface Board {
  dungeon: ClassicDungeon;
  floors: BoardFloor[];
  /** Every converted cell's slot, by the cell's own position (where it stands now may differ: `compacted`) */
  converted: Map<string, Slot>;
  moves: ClassicMove[];
  dropped: ClassicDrop[];
  merged: ClassicDrop[];
  compacted: ClassicCompaction[];
  shifted: FloorShift[];
  /** The added room a fall or a ride onto the boss lands in, beside him behind the Boss door */
  antechamber?: Slot;
  /** Warps whose landing was no circle and got one added: judged for the shortcut their ride back may open */
  warpPairs: WarpPair[];
}

export interface WarpPair {
  warp: Slot;
  landing: Slot;
}

/**
 * A floor whose cells all moved up and left by this much, once its empty leading rows and columns were cut; down or
 * right (a negative shift) for each row or column the dressing grew before the first (a room beside one on the top or
 * left edge). A converted cell stands at its own row less `rows`, its own column less `cols`.
 */
export interface FloorShift {
  floor: string;
  rows: number;
  cols: number;
}

export const posKey = (row: number, col: number): string => `${row},${col}`;

export const cellKey = (at: CellRef): string => `${at.floor}:${at.row},${at.col}`;

export const sameCell = (a: CellRef, b: CellRef): boolean => a.floor === b.floor && a.row === b.row && a.col === b.col;

export const describeCell = (at: CellRef): string => `${at.floor} (${at.row},${at.col})`;

/** The slot a link names: the converted cell at that position, wherever it stands now */
export const linkedSlot = (board: Board, link: ClassicLink | undefined): Slot | undefined =>
  link ? board.converted.get(cellKey({ floor: link.to, row: link.row, col: link.col })) : undefined;

export const DIRECTIONS = ["north", "east", "south", "west"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const STEP: Record<Direction, [number, number]> = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] };

/** The direction from one cell to an orthogonal neighbour, or undefined when they do not touch */
export const directionTo = (from: CellRef, to: CellRef): Direction | undefined =>
  DIRECTIONS.find((direction) => from.row + STEP[direction][0] === to.row && from.col + STEP[direction][1] === to.col);

export const floorOf = (board: Board, name: string): BoardFloor | undefined => board.floors.find((floor) => floor.name === name);

export const slotAt = (board: Board, at: CellRef): Slot | undefined => floorOf(board, at.floor)?.slots.get(posKey(at.row, at.col));

/** The slots of a floor in reading order */
export const slotsOf = (floor: BoardFloor): Slot[] => [...floor.slots.values()].sort((a, b) => a.at.row - b.at.row || a.at.col - b.at.col);

/** Every slot of the board, floors in the dungeon's order, each in reading order */
export const allSlots = (board: Board): Slot[] => board.floors.flatMap(slotsOf);

export const distance = (a: CellRef, b: CellRef): number => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

// --- reading the cells -----------------------------------------------------------------------------------------

/** How a thing is named in the report; a plain chest is named after what it holds, anything else after its kind */
const ITEM_NAMES: Partial<Record<ItemKind, string>> = {
  bigKey: "big-key chest",
  bigChest: "big-chest",
  potKey: "pot key",
  mustClearFight: "must-clear fight",
  sideFight: "side fight",
};

export const describeItem = (item: Item): string => {
  const isPlainChest = item.kind === "chest";
  if (isPlainChest) return `${item.chest} chest`;
  return ITEM_NAMES[item.kind] ?? item.kind;
};

interface FightPlan {
  /** The cell that fights for the room: the one with the most enemies, first in floor and reading order */
  at: CellRef;
  mustClear: boolean;
  keyDrop?: "small" | "big";
}

/**
 * Where a room the plan names as a mini-boss's fights when the converter read no enemies in it: the screen that holds
 * the Big Key (the chest then waits behind the fight), else its first screen in floor and reading order
 */
const quietFightCell = (dungeon: ClassicDungeon, room: string): CellRef => {
  const screens = dungeon.floors.flatMap((floor) =>
    [...floor.cells].sort((a, b) => a.row - b.row || a.col - b.col).filter((cell) => cell.room === room).map((cell) => ({ floor: floor.name, cell }))
  );
  const isUnknownRoom = screens.length === 0;
  if (isUnknownRoom) throw new Error(`${dungeon.id}: the plan names a mini-boss room the dungeon does not have: ${room}`);
  const { floor, cell } = screens.find((screen) => screen.cell.chest === "big-key") ?? screens[0];
  return { floor, row: cell.row, col: cell.col };
};

/**
 * One fight per LTTP room, in the screen with the most enemies; must-clear when a screen shuts or drops a key. A room
 * the plan names as a mini-boss's (`minibossRooms`) is must-clear whatever its screens say, and fights even with no
 * enemies read in it (quietFightCell).
 */
const planFights = (dungeon: ClassicDungeon, minibossRooms: readonly string[]): Map<string, FightPlan> => {
  const plans = new Map<string, FightPlan>();
  const most = new Map<string, number>();
  for (const floor of dungeon.floors) {
    for (const cell of [...floor.cells].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const isFirstOrMore = cell.enemies > (most.get(cell.room) ?? 0);
      if (isFirstOrMore) {
        most.set(cell.room, cell.enemies);
        plans.set(cell.room, { at: { floor: floor.name, row: cell.row, col: cell.col }, mustClear: false });
      }
    }
  }
  for (const room of minibossRooms) {
    const isFightless = !plans.has(room);
    if (isFightless) plans.set(room, { at: quietFightCell(dungeon, room), mustClear: true });
    plans.get(room)!.mustClear = true;
  }
  for (const floor of dungeon.floors) {
    for (const cell of floor.cells) {
      const plan = plans.get(cell.room);
      if (!plan) continue;
      const shutsOrDrops = Boolean(cell.shutter) || Boolean(cell.keyDrop);
      if (shutsOrDrops) plan.mustClear = true;
      if (cell.keyDrop) plan.keyDrop = cell.keyDrop;
    }
  }
  return plans;
};

/** The things one converted cell holds, in precedence order */
const itemsOf = (cell: ClassicCell, origin: CellRef, fights: Map<string, FightPlan>, board: Board): Item[] => {
  const at = origin;
  const base = { origin: at, room: cell.room };
  const items: Item[] = [];
  if (cell.entrance) items.push({ ...base, kind: "entrance" });
  if (cell.boss) items.push({ ...base, kind: "boss" });
  const fight = fights.get(cell.room);
  const isTheFightCell = Boolean(fight) && sameCell(fight!.at, at);
  if (isTheFightCell) items.push({ ...base, kind: fight!.mustClear ? "mustClearFight" : "sideFight", enemies: cell.enemies, keyDrop: fight!.keyDrop });
  const isMergedScreen = cell.enemies > 0 && !isTheFightCell;
  if (isMergedScreen) board.merged.push({ what: "enemies", at, why: `merged into the room's fight at ${describeCell(fight!.at)}` });
  // A key dropped where nothing fights lies in the open (a small one) or in a chest (the Big Key)
  const isKeyWithNoFight = Boolean(cell.keyDrop) && !fight;
  if (isKeyWithNoFight) items.push(cell.keyDrop === "big" ? { ...base, kind: "bigKey" } : { ...base, kind: "potKey" });
  if (cell.stairs) items.push({ ...base, kind: "stairs", link: cell.stairs });
  const isBigKeyChest = cell.chest === "big-key";
  if (isBigKeyChest) items.push({ ...base, kind: "bigKey", chest: cell.chest });
  const isBigChest = cell.chest === "big-chest";
  if (isBigChest) items.push({ ...base, kind: "bigChest", chest: cell.chest });
  const isPlainChest = cell.chest && !isBigKeyChest && !isBigChest;
  if (isPlainChest) items.push({ ...base, kind: "chest", chest: cell.chest });
  if (cell.potKey) items.push({ ...base, kind: "potKey" });
  if (cell.puzzle) items.push({ ...base, kind: "puzzle" });
  if (cell.teleport) items.push({ ...base, kind: "teleport", link: cell.teleport });
  if (cell.hole) items.push({ ...base, kind: "hole", link: cell.hole });
  return items.sort((a, b) => PRECEDENCE.indexOf(a.kind) - PRECEDENCE.indexOf(b.kind));
};

// --- what moves -----------------------------------------------------------------------------------------------

const drop = (board: Board, source: Slot, item: Item, why: string): void => {
  board.dropped.push({ what: describeItem(item), at: source.at, why });
};

/** What a displaced thing becomes: a riddle is dropped and listed, anything else moves (dressPlace says where) */
const settleDisplaced = (board: Board, floor: BoardFloor, source: Slot, item: Item): void => {
  const isRiddle = item.kind === "puzzle";
  if (isRiddle) {
    drop(board, source, item, `displaced by the ${describeItem(source.item!)}`);
    return;
  }
  relocate(board, floor, source, item);
};

/** How many sides of a converted cell are not walls */
const openSidesOf = (cell: ClassicCell): number => DIRECTIONS.filter((direction) => cell.sides[direction] !== "wall").length;

/** The Master Room (the Pegasus chest) in a free cell next to the boss, growing the floor by a row or a column if none is free */
const placeMaster = (board: Board, boss: Slot): void => {
  const slot = openNear(board, boss);
  slot.item = { kind: "master", origin: slot.at, room: "" };
};

// --- the board ---------------------------------------------------------------------------------------------------

interface Displaced {
  floor: BoardFloor;
  source: Slot;
  item: Item;
}

/**
 * The order displaced things settle in (each kind keeps the board's reading order): a sealed fight's own first, its
 * flight before the rest, so they take the sides beside the fight before anything else can (a hole moved off a
 * passage next door took the one free side beside GT's Frozen Over); then holes, which must find a dead end before a
 * chest or a circle takes it; then the rest.
 */
const settleRank = ({ source, item }: Displaced): number => {
  const isFromASeal = source.item?.kind === "mustClearFight";
  if (isFromASeal) return item.kind === "stairs" ? 0 : 1;
  return item.kind === "hole" ? 2 : 3;
};

/**
 * The boss room's own exits (the hole and the warp LTTP leaves a beaten boss's room by) are settled last, once the
 * landing and the Master Room stand beside him: each is a pit or a circle that never touches the boss cell (that
 * would be a second door into his room).
 */
const settleBossExits = (board: Board, boss: Slot, exits: Displaced[]): void => {
  for (const { floor, source, item } of exits) relocate(board, floor, source, item, { notBeside: boss.at });
};

/**
 * Read the dungeon into a board: one thing per cell, the rest moved or dropped, the Master Room beside the boss. The
 * rooms a plan names as mini-bosses' (`minibossRooms`) fight and seal from the start, so what they hold waits behind them.
 */
export const buildBoard = (dungeon: ClassicDungeon, minibossRooms: readonly string[] = []): Board => {
  const board: Board = { dungeon, floors: [], converted: new Map(), moves: [], dropped: [], merged: [], compacted: [], shifted: [], warpPairs: [] };
  const fights = planFights(dungeon, minibossRooms);
  const displaced: Displaced[] = [];
  const bossExits: Displaced[] = [];
  for (const level of dungeon.floors) {
    const floor: BoardFloor = { name: level.name, rows: level.rows, cols: level.cols, slots: new Map() };
    board.floors.push(floor);
    for (const cell of [...level.cells].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const at = { floor: level.name, row: cell.row, col: cell.col };
      const slot: Slot = { at, cell };
      floor.slots.set(posKey(cell.row, cell.col), slot);
      board.converted.set(cellKey(at), slot);
    }
  }
  compactIslands(board);
  shiftFloors(board);
  for (const slot of allSlots(board)) {
    // A thing's origin is the cell it was converted from, where the island stood before it was moved beside the rest
    const origin = { floor: slot.at.floor, row: slot.cell!.row, col: slot.cell!.col };
    const [first, ...rest] = itemsOf(slot.cell!, origin, fights, board);
    const floor = floorOf(board, slot.at.floor)!;
    // A hole on a passage (a screen with ways through it) would cut the floor as a pit: the hole goes to a dead end
    // added beside it and the screen stays an empty room
    const isHoleOnAPassage = first?.kind === "hole" && openSidesOf(slot.cell!) >= 2;
    slot.item = isHoleOnAPassage ? { kind: "empty", origin, room: slot.cell!.room } : first;
    if (isHoleOnAPassage) displaced.push({ floor, source: slot, item: first });
    const isBossCell = first?.kind === "boss";
    for (const item of rest) {
      const isBossExit = isBossCell && (item.kind === "hole" || item.kind === "teleport");
      (isBossExit ? bossExits : displaced).push({ floor, source: slot, item });
    }
  }
  // Every cell's own thing is known before anything moves; then it moves in settling order (settleRank)
  const ordered = [...displaced].sort((a, b) => settleRank(a) - settleRank(b));
  for (const { floor, source, item } of ordered) settleDisplaced(board, floor, source, item);
  const boss = allSlots(board).find((slot) => slot.item?.kind === "boss");
  if (!boss) throw new Error(`${board.dungeon.id}: no boss cell`);
  placeAntechamber(board, boss);
  placeMaster(board, boss);
  settleBossExits(board, boss, bossExits);
  placeLandingCircles(board);
  return board;
};
