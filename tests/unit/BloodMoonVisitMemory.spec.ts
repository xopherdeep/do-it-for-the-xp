/**
 * A blood moon over a hero's run gives back what the hero took in the temple's rooms: the key room hands out its key
 * again, a riddle re-locks like a door, a hunt can be made again, and what a visit remembered (a spring drunk, a camp
 * made) is forgotten. The map and the compass the hero holds stay theirs. Two heroes in one temple keep apart.
 * Only the browser's storage is faked; TempleProgressDb and the temple system are the real ones.
 */
import { createPinia, setActivePinia } from "pinia";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import {
  answerRiddle,
  buyWare,
  hasHappened,
  rememberOnce,
  resetVisitMemory,
  roomActions,
  roomKey,
  type RoomContext,
  type RoomOutcome,
} from "@/lib/services/temples/RoomInteractions";
import { forgetVisits, templeKey } from "@/lib/services/temples/roomInteractions/visitMemory";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { addHero, contextAt, dungeons, HERO, makeTemple, temples } from "./templeFixtures";

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
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
}));

const OTHER_HERO = "hero-2";
const PAST = "2026-10-01T06:00:00.000Z";
const db = getTempleProgressDb();

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});

const labels = (sheet: { actions: Array<{ label: string }> }) => sheet.actions.map((action) => action.label);
const run = async (sheet: ReturnType<typeof roomActions>): Promise<RoomOutcome> => sheet.actions[0].run();

/** The entrance, a key room, a hall behind a small lock, a riddle room behind a riddle, a hall. */
const windTemple = (extra: Record<string, Room> = {}) =>
  makeTemple(
    {
      E: { type: "entrance" },
      K: { type: "key", content: { keyId: "key1" } },
      A: { type: "empty", locked: { east: true } },
      P: { type: "puzzle", content: { puzzleType: "stonePillars" }, locked: { east: true } },
      N: { type: "empty", locked: { west: true } },
      ...extra,
    },
    [["E", "K", "A", "P", "N"]]
  );

const KEY_ROOM: [number, number] = [0, 1];
const HALL: [number, number] = [0, 2];
const PUZZLE_ROOM: [number, number] = [0, 3];

/** Open the temple for a hero at `position` and wait for their save to be read. */
const openFor = async (id: string, userId = HERO, position: [number, number] = KEY_ROOM) => {
  await temples.flushProgress(); // the hero who leaves has their run saved before the next one is read
  temples.initTemple(id, position, undefined, userId);
  await temples.whenProgressReady(id);
};

const sheetAt = (id: string, position: [number, number], extra: Partial<RoomContext> = {}) =>
  roomActions(dungeons.getRoom(id, position), contextAt(id, position, extra));

/** Take the key of the key room, walk to the hall and spend it on the lock east of it. */
const takeKeyAndOpenDoor = async (id: string) => {
  await run(sheetAt(id, KEY_ROOM));
  expect(temples.moveToPosition(id, HALL, "east")).toBe(true);
  expect(temples.unlockDoor(id, HALL, "east")).toBe(true);
};

describe("a blood moon the Game Master raises at once", () => {
  it("gives the key room its key back, and the door its lock", async () => {
    const id = windTemple();
    await openFor(id);
    await takeKeyAndOpenDoor(id);
    expect(sheetAt(id, KEY_ROOM).header).toBe("Nothing left here.");
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0 });

    await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(temples.doorKind(id, HALL, "east")).toBe("locked");
    const sheet = sheetAt(id, KEY_ROOM);
    expect(sheet.header).toBe("A key glints in the dust.");
    expect(labels(sheet)).toEqual(["Take it"]);
    expect((await run(sheet)).message).toBe("You take a small key.");
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });
    expect(sheetAt(id, KEY_ROOM).header).toBe("Nothing left here."); // and only once again
  });

  it("re-locks a solved riddle like a door", async () => {
    const id = windTemple();
    await openFor(id, HERO, PUZZLE_ROOM);
    const room = dungeons.getRoom(id, PUZZLE_ROOM)!;
    expect(answerRiddle(room, contextAt(id, PUZZLE_ROOM), 2).message).toBe("The glyphs fade. A door unlocks.");
    expect(sheetAt(id, PUZZLE_ROOM).header).toBe("The glyphs have faded.");

    await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(dungeons.getRoom(id, PUZZLE_ROOM)!.locked!.east).toBe(true);
    expect(sheetAt(id, PUZZLE_ROOM).header).toBe("Glyphs cover the wall.");
    const again = answerRiddle(dungeons.getRoom(id, PUZZLE_ROOM)!, contextAt(id, PUZZLE_ROOM), 2);
    expect(again.message).toBe("The glyphs fade. A door unlocks.");
    expect(dungeons.getRoom(id, PUZZLE_ROOM)!.locked!.east).toBe(false);
  });

  it("forgets what the visit remembered: a spring drunk, a camp made", async () => {
    const id = windTemple();
    await openFor(id);
    const ctx = contextAt(id, KEY_ROOM);
    rememberOnce(roomKey(ctx, "spring"));
    rememberOnce(roomKey(ctx, "camp"));

    await temples.bloodMoon(id, HERO);

    expect(hasHappened(roomKey(ctx, "spring"))).toBe(false);
    expect(hasHappened(roomKey(ctx, "camp"))).toBe(false);
  });

  it("keeps the map and the compass the hero holds, and the rooms that gave them stay empty", async () => {
    const id = makeTemple(
      { E: { type: "entrance" }, M: { type: "map" }, C: { type: "compass" } },
      [["E", "M", "C"]]
    );
    const [mapRoom, compassRoom] = [KEY_ROOM, HALL];
    await openFor(id);
    await run(sheetAt(id, mapRoom));
    temples.moveToPosition(id, compassRoom, "east");
    await run(sheetAt(id, compassRoom));
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: true, hasCompass: true });

    await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(temples.getTempleState(id)).toMatchObject({ hasMap: true, hasCompass: true });
    expect(sheetAt(id, mapRoom).header).toBe("Nothing left here.");
    expect(sheetAt(id, compassRoom).header).toBe("Nothing left here.");
  });

  it("restocks the shop's special", async () => {
    const id = makeTemple(
      { E: { type: "entrance" }, S: { type: "shop", content: { specialItem: "EarthquakeScroll" } } },
      [["E", "S"]]
    );
    await openFor(id);
    const room = dungeons.getRoom(id, KEY_ROOM)!;
    const ctx = contextAt(id, KEY_ROOM);
    expect(buyWare(room, ctx, "special:EarthquakeScroll")).toMatchObject({ sound: "buyItem" });
    expect(buyWare(room, ctx, "special:EarthquakeScroll")).toMatchObject({ message: expect.stringMatching(/Sold out/) });

    await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(buyWare(room, ctx, "special:EarthquakeScroll")).toMatchObject({ sound: "buyItem" });
  });

  it("starts over a hero who is not in the temple, and leaves the one who is alone", async () => {
    const id = windTemple();
    await openFor(id, HERO);
    await run(sheetAt(id, KEY_ROOM));
    rememberOnce(roomKey(contextAt(id, KEY_ROOM), "spring"));
    await openFor(id, OTHER_HERO); // the first hero has left; the temple is the other's now
    const others = contextAt(id, KEY_ROOM, { userId: OTHER_HERO });
    rememberOnce(roomKey(others, "spring"));

    await temples.bloodMoon(id, HERO);

    expect(hasHappened(roomKey(contextAt(id, KEY_ROOM), "spring"))).toBe(false);
    expect(hasHappened(roomKey(others, "spring"))).toBe(true);
    expect(temples.getHeroId(id)).toBe(OTHER_HERO);

    await openFor(id, HERO);
    expect(sheetAt(id, KEY_ROOM).header).toBe("A key glints in the dust.");
  });
});

describe("a blood moon that has come due while the hero was away", () => {
  it("rises at their next entry and hands the key room back", async () => {
    const id = windTemple();
    await openFor(id);
    await takeKeyAndOpenDoor(id);
    const ctx = contextAt(id, KEY_ROOM);
    rememberOnce(roomKey(ctx, "spring"));
    await openFor(id, OTHER_HERO); // the hero leaves the temple; their run is saved
    await temples.scheduleBloodMoon(id, HERO, PAST);

    await openFor(id, HERO);

    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0, bloodMoons: 1 });
    expect(temples.doorKind(id, HALL, "east")).toBe("locked");
    expect(sheetAt(id, KEY_ROOM).header).toBe("A key glints in the dust.");
    expect(hasHappened(roomKey(ctx, "spring"))).toBe(false);
  });

  it("is saved: the key taken again after the moon is not handed out a third time", async () => {
    const id = windTemple();
    await openFor(id);
    await run(sheetAt(id, KEY_ROOM));
    await temples.scheduleBloodMoon(id, HERO, PAST);
    temples.forgetTempleRun(id); // the app closes
    resetVisitMemory();

    await openFor(id, HERO);
    await run(sheetAt(id, KEY_ROOM));
    await temples.flushProgress();
    expect(await db.getProgress(HERO, id)).toMatchObject({ playerKeys: 1, bloodMoons: 1 });

    temples.forgetTempleRun(id);
    resetVisitMemory();
    await openFor(id, HERO);
    expect(sheetAt(id, KEY_ROOM).header).toBe("Nothing left here.");
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });
  });
});

describe("two heroes in one temple", () => {
  it("each take the key once, and each have theirs back when they return", async () => {
    const id = windTemple();
    await openFor(id, HERO);
    await run(sheetAt(id, KEY_ROOM));
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });

    await openFor(id, OTHER_HERO);
    const secondHero = { userId: OTHER_HERO };
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 0 });
    expect(sheetAt(id, KEY_ROOM, secondHero).header).toBe("A key glints in the dust.");
    await run(sheetAt(id, KEY_ROOM, secondHero));
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });

    await openFor(id, HERO);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });
    expect(sheetAt(id, KEY_ROOM).header).toBe("Nothing left here.");

    await openFor(id, OTHER_HERO);
    expect(sheetAt(id, KEY_ROOM, secondHero).header).toBe("Nothing left here.");
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });
  });
});

describe("forgetVisits", () => {
  const at = (userId: string, templeId: string): RoomContext => ({ userId, templeId, level: "1F", position: [0, 1] });

  it("forgets one hero's visit to one temple, or every hero's, and leaves the rest alone", () => {
    const remember = () => {
      resetVisitMemory();
      [at("u1", "t1"), at("u2", "t1"), at("u1", "t2")].forEach((ctx) => rememberOnce(roomKey(ctx, "spring")));
      rememberOnce(templeKey("u1", "t1", "bottles"));
    };
    const left = () =>
      [roomKey(at("u1", "t1"), "spring"), roomKey(at("u2", "t1"), "spring"), roomKey(at("u1", "t2"), "spring"), templeKey("u1", "t1", "bottles")].map(
        hasHappened
      );

    remember();
    forgetVisits("t1", "u1");
    expect(left()).toEqual([false, true, true, false]); // the temple-wide memory goes with the hero's visit

    remember();
    forgetVisits("t1");
    expect(left()).toEqual([false, false, true, false]);

    remember();
    forgetVisits("never-visited");
    expect(left()).toEqual([true, true, true, true]);
  });
});
