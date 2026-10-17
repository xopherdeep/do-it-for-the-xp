import { getFamilySettingsDb } from "@/lib/databases/FamilySettingsDb";
import { dayKeyOf, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { DEFAULT_LATE_CHORES, normalizeLateChores, type LateChoreSettings } from "@/lib/services/quests/lateRules";

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
  /** Cash out (Settings > Rewards): heroes trade GP for real money; every cash out waits in Approvals for a Game Master */
  cashOut: CashOutSettings;
  /** Late chores (Settings > Chores): lock, reduced pay and penalty, all off until the Game Master turns them on */
  lateChores: LateChoreSettings;
}

export interface CashOutSettings {
  enabled: boolean;
  /** GP for one unit of real money ($1) */
  gpPerDollar: number;
  /** The heroes who may cash out; empty is every hero */
  heroIds: string[];
}

/** The rates the settings offer, GP per $1 */
export const CASH_OUT_RATES: readonly number[] = [5, 10, 20, 25, 50, 100];

/** A custom rate stays within this many GP per dollar */
export const MAX_CASH_OUT_RATE = 10000;

/** A typed rate as a whole number of GP per dollar, 1 to the maximum; null for anything that is not a number */
export const clampCashOutRate = (value: unknown): number | null => {
  const rate = Math.round(Number(value));
  const isNumber = value !== "" && value !== null && value !== undefined && Number.isFinite(rate);
  if (!isNumber) return null;
  return Math.min(MAX_CASH_OUT_RATE, Math.max(1, rate));
};

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  trustedHour: false,
  bedtime: { enabled: false, from: "21:00", to: "07:00" },
  dayOffBroadcast: false,
  streaks: true,
  cashOut: { enabled: true, gpPerDollar: 10, heroIds: [] },
  lateChores: { ...DEFAULT_LATE_CHORES },
};

const clock = (value: unknown, fallback: string): string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;

const normalizeCashOut = (stored: Partial<CashOutSettings> | null | undefined): CashOutSettings => {
  const rate = Number(stored?.gpPerDollar) > 0 ? clampCashOutRate(stored?.gpPerDollar) : null;
  return {
    enabled: stored?.enabled !== false,
    gpPerDollar: rate ?? DEFAULT_FAMILY_SETTINGS.cashOut.gpPerDollar,
    heroIds: Array.isArray(stored?.heroIds) ? stored!.heroIds.filter(Boolean).map(String) : [],
  };
};

const normalize = (stored: Partial<FamilySettings> | null | undefined): FamilySettings => ({
  trustedHour: stored?.trustedHour === true,
  bedtime: {
    enabled: stored?.bedtime?.enabled === true,
    from: clock(stored?.bedtime?.from, DEFAULT_FAMILY_SETTINGS.bedtime.from),
    to: clock(stored?.bedtime?.to, DEFAULT_FAMILY_SETTINGS.bedtime.to),
  },
  dayOffBroadcast: stored?.dayOffBroadcast === true,
  streaks: stored?.streaks !== false,
  cashOut: normalizeCashOut(stored?.cashOut),
  lateChores: normalizeLateChores(stored?.lateChores),
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
  const isBedtimeOff = !settings.bedtime.enabled;
  if (isBedtimeOff) return false;
  const from = minutesOf(settings.bedtime.from);
  const to = minutesOf(settings.bedtime.to);
  const isBedtimeEmpty = from === to;
  if (isBedtimeEmpty) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const inside = from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
  return inside && !bedtimeLifted(settings, effects, now);
};
