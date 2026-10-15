/**
 * What the temple creator shows about a maze: where the entrance is in words, whether it has one, the list of
 * rooms that own a symbol, the copyable temple source, and the entrance as saved.
 */
import { isEntranceToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { MazeData } from "./floorLayers";
import { isUniqueRoomSymbol } from "./roomSymbols";

/** The entrance position ("row,col" or "floor index,row,col") as the header reads it, e.g. "1F 3x 2y" or "3x 2y" */
export const describeEntrance = (entrancePosition: string, mazeObj: MazeData): string => {
  const parts = entrancePosition.split(",");
  const isFloorPosition = parts.length === 3;
  if (isFloorPosition) {
    const [z, y, x] = parts.map(Number);
    let floorName = "";
    if (Array.isArray(mazeObj)) {
      floorName = "1F";
    } else {
      const keys = Object.keys(mazeObj);
      floorName = keys[z] || `Floor ${z}`;
    }
    return `${floorName} ${x + 1}x ${y + 1}y`;
  }
  const [row, col] = parts.map(Number);
  return `${(col || 0) + 1}x ${(row || 0) + 1}y`;
};

/** True when any floor holds an entrance token */
export const mazeHasEntrance = (maze: MazeData): boolean => {
  const checkForEntrance = (grid: string[][]): boolean => {
    return grid.some((row) => row.some((cell) => isEntranceToken(cell)));
  };

  if (Array.isArray(maze)) {
    return checkForEntrance(maze);
  } else {
    return Object.values(maze).some((floor) =>
      checkForEntrance(floor as string[][])
    );
  }
};

/** Every symbol that owns one room anywhere in the maze with that room's record, sorted by symbol */
export const collectUniqueRooms = (
  maze: MazeData,
  rooms: Record<string, Room>
): ({ key: string } & Room)[] => {
  const uniqueKeys = new Set<string>();

  if (Array.isArray(maze)) {
    maze.forEach((row) =>
      row.forEach((cell) => {
        if (isUniqueRoomSymbol(cell)) uniqueKeys.add(cell);
      })
    );
  } else {
    Object.values(maze).forEach((floor) => {
      (floor as string[][]).forEach((row: string[]) =>
        row.forEach((cell: string) => {
          if (isUniqueRoomSymbol(cell)) uniqueKeys.add(cell);
        })
      );
    });
  }

  return Array.from(uniqueKeys)
    .map((key) => ({
      key,
      ...rooms[key],
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

/** The source text the "copy code" button copies for a temple */
export const buildTempleCode = (
  templeId: string,
  entrancePosition: string,
  mazeData: MazeData,
  rooms: Record<string, Room>
): string => {
  const parts = entrancePosition.split(",").map(Number);

  let code = `const ${templeId.replace(/-/g, "")} = {\n`;
  code += `  entrance: [${parts.join(", ")}],\n`;

  if (Array.isArray(mazeData)) {
    code += `  maze: [\n`;
    mazeData.forEach((row, rowIndex) => {
      code += `    [${row.join(", ")}], // y: ${rowIndex}\n`;
    });
    code += `  ],\n`;
  } else {
    code += `  maze: {\n`;
    Object.entries(mazeData).forEach(([levelId, grid]) => {
      code += `    "${levelId}": [\n`;
      (grid as string[][]).forEach((row, rowIndex) => {
        code += `      [${row.join(", ")}], // y: ${rowIndex}\n`;
      });
      code += `    ],\n`;
    });
    code += `  },\n`;
  }

  code += `  rooms: {\n`;
  Object.entries(rooms).forEach(([symbol, data], index, array) => {
    const isLast = index === array.length - 1;
    code += `    [${symbol}]: `;
    code += JSON.stringify(data);
    code += isLast ? "\n" : ",\n";
  });
  code += `  },\n`;
  code += `}\n\n`;
  code += `export default ${templeId.replace(/-/g, "")}`;

  return code;
};

/**
 * The entrance as saved, in the forms the game reads (TempleSystem startAt): `[row, col]` is a cell of the first floor,
 * `[floor index, row, col]` a cell of the floor at that place among the maze's floors, as the shipped multi-floor
 * temples store it. A maze of floors keeps the floor index (dropping it sent the hero to the first floor); a single
 * grid has one floor, so it saves `[row, col]`. A `[row, col]` pair is saved as it is, whatever the maze.
 */
export const resolveEntranceCoordinates = (parts: number[], maze: MazeData): number[] => {
  const isRowCol = parts.length === 2;
  if (isRowCol) {
    return parts;
  }
  const isFloorRowCol = parts.length === 3;
  if (isFloorRowCol) {
    return Array.isArray(maze) ? [parts[1], parts[2]] : parts;
  }
  return [0, 0];
};
