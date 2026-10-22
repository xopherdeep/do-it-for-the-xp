/**
 * A classic temple reaching a family's device (the design's "Rollout to families"): the seed sync refreshes the stored,
 * unedited copy of the old Storm Temple to the Tower of Hera, and every hero's saved run in it starts over. The old
 * run's position is a wall (or outside the grid) in the new layout, its small keys opened doors that are gone, its
 * opened chests name cells that are something else now, and its Boss Key would walk straight to Moldorm: so the hero
 * stands on the new entrance with no keys and no chest opened. What they earned for good (the Pegasus in `keyItems`,
 * the count of clears) stays.
 *
 * Only the browser's storage is faked (in memory). The seed sync, the TempleDb, the adapter and the temple system are real.
 */
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { importAllTempleLayouts, layoutSignature } from "@/lib/engine/core/dungeons/importAllTemples";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { ensureTempleFresh } from "@/lib/engine/core/dungeons/templeFreshness";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import shipped from "@/lib/engine/temples";
import { stormBeforeHera } from "./classicFixtures";

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

const ID = "storm-temple";
const HERO = "hero-1";
const OTHER = "hero-2";
const temples = TempleSystem.getInstance();
const db = new TempleDb(templeStorage);
const progress = getTempleProgressDb();

const oldLayout = { entrance: stormBeforeHera.entrance, maze: stormBeforeHera.maze, rooms: stormBeforeHera.rooms };

/** The old Storm Temple as a family's device holds it: imported from code, never edited */
const storeOldSeed = () => db.setTemple({ id: ID, categoryIds: ["dungeon", "storm"], customName: "Storm Temple", dungeonLayout: oldLayout as never, seedSignature: layoutSignature(oldLayout) });

/** A hero deep in the old run: on 2F in the Toybox Troll's room (a wall in the Tower of Hera), the Boss Key in hand */
const saveOldRun = (userId: string) =>
  progress.saveProgress({
    userId,
    templeId: ID,
    currentLevel: "2F",
    currentPosition: [3, 4],
    hasMap: true,
    hasCompass: true,
    playerKeys: 1,
    visitedRooms: ["1F:0,0", "1F:1,0", "1F:1,1", "2F:2,4", "2F:3,4"],
    clearedRooms: ["2F:3,3", "temple:cleared"],
    hasMasterKey: true,
    openedDoors: ["1F:1,0>south"],
    openedChests: ["1F:1,1", "2F:2,4"],
    keyItems: ["Pegasus"],
    timesCleared: 1,
    bloodMoons: 2,
  });

describe("the Tower of Hera reaching a device that holds the old Storm Temple", () => {
  beforeAll(async () => {
    await templeStorage.create();
    await storeOldSeed();
    await saveOldRun(HERO);
    await saveOldRun(OTHER);
  });

  it("is a refresh of an unedited copy, and the shipped layout really is the new one", () => {
    expect(layoutSignature(shipped[ID] as never)).not.toBe(layoutSignature(oldLayout));
  });

  it("puts the hero on the new entrance with no keys and no chest opened, and keeps what they earned for good", async () => {
    const report = await importAllTempleLayouts();
    expect(report[ID]).toBe("refresh");

    await ensureTempleFresh(ID);
    expect(temples.initTemple(ID, undefined, undefined, HERO)).toBe(true);
    await temples.whenProgressReady(ID);

    const state = temples.getTempleState(ID)!;
    expect(state).toMatchObject({ currentLevel: "1F", currentPosition: [1, 0], playerKeys: 0, hasMasterKey: false, hasMap: false, hasCompass: false });
    expect([...(state.openedChests ?? [])]).toEqual([]);
    expect([...(state.openedDoors ?? [])]).toEqual([]);
    expect(temples.getCurrentRoom(ID)?.type).toBe("entrance");
    expect(temples.isTempleCleared(ID)).toBe(true);
    expect(state.keyItems).toEqual(["Pegasus"]);

    const saved = await progress.getProgress(HERO, ID);
    expect(saved).toMatchObject({ currentLevel: "1F", currentPosition: [1, 0], playerKeys: 0, hasMasterKey: false, openedChests: [], openedDoors: [], keyItems: ["Pegasus"], timesCleared: 1, bloodMoons: 2 });
  });

  it("starts every other hero's run in that temple over too", async () => {
    const saved = await progress.getProgress(OTHER, ID);
    expect(saved).toMatchObject({ currentLevel: "1F", currentPosition: [1, 0], playerKeys: 0, hasMasterKey: false, openedChests: [], keyItems: ["Pegasus"] });
  });

  it("drops a run the engine still holds in memory on the old rooms, so it is not saved over the fresh start", async () => {
    temples.forgetTempleRun(ID);
    await storeOldSeed();
    await saveOldRun(HERO);
    registerTemple(ID, oldLayout, { force: true });
    expect(temples.initTemple(ID, undefined, undefined, HERO)).toBe(true);
    await temples.whenProgressReady(ID);
    expect(temples.getTempleState(ID)).toMatchObject({ currentLevel: "2F", currentPosition: [3, 4], playerKeys: 1 });

    const report = await importAllTempleLayouts();
    expect(report[ID]).toBe("refresh");
    expect(temples.getTempleState(ID)).toBeUndefined();

    await ensureTempleFresh(ID);
    expect(temples.initTemple(ID, undefined, undefined, HERO)).toBe(true);
    await temples.whenProgressReady(ID);
    expect(temples.getTempleState(ID)).toMatchObject({ currentLevel: "1F", currentPosition: [1, 0], playerKeys: 0, hasMasterKey: false });
  });
});
