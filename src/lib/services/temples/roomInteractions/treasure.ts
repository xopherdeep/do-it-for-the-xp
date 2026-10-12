/**
 * What the hero takes from a temple: the gate's reward that clears it, keys, maps and compasses lying in a
 * room of their own, and the question of whether a chest still holds anything.
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { ChestSystem } from '@/lib/engine/core/dungeons/ChestSystem';
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { asChestRoom } from '../ChestLoot';
import { earnGold } from './hero';
import { temples } from './travel';
import { rememberOnce, roomKey } from './visitMemory';
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
  if (reward.xp > 0) {
    levelUp = store.updateUserXP({ userId, amount: reward.xp, commit: true }).didLevelUp;
    store.updateClassXp(userId, store.getUserById(userId)?.jobClass || 'default', reward.xp);
  }
  const paidGp = reward.gp > 0 ? earnGold(userId, reward.gp) : 0;
  if (reward.ap > 0) store.recordAPGain({ userId, amount: reward.ap, source: `temple:${templeId}` });
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

/** A key, map or compass lying in a room of its own. */
export const pickUp = (kind: string, room: Room, ctx: RoomContext): RoomOutcome => {
  const system = temples();
  if (!rememberOnce(roomKey(ctx, 'pickup'))) return { message: 'Nothing left here.' };

  if (kind === 'map') {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasMap = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the map.', sound: SFX.takeItem };
  }
  if (kind === 'compass') {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasCompass = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the compass.', sound: SFX.takeItem };
  }

  const name = String(room.content?.keyName ?? 'a small key');
  if (room.content?.keyId === 'master') {
    system.grantMasterKey(ctx.templeId);
    // The key that opens the boss door is the Boss Key; a layout may give this one a name of its own
    const named = room.content?.keyName;
    return { message: named ? `${named}: the Boss Key is yours.` : 'The Boss Key is yours.', sound: SFX.key };
  }
  system.addKey(ctx.templeId);
  return { message: `You take ${name}.`, sound: SFX.key };
};

/** A chest is empty when the room says so, or its chest in the ChestSystem is. */
export const isChestEmptyIn = (given: Room): boolean => {
  const room = asChestRoom(given);
  const content = room.content;
  const hasNothingToLoot = room.type !== 'loot' || room.isEmpty || !content;
  if (hasNothingToLoot) return true;
  if (content.chestId) {
    const chest = ChestSystem.getInstance().getChest(content.chestId);
    if (chest?.isEmpty) return true;
  }
  return false;
};
