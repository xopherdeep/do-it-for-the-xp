/**
 * Raid rules: a great beast the party strikes with its approved chores, over a few days.
 *
 * Pure: no storage, no Vue, no stores. The site (xophz-compass-xp, Party_Rules) works out the same numbers from the same
 * strikes, so every constant here has a twin there; change them together. A raid's health is never stored, only summed
 * from its strikes, so no device can write it.
 */
import { toDayKey } from "./partyStats";

export type RaidWindow = "quick" | "standard" | "epic";

/** How long each window runs */
export const RAID_DAYS: Record<RaidWindow, number> = { quick: 3, standard: 7, epic: 14 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Fibonacci sizes a chore can have (packCommon's FIBONACCI_STEPS; not imported, because packCommon pulls in the storage layer) */
const DIFFICULTY_STEPS: readonly number[] = [1, 2, 3, 5, 8, 13];

/** Damage a chore deals per Fibonacci step of difficulty */
export const DAMAGE_PER_STEP = 10;
/** The most damage one hero can deal to one raid on one day: about two middling chores */
export const DAILY_STRIKE_CAP = 60;
/** The pace a raid's health expects: one middling chore a day from each hero, half of what the daily cap allows */
export const HP_PER_HERO_DAY = 30;
/** What every striker is paid when the beast falls. Starting values, tuned with the economy rebalance (epic #1633) */
export const RAID_BASE_REWARD = { xp: 300, ap: 5, gp: 20 } as const;

export interface RaidReward {
  xp: number;
  ap: number;
  gp: number;
}

export interface Strike {
  /** Names one finished chore for one hero on one day, so a resend or a second approval counts once */
  key: string;
  heroId: string;
  damage: number;
  /** When the chore was paid, ISO */
  at: string;
}

export interface Raid {
  id: string;
  /** "home" for the household's own party, the site's party id for an outside one */
  partyId: string;
  beastId: string;
  window: RaidWindow;
  /** ISO */
  startedAt: string;
  maxHp: number;
  /** The heroes who may strike now; a hero who leaves keeps the strikes already counted */
  memberIds: string[];
  strikes: Strike[];
}

export interface RaidState {
  hp: number;
  status: "active" | "defeated" | "retreated";
  /** The hero with the most damage so far (a tie goes to whoever struck first) */
  topStriker?: string;
  /** The hero whose blow felled the beast; set once it is defeated */
  lastHit?: string;
}

/** The damage a chore of this difficulty deals: the nearest Fibonacci step (a tie rounds up) times ten; none for a chore with no size */
export const strikeDamage = (difficulty: number): number => {
  if (!Number.isFinite(difficulty) || difficulty <= 0) return 0;
  const step = DIFFICULTY_STEPS.reduce((best, candidate) =>
    Math.abs(candidate - difficulty) <= Math.abs(best - difficulty) ? candidate : best
  );
  return step * DAMAGE_PER_STEP;
};

/** A blow trimmed to what is left of the hero's day */
export const cappedDamage = (alreadyToday: number, damage: number): number => {
  if (!Number.isFinite(damage)) return 0;
  return Math.max(0, Math.min(damage, DAILY_STRIKE_CAP - alreadyToday));
};

/** The beast's health: the window's days times the party's size times the pace, so a small party never meets a big party's boss */
export const raidMaxHp = (window: RaidWindow, members: number): number => {
  const heroes = Number.isFinite(members) && members >= 1 ? Math.floor(members) : 1;
  return RAID_DAYS[window] * heroes * HP_PER_HERO_DAY;
};

/** When the window closes: a blow from this moment on is too late */
export const raidEndsAt = (raid: Pick<Raid, "startedAt" | "window">): Date =>
  new Date(Date.parse(raid.startedAt) + RAID_DAYS[raid.window] * DAY_MS);

const damageOf = (strikes: readonly Strike[]): number => strikes.reduce((sum, strike) => sum + strike.damage, 0);

const healthOf = (raid: Raid): number => Math.max(0, raid.maxHp - damageOf(raid.strikes));

const isDefeated = (raid: Raid): boolean => raid.strikes.length > 0 && healthOf(raid) === 0;

/**
 * Adds one strike, or answers the same raid when it does not count: a key already counted, a hero who is not in the raid,
 * a time outside the window, a beast already down, or a hero already at the day's cap. The blow is trimmed to the hero's
 * cap and to what is left of the beast. A hero's day is the calendar day, in the device's zone, of the strike's time.
 */
export const addStrike = (raid: Raid, strike: Strike): Raid => {
  if (raid.strikes.some((counted) => counted.key === strike.key)) return raid;
  if (!raid.memberIds.includes(strike.heroId)) return raid;
  const at = Date.parse(strike.at);
  const startedAt = Date.parse(raid.startedAt);
  if (!Number.isFinite(at) || !Number.isFinite(startedAt)) return raid;
  if (at < startedAt || at >= raidEndsAt(raid).getTime()) return raid;
  const remaining = raid.maxHp - damageOf(raid.strikes);
  if (remaining <= 0) return raid;
  const day = toDayKey(new Date(at));
  const dealtToday = damageOf(
    raid.strikes.filter((counted) => counted.heroId === strike.heroId && toDayKey(new Date(counted.at)) === day)
  );
  const damage = Math.min(cappedDamage(dealtToday, strike.damage), remaining);
  if (damage <= 0) return raid;
  return { ...raid, strikes: [...raid.strikes, { ...strike, damage }] };
};

const topStrikerOf = (strikes: readonly Strike[]): string | undefined => {
  const heroes = new Map<string, { total: number; firstAt: number; firstIndex: number }>();
  strikes.forEach((strike, index) => {
    const at = Date.parse(strike.at);
    const seen = heroes.get(strike.heroId);
    if (!seen) heroes.set(strike.heroId, { total: strike.damage, firstAt: at, firstIndex: index });
    else {
      seen.total += strike.damage;
      if (at < seen.firstAt) seen.firstAt = at;
    }
  });
  const ranked = [...heroes.entries()].sort(
    ([, a], [, b]) => b.total - a.total || a.firstAt - b.firstAt || a.firstIndex - b.firstIndex
  );
  return ranked[0]?.[0];
};

const lastHitOf = (raid: Raid): string | undefined => {
  let dealt = 0;
  for (const strike of raid.strikes) {
    dealt += strike.damage;
    if (dealt >= raid.maxHp) return strike.heroId;
  }
  return undefined;
};

/** Where the raid stands at `now`: the beast's health, whether it is down or the window closed on it, and who stands out */
export const raidState = (raid: Raid, now: Date): RaidState => {
  const hp = healthOf(raid);
  let status: RaidState["status"] = "active";
  if (isDefeated(raid)) status = "defeated";
  else if (now.getTime() >= raidEndsAt(raid).getTime()) status = "retreated";
  const state: RaidState = { hp, status };
  const topStriker = topStrikerOf(raid.strikes);
  if (topStriker) state.topStriker = topStriker;
  if (status === "defeated") {
    const lastHit = lastHitOf(raid);
    if (lastHit) state.lastHit = lastHit;
  }
  return state;
};

/**
 * What the hero is owed from this raid: the base reward, the same for one blow or many, once the beast is down. Nothing
 * while it stands, for a member who never struck, or for a hero who left the party before it fell (their strikes still count).
 */
export const rewardFor = (raid: Raid, heroId: string): RaidReward | null => {
  if (!isDefeated(raid)) return null;
  if (!raid.memberIds.includes(heroId)) return null;
  if (!raid.strikes.some((strike) => strike.heroId === heroId)) return null;
  return { ...RAID_BASE_REWARD };
};
