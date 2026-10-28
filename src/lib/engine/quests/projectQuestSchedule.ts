import { startOfDay } from "date-fns";
import type { Achievement, ProjectQuestLink } from "@/lib/databases/AchievementDb";
import { parseLocalDate } from "@/lib/services/core/packs/heroAge";

/**
 * Pure schedule rules for project chores: the quests tied to a tower floor (`project`). No storage, no Vue.
 * QuestSchedule.ts re-exports `isProjectQuest` and asks the other two where it dates a one-off quest and decides
 * whether a quest is on the board.
 */

/**
 * True for a project chore: a one-off quest tied to a tower floor (`project`). It sleeps until its floor wakes
 * and is due on its phase's date, whatever `startsOn` says.
 */
export const isProjectQuest = (quest: Pick<Achievement, "project">): quest is Achievement & { project: ProjectQuestLink } =>
  Boolean(quest.project);

/**
 * Whether a project chore is on the board's calendar (isQuestActiveOn). It ignores its dates: it is active from the
 * moment its floor wakes (`project.wokenAt`) and stays so past its due day, so it can be late.
 */
export const isProjectQuestAwake = (quest: { project: ProjectQuestLink }): boolean => Boolean(quest.project.wokenAt);

/** The one day a one-off quest is due: a project chore's phase date, else the day it starts (`starts`), else `day`. */
export const oneOffDueDayOf = (quest: Pick<Achievement, "project">, starts: Date | null, day: Date): Date => {
  if (isProjectQuest(quest)) return parseLocalDate(quest.project.dueOn);
  return starts ? startOfDay(starts) : day;
};
