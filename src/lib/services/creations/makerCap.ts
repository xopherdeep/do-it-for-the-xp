/**
 * The maker cap at the storage edge: the Beast Maker and the Quest Wizard ask this before a proposal is built. The
 * rule is creations.canProposeAny (a hero's beasts and quests still with the Game Master, together, against
 * MAKER_CAP); this only reads the two stores for it.
 */
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import { canProposeAny } from "./creations";

/** Whether this hero may send another creation */
export const mayPropose = async (heroId: string): Promise<boolean> => {
  const [beasts, quests] = await Promise.all([
    new BestiaryDb(beastStorage).getBeasts(),
    new AchievementDb(achievementStorage).getTasks(),
  ]);
  return canProposeAny(beasts, quests, heroId);
};
