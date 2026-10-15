/**
 * The hero's body and purse: read HP, MP and gold off the profile, and move them (hurt, heal, restore mana,
 * pay gold found in a temple). Everything goes through the Pinia user store.
 */
import { useUserStore } from '@/lib/store/stores/user';
import { admitToHospital } from '@/lib/services/hometown/hospitalAdmission';
import { heroGold } from '@/lib/services/stats/StatEffects';

/** A hero's HP or MP, whichever way the profile stores it (an object, or a number next to maxHp / maxMp). */
export const readPoints = (userId: string, kind: 'hp' | 'mp'): { now: number; max: number } => {
  const stats = useUserStore().getUserById(userId)?.stats;
  const value = stats?.[kind];
  const topMax = stats?.[kind === 'hp' ? 'maxHp' : 'maxMp'];
  const storesPointsAsObject = value && typeof value === 'object';
  if (storesPointsAsObject) return { now: Number(value.now) || 0, max: Number(value.max) || 0 };
  const max = typeof topMax === 'number' ? topMax : 100;
  return { now: typeof value === 'number' ? value : max, max };
};

export const readGold = (userId: string): number => {
  const wallet = useUserStore().getUserById(userId)?.stats?.gp?.wallet;
  return typeof wallet === 'number' ? wallet : 0;
};

/**
 * Pay the hero gold found in the temple (chests, searches, the gate) with their class loot bonus (Thief,
 * Ninja +25%) and trained awareness on top (docs/Stats-Contract.md). Returns the coins actually paid, for
 * the message.
 */
export const earnGold = (userId: string, amount: number): number => {
  const store = useUserStore();
  const gp = heroGold(amount, store.getUserById(userId));
  // The wallet moves before updateUserGP's first await; the save is not waited for
  const hasGold = gp > 0;
  if (hasGold) void store.updateUserGP({ userId, wallet: gp });
  return gp;
};

/**
 * Take HP off a hero. A hero who drops to 0 is admitted to the Hospital at once (full HP and MP, the flat bill, the
 * family told: docs/Quest-Rooms-Spec.md 5.8) and reported defeated, so the temple can carry them there.
 */
export const hurtHero = (userId: string, amount: number): { lost: number; defeated: boolean } => {
  const store = useUserStore();
  const before = readPoints(userId, 'hp').now;
  const alive = store.updateUserHP({ userId, amount: -amount });
  const after = readPoints(userId, 'hp');
  if (alive) return { lost: before - after.now, defeated: false };

  // The same as a lost battle: treated and billed first, so a reload never finds the hero at 0
  admitToHospital(userId, 'trap');
  return { lost: before, defeated: true };
};

/** Heal a hero by up to `amount`. Returns how much it really restored. */
export const healHero = (userId: string, amount: number): number => {
  const { now, max } = readPoints(userId, 'hp');
  const gain = Math.max(0, Math.min(amount, max - now));
  const hasGain = gain > 0;
  if (hasGain) useUserStore().updateUserHP({ userId, amount: gain });
  return gain;
};

export const restoreMana = (userId: string, amount: number): number => {
  const { now, max } = readPoints(userId, 'mp');
  const gain = Math.max(0, Math.min(amount, max - now));
  const hasGain = gain > 0;
  if (hasGain) useUserStore().updateUserMP({ userId, amount: gain });
  return gain;
};
