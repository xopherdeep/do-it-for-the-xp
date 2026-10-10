/**
 * Battle items: what tapping an equipped item does during a fight (docs/Items-And-Classes-Contract.md, A).
 *
 * Rule zero: no item completes a chore. Items buy time (Ice Wand, Chronos' Clock, Fire Wand), blunt the
 * beast (Thor's Hammer, Sol's Flare), send a chore back to the board unfinished (Silver Arrow) or heal
 * the hero (Bottles). Everything else "does nothing here".
 *
 * Like ItemUse.useItem this module never touches the screen: it spends MP in the Pinia user store, calls
 * the engine, and answers with a line, a sound and whether it worked. The page shows the sheet, plays the
 * sound and types the line. Items are recognised by name (profiles store plain copies of the catalogue).
 */
import { useUserStore } from '@/lib/store/stores/user';
import { mpCostOf } from '@/lib/services/temples/ItemUse';
import { heroMpBill } from '@/lib/services/stats/StatEffects';
import type { BattleService, CombatTask } from './BattleService';

/** The engine calls an item can make; a Pick so tests can hand in a plain mock. */
export type BattleItemEngine = Pick<
  BattleService,
  'extendClock' | 'freezeClock' | 'skipNextStrike' | 'postponeTask' | 'weakenEnemy' | 'scaleCooldown' | 'getCurrentEnemy'
>;

/** An equipped item as the profile stores it: the catalogue entry without its `click`. */
export interface BattleItemLike {
  name?: string;
  faIcon?: string;
  desc?: string;
  [key: string]: unknown;
}

export interface BattleItemContext {
  userId: string;
  service: BattleItemEngine;
  /** Names of the once-per-fight items already used; the page keeps one Set per fight. */
  usedThisFight: Set<string>;
  /** The chore the Silver Arrow was aimed at (the second call, after the task picker). */
  taskId?: string;
}

export interface BattleItemOutcome {
  /** The item did its thing (and its MP was spent). */
  ok: boolean;
  /** One dialog line for the message box, or the refusal. */
  line: string;
  /** A play$fx key. */
  sound: string;
  /** The Silver Arrow needs a chore first: open the task picker, then call again with `taskId`. */
  needsTaskPick?: boolean;
}

/** One row of the Item sheet: what the hand holds and whether it can be used right now. */
export interface BattleItemCard {
  name: string;
  faIcon: string;
  mp: number;
  /** One line of what it does in a fight. */
  effect: string;
  /** Why it is greyed out, or null when it can be used. */
  reason: string | null;
}

export const ICE_WAND_MS = 10 * 60_000;
export const CHRONOS_FREEZE_MS = 15 * 60_000;
export const SOL_FLARE_FACTOR = 0.5;
export const FIRE_WAND_FACTOR = 1.5;
export const BOTTLES_HEAL_SHARE = 0.25;

export const REASON_NO_MP = 'Not enough MP';
export const REASON_USED = 'Already used this fight';
export const REASON_NOTHING = 'Does nothing here.';

export const SOUND_ITEM = 'select';
export const SOUND_HEAL = 'restoreHP';
export const SOUND_NO = 'no';

interface BattleItemRule {
  /** The MP cost when the stored item carries no "NNMP |" description. */
  mp: number;
  effect: string;
  oncePerFight?: boolean;
}

/** The table from the contract. Anything not in it does nothing in a fight. */
export const BATTLE_ITEMS: Record<string, BattleItemRule> = {
  'Ice Wand': { mp: 50, effect: '+10 minutes on the clock' },
  "Chronos' Clock": { mp: 100, effect: 'Pauses the clock for 15 minutes', oncePerFight: true },
  "Thor's Hammer": { mp: 60, effect: 'The beast skips its next strike' },
  'Silver Arrow': { mp: 25, effect: 'Sends one chore back to the board' },
  "Sol's Flare": { mp: 100, effect: "Halves the beast's attack", oncePerFight: true },
  'Fire Wand': { mp: 50, effect: 'Chores earn 1.5x the minutes', oncePerFight: true },
  Bottles: { mp: 0, effect: 'Heals 25% of max HP', oncePerFight: true },
};

const nameOf = (item: BattleItemLike): string => (typeof item.name === 'string' ? item.name : '');

/** The item's MP cost in a fight: the number its description starts with, else the contract's table. */
export const battleMpCost = (item: BattleItemLike): number => mpCostOf(item) || BATTLE_ITEMS[nameOf(item)]?.mp || 0;

/** What this hero pays for the item: the list price with their class discount (Mage 25%, Sage 50%) and trained intelligence taken. */
export const heroMpCost = (item: BattleItemLike, userId: string): number =>
  heroMpBill(battleMpCost(item), useUserStore().getUserById(userId));

const points = (userId: string, kind: 'hp' | 'mp'): { now: number; max: number } => {
  const stats = useUserStore().getUserById(userId)?.stats;
  const value = stats?.[kind];
  if (value && typeof value === 'object') return { now: Number(value.now) || 0, max: Number(value.max) || 0 };
  const topMax = stats?.[kind === 'hp' ? 'maxHp' : 'maxMp'];
  const max = typeof topMax === 'number' ? topMax : 100;
  return { now: typeof value === 'number' ? value : max, max };
};

/**
 * Describe an equipped item for the Item sheet: name, MP, one line of effect and, when it cannot be
 * used right now, the reason. A null item (an empty hand) gives null.
 */
export const describeBattleItem = (item: BattleItemLike | null | undefined, ctx: BattleItemContext): BattleItemCard | null => {
  if (!item || !nameOf(item)) return null;
  const name = nameOf(item);
  const rule = BATTLE_ITEMS[name];
  const mp = rule ? heroMpCost(item, ctx.userId) : 0;
  const faIcon = typeof item.faIcon === 'string' ? item.faIcon : '';

  if (!rule) return { name, faIcon, mp, effect: REASON_NOTHING, reason: REASON_NOTHING };
  if (rule.oncePerFight && ctx.usedThisFight.has(name)) return { name, faIcon, mp, effect: rule.effect, reason: REASON_USED };
  if (mp > 0 && points(ctx.userId, 'mp').now < mp) return { name, faIcon, mp, effect: rule.effect, reason: REASON_NO_MP };
  return { name, faIcon, mp, effect: rule.effect, reason: null };
};

const refuse = (line: string): BattleItemOutcome => ({ ok: false, line, sound: SOUND_NO });

const done = (ctx: BattleItemContext, name: string, mp: number, line: string, sound = SOUND_ITEM): BattleItemOutcome => {
  if (mp > 0) useUserStore().updateUserMP({ userId: ctx.userId, amount: -mp });
  if (BATTLE_ITEMS[name]?.oncePerFight) ctx.usedThisFight.add(name);
  return { ok: true, line, sound };
};

const beastName = (ctx: BattleItemContext): string => ctx.service.getCurrentEnemy()?.name ?? 'The beast';

/**
 * Use an equipped item in a fight. Checks the once-per-fight rule and the MP first (no MP is spent
 * on a refusal), then calls the engine. The Silver Arrow answers `needsTaskPick` until it is called
 * again with `ctx.taskId`. Returns `{ ok, line, sound }` like ItemUse.useItem.
 */
export const useBattleItem = (item: BattleItemLike, ctx: BattleItemContext): BattleItemOutcome => {
  const name = nameOf(item) || 'That';
  const rule = BATTLE_ITEMS[name];
  if (!rule) return refuse(`${name}: ${REASON_NOTHING}`);
  if (rule.oncePerFight && ctx.usedThisFight.has(name)) return refuse(REASON_USED);

  const mp = heroMpCost(item, ctx.userId);
  if (mp > 0 && points(ctx.userId, 'mp').now < mp) return refuse(REASON_NO_MP);

  switch (name) {
    case 'Ice Wand':
      if (!ctx.service.extendClock(ICE_WAND_MS)) return refuse('The clock is not running.');
      return done(ctx, name, mp, 'Ice creeps over the clock: +10 minutes!');

    case "Chronos' Clock":
      if (!ctx.service.freezeClock(CHRONOS_FREEZE_MS)) return refuse('The clock is not running.');
      return done(ctx, name, mp, 'Time stands still for 15 minutes!');

    case "Thor's Hammer":
      ctx.service.skipNextStrike();
      return done(ctx, name, mp, `${beastName(ctx)} is stunned! It will miss its next strike.`);

    case 'Silver Arrow': {
      if (!ctx.taskId) return { ok: true, line: 'Which chore flies back to the board?', sound: SOUND_ITEM, needsTaskPick: true };
      const flown: CombatTask | null = ctx.service.postponeTask(ctx.taskId);
      if (!flown) return refuse('The last chore cannot fly away.');
      return done(ctx, name, mp, 'The chore flies back to the board.');
    }

    case "Sol's Flare":
      ctx.service.weakenEnemy(SOL_FLARE_FACTOR);
      return done(ctx, name, mp, `The sun blazes! ${beastName(ctx)}'s attack is halved.`);

    case 'Fire Wand':
      ctx.service.scaleCooldown(FIRE_WAND_FACTOR);
      return done(ctx, name, mp, 'The fuse burns slow: every chore earns 1.5x the minutes!');

    case 'Bottles': {
      const hp = points(ctx.userId, 'hp');
      if (hp.now >= hp.max) return refuse('No need for a swig. Your HP is full.');
      const gain = Math.max(1, Math.min(Math.round(hp.max * BOTTLES_HEAL_SHARE), hp.max - hp.now));
      useUserStore().updateUserHP({ userId: ctx.userId, amount: gain });
      return done(ctx, name, 0, `You drink from the bottles: +${gain} HP`, SOUND_HEAL);
    }
  }

  return refuse(`${name}: ${REASON_NOTHING}`);
};
