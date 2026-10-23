/**
 * Traps and pits: what hurts the hero in a room and what a room does the moment they walk in.
 */
import { pitDropOf } from '@/lib/engine/core/dungeons/floorOrder';
import type { PitDrop } from '@/lib/engine/core/dungeons/floorOrder';
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { hurtHero } from './hero';
import { arriveOn, findRoomOfKind, temples } from './travel';
import { hasHappened, rememberOnce, rngOf, roomKey } from './visitMemory';
import { roomKind, SFX, words } from './vocabulary';
import type { RoomContext, RoomOutcome } from './vocabulary';

export const trapDamage = (room: Room): number => {
  const damage = Number(room.content?.damage);
  return Number.isFinite(damage) && damage > 0 ? damage : 5;
};

export const springTrap = (room: Room, ctx: RoomContext): RoomOutcome => {
  rememberOnce(roomKey(ctx, 'trap'));
  const damage = trapDamage(room);
  const { lost, defeated } = hurtHero(ctx.userId, damage);
  const name = words(String(room.content?.trapType ?? 'hidden'));
  return {
    message: `The ${name} trap bites: -${lost} HP${defeated ? '. You black out.' : ''}`,
    sound: SFX.damage,
    shake: true,
    defeated: defeated || undefined,
  };
};

export const jumpTrap = (room: Room, ctx: RoomContext): RoomOutcome => {
  const stats = useUserStore().getUserById(ctx.userId)?.stats;
  const agility = Number(stats?.special?.agility ?? stats?.agility) || 0;
  const canLeapClear = agility >= 8 || rngOf(ctx)() < 0.5;
  if (canLeapClear) {
    rememberOnce(roomKey(ctx, 'trap'));
    return { message: 'You leap clear of the trap.', sound: SFX.yes };
  }
  return springTrap(room, ctx);
};

/**
 * Where a pit drops the hero (pitDropOf, the solver's rule too): the lower floor and cell it names, else the next floor
 * down; nothing when the temple has no floor below the pit.
 */
const pitDrop = (room: Room, ctx: RoomContext): PitDrop | undefined => pitDropOf(temples().getFloors(ctx.templeId), ctx.level, room.content);

/** The cell a pit lands on first: the one it names, then the same cell, then the floor's first stairs up */
const fallInPit = (room: Room, ctx: RoomContext): RoomOutcome => {
  const { lost, defeated } = hurtHero(ctx.userId, 5);
  if (defeated) return { message: `The pit swallows you: -${lost} HP. You black out.`, sound: SFX.damage, shake: true, defeated: true };

  const drop = pitDrop(room, ctx);
  const hasLandedBelow = drop && arriveOn(ctx.templeId, drop.floor, [drop.cell, ctx.position, findRoomOfKind(ctx.templeId, drop.floor, ['stairs-up'])]);
  if (hasLandedBelow) {
    return { message: `You fall to ${drop.floor}: -${lost} HP`, sound: SFX.damage, shake: true, moved: true };
  }
  return { message: `You land hard at the bottom: -${lost} HP`, sound: SFX.damage, shake: true };
};

/**
 * What a room does the moment the hero walks in. Null when it waits for the hero to act instead.
 * A trap hurts once per visit; one the hero can dodge opens its sheet first (intent 'sheet').
 */
export const onEnterRoom = (room: Room | undefined, ctx: RoomContext): RoomOutcome | null => {
  const kind = roomKind(room);
  if (!room) return null;

  const isTrap = kind === 'trap';
  if (isTrap) {
    if (hasHappened(roomKey(ctx, 'trap'))) return null;
    return room.content?.avoidable ? { intent: 'sheet' } : springTrap(room, ctx);
  }

  const isPit = kind === 'pit';
  if (isPit) {
    // With a floor to drop to the pit always drops the hero; with none it only bruises them once
    const hasFloorBelow = Boolean(pitDrop(room, ctx));
    const isRepeatPitVisit = !hasFloorBelow && !rememberOnce(roomKey(ctx, 'pit'));
    if (isRepeatPitVisit) return null;
    return fallInPit(room, ctx);
  }

  return null;
};
