/**
 * The chest reveal's view of a chest: every stored item comes out with a name, an icon and a tier, and its
 * value is the token processChestItems takes back.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { getDungeonItems } from "@/lib/engine/core/items/itemRegistry";
import { asChestRoom, chestGlow, chestLoot, dungeonItemId, isTempleItem, lootFace, UNKNOWN_EGG, type PegasusEgg } from "@/lib/services/temples/ChestLoot";

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

  it("makes the Pegasus chest's prize the egg, a relic, whatever it is called", () => {
    ["Pegasus", "Pegasus Whistle", "Terra"].forEach((dungeon) => {
      const [egg] = chestLoot({ chest: "dungeon", dungeon, pegasus: true });
      expect(egg).toMatchObject({ value: dungeon, name: "A Pegasus Egg", icon: "egg", tier: "relic", checked: true });
    });
  });

  it("keeps the whistle's own face for a chest that is not the Pegasus chest", () => {
    const [whistle] = chestLoot({ chest: "dungeon", dungeon: "Pegasus Whistle" });
    expect(whistle).toMatchObject({ name: "Pegasus Whistle", icon: "whistle", tier: "relic" });
    expect(whistle.checked).toBeUndefined();
  });
});

describe("a Pegasus chest's rows", () => {
  const aura: PegasusEgg = { name: "Aura's Egg", color: "#badc58", secondaryColor: "#ffffff" };
  const pegasusChest = { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true };

  it("lists the egg of the Pegasus it frees, painted in its shell colours, relic and ticked", () => {
    const [egg] = chestLoot(pegasusChest, aura);
    expect(egg).toMatchObject({
      value: "Pegasus Whistle",
      name: "Aura's Egg",
      icon: "egg",
      tier: "relic",
      color: "#badc58",
      secondaryColor: "#ffffff",
      checked: true,
    });
    expect(egg.blurb).toBe("Aura sleeps inside. Take it to set it free.");
  });

  it("lists the Wind Whistle as a row of its own in the Wind Temple, after the egg, ticked too", () => {
    const content = asChestRoom({ type: "loot", content: pegasusChest }, "wind-temple").content;

    const loot = chestLoot(content, aura);

    expect(loot.map((item) => item.name)).toEqual(["Aura's Egg", "Wind Whistle"]);
    expect(loot[1]).toMatchObject({ value: "Wind Whistle", icon: "whistle", checked: true });
    expect(loot[1].color).toBeUndefined();
  });

  it("lists only the egg in every other temple (their whistle is the call, not a thing)", () => {
    const terra: PegasusEgg = { name: "Terra's Egg", color: "#2ed573", secondaryColor: "#2f3542" };
    const content = asChestRoom({ type: "loot", content: pegasusChest }, "earth-temple").content;

    expect(chestLoot(content, terra).map((item) => item.name)).toEqual(["Terra's Egg"]);
  });

  it("adds the whistle once, however often the room is put right, and only to a Pegasus chest", () => {
    const once = asChestRoom<Room>({ type: "loot", content: pegasusChest }, "wind-temple");
    expect(asChestRoom(once, "wind-temple")).toBe(once);
    expect(once.content?.items).toEqual(["Wind Whistle"]);

    const other = { type: "loot", content: { chest: "dungeon", dungeon: "map" } };
    expect(asChestRoom(other, "wind-temple")).toBe(other);
    const supplies = { type: "loot", content: { chest: "random", items: ["potion"] } };
    expect(asChestRoom(supplies, "wind-temple")).toBe(supplies);
  });

  it("is an egg of an unnamed Pegasus without a name to give it", () => {
    expect(chestLoot(pegasusChest)[0]).toMatchObject({ name: "A Pegasus Egg", color: "#ffd740" });
    expect(chestLoot(pegasusChest, UNKNOWN_EGG)[0].blurb).toBe("A Pegasus sleeps inside. Take it to set it free.");
  });

  it("lists the egg before the gold, and no row is ticked in a chest that is not the Pegasus chest", () => {
    expect(chestLoot({ ...pegasusChest, gold: 10 }, aura).map((item) => item.name)).toEqual(["Aura's Egg", "10 GP"]);
    expect(chestLoot({ chest: "loot", items: ["potion"], gold: 10 }).some((item) => item.checked)).toBe(false);
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

describe("the keys' icons", () => {
  it("draws the Boss Key as the skeleton key, and the small key as the plain key", () => {
    expect(lootFace("master-key").icon).toBe("key-skeleton");
    expect(chestLoot({ chest: "dungeon", dungeon: "master-key" })[0].icon).toBe("key-skeleton");
    expect(lootFace("key").icon).toBe("key");
    expect(lootFace("small-key").icon).toBe("key");
    expect(chestLoot({ chest: "dungeon", dungeon: "key" })[0].icon).toBe("key");
  });

  it("is the same in the item registry: the Boss Key is the skeleton key, the small key the plain key", () => {
    const icons = Object.fromEntries(getDungeonItems().map((item) => [item.id, item.icon]));
    expect(icons["master-key"]).toBe("key-skeleton");
    expect(icons["small-key"]).toBe("key");
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
