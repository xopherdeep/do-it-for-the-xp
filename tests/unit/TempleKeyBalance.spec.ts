/**
 * The temple page's key balance (useTempleData keyBalance = totalKeys - actualLocks) counts the small keys the way play
 * hands them out: roomGrants.smallKeysGranted, so a Key room and a loot room's "key" item rows count as well as a
 * Dungeon Item chest. The first spec in countKeysAndLocks' own describe (TempleDataModules.spec.ts) stays as it is.
 */
import { countKeysAndLocks } from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/dungeonCounts";

describe("countKeysAndLocks: where the small keys come from", () => {
  it("counts a Dungeon Item chest, under the editor's 'small-key' spelling too", () => {
    const rooms = {
      a: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
      b: { type: "loot", content: { chest: "dungeon", dungeon: "small-key" } },
    };
    expect(countKeysAndLocks(rooms).totalKeys).toBe(2);
  });

  it("counts a Key room (the editor's Key tile) as one small key", () => {
    const rooms = { a: { type: "key", content: {} }, b: { type: "key", content: { keyId: "key" } } };
    expect(countKeysAndLocks(rooms).totalKeys).toBe(2);
  });

  it("counts a master Key room (the Boss Key) as none", () => {
    expect(countKeysAndLocks({ a: { type: "key", content: { keyId: "master" } } }).totalKeys).toBe(0);
  });

  it("counts each 'key' row in a loot room's items, whatever the chest is called", () => {
    const rooms = {
      a: { type: "loot", content: { items: ["key", "key"] } },
      b: { type: "loot", content: { chest: "wood", items: ["potion", "key"] } },
    };
    expect(countKeysAndLocks(rooms).totalKeys).toBe(3);
  });

  it("counts a key chest and its 'key' rows together, as play gives out both", () => {
    const rooms = { a: { type: "loot", content: { chest: "dungeon", dungeon: "key", items: ["key"] } } };
    expect(countKeysAndLocks(rooms).totalKeys).toBe(2);
  });

  it("counts none from a key written into a room that never hands it out", () => {
    const rooms = {
      a: { type: "loot", content: { chest: "wood", dungeon: "key" } },
      b: { type: "miniboss", content: { dungeon: "key", items: ["key"] } },
      c: { type: "chest", content: { dungeon: "key" } },
    };
    expect(countKeysAndLocks(rooms).totalKeys).toBe(0);
  });

  it("balances a temple whose keys come from Key rooms against its locked doors", () => {
    const rooms = {
      k1: { type: "key", content: {} },
      k2: { type: "key", content: {} },
      d1: { type: "empty", sides: { east: "locked" } },
      d2: { type: "empty", sides: { west: "locked" } },
      d3: { type: "empty", sides: { south: "locked" } },
      d4: { type: "empty", sides: { north: "locked" } },
    };
    const { totalKeys, actualLocks } = countKeysAndLocks(rooms);
    expect(totalKeys - actualLocks).toBe(0);
  });

  it("counts a locked flight of stairs as one small lock (its landing, which climbs back freely, as none)", () => {
    const rooms = {
      k1: { type: "key", content: {} },
      up: { type: "stairs-up", content: { locked: "small" } },
      down: { type: "stairs-down", content: {} },
    };
    expect(countKeysAndLocks(rooms)).toEqual({ totalKeys: 1, actualLocks: 1 });
  });

  it("counts a Boss Key climb as no small lock: the Boss Key is not one of the small keys", () => {
    expect(countKeysAndLocks({ up: { type: "stairs-up", content: { locked: "master" } } }).actualLocks).toBe(0);
  });

  it("adds the stairs' lock to the locked doors, which are still counted once per edge", () => {
    const rooms = {
      a: { type: "empty", sides: { east: "locked" } },
      b: { type: "empty", sides: { west: "locked" } },
      up: { type: "stairs-up", content: { locked: "small" } },
    };
    expect(countKeysAndLocks(rooms).actualLocks).toBe(2);
  });
});
