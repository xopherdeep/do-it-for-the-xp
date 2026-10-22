import { computed, ref, watch } from "vue";
import type { Router } from "vue-router";
import type { ActiveRevealPrompt } from "@/components/organisms/RevealPrompt/revealPrompt";
import { useTimers } from "@/hooks/useTimers";
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

/** The line retypes whenever its text changes, so the count it shows moves at most this often */
const PROGRESS_MS = 1000;

/**
 * A Pro kid phone's first open after linking (family sync spec, section 7): the clerk's progress line while the family's
 * world downloads, then the hero's turn is asked for, the hero signs in and the portal opens. Not now on the turn leaves
 * the phone on its read-only board. Offline on the way, the progress line gives way to the board and the clerk's
 * "No signal" line as its footer; the store retries when the signal is back.
 *
 * The portal is wanted when the pull finishes while this screen is up, or when the screen opens on a finished pull whose
 * hero is not on the phone yet. A pull can finish before the family device has sent the hero (it counts an empty page as
 * done), so the wish waits for the hero's profile to land on a later download and the progress line stays up meanwhile.
 * The wish ends when the portal opens, on Not now, on a failure (the hero rests) and when the pull stops being done. A
 * screen reached after a finished pull whose hero is here (Save & Quit returns to the hero's card) stays put.
 * The screen renders `<xp-reveal-prompt :prompt="prompt" @respond="answer" />` once.
 */
export function useFirstPull(phone: PhoneOwner, router: Pick<Router, "replace">) {
  const sync = useSyncStore();
  const userStore = useUserStore();
  const timers = useTimers();
  const { prompt: turnPrompt, respond: answer, requestTurn } = useTurnGate();

  const hero = computed(() => {
    const heroId = phone.device?.heroId;
    return heroId ? userStore.users[heroId] : undefined;
  });
  const voice = computed(() => voiceFor(hero.value));

  /** A kid phone with the family's Pro whose first pull has not finished */
  const isPulling = computed(() => phone.isKidMode && sync.isOn && !sync.isFullPortal);
  /** The pull is done and the portal is to open: it waits for the hero's profile, then asks for the turn */
  const isPortalWanted = ref(false);
  const isArriving = computed(() => isPulling.value || isPortalWanted.value);
  const isFetching = computed(() => isArriving.value && sync.problem === null);
  const isOffline = computed(() => isPulling.value && sync.problem === "offline");

  // --- The count on the line, moved at most once a second (the newest count always gets its turn) ---

  const shownCount = ref(sync.firstPullProgress);
  let shownAt = 0;
  let waiting: number | null = null;

  const showCount = (): void => {
    shownCount.value = sync.firstPullProgress;
    shownAt = Date.now();
    waiting = null;
  };

  watch(
    () => sync.firstPullProgress,
    () => {
      const isThrottled = waiting !== null;
      if (isThrottled) return;
      const wait = PROGRESS_MS - (Date.now() - shownAt);
      const isDue = wait <= 0;
      if (isDue) showCount();
      else waiting = timers.startTimeout(wait, showCount);
    }
  );

  const pullPrompt = computed<ActiveRevealPrompt | null>(() =>
    isFetching.value ? { key: PULL_KEY, options: firstPullPrompt(shownCount.value, voice.value) } : null
  );
  /** The clerk's question about the hero's turn, else the progress line */
  const prompt = computed(() => turnPrompt.value ?? pullPrompt.value);
  /** The line under the board while the first pull waits for a signal */
  const footer = computed(() => (isOffline.value ? offlinePrompt(voice.value).lines[0] : ""));

  // --- Opening the portal ---

  let isOpening = false;

  /** A failed open leaves nobody signed in, so the hero's turn goes back rather than stay held */
  const restAfterFailure = async (heroId: string): Promise<void> => {
    try {
      await sync.rest(heroId);
    } catch (error) {
      debug.warn("hero-phone: could not rest the hero", error);
    }
  };

  /**
   * Asks for the hero's turn; unless it is left to the other device, signs the hero in and opens their portal. Without
   * the hero's profile it waits (the wish stays) for it to land. The wish ends however an open goes.
   */
  const openPortal = async (): Promise<void> => {
    if (isOpening) return;
    const profile = hero.value;
    const hasNoHero = !profile;
    if (hasNoHero) {
      debug.warn("hero-phone: the first pull is done but the hero has not arrived yet; waiting for them");
      return;
    }
    isOpening = true;
    try {
      const isPlayingHere = await requestTurn(profile);
      if (!isPlayingHere) return;
      userStore.loginUser(profile);
      await router.replace(landingPathFor(profile, landingChoiceOf(String(profile.id))));
    } catch (error) {
      debug.warn("hero-phone: could not open the portal", error);
      await restAfterFailure(String(profile.id));
    } finally {
      isOpening = false;
      isPortalWanted.value = false;
    }
  };

  const wantPortal = (): void => {
    isPortalWanted.value = true;
    void openPortal();
  };

  watch(
    () => sync.isFullPortal,
    (isFullPortal) => {
      if (isFullPortal) wantPortal();
      else isPortalWanted.value = false;
    }
  );
  // The hero's profile lands on a download after the pull was done
  watch(hero, (profile) => {
    const hasArrived = Boolean(profile) && isPortalWanted.value;
    if (hasArrived) void openPortal();
  });
  const isWaitingForHero = sync.isFullPortal && !hero.value;
  if (isWaitingForHero) wantPortal();

  return { prompt, answer, footer };
}
