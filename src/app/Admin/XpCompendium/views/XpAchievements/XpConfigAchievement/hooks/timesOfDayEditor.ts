import { TIMES_OF_DAY, type TimeOfDay } from "@/lib/engine/quests/QuestSchedule";

/**
 * Pure rules for the Game Master's "Times of day" chips on a quest's Schedule tab. No Vue, no storage, so the
 * schedule tab, the summary card and the form's save step share one set of labels and one idea of "empty".
 */

/** The short names the calendar tabs and the chips use */
export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morn",
  noon: "Noon",
  evening: "Even",
  night: "Night",
};

export const TIME_OF_DAY_ICONS: Record<TimeOfDay, string> = {
  morning: "fa-sunrise",
  noon: "fa-sun",
  evening: "fa-sunset",
  night: "fa-moon-stars",
};

/** A list of times in day order, deduped, with anything that is not a time of day dropped. */
export const orderedTimesOfDay = (times?: readonly string[] | null): TimeOfDay[] =>
  TIMES_OF_DAY.filter((time) => times?.includes(time));

/** The list after a chip is tapped: the time goes in or out, and the list stays in day order. */
export const toggleTimeOfDay = (current: readonly string[] | undefined | null, time: TimeOfDay): TimeOfDay[] => {
  const picked = new Set(orderedTimesOfDay(current));
  if (picked.has(time)) picked.delete(time);
  else picked.add(time);
  return TIMES_OF_DAY.filter((t) => picked.has(t));
};

/** "Morn · Night" for the summary card; an empty string when the quest picks no times. */
export const timesOfDayLine = (times?: readonly string[] | null): string =>
  orderedTimesOfDay(times)
    .map((time) => TIME_OF_DAY_LABELS[time])
    .join(" · ");

/**
 * The quest as it is stored: its times in day order, or no `timesOfDay` key at all when it picks none
 * (like a seeded quest without times), so an old record and a cleared one look the same. Returns a copy
 * and leaves the form's own object alone.
 */
export const withoutEmptyTimes = <T extends object>(quest: T): T => {
  const { timesOfDay, ...rest } = quest as T & { timesOfDay?: readonly string[] };
  const times = orderedTimesOfDay(timesOfDay);
  return (times.length ? { ...rest, timesOfDay: times } : rest) as T;
};
