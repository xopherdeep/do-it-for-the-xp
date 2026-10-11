/**
 * The chest reveal's view of a chest: every stored item comes out with a name, an icon and a tier, and its
 * value is the token processChestItems takes back.
 */
import { asChestRoom, chestGlow, chestLoot, dungeonItemId, isTempleItem, lootFace } from "@/lib/services/temples/ChestLoot";

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
    // The key that opens the boss door is the Boss Key to the player; its id stays master-key
    expect(lootFace("master-key")).toMatchObject({ name: "Boss Key", icon: "key-skeleton", tier: "key" });
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

describe("the Boss Key chest", () => {
  it("shows a key, in the player's words, whatever else the room remembers", () => {
    const [bossKey] = chestLoot({ chest: "dungeon", dungeon: "master-key" });
    expect(bossKey).toMatchObject({ value: "master-key", name: "Boss Key", icon: "key-skeleton", tier: "key" });
    expect(bossKey.blurb).toMatch(/boss/i);
    expect(bossKey.blurb).not.toMatch(/master/i);
  });

  it("knows the Temple Creator's own ids for the small key and the map", () => {
    expect(lootFace("small-key")).toMatchObject({ name: "Small Key", tier: "key" });
    expect(lootFace("dungeon-map")).toMatchObject({ name: "Dungeon Map", tier: "key" });
  });
});

describe("dungeon item ids", () => {
  it("turns the editor's ids into the ones the take path knows", () => {
    expect(dungeonItemId("small-key")).toBe("key");
    expect(dungeonItemId("dungeon-map")).toBe("map");
    expect(dungeonItemId("master-key")).toBe("master-key");
    expect(dungeonItemId("compass")).toBe("compass");
    expect(dungeonItemId("Pegasus Whistle")).toBe("Pegasus Whistle");
  });

  it("tells the temple's own items from a Pegasus's prize", () => {
    ["key", "small-key", "master-key", "map", "dungeon-map", "compass"].forEach((id) => expect(isTempleItem(id)).toBe(true));
    ["Pegasus", "Pegasus Whistle", "Terra", "wind-whistle", "", undefined].forEach((id) => expect(isTempleItem(id)).toBe(false));
  });
});

describe("asChestRoom", () => {
  it("makes the editor's small key and map the ids the temples use", () => {
    expect(asChestRoom({ type: "loot", content: { chest: "dungeon", dungeon: "small-key" } }).content?.dungeon).toBe("key");
    expect(asChestRoom({ type: "loot", content: { chest: "dungeon", dungeon: "dungeon-map" } }).content?.dungeon).toBe("map");
  });

  it("leaves a Boss Key chest as it is", () => {
    const room = { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } };
    expect(asChestRoom(room)).toBe(room);
  });

  it("drops the Pegasus flag a room carried over from the Pegasus chest it was edited from", () => {
    const edited = { type: "loot", content: { chest: "dungeon", dungeon: "master-key", pegasus: true } };
    const room = asChestRoom(edited);
    expect(room.content).toEqual({ chest: "dungeon", dungeon: "master-key" });
    // ... and the room it was given is not touched
    expect(edited.content.pegasus).toBe(true);
  });

  it("keeps the Pegasus flag on a chest whose prize really is a Pegasus's", () => {
    const whistle = { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } };
    expect(asChestRoom(whistle)).toBe(whistle);
  });

  it("gives a Master Room that still holds a key from its earlier life the temple's own Pegasus", () => {
    expect(asChestRoom({ type: "master", content: { dungeon: "master-key" } }).content).toEqual({ chest: "dungeon", dungeon: "Pegasus", pegasus: true });
  });

  it("changes nothing in other chests and rooms, and nothing when run twice", () => {
    const supplies = { type: "loot", content: { chest: "random", items: ["potion"] } };
    expect(asChestRoom(supplies)).toBe(supplies);
    const boss = { type: "boss" };
    expect(asChestRoom(boss)).toBe(boss);
    const once = asChestRoom({ type: "loot", content: { chest: "dungeon", dungeon: "small-key", pegasus: true } });
    expect(asChestRoom(once)).toBe(once);
  });
});
