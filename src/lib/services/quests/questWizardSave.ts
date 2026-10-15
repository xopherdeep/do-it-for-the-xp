import {
  AchievementDb,
  AchievementCategoryDb,
  achievementCategoryStorage,
  achievementStorage,
} from "@/lib/databases/AchievementDb";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import { buildWizardQuest, wizardCategory } from "@/lib/services/quests/questWizard";
import type { BuildContext, WizardDraft } from "@/lib/services/quests/questWizard";

/**
 * Saving a Quest Wizard quest (questWizard.ts builds it): the Hero Quests category on the first save, the beast the
 * quest needs, then the quest, in that order, so a quest never points at a beast that is not in the bestiary yet.
 * The three stores are passed in so a spec can use plain objects; the app passes none and gets the real ones.
 */
export interface WizardStores {
  achievementDb: Pick<AchievementDb, "setTask">;
  bestiaryDb: Pick<BestiaryDb, "getBeasts" | "setBeast">;
  categoryDb: Pick<AchievementCategoryDb, "getAll" | "setCategory">;
}

let appStores: WizardStores | null = null;

const realStores = (): WizardStores =>
  (appStores ??= {
    achievementDb: new AchievementDb(achievementStorage),
    bestiaryDb: new BestiaryDb(beastStorage),
    categoryDb: new AchievementCategoryDb(achievementCategoryStorage),
  });

/** Who is making the quest: the rest of the build context is read from the stores. */
export type WizardSaveContext = Pick<BuildContext, "isGm" | "creatorId" | "today" | "questId">;

export async function saveWizardQuest(
  draft: WizardDraft,
  who: WizardSaveContext,
  stores: WizardStores = realStores()
): Promise<Achievement> {
  const [categories, beasts] = await Promise.all([stores.categoryDb.getAll(), stores.bestiaryDb.getBeasts()]);
  const category = wizardCategory(categories.filter(Boolean));
  const { quest, beast } = buildWizardQuest(draft, { ...who, categoryId: category.id, familyBeasts: beasts });
  const newCategory = category.create;
  if (newCategory) await stores.categoryDb.setCategory(newCategory);
  if (beast) await stores.bestiaryDb.setBeast(beast);
  await stores.achievementDb.setTask(quest);
  return quest;
}
