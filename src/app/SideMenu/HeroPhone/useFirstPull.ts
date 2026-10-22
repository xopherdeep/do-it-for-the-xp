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
 * the phone on the hero's card. Offline on the way (or while the hero's profile is awaited), the progress line gives way
 * to the card and the clerk's "No signal" line as its footer; the store retries when the signal is back.
 *
 * The portal opens by itself only for a pull this screen watched finish: nothing else wants it. A cold start on a
 * finished pull (the licence, the roster or the hero still loading, or Save & Quit coming back to the card) shows the
 * card, and `play` is the way in. A pull can finish before the family device has sent the hero (it counts an empty page
 * as done), so the wish waits for the hero's profile to land on a later download and the progress line stays up
 * meanwhile. The wish ends when the portal opens, on Not now, on a failure (the hero rests) and when the pull stops
 * being done. The screen renders `<xp-reveal-prompt :prompt="prompt" @respond="answer" />` once, and its Play button
 * (shown when `isFullPortal`) calls `play`, which `canPlay` allows once the hero is here and no open is under way.
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
  const isOffline = computed(() => isArriving.value && sync.problem === "offline");

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

  const isOpening = ref(false);
  /** Whether Play can open the portal now: the hero's profile is here and no open is under way */
  const canPlay = computed(() => Boolean(hero.value) && !isOpening.value);

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
    if (isOpening.value) return;
    const profile = hero.value;
    const hasNoHero = !profile;
    if (hasNoHero) {
      debug.warn("hero-phone: the first pull is done but the hero has not arrived yet; waiting for them");
      return;
    }
    isOpening.value = true;
    try {
      const isPlayingHere = await requestTurn(profile);
      if (!isPlayingHere) return;
      userStore.loginUser(profile);
      await router.replace(landingPathFor(profile, landingChoiceOf(String(profile.id))));
    } catch (error) {
      debug.warn("hero-phone: could not open the portal", error);
      await restAfterFailure(String(profile.id));
    } finally {
      isOpening.value = false;
      isPortalWanted.value = false;
    }
  };

  const wantPortal = (): void => {
    isPortalWanted.value = true;
    void openPortal();
  };

  // A pull seen under way by this screen ends in the portal; a phone that was a full portal when the screen opened (or
  // became one as its licence loaded) waits for Play
  let hasSeenPull = isPulling.value;
  watch(isPulling, (isNowPulling) => {
    if (isNowPulling) hasSeenPull = true;
  });
  watch(
    () => sync.isFullPortal,
    (isFullPortal) => {
      const isWanted = isFullPortal && hasSeenPull;
      hasSeenPull = false;
      if (isWanted) wantPortal();
      else if (!isFullPortal) isPortalWanted.value = false;
    }
  );
  // The hero's profile lands on a download after the pull was done
  watch(hero, (profile) => {
    const hasArrived = Boolean(profile) && isPortalWanted.value;
    if (hasArrived) void openPortal();
  });

  /** Play: the same open as the end of a first pull, asked for by the player */
  const play = (): Promise<void> => openPortal();
  const isFullPortal = computed(() => sync.isFullPortal);
  /** The player said Not now: another device plays the hero, and this phone shows its board read-only until Play asks again */
  const isPlayedElsewhere = computed(() => {
    const heroId = phone.device?.heroId;
    return Boolean(heroId) && sync.stateOf(String(heroId)) === "busy";
  });

  return { prompt, answer, footer, play, canPlay, isFullPortal, isPlayedElsewhere };
}
