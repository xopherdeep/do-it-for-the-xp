import { familyProblem } from "@/lib/services/multiplayer/familyServer";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { playHero, restHero, type PlayAnswer } from "@/lib/services/sync/familySyncClient";
import { TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The two turn calls of the hero's turn engine (sync/heroTurns.ts): POST play (`ask`) and POST rest (`giveBack`). Both
 * are local-first: a failure is an answer that could not be had, never an error the player sees. A hero the site does
 * not know (404) is said once; a hero this device no longer has loses its queued records, and is owed no give-back.
 */
export interface TurnCallsContext {
  /** The sign-in for a turn call; null while the sync is off */
  auth(): TownHallAuth | null;
  /** What the site calls this device in a busy answer */
  label(): string;
  /** The site answered a turn call */
  answered(): void;
  /** The site said the family is not Pro */
  notPro(error: unknown): void;
  /** Whether this device still has the hero */
  hasHero(heroId: string): boolean;
  /** Drops every queued record of the hero: they can never be written */
  dropHero(heroId: string): Promise<void>;
  /** A give-back the site did not hear, sent again by the next borrowing pass */
  owe(heroId: string): void;
  /** Nothing is owed for the hero any more */
  forgive(heroId: string): void;
}

/** What POST play came to: the site's answer, no answer at all, or a hero the site does not know */
export type Answer = PlayAnswer | { answer: "offline" } | { answer: "unknown" };

export interface TurnCalls {
  /** POST play; a failure of any kind is an ask that could not be made (local-first: the hero plays on) */
  ask(heroId: string, force: boolean): Promise<Answer>;
  /** POST rest: the site clears the turn only if this device holds it, so a late or repeated one is harmless */
  giveBack(heroId: string): Promise<void>;
  /** The site does not know the hero: said once; a hero this device no longer has loses its queued records */
  unknownHero(heroId: string): Promise<void>;
  /** A turn call failed: offline is expected, a lapsed licence is the store's, anything else is logged */
  failed(error: unknown): void;
  forget(): void;
}

/** The site has no such hero (removed, or not registered yet) */
const isUnknownHero = (error: unknown): boolean => error instanceof TownHallError && error.status === 404;

export const createTurnCalls = (ctx: TurnCallsContext): TurnCalls => {
  /** Heroes the site did not know, said once */
  const unknownSaid = new Set<string>();

  const failed = (error: unknown): void => {
    const found = familyProblem(error);
    const isNotPro = found === "pro-required";
    const isUnexpected = !isNotPro && found !== "offline";
    if (isNotPro) ctx.notPro(error);
    if (isUnexpected) debug.warn("sync: a turn call failed", error);
  };

  const unknownHero = async (heroId: string): Promise<void> => {
    const isRemoved = !ctx.hasHero(heroId);
    const isFirstTime = !unknownSaid.has(heroId);
    unknownSaid.add(heroId);
    if (isFirstTime) debug.warn(`sync: the site does not know hero ${heroId}${isRemoved ? "; its queued records are dropped" : "; its records wait"}`);
    // Nothing to give back for a hero the site does not know
    ctx.forgive(heroId);
    if (isRemoved) await ctx.dropHero(heroId);
  };

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

  const giveBack = async (heroId: string): Promise<void> => {
    const auth = ctx.auth();
    if (!auth) return;
    try {
      const { deviceId } = await ensureIdentity();
      await restHero(auth, heroId, deviceId);
      ctx.forgive(heroId);
    } catch (error) {
      const isUnknown = isUnknownHero(error);
      if (isUnknown) return unknownHero(heroId);
      ctx.owe(heroId);
      failed(error);
    }
  };

  return { ask, giveBack, unknownHero, failed, forget: () => unknownSaid.clear() };
};
