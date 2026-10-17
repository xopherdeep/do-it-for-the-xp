import type { Achievement } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, QuestLogEntry, QuestLogSource, QuestRewards } from "@/lib/databases/QuestLogDb";
import { countedHeroesOf, isQuestOpenFor, isTrustedHour, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { emitQuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { adjustForLateness } from "@/lib/services/quests/lateChores";
import { lateRewardLine } from "@/lib/services/quests/lateRules";
import { huntBonusXpOn, withHuntBonus } from "@/lib/services/quests/huntBonus";
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
 *               already credits XP/GP/AP during its victory sequence. isQuestStillOpen() is the
 *               window check a win reads first, so a window already used is never paid twice.
 *
 * The log keeps the quest's own rate; what the hero is paid is paidQuestRewards(): the same
 * XP and AP, and the GP with the class loot bonus on top (a Thief's or Ninja's +25%, see
 * docs/Items-And-Classes-Contract.md, C). Screens print the paid line, not the board's.
 * AP is stamped at the entry's completedAt, so a next-morning approval lands on the day the chore was done.
 * A hold from a WON fight (source "battle") carries the hunt bonus XP on its entry (huntBonus.ts); the approval pays it
 * on top, once. A claim never earns it.
 *
 * Logging a completion also ends the grudge (docs/Quest-Rooms-Spec.md 5.7): a claim, held or paid, and a battle win
 * clear the hero's marks on the quest, and a shared quest clears them for every assignee. A later rejection does not
 * bring them back.
 *
 * Multiplayer hears of every payment through emitQuestPaid (services/multiplayer/gameSignals.ts), after the rewards
 * are in the pocket: a claim paid at once, an approval, a battle win. A held claim says nothing until it is paid.
 */
export interface CompletionResult {
  entry: QuestLogEntry;
  levelUp: LevelUpInfo | null;
  awaitingApproval: boolean;
  /** What landed in the hero's pocket; the quest's rate when the claim is held or the hero is unknown. */
  paid: QuestRewards;
  /** "Late: paid 50% of the loot" when the family pays late finishes less and this one was late; absent otherwise */
  lateNote?: string;
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
  at?: string,
  /** What the wallet's history calls the GP: "Quest: Feed the cat" */
  label?: string
): LevelUpInfo | null => {
  const userStore = useUserStore();
  const isUnknownHero = !userStore.users[userId];
  if (isUnknownHero) return null;

  const paid = paidQuestRewards(userId, rewards);
  const levelUp = paid.xp > 0 ? userStore.updateUserXP({ userId, amount: paid.xp, commit: true }) : null;
  const hasGp = paid.gp > 0;
  if (hasGp) void userStore.updateUserGP({ userId, wallet: paid.gp, kind: "earn", ...(label ? { note: label } : {}) });
  const hasAp = paid.ap > 0;
  if (hasAp) userStore.recordAPGain({ userId, amount: paid.ap, source, at });
  return levelUp;
};

/**
 * The quest is done: the beast's grudge marks come off the hero who did it, and off every assignee of a shared quest
 * (Team Effort, Rat Race). Only the marks change.
 */
const clearGrudges = (quest: Pick<Achievement, "id" | "type" | "assignee">, userId: string): void => {
  const userStore = useUserStore();
  for (const heroId of countedHeroesOf(quest, userId)) userStore.clearQuestGrudge(heroId, String(quest.id));
};

/** Tells multiplayer a quest paid `xp`; a quest finished by winning its battle is a fight */
const announcePaid = (heroId: string, questId: string, xp: number, source: QuestLogSource | undefined): void => {
  const fight = source === "battle";
  emitQuestPaid({ heroId, questId: String(questId), xp, fight });
};

export const completeQuest = async (
  quest: Achievement,
  userId: string,
  source: QuestLogSource = "claim"
): Promise<CompletionResult> => {
  // A finish after the due time pays the family's late share (all of it unless the Game Master chose less); the log keeps
  // what was owed, so a held claim is approved at the same reduced rate
  const late = await adjustForLateness(quest, userId, questRewards(quest), new Date());
  const rewards = late.rewards;
  const lateNote = late.isReduced ? lateRewardLine(late.rule) : undefined;
  const awaitingApproval =
    Boolean(quest.requiresApproval) && !isTrustedHour(useUserStore().users[userId]?.questEffects, new Date());
  const questLogDb = getQuestLogDb();
  // A quest finished by winning its fight earns the hunt bonus; a claim never does. Held, it is written on the hold and
  // the Game Master's approval pays it; paid at once, it goes into the pocket with the rest.
  const huntBonusXp = source === "battle" ? huntBonusXpOn(rewards.xp) : 0;

  const entry = await questLogDb.logCompletion({
    questId: quest.id,
    questName: quest.achievementName,
    userId,
    status: awaitingApproval ? "pending" : "approved",
    source,
    rewards,
    ...(huntBonusXp > 0 ? { huntBonusXp } : {}),
  });
  clearGrudges(quest, userId);

  // The held line is what the hero will be paid once the Game Master says yes
  const owed = { ...rewards, xp: rewards.xp + huntBonusXp };
  if (awaitingApproval) return { entry, levelUp: null, awaitingApproval, paid: owed, lateNote };

  const paid = paidQuestRewards(userId, owed);
  const levelUp = applyQuestRewards(userId, owed, `quest:${quest.id}`, undefined, `Quest: ${quest.achievementName}`);
  const settled = await questLogDb.updateEntry(entry.id, { rewardsApplied: true });
  announcePaid(userId, quest.id, owed.xp, source);
  return { entry: settled || entry, levelUp, awaitingApproval, paid, lateNote };
};

/**
 * Whether the hero can still complete the quest at `now`, read from the quest log of EVERY hero: a shared quest
 * (Team Effort, Rat Race) a sibling already cleared, or a window the hero used up on another screen (a claim, a
 * pending one too), is closed, so a battle win that ends after it is not paid a second time. False when the quest is
 * not due at `now`. The same rule the board and MyTask's claim read (QuestSchedule.getQuestProgressFor).
 * @param effects The hero's item effects (snoozes, pull-ins), as the board read them
 */
export const isQuestStillOpen = async (
  quest: Achievement,
  userId: string,
  now: Date = new Date(),
  effects?: HeroQuestEffects
): Promise<boolean> => isQuestOpenFor(quest, await getQuestLogDb().getEntries(), userId, now, effects);

/** Battle victories already paid out; just record that the quest was finished. */
export const recordBattleCompletion = async (quest: Achievement, userId: string, rewards: QuestRewards) => {
  const entry = await getQuestLogDb().logCompletion({
    questId: quest.id,
    questName: quest.achievementName,
    userId,
    status: "approved",
    source: "battle",
    rewards,
    rewardsApplied: true,
  });
  clearGrudges(quest, userId);
  announcePaid(userId, quest.id, rewards.xp, "battle");
  return entry;
};

// Entries currently being reviewed; a second approve/reject for the same entry while the
// first is still reading-then-writing would otherwise pay the hero twice.
const reviewsInFlight = new Set<string>();

const reviewEntry = async (
  entryId: string,
  review: (entry: QuestLogEntry) => Promise<QuestLogEntry | null>
): Promise<QuestLogEntry | null> => {
  const isInFlight = reviewsInFlight.has(entryId);
  if (isInFlight) return null;
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
  reviewEntry(entryId, async (entry) => {
    // The quest's rate, and the hunt bonus a won fight wrote on the hold: paid here, once (a second approval finds the
    // entry already approved and pays nothing)
    const owed = withHuntBonus(entry);
    const shouldPay = !entry.rewardsApplied;
    if (shouldPay) applyQuestRewards(entry.userId, owed, `quest:${entry.questId}`, entry.completedAt, `Quest: ${entry.questName}`);
    const settled = await getQuestLogDb().updateEntry(entryId, {
      status: "approved",
      rewardsApplied: true,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    });
    if (shouldPay) announcePaid(entry.userId, entry.questId, owed.xp, entry.source);
    return settled;
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
