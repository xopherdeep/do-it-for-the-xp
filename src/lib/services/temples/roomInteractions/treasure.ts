/**
 * What the hero takes from a temple: the gate's reward that clears it, keys, maps and compasses lying in a
 * room of their own, the question of whether a chest still holds anything, and the question of whether the one
 * thing a room holds (a pickup, the secret chest, a find, a riddle) was already taken.
 */
import { DungeonManager, roomPositionKey } from '@/lib/engine/core/dungeons/DungeonManager';
import { ChestSystem } from '@/lib/engine/core/dungeons/ChestSystem';
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { asChestRoom } from '../ChestLoot';
import { roomDrops } from '../fightDrops';
import { earnGold } from './hero';
import { temples } from './travel';
import { roomKind, SFX } from './vocabulary';
import type { ClearedReward, RoomContext, RoomOutcome } from './vocabulary';

const GATE_REWARD = { xp: 150, gp: 50, ap: 3 };

/** The XP, GP and AP a gate's content names, else the standard reward. */
export const gateRewardOf = (content: Room['content'] | undefined): { xp: number; gp: number; ap: number } => {
  const authored = content?.reward ?? {};
  return {
    xp: Number(authored.xp ?? content?.xp ?? GATE_REWARD.xp),
    gp: Number(authored.gp ?? content?.gp ?? GATE_REWARD.gp),
    ap: Number(authored.ap ?? content?.ap ?? GATE_REWARD.ap),
  };
};

/** What a temple pays for being cleared: its gate's own reward when the layout has a gate that names one, else the standard. */
const templeReward = (templeId: string): { xp: number; gp: number; ap: number } => {
  const rooms = Object.values(DungeonManager.getInstance().getDungeon(templeId)?.rooms ?? {});
  const gate = rooms.find((room) => roomKind(room) === 'gate' && (room.content?.reward || room.content?.xp !== undefined));
  return gateRewardOf(gate?.content);
};

/**
 * The one way a temple is cleared, for the gate and for the Pegasus chest alike: mark the temple cleared for this hero
 * and pay the reward, once. Whichever comes first pays; a temple that is already cleared pays nothing and answers
 * null, so the second of the two (the chest after the gate, the gate after the chest) is only a way out.
 * @param reward What to pay; the temple's own (its gate's, else the standard 150 XP, 50 GP, 3 AP) when not given
 * @returns The tally as paid (the coins with the hero's bonuses), or null when nothing was paid
 */
export const clearTemple = (templeId: string, userId?: string, reward = templeReward(templeId)): ClearedReward | null => {
  const system = temples();
  if (system.isTempleCleared(templeId)) return null;
  system.markTempleCleared(templeId);
  if (!userId) return null;

  const store = useUserStore();
  let levelUp = false;
  const hasXp = reward.xp > 0;
  if (hasXp) {
    levelUp = store.updateUserXP({ userId, amount: reward.xp, commit: true }).didLevelUp;
    store.updateClassXp(userId, store.getUserById(userId)?.jobClass || 'default', reward.xp);
  }
  const paidGp = reward.gp > 0 ? earnGold(userId, reward.gp) : 0;
  const hasAp = reward.ap > 0;
  if (hasAp) store.recordAPGain({ userId, amount: reward.ap, source: `temple:${templeId}` });
  return { xp: reward.xp, gp: paidGp, ap: reward.ap, levelUp };
};

/** Open the temple's gate: clear the temple for this hero (paying the reward once), send them home. */
export const openGate = (room: Room, ctx: RoomContext): RoomOutcome => {
  const cleared = clearTemple(ctx.templeId, ctx.userId, gateRewardOf(room.content));
  if (!cleared) return { intent: 'leave', sound: SFX.yes };

  return {
    message: `The gate swings wide. Temple cleared! +${cleared.xp} XP, +${cleared.gp} GP, +${cleared.ap} AP${cleared.levelUp ? '. Level up!' : ''}`,
    sound: SFX.secret,
    intent: 'leave',
    cleared,
  };
};

/**
 * Whether the hero already took what this room holds. The answer is part of their saved run, the same set a chest of
 * consumables is filed in (TempleState.openedChests, `${level}:${row},${col}`): a reload finds the room spent, a
 * blood moon gives it back, and each hero has their own because each has a run of their own.
 */
export const isRoomSpent = (ctx: RoomContext): boolean =>
  Boolean(temples().getTempleState(ctx.templeId)?.openedChests?.has(roomPositionKey(ctx.level, ctx.position)));

/** Take what this room holds: spend the room and save the run. Returns false if it was already spent. */
export const spendRoom = (ctx: RoomContext): boolean => {
  if (isRoomSpent(ctx)) return false;
  temples().markChestOpened(ctx.templeId, ctx.level, ctx.position);
  return true;
};

/**
 * Whether a key, map or compass room has nothing left. A map or compass the hero holds stays taken through a
 * blood moon (key items stay, docs/Temple-Generation-Contract.md 5), though the room is given back with the rest.
 */
export const isPickupTaken = (kind: string, ctx: RoomContext): boolean => {
  const state = temples().getTempleState(ctx.templeId);
  const holdsIt = (kind === 'map' && state?.hasMap) || (kind === 'compass' && state?.hasCompass);
  return Boolean(holdsIt) || isRoomSpent(ctx);
};

/** A key, map or compass lying in a room of its own. */
export const pickUp = (kind: string, room: Room, ctx: RoomContext): RoomOutcome => {
  const system = temples();
  if (isPickupTaken(kind, ctx)) return { message: 'Nothing left here.' };
  spendRoom(ctx);

  const isMap = kind === 'map';
  if (isMap) {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasMap = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the map.', sound: SFX.takeItem, found: { kind: 'map', title: 'Dungeon Map' } };
  }
  const isCompass = kind === 'compass';
  if (isCompass) {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasCompass = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the compass.', sound: SFX.takeItem, found: { kind: 'compass', title: 'Compass' } };
  }

  const name = String(room.content?.keyName ?? 'a small key');
  const isMasterKey = room.content?.keyId === 'master';
  if (isMasterKey) {
    system.grantMasterKey(ctx.templeId);
    // The key that opens the boss door is the Boss Key; a layout may give this one a name of its own
    const named = room.content?.keyName;
    const message = named ? `${named}: the Boss Key is yours.` : 'The Boss Key is yours.';
    return { message, sound: SFX.key, found: { kind: 'boss-key', title: 'Boss Key' } };
  }
  system.addKey(ctx.templeId);
  return { message: `You take ${name}.`, sound: SFX.key, found: { kind: 'key', title: 'Small Key' } };
};

/**
 * Whether a fight room's drop is waiting for the hero: the room drops something (`content.drops`, see fightDrops), the hero
 * has not taken it in this run, and no fight stands in the way. The drop is filed apart from the room's own key
 * (TempleSystem.isDropTaken), so taking it does not spend the room's search and searching does not take it.
 * @param isFightLive The beast is still there to be fought: a quest room whose sheet offers the fight, a classic room not yet cleared
 */
export const isDropWaiting = (room: Room, ctx: RoomContext, isFightLive: boolean): boolean => {
  if (isFightLive) return false;
  const isDropped = roomDrops(room) !== null;
  return isDropped && !temples().isDropTaken(ctx.templeId, ctx.level, ctx.position);
};

/** A chest is empty when the room says so, or its chest in the ChestSystem is. */
export const isChestEmptyIn = (given: Room): boolean => {
  const room = asChestRoom(given);
  const content = room.content;
  const hasNothingToLoot = room.type !== 'loot' || room.isEmpty || !content;
  if (hasNothingToLoot) return true;
  const chestId = content.chestId;
  if (chestId) {
    const chest = ChestSystem.getInstance().getChest(chestId);
    if (chest?.isEmpty) return true;
  }
  return false;
};
