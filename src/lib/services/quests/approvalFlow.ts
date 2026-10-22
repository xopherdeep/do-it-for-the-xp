import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { emitQuestClaimed, emitQuestReviewed } from "@/lib/services/multiplayer/gameSignals";
import { claimWaitingNotification, approvedNotification, rejectedNotification } from "@/lib/services/notifications/Notifications";
import { notify, settleWaiting } from "@/lib/services/notifications/notify";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";
import { rewardLineOf } from "@/lib/services/quests/verdictNotices";
import { approveCompletion, paidQuestRewards, rejectCompletion } from "@/lib/services/quests/QuestCompletionService";
import { approversFor, canReviewClaim } from "@/lib/services/quests/approvalRouting";
import { refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * The Game Master's approval loop, the glue: a held claim tells every Game Master who may settle it, and a verdict
 * (approve or reject) pays, tells the hero, clears the Game Masters' notices and tells multiplayer. The Approvals screen
 * and the "the village awaits your word" prompt both settle claims through here, so they behave the same. (This module and
 * QuestCompletionService import each other; both only call the other at run time, never while loading.)
 *
 * Under Family Sync a hero has one writer, the device holding the hero's turn (family sync spec, section 6): a verdict on
 * a hero this device does not hold is sent (`claim.settled`, through the sync store) instead of written, and the holder,
 * or this device on a turn borrowed while nobody holds it, applies it and pays.
 */

export { rewardLineOf };

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
    ...(entry.phoneClaimId ? { phoneClaimId: entry.phoneClaimId } : {}),
  });
  const isPaidAtOnce = !held;
  if (isPaidAtOnce) return;
  const heroName = nameOf(entry.userId);
  const users = useUserStore().users;
  for (const gmId of approversFor(entry.userId, users)) notify(claimWaitingNotification(gmId, entry, heroName));
  refreshWaitingClaims().catch((error) => debug.warn("[approvalFlow] could not count the waiting claims", error));
};

export type ReviewOutcome =
  | {
      ok: true;
      entry: QuestLogEntry;
      /** What the hero was paid, as a line; empty for a rejection and for a verdict sent to another device */
      line: string;
      /** The verdict was sent to the device holding the hero's turn, which pays; the entry here is still pending */
      remote?: boolean;
    }
  | { ok: false; reason: "gone" | "own-claim" };

/** The held claim, or why it cannot be settled by this reviewer */
const heldClaim = async (entryId: string, reviewerId: string | undefined): Promise<QuestLogEntry | "gone" | "own-claim"> => {
  const entry = (await getQuestLogDb().get(entryId)) as QuestLogEntry | null;
  const isGone = !entry || entry.status !== "pending";
  if (isGone) return "gone";
  const mayReview = canReviewClaim(reviewerId, entry.userId, useUserStore().users);
  return mayReview ? entry : "own-claim";
};

/** The phone claim id of an entry made from the hero's phone, for the verdict multiplayer sends back to it */
const phoneOf = (entry: QuestLogEntry): { phoneClaimId?: string } => (entry.phoneClaimId ? { phoneClaimId: entry.phoneClaimId } : {});

const settled = (entry: QuestLogEntry): void => {
  settleWaiting(entry.id);
  refreshWaitingClaims().catch((error) => debug.warn("[approvalFlow] could not count the waiting claims", error));
};

/** Whether another device writes this hero: Family Sync is on and this device does not hold the hero's turn */
const isWrittenElsewhere = (heroId: string): boolean => {
  const sync = useSyncStore();
  return sync.isOn && !sync.holds(heroId);
};

/**
 * A verdict for the device holding the hero's turn: sent with no pay (the holder computes it), multiplayer told as today,
 * and the Game Masters' notices settled (their word is given; the entry here stays pending until the holder's copy lands).
 * A claim taken from a phone hears the verdict from the device that applies it, with the pay (sync/verdicts.ts), so no
 * phone claim id goes with the signal here.
 */
const sendVerdict = async (entry: QuestLogEntry, approved: boolean, note: string): Promise<ReviewOutcome> => {
  const questId = String(entry.questId);
  const status = approved ? "approved" : "rejected";
  await useSyncStore().sendVerdict({ claimId: entry.id, questId, status, note, xp: 0, gp: 0, ap: 0 }, entry.userId);
  emitQuestReviewed({ heroId: entry.userId, questId, approved, note });
  settleWaiting(entry.id);
  return { ok: true, entry, line: "", remote: true };
};

/** Approve a held claim: pays the hero, tells them, tells multiplayer. */
export const approveClaim = async (entryId: string, reviewerId?: string): Promise<ReviewOutcome> => {
  const held = await heldClaim(entryId, reviewerId);
  const isRefused = typeof held === "string";
  if (isRefused) return { ok: false, reason: held };
  if (isWrittenElsewhere(held.userId)) return sendVerdict(held, true, "");
  const result = await approveCompletion(entryId, reviewerId);
  const approved = result?.status === "approved" ? result : null;
  if (!approved) return { ok: false, reason: "gone" };
  const paid = paidQuestRewards(approved.userId, withHuntBonus(approved));
  const line = rewardLineOf(paid);
  notify(approvedNotification(approved.userId, approved, line));
  emitQuestReviewed({ heroId: approved.userId, questId: String(approved.questId), approved: true, note: "", ...phoneOf(approved), paid });
  settled(approved);
  return { ok: true, entry: approved, line };
};

/** Reject a held claim with an optional short note the hero reads; the quest opens again. */
export const rejectClaim = async (entryId: string, reviewerId?: string, note?: string): Promise<ReviewOutcome> => {
  const held = await heldClaim(entryId, reviewerId);
  const isRefused = typeof held === "string";
  if (isRefused) return { ok: false, reason: held };
  const cleanNote = String(note ?? "").trim().slice(0, 140);
  if (isWrittenElsewhere(held.userId)) return sendVerdict(held, false, cleanNote);
  const result = await rejectCompletion(entryId, reviewerId, cleanNote || undefined);
  const rejected = result?.status === "rejected" ? result : null;
  if (!rejected) return { ok: false, reason: "gone" };
  notify(rejectedNotification(rejected.userId, rejected, cleanNote || undefined));
  emitQuestReviewed({ heroId: rejected.userId, questId: String(rejected.questId), approved: false, note: cleanNote, ...phoneOf(rejected) });
  settled(rejected);
  return { ok: true, entry: rejected, line: "" };
};
