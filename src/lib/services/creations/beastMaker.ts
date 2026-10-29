/**
 * The Beast Maker: a kid's beast as steps of the shared wizard shell (kid-creations design, section 5). Look, Name,
 * Chores, then Ready with "Send it"; the draft is the Game Master's (beastWizard.ts: newBeastDraft, the chore moves,
 * beastProblem, beastPatch) so the two forms can never disagree about what a beast is. Pure: no Vue, no storage; the
 * modal (XpBeastMakerModal.vue) holds the draft, calls these, and saves `proposedBeast(draft, heroId, now)`.
 */
import { beastPatch, beastWizardSteps, withLibraryLook } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { keywords } from "@/lib/services/bestiary/librarySuggest";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";
import { propose } from "./creations";

export type MakerStepId = "look" | "name" | "chores" | "ready";

const STEP_IDS: readonly MakerStepId[] = ["look", "name", "chores", "ready"];

/** The dots' labels; the header carries the Maker's own title on every step */
const STEP_TITLE: Record<MakerStepId, string> = { look: "Look", name: "Name", chores: "Chores", ready: "Ready" };

const STEP_ICON: Record<MakerStepId, string> = { look: "camera", name: "pencil", chores: "tasks", ready: "paper-plane" };

/** A kid's beast loses to at most this many chores: enough for a beast, few enough to type on a phone */
export const MAX_MAKER_CHORES = 5;

const alwaysValid = (): true => true;

/**
 * The four screens. The guide's line comes from the catalog in the hero's voice; what each screen needs is the Game
 * Master's own rule (one look, a name, one chore), read from their steps so the reason reads the same in both forms.
 * Ready asks nothing: the shell opens Send it once the three before it are answered.
 */
export const makerSteps = (voice: Voice): WizardStep<BeastDraft>[] => {
  const gameMasters = beastWizardSteps();
  const asksLike = (id: MakerStepId): WizardStep<BeastDraft>["isValid"] =>
    gameMasters.find((step) => step.id === id)?.isValid ?? alwaysValid;
  return STEP_IDS.map((id) => ({
    id,
    title: STEP_TITLE[id],
    guide: copyFor(`beastMaker.guide.${id}`, voice),
    icon: STEP_ICON[id],
    isValid: id === "ready" ? alwaysValid : asksLike(id),
  }));
};

/** A chore at the end of the list, unless the list is full; the answer is always a copy, blank text adds nothing. */
export const addMakerChore = (list: readonly string[], text: string): string[] => {
  const chore = text.trim();
  const isFull = list.length >= MAX_MAKER_CHORES;
  const addsNothing = isFull || !chore;
  return addsNothing ? [...list] : [...list, chore];
};

/**
 * The draft wearing a library beast: its portrait (a drawing snapped earlier is let go, as in the Game Master's form)
 * and its own battlefield when the library gives one; a beast with no backdrop of its own leaves the pair the draft
 * was dealt when it was started.
 */
export const libraryLook = (draft: BeastDraft, entry: Pick<Beast, "avatar" | "bg1" | "bg2">): BeastDraft => ({
  ...withLibraryLook(draft, Number(entry.avatar) || 0),
  bg1: entry.bg1 ?? draft.bg1,
  bg2: entry.bg2 ?? draft.bg2,
});

// ---------------------------------------------------------------------------------------------------------------------
// Suggest a name
// ---------------------------------------------------------------------------------------------------------------------

/** What a beast can be called: the thing of the chore, then one of these */
export const NAME_SUFFIXES: readonly string[] = ["Beast", "Goblin", "Fiend", "Dragon", "Ghoul", "Gremlin"];

/** Three names for a beast whose chores say nothing (no chores yet, or only small words) */
const STOCK_NAMES: readonly string[] = ["Mystery Beast", "The Lurker", "Chore Fiend"];

const SUGGESTION_COUNT = 3;

/**
 * The thing a chore is done to, from the library's own reading of a phrase (librarySuggest.keywords): a chore is said
 * as what is done and then what it is done to ("Sort and match the socks"), so its last keyword names the beast
 * ("sock"); a one-word chore ("Vacuum") is the thing itself. Blank when the chore is all small words.
 */
const thingOf = (chore: string): string => {
  const words = keywords(chore);
  return words[words.length - 1] ?? "";
};

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Three names from the first chore, each ending in a different suffix drawn with `random` (a dice the spec can load),
 * or the three stock names when no chore gives a word to work with.
 */
export const suggestNames = (chores: readonly string[], random: () => number = Math.random): string[] => {
  const thing = thingOf(chores[0] ?? "");
  const hasNoThing = thing === "";
  if (hasNoThing) return [...STOCK_NAMES];
  const pool = [...NAME_SUFFIXES];
  const names: string[] = [];
  while (names.length < SUGGESTION_COUNT && pool.length > 0) {
    // A dice that answers 1 is kept on the last suffix, never past the end of the pool
    const at = Math.min(Math.floor(random() * pool.length), pool.length - 1);
    const [suffix] = pool.splice(at, 1);
    names.push(`${capitalise(thing)} ${suffix}`);
  }
  return names;
};

// ---------------------------------------------------------------------------------------------------------------------
// The send
// ---------------------------------------------------------------------------------------------------------------------

/**
 * What goes to BestiaryDb.setBeast: the Game Master's patch of the draft, signed by the maker (`madeBy` stays for the
 * credit line after approval) and waiting for a Game Master (`proposal`). No id: the Bestiary gives one.
 */
export const proposedBeast = (draft: BeastDraft, by: string, now: Date): Beast =>
  propose({ ...beastPatch(draft), madeBy: by }, by, now);
