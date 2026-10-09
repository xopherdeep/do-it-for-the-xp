import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  startOfDay,
} from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";

/**
 * Pure schedule rules for quests. No storage, no Vue.
 *
 * A quest is "open" for a hero on a given day when that day falls inside one of the
 * quest's completion windows and the hero has fewer completions in that window than
 * the window allows:
 *   once    -> a single window, forever, allowance 1
 *   daily   -> one window per day, allowance 1
 *   weekly  -> one window per listed weekday (or the whole week with showDailyUntilComplete)
 *   custom  -> "customFrequency times every customPeriodNumber customPeriodType(s)"
 */
export type QuestScheduleFields = Pick<
  Achievement,
  | "id"
  | "basicSchedule"
  | "customFrequency"
  | "customPeriodType"
  | "customPeriodNumber"
  | "repeatOnDays"
  | "showDailyUntilComplete"
  | "startsOn"
  | "endsOn"
>;

export const DAY_TOKENS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface QuestWindow {
  start: Date;
  /** Exclusive */
  end: Date;
  allowance: number;
}

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isQuestActiveOn = (quest: QuestScheduleFields, date: Date): boolean => {
  const day = startOfDay(date);
  const starts = parseDate(quest.startsOn);
  if (starts && startOfDay(starts) > day) return false;
  const ends = parseDate(quest.endsOn);
  if (ends && startOfDay(ends) < day) return false;
  return true;
};

const alignedStart = (anchor: Date, day: Date, span: number, unit: "day" | "month" | "year"): Date => {
  const diff =
    unit === "day"
      ? differenceInCalendarDays(day, anchor)
      : unit === "month"
        ? differenceInCalendarMonths(day, anchor)
        : differenceInCalendarYears(day, anchor);
  let steps = Math.floor(diff / span);
  const add = unit === "day" ? addDays : unit === "month" ? addMonths : addYears;
  let start = add(anchor, steps * span);
  // Calendar-month/year differences can overshoot (Jan 31 + 1 month = Feb 28 > Feb 1); step back.
  while (start > day && steps > 0) {
    steps -= 1;
    start = add(anchor, steps * span);
  }
  return start;
};

const customWindow = (quest: QuestScheduleFields, day: Date, anchor: Date): QuestWindow => {
  const allowance = Math.max(1, quest.customFrequency || 1);
  const span = Math.max(1, quest.customPeriodNumber || 1);
  switch (quest.customPeriodType) {
    case "week": {
      const start = alignedStart(anchor, day, span * 7, "day");
      return { start, end: addDays(start, span * 7), allowance };
    }
    case "month": {
      const start = alignedStart(anchor, day, span, "month");
      return { start, end: addMonths(start, span), allowance };
    }
    case "year": {
      const start = alignedStart(anchor, day, span, "year");
      return { start, end: addYears(start, span), allowance };
    }
    default: {
      const start = alignedStart(anchor, day, span, "day");
      return { start, end: addDays(start, span), allowance };
    }
  }
};

/** The completion window containing `date`, or null when the quest is not due that day. */
export const getQuestWindow = (quest: QuestScheduleFields, date: Date): QuestWindow | null => {
  if (!isQuestActiveOn(quest, date)) return null;
  const day = startOfDay(date);
  const anchor = startOfDay(parseDate(quest.startsOn) || day);

  switch (quest.basicSchedule) {
    case "once":
      return { start: new Date(0), end: addYears(day, 100), allowance: 1 };
    case "weekly": {
      const listedDays = quest.repeatOnDays || [];
      const isListedDay = listedDays.includes(DAY_TOKENS[day.getDay()]);
      if (listedDays.length && isListedDay && !quest.showDailyUntilComplete) {
        return { start: day, end: addDays(day, 1), allowance: 1 };
      }
      if (listedDays.length && !isListedDay && !quest.showDailyUntilComplete) return null;
      const start = alignedStart(anchor, day, 7, "day");
      return { start, end: addDays(start, 7), allowance: Math.max(1, listedDays.length) };
    }
    case "custom":
      return customWindow(quest, day, anchor);
    default:
      return { start: day, end: addDays(day, 1), allowance: 1 };
  }
};

const countsTowardAllowance = (entry: QuestLogEntry) => entry.status !== "rejected";

/** The hero's log entry for this quest, completed inside the window (whatever its approval status). */
const isEntryInWindow = (entry: QuestLogEntry, questId: string, userId: string, window: QuestWindow): boolean => {
  if (entry.questId !== questId || entry.userId !== userId) return false;
  const completedAt = new Date(entry.completedAt);
  return completedAt >= window.start && completedAt < window.end;
};

export const countCompletionsInWindow = (
  entries: QuestLogEntry[],
  questId: string,
  userId: string,
  window: QuestWindow
): number =>
  entries.filter((entry) => countsTowardAllowance(entry) && isEntryInWindow(entry, questId, userId, window)).length;

/** Completions in the window that still wait for the Game Master to approve or reject them. */
export const countPendingInWindow = (
  entries: QuestLogEntry[],
  questId: string,
  userId: string,
  window: QuestWindow
): number =>
  entries.filter((entry) => entry.status === "pending" && isEntryInWindow(entry, questId, userId, window)).length;

export interface QuestProgress {
  done: number;
  allowance: number;
  isOpen: boolean;
}

export const getQuestProgressFor = (
  quest: QuestScheduleFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date()
): QuestProgress | null => {
  const window = getQuestWindow(quest, date);
  if (!window) return null;
  const done = countCompletionsInWindow(entries, quest.id, userId, window);
  return { done, allowance: window.allowance, isOpen: done < window.allowance };
};

/**
 * True when the hero has a claim waiting for the Game Master inside the window that contains `date`.
 * Pending claims count toward the allowance, so a used-up quest with a pending claim is "pending", not "tamed".
 */
export const hasPendingClaimFor = (
  quest: QuestScheduleFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date()
): boolean => {
  const window = getQuestWindow(quest, date);
  return window ? countPendingInWindow(entries, quest.id, userId, window) > 0 : false;
};

/** True when the hero can still complete this quest on `date`. */
export const isQuestOpenFor = (
  quest: QuestScheduleFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date()
): boolean => getQuestProgressFor(quest, entries, userId, date)?.isOpen ?? false;
