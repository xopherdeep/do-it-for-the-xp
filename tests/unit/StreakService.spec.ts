import { createPinia, setActivePinia } from "pinia";
import { chestMessage, settleStreakChests } from "@/lib/services/streaks/StreakService";
import { shiftDayKey } from "@/lib/services/streaks/dailyStreak";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { addHero, hero, HERO, wallet } from "./templeFixtures";

// The user store is real; only what it writes to disk is faked.
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

let mockEntries: Array<Record<string, unknown>> = [];
jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  getQuestLogDb: () => ({
    getEntriesForUser: async (userId: string) => mockEntries.filter((entry) => entry.userId === userId),
  }),
}));

let mockSettings: Record<string, unknown> | null = null;
jest.mock("@/lib/databases/FamilySettingsDb", () => ({
  __esModule: true,
  getFamilySettingsDb: () => ({
    getSettings: async () => mockSettings,
    saveSettings: async (settings: Record<string, unknown>) => {
      mockSettings = settings;
    },
  }),
}));

const NOW = new Date(2026, 9, 15, 18, 0);
const TODAY = "2026-10-15";
const days = (offsets: number[], status = "approved") =>
  offsets.map((offset) => ({ userId: HERO, status, dayKey: shiftDayKey(TODAY, offset) }));

beforeEach(() => {
  setActivePinia(createPinia());
  mockEntries = [];
  mockSettings = null;
  addHero();
});

describe("settleStreakChests", () => {
  it("pays the day-3 chest once, into the pocket, and notes it on the profile", async () => {
    mockEntries = days([-2, -1, 0]);
    const xpBefore = hero().stats.xp.now;

    const paid = await settleStreakChests(HERO, NOW);
    expect(paid.map((chest) => chest.day)).toEqual([3]);
    expect(wallet()).toBe(120);
    expect(hero().stats.xp.now).toBe(xpBefore + 15);
    expect(hero().streakChests).toEqual({ runStart: "2026-10-13", paid: [3] });

    expect(await settleStreakChests(HERO, NOW)).toEqual([]);
    expect(wallet()).toBe(120);
  });

  it("counts only approved days, so a held claim opens nothing yet", async () => {
    mockEntries = [...days([-2, -1]), ...days([0], "pending")];
    expect(await settleStreakChests(HERO, NOW)).toEqual([]);
    expect(wallet()).toBe(100);
  });

  it("pays nothing while the Game Master has streaks off", async () => {
    mockEntries = days([-2, -1, 0]);
    await useGameRulesStore().setStreaks(false);
    expect(mockSettings).toMatchObject({ streaks: false });
    expect(await settleStreakChests(HERO, NOW)).toEqual([]);
    expect(wallet()).toBe(100);
  });

  it("a broken streak starts the chests over", async () => {
    hero().streakChests = { runStart: "2026-09-01", paid: [3, 7] };
    mockEntries = days([-2, -1, 0]);
    expect((await settleStreakChests(HERO, NOW)).map((chest) => chest.day)).toEqual([3]);
  });
});

describe("chestMessage", () => {
  it("names the hero, the longest streak and the total", () => {
    expect(chestMessage("Sam", [{ day: 3, xp: 15, gp: 20 }, { day: 7, xp: 40, gp: 50 }])).toBe(
      "Sam hit a 7-day streak! Chest: +55 XP, +70 GP"
    );
  });
});

describe("questFlees", () => {
  it("counts every run from a quest's fight, past the grudge's cap of three", () => {
    const store = useUserStore();
    for (let run = 0; run < 5; run++) store.addQuestGrudge(HERO, "dishes");
    expect(hero().questFlees).toEqual({ dishes: 5 });
    store.clearQuestGrudge(HERO, "dishes");
    expect(hero().questFlees).toEqual({ dishes: 5 });
  });
});
