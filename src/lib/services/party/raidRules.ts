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
  const hasSize = Number.isFinite(difficulty) && difficulty > 0;
  if (!hasSize) return 0;
  const step = DIFFICULTY_STEPS.reduce((best, candidate) => {
    const isNearer = Math.abs(candidate - difficulty) <= Math.abs(best - difficulty);
    return isNearer ? candidate : best;
  });
  return step * DAMAGE_PER_STEP;
};

/** A blow trimmed to what is left of the hero's day */
export const cappedDamage = (alreadyToday: number, damage: number): number => {
  const isReal = Number.isFinite(damage);
  const room = DAILY_STRIKE_CAP - alreadyToday;
  return isReal ? Math.max(0, Math.min(damage, room)) : 0;
};

/** The beast's health: the window's days times the party's size times the pace, so a small party never meets a big party's boss */
export const raidMaxHp = (window: RaidWindow, members: number): number => {
  const isParty = Number.isFinite(members) && members >= 1;
  const heroes = isParty ? Math.floor(members) : 1;
  return RAID_DAYS[window] * heroes * HP_PER_HERO_DAY;
};

/** When the window closes: a blow from this moment on is too late */
export const raidEndsAt = (raid: Pick<Raid, "startedAt" | "window">): Date =>
  new Date(Date.parse(raid.startedAt) + RAID_DAYS[raid.window] * DAY_MS);

const damageOf = (strikes: readonly Strike[]): number => strikes.reduce((sum, strike) => sum + strike.damage, 0);

const healthOf = (raid: Raid): number => Math.max(0, raid.maxHp - damageOf(raid.strikes));

const isDefeated = (raid: Raid): boolean => {
  const hasStruck = raid.strikes.length > 0;
  const isDown = healthOf(raid) === 0;
  return hasStruck && isDown;
};

/** What the hero already dealt to this raid on the strike's calendar day (the device's zone) */
const dealtOnDay = (raid: Raid, heroId: string, day: string): number => {
  const heroToday = raid.strikes.filter((counted) => {
    const isHero = counted.heroId === heroId;
    const isDay = toDayKey(new Date(counted.at)) === day;
    return isHero && isDay;
  });
  return damageOf(heroToday);
};

/**
 * Adds one strike, or answers the same raid when it does not count: a key already counted, a hero who is not in the raid,
 * a time outside the window, a beast already down, or a hero already at the day's cap. The blow is trimmed to the hero's
 * cap and to what is left of the beast. A hero's day is the calendar day, in the device's zone, of the strike's time.
 */
export const addStrike = (raid: Raid, strike: Strike): Raid => {
  const isCounted = raid.strikes.some((counted) => counted.key === strike.key);
  const isMember = raid.memberIds.includes(strike.heroId);
  const at = Date.parse(strike.at);
  const startedAt = Date.parse(raid.startedAt);
  const hasTimes = Number.isFinite(at) && Number.isFinite(startedAt);
  const endsAt = raidEndsAt(raid).getTime();
  const isInWindow = hasTimes && at >= startedAt && at < endsAt;
  const remaining = raid.maxHp - damageOf(raid.strikes);
  const isStanding = remaining > 0;
  const mayStrike = !isCounted && isMember && isInWindow && isStanding;
  if (!mayStrike) return raid;

  const dealtToday = dealtOnDay(raid, strike.heroId, toDayKey(new Date(at)));
  const damage = Math.min(cappedDamage(dealtToday, strike.damage), remaining);
  const hasDamage = damage > 0;
  if (!hasDamage) return raid;
  return { ...raid, strikes: [...raid.strikes, { ...strike, damage }] };
};

interface HeroTally {
  total: number;
  firstAt: number;
  firstIndex: number;
}

const topStrikerOf = (strikes: readonly Strike[]): string | undefined => {
  const heroes = new Map<string, HeroTally>();
  strikes.forEach((strike, index) => {
    const at = Date.parse(strike.at);
    const seen = heroes.get(strike.heroId) ?? { total: 0, firstAt: at, firstIndex: index };
    heroes.set(strike.heroId, {
      total: seen.total + strike.damage,
      firstAt: Math.min(seen.firstAt, at),
      firstIndex: seen.firstIndex,
    });
  });
  const ranked = [...heroes.entries()].sort(
    ([, a], [, b]) => b.total - a.total || a.firstAt - b.firstAt || a.firstIndex - b.firstIndex
  );
  const top = ranked[0];
  return top ? top[0] : undefined;
};

const lastHitOf = (raid: Raid): string | undefined => {
  const running = raid.strikes.map((_, index) => damageOf(raid.strikes.slice(0, index + 1)));
  const felledAt = running.findIndex((total) => total >= raid.maxHp);
  const felledBy = raid.strikes[felledAt];
  return felledBy ? felledBy.heroId : undefined;
};

/** Where the raid stands at `now`: the beast's health, whether it is down or the window closed on it, and who stands out */
export const raidState = (raid: Raid, now: Date): RaidState => {
  const defeated = isDefeated(raid);
  const windowClosed = now.getTime() >= raidEndsAt(raid).getTime();
  const missed = windowClosed ? "retreated" : "active";
  const status: RaidState["status"] = defeated ? "defeated" : missed;
  const topStriker = topStrikerOf(raid.strikes);
  const lastHit = defeated ? lastHitOf(raid) : undefined;
  return {
    hp: healthOf(raid),
    status,
    ...(topStriker ? { topStriker } : {}),
    ...(lastHit ? { lastHit } : {}),
  };
};

/**
 * What the hero is owed from this raid: the base reward, the same for one blow or many, once the beast is down. Nothing
 * while it stands, for a member who never struck, or for a hero who left the party before it fell (their strikes still count).
 */
export const rewardFor = (raid: Raid, heroId: string): RaidReward | null => {
  const isMember = raid.memberIds.includes(heroId);
  const hasStruck = raid.strikes.some((strike) => strike.heroId === heroId);
  const isOwed = isDefeated(raid) && isMember && hasStruck;
  return isOwed ? { ...RAID_BASE_REWARD } : null;
};
