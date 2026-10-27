/**
 * Which chore, for the Quest Wizard (questWizard.ts re-exports all of this, so screens and specs import it from there):
 * the chore library sorted for the hero's age, the search over it, and the beast a chore the library does not know
 * fights as. Pure: no storage, no Vue. It lives apart from questWizard.ts to keep that file under its line budget, and
 * it needs nothing from it.
 */
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { browseLibrary, suggestBeasts } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { heroBandFor } from "@/lib/services/core/packs/packCommon";
import type { PackBand } from "@/lib/services/core/packs/packCommon";
import { activeSuggestion } from "@/lib/services/quests/questFormRules";

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
