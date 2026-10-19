/**
 * Key of one room of a dungeon. The floor comes first, so the room at [0, 1] on 1F and the one
 * at [0, 1] on 2F are two different rooms (visited, cleared, ...).
 *
 * It lives in a module of its own, with nothing to import, so the pure rules (what a fight room drops, how the solver
 * names a room) can ask it without pulling in DungeonManager (Vue, the chest system, the grants that import them back).
 * DungeonManager exports it again, so every caller that already imports it from there keeps working.
 */
export const roomPositionKey = (level: string, position: readonly number[]): string =>
  `${level}:${position[0]},${position[1]}`;
