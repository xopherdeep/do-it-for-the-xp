/**
 * The Game Master's review of a kid's creation (creationReview.ts): approving writes the approved state and the day the
 * AP was paid, pays the maker once through the user store and tells them; sending back writes the note on the beast
 * and on the quest made with it. The stores are plain objects over maps; Pinia is real with the disks faked.
 */
import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { creationAp, creationRows } from "@/lib/services/creations/creations";
import type { Proposal } from "@/lib/services/creations/creations";
import {
  approveRow,
  approveStoredBeast,
  approveStoredQuest,
  loadCreationRows,
  returnRow,
} from "@/lib/services/creations/creationReview";
import type { ReviewStores } from "@/lib/services/creations/creationReview";
import { creationWaitingNotification } from "@/lib/services/notifications/Notifications";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";

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

const SENT = "2026-10-26T08:00:00.000Z";
const NOW = new Date("2026-10-27T10:00:00.000Z");
const LATER = new Date("2026-10-28T09:00:00.000Z");

const stats = () => ({
  level: 1,
  xp: { now: 0, next_level: 283 },
  hp: { now: 20, max: 100 },
  mp: { now: 10, max: 80 },
  gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
  ap: { total: 0, history: [] },
});

const addProfile = (id: string, isAdult = false) =>
  useUserStore().addUser({ id, name: { nick: id }, jobClass: "Warrior", isAdult, stats: stats() });

const waiting = (by: string, patch: Partial<Proposal> = {}): Proposal => ({ by, on: SENT, state: "proposed", ...patch });

const sockMonster = (patch: Partial<Beast> = {}): Beast => ({
  id: "b1",
  name: "Sock Monster",
  checklist: ["Find the pair", "Roll them"],
  localImage: "data:image/webp;base64,AAAA",
  madeBy: "ronan",
  proposal: waiting("ronan"),
  ...patch,
});

const dishQuest = (patch: Partial<Achievement> = {}): Achievement =>
  ({
    id: "q1",
    achievementName: "Do The Dishes",
    assignee: ["mia"],
    draft: true,
    difficulty: 2,
    createdBy: "jack",
    proposal: waiting("jack"),
    ...patch,
  }) as Achievement;

/** Plain stores over maps: what the service writes is what the next read hands back */
const fakeStores = (beasts: Array<Beast | null>, quests: Array<Achievement | null>) => {
  const beastRows = new Map(beasts.filter(Boolean).map((beast) => [String(beast?.id), beast as Beast]));
  const questRows = new Map(quests.filter(Boolean).map((quest) => [String(quest?.id), quest as Achievement]));
  const stores: ReviewStores = {
    bestiaryDb: {
      getBeasts: async () => [...beasts.filter((beast) => beast === null), ...beastRows.values()],
      setBeast: async (beast: Beast) => {
        beastRows.set(String(beast.id), beast);
      },
    },
    achievementDb: {
      getTasks: async () => [...quests.filter((quest) => quest === null), ...questRows.values()] as Achievement[],
      setTask: async (quest: Achievement) => {
        questRows.set(String(quest.id), quest);
      },
    },
  };
  return { stores, beast: (id: string) => beastRows.get(id), quest: (id: string) => questRows.get(id) };
};

const feedOf = (heroId: string) => useNotificationsStore().forHero(heroId);
const apOf = (heroId: string) => useUserStore().users[heroId].stats.ap.total as number;

let paid: jest.SpyInstance;

beforeEach(() => {
  setActivePinia(createPinia());
  for (const id of ["ronan", "jack", "mia"]) addProfile(id);
  addProfile("mom", true);
  paid = jest.spyOn(useUserStore(), "recordAPGain");
});

describe("loadCreationRows", () => {
  it("lists the rows in the states asked for, skipping the holes storage can leave", async () => {
    const { stores } = fakeStores([sockMonster(), null], [null, dishQuest()]);
    const rows = await loadCreationRows(["proposed"], stores);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1", "quest:q1"]);
    expect(await loadCreationRows(["approved", "returned"], stores)).toEqual([]);
  });
});

describe("approveRow", () => {
  it("approves a beast, dates the pay, pays the maker once and tells them", async () => {
    const { stores, beast } = fakeStores([sockMonster()], []);
    useNotificationsStore().push(creationWaitingNotification("mom", { key: "beast:b1", name: "Sock Monster", kind: "beast" }, "Ronan"));
    const [row] = creationRows([sockMonster()], []);

    expect(await approveRow(row, "mom", { now: NOW }, stores)).toEqual({ ok: true, ap: creationAp("beast") });

    expect(beast("b1")?.proposal).toEqual({
      by: "ronan",
      on: SENT,
      state: "approved",
      reviewedBy: "mom",
      reviewedOn: NOW.toISOString(),
      paidOn: NOW.toISOString(),
    });
    expect(paid).toHaveBeenCalledTimes(1);
    expect(paid).toHaveBeenCalledWith({ userId: "ronan", amount: creationAp("beast"), source: "creation", at: NOW.toISOString() });
    expect(apOf("ronan")).toBe(creationAp("beast"));
    expect(feedOf("ronan")).toEqual([
      expect.objectContaining({ kind: "creation-approved", refId: "beast:b1", body: `"Sock Monster" was approved. +${creationAp("beast")} AP.` }),
    ]);
    // The Game Master's own "a creation awaits" notice is settled
    expect(feedOf("mom")[0].readAt).toBeTruthy();
  });

  it("answers settled the second time, and pays nothing again", async () => {
    const { stores } = fakeStores([sockMonster()], []);
    const [row] = creationRows([sockMonster()], []);
    await approveRow(row, "mom", { now: NOW }, stores);

    expect(await approveRow(row, "dad", { now: LATER }, stores)).toEqual({ ok: false, reason: "settled" });
    expect(paid).toHaveBeenCalledTimes(1);
    expect(apOf("ronan")).toBe(creationAp("beast"));
  });

  it("pays nothing when the stored record says the AP was paid already, whatever the row says", async () => {
    const { stores, beast } = fakeStores([sockMonster({ proposal: waiting("ronan", { paidOn: SENT }) })], []);
    const [row] = creationRows([sockMonster()], []);

    expect(await approveRow(row, "mom", { now: NOW }, stores)).toEqual({ ok: true, ap: 0 });
    expect(beast("b1")?.proposal).toMatchObject({ state: "approved", paidOn: SENT });
    expect(paid).not.toHaveBeenCalled();
  });

  it("approves the quest made with the beast too, for the heroes the Game Master chose, and pays both makers", async () => {
    const pairedBeast = sockMonster({ proposal: waiting("ronan", { questId: "q1" }) });
    const { stores, beast, quest } = fakeStores([pairedBeast], [dishQuest()]);
    const [row] = creationRows([pairedBeast], [dishQuest()]);
    expect(row.pairedQuest).toBeDefined();

    const result = await approveRow(row, "mom", { assignee: ["mia", "jack"], now: NOW }, stores);

    expect(result).toEqual({ ok: true, ap: creationAp("beast") + creationAp("quest") });
    expect(beast("b1")?.proposal).toMatchObject({ state: "approved", paidOn: NOW.toISOString() });
    expect(quest("q1")).toMatchObject({
      draft: false,
      assignee: ["mia", "jack"],
      proposal: { state: "approved", reviewedBy: "mom", paidOn: NOW.toISOString() },
    });
    expect(paid).toHaveBeenCalledTimes(2);
    expect(paid).toHaveBeenCalledWith(expect.objectContaining({ userId: "ronan", amount: creationAp("beast") }));
    expect(paid).toHaveBeenCalledWith(expect.objectContaining({ userId: "jack", amount: creationAp("quest") }));
    expect(feedOf("jack")).toEqual([expect.objectContaining({ kind: "creation-approved", refId: "quest:q1" })]);
  });

  it("approves a quest on its own and keeps the heroes the kid asked for when none are chosen", async () => {
    const { stores, quest } = fakeStores([], [dishQuest()]);
    const [row] = creationRows([], [dishQuest()]);

    expect(await approveRow(row, "mom", { now: NOW }, stores)).toEqual({ ok: true, ap: creationAp("quest") });
    expect(quest("q1")).toMatchObject({ draft: false, assignee: ["mia"], proposal: { state: "approved" } });
    expect(paid).toHaveBeenCalledWith(expect.objectContaining({ userId: "jack", source: "creation" }));
  });

  it("answers gone for a record that is no longer stored, and pays nothing", async () => {
    const { stores } = fakeStores([], []);
    const [row] = creationRows([sockMonster()], []);

    expect(await approveRow(row, "mom", { now: NOW }, stores)).toEqual({ ok: false, reason: "gone" });
    expect(paid).not.toHaveBeenCalled();
    expect(feedOf("ronan")).toEqual([]);
  });
});

describe("returnRow", () => {
  it("sends the beast and the quest made with it back with one trimmed note, and tells the maker", async () => {
    const pairedBeast = sockMonster({ proposal: waiting("ronan", { questId: "q1" }) });
    const { stores, beast, quest } = fakeStores([pairedBeast], [dishQuest()]);
    const [row] = creationRows([pairedBeast], [dishQuest()]);

    expect(await returnRow(row, "mom", "  Bigger teeth  ", stores)).toEqual({ ok: true });

    expect(beast("b1")?.proposal).toMatchObject({ state: "returned", note: "Bigger teeth", reviewedBy: "mom", questId: "q1" });
    expect(quest("q1")).toMatchObject({ draft: true, proposal: { state: "returned", note: "Bigger teeth", reviewedBy: "mom" } });
    expect(feedOf("ronan")).toEqual([
      expect.objectContaining({ kind: "creation-returned", refId: "beast:b1", body: expect.stringContaining("Bigger teeth") }),
    ]);
    expect(paid).not.toHaveBeenCalled();
  });

  it("sends a quest back with no note at all when the note is blank", async () => {
    const { stores, quest } = fakeStores([], [dishQuest()]);
    const [row] = creationRows([], [dishQuest()]);

    expect(await returnRow(row, "mom", "   ", stores)).toEqual({ ok: true });
    expect(quest("q1")?.proposal).toMatchObject({ state: "returned" });
    expect(quest("q1")?.proposal?.note).toBeUndefined();
    expect(feedOf("jack")).toEqual([expect.objectContaining({ kind: "creation-returned", refId: "quest:q1" })]);
  });

  it("cannot take back a creation that is already in the game, or one that is gone", async () => {
    const { stores } = fakeStores([sockMonster({ proposal: waiting("ronan", { state: "approved" }) })], []);
    const [row] = creationRows([sockMonster()], []);
    expect(await returnRow(row, "mom", "Too late", stores)).toEqual({ ok: false });
    expect(await returnRow(row, "mom", "Too late", fakeStores([], []).stores)).toEqual({ ok: false });
    expect(feedOf("ronan")).toEqual([]);
  });
});

describe("the edit path: saving in the Game Master's own form approves the creation", () => {
  it("approves a stored beast once, pays and tells the maker, and has nothing to do afterwards", async () => {
    const { stores, beast } = fakeStores([sockMonster({ name: "Sock Gobbo" })], []);

    expect(await approveStoredBeast("b1", "mom", stores)).toBe(true);
    expect(beast("b1")?.proposal).toMatchObject({ state: "approved", reviewedBy: "mom", paidOn: expect.any(String) });
    expect(paid).toHaveBeenCalledTimes(1);
    expect(feedOf("ronan")).toEqual([expect.objectContaining({ kind: "creation-approved", body: expect.stringContaining("Sock Gobbo") })]);

    expect(await approveStoredBeast("b1", "mom", stores)).toBe(false);
    expect(paid).toHaveBeenCalledTimes(1);
  });

  it("has nothing to do for a beast that is not stored, or one a Game Master made", async () => {
    const { stores } = fakeStores([sockMonster({ id: "old", proposal: undefined })], []);
    expect(await approveStoredBeast("nope", "mom", stores)).toBe(false);
    expect(await approveStoredBeast("old", "mom", stores)).toBe(false);
    expect(paid).not.toHaveBeenCalled();
  });

  it("approves a stored quest once, out of the drafts, keeping the heroes it was for", async () => {
    const { stores, quest } = fakeStores([], [dishQuest({ proposal: waiting("jack", { state: "returned", note: "Shorter name" }) })]);

    expect(await approveStoredQuest("q1", "mom", stores)).toBe(true);
    expect(quest("q1")).toMatchObject({ draft: false, assignee: ["mia"], proposal: { state: "approved", paidOn: expect.any(String) } });
    expect(quest("q1")?.proposal).not.toHaveProperty("note");
    expect(paid).toHaveBeenCalledWith(expect.objectContaining({ userId: "jack", amount: creationAp("quest"), source: "creation" }));

    expect(await approveStoredQuest("q1", "mom", stores)).toBe(false);
    expect(paid).toHaveBeenCalledTimes(1);
  });
});
