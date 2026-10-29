/**
 * What the Raids tab shows of a raid: the health numbers, each hero's damage on a ledger, the time left, and who may still
 * claim the loot. Pure: no storage, no Vue, no stores, so the card stays a thin view.
 */
import { raidEndsAt, raidState, rewardFor, rewardKey, type Raid, type RaidState } from "./raidRules";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface LedgerRow {
  heroId: string;
  name: string;
  damage: number;
  /** 0 to 100 against the top striker, so the bars read side by side */
  barPercent: number;
  isTop: boolean;
}

export interface RaidSummary {
  hp: number;
  maxHp: number;
  hpPercent: number;
  status: RaidState["status"];
  /** "3 days left" while the beast stands, "" once it is down or has fled */
  timeLeft: string;
  ledger: LedgerRow[];
  /** Names, "" when nobody has struck or the beast still stands (last hit) */
  topStriker: string;
  lastHit: string;
}

export interface ClaimRow {
  heroId: string;
  name: string;
  isClaimed: boolean;
}

/** How long is left, in the biggest whole unit that reads well: days from two, hours up to two days, minutes under an hour */
export const timeLeftLabel = (endsAt: Date, now: Date): string => {
  const left = endsAt.getTime() - now.getTime();
  const days = Math.floor(left / DAY_MS);
  const hours = Math.ceil(left / HOUR_MS);
  const minutes = Math.max(1, Math.ceil(left / MINUTE_MS));
  const isOver = left <= 0;
  const inDays = days >= 2;
  const inHours = left >= HOUR_MS;
  const isOneHour = hours === 1;
  const hourLabel = `${hours} ${isOneHour ? "hour" : "hours"} left`;
  const shortLabel = inHours ? hourLabel : `${minutes} min left`;
  const longLabel = inDays ? `${days} days left` : shortLabel;
  return isOver ? "Time's up" : longLabel;
};

const damageByHero = (raid: Raid): Map<string, number> => {
  const dealt = new Map<string, number>();
  raid.memberIds.forEach((heroId) => dealt.set(heroId, 0));
  raid.strikes.forEach((strike) => dealt.set(strike.heroId, (dealt.get(strike.heroId) ?? 0) + strike.damage));
  return dealt;
};

/** The raid as the card shows it. `names` maps hero ids to nicknames; a hero it does not know is "Hero". */
export const raidSummary = (raid: Raid, names: Readonly<Record<string, string>>, now: Date): RaidSummary => {
  const state = raidState(raid, now);
  const nameOf = (heroId: string): string => names[heroId] ?? "Hero";
  const dealt = damageByHero(raid);
  const top = Math.max(0, ...dealt.values());
  const hasDamage = top > 0;
  const ledger = [...dealt.entries()]
    .map(([heroId, damage]) => ({
      heroId,
      name: nameOf(heroId),
      damage,
      barPercent: hasDamage ? Math.round((damage / top) * 100) : 0,
      isTop: heroId === state.topStriker,
    }))
    .sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name));
  const hasHealth = raid.maxHp > 0;
  const isActive = state.status === "active";
  return {
    hp: state.hp,
    maxHp: raid.maxHp,
    hpPercent: hasHealth ? Math.round((state.hp / raid.maxHp) * 100) : 0,
    status: state.status,
    timeLeft: isActive ? timeLeftLabel(raidEndsAt(raid), now) : "",
    ledger,
    topStriker: state.topStriker ? nameOf(state.topStriker) : "",
    lastHit: state.lastHit ? nameOf(state.lastHit) : "",
  };
};

/** The heroes who may claim loot from a fallen beast (those who struck and are still in the party), and whether they already did */
export const claimRows = (raid: Raid, names: Readonly<Record<string, string>>, paid: readonly string[]): ClaimRow[] => {
  const owed = raid.memberIds.filter((heroId) => rewardFor(raid, heroId) !== null);
  return owed.map((heroId) => ({
    heroId,
    name: names[heroId] ?? "Hero",
    isClaimed: paid.includes(rewardKey(raid.id, heroId)),
  }));
};
