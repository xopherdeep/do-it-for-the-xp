/**
 * The blood moon over a hero's run in memory (TempleSystem.bloodMoon, and the scheduled moon that falls due):
 * - "rise now" saves the reset first and only then swaps the run, so a storage that fails leaves the hero's run standing;
 * - a moon that falls due while the run stays in memory (the screen closed, the app open) rises when the hero is
 *   back in the temple, not only when their progress is read from storage.
 *
 * Only the browser's storage is faked (in memory, and it can be made to fail or to wait on a write).
 */
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { TempleHydrator } from "./helpers/dslTemple";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { nextWeekly } from "@/lib/engine/core/dungeons/bloodMoonSchedule";

// Prefixed `mock` so the hoisted factory below may reach it when a write happens
const mockStorage = { failNext: 0, hold: Promise.resolve() as Promise<void>, writes: 0 };

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
      mockStorage.writes++;
      // Decided when the write is asked for, so it does not depend on when the test looks away
      const fails = mockStorage.failNext > 0;
      if (fails) mockStorage.failNext--;
      await mockStorage.hold;
      if (fails) throw new Error("the disk is full");
      this.rows.set(key, JSON.parse(JSON.stringify(value)));
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
const PAST = "2026-10-01T06:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";

const db = getTempleProgressDb();
const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();

// Both singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `moon-temple-${++counter}`;

afterEach(() => {
  mockStorage.failNext = 0;
  mockStorage.hold = Promise.resolve();
});

/** The entrance and two halls on one floor */
const run = () => {
  const id = nextId();
  dungeons.registerDungeon(TempleHydrator.hydrate("EXIT R000 R000", id, id));
  return id;
};

/** Open the temple for the hero and play a little: a key found, a step east, all saved */
const playALittle = async (id: string) => {
  temples.initTemple(id, [0, 0], undefined, HERO);
  await temples.whenProgressReady(id);
  temples.addKey(id);
  expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
  await temples.flushProgress();
};

/** Wait until `condition` holds, letting the pending storage work run */
const until = async (condition: () => boolean) => {
  for (let tries = 0; tries < 50 && !condition(); tries++) await new Promise((resolve) => setTimeout(resolve, 0));
  expect(condition()).toBe(true);
};

describe("TempleSystem.bloodMoon when the reset cannot be saved", () => {
  it("leaves the hero's run standing, still theirs and still saving", async () => {
    const id = run();
    await playALittle(id);
    mockStorage.failNext = 1; // the reset's write

    const entry = await temples.bloodMoon(id, HERO);

    expect(entry).toBeNull();
    expect(temples.getHeroId(id)).toBe(HERO);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1, currentLevel: "1F", currentPosition: [0, 1] });
    expect(temples.bloodMoonRose(id)).toBe(false); // no moon rose, nobody is told
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true); // the hero is not stranded

    // The record is as it was, and the run saves again
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 1, bloodMoons: 0, currentPosition: [0, 1] });
    await temples.flushProgress();
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 1, bloodMoons: 0, currentPosition: [0, 2] });
  });

  it("keeps what the hero did while the failed save was on its way", async () => {
    const id = run();
    await playALittle(id);
    let release!: () => void;
    mockStorage.hold = new Promise<void>((resolve) => (release = resolve));
    mockStorage.failNext = 1;
    const writesBefore = mockStorage.writes;

    const pending = temples.bloodMoon(id, HERO);
    await until(() => mockStorage.writes > writesBefore); // the reset is being written
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
    release();

    expect(await pending).toBeNull();
    await temples.flushProgress();
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 1, currentPosition: [0, 2] });
  });
});

describe("TempleSystem.bloodMoon when it can", () => {
  it("starts the run over from the reset record", async () => {
    const id = run();
    await playALittle(id);

    const entry = await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(entry).toMatchObject({ playerKeys: 0, bloodMoons: 1, currentPosition: [0, 1] });
    expect(temples.getHeroId(id)).toBe(HERO);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, bloodMoons: 1, currentPosition: [0, 1] });
    expect(temples.bloodMoonRose(id)).toBe(true);
  });

  it("is not undone by the old run saving while the reset is on its way", async () => {
    const id = run();
    await playALittle(id);
    let release!: () => void;
    mockStorage.hold = new Promise<void>((resolve) => (release = resolve));
    const writesBefore = mockStorage.writes;

    const pending = temples.bloodMoon(id, HERO);
    await until(() => mockStorage.writes > writesBefore); // the reset is being written
    temples.addKey(id); // the hero still acts: this save must not land after the reset
    release();
    await pending;
    await temples.whenProgressReady(id);
    await temples.flushProgress();

    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 0, bloodMoons: 1 });
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, bloodMoons: 1 });
  });
});

describe("a due blood moon and a run that stays in memory", () => {
  /** The hero's screen closes and opens again: the temple screen runs initTemple for them */
  const comeBack = async (id: string) => {
    expect(temples.initTemple(id, [0, 0], undefined, HERO)).toBe(true);
    await temples.whenProgressReady(id);
  };

  it("rises when the hero is back in the temple, without a reload or another hero in between", async () => {
    const id = run();
    await playALittle(id);
    await temples.scheduleBloodMoon(id, HERO, PAST); // the run in memory learns the date too

    await comeBack(id);

    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.bloodMoonRose(id)).toBe(false); // said once
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, bloodMoons: 1, currentPosition: [0, 1] });
    expect(temples.getHeroId(id)).toBe(HERO);

    await temples.flushProgress();
    const saved = await db.getProgress(HERO, id);
    expect(saved).toMatchObject({ playerKeys: 0, bloodMoons: 1 });
    expect(saved && "bloodMoonAt" in saved).toBe(false); // spent, and a single night does not come back
  });

  it("does not rise again on the next visit", async () => {
    const id = run();
    await playALittle(id);
    await temples.scheduleBloodMoon(id, HERO, PAST);
    await comeBack(id);
    expect(temples.bloodMoonRose(id)).toBe(true);

    temples.addKey(id);
    await comeBack(id);

    expect(temples.bloodMoonRose(id)).toBe(false);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1, bloodMoons: 1 });
  });

  it("sets a weekly moon a week on from the one spent", async () => {
    const id = run();
    await playALittle(id);
    await temples.scheduleBloodMoon(id, HERO, PAST);
    await temples.setBloodMoonEvery(id, HERO, "weekly");

    await comeBack(id);
    await temples.flushProgress();

    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.getTempleState(id)).toMatchObject({ bloodMoons: 1, bloodMoonEvery: "weekly", bloodMoonAt: nextWeekly(PAST) });
    expect(await db.getProgress(HERO, id)).toMatchObject({ bloodMoons: 1, bloodMoonAt: nextWeekly(PAST) });
  });

  it("leaves a moon that is not due yet alone", async () => {
    const id = run();
    await playALittle(id);
    await temples.scheduleBloodMoon(id, HERO, FUTURE);

    await comeBack(id);

    expect(temples.bloodMoonRose(id)).toBe(false);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1, bloodMoons: 0, currentPosition: [0, 1] });
  });

  it("leaves the run of a hero without a moon alone", async () => {
    const id = run();
    await playALittle(id);

    await comeBack(id);

    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1, currentPosition: [0, 1] });
  });
});
