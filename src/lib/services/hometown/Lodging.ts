/**
 * Lodging: the Hospital and the Hotel in the hometown.
 *
 * The screens ask quoteCare() what a service would cost and restore, and only then
 * touch the user store. Nothing here mutates anything: it is a price list and a quote.
 *
 *   heal    Hospital   full HP                                HEAL_COST
 *   revive  Hospital   full HP and full MP                    REVIVE_COST
 *   room    Hotel      a night's sleep: full HP and full MP   ROOM_COST
 *   bench   Hospital   a doze on the waiting-room bench: a quarter of max HP, free, once a day
 *
 * Fights leave damage behind and a defeat sends the hero home with 1 HP, so a broke hero must
 * never be stuck: the bench (quoteBenchRest) costs nothing and asks only that a day has passed.
 */

export const HEAL_COST = 50;
export const REVIVE_COST = 100;
export const ROOM_COST = 10;
/** Share of max HP a bench nap restores. */
export const BENCH_REST_SHARE = 0.25;

export type CareKind = "heal" | "revive" | "room";

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
 */
export function quoteCare(kind: CareKind, stats: CareStats | null | undefined): CareQuote {
  const cost = CARE_COSTS[kind];
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
  if (wallet < cost) {
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
  if (hpGain <= 0) return { hpGain: 0, canRest: false, reason: "healthy" };
  if (benchRestedToday(benchRestAt, now)) return { hpGain, canRest: false, reason: "rested" };
  return { hpGain, canRest: true };
}
