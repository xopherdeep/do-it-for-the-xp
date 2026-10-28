/**
 * Getting around a temple: what lies in each direction of a room, the doors between rooms, the stairs between
 * floors (a flight can be locked: a small key or the Boss Key opens the climb, or it waits for the floor's chores to be
 * done), and the two lookups the pits and stairs share (the next floor, the first room of a kind).
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { BOSS_DOOR_LINE, TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { DoorKind } from '@/lib/engine/core/dungeons/TempleSystem';
import { CRACKED_WALL_LINE, SEALED_DOOR_LINE, SOLID_WALL_LINE } from '@/lib/engine/core/dungeons/templeSystem/doors';
import { neighbourFloorOf } from '@/lib/engine/core/dungeons/floorOrder';
import type { ClimbLock, Room } from '@/lib/engine/core/dungeons/types';
import { copyFor } from '@/lib/services/copy/copy';
import { voiceFor, type Voice } from '@/lib/services/copy/voices';
import { useUserStore } from '@/lib/store/stores/user';
import { climbLockOf } from '../authoredDoors';
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
      const isWantedKind = kinds.includes(roomKind(manager.getRoom(templeId, [row, col], floor)));
      if (isWantedKind) return [row, col];
    }
  }
  return undefined;
};

/** The locks a key opens (the floor-cleared lock has no key: the screen says whether the floor is done) */
type KeyLock = Exclude<ClimbLock, 'floorCleared'>;

/** What the stairs say of the lock that bars them: the sheet's subtitle, and the toast of a hero who cannot open it */
const CLIMB_LOCK_LINES: Record<KeyLock, string> = {
  small: 'A small lock bars the way.',
  master: "The Boss Door's lock bars the way.",
};

/** What the hero finds as the lock gives, ahead of the climb */
const CLIMB_UNLOCKED_LINES: Record<KeyLock, string> = {
  small: 'Unlocked!',
  master: 'The big lock falls away.',
};

/** What the stairs say of the lock that bars them, in the voice of the hero who stands before them (the floor line is in the copy catalogue) */
const lockLine = (lock: ClimbLock, ctx: RoomContext): string => {
  const isKeyLock = lock !== 'floorCleared';
  if (isKeyLock) return CLIMB_LOCK_LINES[lock];
  const voice: Voice = voiceFor(useUserStore().getUserById(ctx.userId));
  return copyFor('temple.floorClearedLock', voice);
};

/**
 * The lock a climb still has to open: the flight's lock, unless it is free or was opened already in this run. A
 * floor-cleared flight is never remembered as open: it is shut until the context says the floor is cleared, each time.
 */
const lockToOpen = (room: Room, ctx: RoomContext): ClimbLock | undefined => {
  const lock = climbLockOf(room);
  const isFloorLock = lock === 'floorCleared';
  if (isFloorLock) return ctx.floorCleared === true ? undefined : lock;
  const isFreeOrOpen = !lock || temples().isClimbUnlocked(ctx.templeId, ctx.level, ctx.position);
  return isFreeOrOpen ? undefined : lock;
};

/** What each lock wants of the hero's bag: a small key, or the Boss Key (kept, not spent); nothing in the bag opens a floor-cleared lock */
const HOLDS_WHAT_LOCK_WANTS: Record<ClimbLock, (templeId: string) => boolean> = {
  small: (templeId) => (temples().getTempleState(templeId)?.playerKeys ?? 0) > 0,
  master: (templeId) => temples().hasMasterKey(templeId),
  floorCleared: () => false,
};

/**
 * Whether the hero holds what the lock wants. A floor-cleared lock is never opened from the bag (`lockToOpen` has let
 * a cleared floor through already).
 */
const canOpenClimb = (templeId: string, lock: ClimbLock): boolean => HOLDS_WHAT_LOCK_WANTS[lock](templeId);

/**
 * The sheet of a flight of stairs: Climb on a free flight, or one already opened in this run, or one whose floor is
 * cleared (`ctx.floorCleared`). A locked flight says what bars it and, to a hero holding the key it wants, offers
 * "Unlock and climb" (the key is spent by `climb`, not here); a flight that waits for its floor offers nothing until then.
 */
export const stairsSheet = (room: Room, ctx: RoomContext, way: 'up' | 'down'): RoomSheet => {
  const header = way === 'up' ? 'Stairs lead up.' : 'Stairs lead down.';
  const lock = lockToOpen(room, ctx);
  if (!lock) return { header, actions: [{ label: 'Climb', run: () => climb(room, ctx, way) }] };

  const subHeader = lockLine(lock, ctx);
  const hasTheKey = canOpenClimb(ctx.templeId, lock);
  if (!hasTheKey) return { header, subHeader, actions: [] };
  return { header, subHeader, actions: [{ label: 'Unlock and climb', run: () => climb(room, ctx, way) }] };
};

/**
 * Take the stairs. A locked flight opens first (a small key is spent, the Boss Key is only shown) and stays open for the
 * run; a hero without the key is turned back where they stand. A floor-cleared flight spends nothing and opens nothing:
 * it climbs while `ctx.floorCleared` holds and turns the hero back while it does not. Stairs to no floor are rubble
 * before any key is taken.
 */
export const climb = (room: Room, ctx: RoomContext, way: 'up' | 'down'): RoomOutcome => {
  const rubble: RoomOutcome = { message: 'The stairs are blocked by rubble.', sound: SFX.error };
  const target = (room.content?.targetLevel as string | undefined) ?? neighbourFloor(ctx.templeId, ctx.level, way === 'up' ? 1 : -1);
  const isStairwayBlocked = !target || !temples().getFloors(ctx.templeId).includes(target) || target === ctx.level;
  if (isStairwayBlocked) return rubble;

  const lock = lockToOpen(room, ctx);
  const isFloorShut = lock === 'floorCleared';
  if (isFloorShut) return { message: lockLine(lock, ctx), sound: SFX.error };
  if (lock) {
    const hasOpened = temples().unlockClimb(ctx.templeId, ctx.level, ctx.position, lock);
    if (!hasOpened) return { message: CLIMB_LOCK_LINES[lock], sound: SFX.error };
  }

  const coords = room.content?.targetCoords;
  const landing = findRoomOfKind(ctx.templeId, target, [way === 'up' ? 'stairs-down' : 'stairs-up']);
  const requested: [number, number] | undefined = coords ? [Number(coords.y), Number(coords.x)] : undefined;
  const hasArrived = arriveOn(ctx.templeId, target, [requested, landing, ctx.position]);
  if (!hasArrived) return rubble;

  const climbed = `You climb ${way} to ${target}.`;
  if (lock) return { message: `${CLIMB_UNLOCKED_LINES[lock]} ${climbed}`, sound: SFX.useKey, moved: true };
  return { message: climbed, sound: SFX.steps, moved: true };
};
