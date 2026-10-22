/**
 * The doors of a dressed dungeon, as the Temple Creator draws them (`sides`): the side table of the design, the one
 * lock of a small-key door on the end the hero reaches first, the Boss door on every way into the boss cell, and a
 * door from every room the dressing added to the one neighbour it opens on. Then the Bomb chests: a cracked wall on
 * the only way to the boss gets a Bomb in the nearest reachable empty cell before it (the lead's ruling: whether or
 * not a shop sells Bombs), so the solver and a hero both pass it with nothing blown by hand.
 */
import type { ClassicCell, ClassicDungeon, ClassicSide } from "./classicDungeon";
import { DIRECTIONS, STEP, allSlots, describeCell, directionTo, floorOf, openSlot, posKey, slotAt, type Board, type BoardFloor, type CellRef, type Direction, type Slot } from "./dressBoard";
import { buildTempleGraph, reachableFrom, roomKey, type TempleGraph, type TempleLayout } from "@/lib/engine/dungeons/generator/templeGraph";

export type SideWord = "door" | "locked" | "masterlocked" | "bombable" | "wall";
export type Sides = Record<Direction, SideWord>;

export const OPPOSITE: Record<Direction, Direction> = { north: "south", south: "north", east: "west", west: "east" };

/** The side table of the design: a shutter and an item door are plain doors, a big-key door the Boss Lock */
const SIDE_WORD: Record<ClassicSide, SideWord> = {
  open: "door",
  shutter: "door",
  item: "door",
  "small-key": "locked",
  "big-key": "masterlocked",
  bomb: "bombable",
  wall: "wall",
};

export const sidesKey = (at: CellRef): string => roomKey(at);

const walls = (): Sides => ({ north: "wall", east: "wall", south: "wall", west: "wall" });

const cellKey = (floor: string, row: number, col: number): string => `${floor}:${row},${col}`;

/** How many steps from the entrance each converted cell is, every side but a wall open and every link taken */
const convertedDistances = (dungeon: ClassicDungeon): Map<string, number> => {
  const cells = new Map<string, { floor: string; cell: ClassicCell }>();
  for (const floor of dungeon.floors) for (const cell of floor.cells) cells.set(cellKey(floor.name, cell.row, cell.col), { floor: floor.name, cell });
  const start = [...cells.entries()].find(([, entry]) => entry.cell.entrance);
  const hops = new Map<string, number>();
  if (!start) return hops;
  hops.set(start[0], 0);
  const queue = [start[0]];
  while (queue.length) {
    const key = queue.shift()!;
    const { floor, cell } = cells.get(key)!;
    const next: string[] = [];
    for (const direction of DIRECTIONS) {
      const isWay = cell.sides[direction] !== "wall";
      if (isWay) next.push(cellKey(floor, cell.row + STEP[direction][0], cell.col + STEP[direction][1]));
    }
    for (const link of [cell.stairs, cell.hole, cell.teleport]) if (link) next.push(cellKey(link.to, link.row, link.col));
    for (const other of next) {
      const isNew = cells.has(other) && !hops.has(other);
      if (isNew) {
        hops.set(other, hops.get(key)! + 1);
        queue.push(other);
      }
    }
  }
  return hops;
};

/** Floors in the dungeon's order, then reading order: the tie-break of two cells as far from the entrance */
const readingOrder = (dungeon: ClassicDungeon, at: CellRef): number => dungeon.floors.findIndex((floor) => floor.name === at.floor) * 1e6 + at.row * 1e3 + at.col;

/**
 * A small-key door locks on the end the hero reaches first (the lock is one way in play and in the solver), and is a
 * plain door from the other end: the two ends never both ask for a key.
 */
const smallLockEnd = (board: Board, hops: Map<string, number>, slot: Slot, direction: Direction): SideWord => {
  const here = slot.at;
  const there = { floor: here.floor, row: here.row + STEP[direction][0], col: here.col + STEP[direction][1] };
  const hereHops = hops.get(cellKey(here.floor, here.row, here.col)) ?? Infinity;
  const thereHops = hops.get(cellKey(there.floor, there.row, there.col)) ?? Infinity;
  const isNearEnd = hereHops < thereHops || (hereHops === thereHops && readingOrder(board.dungeon, here) < readingOrder(board.dungeon, there));
  return isNearEnd ? "locked" : "door";
};

const convertedSides = (board: Board, hops: Map<string, number>, slot: Slot): Sides => {
  const sides = walls();
  for (const direction of DIRECTIONS) {
    const drawn = slot.cell!.sides[direction];
    sides[direction] = drawn === "small-key" ? smallLockEnd(board, hops, slot, direction) : SIDE_WORD[drawn];
  }
  return sides;
};

/** The sides of every room of the board, by room key (floor:row,col) */
export const drawSides = (board: Board): Map<string, Sides> => {
  const hops = convertedDistances(board.dungeon);
  const sides = new Map<string, Sides>();
  for (const slot of allSlots(board)) sides.set(sidesKey(slot.at), slot.cell ? convertedSides(board, hops, slot) : walls());

  // A room the dressing added opens on its anchor and on nothing else
  for (const slot of allSlots(board)) {
    const isAdded = !slot.cell && slot.anchor;
    if (!isAdded) continue;
    const toward = directionTo(slot.at, slot.anchor!);
    if (!toward) throw new Error(`${board.dungeon.id}: the added room at ${describeCell(slot.at)} does not touch its anchor ${describeCell(slot.anchor!)}`);
    sides.get(sidesKey(slot.at))![toward] = "door";
    sides.get(sidesKey(slot.anchor!))![OPPOSITE[toward]] = "door";
  }

  // Every way into the boss cell is the Boss door, whatever the dungeon drew there
  const boss = allSlots(board).find((slot) => slot.item?.kind === "boss");
  if (boss) {
    const own = sides.get(sidesKey(boss.at))!;
    for (const direction of DIRECTIONS) {
      const beside = slotAt(board, { floor: boss.at.floor, row: boss.at.row + STEP[direction][0], col: boss.at.col + STEP[direction][1] });
      const isWayIn = Boolean(beside?.item) && own[direction] !== "wall";
      if (!isWayIn) continue;
      own[direction] = "masterlocked";
      sides.get(sidesKey(beside!.at))![OPPOSITE[direction]] = "masterlocked";
    }
  }
  return sides;
};

// --- Bomb chests ------------------------------------------------------------------------------------------------

/** The two rooms of a cracked wall as one key, whichever end names it */
const crackKey = (a: string, b: string): string => [a, b].sort().join("|");

/** The layout with every cracked wall not yet given a Bomb read as a wall, as the lead's ruling reads them */
const withCracksClosed = (layout: TempleLayout, opened: ReadonlySet<string>): TempleLayout => {
  const graph = buildTempleGraph(layout);
  const rooms: TempleLayout["rooms"] = {};
  for (const [token, room] of Object.entries(layout.rooms)) rooms[token] = { ...room, barriers: room.barriers ? { ...room.barriers } : undefined };
  for (const door of graph.doors) {
    const isOpenedCrack = door.lock === "bomb" && opened.has(crackKey(door.from, door.to));
    const isCrack = door.lock === "bomb" && !isOpenedCrack;
    if (!isCrack) continue;
    const from = graph.rooms.get(door.from)!;
    const token = from.token;
    rooms[token] = { ...rooms[token], barriers: { ...rooms[token].barriers, [door.direction!]: "wall" } };
  }
  return { ...layout, rooms };
};

/** Steps from `start` to every room in reach, over the graph's doors */
export const hopsFrom = (graph: TempleGraph, start: string): Map<string, number> => {
  const hops = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const key = queue.shift()!;
    for (const door of graph.out.get(key) ?? []) {
      const isNew = !hops.has(door.to);
      if (isNew) {
        hops.set(door.to, hops.get(key)! + 1);
        queue.push(door.to);
      }
    }
  }
  return hops;
};

const refOf = (key: string): CellRef => {
  const [floor, position] = key.split(":");
  const [row, col] = position.split(",").map(Number);
  return { floor, row, col };
};

/** A Bomb chest in the nearest empty converted cell the hero can reach before the wall, else in a room added beside it */
const placeBombChest = (board: Board, floor: BoardFloor, near: CellRef, reachHops: Map<string, number>): CellRef => {
  const free = allSlots(board)
    .filter((slot) => slot.cell && !slot.item && reachHops.has(sidesKey(slot.at)))
    .sort((a, b) => reachHops.get(sidesKey(a.at))! - reachHops.get(sidesKey(b.at))!);
  const slot = free[0] ?? openBeside(board, floor, near);
  slot.item = { kind: "bombChest", origin: slot.at, room: slot.cell?.room ?? "" };
  return slot.at;
};

/** How the grid has to grow for a position: a new column, a new row, or not at all (inside the grid) */
const growthFor = (floor: BoardFloor, at: CellRef): "row" | "col" | undefined => {
  const isNewColumn = at.col === floor.cols;
  if (isNewColumn) return "col";
  const isNewRow = at.row === floor.rows;
  if (isNewRow) return "row";
  return undefined;
};

/** A room added next to `near`, on a wall position inside the grid or on a grown row or column */
const openBeside = (board: Board, floor: BoardFloor, near: CellRef): Slot => {
  for (const direction of DIRECTIONS) {
    const at = { floor: near.floor, row: near.row + STEP[direction][0], col: near.col + STEP[direction][1] };
    const isInside = at.row >= 0 && at.col >= 0 && at.row <= floor.rows && at.col <= floor.cols;
    const isFree = isInside && !floor.slots.has(posKey(at.row, at.col));
    if (!isFree) continue;
    return openSlot(floor, { at, grows: growthFor(floor, at) }, near, near);
  }
  throw new Error(`${board.dungeon.id}: no cell beside ${describeCell(near)} for a Bomb chest`);
};

/**
 * Bomb chests before the cracked walls on the only way to the boss. With every crack read as a wall, the walls the
 * hero stands before and cannot pass each get a chest in the nearest empty cell they can reach; those cracks then
 * count as open and the walk is tried again, until the boss is in reach. `layoutNow` renders the board as it stands.
 */
export const placeBombChests = (board: Board, layoutNow: () => TempleLayout): CellRef[] => {
  const chests: CellRef[] = [];
  const opened = new Set<string>();
  for (let round = 0; round < 12; round++) {
    const layout = layoutNow();
    const open = buildTempleGraph(layout);
    const closed = buildTempleGraph(withCracksClosed(layout, opened));
    const entrance = closed.entrance;
    if (!entrance) return chests;
    const reach = hopsFrom(closed, entrance);
    const boss = [...closed.rooms.values()].find((room) => room.kind === "boss");
    const isBossInReach = Boolean(boss) && reach.has(boss!.key);
    if (isBossInReach) return chests;
    const frontier = open.doors.filter((door) => door.lock === "bomb" && reach.has(door.from) && !reach.has(door.to) && !opened.has(crackKey(door.from, door.to)));
    const isStuckElsewhere = frontier.length === 0;
    if (isStuckElsewhere) return chests;
    for (const door of frontier) {
      const isAlreadyOpened = opened.has(crackKey(door.from, door.to));
      if (isAlreadyOpened) continue;
      opened.add(crackKey(door.from, door.to));
      const near = refOf(door.from);
      const before = hopsFrom(closed, door.from);
      chests.push(placeBombChest(board, floorOf(board, near.floor)!, near, before));
    }
  }
  return chests;
};
