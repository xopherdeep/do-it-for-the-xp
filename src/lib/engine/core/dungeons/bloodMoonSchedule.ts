/**
 * When the blood moon rises next (section 5 of docs/Temple-Generation-Contract.md): pure helpers over the
 * dates on a hero's temple progress record, for the Game Master's panel and for TempleSystem, which
 * re-schedules a weekly moon once a due one has fired.
 */
import type { TempleProgressEntry } from '@/lib/databases/TempleProgressDb';

/** The cadences a Game Master can put a temple's blood moon on. */
export type BloodMoonCadence = 'weekly';

/** What the helpers read off a progress record. */
export type BloodMoonSchedule = Pick<TempleProgressEntry, 'bloodMoonAt' | 'bloodMoonEvery'>;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** `fromISO` as a Date, or `fallback` for anything that is not a date. */
const parseOr = (fromISO: string | undefined, fallback: Date): Date => {
  const at = fromISO ? Date.parse(fromISO) : NaN;
  return Number.isNaN(at) ? new Date(fallback.getTime()) : new Date(at);
};

/**
 * The first time a week (or a whole number of weeks) after `fromISO` that is still to come: the same
 * wall-clock time on the same weekday, counted in calendar days so a change of daylight-saving time does
 * not move the hour. From a time in the future, that time itself; from one that has passed (or from now),
 * the next weekly occurrence after `now`. An unreadable `fromISO` counts from `now`.
 */
export const nextWeekly = (fromISO: string, now: Date = new Date()): string => {
  const next = parseOr(fromISO, now);
  // A long gap (a hero away for months) is skipped in whole weeks before the day-by-day loop
  const behindBy = now.getTime() - next.getTime();
  const isWeeksBehind = behindBy > 7 * DAY_MS;
  if (isWeeksBehind) next.setDate(next.getDate() + 7 * Math.floor(behindBy / (7 * DAY_MS)));
  while (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  return next.toISOString();
};

/** "in 6 days", "in 3 hours", "in 20 minutes", "in a moment": the wait until `atISO` from `now`. */
export const describeWait = (atISO: string, now: Date = new Date()): string => {
  const wait = Date.parse(atISO) - now.getTime();
  const isWithinAMoment = Number.isNaN(wait) || wait < MINUTE_MS;
  if (isWithinAMoment) return 'in a moment';
  const unit = (count: number, word: string) => `in ${count} ${word}${count === 1 ? '' : 's'}`;
  const isDaysAway = wait >= DAY_MS;
  if (isDaysAway) return unit(Math.round(wait / DAY_MS), 'day');
  const isHoursAway = wait >= HOUR_MS;
  if (isHoursAway) return unit(Math.round(wait / HOUR_MS), 'hour');
  return unit(Math.round(wait / MINUTE_MS), 'minute');
};

/** The moon's date as the panel prints it: "Sat, Oct 17, 7:00 PM" in the viewer's time zone. */
export const formatMoonDate = (atISO: string): string => {
  const at = new Date(atISO);
  if (Number.isNaN(at.getTime())) return atISO;
  return at.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/**
 * One line on the next blood moon of a hero's temple: when it rises, that it is due (it fires at their
 * next entry), or that none is scheduled; "then weekly" when the Game Master set the cadence.
 */
export const describeNextMoon = (record: BloodMoonSchedule | null | undefined, now: Date = new Date()): string => {
  const weekly = record?.bloodMoonEvery === 'weekly';
  const at = record?.bloodMoonAt ? Date.parse(record.bloodMoonAt) : NaN;
  if (Number.isNaN(at)) return weekly ? 'Weekly, waiting for a first date' : 'No blood moon scheduled';

  const then = weekly ? ', then weekly' : '';
  const isDue = at <= now.getTime();
  if (isDue) return `Due: rises when the hero next enters (was ${formatMoonDate(record!.bloodMoonAt!)})${then}`;
  return `Rises ${describeWait(record!.bloodMoonAt!, now)} (${formatMoonDate(record!.bloodMoonAt!)})${then}`;
};
