/**
 * The Quest Wizard: a kid-friendly way to add a quest from the Calendar or the Beast Log (XpQuestWizardModal). One
 * question per screen: which chore, its steps, when, how big, who (a Game Master or a maker only), then Summon. Pure:
 * no storage, no Vue, no router; the screen holds a draft, calls these to change it and builds the quest with
 * `buildWizardQuest`.
 *
 * The quest is built the way the Compendium form saves one (useAchievementForm): a beast quest on a basic schedule,
 * the rewards of its size (`suggestedRewards`: the Quick Start pack's table, so Small pays 120 XP / 30 GP), the name
 * in the form's title case, and the library beast adopted into the family's bestiary the way the form does
 * (beastToAdopt). Everything has a default: today, anytime, Small, the hero themself. Only the name is required.
 *
 * A quest made by a hero who is not a Game Master is kept small and safe, and the rules live in the builder, not in
 * the screen: it is for that hero alone, at most Big (5), it needs the Game Master's approval, and it records who made it.
 *
 * A hero a Game Master allowed to make things (a "maker", services/creations) may also choose who it is for. A quest for
 * themself on a beast the family may already use still saves live, as above; a quest for anyone else, or on a beast that
 * is still waiting for a Game Master, is saved as a proposal instead (`willPropose`): a draft no hero sees until it is
 * approved. One gate per creation, never two.
 */
import { format, startOfDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { DAY_TOKENS, TIMES_OF_DAY } from "@/lib/engine/quests/QuestSchedule";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { adoptLibraryBeast, browseLibrary, suggestBeasts } from "@/lib/services/bestiary/librarySuggest";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { isReturned, isWaiting, propose } from "@/lib/services/creations/creations";
import type { Proposal } from "@/lib/services/creations/creations";
import { heroBandFor } from "@/lib/services/core/packs/packCommon";
import type { PackBand } from "@/lib/services/core/packs/packCommon";
import { activeSuggestion, beastQuestPatch, beastToAdopt } from "@/lib/services/quests/questFormRules";
import type { QuestPrefill } from "@/lib/services/quests/questPrefill";
import { parseDayKey } from "@/lib/services/quests/questPrefill";
import { suggestedRewards } from "@/lib/services/quests/sizeRewards";
import type { SizeRewards } from "@/lib/services/quests/sizeRewards";
import { formatQuestName } from "@/lib/utils/format";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

// ---------------------------------------------------------------------------------------------------------------------
// The steps of the wizard
// ---------------------------------------------------------------------------------------------------------------------

export type WizardStepId = "what" | "steps" | "when" | "size" | "who" | "ready";

/**
 * The screens in order. A hero who is neither a Game Master nor a maker makes the quest for themself, so their wizard
 * has no Who.
 */
export const wizardSteps = (isGm: boolean, isMaker = false): WizardStepId[] => {
  const choosesWho = isGm || isMaker;
  return choosesWho ? ["what", "steps", "when", "size", "who", "ready"] : ["what", "steps", "when", "size", "ready"];
};

/** The guide's line on each screen, in the hero's voice (catalog/questWizard.ts): the simple voice is read aloud. */
export const stepGuide = (step: WizardStepId, voice: Voice = "adventure"): string =>
  copyFor(`questWizard.guide.${step}`, voice);

/** The picture that stands for each screen in the header (Font Awesome duotone, no prefix). */
export const STEP_ICON: Record<WizardStepId, string> = {
  what: "paw-claws",
  steps: "tasks",
  when: "calendar-day",
  size: "dice-d10",
  who: "users",
  ready: "magic",
};

/** Only the name is required: every other screen can be passed over. */
export const canAdvance = (step: WizardStepId, draft: Pick<WizardDraft, "name">): boolean =>
  step !== "what" || draft.name.trim().length > 0;

/** The name of each screen: the label of its dot (the header says New Quest on every screen). */
const STEP_TITLE: Record<WizardStepId, string> = {
  what: "The chore",
  steps: "Its steps",
  when: "When",
  size: "How big",
  who: "Who",
  ready: "Ready",
};

/**
 * The screens as steps of the shared wizard shell (XpWizardShell): the guide's line in the hero's voice, the picture and
 * the one rule. Only the name is required and it gives no reason line on purpose: the guide's question already asks for
 * it. Nothing is skipped; a hero's missing Who is simply not in the list.
 */
export const questWizardSteps = (isGm: boolean, voice: Voice = "adventure", isMaker = false): WizardStep<WizardDraft>[] =>
  wizardSteps(isGm, isMaker).map((id) => ({
    id,
    title: STEP_TITLE[id],
    guide: stepGuide(id, voice),
    icon: STEP_ICON[id],
    isValid: (draft) => canAdvance(id, draft),
  }));

// ---------------------------------------------------------------------------------------------------------------------
// The picture choices
// ---------------------------------------------------------------------------------------------------------------------

export type WizardWhen = "today" | "daily" | "days";
export type WizardTime = "anytime" | TimeOfDay;

export interface WizardChoice<Id extends string | number> {
  id: Id;
  /** One to four words */
  label: string;
  /** Font Awesome duotone icon name, no prefix */
  icon: string;
}

export const WHEN_CHOICES: readonly WizardChoice<WizardWhen>[] = [
  { id: "today", label: "Today", icon: "calendar-day" },
  { id: "daily", label: "Every day", icon: "calendar-week" },
  { id: "days", label: "Some days", icon: "calendar-check" },
];

/** The Calendar's segments, plus "Anytime" for a chore with no part of the day. */
export const TIME_CHOICES: readonly WizardChoice<WizardTime>[] = [
  { id: "morning", label: "Morning", icon: "sunrise" },
  { id: "noon", label: "Noon", icon: "sun" },
  { id: "evening", label: "Evening", icon: "sunset" },
  { id: "night", label: "Night", icon: "moon-stars" },
  { id: "anytime", label: "Anytime", icon: "clock" },
];

export const DAY_LABELS: Record<(typeof DAY_TOKENS)[number], string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

export interface WizardSize extends WizardChoice<number> {
  /** Only a Game Master may pick it */
  gmOnly: boolean;
}

/** Tiny / Small / Medium / Big are the Fibonacci difficulties 1 / 2 / 3 / 5; a Game Master also has Boss 8 and Mega 13. */
export const SIZE_CHOICES: readonly WizardSize[] = [
  { id: 1, label: "Tiny", icon: "dice-d4", gmOnly: false },
  { id: 2, label: "Small", icon: "dice-d6", gmOnly: false },
  { id: 3, label: "Medium", icon: "dice-d8", gmOnly: false },
  { id: 5, label: "Big", icon: "dice-d10", gmOnly: false },
  { id: 8, label: "Boss", icon: "dice-d12", gmOnly: true },
  { id: 13, label: "Mega", icon: "dice-d20", gmOnly: true },
];

/** The most a hero who is not a Game Master may ask for: Big. */
export const KID_MAX_DIFFICULTY = 5;

/** What the picker shows to this person. */
export const sizesFor = (isGm: boolean): readonly WizardSize[] => SIZE_CHOICES.filter((size) => isGm || !size.gmOnly);

/** The nearest size this person may pick, so a stray number can never become a bigger reward than the screen offers. */
export function clampDifficulty(difficulty: number, isGm: boolean): number {
  const allowed = sizesFor(isGm).map((size) => size.id);
  const wanted = Number.isFinite(Number(difficulty)) ? Number(difficulty) : 2;
  return allowed.reduce((best, size) => (Math.abs(size - wanted) < Math.abs(best - wanted) ? size : best), allowed[0]);
}

// The table lives in sizeRewards.ts (pure, no wizard); it is still exported from here for the screens and specs that read it from the wizard
export { suggestedRewards };
export type { SizeRewards };

/** The rewards a size pays, as chips (the same table the quest is built with). */
export const rewardsOf = (difficulty: number): SizeRewards => suggestedRewards(difficulty);

// ---------------------------------------------------------------------------------------------------------------------
// Which chore: the library, sorted for the hero
// ---------------------------------------------------------------------------------------------------------------------

/** Chores nearly every home has, most common first: they lead their age band's tiles. Slugs of the chore library. */
export const COMMON_CHORES: readonly string[] = [
  "bed-basilisk", "fang-fairy", "toybox-troll", "pajama-pooka", "hamper-hound", "dish-goblin", "plate-pixie",
  "gravy-ghoul", "kibble-kobold", "homework-hydra", "clutter-chimera", "laundry-lurker", "garbage-gargoyle",
  "trash-troll", "cupboard-kobold", "wrinkle-wyvern", "crumb-gremlin", "zoomie-zephyr", "fluffalo", "bookwyrm",
  "shoe-shrew", "backpack-boggart", "socktopus", "hairball-harpy", "grubgoblin",
];

const AGE_ORDER: Record<PackBand, LibraryBeast["age"][]> = {
  little: ["little", "kid", "teen"],
  kid: ["kid", "teen", "little"],
  grownup: ["teen", "kid", "little"],
};

/** The hero's band for sorting: little (8 and under), kid, or grown-up (packCommon's rule). */
export const bandOf = heroBandFor;

/** The chore beasts to pick from, the hero's age band first and the most common chores first inside each band. */
export function choreTiles(band: PackBand): LibraryBeast[] {
  const ages = AGE_ORDER[band];
  const commonRank = (slug: string): number => {
    const index = COMMON_CHORES.indexOf(slug);
    return index === -1 ? COMMON_CHORES.length : index;
  };
  return BEAST_LIBRARY.map((beast, order) => ({ beast, order }))
    .sort(
      (a, b) =>
        ages.indexOf(a.beast.age) - ages.indexOf(b.beast.age) ||
        commonRank(a.beast.slug) - commonRank(b.beast.slug) ||
        a.order - b.order
    )
    .map(({ beast }) => beast);
}

/**
 * The beasts that fit the words typed in the search field, best first: the library's suggestions (which know that
 * "dishwasher" is the Dish Goblin), then any beast whose name, chore or steps contain the text.
 */
export function searchChores(text: string, limit = 12): LibraryEntry[] {
  const needle = text.trim();
  if (!needle) return [];
  const ranked = suggestBeasts(needle, limit);
  const seen = new Set(ranked.map((entry) => String(entry.id)));
  const contained = browseLibrary({ text: needle }).filter((entry) => !seen.has(String(entry.id)));
  return [...ranked, ...contained].slice(0, limit);
}

/** The beast every chore the library does not know fights as: the Mess Hog ("put things back where they belong"). */
export const DEFAULT_CHORE_SLUG = "mess-hog";

export const defaultChore = (): LibraryEntry => BEAST_LIBRARY.find((beast) => beast.slug === DEFAULT_CHORE_SLUG) ?? BEAST_LIBRARY[0];

/** The library beast that fits a chore someone typed, or null when nothing fits (the form's own suggestion rule). */
export const suggestChore = (name: string): LibraryEntry | null =>
  activeSuggestion({ beastId: "", adventureType: "simple", achievementName: name, noBeast: false });

/** A chore beast's own words for the chore ("Dust the shelves"); a classic beast has none, so its name stands in. */
export const choreName = (entry: LibraryEntry): string => entry.chore || entry.name;

// ---------------------------------------------------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------------------------------------------------

export const MAX_STEPS = 12;
const MAX_STEP_LENGTH = 80;
const MAX_NAME_LENGTH = 60;

export interface WizardDraft {
  /** The quest's name, as typed or taken from the chore */
  name: string;
  /** The library beast that fights it: picked, matched to a typed name, or the default one */
  entry: LibraryEntry | null;
  /** True when the name was typed ("Something else") rather than picked from the tiles */
  isOwn: boolean;
  /** The checklist, a copy: the beast's own until it is edited */
  steps: string[];
  when: WizardWhen;
  /** Weekday tokens (mon, tue ...) for "Some days" */
  days: string[];
  time: WizardTime;
  /** The day the quest starts, YYYY-MM-DD (the Calendar's day when it was opened from there) */
  day: string;
  difficulty: number;
  /** Who fights it (a Game Master's or a maker's choice; any other hero is always alone) */
  heroIds: string[];
  /** A Game Master's toggle on the last screen; a hero's quest always needs approval */
  requiresApproval: boolean;
  /** Ask for a photo when the chore is claimed (anyone may; it forces approval on). Absent means no. */
  requiresPhoto?: boolean;
  /** A family beast chosen outright (the one a maker just made): `entry` stays null then and the beast fights the quest */
  beastId?: string;
}

export interface NewDraftOptions {
  isGm: boolean;
  /** The signed-in hero */
  heroId: string;
  /** A hero a Game Master allowed to make things: may choose who the quest is for (not a Game Master) */
  isMaker?: boolean;
  /** From the Calendar: the day, part of the day and hero on screen (questPrefill) */
  prefill?: QuestPrefill;
  today?: Date;
}

const dayKey = (date: Date): string => format(date, "yyyy-MM-dd");

/** A fresh draft with every default in place: today, anytime, Small, the hero themself. */
export function newDraft({ isGm, isMaker = false, heroId, prefill = {}, today = new Date() }: NewDraftOptions): WizardDraft {
  const starts = prefill.startsOn ? new Date(prefill.startsOn) : null;
  const hasStart = starts !== null && !Number.isNaN(starts.getTime());
  const time = prefill.timesOfDay?.[0];
  const choosesWho = isGm || isMaker;
  const prefilledHeroes = choosesWho ? (prefill.assignee ?? []).map(String).filter(Boolean) : [];
  return {
    name: "",
    entry: null,
    isOwn: false,
    steps: [],
    when: "today",
    days: [],
    time: time && TIMES_OF_DAY.includes(time) ? time : "anytime",
    day: dayKey(hasStart ? starts : today),
    difficulty: 2,
    heroIds: prefilledHeroes.length ? prefilledHeroes : [heroId],
    requiresApproval: !isGm,
    ...(prefill.beastId ? { beastId: String(prefill.beastId) } : {}),
  };
}

/**
 * A family beast chosen outright (the one a maker just drew): it fights the quest, so the library entry is dropped.
 * Its name names the quest unless the draft already has one, and its checklist fills an empty list of steps.
 */
export const chooseFamilyBeast = (draft: WizardDraft, beast: Pick<Beast, "id" | "name" | "checklist">): WizardDraft => ({
  ...draft,
  beastId: String(beast.id),
  entry: null,
  isOwn: false,
  name: draft.name.trim() ? draft.name : beast.name.slice(0, MAX_NAME_LENGTH),
  steps: draft.steps.length ? draft.steps : [...beast.checklist],
});

/** A chore picked from the tiles or the search: its beast, its name and its steps come with it (a family beast gives way). */
export const pickChore = (draft: WizardDraft, entry: LibraryEntry): WizardDraft => ({
  ...draft,
  entry,
  beastId: undefined,
  isOwn: false,
  name: choreName(entry).slice(0, MAX_NAME_LENGTH),
  steps: [...entry.checklist],
});

/**
 * "Something else": the name is typed. The library suggests the beast that fits it; when nothing does, the default
 * beast stands in and the steps start empty (the chore itself is the one step). Typing on with the same beast
 * keeps the steps the child has already edited.
 */
export function typeChore(draft: WizardDraft, text: string): WizardDraft {
  const name = text.slice(0, MAX_NAME_LENGTH);
  const isBlank = !name.trim();
  if (isBlank) return { ...draft, name, entry: null, beastId: undefined, isOwn: true, steps: [] };
  const matched = suggestChore(name);
  const entry = matched ?? defaultChore();
  const sameBeast = draft.isOwn && draft.entry !== null && String(draft.entry.id) === String(entry.id);
  const suggested = matched ? [...matched.checklist] : [];
  const steps = sameBeast ? draft.steps : suggested;
  return { ...draft, name, entry, beastId: undefined, isOwn: true, steps };
}

/** Steps as they are stored: trimmed, no blanks, no repeats, a sensible length and count. */
export function cleanSteps(steps: readonly string[]): string[] {
  const clean: string[] = [];
  for (const step of steps) {
    const text = String(step).replace(/\s+/g, " ").trim().slice(0, MAX_STEP_LENGTH);
    const isNewStep = text !== "" && !clean.includes(text);
    if (isNewStep) clean.push(text);
  }
  return clean.slice(0, MAX_STEPS);
}

export const addStep = (draft: WizardDraft, text: string): WizardDraft => ({ ...draft, steps: cleanSteps([...draft.steps, text]) });

export const dropStep = (draft: WizardDraft, index: number): WizardDraft => ({
  ...draft,
  steps: draft.steps.filter((_, position) => position !== index),
});

/** The weekday token of a YYYY-MM-DD day, or "" for text that is not a day. */
export function weekdayOf(day: string): string {
  const date = parseDayKey(day);
  return date ? DAY_TOKENS[date.getDay()] : "";
}

/** A new "when": "Some days" starts with the weekday of the start day ticked, so it is never empty. */
export function setWhen(draft: WizardDraft, when: WizardWhen): WizardDraft {
  const days = when === "days" && !draft.days.length ? [weekdayOf(draft.day)].filter(Boolean) : draft.days;
  return { ...draft, when, days };
}

/** A weekday chip tapped: in or out, in week order. The last one stays ticked, so "Some days" never means no day. */
export function toggleDay(draft: WizardDraft, token: string): WizardDraft {
  const has = draft.days.includes(token);
  const isLastDay = has && draft.days.length === 1;
  if (isLastDay) return draft;
  const next = new Set(draft.days);
  if (has) next.delete(token);
  else next.add(token);
  return { ...draft, days: DAY_TOKENS.filter((day) => next.has(day)) };
}

/** A hero tile tapped: in or out. A Game Master may empty the party; the builder then falls back to themself. */
export const toggleHero = (draft: WizardDraft, heroId: string): WizardDraft => ({
  ...draft,
  heroIds: draft.heroIds.includes(heroId) ? draft.heroIds.filter((id) => id !== heroId) : [...draft.heroIds, heroId],
});

/** The maker's Everyone tile: every profile on the device fights it; tapped again, back to the maker alone. */
export const toggleEveryone = (draft: WizardDraft, everyoneIds: readonly string[], heroId: string): WizardDraft => {
  const isEveryone = everyoneIds.every((id) => draft.heroIds.includes(id));
  return { ...draft, heroIds: isEveryone ? [heroId] : [...everyoneIds] };
};

/** What stops the quest from being summoned, or null. Only the name is required. */
export const draftProblem = (draft: Pick<WizardDraft, "name">, voice: Voice = "adventure"): string | null =>
  draft.name.trim() ? null : copyFor("questWizard.problem.noChore", voice);

/** "Today", "Every day", "Mon · Wed" and the part of the day: the Ready screen's one-line schedule. */
export function whenLine(draft: Pick<WizardDraft, "when" | "days" | "time" | "day">, today: Date = new Date()): string {
  const dayText = dayTextOf(draft, today);
  const timeText = TIME_CHOICES.find((choice) => choice.id === draft.time && choice.id !== "anytime")?.label;
  return [dayText, timeText].filter(Boolean).join(" · ");
}

function dayTextOf(draft: Pick<WizardDraft, "when" | "days" | "day">, today: Date): string {
  const isDaily = draft.when === "daily";
  const isSomeDays = draft.when === "days";
  if (isDaily) return "Every day";
  if (isSomeDays) return DAY_TOKENS.filter((day) => draft.days.includes(day)).map((day) => DAY_LABELS[day]).join(" · ") || "Some days";
  const start = parseDayKey(draft.day);
  const isToday = !start || dayKey(start) === dayKey(today);
  return isToday ? "Today" : format(start, "EEE d MMM");
}

// ---------------------------------------------------------------------------------------------------------------------
// The quest
// ---------------------------------------------------------------------------------------------------------------------

/** Wizard quests sit in their own category, so a Game Master finds what the heroes made in one place. */
export const HERO_QUESTS_CATEGORY: AchievementCategoryInterface = { id: "cat-hero-quests", name: "Hero Quests" };

/** A beast of the family's bestiary as the builder reads it: the proposal says whether a Game Master has seen it */
export type FamilyBeastRef = Pick<Beast, "id"> & Partial<Pick<Beast, "proposal" | "checklist" | "name">>;

export interface BuildContext {
  /** The signed-in person may open the Game Master area (canAccessGameMaster) */
  isGm: boolean;
  /** A hero a Game Master allowed to make things (canMake): may choose who the quest is for, and proposes it */
  isMaker?: boolean;
  /** The hero making the quest */
  creatorId: string;
  /** The category the quest goes in (HERO_QUESTS_CATEGORY's id unless the family chose another) */
  categoryId: string;
  /** The family's beasts (the proposed ones too), so an adopted library beast is never overwritten */
  familyBeasts: ReadonlyArray<FamilyBeastRef>;
  /** An id for the new quest; a fresh one by default */
  questId?: string;
  today?: Date;
}

export interface BuiltQuest {
  quest: Achievement;
  /** The beast to add to the bestiary, or null when the family has it already */
  beast: Beast | null;
  /** The family beast still waiting on a Game Master, with the proposal it should now carry: it points at this quest */
  linkBeast?: { id: string; proposal: Proposal };
}

const sameSteps = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((step, index) => step === b[index]);

/** Who fights the quest: a Game Master's or a maker's choice, else the hero who made it, alone. */
function partyOf(draft: Pick<WizardDraft, "heroIds">, ctx: Pick<BuildContext, "isGm" | "isMaker" | "creatorId">): string[] {
  const choosesWho = ctx.isGm || Boolean(ctx.isMaker);
  return choosesWho && draft.heroIds.length ? [...new Set(draft.heroIds.map(String))] : [ctx.creatorId];
}

/** The family beast a draft chose outright, or undefined (a library chore, or a beast the family no longer has) */
const familyBeastOf = (draft: Pick<WizardDraft, "beastId">, ctx: Pick<BuildContext, "familyBeasts">): FamilyBeastRef | undefined =>
  draft.beastId ? ctx.familyBeasts.find((beast) => String(beast.id) === draft.beastId) : undefined;

/** A family beast no Game Master has approved yet: waiting for a look, or sent back to be fixed */
const isUnapproved = (beast: FamilyBeastRef | undefined): beast is FamilyBeastRef & { proposal: Proposal } =>
  beast !== undefined && (isWaiting(beast) || isReturned(beast));

/**
 * Does this quest wait for a Game Master before any hero sees it? Only a maker's does, and only when it is for anyone
 * but themself or fights a beast that is itself still waiting (or sent back). A maker's quest for themself on a beast
 * the family may use stays live, as it was before kids could make things; a hero who may not make things, and a Game
 * Master, never propose.
 */
export function willPropose(
  draft: Pick<WizardDraft, "heroIds" | "beastId">,
  ctx: Pick<BuildContext, "isGm" | "isMaker" | "creatorId" | "familyBeasts">
): boolean {
  const isKidMaker = !ctx.isGm && Boolean(ctx.isMaker);
  if (!isKidMaker) return false;
  const isForSomeoneElse = partyOf(draft, ctx).some((id) => id !== String(ctx.creatorId));
  return isForSomeoneElse || isUnapproved(familyBeastOf(draft, ctx));
}

/**
 * The beast the quest fights. The checklist belongs to the beast, so a library beast whose steps were edited is saved as
 * the family's own copy of it (the same art and name, a new id, the edited steps) and the library beast and every other
 * quest keep theirs. A family beast chosen outright is the beast as it stands: nothing is adopted or copied (a quest
 * holds no steps of its own, so the steps on screen are only the beast's checklist) and the quest points at it.
 */
function beastSideOf(draft: WizardDraft, ctx: BuildContext, questId: string) {
  if (draft.beastId) {
    const beastFields: Pick<Achievement, "beastId" | "adventureType" | "noBeast"> = {
      beastId: draft.beastId,
      adventureType: "beast",
      noBeast: false,
    };
    return { beast: null, beastFields };
  }
  const entry = draft.entry ?? defaultChore();
  const steps = cleanSteps(draft.steps);
  const isEdited = !sameSteps(steps, cleanSteps(entry.checklist));
  if (isEdited) {
    const copyId = `${entry.id}-${questId.slice(0, 8)}`;
    const copy: Beast = { ...adoptLibraryBeast(entry), id: copyId, checklist: steps };
    const beastFields: Pick<Achievement, "beastId" | "adventureType" | "noBeast"> = {
      beastId: copyId,
      adventureType: "beast",
      noBeast: false,
    };
    return { beast: copy, beastFields };
  }
  return { beast: beastToAdopt(entry, ctx.familyBeasts), beastFields: beastQuestPatch(entry) };
}

/**
 * The quest the draft stands for, the way the Compendium form would save it, with the safety rules of the person
 * making it. Throws when the draft has no name (the screen checks draftProblem first).
 *
 * A maker's quest that `willPropose` is saved as a draft with a proposal on it (services/creations), and a family beast
 * that is still waiting (or sent back) comes back as `linkBeast`, so the beast and the quest are approved together.
 */
export function buildWizardQuest(draft: WizardDraft, ctx: BuildContext): BuiltQuest {
  const problem = draftProblem(draft);
  if (problem) throw new Error("A quest needs a name");
  const questId = ctx.questId ?? uuidv4();
  const difficulty = clampDifficulty(draft.difficulty, ctx.isGm);
  const heroIds = partyOf(draft, ctx);
  const startsOn = (parseDayKey(draft.day) ?? startOfDay(ctx.today ?? new Date())).toISOString();
  const { beast, beastFields } = beastSideOf(draft, ctx, questId);

  const schedule = scheduleOf(draft, startsOn);

  const quest: Achievement = {
    id: questId,
    achievementName: formatQuestName(draft.name.trim()),
    categoryId: ctx.categoryId,
    ...beastFields,
    subAchievementIds: [],
    requiresApproval: ctx.isGm ? draft.requiresApproval || Boolean(draft.requiresPhoto) : true,
    ...(draft.requiresPhoto ? { requiresPhoto: true } : {}),
    bonusAchievement: false,
    type: "individual",
    assignee: heroIds,
    startsOn,
    endsOn: "",
    dueByTime: "",
    ...(draft.time === "anytime" ? {} : { timesOfDay: [draft.time] }),
    scheduleType: "basic",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    ...schedule,
    difficulty,
    ...suggestedRewards(difficulty),
    draft: false,
    createdBy: ctx.creatorId,
  };

  const isProposal = willPropose(draft, ctx);
  if (!isProposal) return { quest, beast };
  const proposed = propose({ ...quest, draft: true }, ctx.creatorId, ctx.today ?? new Date());
  const waitingBeast = familyBeastOf(draft, ctx);
  if (!isUnapproved(waitingBeast)) return { quest: proposed, beast };
  return { quest: proposed, beast, linkBeast: { id: String(waitingBeast.id), proposal: { ...waitingBeast.proposal, questId } } };
}

/** The ticked weekdays, in week order; none ticked means the weekday the quest starts on. */
/** The basic schedule the Compendium form would save for this "when". */
function scheduleOf(draft: Pick<WizardDraft, "when" | "days">, startsOn: string) {
  const isDaily = draft.when === "daily";
  const isSomeDays = draft.when === "days";
  if (isDaily) return { basicSchedule: "daily", repeatOnDays: [] as string[], showDailyUntilComplete: true };
  if (isSomeDays) return { basicSchedule: "weekly", repeatOnDays: weekdaysOf(draft, startsOn), showDailyUntilComplete: false };
  return { basicSchedule: "once", repeatOnDays: [] as string[], showDailyUntilComplete: false };
}

function weekdaysOf(draft: Pick<WizardDraft, "days">, startsOn: string): string[] {
  const ticked = DAY_TOKENS.filter((day) => draft.days.includes(day));
  return ticked.length ? [...ticked] : [DAY_TOKENS[new Date(startsOn).getDay()]];
}

/** The category a wizard quest goes in: the family's Hero Quests, created on the first save. */
export function wizardCategory(categories: ReadonlyArray<Pick<AchievementCategoryInterface, "id">>): {
  id: string;
  create: AchievementCategoryInterface | null;
} {
  const exists = categories.some((category) => category.id === HERO_QUESTS_CATEGORY.id);
  return { id: HERO_QUESTS_CATEGORY.id, create: exists ? null : { ...HERO_QUESTS_CATEGORY } };
}
