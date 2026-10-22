/**
 * Where the dressing puts what lost its cell (dressBoard reads the cells; this places what moves), and the rooms it
 * adds of its own (the Master Room, a landing circle, the shop). A room the dressing adds opens on one neighbour only
 * (its anchor), so it never shortcuts a lock. The rules, by what moves and where from:
 * - out of a sealed fight (its flight first, then its chests, holes and circles): beside the fight, else beside a
 *   room the hero walks to only through it, a chest or a key handed out by the fight itself when there is none; a
 *   flight or a circle whose other end the hero reaches without the fight stands beside it or in front of every seal.
 *   Never anywhere else the hero walks without the fight;
 * - a hole or a circle: a dead end of its own LTTP room, else beside its cell (a pit on a passage would cut it);
 * - a chest or a key: beside its cell, else the nearest room the hero walks to from there with nothing in hand (no
 *   key, no Bomb, no seal), so it never ends up behind the lock it opens;
 * - anything else (a flight, a side fight): the nearest free cell of its LTTP room, else of its floor, else a wall
 *   position inside the grid, else a grown row or column;
 * - a landing circle (dressLinks) and the shop: beside its landing (the entrance), else beside a room walked to from
 *   there with nothing in hand; for a warp onto a sealed fight, beside the fight or beside a room in front of every
 *   seal (what the converted dungeon reaches with every must-clear fight and the boss shut, or, when the warp's own cell
 *   lies past a seal, from that cell without crossing one), never beyond it.
 * When the room something must stand beside lies on the grid's top or left edge with every other side taken, the
 * floor grows a row or a column before its first (the last resort; `shifted` reports the move).
 */
import { DIRECTIONS, STEP, allSlots, describeCell, describeItem, distance, floorOf, posKey, sameCell, slotsOf, type Board, type BoardFloor, type CellRef, type Item, type ItemKind, type Slot } from "./dressBoard";
import { convertedHops, convertedKey, convertedWalk, isLandedOn, isSeal, ownCell, walkFrom, walksThrough } from "./dressReach";

/** A row or a column the grid grows by to open a room: after the last one, or before the first (the floor then moves down or right) */
type Growth = "row" | "col" | "rowBefore" | "colBefore";

interface Candidate {
  at: CellRef;
  /** An existing free converted cell, or a position the dressing opens (a wall inside the grid, a grown row or column) */
  slot?: Slot;
  grows?: Growth;
}

/** The slots orthogonally next to a position that hold a room an added room can open on (a pit drops whoever walks in, so it is no door to anything) */
const occupiedNeighbours = (floor: BoardFloor, at: CellRef): Slot[] =>
  DIRECTIONS.map((direction) => floor.slots.get(posKey(at.row + STEP[direction][0], at.col + STEP[direction][1]))).filter((slot): slot is Slot => Boolean(slot?.item) && slot!.item!.kind !== "hole");

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

/** The positions a column before the first or a row before the first would open that touch a room (a room on the top or left edge) */
const leadingGrowthPositions = (floor: BoardFloor): Candidate[] => {
  const column: Candidate[] = Array.from({ length: floor.rows }, (_, row) => ({ at: { floor: floor.name, row, col: -1 }, grows: "colBefore" as const }));
  const line: Candidate[] = Array.from({ length: floor.cols }, (_, col) => ({ at: { floor: floor.name, row: -1, col }, grows: "rowBefore" as const }));
  return [...column, ...line].filter((candidate) => occupiedNeighbours(floor, candidate.at).length > 0);
};

/**
 * Grow a floor by a row before its first or a column before its first: every room of it moves down or right by one, in
 * place (anchors, circle targets and the report's moves name the same positions, so they follow), and the report's
 * `shifted` takes the move as a negative shift, so a reader still finds each converted cell from the dungeon's place.
 */
const growBefore = (board: Board, floor: BoardFloor, growth: "rowBefore" | "colBefore"): void => {
  const isRow = growth === "rowBefore";
  const slots = [...floor.slots.values()];
  floor.slots.clear();
  for (const slot of slots) {
    if (isRow) slot.at.row += 1;
    else slot.at.col += 1;
    floor.slots.set(posKey(slot.at.row, slot.at.col), slot);
  }
  if (isRow) floor.rows += 1;
  else floor.cols += 1;
  for (const island of board.compacted.filter((entry) => entry.to.floor === floor.name)) island.to = { floor: floor.name, row: island.to.row + Number(isRow), col: island.to.col + Number(!isRow) };
  const known = board.shifted.find((entry) => entry.floor === floor.name);
  const shift = known ?? { floor: floor.name, rows: 0, cols: 0 };
  if (!known) board.shifted.push(shift);
  if (isRow) shift.rows -= 1;
  else shift.cols -= 1;
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
const openSlot = (board: Board, floor: BoardFloor, candidate: Candidate, source: CellRef, anchor?: CellRef): Slot => {
  const isNewColumn = candidate.grows === "col";
  if (isNewColumn) floor.cols += 1;
  const isNewRow = candidate.grows === "row";
  if (isNewRow) floor.rows += 1;
  const isLeading = candidate.grows === "rowBefore" || candidate.grows === "colBefore";
  // The floor moves down or right by one (the source and the anchor with it): the new line is row or column 0
  if (isLeading) growBefore(board, floor, candidate.grows as "rowBefore" | "colBefore");
  const at = isLeading ? { floor: floor.name, row: Math.max(0, candidate.at.row), col: Math.max(0, candidate.at.col) } : candidate.at;
  const slot: Slot = { at, anchor: anchor ?? anchorFor(floor, at, source) };
  floor.slots.set(posKey(at.row, at.col), slot);
  return slot;
};

/** What narrows where a displaced thing may go */
export interface PlacementLimits {
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
  const free = limits.addedOnly ? [] : freeConvertedSlots(floor);
  const allowed = (candidate: Candidate): boolean => !limits.notBeside || distance(candidate.at, limits.notBeside) !== 1;
  const tiers: Candidate[][] = [
    free.filter((slot) => slot.cell?.room === room).map((slot) => ({ at: slot.at, slot })),
    free.map((slot) => ({ at: slot.at, slot })),
    wallPositions(floor),
    growthPositions(floor),
    leadingGrowthPositions(floor),
  ].map((candidates) => candidates.filter(allowed));
  const tier = tiers.find((candidates) => candidates.length > 0);
  if (!tier) throw new Error(`${board.dungeon.id}: no room for what ${describeCell(source)} holds`);
  const chosen = nearestTo(source, tier)!;
  return chosen.slot ?? openSlot(board, floor, chosen, source);
};

/** A converted cell with one way in and out that no link lands on: where a hole or a circle may go without blocking a passage */
const isDeadEnd = (board: Board, slot: Slot): boolean =>
  Boolean(slot.cell) && DIRECTIONS.filter((direction) => slot.cell!.sides[direction] !== "wall").length === 1 && !isLandedOn(board, slot);

/**
 * A converted cell that is empty, opens on nothing but `beside`, through a side the hero passes with nothing in hand
 * (never a small lock or a cracked wall: Skull Woods' Lone Pot lies behind the Big Key room's cracked wall), and is
 * reached by no link: a nook that is `beside`'s alone
 */
const isNookOf = (board: Board, slot: Slot, beside: CellRef): boolean => {
  const toward = DIRECTIONS.find((direction) => slot.at.row + STEP[direction][0] === beside.row && slot.at.col + STEP[direction][1] === beside.col);
  const opensOnBesideAlone = Boolean(slot.cell) && !slot.item && Boolean(toward) && DIRECTIONS.every((direction) => direction === toward || slot.cell!.sides[direction] === "wall");
  return opensOnBesideAlone && walksThrough(slot.cell!.sides[toward!]) && !isLandedOn(board, slot);
};

/** How a room may be opened beside another */
interface BesideLimits {
  /** Only a room the dressing adds: never a nook of the dungeon's own */
  addedOnly?: boolean;
  /** Also a row or a column grown before the first (the last resort: the whole floor moves down or right by one) */
  leading?: boolean;
}

/**
 * A room the dressing adds in a free cell next to `beside`, opening on it alone (the Master Room, the antechamber of a
 * fall, a landing circle, what a sealed fight held): a nook that is `beside`'s alone, else a wall position inside the
 * grid, else a grown row or column after the last (before the first, when `leading` allows it); undefined when nothing
 * touches `beside`.
 */
export const tryOpenBeside = (board: Board, beside: Slot, limits: BesideLimits = {}): Slot | undefined => {
  const floor = floorOf(board, beside.at.floor)!;
  const touching = (candidate: Candidate): boolean => distance(candidate.at, beside.at) === 1;
  const nooks = limits.addedOnly ? [] : freeConvertedSlots(floor).filter((slot) => isNookOf(board, slot, beside.at)).map((slot) => ({ at: slot.at, slot }));
  const leading = limits.leading ? leadingGrowthPositions(floor).filter(touching) : [];
  const tiers: Candidate[][] = [nooks, wallPositions(floor).filter(touching), growthPositions(floor).filter(touching), leading];
  const tier = tiers.find((candidates) => candidates.length > 0);
  if (!tier) return undefined;
  const chosen = nearestTo(beside.at, tier)!;
  const slot = chosen.slot ?? openSlot(board, floor, chosen, beside.at, beside.at);
  slot.anchor = beside.at;
  return slot;
};

/**
 * A room added beside `beside` when a side of it is free, else the nearest room the dressing can add. It never fails:
 * a floor that holds a room always has a position to grow on next to one (placeNearest's last tier), and no limit
 * narrows it here.
 */
export const openNear = (board: Board, beside: Slot): Slot => tryOpenBeside(board, beside) ?? placeNearest(board, floorOf(board, beside.at.floor)!, beside.at, undefined, { addedOnly: true });

/**
 * The first room a walk gives, nearest first: one of its free converted cells when `takesFree` lets the thing stand
 * there, else a room added beside one of its rooms
 */
const firstAlong = (board: Board, walk: Slot[], takesFree: (slot: Slot) => boolean): Slot | undefined => {
  for (const slot of walk) {
    const isFreeCell = Boolean(slot.cell) && !slot.item;
    const isTaken = isFreeCell && takesFree(slot);
    if (isTaken) return slot;
    const beside = tryOpenBeside(board, slot);
    if (beside) return beside;
  }
  return undefined;
};

/** Which side of a sealed fight the dungeon puts a cell or a link on */
interface SealSide {
  /** A converted cell (by its own position) the hero reaches from the entrance without the fight */
  isBefore: (slot: Slot) => boolean;
  /** A flight or a warp whose other end (the twin flight, the warp's landing) the hero reaches without the fight */
  arrivesFromBefore: (item: Item | undefined) => boolean;
}

const sideOf = (board: Board, fight: Slot): SealSide => {
  const before = convertedHops(board.dungeon, ownCell(fight));
  return {
    isBefore: (slot) => Boolean(slot.cell) && before.has(convertedKey(slot.at.floor, slot.cell!.row, slot.cell!.col)),
    // A warp's ride back (the landing circle the dressing pairs it with) comes from its landing
    arrivesFromBefore: (item) => {
      const isLink = item?.kind === "stairs" || item?.kind === "teleport";
      return isLink && Boolean(item!.link) && before.has(convertedKey(item!.link!.to, item!.link!.row, item!.link!.col));
    },
  };
};

/** A chest or a key: it goes beside its cell first, else no farther than the hero walks from there with nothing in hand */
const TREASURE: ReadonlySet<ItemKind> = new Set<ItemKind>(["bigKey", "bigChest", "chest", "potKey"]);

/** A small key or gold: a fight hands out any number of them beside the one Dungeon Item its drop holds */
const isKeyOrGold = (item: Item): boolean => item.kind === "potKey" || item.chest === "small-key" || item.chest === "other";

/** A sealed fight can hand out a chest or a key of its cell once won (its `drops`): keys and gold always, one Dungeon Item at most */
const canHandOut = (fight: Slot, item: Item): boolean => {
  const fightItem = fight.item!;
  const holdsADungeonItem = fightItem.keyDrop === "big" || (fightItem.holds ?? []).some((held) => !isKeyOrGold(held));
  return TREASURE.has(item.kind) && (isKeyOrGold(item) || !holdsADungeonItem);
};

/** The converted cell a flight or a circle leads to (its twin, its landing) */
const linkEnd = (item: Item): CellRef | undefined => (item.link ? { floor: item.link.to, row: item.link.row, col: item.link.col } : undefined);

/** A converted cell's key by its own position, as the dungeon's links name it */
const ownKey = (slot: Slot): string => convertedKey(slot.at.floor, slot.cell!.row, slot.cell!.col);

/**
 * The converted cells in front of every seal: what the hero reaches from the entrance with every must-clear fight and
 * the boss shut. For a link whose far end (the twin flight, the circle the hero rides in from) lies past a seal, what the
 * hero reaches from that end without crossing one, and not from the entrance (its ride back must not open it).
 */
const frontCells = (board: Board, farEnd?: CellRef): Set<string> => {
  const barred = new Set(allSlots(board).filter(isSeal).map((slot) => convertedKey(slot.item!.origin.floor, slot.item!.origin.row, slot.item!.origin.col)));
  const fromEntrance = convertedWalk(board.dungeon, { barred });
  const farKey = farEnd ? convertedKey(farEnd.floor, farEnd.row, farEnd.col) : undefined;
  const isFarPastASeal = Boolean(farKey) && !fromEntrance.has(farKey!);
  if (!isFarPastASeal) return new Set(fromEntrance.keys());
  return new Set([...convertedWalk(board.dungeon, { from: farEnd, barred }).keys()].filter((key) => !fromEntrance.has(key)));
};

/**
 * The room beside the nearest room in front: beside a sealed fight, in front of every seal (frontCells), first the
 * rooms the hero walks to from it (its walk crosses locks, as the dungeon reads them: GT's Bob's Torch is boxed in,
 * and the Hope Room beyond its small lock stands in front), else those of its floor nearest it; beside any other room,
 * the rooms walked to from it with nothing in hand and no seal passed. Undefined when there is none. A room the
 * dressing added beside a sealed fight stands beyond it, and so does whatever opens on such a room.
 */
const besideInFront = (board: Board, from: Slot, farEnd?: CellRef): Slot | undefined => {
  const isSealed = from.item?.kind === "mustClearFight";
  const front = isSealed ? frontCells(board, farEnd) : undefined;
  const isFrontCell = (slot: Slot): boolean => Boolean(slot.cell) && (!front || front.has(ownKey(slot)));
  const isInFront = (slot: Slot): boolean => !isSeal(slot) && (slot.cell ? isFrontCell(slot) : !isSealed || !sameCell(slot.anchor!, from.at));
  const walk = walkFrom(board, from, isInFront, isSealed).slice(1);
  const nearest = slotsOf(floorOf(board, from.at.floor)!)
    .filter((slot) => isSealed && isFrontCell(slot) && !isSeal(slot) && !walk.includes(slot))
    .sort((a, b) => distance(from.at, a.at) - distance(from.at, b.at));
  return firstAlong(board, [...walk, ...nearest], () => false);
};

/**
 * Where a thing pushed out of a sealed fight goes: beside the fight (a nook of its own or an added room that opens on
 * it alone). A flight or a warp that brings the hero in from in front of the fight (in LTTP it landed them inside it)
 * goes nowhere else but in front of it, as a landing circle does. Anything else: beside a room the hero walks to only
 * through the fight and no other seal (never a room a link brings the hero into from in front); a chest or a key with
 * no such room is handed out by the fight itself once won (the fight's own slot comes back and relocate folds it into
 * the fight's drops: GT's DMs Room is a dead end boxed in on every side); else beside a room beyond a further fight
 * (walked to from the fight with nothing in hand, so no climb waits on itself). A hole or a circle takes no passage.
 */
const placeBeyondSeal = (board: Board, fight: Slot, item: Item): Slot => {
  const side = sideOf(board, fight);
  const besideTheFight = tryOpenBeside(board, fight);
  if (besideTheFight) return besideTheFight;
  const facesTheFight = side.arrivesFromBefore(item);
  if (facesTheFight) return tryOpenBeside(board, fight, { leading: true }) ?? openInFront(board, fight, linkEnd(item));
  const isBeyond = (slot: Slot): boolean => !side.isBefore(slot) && !side.arrivesFromBefore(slot.item);
  const passesNoSeal = (slot: Slot): boolean => isBeyond(slot) && !isSeal(slot);
  const passesFights = (slot: Slot): boolean => isBeyond(slot) && slot.item?.kind !== "boss";
  const isLink = item.kind === "hole" || item.kind === "teleport";
  const takesFree = (slot: Slot): boolean => !isLink || isDeadEnd(board, slot);
  const handedOut = canHandOut(fight, item) ? fight : undefined;
  const placed =
    firstAlong(board, walkFrom(board, fight, passesNoSeal).slice(1), takesFree) ??
    tryOpenBeside(board, fight, { leading: true }) ??
    handedOut ??
    firstAlong(board, walkFrom(board, fight, passesFights).slice(1), takesFree);
  if (!placed) throw new Error(`${board.dungeon.id}: no room beyond the sealed fight at ${describeCell(fight.at)} for its ${describeItem(item)}`);
  return placed;
};

/**
 * A room added beside `from`, else beside the nearest room in front of every seal (besideInFront): a landing circle,
 * the shop, a flight that brought the hero into a sealed fight. `farEnd` is the converted cell the link comes from (the
 * warp the hero rides in on, the twin flight). Never beyond a seal; with no such room beside a sealed fight it throws,
 * elsewhere the nearest room the dressing can add.
 */
export const openInFront = (board: Board, from: Slot, farEnd?: CellRef): Slot => {
  const opened = tryOpenBeside(board, from) ?? besideInFront(board, from, farEnd) ?? tryOpenBeside(board, from, { leading: true });
  if (opened) return opened;
  const isSealed = from.item?.kind === "mustClearFight";
  if (isSealed) throw new Error(`${board.dungeon.id}: no room in front of the sealed fight at ${describeCell(from.at)}`);
  return openNear(board, from);
};

/** A dead end of `item`'s own LTTP room, nearest its source */
const nookOfItsRoom = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits): Slot | undefined => {
  const allowed = (slot: Slot): boolean => !limits.notBeside || distance(slot.at, limits.notBeside) !== 1;
  const nooks = freeConvertedSlots(floor).filter((slot) => slot.cell?.room === item.room && isDeadEnd(board, slot) && allowed(slot));
  return nearestTo(source.at, nooks.map((slot) => ({ at: slot.at, slot })))?.slot;
};

/**
 * Where a hole or a circle pushed out of its cell goes: a free dead-end cell of its own LTTP room, else a room added
 * beside its source, else the nearest added room; never a converted cell with two or more ways through it, which a pit
 * would cut (a pit drops whoever walks in) and a circle would clutter.
 */
const placeInDeadEnd = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits): Slot => {
  const nook = nookOfItsRoom(board, floor, source, item, limits);
  if (nook) return nook;
  const beside = limits.notBeside ? undefined : tryOpenBeside(board, source, { addedOnly: true });
  return beside ?? placeNearest(board, floor, source.at, undefined, { ...limits, addedOnly: true });
};

/**
 * Where a chest or a key goes when it leaves a cell that does not seal: beside that cell (a nook of its own or an added
 * room that opens on it alone), else the nearest cell the hero walks to from it with nothing in hand and no seal
 * passed, or beside one of those (the Water Palace's entrance key chest stays before the locked flight it opens), else
 * beside the cell in a row or a column grown before the first (Turtle Rock's Chain Chomps sit in a corner
 * behind a seal), and only then the nearest free cell.
 */
const placeWithinReach = (board: Board, floor: BoardFloor, source: Slot, item: Item): Slot =>
  tryOpenBeside(board, source) ??
  firstAlong(board, walkFrom(board, source, (slot) => !isSeal(slot)).slice(1), () => true) ??
  tryOpenBeside(board, source, { leading: true }) ??
  placeNearest(board, floor, source.at, item.room);

/** Where a displaced thing goes, by what it is and where it comes from (see the top of this file) */
const placeFor = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits): Slot => {
  const isFromASeal = source.item?.kind === "mustClearFight";
  if (isFromASeal) return placeBeyondSeal(board, source, item);
  const isLink = item.kind === "hole" || item.kind === "teleport";
  if (isLink) return placeInDeadEnd(board, floor, source, item, limits);
  const isTreasure = TREASURE.has(item.kind);
  if (isTreasure) return placeWithinReach(board, floor, source, item);
  return placeNearest(board, floor, source.at, item.room, limits);
};

/**
 * Move a displaced thing where placeFor says, and report it. When placeFor hands back the source itself (a boxed-in
 * sealed fight), the fight keeps the chest or key as what it hands out once won, and the move reads from the fight to
 * the fight.
 */
export const relocate = (board: Board, floor: BoardFloor, source: Slot, item: Item, limits: PlacementLimits = {}): Slot => {
  const slot = placeFor(board, floor, source, item, limits);
  const isHandedOut = slot === source;
  if (isHandedOut) source.item!.holds = [...(source.item!.holds ?? []), item];
  else slot.item = item;
  board.moves.push({ what: describeItem(item), from: source.at, to: slot.at, grown: !slot.cell });
  return slot;
};
