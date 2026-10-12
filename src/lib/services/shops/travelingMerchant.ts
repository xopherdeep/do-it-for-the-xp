/**
 * Where Boobeedeedle, the traveling merchant, parks the balloon today. Heroes have to go looking: every nine
 * days the merchant visits each world once, in a shuffled order, and never stays in the same world two days
 * running. The pick hangs on the local calendar day alone, so it holds from midnight to midnight and every
 * hero (and every device) finds the merchant in the same place.
 */

export const MERCHANT_WORLDS = [
  "plains",
  "islands",
  "forest",
  "mountains",
  "desert",
  "swamps",
  "ice",
  "clouds",
  "moon",
] as const;

export type MerchantWorld = (typeof MERCHANT_WORLDS)[number];

const DAY_MS = 86_400_000;
const STRETCH = MERCHANT_WORLDS.length;
const SALT = 0x5eed1e;

/** Days since 1 Jan 1970 by the local calendar (a 23- or 25-hour day still counts as one). */
const localDayNumber = (date: Date): number =>
  Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

// mulberry32: a tiny seeded generator, enough to shuffle nine worlds the same way on every device
const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffledStretch = (stretch: number): MerchantWorld[] => {
  const random = seededRandom(Math.imul(stretch, 2654435761) ^ SALT);
  const order = [...MERCHANT_WORLDS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/** One nine-day stretch; it never opens where the stretch before it closed. */
const stretchRoute = (stretch: number): MerchantWorld[] => {
  const order = shuffledStretch(stretch);
  const yesterday = shuffledStretch(stretch - 1)[STRETCH - 1];
  if (order[0] === yesterday) [order[0], order[1]] = [order[1], order[0]];
  return order;
};

/** The world the merchant is in on `date`'s local calendar day. */
export const merchantWorldOn = (date: Date = new Date()): MerchantWorld => {
  const day = localDayNumber(date);
  const stretch = Math.floor(day / STRETCH);
  return stretchRoute(stretch)[day - stretch * STRETCH];
};

/** Whether the merchant is in this world today; takes a world id ("forest") or its page's area ("world-forest"). */
export const isMerchantIn = (world: string, date: Date = new Date()): boolean =>
  world.replace(/^world-/, "") === merchantWorldOn(date);
