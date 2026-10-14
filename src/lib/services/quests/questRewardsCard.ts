import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { LevelUpInfo } from "@/lib/store/stores/user/types";
import type { VictoryCardState } from "@/app/Console/BattleField/battle/battleView";

/**
 * The loot card a quest marked done outside a fight shows (the Beast Log's Done button, the beast card's Claim): the
 * same card the battle counts its loot up on, minus the fight's "chores in time" line. Pure: no stores, no Vue.
 */
export interface QuestRewardsCardInput {
  nick: string;
  questName: string;
  /** What landed in the pocket (`CompletionResult.paid`), or the quest's posted rate. */
  rewards: QuestRewards;
  /** The Game Master approves first: the tiles count up locked. */
  held: boolean;
  levelUp?: LevelUpInfo | null;
}

export const questRewardsCard = ({ nick, questName, rewards, held, levelUp }: QuestRewardsCardInput): VictoryCardState => {
  const hero = nick.trim() || "The hero";
  const leveled = !held && Boolean(levelUp?.didLevelUp);
  return {
    title: held ? "WELL DONE!" : "YOU WON!",
    subtitle: held ? `${hero} sent it to the Game Master` : `${hero} did it!`,
    rewards: { xp: rewards.xp || 0, gp: rewards.gp || 0, ap: rewards.ap || 0 },
    questName,
    held,
    levelUp: leveled && levelUp ? { from: levelUp.oldLevel, to: levelUp.newLevel } : undefined,
  };
};
