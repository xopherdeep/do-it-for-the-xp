import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { approveClaim, rejectClaim } from "@/lib/services/quests/approvalFlow";
import { completeQuest } from "@/lib/services/quests/QuestCompletionService";
import { AUTO_APPROVED_NOTE } from "@/lib/services/quests/approvalRouting";
import {
  onQuestClaimed,
  onQuestReviewed,
  type QuestClaimed,
  type QuestReviewed,
} from "@/lib/services/multiplayer/gameSignals";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Game Master's approval loop on a shared device: who hears of a held claim, who may settle it, and what the
 * hero and multiplayer hear afterwards. The stores are real; the disks are faked.
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
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => ({
    getForHero: jest.fn().mockResolvedValue([]),
    saveForHero: jest.fn().mockResolvedValue(undefined),
  }),
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
    getPending: jest.fn(async () => log.filter((entry) => entry.status === "pending")),
  }),
}));

const stats = () => ({
  level: 1,
  xp: { now: 0, next_level: 283 },
  hp: { now: 20, max: 100 },
  mp: { now: 10, max: 80 },
  gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
  ap: { total: 0, history: [] },
});

const addProfile = (id: string, isAdult: boolean) =>
  useUserStore().addUser({ id, name: { nick: id }, jobClass: "Warrior", isAdult, stats: stats() });

const chore = (requiresApproval = true): Achievement =>
  ({ id: "q1", achievementName: "Dishes", xp: 30, gp: 40, ap: 2, difficulty: 3, requiresApproval } as unknown as Achievement);

const inbox = (heroId: string) => useNotificationsStore().forHero(heroId);
const walletOf = (heroId: string) => (useUserStore().getUserById(heroId) as any).stats.gp.wallet;

let claimed: QuestClaimed[] = [];
let reviewed: QuestReviewed[] = [];
let stops: Array<() => void> = [];

beforeEach(() => {
  setActivePinia(createPinia());
  log.length = 0;
  claimed = [];
  reviewed = [];
  stops = [onQuestClaimed((claim) => claimed.push(claim)), onQuestReviewed((review) => reviewed.push(review))];
  addProfile("mum", true);
  addProfile("dad", true);
  addProfile("kid", false);
});

afterEach(() => stops.forEach((stop) => stop()));

describe("a hero's claim", () => {
  it("is held, and every Game Master hears of it once", async () => {
    const result = await completeQuest(chore(), "kid");
    expect(result.awaitingApproval).toBe(true);
    for (const gm of ["mum", "dad"]) {
      expect(inbox(gm)).toHaveLength(1);
      expect(inbox(gm)[0]).toMatchObject({ kind: "claim-waiting", refId: result.entry.id, link: "/game-master/approvals" });
    }
    expect(inbox("kid")).toHaveLength(0);
    expect(claimed).toEqual([{ heroId: "kid", questId: "q1", difficulty: 3, requiresApproval: true }]);
  });

  it("is not held, and nobody is bothered, when the chore needs no approval", async () => {
    const result = await completeQuest(chore(false), "kid");
    expect(result.awaitingApproval).toBe(false);
    expect(inbox("mum")).toHaveLength(0);
    expect(claimed[0]).toMatchObject({ requiresApproval: false });
  });
});

describe("approving", () => {
  it("pays the hero, tells them, settles the Game Masters' notices and tells multiplayer", async () => {
    const { entry } = await completeQuest(chore(), "kid");
    const outcome = await approveClaim(entry.id, "mum");
    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.line).toBe("+30 XP · +40 GP · +2 AP");
    expect(walletOf("kid")).toBe(40);
    expect(inbox("kid")[0]).toMatchObject({ kind: "approved", refId: entry.id });
    expect(inbox("dad")[0].readAt).toBeTruthy();
    expect(reviewed).toEqual([{ heroId: "kid", questId: "q1", approved: true, note: "" }]);
  });

  it("settles a claim once: a second approval pays nothing", async () => {
    const { entry } = await completeQuest(chore(), "kid");
    await approveClaim(entry.id, "mum");
    const again = await approveClaim(entry.id, "dad");
    expect(again).toEqual({ ok: false, reason: "gone" });
    expect(walletOf("kid")).toBe(40);
  });
});

describe("rejecting", () => {
  it("sends the note to the hero and pays nothing", async () => {
    const { entry } = await completeQuest(chore(), "kid");
    const outcome = await rejectClaim(entry.id, "mum", "  Under the bed too  ");
    expect(outcome.ok).toBe(true);
    expect(walletOf("kid")).toBe(0);
    expect(inbox("kid")[0]).toMatchObject({ kind: "rejected" });
    expect(inbox("kid")[0].body).toContain("Under the bed too");
    expect(reviewed).toEqual([{ heroId: "kid", questId: "q1", approved: false, note: "Under the bed too" }]);
  });
});

describe("a Game Master's own chore", () => {
  it("goes to the other Game Master, never to themself", async () => {
    const { entry, awaitingApproval } = await completeQuest(chore(), "mum");
    expect(awaitingApproval).toBe(true);
    expect(inbox("mum")).toHaveLength(0);
    expect(inbox("dad")).toHaveLength(1);

    expect(await approveClaim(entry.id, "mum")).toEqual({ ok: false, reason: "own-claim" });
    expect(walletOf("mum")).toBe(0);
    expect((await approveClaim(entry.id, "dad")).ok).toBe(true);
    expect(walletOf("mum")).toBe(40);
  });

  it("is approved at once, with a note, when no other Game Master exists", async () => {
    setActivePinia(createPinia());
    log.length = 0;
    addProfile("solo", true);
    addProfile("kid", false);
    const result = await completeQuest(chore(), "solo");
    expect(result.awaitingApproval).toBe(false);
    expect(result.entry).toMatchObject({ status: "approved", note: AUTO_APPROVED_NOTE });
    expect(walletOf("solo")).toBe(40);
  });
});
