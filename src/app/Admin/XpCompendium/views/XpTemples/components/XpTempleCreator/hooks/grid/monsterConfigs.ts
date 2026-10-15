/**
 * Shared monster configs for the room editor: the config tokens (M001-M009, MINI, MIN1-MIN3) a temple already
 * uses or has set up, and the few unused ones offered as new shared configs.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { MazeData } from "./floorLayers";

// Interface for monster config options in the selector
export interface MonsterConfigOption {
  token: string;
  name: string;
  hasBeasts: boolean;
  count: number;
}

// Count how many times each token appears in the maze
const countTokensInMaze = (tokenSet: string[], maze: MazeData): Record<string, number> => {
  const tokenCounts: Record<string, number> = {};

  const countInMaze = (grid: string[][]) => {
    for (const row of grid) {
      for (const cell of row) {
        const isConfigToken = tokenSet.includes(cell);
        if (isConfigToken) {
          tokenCounts[cell] = (tokenCounts[cell] || 0) + 1;
        }
      }
    }
  };

  if (Array.isArray(maze)) {
    countInMaze(maze);
  } else {
    Object.values(maze).forEach(floor => countInMaze(floor as string[][]));
  }

  return tokenCounts;
};

// Determine display name based on configuration state
const describeConfig = (hasBeasts: boolean, beastCount: number, roomCount: number): string => {
  let displayName = 'Empty';
  const isInUse = roomCount > 0;
  if (hasBeasts) {
    displayName = `${beastCount} beast${beastCount > 1 ? 's' : ''}`;
  } else if (isInUse) {
    displayName = `${roomCount} room${roomCount > 1 ? 's' : ''}`;
  }
  return displayName;
};

/**
 * The config tokens to offer from `tokenSet`: every token the maze uses or the rooms data configures (named by its
 * beasts, else by how many rooms use it), then up to three unused tokens as "New shared config".
 */
export const listMonsterConfigs = (
  tokenSet: string[],
  maze: MazeData,
  roomsData: Record<string, Room>
): MonsterConfigOption[] => {
  const configs: MonsterConfigOption[] = [];
  const tokenCounts = countTokensInMaze(tokenSet, maze);

  // Build config options for tokens that are in use or have room data
  for (const token of tokenSet) {
    const roomConfig = roomsData[token];
    const count = tokenCounts[token] || 0;
    const beasts = roomConfig?.content?.beasts || [];
    const hasBeasts = beasts.length > 0;

    // Only show if it's in use OR has been configured
    const shouldListToken = count > 0 || hasBeasts || !!roomConfig;
    if (shouldListToken) {
      configs.push({
        token,
        name: describeConfig(hasBeasts, beasts.length, count),
        hasBeasts,
        count
      });
    }
  }

  // Also show unused tokens (up to 3 that aren't in use)
  const unusedTokens = tokenSet.filter(t => !configs.find(c => c.token === t));
  for (let i = 0; i < Math.min(3, unusedTokens.length); i++) {
    configs.push({
      token: unusedTokens[i],
      name: 'New shared config',
      hasBeasts: false,
      count: 0
    });
  }

  return configs;
};
