import type { TurnState } from "./heroTurn";

/**
 * Which heroes a device runs its clocks for under Family Sync (spec section 5): a late penalty is charged once, a reminder
 * rings and an ambush fires on the phone in the hero's hand, never on the family's other devices. Pure: it reads a view of
 * the sync store and nothing else, so the guards and watches that ask it need not import the store's graph to be tested.
 */

/** What the late-penalty watch reads of Family Sync: whether it is on, and whether this device holds a hero's turn (the sync store fits). */
export interface WatchTurns {
  isOn: boolean;
  holds(heroId: string): boolean;
}

/** What the reminders and the encounter clock read: the same, and the state of a hero's turn on this device (the sync store fits). */
export interface ClockTurns extends WatchTurns {
  /** The hero's turn on this device, or null when it has none on record (a cold start) */
  stateOf(heroId: string): TurnState | null;
}

/**
 * The heroes the late-penalty watch runs for: every hero when Family Sync is off, and only the heroes whose turn this
 * device holds when it is on. A penalty is charged by one device only (the one in the hero's hand), so the family's other
 * devices never charge twice.
 */
export const heroesToWatch = (allHeroIds: string[], sync: WatchTurns): string[] => {
  if (!sync.isOn) return allHeroIds;
  return allHeroIds.filter((heroId) => sync.holds(heroId));
};

/** The states in which the device knows another device holds the hero: the busy answer, and a takeover that refused a write. */
const isHeldElsewhere = (state: TurnState | null): boolean => state === "busy" || state === "takenOver";

/**
 * Whether this device runs the phone reminders and the encounter clock for a hero. With Family Sync off, always. With it
 * on, the hero signed in here is this device's unless the device KNOWS another device holds them: the turn passes through
 * resting and asking on every hide and show of the app, and starts empty on a cold start, and none of those may silence
 * the hero's reminders or drop the ambush that waits for their return. Any other hero on the device is watched only while
 * this device holds their turn.
 */
export const isHeroWatched = (heroId: string, sync: ClockTurns, signedInId: string | null | undefined): boolean => {
  if (!sync.isOn) return true;
  const isSignedInHere = signedInId !== null && signedInId !== undefined && heroId === signedInId;
  if (!isSignedInHere) return sync.holds(heroId);
  return !isHeldElsewhere(sync.stateOf(heroId));
};
