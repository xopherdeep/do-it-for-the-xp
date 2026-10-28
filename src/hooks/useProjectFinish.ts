import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { voiceFor, type Voice } from "@/lib/services/copy/voices";
import { rewardRevealPrompt } from "@/lib/services/projects/finishPrompts";
import { creditHeroesOf, creditsViewOf, finishStepFor, type CreditsView, type FinishStep } from "@/lib/services/projects/projectFinish";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { markSeen, readFinish, readTrophies } from "@/lib/services/projects/projectService";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/** Two moments are owed at most: the reward reveal, then the credits */
const MOMENTS = 2;

/** The next moment a hero is owed from the newest cleared run, and the run it is about */
interface Owed {
  project: ProjectRecord;
  step: FinishStep;
}

/**
 * What the portal tells a hero once a tower is won (Project Towers, section 7): the family reward as a reveal prompt,
 * then the credits roll, each once per hero. The hero is marked as told BEFORE it shows, so a second look (a route
 * change, a second phone) cannot show it twice; the trophy in Hometown can roll the credits again whenever they like.
 * The portal renders `<xp-reveal-prompt :prompt="finishPrompt" @respond="answerFinish" />` and, while `credits` is
 * set, `<credits-roll :credits="credits" @done="closeCredits" />`. It looks when the portal opens and when the hero
 * moves on, and holds off while they are in a temple or a fight, or while a Game Master plays them.
 */
export function useProjectFinish(heroId: string) {
  const route = useRoute();
  const userStore = useUserStore();
  const battleStore = useBattleStore();
  const { prompt: finishPrompt, showPrompt, submitAnswer: answerFinish } = useRevealPrompt();
  const credits = ref<CreditsView | null>(null);

  let endCredits: (() => void) | null = null;
  let isTelling = false;
  let isGone = false;

  const voice = (): Voice => voiceFor(userStore.getUserById(heroId));

  /** The portal is no place for it while the hero walks a temple, fights, or is played by a Game Master */
  const isHeld = (): boolean => {
    const isInTemple = route.name === "temple";
    const isPlayedByGameMaster = Boolean(userStore.currentUser.isImpersonating);
    return isInTemple || battleStore.active || isPlayedByGameMaster;
  };

  const rollCredits = (view: CreditsView): Promise<void> =>
    new Promise<void>((resolve) => {
      credits.value = view;
      endCredits = resolve;
    });

  const closeCredits = () => {
    credits.value = null;
    const done = endCredits;
    endCredits = null;
    done?.();
  };

  /** What the hero is owed from the newest cleared run (the one markSeen writes to), or null */
  const nextMoment = async (): Promise<Owed | null> => {
    const [newest] = await readTrophies();
    const project = newest ?? null;
    const step = finishStepFor(project, heroId);
    const isOwedNothing = !project || !step;
    if (isOwedNothing) return null;
    return { project, step };
  };

  const tellCredits = async (): Promise<void> => {
    const snapshot = await readFinish();
    if (!snapshot) return;
    await rollCredits(creditsViewOf(snapshot.project, snapshot.quests, snapshot.paid, creditHeroesOf(userStore.usersAz), voice()));
  };

  const tell = async (): Promise<void> => {
    for (let moment = 0; moment < MOMENTS; moment += 1) {
      const owed = await nextMoment();
      // Looked at again before each moment: a fight can begin while the reward shows (the ambush), and the credits must
      // not roll over it. What waits is told at the next look, when the fight is over.
      const hasNothingToTell = !owed || isGone || isHeld();
      if (hasNothingToTell) return;
      await markSeen(heroId, owed.step);
      const isReward = owed.step === "reward";
      if (isReward) await showPrompt(rewardRevealPrompt(owed.project, voice()));
      else await tellCredits();
    }
  };

  const look = async (): Promise<void> => {
    const isNotNow = isTelling || isHeld() || !userStore.getUserById(heroId);
    if (isNotNow) return;
    isTelling = true;
    try {
      await tell();
    } catch (error) {
      debug.warn("[ProjectFinish] the finish could not be told", error);
    } finally {
      isTelling = false;
    }
  };

  onMounted(() => void look());
  watch(() => route.fullPath, () => void look());
  watch(
    () => battleStore.active,
    (isFighting) => {
      if (!isFighting) void look();
    }
  );
  // The portal can open before the family's profiles are read: the hero is told once they are there
  watch(
    () => Boolean(userStore.getUserById(heroId)),
    (isThere) => {
      if (isThere) void look();
    }
  );
  onBeforeUnmount(() => {
    isGone = true;
    closeCredits();
  });

  return { finishPrompt, answerFinish, credits, closeCredits };
}
