/**
 * The board of a converted dungeon: every cell of every floor read as the things it holds (an entrance, a boss, a
 * fight, stairs, a chest...), one thing kept per cell and the rest moved, so each cell ends up as one room of ours.
 *
 * One fight per LTTP room (Review Focus 2): the screen with the most enemies fights, the other screens' enemies fold
 * into it. A room with a shutter or a key drop among its screens is must-clear; the key goes with the fight.
 *
 * Precedence, one thing per cell: entrance > boss > must-clear fight > stairs > Big Key chest > Big Chest > other
 * chests and a key in the open > puzzle > circle > hole > side fight. A must-clear fight outranks the stairs that
 * share its screen because the fight is what gates the doors there; the stairs land next door instead (a flight can
 * name its landing, `targetCoords`). What loses its cell moves: to the nearest free cell of the same LTTP room, else
 * the nearest free cell of the floor, else a wall position inside the grid, else the grid grows by a row or a column.
 * A room the dressing adds this way opens on one neighbour only (its anchor), so it never shortcuts a lock. Holes and
 * circles only move when their landing is a circle (the ride comes back); a riddle, a hole or a circle that has
 * nowhere to go is dropped and listed. Every move, drop and merge goes in the report.
 */
import type { ClassicCell, ClassicDungeon, ClassicLink } from "./classicDungeon";
import { compactIslands, placeAntechamber, placeLandingCircles, shiftFloors } from "./dressLinks";

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
}

/** A floor whose cells all moved up and left by this much, once its empty leading rows and columns were cut */
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

/** The slots orthogonally next to a position that hold a room an added room can open on (a pit drops whoever walks in, so it is no door to anything) */
const occupiedNeighbours = (floor: BoardFloor, at: CellRef): Slot[] =>
  DIRECTIONS.map((direction) => floor.slots.get(posKey(at.row + STEP[direction][0], at.col + STEP[direction][1]))).filter((slot): slot is Slot => Boolean(slot?.item) && slot!.item!.kind !== "hole");

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

/** One fight per LTTP room, in the screen with the most enemies; must-clear when a screen shuts or drops a key */
const planFights = (dungeon: ClassicDungeon): Map<string, FightPlan> => {
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

// --- placing what was displaced --------------------------------------------------------------------------------

interface Candidate {
  at: CellRef;
  /** An existing free converted cell, or a position the dressing opens (a wall inside the grid, a grown row or column) */
  slot?: Slot;
  grows?: "row" | "col";
}

const freeConvertedSlots = (floor: BoardFloor): Slot[] => slotsOf(floor).filter((slot) => slot.cell && !slot.item);

/** Positions inside the grid that hold no cell and touch a room */
const wallPositions = (floor: BoardFloor): Candidate[] => {
  const found: Candidate[] = [];
  for (let row = 0; row < floor.rows; row++) {
    for (let col = 0; col < floor.cols; col++) {
      const at = { floor: floor.name, row, col };
      const isOpenable = !floor.slots.has(posKey(row, col)) && occupiedNeighbours(floor, at).length > 0;
      if (isOpenable) found.push({ at });
    }
  }
  return found;
};

/** The positions a new column or a new row would open that touch a room */
const growthPositions = (floor: BoardFloor): Candidate[] => {
  const column: Candidate[] = Array.from({ length: floor.rows }, (_, row) => ({ at: { floor: floor.name, row, col: floor.cols }, grows: "col" as const }));
  const line: Candidate[] = Array.from({ length: floor.cols }, (_, col) => ({ at: { floor: floor.name, row: floor.rows, col }, grows: "row" as const }));
  return [...column, ...line].filter((candidate) => occupiedNeighbours(floor, candidate.at).length > 0);
};

const nearestTo = (source: CellRef, candidates: Candidate[]): Candidate | undefined =>
  [...candidates].sort((a, b) => distance(source, a.at) - distance(source, b.at) || a.at.row - b.at.row || a.at.col - b.at.col)[0];

/** The neighbour an added room opens on: the nearest to the source cell, a room displaced from the same cell first */
const anchorFor = (floor: BoardFloor, at: CellRef, source: CellRef): CellRef => {
  const neighbours = occupiedNeighbours(floor, at);
  const isFromSource = (slot: Slot): number => Number(Boolean(slot.item && sameCell(slot.item.origin, source)));
  const sorted = [...neighbours].sort((a, b) => {
    const byDistance = distance(source, a.at) - distance(source, b.at);
    const sameSourceFirst = isFromSource(b) - isFromSource(a);
    return byDistance || sameSourceFirst || a.at.row - b.at.row || a.at.col - b.at.col;
  });
  return sorted[0].at;
};

/** Open a room at a position the dressing adds, growing the grid when the position lies outside it */
export const openSlot = (floor: BoardFloor, candidate: Candidate, source: CellRef, anchor?: CellRef): Slot => {
  const isNewColumn = candidate.grows === "col";
  if (isNewColumn) floor.cols += 1;
  const isNewRow = candidate.grows === "row";
  if (isNewRow) floor.rows += 1;
  const slot: Slot = { at: candidate.at, anchor: anchor ?? anchorFor(floor, candidate.at, source) };
  floor.slots.set(posKey(candidate.at.row, candidate.at.col), slot);
  return slot;
};

/** What narrows where a displaced thing may go */
export interface PlacementLimits {
  /** Never a cell of this LTTP room: a flight displaced from a must-clear fight must not land in a screen beyond the seal */
  avoidRoom?: string;
  /** Never a position that touches this cell: a pit beside the boss would be a second door into his room */
  notBeside?: CellRef;
  /** Only a room the dressing adds (a wall position, a grown row or column): never a converted cell */
  addedOnly?: boolean;
}

/**
 * Where a displaced thing goes: a free converted cell of the same LTTP room, else a free converted cell of the floor,
 * else a wall position inside the grid, else a grown row or column; the nearest of the first tier that has one.
 */
export const placeNearest = (board: Board, floor: BoardFloor, source: CellRef, room: string | undefined, limits: PlacementLimits = {}): Slot => {
  const free = limits.addedOnly ? [] : freeConvertedSlots(floor).filter((slot) => !limits.avoidRoom || slot.cell?.room !== limits.avoidRoom);
  const allowed = (candidate: Candidate): boolean => !limits.notBeside || distance(candidate.at, limits.notBeside) !== 1;
  const tiers: Candidate[][] = [
    free.filter((slot) => slot.cell?.room === room).map((slot) => ({ at: slot.at, slot })),
    free.map((slot) => ({ at: slot.at, slot })),
    wallPositions(floor),
    growthPositions(floor),
  ].map((candidates) => candidates.filter(allowed));
  const tier = tiers.find((candidates) => candidates.length > 0);
  if (!tier) throw new Error(`${board.dungeon.id}: no room for what ${describeCell(source)} holds`);
  const chosen = nearestTo(source, tier)!;
  return chosen.slot ?? openSlot(floor, chosen, source);
};

/** A converted cell with one way in and out: where a hole or a circle pushed out of its cell may go without blocking a passage */
const isDeadEnd = (slot: Slot): boolean => Boolean(slot.cell) && DIRECTIONS.filter((direction) => slot.cell!.sides[direction] !== "wall").length === 1;

/**
 * Where a hole or a circle pushed out of its cell goes: a free dead-end cell of its own LTTP room, else a room added
 * beside its source, else the nearest added room; never a converted cell with two or more ways through it, which a pit
 * would cut (a pit drops whoever walks in) and a circle would clutter.
 */
const placeInDeadEnd = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits): Slot => {
  const allowed = (slot: Slot): boolean => !limits.notBeside || distance(slot.at, limits.notBeside) !== 1;
  const nooks = freeConvertedSlots(floor).filter((slot) => slot.cell?.room === item.room && isDeadEnd(slot) && allowed(slot));
  const nook = nearestTo(source.at, nooks.map((slot) => ({ at: slot.at, slot })));
  if (nook?.slot) return nook.slot;
  const beside = limits.notBeside ? undefined : tryOpenBeside(board, source, { addedOnly: true });
  return beside ?? placeNearest(board, floor, source.at, undefined, { ...limits, addedOnly: true });
};

export const relocate = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits = {}): Slot => {
  const isLink = item.kind === "hole" || item.kind === "teleport";
  const slot = isLink ? placeInDeadEnd(board, floor, source, item, limits) : placeNearest(board, floor, source.at, item.room, limits);
  slot.item = item;
  board.moves.push({ what: describeItem(item), from: source.at, to: slot.at, grown: !slot.cell });
  return slot;
};

const drop = (board: Board, source: Slot, item: Item, why: string): void => {
  board.dropped.push({ what: describeItem(item), at: source.at, why });
};

/**
 * What a displaced thing becomes: a hole or a circle is never dropped (a pit or a circle in a dead end, named by its
 * link; a circle whose landing is no circle gets one there later), a flight displaced from a must-clear fight never
 * lands in a screen of that room beyond the seal, a riddle is dropped.
 */
const settleDisplaced = (board: Board, floor: BoardFloor, source: Slot, item: Item): void => {
  const isRiddle = item.kind === "puzzle";
  if (isRiddle) {
    drop(board, source, item, `displaced by the ${describeItem(source.item!)}`);
    return;
  }
  const isFlightOutOfASeal = item.kind === "stairs" && source.item?.kind === "mustClearFight";
  relocate(board, floor, source, item, isFlightOutOfASeal ? { avoidRoom: item.room } : {});
};

// --- the Master Room ---------------------------------------------------------------------------------------------

/** A converted cell that is empty and opens on nothing but the boss, so the Pegasus waits behind the boss alone */
const isDeadEndBeside = (slot: Slot, boss: CellRef): boolean => {
  const towardBoss = directionTo(slot.at, boss);
  return Boolean(slot.cell) && !slot.item && DIRECTIONS.every((direction) => direction === towardBoss || slot.cell!.sides[direction] === "wall");
};

/**
 * A room the dressing adds in a free cell next to `beside`, opening on it alone (the Master Room, the antechamber of a
 * fall, a landing circle): a dead-end empty cell, else a wall position inside the grid, else a grown row or column;
 * undefined when nothing touches `beside`.
 */
export const tryOpenBeside = (board: Board, beside: Slot, limits: Pick<PlacementLimits, "addedOnly"> = {}): Slot | undefined => {
  const floor = floorOf(board, beside.at.floor)!;
  const touching = (candidate: Candidate): boolean => distance(candidate.at, beside.at) === 1;
  const nooks = limits.addedOnly ? [] : freeConvertedSlots(floor).filter((slot) => isDeadEndBeside(slot, beside.at)).map((slot) => ({ at: slot.at, slot }));
  const tiers: Candidate[][] = [nooks, wallPositions(floor).filter(touching), growthPositions(floor).filter(touching)];
  const tier = tiers.find((candidates) => candidates.length > 0);
  if (!tier) return undefined;
  const chosen = nearestTo(beside.at, tier)!;
  const slot = chosen.slot ?? openSlot(floor, chosen, beside.at, beside.at);
  slot.anchor = beside.at;
  return slot;
};

/** A room added beside `beside` when a side of it is free, else the nearest room the dressing can add (never throws) */
export const openNear = (board: Board, beside: Slot): Slot => tryOpenBeside(board, beside) ?? placeNearest(board, floorOf(board, beside.at.floor)!, beside.at, undefined, { addedOnly: true });

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
 * The boss room's own exits (the hole and the warp LTTP leaves a beaten boss's room by) are settled last, once the
 * landing and the Master Room stand beside him: each is a pit or a circle that never touches the boss cell (that
 * would be a second door into his room).
 */
const settleBossExits = (board: Board, boss: Slot, exits: Displaced[]): void => {
  for (const { floor, source, item } of exits) relocate(board, floor, source, item, { notBeside: boss.at });
};

/** Read the dungeon into a board: one thing per cell, the rest moved or dropped, the Master Room beside the boss */
export const buildBoard = (dungeon: ClassicDungeon): Board => {
  const board: Board = { dungeon, floors: [], converted: new Map(), moves: [], dropped: [], merged: [], compacted: [], shifted: [] };
  const fights = planFights(dungeon);
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
    slot.item = first;
    const floor = floorOf(board, slot.at.floor)!;
    const isBossCell = first?.kind === "boss";
    for (const item of rest) {
      const isBossExit = isBossCell && (item.kind === "hole" || item.kind === "teleport");
      (isBossExit ? bossExits : displaced).push({ floor, source: slot, item });
    }
  }
  // Every cell's own thing is known before anything moves. Holes go first: a pit cuts a passage, so a hole gets a
  // room's dead end before a circle or a chest takes it
  const holesFirst = [...displaced].sort((a, b) => Number(b.item.kind === "hole") - Number(a.item.kind === "hole"));
  for (const { floor, source, item } of holesFirst) settleDisplaced(board, floor, source, item);
  const boss = allSlots(board).find((slot) => slot.item?.kind === "boss");
  if (!boss) throw new Error(`${board.dungeon.id}: no boss cell`);
  placeAntechamber(board, boss);
  placeMaster(board, boss);
  settleBossExits(board, boss, bossExits);
  placeLandingCircles(board);
  return board;
};
