/**
 * Characterization of the room-record rules the room editor page uses (hooks/grid/roomContent): tidying a stored room
 * before it is edited, where each room type sends the type picker, and the content a chosen chest, consumable or
 * travel room starts with.
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import {
  applyChestType,
  ensureContent,
  prepareRoomForEditing,
  seedTravelTargets,
  stepForRoomType,
  toggleConsumableItem,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/roomContent";

const doors = () => ({ north: "door", east: "door", south: "door", west: "door" });

describe("ensureContent", () => {
  it("creates empty content on a room that has none and returns it", () => {
    const room: Room = { type: "empty" };
    const content = ensureContent(room);
    expect(content).toEqual({});
    expect(room.content).toBe(content);
  });

  it("returns the content a room already has", () => {
    const content: RoomContent = { gold: 5 };
    const room: Room = { type: "loot", content };
    expect(ensureContent(room)).toBe(content);
  });
});

describe("prepareRoomForEditing", () => {
  it("gives a bare room empty content with no beasts and plain doors", () => {
    const room: Room = { type: "monster" };
    prepareRoomForEditing(room);
    expect(room).toEqual({ type: "monster", content: { beasts: [] }, sides: doors() });
  });

  it("keeps the beasts, sides and content a room already has", () => {
    const sides = { ...doors(), north: "locked" };
    const room: Room = { type: "monster", content: { beasts: ["b1"], difficulty: "hard" }, sides };
    prepareRoomForEditing(room);
    expect(room.content).toEqual({ beasts: ["b1"], difficulty: "hard" });
    expect(room.sides).toBe(sides);
  });

  it("moves legacy top-level fields into content and removes them from the room", () => {
    const room: Room = {
      type: "loot",
      selectedBeastIds: ["b1", "b2"],
      isMimic: false,
      mimicType: "pick",
      mimicBeastId: "m1",
      lockOnEnter: true,
      chestType: "gold",
    };
    prepareRoomForEditing(room);
    expect(room).toEqual({
      type: "loot",
      content: {
        beasts: ["b1", "b2"],
        isMimic: false,
        mimicType: "pick",
        mimicBeastId: "m1",
        lockOnEnter: true,
        chest: "gold",
      },
      sides: doors(),
    });
  });

  it("moves an empty list of legacy beasts but leaves an empty legacy string where it is", () => {
    const room: Room = { type: "monster", selectedBeastIds: [], mimicType: "" };
    prepareRoomForEditing(room);
    expect(room.content).toEqual({ beasts: [] });
    expect(room.selectedBeastIds).toBeUndefined();
    expect(room.mimicType).toBe("");
  });

  it("turns the older locked flags into sides and removes them", () => {
    const room: Room = { type: "monster", locked: { north: true, west: true } };
    prepareRoomForEditing(room);
    expect(room.sides).toEqual({ north: "locked", east: "door", south: "door", west: "locked" });
    expect(room.locked).toBeUndefined();
  });

  it("leaves the locked flags alone when the room already has sides", () => {
    const room: Room = { type: "monster", sides: doors(), locked: { north: true } };
    prepareRoomForEditing(room);
    expect(room.sides).toEqual(doors());
    expect(room.locked).toEqual({ north: true });
  });

  describe("a loot room's chest type", () => {
    it("is dungeon when the chest holds a dungeon item, ahead of gold and items", () => {
      const room: Room = { type: "loot", content: { dungeon: "small-key", gold: 10, items: ["potion"] } };
      prepareRoomForEditing(room);
      expect(room.content!.chest).toBe("dungeon");
    });

    it("is gold when the chest holds gold, even none, ahead of items", () => {
      const room: Room = { type: "loot", content: { gold: 0, items: ["potion"] } };
      prepareRoomForEditing(room);
      expect(room.content!.chest).toBe("gold");
    });

    it("is consumable when the chest holds items", () => {
      const room: Room = { type: "loot", content: { items: ["potion"] } };
      prepareRoomForEditing(room);
      expect(room.content!.chest).toBe("consumable");
    });

    it("is left alone when the chest holds nothing", () => {
      const room: Room = { type: "loot", content: { chest: "key-item" } };
      prepareRoomForEditing(room);
      expect(room.content!.chest).toBe("key-item");
    });

    it("is not set for a room that is not loot", () => {
      const room: Room = { type: "monster", content: { gold: 10 } };
      prepareRoomForEditing(room);
      expect(room.content!.chest).toBeUndefined();
    });
  });
});

describe("stepForRoomType", () => {
  it("sends monsters and minibosses to pick a shared config", () => {
    expect(stepForRoomType("monster")).toBe("monster-config");
    expect(stepForRoomType("miniboss")).toBe("monster-config");
  });

  it("sends a boss straight to its config", () => {
    expect(stepForRoomType("boss")).toBe("boss");
  });

  it("sends loot, shops, the Master Room and travel rooms to their config", () => {
    for (const type of ["loot", "shop", "master", "stairs-up", "stairs-down", "pit", "void", "teleport"]) {
      expect(stepForRoomType(type)).toBe("config");
    }
  });

  it("closes the picker for every other type, including the old dragon-egg name", () => {
    for (const type of ["empty", "wall", "entrance", "key", "health", "mana", "trap", "dragon-egg", ""]) {
      expect(stepForRoomType(type)).toBe("close");
    }
  });
});

describe("seedTravelTargets", () => {
  it("points a travel room at the current floor and cell 0,0", () => {
    const content: RoomContent = {};
    seedTravelTargets(content, "stairs-up", "2F");
    expect(content).toEqual({ targetLevel: "2F", targetCoords: { x: 0, y: 0 } });
  });

  it("covers every travel type", () => {
    for (const type of ["stairs-up", "stairs-down", "pit", "void", "teleport"]) {
      const content: RoomContent = {};
      seedTravelTargets(content, type, "1F");
      expect(content.targetLevel).toBe("1F");
    }
  });

  it("keeps a target the room already has", () => {
    const content: RoomContent = { targetLevel: "B1", targetCoords: { x: 3, y: 4 } };
    seedTravelTargets(content, "pit", "1F");
    expect(content).toEqual({ targetLevel: "B1", targetCoords: { x: 3, y: 4 } });
  });

  it("does nothing for a room that does not travel", () => {
    const content: RoomContent = {};
    seedTravelTargets(content, "loot", "1F");
    expect(content).toEqual({});
  });
});

describe("applyChestType", () => {
  const dungeonItems = [{ id: "small-key" }, { id: "master-key" }, { id: "dungeon-map" }];
  const keyItems = [{ id: "ocarina" }, { id: "feather" }];

  it("always records the chest type", () => {
    const content: RoomContent = {};
    applyChestType(content, "mystery", dungeonItems, keyItems);
    expect(content).toEqual({ chest: "mystery" });
  });

  it("starts a dungeon chest on the small key when its item is missing or not a dungeon item", () => {
    const missing: RoomContent = {};
    applyChestType(missing, "dungeon", dungeonItems, keyItems);
    expect(missing).toEqual({ chest: "dungeon", dungeon: "small-key" });

    const wrong: RoomContent = { dungeon: "ocarina" };
    applyChestType(wrong, "dungeon", dungeonItems, keyItems);
    expect(wrong.dungeon).toBe("small-key");
  });

  it("keeps a dungeon item that is valid", () => {
    const content: RoomContent = { dungeon: "dungeon-map" };
    applyChestType(content, "dungeon", dungeonItems, keyItems);
    expect(content.dungeon).toBe("dungeon-map");
  });

  it("starts a key-item chest on the first key item when its item is missing or not a key item", () => {
    const missing: RoomContent = {};
    applyChestType(missing, "key-item", dungeonItems, keyItems);
    expect(missing).toEqual({ chest: "key-item", dungeon: "ocarina" });

    const wrong: RoomContent = { dungeon: "small-key" };
    applyChestType(wrong, "key-item", dungeonItems, keyItems);
    expect(wrong.dungeon).toBe("ocarina");
  });

  it("keeps a key item that is valid", () => {
    const content: RoomContent = { dungeon: "feather" };
    applyChestType(content, "key-item", dungeonItems, keyItems);
    expect(content.dungeon).toBe("feather");
  });

  it("leaves the item unset for a key-item chest when there are no key items", () => {
    const content: RoomContent = {};
    applyChestType(content, "key-item", dungeonItems, []);
    expect(content.dungeon).toBeUndefined();
  });

  it("starts a gold chest at 50 GP and keeps a non-zero amount", () => {
    const fresh: RoomContent = {};
    applyChestType(fresh, "gold", dungeonItems, keyItems);
    expect(fresh.gold).toBe(50);

    const rich: RoomContent = { gold: 200 };
    applyChestType(rich, "gold", dungeonItems, keyItems);
    expect(rich.gold).toBe(200);

    const none: RoomContent = { gold: 0 };
    applyChestType(none, "gold", dungeonItems, keyItems);
    expect(none.gold).toBe(50);
  });

  it("starts a consumable chest with a potion and keeps the items it has", () => {
    const fresh: RoomContent = {};
    applyChestType(fresh, "consumable", dungeonItems, keyItems);
    expect(fresh.items).toEqual(["potion"]);

    const stocked: RoomContent = { items: ["ether"] };
    applyChestType(stocked, "consumable", dungeonItems, keyItems);
    expect(stocked.items).toEqual(["ether"]);

    const emptied: RoomContent = { items: [] };
    applyChestType(emptied, "consumable", dungeonItems, keyItems);
    expect(emptied.items).toEqual([]);
  });
});

describe("toggleConsumableItem", () => {
  it("starts the list with the item when there is none", () => {
    const content: RoomContent = {};
    toggleConsumableItem(content, "potion");
    expect(content.items).toEqual(["potion"]);
  });

  it("adds an item that is not in the list", () => {
    const content: RoomContent = { items: ["potion"] };
    toggleConsumableItem(content, "ether");
    expect(content.items).toEqual(["potion", "ether"]);
  });

  it("takes off an item that is in the list", () => {
    const content: RoomContent = { items: ["potion", "ether"] };
    toggleConsumableItem(content, "potion");
    expect(content.items).toEqual(["ether"]);
  });

  it("keeps the item when it is the only one", () => {
    const content: RoomContent = { items: ["potion"] };
    toggleConsumableItem(content, "potion");
    expect(content.items).toEqual(["potion"]);
  });

  it("treats an empty list as a list to add to", () => {
    const content: RoomContent = { items: [] };
    toggleConsumableItem(content, "elixir");
    expect(content.items).toEqual(["elixir"]);
  });
});
