import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  applyQuestRewards,
  approveCompletion,
  completeQuest,
  paidQuestRewards,
} from "@/lib/services/quests/QuestCompletionService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The class's say on a board quest's pay (docs/Items-And-Classes-Contract.md, C): a Thief or Ninja
 * pockets +25% GP whether the quest is claimed on the spot or paid later by the Game Master; XP and AP
 * are what the board posted. The user store is real; what it writes to disk is faked, and the quest
 * log is an in-memory list.
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

const log: QuestLogEntry[] = [];
jest.mock("@/lib/databases/QuestLogDb", () => ({
  getQuestLogDb: () => ({
    logCompletion: jest.fn(async (input: Record<string, unknown>) => {
      const entry = {
        id: `entry-${log.length + 1}`,
        completedAt: new Date().toISOString(),
        rewardsApplied: false,
        ...input,
      } as unknown as QuestLogEntry;
      log.push(entry);
      return entry;
    }),
    updateEntry: jest.fn(async (id: string, patch: Partial<QuestLogEntry>) => {
      const entry = log.find((candidate) => candidate.id === id);
      if (!entry) return null;
      Object.assign(entry, patch);
      return entry;
    }),
    get: jest.fn(async (id: string) => log.find((candidate) => candidate.id === id) ?? null),
  }),
}));

const HERO_ID = "hero-1";

const addHero = (jobClass: string) => {
  useUserStore().addUser({
    id: HERO_ID,
    name: { nick: "Max" },
    jobClass,
    stats: {
      level: 1,
      xp: { now: 0, next_level: 283 },
      hp: { now: 20, max: 100 },
      mp: { now: 10, max: 80 },
      gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
      ap: { total: 0, history: [] },
    },
  });
};

const stats = () => (useUserStore().getUserById(HERO_ID) as any).stats;

const quest = (requiresApproval = false): Achievement =>
  ({
    id: "q1",
    achievementName: "Dishes",
    xp: 30,
    gp: 40,
    ap: 2,
    requiresApproval,
  } as unknown as Achievement);

beforeEach(() => {
  setActivePinia(createPinia());
  log.length = 0;
});

describe("paidQuestRewards", () => {
  it("adds the class loot bonus to the GP only", () => {
    addHero("Thief");
    expect(paidQuestRewards(HERO_ID, { xp: 30, gp: 40, ap: 2 })).toEqual({ xp: 30, gp: 50, ap: 2 });
  });

  it("a Ninja loots like a Thief; a Warrior and an unknown hero are paid the board's rate", () => {
    addHero("Ninja");
    expect(paidQuestRewards(HERO_ID, { xp: 30, gp: 40, ap: 2 }).gp).toBe(50);
    expect(paidQuestRewards("nobody", { xp: 30, gp: 40, ap: 2 })).toEqual({ xp: 30, gp: 40, ap: 2 });

    setActivePinia(createPinia());
    addHero("Warrior");
    expect(paidQuestRewards(HERO_ID, { xp: 30, gp: 40, ap: 2 }).gp).toBe(40);
  });
});

describe("applyQuestRewards", () => {
  it("credits a Thief 25% more GP, with XP and AP untouched", () => {
    addHero("Thief");
    applyQuestRewards(HERO_ID, { xp: 30, gp: 40, ap: 2 }, "quest:q1");
    expect(stats().gp.wallet).toBe(50);
    expect(stats().xp.now).toBe(30);
    expect(stats().ap.total).toBe(2);
  });

  it("leaves a Monk's pay as posted", () => {
    addHero("Monk");
    applyQuestRewards(HERO_ID, { xp: 30, gp: 40, ap: 2 }, "quest:q1");
    expect(stats().gp.wallet).toBe(40);
  });

  it("pays nobody when the hero is unknown", () => {
    addHero("Thief");
    expect(applyQuestRewards("nobody", { xp: 30, gp: 40, ap: 2 }, "quest:q1")).toBeNull();
    expect(stats().gp.wallet).toBe(0);
  });
});

describe("completeQuest", () => {
  it("a claimed quest pays the Thief's GP now and reports the paid line", async () => {
    addHero("Thief");
    const result = await completeQuest(quest(), HERO_ID, "claim");
    expect(result.awaitingApproval).toBe(false);
    expect(result.paid).toEqual({ xp: 30, gp: 50, ap: 2 });
    expect(result.entry.rewards).toEqual({ xp: 30, gp: 40, ap: 2 }); // the log keeps the board's rate
    expect(result.entry.rewardsApplied).toBe(true);
    expect(stats().gp.wallet).toBe(50);
  });

  it("a quest that needs approval is held: nothing paid, the paid line is the board's rate", async () => {
    addHero("Thief");
    const result = await completeQuest(quest(true), HERO_ID, "claim");
    expect(result.awaitingApproval).toBe(true);
    expect(result.paid).toEqual({ xp: 30, gp: 40, ap: 2 });
    expect(stats().gp.wallet).toBe(0);
  });
});

describe("approveCompletion", () => {
  it("the Game Master's payout carries the Thief's bonus too", async () => {
    addHero("Thief");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    const approved = await approveCompletion(held.entry.id, "gm-1");
    expect(approved?.status).toBe("approved");
    expect(approved?.rewardsApplied).toBe(true);
    expect(stats().gp.wallet).toBe(50);
    expect(stats().xp.now).toBe(30);
    expect(paidQuestRewards(approved!.userId, approved!.rewards).gp).toBe(50); // what the toast prints
  });

  it("approving twice pays once", async () => {
    addHero("Ninja");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    await approveCompletion(held.entry.id, "gm-1");
    await approveCompletion(held.entry.id, "gm-1");
    expect(stats().gp.wallet).toBe(50);
  });
});
