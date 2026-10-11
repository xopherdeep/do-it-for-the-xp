/**
 * The chest reveal's view of a chest: every stored item comes out with a name, an icon and a tier, and its
 * value is the token processChestItems takes back.
 */
import { chestGlow, chestLoot, lootFace } from "@/lib/services/temples/ChestLoot";

describe("chestLoot", () => {
  it("is empty without content", () => {
    expect(chestLoot(undefined)).toEqual([]);
    expect(chestLoot({})).toEqual([]);
  });

  it("lists the items, then the dungeon item, then the gold", () => {
    const loot = chestLoot({ chest: "dungeon", items: ["potion", "ether"], dungeon: "key", gold: 40 });
    expect(loot.map((item) => item.value)).toEqual(["potion", "ether", "key", "gold:40"]);
    expect(loot.map((item) => item.name)).toEqual(["Potion", "Ether", "Small Key", "40 GP"]);
    expect(loot.map((item) => item.tier)).toEqual(["supply", "supply", "key", "gold"]);
  });

  it("only takes the dungeon item out of a dungeon chest", () => {
    expect(chestLoot({ chest: "loot", dungeon: "map" })).toEqual([]);
  });

  it("ignores gold that is not a positive amount", () => {
    expect(chestLoot({ gold: 0 })).toEqual([]);
    expect(chestLoot({ gold: Number.NaN })).toEqual([]);
  });

  it("makes the Pegasus chest's item a relic", () => {
    const [whistle] = chestLoot({ chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true });
    expect(whistle).toMatchObject({ value: "Pegasus Whistle", name: "Pegasus Whistle", icon: "whistle", tier: "relic" });
  });
});

describe("lootFace", () => {
  it("knows the temple tools by their stored names", () => {
    expect(lootFace("master-key")).toMatchObject({ name: "Master Key", icon: "key-skeleton", tier: "key" });
    expect(lootFace("compass")).toMatchObject({ name: "Compass", tier: "key" });
  });

  it("shows anything else title-cased as a plain item", () => {
    expect(lootFace("golden feather")).toMatchObject({ name: "Golden Feather", icon: "gift", tier: "item" });
  });
});

describe("chestGlow", () => {
  it("is the most precious tier in the chest", () => {
    expect(chestGlow(chestLoot({ items: ["potion"], gold: 10 }))).toBe("gold");
    expect(chestGlow(chestLoot({ chest: "dungeon", dungeon: "Frost Wand", items: ["key"] }))).toBe("relic");
    expect(chestGlow([])).toBeNull();
  });
});
