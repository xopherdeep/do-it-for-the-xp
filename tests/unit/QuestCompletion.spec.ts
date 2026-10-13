import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  applyQuestRewards,
  approveCompletion,
  completeQuest,
  isQuestStillOpen,
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
    getEntries: jest.fn(async () => [...log]),
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

  it("an approved quest stamps its AP on the day the chore was done, not the day of the approval", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    const yesterdayEvening = new Date();
    yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
    yesterdayEvening.setHours(20, 0, 0, 0);
    log.find((candidate) => candidate.id === held.entry.id)!.completedAt = yesterdayEvening.toISOString();

    await approveCompletion(held.entry.id, "gm-1");

    expect(stats().ap.total).toBe(2);
    expect(stats().ap.history).toEqual([
      { amount: 2, timestamp: yesterdayEvening.toISOString(), source: "quest:q1" },
    ]);
  });

  it("approving twice pays once", async () => {
    addHero("Ninja");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    await approveCompletion(held.entry.id, "gm-1");
    await approveCompletion(held.entry.id, "gm-1");
    expect(stats().gp.wallet).toBe(50);
  });
});

/**
 * A battle win completes its quest (docs/Quest-Rooms-Spec.md 7.5), and the log, not the screen the fight began on,
 * says whether the window is still open: every hero's log, so a shared quest a sibling already cleared is not paid
 * twice (5.4). The same rule MyTask's claim reads.
 */
describe("isQuestStillOpen", () => {
  const SIBLING = "hero-2";
  const NOW = new Date(2026, 9, 12, 15, 0, 0);
  const dishes = (type: string, extra: Partial<Achievement> = {}): Achievement =>
    ({
      ...quest(),
      id: "q-dishes",
      type,
      assignee: [HERO_ID, SIBLING],
      basicSchedule: "daily",
      startsOn: new Date(2026, 0, 1).toISOString(),
      endsOn: "",
      ...extra,
    } as Achievement);
  const logged = (userId: string, status: QuestLogEntry["status"] = "approved", at: Date = NOW) =>
    log.push({
      id: `entry-${log.length + 1}`,
      questId: "q-dishes",
      userId,
      completedAt: at.toISOString(),
      status,
      source: "claim",
      rewards: { xp: 30, gp: 40, ap: 2 },
      rewardsApplied: status === "approved",
    } as QuestLogEntry);

  it("a quest nobody has done today is open", async () => {
    expect(await isQuestStillOpen(dishes("individual"), HERO_ID, NOW)).toBe(true);
  });

  it("a Team Effort a sibling already cleared is closed for the hero: the window is used, nobody is paid twice", async () => {
    logged(SIBLING);
    expect(await isQuestStillOpen(dishes("collaborate"), HERO_ID, NOW)).toBe(false);
    expect(await isQuestStillOpen(dishes("compete"), HERO_ID, NOW)).toBe(false);
  });

  it("a Solo Mission a sibling did is still the hero's to do", async () => {
    logged(SIBLING);
    expect(await isQuestStillOpen(dishes("individual"), HERO_ID, NOW)).toBe(true);
  });

  it("the hero's own clear or claim waiting for the Game Master uses the window up", async () => {
    logged(HERO_ID, "pending");
    expect(await isQuestStillOpen(dishes("individual"), HERO_ID, NOW)).toBe(false);
  });

  it("a rejected claim does not count, so the beast is back the same day", async () => {
    logged(HERO_ID, "rejected");
    logged(SIBLING, "rejected");
    expect(await isQuestStillOpen(dishes("collaborate"), HERO_ID, NOW)).toBe(true);
  });

  it("yesterday's clear does not close today's window", async () => {
    logged(HERO_ID, "approved", new Date(2026, 9, 11, 20, 0, 0));
    expect(await isQuestStillOpen(dishes("individual"), HERO_ID, NOW)).toBe(true);
  });

  it("a quest that is not due today (ended) is not open", async () => {
    const ended = dishes("individual", { endsOn: new Date(2026, 5, 1).toISOString() });
    expect(await isQuestStillOpen(ended, HERO_ID, NOW)).toBe(false);
  });
});

describe("recordAPGain", () => {
  it("stamps now when `at` is not a date", () => {
    addHero("Warrior");
    const before = Date.now();
    useUserStore().recordAPGain({ userId: HERO_ID, amount: 3, source: "test", at: "not a date" });
    const after = Date.now();

    const [record] = stats().ap.history;
    expect(record.amount).toBe(3);
    expect(Number.isNaN(new Date(record.timestamp).getTime())).toBe(false);
    expect(new Date(record.timestamp).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(record.timestamp).getTime()).toBeLessThanOrEqual(after);
  });

  it("stamps the given time when `at` parses", () => {
    addHero("Warrior");
    const at = "2026-10-09T20:00:00.000Z";
    useUserStore().recordAPGain({ userId: HERO_ID, amount: 3, source: "test", at });
    expect(stats().ap.history[0].timestamp).toBe(at);
  });
});
