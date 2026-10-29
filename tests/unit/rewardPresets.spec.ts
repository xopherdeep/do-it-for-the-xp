import { readFileSync } from "fs";
import { resolve } from "path";
import { AccessoryType } from "@/lib/databases/AccessoriesDb";
import { ALL_REWARD_PRESETS, BASIC_CONSUMABLE_PRESETS, REAL_REWARD_PRESETS, presetsNotIn, rewardFromPreset } from "@/lib/services/shops/rewardPresets";
import { WALLET_TIERS } from "@/lib/services/gp/wallet";
import { gpForDollars } from "@/lib/services/gp/exchangeRate";
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

  it("derives every money-valued price from its dollars", () => {
    const withDollars = REAL_REWARD_PRESETS.filter((preset) => preset.dollars !== undefined);
    expect(withDollars.length).toBe(REAL_REWARD_PRESETS.length);
    for (const preset of withDollars) expect(preset.basePrice).toBe(gpForDollars(preset.dollars as number));
  });

  it("stocks the cheap presets and no longer sells the Daddy Date", () => {
    const ids = REAL_REWARD_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual(expect.arrayContaining(["reward-sticker", "reward-sticker-sheet", "reward-candy-pouch", "reward-trading-cards"]));
    expect(ids).not.toContain("reward-daddy-date");
    expect(REAL_REWARD_PRESETS.find((preset) => preset.id === "reward-sticker")?.basePrice).toBe(75);
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

describe("preset icons", () => {
  // The app ships Font Awesome Pro 5.15.4: a Font Awesome 6 name (flask-round-potion) renders as a blank glyph
  const FA5_CSS = readFileSync(resolve(__dirname, "../../src/assets/fonts/font-awesome/css/all.css"), "utf8");
  const hasFa5Icon = (name: string) => new RegExp(`\\.fa-${name}:before`).test(FA5_CSS);

  it("gives every preset a glyph the vendored Font Awesome has", () => {
    for (const preset of ALL_REWARD_PRESETS) {
      expect({ id: preset.id, icon: preset.icon, found: hasFa5Icon(preset.icon) }).toEqual({ id: preset.id, icon: preset.icon, found: true });
    }
  });

  it("pours the Health Potion into the same duotone flask as the other potions", () => {
    const health = BASIC_CONSUMABLE_PRESETS.find((preset) => preset.id === "item-health-potion");
    expect(health?.icon).toBe("flask-potion");
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
