import { computed, watch } from "vue";
import type { Router } from "vue-router";
import type { ActiveRevealPrompt } from "@/components/organisms/RevealPrompt/revealPrompt";
import { useTurnGate } from "@/hooks/useHeroTurn";
import { voiceFor } from "@/lib/services/copy/voices";
import { landingChoiceOf, landingPathFor } from "@/lib/services/core/profilePrefs";
import { firstPullPrompt, offlinePrompt } from "@/lib/services/sync/syncPrompts";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/** What the screen needs to know about this phone: kid mode, and the hero it was linked to */
interface PhoneOwner {
  isKidMode: boolean;
  device: { heroId: string } | null;
}

/** The pull line is one prompt that stays on screen while the count grows, so its key never changes */
const PULL_KEY = 0;

/**
 * A Pro kid phone's first open after linking (family sync spec, section 7): the clerk's progress line while the family's
 * world downloads, then the hero's turn is asked for, the hero signs in and the portal opens. Not now on the turn leaves
 * the phone on its read-only board. Offline on the way, the progress line gives way to the board and the clerk's
 * "No signal" line as its footer; the store retries when the signal is back.
 *
 * The portal opens when the pull finishes while this screen is up. A screen reached afterwards (Save & Quit returns to
 * the hero's card) stays put. The screen renders `<xp-reveal-prompt :prompt="prompt" @respond="answer" />` once.
 */
export function useFirstPull(phone: PhoneOwner, router: Pick<Router, "replace">) {
  const sync = useSyncStore();
  const userStore = useUserStore();
  const { prompt: turnPrompt, respond: answer, requestTurn } = useTurnGate();

  const hero = computed(() => {
    const heroId = phone.device?.heroId;
    return heroId ? userStore.users[heroId] : undefined;
  });
  const voice = computed(() => voiceFor(hero.value));

  /** A kid phone with the family's Pro whose first pull has not finished */
  const isPulling = computed(() => phone.isKidMode && sync.isOn && !sync.isFullPortal);
  const isFetching = computed(() => isPulling.value && sync.problem === null);
  const isOffline = computed(() => isPulling.value && sync.problem === "offline");

  const pullPrompt = computed<ActiveRevealPrompt | null>(() =>
    isFetching.value ? { key: PULL_KEY, options: firstPullPrompt(sync.firstPullProgress, voice.value) } : null
  );
  /** The clerk's question about the hero's turn, else the progress line */
  const prompt = computed(() => turnPrompt.value ?? pullPrompt.value);
  /** The line under the board while the first pull waits for a signal */
  const footer = computed(() => (isOffline.value ? offlinePrompt(voice.value).lines[0] : ""));

  let isOpening = false;

  /** Asks for the hero's turn; unless it is left to the other device, signs the hero in and opens their portal */
  const openPortal = async (): Promise<void> => {
    const profile = hero.value;
    const hasNoHero = !profile;
    const isUnable = hasNoHero || isOpening;
    if (isUnable) return;
    isOpening = true;
    try {
      const isPlayingHere = await requestTurn(profile);
      if (!isPlayingHere) return;
      userStore.loginUser(profile);
      await router.replace(landingPathFor(profile, landingChoiceOf(String(profile.id))));
    } catch (error) {
      debug.warn("hero-phone: could not open the portal", error);
    } finally {
      isOpening = false;
    }
  };

  watch(
    () => sync.isFullPortal,
    (isFullPortal) => {
      if (isFullPortal) void openPortal();
    }
  );

  return { prompt, answer, footer };
}
