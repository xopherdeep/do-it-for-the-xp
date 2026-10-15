import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  getQuestProgressFor,
  hasPendingClaimFor,
  type HeroQuestEffects,
  type QuestPartyFields,
  type QuestScheduleFields,
} from "@/lib/engine/quests/QuestSchedule";

/**
 * Whether a claim may go through right now, read from the quest log. Pure: no storage, no Vue.
 *
 * A claim screen can be stale (a card left open, a list row nobody refreshed), so the claim reads the log of
 * EVERY hero before it pays: a window the hero already used up (a pending claim counts) or a shared quest
 * (Team Effort, Rat Race) another assignee cleared is closed, and paying it again would pay twice.
 * The quest card (MyTask) and the list row (MyQuests) both claim through this one rule.
 */
export interface ClaimCheck {
  /** The quest is due and its window still has room: the claim may be recorded */
  canClaim: boolean;
  /** The quest is due but its window is used up: the screen should show it done */
  isUsedUp: boolean;
  /** Used up, and a claim in the window still waits for the Game Master */
  awaitingApproval: boolean;
  /** What to tell the hero when the claim cannot go through; empty when it can */
  notice: string;
}

/** The line for a claim the log refuses: used up, still waiting for approval, or not due at all. */
const noticeFor = (isUsedUp: boolean, awaitingApproval: boolean): string => {
  if (!isUsedUp) return "This quest is not due right now.";
  if (awaitingApproval) return "Your claim is waiting for the Game Master.";
  return "You already tamed this quest.";
};

/**
 * @param entries The quest log of every hero (QuestLogDb.getEntries)
 * @param effects The hero's item effects (a snooze, a pull-in), counted the way the board counted them
 */
export const checkClaimWindow = (
  quest: QuestScheduleFields & QuestPartyFields,
  entries: QuestLogEntry[],
  heroId: string,
  now: Date,
  effects?: HeroQuestEffects
): ClaimCheck => {
  const progress = getQuestProgressFor(quest, entries, heroId, now, effects);
  if (progress?.isOpen) return { canClaim: true, isUsedUp: false, awaitingApproval: false, notice: "" };
  const isUsedUp = Boolean(progress);
  const awaitingApproval = isUsedUp && hasPendingClaimFor(quest, entries, heroId, now, effects);
  return { canClaim: false, isUsedUp, awaitingApproval, notice: noticeFor(isUsedUp, awaitingApproval) };
};
