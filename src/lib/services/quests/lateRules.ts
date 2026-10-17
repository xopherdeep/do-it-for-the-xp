import { format, isSameDay } from "date-fns";
import {
  effectiveDeadline,
  isSchedulePaused,
  type HeroQuestEffects,
  type QuestDeadlineFields,
} from "@/lib/engine/quests/QuestSchedule";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";

/**
 * What happens when a chore is late. Pure: no storage, no Vue.
 *
 * The family chooses (Settings > Chores > Late chores), all OFF by default so a family that never opens the card
 * plays exactly as before. A chore can bend the family's rule with its own `lateRule` (the chore form), the way
 * `requiresApproval` is a per-chore choice.
 *
 * - lock: a chore not done by its due time can no longer be claimed ("Too late: this one closed at 6:00pm").
 * - reduced pay: a chore finished after its due time pays a share (default 50%) of XP, GP and AP.
 * - penalty: when a chore passes its due time unclaimed, points are taken once (a share of its reward, or a flat amount).
 *
 * "Late" is always read from effectiveDeadline, so a hero's Extra Time is respected, a chore with no due time is never
 * late, and a held clock (an old saved pause) stops lateness.
 */

/** The chore form's choice: follow the family, or bend it for this one chore */
export type LateOverride = "family" | "allow" | "lock" | "noPenalty";

export const LATE_OVERRIDES: readonly LateOverride[] = ["family", "allow", "lock", "noPenalty"];

/** The chore form's select, in plain words */
export const LATE_OVERRIDE_LABELS: Record<LateOverride, string> = {
  family: "Use the family's rule",
  allow: "Allow late",
  lock: "Lock when late",
  noPenalty: "No penalty",
};

export const LATE_OVERRIDE_HINTS: Record<LateOverride, string> = {
  family: "Late works as set in the Chores settings.",
  allow: "This chore can always be finished late, even when the family locks late chores.",
  lock: "Once the due time passes, this chore closes and can't be claimed.",
  noPenalty: "Missing the due time costs nothing for this chore, whatever the family penalty.",
};

export type PenaltyMode = "percent" | "flat";

/** The family's late-chore switches (kept in the family settings) */
export interface LateChoreSettings {
  /** A chore not done by its due time cannot be claimed */
  lockLate: boolean;
  /** A chore that passes its due time unclaimed costs the hero points */
  penalty: boolean;
  /** A chore finished after its due time pays only `lateShare` percent */
  reducedPay: boolean;
  /** 0-100: the share of the reward a late finish pays when `reducedPay` is on */
  lateShare: number;
  /** "percent": penaltyAmount percent of the chore's XP and GP. "flat": penaltyAmount XP and penaltyAmount GP */
  penaltyMode: PenaltyMode;
  penaltyAmount: number;
}

export const DEFAULT_LATE_CHORES: LateChoreSettings = {
  lockLate: false,
  penalty: false,
  reducedPay: false,
  lateShare: 50,
  penaltyMode: "percent",
  penaltyAmount: 25,
};

/** The late shares the settings offer, percent of the reward */
export const LATE_SHARES: readonly number[] = [0, 10, 25, 50, 75, 90, 100];
/** The penalty amounts the settings offer: percent of the reward, or a flat number of XP and of GP */
export const PERCENT_PENALTIES: readonly number[] = [5, 10, 25, 50, 75, 100];
export const FLAT_PENALTIES: readonly number[] = [1, 2, 5, 10, 20, 50];

/** The most a flat penalty may be set to, per currency */
export const MAX_FLAT_PENALTY = 1000;

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

/** The stored settings with the gaps filled and every number held in range */
export const normalizeLateChores = (stored: Partial<LateChoreSettings> | null | undefined): LateChoreSettings => {
  const penaltyMode: PenaltyMode = stored?.penaltyMode === "flat" ? "flat" : "percent";
  const maxAmount = penaltyMode === "flat" ? MAX_FLAT_PENALTY : 100;
  return {
    lockLate: stored?.lockLate === true,
    penalty: stored?.penalty === true,
    reducedPay: stored?.reducedPay === true,
    lateShare: clampNumber(stored?.lateShare, 0, 100, DEFAULT_LATE_CHORES.lateShare),
    penaltyMode,
    penaltyAmount: clampNumber(stored?.penaltyAmount, 0, maxAmount, DEFAULT_LATE_CHORES.penaltyAmount),
  };
};

/** The chore's own choice; anything unknown (or a chore with none) follows the family */
export const lateOverrideOf = (quest: { lateRule?: unknown }): LateOverride => {
  const choice = quest.lateRule;
  const isKnown = typeof choice === "string" && (LATE_OVERRIDES as readonly string[]).includes(choice);
  return isKnown ? (choice as LateOverride) : "family";
};

/** The rule in force for one chore */
export interface LateRule {
  lockLate: boolean;
  penalty: boolean;
  /** 100 when late finishes pay in full; below 100 is the share a late finish pays */
  lateShare: number;
  penaltyMode: PenaltyMode;
  penaltyAmount: number;
}

/** The effective rule: the family's choice, bent by the chore's own */
export const lateRuleFor = (quest: { lateRule?: unknown }, settings: Partial<LateChoreSettings> | null | undefined): LateRule => {
  const family = normalizeLateChores(settings);
  const override = lateOverrideOf(quest);
  const lockByOverride: Partial<Record<LateOverride, boolean>> = { lock: true, allow: false };
  const hasNoPenalty = override === "noPenalty";
  return {
    lockLate: lockByOverride[override] ?? family.lockLate,
    penalty: family.penalty && !hasNoPenalty,
    lateShare: family.reducedPay ? family.lateShare : 100,
    penaltyMode: family.penaltyMode,
    penaltyAmount: family.penaltyAmount,
  };
};

export type LateState = "onTime" | "late" | "locked";

export interface LateStatus {
  state: LateState;
  /** When the chore was due (null for a chore with no due time) */
  deadline: Date | null;
}

/**
 * Whether the chore is on time, late (still claimable) or locked (late and the rule locks it) at `now`.
 * A held clock (an old saved pause) and a chore with no due time are always on time.
 */
export const lateStatus = (
  quest: QuestDeadlineFields,
  rule: LateRule,
  effects: HeroQuestEffects | undefined,
  now: Date
): LateStatus => {
  const deadline = effectiveDeadline(quest, effects, now);
  const isOnTime = !deadline || now <= deadline || isSchedulePaused(effects, now);
  if (isOnTime) return { state: "onTime", deadline };
  return { state: rule.lockLate ? "locked" : "late", deadline };
};

/** "Too late: this one closed at 6:00pm" (a chore that closed on another day names the day) */
export const lockedNotice = (deadline: Date | null, now: Date): string => {
  if (!deadline) return "Too late: this one has closed.";
  const clock = format(deadline, "h:mmaaa");
  const when = isSameDay(deadline, now) ? `at ${clock}` : `${format(deadline, "EEE d MMM")} at ${clock}`;
  return `Too late: this one closed ${when}`;
};

/** True when a late finish pays less than the full reward */
export const paysLessWhenLate = (rule: LateRule): boolean => rule.lateShare < 100;

/** A late finish's pay: the rule's share of each reward (whole numbers, rounded). On time, pass the rewards through. */
export const lateReward = (rewards: QuestRewards, rule: LateRule): QuestRewards => {
  const isFullPay = !paysLessWhenLate(rule);
  if (isFullPay) return { ...rewards };
  const share = (amount: number) => Math.round((Math.max(0, amount) * rule.lateShare) / 100);
  return { xp: share(rewards.xp), gp: share(rewards.gp), ap: share(rewards.ap) };
};

/** "Late: paid 50% of the loot" for the toast after a late finish */
export const lateRewardLine = (rule: LateRule): string => `Late: paid ${rule.lateShare}% of the loot`;

export interface Penalty {
  xp: number;
  gp: number;
}

export const NO_PENALTY: Penalty = { xp: 0, gp: 0 };

/**
 * What the chore costs when its due time passes unclaimed: a percent of the chore's XP and GP, or a flat amount of each.
 * AP is never taken. Nothing when the rule has no penalty.
 */
export const latePenalty = (rule: LateRule, rewards: QuestRewards): Penalty => {
  const hasNoPenalty = !rule.penalty;
  if (hasNoPenalty) return { ...NO_PENALTY };
  const isPercent = rule.penaltyMode === "percent";
  const take = (reward: number) => (isPercent ? Math.round((Math.max(0, reward) * rule.penaltyAmount) / 100) : rule.penaltyAmount);
  return { xp: take(rewards.xp), gp: take(rewards.gp) };
};

/** What the hero has that a penalty may touch */
export interface PenaltyPurse {
  /** Total XP the hero has */
  xp: number;
  /** XP the current level starts at: a penalty never goes below it, so it never levels the hero down */
  levelFloorXp: number;
  /** GP in the wallet (savings are safe) */
  gp: number;
}

/** The penalty held to what the hero has: never below 0 GP, never below the current level's XP */
export const cappedPenalty = (penalty: Penalty, purse: PenaltyPurse): Penalty => {
  const xpToSpare = Math.max(0, purse.xp - purse.levelFloorXp);
  return {
    xp: Math.max(0, Math.min(penalty.xp, xpToSpare)),
    gp: Math.max(0, Math.min(penalty.gp, Math.max(0, purse.gp))),
  };
};

export const isPenaltyEmpty = (penalty: Penalty): boolean => penalty.xp <= 0 && penalty.gp <= 0;

/** The record key that makes a penalty fall once per chore window: hero, chore and the day the window closed */
export const penaltyKeyOf = (heroId: string, questId: string, deadline: Date): string =>
  `${heroId}:${questId}:${format(deadline, "yyyy-MM-dd")}`;

/** "-12 XP, -5 GP" */
export const penaltyLine = (penalty: Penalty): string => {
  const parts: string[] = [];
  const hasXp = penalty.xp > 0;
  if (hasXp) parts.push(`-${penalty.xp} XP`);
  const hasGp = penalty.gp > 0;
  if (hasGp) parts.push(`-${penalty.gp} GP`);
  return parts.join(", ");
};
