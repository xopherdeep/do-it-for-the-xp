import type { Enemy } from "@/lib/services/battle/BattleService";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { BattleKind } from "./battleContext";
import type { Encounter } from "./encounterLoader";

/**
 * What a victory is worth.
 *
 * Game-Master-authored rewards (on the quest or the temple room) always win. Otherwise a
 * temple beast is worth a share of its health, scaled up for bosses, plus a little AP.
 * Free fights (random encounters, the room editor's Test Fight) have no chore behind them,
 * so they pay 1 AP per beast and nothing else: XP and GP only come from real quests and rooms.
 */
const bossMultiplier = (enemy: Enemy): number => {
  if (enemy.isBoss) return 1.5;
  if (enemy.type === "miniboss") return 1.25;
  return 1;
};

export const formulaRewards = (enemy: Enemy): QuestRewards => {
  const multiplier = bossMultiplier(enemy);
  return {
    xp: Math.round((enemy.maxHealth / 2) * multiplier),
    gp: Math.round((enemy.maxHealth / 4) * multiplier),
    ap: enemy.isBoss ? 3 : enemy.type === "miniboss" ? 2 : 1,
  };
};

export const freeFightRewards = (enemy: Enemy): QuestRewards => ({ xp: 0, gp: 0, ap: enemy.isBoss ? 2 : 1 });

export const sumRewards = (rewards: QuestRewards[]): QuestRewards =>
  rewards.reduce(
    (total, reward) => ({ xp: total.xp + reward.xp, gp: total.gp + reward.gp, ap: total.ap + reward.ap }),
    { xp: 0, gp: 0, ap: 0 }
  );

export const resolveRewards = (encounter: Encounter | null, defeated: Enemy[], kind: BattleKind = "free"): QuestRewards => {
  if (encounter?.rewards) return encounter.rewards;
  if (kind === "free") return sumRewards(defeated.map(freeFightRewards));
  return sumRewards(defeated.map(formulaRewards));
};
