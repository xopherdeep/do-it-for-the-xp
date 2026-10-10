import type { Achievement } from "@/lib/databases/AchievementDb";
import { nickOf, type FamilyMember } from "@/lib/services/quests/QuestList";

/**
 * Plain words for the Compendium's quest list and quest summary. Pure: no storage, no Vue.
 *
 * The Game Master form speaks in flavor ("Merc", "HONOR", "REQD"); these say what the saved fields mean:
 * `type` is who the quest is for (asNeeded, individual, collaborate, rotate, compete), `adventureType` is
 * what it is (simple, beast, chain), and the summary hints are derived from those, `requiresApproval`
 * and `bonusAchievement`.
 */

/** The assignment names the quest form shows (useAchievementForm's `assignmentTypes`). */
export const ASSIGNMENT_NAMES: Record<string, string> = {
  asNeeded: "Open Bounty",
  individual: "Solo Mission",
  collaborate: "Team Effort",
  rotate: "Rotate Out",
  compete: "Rat Race",
};

const WHO_LABELS: Record<string, string> = {
  asNeeded: "open to anyone",
  individual: "one hero",
  collaborate: "a team",
  rotate: "heroes take turns",
  compete: "heroes race",
};

const WHAT_LABELS: Record<string, string> = {
  simple: "simple task",
  beast: "beast fight",
  chain: "quest chain",
};

/** The names of the difficulty steps (the Fibonacci slider on the quest form's Why tab). */
export const DIFFICULTY_NAMES: Record<number, string> = {
  1: "Trivial",
  2: "Simple",
  3: "Easy",
  5: "Moderate",
  8: "Challenging",
  13: "Difficult",
  21: "Very difficult",
  34: "Extremely difficult",
  55: "Insane",
  89: "Legendary",
  144: "Mythical",
};

const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES: Record<string, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

export type ScheduleFields = Partial<
  Pick<
    Achievement,
    "basicSchedule" | "scheduleType" | "repeatOnDays" | "customFrequency" | "customPeriodType" | "customPeriodNumber"
  >
>;

/** What the Type tile's flavor name stands for: "beast fight · one hero". Empty until a quest type is picked. */
export const questTypeHint = (type?: string, adventureType?: string): string => {
  const what = WHAT_LABELS[adventureType ?? ""];
  if (!what) return "";
  return [what, WHO_LABELS[type ?? ""]].filter(Boolean).join(" · ");
};

/** What the party tile's number means: it counts heroes, or the quest is open to every hero. */
export const partyHint = (type: string | undefined, heroCount: number): string => {
  if (type === "asNeeded") return "any hero can claim it";
  if (!heroCount || heroCount < 1) return "pick a hero";
  return heroCount === 1 ? "hero assigned" : "heroes assigned";
};

/** Honor / Review: who confirms the quest is done. */
export const approvalHint = (requiresApproval?: boolean): string =>
  requiresApproval ? "the Game Master approves first" : "no approval needed";

/** Bonus / Reqd: whether the hero has to do it. */
export const priorityHint = (bonus?: boolean): string => (bonus ? "optional extra" : "must be done");

/** "Difficulty: Easy (3)"; a value off the slider's steps keeps just its number. */
export const difficultyLabel = (difficulty?: number): string => {
  const value = Number(difficulty);
  if (!Number.isFinite(value) || value <= 0) return "Difficulty: not set";
  const name = DIFFICULTY_NAMES[value];
  return name ? `Difficulty: ${name} (${value})` : `Difficulty: ${value}`;
};

/** When the quest comes back, in words: "One-time", "Daily", "Weekly on Mon, Wed", "2x every 3 days". */
export const scheduleLabel = (quest: ScheduleFields): string => {
  const { basicSchedule, scheduleType } = quest;
  if (basicSchedule === "once") return "One-time";
  if (basicSchedule === "daily") return "Daily";
  if (basicSchedule === "weekly") {
    const days = DAY_ORDER.filter((day) => (quest.repeatOnDays || []).includes(day)).map((day) => DAY_NAMES[day]);
    return days.length ? `Weekly on ${days.join(", ")}` : "Weekly";
  }
  if (basicSchedule === "custom" || scheduleType === "custom") {
    const every = Number(quest.customPeriodNumber) || 1;
    const period = quest.customPeriodType || "day";
    return `${Number(quest.customFrequency) || 1}x every ${every > 1 ? `${every} ` : ""}${period}${every > 1 ? "s" : ""}`;
  }
  return basicSchedule ? basicSchedule.charAt(0).toUpperCase() + basicSchedule.slice(1) : "One-time";
};

/** Who the quest is for, by nickname: "Sam, Alex +1", "Anyone" for an open bounty, "Unassigned" otherwise. */
export const assigneeLabel = (
  quest: Pick<Achievement, "type" | "assignee">,
  users: FamilyMember[] = [],
  maxNames = 3
): string => {
  const ids = (quest.assignee || []).map(String);
  if (!ids.length) return quest.type === "asNeeded" ? "Anyone" : "Unassigned";
  const names = ids.map((id) => nickOf(users.find((user) => String(user.id) === id), "Unknown hero"));
  if (names.length <= maxNames) return names.join(", ");
  return `${names.slice(0, maxNames).join(", ")} +${names.length - maxNames}`;
};

/**
 * The row's second line: who and when ("Sam · Daily"), or the category and when when the list is grouped by hero.
 * Without the family's profiles (`users` undefined) the heroes cannot be named, so only the schedule is left.
 */
export const questSubtitle = (
  quest: Pick<Achievement, "type" | "assignee"> & ScheduleFields,
  users: FamilyMember[] | undefined,
  categoryName: string,
  byAssignee = false
): string => {
  let who = "";
  if (byAssignee) who = categoryName;
  else if (users) who = assigneeLabel(quest, users);
  return [who, scheduleLabel(quest)].filter(Boolean).join(" · ");
};

export interface StatusIconLabels {
  difficulty: string;
  schedule: string;
  assignment: string;
  approval: string;
  bonus: string;
}

/** What each small icon on a list row means, for its title and aria-label. */
export const statusIconLabels = (quest: Pick<Achievement, "difficulty" | "type"> & ScheduleFields): StatusIconLabels => {
  const name = ASSIGNMENT_NAMES[quest.type] || quest.type;
  const who = WHO_LABELS[quest.type];
  return {
    difficulty: difficultyLabel(quest.difficulty),
    schedule: `Schedule: ${scheduleLabel(quest)}`,
    assignment: `Assignment: ${who ? `${name} (${who})` : name}`,
    approval: "Needs approval: the Game Master approves it first",
    bonus: "Bonus quest: an optional extra",
  };
};

/** A reward as a whole number with thousands separators: 30 -> "30", 1300 -> "1,300". */
export const formatPoints = (value?: number): string => {
  const amount = Math.round(Number(value));
  return Number.isFinite(amount) ? amount.toLocaleString("en-US") : "0";
};
