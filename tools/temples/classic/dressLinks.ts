/**
 * The links of a converted dungeon that need a room the dungeon does not have, and the cells its links reach only by
 * air:
 * - an island (a cell walled on every side, reached by a hole or a circle alone) far off its floor's used cells moves
 *   next to them, so a floor is no taller than its rooms (Hera's fairy room sat fourteen rows under the rest of 3F);
 * - a fall or a ride onto the boss's cell (Skull Woods, the Ice Palace: the boss's floor is entered by a hole alone)
 *   lands in an added room beside the boss, behind the Boss door the engine honours (a masterlocked side between two
 *   ordinary rooms it does not). The room is a circle paired with one added beside the entrance: a way back out once
 *   the boss is beaten, which the solver wants;
 * - a circle whose landing is no circle (LTTP warps the hero onto a plain floor; our circles ride circle to circle)
 *   gets a circle added beside its landing, pointed back at it.
 */
import type { ClassicCell } from "./classicDungeon";
import { DIRECTIONS, allSlots, describeCell, distance, floorOf, linkedSlot, placeNearest, posKey, slotsOf, tryOpenBeside, type Board, type CellRef, type Slot } from "./dressBoard";

/** A cell walled on every side: reached by a link alone */
const isIsland = (cell: ClassicCell): boolean => DIRECTIONS.every((direction) => cell.sides[direction] === "wall");

interface Box {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

const boxOf = (slots: Slot[]): Box => ({
  minRow: Math.min(...slots.map((slot) => slot.at.row)),
  maxRow: Math.max(...slots.map((slot) => slot.at.row)),
  minCol: Math.min(...slots.map((slot) => slot.at.col)),
  maxCol: Math.max(...slots.map((slot) => slot.at.col)),
});

const isInside = (box: Box, at: CellRef): boolean => at.row >= box.minRow && at.row <= box.maxRow && at.col >= box.minCol && at.col <= box.maxCol;

/**
 * Islands far off a floor's used cells move next to the bounding box of the other cells: the nearest free position
 * outside that box and touching it (Manhattan distance from where the island stood, ties in reading order). The
 * island keeps its cell and its origin; links find it through `board.converted`, and the move is reported.
 */
export const compactIslands = (board: Board): void => {
  for (const floor of board.floors) {
    const slots = slotsOf(floor);
    const islands = slots.filter((slot) => slot.cell && isIsland(slot.cell));
    const anchored = slots.filter((slot) => !islands.includes(slot));
    const hasNothingToCompact = islands.length === 0 || anchored.length === 0;
    if (hasNothingToCompact) continue;
    const box = boxOf(anchored);
    const ring: Box = { minRow: Math.max(0, box.minRow - 1), maxRow: box.maxRow + 1, minCol: Math.max(0, box.minCol - 1), maxCol: box.maxCol + 1 };
    for (const island of islands) {
      const isNearEnough = isInside(ring, island.at);
      if (isNearEnough) continue;
      const candidates: CellRef[] = [];
      for (let row = ring.minRow; row <= ring.maxRow; row++) {
        for (let col = ring.minCol; col <= ring.maxCol; col++) {
          const at = { floor: floor.name, row, col };
          const isFree = !isInside(box, at) && !floor.slots.has(posKey(row, col));
          if (isFree) candidates.push(at);
        }
      }
      const to = [...candidates].sort((a, b) => distance(island.at, a) - distance(island.at, b) || a.row - b.row || a.col - b.col)[0];
      if (!to) continue;
      const from = { ...island.at };
      floor.slots.delete(posKey(from.row, from.col));
      island.at = to;
      floor.slots.set(posKey(to.row, to.col), island);
      floor.rows = Math.max(floor.rows, to.row + 1);
      floor.cols = Math.max(floor.cols, to.col + 1);
      board.compacted.push({ from, to });
    }
  }
};

/** Whether a thing of the board leads (by its link) onto `slot` */
const leadsTo = (board: Board, item: Slot["item"], slot: Slot): boolean => Boolean(item?.link) && linkedSlot(board, item!.link) === slot;

/**
 * The antechamber of a fall or a ride onto the boss: an added circle beside him (the Boss door between), paired with a
 * circle added beside the entrance. Pits and circles that named the boss's cell land in it (dressRooms reads
 * `board.antechamber`). Nothing is added when no link lands on the boss.
 */
export const placeAntechamber = (board: Board, boss: Slot): void => {
  const arrivals = allSlots(board).filter((slot) => (slot.item?.kind === "hole" || slot.item?.kind === "teleport") && leadsTo(board, slot.item, boss));
  const isReachedByDoorsOrStairs = arrivals.length === 0;
  if (isReachedByDoorsOrStairs) return;
  addAntechamber(board, boss);
};

const fail = (message: string): never => {
  throw new Error(message);
};

/** The antechamber and its circle back, once a fall or a ride is known to land on the boss */
const addAntechamber = (board: Board, boss: Slot): void => {
  const antechamber = tryOpenBeside(board, boss) ?? fail(`${board.dungeon.id}: no free cell next to the boss at ${describeCell(boss.at)} for the antechamber of the fall onto him`);
  const entrance = allSlots(board).find((slot) => slot.item?.kind === "entrance") ?? fail(`${board.dungeon.id}: no entrance cell`);
  const back = placeNearest(board, floorOf(board, entrance.at.floor)!, entrance.at, undefined);
  antechamber.item = { kind: "teleport", origin: antechamber.at, room: "", target: back.at };
  back.item = { kind: "teleport", origin: back.at, room: "", target: antechamber.at };
  board.antechamber = antechamber;
  board.moves.push({ what: "antechamber", from: boss.at, to: antechamber.at, grown: true });
  board.moves.push({ what: "circle back from the boss", from: entrance.at, to: back.at, grown: !back.cell });
};

/** A circle whose landing is no circle gets one added beside its landing, each pointed at the other */
export const placeLandingCircles = (board: Board): void => {
  const circles = allSlots(board).filter((slot) => slot.item?.kind === "teleport" && slot.item.link && !slot.item.target);
  for (const circle of circles) {
    const landing = linkedSlot(board, circle.item!.link);
    if (!landing) continue;
    const isCircleOrBoss = landing.item?.kind === "teleport" || landing.item?.kind === "boss";
    if (isCircleOrBoss) continue;
    const added = tryOpenBeside(board, landing) ?? placeNearest(board, floorOf(board, landing.at.floor)!, landing.at, undefined);
    added.item = { kind: "teleport", origin: added.at, room: "", target: circle.at };
    circle.item!.target = added.at;
    board.moves.push({ what: "landing circle", from: landing.at, to: added.at, grown: !added.cell });
  }
};
