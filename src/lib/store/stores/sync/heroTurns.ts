import type { Ref } from "vue";
import { familyProblem } from "@/lib/services/multiplayer/familyServer";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { playHero, restHero, type PlayAnswer } from "@/lib/services/sync/familySyncClient";
import { initialTurn, maySend, turnReducer, type HeroTurn, type TurnEvent } from "@/lib/services/sync/heroTurn";
import { TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The hero's turn on this device (section 5 of the family sync spec): asking the site for it, giving it back, the busy
 * answer, the offline hold and the takeover. Every change of a turn goes through `turnReducer` (services/sync/heroTurn.ts);
 * this file makes the calls and feeds it what the site answered.
 *
 * - A granted turn first downloads while the hero is still `asking`, so the copies of the device that played the hero
 *   last land over anything changed here without the turn (the transfer lets a hero record of a hero this device does
 *   not play land, and drops the change it replaces); then the turn is `held` and the store flushes (upload, download).
 * - One ask per hero at a time: a sign-in while an ask is out joins it, and a grant is given back only by the latest
 *   ask, and only when the hero is not held here (an older grant can never clear the turn this device plays).
 * - A rest uploads first; a sign-in meanwhile claims the hero and waits for it, and the rest then leaves it held.
 * - A hold made offline (`provisional`) plays on, but its records go only once the site has confirmed it: every upload
 *   asks again first (`confirm`, from inside the lane), so a hiccup can never make the site refuse them as a takeover.
 * - A busy answer to the player's own ask keeps this device's changes to the hero until the player answers (Play here
 *   sends them, Not now lets the holder's copies land); a borrow's busy answer simply rests.
 * - After every round, each hero whose records wait here goes up on a borrowed turn (`lendWaiting`): free, the turn is
 *   taken without force, the records go, the turn is given back; busy, they wait (the holder's copies replace them as
 *   they land). The hero signed in here is never borrowed. This is how a family device's first push sends its heroes.
 * - A give-back the site did not hear (offline) is owed, and sent again before the next borrowing pass. A hero the site
 *   does not know and this device no longer has (removed) loses its queued records.
 *
 * Bound to the sync store the way the transfer is (sync/recordTransfer.ts). `upload`, `download` and `flush` are the
 * store's lane: never call `signIn`, `takeOver`, `rest` or `withTurn` from inside a transfer.
 */
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
  download(): Promise<void>;
  flush(): Promise<void>;
  /** Drops every queued record of the hero and its change marks: they can never be written */
  dropHero(heroId: string): Promise<void>;
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

export interface HeroTurns {
  /** The hero is held here, provisional or not: this device plays it and runs its clocks */
  holds(heroId: string): boolean;
  /** This device's changes to the hero are kept from the download: held here, or waiting on the player's busy answer */
  keepsLocal(heroId: string): boolean;
  /** Whether a queued record may go now: a family record always, a hero's while held here and confirmed by the site */
  maySendNow(heroId: string | null): boolean;
  signIn(heroId: string): Promise<TurnAnswer>;
  takeOver(heroId: string): Promise<void>;
  rest(heroId: string): Promise<void>;
  withTurn(heroId: string, fn: () => Promise<void>): Promise<boolean>;
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
  /** The device left the family: nothing in flight is remembered */
  forget(): void;
}

type Answer = PlayAnswer | { answer: "offline" } | { answer: "unknown" };

/** The site has no such hero (removed, or not registered yet) */
const isUnknownHero = (error: unknown): boolean => error instanceof TownHallError && error.status === 404;

export const createHeroTurns = (ctx: TurnContext): HeroTurns => {
  /** heroId -> the ask in flight, so a second sign-in joins it */
  const asking = new Map<string, Promise<TurnAnswer>>();
  /** heroId -> the number of the latest ask: only that one may give a grant back */
  const askNumbers = new Map<string, number>();
  /** heroId -> the rest in flight; a sign-in waits for it */
  const resting = new Map<string, Promise<void>>();
  /** heroId -> how many times the player claimed the hero: a rest that sees a new claim after its upload leaves it held */
  const claims = new Map<string, number>();
  /** heroId -> the catch-up after a takeover; a sign-in waits for it */
  const catchingUp = new Map<string, Promise<void>>();
  /** heroId -> how many withTurn calls borrow the turn; a claim takes the hero for the player */
  const lent = new Map<string, number>();
  /** Heroes the site answered busy to the player's ask: their changes here wait for the player's answer */
  const awaitingChoice = new Set<string>();
  /** The hero the background rested, signed in again when the app is back */
  let restedByBackground: string | null = null;
  /** Heroes rested here whose give-back the site did not hear: it still thinks this device plays them */
  const owedRests = new Set<string>();
  /** Heroes the site did not know, said once */
  const unknownSaid = new Set<string>();
  /** The borrowing pass running, so a second round joins it instead of borrowing the same hero twice */
  let lending: Promise<void> | null = null;

  const turnOf = (heroId: string): HeroTurn => ctx.turns.value[heroId] ?? initialTurn();
  const stateOf = (heroId: string): HeroTurn["state"] => turnOf(heroId).state;

  const dispatch = (heroId: string, event: TurnEvent): void => {
    const turn = turnOf(heroId);
    const next = turnReducer(turn, event);
    const hasChanged = next !== turn;
    if (hasChanged) ctx.turns.value = { ...ctx.turns.value, [heroId]: next };
  };

  const holds = (heroId: string): boolean => maySend(turnOf(heroId));
  const keepsLocal = (heroId: string): boolean => holds(heroId) || awaitingChoice.has(heroId);

  const maySendNow = (heroId: string | null): boolean => {
    const isFamilyRecord = heroId === null;
    if (isFamilyRecord) return true;
    const turn = turnOf(heroId);
    return maySend(turn) && !turn.provisional;
  };

  // --- The calls ---

  /** A turn call failed: the hero plays on (local-first); offline is expected, anything else is logged */
  const failed = (error: unknown): void => {
    const found = familyProblem(error);
    const isNotPro = found === "pro-required";
    const isUnexpected = !isNotPro && found !== "offline";
    if (isNotPro) ctx.notPro(error);
    if (isUnexpected) debug.warn("sync: a turn call failed", error);
  };

  /** The site does not know the hero: a hero this device no longer has loses its queued records (said once) */
  const unknownHero = async (heroId: string): Promise<void> => {
    const isRemoved = !ctx.hasHero(heroId);
    const isFirstTime = !unknownSaid.has(heroId);
    unknownSaid.add(heroId);
    if (isFirstTime) debug.warn(`sync: the site does not know hero ${heroId}${isRemoved ? "; its queued records are dropped" : "; its records wait"}`);
    if (isRemoved) await ctx.dropHero(heroId);
  };

  /** POST play; a failure of any kind is an ask that could not be made (local-first: the hero plays on) */
  const ask = async (heroId: string, force: boolean): Promise<Answer> => {
    const auth = ctx.auth();
    if (!auth) return { answer: "offline" };
    try {
      const { deviceId } = await ensureIdentity();
      const answer = await playHero(auth, heroId, deviceId, ctx.label(), force);
      ctx.answered();
      return answer;
    } catch (error) {
      const isUnknown = isUnknownHero(error);
      if (isUnknown) return { answer: "unknown" };
      failed(error);
      return { answer: "offline" };
    }
  };

  /** POST rest: the site clears the turn only if this device holds it, so a late or repeated one is harmless */
  const giveBack = async (heroId: string): Promise<void> => {
    const auth = ctx.auth();
    if (!auth) return;
    try {
      const { deviceId } = await ensureIdentity();
      await restHero(auth, heroId, deviceId);
      owedRests.delete(heroId);
    } catch (error) {
      owedRests.add(heroId);
      failed(error);
    }
  };

  /** A busy answer: the player is asked (their changes here wait for the answer), or a borrow simply rests */
  const heardBusy = (heroId: string, device: { label: string; lastSeenAt: string | null }, isBorrow: boolean): void => {
    if (isBorrow) {
      dispatch(heroId, { type: "signOut" });
      return;
    }
    awaitingChoice.add(heroId);
    dispatch(heroId, { type: "busy", device });
  };

  /** The hero is `asking`: POST play, then the answer through the reducer. A borrow never shows busy or holds offline */
  const take = (heroId: string, force: boolean, isBorrow = false): Promise<TurnAnswer> => {
    const number = (askNumbers.get(heroId) ?? 0) + 1;
    askNumbers.set(heroId, number);
    const isAsking = (): boolean => stateOf(heroId) === "asking";
    // A borrow the player has not claimed meanwhile (a sign-in that joined it makes it the player's ask)
    const isQuiet = (): boolean => isBorrow && lent.has(heroId);
    const asked = (async (): Promise<TurnAnswer> => {
      const answer = await ask(heroId, force);
      const isUnknown = answer.answer === "unknown";
      if (isUnknown) await unknownHero(heroId);
      const isNoAnswer = isUnknown || answer.answer === "offline";
      if (isNoAnswer) {
        dispatch(heroId, isQuiet() ? { type: "signOut" } : { type: "offline" });
        return "offline";
      }
      const isBusy = answer.answer === "busy";
      if (isBusy) {
        heardBusy(heroId, answer.device, isQuiet());
        return "busy";
      }
      // Granted: catch up while the hero is still asking, so the last player's copies land over changes made here without the turn
      if (isAsking()) await ctx.download();
      const isWanted = isAsking();
      if (!isWanted) {
        // Signed out meanwhile: the site must not think this device plays the hero, unless a later ask holds it here
        const isLatest = askNumbers.get(heroId) === number;
        const mayGiveBack = isLatest && !holds(heroId);
        if (mayGiveBack) await giveBack(heroId);
        return "granted";
      }
      dispatch(heroId, { type: "granted" });
      await ctx.flush();
      return "granted";
    })();
    asking.set(heroId, asked);
    const forgetAsk = (): void => {
      const isThisAsk = asking.get(heroId) === asked;
      if (isThisAsk) asking.delete(heroId);
    };
    asked.then(forgetAsk, forgetAsk);
    return asked;
  };

  // --- What the player and the app do ---

  /** The player wants the hero here: a rest under way leaves it held, a borrow is not given back, an old rest is not owed */
  const claim = (heroId: string): void => {
    claims.set(heroId, (claims.get(heroId) ?? 0) + 1);
    lent.delete(heroId);
    owedRests.delete(heroId);
  };

  /** What a turn already settled here answers */
  const answerOf = (turn: HeroTurn): TurnAnswer => {
    const isBusy = turn.state === "busy";
    if (isBusy) return "busy";
    return turn.provisional ? "offline" : "granted";
  };

  /** A resting hero is asked for (joining an ask still out); an ask in flight is joined; a settled turn answers as it stands */
  const answerFor = (heroId: string): Promise<TurnAnswer> => {
    const turn = turnOf(heroId);
    const inFlight = asking.get(heroId);
    const isResting = turn.state === "resting";
    if (isResting) {
      dispatch(heroId, { type: "signIn" });
      return inFlight ?? take(heroId, false);
    }
    return inFlight ?? Promise.resolve(answerOf(turn));
  };

  const signIn = async (heroId: string): Promise<TurnAnswer> => {
    if (!ctx.isOn()) return "granted";
    claim(heroId);
    await resting.get(heroId);
    await catchingUp.get(heroId);
    return answerFor(heroId);
  };

  /** "Play here anyway": the turn is forced here; with the sync off the hero simply plays here, held until the site is asked */
  const takeOver = async (heroId: string): Promise<void> => {
    claim(heroId);
    await asking.get(heroId);
    const state = stateOf(heroId);
    const isBusy = state === "busy";
    const isResting = state === "resting";
    const mayAsk = isBusy || isResting;
    if (!mayAsk) return;
    dispatch(heroId, isBusy ? { type: "force" } : { type: "signIn" });
    const isOn = ctx.isOn();
    if (isOn) await take(heroId, true);
    else dispatch(heroId, { type: "offline" });
    awaitingChoice.delete(heroId);
  };

  /** Held: what waits goes up, the turn ends here (unless the player claimed it meanwhile), then the site is told */
  const restNow = async (heroId: string): Promise<void> => {
    // Not now on the busy question: the holder's copies may land over the changes made here
    awaitingChoice.delete(heroId);
    const isHeldOnline = stateOf(heroId) === "held" && ctx.isOn();
    if (!isHeldOnline) {
      // Asking, busy, or the sync off: the hero simply rests here (an ask still out is given back by take())
      dispatch(heroId, { type: "signOut" });
      return;
    }
    const claimedAt = claims.get(heroId) ?? 0;
    await ctx.upload();
    const isClaimedAgain = (claims.get(heroId) ?? 0) !== claimedAt;
    if (isClaimedAgain) return;
    // Rested before the site hears it, so no upload can send a record the site would refuse as a takeover
    dispatch(heroId, { type: "signOut" });
    await giveBack(heroId);
  };

  /** One rest per hero at a time; a second waits for the first, then looks again */
  const rest = (heroId: string): Promise<void> => {
    const before = resting.get(heroId) ?? Promise.resolve();
    const run = before.then(() => restNow(heroId));
    resting.set(heroId, run);
    const forgetRest = (): void => {
      const isThisRest = resting.get(heroId) === run;
      if (isThisRest) resting.delete(heroId);
    };
    run.then(forgetRest, forgetRest);
    return run;
  };

  /** Ends a borrow: given back when nobody borrows the hero any more and the player has not claimed it */
  const returnLoan = async (heroId: string): Promise<void> => {
    const left = (lent.get(heroId) ?? 0) - 1;
    const isClaimed = !lent.has(heroId);
    if (isClaimed) return;
    const isStillBorrowed = left > 0;
    if (isStillBorrowed) {
      lent.set(heroId, left);
      return;
    }
    lent.delete(heroId);
    await rest(heroId);
  };

  const withTurn = async (heroId: string, fn: () => Promise<void>): Promise<boolean> => {
    if (!ctx.isOn()) {
      await fn();
      return true;
    }
    await catchingUp.get(heroId);
    await resting.get(heroId);
    await asking.get(heroId);
    const isLent = lent.has(heroId);
    const isOwnedHere = holds(heroId) && !isLent;
    if (isOwnedHere) {
      await fn();
      return true;
    }
    const isFree = stateOf(heroId) === "resting";
    const mayBorrow = isFree || isLent;
    if (!mayBorrow) return false;
    lent.set(heroId, (lent.get(heroId) ?? 0) + 1);
    if (isFree) {
      dispatch(heroId, { type: "signIn" });
      await take(heroId, false, true);
    }
    const isTaken = holds(heroId) && !turnOf(heroId).provisional;
    if (!isTaken) {
      // Busy: the device that plays the hero does it; offline: nothing was borrowed (take() left the hero resting)
      lent.delete(heroId);
      return false;
    }
    try {
      await fn();
    } finally {
      await returnLoan(heroId);
    }
    return true;
  };

  const confirm = async (): Promise<void> => {
    const provisional = Object.keys(ctx.turns.value).filter((heroId) => turnOf(heroId).provisional);
    for (const heroId of provisional) {
      const answer = await ask(heroId, false);
      const isGranted = answer.answer === "granted";
      const isBusy = answer.answer === "busy";
      const isUnknown = answer.answer === "unknown";
      if (isGranted) dispatch(heroId, { type: "granted" });
      // The offline play waits for the player's answer, never dropped before it
      if (isBusy) heardBusy(heroId, answer.device, false);
      if (isUnknown) await unknownHero(heroId);
    }
  };

  const lost = (heroIds: string[]): void => {
    for (const heroId of heroIds) {
      const isHeldHere = holds(heroId);
      if (!isHeldHere) continue;
      // A borrowed hero was not being played here: nobody is told
      const wasLent = lent.has(heroId);
      dispatch(heroId, { type: "refused" });
      lent.delete(heroId);
      // The catch-up runs after the transfer that heard the refusal; `takenOver` has one exit, however it ends
      const caughtUp = ctx
        .dropHero(heroId)
        .then(() => ctx.download())
        .catch((error) => debug.warn(`sync: catching up after ${heroId} was taken over failed`, error))
        .then(() => {
          dispatch(heroId, { type: "caughtUp" });
          if (!wasLent) ctx.tookOverNotice.value = heroId;
          catchingUp.delete(heroId);
        });
      catchingUp.set(heroId, caughtUp);
    }
  };

  /** Gives back again what the site did not hear, for heroes still resting here */
  const payOwedRests = async (): Promise<void> => {
    for (const heroId of Array.from(owedRests)) {
      const isResting = stateOf(heroId) === "resting";
      if (isResting) await giveBack(heroId);
      else owedRests.delete(heroId);
    }
  };

  /** A hero whose records wait here, whom this device does not play and is not signed in as: its free turn is borrowed */
  const mayLendHero = (heroId: string): boolean => {
    const isFree = stateOf(heroId) === "resting";
    const isSignedIn = heroId === ctx.current();
    const isStillWaiting = ctx.waiting().includes(heroId);
    return isFree && !isSignedIn && isStillWaiting;
  };

  const lendPass = async (): Promise<void> => {
    await payOwedRests();
    for (const heroId of ctx.waiting()) {
      const isLendable = ctx.mayLend() && mayLendHero(heroId);
      // Nothing to run: taking the turn flushes the hero's records, and giving it back uploads what is left
      if (isLendable) await withTurn(heroId, async () => undefined);
    }
  };

  const startLending = (): Promise<void> => {
    const pass = lendPass()
      .catch((error) => debug.warn("sync: a borrowed turn failed", error))
      .finally(() => {
        lending = null;
      });
    lending = pass;
    return pass;
  };

  const lendWaiting = (): Promise<void> => {
    const mayLend = ctx.mayLend();
    if (!mayLend) return Promise.resolve();
    return lending ?? startLending();
  };

  const switched = (previous: string | null, next: string | null): void => {
    if (previous) rest(previous).catch((error) => debug.warn("sync: could not rest the hero", error));
    if (next) signIn(next).catch((error) => debug.warn("sync: could not sign the hero in", error));
  };

  const hidden = (heroId: string | null): boolean => {
    const isNobody = heroId === null;
    if (isNobody) return false;
    const state = stateOf(heroId);
    const isPlaying = state === "held" || state === "asking";
    if (!isPlaying) return false;
    restedByBackground = heroId;
    rest(heroId).catch((error) => debug.warn("sync: could not rest the hero", error));
    return true;
  };

  const visible = (heroId: string | null): void => {
    const isSameHero = heroId !== null && heroId === restedByBackground;
    restedByBackground = null;
    if (isSameHero) signIn(heroId).catch((error) => debug.warn("sync: could not sign the hero in", error));
  };

  const forget = (): void => {
    asking.clear();
    resting.clear();
    catchingUp.clear();
    lent.clear();
    awaitingChoice.clear();
    owedRests.clear();
    unknownSaid.clear();
    restedByBackground = null;
    ctx.tookOverNotice.value = null;
  };

  return { holds, keepsLocal, maySendNow, signIn, takeOver, rest, withTurn, confirm, lost, switched, hidden, visible, lendWaiting, forget };
};
