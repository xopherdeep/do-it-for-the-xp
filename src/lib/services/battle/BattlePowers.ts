/**
 * Powers in a fight: the hero's unlocked in-game Powers that have a fight effect, and what casting one does
 * (docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 5).
 *
 * A Power points at one entry of the shared effect table (BattleEffects), so a spell and its matching item behave
 * the same. A fight cast is not a real-world cast: it never goes through AbilityService.useAbility, so there is no
 * cast log, Town Crier line or adult notification, `lastUsed` is not stamped, and the Power's frequency cooldown
 * does not apply. Once-per-fight (per effect, in the page's `usedThisFight` set) is the only limit.
 *
 * Like BattleItems this module never touches the screen: it spends MP in the Pinia user store, runs the effect and
 * answers with a line, a sound and whether it worked. The page shows the sheet, plays the sound and types the line.
 */
import { AbilityStatus, AbilityType } from '@/hooks/abilities/abilityConstants';
import type { Ability } from '@/hooks/abilities/abilityConstants';
import { useUserStore } from '@/lib/store/stores/user';
import { heroMpBill } from '@/lib/services/stats/StatEffects';
import { computeHeroAbilityStatuses } from '@/lib/services/abilities/heroAbilityStatus';
import {
  BATTLE_EFFECTS,
  BATTLE_EFFECT_IDS,
  REASON_NO_MP,
  applyBattleEffect,
  battleEffectBlocked,
  heroPoints,
  isBattleEffectId,
  refuse,
  type BattleEffectContext,
  type BattleEffectId,
  type BattleEffectOutcome,
} from './BattleEffects';

/** The fight effect each in-game preset Power starts with (Quick Save and Quantum Computing have none). */
export const PRESET_BATTLE_EFFECTS: Record<string, BattleEffectId> = {
  Haste: 'kindle',
  Slow: 'frost',
  Stop: 'time-stop',
  Rewind: 'recall',
  Debug: 'weaken',
  Overclock: 'stun',
  'System Restore': 'heal',
};

/** The Game Master's "In battle" dropdown: None, then the seven effects in table order. */
export const BATTLE_EFFECT_OPTIONS: { value: BattleEffectId | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  ...BATTLE_EFFECT_IDS.map((id) => ({ value: id, label: BATTLE_EFFECTS[id].label })),
];

/** What a battle Power card shows: the class-discounted MP, the effect line and, when it cannot be cast right now, why. */
export interface BattlePowerCard {
  mp: number;
  effect: string;
  reason: string | null;
}

export interface BattlePowerEntry {
  ability: Ability;
  card: BattlePowerCard;
}

/**
 * The Power's fight effect: its own `battleEffect` field, else the preset pick by exact name, else null. 'none' and
 * unknown values (bad data) are null, so a null is "not a battle Power" and never reaches `applyBattleEffect`.
 */
export const battleEffectOf = (ability: Pick<Ability, 'name' | 'battleEffect'>): BattleEffectId | null => {
  const picked = ability.battleEffect ?? PRESET_BATTLE_EFFECTS[ability.name];
  return isBattleEffectId(picked) ? picked : null;
};

/** Why the effect cannot be cast right now (used this fight, HP full, not enough MP), else null. */
const reasonOf = (effect: BattleEffectId, mp: number, ctx: BattleEffectContext): string | null => {
  const blocked = battleEffectBlocked(effect, ctx);
  if (blocked) return blocked;
  return mp > 0 && heroPoints(ctx.userId, 'mp').now < mp ? REASON_NO_MP : null;
};

/**
 * The hero's (`ctx.userId`) Powers for the fight sheet: in-game, unlocked the same way My Powers says (status is not
 * locked) and with a fight effect, in the order given, each with its battle card. Real-life Powers never appear.
 */
export const battlePowers = (abilities: Ability[], ctx: BattleEffectContext, now: Date = new Date()): BattlePowerEntry[] => {
  const hero = useUserStore().getUserById(ctx.userId);
  const { statuses } = computeHeroAbilityStatuses(abilities, hero, [], now);

  const entries: BattlePowerEntry[] = [];
  for (const ability of abilities) {
    const effect = battleEffectOf(ability);
    if (ability.type !== AbilityType.InGame || !effect || statuses[ability.id] === AbilityStatus.Locked) continue;
    const mp = heroMpBill(ability.mpCost, hero);
    entries.push({ ability, card: { mp, effect: BATTLE_EFFECTS[effect].label, reason: reasonOf(effect, mp, ctx) } });
  }
  return entries;
};

/**
 * Cast a Power in a fight. Checks the once-per-fight rule and the MP first (no MP is spent on a refusal), runs the
 * effect, and charges the class-discounted MP only when it worked and needs no chore pick. A success line puts the
 * caster first ("Max casts Stop! ...", or "You cast Stop! ..." for a nameless hero). Recall answers `needsTaskPick` until it is called again with `ctx.taskId`.
 */
export const castBattlePower = (ability: Ability, ctx: BattleEffectContext): BattleEffectOutcome => {
  const effect = battleEffectOf(ability);
  if (!effect) return refuse(`${ability.name} has no use in a fight.`);

  const hero = useUserStore().getUserById(ctx.userId);
  const mp = heroMpBill(ability.mpCost, hero);
  const reason = reasonOf(effect, mp, ctx);
  if (reason) return refuse(reason);

  const outcome = applyBattleEffect(effect, ctx);
  if (!outcome.ok || outcome.needsTaskPick) return outcome;

  if (mp > 0) useUserStore().updateUserMP({ userId: ctx.userId, amount: -mp });
  const name = hero?.name?.nick || hero?.name?.first;
  const caster = name ? `${name} casts` : 'You cast';
  return { ...outcome, line: `${caster} ${ability.name}! ${outcome.line}` };
};
