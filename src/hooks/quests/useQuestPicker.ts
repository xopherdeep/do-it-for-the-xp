import { actionSheetController } from "@ionic/vue";
import { format } from "date-fns";
import { getQuestEngine, type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dueTimeOn } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";

const resolveScheduleLabel = (entry: QuestBoardItem, now: Date): string => {
  const isNotDue = entry.status === "notDue";
  if (isNotDue) {
    return entry.quest.basicSchedule;
  }
  const due = dueTimeOn(entry.quest.dueByTime, now);
  if (due) {
    return `due ${format(due, "h:mma")}`;
  }
  return "";
};

/**
 * The hero's quest picker: the quests open on their board today, and an action sheet to pick one (a Snooze or
 * Extra Time cast asks it which quest first).
 */
export function useQuestPicker(userId: string) {
  /** The quests open on the hero's board today, read with the hero's own effects. */
  const openQuests = async (): Promise<QuestBoardItem[]> => {
    const effects = useUserStore().getUserById(userId)?.questEffects;
    const board = await getQuestEngine().getQuestBoardForUser(userId, new Date(), undefined, effects);
    return board.filter((entry) => entry.status === "open");
  };

  /** An action sheet of quests (title and due time); resolves with the picked quest id, or null on cancel. */
  const selectQuest = (choices: QuestBoardItem[], header: string): Promise<string | null> =>
    new Promise((resolve) => {
      const now = new Date();
      const buttons = choices.map((entry) => {
        const when = resolveScheduleLabel(entry, now);
        return {
          text: when ? `${entry.quest.achievementName} · ${when}` : entry.quest.achievementName,
          handler: () => resolve(String(entry.quest.id)),
        };
      });
      actionSheetController
        .create({
          header,
          cssClass: "rpg-sheet",
          buttons: [...buttons, { text: "Cancel", role: "cancel", handler: () => resolve(null) }],
        })
        .then((sheet) => {
          sheet.onDidDismiss().then(() => resolve(null));
          return sheet.present();
        })
        .catch(() => resolve(null));
    });

  return { openQuests, selectQuest };
}
