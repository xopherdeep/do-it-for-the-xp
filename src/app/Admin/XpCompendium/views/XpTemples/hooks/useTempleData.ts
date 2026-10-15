/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, onMounted, watch, InjectionKey } from "vue";
// ... imports ...

// Exported at end of file to ensure ReturnType inference works

import {
  AchievementCategoryInterface,
  AchievementCategoryDb,
  achievementCategoryStorage,
} from "@/lib/databases/AchievementDb";
import { TempleDb, TempleInterface, templeStorage } from "@/lib/databases/TempleDb";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import BestiaryDb, { Beast, beastStorage } from "@/lib/databases/BestiaryDb";
import { sortCategoryByName } from "@/app/Admin/XpCompendium/views/XpAchievements//XpConfigAchievement/hooks/useAchievementForm";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import debug from "@/lib/utils/debug";
import { toastController } from "@ionic/vue";
import { saveOutline } from 'ionicons/icons';
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { auditTemple, auditSummary, missingNames } from "@/lib/services/temples/templeAudit";
import { pickPreviewMaze, isRoom } from "./templeData/mazeFloors";
import {
  getRoomTypeIcon,
  getMonsterIcon,
  getItemIcon,
  getTempleIconFor,
  getTempleColorFor,
  getTempleBgFor,
} from "./templeData/templeLookups";
import {
  buildComposition,
  countDungeonStats,
  rateTemplePower,
  filterMonstersByTier,
  countKeysAndLocks,
} from "./templeData/dungeonCounts";
import { listTempleBeasts, buildItemMapData } from "./templeData/mazeContents";
import type { TempleBeast } from "./templeData/mazeContents";
import { parseTempleJson, normalizeImportedLayout } from "./templeData/tokenMigration";
import { adoptStoredLayout, storedLayout } from "./templeData/storedLayout";

export type { TempleBeast } from "./templeData/mazeContents";

export interface ExtendedTempleInterface extends TempleInterface {
  smallMonsters?: number;
  mediumMonsters?: number;
  largeMonsters?: number;
  minibosses?: number;
  bosses?: number;
  hasBossKey?: boolean;
  customName?: string;
  customDescription?: string;
  categoryIds: string[];
  level?: number;
}

export interface ExtendedCategoryInterface extends AchievementCategoryInterface {
  color?: string;
  icon?: any;
}

export function useTempleData(templeId: string) {
  const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
  const categories = ref([] as ExtendedCategoryInterface[]);
  const templeDb = new TempleDb(templeStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const templeSystem = TempleSystem.getInstance();
  const creatorStore = useTempleCreatorStore();

  // Cached beasts from bestiary
  const allBeasts = ref<Beast[]>([]);
  const isLoading = ref(false);

  const temple = ref<ExtendedTempleInterface>({
    id: templeId,
    categoryIds: [] as string[],
    level: 1
  });

  const templeState = ref({
    hasMap: false,
    hasCompass: false,
    hasBossKey: false,
    playerKeys: 0,
    visitedPositions: new Set<string>()
  });

  const dungeonStats = ref({
    totalRooms: 0,
    visitedRooms: 0,
    totalTreasures: 0,
    foundTreasures: 0
  });

  const loadCategories = async () => {
    categories.value = await categoryDb.getAll();
    categories.value = categories.value.sort(sortCategoryByName);
  };

  const previewMaze = computed(() => pickPreviewMaze(temple.value.dungeonLayout));

  // Sync dungeonLayout with creatorStore when it changes
  const isCreatorOnThisTemple = () => creatorStore.loadedTempleId === templeId;
  watch(() => creatorStore.roomsData, (newRooms) => {
    if (isCreatorOnThisTemple()) {
      temple.value.dungeonLayout ??= { entrance: [0, 0], maze: [], rooms: {} };
      temple.value.dungeonLayout.rooms = { ...newRooms };
    }
  }, { deep: true });

  watch(() => creatorStore.templeMaze, (newMaze) => {
    if (isCreatorOnThisTemple()) {
      temple.value.dungeonLayout ??= { entrance: [0, 0], maze: [], rooms: {} };
      temple.value.dungeonLayout.maze = newMaze;
    }
  }, { deep: true });

  const composition = computed(() =>
    buildComposition(temple.value.dungeonLayout, () => templeSystem.getTempleState(templeId))
  );

  const calculateDungeonStats = () => {
    const sysState = templeSystem.getTempleState(templeId);
    if (sysState) {
      templeState.value = {
        hasMap: sysState.hasMap,
        hasCompass: sysState.hasCompass,
        hasBossKey: !!temple.value.hasBossKey,
        playerKeys: sysState.playerKeys,
        visitedPositions: sysState.visitedRooms
      };
    }

    const layout = temple.value.dungeonLayout;
    if (layout) {
      dungeonStats.value = countDungeonStats(layout, previewMaze.value);
    }
  };

  const getTempleIcon = () => getTempleIconFor(templeId);

  const getTempleColor = () => getTempleColorFor(templeId);

  const getTempleBg = () => getTempleBgFor(templeId);

  const getDisplayName = () => {
    return temple.value.customName || templeId;
  };

  const loadTemple = async (id: string, force = false) => {
    if (!id) return;

    // If already loading OR already loaded in creator store (and not forced), skip
    if (isLoading.value) return;
    await ensureBuiltInTemples();
    const canReuseLoadedTemple = !force && creatorStore.isLoaded(id);
    if (canReuseLoadedTemple) {
      debug.log("useTempleData: Using existing creatorStore data for", id);
      // Sync temple ref with store once
      const templeData = await templeDb.getTempleById(id);
      if (templeData) {
        temple.value = { ...temple.value, ...templeData };
        const layout = temple.value.dungeonLayout;
        if (layout) {
          layout.maze = creatorStore.templeMaze;
          layout.rooms = creatorStore.roomsData;
        }
        calculateDungeonStats();
      }
      return;
    }

    isLoading.value = true;
    try {
      const templeData = await templeDb.getTempleById(id);
      if (templeData) {
        temple.value = { ...temple.value, ...templeData };

        // Sync to creator store (Layer 2): the whole record, so the creator never starts from the store's default entrance and grid
        const layout = templeData.dungeonLayout;
        if (layout) {
          const rooms = layout.rooms;
          const hasLegacyWallRecord = !!rooms?.['____'];
          if (hasLegacyWallRecord) {
            rooms['____'] = { type: 'wall' };
          }
          adoptStoredLayout(creatorStore, id, { ...templeData, dungeonLayout: layout });
          creatorStore.updateDbSnapshot();
        }

        calculateDungeonStats();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const saveTemple = async () => {
    // The store's maze and rooms are this temple's only while the store holds it (its entrance is the live one, so a moved
    // entrance survives this save). Otherwise they are another temple's last edit: saving a new temple's attributes before
    // opening its Layout would copy them in. Such a temple keeps the record's own layout (none for a new one), and the store
    // stays as it is, neither claimed for this temple nor re-snapshotted.
    const storeHoldsThisTemple = creatorStore.isLoaded(templeId);
    const layoutToSave = storeHoldsThisTemple ? storedLayout(creatorStore) : temple.value.dungeonLayout;

    const templeDataToSave: ExtendedTempleInterface = {
      ...temple.value,
      id: templeId,
      dungeonLayout: layoutToSave
    };

    await templeDb.setTemple(templeDataToSave);

    // Update local snapshot in store (for change detection)
    if (storeHoldsThisTemple) {
      creatorStore.updateDbSnapshot();
    }

    const toast = await toastController.create({
      message: 'Temple settings saved!',
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: saveOutline
    });
    await toast.present();

    // Recalculate stats after save
    calculateDungeonStats();
  };

  const applyRawJson = async (jsonStr: string) => {
    try {
      const parsedData = parseTempleJson(jsonStr);

      normalizeImportedLayout(parsedData);

      // Update local state
      temple.value = { ...temple.value, ...parsedData };

      // Sync to creator store (the entrance, grid size and floor too: the save below writes the store's)
      const hasLayout = Boolean(parsedData.dungeonLayout);
      if (hasLayout) {
        adoptStoredLayout(creatorStore, templeId, parsedData);
      }

      // Save to database
      await saveTemple();

      return { success: true };
    } catch (err: unknown) {
      debug.error('applyRawJson failed', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const getPowerRating = () => {
    const level = temple.value.level || 1;
    return rateTemplePower(level, composition.value.monsters);
  };

  const getBeastsByTier = (tier: 'boss' | 'miniboss' | 'other') => {
    return filterMonstersByTier(composition.value.monsters, tier);
  };

  const getCategoryColor = (catId: string) => {
    const category = categories.value.find(cat => cat.id === catId);
    const color = category?.color;
    if (color) return color;
    return 'medium';
  };

  /*
  const getCategoryIcon = (catId: string) => {
    // This logic is currently handled in XpTempleAttributes.vue
    // If needed globally, add icon mapping logic here.
    return null;
  };
  */

  const getCategoryName = (catId: string) => {
    const category = categories.value.find(cat => cat.id === catId);
    return category ? category.name : 'Unknown';
  };

  // Load all beasts from bestiary
  const loadBeasts = async () => {
    allBeasts.value = await bestiaryDb.getBeasts();
  };

  // Get beasts with full details for this temple
  const templeBeastsWithDetails = computed((): TempleBeast[] =>
    listTempleBeasts(temple.value.dungeonLayout, allBeasts.value)
  );

  onMounted(() => {
    loadCategories();
    loadBeasts();
    if (templeId) {
      loadTemple(templeId);
    }
  });

  watch(temple, () => {
    debug.log("Temple settings changed, skipping autosave");
  }, { deep: true });

  // Can the temple be finished? The checks live in the audit service; the key and lock count is the editor's own.
  const dungeonAudit = computed(() => {
    const audit = auditTemple(temple.value);
    const rooms = temple.value.dungeonLayout?.rooms || {};
    const isOk = (id: string) => audit.checks.some((check) => check.id === id && check.ok);
    const { totalKeys, actualLocks } = countKeysAndLocks(rooms);

    return {
      ...audit,
      summary: auditSummary(audit),
      missing: missingNames(audit),
      hasMap: isOk('map'),
      hasCompass: isOk('compass'),
      hasBossKey: isOk('bossKey'),
      totalKeys,
      totalLockedDoors: actualLocks,
      keyBalance: totalKeys - actualLocks
    };
  });

  const itemMapData = computed(() => buildItemMapData(temple.value.dungeonLayout));

  return {
    temple: temple,
    templeState: templeState,
    categories: categories,
    dungeonStats: dungeonStats,
    composition: composition,
    previewMaze: previewMaze,
    loadCategories: loadCategories,
    loadTemple: loadTemple,
    saveTemple: saveTemple,
    getPowerRating: getPowerRating,
    getBeastsByTier: getBeastsByTier,
    getCategoryColor: getCategoryColor,
    getCategoryName: getCategoryName,
    getTempleIcon: getTempleIcon,
    getTempleColor: getTempleColor,
    getTempleBg: getTempleBg,
    getDisplayName: getDisplayName,
    isRoom: isRoom,
    getRoomTypeIcon: getRoomTypeIcon,
    getMonsterIcon: getMonsterIcon,
    templeBeastsWithDetails: templeBeastsWithDetails,
    allBeasts: allBeasts,
    getItemIcon: getItemIcon,
    dungeonAudit: dungeonAudit,
    itemMapData: itemMapData,
    isLoading: isLoading,
    applyRawJson: applyRawJson
  };
}

export const TempleDataInjectionKey: InjectionKey<ReturnType<typeof useTempleData>> = Symbol('TempleData');
