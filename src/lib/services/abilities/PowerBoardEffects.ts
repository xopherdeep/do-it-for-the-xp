/**
 * Real-life Powers on the quest board: what casting Snooze, Extra Time, Quiet Day or Trusted Hour does to the
 * hero's own schedule (docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 4). These are the real-life
 * bends the items used to make; items now work only in temples and fights.
 *
 * Rule zero: no Power completes a chore or changes its rewards. The Game Master's quests are never written: each
 * effect lands on the hero's profile as `questEffects` (HeroQuestEffects in QuestSchedule.ts), exactly the fields
 * the old items wrote, so the board reads them back unchanged.
 *
 * The page orders it: `powerBoardEffectBlocked` (after the quest pick for snooze and extra time), then the normal
 * cast (AbilityService.useAbility: frequency, MP, cast log), then `applyPowerBoardEffect`. This module never
 * touches MP and never casts; it is pure apart from the user store, the quest engine and the family settings,
 * and answers with a line and a play$fx sound for the screen to show.
 */
import { addHours, format, max } from "date-fns";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import type { PowerBoardEffectId } from "@/types/abilities";
import { getQuestEngine, type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dayKeyOf, dueTimeOn, effectiveDeadline, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { loadFamilySettings } from "@/lib/services/family/familySettings";
import { useUserStore } from "@/lib/store/stores/user";

export type { PowerBoardEffectId } from "@/types/abilities";

const HOUR = 3_600_000;

/** Extra Time pushes one quest's deadline back this far. */
export const EXTRA_TIME_MS = 24 * HOUR;
/** Quiet Day keeps the ambushes away this long. */
export const QUIET_DAY_MS = 24 * HOUR;
/** Trusted Hour lets claims skip the approval queue this long. */
export const TRUSTED_HOUR_MS = HOUR;

/** Each effect's line for the Game Master's editor, and whether the hero picks a quest before the cast. */
export const POWER_BOARD_EFFECTS: Record<PowerBoardEffectId, { label: string; picksQuest: boolean }> = {
  snooze: { label: "Move one quest to tomorrow", picksQuest: true },
  "extra-time": { label: "24 more hours on one quest's deadline", picksQuest: true },
  "quiet-day": { label: "No ambushes for 24 hours", picksQuest: false },
  "trusted-hour": { label: "For one hour, claims skip approval", picksQuest: false },
};

const POWER_BOARD_EFFECT_IDS = Object.keys(POWER_BOARD_EFFECTS) as PowerBoardEffectId[];

/** The Game Master's "On the quest board" dropdown: None, then the four effects in table order. */
export const POWER_BOARD_EFFECT_OPTIONS: { value: PowerBoardEffectId | "none"; label: string }[] = [
  { value: "none", label: "None" },
  ...POWER_BOARD_EFFECT_IDS.map((id) => ({ value: id, label: POWER_BOARD_EFFECTS[id].label })),
];

/** The board effect each real-life preset Power starts with. */
export const PRESET_BOARD_EFFECTS: Record<string, PowerBoardEffectId> = {
  Snooze: "snooze",
  "Extra Time": "extra-time",
  "Quiet Day": "quiet-day",
  "Trusted Hour": "trusted-hour",
};

/**
 * The Power's board effect: its own `boardEffect` field, else the preset pick by exact name, else null. Real-life
 * Powers only; 'none' and unknown values (bad data) are null, so a null is "not a board Power".
 */
export const boardEffectOfPower = (ability: Pick<Ability, "name" | "type" | "boardEffect">): PowerBoardEffectId | null => {
  const isRealLife = ability.type === AbilityType.RealLife;
  if (!isRealLife) return null;
  const picked = ability.boardEffect ?? PRESET_BOARD_EFFECTS[ability.name];
  return POWER_BOARD_EFFECT_IDS.includes(picked as PowerBoardEffectId) ? (picked as PowerBoardEffectId) : null;
};

export interface PowerBoardContext {
  userId: string;
  /** The quest picked for snooze and extra time; ignored by the others */
  questId?: string;
  now?: Date;
}

export interface PowerBoardOutcome {
  ok: boolean;
  line: string;
  /** A play$fx key */
  sound: string;
}

const plainEffects = (user: { questEffects?: HeroQuestEffects } | undefined): HeroQuestEffects =>
  JSON.parse(JSON.stringify(user?.questEffects ?? {}));

const whenLabel = (date: Date, now: Date): string =>
  dayKeyOf(date) === dayKeyOf(now) ? format(date, "h:mma") : format(date, "EEE h:mma");

const titleOf = (target: QuestBoardItem): string => target.quest.achievementName || "the quest";

const refuse = (line: string): PowerBoardOutcome => ({ ok: false, line, sound: "no" });

/** True while the quest's earlier extension lies ahead: Extra Time never stacks on it. */
const hasRunningExtension = (effects: HeroQuestEffects, questId: string, now: Date): boolean => {
  const until = new Date(effects.extendedUntil?.[questId] ?? NaN).getTime();
  return Number.isFinite(until) && until > now.getTime();
};

/** Everything the check found: the hero's effects as stored, and the picked quest for snooze and extra time. */
interface BoardCheck {
  effects: HeroQuestEffects;
  target?: QuestBoardItem;
  refusal: string | null;
}

const checkBoard = async (effect: PowerBoardEffectId, ctx: PowerBoardContext, now: Date): Promise<BoardCheck> => {
  const user = useUserStore().getUserById(ctx.userId);
  const effects = plainEffects(user);
  if (!user) return { effects, refusal: "Nobody is casting that." };

  const isTrustedHour = effect === "trusted-hour";
  if (isTrustedHour) {
    const allowed = (await loadFamilySettings()).trustedHour;
    return { effects, refusal: allowed ? null : "The Game Master has not allowed a trusted hour." };
  }
  const { picksQuest } = POWER_BOARD_EFFECTS[effect];
  if (!picksQuest) return { effects, refusal: null };

  const picked = ctx.questId;
  if (!picked) return { effects, refusal: "Pick a quest first." };
  const board = await getQuestEngine().getQuestBoardForUser(ctx.userId, now, undefined, effects);
  const target = board.find((entry) => String(entry.quest.id) === String(picked));
  if (!target) return { effects, refusal: "That quest is not on your board." };
  const title = titleOf(target);
  const questId = String(target.quest.id);
  // Asked before the status: a quest snoozed today is off today's board, so it would read "not open"
  const isSnoozedToday = effect === "snooze" && effects.snoozedOn?.[questId] === dayKeyOf(now);
  if (isSnoozedToday) return { effects, target, refusal: `${title} is already snoozed.` };
  // A quest with no due time is never late, so it has nothing to extend (the board ignores an extension on it)
  const hasNoDueTime = effect === "extra-time" && !dueTimeOn(target.quest.dueByTime, now);
  if (hasNoDueTime) return { effects, target, refusal: `${title} has no deadline to push back.` };
  const isExtended = effect === "extra-time" && hasRunningExtension(effects, questId, now);
  if (isExtended) return { effects, target, refusal: `${title} already has extra time.` };
  const isOpenToday = target.status === "open";
  if (!isOpenToday) return { effects, target, refusal: `${title} is not open today.` };
  return { effects, target, refusal: null };
};

/** Why the effect cannot land right now, else null. Nothing is written. */
export const powerBoardEffectBlocked = async (effect: PowerBoardEffectId, ctx: PowerBoardContext): Promise<string | null> =>
  (await checkBoard(effect, ctx, ctx.now ?? new Date())).refusal;

/**
 * Land the effect on the hero's board. It checks again first and changes nothing on a refusal; it never touches MP
 * (the cast before it pays).
 */
export const applyPowerBoardEffect = async (effect: PowerBoardEffectId, ctx: PowerBoardContext): Promise<PowerBoardOutcome> => {
  const now = ctx.now ?? new Date();
  const { effects: stored, target, refusal } = await checkBoard(effect, ctx, now);
  if (refusal) return refuse(refusal);
  // A fresh copy: the board was read with the stored effects
  const effects: HeroQuestEffects = { ...stored };

  let line: string;
  if (effect === "quiet-day") {
    const until = new Date(now.getTime() + QUIET_DAY_MS);
    effects.noEncountersUntil = until.toISOString();
    line = `Unseen by beasts until ${whenLabel(until, now)}.`;
  } else if (effect === "trusted-hour") {
    effects.trustedUntil = new Date(now.getTime() + TRUSTED_HOUR_MS).toISOString();
    line = "For 1 hour your claims need no approval.";
  } else if (!target) {
    return refuse("Pick a quest first.");
  } else if (effect === "snooze") {
    effects.snoozedOn = { ...(effects.snoozedOn ?? {}), [String(target.quest.id)]: dayKeyOf(now) };
    line = `${titleOf(target)}: snoozed to tomorrow.`;
  } else {
    // Extra Time: 24 hours past the deadline, or past now when that has gone by (it never lands in the past)
    const base = max([effectiveDeadline(target.quest, effects, now) ?? now, now]);
    const until = addHours(base, EXTRA_TIME_MS / HOUR);
    effects.extendedUntil = { ...(effects.extendedUntil ?? {}), [String(target.quest.id)]: until.toISOString() };
    line = `${titleOf(target)}: now due ${whenLabel(until, now)}.`;
  }

  useUserStore().setQuestEffects(ctx.userId, effects);
  return { ok: true, line, sound: "useMP" };
};
