/**
 * Walking a classic dungeon, on its own cells and on the board the dressing makes of it, so a displaced thing lands
 * where the dungeon put it in reach and no further:
 * - the converted cells the hero reaches from the entrance, every side but a wall a way through (locks ignored), stairs
 *   both ways (each end names the other), holes and warps one way from their own cell to their landing, optionally
 *   never passing one cell: what lies before a sealed fight, and so what lies only beyond it;
 * - the rooms of the board a hero walks to from a room with nothing in hand: through a converted side that is no wall,
 *   small lock or cracked wall, and between a room the dressing added and the one room it opens on (its anchor).
 * A pit is never walked through (it drops whoever walks in), and what a walk may enter is the caller's to say.
 */
import type { ClassicDungeon, ClassicSide } from "./classicDungeon";
import { DIRECTIONS, STEP, floorOf, posKey, sameCell, type Board, type CellRef, type Slot } from "./dressBoard";

/** A converted cell's key by its own position, the one the JSON's links name */
export const convertedKey = (floor: string, row: number, col: number): string => `${floor}:${row},${col}`;

/** The converted cell a slot holds, by its own position (a shifted floor or a moved island stands elsewhere now) */
export const ownCell = (slot: Slot): CellRef => ({ floor: slot.at.floor, row: slot.cell!.row, col: slot.cell!.col });

/**
 * How many steps from the entrance each converted cell is, locks ignored: every side but a wall open, each cell's own
 * stairs, hole and warp taken (stairs come back by the other end's link). `without` is a cell never entered.
 */
export const convertedHops = (dungeon: ClassicDungeon, without?: CellRef): Map<string, number> => {
  const cells = new Map(dungeon.floors.flatMap((floor) => floor.cells.map((cell) => [convertedKey(floor.name, cell.row, cell.col), { floor: floor.name, cell }] as const)));
  const barred = without ? convertedKey(without.floor, without.row, without.col) : undefined;
  const start = [...cells.entries()].find(([, entry]) => entry.cell.entrance)?.[0];
  const hops = new Map<string, number>();
  const isStartBarred = !start || start === barred;
  if (isStartBarred) return hops;
  hops.set(start, 0);
  const queue = [start];
  while (queue.length) {
    const key = queue.shift()!;
    const { floor, cell } = cells.get(key)!;
    const sides = DIRECTIONS.filter((direction) => cell.sides[direction] !== "wall").map((direction) => convertedKey(floor, cell.row + STEP[direction][0], cell.col + STEP[direction][1]));
    const links = [cell.stairs, cell.hole, cell.teleport].filter((link) => Boolean(link)).map((link) => convertedKey(link!.to, link!.row, link!.col));
    for (const other of [...sides, ...links]) {
      const isNew = cells.has(other) && !hops.has(other) && other !== barred;
      if (isNew) {
        hops.set(other, hops.get(key)! + 1);
        queue.push(other);
      }
    }
  }
  return hops;
};

/** A must-clear fight or the boss: whoever walks in stays until it is won */
export const isSeal = (slot: Slot): boolean => slot.item?.kind === "mustClearFight" || slot.item?.kind === "boss";

/** A pit: it drops whoever walks in, so no one walks through it */
export const isPit = (slot: Slot): boolean => slot.item?.kind === "hole";

/** The converted sides a hero walks through with nothing in hand (a Big-Key door between two ordinary rooms is a plain door of ours) */
const EMPTY_HANDED: ReadonlySet<ClassicSide> = new Set<ClassicSide>(["open", "shutter", "item", "big-key"]);

/** Whether a converted side lets the hero through with nothing in hand: no wall, small lock or cracked wall */
export const walksThrough = (side: ClassicSide): boolean => EMPTY_HANDED.has(side);

/** The slots one step from `slot` on foot with nothing in hand */
const stepsFrom = (board: Board, slot: Slot): Slot[] => {
  const floor = floorOf(board, slot.at.floor)!;
  const found: Slot[] = [];
  for (const direction of DIRECTIONS) {
    const isWay = Boolean(slot.cell) && walksThrough(slot.cell!.sides[direction]);
    const there = isWay ? floor.slots.get(posKey(slot.at.row + STEP[direction][0], slot.at.col + STEP[direction][1])) : undefined;
    if (there?.cell) found.push(there);
  }
  const anchor = !slot.cell && slot.anchor ? floor.slots.get(posKey(slot.anchor.row, slot.anchor.col)) : undefined;
  if (anchor) found.push(anchor);
  for (const other of floor.slots.values()) {
    const opensHere = !other.cell && Boolean(other.anchor) && sameCell(other.anchor!, slot.at);
    if (opensHere) found.push(other);
  }
  return found;
};

/**
 * The slots a hero walks to from `start` with nothing in hand, nearest first (`start` first), entering only the slots
 * `enters` lets in and never a pit
 */
export const walkFrom = (board: Board, start: Slot, enters: (slot: Slot) => boolean): Slot[] => {
  const seen = new Set<Slot>([start]);
  const order = [start];
  for (let index = 0; index < order.length; index++) {
    for (const next of stepsFrom(board, order[index])) {
      const isNew = !seen.has(next) && !isPit(next) && enters(next);
      if (isNew) {
        seen.add(next);
        order.push(next);
      }
    }
  }
  return order;
};

/** Whether a link of the dungeon (stairs, a hole, a warp) lands on this converted cell: a cell a fall or a ride reaches is no nook */
export const isLandedOn = (board: Board, slot: Slot): boolean => {
  const own = slot.cell ? ownCell(slot) : undefined;
  if (!own) return false;
  return board.dungeon.floors.some((floor) => floor.cells.some((cell) => [cell.stairs, cell.hole, cell.teleport].some((link) => Boolean(link) && sameCell({ floor: link!.to, row: link!.row, col: link!.col }, own))));
};
