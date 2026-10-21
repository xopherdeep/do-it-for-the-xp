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
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
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
 * A shared quest (Team Effort, Rat Race) counts every assignee's completions in the window; the rest count the
 * hero's own. A quest is due at its due time on its deadline day (deadlineDayOf): a window's last day.
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

/** What the schedule rules read off a quest; a record that leaves its schedule out reads as a daily quest. */
export type QuestScheduleInput = Pick<QuestScheduleFields, "id"> & Partial<QuestScheduleFields>;

/** What the due-date rule reads: the schedule and the due time. */
export type QuestDeadlineFields = QuestScheduleInput & Pick<Achievement, "id" | "dueByTime">;

/** Who a quest is for: its assignment type and its assignees. */
export type QuestPartyFields = Partial<Pick<Achievement, "type" | "assignee">>;

/**
 * Team Effort (`collaborate`) and Rat Race (`compete`) are shared: one assignee's clear fills the window for every
 * assignee, and only the hero who did it is paid. Solo, Rotate and Open Bounty quests count per hero.
 */
export const SHARED_QUEST_TYPES: readonly string[] = ["collaborate", "compete"];

export const isSharedQuest = (quest: QuestPartyFields): boolean => SHARED_QUEST_TYPES.includes(String(quest.type ?? ""));

/** The heroes whose completions fill this hero's window: every assignee of a shared quest, else the hero alone. */
export const countedHeroesOf = (quest: QuestPartyFields, userId: string): string[] => {
  const hero = String(userId);
  if (!isSharedQuest(quest)) return [hero];
  return [...new Set([hero, ...(quest.assignee ?? []).map(String)])];
};

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
  const isEvening = h >= 18;
  if (isEvening) return "evening";
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
  const hasListedTimes = listed.length > 0;
  if (hasListedTimes) return listed;
  const due = dueTimeOn(quest.dueByTime, new Date(0));
  return due ? [timeOfDayOf(due)] : [];
};

/** True when the quest belongs under the calendar tab: every quest under "all", an untimed one nowhere else. */
export const questMatchesSegment = (
  quest: Pick<Achievement, "timesOfDay" | "dueByTime">,
  segment: "all" | TimeOfDay
): boolean => segment === "all" || questTimesOfDay(quest).includes(segment);

/** The one centred line a calendar tab shows when it lists no chores. */
export const emptyBoardLine = (segment: "all" | TimeOfDay, voice: Voice = "adventure"): string =>
  copyFor(`calendar.empty.${segment}`, voice);

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
 * What a hero's real-life Powers did to their own schedule (services/abilities/PowerBoardEffects.ts). Stored on the
 * profile as `questEffects`; the Game Master's quests are never changed, only how this hero's board reads them.
 * Items no longer write any of it (equipment rules, 2026-10-13); the fields an old save may still hold stay
 * readable, and every one of them is timed, so it runs out by itself.
 */
export interface HeroQuestEffects {
  /** The Extra Time Power: quest id -> ISO deadline that replaces the quest's due time while it lies ahead of it */
  extendedUntil?: Record<string, string>;
  /**
   * The Snooze Power (old saves: the Silver Arrow): quest id -> the day (yyyy-MM-dd) the quest was snoozed on; it is
   * not due that day, and a once quest snoozed on its due day is due the day after (deadlineDayOf)
   */
  snoozedOn?: Record<string, string>;
  /** Old saves only (the Hook Shot used to write it): quest id -> the day (yyyy-MM-dd) a quest that was not due got pulled into */
  pulledInOn?: Record<string, string>;
  /** Old saves only (Chronos' Clock used to write it): every deadline stands still between these two moments */
  pause?: { from: string; until: string };
  /** The Quiet Day Power (old saves: X's Invisibility): no random encounters until this moment */
  noEncountersUntil?: string;
  /** The Trusted Hour Power: claims skip the approval queue until this moment (only when the Game Master allows a trusted hour) */
  trustedUntil?: string;
  /** Old saves only (Night's Light used to write it): the bedtime night (yyyy-MM-dd it began on) that is lifted */
  bedtimeLiftedOn?: string;
  /** Old saves only (Gale's Wind used to write it): the board shows no chores until this moment */
  dayOffUntil?: string;
  /**
   * Temple floor ("wind-temple@2F") -> ISO time its sleeping beasts woke for this hero; written once per floor by
   * wakeOnEntry.ts and Quick Start (quickStartTemple.ts). A bare temple id is an older wake, the entrance floor's.
   */
  templesWokenAt?: Record<string, string>;
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

/** True while the Trusted Hour Power keeps the trusted hour, so claims are paid without the Game Master's approval. */
export const isTrustedHour = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const until = parseDate(effects?.trustedUntil);
  return Boolean(until && now < until);
};

/** True while an old saved day off (nothing writes one now) holds, and the board hides every chore. */
export const isDayOff = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const until = parseDate(effects?.dayOffUntil);
  return Boolean(until && now < until);
};

/** True while an old saved pause (nothing writes one now) holds every deadline still. */
export const isSchedulePaused = (effects: HeroQuestEffects | undefined, now: Date): boolean => {
  const from = parseDate(effects?.pause?.from);
  const until = parseDate(effects?.pause?.until);
  return Boolean(from && until && from <= now && now < until);
};

/**
 * The calendar day the quest's deadline falls on, seen from `date`. This is the one due-date rule: the board's
 * `overdue`, the list, the due-soon and overdue alerts and the Extra Time Power all read it through effectiveDeadline.
 * - once: the day it starts (its only due day), else `date`'s day; snoozed on that day (the Snooze Power, or an
 *   old save's Silver Arrow), the day after it, since the snooze only hides the day it was cast on;
 * - a window that spans several days (weekly without listed weekdays, custom periods): the window's last day,
 *   or the day the quest ends when that comes first;
 * - a one-day window (daily, a listed weekday, an old saved pull-in) or no window at all: `date`'s day.
 */
export const deadlineDayOf = (quest: QuestDeadlineFields, effects: HeroQuestEffects | undefined, date: Date): Date => {
  const day = startOfDay(date);
  const isOneOff = quest.basicSchedule === "once";
  if (isOneOff) {
    const starts = parseDate(quest.startsOn);
    const dueDay = starts ? startOfDay(starts) : day;
    const isSnoozedOnDueDay = effects?.snoozedOn?.[quest.id] === dayKeyOf(dueDay);
    return isSnoozedOnDueDay ? addDays(dueDay, 1) : dueDay;
  }
  const window = getEffectiveWindow(quest, effects, date);
  if (!window) return day;
  const lastDay = addDays(window.end, -1);
  const ends = parseDate(quest.endsOn);
  const endsBeforeLastDay = ends && startOfDay(ends) < lastDay;
  return endsBeforeLastDay ? startOfDay(ends) : lastDay;
};

/**
 * When the quest is late, seen from `date`, after the hero's Powers: the due time on the deadline day
 * (deadlineDayOf), then the Extra Time Power's extension replaces it while it lies ahead of it, and a pause that
 * began before the deadline pushes it back by the time paused (only old saves carry one: Chronos' Clock wrote it).
 * Null when the quest has no due time: it is never late, and an extension an old save holds on it is ignored.
 */
export const effectiveDeadline = (
  quest: QuestDeadlineFields,
  effects: HeroQuestEffects | undefined,
  date: Date
): Date | null => {
  let deadline = dueTimeOn(quest.dueByTime, deadlineDayOf(quest, effects, date));
  if (!deadline) return null;
  const extended = parseDate(effects?.extendedUntil?.[quest.id]);
  const hasLaterExtension = extended && extended > deadline;
  if (hasLaterExtension) deadline = extended;
  const from = parseDate(effects?.pause?.from);
  const until = parseDate(effects?.pause?.until);
  const hasPauseBeforeDeadline = from && until && until > from && from <= deadline;
  if (hasPauseBeforeDeadline) {
    deadline = new Date(deadline.getTime() + (until.getTime() - from.getTime()));
  }
  return deadline;
};

/** True when the quest's deadline (effectiveDeadline, seen from `now`) has passed and the clock is not paused. */
export const isQuestOverdue = (
  quest: QuestDeadlineFields,
  effects: HeroQuestEffects | undefined,
  now: Date
): boolean => {
  if (isSchedulePaused(effects, now)) return false;
  const deadline = effectiveDeadline(quest, effects, now);
  return Boolean(deadline && now > deadline);
};

export const isQuestActiveOn = (quest: QuestScheduleInput, date: Date): boolean => {
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
  const isInDays = unit === "day";
  if (isInDays) return differenceInCalendarDays(day, anchor);
  const isInMonths = unit === "month";
  if (isInMonths) return differenceInCalendarMonths(day, anchor);
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

const customWindow = (quest: QuestScheduleInput, day: Date, anchor: Date): QuestWindow => {
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
export const getQuestWindow = (quest: QuestScheduleInput, date: Date): QuestWindow | null => {
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
 * The quest's window on `date` as this hero sees it: gone on the day it was snoozed (the Snooze Power), and a
 * one-day window on a day it was pulled into although it was not due (an old saved pull-in).
 */
export const getEffectiveWindow = (
  quest: QuestScheduleInput,
  effects: HeroQuestEffects | undefined,
  date: Date
): QuestWindow | null => {
  const key = dayKeyOf(date);
  const isSnoozedToday = effects?.snoozedOn?.[quest.id] === key;
  if (isSnoozedToday) return null;
  const window = getQuestWindow(quest, date);
  if (window) return window;
  return effects?.pulledInOn?.[quest.id] === key && isQuestActiveOn(quest, date) ? dayWindowOf(date) : null;
};

const countsTowardAllowance = (entry: QuestLogEntry) => entry.status !== "rejected";

/** One hero's id, or the heroes a shared quest counts (countedHeroesOf). */
type HeroIds = string | readonly string[];

const heroIdsOf = (heroes: HeroIds): string[] => (typeof heroes === "object" ? [...heroes] : [heroes]).map(String);

/** A log entry for this quest by one of the heroes, completed inside the window (whatever its approval status). */
const isEntryInWindow = (entry: QuestLogEntry, questId: string, heroes: readonly string[], window: QuestWindow): boolean => {
  const isUnrelatedEntry = entry.questId !== questId || !heroes.includes(String(entry.userId));
  if (isUnrelatedEntry) return false;
  const completedAt = new Date(entry.completedAt);
  return completedAt >= window.start && completedAt < window.end;
};

export const countCompletionsInWindow = (
  entries: QuestLogEntry[],
  questId: string,
  userId: HeroIds,
  window: QuestWindow
): number => {
  const heroes = heroIdsOf(userId);
  return entries.filter((entry) => countsTowardAllowance(entry) && isEntryInWindow(entry, questId, heroes, window)).length;
};

/** Completions in the window that still wait for the Game Master to approve or reject them. */
export const countPendingInWindow = (
  entries: QuestLogEntry[],
  questId: string,
  userId: HeroIds,
  window: QuestWindow
): number => {
  const heroes = heroIdsOf(userId);
  return entries.filter((entry) => entry.status === "pending" && isEntryInWindow(entry, questId, heroes, window)).length;
};

export interface QuestProgress {
  done: number;
  allowance: number;
  isOpen: boolean;
}

/**
 * How far the hero is through the window that contains `date`. A shared quest (isSharedQuest) counts every
 * assignee's completions, so one hero's clear fills it for all of them; every other quest counts the hero's own.
 */
export const getQuestProgressFor = (
  quest: QuestScheduleFields & QuestPartyFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date(),
  effects?: HeroQuestEffects
): QuestProgress | null => {
  const window = getEffectiveWindow(quest, effects, date);
  if (!window) return null;
  const done = countCompletionsInWindow(entries, quest.id, countedHeroesOf(quest, userId), window);
  return { done, allowance: window.allowance, isOpen: done < window.allowance };
};

/**
 * True when the hero (or, for a shared quest, any assignee) has a claim waiting for the Game Master inside the
 * window that contains `date`. Pending claims count toward the allowance, so a used-up quest with a pending
 * claim is "pending", not "tamed".
 */
export const hasPendingClaimFor = (
  quest: QuestScheduleFields & QuestPartyFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date(),
  effects?: HeroQuestEffects
): boolean => {
  const window = getEffectiveWindow(quest, effects, date);
  return window ? countPendingInWindow(entries, quest.id, countedHeroesOf(quest, userId), window) > 0 : false;
};

/**
 * The heroes whose completions count toward this hero's window, in the order they did them: the hero alone
 * (or nobody) for an individual quest, any of the assignees for a shared one. The list shows "Done by Mia" from it.
 */
export const questCompletersFor = (
  quest: QuestScheduleFields & QuestPartyFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date(),
  effects?: HeroQuestEffects
): string[] => {
  const window = getEffectiveWindow(quest, effects, date);
  if (!window) return [];
  const heroes = countedHeroesOf(quest, userId);
  const counted = entries
    .filter((entry) => countsTowardAllowance(entry) && isEntryInWindow(entry, quest.id, heroes, window))
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  return [...new Set(counted.map((entry) => String(entry.userId)))];
};

/** True when the hero can still complete this quest on `date`. */
export const isQuestOpenFor = (
  quest: QuestScheduleFields & QuestPartyFields,
  entries: QuestLogEntry[],
  userId: string,
  date: Date = new Date(),
  effects?: HeroQuestEffects
): boolean => getQuestProgressFor(quest, entries, userId, date, effects)?.isOpen ?? false;
