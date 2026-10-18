/**
 * The hero's Guide step read straight from the saves (the profile, the temple records, the quest log and today's board),
 * for screens that ask once rather than watch: a townsperson about to greet the hero asks for their piece of news.
 */
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import { dailyStreak } from "@/lib/services/streaks/dailyStreak";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { guideRecordOf, markHeard } from "./guideState";
import { nextGuideStep, normalPegasi, templeProgressOf, type GuideStep } from "./nextStep";
import { npcHintLine, type NpcRole } from "./npcHints";

/** The hero's next step, or null for an unknown hero or saves that cannot be read. */
export const readGuideStep = async (heroId: string): Promise<GuideStep | null> => {
  const user = useUserStore().getUserById(heroId);
  if (!user) return null;
  try {
    const rules = useGameRulesStore();
    const [records, log, open] = await Promise.all([
      getTempleProgressDb().getProgressForUser(heroId),
      getQuestLogDb().getEntriesForUser(heroId),
      getQuestEngine().getOpenQuestsForUser(heroId),
      rules.load(),
    ]);
    const record = guideRecordOf(user);
    const streak = dailyStreak(log, heroId, new Date());
    return nextGuideStep({
      questsSeen: Boolean(record.questsSeen) || log.some((entry) => entry.status !== "rejected"),
      shopSeen: Boolean(record.shopSeen),
      champion: Boolean(record.championAt),
      pegasi: normalPegasi(user.stats?.pegasi),
      temples: Object.fromEntries(records.map((entry) => [entry.templeId, templeProgressOf(entry)])),
      openQuests: open.length,
      streakDays: rules.streaks ? streak.current : 0,
      streakAtRisk: rules.streaks && streak.atRisk,
    });
  } catch (error) {
    debug.warn("guide: could not read the hero's progress", error);
    return null;
  }
};

/**
 * A townsperson's piece of news for the hero (npcHints.ts), noted as heard: the line to add to their greeting, or null
 * when they have nothing new to say.
 */
export const npcNews = async (heroId: string, role: NpcRole): Promise<string | null> => {
  const step = await readGuideStep(heroId);
  if (!step) return null;
  const line = npcHintLine(role, step, guideRecordOf(useUserStore().getUserById(heroId)).heard);
  if (line) markHeard(heroId, role, step.key);
  return line;
};
