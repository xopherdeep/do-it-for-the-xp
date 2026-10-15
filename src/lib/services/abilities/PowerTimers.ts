/**
 * Timed privileges: a real-life Power with minutes on its clock (`timerMinutes`, like 30 minutes of video games).
 * Casting it pays the MP as usual (AbilityService.useAbility) and then starts a timer stored on the hero's profile
 * (`powerTimers`, keyed by Power id), so the countdown survives a reload and shows on any screen. When the clock
 * runs out the game says time is up: a sound and a line on screen, the phone alert booked at the cast (the packaged
 * app) or rung by the live tick (a browser), and a notification for the hero and every Game Master.
 *
 * It is an honor-system timer: nothing locks a device. One timer per Power at a time (a running Power cannot be cast
 * again until it ends), and a Game Master can end one early from the dashboard.
 *
 * This module is the pure part (minutes, running, expired, the countdown label): it takes the hero and `now`. The
 * actions that write the user store and talk to the alert bridge are PowerTimerActions.ts; neither touches MP.
 */
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/types/abilities";

export interface PowerTimer {
  abilityId: string;
  /** The Power's name when it was cast, for the countdown and the "time's up" line */
  name: string;
  /** The Power's icon (Font Awesome name), for the countdown chip */
  icon?: string;
  /** ISO */
  startedAt: string;
  /** ISO */
  endsAt: string;
}

/** Power id to its running timer, as the hero profile keeps them */
export type PowerTimers = Record<string, PowerTimer>;

/** The minutes a new timed privilege starts with in the Game Master's editor */
export const DEFAULT_TIMER_MINUTES = 30;
/** The longest a timer runs: one day */
export const MAX_TIMER_MINUTES = 24 * 60;

const MINUTE = 60_000;

/** The minutes on the Power's clock: 0 for a Power with no timer (in-game spells never have one). */
export const timerMinutesOf = (ability: Pick<Ability, "type" | "timerMinutes"> | null | undefined): number => {
  const isRealLife = ability?.type === AbilityType.RealLife;
  if (!isRealLife) return 0;
  const minutes = Math.round(Number(ability?.timerMinutes) || 0);
  return Math.min(Math.max(minutes, 0), MAX_TIMER_MINUTES);
};

/** True when casting the Power starts a timer */
export const isTimedPower = (ability: Pick<Ability, "type" | "timerMinutes"> | null | undefined): boolean =>
  timerMinutesOf(ability) > 0;

const endsAtMs = (timer: PowerTimer): number => new Date(timer.endsAt).getTime();

const isTimer = (value: unknown): value is PowerTimer => {
  const timer = value as PowerTimer | null;
  return Boolean(timer?.abilityId) && Number.isFinite(endsAtMs(timer as PowerTimer));
};

/** Every timer on the hero's profile, running or run out; bad records are left out */
export const timersOf = (hero: { powerTimers?: unknown } | null | undefined): PowerTimer[] =>
  Object.values((hero?.powerTimers ?? {}) as Record<string, unknown>).filter(isTimer);

/** The hero's running timers, the one ending soonest first */
export const runningTimers = (hero: { powerTimers?: unknown } | null | undefined, now: Date): PowerTimer[] =>
  timersOf(hero)
    .filter((timer) => endsAtMs(timer) > now.getTime())
    .sort((a, b) => endsAtMs(a) - endsAtMs(b));

/** The timers whose clock has run out but that are still on the profile (time's up has not been said yet) */
export const expiredTimers = (hero: { powerTimers?: unknown } | null | undefined, now: Date): PowerTimer[] =>
  timersOf(hero).filter((timer) => endsAtMs(timer) <= now.getTime());

/** The running timer of one Power, else null */
export const runningTimerOf = (
  hero: { powerTimers?: unknown } | null | undefined,
  abilityId: string,
  now: Date
): PowerTimer | null => runningTimers(hero, now).find((timer) => timer.abilityId === abilityId) ?? null;

/** Milliseconds left on the clock, never below 0 */
export const msLeft = (timer: PowerTimer, now: Date): number => Math.max(0, endsAtMs(timer) - now.getTime());

/** "29:59", or "1:02:03" past an hour; a part-second left rounds up so the clock reads 0:00 only at the end */
export const countdownLabel = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  const isPastAnHour = hours > 0;
  if (isPastAnHour) return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
  return `${minutes}:${seconds}`;
};

/** "30 min", "1 hr", "1 hr 30 min": how long a timed Power lasts, for its row */
export const durationLabel = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

/** Why the Power cannot be cast right now because its timer is still running, else null. */
export const powerTimerBlocked = (
  ability: Pick<Ability, "id" | "name" | "type" | "timerMinutes">,
  hero: { powerTimers?: unknown } | null | undefined,
  now: Date
): string | null => {
  if (!isTimedPower(ability)) return null;
  const running = runningTimerOf(hero, ability.id, now);
  return running ? `${ability.name} is already running · ${countdownLabel(msLeft(running, now))} left.` : null;
};

/** A new timer for the Power, starting `now` */
export const newTimer = (ability: Pick<Ability, "id" | "name" | "icon" | "type" | "timerMinutes">, now: Date): PowerTimer => ({
  abilityId: ability.id,
  name: ability.name,
  ...(ability.icon ? { icon: ability.icon } : {}),
  startedAt: now.toISOString(),
  endsAt: new Date(now.getTime() + timerMinutesOf(ability) * MINUTE).toISOString(),
});

/**
 * The OS alert id for one hero's timer of one Power: the same pair always gets the same id, so a new cast replaces
 * the alert booked for the old one and ending early takes the right one back. Ids 7100 to 7999 (AMBUSH and
 * POWER_CAST sit below).
 */
export const timerAlertId = (userId: string, abilityId: string): number => {
  let hash = 0;
  for (const char of `${userId}:${abilityId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 7100 + (hash % 900);
};

/** The "time's up" OS alert of one hero's timer */
export const timeUpAlert = (userId: string, timer: PowerTimer) => ({
  id: timerAlertId(userId, timer.abilityId),
  title: `Time's up: ${timer.name}`,
  body: `Your ${timer.name} time is over.`,
});
