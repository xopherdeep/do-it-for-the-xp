import type { BackupStorage } from "@/lib/services/core/BackupService";

/**
 * The settings the app keeps in localStorage that a family would want on a new phone: sound, haptics, text speed,
 * game style, the family lock, reminder choices and the bestiary backgrounds. Device state stays out on purpose:
 * who is signed in, masquerading, which quests were already reminded, dev switches, when the last backup was made.
 * Add a key here when a new family-wide setting lands in localStorage. A setting that belongs to this phone and not
 * to the family (xp.voxelQuality, the Video tier) is device-only: never list it, or a restore from a fast phone
 * would overwrite what an old phone needs.
 */
export const LOCAL_SETTING_KEYS: readonly string[] = [
  "xp-audio-settings",
  "xp-audio-theme",
  "xp.haptics",
  "xp.textSpeed",
  "xp.themeChoice",
  "fabStyle",
  "xp.familyLocked",
  "xp.battleAlerts",
  "xp.choreReminders",
  "xp.approvalReminderHours",
  "xp-bestiary-bg-settings",
  "xp-custom-bg-presets",
];

const isSettingKey = (key: string): boolean => LOCAL_SETTING_KEYS.includes(key);

/**
 * localStorage seen through the slice of Ionic Storage a backup needs, limited to LOCAL_SETTING_KEYS.
 * Values stay the raw text localStorage holds, so a restore writes back exactly what was read.
 */
export const createLocalSettingsStorage = (local: () => Storage = () => window.localStorage): BackupStorage => ({
  create: async () => undefined as never,
  forEach: async (iterator) => {
    for (const key of LOCAL_SETTING_KEYS) {
      const value = local().getItem(key);
      const isSet = value !== null;
      if (isSet) iterator(value, key, 0);
    }
  },
  set: async (key, value) => {
    // A restore only ever brings these keys back; anything else in the file is not a setting this app keeps
    if (!isSettingKey(key)) return;
    local().setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  },
  clear: async () => {
    LOCAL_SETTING_KEYS.forEach((key) => local().removeItem(key));
  },
});

export const localSettingsStorage = createLocalSettingsStorage();
