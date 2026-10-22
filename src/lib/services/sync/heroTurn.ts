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

/**
 * The table of spec section 5: the next turn for an event. A transition the table does not have returns the very same
 * object, so a caller can tell nothing happened with `===`.
 */
export const turnReducer = (turn: HeroTurn, e: TurnEvent): HeroTurn => {
  const isAsking = turn.state === "asking";
  const isHeld = turn.state === "held";
  const isBusy = turn.state === "busy";
  const isProvisionalHold = isHeld && turn.provisional;
  // The site answers a first ask, or the ask retried when the device is back online after a provisional hold
  const awaitsAnswer = isAsking || isProvisionalHold;
  // A turn the player can walk away from: being asked for, held (provisional or not), or waiting behind the busy prompt
  const isInPlay = isAsking || isHeld || isBusy;

  switch (e.type) {
    // resting -> asking: POST play without force
    case "signIn":
      return turn.state === "resting" ? turnOf("asking") : turn;
    // asking -> held; a provisional hold is confirmed the same way
    case "granted":
      return awaitsAnswer ? turnOf("held") : turn;
    // asking -> busy; a provisional hold learns of the other device here ("a later busy is shown then")
    case "busy":
      return awaitsAnswer ? turnOf("busy", { ...e.device }) : turn;
    // busy -> asking: POST play with force, and the site's `granted` makes it held
    case "force":
      return isBusy ? turnOf("asking") : turn;
    // busy -> resting: back to the picker (family device) or the mirror (kid phone)
    case "decline":
      return isBusy ? turnOf("resting") : turn;
    // held -> resting (the device uploads and rests first); asking and busy simply give up
    case "signOut":
      return isInPlay ? turnOf("resting") : turn;
    // asking -> held, provisional: local-first, play goes on and the ask is retried on `online`
    case "offline":
      return isAsking ? turnOf("held", null, true) : turn;
    // held -> takenOver: another device took the turn while this one played
    case "refused":
      return isHeld ? turnOf("takenOver") : turn;
    // takenOver -> resting: the copy is replaced and the clerk has said so
    case "caughtUp":
      return turn.state === "takenOver" ? turnOf("resting") : turn;
    default:
      return turn;
  }
};

/** Only the device holding the turn may send this hero's records; a provisional hold plays local-first and sends too */
export const maySend = (turn: HeroTurn): boolean => turn.state === "held";
