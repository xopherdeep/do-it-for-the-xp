/**
 * A hero's temple progress written on another device lands here (Family Sync): the temple engine forgets the run it
 * held for that hero in that temple, so the next visit reads the landed copy, and a save of the old run still waiting is
 * never written over it. Only the browser's storage is faked (in memory); the engine and the databases are real.
 */
import { getTempleProgressDb, templeProgressKey } from "@/lib/databases/TempleProgressDb";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { emitRecordsLanded } from "@/lib/services/sync/recordSignals";
import { TempleHydrator } from "./helpers/dslTemple";

interface FakeBrowser {
  rows: Map<string, Map<string, unknown>>;
  /** Writes wait for this promise, so a test can keep a save on its way */
  holdWrites: Promise<void>;
}
const browser = (): FakeBrowser => (globalThis as any).__landedBrowser;

jest.mock("@ionic/storage", () => {
  const scope = globalThis as any;
  scope.__landedBrowser ??= { rows: new Map(), holdWrites: Promise.resolve() };
  const shared = scope.__landedBrowser as FakeBrowser;
  class FakeStorage {
    private readonly rows: Map<string, unknown>;
    constructor(config: { name: string }) {
      if (!shared.rows.has(config.name)) shared.rows.set(config.name, new Map());
      this.rows = shared.rows.get(config.name) as Map<string, unknown>;
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      await shared.holdWrites;
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
    async forEach(fn: (value: unknown, key: string) => unknown) {
      this.rows.forEach((value, key) => fn(value, key));
    }
  }
  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});
jest.mock("@ionic/vue", () => ({ toastController: {} }));

const PROGRESS = "__templeProgress";
const HERO = "hero-1";
const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();
let counter = 0;
const nextId = () => `landed-temple-${++counter}`;
/** The entrance and four halls: [0,0] to [0,4] */
const registerRun = (id: string) => {
  dungeons.registerDungeon(TempleHydrator.hydrate("EXIT R000 R000 R000 R000", id, id));
  return id;
};
const openFor = async (id: string) => {
  temples.initTemple(id, undefined, undefined, HERO);
  await temples.whenProgressReady(id);
};
/** What the download lands: the raw store written directly (a download never goes through the Db classes) */
const land = (id: string, progress: Record<string, unknown>) => {
  browser().rows.get(PROGRESS)?.set(templeProgressKey(HERO, id), progress);
  emitRecordsLanded({ store: PROGRESS, keys: [templeProgressKey(HERO, id)] });
};
const fromPhone = (id: string) => ({
  userId: HERO,
  templeId: id,
  currentLevel: "1F",
  currentPosition: [0, 4],
  hasMap: true,
  hasCompass: false,
  playerKeys: 1,
  visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,3", "1F:0,4"],
  clearedRooms: [],
  hasMasterKey: false,
  openedDoors: [],
  openedChests: [],
  keyItems: [],
  timesCleared: 0,
  bloodMoons: 0,
  updatedAt: "2026-10-22T10:00:00.000Z",
});

afterEach(() => {
  browser().holdWrites = Promise.resolve();
});

describe("temple progress that lands from another device", () => {
  it("forgets the run held for that hero, so the next visit opens where the other device left the hero", async () => {
    const id = registerRun(nextId());
    await openFor(id);
    temples.moveToPosition(id, [0, 1], "east");
    await temples.flushProgress();

    land(id, fromPhone(id));

    expect(temples.getTempleState(id)).toBeUndefined();
    await openFor(id);
    expect(temples.getTempleState(id)?.currentPosition).toEqual([0, 4]);
    expect(temples.getTempleState(id)?.hasMap).toBe(true);
  });

  it("never writes a save of the old run that was still on its way over the landed copy", async () => {
    const id = registerRun(nextId());
    await openFor(id);
    await temples.flushProgress();

    // the first save is held on its way; a second waits behind it with the old run in it
    let release!: () => void;
    browser().holdWrites = new Promise<void>((resolve) => (release = resolve));
    temples.moveToPosition(id, [0, 1], "east");
    await Promise.resolve();
    temples.moveToPosition(id, [0, 2], "east");
    await Promise.resolve();

    browser().holdWrites = Promise.resolve();
    land(id, fromPhone(id));
    release();
    await temples.flushProgress();

    const saved = await getTempleProgressDb().getProgress(HERO, id);
    expect(saved?.currentPosition).not.toEqual([0, 2]);
  });

  it("leaves the run of another hero, and other stores' landings, alone", async () => {
    const id = registerRun(nextId());
    await openFor(id);
    emitRecordsLanded({ store: PROGRESS, keys: [templeProgressKey("hero-2", id)] });
    emitRecordsLanded({ store: "__beasts", keys: [templeProgressKey(HERO, id)] });
    expect(temples.getTempleState(id)).toBeDefined();
  });
});
