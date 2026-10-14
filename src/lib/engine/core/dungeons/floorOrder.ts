/**
 * The order floors are climbed in. A temple's floors are named "1F", "2F" ... above the ground and "B1", "B2" ...
 * below it, and the maze map holds them in the order they were drawn (a basement added last comes last). Stairs and
 * pits go to the next floor of THIS order, not of the map's: one rule for play, the audit, the solver and the editor.
 * It is not the order of `Object.keys(maze)`, which the entrance's floor index still counts in.
 */

/** How high a floor stands: "2F" is 2, "B1" is -1, any other name sits at ground level (0) */
export const floorHeight = (name: string): number => {
  const isSurface = name.endsWith('F');
  const isBasement = name.startsWith('B');
  const height = isSurface ? parseInt(name, 10) : isBasement ? -parseInt(name.slice(1), 10) : 0;
  return height || 0; // a name with no number ("F", "B"), or "B0", stands at ground level
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
