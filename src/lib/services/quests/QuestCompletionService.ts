import type { Achievement } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, QuestLogEntry, QuestLogSource, QuestRewards } from "@/lib/databases/QuestLogDb";
import { isTrustedHour } from "@/lib/engine/quests/QuestSchedule";
import { bonusGp } from "@/lib/services/stats/ClassPassives";
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
 *
 * The log keeps the quest's own rate; what the hero is paid is paidQuestRewards(): the same
 * XP and AP, and the GP with the class loot bonus on top (a Thief's or Ninja's +25%, see
 * docs/Items-And-Classes-Contract.md, C). Screens print the paid line, not the board's.
 * AP is stamped at the entry's completedAt, so a next-morning approval lands on the day the chore was done.
 */
export interface CompletionResult {
  entry: QuestLogEntry;
  levelUp: LevelUpInfo | null;
  awaitingApproval: boolean;
  /** What landed in the hero's pocket; the quest's rate when the claim is held or the hero is unknown. */
  paid: QuestRewards;
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

/** The quest's rewards as this hero is paid them: XP and AP as posted, GP with the class loot bonus. */
export const paidQuestRewards = (userId: string, rewards: QuestRewards): QuestRewards => {
  const hero = useUserStore().users[userId];
  if (!hero) return rewards;
  return { ...rewards, gp: bonusGp(rewards.gp, hero.jobClass) };
};

/**
 * Credit rewards to the hero's profile (persisted by the user store); the GP paid carries the class bonus.
 * `at` is when the chore was finished (ISO); it stamps the AP record, and defaults to now.
 */
export const applyQuestRewards = (
  userId: string,
  rewards: QuestRewards,
  source: string,
  at?: string
): LevelUpInfo | null => {
  const userStore = useUserStore();
  if (!userStore.users[userId]) return null;

  const paid = paidQuestRewards(userId, rewards);
  const levelUp = paid.xp > 0 ? userStore.updateUserXP({ userId, amount: paid.xp, commit: true }) : null;
  if (paid.gp > 0) void userStore.updateUserGP({ userId, wallet: paid.gp });
  if (paid.ap > 0) userStore.recordAPGain({ userId, amount: paid.ap, source, at });
  return levelUp;
};

export const completeQuest = async (
  quest: Achievement,
  userId: string,
  source: QuestLogSource = "claim"
): Promise<CompletionResult> => {
  const rewards = questRewards(quest);
  const awaitingApproval =
    Boolean(quest.requiresApproval) && !isTrustedHour(useUserStore().users[userId]?.questEffects, new Date());
  const questLogDb = getQuestLogDb();

  const entry = await questLogDb.logCompletion({
    questId: quest.id,
    questName: quest.achievementName,
    userId,
    status: awaitingApproval ? "pending" : "approved",
    source,
    rewards,
  });

  if (awaitingApproval) return { entry, levelUp: null, awaitingApproval, paid: rewards };

  const paid = paidQuestRewards(userId, rewards);
  const levelUp = applyQuestRewards(userId, rewards, `quest:${quest.id}`);
  const settled = await questLogDb.updateEntry(entry.id, { rewardsApplied: true });
  return { entry: settled || entry, levelUp, awaitingApproval, paid };
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
    const isNotAwaitingReview = !entry || entry.status !== "pending";
    if (isNotAwaitingReview) return entry;
    return await review(entry);
  } finally {
    reviewsInFlight.delete(entryId);
  }
};

export const approveCompletion = (entryId: string, reviewerId?: string): Promise<QuestLogEntry | null> =>
  reviewEntry(entryId, (entry) => {
    if (!entry.rewardsApplied) applyQuestRewards(entry.userId, entry.rewards, `quest:${entry.questId}`, entry.completedAt);
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
