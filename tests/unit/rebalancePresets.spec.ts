import {
  applyRebalance,
  CASH_OUT_ROW_ID,
  OLD_CASH_OUT_RATE,
  OLD_POWER_AP,
  OLD_REWARD_PRICES,
  planRebalance,
  type RebalanceState,
} from "@/lib/services/economy/rebalancePresets";
import { REAL_REWARD_PRESETS, rewardFromPreset } from "@/lib/services/shops/rewardPresets";
import { REAL_LIFE_PRESETS, TIME_MAGE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { PRIVILEGE_PRESETS } from "@/lib/services/abilities/privilegePresets";
import { GP_PER_DOLLAR } from "@/lib/services/gp/exchangeRate";
import { AccessoryType, Rarity, type Accessory } from "@/lib/databases/AccessoriesDb";
import type { Ability } from "@/hooks/abilities/abilityConstants";

const preset = (id: string) => {
  const found = REAL_REWARD_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`no reward preset ${id}`);
  return found;
};

/** A reward as an old family saved it: the preset at its old starter price */
const oldReward = (id: string, price = OLD_REWARD_PRICES[id]): Accessory => ({ ...rewardFromPreset(preset(id)), basePrice: price });

const powerPreset = (id: string): Ability => {
  const found = [...PRIVILEGE_PRESETS, ...TIME_MAGE_PRESETS, ...REAL_LIFE_PRESETS].find((p) => p.id === id);
  if (!found) throw new Error(`no power preset ${id}`);
  return found;
};

/** A Power as an old family saved it: the preset at its old AP gate */
const oldPower = (id: string, amount = OLD_POWER_AP[id]): Ability => {
  const p = powerPreset(id);
  return { ...p, apRequirement: { ...p.apRequirement, amount } };
};

const daddyDate: Accessory = {
  id: "reward-daddy-date",
  name: "Daddy Date",
  description: "One-on-one time with Dad.",
  basePrice: 200,
  url: "",
  rarity: Rarity.Rare,
  icon: "user-friends",
  rewardCount: 0,
  isLayaway: false,
  type: AccessoryType.RealLife,
  availableToMembers: [],
  requiresApproval: false,
  tags: ["real-life", "preset"],
};

const world = (overrides: Partial<RebalanceState> = {}): RebalanceState => ({
  accessories: [oldReward("reward-frost-treat"), oldReward("reward-new-bike"), daddyDate],
  abilities: [oldPower("irl-timed-game-on"), oldPower("time-mage-haste"), oldPower("irl-yes-day")],
  cashOut: { enabled: true, gpPerDollar: OLD_CASH_OUT_RATE, heroIds: [] },
  ...overrides,
});

const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("planRebalance", () => {
  it("offers old starter prices and AP gates at their new values", () => {
    const rows = planRebalance(world());
    expect(rows).toEqual(
      expect.arrayContaining([
        { kind: "reward", id: "reward-frost-treat", name: "Frost Treat", from: 60, to: preset("reward-frost-treat").basePrice },
        { kind: "reward", id: "reward-new-bike", name: preset("reward-new-bike").name, from: 1000, to: 15000 },
        { kind: "power", id: "irl-timed-game-on", name: "Game On", from: 30, to: powerPreset("irl-timed-game-on").apRequirement.amount },
        { kind: "power", id: "time-mage-haste", name: powerPreset("time-mage-haste").name, from: 100, to: 10 },
        { kind: "rate", id: CASH_OUT_ROW_ID, name: expect.any(String), from: 10, to: GP_PER_DOLLAR },
      ]),
    );
    expect(preset("reward-frost-treat").basePrice).toBe(400);
  });

  it("never offers a price or AP gate the GM edited", () => {
    const rows = planRebalance(
      world({
        accessories: [oldReward("reward-frost-treat", 75)],
        abilities: [oldPower("irl-timed-game-on", 35)],
        cashOut: { enabled: true, gpPerDollar: 25, heroIds: [] },
      }),
    );
    expect(rows).toEqual([]);
  });

  it("ignores ids that are not old presets", () => {
    const custom: Accessory = { ...oldReward("reward-frost-treat"), id: "my-own-frost", basePrice: 60 };
    const customPower: Ability = { ...oldPower("irl-timed-game-on"), id: "my-own-power" };
    const potion: Accessory = { ...oldReward("reward-frost-treat"), id: "item-health-potion", basePrice: 50 };
    const rows = planRebalance(
      world({ accessories: [custom, potion], abilities: [customPower], cashOut: { enabled: false, gpPerDollar: 100, heroIds: [] } }),
    );
    expect(rows).toEqual([]);
  });

  it("offers the rate row only at 10, and offers 100", () => {
    const at10 = planRebalance(world({ accessories: [], abilities: [] }));
    expect(at10).toEqual([{ kind: "rate", id: CASH_OUT_ROW_ID, name: expect.any(String), from: 10, to: 100 }]);
    for (const rate of [5, 20, 25, 50, 100]) {
      expect(planRebalance(world({ accessories: [], abilities: [], cashOut: { enabled: true, gpPerDollar: rate, heroIds: [] } }))).toEqual([]);
    }
  });

  it("never offers a saved Daddy Date shop item", () => {
    const rows = planRebalance(world({ accessories: [daddyDate], abilities: [] }));
    expect(rows.find((row) => row.id === "reward-daddy-date")).toBeUndefined();
  });

  it("does not mutate its input", () => {
    const state = world();
    const before = deepCopy(state);
    planRebalance(state);
    expect(state).toEqual(before);
  });
});

describe("applyRebalance", () => {
  const allIds = (state: RebalanceState) => planRebalance(state).map((row) => row.id);

  it("changes only the picked rows' values and never mutates the input", () => {
    const state = world();
    const before = deepCopy(state);
    const next = applyRebalance(state, ["reward-frost-treat", "irl-timed-game-on", CASH_OUT_ROW_ID]);

    expect(state).toEqual(before);
    expect(next.accessories.find((a) => a.id === "reward-frost-treat")?.basePrice).toBe(400);
    expect(next.abilities.find((a) => a.id === "irl-timed-game-on")?.apRequirement.amount).toBe(
      powerPreset("irl-timed-game-on").apRequirement.amount,
    );
    expect(next.cashOut).toEqual({ ...state.cashOut, gpPerDollar: 100 });
    // Only the value moved: every other field is as saved
    const frost = next.accessories.find((a) => a.id === "reward-frost-treat");
    expect({ ...frost, basePrice: 60 }).toEqual(state.accessories[0]);
  });

  it("leaves an unpicked row untouched", () => {
    const state = world();
    const next = applyRebalance(state, ["reward-frost-treat"]);
    expect(next.accessories.find((a) => a.id === "reward-new-bike")).toBe(state.accessories[1]);
    expect(next.abilities).toEqual(state.abilities);
    expect(next.abilities[0]).toBe(state.abilities[0]);
    expect(next.cashOut).toBe(state.cashOut);
  });

  it("removes nothing", () => {
    const state = world();
    const next = applyRebalance(state, allIds(state));
    expect(next.accessories.map((a) => a.id)).toEqual(state.accessories.map((a) => a.id));
    expect(next.abilities.map((a) => a.id)).toEqual(state.abilities.map((a) => a.id));
  });

  it("is a no-op when applied twice", () => {
    const state = world();
    const once = applyRebalance(state, allIds(state));
    expect(planRebalance(once)).toEqual([]);
    const twice = applyRebalance(once, allIds(state));
    expect(twice).toEqual(once);
  });

  it("never changes or removes a saved Daddy Date shop item", () => {
    const state = world();
    const next = applyRebalance(state, [...allIds(state), "reward-daddy-date"]);
    const saved = next.accessories.find((a) => a.id === "reward-daddy-date");
    expect(saved).toBe(daddyDate);
    expect(saved?.basePrice).toBe(200);
  });

  it("ignores a picked id with an edited value", () => {
    const state = world({ accessories: [oldReward("reward-frost-treat", 75)] });
    const next = applyRebalance(state, ["reward-frost-treat"]);
    expect(next.accessories[0].basePrice).toBe(75);
  });
});
