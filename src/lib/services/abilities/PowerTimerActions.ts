/**
 * Timed privileges on the hero (the rules are PowerTimers.ts): start a timer once a cast has paid, end one early,
 * and say time's up when one runs out. Writes the user store's `powerTimers`, books and takes back the OS alert, and
 * posts the notifications; never touches MP.
 */
import type { Ability } from "@/types/abilities";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { cancelAlert, isNativeApp, scheduleAlert, showAlert } from "@/lib/services/notifications/alertBridge";
import debug from "@/lib/utils/debug";
import { expiredTimers, isTimedPower, newTimer, timeUpAlert, timerAlertId, timersOf, type PowerTimer, type PowerTimers } from "./PowerTimers";

const storedTimers = (userId: string): PowerTimers => {
  const hero = useUserStore().users[userId];
  return Object.fromEntries(timersOf(hero).map((timer) => [timer.abilityId, { ...timer }]));
};

const heroNameOf = (userId: string): string => {
  const hero = useUserStore().users[userId];
  return hero?.name?.nick || hero?.name?.first || "A hero";
};

/**
 * Start the Power's timer on the hero (replacing one that already ran out) and book the "time's up" alert in the
 * packaged app. Call it after the cast has paid. Returns the timer, or null for a Power with no timer or no hero.
 */
export const startPowerTimer = (
  ability: Pick<Ability, "id" | "name" | "icon" | "type" | "timerMinutes">,
  userId: string,
  now: Date = new Date()
): PowerTimer | null => {
  const store = useUserStore();
  const hasHero = Boolean(store.users[userId]);
  const isUncastable = !isTimedPower(ability) || !hasHero;
  if (isUncastable) return null;
  const timer = newTimer(ability, now);
  store.setPowerTimers(userId, { ...storedTimers(userId), [ability.id]: timer });
  void scheduleAlert({ ...timeUpAlert(userId, timer), at: new Date(timer.endsAt) }).catch(() => undefined);
  return timer;
};

/**
 * End a running timer before its time (a Game Master, or the hero handing it back). Takes the booked alert back and
 * tells the hero. Returns the timer that was ended, or null when none was running.
 */
export const endPowerTimer = (userId: string, abilityId: string, endedBy = ""): PowerTimer | null => {
  const timers = storedTimers(userId);
  const timer = timers[abilityId];
  if (!timer) return null;
  delete timers[abilityId];
  useUserStore().setPowerTimers(userId, timers);
  void cancelAlert(timerAlertId(userId, abilityId));
  try {
    const isHeroOwnEnd = !endedBy || endedBy === userId;
    useNotificationsStore().push({
      heroId: userId,
      kind: "power-cast",
      title: `${timer.name} ended`,
      body: isHeroOwnEnd ? "You ended it early." : `${heroNameOf(endedBy)} ended it early.`,
      refId: `timer-end:${abilityId}:${timer.startedAt}`,
      link: `/my-abilities/${userId}/`,
    });
  } catch (error) {
    debug.warn("[PowerTimers] could not tell the hero the timer ended", error);
  }
  return timer;
};

/**
 * Say time's up for every timer of the hero that has run out, and take them off the profile. The timers come off
 * first, so a second caller in the same tick finds nothing and nothing is said twice. Returns the timers that ended,
 * for the screen to show; in a browser it also rings the alert (the packaged app rang the one booked at the cast).
 */
export const finishExpiredTimers = (userId: string, now: Date = new Date()): PowerTimer[] => {
  const hero = useUserStore().users[userId];
  const ended = expiredTimers(hero, now);
  const hasNoneEnded = ended.length === 0;
  if (hasNoneEnded) return [];
  const timers = storedTimers(userId);
  ended.forEach((timer) => delete timers[timer.abilityId]);
  useUserStore().setPowerTimers(userId, timers);

  const heroName = heroNameOf(userId);
  for (const timer of ended) {
    if (!isNativeApp()) void showAlert(timeUpAlert(userId, timer)).catch(() => undefined);
    try {
      const notifications = useNotificationsStore();
      const refId = `timer:${timer.abilityId}:${timer.startedAt}`;
      notifications.push({ heroId: userId, kind: "power-cast", title: `Time's up: ${timer.name}`, body: "Your time is over.", refId });
      for (const gm of Object.values(useUserStore().users) as Array<{ id: string; isAdult?: boolean }>) {
        const shouldSkip = gm?.isAdult !== true || gm.id === userId;
        if (shouldSkip) continue;
        notifications.push({ heroId: gm.id, kind: "power-cast", title: `${timer.name} is over`, body: `${heroName}'s time is up.`, refId });
      }
    } catch (error) {
      debug.warn("[PowerTimers] could not post the time's up notifications", error);
    }
  }
  return ended;
};
