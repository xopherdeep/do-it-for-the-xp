/**
 * The Game Master's beast form as steps of the shared wizard shell (docs: compendium-wizards-design, sections 1 and 3):
 * Pick its look, Name it, Chores that beat it, then the summary whose button is Summon. Pure: no Vue, no storage; the
 * page (components/XpAddBeast.vue) holds a draft, calls these to change it and saves `beastPatch(draft)`.
 *
 * The draft owns only what the form shows. The stored beast also carries the quests it is attached to (achievementIds),
 * its art element, its temple theme and its second look; the patch never names them and BestiaryDb.setBeast merges the
 * patch into the stored record, so an edit cannot wipe them.
 */
import type { Beast } from "@/lib/databases/BestiaryDb";
import { firstIndex, lastIndex } from "@/lib/services/wizard/wizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

export type BeastStepId = "look" | "name" | "chores" | "summon";

export interface BeastDraft {
  /** The stored beast's id; empty for a new beast (the Bestiary gives it one on the first save) */
  id: string;
  name: string;
  /** One chore per row, in the order the heroes do them; a row may be blank while a parent edits it */
  checklist: string[];
  /** The picture's number (NNN.webp in assets/images/beasts); 0 until one is picked */
  avatar: number;
  /**
   * A photo of a drawing as a data URL (kid creations): the beast's look when it is set, drawn over a library avatar if
   * one is also picked. Undefined when the beast never had one; "" when a library beast replaced a stored drawing, so
   * the patch can wipe it.
   */
  localImage?: string;
  /** The two layers of the Earthbound battle backdrop it fights on (0 to 327) */
  bg1: number;
  bg2: number;
  aspectRatio: number;
}

export interface BeastSummaryLine {
  /** The step a tap on this line goes back to */
  stepId: BeastStepId;
  label: string;
  value: string;
  /** The answer is not given yet: the line is marked, and Summon says why it is shut */
  isMissing: boolean;
}

/** How many backdrops the battle engine has (indexes 0 to 327) */
const BACKGROUND_COUNT = 328;

/** The letterbox the form has always used for a beast's battle backdrop */
const DEFAULT_ASPECT_RATIO = 64;

const isBackground = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < BACKGROUND_COUNT;

const randomBackground = (random: () => number): number => Math.floor(random() * BACKGROUND_COUNT);

/**
 * A new beast: nothing chosen yet, a backdrop drawn at random unless the Bestiary handed one over (its query's bg1 and
 * bg2). A number that is no backdrop is drawn again rather than trusted.
 */
export const newBeastDraft = (
  start: { bg1?: number; bg2?: number } = {},
  random: () => number = Math.random
): BeastDraft => ({
  id: "",
  name: "",
  checklist: [],
  avatar: 0,
  bg1: isBackground(start.bg1) ? start.bg1 : randomBackground(random),
  bg2: isBackground(start.bg2) ? start.bg2 : randomBackground(random),
  aspectRatio: DEFAULT_ASPECT_RATIO,
});

/** A stored beast as a draft: the fields copied, so the page can edit them without touching the stored object. */
export const draftFromBeast = (beast: Beast): BeastDraft => ({
  id: beast.id ? String(beast.id) : "",
  name: beast.name ?? "",
  checklist: Array.isArray(beast.checklist) ? [...beast.checklist] : [],
  avatar: Number(beast.avatar) || 0,
  // Only a beast that has a drawing gives the draft one, so a save of any other beast never names the field
  ...(beast.localImage ? { localImage: beast.localImage } : {}),
  bg1: beast.bg1 ?? 0,
  bg2: beast.bg2 ?? 0,
  aspectRatio: beast.aspectRatio ?? DEFAULT_ASPECT_RATIO,
});

/**
 * The draft after a library beast is picked: the avatar set, and a drawing snapped earlier let go. A draft that had a
 * drawing keeps the field as "" (not removed) so beastPatch tells the Bestiary to wipe the stored one; a draft that
 * never had one stays without the field.
 */
export const withLibraryLook = (draft: BeastDraft, avatar: number): BeastDraft => ({
  ...draft,
  avatar,
  ...(draft.localImage ? { localImage: "" } : {}),
});

// ---------------------------------------------------------------------------------------------------------------------
// The chore list: pure moves over a copy, so the page replaces its array and never edits one in place
// ---------------------------------------------------------------------------------------------------------------------

/** The chores that count: trimmed, in order, blank rows left out. */
export const filledChores = (draft: Pick<BeastDraft, "checklist">): string[] =>
  draft.checklist.map((chore) => chore.trim()).filter((chore) => chore.length > 0);

/** A chore at the end of the list; text of only spaces adds nothing. */
export const addChore = (list: readonly string[], text: string): string[] => {
  const chore = text.trim();
  return chore ? [...list, chore] : [...list];
};

/** A chore one place up (-1) or down (1); a move off either end leaves the list as it is. */
export const moveChore = (list: readonly string[], index: number, step: -1 | 1): string[] => {
  const target = index + step;
  const isOffList = index < 0 || index >= list.length || target < 0 || target >= list.length;
  if (isOffList) return [...list];
  const moved = [...list];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
};

/** The list without the chore at that place; a place that is not there drops nothing. */
export const dropChore = (list: readonly string[], index: number): string[] => list.filter((_, at) => at !== index);

// ---------------------------------------------------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------------------------------------------------

const NEEDS_LOOK = "Pick a look";
const NEEDS_NAME = "Give it a name";
const NEEDS_CHORE = "Add one chore it loses to";

const hasDrawing = (draft: BeastDraft): boolean => Boolean(draft.localImage);
const hasLook = (draft: BeastDraft): boolean => draft.avatar > 0 || hasDrawing(draft);
const hasName = (draft: BeastDraft): boolean => draft.name.trim().length > 0;
const hasChore = (draft: BeastDraft): boolean => filledChores(draft).length > 0;

/**
 * The first thing the beast still needs, in the order the steps ask, or null when it is finished. The shell's Summon
 * says the same thing through the steps' reasons; the page also uses it before it saves.
 */
export const beastProblem = (draft: BeastDraft): string | null => {
  if (!hasLook(draft)) return NEEDS_LOOK;
  if (!hasName(draft)) return NEEDS_NAME;
  if (!hasChore(draft)) return NEEDS_CHORE;
  return null;
};

/**
 * The four screens, with the guide's line in the Game Master's voice and the one-line reason a screen gives while
 * Next is shut. The summary asks nothing of its own: the shell opens the verb only when every other step is answered
 * and then names the first one that is not.
 */
export const beastWizardSteps = (): WizardStep<BeastDraft>[] => [
  {
    id: "look",
    title: "Pick its look",
    guide: "Choose the face of the beast and the field where it fights.",
    icon: "eye",
    isValid: (draft) => (hasLook(draft) ? true : NEEDS_LOOK),
  },
  {
    id: "name",
    title: "Name it",
    guide: "What do the heroes call it? Give it a name worth fearing.",
    icon: "pencil",
    isValid: (draft) => (hasName(draft) ? true : NEEDS_NAME),
  },
  {
    id: "chores",
    title: "Chores that beat it",
    guide: "List the chores that bring it down, in the order the heroes do them.",
    icon: "tasks",
    isValid: (draft) => (hasChore(draft) ? true : NEEDS_CHORE),
  },
  {
    id: "summon",
    title: "Summon",
    guide: "Here it stands. Tap a line to change it, or summon it.",
    icon: "magic",
    isValid: () => true,
  },
];

/** A new beast opens on its first step; an edit opens on the summary, with the dots to go back. */
export const openingIndex = (steps: readonly WizardStep<BeastDraft>[], draft: BeastDraft): number =>
  draft.id ? lastIndex(steps, draft) : firstIndex(steps, draft);

// ---------------------------------------------------------------------------------------------------------------------
// The summary and the save
// ---------------------------------------------------------------------------------------------------------------------

const choresText = (count: number): string => {
  const hasNoChores = count === 0;
  if (hasNoChores) return "No chores";
  return count === 1 ? "1 chore" : `${count} chores`;
};

/** What the look line says: the drawing wins when there is one, because it is the portrait the form shows. */
const lookText = (draft: BeastDraft): string => {
  if (hasDrawing(draft)) return "Your drawing";
  return hasLook(draft) ? `Beast ${String(draft.avatar).padStart(3, "0")}` : "Not picked";
};

/** One line per answer for the summary; a tap on a line goes back to the step that owns it. */
export const beastSummary = (draft: BeastDraft): BeastSummaryLine[] => {
  const count = filledChores(draft).length;
  return [
    {
      stepId: "look",
      label: "Look",
      value: lookText(draft),
      isMissing: !hasLook(draft),
    },
    { stepId: "name", label: "Name", value: hasName(draft) ? draft.name.trim() : "Not named", isMissing: !hasName(draft) },
    { stepId: "chores", label: "Chores", value: choresText(count), isMissing: count === 0 },
  ];
};

/**
 * What goes to BestiaryDb.setBeast: only the fields the form owns, cleaned. A new beast has no id (the Bestiary gives
 * one); an edit names its beast, and setBeast merges the patch into the stored record so the quests it is attached to,
 * its element, its temple theme and its second look stay.
 */
export const beastPatch = (draft: BeastDraft): Beast => ({
  ...(draft.id ? { id: draft.id } : {}),
  name: draft.name.trim(),
  checklist: filledChores(draft),
  avatar: draft.avatar,
  // Named only when the draft has the field (see withLibraryLook), so a beast with no drawing is saved without touching it
  ...(draft.localImage !== undefined ? { localImage: draft.localImage } : {}),
  bg1: draft.bg1,
  bg2: draft.bg2,
  aspectRatio: draft.aspectRatio,
});
