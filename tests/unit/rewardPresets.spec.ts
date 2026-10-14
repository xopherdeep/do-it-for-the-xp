import { AccessoryType } from "@/lib/databases/AccessoriesDb";
import { ALL_REWARD_PRESETS, BASIC_CONSUMABLE_PRESETS, REAL_REWARD_PRESETS, presetsNotIn, rewardFromPreset } from "@/lib/services/shops/rewardPresets";
import { WALLET_TIERS } from "@/lib/services/gp/wallet";
import { REAL_LIFE_PRESETS } from "@/lib/services/abilities/AbilityPresets";

describe("real-life reward presets", () => {
  it("gives every preset its own id", () => {
    const ids = REAL_REWARD_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices every reward in whole GP that some wallet can hold", () => {
    const biggestWallet = Math.max(...WALLET_TIERS.map((tier) => tier.limit));
    for (const preset of REAL_REWARD_PRESETS) {
      expect(Number.isInteger(preset.basePrice)).toBe(true);
      expect(preset.basePrice).toBeGreaterThan(0);
      expect(preset.basePrice).toBeLessThanOrEqual(biggestWallet);
    }
  });

  it("keeps at least one reward within a new hero's first wallet", () => {
    const firstWallet = WALLET_TIERS[0].limit;
    expect(REAL_REWARD_PRESETS.some((preset) => preset.basePrice <= firstWallet)).toBe(true);
  });

  it("turns a preset into a real-life item a hero can buy without a second approval", () => {
    const item = rewardFromPreset(REAL_REWARD_PRESETS[0]);
    expect(item).toMatchObject({
      id: REAL_REWARD_PRESETS[0].id,
      name: REAL_REWARD_PRESETS[0].name,
      basePrice: REAL_REWARD_PRESETS[0].basePrice,
      type: AccessoryType.RealLife,
      requiresApproval: false,
    });
  });

  it("lists only the presets the catalogue does not hold yet", () => {
    const [first, second] = REAL_REWARD_PRESETS;
    const left = presetsNotIn([{ id: first.id }, { id: "something-else" }]);
    expect(left.map((preset) => preset.id)).not.toContain(first.id);
    expect(left.map((preset) => preset.id)).toContain(second.id);
    // The catalogue's presets are the in-game consumables and the real-life rewards together
    expect(ALL_REWARD_PRESETS).toHaveLength(BASIC_CONSUMABLE_PRESETS.length + REAL_REWARD_PRESETS.length);
    expect(presetsNotIn([])).toHaveLength(ALL_REWARD_PRESETS.length);
  });
});

describe("real-life Power presets are privileges, not purchases", () => {
  // Things that cost the family money belong in a shop (rewardPresets), never in a Power
  const MONEY_WORDS = /restaurant|ticket|theater|theatre|buy|purchase|toy|treat|candy|ice cream|\$|dollar|money|allowance/i;

  it("never describes something bought with money", () => {
    for (const preset of REAL_LIFE_PRESETS) {
      expect(`${preset.name} ${preset.description}`).not.toMatch(MONEY_WORDS);
    }
  });

  it("only requires presets that exist", () => {
    const ids = new Set(REAL_LIFE_PRESETS.map((preset) => preset.id));
    for (const preset of REAL_LIFE_PRESETS) {
      for (const needed of preset.prerequisites) expect(ids.has(needed)).toBe(true);
    }
  });

  it("shares no name with a shop reward", () => {
    const rewardNames = new Set(REAL_REWARD_PRESETS.map((preset) => preset.name));
    for (const preset of REAL_LIFE_PRESETS) expect(rewardNames.has(preset.name)).toBe(false);
  });
});
