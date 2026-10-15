import type { Enemy } from "@/lib/services/battle/BattleService";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import { huntBonusXpOn } from "@/lib/services/quests/huntBonus";
import type { BattleKind } from "./battleContext";
import type { Encounter } from "./encounterLoader";

const isMiniboss = (enemy: Enemy): boolean => enemy.type === "miniboss";

/**
 * What a victory is worth.
 *
 * Game-Master-authored rewards (on the quest or the temple room) always win. Otherwise a
 * temple beast is worth a share of its health, scaled up for bosses, plus a little AP.
 * Free fights (random encounters, the room editor's Test Fight) have no chore behind them,
 * so they pay 1 AP per beast and nothing else: XP and GP only come from real quests and rooms.
 *
 * The hunt bonus (services/quests/huntBonus.ts): a quest finished by winning its fight pays HUNT_BONUS_XP (+25%) more XP
 * than claiming it from the beast card's checklist. XP only (GP mirrors real money, AP gates Powers). Free fights carry
 * no quest and get none. A quest the Game Master approves is held: its entry carries the bonus (completeQuest) and the
 * approval pays it, so the held card counts it as part of the XP the hero is waiting for.
 */
const bossMultiplier = (enemy: Enemy): number => {
  if (enemy.isBoss) return 1.5;
  if (isMiniboss(enemy)) return 1.25;
  return 1;
};

const bossApReward = (enemy: Enemy): number => {
  if (enemy.isBoss) return 3;
  if (isMiniboss(enemy)) return 2;
  return 1;
};

export const formulaRewards = (enemy: Enemy): QuestRewards => {
  const multiplier = bossMultiplier(enemy);
  return {
    xp: Math.round((enemy.maxHealth / 2) * multiplier),
    gp: Math.round((enemy.maxHealth / 4) * multiplier),
    ap: bossApReward(enemy),
  };
};

export const freeFightRewards = (enemy: Enemy): QuestRewards => ({ xp: 0, gp: 0, ap: enemy.isBoss ? 2 : 1 });

export const sumRewards = (rewards: QuestRewards[]): QuestRewards =>
  rewards.reduce(
    (total, reward) => ({ xp: total.xp + reward.xp, gp: total.gp + reward.gp, ap: total.ap + reward.ap }),
    { xp: 0, gp: 0, ap: 0 }
  );

/** What the fight pays before the hunt bonus: the quest's or room's authored rewards, else the formula. */
const baseRewards = (encounter: Encounter | null, defeated: Enemy[], kind: BattleKind): QuestRewards => {
  const authoredRewards = encounter?.rewards;
  if (authoredRewards) return authoredRewards;
  const isFreeFight = kind === "free";
  if (isFreeFight) return sumRewards(defeated.map(freeFightRewards));
  return sumRewards(defeated.map(formulaRewards));
};

/** The extra XP winning this fight pays as a hunt: 0 for a free fight or a fight with no quest behind it. */
export const huntBonusXpFor = (encounter: Encounter | null, defeated: Enemy[], kind: BattleKind = "free"): number => {
  const paysBonus = kind !== "free" && Boolean(encounter?.quest);
  return paysBonus ? huntBonusXpOn(baseRewards(encounter, defeated, kind).xp) : 0;
};

export const resolveRewards = (encounter: Encounter | null, defeated: Enemy[], kind: BattleKind = "free"): QuestRewards => {
  const base = baseRewards(encounter, defeated, kind);
  const bonus = huntBonusXpFor(encounter, defeated, kind);
  return bonus > 0 ? { ...base, xp: base.xp + bonus } : base;
};
