/**
 * Battle effects: the one table of fight tricks that items (BattleItems) and in-game Powers both point at, so a
 * spell and its matching item behave the same (docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 2).
 *
 * Rule zero still holds: no effect completes a chore. Effects buy time (frost, time-stop, kindle), blunt the beast
 * (stun, weaken), send a chore back to the board unfinished (recall) or heal the hero (heal).
 *
 * This module never touches MP or the screen: the caller checks and charges the MP, shows the line and plays the
 * sound. Once-per-fight is kept per effect, whatever cast it, in the page's `usedThisFight` set.
 */
import { useUserStore } from '@/lib/store/stores/user';
import type { BattleService } from './BattleService';

export type BattleEffectId = 'frost' | 'time-stop' | 'stun' | 'recall' | 'weaken' | 'kindle' | 'heal';

/** Every effect, in the order the Game Master's "In battle" dropdown lists them. */
export const BATTLE_EFFECT_IDS: BattleEffectId[] = ['frost', 'time-stop', 'stun', 'recall', 'weaken', 'kindle', 'heal'];

export interface BattleEffectRule {
  id: BattleEffectId;
  /** The GM dropdown label and the card's effect line, e.g. "+10 minutes on the clock". */
  label: string;
  oncePerFight: boolean;
}

/** The table from the spec. */
export const BATTLE_EFFECTS: Record<BattleEffectId, BattleEffectRule> = {
  frost: { id: 'frost', label: '+10 minutes on the clock', oncePerFight: false },
  'time-stop': { id: 'time-stop', label: 'Pauses the clock for 15 minutes', oncePerFight: true },
  stun: { id: 'stun', label: 'The beast skips its next strike', oncePerFight: false },
  recall: { id: 'recall', label: 'Sends one chore back to the board', oncePerFight: false },
  weaken: { id: 'weaken', label: "Halves the beast's attack", oncePerFight: true },
  kindle: { id: 'kindle', label: 'Chores earn 1.5x the minutes', oncePerFight: true },
  heal: { id: 'heal', label: 'Heals 25% of max HP', oncePerFight: true },
};

/** The engine calls an effect can make; a Pick so tests can hand in a plain mock. */
export type BattleEffectEngine = Pick<
  BattleService,
  'extendClock' | 'freezeClock' | 'skipNextStrike' | 'postponeTask' | 'weakenEnemy' | 'scaleCooldown' | 'getCurrentEnemy'
>;

export interface BattleEffectContext {
  userId: string;
  service: BattleEffectEngine;
  /** Effect ids already spent this fight (once-per-fight is per effect, whatever cast it); the page keeps one Set per fight. */
  usedThisFight: Set<BattleEffectId>;
  /** The chore a recall was aimed at (the second call, after the task picker). */
  taskId?: string;
}

export interface BattleEffectOutcome {
  /** The effect did its thing. */
  ok: boolean;
  /** One dialog line for the message box, or the refusal. */
  line: string;
  /** A play$fx key. */
  sound: string;
  /** A recall needs a chore first: open the task picker, then call again with `taskId`. */
  needsTaskPick?: boolean;
}

export const ICE_WAND_MS = 10 * 60_000;
export const CHRONOS_FREEZE_MS = 15 * 60_000;
export const SOL_FLARE_FACTOR = 0.5;
export const FIRE_WAND_FACTOR = 1.5;
export const HEAL_SHARE = 0.25;

export const REASON_NO_MP = 'Not enough MP';
export const REASON_USED = 'Already used this fight';
export const REASON_HP_FULL = 'Your HP is full.';

export const SOUND_ITEM = 'select';
export const SOUND_HEAL = 'restoreHP';
export const SOUND_NO = 'no';

const CLOCK_STOPPED = 'The clock is not running.';

/** Whether a stored value (a Power's `battleEffect`, say) names one of the seven effects. */
export const isBattleEffectId = (value: unknown): value is BattleEffectId =>
  typeof value === 'string' && (BATTLE_EFFECT_IDS as string[]).includes(value);

/** The hero's HP or MP as `{ now, max }`, whichever shape the profile stores it in. */
export const heroPoints = (userId: string, kind: 'hp' | 'mp'): { now: number; max: number } => {
  const stats = useUserStore().getUserById(userId)?.stats;
  const value = stats?.[kind];
  if (value && typeof value === 'object') return { now: Number(value.now) || 0, max: Number(value.max) || 0 };
  const topMax = stats?.[kind === 'hp' ? 'maxHp' : 'maxMp'];
  const max = typeof topMax === 'number' ? topMax : 100;
  return { now: typeof value === 'number' ? value : max, max };
};

/** Why the effect cannot run right now (already used this fight, HP full), else null. MP is not checked here. */
export const battleEffectBlocked = (effect: BattleEffectId, ctx: BattleEffectContext): string | null => {
  if (BATTLE_EFFECTS[effect].oncePerFight && ctx.usedThisFight.has(effect)) return REASON_USED;
  if (effect === 'heal') {
    const hp = heroPoints(ctx.userId, 'hp');
    if (hp.now >= hp.max) return REASON_HP_FULL;
  }
  return null;
};

const refuse = (line: string): BattleEffectOutcome => ({ ok: false, line, sound: SOUND_NO });

const done = (ctx: BattleEffectContext, effect: BattleEffectId, line: string, sound = SOUND_ITEM): BattleEffectOutcome => {
  if (BATTLE_EFFECTS[effect].oncePerFight) ctx.usedThisFight.add(effect);
  return { ok: true, line, sound };
};

const beastName = (ctx: BattleEffectContext): string => ctx.service.getCurrentEnemy()?.name ?? 'The beast';

/**
 * Run the effect on the engine. Refuses (changing nothing) when `battleEffectBlocked` has a reason or the engine
 * says no. Never touches MP. On ok, marks once-per-fight effects used. Recall without `ctx.taskId` answers
 * `{ ok: true, needsTaskPick: true }` and changes nothing.
 */
export const applyBattleEffect = (effect: BattleEffectId, ctx: BattleEffectContext): BattleEffectOutcome => {
  const blocked = battleEffectBlocked(effect, ctx);
  if (blocked) return refuse(blocked);

  switch (effect) {
    case 'frost':
      if (!ctx.service.extendClock(ICE_WAND_MS)) return refuse(CLOCK_STOPPED);
      return done(ctx, effect, 'Ice creeps over the clock: +10 minutes!');

    case 'time-stop':
      if (!ctx.service.freezeClock(CHRONOS_FREEZE_MS)) return refuse(CLOCK_STOPPED);
      return done(ctx, effect, 'Time stands still for 15 minutes!');

    case 'stun':
      ctx.service.skipNextStrike();
      return done(ctx, effect, `${beastName(ctx)} is stunned! It will miss its next strike.`);

    case 'recall':
      if (!ctx.taskId) return { ok: true, line: 'Which chore flies back to the board?', sound: SOUND_ITEM, needsTaskPick: true };
      if (!ctx.service.postponeTask(ctx.taskId)) return refuse('The last chore cannot fly away.');
      return done(ctx, effect, 'The chore flies back to the board.');

    case 'weaken':
      ctx.service.weakenEnemy(SOL_FLARE_FACTOR);
      return done(ctx, effect, `The sun blazes! ${beastName(ctx)}'s attack is halved.`);

    case 'kindle':
      ctx.service.scaleCooldown(FIRE_WAND_FACTOR);
      return done(ctx, effect, 'The fuse burns slow: every chore earns 1.5x the minutes!');

    case 'heal': {
      const hp = heroPoints(ctx.userId, 'hp');
      const gain = Math.max(1, Math.min(Math.round(hp.max * HEAL_SHARE), hp.max - hp.now));
      useUserStore().updateUserHP({ userId: ctx.userId, amount: gain });
      return done(ctx, effect, `+${gain} HP`, SOUND_HEAL);
    }
  }
};
