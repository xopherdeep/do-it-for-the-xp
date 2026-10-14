/**
 * Characterization of the room-record rules the room editor page uses (hooks/grid/roomContent): tidying a stored room
 * before it is edited, where each room type sends the type picker, the content a chosen chest, consumable or travel
 * room starts with, the record a room becomes when its type changes and the chest a Quick Edit loot pick writes.
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import {
  adoptSharedRecord,
  applyChestType,
  contentAfterTypeChange,
  ensureContent,
  pickChestItem,
  prepareRoomForEditing,
  retypeRoom,
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

  it("trusts the sides over the locked flags when a room has both, and removes the flags", () => {
    // The wind temple's m0504: a small lock on the north side, written twice
    const room: Room = { type: "miniboss", sides: { ...doors(), north: "locked" }, locked: { north: true } };
    prepareRoomForEditing(room);
    expect(room.sides).toEqual({ ...doors(), north: "locked" });
    expect(room.locked).toBeUndefined();
  });

  it("does not bring a door the Game Master opened back: sides that say door beat a stale locked flag", () => {
    const room: Room = { type: "miniboss", sides: doors(), locked: { north: true, east: true } };
    prepareRoomForEditing(room);
    expect(room.sides).toEqual(doors());
    expect(room.locked).toBeUndefined();
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
  // Changed with #1360: a new travel room was seeded with its own floor and cell 0,0. Stairs read that as "blocked by
  // rubble" (a stairway to the floor you stand on), and cell 0,0 beat the paired stairs for the landing. With no target
  // the engine climbs to the neighbouring floor and lands on the paired stairs.
  it("gives a new travel room no target: the engine's neighbour floor and paired landing are the defaults", () => {
    const content: RoomContent = {};
    seedTravelTargets(content, "stairs-up", "2F");
    expect(content).toEqual({});
  });

  it("covers every travel type", () => {
    for (const type of ["stairs-up", "stairs-down", "pit", "void", "teleport"]) {
      const content: RoomContent = {};
      seedTravelTargets(content, type, "1F");
      expect(content.targetLevel).toBeUndefined();
      expect(content.targetCoords).toBeUndefined();
    }
  });

  it("keeps a target the room already has", () => {
    const content: RoomContent = { targetLevel: "B1", targetCoords: { x: 3, y: 4 } };
    seedTravelTargets(content, "pit", "1F");
    expect(content).toEqual({ targetLevel: "B1", targetCoords: { x: 3, y: 4 } });
  });

  it("clears the old seed of a stairs room: its own floor and cell 0,0 are rubble", () => {
    for (const type of ["stairs-up", "stairs-down"]) {
      const content: RoomContent = { targetLevel: "1F", targetCoords: { x: 0, y: 0 } };
      seedTravelTargets(content, type, "1F");
      expect(content).toEqual({});
    }
  });

  it("keeps the cell a Game Master picked when it clears the own-floor target of a stairs room", () => {
    const content: RoomContent = { targetLevel: "1F", targetCoords: { x: 2, y: 1 } };
    seedTravelTargets(content, "stairs-up", "1F");
    expect(content).toEqual({ targetCoords: { x: 2, y: 1 } });
  });

  it("leaves another floor's target on a stairs room alone, zeros included: the Game Master picked the floor", () => {
    const content: RoomContent = { targetLevel: "2F", targetCoords: { x: 0, y: 0 } };
    seedTravelTargets(content, "stairs-up", "1F");
    expect(content).toEqual({ targetLevel: "2F", targetCoords: { x: 0, y: 0 } });
  });

  it("leaves a teleport circle's own-floor target alone: a circle may lead to another circle on its floor", () => {
    const content: RoomContent = { targetLevel: "1F", targetCoords: { x: 2, y: 2 } };
    seedTravelTargets(content, "teleport", "1F");
    expect(content).toEqual({ targetLevel: "1F", targetCoords: { x: 2, y: 2 } });
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

describe("contentAfterTypeChange", () => {
  const sealedBoss: RoomContent = { name: "Attic", beasts: ["b1"], xp: 800, gp: 80, ap: 8, lockOnEnter: true };

  it("never carries a seal to a room that does not fight: a boss turned into a chest, a heal or an empty room", () => {
    ["loot", "health", "empty", "shop", "stairs-up"].forEach((type) => {
      const next = contentAfterTypeChange("boss", type, sealedBoss);
      expect(next).not.toHaveProperty("lockOnEnter");
      expect(next).not.toHaveProperty("beasts");
      expect(next).not.toHaveProperty("xp");
    });
    expect(contentAfterTypeChange("miniboss", "loot", { lockOnEnter: true })).toEqual({});
  });

  it("never carries a chest to a room that is not a chest, the Boss Key a miniboss would hold above all", () => {
    const chest: RoomContent = { chest: "dungeon", dungeon: "master-key", gold: 50, items: ["potion"], isMimic: true, mimicType: "random" };
    ["monster", "miniboss", "boss", "empty", "master", "stairs-down"].forEach((type) => {
      const next = contentAfterTypeChange("loot", type, chest);
      ["chest", "dungeon", "gold", "items", "isMimic", "mimicType"].forEach((key) => expect(next).not.toHaveProperty(key));
    });
  });

  it("keeps the name of the room whatever the type becomes", () => {
    ["loot", "boss", "empty", "master", "shop"].forEach((type) => {
      expect(contentAfterTypeChange("monster", type, { name: "Kitchen", beasts: ["b1"] }).name).toBe("Kitchen");
    });
  });

  it("starts the wall and the entrance empty: they are shared tokens that hold nothing of their own", () => {
    expect(contentAfterTypeChange("monster", "wall", { name: "Kitchen", beasts: ["b1"], lockOnEnter: true })).toEqual({});
    expect(contentAfterTypeChange("loot", "entrance", { name: "Vault", chest: "dungeon" })).toEqual({});
  });

  it("keeps the fight between combat rooms: beasts, rewards, the seal and the shipped quest", () => {
    const quest = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    const monster: RoomContent = { beasts: ["b1"], xp: 100, gp: 10, ap: 1, difficulty: "hard", lockOnEnter: true, quest, questId: "q1" };
    expect(contentAfterTypeChange("monster", "miniboss", monster)).toEqual(monster);
    expect(contentAfterTypeChange("miniboss", "monster", monster)).toEqual(monster);
  });

  it("seals a boss and lets go of the seal when the room stops being one: the boss template put it there, not the Game Master", () => {
    expect(contentAfterTypeChange("monster", "boss", { beasts: ["b1"], lockOnEnter: false }).lockOnEnter).toBe(true);
    expect(contentAfterTypeChange("empty", "boss", {}).lockOnEnter).toBe(true);
    expect(contentAfterTypeChange("boss", "monster", sealedBoss)).toEqual({ name: "Attic", beasts: ["b1"], xp: 800, gp: 80, ap: 8 });
    expect(contentAfterTypeChange("miniboss", "monster", { lockOnEnter: true }).lockOnEnter).toBe(true);
  });

  it("brings the beasts of a room that had none into a combat room, and only into one", () => {
    expect(contentAfterTypeChange("empty", "monster", { beasts: [] })).toEqual({ beasts: [] });
    expect(contentAfterTypeChange("empty", "loot", { beasts: [] })).toEqual({});
  });

  it("keeps the Pegasus pick between the egg rooms and nowhere else", () => {
    expect(contentAfterTypeChange("dragon-egg", "master", { dungeon: "Rainbow" })).toEqual({ dungeon: "Rainbow" });
    expect(contentAfterTypeChange("master", "loot", { dungeon: "Rainbow" })).toEqual({});
    expect(contentAfterTypeChange("loot", "master", { chest: "dungeon", dungeon: "master-key" })).toEqual({});
  });

  it("drops travel targets, shop and heal settings: the new type starts from its own template", () => {
    expect(contentAfterTypeChange("stairs-up", "stairs-down", { targetLevel: "2F", targetCoords: { x: 1, y: 1 } })).toEqual({});
    expect(contentAfterTypeChange("shop", "empty", { shopId: "s1", healthPoints: 5 })).toEqual({});
  });

  it("leaves the content as it is when the type does not change, and never hands back the object it was given", () => {
    const content: RoomContent = { beasts: ["b1"], lockOnEnter: true, chest: "dungeon", dungeon: "master-key" };
    const same = contentAfterTypeChange("miniboss", "miniboss", content);
    expect(same).toEqual(content);
    expect(same).not.toBe(content);
    expect(contentAfterTypeChange("monster", "miniboss", content).beasts).not.toBe(content.beasts);
  });

  it("reads a room with no content as an empty one", () => {
    expect(contentAfterTypeChange("empty", "loot", undefined)).toEqual({});
    expect(contentAfterTypeChange("empty", "boss", undefined)).toEqual({ lockOnEnter: true });
  });
});

describe("retypeRoom", () => {
  it("sets the type, rebuilds the content and leaves the sides, the coordinates and every other field of the room", () => {
    const sides = { north: "locked", east: "door", south: "bombable", west: "door" };
    const room: Room = {
      type: "boss",
      sides,
      coords: { x: 1, y: 2 },
      visited: true,
      content: { name: "Attic", lockOnEnter: true, beasts: ["b1"] },
    };
    retypeRoom(room, "loot");
    expect(room.type).toBe("loot");
    expect(room.content).toEqual({ name: "Attic" });
    expect(room.sides).toBe(sides);
    expect(room.coords).toEqual({ x: 1, y: 2 });
    expect(room.visited).toBe(true);
  });

  it("does nothing to a room whose type does not change", () => {
    const content: RoomContent = { lockOnEnter: true, chest: "dungeon", dungeon: "master-key" };
    const room: Room = { type: "miniboss", content };
    retypeRoom(room, "miniboss");
    expect(room.content).toBe(content);
    expect(room.content).toEqual({ lockOnEnter: true, chest: "dungeon", dungeon: "master-key" });
  });

  it("gives a room with no content the new type's template", () => {
    const room: Room = { type: "empty" };
    retypeRoom(room, "boss");
    expect(room).toEqual({ type: "boss", content: { lockOnEnter: true } });
  });
});

describe("adoptSharedRecord", () => {
  it("hands back a copy of the shared record that keeps this cell's own doors and name", () => {
    const shared: Room = { type: "boss", content: { lockOnEnter: true, beasts: ["b9"] } };
    const mine: Room = {
      type: "loot",
      sides: { north: "locked", east: "door", south: "door", west: "door" },
      content: { name: "Attic" },
    };
    const adopted = adoptSharedRecord(shared, mine);
    expect(adopted).toEqual({
      type: "boss",
      sides: { north: "locked", east: "door", south: "door", west: "door" },
      content: { lockOnEnter: true, beasts: ["b9"], name: "Attic" },
    });
    expect(adopted.content?.beasts).not.toBe(shared.content?.beasts);
    expect(shared.content).not.toHaveProperty("name");
    expect(shared).not.toHaveProperty("sides");
  });

  it("lets the cell's name win over the shared record's, and falls back on the record's doors when the cell has none", () => {
    const shared: Room = { type: "monster", sides: { north: "wall" }, content: { name: "Pantry" } };
    expect(adoptSharedRecord(shared, { type: "empty", content: { name: "Attic" } }).content?.name).toBe("Attic");
    const nameless = adoptSharedRecord(shared, { type: "empty" });
    expect(nameless.content?.name).toBe("Pantry");
    expect(nameless.sides).toEqual({ north: "wall" });
  });
});

describe("pickChestItem", () => {
  it("makes the chest hold the dungeon item the editor, the audit and the chest reveal read", () => {
    expect(pickChestItem({}, "master-key")).toEqual({ chest: "dungeon", dungeon: "master-key" });
    expect(pickChestItem(undefined, "compass")).toEqual({ chest: "dungeon", dungeon: "compass" });
  });

  it("merges into what the chest already holds instead of replacing it, and drops the old `item` nothing read", () => {
    const held: RoomContent = { name: "Vault", isMimic: true, mimicType: "random", gold: 50, item: "master-key" };
    const next = pickChestItem(held, "dungeon-map");
    expect(next).toEqual({ name: "Vault", isMimic: true, mimicType: "random", gold: 50, chest: "dungeon", dungeon: "dungeon-map" });
    expect(next).not.toHaveProperty("item");
    expect(held.item).toBe("master-key");
  });

  it("replaces the item a dungeon chest held", () => {
    expect(pickChestItem({ chest: "dungeon", dungeon: "small-key" }, "master-key")).toEqual({ chest: "dungeon", dungeon: "master-key" });
  });

  it("takes the dungeon item off the chest for Empty, and keeps the rest of it", () => {
    expect(pickChestItem({ name: "Vault", chest: "dungeon", dungeon: "master-key" }, null)).toEqual({ name: "Vault" });
    expect(pickChestItem({ chest: "gold", gold: 50 }, null)).toEqual({ chest: "gold", gold: 50 });
  });
});
