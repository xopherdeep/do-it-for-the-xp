import { defineStore } from "pinia";
import { ref } from "vue";
import { loadFamilySettings, saveFamilySettings } from "@/lib/services/family/familySettings";
import { DEFAULT_LATE_CHORES, normalizeLateChores, type LateChoreSettings } from "@/lib/services/quests/lateRules";

/**
 * The family-wide game rules the screens read live (kept in the family settings, services/family/familySettings.ts).
 * Starts on the defaults and loads once (a second `load()` is the same promise); a change saves at once.
 */
export const useGameRulesStore = defineStore("gameRules", () => {
  const streaks = ref(true);
  const lateChores = ref<LateChoreSettings>({ ...DEFAULT_LATE_CHORES });
  let loading: Promise<void> | null = null;

  function load(): Promise<void> {
    if (!loading) {
      loading = loadFamilySettings().then((settings) => {
        streaks.value = settings.streaks;
        lateChores.value = settings.lateChores;
      });
    }
    return loading;
  }

  /** Switch daily streaks on or off for the whole family */
  async function setStreaks(on: boolean): Promise<void> {
    await load();
    streaks.value = on;
    const settings = await loadFamilySettings();
    await saveFamilySettings({ ...settings, streaks: on });
  }

  /** Change some of the late chore rules (the lock, reduced pay, penalty and their amounts) and save at once */
  async function setLateChores(patch: Partial<LateChoreSettings>): Promise<void> {
    await load();
    lateChores.value = normalizeLateChores({ ...lateChores.value, ...patch });
    const settings = await loadFamilySettings();
    await saveFamilySettings({ ...settings, lateChores: lateChores.value });
  }

  return { streaks, lateChores, load, setStreaks, setLateChores };
});
