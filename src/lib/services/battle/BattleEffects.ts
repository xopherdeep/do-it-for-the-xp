/**
 * Battle effects: the one table of fight tricks that items (BattleItems) and in-game Powers both point at, so a
 * spell and its matching item behave the same (docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 2,
 * and docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 5).
 *
 * Rule zero still holds: no effect completes a chore. Effects buy time (frost, time-stop, kindle, gust), blunt the
 * beast (stun, pin, weaken), let the hero slip away (vanish), make chores pay the hero back (charge, moonlight) or
 * heal the hero (heal).
 *
 * This module never touches MP or the screen: the caller checks and charges the MP, shows the line and plays the
 * sound. Every effect is once per fight, kept per effect, whatever cast it, in the page's `usedThisFight` set.
 */
import { useUserStore } from '@/lib/store/stores/user';
import type { BattleService } from './BattleService';

export type BattleEffectId =
  | 'frost'
  | 'time-stop'
  | 'kindle'
  | 'gust'
  | 'stun'
  | 'pin'
  | 'weaken'
  | 'vanish'
  | 'charge'
  | 'moonlight'
  | 'heal';

/** Every effect, in the order the Game Master's "In battle" dropdown lists them. */
export const BATTLE_EFFECT_IDS: BattleEffectId[] = [
  'frost',
  'time-stop',
  'kindle',
  'gust',
  'stun',
  'pin',
  'weaken',
  'vanish',
  'charge',
  'moonlight',
  'heal',
];

export interface BattleEffectRule {
  id: BattleEffectId;
  /** The GM dropdown label and the card's effect line, e.g. "+10 minutes on the clock". */
  label: string;
  oncePerFight: boolean;
}

/** The table from the spec. */
export const BATTLE_EFFECTS: Record<BattleEffectId, BattleEffectRule> = {
  frost: { id: 'frost', label: '+10 minutes on the clock', oncePerFight: true },
  'time-stop': { id: 'time-stop', label: 'Pauses the clock for 15 minutes', oncePerFight: true },
  kindle: { id: 'kindle', label: 'Chores earn 1.5x the minutes', oncePerFight: true },
  gust: { id: 'gust', label: 'Refills the clock to full', oncePerFight: true },
  stun: { id: 'stun', label: 'The beast misses its next strike', oncePerFight: true },
  pin: { id: 'pin', label: 'The beast misses its next two strikes', oncePerFight: true },
  weaken: { id: 'weaken', label: "Halves the beast's attack", oncePerFight: true },
  vanish: { id: 'vanish', label: 'Run away with no parting strike', oncePerFight: true },
  charge: { id: 'charge', label: 'Chores give back double MP', oncePerFight: true },
  moonlight: { id: 'moonlight', label: 'Each chore heals 5% of max HP', oncePerFight: true },
  heal: { id: 'heal', label: 'Heals 25% of max HP', oncePerFight: true },
};

/** The engine calls an effect can make; a Pick so tests can hand in a plain mock. */
export type BattleEffectEngine = Pick<
  BattleService,
  | 'extendClock'
  | 'freezeClock'
  | 'skipNextStrike'
  | 'weakenEnemy'
  | 'scaleCooldown'
  | 'refillClock'
  | 'vanishNextRun'
  | 'hasPendingDamage'
  | 'getCurrentEnemy'
>;

export interface BattleEffectContext {
  userId: string;
  service: BattleEffectEngine;
  /** Effect ids already spent this fight (once-per-fight is per effect, whatever cast it); the page keeps one Set per fight. */
  usedThisFight: Set<BattleEffectId>;
}

export interface BattleEffectOutcome {
  /** The effect did its thing. */
  ok: boolean;
  /** One dialog line for the message box, or the refusal. */
  line: string;
  /** A play$fx key. */
  sound: string;
  /** A vanish: the getaway is armed, so the page runs Run Away next. */
  runsAway?: boolean;
}

export const ICE_WAND_MS = 10 * 60_000;
export const CHRONOS_FREEZE_MS = 15 * 60_000;
export const SOL_FLARE_FACTOR = 0.5;
export const FIRE_WAND_FACTOR = 1.5;
export const HEAL_SHARE = 0.25;

export const REASON_NO_MP = 'Not enough MP';
export const REASON_USED = 'Already used this fight';
export const REASON_HP_FULL = 'Your HP is full.';
/** A run waits while a strike is on its way, so a vanish waits too. */
export const REASON_STRIKE_WAITING = 'A strike is already on its way.';

export const SOUND_ITEM = 'select';
export const SOUND_HEAL = 'restoreHP';
export const SOUND_NO = 'no';

const CLOCK_STOPPED = 'The clock is not running.';

/** Whether a stored value (a Power's `battleEffect`, say) names one of the eleven effects. */
export const isBattleEffectId = (value: unknown): value is BattleEffectId =>
  typeof value === 'string' && (BATTLE_EFFECT_IDS as string[]).includes(value);

/** Retired ids a profile may still store, and the effect each one reads as now. */
const RETIRED_EFFECTS: Record<string, BattleEffectId> = { recall: 'gust' };

/** A stored effect as it reads today: one of the eleven ids, a retired one's stand-in (recall is gust), else null. */
export const normalizeBattleEffect = (value: unknown): BattleEffectId | null => {
  if (isBattleEffectId(value)) return value;
  const isRetired = typeof value === 'string' && Object.prototype.hasOwnProperty.call(RETIRED_EFFECTS, value);
  return isRetired ? RETIRED_EFFECTS[value as string] : null;
};

/** The hero's HP or MP as `{ now, max }`, whichever shape the profile stores it in. */
export const heroPoints = (userId: string, kind: 'hp' | 'mp'): { now: number; max: number } => {
  const stats = useUserStore().getUserById(userId)?.stats;
  const value = stats?.[kind];
  const isPointsObject = value && typeof value === 'object';
  if (isPointsObject) return { now: Number(value.now) || 0, max: Number(value.max) || 0 };
  const topMax = stats?.[kind === 'hp' ? 'maxHp' : 'maxMp'];
  const max = typeof topMax === 'number' ? topMax : 100;
  return { now: typeof value === 'number' ? value : max, max };
};

/** Why the effect cannot run right now (already used this fight, HP full, a strike on its way), else null. MP is not checked here. */
export const battleEffectBlocked = (effect: BattleEffectId, ctx: BattleEffectContext): string | null => {
  const isAlreadyUsed = BATTLE_EFFECTS[effect].oncePerFight && ctx.usedThisFight.has(effect);
  if (isAlreadyUsed) return REASON_USED;
  if (effect === 'heal') {
    const hp = heroPoints(ctx.userId, 'hp');
    if (hp.now >= hp.max) return REASON_HP_FULL;
  }
  const isRunRefused = effect === 'vanish' && ctx.service.hasPendingDamage();
  if (isRunRefused) return REASON_STRIKE_WAITING;
  return null;
};

/** A refusal: nothing happens, nothing is spent, the page plays the no sound and says why. Shared by the item, potion and Power rules. */
export const refuse = (line: string): BattleEffectOutcome => ({ ok: false, line, sound: SOUND_NO });

const done = (ctx: BattleEffectContext, effect: BattleEffectId, line: string, sound = SOUND_ITEM): BattleEffectOutcome => {
  if (BATTLE_EFFECTS[effect].oncePerFight) ctx.usedThisFight.add(effect);
  return { ok: true, line, sound };
};

const beastName = (ctx: BattleEffectContext): string => ctx.service.getCurrentEnemy()?.name ?? 'The beast';

/** The hero's nickname, else first name, else null. */
const heroName = (ctx: BattleEffectContext): string | null => {
  const name = useUserStore().getUserById(ctx.userId)?.name;
  return name?.nick || name?.first || null;
};

/**
 * Run the effect on the engine. Refuses (changing nothing) when `battleEffectBlocked` has a reason or the engine
 * says no. Never touches MP. On ok, marks the effect used for the fight. Charge and moonlight only mark the fight:
 * the chore gains read them from `usedThisFight`. A vanish answers `runsAway` so the page runs Run Away next.
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

    case 'kindle':
      ctx.service.scaleCooldown(FIRE_WAND_FACTOR);
      return done(ctx, effect, 'The fuse burns slow: every chore earns 1.5x the minutes!');

    case 'gust':
      if (!ctx.service.refillClock()) return refuse(CLOCK_STOPPED);
      return done(ctx, effect, 'A gust blows the beast back: the clock is full again!');

    case 'stun':
      ctx.service.skipNextStrike();
      return done(ctx, effect, `${beastName(ctx)} is stunned! It will miss its next strike.`);

    case 'pin':
      ctx.service.skipNextStrike();
      ctx.service.skipNextStrike();
      return done(ctx, effect, `${beastName(ctx)} is pinned! It will miss its next two strikes.`);

    case 'weaken':
      ctx.service.weakenEnemy(SOL_FLARE_FACTOR);
      return done(ctx, effect, `The sun blazes! ${beastName(ctx)}'s attack is halved.`);

    case 'vanish': {
      ctx.service.vanishNextRun();
      const name = heroName(ctx);
      const line = name ? `${name} vanishes into the shadows...` : 'You vanish into the shadows...';
      return { ...done(ctx, effect, line), runsAway: true };
    }

    case 'charge':
      return done(ctx, effect, 'Lightning crackles: every chore gives back double MP!');

    case 'moonlight':
      return done(ctx, effect, 'Moonlight settles on you: every chore heals you!');

    case 'heal': {
      const hp = heroPoints(ctx.userId, 'hp');
      const gain = Math.max(1, Math.min(Math.round(hp.max * HEAL_SHARE), hp.max - hp.now));
      useUserStore().updateUserHP({ userId: ctx.userId, amount: gain });
      return done(ctx, effect, `+${gain} HP`, SOUND_HEAL);
    }
  }
};
