/**
 * Temple progress: what a hero did in a temple (where they stand, rooms visited and won, keys, map,
 * compass) is kept per hero and survives a reload, and registering the temples again does not undo it.
 *
 * Only the browser's storage is faked (in memory, below). TempleProgressDb, TempleDb, the temple
 * adapter and the temple system are the real ones.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { ChestSystem } from "@/lib/engine/core/dungeons/ChestSystem";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerAllTemples, registerCustomTemples } from "@/lib/engine/core/dungeons/TempleAdapter";
import { TempleHydrator } from "./helpers/dslTemple";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { useTemple } from "@/hooks/temples/useTemple";

// A reload builds a fresh module registry (see startSession), which takes a while on a busy machine
jest.setTimeout(30000);

// --- the browser's storage, in memory ---------------------------------------------------------
interface FakeBrowser {
  /** storage name -> key -> value */
  rows: Map<string, Map<string, unknown>>;
  /** `${storage name}/${key}` of every write, in order */
  writes: string[];
  /** Reads wait for this promise, so a test can keep a read in flight */
  hold: Promise<void>;
  failReads: boolean;
}

// On the global object: every module registry of this file, the ones a "reload" creates included, shares it
const browser = (): FakeBrowser => (globalThis as any).__fakeBrowser;

jest.mock("@ionic/storage", () => {
  const scope = globalThis as any;
  if (!scope.__fakeBrowser) {
    scope.__fakeBrowser = { rows: new Map(), writes: [], hold: Promise.resolve(), failReads: false };
  }
  const shared = scope.__fakeBrowser as FakeBrowser;

  class FakeStorage {
    private readonly rows: Map<string, unknown>;

    constructor(private readonly config: { name: string }) {
      if (!shared.rows.has(config.name)) shared.rows.set(config.name, new Map());
      this.rows = shared.rows.get(config.name) as Map<string, unknown>;
    }

    async create() {
      return this;
    }

    async get(key: string) {
      await shared.hold;
      if (shared.failReads) throw new Error("storage is not available");
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }

    async set(key: string, value: unknown) {
      shared.writes.push(`${this.config.name}/${key}`);
      this.rows.set(key, JSON.parse(JSON.stringify(value)));
    }

    async remove(key: string) {
      this.rows.delete(key);
    }

    async clear() {
      this.rows.clear();
    }

    async keys() {
      return Array.from(this.rows.keys());
    }
  }

  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});
jest.mock("@ionic/vue", () => ({ toastController: {} }));

// A test that stops half way must not leave the storage held or broken for the next one
afterEach(() => {
  browser().hold = Promise.resolve();
  browser().failReads = false;
});

const PROGRESS = "__templeProgress";
const HERO = "hero-1";
const OTHER_HERO = "hero-2";

const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();
const chests = ChestSystem.getInstance();
const db = getTempleProgressDb();

// The singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `progress-temple-${++counter}`;

const SEALED = { north: true, south: true, east: true, west: true };

/** How many times the progress record of a hero in a temple was written */
const writesOf = (userId: string, templeId: string) =>
  browser().writes.filter((write) => write === `${PROGRESS}/${userId}:${templeId}`).length;

/** The entrance, two halls, a monster whose room seals on entry (M01!), a hall: [0,0] to [0,4] */
const RUN = "EXIT R000 R000 M01! R000";
const registerRun = (id: string) => {
  dungeons.registerDungeon(TempleHydrator.hydrate(RUN, id, id));
  return id;
};

/**
 * The shape the temple registry has: rooms by symbol. [0,0] entrance, [0,1] chest holding the map,
 * [0,2] hall, [0,3] a monster whose room seals on entry.
 */
const chestLayout = () => ({
  maze: [["ENT", "CHEST", "HALL", "FIGHT"]],
  rooms: {
    ENT: { type: "entrance" },
    CHEST: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    HALL: { type: "empty" },
    FIGHT: { type: "monster", content: { lockOnEnter: true } },
  },
});
const chestIdOf = (templeId: string) => `${templeId}:chest:1F:0:1`;

/** Open the temple the way the temple screen does and wait until the hero's save has been read. */
const openFor = async (id: string, userId: string = HERO, start?: number[]) => {
  temples.initTemple(id, start, undefined, userId);
  await temples.whenProgressReady(id);
};

describe("TempleProgressDb", () => {
  const progress = (overrides: Record<string, unknown> = {}) => ({
    userId: HERO,
    templeId: nextId(),
    currentLevel: "2F",
    currentPosition: [3, 4] as [number, number],
    hasMap: true,
    hasCompass: false,
    playerKeys: 2,
    visitedRooms: ["1F:5,2", "2F:3,4"],
    clearedRooms: ["1F:4,4"],
    hasMasterKey: false,
    openedDoors: ["1F:5,2>east"],
    openedChests: [],
    keyItems: ["lantern"],
    timesCleared: 1,
    bloodMoons: 0,
    ...overrides,
  });

  it("gives back what was saved and stamps the time of the save", async () => {
    const wanted = progress();

    const saved = await db.saveProgress(wanted);

    expect(saved).toEqual({ ...wanted, updatedAt: expect.any(String) });
    expect(new Date(saved.updatedAt).toISOString()).toBe(saved.updatedAt);
    expect(await db.getProgress(wanted.userId, wanted.templeId)).toEqual(saved);
  });

  it("keeps one record per hero and temple, under userId:templeId, with exactly the documented fields", async () => {
    const wanted = progress();

    await db.saveProgress(wanted);

    const raw = browser().rows.get(PROGRESS)?.get(`${wanted.userId}:${wanted.templeId}`) as Record<string, unknown>;
    expect(Object.keys(raw).sort()).toEqual([
      "bloodMoons",
      "clearedRooms",
      "currentLevel",
      "currentPosition",
      "hasCompass",
      "hasMap",
      "hasMasterKey",
      "keyItems",
      "openedChests",
      "openedDoors",
      "playerKeys",
      "templeId",
      "timesCleared",
      "updatedAt",
      "userId",
      "visitedRooms",
    ]);
  });

  it("replaces the previous record of the same hero in the same temple and leaves the others alone", async () => {
    const hero = `hero-${nextId()}`;
    const first = progress({ userId: hero, templeId: "wind-temple", playerKeys: 1 });
    const other = progress({ userId: hero, templeId: "fire-temple", playerKeys: 7 });
    await db.saveProgress(first);
    await db.saveProgress(other);

    await db.saveProgress({ ...first, playerKeys: 0, visitedRooms: [] });

    expect((await db.getProgress(hero, "wind-temple"))?.playerKeys).toBe(0);
    expect((await db.getProgress(hero, "wind-temple"))?.visitedRooms).toEqual([]);
    expect((await db.getProgress(hero, "fire-temple"))?.playerKeys).toBe(7);
    expect(await db.getProgressForUser(hero)).toHaveLength(2);
  });

  it("keeps heroes apart", async () => {
    const templeId = nextId();
    const hero = `hero-${templeId}`;
    await db.saveProgress(progress({ userId: hero, templeId, playerKeys: 5 }));
    await db.saveProgress(progress({ userId: `${hero}-sibling`, templeId, playerKeys: 1 }));

    expect((await db.getProgress(hero, templeId))?.playerKeys).toBe(5);
    expect((await db.getProgress(`${hero}-sibling`, templeId))?.playerKeys).toBe(1);
    expect(await db.getProgress(`${hero}-nobody`, templeId)).toBeNull();
    expect((await db.getProgressForUser(hero)).map((entry) => entry.userId)).toEqual([hero]);
  });

  it("forgets a run", async () => {
    const wanted = progress();
    await db.saveProgress(wanted);

    await db.clearProgress(wanted.userId, wanted.templeId);

    expect(await db.getProgress(wanted.userId, wanted.templeId)).toBeNull();
  });

  it("reads a damaged record as a fresh run instead of throwing, and a foreign one as nothing", async () => {
    const rows = browser().rows.get(PROGRESS)!;
    rows.set("a:damaged", {
      userId: "a",
      templeId: "damaged",
      currentLevel: 7,
      currentPosition: "up",
      hasMap: "yes",
      playerKeys: -3,
      visitedRooms: [1, "1F:0,0"],
      clearedRooms: "none",
    });
    rows.set("a:not-a-record", "garbage");
    rows.set("a:somebody-elses", { userId: "b", templeId: "somebody-elses" });

    expect(await db.getProgress("a", "damaged")).toEqual({
      userId: "a",
      templeId: "damaged",
      currentLevel: "1F",
      currentPosition: [0, 0],
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      visitedRooms: ["1F:0,0"],
      clearedRooms: [],
      hasMasterKey: false,
      openedDoors: [],
      openedChests: [],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
      updatedAt: new Date(0).toISOString(),
    });
    expect(await db.getProgress("a", "not-a-record")).toBeNull();
    expect(await db.getProgress("a", "somebody-elses")).toBeNull();
  });

  it("refuses to save a record that belongs to nobody", async () => {
    await expect(db.saveProgress(progress({ userId: undefined }))).rejects.toThrow();
  });
});

describe("TempleSystem saves the progress of the hero it was opened for", () => {
  const saved = (id: string, userId: string = HERO) => db.getProgress(userId, id);

  it("writes the start of a run once the (empty) save was read", async () => {
    const id = registerRun(nextId());

    temples.initTemple(id, undefined, undefined, HERO);
    await temples.whenProgressReady(id);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({
      userId: HERO,
      templeId: id,
      currentLevel: "1F",
      currentPosition: [0, 0],
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      visitedRooms: ["1F:0,0"],
      clearedRooms: [],
    });
  });

  it("writes nothing for a temple opened without a hero", async () => {
    const id = registerRun(nextId());

    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    temples.markRoomCleared(id, "1F", [0, 1]);
    await temples.flushProgress();

    const keys = Array.from(browser().rows.get(PROGRESS)?.keys() ?? []);
    expect(keys.filter((key) => key.endsWith(`:${id}`))).toEqual([]);
    expect(temples.getHeroId(id)).toBeUndefined();
  });

  it("saves every move, the rooms it visits, and a won fight", async () => {
    const id = registerRun(nextId());
    await openFor(id);

    temples.moveToPosition(id, [0, 1], "east");
    temples.moveToPosition(id, [0, 2], "east");
    expect(temples.moveToPosition(id, [0, 3], "east")).toBe(true); // M01!: the doors seal behind the hero
    await temples.flushProgress();
    expect(await saved(id)).toMatchObject({ currentPosition: [0, 3], clearedRooms: [] });

    temples.markRoomCleared(id, "1F", [0, 3]);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({
      currentLevel: "1F",
      currentPosition: [0, 3],
      visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,3"],
      clearedRooms: ["1F:0,3"],
    });
  });

  it("saves a teleport to another floor", async () => {
    const id = nextId();
    dungeons.registerDungeon(TempleHydrator.hydrateMultiFloor({ "1F": "EXIT TELE R000", "2F": "R000 R000 TELE" }, id, id));
    await openFor(id, HERO, [0, 1]);

    temples.handleTeleport(id);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({
      currentLevel: "2F",
      currentPosition: [0, 2],
      visitedRooms: ["1F:0,0", "1F:0,1", "2F:0,2"], // the entrance counts as visited from the start
    });
  });

  it("turns a burst of changes in one tick into one write", async () => {
    const id = registerRun(nextId());
    await openFor(id);
    await temples.flushProgress();
    const before = writesOf(HERO, id);

    temples.moveToPosition(id, [0, 1], "east");
    temples.moveToPosition(id, [0, 2], "east");
    temples.moveToPosition(id, [0, 3], "east");
    temples.markRoomCleared(id, "1F", [0, 3]);
    await temples.flushProgress();

    expect(writesOf(HERO, id) - before).toBe(1);
    expect(await saved(id)).toMatchObject({ currentPosition: [0, 3], clearedRooms: ["1F:0,3"] });
  });

  it("saves keys, the map and the compass that the chest dialog hands out, and a key spent on a door", async () => {
    const id = nextId();
    const dungeon = TempleHydrator.hydrate("EXIT R000", id, id);
    dungeon.rooms["R0_0"].locked = { east: true };
    dungeons.registerDungeon(dungeon);
    await openFor(id);

    const state = temples.getTempleState(id)!;
    state.playerKeys = 2; // the dialog changes the state directly and asks for it to be saved
    state.hasMap = true;
    state.hasCompass = true;
    temples.saveProgress(id);
    await temples.flushProgress();
    expect(await saved(id)).toMatchObject({ playerKeys: 2, hasMap: true, hasCompass: true });

    expect(temples.unlockDoor(id, [0, 0], "east")).toBe(true);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({ playerKeys: 1, hasMap: true, hasCompass: true });
  });

  it("writes nothing while the hero's save is still being read, so a fresh run cannot overwrite it", async () => {
    const id = registerRun(nextId());
    await db.saveProgress({
      userId: HERO,
      templeId: id,
      currentLevel: "1F",
      currentPosition: [0, 2],
      hasMap: true,
      hasCompass: false,
      playerKeys: 3,
      visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2"],
      clearedRooms: [],
      hasMasterKey: false,
      openedDoors: [],
      openedChests: [],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
    });
    const before = writesOf(HERO, id);
    let release!: () => void;
    browser().hold = new Promise<void>((resolve) => (release = resolve));

    temples.initTemple(id, undefined, undefined, HERO);
    temples.moveToPosition(id, [0, 1], "east");
    await temples.flushProgress();
    expect(writesOf(HERO, id)).toBe(before); // the read is still on its way

    release();
    browser().hold = Promise.resolve();
    await temples.whenProgressReady(id);
    await temples.flushProgress();

    // The hero moved before the save arrived, so they stay where they are; everything else is merged in
    expect(await saved(id)).toMatchObject({
      currentPosition: [0, 1],
      hasMap: true,
      playerKeys: 3,
      visitedRooms: expect.arrayContaining(["1F:0,0", "1F:0,1", "1F:0,2"]),
    });
  });

  it("gives another hero a run of their own, and hands the first hero theirs back", async () => {
    const id = nextId();
    registerAllTemples({ [id]: chestLayout() });
    await openFor(id, HERO);
    temples.moveToPosition(id, [0, 1], "east");
    temples.getTempleState(id)!.hasMap = true;
    temples.saveProgress(id);
    chests.removeItemsFromChest(chestIdOf(id), ["map"]); // the first hero looted the chest

    await openFor(id, OTHER_HERO);

    expect(temples.getHeroId(id)).toBe(OTHER_HERO);
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: false, currentPosition: [0, 0] });
    expect(chests.getChest(chestIdOf(id))?.isEmpty).toBe(false); // full again for the next hero
    await temples.flushProgress();
    expect(await saved(id, HERO)).toMatchObject({ hasMap: true, currentPosition: [0, 1] });
    expect(await saved(id, OTHER_HERO)).toMatchObject({ hasMap: false, currentPosition: [0, 0] });

    await openFor(id, HERO);
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: true, currentPosition: [0, 1] });
  });

  it("saves a win reported without a hero once the temple is opened for one", async () => {
    const id = registerRun(nextId());
    temples.markRoomCleared(id, "1F", [0, 3]); // the battle page, which does not know the hero
    await temples.flushProgress();
    expect(await saved(id)).toBeNull();

    await openFor(id);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({ currentPosition: [0, 3], clearedRooms: ["1F:0,3"] });
  });

  it("saves a win reported with the hero straight away", async () => {
    const id = registerRun(nextId());

    temples.markRoomCleared(id, "1F", [0, 3], HERO);
    await temples.whenProgressReady(id);
    await temples.flushProgress();

    expect(await saved(id)).toMatchObject({ currentPosition: [0, 3], clearedRooms: ["1F:0,3"] });
  });

  it("is asked to save by the chest dialog of the temple hook", async () => {
    const id = nextId();
    registerAllTemples({ [id]: chestLayout() });
    const wrapper = mount(
      defineComponent({
        setup: () => useTemple(id, [0, 1], undefined, HERO),
        render: () => null,
      })
    );
    const vm = wrapper.vm as any;
    vm.registerMessageDisplay(() => undefined);
    await vm.whenOpened; // the run starts once the temple's saved layout was read
    await temples.whenProgressReady(id);

    vm.processChestItems(["key", "map", "compass"]);
    await temples.flushProgress();

    expect(temples.getHeroId(id)).toBe(HERO);
    expect(await saved(id)).toMatchObject({ currentPosition: [0, 1], playerKeys: 1, hasMap: true, hasCompass: true });
    wrapper.unmount();
  });
});

/**
 * One app session: its own copy of every engine singleton, on top of the same browser storage.
 * What an earlier session saved is all a later one has, as after a reload.
 */
interface Session {
  temples: TempleSystem;
  dungeons: DungeonManager;
  hydrator: typeof TempleHydrator;
  db: ReturnType<typeof getTempleProgressDb>;
}

const startSession = (): Session => {
  let session!: Session;
  jest.isolateModules(() => {
    session = {
      dungeons: require("@/lib/engine/core/dungeons/DungeonManager").DungeonManager.getInstance(),
      temples: require("@/lib/engine/core/dungeons/TempleSystem").TempleSystem.getInstance(),
      hydrator: TempleHydrator,
      db: require("@/lib/databases/TempleProgressDb").getTempleProgressDb(),
    };
  });
  return session;
};

describe("after a reload", () => {
  const openTemple = async (session: Session, id: string, userId: string, blueprint: string = RUN, start?: number[]) => {
    session.dungeons.registerDungeon(session.hydrator.hydrate(blueprint, id, id));
    session.temples.initTemple(id, start, undefined, userId);
    await session.temples.whenProgressReady(id);
  };

  /** A first session: the hero finds the map, the compass and two keys, and walks the row. */
  const playFirstSession = async (id: string, stopAt: "the fight" | "past the fight") => {
    const first = startSession();
    await openTemple(first, id, HERO);
    first.temples.moveToPosition(id, [0, 1], "east");
    first.temples.moveToPosition(id, [0, 2], "east");
    const state = first.temples.getTempleState(id)!;
    state.hasMap = true;
    state.hasCompass = true;
    state.playerKeys = 2;
    first.temples.moveToPosition(id, [0, 3], "east"); // M01!: the doors seal behind the hero
    if (stopAt === "past the fight") {
      first.temples.markRoomCleared(id, "1F", [0, 3]);
      first.temples.moveToPosition(id, [0, 4], "east");
    }
    first.temples.saveProgress(id);
    await first.temples.flushProgress();
    return first;
  };

  it("gives the hero back where they stood, what they found and what they won", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight");

    const second = startSession();
    second.dungeons.registerDungeon(second.hydrator.hydrate(RUN, id, id));
    second.temples.initTemple(id, undefined, undefined, HERO); // the temple screen opens the temple at the entrance
    expect(second.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 0], hasMap: false });
    await second.temples.whenProgressReady(id);

    expect(second.temples.getTempleState(id)).toMatchObject({
      currentLevel: "1F",
      currentPosition: [0, 4],
      hasMap: true,
      hasCompass: true,
      playerKeys: 2,
    });
    expect(second.temples.isRoomCleared(id, "1F", [0, 3])).toBe(true);
    expect(second.temples.isRoomCleared(id, "1F", [0, 2])).toBe(false);
    expect(second.temples.hasVisited(id, [0, 1])).toBe(true);
    expect(second.dungeons.hasVisited(id, [0, 2], "1F")).toBe(true);
    // The fight was won, so the room does not seal again
    expect(second.temples.moveToPosition(id, [0, 3], "west")).toBe(true);
    expect(second.temples.getCurrentRoom(id)?.locked).toBeUndefined();
  });

  it("keeps a room whose one thing the hero took (a key, a find, a riddle) with the chests, and leaves the room as it is", async () => {
    const id = nextId();
    const first = startSession();
    await openTemple(first, id, HERO);
    first.temples.markChestOpened(id, "1F", [0, 1]); // a room of its own, not a chest, spent
    first.temples.saveProgress(id);
    await first.temples.flushProgress();

    const second = startSession();
    await openTemple(second, id, HERO);

    expect(second.temples.getTempleState(id)!.openedChests).toEqual(new Set(["1F:0,1"]));
    expect(second.dungeons.getRoom(id, [0, 1], "1F")!.isEmpty).toBeFalsy();
  });

  it("starts a hero who left by Portal Home at the entrance, with what they found and won kept", async () => {
    const id = nextId();
    const first = await playFirstSession(id, "past the fight"); // standing at [0,4], map, compass, two keys, [0,3] won
    first.temples.getTempleState(id)!.hasMasterKey = true;

    void first.temples.leaveByPortal(id);
    await first.temples.flushProgress();
    expect(first.temples.getTempleState(id)).toBeUndefined();

    const second = startSession();
    await openTemple(second, id, HERO);

    expect(second.temples.getTempleState(id)).toMatchObject({
      currentLevel: "1F",
      currentPosition: [0, 0],
      hasMap: true,
      hasCompass: true,
      hasMasterKey: true,
      playerKeys: 2,
    });
    expect(second.temples.isRoomCleared(id, "1F", [0, 3])).toBe(true);
    expect(second.temples.hasVisited(id, [0, 4])).toBe(true);
    expect(second.temples.moveToPosition(id, [0, 1], "east")).toBe(true);
  });

  it("puts the hero at the entrance once a save that is still being read is merged", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight");

    const second = startSession();
    second.dungeons.registerDungeon(second.hydrator.hydrate(RUN, id, id));
    second.temples.initTemple(id, undefined, undefined, HERO);
    void second.temples.leaveByPortal(id); // the read has not come back yet
    await second.temples.whenProgressReady(id);
    await second.temples.flushProgress();

    expect(second.temples.getTempleState(id)).toBeUndefined();
    const third = startSession();
    await openTemple(third, id, HERO);
    expect(third.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 0], hasMap: true, playerKeys: 2 });
  });

  it("keeps the hero in a fight they left unfinished", async () => {
    const id = nextId();
    await playFirstSession(id, "the fight");

    const second = startSession();
    await openTemple(second, id, HERO);

    expect(second.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 3] });
    expect(second.temples.getCurrentRoom(id)?.locked).toEqual(SEALED);
    expect(second.temples.moveToPosition(id, [0, 2], "west")).toBe(false);

    second.temples.markRoomCleared(id, "1F", [0, 3]);
    expect(second.temples.getCurrentRoom(id)?.locked).toEqual({ north: false, south: false, east: false, west: false });
    expect(second.temples.moveToPosition(id, [0, 2], "west")).toBe(true);
  });

  it("starts a hero with nothing saved where the route says, and leaves the saved hero's run alone", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight");

    const second = startSession();
    await openTemple(second, id, OTHER_HERO, RUN, [0, 1]);
    await second.temples.flushProgress();

    expect(second.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 1], hasMap: false, playerKeys: 0 });
    expect(await second.db.getProgress(OTHER_HERO, id)).toMatchObject({ currentPosition: [0, 1], hasMap: false });
    expect(await second.db.getProgress(HERO, id)).toMatchObject({ currentPosition: [0, 4], hasMap: true, playerKeys: 2 });
  });

  it("prefers the saved run to the start the route names", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight");

    const second = startSession();
    await openTemple(second, id, HERO, RUN, [0, 1]); // a world map link brings the hero to the entrance coordinates

    expect(second.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 4], hasMap: true });
  });

  it("starts at the entrance when the saved room is gone from the layout", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight"); // saved at [0,4]

    const second = startSession();
    await openTemple(second, id, HERO, "EXIT R000 R000 ____ ____"); // the temple creator turned the end into walls

    expect(second.temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 0], hasMap: true, playerKeys: 2 });
  });

  it("adds a win the battle page reports to the saved run instead of replacing it", async () => {
    const id = nextId();
    await playFirstSession(id, "the fight");

    // A hard reload on the battle page: no dungeon registered yet, nothing in memory
    const second = startSession();
    second.temples.markRoomCleared(id, "1F", [0, 3], HERO);
    await second.temples.whenProgressReady(id);
    await second.temples.flushProgress();

    expect(await second.db.getProgress(HERO, id)).toMatchObject({
      currentPosition: [0, 3],
      hasMap: true,
      hasCompass: true,
      playerKeys: 2,
      visitedRooms: expect.arrayContaining(["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,3"]),
      clearedRooms: ["1F:0,3"],
    });
  });

  it("does not save over a run it could not read, and tries again at the next visit", async () => {
    const id = nextId();
    await playFirstSession(id, "past the fight");

    const second = startSession();
    browser().failReads = true;
    await openTemple(second, id, HERO);
    browser().failReads = false;

    expect(second.temples.getHeroId(id)).toBeUndefined();
    second.temples.moveToPosition(id, [0, 1], "east");
    await second.temples.flushProgress();
    expect(await second.db.getProgress(HERO, id)).toMatchObject({ currentPosition: [0, 4], hasMap: true, playerKeys: 2 });

    second.temples.initTemple(id, undefined, undefined, HERO);
    await second.temples.whenProgressReady(id);
    expect(second.temples.getHeroId(id)).toBe(HERO);
    expect(second.temples.getTempleState(id)).toMatchObject({ hasMap: true, playerKeys: 2 });
  });
});

describe("registering the temples again", () => {
  beforeEach(() => {
    browser().rows.get("__temples")?.clear();
  });

  /** The layout of a temple as the temple creator keeps it in TempleDb */
  const store = async (id: string, layout = chestLayout()) => {
    await new TempleDb(templeStorage).setTemple({ id, categoryIds: [], dungeonLayout: { entrance: [0, 0], ...layout } });
  };

  const loot = (id: string) => chests.removeItemsFromChest(chestIdOf(id), ["map"]);
  const isLooted = (id: string) => chests.getChest(chestIdOf(id))?.isEmpty;

  it("keeps the chests, doors and seals a hero has worked on, until it is forced", () => {
    const id = nextId();
    registerAllTemples({ [id]: chestLayout() });
    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    loot(id);
    temples.moveToPosition(id, [0, 2], "east");
    temples.moveToPosition(id, [0, 3], "east"); // the fight room seals
    expect(dungeons.getRoom(id, [0, 3])?.locked).toEqual(SEALED);

    registerAllTemples({ [id]: chestLayout() }); // the temple screen mounts again

    expect(isLooted(id)).toBe(true);
    expect(dungeons.getRoom(id, [0, 3])?.locked).toEqual(SEALED);

    registerAllTemples({ [id]: chestLayout() }, { force: true });

    expect(isLooted(id)).toBe(false);
    expect(dungeons.getRoom(id, [0, 3])?.locked).toBeUndefined();
  });

  it("leaves a temple alone that is already in the engine, whoever put it there", () => {
    const id = nextId();
    dungeons.registerDungeon(TempleHydrator.hydrate("EXIT R000", id, id));

    registerAllTemples({ [id]: chestLayout() });

    expect(dungeons.getRoom(id, [0, 1])?.type).toBe("empty"); // still the one from the blueprint, not the chest
  });

  it("never writes into the layout a temple is registered from", () => {
    const id = nextId();
    const layout = chestLayout();
    (layout.rooms.FIGHT as any).locked = { north: true };
    registerAllTemples({ [id]: layout });
    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    temples.moveToPosition(id, [0, 2], "east");
    temples.moveToPosition(id, [0, 3], "east"); // seals the fight room

    expect(dungeons.getRoom(id, [0, 3])?.locked).toEqual(SEALED);
    expect(layout.rooms.FIGHT).toEqual({ type: "monster", content: { lockOnEnter: true }, locked: { north: true } });
    expect(layout.rooms.CHEST.content).toEqual({ chest: "dungeon", dungeon: "map" }); // no chest id written back
  });

  it("registers a temple from TempleDb that the engine does not know, and keeps it as it is played", async () => {
    const id = nextId();
    await store(id);

    await registerCustomTemples();
    expect(dungeons.getDungeon(id)).toBeDefined();
    loot(id);

    await registerCustomTemples(); // the next time the temple screen mounts
    expect(isLooted(id)).toBe(true);

    await registerCustomTemples({ force: true }); // the temple creator saved a layout and wants it played now
    expect(isLooted(id)).toBe(false);
  });

  it("does not replace the layout shipped in code by its own copy in TempleDb", async () => {
    const id = nextId();
    registerAllTemples({ [id]: chestLayout() }); // what the temple screen does first
    loot(id);
    await store(id); // the copy importAllTempleLayouts makes

    await registerCustomTemples();

    expect(isLooted(id)).toBe(true);
  });

  it("plays an edited layout from TempleDb instead of the one in code, once, and then leaves it alone", async () => {
    const id = nextId();
    registerAllTemples({ [id]: chestLayout() });
    const edited = chestLayout();
    edited.rooms.CHEST.content.dungeon = "compass";
    await store(id, edited);

    await registerCustomTemples();
    expect(dungeons.getRoom(id, [0, 1])?.content?.dungeon).toBe("compass");
    chests.removeItemsFromChest(chestIdOf(id), ["compass"]);

    // The next mount: the code layout does not win it back, and the edited one is not registered a second time
    registerAllTemples({ [id]: chestLayout() });
    await registerCustomTemples();
    expect(dungeons.getRoom(id, [0, 1])?.content?.dungeon).toBe("compass");
    expect(chests.getChest(chestIdOf(id))?.isEmpty).toBe(true);
  });
});
