import type { QuestLogEntry, QuestRewards } from "@/lib/databases/QuestLogDb";
import { approvedNotification, claimWaitingNotification, rejectedNotification } from "@/lib/services/notifications/Notifications";
import { notify } from "@/lib/services/notifications/notify";

/**
 * What the approval loop says in the feeds (family sync spec, section 6): the device that applies a verdict tells the hero
 * (it holds the hero's turn, so the hero's feed is its to write), and a Game Master device tells the Game Master playing on
 * it of a held claim that another device logged. Kept apart from approvalFlow so the sync store can say them without
 * importing the flow (which imports the store).
 */

/** "+120 XP · +30 GP · +2 AP" */
export const rewardLineOf = (rewards: QuestRewards): string => `+${rewards.xp} XP · +${rewards.gp} GP · +${rewards.ap} AP`;

/** "Quest approved!" with the pay, or "Quest sent back" with the Game Master's note, in the hero's feed */
export const tellHeroOfVerdict = (entry: QuestLogEntry, paid: QuestRewards): void => {
  const isApproved = entry.status === "approved";
  if (isApproved) notify(approvedNotification(entry.userId, entry, rewardLineOf(paid)));
  else notify(rejectedNotification(entry.userId, entry, entry.note || undefined));
};

/** "The village awaits your word" in the feed of each of these Game Masters */
export const announceClaimTo = (gmIds: string[], entry: QuestLogEntry, heroName: string): void => {
  for (const gmId of gmIds) notify(claimWaitingNotification(gmId, entry, heroName));
};
