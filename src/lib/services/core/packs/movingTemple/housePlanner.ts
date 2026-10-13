/**
 * Where the cells of the Old House go: one 9x9 frame shared by every floor, so a flight of stairs has the same row and
 * column at both ends. Fixed cells stand where they are told, landings stand over their twin stairs, and every other
 * cell goes beside the first of its parents already placed, in the direction it prefers, then in a seeded order.
 *
 * Pure: no storage, no Vue, and no idea what a quest is. The zones keep the junk drawer, the van's driveway and the
 * locked wing from touching anything but the cell they hang off. The same cells and seed always give the same plan.
 */
import { DIRECTIONS, STEP, rngFor, type Direction } from "@/lib/engine/dungeons/generator";
import type { HouseCell, HouseFloor } from "./houseRooms";

/** Both sides of the frame every floor is laid on */
export const HOUSE_FRAME = 9;

export interface PlacedCell {
  cell: HouseCell;
  row: number;
  col: number;
  /** The id of the cell it was placed beside (its parent, or the fallback cell); none for fixed cells and landings */
  via?: string;
}

export interface HousePlan {
  /** Only the floors that have cells, lowest first */
  floors: HouseFloor[];
  /** The size of the box that holds the cells of every floor together; each placed cell's spot is inside it */
  rows: number;
  cols: number;
  /** In the order they were placed: the ground floor, then the upper one, then the basement */
  cells: PlacedCell[];
}

/** The order floors are built in: the ground floor first, because every landing stands over one of its stairs */
const BUILD_ORDER: HouseFloor[] = ["1F", "2F", "B1"];

/** The order floors are listed in, bottom to top */
const LIST_ORDER: HouseFloor[] = ["B1", "1F", "2F"];

const keyOf = (row: number, col: number): string => `${row},${col}`;

const insideFrame = (row: number, col: number): boolean => row >= 0 && col >= 0 && row < HOUSE_FRAME && col < HOUSE_FRAME;

/** The directions in a seeded order, so the same cell and seed always try them the same way (Fisher-Yates over a copy) */
function shuffled(directions: Direction[], seed: string): Direction[] {
  const rng = rngFor(seed);
  const copy = [...directions];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Lays the cells of the house on the shared frame, then trims the frame to the box that holds them all. Throws when a
 * cell has nowhere to go: the frame is full, its spot is taken, or none of its parents is placed on its floor.
 */
export function planHouse(cells: readonly HouseCell[], seed: string): HousePlan {
  const noRoom = (cell: HouseCell): Error => new Error(`The house has no room for ${cell.name}`);
  /** Who stands where on each floor, by "row,col" */
  const grids: Record<HouseFloor, Map<string, PlacedCell>> = { B1: new Map(), "1F": new Map(), "2F": new Map() };
  const placed = new Map<string, PlacedCell>();
  const order: PlacedCell[] = [];

  const put = (cell: HouseCell, row: number, col: number, via?: string): void => {
    const spot: PlacedCell = via === undefined ? { cell, row, col } : { cell, row, col, via };
    grids[cell.floor].set(keyOf(row, col), spot);
    placed.set(cell.id, spot);
    order.push(spot);
  };

  const at = (cell: HouseCell, row: number, col: number): PlacedCell | undefined => grids[cell.floor].get(keyOf(row, col));

  /** A spot fits when it is in the frame, free, and every neighbour but the one it is placed beside is of its zone */
  const fits = (cell: HouseCell, row: number, col: number, beside: PlacedCell): boolean =>
    insideFrame(row, col) &&
    !at(cell, row, col) &&
    DIRECTIONS.every((direction) => {
      const next = at(cell, row + STEP[direction][0], col + STEP[direction][1]);
      return !next || next === beside || next.cell.zone === cell.zone;
    });

  /** The first spot beside the anchor, trying the directions in this order, where the cell fits */
  const spotBeside = (cell: HouseCell, anchor: PlacedCell, directions: Direction[]): [number, number] | undefined => {
    for (const direction of directions) {
      const row = anchor.row + STEP[direction][0];
      const col = anchor.col + STEP[direction][1];
      if (fits(cell, row, col, anchor)) return [row, col];
    }
    return undefined;
  };

  /**
   * The last resort: walk the placed cells of the parent's zone breadth first from the parent, and take the first free
   * side. A link cell (its zone differs from its parent's, like the locked wing hung off the hall) walks the zone it
   * links from, since there is nothing of its own zone to walk; any other cell walks its own, which is the same one.
   */
  const spotNear = (cell: HouseCell, parent: PlacedCell): { anchor: PlacedCell; spot: [number, number] } | undefined => {
    const queue = [parent];
    const seen = new Set(queue);
    for (let i = 0; i < queue.length; i++) {
      const anchor = queue[i];
      const spot = spotBeside(cell, anchor, DIRECTIONS);
      if (spot) return { anchor, spot };
      for (const direction of DIRECTIONS) {
        const next = at(cell, anchor.row + STEP[direction][0], anchor.col + STEP[direction][1]);
        if (next && next.cell.zone === parent.cell.zone && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return undefined;
  };

  /** Where a fixed cell or a landing stands: the spot it is given, or the row and column of its twin stairs */
  const fixedSpot = (cell: HouseCell): [number, number] | undefined => {
    if (cell.at) return cell.at;
    const twin = cell.twinOf ? placed.get(cell.twinOf) : undefined;
    return twin ? [twin.row, twin.col] : undefined;
  };

  for (const floor of BUILD_ORDER) {
    for (const cell of cells.filter((each) => each.floor === floor)) {
      if (cell.at || cell.twinOf) {
        const spot = fixedSpot(cell);
        if (!spot || !insideFrame(spot[0], spot[1]) || at(cell, spot[0], spot[1])) throw noRoom(cell);
        put(cell, spot[0], spot[1]);
        continue;
      }

      const parent = cell.parents.map((id) => placed.get(id)).find((each) => each?.cell.floor === floor);
      if (!parent) throw noRoom(cell);

      // What it prefers first, then the other directions in the order this cell's seed shuffles them
      const wanted = [...cell.prefer, ...shuffled(DIRECTIONS.filter((direction) => !cell.prefer.includes(direction)), `${seed}:${cell.id}`)];
      const spot = spotBeside(cell, parent, wanted);
      if (spot) {
        put(cell, spot[0], spot[1], parent.cell.id);
        continue;
      }
      // The Boss Key only ever sits behind its guard, so the junk drawer does not wander off looking for a side
      const near = cell.kind === "masterKey" ? undefined : spotNear(cell, parent);
      if (!near) throw noRoom(cell);
      put(cell, near.spot[0], near.spot[1], near.anchor.cell.id);
    }
  }

  if (!order.length) return { floors: [], rows: 0, cols: 0, cells: [] };
  const top = Math.min(...order.map((spot) => spot.row));
  const left = Math.min(...order.map((spot) => spot.col));
  return {
    floors: LIST_ORDER.filter((floor) => grids[floor].size > 0),
    rows: Math.max(...order.map((spot) => spot.row)) - top + 1,
    cols: Math.max(...order.map((spot) => spot.col)) - left + 1,
    cells: order.map((spot) => ({ ...spot, row: spot.row - top, col: spot.col - left })),
  };
}
