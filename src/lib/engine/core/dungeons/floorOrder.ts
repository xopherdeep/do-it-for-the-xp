/**
 * The order floors are climbed in. A temple's floors are named "1F", "2F" ... above the ground and "B1", "B2" ...
 * below it, and the maze map holds them in the order they were drawn (a basement added last comes last). Stairs and
 * pits go to the next floor of THIS order, not of the map's: one rule for play, the audit, the solver and the editor.
 * It is not the order of `Object.keys(maze)`, which the entrance's floor index still counts in.
 */
import type { RoomContent } from './types';

/** How high a floor stands: "2F" is 2, "B1" is -1, any other name sits at ground level (0) */
export const floorHeight = (name: string): number => {
  const isSurface = name.endsWith('F');
  const isBasement = name.startsWith('B');
  // A name with no number ("F", "B"), or "B0", stands at ground level
  if (isSurface) return parseInt(name, 10) || 0;
  if (isBasement) return -parseInt(name.slice(1), 10) || 0;
  return 0;
};

/**
 * The floors from the deepest basement up (B2, B1, 1F, 2F, 10F). Numbers are read as numbers, so "10F" is above
 * "2F"; floors that stand equally high keep the order they came in.
 */
export const climbOrder = (floors: readonly string[]): string[] => [...floors].sort((a, b) => floorHeight(a) - floorHeight(b));

/**
 * The floor one flight of stairs from `floor` (step 1 climbs, -1 descends); undefined past either end of the temple,
 * and for a floor the temple does not have.
 */
export const neighbourFloorOf = (floors: readonly string[], floor: string, step: 1 | -1): string | undefined => {
  const order = climbOrder(floors);
  const index = order.indexOf(floor);
  return index < 0 ? undefined : order[index + step];
};

/** Where a pit drops the hero: the floor, and the cell it names to land on first ([row, col]), when it names one. */
export interface PitDrop {
  floor: string;
  cell?: [number, number];
}

/**
 * Where a pit on `floor` drops the hero: one rule for the engine's fall (hazards.ts) and the solver's graph. A pit may
 * name its landing (`targetLevel`, and `targetCoords` with x the column and y the row), as a classic dungeon's hole is
 * written. The name counts only for a floor the temple has that stands below the pit in the climbing order, and only
 * then is the cell read. Any other name (the pit's own floor and cell 0,0, the seed the Temple Creator once gave every
 * new pit; a floor above; a floor the temple lacks) drops by the plain rule: the next floor down. Undefined when there
 * is no floor to drop to.
 */
export const pitDropOf = (floors: readonly string[], floor: string, target: Pick<RoomContent, 'targetLevel' | 'targetCoords'> = {}): PitDrop | undefined => {
  const order = climbOrder(floors);
  const named = target.targetLevel ?? '';
  const namedIndex = order.indexOf(named);
  const isNamedBelow = namedIndex >= 0 && namedIndex < order.indexOf(floor);
  if (isNamedBelow) {
    const coords = target.targetCoords;
    return { floor: named, cell: coords ? [Number(coords.y), Number(coords.x)] : undefined };
  }
  const below = neighbourFloorOf(floors, floor, -1);
  return below ? { floor: below } : undefined;
};
