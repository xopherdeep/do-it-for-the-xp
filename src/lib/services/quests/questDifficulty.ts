import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import debug from "@/lib/utils/debug";

/**
 * How big a quest is on the Fibonacci scale, read off the board by its id: the size multiplayer sends with quest.done and
 * a raid strikes with. 0 for a quest that is gone, was never rated or cannot be read (logged), so a caller treats it as "no size".
 */
export const difficultyOfQuest = async (questId: string): Promise<number> => {
  try {
    const quest = (await new AchievementDb(achievementStorage).get(questId)) as { difficulty?: unknown } | null;
    const difficulty = Number(quest?.difficulty);
    const isRated = Number.isFinite(difficulty) && difficulty > 0;
    return isRated ? difficulty : 0;
  } catch (error) {
    debug.warn(`quests: could not read quest ${questId}`, error);
    return 0;
  }
};
