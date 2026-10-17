import { createPinia, setActivePinia } from "pinia";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { chargeLatePenalties, latePenaltyNotification } from "@/lib/services/quests/lateChores";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The late penalty: charged once per chore window, never below 0 GP or the hero's level, left alone for chores that are
 * on time, claimed, waiting on the Game Master or covered by Extra Time. The user store is real, its disk is faked and the
 * penalty record is an in-memory map.
 */

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

const mockRecords = new Map<string, unknown>();
jest.mock("@/lib/databases/LatePenaltyLogDb", () => ({
  getLatePenaltyLogDb: () => ({
    getRecord: jest.fn(async (key: string) => mockRecords.get(key) ?? null),
    saveRecord: jest.fn(async (key: string, record: unknown) => {
      mockRecords.set(key, record);
    }),
  }),
}));

let mockLateChores: Record<string, unknown> = {};
jest.mock("@/lib/services/family/familySettings", () => {
  const actual = jest.requireActual("@/lib/services/family/familySettings");
  return {
    ...actual,
    loadFamilySettings: jest.fn(async () => ({ ...actual.DEFAULT_FAMILY_SETTINGS, lateChores: mockLateChores })),
  };
});

const HERO = "hero-1";
const AT_5PM = new Date(2026, 9, 10, 17, 0, 0);
const AT_7PM = new Date(2026, 9, 10, 19, 0, 0);
const NEXT_EVENING = new Date(2026, 9, 11, 19, 0, 0);

const addHero = (stats: Record<string, unknown> = {}, questEffects?: unknown) =>
  useUserStore().addUser({
    id: HERO,
    name: { nick: "Max" },
    jobClass: "Warrior",
    questEffects,
    stats: {
      level: 1,
      xp: { now: 60, next_level: 283 },
      hp: { now: 20, max: 100 },
      mp: { now: 10, max: 80 },
      gp: { wallet: 100, savings: 50, debt: 0, limit: 1000 },
      ap: { total: 0, history: [] },
      ...stats,
    },
  });

const item = (extra: Record<string, unknown> = {}, board: Partial<QuestBoardItem> = {}): QuestBoardItem =>
  ({
    quest: {
      id: "q1",
      achievementName: "Dishes",
      basicSchedule: "daily",
      scheduleType: "basic",
      customFrequency: 1,
      customPeriodType: "day",
      customPeriodNumber: 1,
      dueByTime: "18:00",
      endsOn: "",
      startsOn: "2026-10-01T09:00:00",
      repeatOnDays: [],
      showDailyUntilComplete: false,
      xp: 40,
      gp: 20,
      ap: 2,
      ...extra,
    },
    status: "open",
    pending: false,
    overdue: true,
    doneBy: [],
    slots: [],
    progress: null,
    ...board,
  }) as unknown as QuestBoardItem;

const stats = () => (useUserStore().getUserById(HERO) as any).stats;

beforeEach(() => {
  setActivePinia(createPinia());
  mockRecords.clear();
  mockLateChores = { penalty: true };
});

describe("chargeLatePenalties", () => {
  it("takes nothing while the family has not switched the penalty on", async () => {
    addHero();
    mockLateChores = {};
    expect(await chargeLatePenalties([item()], HERO, AT_7PM)).toEqual([]);
    expect(stats().gp.wallet).toBe(100);
  });

  it("takes 25% of the chore's XP and GP once its due time passes", async () => {
    addHero();
    const charged = await chargeLatePenalties([item()], HERO, AT_7PM);
    expect(charged).toEqual([{ questId: "q1", questName: "Dishes", taken: { xp: 10, gp: 5 } }]);
    expect(stats().gp.wallet).toBe(95);
    expect(stats().gp.savings).toBe(50);
    expect(stats().xp.now).toBe(50);
  });

  it("charges a chore window once, however often the watch runs", async () => {
    addHero();
    await chargeLatePenalties([item()], HERO, AT_7PM);
    const again = await chargeLatePenalties([item()], HERO, new Date(2026, 9, 10, 20, 0, 0));
    expect(again).toEqual([]);
    expect(stats().gp.wallet).toBe(95);
  });

  it("charges two runs that start together once", async () => {
    addHero();
    const [first, second] = await Promise.all([
      chargeLatePenalties([item()], HERO, AT_7PM),
      chargeLatePenalties([item()], HERO, AT_7PM),
    ]);
    expect(first.length + second.length).toBe(1);
    expect(stats().gp.wallet).toBe(95);
  });

  it("charges the next day's window again", async () => {
    addHero();
    await chargeLatePenalties([item()], HERO, AT_7PM);
    const next = await chargeLatePenalties([item()], HERO, NEXT_EVENING);
    expect(next).toHaveLength(1);
    expect(stats().gp.wallet).toBe(90);
  });

  it("never takes the wallet below 0 or the hero below the level they are on", async () => {
    addHero({ xp: { now: 105, next_level: 283 }, level: 2, gp: { wallet: 2, savings: 0, debt: 0, limit: 1000 } });
    // level 2 starts at 282 XP in this game: the hero is already below it, so there is nothing to spare
    const charged = await chargeLatePenalties([item()], HERO, AT_7PM);
    expect(stats().gp.wallet).toBe(0);
    expect(stats().xp.now).toBe(105);
    expect(stats().level).toBe(2);
    expect(charged[0].taken.xp).toBe(0);
  });

  it("does not level a hero down", async () => {
    addHero({ xp: { now: 285, next_level: 520 }, level: 2 });
    mockLateChores = { penalty: true, penaltyMode: "flat", penaltyAmount: 50 };
    await chargeLatePenalties([item()], HERO, AT_7PM);
    expect(stats().xp.now).toBe(282);
    expect(stats().level).toBe(2);
  });

  it("leaves alone chores that are on time, claimed, waiting for approval or have no due time", async () => {
    addHero();
    const board = [
      item({ id: "a" }),
      item({ id: "b" }, { status: "done" }),
      item({ id: "c" }, { pending: true }),
      item({ id: "d", dueByTime: "" }),
    ];
    expect(await chargeLatePenalties(board, HERO, AT_5PM)).toEqual([]);
    const late = await chargeLatePenalties(board, HERO, AT_7PM);
    expect(late.map((entry) => entry.questId)).toEqual(["a"]);
  });

  it("lets a chore opt out of the penalty", async () => {
    addHero();
    expect(await chargeLatePenalties([item({ lateRule: "noPenalty" })], HERO, AT_7PM)).toEqual([]);
  });

  it("waits for Extra Time and while the clock is held", async () => {
    addHero({}, { extendedUntil: { q1: new Date(2026, 9, 10, 20, 0, 0).toISOString() } });
    expect(await chargeLatePenalties([item()], HERO, AT_7PM)).toEqual([]);

    setActivePinia(createPinia());
    addHero({}, { pause: { from: new Date(2026, 9, 10, 12, 0).toISOString(), until: new Date(2026, 9, 10, 23, 0).toISOString() } });
    expect(await chargeLatePenalties([item()], HERO, AT_7PM)).toEqual([]);
  });
});

describe("latePenaltyNotification", () => {
  it("tells the hero what the late chore cost", () => {
    const note = latePenaltyNotification(HERO, { id: "q1", achievementName: "Dishes" }, { xp: 10, gp: 5 }, AT_7PM);
    expect(note).toMatchObject({ heroId: HERO, kind: "late-penalty", refId: "q1", title: "Dishes" });
    expect(note.body).toBe("Too late: it cost you -10 XP, -5 GP.");
  });
});
