/**
 * Lodging: the Hospital and the Hotel in the hometown.
 *
 * The screens ask quoteCare() what a service would cost and restore, and only then
 * touch the user store. Nothing here mutates anything: it is a price list and a quote.
 *
 *   heal    Hospital   full HP                                HEAL_COST
 *   revive  Hospital   full HP and full MP                    REVIVE_COST
 *   room    Hotel      a night's sleep: full HP and full MP   roomCost(level), more as the hero grows
 *   bench   Hospital   a doze on the waiting-room bench: a quarter of max HP, free, once a day
 *   bed     Home       a night in your own bed: full HP and full MP, free, once a day
 *
 * Fights leave damage behind, so a broke hero must never be stuck: the bench (quoteBenchRest) and the home bed
 * (quoteBedRest) cost nothing and ask only that a day has passed. A hero at 0 HP is not left to limp here:
 * the Hospital admits them (hospitalAdmission.ts), treats them like a revive and sends the bill.
 */

export const HEAL_COST = 50;
export const REVIVE_COST = 100;
/** The Hotel room is a base fee plus a fee per hero level: see roomCost(). */
export const ROOM_BASE_COST = 10;
export const ROOM_COST_PER_LEVEL = 5;
/** The base fee, kept for the prompts' default; the Hotel charges roomCost(level). */
export const ROOM_COST = ROOM_BASE_COST;
/** Share of max HP a bench nap restores. */
export const BENCH_REST_SHARE = 0.25;

export type CareKind = "heal" | "revive" | "room";

/** The flat prices; the room's entry is only its base fee, quoteCare() charges roomCost(level). */
export const CARE_COSTS: Record<CareKind, number> = {
  heal: HEAL_COST,
  revive: REVIVE_COST,
  room: ROOM_COST,
};

/** Why a quote cannot be paid. "poor": the wallet is short; "healthy": nothing would change. */
export type CareRefusal = "poor" | "healthy";

export interface CareQuote {
  kind: CareKind;
  cost: number;
  hpGain: number;
  mpGain: number;
  canPay: boolean;
  reason?: CareRefusal;
}

/** A pool like `stats.hp`; old profiles may store a bare number, so both are read. */
interface Pool {
  now?: number;
  max?: number;
}

/** The slice of `user.stats` a quote reads; everything is optional because old saves differ. */
export interface CareStats {
  hp?: Pool | number | null;
  mp?: Pool | number | null;
  maxHp?: number;
  maxMp?: number;
  gp?: { wallet?: number } | null;
}

const DEFAULT_MAX = 100;

const finite = (n: unknown, fallback: number): number =>
  typeof n === "number" && Number.isFinite(n) ? n : fallback;

/** What a night at the Hotel costs a hero of this level (a level under 1 pays as level 1). */
export const roomCost = (level: number): number =>
  ROOM_BASE_COST + ROOM_COST_PER_LEVEL * Math.max(1, Math.floor(finite(level, 1)));

/** Reads a pool as { now, max }, with the same defaults the user store uses when it standardizes. */
export function readPool(pool: Pool | number | null | undefined, topLevelMax?: number): { now: number; max: number } {
  const max = Math.max(0, finite(topLevelMax, finite(typeof pool === "object" && pool ? pool.max : undefined, DEFAULT_MAX)));
  const rawNow = typeof pool === "number" ? pool : finite(pool?.now, max);
  return { now: Math.max(0, Math.min(max, rawNow)), max };
}

/** How much a pool gains to reach `target`, never past max and never negative. */
const gainTo = (pool: { now: number; max: number }, target: number): number =>
  Math.max(0, Math.min(pool.max, target) - pool.now);

/**
 * Quote one service against a hero's stats. Pure.
 * `canPay` is false with reason "poor" when the wallet is short, and "healthy" when the
 * service would restore nothing (so the screen can say "You're already in perfect health").
 * Being short of GP is reported before being healthy only when something would be restored;
 * a hero with nothing to restore is told so even with an empty wallet.
 * The room is priced by `level` (roomCost); the other services cost the same at any level.
 */
export function quoteCare(kind: CareKind, stats: CareStats | null | undefined, level = 1): CareQuote {
  const cost = kind === "room" ? roomCost(level) : CARE_COSTS[kind];
  const hp = readPool(stats?.hp, stats?.maxHp);
  const mp = readPool(stats?.mp, stats?.maxMp);
  const wallet = finite(stats?.gp?.wallet, 0);

  let hpGain = 0;
  let mpGain = 0;
  switch (kind) {
    case "heal":
      hpGain = gainTo(hp, hp.max);
      break;
    case "revive":
    case "room":
      hpGain = gainTo(hp, hp.max);
      mpGain = gainTo(mp, mp.max);
      break;
  }

  const isAlreadyHealthy = hpGain <= 0 && mpGain <= 0;
  if (isAlreadyHealthy) {
    return { kind, cost, hpGain: 0, mpGain: 0, canPay: false, reason: "healthy" };
  }
  const isShortOfGold = wallet < cost;
  if (isShortOfGold) {
    return { kind, cost, hpGain, mpGain, canPay: false, reason: "poor" };
  }
  return { kind, cost, hpGain, mpGain, canPay: true };
}

/** Why the bench is refused. "healthy": HP is full; "rested": the hero already napped today. */
export type BenchRefusal = "healthy" | "rested";

export interface BenchQuote {
  hpGain: number;
  canRest: boolean;
  reason?: BenchRefusal;
}

/** The local calendar day of an ISO stamp, or "" when it does not parse: the bench counts days, not hours. */
const localDay = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** True when the hero's last bench nap (`benchRestAt`, ISO) was on the same local day as `now`. */
export const benchRestedToday = (benchRestAt: string | null | undefined, now: Date = new Date()): boolean => {
  const last = localDay(benchRestAt);
  return last !== "" && last === localDay(now.toISOString());
};

/**
 * Quote a free nap on the Hospital bench. Pure.
 * Restores a quarter of max HP (at least 1, never past max), once per local day. Refused with
 * "healthy" when HP is full and "rested" when the hero already napped today; full HP is reported
 * first, because a rested hero with full HP has nothing to gain either way.
 */
export function quoteBenchRest(
  stats: CareStats | null | undefined,
  benchRestAt: string | null | undefined,
  now: Date = new Date()
): BenchQuote {
  const hp = readPool(stats?.hp, stats?.maxHp);
  const hpGain = gainTo(hp, hp.now + Math.max(1, Math.round(hp.max * BENCH_REST_SHARE)));
  const isHealthy = hpGain <= 0;
  if (isHealthy) return { hpGain: 0, canRest: false, reason: "healthy" };
  const hasRestedToday = benchRestedToday(benchRestAt, now);
  if (hasRestedToday) return { hpGain, canRest: false, reason: "rested" };
  return { hpGain, canRest: true };
}

/** Why the home bed is refused. "healthy": HP and MP are full; "rested": the hero already slept today. */
export type BedRefusal = "healthy" | "rested";

export interface BedQuote {
  hpGain: number;
  mpGain: number;
  canRest: boolean;
  reason?: BedRefusal;
}

/**
 * Quote a night in the hero's own bed. Pure.
 * Restores all HP and MP, free, once per local day (the same day test as the bench). Refused with
 * "healthy" when both are full and "rested" when the hero already slept today; full pools are reported
 * first, because a rested hero with nothing to restore has nothing to gain either way.
 */
export function quoteBedRest(
  stats: CareStats | null | undefined,
  bedRestAt: string | null | undefined,
  now: Date = new Date()
): BedQuote {
  const hp = readPool(stats?.hp, stats?.maxHp);
  const mp = readPool(stats?.mp, stats?.maxMp);
  const hpGain = gainTo(hp, hp.max);
  const mpGain = gainTo(mp, mp.max);
  const isFullyRested = hpGain <= 0 && mpGain <= 0;
  if (isFullyRested) return { hpGain: 0, mpGain: 0, canRest: false, reason: "healthy" };
  const hasRestedToday = benchRestedToday(bedRestAt, now);
  if (hasRestedToday) return { hpGain, mpGain, canRest: false, reason: "rested" };
  return { hpGain, mpGain, canRest: true };
}
