/**
 * Grid sizes for the temple editor: an "RxC" size read into rows and columns, one side typed into a size field, and
 * the 6x6 a size that cannot be read falls back to. Imports nothing, so the floor and maze helpers can both use it.
 */

/** The most rows or columns the header's size fields take */
export const MAX_GRID_SIDE = 50;

/** The size of a new temple's floor, and of a floor whose stored size cannot be read */
export const STARTING_GRID = { rows: 6, cols: 6 };

export const isWholeNumberAtLeastOne = (side: number): boolean => Number.isInteger(side) && side >= 1;

/** One side typed into a size field: a whole number from 1 to MAX_GRID_SIDE; null for an empty field, 0, a negative, a fraction, text or past the max */
export const readGridSide = (typed: string): number | null => {
  const side = Number(typed);
  return isWholeNumberAtLeastOne(side) && side <= MAX_GRID_SIDE ? side : null;
};

/** The rows and columns of an "RxC" grid size; null when either side is not a whole number of at least 1 ("x10", "0x10", "-3x10") */
export const readGridSize = (gridSize: string): { rows: number; cols: number } | null => {
  const sides = gridSize.split("x").map(Number);
  const [rows, cols] = sides;
  const isTwoUsableSides = sides.length === 2 && isWholeNumberAtLeastOne(rows) && isWholeNumberAtLeastOne(cols);
  return isTwoUsableSides ? { rows, cols } : null;
};
