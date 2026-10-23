import type { TurnBusy } from "@/lib/services/sync/heroTurn";
import type { Answer } from "./heroTurnCalls";

/**
 * Confirming the holds made offline (section 5 of the family sync spec, "Offline when asking ... the ask is retried"),
 * for the hero's turn engine (sync/heroTurns.ts): every upload asks the site again for each provisional hold first, from
 * inside the lane, so a hiccup never makes the site refuse its records as a takeover.
 *
 * - Granted, with changes made here: held at once, so they go in this upload (a read first would stop at them). The
 *   player's own offline play (an offline hold the player made, or the hero the player is on after a restart) goes up
 *   whole: the holder's copy is the truth, and the verdicts kept meanwhile apply on it. Work on the hero waits until it
 *   has caught up (`behind`).
 * - Granted, with nothing changed here: it first reads to the newest record (a borrow may have written meanwhile), and
 *   stays provisional, sending nothing of the hero, until it can.
 * - Busy: the offline play waits for the player's answer, never dropped before it. Unknown: the engine forgets it.
 */
export interface ConfirmContext {
  /** The heroes held here provisionally */
  provisional(): string[];
  ask(heroId: string, force: boolean): Promise<Answer>;
  /** The heroes whose records wait in the outbox */
  waiting(): string[];
  /** The hero signed in on this device */
  current(): string | null;
  /** An offline hold the player made from the first ask */
  isPlayedOffline(heroId: string): boolean;
  /** Queues every record of the hero this device holds */
  queueWhole(heroId: string): Promise<void>;
  /** Reads to the newest record from inside the lane; false when it could not get there */
  readHere(): Promise<boolean>;
  failed(error: unknown): void;
  /** The hold is confirmed; `isBehind` when it sends before it has read */
  granted(heroId: string, isBehind: boolean): void;
  busy(heroId: string, device: TurnBusy): void;
  unknown(heroId: string): Promise<void>;
}

export const createConfirm = (ctx: ConfirmContext): (() => Promise<void>) => {
  const readHere = async (): Promise<boolean> => {
    try {
      return await ctx.readHere();
    } catch (error) {
      ctx.failed(error);
      return false;
    }
  };

  const confirmGranted = async (heroId: string): Promise<void> => {
    const isUnsent = ctx.waiting().includes(heroId);
    const isPlayersOwn = ctx.isPlayedOffline(heroId) || heroId === ctx.current();
    const isWholeCopy = isUnsent && isPlayersOwn;
    if (isWholeCopy) await ctx.queueWhole(heroId);
    const isCaughtUp = isUnsent || (await readHere());
    if (isCaughtUp) ctx.granted(heroId, isUnsent);
  };

  return async (): Promise<void> => {
    for (const heroId of ctx.provisional()) {
      const answer = await ctx.ask(heroId, false);
      const isGranted = answer.answer === "granted";
      const isBusy = answer.answer === "busy";
      const isUnknown = answer.answer === "unknown";
      if (isGranted) await confirmGranted(heroId);
      if (isBusy) ctx.busy(heroId, answer.device);
      if (isUnknown) await ctx.unknown(heroId);
    }
  };
};
