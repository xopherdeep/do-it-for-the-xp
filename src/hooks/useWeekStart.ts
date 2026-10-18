import { computed, type ComputedRef } from "vue";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";

/** The family's first day of the week (Settings > General) for a date picker's `first-day-of-week`: 0 Sunday, 1 Monday */
export function useWeekStart(): ComputedRef<number> {
  const rules = useGameRulesStore();
  void rules.load();
  return computed(() => rules.weekStartsOn);
}
