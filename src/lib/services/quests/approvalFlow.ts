import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import type { QuestLogEntry, QuestRewards } from "@/lib/databases/QuestLogDb";
import { emitQuestClaimed, emitQuestReviewed } from "@/lib/services/multiplayer/gameSignals";
import { claimWaitingNotification, approvedNotification, rejectedNotification } from "@/lib/services/notifications/Notifications";
import { notify, settleWaiting } from "@/lib/services/notifications/notify";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";
import { approveCompletion, paidQuestRewards, rejectCompletion } from "@/lib/services/quests/QuestCompletionService";
import { approversFor, canReviewClaim } from "@/lib/services/quests/approvalRouting";
import { refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * The Game Master's approval loop, the glue: a held claim tells every Game Master who may settle it, and a verdict
 * (approve or reject) pays, tells the hero, clears the Game Masters' notices and tells multiplayer. The Approvals screen
 * and the "the village awaits your word" prompt both settle claims through here, so they behave the same. (This module and
 * QuestCompletionService import each other; both only call the other at run time, never while loading.)
 */

/** "+120 XP · +30 GP · +2 AP" */
export const rewardLineOf = (rewards: QuestRewards): string =>
  `+${rewards.xp} XP · +${rewards.gp} GP · +${rewards.ap} AP`;

const nameOf = (heroId: string): string => {
  const hero = useUserStore().users[heroId];
  return hero?.name?.nick || hero?.name?.first || "A hero";
};

/**
 * A claim was logged. Multiplayer hears of it; a held one also lands in the feed of each Game Master who may settle it
 * (never the hero's own, when the hero is a Game Master) and in the waiting count.
 */
export const announceClaim = (entry: QuestLogEntry, difficulty: number | undefined, held: boolean): void => {
  emitQuestClaimed({
    heroId: entry.userId,
    questId: String(entry.questId),
    difficulty: Number(difficulty) > 0 ? Number(difficulty) : 1,
    requiresApproval: held,
  });
  const isPaidAtOnce = !held;
  if (isPaidAtOnce) return;
  const heroName = nameOf(entry.userId);
  const users = useUserStore().users;
  for (const gmId of approversFor(entry.userId, users)) notify(claimWaitingNotification(gmId, entry, heroName));
  refreshWaitingClaims().catch((error) => debug.warn("[approvalFlow] could not count the waiting claims", error));
};

export type ReviewOutcome =
  | { ok: true; entry: QuestLogEntry; /** What the hero was paid, as a line; empty for a rejection */ line: string }
  | { ok: false; reason: "gone" | "own-claim" };

/** The held claim, or why it cannot be settled by this reviewer */
const heldClaim = async (entryId: string, reviewerId: string | undefined): Promise<QuestLogEntry | "gone" | "own-claim"> => {
  const entry = (await getQuestLogDb().get(entryId)) as QuestLogEntry | null;
  const isGone = !entry || entry.status !== "pending";
  if (isGone) return "gone";
  const mayReview = canReviewClaim(reviewerId, entry.userId, useUserStore().users);
  return mayReview ? entry : "own-claim";
};

const settled = (entry: QuestLogEntry): void => {
  settleWaiting(entry.id);
  refreshWaitingClaims().catch((error) => debug.warn("[approvalFlow] could not count the waiting claims", error));
};

/** Approve a held claim: pays the hero, tells them, tells multiplayer. */
export const approveClaim = async (entryId: string, reviewerId?: string): Promise<ReviewOutcome> => {
  const held = await heldClaim(entryId, reviewerId);
  const isRefused = typeof held === "string";
  if (isRefused) return { ok: false, reason: held };
  const result = await approveCompletion(entryId, reviewerId);
  const approved = result?.status === "approved" ? result : null;
  if (!approved) return { ok: false, reason: "gone" };
  const line = rewardLineOf(paidQuestRewards(approved.userId, withHuntBonus(approved)));
  notify(approvedNotification(approved.userId, approved, line));
  emitQuestReviewed({ heroId: approved.userId, questId: String(approved.questId), approved: true, note: "" });
  settled(approved);
  return { ok: true, entry: approved, line };
};

/** Reject a held claim with an optional short note the hero reads; the quest opens again. */
export const rejectClaim = async (entryId: string, reviewerId?: string, note?: string): Promise<ReviewOutcome> => {
  const held = await heldClaim(entryId, reviewerId);
  const isRefused = typeof held === "string";
  if (isRefused) return { ok: false, reason: held };
  const cleanNote = String(note ?? "").trim().slice(0, 140);
  const result = await rejectCompletion(entryId, reviewerId, cleanNote || undefined);
  const rejected = result?.status === "rejected" ? result : null;
  if (!rejected) return { ok: false, reason: "gone" };
  notify(rejectedNotification(rejected.userId, rejected, cleanNote || undefined));
  emitQuestReviewed({ heroId: rejected.userId, questId: String(rejected.questId), approved: false, note: cleanNote });
  settled(rejected);
  return { ok: true, entry: rejected, line: "" };
};
