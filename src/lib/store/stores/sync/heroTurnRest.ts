import type { TurnEvent, TurnState } from "@/lib/services/sync/heroTurn";
import debug from "@/lib/utils/debug";

/**
 * Giving a hero's turn back (section 5 of the family sync spec, "Sign-out ... held -> resting: upload what waits, then
 * POST rest"), for the hero's turn engine (sync/heroTurns.ts).
 *
 * - A turn is never given back while the hero's records are still waiting here (a send failed, a pause runs, a batch did
 *   not go): the hero stays held, on this device and on the site, and the rest is owed. The next device to ask then hears
 *   "busy", never a silent grant over a copy that lacks those records. After the next good round the owed rest is tried
 *   again (upload, then rest), until the records have gone.
 * - A player who picks the hero again (a sign-in, Play here) claims it: a rest under way leaves it held, and an owed rest
 *   is forgotten.
 * - One rest per hero at a time; a second waits for the first (failed or not), then looks again.
 * - A hero whose turn is busy (the player's "Not now", or a confirm that heard busy while the rest uploaded) is declined:
 *   the device holding it is the truth (the engine's `decline`).
 */
export interface RestContext {
  stateOf(heroId: string): TurnState;
  dispatch(heroId: string, event: TurnEvent): void;
  isOn(): boolean;
  /** Sends what waits, including what was written a moment ago */
  upload(): Promise<void>;
  /** The heroes whose records wait in the outbox */
  waiting(): string[];
  /** POST rest */
  giveBack(heroId: string): Promise<void>;
  /** Not now on a busy hero: the device holding it is the truth, and this device's changes to it go */
  decline(heroId: string): Promise<void>;
}

export interface TurnRests {
  rest(heroId: string): Promise<void>;
  /** The rest in flight for the hero, if any: a sign-in waits for it */
  inFlight(heroId: string): Promise<void> | undefined;
  /** The player wants the hero here: a rest under way leaves it held, an owed rest is forgotten */
  claim(heroId: string): void;
  /** A hero kept held because its records did not reach the site: the rest is tried again after a good round */
  owe(heroId: string): void;
  /** After a good round: the rests owed are tried again (upload, then rest), except for the hero the player is on */
  retryOwed(current: string | null): Promise<void>;
  forget(): void;
}

export const createTurnRests = (ctx: RestContext): TurnRests => {
  /** heroId -> the rest in flight */
  const resting = new Map<string, Promise<void>>();
  /** heroId -> how many times the player claimed the hero: a rest that sees a new claim after its upload leaves it held */
  const claims = new Map<string, number>();
  /** Heroes kept held because their records did not reach the site; the rest is tried again after a good round */
  const owed = new Set<string>();

  const isWaiting = (heroId: string): boolean => ctx.waiting().includes(heroId);

  /** Held: what waits goes up, the turn ends here (unless the player claimed it meanwhile, or the records did not go) */
  const restNow = async (heroId: string): Promise<void> => {
    const isBusy = ctx.stateOf(heroId) === "busy";
    if (isBusy) return ctx.decline(heroId);
    const isHeldOnline = ctx.stateOf(heroId) === "held" && ctx.isOn();
    if (!isHeldOnline) {
      // Asking, or the sync off: the hero simply rests here
      ctx.dispatch(heroId, { type: "signOut" });
      return;
    }
    const claimedAt = claims.get(heroId) ?? 0;
    await ctx.upload();
    const isClaimedAgain = (claims.get(heroId) ?? 0) !== claimedAt;
    if (isClaimedAgain) return;
    // A provisional hold's confirm may have heard busy during the upload: the other device is the truth
    const isBusyNow = ctx.stateOf(heroId) === "busy";
    if (isBusyNow) return ctx.decline(heroId);
    const isUnsent = isWaiting(heroId);
    if (isUnsent) {
      const isFirstTime = !owed.has(heroId);
      owed.add(heroId);
      if (isFirstTime) debug.warn(`sync: ${heroId}'s records did not reach the site; the turn stays here until they do`);
      return;
    }
    owed.delete(heroId);
    // Rested before the site hears it, so no upload can send a record the site would refuse as a takeover
    ctx.dispatch(heroId, { type: "signOut" });
    await ctx.giveBack(heroId);
  };

  const rest = (heroId: string): Promise<void> => {
    const before = resting.get(heroId) ?? Promise.resolve();
    const run = before.then(() => restNow(heroId));
    // What waits on the rest (the next rest, a sign-in) never sees it fail
    const settled = run.catch((error) => debug.warn("sync: could not rest the hero", error));
    resting.set(heroId, settled);
    const forgetRest = (): void => {
      const isThisRest = resting.get(heroId) === settled;
      if (isThisRest) resting.delete(heroId);
    };
    void settled.then(forgetRest);
    return run;
  };

  const claim = (heroId: string): void => {
    claims.set(heroId, (claims.get(heroId) ?? 0) + 1);
    owed.delete(heroId);
  };

  const retryOwed = async (current: string | null): Promise<void> => {
    for (const heroId of Array.from(owed)) {
      const isPlayers = heroId === current;
      const isHeld = ctx.stateOf(heroId) === "held";
      const isDue = !isPlayers && isHeld;
      if (isDue) await rest(heroId);
      else owed.delete(heroId);
    }
  };

  const forget = (): void => {
    resting.clear();
    owed.clear();
  };

  return { rest, inFlight: (heroId) => resting.get(heroId), claim, owe: (heroId) => owed.add(heroId), retryOwed, forget };
};
