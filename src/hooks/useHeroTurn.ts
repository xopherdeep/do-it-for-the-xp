import { watch } from "vue";
import { useRouter } from "vue-router";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { voiceFor, type Voice, type VoiceProfile } from "@/lib/services/copy/voices";
import { busyPrompt, tookOverPrompt } from "@/lib/services/sync/syncPrompts";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The clerk's questions about a hero's turn (family sync spec, section 5), for the profile picker and the portal. Each
 * screen renders `<xp-reveal-prompt :prompt="prompt" @respond="respond" />` once. The store does the asking and the
 * resting (stores/sync.ts); these only ask the player and pass the answer on.
 */

type SyncStore = ReturnType<typeof useSyncStore>;
type Ask = (options: ReturnType<typeof busyPrompt>) => Promise<string>;

/** A hero's nickname for the clerk's lines */
const nickOf = (profile: unknown): string => {
  const name = (profile as { name?: { nick?: unknown } } | null | undefined)?.name;
  const nick = typeof name?.nick === "string" ? name.nick.trim() : "";
  return nick || "Your hero";
};

/** "Still playing on {device}. Play here anyway?" Play here takes the turn over (true); Not now rests the hero (false) */
const askToPlayHere = async (sync: SyncStore, heroId: string, nick: string, ask: Ask, voice: Voice): Promise<boolean> => {
  const busy = sync.turns[heroId]?.busy ?? { label: "", lastSeenAt: null };
  const pick = await ask(busyPrompt(nick, busy, new Date(), voice));
  const isPlayHere = pick === "play";
  if (isPlayHere) {
    await sync.takeOver(heroId);
    return true;
  }
  await sync.rest(heroId);
  return false;
};

/**
 * The profile picker on a family device: the hero's turn is asked for before the portal opens. `requestTurn` resolves
 * true to play here (granted, offline, or Play here anyway) and false for Not now (the hero rests, the picker stays).
 * The clerk speaks in the picked hero's voice.
 */
export function useTurnGate() {
  const sync = useSyncStore();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

  const requestTurn = async (profile: VoiceProfile & { id: string | number }): Promise<boolean> => {
    const heroId = String(profile.id);
    const answer = await sync.signIn(heroId);
    const isBusy = answer === "busy";
    if (!isBusy) return true;
    return askToPlayHere(sync, heroId, nickOf(profile), showPrompt, voiceFor(profile));
  };

  return { prompt, respond: submitAnswer, requestTurn };
}

/**
 * The portal of a hero: when another device took the hero over while this one played, the clerk says so once and the
 * turn is asked for again; when the hero's turn is busy (the app came back to the front, a hold made offline was
 * answered), the clerk asks whether to play here. Not now on a family device signs out to the profile picker; on a kid
 * phone the hero rests here (its read-only board is Task 20's).
 */
export function usePortalTurn(heroId: string) {
  const sync = useSyncStore();
  const userStore = useUserStore();
  const router = useRouter();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();
  const hero = (): VoiceProfile | undefined => userStore.getUserById(heroId);
  const nick = (): string => nickOf(hero());
  const voice = (): Voice => voiceFor(hero());

  /** One question at a time: a busy turn noticed while the clerk is already talking is part of that talk */
  let isTalking = false;
  const talk = async (job: () => Promise<void>): Promise<void> => {
    if (isTalking) return;
    isTalking = true;
    try {
      await job();
    } finally {
      isTalking = false;
    }
  };

  const askBusy = async (): Promise<void> => {
    const isHere = await askToPlayHere(sync, heroId, nick(), showPrompt, voice());
    const isBackToPicker = !isHere && sync.isFamilyDevice;
    if (!isBackToPicker) return;
    userStore.logoutUser();
    await router.replace({ name: "xp-profile" });
  };

  const afterTakeover = async (): Promise<void> => {
    sync.tookOverNotice = null;
    // Asked again at once: the busy answer names the device that took the hero over
    await sync.signIn(heroId);
    await showPrompt(tookOverPrompt(nick(), sync.turns[heroId]?.busy?.label ?? null, voice()));
    const isBusy = sync.turns[heroId]?.state === "busy";
    if (isBusy) await askBusy();
  };

  watch(
    () => sync.tookOverNotice,
    (notice) => {
      const isThisHero = notice === heroId;
      if (isThisHero) void talk(afterTakeover);
    },
    { immediate: true }
  );
  watch(
    () => sync.turns[heroId]?.state,
    (state) => {
      const isBusy = state === "busy";
      if (isBusy) void talk(askBusy);
    },
    { immediate: true }
  );

  return { prompt, respond: submitAnswer };
}
