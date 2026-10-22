import { initialTurn, maySend, turnReducer, type HeroTurn, type TurnEvent } from "@/lib/services/sync/heroTurn";
import debug from "@/lib/utils/debug";
import { createTurnCalls } from "./heroTurnCalls";
import { createTurnRests } from "./heroTurnRest";
import type { HeroTurns, TurnAnswer, TurnContext } from "./heroTurnTypes";
import { createTurnLending } from "./turnLending";

/**
 * The hero's turn on this device (section 5 of the family sync spec): asking the site for it, giving it back, the busy
 * answer, the offline hold and the takeover. Every change of a turn goes through `turnReducer` (services/sync/heroTurn.ts);
 * this file makes the calls and feeds it what the site answered.
 *
 * - A granted turn first catches up while the hero is still `asking` (it sends what waits, then reads to the newest
 *   record), so the copies of the device that played the hero last land over anything changed here without the turn (the
 *   transfer lets a hero record of a hero this device does not play land, and drops the change it replaces); then the
 *   turn is `held` and the store flushes. A grant this device cannot catch up on (offline, or a read held back) is given
 *   back by a borrow, which then runs nothing; the player plays on as offline, its records waiting for the site.
 * - One ask per hero at a time: a sign-in joins an ask still waiting for its answer (an answered one is let finish, then
 *   looked at again), and a grant is given back only by the latest ask, and only when the hero is not held here.
 * - A rest uploads first; a sign-in meanwhile claims the hero and waits for it, and the rest then leaves it held. A rest
 *   never gives the turn back while the hero's records still wait here (sync/heroTurnRest.ts): the hero stays held, and
 *   the rest is tried again after the next good round.
 * - A hold made offline (`provisional`) plays on, but its records go only once the site has confirmed it: every upload
 *   asks again first (`confirm`, from inside the lane), so a hiccup can never make the site refuse them as a takeover. A
 *   granted confirm first reads to the newest record (the hero's offline changes yield to copies written meanwhile); one
 *   that cannot stays provisional. `withTurn` never runs its work on a provisional hold (it answers false).
 * - A busy turn is always the player's question (a borrow's busy answer rests at once): while the hero is busy, this
 *   device's changes to it are kept from the download; Play here sends them, Not now (a rest) lets the holder's copies land.
 * - Each change of a turn is saved (held or busy as `held`, the rest as `resting`); after a restart the heroes saved
 *   `held` are held again provisionally, so their changes wait for the site's answer, and those the player is not on are
 *   rested by the first borrowing pass.
 * - After every round, each hero whose records wait here goes up on a borrowed free turn (`lendWaiting`, in
 *   sync/turnLending.ts, with the owed give-backs and the restored holds); the hero signed in here is never borrowed.
 * - A hero the site does not know and this device no longer has (removed) loses its queued records, its hold and any
 *   give-back owed (sync/heroTurnCalls.ts makes the two calls).
 *
 * Bound to the sync store the way the transfer is (sync/recordTransfer.ts; the context's shape is in heroTurnTypes.ts).
 * `upload`, `catchUp` and `flush` are the store's lane: never call `signIn`, `takeOver`, `rest` or `withTurn` from inside
 * a transfer; `readHere` is the one read made from inside it (by `confirm`).
 */
export type { HeroTurns, TurnAnswer, TurnContext } from "./heroTurnTypes";

/** An ask in flight; `isAnswered` once the site's answer is in (a sign-in may join it only before) */
interface AskInFlight {
  done: Promise<TurnAnswer>;
  isAnswered: boolean;
}

export const createHeroTurns = (ctx: TurnContext): HeroTurns => {
  /** heroId -> the ask in flight, so a second sign-in joins it */
  const asking = new Map<string, AskInFlight>();
  /** heroId -> the number of the latest ask: only that one may give a grant back */
  const askNumbers = new Map<string, number>();
  /** heroId -> the catch-up after a takeover; a sign-in waits for it */
  const catchingUp = new Map<string, Promise<void>>();
  /** heroId -> how many withTurn calls borrow the turn; a claim takes the hero for the player */
  const lent = new Map<string, number>();
  /** The hero the background rested, signed in again when the app is back */
  let restedByBackground: string | null = null;
  /** Offline holds the site has just granted, reading to the newest record: their changes yield to the copies that land */
  const yielding = new Set<string>();
  /** The borrowing pass, the owed give-backs and the heroes held again after a restart (sync/turnLending.ts) */
  const lending = createTurnLending({
    stateOf: (heroId) => stateOf(heroId),
    waiting: () => ctx.waiting(),
    current: () => ctx.current(),
    mayLend: () => ctx.mayLend(),
    withTurn: (heroId, fn) => withTurn(heroId, fn),
    rest: (heroId) => rest(heroId),
    giveBack: (heroId) => giveBack(heroId),
    retryRests: () => rests.retryOwed(ctx.current()),
  });
  /** POST play and POST rest (sync/heroTurnCalls.ts) */
  const calls = createTurnCalls({
    auth: () => ctx.auth(),
    label: () => ctx.label(),
    answered: () => ctx.answered(),
    notPro: (error) => ctx.notPro(error),
    hasHero: (heroId) => ctx.hasHero(heroId),
    dropHero: (heroId) => ctx.dropHero(heroId),
    owe: (heroId) => lending.owe(heroId),
    forgive: (heroId) => lending.forgive(heroId),
  });
  const { ask, giveBack, failed } = calls;

  const turnOf = (heroId: string): HeroTurn => ctx.turns.value[heroId] ?? initialTurn();
  const stateOf = (heroId: string): HeroTurn["state"] => turnOf(heroId).state;

  const dispatch = (heroId: string, event: TurnEvent): void => {
    const turn = turnOf(heroId);
    const next = turnReducer(turn, event);
    const hasChanged = next !== turn;
    if (!hasChanged) return;
    ctx.turns.value = { ...ctx.turns.value, [heroId]: next };
    ctx.turnsChanged();
  };

  const holds = (heroId: string): boolean => maySend(turnOf(heroId));
  // A busy turn is the player's open question (a borrow never shows busy): its changes here wait for the answer
  const keepsLocal = (heroId: string): boolean => {
    const isPlayed = holds(heroId) || stateOf(heroId) === "busy";
    return isPlayed && !yielding.has(heroId);
  };

  const maySendNow = (heroId: string | null): boolean => {
    const isFamilyRecord = heroId === null;
    if (isFamilyRecord) return true;
    const turn = turnOf(heroId);
    return maySend(turn) && !turn.provisional;
  };

  // --- The calls ---

  /** A busy answer: the player is asked (a busy turn keeps their changes until the answer), or a borrow simply rests */
  const heardBusy = (heroId: string, device: { label: string; lastSeenAt: string | null }, isBorrow: boolean): void => {
    dispatch(heroId, isBorrow ? { type: "signOut" } : { type: "busy", device });
  };

  /**
   * Granted, but the newest record could not be read: the player holds it as offline. A borrow gives the turn back, unless
   * the hero's records did not reach the site: then it holds it as offline too, and the rest is owed
   */
  const behind = async (heroId: string, isBorrow: boolean): Promise<TurnAnswer> => {
    const isUnsent = ctx.waiting().includes(heroId);
    const mayGiveBack = isBorrow && !isUnsent;
    dispatch(heroId, mayGiveBack ? { type: "signOut" } : { type: "offline" });
    if (mayGiveBack) await giveBack(heroId);
    const isLoanKept = isBorrow && isUnsent;
    if (isLoanKept) rests.owe(heroId);
    return "offline";
  };

  /** The hero is `asking`: POST play, then the answer through the reducer. A borrow never shows busy or holds offline */
  const take = (heroId: string, force: boolean, isBorrow = false): Promise<TurnAnswer> => {
    const number = (askNumbers.get(heroId) ?? 0) + 1;
    askNumbers.set(heroId, number);
    const isAsking = (): boolean => stateOf(heroId) === "asking";
    // A borrow the player has not claimed meanwhile (a sign-in that joined it makes it the player's ask)
    const isQuiet = (): boolean => isBorrow && lent.has(heroId);
    const entry: AskInFlight = { done: Promise.resolve("offline"), isAnswered: false };
    const asked = (async (): Promise<TurnAnswer> => {
      const answer = await ask(heroId, force);
      entry.isAnswered = true;
      const isUnknown = answer.answer === "unknown";
      if (isUnknown) await calls.unknownHero(heroId);
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
      const isCaughtUp = isAsking() ? await ctx.catchUp() : true;
      const isWanted = isAsking();
      if (!isWanted) {
        // Signed out meanwhile: the site must not think this device plays the hero, unless a later ask holds it here or
        // its records did not reach the site (the borrowing pass then sends them, and gives the turn back)
        const isLatest = askNumbers.get(heroId) === number;
        const mayGiveBack = isLatest && !holds(heroId) && !ctx.waiting().includes(heroId);
        if (mayGiveBack) await giveBack(heroId);
        return "granted";
      }
      if (!isCaughtUp) return behind(heroId, isQuiet());
      dispatch(heroId, { type: "granted" });
      await ctx.flush();
      return "granted";
    })();
    entry.done = asked;
    asking.set(heroId, entry);
    const forgetAsk = (): void => {
      const isThisAsk = asking.get(heroId) === entry;
      if (isThisAsk) asking.delete(heroId);
    };
    asked.then(forgetAsk, forgetAsk);
    return asked;
  };

  // --- What the player and the app do ---

  /** The player wants the hero here: a rest under way leaves it held, a borrow is not given back, an old rest is not owed */
  const claim = (heroId: string): void => {
    rests.claim(heroId);
    lent.delete(heroId);
    lending.forgive(heroId);
  };

  /** What a turn already settled here answers */
  const answerOf = (turn: HeroTurn): TurnAnswer => {
    const isBusy = turn.state === "busy";
    if (isBusy) return "busy";
    return turn.provisional ? "offline" : "granted";
  };

  /**
   * A resting hero is asked for, joining an ask still waiting for its answer; an ask already answered (it may be giving
   * the turn back) is let finish, then the hero is looked at again. An ask in flight is joined; a settled turn answers
   * as it stands.
   */
  const answerFor = async (heroId: string): Promise<TurnAnswer> => {
    const turn = turnOf(heroId);
    const inFlight = asking.get(heroId);
    const isResting = turn.state === "resting";
    if (!isResting) return inFlight ? inFlight.done : answerOf(turn);
    const isDeciding = inFlight !== undefined && inFlight.isAnswered;
    if (isDeciding) {
      await inFlight.done;
      return answerFor(heroId);
    }
    dispatch(heroId, { type: "signIn" });
    return inFlight ? inFlight.done : take(heroId, false);
  };

  const signIn = async (heroId: string): Promise<TurnAnswer> => {
    if (!ctx.isOn()) return "granted";
    claim(heroId);
    await rests.inFlight(heroId);
    await catchingUp.get(heroId);
    return answerFor(heroId);
  };

  /** "Play here anyway": the turn is forced here; with the sync off the hero simply plays here, held until the site is asked */
  const takeOver = async (heroId: string): Promise<void> => {
    claim(heroId);
    await asking.get(heroId)?.done;
    const state = stateOf(heroId);
    const isBusy = state === "busy";
    const isResting = state === "resting";
    const mayAsk = isBusy || isResting;
    if (!mayAsk) return;
    dispatch(heroId, isBusy ? { type: "force" } : { type: "signIn" });
    const isOn = ctx.isOn();
    if (isOn) await take(heroId, true);
    else dispatch(heroId, { type: "offline" });
  };

  /** Giving the turn back (sync/heroTurnRest.ts): never while the hero's records wait here */
  const rests = createTurnRests({
    stateOf: (heroId) => stateOf(heroId),
    dispatch: (heroId, event) => dispatch(heroId, event),
    isOn: () => ctx.isOn(),
    upload: () => ctx.upload(),
    waiting: () => ctx.waiting(),
    giveBack: (heroId) => giveBack(heroId),
    // Not now: the hero simply rests here, and the holder's copies land
    decline: async (heroId) => dispatch(heroId, { type: "signOut" }),
  });
  const { rest } = rests;

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
    await rests.inFlight(heroId);
    await asking.get(heroId)?.done;
    const isLent = lent.has(heroId);
    // An offline hold is not owned yet: the work waits until the site has confirmed it and this device has caught up
    const isConfirmed = holds(heroId) && !turnOf(heroId).provisional;
    const isOwnedHere = isConfirmed && !isLent;
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

  /**
   * An offline hold the site granted reads to the newest record before it is confirmed. It played without the turn, so
   * the copies another device wrote meanwhile land over its changes, as a mirror's yield; a read that cannot get there
   * (offline, a family record held back) leaves the hold provisional, and nothing of the hero goes.
   */
  const caughtUpHere = async (heroId: string): Promise<boolean> => {
    yielding.add(heroId);
    try {
      return await ctx.readHere();
    } catch (error) {
      failed(error);
      return false;
    } finally {
      yielding.delete(heroId);
    }
  };

  const confirm = async (): Promise<void> => {
    const provisional = Object.keys(ctx.turns.value).filter((heroId) => turnOf(heroId).provisional);
    for (const heroId of provisional) {
      const answer = await ask(heroId, false);
      const isGranted = answer.answer === "granted";
      const isBusy = answer.answer === "busy";
      const isUnknown = answer.answer === "unknown";
      const isCaughtUp = isGranted && (await caughtUpHere(heroId));
      if (isCaughtUp) dispatch(heroId, { type: "granted" });
      // The offline play waits for the player's answer, never dropped before it
      if (isBusy) heardBusy(heroId, answer.device, false);
      if (isUnknown) await forgetUnknown(heroId);
    }
  };

  /** A hold the site does not know the hero of: a hero removed here holds nothing any more, and is never asked again */
  const forgetUnknown = async (heroId: string): Promise<void> => {
    await calls.unknownHero(heroId);
    const isRemoved = !ctx.hasHero(heroId);
    if (isRemoved) dispatch(heroId, { type: "signOut" });
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
        .then(() => ctx.catchUp())
        .catch((error) => debug.warn(`sync: catching up after ${heroId} was taken over failed`, error))
        .then(() => {
          dispatch(heroId, { type: "caughtUp" });
          if (!wasLent) ctx.tookOverNotice.value = heroId;
          catchingUp.delete(heroId);
        });
      catchingUp.set(heroId, caughtUp);
    }
  };

  const restore = (heroIds: string[]): void => {
    for (const heroId of heroIds) {
      // Through the reducer: asked, then held as an ask that could not reach the site
      dispatch(heroId, { type: "signIn" });
      dispatch(heroId, { type: "offline" });
      lending.restored(heroId);
    }
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
    rests.forget();
    catchingUp.clear();
    lent.clear();
    lending.forget();
    calls.forget();
    restedByBackground = null;
    ctx.tookOverNotice.value = null;
  };

  const lendWaiting = (): Promise<void> => lending.lendWaiting();

  return { holds, keepsLocal, maySendNow, signIn, takeOver, rest, withTurn, confirm, lost, switched, hidden, visible, lendWaiting, restore, forget };
};
