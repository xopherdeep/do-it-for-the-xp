/**
 * The Game Master's quest config as steps of the shared wizard shell (docs: compendium-wizards-design, W4): What's the
 * chore? -> Who does it? -> When? -> How hard? -> Ready? Pure: no Vue, no storage, no router. The page
 * (XpConfigAchievement) holds the quest it is editing as the draft, paints one step at a time in XpWizardShell, and its
 * 2 second autosave stays the draft mechanism; the last step's verb marks the quest Ready.
 *
 * The rules are the ones the old tabs and the Save chip already had, kept in one list: a quest is complete (READY,
 * visible to heroes) when it has a name, a category, a kind, a beast or chain quests where the kind needs them, a hero
 * unless it is an Open Bounty, and a difficulty. Each rule belongs to the step that asks for it, so a step's reason
 * and the chip's "still missing" list can never disagree.
 */
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import { firstIndex, isReady, lastIndex, skippedAt, stepVerdict } from "@/lib/services/wizard/wizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

export type QuestStepId = "chore" | "who" | "when" | "hard" | "ready";

/** The fields the step rules read: any Achievement fits (the page passes the quest it is editing). */
export type QuestConfigDraft = Partial<
  Pick<Achievement, "achievementName" | "categoryId" | "adventureType" | "beastId" | "subAchievementIds" | "type" | "assignee" | "difficulty">
>;

export type QuestKind = "simple" | "beast" | "chain";

/** One segment of step one: the kind, its label and icon, and the line under it. */
interface QuestKindChoice {
  value: QuestKind;
  label: string;
  icon: string;
  hint: string;
}

/** Normal, beast or chain: the segments of step one (the quest's `adventureType`). */
export const QUEST_KINDS: readonly QuestKindChoice[] = [
  { value: "simple", label: "Normal", icon: "check", hint: "A plain chore: make the bed, practise piano." },
  { value: "beast", label: "Beast", icon: "paw-claws", hint: "A chore turned monster. Pick the beast the hero fights." },
  { value: "chain", label: "Chain", icon: "link", hint: "Several quests tied into one arc, done in order." },
];

/** How the quest is shared: the segments of step two (the quest's `type`), the short word for each. */
export const ASSIGNMENT_CHOICES: readonly { value: string; label: string }[] = [
  { value: "asNeeded", label: "Open" },
  { value: "individual", label: "Solo" },
  { value: "collaborate", label: "Team" },
  { value: "rotate", label: "Rotate" },
  { value: "compete", label: "Race" },
];

// ---------------------------------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------------------------------

interface QuestRule {
  /** The step that asks for it */
  step: QuestStepId;
  /** The one line a parent would say */
  reason: string;
  isMet(draft: QuestConfigDraft): boolean;
}

const isKind = (value: unknown): value is QuestKind => QUEST_KINDS.some((kind) => kind.value === value);

/** In the order the steps ask, so the first unmet rule of a step is the one its reason names. */
const RULES: readonly QuestRule[] = [
  { step: "chore", reason: "Name the chore", isMet: (draft) => Boolean(draft.achievementName?.trim()) },
  { step: "chore", reason: "Pick a category", isMet: (draft) => Boolean(draft.categoryId) },
  { step: "chore", reason: "Choose normal, beast or chain", isMet: (draft) => isKind(draft.adventureType) },
  { step: "chore", reason: "Pick the beast to fight", isMet: (draft) => draft.adventureType !== "beast" || Boolean(draft.beastId) },
  {
    step: "chore",
    reason: "Add a quest to the chain",
    isMet: (draft) => draft.adventureType !== "chain" || (draft.subAchievementIds?.length ?? 0) > 0,
  },
  // An Open Bounty is open to every hero, so it names none
  { step: "who", reason: "Pick at least one hero", isMet: (draft) => draft.type === "asNeeded" || (draft.assignee?.length ?? 0) > 0 },
  { step: "hard", reason: "Set the difficulty", isMet: (draft) => Boolean(draft.difficulty) },
];

/** The first thing the step still wants, or true: what the shell's `isValid` hands back. */
const stepProblem =
  (step: QuestStepId) =>
  (draft: QuestConfigDraft): boolean | string =>
    RULES.find((rule) => rule.step === step && !rule.isMet(draft))?.reason ?? true;

/** Every line still missing, in the order the steps ask. Empty means the quest is complete. */
export const questMissing = (draft: QuestConfigDraft): string[] => RULES.filter((rule) => !rule.isMet(draft)).map((rule) => rule.reason);

/** Complete: READY on the ribbon, listed for heroes. The same answer as `isReady` over the steps. */
export const isQuestReady = (draft: QuestConfigDraft): boolean => RULES.every((rule) => rule.isMet(draft));

// ---------------------------------------------------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The five screens, the guide line in the Game Master's voice (the Quest tabs' coach lines, one per screen). When and
 * the summary never block: the schedule has defaults from the start and Ready is only the look-over.
 */
export const questConfigSteps = (): WizardStep<QuestConfigDraft>[] => [
  {
    id: "chore",
    title: "What's the chore?",
    guide: "Name the chore, file it, and say if it is a plain chore, a beast or a chain.",
    icon: "scroll",
    isValid: stepProblem("chore"),
  },
  {
    id: "who",
    title: "Who does it?",
    guide: "Choose how it is shared, then the heroes. An Open Bounty is open to everyone.",
    icon: "users",
    isValid: stepProblem("who"),
  },
  {
    id: "when",
    title: "When?",
    guide: "When does it start, when is it due, and how often does it come back?",
    icon: "calendar",
    isValid: () => true,
  },
  {
    id: "hard",
    title: "How hard?",
    guide: "How hard is it? The difficulty sets the XP, GP and AP it pays.",
    icon: "dumbbell",
    isValid: stepProblem("hard"),
  },
  {
    id: "ready",
    title: "Ready?",
    guide: "Look it over. Is the chore ready for the heroes?",
    icon: "shield-check",
    isValid: () => true,
  },
];

/** Where the wizard opens a quest: a new one on step one, a complete one on the summary, a draft where it still wants an answer. */
export const openingIndex = (steps: readonly WizardStep<QuestConfigDraft>[], draft: QuestConfigDraft, isSaved: boolean): number => {
  if (!isSaved) return firstIndex(steps, draft);
  if (isReady(steps, draft)) return lastIndex(steps, draft);
  const waiting = steps.findIndex((step, index) => !skippedAt(steps, draft, index) && !stepVerdict(step, draft).valid);
  return waiting === -1 ? lastIndex(steps, draft) : waiting;
};

/** The place of a step in the list (-1 for an id that is not one). */
export const stepIndexOf = (steps: readonly WizardStep<QuestConfigDraft>[], id: QuestStepId): number =>
  steps.findIndex((step) => step.id === id);

/**
 * The summary card's tiles name the old tab they led to; they now lead to the step that owns the answer. Approval and
 * priority are asked with the difficulty, the category with the name.
 */
export const stepForSegment = (segment: string): QuestStepId => {
  switch (segment) {
    case "quest-type":
    case "category":
      return "chore";
    case "heros":
      return "who";
    case "when":
      return "when";
    case "points":
    case "approval":
    case "bonus":
      return "hard";
    default:
      return "ready";
  }
};

/** "For Mia, Sam" under the quest's name when it is made Ready; "Open to every hero" for an Open Bounty; "" when no hero is named. */
export const readySubtitle = (draft: Pick<QuestConfigDraft, "type" | "assignee">, heroName: (id: string) => string): string => {
  if (draft.type === "asNeeded") return "Open to every hero";
  const names = (draft.assignee ?? []).map(heroName).filter(Boolean);
  if (!names.length) return "";
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `For ${shown} and ${names.length - 3} more` : `For ${shown}`;
};

// ---------------------------------------------------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------------------------------------------------

/** What is saved for a typed category name: trimmed, with runs of spaces made one. */
export const cleanCategoryName = (name: string): string => name.trim().replace(/\s+/g, " ");

/** The category a typed name already is (any case, any spacing), so typing "kitchen" picks Kitchen instead of adding a second one. */
export const findCategory = <Category extends Pick<AchievementCategoryInterface, "name">>(
  categories: readonly Category[],
  typed: string
): Category | undefined => {
  const wanted = cleanCategoryName(typed).toLowerCase();
  return wanted ? categories.find((category) => cleanCategoryName(category.name ?? "").toLowerCase() === wanted) : undefined;
};
