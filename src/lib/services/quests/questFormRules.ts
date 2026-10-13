/**
 * The rules behind two fields of the Game Master's quest form (docs/Quest-Rooms-Spec.md sections 5.5 and 9).
 * Pure: no storage, no Vue; the form hook (useAchievementForm) calls these and stores the result.
 *
 * Minutes: `estimatedMinutes` is only ever set by the parent. While it is absent the field shows the default
 * for the difficulty (questClock.defaultMinutes), so it follows the slider; once the parent types a number it
 * stays, and dropping it goes back to following the slider.
 *
 * Suggested beast: a quest with no beast gets the one the library suggests for its name. It is shown on the
 * How tab and taken when the quest is saved live: the beast joins the family's bestiary (adoptLibraryBeast) and
 * the quest becomes a beast quest, so it can be fought from the quest book. The parent can pick another one or
 * say "no beast" (`noBeast`), which stops the suggestion for that quest.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { adoptLibraryBeast, suggestBeasts, type LibraryEntry } from "@/lib/services/bestiary/librarySuggest";

/** The most minutes a chore can be given: a whole day. */
export const MAX_ESTIMATED_MINUTES = 24 * 60;

/** How many library beasts the form lists when the parent taps Change. */
export const SUGGESTION_LIMIT = 6;

/** True when the parent has set the minutes (a positive `estimatedMinutes`); false means they follow the difficulty. */
export const hasEstimatedMinutes = (quest: Pick<Achievement, "estimatedMinutes">): boolean => {
  const estimate = Number(quest.estimatedMinutes);
  return Number.isFinite(estimate) && estimate > 0;
};

/**
 * The minutes a typed value stands for: a whole number from 1 to a day. Anything else (blank, letters, zero,
 * negative, a half-typed field) is null, so the field keeps the value it had instead of jumping to a default.
 */
export function parseMinutes(raw: unknown): number | null {
  const value = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  const minutes = Math.round(value);
  const isUsable = Number.isFinite(minutes) && minutes >= 1;
  return isUsable ? Math.min(minutes, MAX_ESTIMATED_MINUTES) : null;
}

/** The quest as it is written to storage: an estimate that is not a positive number is dropped, so the default applies. */
export function withoutUnsetMinutes<Q extends Pick<Achievement, "estimatedMinutes">>(quest: Q): Q {
  const next = { ...quest };
  const isUnset = !hasEstimatedMinutes(next);
  if (isUnset) delete next.estimatedMinutes;
  return next;
}

type BeastFields = Pick<Achievement, "beastId" | "adventureType" | "noBeast">;

/** A plain quest with no beast: the only kind the library suggests for (a chain is a chain of quests, not a chore). */
export const isBeastless = (quest: Pick<Achievement, "beastId" | "adventureType">): boolean =>
  !quest.beastId && quest.adventureType === "simple";

/** The library beasts that fit the quest's name, best first; none for a quest that has a beast, is a chain or fits nothing. */
export const suggestionsFor = (
  quest: Pick<Achievement, "beastId" | "adventureType" | "achievementName">,
  limit = SUGGESTION_LIMIT
): LibraryEntry[] => (isBeastless(quest) ? suggestBeasts(quest.achievementName ?? "", limit) : []);

/**
 * The beast the form offers for a quest: the one the parent picked with Change, else the top suggestion.
 * Null when the quest has a beast already, is not a plain quest, or the parent chose "no beast".
 */
export function activeSuggestion(
  quest: Pick<Achievement, "beastId" | "adventureType" | "achievementName" | "noBeast">,
  picked: LibraryEntry | null = null
): LibraryEntry | null {
  const isOffered = !quest.noBeast && isBeastless(quest);
  if (!isOffered) return null;
  return picked ?? suggestionsFor(quest, 1)[0] ?? null;
}

/**
 * The suggestion a save takes, or null. Only a live quest (not a draft) takes it: a draft is still being
 * written, and its name may not be final.
 */
export function takesSuggestion(
  quest: Pick<Achievement, "beastId" | "adventureType" | "noBeast" | "draft">,
  suggestion: LibraryEntry | null
): LibraryEntry | null {
  const isTaken = suggestion !== null && !quest.draft && !quest.noBeast && isBeastless(quest);
  return isTaken ? suggestion : null;
}

/** What a quest takes on when it takes the library beast: its id, a beast quest, and no longer "no beast". */
export const beastQuestPatch = (entry: LibraryEntry): BeastFields => ({
  beastId: String(entry.id),
  adventureType: "beast",
  noBeast: false,
});

/** The beast to add to the bestiary for this library beast, or null when the family has it already (it is never overwritten). */
export const beastToAdopt = (entry: LibraryEntry, familyBeasts: ReadonlyArray<Pick<Beast, "id">>): Beast | null => {
  const isInBestiary = familyBeasts.some((beast) => String(beast.id) === String(entry.id));
  return isInBestiary ? null : adoptLibraryBeast(entry);
};
