/**
 * What a hero's Powers (abilities) look like for one particular hero: which are unlocked, which can be cast,
 * which are cooling down. Pure: no stores, no storage; the caller hands in the abilities, the hero profile and `now`.
 *
 * The rules are the ones in AbilityService (`checkAbilityUnlock` for the unlock, `getAbilityStatus` for the status),
 * ported so the Game Master's Compendium can judge a real hero without the service singleton:
 *  - unlock = enough AP in the ability's window, the level, every class level, and every prerequisite unlocked;
 *  - status = Locked, else Unlocked when the MP cannot pay for it, else Cooling inside the frequency window, else Available.
 *
 * Casts are per hero: the cooldown reads the hero's own newest cast of each Power (`lastCasts`, from the Cast Log,
 * see `lastCastsOf` in CastLogDb). `lastUsed` on the ability record is the legacy shared stamp (one hero's cast cooled
 * the Power for every hero); it is only read when the caller hands in no `lastCasts`.
 *
 * Two things the service leaves open are decided here:
 *  - AP windows come from the hero's AP history (`stats.ap.history`, written by `recordAPGain`) and follow the
 *    same stretches of time as the cooldowns: today, the last 7 days, this calendar month / quarter / year;
 *  - prerequisites are resolved to a fixed point, so the order of the list does not matter and a cycle stays locked.
 */
import { AbilityStatus, TimePeriod } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import { isGrounded, type GpPurse } from "@/lib/services/gp/wallet";
import { GROUNDED_REASON } from "@/lib/services/hometown/hospitalBill";
import { classLevelsOf } from "@/lib/services/stats/ClassPassives";

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

/** The parts of a hero profile the Powers rules read, as the user store keeps them. */
export interface HeroAbilityProfile {
  jobClass?: string | null;
  stats?: {
    level?: number;
    /** `{ total, history: [{ amount, timestamp }] }`; very old profiles keep a bare number. */
    ap?: unknown;
    /** `{ now, max }`, or a bare number on very old profiles. */
    mp?: unknown;
    /** `{ [className]: { level } }` */
    classes?: unknown;
    /** The purse; `hospitalBill` above 0 grounds the hero (docs/Quest-Rooms-Spec.md 5.8). */
    gp?: GpPurse | null;
  } | null;
}

/** AP the hero earned inside each window the abilities ask about. */
export interface HeroApWindows {
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
}

/** The hero as the Powers rules see them. `classes` is keyed by `classKey` (case and punctuation dropped). */
export interface HeroAbilitySnapshot {
  level: number;
  mp: number;
  ap: HeroApWindows;
  classes: Record<string, number>;
}

/** Both maps XpAbilityManager takes: the status badge and the unlocked flag, by ability id. */
export interface HeroAbilityStatusMap {
  statuses: Record<string, AbilityStatus>;
  unlocks: Record<string, boolean>;
}

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const quarterOf = (date: Date): number => Math.floor(date.getMonth() / 3);
const halfOf = (date: Date): number => (date.getMonth() < 6 ? 0 : 1);
const sameYear = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear();
const sameMonth = (a: Date, b: Date): boolean => sameYear(a, b) && a.getMonth() === b.getMonth();
const sameDay = (a: Date, b: Date): boolean => sameMonth(a, b) && a.getDate() === b.getDate();

/** "time-mage", "Time Mage" and "time_mage" are one class (profiles have stored several spellings). */
export const classKey = (name: string): string => String(name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The windows (besides the lifetime total) that a moment before `now` falls in. */
const windowsHolding = (at: Date, now: Date): Array<keyof HeroApWindows> => {
  const held: Array<keyof HeroApWindows> = [];
  const isInLastWeek = now.getTime() - at.getTime() <= WEEK_MS;
  const isInQuarter = sameYear(at, now) && quarterOf(at) === quarterOf(now);
  if (sameDay(at, now)) held.push("daily");
  if (isInLastWeek) held.push("weekly");
  if (sameMonth(at, now)) held.push("monthly");
  if (isInQuarter) held.push("quarterly");
  if (sameYear(at, now)) held.push("yearly");
  return held;
};

/** The hero's AP per window. A record with no usable amount or date, or dated after `now`, counts toward the total only. */
export const heroApWindows = (ap: unknown, now: Date = new Date()): HeroApWindows => {
  const windows: HeroApWindows = { total: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 };
  const isBareNumber = typeof ap === "number";
  const isRecord = typeof ap === "object" && ap !== null;
  if (isBareNumber) return { ...windows, total: finite(ap) };
  if (!isRecord) return windows;

  const { total, history } = ap as { total?: unknown; history?: unknown };
  const records: Array<{ amount?: unknown; timestamp?: unknown }> = Array.isArray(history) ? history : [];
  let historyTotal = 0;

  for (const record of records) {
    const amount = finite(record?.amount);
    const at = new Date(record?.timestamp as string);
    const isDatedBeforeNow = at.getTime() <= now.getTime(); // an invalid date is NaN, and NaN <= anything is false
    historyTotal += amount;
    const isUncountedRecord = !amount || !isDatedBeforeNow;
    if (isUncountedRecord) continue;
    for (const slot of windowsHolding(at, now)) windows[slot] += amount;
  }

  // `recordAPGain` keeps the running total next to the history; fall back to the history when it is missing.
  const hasStoredTotal = total !== undefined && total !== null && Number.isFinite(Number(total));
  windows.total = hasStoredTotal ? Number(total) : historyTotal;
  return windows;
};

/**
 * Class levels as the hero side reads them (`classLevelsOf(stats.classes)`), keyed by `classKey`.
 * The class the hero has equipped counts as level 1 at least, the way the battle side reads it.
 */
export const heroClassLevels = (hero: HeroAbilityProfile): Record<string, number> => {
  const levels: Record<string, number> = {};
  const put = (name: string, level: number) => {
    const key = classKey(name);
    levels[key] = Math.max(levels[key] ?? 0, level);
  };
  const classes = classLevelsOf(hero?.stats?.classes as Record<string, { level?: number }> | null | undefined);
  for (const [name, level] of Object.entries(classes)) put(name, level);
  if (hero?.jobClass) put(hero.jobClass, 1);
  return levels;
};

/**
 * Why a grounded hero cannot cast, or null when they are free. Grounding is checked before everything else a cast asks
 * (MP, cooldown, AP), but it does not touch the statuses below: the Power is still earned, the hero just may not use it.
 */
export const groundedReasonOf = (hero: HeroAbilityProfile): string | null =>
  isGrounded(hero?.stats?.gp) ? GROUNDED_REASON : null;

/** The numbers a Game Master can show beside the hero's name: level, MP now, AP per window, class levels. */
export const heroAbilitySnapshot = (hero: HeroAbilityProfile, now: Date = new Date()): HeroAbilitySnapshot => {
  const stats = hero?.stats;
  const mp = stats?.mp;
  const level = Number(stats?.level);
  const hasLevel = Number.isFinite(level) && level >= 1;
  return {
    level: hasLevel ? level : 1,
    mp: typeof mp === "number" ? finite(mp) : finite((mp as { now?: unknown } | null | undefined)?.now),
    ap: heroApWindows(stats?.ap, now),
    classes: heroClassLevels(hero),
  };
};

/** AbilityService.checkAbilityUnlock's AP switch: hourly, bi-annual and flat have no window of their own, so they read the lifetime total. */
const AP_WINDOW_OF_PERIOD: Record<string, keyof HeroApWindows> = {
  [TimePeriod.Daily]: "daily",
  [TimePeriod.Weekly]: "weekly",
  [TimePeriod.Monthly]: "monthly",
  [TimePeriod.Quarterly]: "quarterly",
  [TimePeriod.Yearly]: "yearly",
};

/** Everything about unlocking except the prerequisites: AP in the window, hero level, every class level. */
const meetsOwnRequirements = (ability: Ability, hero: HeroAbilitySnapshot): boolean => {
  const requirement = ability.apRequirement;
  const apWindow = AP_WINDOW_OF_PERIOD[requirement?.period ?? ""] ?? "total";
  const hasEnoughAp = hero.ap[apWindow] >= finite(requirement?.amount);

  const levelRequired = ability.characterRequirement?.level;
  const hasLevel = !levelRequired || hero.level >= levelRequired;

  const classRequired = Object.entries(ability.characterRequirement?.class ?? {});
  const hasClasses = classRequired.every(([className, level]) => (hero.classes[classKey(className)] ?? 0) >= level);

  return hasEnoughAp && hasLevel && hasClasses;
};

/** AbilityService.getAbilityStatus's cooldown switch: whether `lastUsed` is still inside the ability's frequency window. */
const COOLDOWN_HOLDS: Record<string, (lastUsed: Date, now: Date) => boolean> = {
  [TimePeriod.Hourly]: (lastUsed, now) => now.getTime() - lastUsed.getTime() <= HOUR_MS,
  [TimePeriod.Daily]: (lastUsed, now) => sameDay(lastUsed, now),
  [TimePeriod.Weekly]: (lastUsed, now) => now.getTime() - lastUsed.getTime() <= WEEK_MS,
  [TimePeriod.Monthly]: (lastUsed, now) => sameMonth(lastUsed, now),
  [TimePeriod.Quarterly]: (lastUsed, now) => sameYear(lastUsed, now) && quarterOf(lastUsed) === quarterOf(now),
  [TimePeriod.BiAnnual]: (lastUsed, now) => sameYear(lastUsed, now) && halfOf(lastUsed) === halfOf(now),
  [TimePeriod.Yearly]: (lastUsed, now) => sameYear(lastUsed, now),
};

/** AbilityService.getAbilityStatus's order of questions. */
const statusOf = (isUnlocked: boolean, cannotPayMp: boolean, isCooling: boolean): AbilityStatus => {
  if (!isUnlocked) return AbilityStatus.Locked;
  if (cannotPayMp) return AbilityStatus.Unlocked; // unlocked, but the MP cannot pay for it
  return isCooling ? AbilityStatus.Cooling : AbilityStatus.Available;
};

/**
 * The status of every ability for one hero.
 * `unlockedAbilityIds` are abilities already counted as unlocked when a prerequisite asks (the ability's own
 * unlock is always worked out from the rules). A prerequisite that is not in `abilities` can never be met.
 * `lastCasts` is the hero's newest cast per ability id (ISO). When it is given, even as `{}`, the cooldown reads it and
 * ignores `ability.lastUsed`; when it is left out, the cooldown reads the legacy shared `ability.lastUsed`.
 */
export const computeHeroAbilityStatuses = (
  abilities: Ability[],
  hero: HeroAbilityProfile,
  unlockedAbilityIds: string[] = [],
  now: Date = new Date(),
  lastCasts?: Record<string, string>
): HeroAbilityStatusMap => {
  const snapshot = heroAbilitySnapshot(hero, now);

  // Prerequisites, to a fixed point: whatever clears its own requirements unlocks once its prerequisites have.
  const candidates = abilities.filter((ability) => meetsOwnRequirements(ability, snapshot));
  const known = new Set<string>(unlockedAbilityIds);
  const unlocked = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const ability of candidates) {
      const hasPrerequisites = (ability.prerequisites ?? []).every((id) => known.has(id));
      const shouldSkipAbility = unlocked.has(ability.id) || !hasPrerequisites;
      if (shouldSkipAbility) continue;
      unlocked.add(ability.id);
      known.add(ability.id);
      progressed = true;
    }
  }

  const statuses: Record<string, AbilityStatus> = {};
  const unlocks: Record<string, boolean> = {};
  for (const ability of abilities) {
    const lastCastAt = lastCasts ? lastCasts[ability.id] : ability.lastUsed;
    const lastUsed = new Date(lastCastAt as string); // no cast is an invalid date, which never cools
    const isCooling = !Number.isNaN(lastUsed.getTime()) && (COOLDOWN_HOLDS[ability.frequency]?.(lastUsed, now) ?? false);
    unlocks[ability.id] = unlocked.has(ability.id);
    statuses[ability.id] = statusOf(unlocks[ability.id], snapshot.mp < finite(ability.mpCost), isCooling);
  }
  return { statuses, unlocks };
};
