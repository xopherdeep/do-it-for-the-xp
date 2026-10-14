/**
 * The Game Master saves a different layout of a temple while a hero's run in it is in memory. Registering it
 * (TempleAdapter.registerTemple) puts the new rooms in the engine and TempleSystem.refreshRun keeps the run on them:
 * the hero stays where they stand if they can still stand there, else they are back at the entrance, and the rooms
 * they won, the chests they emptied and the doors they opened stay won, emptied and open.
 *
 * Only the browser's storage is faked (in memory). The adapter, the dungeon manager and the temple system are real.
 */
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { ChestSystem } from "@/lib/engine/core/dungeons/ChestSystem";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";

jest.mock("@ionic/storage", () => {
  class Storage {
    private rows = new Map<string, unknown>();
    constructor(public readonly config: unknown) {}
    async create() {
      return this;
    }
    async get(key: string) {
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.rows.set(key, value);
    }
    async remove(key: string) {
      this.rows.delete(key);
    }
    async clear() {
      this.rows.clear();
    }
    async keys() {
      return [...this.rows.keys()];
    }
  }
  return { Storage, Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" } };
});

const dungeons = DungeonManager.getInstance();
const chests = ChestSystem.getInstance();
const temples = TempleSystem.getInstance();

// The singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `refresh-temple-${++counter}`;

const SEALED = { north: true, south: true, east: true, west: true };

type Layout = { entrance: number[]; maze: unknown; rooms: Record<string, any> };

/** One floor: the entrance, a hall, a chest holding the map, a fight that seals its room on entry, a last hall */
const oneFloor = (): Layout => ({
  entrance: [0, 0],
  maze: [["ENT", "HALL", "CHEST", "FIGHT", "LAST"]],
  rooms: {
    ENT: { type: "entrance" },
    HALL: { type: "empty" },
    CHEST: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    FIGHT: { type: "monster", content: { lockOnEnter: true } },
    LAST: { type: "empty" },
  },
});

/** The layout as the Game Master edits it: a copy, changed by `change` */
const edited = (layout: Layout, change: (copy: Layout) => void): Layout => {
  const copy: Layout = JSON.parse(JSON.stringify(layout));
  change(copy);
  return copy;
};

const chestId = (templeId: string, level = "1F", row = 0, col = 2) => `${templeId}:chest:${level}:${row}:${col}`;

/** Register the layout, open the temple at its entrance and walk to `to` along the first row, winning the fight on the way */
const playTo = (id: string, layout: Layout, to: number) => {
  registerTemple(id, layout);
  temples.initTemple(id);
  for (let col = 1; col <= to; col++) {
    expect(temples.moveToPosition(id, [0, col], "east")).toBe(true);
    if (col === 2) temples.takeFromChest(id, "1F", [0, 2], ["map"]);
    if (col === 3 && to > 3) temples.markRoomCleared(id, "1F", [0, 3]);
  }
};

/** The Game Master saved `layout`: registering it replaces the layout the engine runs, and the run is kept */
const save = (id: string, layout: Layout) => {
  const before = dungeons.getDungeon(id);
  registerTemple(id, layout);
  expect(dungeons.getDungeon(id)).not.toBe(before); // it really was a different layout
};

describe("a hero's run when the Game Master saves a different layout", () => {
  it("shows the change and keeps the hero where they stand, with what they won and emptied", () => {
    const id = nextId();
    playTo(id, oneFloor(), 4);
    expect(chests.getChest(chestId(id))?.isEmpty).toBe(true);

    save(id, edited(oneFloor(), (layout) => (layout.rooms.HALL = { type: "shop" })));

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("shop"); // the edit is what plays now
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 4] });
    expect(temples.isRoomCleared(id, "1F", [0, 3])).toBe(true); // the fight stays won
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true); // the chest stays opened ...
    expect(chests.getChest(chestId(id))?.isEmpty).toBe(true); // ... and is not refilled
    expect(temples.hasVisited(id, [0, 1])).toBe(true);
    expect(dungeons.hasVisited(id, [0, 4], "1F")).toBe(true);
    expect(temples.moveToPosition(id, [0, 3], "west")).toBe(true); // the won fight does not seal again
  });

  it("puts the hero back at the entrance when the room they stand in became a wall", () => {
    const id = nextId();
    playTo(id, oneFloor(), 4);

    save(id, edited(oneFloor(), (layout) => (layout.rooms.LAST = { type: "wall" })));

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    expect(temples.getCurrentRoom(id)?.type).toBe("entrance");
    expect(temples.hasVisited(id, [0, 0])).toBe(true);
    // ... with what the hero did kept
    expect(temples.isRoomCleared(id, "1F", [0, 3])).toBe(true);
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true); // and the hero can walk on from there
  });

  it("puts the hero back at the entrance when the room is gone from a smaller grid", () => {
    const id = nextId();
    playTo(id, oneFloor(), 4);

    save(
      id,
      edited(oneFloor(), (layout) => {
        layout.maze = [["ENT", "HALL", "CHEST"]];
      })
    );

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    expect(temples.isRoomCleared(id, "1F", [0, 3])).toBe(true); // kept even though that room is gone
  });

  it("uses the new entrance when the hero has to go back to it", () => {
    const id = nextId();
    playTo(id, oneFloor(), 4);

    save(
      id,
      edited(oneFloor(), (layout) => {
        layout.rooms.LAST = { type: "wall" };
        layout.entrance = [0, 1];
      })
    );

    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 1] });
  });

  describe("on a tower", () => {
    const tower = (): Layout => ({
      entrance: [0, 0, 0],
      maze: { "1F": [["ENT", "STAIR"]], "2F": [["TOP", "ROOM"]] },
      rooms: {
        ENT: { type: "entrance" },
        STAIR: { type: "empty" },
        TOP: { type: "empty" },
        ROOM: { type: "empty" },
      },
    });

    it("keeps the hero on their floor while the room is still there", () => {
      const id = nextId();
      registerTemple(id, tower());
      temples.initTemple(id);
      expect(temples.changeLevel(id, "2F", [0, 1])).toBe(true);

      save(id, edited(tower(), (layout) => (layout.rooms.TOP = { type: "shop" })));

      expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
    });

    it("puts the hero back at the entrance of the floor the entrance names", () => {
      const id = nextId();
      registerTemple(id, tower());
      temples.initTemple(id);
      expect(temples.changeLevel(id, "2F", [0, 1])).toBe(true);

      save(
        id,
        edited(tower(), (layout) => {
          layout.rooms.ROOM = { type: "wall" };
          layout.entrance = [1, 0, 0]; // [floorIndex, row, col]: the entrance moved up to 2F
        })
      );

      expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 0] });
    });

    it("puts the hero back at the entrance when their floor is gone", () => {
      const id = nextId();
      registerTemple(id, tower());
      temples.initTemple(id);
      expect(temples.changeLevel(id, "2F", [0, 1])).toBe(true);

      save(id, { entrance: [0, 0, 0], maze: { "1F": [["ENT", "STAIR"]] }, rooms: tower().rooms });

      expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    });
  });

  it("keeps a hero in a fight they have not won held in it", () => {
    const id = nextId();
    playTo(id, oneFloor(), 3); // standing in the fight, the doors sealed
    expect(temples.getCurrentRoom(id)?.locked).toEqual(SEALED);

    save(id, edited(oneFloor(), (layout) => (layout.rooms.HALL = { type: "shop" })));

    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 3] });
    expect(temples.getCurrentRoom(id)?.locked).toEqual(SEALED);
    expect(temples.moveToPosition(id, [0, 2], "west")).toBe(false);

    // winning it opens the doors as the layout drew them
    temples.markRoomCleared(id, "1F", [0, 3]);
    expect(temples.moveToPosition(id, [0, 2], "west")).toBe(true);
  });

  it("does not hold a hero whose fight room stopped being one", () => {
    const id = nextId();
    playTo(id, oneFloor(), 3);

    save(id, edited(oneFloor(), (layout) => (layout.rooms.FIGHT = { type: "empty" })));

    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 3] });
    expect(temples.moveToPosition(id, [0, 2], "west")).toBe(true);
  });

  it("keeps the doors the hero opened open", () => {
    const id = nextId();
    const locked = edited(oneFloor(), (layout) => (layout.rooms.HALL = { type: "empty", locked: { east: true } }));
    registerTemple(id, locked);
    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    temples.addKey(id);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(false);

    save(id, edited(locked, (layout) => (layout.rooms.LAST = { type: "shop" })));

    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(false); // the new rooms drew the door locked, the hero opened it
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  });

  it("keeps the keys, the map and the compass in hand", () => {
    const id = nextId();
    playTo(id, oneFloor(), 2);
    temples.addKey(id);
    temples.grantMapAndCompass(id);

    save(id, edited(oneFloor(), (layout) => (layout.rooms.HALL = { type: "shop" })));

    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1, hasMap: true, hasCompass: true });
  });

  it("does nothing for a temple nobody is running", () => {
    const id = nextId();
    registerTemple(id, oneFloor());

    expect(() => temples.refreshRun(id)).not.toThrow();
    expect(() => temples.refreshRun("no-such-temple")).not.toThrow();
    expect(temples.getTempleState(id)).toBeUndefined();
  });
});

// A hard reload on the battle page wipes the engine; the hero wins there before the temple screen registers the temple.
// (Here, not in TempleSystemCleared.spec: that spec fakes the adapter, and the registration is what is under test.)
describe("a win reported before the temple is registered", () => {
  const HERO = "hero-1";

  /** What the hero's save says: the chest emptied, the key door opened, the fight won */
  const saveProgress = (id: string) =>
    getTempleProgressDb().saveProgress({
      userId: HERO,
      templeId: id,
      currentLevel: "1F",
      currentPosition: [0, 3],
      hasMap: true,
      hasCompass: false,
      playerKeys: 0,
      visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,3"],
      clearedRooms: [],
      hasMasterKey: false,
      openedDoors: ["1F:0,1>east"],
      openedChests: ["1F:0,2"],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
    });

  const keyDoorLayout = () => edited(oneFloor(), (layout) => (layout.rooms.HALL = { type: "empty", locked: { east: true } }));

  it("puts the saved chests and doors on the layout when it registers, so nothing refills or re-locks", async () => {
    const id = nextId();
    await saveProgress(id);
    temples.markRoomCleared(id, "1F", [0, 3], HERO); // no dungeon is registered yet: the run and the read start anyway
    await temples.whenProgressReady(id);

    registerTemple(id, keyDoorLayout());

    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true); // the chest the hero emptied stays empty ...
    expect(chests.getChest(chestId(id))?.isEmpty).toBe(true); // ... and is not refilled for a second loot
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(false); // the key door stays open, the key stays spent
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 3] }); // the hero stays in the room they won
    expect(temples.isRoomCleared(id, "1F", [0, 3])).toBe(true);
  });

  it("does the same when the save lands after the temple registered", async () => {
    const id = nextId();
    await saveProgress(id);
    temples.markRoomCleared(id, "1F", [0, 3], HERO);

    registerTemple(id, keyDoorLayout()); // the read is still on its way
    await temples.whenProgressReady(id);

    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(false);
  });

  it("leaves the layout as drawn for a hero with nothing saved", async () => {
    const id = nextId();
    temples.markRoomCleared(id, "1F", [0, 3], HERO);
    await temples.whenProgressReady(id);

    registerTemple(id, keyDoorLayout());

    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(false);
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(true);
    expect(temples.isRoomCleared(id, "1F", [0, 3])).toBe(true);
  });
});
