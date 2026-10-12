import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format,
  set,
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
  | "timesOfDay"
>;

/** The four parts of a day the calendar tabs (Morn / Noon / Even / Night) and a quest's times speak in. */
export type TimeOfDay = "morning" | "noon" | "evening" | "night";

export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "noon", "evening", "night"];

/** morning 6-11, noon 12-17, evening 18-23, night 0-5 */
export const timeOfDayOfHour = (hour: number): TimeOfDay => {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const isMorning = h >= 6 && h < 12;
  if (isMorning) return "morning";
  const isNoon = h >= 12 && h < 18;
  if (isNoon) return "noon";
  if (h >= 18) return "evening";
  return "night";
};

export const timeOfDayOf = (date: Date): TimeOfDay => timeOfDayOfHour(date.getHours());

/** The quest's own list of times in day order, deduped; empty when it has none (old records, one due time). */
const listedTimesOfDay = (quest: Pick<Achievement, "timesOfDay">): TimeOfDay[] =>
  TIMES_OF_DAY.filter((time) => quest.timesOfDay?.includes(time));

/**
 * The parts of the day a quest belongs to: its `timesOfDay` when it lists any, else the one its `dueByTime`
 * falls in, else none (an untimed quest only shows under the All tab).
 */
export const questTimesOfDay = (quest: Pick<Achievement, "timesOfDay" | "dueByTime">): TimeOfDay[] => {
  const listed = listedTimesOfDay(quest);
  if (listed.length) return listed;
  const due = dueTimeOn(quest.dueByTime, new Date(0));
  return due ? [timeOfDayOf(due)] : [];
};

/** True when the quest belongs under the calendar tab: every quest under "all", an untimed one nowhere else. */
export const questMatchesSegment = (
  quest: Pick<Achievement, "timesOfDay" | "dueByTime">,
  segment: "all" | TimeOfDay
): boolean => segment === "all" || questTimesOfDay(quest).includes(segment);

/** The one centred line a calendar tab shows when it lists no chores. */
export const emptyBoardLine = (segment: "all" | TimeOfDay): string =>
  ({
    all: "No chores today.",
    morning: "No chores this morning.",
    noon: "No chores this afternoon.",
    evening: "No chores this evening.",
    night: "No chores tonight.",
  })[segment] ?? "No chores today.";

/** One of a timed quest's times of day and whether the hero has done it in the current window. */
export interface QuestSlot {
  time: TimeOfDay;
  done: boolean;
}

/**
 * The slots of a quest that lists times of day: completions fill them in day order (the first `progress.done`
 * are done, the rest open), whatever hour the hero actually claimed at. Empty for a quest with no listed
 * times or no window today.
 */
export const slotsFor = (quest: Pick<Achievement, "timesOfDay">, progress: QuestProgress | null): QuestSlot[] => {
  if (!progress) return [];
  return listedTimesOfDay(quest).map((time, index) => ({ time, done: index < progress.done }));
};

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

/**
 * What a hero's equipped items did to their own schedule (see services/quests/ItemEffects.ts). Stored on the
 * profile as `questEffects`; the Game Master's quests are never changed, only how this hero's board reads them.
 */
export interface HeroQuestEffects {
  /** Ice Wand: quest id -> ISO deadline that replaces the quest's due time while it lies ahead of it */
  extendedUntil?: Record<string, string>;
  /** Silver Arrow: quest id -> the day (yyyy-MM-dd) the quest was snoozed on; it is not due that day */
  snoozedOn?: Record<string, string>;
  /** Hook Shot: quest id -> the day (yyyy-MM-dd) a quest that was not due got pulled into */
  pulledInOn?: Record<string, string>;
  /** Chronos' Clock: every deadline stands still between these two moments */
  pause?: { from: string; until: string };
  /** X's Invisibility: no random encounters until this moment */
  noEncountersUntil?: string;
  /** Tesla's Bolt: claims skip the approval queue until this moment (only when the Game Master allows a trusted hour) */
  trustedUntil?: string;
  /** Night's Light: the bedtime night (yyyy-MM-dd it began on) that is lifted */
  bedtimeLiftedOn?: string;
  /** Gale's Wind: the board shows no chores until this moment */
  dayOffUntil?: string;
}

/** The calendar day a date falls on, the key the snooze and pull-in maps use. */
export const dayKeyOf = (date: Date): string => format(date, "yyyy-MM-dd");

/** One day's window: midnight to midnight, one completion. */
export const dayWindowOf = (date: Date): QuestWindow => {
  const start = startOfDay(date);
  return { start, end: addDays(start, 1), allowance: 1 };
};

/**
 * The quest's due time on `date`. The time picker stores a bare "HH:mm" or a full ISO stamp; only the clock
 * matters. Unset, unreadable and out-of-range times give null: such a quest is never late.
 */
export const dueTimeOn = (dueByTime: string | undefined, date: Date): Date | null => {
  const value = dueByTime || "";
  const clock = /^(\d{1,2}):(\d{2})/.exec(value);
  const stamp = !clock && /[T-]/.test(value) ? parseDate(value) : null;
  const hours = clock ? Number(clock[1]) : stamp?.getHours();
  const minutes = clock ? Number(clock[2]) : stamp?.getMinutes();
  const isUnusableClock = hours === undefined || minutes === undefined || !(hours < 24 && minutes < 60);
  if (isUnusableClock) return null;
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
};

/** True while Tesla's Bolt keeps the trusted hour, so claims are paid without the Game Master's approval. */
export const isTrustedHour = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const until = parseDate(effects?.trustedUntil);
  return Boolean(until && now < until);
};

/** True while Gale's Wind holds the day off and the board hides every chore. */
export const isDayOff = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const until = parseDate(effects?.dayOffUntil);
  return Boolean(until && now < until);
};

/** True while Chronos' Clock holds every deadline still. */
export const isSchedulePaused = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const from = parseDate(effects?.pause?.from);
  const until = parseDate(effects?.pause?.until);
  return Boolean(from && until && from <= now && now < until);
};

/**
 * When the quest is late on `date`, after the hero's items: the Ice Wand's extension replaces the due time
 * while it lies ahead of it, and a pause that began before the deadline pushes it back by the time paused.
 * Null when the quest has no due time and no extension.
 */
export const effectiveDeadline = (
  quest: Pick<Achievement, "id" | "dueByTime">,
  effects: HeroQuestEffects | undefined,
  date: Date
): Date | null => {
  let deadline = dueTimeOn(quest.dueByTime, date);
  const extended = parseDate(effects?.extendedUntil?.[quest.id]);
  const hasLaterExtension = extended && (!deadline || extended > deadline);
  if (hasLaterExtension) deadline = extended;
  if (!deadline) return null;
  const from = parseDate(effects?.pause?.from);
  const until = parseDate(effects?.pause?.until);
  const hasPauseBeforeDeadline = from && until && until > from && from <= deadline;
  if (hasPauseBeforeDeadline) {
    deadline = new Date(deadline.getTime() + (until.getTime() - from.getTime()));
  }
  return deadline;
};

/** True when the quest's deadline on `now`'s day has passed and the clock is not paused. */
export const isQuestOverdue = (
  quest: Pick<Achievement, "id" | "dueByTime">,
  effects: HeroQuestEffects | undefined,
  now: Date
): boolean => {
  if (isSchedulePaused(effects, now)) return false;
  const deadline = effectiveDeadline(quest, effects, now);
  return Boolean(deadline && now > deadline);
};

export const isQuestActiveOn = (quest: QuestScheduleFields, date: Date): boolean => {
  const day = startOfDay(date);
  const starts = parseDate(quest.startsOn);
  const isBeforeStart = starts && startOfDay(starts) > day;
  if (isBeforeStart) return false;
  const ends = parseDate(quest.endsOn);
  const isPastEnd = ends && startOfDay(ends) < day;
  if (isPastEnd) return false;
  return true;
};

const calculateUnitDiff = (unit: "day" | "month" | "year", day: Date, anchor: Date): number => {
  if (unit === "day") return differenceInCalendarDays(day, anchor);
  if (unit === "month") return differenceInCalendarMonths(day, anchor);
  return differenceInCalendarYears(day, anchor);
};

const UNIT_ADD_FUNCTIONS = {
  day: addDays,
  month: addMonths,
  year: addYears,
} as const;

const alignedStart = (anchor: Date, day: Date, span: number, unit: "day" | "month" | "year"): Date => {
  const diff = calculateUnitDiff(unit, day, anchor);
  let steps = Math.floor(diff / span);
  const add = UNIT_ADD_FUNCTIONS[unit] ?? addYears;
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
      const isDueOnListedDay = listedDays.length > 0 && isListedDay && !quest.showDailyUntilComplete;
      if (isDueOnListedDay) {
        return { start: day, end: addDays(day, 1), allowance: 1 };
      }
      const isNotDueToday = listedDays.length > 0 && !isListedDay && !quest.showDailyUntilComplete;
      if (isNotDueToday) return null;
      const start = alignedStart(anchor, day, 7, "day");
      return { start, end: addDays(start, 7), allowance: Math.max(1, listedDays.length) };
    }
    case "custom":
      return customWindow(quest, day, anchor);
    default:
      // A daily quest that lists times of day is done once for each of them; one due time stays one completion
      return { start: day, end: addDays(day, 1), allowance: Math.max(1, listedTimesOfDay(quest).length) };
  }
};

/**
 * The quest's window on `date` as this hero sees it: gone on the day it was snoozed (Silver Arrow), and a
 * one-day window on a day it was pulled into although it was not due (Hook Shot).
 */
export const getEffectiveWindow = (
  quest: QuestScheduleFields,
  effects: HeroQuestEffects | undefined,
  date: Date
): QuestWindow | null => {
  const key = dayKeyOf(date);
  if (effects?.snoozedOn?.[quest.id] === key) return null;
  const window = getQuestWindow(quest, date);
  if (window) return window;
  return effects?.pulledInOn?.[quest.id] === key && isQuestActiveOn(quest, date) ? dayWindowOf(date) : null;
};

const countsTowardAllowance = (entry: QuestLogEntry) => entry.status !== "rejected";

/** The hero's log entry for this quest, completed inside the window (whatever its approval status). */
const isEntryInWindow = (entry: QuestLogEntry, questId: string, userId: string, window: QuestWindow): boolean => {
  const isUnrelatedEntry = entry.questId !== questId || entry.userId !== userId;
  if (isUnrelatedEntry) return false;
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
  date: Date = new Date(),
  effects?: HeroQuestEffects
): QuestProgress | null => {
  const window = getEffectiveWindow(quest, effects, date);
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
  date: Date = new Date(),
  effects?: HeroQuestEffects
): boolean => {
  const window = getEffectiveWindow(quest, effects, date);
  return window ? countPendingInWindow(entries, quest.id, userId, window) > 0 : false;
};

/** True when the hero can still complete this quest on `date`. */
export const isQuestOpenFor = (
  quest: QuestScheduleFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date(),
  effects?: HeroQuestEffects
): boolean => getQuestProgressFor(quest, entries, userId, date, effects)?.isOpen ?? false;
