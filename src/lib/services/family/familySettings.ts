import { getFamilySettingsDb } from "@/lib/databases/FamilySettingsDb";
import { dayKeyOf, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";

/**
 * What the Game Master lets the family do (docs/Items-And-Classes-Contract.md, B), and the family-wide game rules
 * (`streaks`, Settings > Chores). Items no longer bend the quest board, so of the item rules only `trustedHour` is
 * live: the Trusted Hour Power refuses to cast unless it is on. The bedtime locks nothing (`isBedtimeNow` has no caller) and `dayOffBroadcast` is hidden in the settings screen
 * (Gale's Wind used to read it); their stored values stay.
 */
export interface FamilySettings {
  /** The Trusted Hour Power may open a trusted hour: claims skip the approval queue */
  trustedHour: boolean;
  bedtime: { enabled: boolean; /** "HH:mm" */ from: string; /** "HH:mm" */ to: string };
  /** Old: Gale's Wind sent every Game Master a note. Nothing reads it now; the settings screen hides it. */
  dayOffBroadcast: boolean;
  /** Daily streaks (services/streaks): the HUD flame, Streak Shields and streak chests. On unless switched off. */
  streaks: boolean;
}

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  trustedHour: false,
  bedtime: { enabled: false, from: "21:00", to: "07:00" },
  dayOffBroadcast: false,
  streaks: true,
};

const clock = (value: unknown, fallback: string): string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;

const normalize = (stored: Partial<FamilySettings> | null | undefined): FamilySettings => ({
  trustedHour: stored?.trustedHour === true,
  bedtime: {
    enabled: stored?.bedtime?.enabled === true,
    from: clock(stored?.bedtime?.from, DEFAULT_FAMILY_SETTINGS.bedtime.from),
    to: clock(stored?.bedtime?.to, DEFAULT_FAMILY_SETTINGS.bedtime.to),
  },
  dayOffBroadcast: stored?.dayOffBroadcast === true,
  streaks: stored?.streaks !== false,
});

export const loadFamilySettings = async (): Promise<FamilySettings> => {
  try {
    return normalize(await getFamilySettingsDb().getSettings());
  } catch {
    return normalize(null);
  }
};

export const saveFamilySettings = async (settings: FamilySettings): Promise<void> => {
  await getFamilySettingsDb().saveSettings(normalize(settings));
};

const minutesOf = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The day the bedtime night belongs to: the evening it began on, so 2am counts for yesterday. */
export const bedtimeNightOf = (settings: FamilySettings, now: Date): string => {
  const { from, to } = settings.bedtime;
  const crossesMidnight = minutesOf(from) > minutesOf(to);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isNightOfToday = !crossesMidnight || minutes >= minutesOf(from);
  if (isNightOfToday) return dayKeyOf(now);
  return dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
};

/** An old saved Night's Light has lifted the bedtime for the night that `now` falls in (nothing writes one now). */
export const bedtimeLifted = (settings: FamilySettings, effects: HeroQuestEffects | undefined, now: Date): boolean =>
  Boolean(effects?.bedtimeLiftedOn) && effects?.bedtimeLiftedOn === bedtimeNightOf(settings, now);

/** True between the bedtime's two clocks (it may run past midnight) unless an old saved lift covers this night. */
export const isBedtimeNow = (settings: FamilySettings, now: Date, effects?: HeroQuestEffects): boolean => {
  if (!settings.bedtime.enabled) return false;
  const from = minutesOf(settings.bedtime.from);
  const to = minutesOf(settings.bedtime.to);
  if (from === to) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const inside = from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
  return inside && !bedtimeLifted(settings, effects, now);
};
