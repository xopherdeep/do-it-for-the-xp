/**
 * The family device's side of two-phone play (FAMILY_EVENTS.md): it takes the claims heroes made on their own phones
 * and builds each hero's sheet for those phones. The family device stays the only one that keeps the game, so a phone
 * claim goes through the same rules and the same completeQuest as a claim made here: the window check, the late rules,
 * approval, the Approvals screen.
 */
import { AchievementDb, achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { completeQuest, paidQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import { asksForPhoto, claimNeedsApproval } from "@/lib/services/quests/claimPhotos";
import { isSoleGameMaster } from "@/lib/services/quests/approvalRouting";
import { lateCheckFor } from "@/lib/services/quests/lateChores";
import { useUserStore } from "@/lib/store/stores/user";
import type { ClaimSettled } from "./familyEvents";
import type { ReceivedEvent } from "./familyServer";
import { statsOf, type SheetQuest, type SheetStats } from "./heroSheet";

/** How far back a phone claim may be dated: a phone offline longer than this has its claim counted as made now */
const MAX_CLAIM_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When the hero made the claim, as the family device counts it: the phone's time, unless it is in the future or older
 * than a week (a phone with a wrong clock), then now. Counting the phone's time means a chore done before bedtime on a
 * phone that was offline still counts for that day.
 */
export const claimTimeOf = (at: string, now: Date): Date => {
  const time = Date.parse(at);
  const isUsable = Number.isFinite(time) && time <= now.getTime() && now.getTime() - time <= MAX_CLAIM_AGE_MS;
  return isUsable ? new Date(time) : now;
};

/** Whether a received event is a claim made on a hero phone (not this device's own `quest.claimed`) */
export const isPhoneClaim = (e: ReceivedEvent, ownDeviceId: string): boolean =>
  e.kind === "quest.claimed" && e.deviceId !== ownDeviceId && typeof e.data?.questId === "string";

const answer = (claimId: string, questId: string, status: ClaimSettled["status"], note = "", paid = { xp: 0, gp: 0, ap: 0 }): ClaimSettled => ({
  claimId,
  questId,
  status,
  note,
  ...paid,
});

/** The answer for a claim already in the log (the app closed between logging it and telling the phone) */
const answerOfEntry = (claimId: string, entry: QuestLogEntry): ClaimSettled => {
  const status = entry.status === "pending" ? "pending" : entry.status === "approved" ? "approved" : "rejected";
  const paid = status === "approved" ? paidQuestRewards(entry.userId, entry.rewards) : undefined;
  return answer(claimId, String(entry.questId), status, entry.note ?? "", paid);
};

const effectsOf = (heroId: string): HeroQuestEffects | undefined => useUserStore().users[heroId]?.questEffects as HeroQuestEffects | undefined;

/**
 * Takes one phone claim: logs it with completeQuest at the time the hero made it (held for a Game Master, or paid at
 * once) and says what to tell the phone. A claim for a hero or quest this device no longer has, or for a window that is
 * already used up, is turned away with a line the hero reads. Taking the same claim twice logs it once.
 */
export const takePhoneClaim = async (e: ReceivedEvent, now: Date = new Date()): Promise<ClaimSettled> => {
  const claimId = e.id;
  const questId = String(e.data.questId);
  const heroId = e.heroId;
  const entries = await getQuestLogDb().getEntries();
  const logged = entries.find((entry) => entry.phoneClaimId === claimId);
  if (logged) return answerOfEntry(claimId, logged);
  const isKnownHero = Boolean(useUserStore().users[heroId]);
  if (!isKnownHero) return answer(claimId, questId, "rejected", "This hero isn't on the family device any more.");
  const quest = (await new AchievementDb(achievementStorage).get(questId)) as Achievement | null;
  if (!quest) return answer(claimId, questId, "rejected", "This quest is gone from the family device.");
  const at = claimTimeOf(e.at, now);
  const effects = effectsOf(heroId);
  const { status: late } = await lateCheckFor(quest, heroId, at);
  const check = checkClaimWindow(quest, entries, heroId, at, effects, late);
  if (!check.canClaim) return answer(claimId, questId, "rejected", check.notice);
  const result = await completeQuest(quest, heroId, "phone", { at, phoneClaimId: claimId });
  const status = result.awaitingApproval ? "pending" : "approved";
  return answer(claimId, questId, status, result.lateNote ?? "", status === "approved" ? result.paid : undefined);
};

/** The hero's sheet: their numbers, and the quests open to them now as their board shows them */
export const buildHeroSheet = async (heroId: string, now: Date = new Date()): Promise<{ stats: SheetStats; quests: SheetQuest[] }> => {
  const users = useUserStore().users;
  const profile = users[heroId];
  const effects = effectsOf(heroId);
  const board = await getQuestEngine().getOpenQuestsForUser(heroId, now, undefined, effects);
  const isSoleGm = isSoleGameMaster(heroId, users);
  const quests = board.map(({ quest, overdue }): SheetQuest => {
    const rewards = paidQuestRewards(heroId, { xp: Number(quest.xp) || 0, gp: Number(quest.gp) || 0, ap: Number(quest.ap) || 0 });
    return {
      questId: String(quest.id),
      name: String(quest.achievementName ?? ""),
      difficulty: Number(quest.difficulty) > 0 ? Number(quest.difficulty) : 1,
      ...rewards,
      needsApproval: claimNeedsApproval(quest, effects, now) && !isSoleGm,
      photo: asksForPhoto(quest),
      overdue: Boolean(overdue),
    };
  });
  return { stats: statsOf(profile), quests };
};
