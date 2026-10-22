import { computed, watch } from "vue";
import type { ActiveRevealPrompt } from "@/components/organisms/RevealPrompt/revealPrompt";
import { useRouter } from "vue-router";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { voiceFor, type Voice, type VoiceProfile } from "@/lib/services/copy/voices";
import { busyPrompt, firstPushPrompt, tookOverPrompt } from "@/lib/services/sync/syncPrompts";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The clerk's questions about a hero's turn (family sync spec, section 5), for the profile picker and the portal. Each
 * screen renders `<xp-reveal-prompt :prompt="prompt" @respond="respond" />` once. The store does the asking and the
 * resting (stores/sync.ts); these only ask the player and pass the answer on.
 */

type SyncStore = ReturnType<typeof useSyncStore>;
type Ask = (options: ReturnType<typeof busyPrompt>) => Promise<string>;

/** The first push's progress line is one prompt that stays on screen while the count grows */
const PUSH_KEY = -1;

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
 * The clerk speaks in the picked hero's voice. `beforeAsking` runs before the busy question shows (the picker's loading
 * line steps aside for it).
 */
export function useTurnGate() {
  const sync = useSyncStore();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

  const requestTurn = async (profile: VoiceProfile & { id: string | number }, beforeAsking?: () => Promise<unknown>): Promise<boolean> => {
    const heroId = String(profile.id);
    const answer = await sync.signIn(heroId);
    const isBusy = answer === "busy";
    if (!isBusy) return true;
    await beforeAsking?.();
    return askToPlayHere(sync, heroId, nickOf(profile), showPrompt, voiceFor(profile));
  };

  return { prompt, respond: submitAnswer, requestTurn };
}

/**
 * The portal of a hero: when another device took the hero over while this one played, the clerk says so once and the
 * turn is asked for again; when the hero's turn is busy (the app came back to the front, a hold made offline was
 * answered), the clerk asks whether to play here. Not now rests the hero (the device holding it is the truth) and signs
 * it out of the portal: a family device goes back to the profile picker, a kid phone to the hero's card, where the board
 * shows read-only and Play asks again (spec sections 5 and 7). Nothing of the hero plays on here: no reminder, no ambush.
 * While a family device's first push runs, the clerk's progress line shows under the questions (spec section 4).
 */
export function usePortalTurn(heroId: string) {
  const sync = useSyncStore();
  const userStore = useUserStore();
  const router = useRouter();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();
  const hero = (): VoiceProfile | undefined => userStore.getUserById(heroId);
  const nick = (): string => nickOf(hero());
  const voice = (): Voice => voiceFor(hero());

  /** One question at a time; what arrived meanwhile (a took-over notice, a busy turn) is taken up once it is over */
  let isTalking = false;
  const talk = async (job: () => Promise<void>): Promise<void> => {
    if (isTalking) return;
    isTalking = true;
    try {
      await job();
    } finally {
      isTalking = false;
    }
    talkAboutWhatWaits();
  };

  const askBusy = async (): Promise<void> => {
    const isHere = await askToPlayHere(sync, heroId, nick(), showPrompt, voice());
    if (isHere) return;
    userStore.logoutUser();
    await router.replace({ name: sync.isFamilyDevice ? "xp-profile" : "hero-phone" });
  };

  const afterTakeover = async (): Promise<void> => {
    sync.tookOverNotice = null;
    // Asked again at once: the busy answer names the device that took the hero over
    await sync.signIn(heroId);
    await showPrompt(tookOverPrompt(nick(), sync.turns[heroId]?.busy?.label ?? null, voice()));
    const isBusy = sync.turns[heroId]?.state === "busy";
    if (isBusy) await askBusy();
  };

  /** The took-over line first, then the busy question; nothing when neither waits */
  function talkAboutWhatWaits(): void {
    const isTakenOver = sync.tookOverNotice === heroId;
    const isBusy = sync.turns[heroId]?.state === "busy";
    if (isTakenOver) void talk(afterTakeover);
    else if (isBusy) void talk(askBusy);
  }

  watch(() => sync.tookOverNotice, talkAboutWhatWaits, { immediate: true });
  watch(() => sync.turns[heroId]?.state, talkAboutWhatWaits, { immediate: true });

  /** "Sending the family's save to the site…" with the count, while the first push runs; one prompt, so its key never changes */
  const pushPrompt = computed<ActiveRevealPrompt | null>(() => {
    const sent = sync.firstPushProgress;
    const isPushing = typeof sent === "number";
    return isPushing ? { key: PUSH_KEY, options: firstPushPrompt(sent, voice()) } : null;
  });

  return { prompt: computed(() => prompt.value ?? pushPrompt.value), respond: submitAnswer };
}
