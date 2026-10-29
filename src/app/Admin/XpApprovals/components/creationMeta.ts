import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { creditLine } from "@/lib/services/creations/creations";
import type { CreationRow } from "@/lib/services/creations/creations";

/** What a creation's row shows, apart from the row itself: the words and the picture, as the page hands them over. */

/** Who the row's quest is for, as names: the quest's own heroes, or those of the quest a beast was sent with */
export const creationTargets = (row: CreationRow, nickOf: (id: string) => string): string =>
  ((row.quest ?? row.pairedQuest)?.assignee ?? []).map((id) => nickOf(String(id))).join(", ");

/** The kid's own picture, else the library portrait, else "" (a quest, or a beast with no look yet) */
export const creationPortrait = (row: CreationRow): string => row.beast?.localImage || beastPortraitUrl(row.beast?.avatar) || "";

/** The parts of the day a quest is done, as the meta line says them */
const TIME_WORDS: Record<string, string> = { morning: "mornings", noon: "at noon", evening: "evenings", night: "nights" };

const choresLine = (count: number): string => (count === 1 ? "1 chore" : `${count} chores`);

/** "for Mia", "size 2", "mornings · evenings": the facts a quest has, each left out when it has none */
const questFacts = (quest: Partial<Pick<Achievement, "difficulty" | "timesOfDay">>, targetNames: string): string[] => [
  targetNames ? `for ${targetNames}` : "",
  quest.difficulty ? `size ${quest.difficulty}` : "",
  (quest.timesOfDay ?? []).map((time) => TIME_WORDS[time] ?? time).join(" · "),
];

/**
 * The line under a creation's name on its Approvals row: "Drawn by Ronan · 3 chores" for a beast, "Suggested by
 * Jack · for Mia · size 2 · mornings" for a quest. `targetNames` is who the quest is for, already as names.
 */
export const creationMetaLine = (row: CreationRow, makerName: string, targetNames: string): string => {
  const nickOf = () => makerName;
  const { beast, quest } = row;
  const isBeast = row.kind === "beast" && beast !== undefined;
  const parts = isBeast
    ? [creditLine(beast, "beast", nickOf), choresLine(beast.checklist?.length ?? 0)]
    : [creditLine(quest ?? {}, "quest", nickOf), ...questFacts(quest ?? {}, targetNames)];
  return parts.filter(Boolean).join(" · ");
};

/** "+ a quest for Mia": the quest a beast was sent with, reviewed on the beast's row; "" when there is none */
export const pairedLine = (row: CreationRow, targetNames: string): string => {
  if (!row.pairedQuest) return "";
  return targetNames ? `+ a quest for ${targetNames}` : "+ a quest";
};
