/**
 * The blood moon (section 5 of docs/Temple-Generation-Contract.md): resetTempleProgress forgets a run and
 * keeps what the hero earned; the Game Master schedules it on the saved record; TempleSystem fires it at
 * the hero's next entry or at once.
 *
 * Only the browser's storage is faked (in memory); TempleProgressDb and TempleSystem are the real ones.
 */
import { getTempleProgressDb, type TempleProgressEntry } from "@/lib/databases/TempleProgressDb";
import { TEMPLE_CLEARED_KEY } from "@/lib/engine/core/dungeons/TempleSystem";
import { bloodMoonLine, isBloodMoonDue, resetTempleProgress } from "@/lib/engine/core/dungeons/templeReset";
import { nextWeekly } from "@/lib/engine/core/dungeons/bloodMoonSchedule";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { HERO, dungeons, makeTemple, temples } from "./templeFixtures";

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

const db = getTempleProgressDb();

const PAST = "2026-10-01T06:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";

/** A run with everything in it, after one clear and two blood moons, with a third scheduled. */
const fullRun = (overrides: Partial<TempleProgressEntry> = {}): TempleProgressEntry => ({
  userId: HERO,
  templeId: "wind-temple",
  currentLevel: "2F",
  currentPosition: [3, 4],
  hasMap: true,
  hasCompass: true,
  playerKeys: 2,
  visitedRooms: ["1F:0,0", "1F:0,1", "2F:3,4"],
  clearedRooms: ["1F:0,1", TEMPLE_CLEARED_KEY],
  hasMasterKey: true,
  openedDoors: ["1F:0,0>east"],
  openedChests: ["1F:0,2"],
  keyItems: ["lantern", "pegasus"],
  timesCleared: 1,
  bloodMoons: 2,
  bloodMoonAt: PAST,
  updatedAt: "2026-10-09T20:00:00.000Z",
  ...overrides,
});

describe("resetTempleProgress", () => {
  it("forgets the run and keeps what the hero earned", () => {
    const reset = resetTempleProgress(fullRun());

    expect(reset).toEqual({
      ...fullRun(),
      playerKeys: 0,
      hasMasterKey: false,
      clearedRooms: [TEMPLE_CLEARED_KEY],
      visitedRooms: ["1F:0,0", "2F:3,4"],
      openedDoors: [],
      openedChests: [],
      bloodMoons: 3,
      bloodMoonAt: undefined,
    });
    expect("bloodMoonAt" in reset).toBe(false);
    // Spelled out: the map, the compass, the key items, the clears and where the hero stands stay
    expect(reset).toMatchObject({ hasMap: true, hasCompass: true, keyItems: ["lantern", "pegasus"], timesCleared: 1, currentLevel: "2F", currentPosition: [3, 4] });
  });

  it("leaves no cleared badge where there was none", () => {
    expect(resetTempleProgress(fullRun({ clearedRooms: ["1F:0,1"] })).clearedRooms).toEqual([]);
  });

  it("does not touch the record it was given", () => {
    const given = fullRun();
    const copy = fullRun();

    resetTempleProgress(given);

    expect(given).toEqual(copy);
  });

  it("counts the first blood moon of a record saved before there were any", () => {
    const old = fullRun({ bloodMoons: undefined as unknown as number });
    expect(resetTempleProgress(old).bloodMoons).toBe(1);
  });
});

describe("isBloodMoonDue", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("is due once the scheduled time has come, and not before", () => {
    expect(isBloodMoonDue({ bloodMoonAt: PAST }, now)).toBe(true);
    expect(isBloodMoonDue({ bloodMoonAt: now.toISOString() }, now)).toBe(true);
    expect(isBloodMoonDue({ bloodMoonAt: FUTURE }, now)).toBe(false);
  });

  it("is never due without a date", () => {
    expect(isBloodMoonDue({}, now)).toBe(false);
    expect(isBloodMoonDue({ bloodMoonAt: "" }, now)).toBe(false);
    expect(isBloodMoonDue({ bloodMoonAt: "someday" }, now)).toBe(false);
  });
});

it("names the temple in the blood moon line", () => {
  expect(bloodMoonLine("the Wind Temple")).toBe("The blood moon rises over the Wind Temple.");
});

describe("TempleProgressDb.scheduleBloodMoon (the Game Master's action)", () => {
  it("writes the date onto the hero's record, normalised, and takes it back with null", async () => {
    await db.saveProgress(fullRun({ templeId: "schedule-temple", bloodMoonAt: undefined }));

    const scheduled = await db.scheduleBloodMoon(HERO, "schedule-temple", "2026-10-17T06:00:00+02:00");
    expect(scheduled?.bloodMoonAt).toBe("2026-10-17T04:00:00.000Z");
    expect((await db.getProgress(HERO, "schedule-temple"))?.bloodMoonAt).toBe("2026-10-17T04:00:00.000Z");
    expect(scheduled).toMatchObject({ playerKeys: 2, hasMasterKey: true, clearedRooms: ["1F:0,1", TEMPLE_CLEARED_KEY] }); // nothing else moves yet

    const cancelled = await db.scheduleBloodMoon(HERO, "schedule-temple", null);
    expect(cancelled && "bloodMoonAt" in cancelled).toBe(false);
  });

  it("has nothing to schedule for a hero who never entered the temple", async () => {
    expect(await db.scheduleBloodMoon(HERO, "never-entered", FUTURE)).toBeNull();
  });

  it("refuses a date that is not one", async () => {
    await expect(db.scheduleBloodMoon(HERO, "schedule-temple", "next tuesday")).rejects.toThrow();
  });
});

describe("TempleSystem and the blood moon", () => {
  const MONSTER: Room = { type: "monster", content: { lockOnEnter: true } };
  const SEALED = { north: true, south: true, east: true, west: true };

  /** The entrance, a hall with a locked door east, a monster room that seals on entry. */
  const run = () => makeTemple({ E: { type: "entrance" }, A: { type: "empty", locked: { east: true } }, M: MONSTER }, [["E", "A", "M"]]);

  /** Open the temple for the hero and play through it: a key spent on the door, the monster beaten, the master key found. */
  const playThrough = async (id: string) => {
    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);
    temples.addKey(id);
    temples.addKey(id);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
    temples.markRoomCleared(id, "1F", [0, 2]);
    temples.grantMasterKey(id);
    await temples.flushProgress();
  };

  it("fires at once for the Game Master: the record and the run in memory start over, the hero where they stand", async () => {
    const id = run();
    await playThrough(id);
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 1, hasMasterKey: true, clearedRooms: ["1F:0,2"], openedDoors: ["1F:0,1>east"], bloodMoons: 0 });

    const entry = await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(entry).toMatchObject({ playerKeys: 0, hasMasterKey: false, clearedRooms: [], openedDoors: [], bloodMoons: 1, currentLevel: "1F", currentPosition: [0, 2] });
    expect(entry?.visitedRooms).toEqual(["1F:0,0", "1F:0,1"]);
    expect(await db.getProgress(HERO, id)).toEqual(entry);

    const state = temples.getTempleState(id)!;
    expect(state).toMatchObject({ playerKeys: 0, hasMasterKey: false, currentPosition: [0, 2], bloodMoons: 1 });
    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(false);
    expect(temples.doorKind(id, [0, 1], "east")).toBe("locked"); // the door the key opened is locked again
    // The beast is back in the room the hero stands in: the doors are sealed until it is beaten
    expect(dungeons.getRoom(id, [0, 2])?.locked).toEqual(SEALED);
    expect(temples.getHeroId(id)).toBe(HERO);
    // The hero hears of it when the screen next mounts for them, once
    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.bloodMoonRose(id)).toBe(false);
  });

  it("keeps the toast of a moon raised at once for the hero it reset, not for whoever enters next", async () => {
    const id = run();
    await playThrough(id);
    temples.initTemple(id, [0, 0], undefined, "somebody-else"); // the hero has left; another is in the temple
    await temples.whenProgressReady(id);

    expect(await temples.bloodMoon(id, HERO)).toMatchObject({ bloodMoons: 1 });
    expect(temples.bloodMoonRose(id)).toBe(false); // not for somebody-else

    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);
    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, bloodMoons: 1 });
  });

  it("does nothing for a hero without progress", async () => {
    const id = run();
    expect(await temples.bloodMoon(id, "nobody")).toBeNull();
  });

  it("rises at the hero's next entry once the scheduled time has come, and says so once", async () => {
    const id = run();
    await playThrough(id);
    expect(await temples.scheduleBloodMoon(id, HERO, PAST)).toMatchObject({ bloodMoonAt: PAST });

    // The hero leaves and comes back: the temple screen opens the temple for them again
    temples.initTemple(id, [0, 0], undefined, "somebody-else"); // another hero's visit puts the run away
    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);

    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.bloodMoonRose(id)).toBe(false);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, hasMasterKey: false, currentPosition: [0, 2], bloodMoons: 1 });
    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(false);

    await temples.flushProgress();
    const saved = await db.getProgress(HERO, id);
    expect(saved).toMatchObject({ playerKeys: 0, hasMasterKey: false, clearedRooms: [], bloodMoons: 1 });
    expect(saved && "bloodMoonAt" in saved).toBe(false);
  });

  it("re-schedules a weekly moon a week on from the one that fired at entry", async () => {
    const id = run();
    await playThrough(id);
    await temples.scheduleBloodMoon(id, HERO, PAST);
    expect(await temples.setBloodMoonEvery(id, HERO, "weekly")).toMatchObject({ bloodMoonAt: PAST, bloodMoonEvery: "weekly" });

    temples.initTemple(id, [0, 0], undefined, "somebody-else");
    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);
    await temples.flushProgress();

    expect(temples.bloodMoonRose(id)).toBe(true);
    const saved = await db.getProgress(HERO, id);
    expect(saved).toMatchObject({ playerKeys: 0, bloodMoons: 1, bloodMoonEvery: "weekly", bloodMoonAt: nextWeekly(PAST) });
    expect(Date.parse(saved!.bloodMoonAt!)).toBeGreaterThan(Date.now());
    expect(temples.getTempleState(id)).toMatchObject({ bloodMoonEvery: "weekly", bloodMoonAt: nextWeekly(PAST) });
  });

  it("gives a weekly moon with no date its first night a week from now, and a single night takes the cadence off", async () => {
    const id = run();
    await playThrough(id);

    const weekly = await temples.setBloodMoonEvery(id, HERO, "weekly");
    expect(weekly?.bloodMoonEvery).toBe("weekly");
    expect(Date.parse(weekly!.bloodMoonAt!) - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(temples.getTempleState(id)).toMatchObject({ bloodMoonEvery: "weekly", bloodMoonAt: weekly!.bloodMoonAt });

    const single = await temples.setBloodMoonEvery(id, HERO, null);
    expect(single && "bloodMoonEvery" in single).toBe(false);
    expect(single?.bloodMoonAt).toBe(weekly?.bloodMoonAt); // the date stays, only the cadence goes
    expect(await temples.setBloodMoonEvery(id, "nobody", "weekly")).toBeNull();
  });

  it("raised at once over a weekly moon, the next one is a week on", async () => {
    const id = run();
    await playThrough(id);
    await temples.setBloodMoonEvery(id, HERO, "weekly");
    const first = (await db.getProgress(HERO, id))!.bloodMoonAt!;

    const entry = await temples.bloodMoon(id, HERO);
    expect(entry).toMatchObject({ bloodMoons: 1, bloodMoonEvery: "weekly", bloodMoonAt: first }); // first is still to come: kept
  });

  it("waits for a moon scheduled in the future, and the date survives the next save", async () => {
    const id = run();
    await playThrough(id);
    await temples.scheduleBloodMoon(id, HERO, FUTURE);

    temples.addKey(id); // the run goes on and is saved again
    await temples.flushProgress();
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 2, bloodMoonAt: FUTURE });

    temples.initTemple(id, [0, 0], undefined, "somebody-else");
    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);

    expect(temples.bloodMoonRose(id)).toBe(false);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 2, hasMasterKey: true, bloodMoonAt: FUTURE });
    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(true);
    expect(temples.doorKind(id, [0, 1], "east")).toBe("open"); // the opened door was read back open
  });
});
