/**
 * The hero's turn on this device (Family Sync, spec section 5), as a pure state machine. One hero plays on one device at a
 * time: the device holding the hero's turn is the only writer of that hero's records. The sync store keeps one `HeroTurn`
 * per hero id and feeds it events (what the player did, what the site answered); this file decides the next state and does
 * nothing else. It imports nothing from stores or databases, and never changes the turn it was given.
 *
 * `resting`: not playing this hero here. `asking`: the turn was asked for, no answer yet. `held`: this device may write
 * (`provisional` when the ask happened offline and has not been answered). `busy`: another device holds it, the clerk asks
 * the player. `takenOver`: the site refused a write because another device took the turn.
 */

export type TurnState = "resting" | "asking" | "held" | "busy" | "takenOver";

/** The device holding the turn, as the site's `busy` answer names it */
export interface TurnBusy {
  label: string;
  /** ISO time the holder was last seen; null when the site cannot say */
  lastSeenAt: string | null;
}

export interface HeroTurn {
  state: TurnState;
  /** Set only while `busy`: who holds the turn */
  busy: TurnBusy | null;
  /** Set only while `held`: the ask was made offline and still waits for an answer */
  provisional: boolean;
}

export type TurnEvent =
  /** A hero signs in on a family device, a kid phone opens its hero, or the app comes back to the front */
  | { type: "signIn" }
  /** The site answered `granted` */
  | { type: "granted" }
  /** The site answered `busy`, naming the device that holds the turn */
  | { type: "busy"; device: TurnBusy }
  /** The player said "Play here anyway" */
  | { type: "force" }
  /** The player said no */
  | { type: "decline" }
  /** Sign-out, profile switch, Save & Quit, or the app went to the background */
  | { type: "signOut" }
  /** The ask could not reach the site */
  | { type: "offline" }
  /** The site refused a hero record with `xp_family_turn` */
  | { type: "refused" }
  /** The device downloaded what it missed and replaced its copy of the hero */
  | { type: "caughtUp" };

const turnOf = (state: TurnState, busy: TurnBusy | null = null, provisional = false): HeroTurn => ({ state, busy, provisional });

/** A fresh turn: resting, holding nothing */
export const initialTurn = (): HeroTurn => turnOf("resting");

/** What the transitions read of the turn they are given */
interface TurnFacts {
  isAsking: boolean;
  isHeld: boolean;
  isBusy: boolean;
  /** The site answers a first ask, or the ask retried when the device is back online after a provisional hold */
  awaitsAnswer: boolean;
  /** A turn the player can walk away from: being asked for, held (provisional or not), or waiting behind the busy prompt */
  isInPlay: boolean;
}

const factsOf = (turn: HeroTurn): TurnFacts => {
  const isAsking = turn.state === "asking";
  const isHeld = turn.state === "held";
  const isBusy = turn.state === "busy";
  const isProvisionalHold = isHeld && turn.provisional;
  return { isAsking, isHeld, isBusy, awaitsAnswer: isAsking || isProvisionalHold, isInPlay: isAsking || isHeld || isBusy };
};

type Transition<E extends TurnEvent> = (turn: HeroTurn, e: E, at: TurnFacts) => HeroTurn;

/** The table of spec section 5, one transition per event */
const TRANSITIONS: { [K in TurnEvent["type"]]: Transition<Extract<TurnEvent, { type: K }>> } = {
  // resting -> asking: POST play without force
  signIn: (turn) => (turn.state === "resting" ? turnOf("asking") : turn),
  // asking -> held; a provisional hold is confirmed the same way
  granted: (turn, _e, at) => (at.awaitsAnswer ? turnOf("held") : turn),
  // asking -> busy; a provisional hold learns of the other device here ("a later busy is shown then")
  busy: (turn, e, at) => (at.awaitsAnswer ? turnOf("busy", { ...e.device }) : turn),
  // busy -> asking: POST play with force, and the site's `granted` makes it held
  force: (turn, _e, at) => (at.isBusy ? turnOf("asking") : turn),
  // busy -> resting: back to the picker (family device) or the mirror (kid phone)
  decline: (turn, _e, at) => (at.isBusy ? turnOf("resting") : turn),
  // held -> resting (the device uploads and rests first); asking and busy simply give up
  signOut: (turn, _e, at) => (at.isInPlay ? turnOf("resting") : turn),
  // asking -> held, provisional: local-first, play goes on and the ask is retried on `online`
  offline: (turn, _e, at) => (at.isAsking ? turnOf("held", null, true) : turn),
  // held -> takenOver: another device took the turn while this one played
  refused: (turn, _e, at) => (at.isHeld ? turnOf("takenOver") : turn),
  // takenOver -> resting: the copy is replaced and the clerk has said so
  caughtUp: (turn) => (turn.state === "takenOver" ? turnOf("resting") : turn),
};

/**
 * The table of spec section 5: the next turn for an event. A transition the table does not have returns the very same
 * object, so a caller can tell nothing happened with `===`.
 */
export const turnReducer = (turn: HeroTurn, e: TurnEvent): HeroTurn => {
  const transition = TRANSITIONS[e.type] as Transition<TurnEvent> | undefined;
  return transition ? transition(turn, e, factsOf(turn)) : turn;
};

/** Only the device holding the turn may send this hero's records; a provisional hold plays local-first and sends too */
export const maySend = (turn: HeroTurn): boolean => turn.state === "held";

/** What a restart needs of the turns: a hero held here (or waiting on the player's busy answer) is `held`, any other `resting` */
export const storedTurnsOf = (turns: Record<string, HeroTurn>): Record<string, "held" | "resting"> =>
  Object.fromEntries(
    Object.entries(turns).map(([heroId, turn]) => {
      const isKept = turn.state === "held" || turn.state === "busy";
      return [heroId, isKept ? "held" : "resting"];
    })
  );
