/**
 * A server reward (`reward.granted`, MP18) paid once: its receipt is a quest log line, `party:<event id>`, so the rule
 * holds on every device that reads the event, and, under Family Sync, on every device the receipt reaches as a record.
 * A receipt not yet marked paid (the app closed between writing it and paying) is paid now; a paid one pays nothing.
 */
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { applyQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import type { RewardToPay } from "./eventInbox";

export const payServerReward = async (reward: RewardToPay): Promise<void> => {
  const questLogDb = getQuestLogDb();
  const questId = `party:${reward.id}`;
  const rewards = { xp: reward.xp, gp: 0, ap: reward.ap };
  const receipt = (await questLogDb.getEntries()).find((entry) => entry.questId === questId);
  if (!receipt) {
    const created = await questLogDb.logCompletion({ questId, questName: "Party bonus", userId: reward.heroId, status: "approved", source: "party", rewards });
    applyQuestRewards(reward.heroId, rewards, questId);
    await questLogDb.updateEntry(created.id, { rewardsApplied: true });
    return;
  }
  if (receipt.rewardsApplied) return;
  applyQuestRewards(reward.heroId, rewards, receipt.questId);
  await questLogDb.updateEntry(receipt.id, { rewardsApplied: true });
};
