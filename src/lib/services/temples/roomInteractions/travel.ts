/**
 * Getting around a temple: what lies in each direction of a room, the doors between rooms, the stairs between
 * floors, and the two lookups the pits and stairs share (the next floor, the first room of a kind).
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { BOSS_DOOR_LINE, TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { DoorKind } from '@/lib/engine/core/dungeons/TempleSystem';
import { CRACKED_WALL_LINE, SEALED_DOOR_LINE, SOLID_WALL_LINE } from '@/lib/engine/core/dungeons/templeSystem/doors';
import { neighbourFloorOf } from '@/lib/engine/core/dungeons/floorOrder';
import type { Room } from '@/lib/engine/core/dungeons/types';
import { roomKind, SFX } from './vocabulary';
import type { Direction, RoomContext, RoomOutcome, RoomSheet } from './vocabulary';

const STEP: Record<Direction, [number, number]> = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1],
};

export const temples = () => TempleSystem.getInstance();

/**
 * What lies in each direction of a room: the room there (if any), whether this side has a small lock (the boss door
 * has its own), and what stands on the side (a wall and a cracked wall are no way through either).
 */
export interface Exit {
  position: [number, number];
  room?: Room;
  locked: boolean;
  kind: DoorKind;
}
export type Exits = Record<Direction, Exit>;

export const readExits = (templeId: string, level: string, position: [number, number]): Exits => {
  const manager = DungeonManager.getInstance();
  const exit = (direction: Direction): Exit => {
    const next: [number, number] = [position[0] + STEP[direction][0], position[1] + STEP[direction][1]];
    const kind = temples().doorKind(templeId, position, direction, level);
    return { position: next, room: manager.getRoom(templeId, next, level), locked: kind === 'locked', kind };
  };
  return { north: exit('north'), east: exit('east'), south: exit('south'), west: exit('west') };
};

/** What the sheet of a beast-sealed side is headed, for the sides that are not a plain lock */
const SEALED_HEADERS: Partial<Record<DoorKind, string>> = { master: 'The Boss Door', bombable: 'Cracked Wall' };

/**
 * The sheet for a door the hero taps: a small lock asks for a key, the boss door asks for the Boss Key and
 * refuses everything else ("A big lock. This needs the Boss Key."), a wall and a cracked wall say what they are and offer
 * nothing (a cracked wall waits for a Bomb), an open way has nothing to say. In a room a beast has sealed every shut
 * side says so and offers nothing.
 */
export const doorActions = (ctx: RoomContext, direction: Direction): RoomSheet => {
  const system = temples();
  const open = (done: string): RoomOutcome =>
    system.unlockDoor(ctx.templeId, ctx.position, direction)
      ? { message: done, sound: SFX.useKey }
      : { message: system.explainDoor(ctx.templeId, ctx.position, direction) ?? 'The door will not open.', sound: SFX.error };

  const kind = system.doorKind(ctx.templeId, ctx.position, direction, ctx.level);
  // The beast of a sealed room bars every shut side: no key is offered, whatever the lock
  const isBarredByBeast = kind !== 'open' && kind !== 'wall' && system.isRoomBarred(ctx.templeId, ctx.level, ctx.position);
  if (isBarredByBeast) return { header: SEALED_HEADERS[kind] ?? 'Locked Door', subHeader: SEALED_DOOR_LINE, actions: [] };

  switch (kind) {
    case 'wall':
      return { header: 'Solid Wall', subHeader: SOLID_WALL_LINE, actions: [] };
    case 'bombable':
      return { header: 'Cracked Wall', subHeader: CRACKED_WALL_LINE, actions: [] };
    case 'master':
      return system.hasMasterKey(ctx.templeId)
        ? { header: 'The Boss Door', subHeader: 'The Boss Key fits the big lock.', actions: [{ label: 'Open the door', run: () => open('The big lock falls away.') }] }
        : { header: 'The Boss Door', subHeader: BOSS_DOOR_LINE, actions: [] };
    case 'locked':
      return (system.getTempleState(ctx.templeId)?.playerKeys ?? 0) > 0
        ? { header: 'Locked Door', subHeader: 'Would you like to use a key to unlock this door?', actions: [{ label: 'Unlock (-1 Key)', run: () => open('Door unlocked!') }] }
        : { header: 'Locked Door', subHeader: 'You need a key to unlock this door!', actions: [] };
    default:
      return { header: 'The way is open.', actions: [] };
  }
};

/** Floors a hero can climb to or fall to: the next one up or down in the order floors are climbed (a basement drawn last is still below 1F). */
export const neighbourFloor = (templeId: string, level: string, step: 1 | -1): string | undefined =>
  neighbourFloorOf(temples().getFloors(templeId), level, step);

/** Put the hero on `floor`, trying each spot in turn. Returns true on the first one they can stand on. */
export const arriveOn = (templeId: string, floor: string, spots: Array<[number, number] | undefined>): boolean => {
  for (const spot of spots) {
    const hasArrived = spot && temples().changeLevel(templeId, floor, spot);
    if (hasArrived) return true;
  }
  return false;
};

/** The first room of the given kinds on a floor. */
export const findRoomOfKind = (templeId: string, floor: string, kinds: string[]): [number, number] | undefined => {
  const manager = DungeonManager.getInstance();
  const grid = manager.getMazeGrid(templeId, floor);
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (kinds.includes(roomKind(manager.getRoom(templeId, [row, col], floor)))) return [row, col];
    }
  }
  return undefined;
};

export const climb = (room: Room, ctx: RoomContext, way: 'up' | 'down'): RoomOutcome => {
  const rubble: RoomOutcome = { message: 'The stairs are blocked by rubble.', sound: SFX.error };
  const target = (room.content?.targetLevel as string | undefined) ?? neighbourFloor(ctx.templeId, ctx.level, way === 'up' ? 1 : -1);
  const isStairwayBlocked = !target || !temples().getFloors(ctx.templeId).includes(target) || target === ctx.level;
  if (isStairwayBlocked) return rubble;

  const coords = room.content?.targetCoords;
  const landing = findRoomOfKind(ctx.templeId, target, [way === 'up' ? 'stairs-down' : 'stairs-up']);
  const requested: [number, number] | undefined = coords ? [Number(coords.y), Number(coords.x)] : undefined;
  if (!arriveOn(ctx.templeId, target, [requested, landing, ctx.position])) return rubble;

  return { message: `You climb ${way} to ${target}.`, sound: SFX.steps, moved: true };
};
