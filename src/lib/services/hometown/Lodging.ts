/**
 * Lodging: the Hospital and the Hotel in the hometown.
 *
 * The screens ask quoteCare() what a service would cost and restore, and only then
 * touch the user store. Nothing here mutates anything: it is a price list and a quote.
 *
 *   heal    Hospital   full HP                                HEAL_COST
 *   revive  Hospital   full HP and full MP                    REVIVE_COST
 *   room    Hotel      a night's sleep: full HP and full MP   ROOM_COST
 */

export const HEAL_COST = 50;
export const REVIVE_COST = 100;
export const ROOM_COST = 10;

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

  if (hpGain <= 0 && mpGain <= 0) {
    return { kind, cost, hpGain: 0, mpGain: 0, canPay: false, reason: "healthy" };
  }
  if (wallet < cost) {
    return { kind, cost, hpGain, mpGain, canPay: false, reason: "poor" };
  }
  return { kind, cost, hpGain, mpGain, canPay: true };
}
