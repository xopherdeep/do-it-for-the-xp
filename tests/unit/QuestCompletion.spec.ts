import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  applyQuestRewards,
  approveCompletion,
  completeQuest,
  isQuestStillOpen,
  paidQuestRewards,
  recordBattleCompletion,
  rejectCompletion,
} from "@/lib/services/quests/QuestCompletionService";
import { useUserStore } from "@/lib/store/stores/user";
import { onQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";

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

// The family's late chore rules: off, as a family that never opened the card has them
let mockLateChores: Record<string, unknown> = {};
jest.mock("@/lib/services/family/familySettings", () => {
  const actual = jest.requireActual("@/lib/services/family/familySettings");
  return {
    ...actual,
    loadFamilySettings: jest.fn(async () => ({ ...actual.DEFAULT_FAMILY_SETTINGS, lateChores: mockLateChores })),
  };
});

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
  mockLateChores = {};
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
 * twice (5.4). The same rule the beast card's claim reads.
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

/**
 * A logged completion that is not rejected ends the grudge (docs/Quest-Rooms-Spec.md 5.7): a board claim (held or paid),
 * a battle win, any other way. Shared quests (Team Effort, Rat Race) clear it for every assignee (section 8); everyone
 * else keeps their own. Only the marks change: HP, MP and the purse are not touched.
 */
describe("a completion clears the grudge", () => {
  const SIBLING = "hero-2";
  const OUTSIDER = "hero-3";

  const addOtherHero = (id: string) =>
    useUserStore().addUser({
      id,
      name: { nick: id },
      jobClass: "Warrior",
      stats: {
        level: 1,
        xp: { now: 0, next_level: 283 },
        hp: { now: 20, max: 100 },
        mp: { now: 10, max: 80 },
        gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
        ap: { total: 0, history: [] },
      },
    });
  const marks = (heroId: string, questId = "q1") =>
    (useUserStore().getUserById(heroId) as any)?.questGrudges?.[questId]?.marks ?? 0;
  const markEveryone = (questId = "q1") => {
    for (const id of [HERO_ID, SIBLING, OUTSIDER]) {
      useUserStore().addQuestGrudge(id, questId, 1000);
      useUserStore().addQuestGrudge(id, questId, 2000);
    }
  };
  const questOf = (type: string, extra: Partial<Achievement> = {}): Achievement =>
    ({ ...quest(), type, assignee: [HERO_ID, SIBLING], ...extra } as Achievement);

  beforeEach(() => {
    addHero("Warrior");
    addOtherHero(SIBLING);
    addOtherHero(OUTSIDER);
    markEveryone();
  });

  it("a claim on the board clears the claiming hero's marks and no one else's", async () => {
    expect(marks(HERO_ID)).toBe(2);
    await completeQuest(questOf("individual"), HERO_ID, "claim");

    expect(marks(HERO_ID)).toBe(0);
    expect(marks(SIBLING)).toBe(2);
    expect(marks(OUTSIDER)).toBe(2);
  });

  it("a claim waiting for the Game Master clears them too, and a later rejection does not bring them back", async () => {
    const held = await completeQuest(questOf("individual", { requiresApproval: true }), HERO_ID, "claim");
    expect(held.awaitingApproval).toBe(true);
    expect(marks(HERO_ID)).toBe(0);

    await rejectCompletion(held.entry.id, "gm-1", "not clean");
    expect(marks(HERO_ID)).toBe(0);
  });

  it("an approval that pays a claim made earlier changes nothing more", async () => {
    const held = await completeQuest(questOf("individual", { requiresApproval: true }), HERO_ID, "claim");
    useUserStore().addQuestGrudge(HERO_ID, "q1", 3000); // a flight after the claim was made
    await approveCompletion(held.entry.id, "gm-1");
    expect(marks(HERO_ID)).toBe(1);
  });

  it("a battle win that is logged clears them", async () => {
    await recordBattleCompletion(questOf("individual"), HERO_ID, { xp: 30, gp: 40, ap: 2 });

    expect(marks(HERO_ID)).toBe(0);
    expect(marks(SIBLING)).toBe(2);
  });

  it("a held battle win (a quest that needs approval) clears them", async () => {
    await completeQuest(questOf("individual", { requiresApproval: true }), HERO_ID, "battle");
    expect(marks(HERO_ID)).toBe(0);
  });

  it.each(["collaborate", "compete"])("a %s quest is shared: one clear lifts the marks from every assignee", async (type) => {
    await completeQuest(questOf(type), HERO_ID, "claim");

    expect(marks(HERO_ID)).toBe(0);
    expect(marks(SIBLING)).toBe(0);
    expect(marks(OUTSIDER)).toBe(2); // not an assignee
  });

  it("a Solo Mission and an Open Bounty keep each hero's grudge their own", async () => {
    await recordBattleCompletion(questOf("asNeeded", { assignee: [] }), HERO_ID, { xp: 0, gp: 0, ap: 0 });
    expect(marks(HERO_ID)).toBe(0);
    expect(marks(SIBLING)).toBe(2);
    expect(marks(OUTSIDER)).toBe(2);
  });

  it("another quest's marks stay", async () => {
    useUserStore().addQuestGrudge(HERO_ID, "q-other", 1);
    await completeQuest(questOf("individual"), HERO_ID, "claim");
    expect(marks(HERO_ID, "q-other")).toBe(1);
  });

  it("does not touch HP, MP or the purse", async () => {
    await completeQuest(questOf("individual"), HERO_ID, "claim");
    expect(stats().hp).toEqual({ now: 20, max: 100 });
    expect(stats().mp).toEqual({ now: 10, max: 80 });
  });

  it("a hero who held no marks is simply completed", async () => {
    setActivePinia(createPinia());
    addHero("Warrior");
    const result = await completeQuest(questOf("individual"), HERO_ID, "claim");
    expect(result.entry.questId).toBe("q1");
    expect((useUserStore().getUserById(HERO_ID) as any).questGrudges).toBeUndefined();
  });
});

/**
 * The hunt bonus (services/quests/huntBonus.ts) survives the Game Master's approval: a quest that went on hold from a
 * WON fight (source "battle") carries +25% XP on its entry and the approval pays it on top, once. A claim from the
 * beast card never earns it.
 */
describe("the hunt bonus on a held win", () => {
  it("writes the bonus on a hold from a won fight, and pays nothing yet", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle"); // 30 XP -> +8 (7.5 rounds up)
    expect(held.awaitingApproval).toBe(true);
    expect(held.entry).toMatchObject({ source: "battle", status: "pending", huntBonusXp: 8 });
    expect(held.entry.rewards).toEqual({ xp: 30, gp: 40, ap: 2 }); // the log keeps the quest's own rate
    expect(held.paid.xp).toBe(38); // what it will pay once approved
    expect(stats().xp.now).toBe(0);
  });

  it("pays the quest's XP plus the bonus when the Game Master approves it, GP and AP as posted", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle");
    const approved = await approveCompletion(held.entry.id, "gm-1");
    expect(approved?.status).toBe("approved");
    expect(stats().xp.now).toBe(38);
    expect(stats().gp.wallet).toBe(40);
    expect(stats().ap.total).toBe(2);
  });

  it("pays it once: approving twice, or rejecting afterwards, adds nothing", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle");
    await approveCompletion(held.entry.id, "gm-1");
    await approveCompletion(held.entry.id, "gm-1");
    await rejectCompletion(held.entry.id, "gm-1");
    expect(stats().xp.now).toBe(38);
  });

  it("pays no bonus when the Game Master rejects the win", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle");
    await rejectCompletion(held.entry.id, "gm-1", "not done");
    expect(stats().xp.now).toBe(0);
  });

  it("gives a claim from the card no bonus, held or paid", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    expect(held.entry.huntBonusXp).toBeUndefined();
    await approveCompletion(held.entry.id, "gm-1");
    expect(stats().xp.now).toBe(30);

    const paid = await completeQuest(quest(), HERO_ID, "claim");
    expect(paid.entry.huntBonusXp).toBeUndefined();
    expect(paid.paid.xp).toBe(30);
  });

  it("an entry from before the bonus (no field) pays the plain rate on approval", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle");
    delete (held.entry as { huntBonusXp?: number }).huntBonusXp;
    await approveCompletion(held.entry.id, "gm-1");
    expect(stats().xp.now).toBe(30);
  });

  it("a win that is paid at once through completeQuest (a trusted hour began) pockets the bonus now", async () => {
    addHero("Warrior");
    const trusted = {
      ...quest(true),
    } as Achievement;
    useUserStore().users[HERO_ID].questEffects = { trustedUntil: new Date(Date.now() + 3600_000).toISOString() };
    const result = await completeQuest(trusted, HERO_ID, "battle");
    expect(result.awaitingApproval).toBe(false);
    expect(result.paid.xp).toBe(38);
    expect(stats().xp.now).toBe(38);
    expect(result.entry.huntBonusXp).toBe(8);
  });
});

/**
 * Multiplayer listens for a quest that pays (services/multiplayer/gameSignals.ts). The signal comes after the rewards
 * are in the pocket, once per payment: a held claim says nothing until the Game Master pays it.
 */
describe("the quest-paid signal", () => {
  let heard: QuestPaid[];
  let xpWhenHeard: number[];
  let stop: () => void;

  beforeEach(() => {
    heard = [];
    xpWhenHeard = [];
    stop = onQuestPaid((paid) => {
      heard.push(paid);
      xpWhenHeard.push(stats().xp.now);
    });
  });
  afterEach(() => stop());

  it("a claim paid at once says so, with the owed XP, after the XP landed", async () => {
    addHero("Warrior");
    await completeQuest(quest(), HERO_ID, "claim");
    expect(heard).toEqual([{ heroId: HERO_ID, questId: "q1", xp: 30, fight: false }]);
    expect(xpWhenHeard).toEqual([30]);
  });

  it("a win paid at once is a fight and carries the hunt bonus", async () => {
    addHero("Warrior");
    useUserStore().users[HERO_ID].questEffects = { trustedUntil: new Date(Date.now() + 3600_000).toISOString() };
    await completeQuest(quest(true), HERO_ID, "battle");
    expect(heard).toEqual([{ heroId: HERO_ID, questId: "q1", xp: 38, fight: true }]);
  });

  it("a held claim says nothing", async () => {
    addHero("Warrior");
    await completeQuest(quest(true), HERO_ID, "claim");
    expect(heard).toEqual([]);
  });

  it("the Game Master's approval says so once, and a second approval says nothing", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    await approveCompletion(held.entry.id, "gm-1");
    await approveCompletion(held.entry.id, "gm-1");
    expect(heard).toEqual([{ heroId: HERO_ID, questId: "q1", xp: 30, fight: false }]);
    expect(xpWhenHeard).toEqual([30]);
  });

  it("an approved held win is a fight and pays the hunt bonus", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "battle");
    await approveCompletion(held.entry.id, "gm-1");
    expect(heard).toEqual([{ heroId: HERO_ID, questId: "q1", xp: 38, fight: true }]);
  });

  it("a rejection says nothing", async () => {
    addHero("Warrior");
    const held = await completeQuest(quest(true), HERO_ID, "claim");
    await rejectCompletion(held.entry.id, "gm-1", "not done");
    expect(heard).toEqual([]);
  });

  it("a win logged after the battle paid its own rewards is a fight", async () => {
    addHero("Warrior");
    await recordBattleCompletion(quest(), HERO_ID, { xp: 38, gp: 40, ap: 2 });
    expect(heard).toEqual([{ heroId: HERO_ID, questId: "q1", xp: 38, fight: true }]);
  });
});

describe("completeQuest and late chores", () => {
  // Due at midnight sharp: any time of day is after the due time
  const lateQuest = (extra: Record<string, unknown> = {}): Achievement =>
    ({ ...quest(), dueByTime: "00:00", ...extra }) as unknown as Achievement;

  it("pays a late finish in full when the family never chose a reduced share", async () => {
    addHero("Warrior");
    const result = await completeQuest(lateQuest(), HERO_ID, "claim");
    expect(result.paid).toEqual({ xp: 30, gp: 40, ap: 2 });
    expect(result.lateNote).toBeUndefined();
  });

  it("pays the late share and says so", async () => {
    addHero("Warrior");
    mockLateChores = { reducedPay: true, lateShare: 50 };
    const result = await completeQuest(lateQuest(), HERO_ID, "claim");
    expect(result.paid).toEqual({ xp: 15, gp: 20, ap: 1 });
    expect(result.entry.rewards).toEqual({ xp: 15, gp: 20, ap: 1 });
    expect(result.lateNote).toBe("Late: paid 50% of the loot");
    expect(stats().gp.wallet).toBe(20);
  });

  it("holds the reduced share for the Game Master's approval", async () => {
    addHero("Warrior");
    mockLateChores = { reducedPay: true, lateShare: 50 };
    const held = await completeQuest(lateQuest({ requiresApproval: true }), HERO_ID, "claim");
    expect(stats().gp.wallet).toBe(0);
    await approveCompletion(held.entry.id, "gm-1");
    expect(stats().gp.wallet).toBe(20);
  });

  it("pays an on-time finish in full whatever the rule", async () => {
    addHero("Warrior");
    mockLateChores = { reducedPay: true, lateShare: 50 };
    const result = await completeQuest(lateQuest({ dueByTime: "23:59" }), HERO_ID, "claim");
    expect(result.paid).toEqual({ xp: 30, gp: 40, ap: 2 });
  });
});
