/**
 * The engine plays the temple the Game Master last saved, without an app reload:
 * - startTempleSync follows every save in the TempleDb (the editor's Save) and re-registers that temple;
 * - ensureTempleFresh, awaited before a run starts, reads the temple's record and registers it;
 * - a hero's run in a temple that was changed is kept.
 *
 * Only the browser's storage is faked (in memory). TempleDb, the adapter, the dungeon manager and the temple
 * system are the real ones.
 */
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import { ChestSystem } from "@/lib/engine/core/dungeons/ChestSystem";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerAllTemples, registerCustomTemples } from "@/lib/engine/core/dungeons/TempleAdapter";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { ensureTempleFresh, startTempleSync, stopTempleSync } from "@/lib/engine/core/dungeons/templeFreshness";
import shipped from "@/lib/engine/temples";
import { metadataForAsync } from "@/lib/engine/temples/templeRegistry";

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

const HERO = "hero-1";
const dungeons = DungeonManager.getInstance();
const chests = ChestSystem.getInstance();
const temples = TempleSystem.getInstance();
const db = new TempleDb(templeStorage);

// The singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `fresh-temple-${++counter}`;

type DungeonLayout = NonNullable<TempleInterface["dungeonLayout"]>;

/** The entrance, a hall, a chest holding the map and a last hall */
const row = (): DungeonLayout => ({
  entrance: [0, 0],
  maze: [["ENT", "HALL", "CHEST", "LAST"]],
  rooms: {
    ENT: { type: "entrance" },
    HALL: { type: "empty" },
    CHEST: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    LAST: { type: "empty" },
  },
});

const edited = (layout: DungeonLayout, change: (copy: DungeonLayout) => void): DungeonLayout => {
  const copy: DungeonLayout = JSON.parse(JSON.stringify(layout));
  change(copy);
  return copy;
};

const record = (id: string, dungeonLayout?: DungeonLayout, extra: Partial<TempleInterface> = {}): TempleInterface => ({
  id,
  categoryIds: [],
  ...(dungeonLayout ? { dungeonLayout } : {}),
  ...extra,
});

/** Let the engine's listeners finish what a save started (storage reads are promises) */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const chestIdOf = (templeId: string) => `${templeId}:chest:1F:0:2`;

beforeEach(async () => {
  await templeStorage.clear();
});

describe("the engine follows the TempleDb", () => {
  beforeAll(() => startTempleSync());
  afterAll(() => stopTempleSync());

  it("plays a temple the editor saved for the first time", async () => {
    const id = nextId();
    expect(dungeons.getDungeon(id)).toBeUndefined();

    await db.setTemple(record(id, row()));
    await settle();

    expect(dungeons.getDungeon(id)?.rooms.HALL.type).toBe("empty");
    expect(dungeons.getDungeon(id)?.maze).toEqual(row().maze);
  });

  it("plays the change when a room type is edited, with no reload", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();
    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("empty");

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.HALL = { type: "monster" }))));
    await settle();

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("monster");
  });

  it("plays an edit of a temple that is shipped in code, instead of the copy in code", async () => {
    const id = "wind-temple";
    const shippedLayout = shipped[id] as unknown as DungeonLayout;
    registerAllTemples({ [id]: shippedLayout }); // the copy in code, as the temple screen registers it
    const [key] = Object.entries(shippedLayout.rooms).find(([, room]) => room.type === "empty") ?? [];
    expect(key).toBeDefined();

    await db.setTemple(
      record(id, edited(JSON.parse(JSON.stringify(shippedLayout)), (layout) => (layout.rooms[key as string] = { type: "shop" })))
    );
    await settle();

    expect(dungeons.getDungeon(id)?.rooms[key as string].type).toBe("shop");
  });

  it("leaves a running layout alone when the save did not change it", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();
    const running = dungeons.getDungeon(id);
    chests.removeItemsFromChest(chestIdOf(id), ["map"]);
    expect(chests.getChest(chestIdOf(id))?.isEmpty).toBe(true);

    await db.setTemple(record(id, row(), { customName: "Renamed", customDescription: "Only the name changed" }));
    await settle();

    expect(dungeons.getDungeon(id)).toBe(running); // not registered again
    expect(chests.getChest(chestIdOf(id))?.isEmpty).toBe(true); // so the chest is still looted
  });

  it("plays a change of the entrance alone", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();

    await db.setTemple(record(id, edited(row(), (layout) => (layout.entrance = [0, 1]))));
    await settle();

    expect(dungeons.getDungeon(id)?.entrance).toEqual([0, 1]);
  });

  it("registers a temple once however many times it was told to listen", async () => {
    startTempleSync();
    startTempleSync();
    const register = jest.spyOn(dungeons, "registerDungeon");
    const id = nextId();

    await db.setTemple(record(id, row()));
    await settle();

    expect(register.mock.calls.filter(([dungeon]) => dungeon.id === id)).toHaveLength(1);
    register.mockRestore();
  });

  it("forgets what it cached of a generated temple, so its new name shows", async () => {
    const id = `gen-${nextId()}`;
    await db.setTemple(record(id, undefined, { customName: "Old Name" }));
    expect((await metadataForAsync(id)).name).toBe("Old Name");

    await db.setTemple(record(id, undefined, { customName: "New Name" }));
    await settle();

    expect((await metadataForAsync(id)).name).toBe("New Name");
  });

  it("does not choke on a record without a layout", async () => {
    const id = nextId();

    await db.setTemple(record(id));
    await settle();

    expect(dungeons.getDungeon(id)).toBeUndefined();
  });

  it("stops following once told to, and follows again when started again", async () => {
    const id = nextId();
    stopTempleSync();

    await db.setTemple(record(id, row()));
    await settle();
    expect(dungeons.getDungeon(id)).toBeUndefined();

    startTempleSync();
    await db.setTemple(record(id, row()));
    await settle();
    expect(dungeons.getDungeon(id)).toBeDefined();
  });
});

describe("ensureTempleFresh", () => {
  // No listener here: this is what the temple screen does when nothing announced the change
  beforeAll(() => stopTempleSync());

  it("registers the saved layout over a copy the engine holds from an earlier visit", async () => {
    const id = nextId();
    registerAllTemples({ [id]: row() });
    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("empty");
    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.HALL = { type: "monster" }))));

    await ensureTempleFresh(id);

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("monster");
  });

  it("registers a temple that only lives in the TempleDb", async () => {
    const id = `gen-${nextId()}`;
    await db.setTemple(record(id, row()));

    await ensureTempleFresh(id);

    expect(dungeons.getDungeon(id)).toBeDefined();
  });

  it("keeps the layout the engine runs when it is the saved one, chests as they were played", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await ensureTempleFresh(id);
    const running = dungeons.getDungeon(id);
    chests.removeItemsFromChest(chestIdOf(id), ["map"]);

    await ensureTempleFresh(id);

    expect(dungeons.getDungeon(id)).toBe(running);
    expect(chests.getChest(chestIdOf(id))?.isEmpty).toBe(true);
  });

  it("plays the copy in code for a shipped temple that has no record yet", async () => {
    const id = "storm-temple";
    expect(await db.getTempleById(id)).toBeNull();

    await ensureTempleFresh(id);

    const dungeon = dungeons.getDungeon(id);
    expect(dungeon).toBeDefined();
    expect(dungeon?.maze).toEqual((shipped[id] as unknown as DungeonLayout).maze);
  });

  it("does not put the copy in code over the Game Master's edited one", async () => {
    const id = "moon-temple";
    const shippedLayout = JSON.parse(JSON.stringify(shipped[id])) as DungeonLayout;
    const [key] = Object.entries(shippedLayout.rooms).find(([, room]) => room.type === "empty") ?? [];
    expect(key).toBeDefined();
    await db.setTemple(record(id, edited(shippedLayout, (layout) => (layout.rooms[key as string] = { type: "shop" }))));

    await ensureTempleFresh(id);

    expect(dungeons.getDungeon(id)?.rooms[key as string].type).toBe("shop");
  });

  it("does not replace a copy the engine holds with the one in code when the record has no layout", async () => {
    const id = "light-temple";
    registerAllTemples({ [id]: edited(row(), (layout) => (layout.rooms.HALL = { type: "shop" })) });
    const running = dungeons.getDungeon(id);
    await db.setTemple(record(id)); // settings saved before the layout was ever imported

    await ensureTempleFresh(id);

    expect(dungeons.getDungeon(id)).toBe(running);
  });

  it("leaves a temple alone that is neither shipped nor saved", async () => {
    const id = `gen-${nextId()}`;

    await expect(ensureTempleFresh(id)).resolves.toBeUndefined();

    expect(dungeons.getDungeon(id)).toBeUndefined();
  });

  it("settles when the TempleDb can not be read, and still opens a shipped temple from code", async () => {
    const id = "ice-temple";
    const failing = jest.spyOn(templeStorage, "get").mockRejectedValue(new Error("storage is not available"));

    await expect(ensureTempleFresh(id)).resolves.toBeUndefined();

    expect(dungeons.getDungeon(id)).toBeDefined();
    failing.mockRestore();
  });
});

/** The hero opens the temple at the entrance and walks to the chest, emptying it, and on to the last room */
const walkToChest = async (id: string) => {
  temples.initTemple(id, undefined, undefined, HERO);
  await temples.whenProgressReady(id);
  expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
  expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  expect(temples.takeFromChest(id, "1F", [0, 2], ["map"])).toBe(true);
  expect(temples.moveToPosition(id, [0, 3], "east")).toBe(true);
};

describe("a hero's run in a temple the Game Master changed", () => {
  beforeAll(() => startTempleSync());
  afterAll(() => stopTempleSync());

  it("keeps the run: the hero stays put, the chest stays emptied, and the edit is what they see", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();
    await walkToChest(id);

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.HALL = { type: "shop" }))));
    await settle();

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("shop");
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 3] });
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
    expect(temples.hasVisited(id, [0, 1])).toBe(true);
  });

  it("sends the hero back to the entrance when the edit turned their room into a wall", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();
    await walkToChest(id);

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.LAST = { type: "wall" }))));
    await settle();

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
  });

  it("is saved with the hero's progress: a later visit finds them where the edit left them", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await settle();
    await walkToChest(id);

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.LAST = { type: "wall" }))));
    await settle();
    await temples.flushProgress();

    const { getTempleProgressDb } = await import("@/lib/databases/TempleProgressDb");
    expect(await getTempleProgressDb().getProgress(HERO, id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
  });
});

describe("a hero's run when the change is played by a path no save announced", () => {
  // No listener: the layout is replaced by a registration the temple screen makes (or a reload of every custom
  // temple), which can land before the listener's own, so it has to keep the run too
  beforeAll(() => stopTempleSync());

  it("keeps the run when registerCustomTemples plays the change", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await registerCustomTemples();
    await walkToChest(id);

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.LAST = { type: "wall" }))));
    await registerCustomTemples();

    expect(dungeons.getRoom(id, [0, 3])?.type).toBe("wall");
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
  });

  it("keeps the run when ensureTempleFresh plays the change", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await ensureTempleFresh(id);
    await walkToChest(id);

    await db.setTemple(record(id, edited(row(), (layout) => (layout.rooms.HALL = { type: "shop" }))));
    await ensureTempleFresh(id);

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("shop");
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 3] });
    expect(dungeons.getRoom(id, [0, 2])?.isEmpty).toBe(true);
  });

  it("does not disturb a run when the same layout is registered again", async () => {
    const id = nextId();
    await db.setTemple(record(id, row()));
    await registerCustomTemples();
    await walkToChest(id);
    const running = dungeons.getDungeon(id);

    await registerCustomTemples();
    await ensureTempleFresh(id);

    expect(dungeons.getDungeon(id)).toBe(running);
    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 3] });
  });
});
