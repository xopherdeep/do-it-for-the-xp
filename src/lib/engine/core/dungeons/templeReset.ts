/**
 * The blood moon: a temple's reset (section 5 of docs/Temple-Generation-Contract.md).
 *
 * Beasts return, chests of consumables refill, small keys and the master key are forgotten, doors re-lock.
 * What the hero earned for good stays: the map, the compass, the key items (the temple's tool, the Pegasus),
 * the "cleared" badge and the count of clears. Quest rooms follow their chores instead (docs/Quest-Rooms-Spec.md
 * 7.11). Pure functions over a progress record; TempleSystem.bloodMoon applies them to the saved record and to
 * the run in memory.
 */
import type { NewTempleProgress } from '@/lib/databases/TempleProgressDb';

/**
 * Stored in a hero's clearedRooms once they opened the temple's gate. It rides on the saved
 * clearedRooms list so the progress record keeps its documented fields; it is not a room, and
 * nothing parses it as one.
 */
export const TEMPLE_CLEARED_KEY = 'temple:cleared';

/** The toast the temple screen shows when a blood moon has reset the temple at entry. */
export const bloodMoonLine = (templeName: string): string => `The blood moon rises over ${templeName}.`;

/**
 * The progress after a blood moon: cleared rooms and opened doors forgotten, no keys in hand, chests full
 * again. The cleared badge, the map, the compass, the key items and timesCleared stay; bloodMoons counts
 * one more; a scheduled bloodMoonAt is spent. Rooms the hero won leave the visited list too; their beasts
 * seal the doors again on the next entry because the rooms are no longer cleared (floors.ts). Quest rooms are
 * forgotten here with the rest, and the run's next sync with the hero's quest board (templeSystem/questRooms.ts)
 * puts back whatever their schedules say. The hero stays where they stand.
 */
export const resetTempleProgress = <P extends NewTempleProgress>(progress: P): P => {
  const won = new Set(progress.clearedRooms);
  const next: P = {
    ...progress,
    playerKeys: 0,
    hasMasterKey: false,
    clearedRooms: won.has(TEMPLE_CLEARED_KEY) ? [TEMPLE_CLEARED_KEY] : [],
    visitedRooms: progress.visitedRooms.filter((room) => !won.has(room)),
    openedDoors: [],
    openedChests: [],
    bloodMoons: (progress.bloodMoons ?? 0) + 1,
  };
  delete (next as Partial<NewTempleProgress>).bloodMoonAt;
  delete (next as Partial<NewTempleProgress>).takenFromChests;
  return next;
};

/** Where a run starts in a layout: the floor its entrance names (`[floorIndex, row, col]`, or `[row, col]` on the first floor) */
export const entranceOf = (layout: { entrance?: number[] | null; maze?: string[][] | Record<string, string[][]> | null }): { level: string; position: [number, number] } => {
  const floors = !layout.maze || Array.isArray(layout.maze) ? ['1F'] : Object.keys(layout.maze);
  const given = layout.entrance && layout.entrance.length >= 2 ? layout.entrance : [0, 0];
  const isOnAFloor = given.length === 3;
  if (!isOnAFloor) return { level: floors[0] ?? '1F', position: [given[0], given[1]] };
  return { level: floors[given[0]] ?? floors[0] ?? '1F', position: [given[1], given[2]] };
};

/**
 * The progress after the temple's layout was switched for another (a shipped temple rebuilt, the design's "Rollout
 * to families"): the old rooms are gone, so the hero stands on the new entrance with nothing of the old run: no
 * keys, no Boss Key, no map or compass, no room visited, won or emptied, no door opened. What they earned for good
 * stays: the key items (the temple's tool, the Pegasus), the cleared badge, the count of clears, the blood moons and
 * the moon the Game Master scheduled. A layout switch is not a blood moon: `bloodMoons` does not count one more.
 */
export const progressForNewLayout = <P extends NewTempleProgress>(progress: P, entrance: { level: string; position: [number, number] }): P => {
  const won = new Set(progress.clearedRooms);
  const next: P = {
    ...progress,
    currentLevel: entrance.level,
    currentPosition: [entrance.position[0], entrance.position[1]],
    hasMap: false,
    hasCompass: false,
    playerKeys: 0,
    hasMasterKey: false,
    visitedRooms: [],
    clearedRooms: won.has(TEMPLE_CLEARED_KEY) ? [TEMPLE_CLEARED_KEY] : [],
    openedDoors: [],
    openedChests: [],
  };
  delete (next as Partial<NewTempleProgress>).takenFromChests;
  return next;
};

/** True when a blood moon was scheduled for a time that has come. */
export const isBloodMoonDue = (progress: Pick<NewTempleProgress, 'bloodMoonAt'>, now: Date = new Date()): boolean => {
  const bloodMoonAt = progress.bloodMoonAt;
  if (!bloodMoonAt) return false;
  const at = Date.parse(bloodMoonAt);
  return !Number.isNaN(at) && at <= now.getTime();
};
