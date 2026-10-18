import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { pickWeeklyRecapNotice } from "@/lib/services/insights/weeklyRecapNotice";
import { recapHeroesOf, levelUpsOf } from "@/lib/services/insights/recapRoster";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * Push the once-a-week recap into the hero's feed (the quest watch calls it on each run; the feed check inside
 * `pickWeeklyRecapNotice` keeps it to one a week). Never throws: a failed read is logged and the watch carries on.
 * Returns true when it pushed.
 */
export const runWeeklyRecapWatch = async (heroId: string, now: Date = new Date()): Promise<boolean> => {
  try {
    const id = String(heroId);
    const notifications = useNotificationsStore();
    await notifications.load(id);
    const feed = notifications.forHero(id);
    const entries = await getQuestLogDb().getEntries();
    const rules = useGameRulesStore();
    await rules.load();
    const notice = pickWeeklyRecapNotice({
      entries,
      heroes: recapHeroesOf(useUserStore().users),
      heroId: id,
      feed,
      now,
      levelUps: levelUpsOf(feed, id),
      weekStartsOn: rules.weekStartsOn,
    });
    return notice ? Boolean(notifications.push(notice, now)) : false;
  } catch (error) {
    debug.warn("[WeeklyRecap] could not make this week's recap", error);
    return false;
  }
};
