import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";

/**
 * Quest drafts (GitHub issue #126). Pure: no storage, no Vue.
 *
 * A quest made through New Quest is a draft (`draft: true` on the record, the DRAFT label in the Compendium) from its
 * first autosave until the Game Master taps Ready on the last step. Heroes never see a draft: every hero list leaves
 * drafts out (`hideDrafts`, QuestList.questListFor, QuestEngine.getAllQuests), the Game Master's Compendium keeps them.
 * A quest saved before the marker existed carries none and is published, so nothing leaves a Beast Log.
 *
 * Opening New Quest while a draft waits does not mint another quest: the Game Master is asked to resume it or discard
 * it (`newQuestOpening`, `unfinishedDraftPrompt`, `draftAction`); only when no draft waits does a fresh one start.
 */

/** As much of a quest record as the draft rules read */
export interface DraftLike {
  id?: string | number;
  achievementName?: string;
  draft?: boolean;
  /** A kid's proposal (creations.ts): a draft while it waits, but the kid's to finish, not the Game Master's */
  proposal?: { state: string };
}

/** A kid's quest still with the Game Master (waiting, or sent back): hidden like a draft, but not one New Quest resumes */
const isKidsProposal = (quest: Pick<DraftLike, "proposal">): boolean => Boolean(quest.proposal) && quest.proposal?.state !== "approved";

/** The badge on a hidden quest in the Compendium: "Waiting" on a kid's proposal (it is with the Game Master), "Draft" on the Game Master's own */
export const draftLabel = (quest: Pick<DraftLike, "proposal">): string => (isKidsProposal(quest) ? "Waiting" : "Draft");

/** A draft: saved, but not made Ready yet. A quest with no marker (saved before it existed) is published. */
export const isDraft = (quest: Pick<DraftLike, "draft"> | null | undefined): boolean => quest?.draft === true;

/** The quests a hero may see: all but the drafts, in order. The list given is not changed. */
export const hideDrafts = <Q extends DraftLike | null | undefined>(quests: readonly Q[]): Q[] =>
  quests.filter((quest) => !isDraft(quest));

/** What the wizard knows when it autosaves: whether heroes already see the quest, and whether every step is answered */
export interface DraftSaveState {
  /** Made Ready before (or saved before drafts existed): heroes see it */
  isPublished: boolean;
  /** Every step has its answer (questConfigWizard.isQuestReady) */
  isComplete: boolean;
}

/**
 * Whether an autosave writes the quest as a draft. A quest that was never made Ready stays a draft however complete it
 * is: only Ready publishes it. A published quest stays live while it is complete and hides while an edit leaves it
 * incomplete.
 */
export const isDraftOnSave = ({ isPublished, isComplete }: DraftSaveState): boolean => {
  const isLiveEdit = isPublished && isComplete;
  return !isLiveEdit;
};

/** Every draft of the Game Master's own waiting in the Compendium, in the order stored; kids' proposals and empty rows are skipped */
export const unfinishedDrafts = <Q extends DraftLike>(quests: readonly (Q | null | undefined)[]): Q[] =>
  quests.filter((quest): quest is Q => isDraft(quest) && !isKidsProposal(quest as Q));

/** The draft New Quest offers to resume (the first one stored), or null when none waits */
export const findUnfinishedDraft = <Q extends DraftLike>(quests: readonly (Q | null | undefined)[]): Q | null =>
  unfinishedDrafts(quests)[0] ?? null;

/** What New Quest does: start a fresh quest, or ask about a draft first (`waiting` counts every draft, this one too) */
export type NewQuestOpening<Q extends DraftLike> = { kind: "fresh" } | { kind: "ask"; draft: Q; waiting: number };

/** A fresh quest only when no draft waits; otherwise ask about the first one */
export const newQuestOpening = <Q extends DraftLike>(quests: readonly (Q | null | undefined)[]): NewQuestOpening<Q> => {
  const drafts = unfinishedDrafts(quests);
  const hasNoDraft = drafts.length === 0;
  if (hasNoDraft) return { kind: "fresh" };
  return { kind: "ask", draft: drafts[0], waiting: drafts.length };
};

/** What the Game Master picked: open the draft, delete it, or leave New Quest with nothing changed */
export type DraftAction = "resume" | "discard" | "back";

/** The answer to the prompt as an action. Anything but Resume or Discard (Not now, Escape, the screen leaving) backs out. */
export const draftAction = (answerId: string): DraftAction => {
  const isPicked = answerId === "resume" || answerId === "discard";
  return isPicked ? (answerId as DraftAction) : "back";
};

/** Who speaks the prompt on the quest config screen */
export const QUEST_SCRIBE = "Quest Scribe";

const moreLine = (others: number): string =>
  others === 1 ? "1 more unfinished quest waits in the Compendium." : `${others} more unfinished quests wait in the Compendium.`;

/**
 * The in-world prompt New Quest shows while a draft waits: Resume opens it, Discard deletes it (Delete with cleanup),
 * Not now leaves. Escape and a back gesture are Not now, so nothing is ever discarded by accident. `extra` is the
 * screen's own look (the quest app's accent).
 */
export const unfinishedDraftPrompt = (
  draft: DraftLike,
  waiting: number,
  extra: Partial<RevealPromptOptions> = {}
): RevealPromptOptions => {
  const name = draft.achievementName?.trim() || "This quest";
  const others = Math.max(0, Math.floor(waiting) - 1);
  const hasOthers = others > 0;
  return {
    speaker: QUEST_SCRIBE,
    title: "Unfinished quest",
    sprite: "tablet",
    lines: [
      `${name} is still a draft, Game Master. The heroes can't see it yet.`,
      ...(hasOthers ? [moreLine(others)] : []),
      "Pick up where you left off, or tear it up?",
    ],
    choices: [
      { id: "resume", label: "Resume", icon: "pen", hint: "Back to where you left off", tone: "primary" },
      { id: "discard", label: "Discard", icon: "trash-alt", hint: "Delete it for good", tone: "plain" },
      { id: "back", label: "Not now", icon: "times", tone: "ghost" },
    ],
    cancelId: "back",
    ...extra,
  };
};
