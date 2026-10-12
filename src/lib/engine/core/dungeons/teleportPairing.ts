/**
 * Teleport pairing: where a magic circle sends the hero, and when the editor needs to ask.
 *
 * A circle names no destination unless its author says so. Circles on one floor pair up in reading
 * order (row, then column): the next one, wrapping, so two circles are simply each other's partner.
 * A circle that stands alone on its floor carries on to the temple's next circle on another floor (how
 * the temple generator links its pairs). A circle with no other anywhere has nowhere to go.
 *
 * The target controls (floor, x, y) matter only when pairing cannot guess: several floors, or more
 * than two circles on one floor.
 */

import type { Dungeon, Room } from './types';

/** The part of a temple the pairing reads. */
export type PairingTemple = Pick<Dungeon, 'maze' | 'rooms'>;

export type Position = [number, number];

export interface TeleportDestination {
  level: string;
  position: Position;
}

/** What the hero reads when a circle has no partner. */
export const CIRCLE_FIZZLES = 'The circle fizzles. It leads nowhere yet.';

/** Floor names in the order the layout lists them ("1F" for a single grid). */
export const floorsOf = (temple: PairingTemple): string[] =>
  Array.isArray(temple.maze) ? ['1F'] : Object.keys(temple.maze);

const gridOf = (temple: PairingTemple, level: string): string[][] =>
  (Array.isArray(temple.maze) ? temple.maze : temple.maze[level]) ?? [];

const roomAt = (temple: PairingTemple, level: string, [row, col]: Position): Room | undefined => {
  const token = gridOf(temple, level)[row]?.[col];
  return token ? temple.rooms[token] : undefined;
};

const isTeleport = (room: Room | undefined): boolean => room?.type === 'teleport';

const samePlace = (a: TeleportDestination, level: string, position: Position): boolean =>
  a.level === level && a.position[0] === position[0] && a.position[1] === position[1];

/** R1. The teleport rooms of one floor in reading order (row, then column). */
export const teleportsOn = (temple: PairingTemple, level: string): Position[] => {
  const found: Position[] = [];
  gridOf(temple, level).forEach((cells, row) => {
    cells.forEach((_token, col) => {
      if (isTeleport(roomAt(temple, level, [row, col]))) found.push([row, col]);
    });
  });
  return found;
};

/** Every circle of the temple: floors in layout order, each floor in reading order. */
const allTeleports = (temple: PairingTemple): TeleportDestination[] =>
  floorsOf(temple).flatMap((level) => teleportsOn(temple, level).map((position) => ({ level, position })));

/**
 * The author's own pick: `targetLevel` and `targetCoords` ({ x: column, y: row }, as stairs read them;
 * flat `targetX`/`targetY` work too). Coordinates count when they land on another circle; a floor
 * alone sends the hero to that floor's first circle. Anything else (the editor's default zeros
 * included) is no pick at all.
 */
const explicitTarget = (
  temple: PairingTemple,
  level: string,
  position: Position,
  room: Room
): TeleportDestination | null => {
  const content = room.content ?? {};
  const floor = typeof content.targetLevel === 'string' && floorsOf(temple).includes(content.targetLevel) ? content.targetLevel : undefined;
  const coords = content.targetCoords ?? (content.targetX !== undefined || content.targetY !== undefined ? { x: content.targetX, y: content.targetY } : undefined);

  if (coords) {
    const spot: Position = [Number(coords.y), Number(coords.x)];
    const there = floor ?? level;
    const isOtherCircle = spot.every(Number.isInteger) && isTeleport(roomAt(temple, there, spot)) && !samePlace({ level: there, position: spot }, level, position);
    if (isOtherCircle) {
      return { level: there, position: spot };
    }
  }

  const hasPickedOtherFloor = floor && floor !== level;
  if (hasPickedOtherFloor) {
    const first = teleportsOn(temple, floor)[0];
    if (first) return { level: floor, position: first };
  }

  return null;
};

/**
 * R2. Where the circle at `position` on `level` leads, or null when it leads nowhere.
 * The author's target wins; else the next circle on the floor, wrapping; else, standing alone on the
 * floor, the temple's next circle; else nothing.
 */
export const teleportTargetFor = (temple: PairingTemple, level: string, position: Position): TeleportDestination | null => {
  const room = roomAt(temple, level, position);
  const isMissingCircle = !room || !isTeleport(room);
  if (isMissingCircle) return null;

  const picked = explicitTarget(temple, level, position, room);
  if (picked) return picked;

  const here = teleportsOn(temple, level);
  if (here.length >= 2) {
    const index = here.findIndex(([row, col]) => row === position[0] && col === position[1]);
    return { level, position: here[(index + 1) % here.length] };
  }

  const all = allTeleports(temple);
  if (all.length < 2) return null;
  const index = all.findIndex((circle) => samePlace(circle, level, position));
  return all[(index + 1) % all.length];
};

/** R3. The editor asks for a target only when pairing cannot guess: several floors, or more than two circles on this floor. */
export const needsTravelControls = (temple: PairingTemple, level: string): boolean =>
  floorsOf(temple).length > 1 || teleportsOn(temple, level).length > 2;

/** The one line the editor shows in place of the target controls. */
export const pairingNote = (temple: PairingTemple, level: string): string =>
  teleportsOn(temple, level).length >= 2 ? 'Pairs with the other circle on this floor.' : 'Add a second circle on this floor to pair with.';

/**
 * The temple as the editor will leave it once `room` stands at `position`: the room being edited has
 * not reached the store yet, and the controls depend on whether it is a circle.
 */
export const withRoomAt = (temple: PairingTemple, level: string, position: Position, room: Room): PairingTemple => {
  const token = '__editing__';
  const grid = gridOf(temple, level).map((cells) => [...cells]);
  if (!grid[position[0]]) return temple;
  grid[position[0]][position[1]] = token;

  return {
    maze: Array.isArray(temple.maze) ? grid : { ...temple.maze, [level]: grid },
    rooms: { ...temple.rooms, [token]: room },
  };
};
