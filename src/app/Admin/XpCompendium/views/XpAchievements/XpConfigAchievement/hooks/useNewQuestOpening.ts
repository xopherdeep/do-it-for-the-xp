import { onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";

import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { XP_APP_ACCENTS } from "@/components/organisms/XpApp/useAppSkin";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { deleteQuest } from "@/lib/services/compendium/deleteContent";
import { draftAction, unfinishedDraftPrompt } from "@/lib/services/quests/questDrafts";
import type { NewQuestOpening } from "@/lib/services/quests/questDrafts";

/** What New Quest needs from the quest wizard page: reading the drafts, opening a quest, speaking, and leaving */
export interface NewQuestOpeningParts {
  /** What New Quest opens on: a fresh quest, or the draft to ask about (the form's loadNewQuestOpening) */
  loadOpening: () => Promise<NewQuestOpening<Achievement>>;
  /** Load the quest and show its steps */
  openQuest: (questId: string) => Promise<void>;
  /** An rpg toast in the middle of the screen */
  say: (header: string, message?: string) => Promise<void>;
  /** Leave the wizard, back to where it was opened from */
  goBack: () => void;
}

/**
 * New Quest: a draft still waiting is resumed or discarded first, in the game's own prompt; only with none is a new id
 * minted. The page renders `newQuestPrompt` once (`<xp-reveal-prompt @respond="submitAnswer">`) and calls
 * `startNewQuest` when it opens on a new quest.
 */
export function useNewQuestOpening({ loadOpening, openQuest, say, goBack }: NewQuestOpeningParts) {
  const router = useRouter();
  const { prompt: newQuestPrompt, showPrompt: askAboutDraft, submitAnswer } = useRevealPrompt();

  // The prompt settles as Not now when the page goes away mid-question: then nothing more happens here
  let isGone = false;
  onBeforeUnmount(() => {
    isGone = true;
  });

  /** Open a quest and give the page its address: load it first, so the state is ready */
  const openAt = (questId: string) => {
    void openQuest(questId);
    router.replace({
      name: "xp-achievement-config-dashboard",
      params: { id: questId },
    });
  };

  const readOpening = async (): Promise<NewQuestOpening<Achievement>> => {
    try {
      return await loadOpening();
    } catch (error) {
      debug.warn("[QuestWizard] the drafts could not be read", error);
      return { kind: "fresh" };
    }
  };

  const discardDraft = async (draft: Achievement): Promise<boolean> => {
    try {
      // Delete with cleanup: nothing is left pointing at the draft
      await deleteQuest(draft);
      return true;
    } catch (error) {
      debug.warn("[QuestWizard] the draft could not be discarded", error);
      play$fx("no");
      void say("It could not be discarded", "The draft is still in the Compendium.");
      return false;
    }
  };

  const settleNewQuest = async (): Promise<void> => {
    const opening = await readOpening();
    const isFresh = opening.kind === "fresh";
    if (isFresh) return openAt(uuidv4());
    const answer = await askAboutDraft(unfinishedDraftPrompt(opening.draft, opening.waiting, { accent: XP_APP_ACCENTS.quests }));
    if (isGone) return;
    const action = draftAction(answer);
    const isResuming = action === "resume";
    if (isResuming) return openAt(String(opening.draft.id));
    const isDiscarded = action === "discard" && (await discardDraft(opening.draft));
    // The next draft is asked about in turn; a new id only once none is left
    if (isDiscarded) return settleNewQuest();
    goBack();
  };

  // One question at a time: a second ask would settle the first as Not now and leave the page
  let isStarting = false;
  const startNewQuest = async (): Promise<void> => {
    if (isStarting) return;
    isStarting = true;
    try {
      await settleNewQuest();
    } finally {
      isStarting = false;
    }
  };

  return { newQuestPrompt, submitAnswer, startNewQuest };
}
