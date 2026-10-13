/**
 * Two small signals the game raises for multiplayer: a quest paid its rewards, and a hero was removed. The places that
 * pay and remove (QuestCompletionService, ProfileDb) only say what happened; the family store listens. A listener
 * that throws is logged and never breaks the game, nor the listeners after it.
 */
import debug from "@/lib/utils/debug";

export interface QuestPaid {
  heroId: string;
  questId: string;
  /** The XP the quest paid (the hunt bonus of a won fight included) */
  xp: number;
  /** True when the quest was finished by winning its battle */
  fight: boolean;
}

type Listener<T> = (payload: T) => void;

/** One signal: listeners subscribe and get a way to stop; emit tells them all, one failing never stops the rest */
const makeSignal = <T>(name: string) => {
  const listeners = new Set<Listener<T>>();
  const on = (fn: Listener<T>): (() => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };
  const emit = (payload: T): void => {
    for (const fn of [...listeners]) {
      try {
        fn(payload);
      } catch (error) {
        debug.error(`gameSignals: a ${name} listener failed`, error);
      }
    }
  };
  return { on, emit };
};

const questPaid = makeSignal<QuestPaid>("questPaid");
const heroRemoved = makeSignal<string>("heroRemoved");

export const onQuestPaid = questPaid.on;
export const emitQuestPaid = questPaid.emit;
export const onHeroRemoved = heroRemoved.on;
export const emitHeroRemoved = heroRemoved.emit;
