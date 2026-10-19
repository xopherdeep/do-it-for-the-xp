import { computed, ref, type Ref } from "vue";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type BestiaryDb from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { minutesOnTaking } from "@/lib/services/quests/choreMinutes";
import {
  activeSuggestion,
  beastQuestPatch,
  beastToAdopt,
  suggestionsFor,
  takesSuggestion,
} from "@/lib/services/quests/questFormRules";

interface BeastSuggestionSources {
  achievement: Ref<Achievement>;
  /** The family's beasts: an adopted library beast is added to this list */
  beasts: Ref<Beast[]>;
  bestiaryDb: BestiaryDb;
  /** True while the quest is complete enough to go live (a draft does not take the suggestion) */
  isLive: Ref<boolean>;
}

/**
 * The beast the library suggests for a quest that has none (docs/Quest-Rooms-Spec.md decision 5), on the How tab:
 * "Suggested: Dish Goblin", with Change (pick another library beast) and No beast. A live quest takes the beast
 * when it is saved: the beast joins the bestiary (unless the family has it) and the quest becomes a beast quest,
 * so it can be fought from the quest book, with the minutes of its chore when the library knows them (choreMinutes).
 * A draft keeps it as a suggestion; its name may not be final.
 */
export function useBeastSuggestion({ achievement, beasts, bestiaryDb, isLive }: BeastSuggestionSources) {
  /** The library beast the parent picked with "Change"; it stands in for the top suggestion until the quest takes it */
  const pickedSuggestion = ref<LibraryEntry | null>(null);

  const beastSuggestions = computed(() => suggestionsFor(achievement.value));
  const suggestedBeast = computed(() => activeSuggestion(achievement.value, pickedSuggestion.value));
  const isBeastDeclined = computed(() => Boolean(achievement.value.noBeast) && beastSuggestions.value.length > 0);

  /** A quest is loaded: nothing is picked yet */
  const resetPick = () => {
    pickedSuggestion.value = null;
  };

  /** Called when the quest is saved: a live quest with no beast takes the suggested one */
  const applySuggestedBeast = async () => {
    const quest = { ...achievement.value, draft: !isLive.value };
    const entry = takesSuggestion(quest, suggestedBeast.value);
    if (!entry) return;
    const adopted = beastToAdopt(entry, beasts.value);
    if (adopted) {
      await bestiaryDb.setBeast(adopted);
      beasts.value = [...beasts.value, adopted];
    }
    // The strike clock follows the chore (a walk takes longer than a Tiny quest's 3 minutes) unless the parent typed minutes
    const minutes = minutesOnTaking(achievement.value, entry);
    Object.assign(achievement.value, beastQuestPatch(entry));
    const hasMinutes = minutes !== null;
    if (hasMinutes) achievement.value.estimatedMinutes = minutes;
    pickedSuggestion.value = null;
  };

  /** The parent picked this library beast with "Change". A live quest takes it now; a draft takes it when it goes live. */
  const selectSuggestion = async (entry: LibraryEntry) => {
    achievement.value.noBeast = false;
    pickedSuggestion.value = entry;
    await applySuggestedBeast();
  };

  /** "No beast": this quest stays a plain quest and the library stops suggesting one for it */
  const dismissSuggestion = () => {
    pickedSuggestion.value = null;
    achievement.value.noBeast = true;
  };

  /** Take "no beast" back: the library may suggest a beast again */
  const restoreSuggestion = () => {
    achievement.value.noBeast = false;
  };

  return {
    beastSuggestions,
    suggestedBeast,
    isBeastDeclined,
    resetPick,
    applySuggestedBeast,
    selectSuggestion,
    dismissSuggestion,
    restoreSuggestion,
  };
}
