/**
 * Doors of a temple the Game Master drew in the Temple Creator. The editor keeps each room's sides as
 * `sides: { north, east, south, west }` ('door', 'locked', 'masterlocked', 'bombable', 'wall'); the engine plays
 * `locked: { north, ... }`. Pure rules, shared by the editor and by registration:
 *
 * - `lockedFromSides`: what the engine plays from the sides the editor drew (registration uses it): small locks as
 *   `locked`, walls and cracked walls ('wall', 'bombable') as `barriers`.
 * - `barrierBetween`: what bars the way between two rooms (the engine's doorKind and the solver's graph both ask it).
 * - `facingSide` / `effectiveSide`: any door into a boss room is the Boss door, so the editor shows that side as
 *   the Boss Lock ('masterlocked', the skull) from both ends, whatever the stored value is.
 * - `bossDoorSides`: the same rule written into the saved sides, so older temples come right when they are saved.
 * - `climbLockOf`: the lock on a flight of stairs (`content.locked`), the one bar that is not on a side of a room.
 */

import type { ClimbLock } from '@/lib/engine/core/dungeons/types';

export type Side = 'north' | 'east' | 'south' | 'west';

export const SIDES: readonly Side[] = ['north', 'east', 'south', 'west'];

const STEP: Record<Side, readonly [number, number]> = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] };

const OPPOSITE: Record<Side, Side> = { north: 'south', east: 'west', south: 'north', west: 'east' };

/** A side that is no door: a wall no one passes, or a cracked wall only a Bomb opens */
export type Barrier = 'wall' | 'bombable';

export type Barriers = Partial<Record<Side, Barrier>>;

const isBarrier = (drawn: string | undefined): drawn is Barrier => drawn === 'wall' || drawn === 'bombable';

/** The part of a room these rules read; an engine room and the editor's room both fit */
export interface DoorRoom {
  type?: string;
  sides?: Record<string, string>;
  locked?: Record<string, boolean | undefined>;
  barriers?: Barriers;
  [key: string]: any;
}

/** The kind of a room however the data spells it ("boss", "Boss ") */
export const roomKind = (room: { type?: string } | null | undefined): string => String(room?.type ?? '').trim().toLowerCase();

/** Whether a room is a boss room: the one every door into which is the Boss door */
export const isBossRoom = (room: { type?: string } | null | undefined): boolean => roomKind(room) === 'boss';

/**
 * The lock on the climb FROM a stairs room (`content.locked`): 'small' for a small key, 'master' for the Boss Key, nothing
 * for free stairs (and for any other spelling, so a stray value locks nothing). The engine's climb, the sheet and the
 * solver's graph all ask this, so they agree on which flights are barred.
 */
export const climbLockOf = (room: { content?: { locked?: unknown } } | null | undefined): ClimbLock | undefined => {
  const drawn = room?.content?.locked;
  const isKnownLock = drawn === 'small' || drawn === 'master';
  return isKnownLock ? drawn : undefined;
};

/**
 * The room as the engine plays its doors: a side drawn 'locked' is a small lock on that side, a side drawn
 * 'masterlocked' carries the Boss Lock flag (`locked.master`, which the boss door rule does not need but the
 * generator's contract keeps), a side drawn 'wall' or 'bombable' is a barrier on it (`barriers`: not a door, so no lock
 * and no walking through; only a Bomb opens a cracked wall). The sides are the truth: a `locked` flag or a barrier the
 * room still carries on a side drawn any other way (the Game Master opened that door in the editor) is not played. A
 * room drawn without sides is returned as it is, and so is one whose `locked` and `barriers` already agree with its sides.
 */
export const lockedFromSides = <R extends DoorRoom>(room: R): R => {
  const sides = room?.sides;
  if (!sides) return room;

  const locked: Record<string, boolean | undefined> = { ...room.locked };
  const barriers: Barriers = {};
  let lockedChanged = false;
  let barriersChanged = false;
  for (const side of SIDES) {
    const isDrawnLocked = sides[side] === 'locked';
    const isLockRedrawn = Boolean(locked[side]) !== isDrawnLocked;
    if (isLockRedrawn) {
      if (isDrawnLocked) locked[side] = true;
      else delete locked[side];
      lockedChanged = true;
    }
    const isMasterLocked = sides[side] === 'masterlocked';
    if (isMasterLocked) {
      locked.master = true;
      lockedChanged = true;
    }

    const drawn = sides[side];
    if (isBarrier(drawn)) barriers[side] = drawn;
    const isBarrierRedrawn = room.barriers?.[side] !== barriers[side];
    if (isBarrierRedrawn) barriersChanged = true;
  }
  const isUnchanged = !lockedChanged && !barriersChanged;
  if (isUnchanged) return room;

  const played: DoorRoom = { ...room };
  if (lockedChanged) played.locked = locked;
  const hasBarriers = Object.keys(barriers).length > 0;
  if (hasBarriers) played.barriers = barriers;
  else delete played.barriers;
  return played as R;
};

/**
 * What bars the way through `side` of `here` to `there`: a wall, a cracked wall, or nothing (a way a hero may try, locked
 * or not). The editor draws one wall on both rooms, but a wall on either end is a wall, and it wins over a cracked wall
 * on the other. The engine (doorKind) and the solver (templeGraph) both ask this, so they cannot disagree.
 */
export const barrierBetween = (here: DoorRoom | null | undefined, there: DoorRoom | null | undefined, side: Side): Barrier | undefined => {
  const ends = [here?.barriers?.[side], there?.barriers?.[OPPOSITE[side]]];
  const isWalled = ends.includes('wall');
  if (isWalled) return 'wall';
  const isBombable = ends.includes('bombable');
  if (isBombable) return 'bombable';
  return undefined;
};

/** The sides a Boss Lock may stand for: a plain door, a small lock, or the Boss Lock itself. A wall or a bombable side is not a door. */
const BOSS_LOCKABLE: readonly string[] = ['door', 'locked', 'masterlocked'];

/** Whether the door between two neighbouring rooms is a boss door: one end is a boss room and the other end is a room, not a wall */
export const leadsToBoss = (here: DoorRoom | null | undefined, there: DoorRoom | null | undefined): boolean =>
  Boolean(here) && Boolean(there) && roomKind(here) !== 'wall' && roomKind(there) !== 'wall' && (isBossRoom(here) || isBossRoom(there));

/**
 * The side `here` shows toward `there` in `side`: 'masterlocked' (the skull) when the door leads into or out of a
 * boss room and the stored side is a door, a small lock or missing; otherwise whatever is stored ('door' when missing).
 */
export const facingSide = (here: DoorRoom | null | undefined, there: DoorRoom | null | undefined, side: Side): string => {
  const stored = here?.sides?.[side] ?? 'door';
  return BOSS_LOCKABLE.includes(stored) && leadsToBoss(here, there) ? 'masterlocked' : stored;
};

type Maze = string[][] | Record<string, string[][]>;

/** The grid of one floor: a plain maze is the one floor, whatever it is called */
const gridOf = (maze: Maze | null | undefined, level: string): string[][] => {
  if (!maze) return [];
  return Array.isArray(maze) ? maze : maze[level] ?? [];
};

/** The side of the room at [row, col] of `grid`, read as the editor shows it (see facingSide) */
export const effectiveSideInGrid = (grid: string[][], rooms: Record<string, DoorRoom>, row: number, col: number, side: Side): string => {
  const here = rooms[grid[row]?.[col]];
  const there = rooms[grid[row + STEP[side][0]]?.[col + STEP[side][1]]];
  return facingSide(here, there, side);
};

/** A drawn layout: the maze and the room definitions its tokens name */
export interface DoorLayout {
  maze?: Maze | null;
  rooms?: Record<string, DoorRoom> | null;
}

/**
 * The side of the room at `position` ([row, col]) on `level`, as the editor shows it: 'masterlocked' toward and
 * from a boss room whatever is stored, the stored side everywhere else.
 */
export const effectiveSide = (layout: DoorLayout, level: string, position: readonly [number, number], side: Side): string =>
  effectiveSideInGrid(gridOf(layout.maze, level), layout.rooms ?? {}, position[0], position[1], side);

/** The sides an editor room starts with */
const openSides = (): Record<string, string> => ({ north: 'door', east: 'door', south: 'door', west: 'door' });

/** The grids of a layout: none for no maze, one for a single floor, one per floor otherwise */
const gridsOf = (maze: Maze | null | undefined) => {
  if (!maze) return [];
  if (Array.isArray(maze)) return [maze];
  return Object.values(maze).filter(Array.isArray);
};

/**
 * The rooms with the Boss Lock written on both ends of every door into or out of a boss room (on the same floor): a
 * plain door or a small lock there becomes 'masterlocked'. A wall or a bombable side stays what it is, and a room
 * nothing changes for is returned as the very same object.
 * @param maze The layout's grid, or one grid per floor
 * @param rooms The room definitions the maze's tokens name
 */
export const bossDoorSides = <R extends DoorRoom>(maze: Maze | null | undefined, rooms: Record<string, R>): Record<string, R> => {
  const result: Record<string, R> = { ...rooms };
  const grids = gridsOf(maze);

  for (const grid of grids) {
    grid.forEach((cells, row) =>
      (cells ?? []).forEach((token, col) => {
        const isRoomless = !result[token];
        if (isRoomless) return;

        for (const side of SIDES) {
          const facing = effectiveSideInGrid(grid, result, row, col, side);
          const isAlreadyFacing = facing === (result[token].sides?.[side] ?? 'door');
          if (isAlreadyFacing) continue;
          result[token] = { ...result[token], sides: { ...openSides(), ...result[token].sides, [side]: facing } };
        }
      })
    );
  }
  return result;
};
