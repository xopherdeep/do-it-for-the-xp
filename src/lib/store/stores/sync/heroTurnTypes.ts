import type { Ref } from "vue";
import type { HeroTurn, TurnBusy } from "@/lib/services/sync/heroTurn";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";

/** What the hero's turn engine (sync/heroTurns.ts) is bound to: the sync store's turns, sign-in, lane and roster */
export interface TurnContext {
  /** heroId -> the hero's turn on this device; changed only here, through the reducer */
  turns: Ref<Record<string, HeroTurn>>;
  /** The hero another device took over while this one played, until the portal has said so */
  tookOverNotice: Ref<string | null>;
  isOn(): boolean;
  /** The sign-in for a turn call; null while the sync is off */
  auth(): TownHallAuth | null;
  /** What the site calls this device in a busy answer */
  label(): string;
  /** Sends what waits, including what was written a moment ago */
  upload(): Promise<void>;
  /** Sends what waits, then reads to the newest record; false when it could not get there */
  catchUp(): Promise<boolean>;
  /** Reads to the newest record from inside the lane (a confirm, before a send); false when it could not get there */
  readHere(): Promise<boolean>;
  flush(): Promise<void>;
  /** Drops every queued record of the hero and its change marks (the pending claims among them go again, phone-style) */
  dropHero(heroId: string): Promise<void>;
  /**
   * The player's offline play or Play here was granted (section 5, "The holder's copy is the truth"): every record of the
   * hero this device holds is queued, so its copy goes up whole and nothing of the site's lands over it
   */
  queueWhole(heroId: string): Promise<void>;
  /** A turn changed: the store saves what a restart needs (`storedTurnsOf`) */
  turnsChanged(): void;
  /** The site answered a turn call */
  answered(): void;
  /** The site said the family is not Pro: the store turns the sync off, as for any call */
  notPro(error: unknown): void;
  /** The heroes whose records wait in the outbox, in queue order */
  waiting(): string[];
  /** The hero signed in on this device, if any: never borrowed */
  current(): string | null;
  /** Whether this device still has the hero (a removed hero's records can never be written) */
  hasHero(heroId: string): boolean;
  /** Whether a borrowing pass may run now: the sync on, and no pause after a failure */
  mayLend(): boolean;
}

/** What asking for the turn came to: this device's, another device holds it, or the site could not be asked */
export type TurnAnswer = "granted" | "busy" | "offline";

/**
 * What borrowing a hero's turn for some work came to: it ran, or it did not; `busy` names the device a busy answer named,
 * and is null when the site could not be asked or this device's hold has not caught up
 */
export type TurnUse = { ran: true } | { ran: false; busy: TurnBusy | null };

export interface HeroTurns {
  /** The hero is held here, provisional or not: this device plays it and runs its clocks */
  holds(heroId: string): boolean;
  /** This device's changes to the hero are kept from the download: held here, or waiting on the player's busy answer */
  keepsLocal(heroId: string): boolean;
  /** Whether a queued record may go now: a family record always, a hero's while held here and confirmed by the site */
  maySendNow(heroId: string | null): boolean;
  /** The player said Not now to the hero's busy turn here: this device knows another device holds it, until it is asked again */
  isDeclined(heroId: string): boolean;
  signIn(heroId: string): Promise<TurnAnswer>;
  takeOver(heroId: string): Promise<void>;
  rest(heroId: string): Promise<void>;
  withTurn(heroId: string, fn: () => Promise<void>): Promise<boolean>;
  /** `withTurn`, answering why the work did not run (busy, with the device holding the hero) */
  borrow(heroId: string, fn: () => Promise<void>): Promise<TurnUse>;
  /** Asks the site again for every hold made offline; the lane runs it before each send */
  confirm(): Promise<void>;
  /** The site refused these heroes' records with xp_family_turn: another device took them over */
  lost(heroIds: string[]): void;
  /** The current hero changed: the one who played rests, the next signs in */
  switched(previous: string | null, next: string | null): void;
  /** The app went to the background: the hero playing here rests; false when none was playing */
  hidden(heroId: string | null): boolean;
  /** The app came back to the front: the hero the background rested signs in again (silent when granted) */
  visible(heroId: string | null): void;
  /** After a round: each hero whose records wait here, and whom nobody here plays, sends them on a borrowed turn */
  lendWaiting(): Promise<void>;
  /** After a restart: the heroes this device held when it stopped are held again, provisionally */
  restore(heroIds: string[]): void;
  /** The device left the family: nothing in flight is remembered */
  forget(): void;
}
