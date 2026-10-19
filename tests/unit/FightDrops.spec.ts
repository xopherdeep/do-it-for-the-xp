/**
 * Fight rooms can carry `content.drops`: what a beaten monster, mini-boss or boss leaves behind (a key, the map, a Bomb).
 * The grants the audit, the solver and the engine read count a drop the way they count a chest, and a Bomb found inside
 * a temple (a shop, a Bomb chest or a Bomb drop) is what the solver needs to pass a cracked wall.
 */
import { BOMB_ITEM, FIGHT_ROOM_TYPES, dropKey, roomDrops } from "@/lib/services/temples/fightDrops";
import { grantedDungeonItems, grantsBossKey, isBombSource, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { roomPositionKey } from "@/lib/engine/core/dungeons/DungeonManager";

const SMALL_KEY_DROP = { chest: "dungeon", dungeon: "small-key" };

describe("fightDrops: what a fight room leaves behind", () => {
  it("names the three fight rooms", () => {
    expect([...FIGHT_ROOM_TYPES]).toEqual(["monster", "miniboss", "boss"]);
  });

  it("only a fight room has drops: the same drops on a loot room are nothing", () => {
    expect(roomDrops({ type: "loot", content: { drops: SMALL_KEY_DROP } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
    expect(roomDrops({ type: "miniboss", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
    expect(roomDrops({ type: "boss", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
  });

  it("an empty or missing drop is no drop", () => {
    expect(roomDrops({ type: "monster" })).toBeNull();
    expect(roomDrops({ type: "monster", content: null })).toBeNull();
    expect(roomDrops({ type: "monster", content: {} })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: {} } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: { items: [], gold: 0 } } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: "small-key" } })).toBeNull();
    expect(roomDrops(null)).toBeNull();
    expect(roomDrops(undefined)).toBeNull();
  });

  it("keeps the drop whole: items and gold come through as written", () => {
    const drops = { chest: "consumable", items: ["Bomb", "Potion"], gold: 12 };
    expect(roomDrops({ type: "monster", content: { drops } })).toEqual(drops);
  });

  it("a drop is remembered under its room's key with ':drop' on the end", () => {
    expect(dropKey("1F", [2, 3])).toBe("1F:2,3:drop");
    expect(dropKey("B1", [0, 0])).toBe(`${roomPositionKey("B1", [0, 0])}:drop`);
  });

  it("the Bomb is the item called Bomb", () => {
    expect(BOMB_ITEM).toBe("Bomb");
  });
});

describe("roomGrants: a drop is granted like a chest", () => {
  it("a monster dropping a small key hands out one", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toBe(1);
  });

  it("a drop of 'key' rows counts as small keys, whatever the drop's chest is called", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: { chest: "consumable", items: ["key", "Potion", "key"] } } })).toBe(2);
  });

  it("a drop that holds another item hands out no small key", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: { chest: "dungeon", dungeon: "map" } } })).toBe(0);
  });

  it("a drop under a loot room is not played: it hands out nothing", () => {
    expect(smallKeysGranted({ type: "loot", content: { drops: SMALL_KEY_DROP } })).toBe(0);
  });

  it("a miniboss dropping the master key grants the Boss Key", () => {
    expect(grantsBossKey({ type: "miniboss", content: { drops: { chest: "dungeon", dungeon: "master-key" } } })).toBe(true);
    expect(grantsBossKey({ type: "miniboss", content: { drops: { chest: "dungeon", dungeon: "key" } } })).toBe(false);
  });

  it("a miniboss with `content.dungeon: 'master-key'` and no drops still grants nothing (a fight pays through its quest)", () => {
    expect(grantsBossKey({ type: "miniboss", content: { chest: "dungeon", dungeon: "master-key" } })).toBe(false);
    expect(smallKeysGranted({ type: "miniboss", content: { chest: "dungeon", dungeon: "key" } })).toBe(0);
  });

  it("the dungeon items a room grants are the chest's plus the drop's, by the id the take path knows", () => {
    expect(grantedDungeonItems({ type: "boss", content: { drops: { chest: "dungeon", dungeon: "map" } } })).toEqual(["map"]);
    expect(grantedDungeonItems({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toEqual(["key"]);
    expect(grantedDungeonItems({ type: "loot", content: { chest: "dungeon", dungeon: "compass" } })).toEqual(["compass"]);
    expect(grantedDungeonItems({ type: "loot", content: { chest: "dungeon", dungeon: "compass", drops: { chest: "dungeon", dungeon: "map" } } })).toEqual(["compass"]);
    expect(grantedDungeonItems({ type: "empty" })).toEqual([]);
    expect(grantedDungeonItems(undefined)).toEqual([]);
  });

  it("a fight room that drops one item and carries a chest of its own grants only the drop", () => {
    const room = { type: "miniboss", content: { chest: "dungeon", dungeon: "compass", drops: { chest: "dungeon", dungeon: "map" } } };
    expect(grantedDungeonItems(room)).toEqual(["map"]);
  });
});

describe("roomGrants: where a Bomb can be found", () => {
  it("a shop sells one", () => {
    expect(isBombSource({ type: "shop" })).toBe(true);
  });

  it("a loot chest holding a Bomb gives one", () => {
    expect(isBombSource({ type: "loot", content: { chest: "consumable", items: [BOMB_ITEM] } })).toBe(true);
    expect(isBombSource({ type: "loot", content: { chest: "consumable", items: ["Potion"] } })).toBe(false);
  });

  it("a fight room dropping a Bomb gives one", () => {
    expect(isBombSource({ type: "monster", content: { drops: { chest: "consumable", items: [BOMB_ITEM] } } })).toBe(true);
    expect(isBombSource({ type: "boss", content: { drops: { chest: "consumable", items: ["Potion"] } } })).toBe(false);
  });

  it("a Bomb written into a room that never hands it out is nothing", () => {
    expect(isBombSource({ type: "monster", content: { items: [BOMB_ITEM] } })).toBe(false);
    expect(isBombSource({ type: "empty", content: { items: [BOMB_ITEM] } })).toBe(false);
    expect(isBombSource({ type: "loot", content: { drops: { items: [BOMB_ITEM] } } })).toBe(false);
  });

  it("an empty room, no room and no content are no source", () => {
    expect(isBombSource({ type: "empty" })).toBe(false);
    expect(isBombSource({ type: "loot", content: null })).toBe(false);
    expect(isBombSource(null)).toBe(false);
    expect(isBombSource(undefined)).toBe(false);
  });
});
