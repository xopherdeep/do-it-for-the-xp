import type { Achievement } from "@/lib/databases/AchievementDb";
import { getLatePenaltyLogDb } from "@/lib/databases/LatePenaltyLogDb";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { isSchedulePaused, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { loadFamilySettings } from "@/lib/services/family/familySettings";
import { questBoardLink, type NewXpNotification } from "@/lib/services/notifications/Notifications";
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import {
  cappedPenalty,
  isPenaltyEmpty,
  lateReward,
  latePenalty,
  lateRuleFor,
  lateStatus,
  paysLessWhenLate,
  penaltyKeyOf,
  penaltyLine,
  type LateRule,
  type LateStatus,
  type Penalty,
} from "./lateRules";

/**
 * The late chore rules at work: the pieces that need the family settings, the hero and the penalty record.
 * The rules themselves are pure (lateRules.ts); the claim guard, completeQuest and the quest watch call in here.
 */

export interface LateCheck {
  rule: LateRule;
  status: LateStatus;
}

const effectsOf = (heroId: string): HeroQuestEffects | undefined =>
  useUserStore().getUserById(heroId)?.questEffects as HeroQuestEffects | undefined;

/** The family's rule for this chore and whether it is on time, late or locked for the hero right now. */
export const lateCheckFor = async (
  quest: Pick<Achievement, "id" | "dueByTime" | "lateRule"> & Partial<Achievement>,
  heroId: string,
  now: Date = new Date()
): Promise<LateCheck> => {
  const settings = await loadFamilySettings();
  const rule = lateRuleFor(quest, settings.lateChores);
  return { rule, status: lateStatus(quest as Achievement, rule, effectsOf(String(heroId)), now) };
};

export interface LateAdjustment {
  rewards: QuestRewards;
  /** The chore was finished late and the family pays late finishes less */
  isReduced: boolean;
  rule: LateRule;
}

/** The rewards a finish pays at `now`: the full amount on time, the late share after the due time. */
export const adjustForLateness = async (
  quest: Achievement,
  heroId: string,
  rewards: QuestRewards,
  now: Date = new Date()
): Promise<LateAdjustment> => {
  const { rule, status } = await lateCheckFor(quest, heroId, now);
  const isReduced = status.state !== "onTime" && paysLessWhenLate(rule);
  return { rewards: isReduced ? lateReward(rewards, rule) : rewards, isReduced, rule };
};

/** True when the family's rules have locked this chore for the hero right now (battle wins read it too). */
export const isQuestLockedNow = async (quest: Achievement, heroId: string, now: Date = new Date()): Promise<boolean> => {
  const { status } = await lateCheckFor(quest, heroId, now);
  return status.state === "locked";
};

export const latePenaltyNotification = (
  heroId: string,
  quest: { id: string | number; achievementName: string },
  taken: Penalty,
  now: Date
): NewXpNotification => ({
  heroId,
  kind: "late-penalty",
  refId: String(quest.id),
  title: quest.achievementName,
  body: `Too late: it cost you ${penaltyLine(taken)}.`,
  link: questBoardLink(heroId, String(quest.id)),
  createdAt: now.toISOString(),
});

export interface ChargedPenalty {
  questId: string;
  questName: string;
  taken: Penalty;
}

// Windows being charged right now: a second run of the watch that starts before the first one saved its record
// would otherwise read "not charged yet" too
const charging = new Set<string>();

/** Takes the capped penalty off the hero: GP out of the wallet, XP never below the level the hero is on. */
const takeFromHero = async (heroId: string, penalty: Penalty, note: string): Promise<Penalty> => {
  const store = useUserStore();
  const stats = store.getUserById(heroId)?.stats;
  const xp = Number(stats?.xp?.now) || 0;
  const taken = cappedPenalty(penalty, {
    xp,
    levelFloorXp: getXpForLevel(Number(stats?.level) || 1),
    gp: Number(stats?.gp?.wallet) || 0,
  });
  if (taken.xp > 0) store.updateUserXP({ userId: heroId, amount: -taken.xp, commit: true });
  if (taken.gp > 0) await store.updateUserGP({ userId: heroId, wallet: -taken.gp, kind: "spend", note });
  return taken;
};

/**
 * Charges the late penalty for every chore on the board that passed its due time unclaimed, once per chore window.
 * Skipped while the clock is held (an old saved pause); a hero's Extra Time moves the due time the penalty waits for;
 * a chore waiting on the Game Master is a claim, not a miss. The record is written before the points move, so a
 * crash in between costs the hero nothing twice.
 */
export const chargeLatePenalties = async (
  board: readonly QuestBoardItem[],
  heroId: string,
  now: Date
): Promise<ChargedPenalty[]> => {
  const id = String(heroId);
  const effects = effectsOf(id);
  if (isSchedulePaused(effects, now)) return [];
  const settings = await loadFamilySettings();
  const isPenaltyOff = !settings.lateChores.penalty;
  if (isPenaltyOff) return [];

  const charged: ChargedPenalty[] = [];
  for (const item of board) {
    const isSettled = item.status !== "open" || item.pending;
    if (isSettled) continue;
    const rule = lateRuleFor(item.quest, settings.lateChores);
    const { state, deadline } = lateStatus(item.quest, rule, effects, now);
    const isOnTime = state === "onTime" || !deadline;
    if (isOnTime) continue;
    const owed = latePenalty(rule, {
      xp: Number(item.quest.xp) || 0,
      gp: Number(item.quest.gp) || 0,
      ap: 0,
    });
    if (isPenaltyEmpty(owed)) continue;

    const questId = String(item.quest.id);
    const key = penaltyKeyOf(id, questId, deadline);
    const isBeingCharged = charging.has(key);
    if (isBeingCharged) continue;
    charging.add(key);
    try {
      const db = getLatePenaltyLogDb();
      const isAlreadyCharged = Boolean(await db.getRecord(key));
      if (isAlreadyCharged) continue;
      const name = String(item.quest.achievementName ?? "A quest");
      const record = { heroId: id, questId, questName: name, deadline: deadline.toISOString(), chargedAt: now.toISOString() };
      await db.saveRecord(key, { ...record, xp: 0, gp: 0 });
      const taken = await takeFromHero(id, owed, `Late: ${name}`);
      await db.saveRecord(key, { ...record, ...taken });
      if (!isPenaltyEmpty(taken)) charged.push({ questId, questName: name, taken });
    } catch (error) {
      debug.warn("[LateChores] a late penalty could not be charged", error);
    } finally {
      charging.delete(key);
    }
  }
  return charged;
};
