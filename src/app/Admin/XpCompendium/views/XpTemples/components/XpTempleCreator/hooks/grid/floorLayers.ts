/**
 * Floors and maze slices for the temple editor: floor names and their order, which floor takes the entrance, the
 * blank layer a new floor starts from, and how one floor's grid is read out of (or written into) the temple maze.
 * A temple maze is either one grid (a single-floor temple, always "1F") or a map of floor name to grid.
 */
import { ____ } from "@/lib/engine/dungeons/roomTypes";
import { climbOrder, floorHeight } from "@/lib/engine/core/dungeons/floorOrder";
import { readGridSize, STARTING_GRID } from "./gridSize";

export type MazeData = string[][] | Record<string, string[][]>;

/** "2F" is above "1F" and "B1" is below it; any other name sits at ground level */
export const getFloorValue = floorHeight;

/** The floor names as the maze holds them: a single grid is the one floor "1F" */
export const floorKeysOf = (maze: MazeData): string[] =>
  Array.isArray(maze) ? ["1F"] : Object.keys(maze);

/** Every floor, lowest (deepest basement) first: the order play, the audit and the solver climb stairs in too */
export const sortedFloorKeys = (maze: MazeData): string[] => climbOrder(floorKeysOf(maze));

/**
 * Why a floor cannot take this name, worded for the toast; null when it can. A name of only digits ("3", "10") is an
 * array-index key of a JS object, which Object.keys lists first whatever the order the floors were drawn in, and the
 * entrance's floor index counts Object.keys: such a floor would take the entrance's place.
 */
export const floorNameProblem = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed === "") return "A floor needs a name";
  if (/^\d+$/.test(trimmed)) return `A floor name can't be only digits: try ${trimmed}F`;
  return null;
};

export const isValidFloorName = (name: string): boolean => floorNameProblem(name) === null;

/** Whether a floor of this name is there already, whatever the case ("2f" would stand at ground level next to "2F") */
export const hasFloorNamed = (floors: readonly string[], name: string): boolean =>
  floors.some((floor) => floor.toLowerCase() === name.trim().toLowerCase());

export const floorsAbove = (floors: string[], currentLevelId: string): string[] => {
  const currentVal = getFloorValue(currentLevelId);
  return floors
    .filter((f) => getFloorValue(f) > currentVal)
    .sort((a, b) => getFloorValue(a) - getFloorValue(b));
};

export const floorsBelow = (floors: string[], currentLevelId: string): string[] => {
  const currentVal = getFloorValue(currentLevelId);
  return floors
    .filter((f) => getFloorValue(f) < currentVal)
    .sort((a, b) => getFloorValue(b) - getFloorValue(a));
};

/** The one floor that may hold the entrance: the lowest surface floor, else the shallowest basement, else the first */
export const getEntranceFloor = (floorList: string[]): string => {
  const fFloors = floorList
    .filter((f) => f.endsWith("F"))
    .sort((a, b) => getFloorValue(a) - getFloorValue(b));
  if (fFloors.length > 0) return fFloors[0];
  const bFloors = floorList
    .filter((f) => f.startsWith("B"))
    .sort((a, b) => getFloorValue(b) - getFloorValue(a));
  if (bFloors.length > 0) return bFloors[0];
  return floorList[0] || "1F";
};

/** The names the "add floor" prompt offers: the next surface floor and the next basement */
export const nextFloorOptions = (
  existingFloors: string[]
): { surface: string; basement: string } => {
  let nextSurface = 2;
  let nextBasement = 1;

  existingFloors.forEach((f) => {
    if (f.endsWith("F")) {
      const n = parseInt(f);
      if (n >= nextSurface) nextSurface = n + 1;
    } else if (f.startsWith("B")) {
      const n = parseInt(f.replace("B", ""));
      if (n >= nextBasement) nextBasement = n + 1;
    }
  });

  return {
    surface: `${nextSurface}F`,
    basement: `B${nextBasement}`,
  };
};

/** A grid of walls */
export const blankGrid = (rows: number, cols: number): string[][] => {
  const grid: string[][] = [];
  for (let i = 0; i < rows; i++) {
    grid.push(new Array(cols).fill(____));
  }
  return grid;
};

/** A blank grid for a "RxC" grid size; a size that is not a grid never builds a floor with no rows or columns */
export const blankFloorLayer = (gridSize: string): string[][] => {
  const { rows, cols } = readGridSize(gridSize) ?? STARTING_GRID;
  return blankGrid(rows, cols);
};

/** The grid of one floor (the whole maze for a single-floor temple); an unknown floor reads as empty */
export const floorSlice = (maze: MazeData, levelId: string): string[][] => {
  if (Array.isArray(maze)) {
    return maze;
  }
  return maze[levelId] || [];
};

/** Writes one cell of one floor's grid, in place */
export const writeMazeCell = (
  maze: MazeData,
  levelId: string,
  row: number,
  col: number,
  symbol: string
): void => {
  if (Array.isArray(maze)) {
    maze[row][col] = symbol;
  } else {
    maze[levelId][row][col] = symbol;
  }
};

/** The "RxC" size of a loaded maze (its first floor), or null when that floor has no rows */
export const measureGridSize = (maze: MazeData): string | null => {
  const firstLevel = Array.isArray(maze)
    ? maze
    : (Object.values(maze)[0] as string[][]);
  const hasFloorLayout = firstLevel && firstLevel.length > 0;
  if (hasFloorLayout) {
    return `${firstLevel.length}x${firstLevel[0].length}`;
  }
  return null;
};

/** The floor to show after a layout loads: "1F" for a single grid, else the current floor if the maze has it */
export const levelIdAfterLoad = (maze: MazeData, currentLevelId: string): string => {
  if (Array.isArray(maze)) {
    return "1F";
  }
  const dungeonFloors = Object.keys(maze);
  const needsFloorCorrection =
    dungeonFloors.length > 0 && !dungeonFloors.includes(currentLevelId);
  if (needsFloorCorrection) {
    return dungeonFloors.includes("1F") ? "1F" : dungeonFloors[0];
  }
  return currentLevelId;
};
