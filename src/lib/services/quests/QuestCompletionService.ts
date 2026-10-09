import type { Achievement } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, QuestLogEntry, QuestLogSource, QuestRewards } from "@/lib/databases/QuestLogDb";
import { useUserStore, LevelUpInfo } from "@/lib/store/stores/user";

/**
 * The one place a quest becomes "done".
 *
 * Claim flow:   completeQuest()  -> QuestLog entry; rewards paid now, or held as `pending`
 *                                   when the Game Master asked for approval.
 * GM review:    approveCompletion() pays the held rewards; rejectCompletion() voids the entry
 *               so the quest re-opens for the hero.
 * Battle flow:  recordBattleCompletion() only writes the log entry, because BattleField
 *               already credits XP/GP/AP during its victory sequence.
 */
export interface CompletionResult {
  entry: QuestLogEntry;
  levelUp: LevelUpInfo | null;
  awaitingApproval: boolean;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const questRewards = (quest: Pick<Achievement, "xp" | "gp" | "ap">): QuestRewards => ({
  xp: toNumber(quest.xp),
  gp: toNumber(quest.gp),
  ap: toNumber(quest.ap),
});

/** Credit rewards to the hero's profile (persisted by the user store). */
export const applyQuestRewards = (userId: string, rewards: QuestRewards, source: string): LevelUpInfo | null => {
  const userStore = useUserStore();
  if (!userStore.users[userId]) return null;

  const levelUp = rewards.xp > 0 ? userStore.updateUserXP({ userId, amount: rewards.xp, commit: true }) : null;
  if (rewards.gp > 0) void userStore.updateUserGP({ userId, wallet: rewards.gp });
  if (rewards.ap > 0) userStore.recordAPGain({ userId, amount: rewards.ap, source });
  return levelUp;
};

export const completeQuest = async (
  quest: Achievement,
  userId: string,
  source: QuestLogSource = "claim"
): Promise<CompletionResult> => {
  const rewards = questRewards(quest);
  const awaitingApproval = Boolean(quest.requiresApproval);
  const questLogDb = getQuestLogDb();

  const entry = await questLogDb.logCompletion({
    questId: quest.id,
    questName: quest.achievementName,
    userId,
    status: awaitingApproval ? "pending" : "approved",
    source,
    rewards,
  });

  if (awaitingApproval) return { entry, levelUp: null, awaitingApproval };

  const levelUp = applyQuestRewards(userId, rewards, `quest:${quest.id}`);
  const paid = await questLogDb.updateEntry(entry.id, { rewardsApplied: true });
  return { entry: paid || entry, levelUp, awaitingApproval };
};

/** Battle victories already paid out; just record that the quest was finished. */
export const recordBattleCompletion = (quest: Achievement, userId: string, rewards: QuestRewards) =>
  getQuestLogDb().logCompletion({
    questId: quest.id,
    questName: quest.achievementName,
    userId,
    status: "approved",
    source: "battle",
    rewards,
    rewardsApplied: true,
  });

// Entries currently being reviewed; a second approve/reject for the same entry while the
// first is still reading-then-writing would otherwise pay the hero twice.
const reviewsInFlight = new Set<string>();

const reviewEntry = async (
  entryId: string,
  review: (entry: QuestLogEntry) => Promise<QuestLogEntry | null>
): Promise<QuestLogEntry | null> => {
  if (reviewsInFlight.has(entryId)) return null;
  reviewsInFlight.add(entryId);
  try {
    const entry = (await getQuestLogDb().get(entryId)) as QuestLogEntry | null;
    if (!entry || entry.status !== "pending") return entry;
    return await review(entry);
  } finally {
    reviewsInFlight.delete(entryId);
  }
};

export const approveCompletion = (entryId: string, reviewerId?: string): Promise<QuestLogEntry | null> =>
  reviewEntry(entryId, (entry) => {
    if (!entry.rewardsApplied) applyQuestRewards(entry.userId, entry.rewards, `quest:${entry.questId}`);
    return getQuestLogDb().updateEntry(entryId, {
      status: "approved",
      rewardsApplied: true,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    });
  });

export const rejectCompletion = (entryId: string, reviewerId?: string, note?: string): Promise<QuestLogEntry | null> =>
  reviewEntry(entryId, () =>
    getQuestLogDb().updateEntry(entryId, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      note,
    })
  );
