/**
 * Temple runs follow the quest board (docs/Quest-Rooms-Spec.md 7.1, 7.2, 7.10, 7.11): a quest room that is not
 * lurking counts as cleared, a lurking one does not, dormant and classic rooms keep the classic rules; a room seals on
 * entry while it is not cleared; a blood moon leaves quest rooms to their schedules.
 *
 * The real TempleSystem, TempleProgressDb and QuestEngine. Only the storage is faked: the progress records in memory,
 * the quests and the quest log as plain arrays (the same seam questRooms.spec uses), so the run reads exactly what the
 * board reads. Lives apart from TempleSystemCleared.spec, which loads the temple screen and with it every quest store.
 */
import { createPinia, setActivePinia } from "pinia";
import { addDays } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dayKeyOf } from "@/lib/engine/quests/QuestSchedule";
import { TEMPLE_CLEARED_KEY } from "@/lib/engine/core/dungeons/TempleSystem";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
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

const mockGetTasks = jest.fn();
const mockGetEntries = jest.fn();
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTasks() {
      return mockGetTasks();
    }
  },
  achievementStorage: {},
}));
jest.mock("@/lib/databases/QuestLogDb", () => ({
  getQuestLogDb: () => ({ getEntries: () => mockGetEntries() }),
}));

// The hero's item effects ride on their profile in the user store
const mockHeroes: Record<string, unknown> = {};
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ users: mockHeroes, getUserById: (id: string) => mockHeroes[id] }),
}));
jest.mock("@/lib/services/notifications/notify", () => ({ bloodMoon: () => null, notify: () => null }));

const db = getTempleProgressDb();
const MIA = "hero-2";
const SEALED = { north: true, south: true, east: true, west: true };
const OPEN = { north: false, south: false, east: false, west: false };

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "individual",
    assignee: [HERO],
    basicSchedule: "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    showDailyUntilComplete: false,
    startsOn: "2026-01-01T00:00:00",
    endsOn: "",
    dueByTime: "",
    difficulty: 2,
    beastId: `beast-${id}`,
    ...overrides,
  }) as unknown as Achievement;

/** A claim of the hero's, approved unless told otherwise, made a moment ago */
const entry = (questId: string, overrides: Partial<QuestLogEntry> = {}): QuestLogEntry => {
  const completedAt = new Date().toISOString();
  return {
    id: `entry-${questId}-${Math.random()}`,
    questId,
    questName: questId,
    userId: HERO,
    completedAt,
    dayKey: dayKeyOf(new Date(completedAt)),
    status: "approved",
    source: "claim",
    rewards: { xp: 0, gp: 0, ap: 0 },
    rewardsApplied: true,
    ...overrides,
  } as QuestLogEntry;
};

/** What the quest store and the quest log hold */
const world = (quests: Achievement[], entries: QuestLogEntry[] = []) => {
  mockGetTasks.mockResolvedValue(quests);
  mockGetEntries.mockResolvedValue(entries);
};

const item = (q: Achievement, status: QuestBoardItem["status"] = "open", pending = false): QuestBoardItem =>
  ({ quest: q, status, progress: null, pending, overdue: false }) as QuestBoardItem;

const template = (beastId: string): RoomQuestTemplate => ({ beastId, difficulty: 2, basicSchedule: "daily" });
const questRoom = (content: Room["content"]): Room => ({ type: "monster", content: { lockOnEnter: true, ...content } });
const CLASSIC: Room = { type: "monster", content: { lockOnEnter: true, beasts: ["beast-classic"] } };

const cleared = (id: string, col: number, level = "1F") => temples.isRoomCleared(id, level, [0, col]);

/** Open the temple for a hero the way the temple screen does, and wait until the save and the board are in. */
const openFor = async (id: string, start: [number, number] = [0, 0], userId = HERO) => {
  temples.initTemple(id, start, undefined, userId);
  await temples.whenProgressReady(id);
  await temples.whenQuestRoomsReady(id);
};

beforeAll(() => setActivePinia(createPinia()));

beforeEach(() => {
  world([]);
  for (const key of Object.keys(mockHeroes)) delete mockHeroes[key];
});

describe("TempleSystem.syncQuestRooms (7.1)", () => {
  /**
   * One floor: [0,0] entrance, then the Game Master's picks: [0,1] an open quest, [0,2] a done one, [0,3] one with a
   * claim waiting, [0,4] one not due, [0,5] Mia's, [0,6] a deleted one with no template; [0,7] a template nobody fills
   * (dormant), [0,8] a classic beast room.
   */
  const everyKind = () =>
    makeTemple(
      {
        E: { type: "entrance" },
        OPEN: questRoom({ questId: "q-open" }),
        DONE: questRoom({ questId: "q-done" }),
        HELD: questRoom({ questId: "q-held" }),
        AWAY: questRoom({ questId: "q-away" }),
        MIAS: questRoom({ questId: "q-mia" }),
        GONE: questRoom({ questId: "q-gone" }),
        DORM: questRoom({ quest: template("beast-nobody-has") }),
        C: CLASSIC,
      },
      [["E", "OPEN", "DONE", "HELD", "AWAY", "MIAS", "GONE", "DORM", "C"]]
    );
  const quests = {
    open: quest("q-open"),
    done: quest("q-done"),
    held: quest("q-held"),
    away: quest("q-away"),
    mia: quest("q-mia", { assignee: [MIA] }),
  };
  const board = () => ({
    heroId: HERO,
    board: [item(quests.open), item(quests.done, "done"), item(quests.held, "done", true), item(quests.away, "notDue")],
    liveQuests: Object.values(quests),
  });

  // The store holds the quests, nobody has done any: the board the run reads when it opens has the hero's four open
  beforeEach(() => world(Object.values(quests)));

  it("clears every quest room that is not lurking and takes the lurking ones out", async () => {
    const id = everyKind();
    await openFor(id);
    // Read when the run opened: the hero's four quests lurk, Mia's sleeps and the deleted one left an empty lair
    expect([1, 2, 3, 4, 5, 6].map((col) => cleared(id, col))).toEqual([false, false, false, false, true, true]);
    temples.markRoomCleared(id, "1F", [0, 1], HERO); // a win the board does not know of

    const sync = temples.syncQuestRooms(id, board());

    expect([1, 2, 3, 4, 5, 6].map((col) => cleared(id, col))).toEqual([false, true, true, true, true, true]);
    expect(sync.removed).toEqual(["1F:0,1"]);
    expect(sync.added.sort()).toEqual(["1F:0,2", "1F:0,3", "1F:0,4"]);
  });

  it("leaves dormant and classic rooms to the classic rules", async () => {
    const id = everyKind();
    await openFor(id);
    temples.markRoomCleared(id, "1F", [0, 8], HERO); // the classic beast was beaten

    temples.syncQuestRooms(id, board());

    expect(cleared(id, 7)).toBe(false); // the dormant room's beast waits, whatever the board says
    expect(cleared(id, 8)).toBe(true); // the classic win stands

    temples.markRoomCleared(id, "1F", [0, 7], HERO);
    temples.syncQuestRooms(id, { ...board(), board: [] });
    expect(cleared(id, 7)).toBe(true);
  });

  it("leaves a room whose quest cannot be read to the classic rules, and syncs the rest", async () => {
    const id = everyKind();
    await openFor(id);
    temples.markRoomCleared(id, "1F", [0, 1], HERO);
    const broken = { ...quests.open } as Achievement;
    Object.defineProperty(broken, "difficulty", {
      get() {
        throw new Error("not a number anyone can read");
      },
    });

    const sync = temples.syncQuestRooms(id, { ...board(), board: [item(broken), item(quests.done, "done")] });

    expect(cleared(id, 1)).toBe(true); // untouched
    expect(cleared(id, 2)).toBe(true);
    expect(sync.removed).toEqual([]);
  });

  it("never touches the temple's cleared badge", async () => {
    const id = everyKind();
    await openFor(id);
    temples.markTempleCleared(id);

    temples.syncQuestRooms(id, { ...board(), board: [], liveQuests: [] });

    expect(temples.isTempleCleared(id)).toBe(true);
  });

  it("keeps the board for the next sync, and ignores another hero's board", async () => {
    const id = everyKind();
    await openFor(id);
    temples.syncQuestRooms(id, board());
    expect(temples.getQuestBoard(id)?.heroId).toBe(HERO);

    temples.markRoomCleared(id, "1F", [0, 1], HERO);
    expect(temples.syncQuestRooms(id)).toEqual({ added: [], removed: ["1F:0,1"] }); // the board kept last

    const miasBoard = { heroId: MIA, board: [item(quests.mia, "done")], liveQuests: Object.values(quests) };
    expect(temples.syncQuestRooms(id, miasBoard)).toEqual({ added: [], removed: [] });
    expect(temples.getQuestBoard(id)?.heroId).toBe(HERO);
  });

  it("does nothing for a run that is not a hero's", () => {
    const id = everyKind();
    temples.initTemple(id); // no hero: the run lives in memory only

    expect(temples.syncQuestRooms(id, board())).toEqual({ added: [], removed: [] });
    expect(cleared(id, 2)).toBe(false);
  });

  it("opens the doors of the room the hero stands in once the board says its chore is done", async () => {
    const id = everyKind();
    await openFor(id);
    temples.syncQuestRooms(id, board());
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true); // the open quest: the doors seal
    expect(temples.getCurrentRoom(id)?.locked).toEqual(SEALED);

    temples.syncQuestRooms(id, { ...board(), board: [item(quests.open, "done")] }); // claimed on the board meanwhile

    expect(temples.getCurrentRoom(id)?.locked).toEqual(OPEN);
    expect(temples.moveToPosition(id, [0, 0], "west")).toBe(true);
  });

  it("saves what the sync changed with the hero's progress", async () => {
    const id = everyKind();
    await openFor(id);

    temples.syncQuestRooms(id, board());
    await temples.flushProgress();

    const saved = await db.getProgress(HERO, id);
    expect(saved?.clearedRooms.sort()).toEqual(["1F:0,2", "1F:0,3", "1F:0,4", "1F:0,5", "1F:0,6"]);
  });
});

describe("the run reads the hero's board", () => {
  /** [0,0] entrance, [0,1] a hall, [0,2] the dishes (picked), [0,3] a hall, [0,4] the weeds (template), [0,5] a classic beast */
  const temple = () =>
    makeTemple(
      {
        E: { type: "entrance" },
        H: { type: "empty" },
        DISH: questRoom({ questId: "q-dish" }),
        WEED: questRoom({ quest: template("beast-q-weed") }),
        C: CLASSIC,
      },
      [["E", "H", "DISH", "H", "WEED", "C"]]
    );
  const dish = quest("q-dish");
  const weed = quest("q-weed");

  it("when the temple opens for the hero", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish")]);

    await openFor(id);

    expect(cleared(id, 2)).toBe(true); // done today: nothing left but the smell
    expect(cleared(id, 4)).toBe(false); // the weeds lurk
    expect(cleared(id, 5)).toBe(false);
    expect(temples.getQuestBoard(id)?.board.map((row) => row.quest.id).sort()).toEqual(["q-dish", "q-weed"]);
  });

  it("over the save: a key kept from yesterday's clear does not hold today's beast", async () => {
    const id = temple();
    await db.saveProgress({
      userId: HERO,
      templeId: id,
      currentLevel: "1F",
      currentPosition: [0, 1],
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,4", "1F:0,5"],
      clearedRooms: ["1F:0,2", "1F:0,4", "1F:0,5"],
      hasMasterKey: false,
      openedDoors: [],
      openedChests: [],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
    });
    world([dish, weed], [entry("q-weed")]);

    await openFor(id);

    expect(cleared(id, 2)).toBe(false); // the dishes are due again
    expect(cleared(id, 4)).toBe(true);
    expect(cleared(id, 5)).toBe(true); // the classic win is the save's to keep
    await temples.flushProgress();
    expect((await db.getProgress(HERO, id))?.clearedRooms.sort()).toEqual(["1F:0,4", "1F:0,5"]);
  });

  it("with the hero's item effects: a snoozed chore is away", async () => {
    const id = temple();
    world([dish, weed]);
    mockHeroes[HERO] = { id: HERO, questEffects: { snoozedOn: { "q-dish": dayKeyOf(new Date()) } } };

    await openFor(id);

    expect(cleared(id, 2)).toBe(true);
    expect(cleared(id, 4)).toBe(false);
    expect(temples.getQuestBoard(id)?.effects).toEqual({ snoozedOn: { "q-dish": dayKeyOf(new Date()) } });
  });

  it("again when the temple screen opens a run already going (back from a battle)", async () => {
    const id = temple();
    world([dish, weed]);
    await openFor(id);
    expect(cleared(id, 2)).toBe(false);

    world([dish, weed], [entry("q-dish", { status: "pending", source: "battle" })]); // won, held for the Game Master
    temples.initTemple(id, [0, 2], undefined, HERO);
    await temples.whenQuestRoomsReady(id);

    expect(cleared(id, 2)).toBe(true);
  });

  it("leaves an open list room unsealed when its next chore lurks after a win", async () => {
    const a = quest("q-a");
    const b = quest("q-b");
    const id = makeTemple(
      { E: { type: "entrance" }, LIST: { type: "monster", content: { questIds: ["q-a", "q-b"] } } },
      [["E", "LIST"]]
    );
    world([a, b]);
    await openFor(id);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);

    world([a, b], [entry("q-a", { source: "battle" })]); // won a; b is still open
    temples.initTemple(id, [0, 1], undefined, HERO); // back from the battle
    await temples.whenQuestRoomsReady(id);

    expect(cleared(id, 1)).toBe(false); // b lurks
    expect(temples.getCurrentRoom(id)?.locked ?? {}).not.toEqual(SEALED);

    world([a, b], [entry("q-a", { source: "battle" }), entry("q-b")]); // b done too: nothing left in the room
    temples.initTemple(id, [0, 1], undefined, HERO);
    await temples.whenQuestRoomsReady(id);

    expect(cleared(id, 1)).toBe(true);
  });

  it("again on refreshQuestRooms: the beast is back when its window rolls over (7.10)", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish")]);
    await openFor(id);
    expect(cleared(id, 2)).toBe(true);

    const sync = await temples.refreshQuestRooms(id, addDays(new Date(), 1));

    expect(sync).toEqual({ added: [], removed: ["1F:0,2"] });
    expect(cleared(id, 2)).toBe(false);
  });

  it("a rejected claim stops counting: the beast is back at once", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish", { status: "pending" })]);
    await openFor(id);
    expect(cleared(id, 2)).toBe(true);

    world([dish, weed], [entry("q-dish", { status: "rejected" })]);
    await temples.refreshQuestRooms(id);

    expect(cleared(id, 2)).toBe(false);
  });

  it("a board that cannot be read leaves the rooms as the run knew them", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish")]);
    await openFor(id);

    mockGetEntries.mockRejectedValue(new Error("storage is not available"));
    expect(await temples.refreshQuestRooms(id)).toBeNull();

    expect(cleared(id, 2)).toBe(true);
    expect(temples.getQuestBoard(id)?.heroId).toBe(HERO);
  });

  it("is dropped when the run goes to another hero", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish")]);
    await openFor(id);

    temples.initTemple(id, [0, 0], undefined, MIA);
    expect(temples.getQuestBoard(id)?.heroId).not.toBe(HERO);
    await temples.whenProgressReady(id);
    await temples.whenQuestRoomsReady(id);

    expect(temples.getQuestBoard(id)?.heroId).toBe(MIA);
    expect(cleared(id, 2)).toBe(true); // the dishes are not Mia's: their beast sleeps here
  });

  it("follows a new layout at once: a quest room the Game Master adds to a temple in play", async () => {
    const id = temple();
    world([dish, weed], [entry("q-dish")]);
    await openFor(id);
    expect(cleared(id, 1)).toBe(false);

    const hall = dungeons.getDungeon(id)!;
    dungeons.registerDungeon({
      ...hall,
      rooms: { ...hall.rooms, H: questRoom({ questId: "q-dish" }) },
      visitedPositions: new Set<string>(),
    });
    temples.refreshRun(id);

    expect(cleared(id, 1)).toBe(true);
    expect(cleared(id, 3)).toBe(true); // the same hall symbol, the same quest
  });
});

describe("seals follow the cleared rooms (7.2)", () => {
  const temple = () =>
    makeTemple(
      { E: { type: "entrance" }, H: { type: "empty" }, DISH: questRoom({ questId: "q-dish" }), C: CLASSIC },
      [["E", "H", "DISH", "H", "C"]]
    );
  const dish = quest("q-dish");

  it("a restored beast seals the room again on the next entry, and the map keeps the room", async () => {
    const id = temple();
    world([dish], [entry("q-dish")]);
    await openFor(id);
    temples.moveToPosition(id, [0, 1], "east");
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
    expect(temples.getCurrentRoom(id)?.locked).toBeUndefined(); // done today: no fight, no seal
    temples.moveToPosition(id, [0, 1], "west");

    await temples.refreshQuestRooms(id, addDays(new Date(), 1)); // the next day
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);

    expect(temples.getCurrentRoom(id)?.locked).toEqual(SEALED);
    expect(temples.hasVisited(id, [0, 2])).toBe(true);
  });

  it("a hero back in a lurking room after a reload is held there; one whose chore is done walks out", async () => {
    const lurking = temple();
    await db.saveProgress({
      userId: HERO,
      templeId: lurking,
      currentLevel: "1F",
      currentPosition: [0, 2],
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      visitedRooms: ["1F:0,0", "1F:0,1", "1F:0,2"],
      clearedRooms: ["1F:0,2"], // yesterday's clear
      hasMasterKey: false,
      openedDoors: [],
      openedChests: [],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
    });
    world([dish]);
    await openFor(lurking);
    expect(temples.getTempleState(lurking)?.currentPosition).toEqual([0, 2]);
    expect(temples.getCurrentRoom(lurking)?.locked).toEqual(SEALED);

    const done = temple();
    await db.saveProgress({ ...(await db.getProgress(HERO, lurking))!, templeId: done, clearedRooms: [] });
    world([dish], [entry("q-dish")]);
    await openFor(done);
    expect(temples.getTempleState(done)?.currentPosition).toEqual([0, 2]);
    expect(temples.getCurrentRoom(done)?.locked).toBeUndefined();
  });
});

describe("blood moons leave quest rooms to their schedules (7.11)", () => {
  /** [0,0] entrance, [0,1] the dishes (picked), [0,2] a classic beast, [0,3] a template nobody fills (dormant) */
  const temple = () =>
    makeTemple(
      {
        E: { type: "entrance" },
        DISH: questRoom({ questId: "q-dish" }),
        C: CLASSIC,
        DORM: questRoom({ quest: template("beast-nobody-has") }),
      },
      [["E", "DISH", "C", "DORM"]]
    );
  const dish = quest("q-dish");

  const playThrough = async (id: string) => {
    await openFor(id);
    temples.markRoomCleared(id, "1F", [0, 2], HERO);
    temples.markRoomCleared(id, "1F", [0, 3], HERO);
    temples.markTempleCleared(id);
    await temples.flushProgress();
    expect([1, 2, 3].map((col) => cleared(id, col))).toEqual([true, true, true]);
  };

  it("raised at once: beast rooms come back, a quest room done today stays done", async () => {
    const id = temple();
    world([dish], [entry("q-dish")]);
    await playThrough(id);

    const entryAfter = await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);
    await temples.whenQuestRoomsReady(id);

    expect(entryAfter?.clearedRooms).toEqual([TEMPLE_CLEARED_KEY]); // the moon itself forgets every room
    expect(cleared(id, 1)).toBe(true); // the schedule puts the dishes back as they are: done today
    expect(cleared(id, 2)).toBe(false);
    expect(cleared(id, 3)).toBe(false);
    expect(temples.isTempleCleared(id)).toBe(true);
    await temples.flushProgress();
    expect((await db.getProgress(HERO, id))?.clearedRooms.sort()).toEqual(["1F:0,1", TEMPLE_CLEARED_KEY].sort());
  });

  it("raised at once: a quest room that lurks stays lurking", async () => {
    const id = temple();
    world([dish], [entry("q-dish")]);
    await playThrough(id);

    world([dish]); // the claim is gone from today's log (a new day)
    await temples.bloodMoon(id, HERO);
    await temples.whenProgressReady(id);

    expect(cleared(id, 1)).toBe(false);
  });

  it("scheduled: it rises at the hero's next entry, and the quest rooms follow the board all the same", async () => {
    const id = temple();
    world([dish], [entry("q-dish")]);
    await playThrough(id);
    await temples.scheduleBloodMoon(id, HERO, "2026-01-02T00:00:00.000Z");

    temples.initTemple(id, [0, 0], undefined, MIA); // the hero left; another hero's visit puts the run away
    await openFor(id, [0, 0], HERO);

    expect(temples.bloodMoonRose(id)).toBe(true);
    expect(cleared(id, 1)).toBe(true);
    expect(cleared(id, 2)).toBe(false);
    expect(cleared(id, 3)).toBe(false);
  });
});
