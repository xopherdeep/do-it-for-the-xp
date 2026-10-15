/**
 * What the Beast Log's FAB offers in its action sheet (the same building FAB the Calendar and the town use). Pure: no
 * router, no Ionic. Every entry is wired to something real, for every player: "New Quest" opens the Quest Wizard and
 * "Quick Task" the small to-do form the List view had its + button for.
 */
export type QuestLogActionId = "new-quest" | "quick-task";

export interface QuestLogAction {
  id: QuestLogActionId;
  text: string;
  /** Font Awesome duotone icon name, no prefix */
  icon: string;
}

export const questLogActions = (): QuestLogAction[] => [
  { id: "new-quest", text: "New Quest", icon: "scroll" },
  { id: "quick-task", text: "Quick Task", icon: "tasks" },
];
