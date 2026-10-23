import type { TurnState } from "@/lib/services/sync/heroTurn";
import debug from "@/lib/utils/debug";

/**
 * The borrowing pass of the hero's turn engine (sync/heroTurns.ts), run after every round: each hero whose records wait
 * on this device, whom this device does not play and is not signed in as, sends them on its free turn, borrowed through
 * `withTurn` and given back (busy: they keep waiting, and the holder's copies replace them as they land). Before the
 * borrowing, the pass settles three leftovers: the heroes held again after a restart that the player is not on are rested
 * (sent, then given back), a rest kept held because its records did not reach the site is tried again, and a give-back
 * the site did not hear is sent again (never for a hero whose records still wait: the borrowing sends them first).
 */
export interface LendingContext {
  stateOf(heroId: string): TurnState;
  /** The heroes whose records wait in the outbox, in queue order */
  waiting(): string[];
  /** The hero signed in on this device, if any: never borrowed, never rested by the pass */
  current(): string | null;
  /** Whether a pass may run now: the sync on, and no pause after a failure */
  mayLend(): boolean;
  withTurn(heroId: string, fn: () => Promise<void>): Promise<boolean>;
  rest(heroId: string): Promise<void>;
  /** POST rest for a hero already resting here */
  giveBack(heroId: string): Promise<void>;
  /** The rests kept held because the hero's records did not reach the site, tried again (sync/heroTurnRest.ts) */
  retryRests(): Promise<void>;
}

export interface TurnLending {
  /** Runs the pass, or joins the one running */
  lendWaiting(): Promise<void>;
  /** A give-back the site did not hear: sent again before the next pass */
  owe(heroId: string): void;
  /** The site heard the give-back, or the player took the hero again: nothing is owed */
  forgive(heroId: string): void;
  /** A hero held again after a restart: rested by the next pass unless the player is on it */
  restored(heroId: string): void;
  forget(): void;
}

export const createTurnLending = (ctx: LendingContext): TurnLending => {
  /** Heroes rested here whose give-back the site did not hear: it still thinks this device plays them */
  const owedRests = new Set<string>();
  /** Heroes held again after a restart, until the next pass rests those the player is not on */
  const restoredHeroes = new Set<string>();
  /** The pass running, so a second round joins it instead of borrowing the same hero twice */
  let lending: Promise<void> | null = null;

  /** Gives back again what the site did not hear, for heroes still resting here whose records have all gone */
  const payOwedRests = async (): Promise<void> => {
    for (const heroId of Array.from(owedRests)) {
      const isResting = ctx.stateOf(heroId) === "resting";
      const isUnsent = ctx.waiting().includes(heroId);
      if (!isResting) owedRests.delete(heroId);
      else if (!isUnsent) await ctx.giveBack(heroId);
    }
  };

  /** Heroes held again after a restart whom the player is not on (a borrow cut off, say) are rested: sent, then given back */
  const settleRestored = async (): Promise<void> => {
    for (const heroId of Array.from(restoredHeroes)) {
      restoredHeroes.delete(heroId);
      const isPlayers = heroId === ctx.current();
      if (!isPlayers) await ctx.rest(heroId);
    }
  };

  /** A hero whose records wait here, whom this device does not play and is not signed in as: its free turn is borrowed */
  const mayLendHero = (heroId: string): boolean => {
    const isFree = ctx.stateOf(heroId) === "resting";
    const isSignedIn = heroId === ctx.current();
    const isStillWaiting = ctx.waiting().includes(heroId);
    return isFree && !isSignedIn && isStillWaiting;
  };

  const lendPass = async (): Promise<void> => {
    await settleRestored();
    await ctx.retryRests();
    await payOwedRests();
    for (const heroId of ctx.waiting()) {
      const isLendable = ctx.mayLend() && mayLendHero(heroId);
      // Nothing to run: taking the turn flushes the hero's records, and giving it back uploads what is left
      if (isLendable) await ctx.withTurn(heroId, async () => undefined);
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

  return {
    lendWaiting,
    owe: (heroId) => owedRests.add(heroId),
    forgive: (heroId) => owedRests.delete(heroId),
    restored: (heroId) => restoredHeroes.add(heroId),
    forget: () => {
      owedRests.clear();
      restoredHeroes.clear();
    },
  };
};
