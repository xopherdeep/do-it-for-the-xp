import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { voiceFor, type VoiceProfile } from "@/lib/services/copy/voices";
import { heroBusyForGmPrompt, heroUnreachableForGmPrompt } from "@/lib/services/sync/syncPrompts";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useUserStore } from "@/lib/store/stores/user";

/** A hero's nickname for the clerk's line */
const nickOf = (profile: unknown): string => {
  const nick = (profile as { name?: { nick?: unknown } } | undefined)?.name?.nick;
  return typeof nick === "string" && nick.trim() ? nick.trim() : "This hero";
};

/**
 * A Game Master's change to a hero's records from the Game Master console (a purchase fulfilled or refunded, a Dashboard
 * bonus or penalty, a profile edit, a bill forgiven, a power ended), under Family Sync (spec section 5, "Game Master
 * actions on a hero played elsewhere"): it runs on the hero's turn. Held here, it is applied as today; free, this device
 * takes the turn, applies, uploads and rests; when another device plays the hero, the clerk says "{nick} is playing on
 * {device}. Try again when they rest." and nothing is written (when the turn cannot be had, the clerk says the hero
 * cannot be reached). With Family Sync off it simply runs. The screen renders
 * `<xp-reveal-prompt :prompt="prompt" @respond="respond" />` once; `writeHero` resolves true when the change was made.
 */
export function useHeroWrite() {
  const sync = useSyncStore();
  const userStore = useUserStore();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

  const writeHero = async (heroId: string, change: () => Promise<void>): Promise<boolean> => {
    const use = await sync.borrow(heroId, change);
    if (use.ran) return true;
    const nick = nickOf(userStore.getUserById(heroId));
    const voice = voiceFor(userStore.getUserById(String(userStore.currentUser?.id ?? "")) as VoiceProfile | undefined);
    const line = use.busy ? heroBusyForGmPrompt(nick, use.busy.label, voice) : heroUnreachableForGmPrompt(nick, voice);
    await showPrompt(line);
    return false;
  };

  return { prompt, respond: submitAnswer, writeHero };
}

/** What a screen holds of the clerk's gate (XpHeroWriteGate.vue): the change runs on the hero's turn */
export interface HeroWriteGate {
  writeHero(heroId: string, change: () => Promise<void>): Promise<boolean>;
}

/** A save that edits a hero runs through the screen's gate on the hero's turn; a new hero (no gate) is saved at once */
export const saveHeroEdit = async (gate: HeroWriteGate | undefined, heroId: string, save: () => Promise<void>): Promise<boolean> => {
  if (gate) return gate.writeHero(heroId, save);
  await save();
  return true;
};

/**
 * Runs a change that answers something (a progress record, whether an item was unlocked) on the hero's turn through a
 * screen's `writeHero`; answers what it came to, or "refused" when it did not run (the clerk has said why)
 */
export const resultOnTurn = async <T>(writeHero: HeroWriteGate["writeHero"], heroId: string, work: () => Promise<T>): Promise<T | "refused"> => {
  const holder: { value?: T } = {};
  const isWritten = await writeHero(heroId, async () => {
    holder.value = await work();
  });
  return isWritten ? (holder.value as T) : "refused";
};
