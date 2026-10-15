import { defineStore } from "pinia";
import { ref } from "vue";
import { loadFamilySettings, saveFamilySettings } from "@/lib/services/family/familySettings";

/**
 * The family-wide game rules the screens read live (kept in the family settings, services/family/familySettings.ts).
 * Starts on the defaults and loads once (a second `load()` is the same promise); a change saves at once.
 */
export const useGameRulesStore = defineStore("gameRules", () => {
  const streaks = ref(true);
  let loading: Promise<void> | null = null;

  function load(): Promise<void> {
    if (!loading) {
      loading = loadFamilySettings().then((settings) => {
        streaks.value = settings.streaks;
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

  return { streaks, load, setStreaks };
});
