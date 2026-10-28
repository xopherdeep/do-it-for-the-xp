import { useUserStore } from "@/lib/store/stores/user";
import { buildWidgetSyncPayload } from "./widgetDataExtractor";
import { syncWidgetData } from "./widgetSync";
import type { QuestListRow } from "@/lib/services/quests/QuestList";

export const syncAllWidgets = async (
  questRows: QuestListRow[] = [],
  streakCount: number = 0,
  savingsAmount: number = 0
): Promise<boolean> => {
  try {
    const userStore = useUserStore();
    const hero = userStore.currentUser?.stats ? userStore.currentUser : null;
    if (!hero) {
      return false;
    }
    const payload = buildWidgetSyncPayload(
      hero,
      questRows,
      streakCount,
      savingsAmount
    );
    return await syncWidgetData(payload);
  } catch {
    return false;
  }
};
