import { ref } from "vue";
import { isVoxelTier, knobsFor, type VoxelKnobs, type VoxelTier } from "@/lib/services/graphics/voxelQuality";

/**
 * The Video quality tier: device only. It follows the phone, not the hero or the family, so it stays out of
 * LOCAL_SETTING_KEYS (backups), the hero profile, Family Sync and the hero card: a restore or a sync from a fast
 * phone must never overwrite what an old phone needs. A change applies on the next mount; there is no event bus.
 */
const KEY = "xp.voxelQuality";

/** Absent or unknown means Super, so nothing changes for anyone until a tier is picked */
export const DEFAULT_CHOICE: VoxelTier = "super";

/** The saved tier, or the default for anything missing, unknown or unreadable. */
export const loadVoxelTier = (): VoxelTier => {
  try {
    const saved = localStorage.getItem(KEY);
    return isVoxelTier(saved) ? saved : DEFAULT_CHOICE;
  } catch {
    return DEFAULT_CHOICE;
  }
};

/** The tier Vue screens read. */
export const voxelTier = ref<VoxelTier>(loadVoxelTier());

export const setVoxelTier = (tier: VoxelTier): void => {
  const isUnknown = !isVoxelTier(tier);
  if (isUnknown) return;
  voxelTier.value = tier;
  try {
    localStorage.setItem(KEY, tier);
  } catch {
    // chemx-allow: best-effort storage blocked, so the choice still holds until reload
  }
};

/** Sync getters for code outside Vue: the landmark renderer and the thumbnailer. */
export const currentTier = (): VoxelTier => voxelTier.value;

export const currentKnobs = (): VoxelKnobs => knobsFor(voxelTier.value);
