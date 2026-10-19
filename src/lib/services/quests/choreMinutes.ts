/**
 * How long a suggested chore takes, for the strike clock (docs/Quest-Rooms-Spec.md section 5.5). Pure: no storage, no Vue.
 *
 * A quest with no minutes of its own follows its size (questClock.defaultMinutes: 3 minutes for a Tiny quest). That is
 * right for a bed and wrong for a walk, so a library chore that takes longer than its size says so here, and a quest that
 * is about to take that beast follows the chore instead. A chore that is not in the table keeps following its size, and
 * minutes the parent typed always win.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import { isClassicBeast } from "@/lib/services/bestiary/librarySuggest";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { defaultMinutes } from "@/lib/services/quests/questClock";
import { hasEstimatedMinutes } from "@/lib/services/quests/questFormRules";

/** Minutes for the chore beasts whose chore takes a while, by slug (tunable). The rest follow their quest's size. */
export const CHORE_MINUTES: Readonly<Record<string, number>> = {
  "zoomie-zephyr": 20, // Walk the dog
  "meadow-minotaur": 30, // Mow the lawn
  "grime-griffin": 30, // Wash the car
  "leaf-lion": 25, // Rake the leaves
  "weed-wyrm": 20, // Pull the weeds
  "dustbowl-djinn": 15, // Water the garden
  "laundry-lurker": 20, // Do a load of laundry
  "fluffalo": 15, // Vacuum the floor
  "suds-serpent": 15, // Wash the dishes by hand
  "simmer-salamander": 30, // Help cook dinner
  "homework-hydra": 30, // Do your homework
  "sour-note-siren": 20, // Practice your instrument
  "clutter-chimera": 20, // Clean your whole room
  "junkpile-jotun": 60, // Clean out the garage
};

type MinutesFields = Pick<Achievement, "difficulty" | "estimatedMinutes">;

/**
 * The minutes this chore takes when that is longer than the size's own, else null (the quest keeps following its size).
 * A classic beast has no chore, so it has none.
 */
export function choreMinutes(entry: LibraryEntry | null | undefined, difficulty?: number): number | null {
  if (!entry) return null;
  if (isClassicBeast(entry)) return null;
  const minutes: number | undefined = CHORE_MINUTES[entry.slug];
  const hasNoMinutes = minutes === undefined;
  if (hasNoMinutes) return null;
  const isLongerThanItsSize = minutes > defaultMinutes(difficulty);
  return isLongerThanItsSize ? minutes : null;
}

/** The minutes a quest shows and fights with while it follows its suggestion: the parent's own, else the chore's, else its size's. */
export function questMinutesWith(quest: MinutesFields, suggestion: LibraryEntry | null | undefined): number {
  if (hasEstimatedMinutes(quest)) return Number(quest.estimatedMinutes);
  return choreMinutes(suggestion, quest.difficulty) ?? defaultMinutes(quest.difficulty);
}

/**
 * The `estimatedMinutes` to store when the quest takes this beast, or null to store none. Without it the strike clock
 * would go back to the size's minutes the moment the quest is saved, whatever the form showed.
 */
export function minutesOnTaking(quest: MinutesFields, entry: LibraryEntry): number | null {
  if (hasEstimatedMinutes(quest)) return null;
  return choreMinutes(entry, quest.difficulty);
}
