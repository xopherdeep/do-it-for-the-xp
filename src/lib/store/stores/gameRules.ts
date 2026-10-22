import { defineStore } from "pinia";
import { onScopeDispose, ref } from "vue";
import {
  DEFAULT_FAMILY_SETTINGS,
  loadFamilySettings,
  saveFamilySettings,
  type FamilySettings,
} from "@/lib/services/family/familySettings";
import { DEFAULT_LATE_CHORES, normalizeLateChores, type LateChoreSettings } from "@/lib/services/quests/lateRules";
import { onRecordsLanded } from "@/lib/services/sync/recordSignals";
import debug from "@/lib/utils/debug";

type Bedtime = FamilySettings["bedtime"];

/**
 * The family-wide game rules the screens read live (kept in the family settings, services/family/familySettings.ts).
 * Starts on the defaults and loads once (a second `load()` is the same promise); a change saves at once. Settings a
 * Game Master changed on another device that land here (Family Sync) are read again.
 */
export const useGameRulesStore = defineStore("gameRules", () => {
  const streaks = ref(true);
  const lateChores = ref<LateChoreSettings>({ ...DEFAULT_LATE_CHORES });
  const bedtime = ref<Bedtime>({ ...DEFAULT_FAMILY_SETTINGS.bedtime });
  const autoSavePercent = ref(DEFAULT_FAMILY_SETTINGS.autoSavePercent);
  const approveAllPurchases = ref(DEFAULT_FAMILY_SETTINGS.approveAllPurchases);
  const weekStartsOn = ref(DEFAULT_FAMILY_SETTINGS.weekStartsOn);
  let loading: Promise<void> | null = null;

  const take = (settings: FamilySettings) => {
    streaks.value = settings.streaks;
    lateChores.value = settings.lateChores;
    bedtime.value = settings.bedtime;
    autoSavePercent.value = settings.autoSavePercent;
    approveAllPurchases.value = settings.approveAllPurchases;
    weekStartsOn.value = settings.weekStartsOn;
  };

  function load(): Promise<void> {
    if (!loading) loading = loadFamilySettings().then(take);
    return loading;
  }

  const stopLandings = onRecordsLanded(({ store }) => {
    const isSettings = store === "__family_settings";
    if (isSettings) loadFamilySettings().then(take).catch((error) => debug.warn("[gameRules] could not read the landed settings", error));
  });
  onScopeDispose(stopLandings);

  /**
   * Save a change to the stored settings and show it at once. The stored settings are read fresh first, so a screen
   * holding an older copy never writes back over a rule another card changed.
   */
  async function save(change: Partial<FamilySettings>): Promise<void> {
    await load();
    const settings = await loadFamilySettings();
    const next = { ...settings, ...change };
    await saveFamilySettings(next);
    take(await loadFamilySettings());
  }

  /** Switch daily streaks on or off for the whole family */
  async function setStreaks(on: boolean): Promise<void> {
    streaks.value = on;
    await save({ streaks: on });
  }

  /** Change some of the late chore rules (the lock, reduced pay, penalty and their amounts) and save at once */
  async function setLateChores(patch: Partial<LateChoreSettings>): Promise<void> {
    await load();
    lateChores.value = normalizeLateChores({ ...lateChores.value, ...patch });
    await save({ lateChores: lateChores.value });
  }

  /** Turn the bedtime on or off, or move its clocks */
  async function setBedtime(patch: Partial<Bedtime>): Promise<void> {
    await load();
    bedtime.value = { ...bedtime.value, ...patch };
    await save({ bedtime: bedtime.value });
  }

  /** The share of every GP reward that goes straight to savings */
  async function setAutoSavePercent(percent: number): Promise<void> {
    autoSavePercent.value = percent;
    await save({ autoSavePercent: percent });
  }

  /** Game-item purchases wait in Approvals too */
  async function setApproveAllPurchases(on: boolean): Promise<void> {
    approveAllPurchases.value = on;
    await save({ approveAllPurchases: on });
  }

  /** 0 starts the week on Sunday, 1 on Monday */
  async function setWeekStartsOn(day: number): Promise<void> {
    weekStartsOn.value = day;
    await save({ weekStartsOn: day });
  }

  return {
    streaks,
    lateChores,
    bedtime,
    autoSavePercent,
    approveAllPurchases,
    weekStartsOn,
    load,
    save,
    setStreaks,
    setLateChores,
    setBedtime,
    setAutoSavePercent,
    setApproveAllPurchases,
    setWeekStartsOn,
  };
});
