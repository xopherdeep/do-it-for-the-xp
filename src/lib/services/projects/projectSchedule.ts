/**
 * Project Towers schedule math: a project's phases (floors) spread over its dates, the same spread again when the Game
 * Master extends the end, and the earliest end a project can have. Pure date math on local "YYYY-MM-DD" days.
 */
import { addDays, differenceInCalendarDays } from "date-fns";
import { dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";

/** One phase's days, both ends inclusive */
export interface PhaseWindow {
  phaseId: string;
  opensOn: string;
  dueOn: string;
}

/** The roof floor above the last phase; its window is the last phase's window */
export const ROOF_PHASE_ID = "roof";

/** Days between two days (negative if earlier), via differenceInCalendarDays: millisecond subtraction breaks over a daylight saving change */
export const daysBetween = (from: string, to: string): number => differenceInCalendarDays(parseLocalDate(to), parseLocalDate(from));

/** Round half up, after shaving off the float error a running share sum carries (2.4999999999999996 is a half) */
const roundSettled = (value: number): number => Math.round(Number(value.toFixed(6)));

/** Each phase's day count: the cumulative share times the total days, rounded, then every phase made at least a day */
const spreadDays = (shares: readonly number[], totalDays: number): number[] => {
  const weights = shares.map((share) => Math.max(0, share));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const useEven = sum <= 0;
  const reach = (index: number): number => {
    const isLastPhase = index === weights.length - 1;
    if (isLastPhase) return totalDays;
    const part = useEven ? index + 1 : weights.slice(0, index + 1).reduce((total, weight) => total + weight, 0);
    return roundSettled((part / (useEven ? weights.length : sum)) * totalDays);
  };
  const days = weights.map((_, index) => reach(index) - (index === 0 ? 0 : reach(index - 1)));
  return giveEveryPhaseADay(days);
};

/** A phase left with no day takes one from the biggest phase (the earlier one on a tie); the total stays put */
const giveEveryPhaseADay = (days: number[]): number[] => {
  const spread = [...days];
  for (let empty = spread.indexOf(0); empty !== -1; empty = spread.indexOf(0)) {
    spread[spread.indexOf(Math.max(...spread))] -= 1;
    spread[empty] += 1;
  }
  return spread;
};

/** Windows laid end to end from `startOn`, one per day count */
const windowsFrom = (phaseIds: readonly string[], days: readonly number[], startOn: string): PhaseWindow[] => {
  let opens = parseLocalDate(startOn);
  return phaseIds.map((phaseId, index) => {
    const dueOn = dateKey(addDays(opens, days[index] - 1));
    const window = { phaseId, opensOn: dateKey(opens), dueOn };
    opens = addDays(opens, days[index]);
    return window;
  });
};

const assertRoomForPhases = (phaseCount: number, totalDays: number, what: string): void => {
  const isTooShort = totalDays < phaseCount;
  if (isTooShort) throw new RangeError(`${what} leaves ${totalDays} day(s) for ${phaseCount} phase(s)`);
};

/**
 * The phases' windows from `startOn` to `endOn` (both counted), each phase's days following its share. Throws a
 * RangeError when the dates leave fewer days than phases.
 */
export const phaseWindows = (phases: readonly { id: string; share: number }[], startOn: string, endOn: string): PhaseWindow[] => {
  const hasNoPhases = phases.length === 0;
  if (hasNoPhases) return [];
  const totalDays = daysBetween(startOn, endOn) + 1;
  assertRoomForPhases(phases.length, totalDays, `${startOn} to ${endOn}`);
  const days = spreadDays(phases.map((phase) => phase.share), totalDays);
  return windowsFrom(phases.map((phase) => phase.id), days, startOn);
};

/** The earliest end for a project of `phaseCount` phases that starts on `startOn`: a day per phase */
export const minimumEndOn = (phaseCount: number, startOn: string): string =>
  dateKey(addDays(parseLocalDate(startOn), Math.max(phaseCount - 1, 0)));

/**
 * The windows after the Game Master moves the end to `newEndOn`: the cleared phases keep theirs, the rest are spread
 * again from `today` to the new end by their own shares. Throws a RangeError when the new end is before today or leaves
 * fewer days than uncleared phases.
 */
export const extendWindows = (
  windows: readonly PhaseWindow[],
  shares: Readonly<Record<string, number>>,
  clearedIds: ReadonlySet<string>,
  today: string,
  newEndOn: string
): PhaseWindow[] => {
  const totalDays = daysBetween(today, newEndOn) + 1;
  const isBeforeToday = totalDays < 1;
  if (isBeforeToday) throw new RangeError(`The new end ${newEndOn} is before ${today}`);
  const open = windows.filter((window) => !clearedIds.has(window.phaseId));
  assertRoomForPhases(open.length, totalDays, `${today} to ${newEndOn}`);
  const spread = phaseWindows(open.map((window) => ({ id: window.phaseId, share: shares[window.phaseId] ?? 0 })), today, newEndOn);
  const respread = new Map(spread.map((window) => [window.phaseId, window]));
  return windows.map((window) => respread.get(window.phaseId) ?? { ...window });
};
