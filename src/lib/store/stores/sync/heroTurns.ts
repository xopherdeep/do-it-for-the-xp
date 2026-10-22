import type { Ref } from "vue";
import { familyProblem } from "@/lib/services/multiplayer/familyServer";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { playHero, restHero, type PlayAnswer } from "@/lib/services/sync/familySyncClient";
import { initialTurn, maySend, turnReducer, type HeroTurn, type TurnEvent } from "@/lib/services/sync/heroTurn";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The hero's turn on this device (section 5 of the family sync spec): asking the site for it, giving it back, the busy
 * answer, the offline hold and the takeover. Every change of a turn goes through `turnReducer` (services/sync/heroTurn.ts);
 * this file makes the calls and feeds it what the site answered.
 *
 * - A granted turn first downloads while the hero is still `asking`, so the copies of the device that played the hero
 *   last land over anything changed here without the turn (the transfer lets a hero record of a hero this device does
 *   not play land, and drops the change it replaces); then the turn is `held` and the store flushes (upload, download).
 * - A hold made offline (`provisional`) plays on, but its records go only once the site has confirmed it: every upload
 *   asks again first (`confirm`, from inside the lane), so a hiccup can never make the site refuse them as a takeover.
 * - A turn borrowed by `withTurn` (a verdict paid for a hero nobody plays) is given back at the end, unless the player
 *   signed the hero in meanwhile.
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
  /** Drops every queued record of the hero: after a takeover they can never be written */
  dropHero(heroId: string): Promise<void>;
  /** The site answered a turn call */
  answered(): void;
  /** The site said the family is not Pro: the store turns the sync off, as for any call */
  notPro(error: unknown): void;
}

/** What asking for the turn came to: this device's, another device holds it, or the site could not be asked */
export type TurnAnswer = "granted" | "busy" | "offline";

export interface HeroTurns {
  /** The hero is held here, provisional or not: this device plays it and runs its clocks */
  holds(heroId: string): boolean;
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
  /** The device left the family: nothing in flight is remembered */
  forget(): void;
}

type Answer = PlayAnswer | { answer: "offline" };

export const createHeroTurns = (ctx: TurnContext): HeroTurns => {
  /** heroId -> the ask in flight, so a second sign-in joins it and a sign-out can give a late grant back */
  const asking = new Map<string, Promise<TurnAnswer>>();
  /** heroId -> the catch-up after a takeover; a sign-in waits for it */
  const catchingUp = new Map<string, Promise<void>>();
  /** heroId -> how many withTurn calls borrow the turn; a sign-in claims the hero for the player */
  const lent = new Map<string, number>();
  /** The hero the background rested, signed in again when the app is back */
  let restedByBackground: string | null = null;

  const turnOf = (heroId: string): HeroTurn => ctx.turns.value[heroId] ?? initialTurn();
  const stateOf = (heroId: string): HeroTurn["state"] => turnOf(heroId).state;

  const dispatch = (heroId: string, event: TurnEvent): void => {
    const turn = turnOf(heroId);
    const next = turnReducer(turn, event);
    const hasChanged = next !== turn;
    if (hasChanged) ctx.turns.value = { ...ctx.turns.value, [heroId]: next };
  };

  const holds = (heroId: string): boolean => maySend(turnOf(heroId));

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
    } catch (error) {
      failed(error);
    }
  };

  /** The hero is `asking`: POST play, then the answer through the reducer */
  const take = (heroId: string, force: boolean): Promise<TurnAnswer> => {
    const isAsking = (): boolean => stateOf(heroId) === "asking";
    const asked = (async (): Promise<TurnAnswer> => {
      const answer = await ask(heroId, force);
      const isOffline = answer.answer === "offline";
      if (isOffline) {
        dispatch(heroId, { type: "offline" });
        return "offline";
      }
      const isBusy = answer.answer === "busy";
      if (isBusy) {
        dispatch(heroId, { type: "busy", device: answer.device });
        return "busy";
      }
      // Granted: catch up while the hero is still asking, so the last player's copies land over changes made here without the turn
      if (isAsking()) await ctx.download();
      // Signed out meanwhile: the site must not go on thinking this device plays the hero
      if (!isAsking()) {
        await giveBack(heroId);
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

  /** The player plays the hero here: a turn borrowed by withTurn is not given back at its end */
  const claim = (heroId: string): void => {
    lent.delete(heroId);
  };

  /** What a turn already settled here answers */
  const answerOf = (turn: HeroTurn): TurnAnswer => {
    const isBusy = turn.state === "busy";
    if (isBusy) return "busy";
    return turn.provisional ? "offline" : "granted";
  };

  /** A resting hero is asked for; an ask in flight is joined; a turn already settled here answers as it stands */
  const answerFor = (heroId: string): Promise<TurnAnswer> => {
    const turn = turnOf(heroId);
    const isResting = turn.state === "resting";
    if (isResting) {
      dispatch(heroId, { type: "signIn" });
      return take(heroId, false);
    }
    return asking.get(heroId) ?? Promise.resolve(answerOf(turn));
  };

  const signIn = async (heroId: string): Promise<TurnAnswer> => {
    if (!ctx.isOn()) return "granted";
    await catchingUp.get(heroId);
    const answer = await answerFor(heroId);
    const isPlaying = answer !== "busy";
    if (isPlaying) claim(heroId);
    return answer;
  };

  const takeOver = async (heroId: string): Promise<void> => {
    if (!ctx.isOn()) return;
    const state = stateOf(heroId);
    const isBusy = state === "busy";
    const isResting = state === "resting";
    const mayAsk = isBusy || isResting;
    if (!mayAsk) return;
    dispatch(heroId, isBusy ? { type: "force" } : { type: "signIn" });
    await take(heroId, true);
    claim(heroId);
  };

  /** Held: what waits goes up, the turn ends here, then the site is told. Asking or busy: the hero simply rests */
  const rest = async (heroId: string): Promise<void> => {
    if (!ctx.isOn()) return;
    const isHeld = stateOf(heroId) === "held";
    if (!isHeld) {
      // An ask still out is given back by take() when its grant arrives
      dispatch(heroId, { type: "signOut" });
      return;
    }
    await ctx.upload();
    // Rested before the site hears it, so no upload can send a record the site would refuse as a takeover
    dispatch(heroId, { type: "signOut" });
    await giveBack(heroId);
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
      await take(heroId, false);
    }
    const isTaken = holds(heroId) && !turnOf(heroId).provisional;
    if (!isTaken) {
      // Busy: the device that plays the hero does it; offline: nothing is borrowed on a hold the site has not seen
      const isStillLent = lent.has(heroId);
      lent.delete(heroId);
      if (isStillLent) dispatch(heroId, stateOf(heroId) === "busy" ? { type: "decline" } : { type: "signOut" });
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
      if (isGranted) dispatch(heroId, { type: "granted" });
      if (isBusy) dispatch(heroId, { type: "busy", device: answer.device });
    }
  };

  const lost = (heroIds: string[]): void => {
    for (const heroId of heroIds) {
      const isHeldHere = holds(heroId);
      if (!isHeldHere) continue;
      dispatch(heroId, { type: "refused" });
      lent.delete(heroId);
      // The catch-up runs after the transfer that heard the refusal; `takenOver` has one exit, however it ends
      const caughtUp = ctx
        .dropHero(heroId)
        .then(() => ctx.download())
        .catch((error) => debug.warn(`sync: catching up after ${heroId} was taken over failed`, error))
        .then(() => {
          dispatch(heroId, { type: "caughtUp" });
          ctx.tookOverNotice.value = heroId;
          catchingUp.delete(heroId);
        });
      catchingUp.set(heroId, caughtUp);
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
    catchingUp.clear();
    lent.clear();
    restedByBackground = null;
    ctx.tookOverNotice.value = null;
  };

  return { holds, maySendNow, signIn, takeOver, rest, withTurn, confirm, lost, switched, hidden, visible, forget };
};
