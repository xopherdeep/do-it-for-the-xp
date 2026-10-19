import { computed, type Ref } from "vue";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { questMinutesWith } from "@/lib/services/quests/choreMinutes";
import { defaultMinutes } from "@/lib/services/quests/questClock";
import { activeSuggestion, hasEstimatedMinutes, parseMinutes } from "@/lib/services/quests/questFormRules";
import { minutesLabel, tierLabel } from "@/lib/services/quests/QuestLabels";
import { questTier } from "@/lib/services/temples/questRooms";

/**
 * What the difficulty slider on the Why tab also decides (docs/Quest-Rooms-Spec.md sections 5.1 and 5.5): the
 * tier chip (the temple room this difficulty fills) and "About how long?" (the strike clock). The minutes are the
 * parent's estimate once they type one, else the beast the library suggests for the chore when that chore takes
 * longer than the difficulty's default (a walk), else the difficulty's default, so the field follows the slider until
 * it is edited and a reset goes back to following it.
 */
export function useQuestEffort(achievement: Ref<Achievement>) {
  const minutes = computed(() => questMinutesWith(achievement.value, activeSuggestion(achievement.value)));
  const minutesText = computed(() => minutesLabel(minutes.value));
  const isMinutesEdited = computed(() => hasEstimatedMinutes(achievement.value));

  /** The minutes field changed. Text that is no usable number (a half-typed field) changes nothing. */
  const setMinutes = (raw: unknown) => {
    const next = parseMinutes(raw);
    const isUsable = next !== null;
    if (isUsable) achievement.value.estimatedMinutes = next;
  };

  /** Back to the difficulty's default: the estimate goes, so the field follows the slider again */
  const resetMinutes = () => {
    delete achievement.value.estimatedMinutes;
  };

  return { minutes, minutesText, isMinutesEdited, setMinutes, resetMinutes };
}

/** What the difficulty alone decides: the tier chip and the minutes the field falls back to. */
export function useQuestTier(achievement: Ref<Achievement>) {
  const questTierKey = computed(() => questTier(achievement.value.difficulty));
  const questTierName = computed(() => tierLabel(achievement.value.difficulty));
  const defaultMinutesText = computed(() => minutesLabel(defaultMinutes(achievement.value.difficulty)));

  return { questTierKey, questTierName, defaultMinutesText };
}
