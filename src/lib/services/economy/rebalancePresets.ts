/**
 * Rebalance my shop and Powers: the Game Master's opt-in way to move a family's saved preset prices and AP gates onto
 * the new economy (1 GP = 1 cent, see src/lib/services/gp/exchangeRate.ts).
 *
 * Family saved data is never migrated or wiped automatically. This module only answers what COULD change: a row is
 * offered only when the saved value is still exactly the old starter default, so anything a Game Master priced by
 * hand is never listed. Applying changes only the rows the Game Master ticked, returns new arrays and objects (the
 * input is never mutated) and never removes anything. Saved Daddy Date shop items (the reward left the shop and is a
 * Power now, irl-daddy-date) are never offered, changed or removed.
 */
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import type { CashOutSettings } from "@/lib/services/family/familySettings";
import { REAL_REWARD_PRESETS } from "@/lib/services/shops/rewardPresets";
import { TIME_MAGE_PRESETS, TECH_MAGE_PRESETS, REAL_LIFE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { HYBRID_PRESETS } from "@/lib/services/abilities/hybridPresets";
import { PRIVILEGE_PRESETS } from "@/lib/services/abilities/privilegePresets";
import { GP_PER_DOLLAR } from "@/lib/services/gp/exchangeRate";

/** The old starter prices of the real-life reward presets (before the 2026-10-28 rebalance), by preset id */
export const OLD_REWARD_PRICES: Readonly<Record<string, number>> = Object.freeze({
  "reward-frost-treat": 60,
  "reward-bookseller-tome": 150,
  "reward-arcade-tokens": 200,
  "reward-merchant-trinket": 250,
  "reward-picture-show": 300,
  "reward-tavern-feast": 500,
  "reward-boba-tea": 80,
  "reward-pizza-night": 150,
  "reward-taco-night": 120,
  "reward-sushi-night": 250,
  // Listed for completeness: it is no longer a reward preset, so it never yields a row
  "reward-daddy-date": 200,
  "reward-video-game-indie": 300,
  "reward-video-game-major": 600,
  "reward-shopping-spree": 300,
  "reward-sleepover": 250,
  "reward-salon-spa": 300,
  "reward-lego-set": 400,
  "reward-new-bike": 1000,
});

/** The old AP gates (apRequirement.amount) of every preset Power before the 2026-10-28 rebalance, by preset id */
export const OLD_POWER_AP: Readonly<Record<string, number>> = Object.freeze({
  // Timed privileges (privilegePresets.ts): Family
  "irl-timed-game-on": 30,
  "irl-timed-tablet": 30,
  "irl-timed-tv": 25,
  "irl-timed-videos": 20,
  "irl-timed-phone": 40,
  "irl-timed-co-op": 150,
  "irl-timed-movie-marathon": 600,
  "irl-timed-lantern": 20,
  "irl-timed-house-dj": 20,
  "irl-timed-remote": 30,
  "irl-timed-free-roam": 40,
  "irl-timed-lazy-morning": 100,
  "irl-timed-friend-hangout": 250,
  "irl-timed-call-friend": 25,
  "irl-timed-adventure": 200,
  "irl-timed-dusk-patrol": 30,
  // School
  "irl-timed-free-choice": 30,
  "irl-timed-learning-games": 25,
  "irl-timed-headphones": 20,
  "irl-timed-sit-anywhere": 25,
  "irl-timed-extra-recess": 150,
  "irl-timed-teachers-chair": 150,
  "irl-timed-recess-plus": 25,
  // Study breaks
  "irl-timed-game-break": 40,
  "irl-timed-scroll-break": 20,
  "irl-timed-episode-break": 50,
  "irl-timed-power-nap": 25,
  "irl-timed-guilt-free-gaming": 50,
  // Fitness
  "irl-timed-couch-quest": 40,
  "irl-timed-recovery-soak": 30,
  // Household
  "irl-timed-remote-control": 100,
  "irl-timed-aux-cord": 20,
  "irl-timed-living-room": 250,
  "irl-timed-first-shower": 25,
  // Workplace
  "irl-timed-focus-shield": 60,
  "irl-timed-long-lunch": 150,
  "irl-timed-coffee-run": 20,
  "irl-timed-learning-hour": 150,
  "irl-timed-early-out": 500,
  // In-game spells (AbilityPresets.ts)
  "time-mage-haste": 100,
  "time-mage-slow": 50,
  "time-mage-stop": 200,
  "time-mage-rewind": 300,
  "tech-mage-debug": 100,
  "tech-mage-quicksave": 50,
  "tech-mage-overclock": 250,
  "tech-mage-system-restore": 400,
  // Real-life Powers (AbilityPresets.ts)
  "irl-captains-seat": 50,
  "irl-night-owl": 150,
  "irl-gaming-hour": 200,
  "irl-bards-pick": 250,
  "irl-feast-decree": 300,
  "irl-guild-gathering": 500,
  "irl-day-off": 1000,
  "irl-snooze": 150,
  "irl-extra-time": 150,
  "irl-quiet-day": 200,
  "irl-trusted-hour": 300,
  "irl-car-dj": 50,
  "irl-app-extension": 100,
  "irl-yes-day": 2500,
  // The hybrid (hybridPresets.ts)
  "hybrid-time-tech-quantum-computing": 350,
});

/** The cash-out rate families were given before the rebalance, GP per $1 */
export const OLD_CASH_OUT_RATE: number = 10;

/** The id of the cash-out rate's row (no preset uses it) */
export const CASH_OUT_ROW_ID = "cash-out-rate";

export type RebalanceKind = "reward" | "power" | "rate";

export interface RebalanceRow {
  kind: RebalanceKind;
  id: string;
  name: string;
  from: number;
  to: number;
}

export interface RebalanceState {
  accessories: readonly Accessory[];
  abilities: readonly Ability[];
  cashOut: CashOutSettings;
}

/** The new prices and AP gates, read from the current presets */
const newRewardPrices = (): Map<string, number> => new Map(REAL_REWARD_PRESETS.map((preset) => [preset.id, preset.basePrice]));

const newPowerAp = (): Map<string, number> =>
  new Map(
    [...PRIVILEGE_PRESETS, ...TIME_MAGE_PRESETS, ...TECH_MAGE_PRESETS, ...REAL_LIFE_PRESETS, ...HYBRID_PRESETS].map(
      (ability) => [ability.id, ability.apRequirement.amount],
    ),
  );

const hasOwn = (map: Readonly<Record<string, number>>, id: unknown): id is string =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(map, id);

/**
 * The rows the Game Master may update: a saved preset whose value is still the old starter default and whose new
 * preset value exists and differs, plus the cash-out rate when it is still the old 10 GP per $1.
 */
export function planRebalance(state: RebalanceState): RebalanceRow[] {
  const rows: RebalanceRow[] = [];
  const rewardPrices = newRewardPrices();
  const powerAp = newPowerAp();

  for (const item of state.accessories ?? []) {
    if (!hasOwn(OLD_REWARD_PRICES, item?.id)) continue;
    const to = rewardPrices.get(item.id);
    if (to === undefined || item.basePrice !== OLD_REWARD_PRICES[item.id] || item.basePrice === to) continue;
    rows.push({ kind: "reward", id: item.id, name: item.name, from: item.basePrice, to });
  }

  for (const ability of state.abilities ?? []) {
    if (!hasOwn(OLD_POWER_AP, ability?.id)) continue;
    const from = ability.apRequirement?.amount;
    const to = powerAp.get(ability.id);
    if (to === undefined || from !== OLD_POWER_AP[ability.id] || from === to) continue;
    rows.push({ kind: "power", id: ability.id, name: ability.name, from, to });
  }

  const rate = state.cashOut?.gpPerDollar;
  if (rate === OLD_CASH_OUT_RATE && GP_PER_DOLLAR !== OLD_CASH_OUT_RATE) {
    rows.push({ kind: "rate", id: CASH_OUT_ROW_ID, name: "Cash-out rate (GP per $1)", from: rate, to: GP_PER_DOLLAR });
  }

  return rows;
}

/**
 * The state with the picked rows applied: only basePrice, apRequirement.amount and cashOut.gpPerDollar change, only on
 * rows planRebalance still offers (so applying twice is a no-op), and nothing is added or removed. The input is never
 * mutated; an untouched record keeps its identity.
 */
export function applyRebalance(state: RebalanceState, pickedIds: Iterable<string>): RebalanceState {
  const picked = new Set(pickedIds);
  const chosen = new Map<string, RebalanceRow>();
  for (const row of planRebalance(state)) {
    if (picked.has(row.id)) chosen.set(`${row.kind}:${row.id}`, row);
  }

  const accessories = state.accessories.map((item) => {
    const row = chosen.get(`reward:${item.id}`);
    return row ? { ...item, basePrice: row.to } : item;
  });

  const abilities = state.abilities.map((ability) => {
    const row = chosen.get(`power:${ability.id}`);
    return row ? { ...ability, apRequirement: { ...ability.apRequirement, amount: row.to } } : ability;
  });

  const rateRow = chosen.get(`rate:${CASH_OUT_ROW_ID}`);
  const cashOut = rateRow ? { ...state.cashOut, gpPerDollar: rateRow.to } : state.cashOut;

  return { accessories, abilities, cashOut };
}
