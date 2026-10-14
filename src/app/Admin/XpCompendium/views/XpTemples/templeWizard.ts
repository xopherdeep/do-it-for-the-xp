/**
 * The Game Master's temple forms as steps of the shared wizard shell (docs: compendium-wizards-design, sections 1, 3
 * and 5.6). Two small wizards share this module:
 *
 *  - Config > General (components/tabs/XpTempleAttributesWizard.vue): Name and theme, then Check and open, whose verb is
 *    Save. The Temple Creator (Layout, the room editor) is not a wizard and stays as it is.
 *  - The Generate modal (components/XpTempleGenerateModal.vue): Seed, Size and floors, Theme, then Preview and save,
 *    whose verb is "Save as <id>".
 *
 * Pure: no Vue, no storage. The pages hold a draft, call these to read and change it, and save what `templePatch` or
 * the generator hands back. The guide lines are in the Game Master's voice; the reasons are one line a parent would say.
 */
import { v4 as uuidv4 } from "uuid";
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import { nextSeed } from "@/lib/engine/dungeons/generator/templeRecord";
import type { GenerateOptions, TempleSize } from "@/lib/engine/dungeons/generator/templeGenerator";
import type { AuditCheckId } from "@/lib/services/temples/templeAudit";
import { firstIndex, lastIndex } from "@/lib/services/wizard/wizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

// ---------------------------------------------------------------------------------------------------------------------
// A new temple gets a real id
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The id a hand-made temple is stored under, minted when the Game Master taps Create. It used to open the placeholder
 * "new" and nothing swapped it for a real id, so a second new temple overwrote the first. The id never ends in
 * "-temple" (that marks the nine shipped ones in RoomBeast) and never starts with "gen-" (the generator's); the random
 * part is a v4 uuid, as the other Compendium forms use.
 */
export const mintTempleId = (makeId: () => string = uuidv4): string => `temple-${makeId()}`;

// ---------------------------------------------------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------------------------------------------------

/** The icon each audit check wears: the room it asks for (the Master Room is the golden egg), or the item it asks for */
export const AUDIT_ICONS: Record<AuditCheckId, string> = {
  entrance: ROOM_ICONS.entrance,
  exit: ROOM_ICONS.gate,
  boss: ROOM_ICONS.boss,
  bossKey: "fa-key-skeleton",
  masterRoom: ROOM_ICONS.master,
  map: "fa-map",
  compass: "fa-compass",
  size: "fa-ruler-combined",
  stairs: ROOM_ICONS["stairs-up"],
};

export interface IconChoice {
  /** The Font Awesome name, with `fa-` and no style prefix */
  id: string;
  label: string;
}

/** The signs a temple can wear: the nine elements first, then the places and creatures a house of chores calls up. */
export const TEMPLE_ICON_CHOICES: readonly IconChoice[] = [
  { id: "fa-wind", label: "Wind" },
  { id: "fa-leaf", label: "Earth" },
  { id: "fa-water", label: "Water" },
  { id: "fa-flame", label: "Fire" },
  { id: "fa-snowflake", label: "Ice" },
  { id: "fa-sun", label: "Light" },
  { id: "fa-moon", label: "Shadow" },
  { id: "fa-bolt", label: "Storm" },
  { id: "fa-moon-stars", label: "Moon" },
  { id: "fa-mountain", label: "Mountain" },
  { id: "fa-tree", label: "Tree" },
  { id: "fa-dungeon", label: "Dungeon" },
  { id: "fa-place-of-worship", label: "Shrine" },
  { id: "fa-skull", label: "Skull" },
  { id: "fa-dragon", label: "Dragon" },
  { id: "fa-ghost", label: "Ghost" },
  { id: "fa-hat-wizard", label: "Wizard" },
  { id: "fa-swords", label: "Swords" },
  { id: "fa-campfire", label: "Campfire" },
  { id: "fa-tombstone", label: "Grave" },
  { id: "fa-house", label: "House" },
  { id: "fa-sink", label: "Sink" },
  { id: "fa-bed", label: "Bed" },
  { id: "fa-fireplace", label: "Hearth" },
];

/** What a temple wears when it has no sign of its own and its id has none either */
const DEFAULT_ICON = "fa-dungeon";

/** `fad fa-wind`, `fa-wind` or nothing, as the bare `fa-` name ("" when there is none). */
export const normalizeIcon = (icon: string | undefined | null): string =>
  (icon ?? "").split(/\s+/).find((token) => token.startsWith("fa-")) ?? "";

/** The classes that draw an icon in the kit's duotone style. */
export const iconClassOf = (icon: string): string[] => ["fad", normalizeIcon(icon) || DEFAULT_ICON];

/** A domain on when it was off, off when it was on; the list it is given is not touched. */
export const toggleCategory = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((at) => at !== id) : [...ids, id];

// ---------------------------------------------------------------------------------------------------------------------
// Config > General: Name and theme, Check and open
// ---------------------------------------------------------------------------------------------------------------------

export type AttributesStepId = "name" | "check";

export interface AttributesDraft {
  /** The name the heroes see: the Game Master's own, else the shipped one */
  name: string;
  description: string;
  /** The domains: the quest categories whose chores this temple guards */
  categoryIds: string[];
  /** The temple's sign as a bare Font Awesome name (`fa-wind`) */
  icon: string;
}

/** The part of a stored temple the form shows. */
export interface AttributesTemple {
  id?: string;
  name?: string;
  customName?: string;
  customDescription?: string;
  customIcon?: string;
  categoryIds?: string[];
}

/** What the form writes back into the stored temple; a key is missing when its answer was not changed. */
export interface TemplePatch {
  categoryIds: string[];
  customName?: string;
  customDescription?: string;
  customIcon?: string;
}

const NEEDS_NAME = "Name the temple";

const hasName = (draft: AttributesDraft): boolean => draft.name.trim().length > 0;

/**
 * The two screens. The check asks nothing of its own: the audit lists what the temple still lacks, and it never blocks
 * the Save (a draft temple saves, the Temple Creator's own Save does the same).
 */
export const attributesWizardSteps = (): WizardStep<AttributesDraft>[] => [
  {
    id: "name",
    title: "Name and theme",
    guide: "What do the heroes call this temple? Name it, say what it is, and pick the domains it guards.",
    icon: "pencil",
    isValid: (draft) => (hasName(draft) ? true : NEEDS_NAME),
  },
  {
    id: "check",
    title: "Check and open",
    guide: "The stonework is inspected. Whatever it still lacks is listed here, and you may save it either way.",
    icon: "clipboard-list",
    isValid: () => true,
  },
];

/** A temple not stored yet opens on its first step; a stored one opens on the check, with the dots to go back by. */
export const attributesOpeningIndex = (
  steps: readonly WizardStep<AttributesDraft>[],
  draft: AttributesDraft,
  isStored: boolean
): number => (isStored ? lastIndex(steps, draft) : firstIndex(steps, draft));

const effectiveName = (temple: AttributesTemple): string => (temple.customName || temple.name || "").trim();

const effectiveIcon = (temple: AttributesTemple, fallbackIcon: string): string => normalizeIcon(temple.customIcon) || normalizeIcon(fallbackIcon);

/** A stored temple as a draft: copied, so the page can edit it without touching the stored object. */
export const draftFromTemple = (temple: AttributesTemple, fallbackIcon: string): AttributesDraft => ({
  name: effectiveName(temple),
  description: temple.customDescription ?? "",
  categoryIds: Array.isArray(temple.categoryIds) ? [...temple.categoryIds] : [],
  icon: effectiveIcon(temple, fallbackIcon),
});

/**
 * What to merge into the stored temple. The name and the icon are written only when they differ from what the temple
 * already goes by, so a shipped temple that was not renamed keeps no `customName`, and the freshness refresh of its
 * shipped name and layout (importAllTemples) still lands. The icon is stored with its duotone prefix, as the Temple
 * Creator's store keeps it.
 */
export const templePatch = (temple: AttributesTemple, draft: AttributesDraft, fallbackIcon: string): TemplePatch => {
  const patch: TemplePatch = { categoryIds: [...draft.categoryIds] };
  const name = draft.name.trim();
  if (name !== effectiveName(temple)) patch.customName = name;
  const description = draft.description.trim();
  if (description !== (temple.customDescription ?? "").trim()) patch.customDescription = description;
  const icon = normalizeIcon(draft.icon);
  if (icon && icon !== effectiveIcon(temple, fallbackIcon)) patch.customIcon = `fad ${icon}`;
  return patch;
};

// ---------------------------------------------------------------------------------------------------------------------
// The Generate modal: Seed, Size and floors, Theme, Preview and save
// ---------------------------------------------------------------------------------------------------------------------

export type GenerateStepId = "seed" | "size" | "theme" | "preview";

export type FloorCount = 1 | 2 | 3;
export type LockCount = 0 | 1 | 2 | 3;

/** What the generator and the solver last said about the draft's inputs. The temple itself stays with the page. */
export interface GeneratePreview {
  /** The heroes can reach the boss, the Pegasus chest and the gate whatever order they open doors in */
  solvable: boolean;
  /** One line for the parent when it is not solvable, empty when it is */
  problem: string;
}

export interface GenerateDraft {
  seed: string;
  size: TempleSize;
  floors: FloorCount;
  locks: LockCount;
  /** A room of the house, a kind of chore or a world: "Kitchen", "Yard", "Homework" */
  theme: string;
  element: string;
  /** Null until the last step has run the generator, and again after any input changes */
  preview: GeneratePreview | null;
}

export interface SizeChoice {
  id: TempleSize;
  label: string;
  hint: string;
}

// Keep the hints in step with SPAN_BY_SIZE in the generator (5 to 6, 6 to 7, 7 to 9 rooms across a floor)
export const SIZE_CHOICES: readonly SizeChoice[] = [
  { id: "small", label: "Small", hint: "About 5 to 6 rooms across a floor" },
  { id: "medium", label: "Medium", hint: "About 6 to 7 rooms across a floor" },
  { id: "large", label: "Large", hint: "About 7 to 9 rooms across a floor" },
];

export const FLOOR_CHOICES: readonly FloorCount[] = [1, 2, 3];
export const LOCK_CHOICES: readonly LockCount[] = [0, 1, 2, 3];

/** The nine elements of the authored temples */
export const ELEMENT_CHOICES: readonly string[] = ["wind", "earth", "water", "fire", "ice", "light", "shadow", "storm", "moon"];

const HOUSE_THEMES = ["Kitchen", "Yard", "Homework", "Bedroom", "Bathroom", "Garage", "Laundry", "Pets"];

/** Rooms of the house first, then the worlds of the map; each once, whatever its case. */
export const themeSuggestions = (worlds: readonly string[]): string[] => {
  const seen = new Set<string>();
  return [...HOUSE_THEMES, ...worlds].filter((theme) => {
    const key = theme.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const NEEDS_SEED = "Give it a seed";
const NEEDS_THEME = "Pick a theme";
const CANNOT_REACH_BOSS = "The heroes cannot reach the boss. Go back and reroll the seed.";
const SEED_GREW_NOTHING = "That seed would not grow a fair temple. Go back and reroll it.";

const hasSeed = (draft: GenerateDraft): boolean => draft.seed.trim().length > 0;
const hasTheme = (draft: GenerateDraft): boolean => draft.theme.trim().length > 0;

/** The solver's verdict as the parent hears it. */
export const previewVerdict = (solvable: boolean): GeneratePreview => ({
  solvable,
  problem: solvable ? "" : CANNOT_REACH_BOSS,
});

/** The generator itself gave up on the seed (the page keeps its technical message for the red box). */
export const previewFailure = (): GeneratePreview => ({ solvable: false, problem: SEED_GREW_NOTHING });

/**
 * The four screens. The preview is valid when the solver passes the temple, so the verb stays shut for a temple the
 * heroes could not finish; while the temple is still being built it is shut without words.
 */
export const generateWizardSteps = (): WizardStep<GenerateDraft>[] => [
  {
    id: "seed",
    title: "Seed",
    guide: "Every temple grows from a seed. Keep this one, type your own, or roll the dice for another.",
    icon: "dice-d20",
    isValid: (draft) => (hasSeed(draft) ? true : NEEDS_SEED),
  },
  {
    id: "size",
    title: "Size and floors",
    guide: "How big should it grow? Choose its size, its floors and the locked doors between the heroes and the boss.",
    icon: "ruler-combined",
    isValid: () => true,
  },
  {
    id: "theme",
    title: "Theme",
    guide: "What is the temple about? Name a room of the house or a kind of chore, then choose its element.",
    icon: "palette",
    isValid: (draft) => (hasTheme(draft) ? true : NEEDS_THEME),
  },
  {
    id: "preview",
    title: "Preview and save",
    guide: "Here is the temple the seed grew. If the heroes can reach the boss, you may save it.",
    icon: "dungeon",
    isValid: (draft) => {
      if (!draft.preview) return false;
      return draft.preview.solvable ? true : draft.preview.problem || CANNOT_REACH_BOSS;
    },
  },
];

/** A new run of the Generate modal: the seed it is given, a medium temple of two floors and two locks, no preview yet. */
export const newGenerateDraft = (seed: string): GenerateDraft => ({
  seed,
  size: "medium",
  floors: 2,
  locks: 2,
  theme: "Kitchen",
  element: "wind",
  preview: null,
});

/** What the generator is asked for. The seed goes alone, as `generateTemple(seed, options)` takes it. */
export const generateOptionsOf = (draft: GenerateDraft): GenerateOptions => ({
  theme: draft.theme.trim(),
  size: draft.size,
  floors: draft.floors,
  locks: draft.locks,
  element: draft.element,
});

/** Moves with every input that changes the temple and with nothing else: the page clears the preview when it moves. */
export const generateKey = (draft: GenerateDraft): string =>
  JSON.stringify([draft.seed.trim(), draft.size, draft.floors, draft.locks, draft.theme.trim(), draft.element]);

/** The seed after this one; `fallback` (a fresh random seed) when the field is blank. */
export const rerolledSeed = (seed: string, fallback: string): string => {
  const typed = seed.trim();
  return typed ? nextSeed(typed) : fallback;
};

/** What the size step's choices add up to, one line each: how wide, how many floors, how many locked doors. */
export const sizeLines = (draft: Pick<GenerateDraft, "size" | "floors" | "locks">): string[] => {
  const size = SIZE_CHOICES.find((choice) => choice.id === draft.size) ?? SIZE_CHOICES[1];
  const floors = draft.floors === 1 ? "1 floor" : `${draft.floors} floors, joined by stairs`;
  const locks = draft.locks === 0 ? "No locked doors on the way" : `${draft.locks} locked door${draft.locks === 1 ? "" : "s"} before the mini-boss`;
  return [size.hint, floors, locks];
};

/** The last step's button: it names the id the temple is saved under. */
export const saveVerb = (recordId: string): string => (recordId ? `Save as ${recordId}` : "Save");
