/**
 * The quest-room sheet and the run's doors agree (docs/Quest-Rooms-Spec.md 7.1 to 7.3): the run reads the hero's real
 * quest board when it opens, puts every room that is not lurking into the cleared rooms, and the sheet roomActions builds
 * from the same board offers the fight in exactly the rooms that are not cleared.
 *
 * The real TempleSystem and QuestEngine; only the storage is faked (the same seams TempleQuestRooms.spec uses).
 */
import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { dayKeyOf } from "@/lib/engine/quests/QuestSchedule";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { roomActions } from "@/lib/services/temples/RoomInteractions";
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
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

// The hero's item effects ride on their profile in the user store; the sheet reads names from it too
const mockHeroes: Record<string, unknown> = {};
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ users: mockHeroes, getUserById: (id: string) => mockHeroes[id] }),
}));
jest.mock("@/lib/services/notifications/notify", () => ({ bloodMoon: () => null, notify: () => null }));

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Chore ${id}`,
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
    beastId: "beast-dish-goblin",
    ...overrides,
  }) as unknown as Achievement;

const entry = (questId: string, overrides: Partial<QuestLogEntry> = {}): QuestLogEntry => {
  const completedAt = new Date().toISOString();
  return {
    id: `entry-${questId}`,
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

const questRoom = (questId: string): Room => ({ type: "monster", content: { lockOnEnter: true, questId } });

beforeAll(() => setActivePinia(createPinia()));

beforeEach(() => {
  mockHeroes[HERO] = { id: HERO, name: { nick: "Hero" } };
  mockHeroes["hero-2"] = { id: "hero-2", name: { nick: "Mia" } };
});

describe("the sheet and the run's cleared rooms agree", () => {
  it("offers the fight only in the rooms the run did not clear", async () => {
    const lurking = quest("lurking");
    const done = quest("done");
    const claimed = quest("claimed", { requiresApproval: true });
    const mias = quest("mias", { assignee: ["hero-2"] });
    mockGetTasks.mockResolvedValue([lurking, done, claimed, mias]);
    mockGetEntries.mockResolvedValue([entry("done"), entry("claimed", { status: "pending", rewardsApplied: false })]);

    const id = makeTemple(
      {
        E: { type: "entrance" },
        L: questRoom("lurking"),
        D: questRoom("done"),
        C: questRoom("claimed"),
        M: questRoom("mias"),
        G: questRoom("deleted-quest"),
      },
      [["E", "L", "D", "C", "M", "G"]]
    );
    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);
    await temples.whenQuestRoomsReady(id);

    const seen = ["lurking", "done", "claimed", "mias", "gone"].map((name, index) => {
      const col = index + 1;
      const room = dungeons.getRoom(id, [0, col])!;
      const sheet = roomActions(room, { userId: HERO, templeId: id, level: "1F", position: [0, col] });
      return {
        name,
        cleared: temples.isRoomCleared(id, "1F", [0, col]),
        fight: sheet.actions.some((action) => action.label === "Fight"),
        header: sheet.header,
      };
    });

    expect(seen).toEqual([
      { name: "lurking", cleared: false, fight: true, header: "A Monster approaches!" },
      { name: "done", cleared: true, fight: false, header: "Nothing left here but the smell." },
      { name: "claimed", cleared: true, fight: false, header: "Tied up. The Game Master is checking." },
      { name: "mias", cleared: true, fight: false, header: "Mia's Dish Goblin sleeps here." },
      { name: "gone", cleared: true, fight: false, header: "An empty lair." },
    ]);
    // the doors never disagree with the sheet: every room without a fight is one the run counts as cleared
    expect(seen.every((room) => room.cleared === !room.fight)).toBe(true);
  });
});
