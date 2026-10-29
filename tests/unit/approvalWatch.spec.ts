import { createPinia, setActivePinia } from "pinia";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { CreationRow } from "@/lib/services/creations/creations";
import { loadCreationRows } from "@/lib/services/creations/creationReview";
import { cancelAlert, showAlert } from "@/lib/services/notifications/alertBridge";
import { APPROVAL_ALERT_ID } from "@/lib/services/notifications/approvalReminders";
import { runApprovalWatch } from "@/lib/services/notifications/approvalWatch";
import { CREATIONS_LINK } from "@/lib/services/notifications/Notifications";
import type { XpNotification } from "@/lib/services/notifications/Notifications";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The approval watch for a Game Master: claims past the wait become one summary and one device alert, and every creation
 * waiting on a verdict lands in the feed once (the feed's dedupe by what it is about and the day keeps it to one).
 */

const mockStored: Record<string, XpNotification[]> = {};
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => ({
    getForHero: jest.fn(async (heroId: string) => mockStored[heroId] ?? []),
    saveForHero: jest.fn(async (heroId: string, list: XpNotification[]) => {
      mockStored[heroId] = JSON.parse(JSON.stringify(list));
    }),
  }),
}));
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

let mockPending: QuestLogEntry[] = [];
jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  getQuestLogDb: () => ({ getPending: jest.fn(async () => mockPending) }),
}));
jest.mock("@/lib/services/creations/creationReview", () => ({
  __esModule: true,
  loadCreationRows: jest.fn(),
}));
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  __esModule: true,
  cancelAlert: jest.fn(async () => undefined),
  scheduleAlert: jest.fn(async () => ({ shown: false, reason: "web" })),
  showAlert: jest.fn(async () => ({ shown: true })),
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-10-27T12:00:00Z");
const GM = "gm-1";

const claim = (id: string, hoursAgo: number) =>
  ({
    id,
    userId: "kid-1",
    questName: `Chore ${id}`,
    completedAt: new Date(NOW.getTime() - hoursAgo * HOUR).toISOString(),
    status: "pending",
  } as unknown as QuestLogEntry);

const creation = (kind: "beast" | "quest", id: string, name: string, by = "kid-1") =>
  ({ key: `${kind}:${id}`, kind, id, name, by, on: NOW.toISOString(), state: "proposed" } as unknown as CreationRow);

const waitingRows = (...rows: CreationRow[]) => (loadCreationRows as jest.Mock).mockResolvedValue(rows);
const feed = () => useNotificationsStore().forHero(GM);

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  for (const heroId of Object.keys(mockStored)) delete mockStored[heroId];
  mockPending = [];
  waitingRows();
  const users = useUserStore().users;
  users[GM] = { id: GM, name: { nick: "Mum" }, isAdult: true } as never;
  users["kid-1"] = { id: "kid-1", name: { nick: "Ronan" } } as never;
  Object.assign(useUserStore().currentUser, { id: GM });
});

describe("runApprovalWatch: creations waiting", () => {
  it("answers early, as before, when no claim and no creation waits", async () => {
    expect(await runApprovalWatch(GM, NOW)).toEqual({ waiting: 0, overdue: 0, creations: 0, nudged: false });
    expect(cancelAlert).toHaveBeenCalledWith(APPROVAL_ALERT_ID);
    expect(feed()).toEqual([]);
  });

  it("pushes one creation-waiting note per waiting creation and counts them, with no claims at all", async () => {
    waitingRows(creation("beast", "b1", "Sock Monster"), creation("quest", "q1", "Do The Dishes"));

    const run = await runApprovalWatch(GM, NOW);

    expect(run).toEqual({ waiting: 0, overdue: 0, creations: 2, nudged: false });
    expect(loadCreationRows).toHaveBeenCalledWith(["proposed"]);
    expect(feed().map((note) => note.refId).sort()).toEqual(["beast:b1", "quest:q1"]);
    expect(feed().every((note) => note.kind === "creation-waiting" && note.link === CREATIONS_LINK)).toBe(true);
    // the device alert is about claims: with none waiting the booked one is taken back, none is rung
    expect(cancelAlert).toHaveBeenCalledWith(APPROVAL_ALERT_ID);
    expect(showAlert).not.toHaveBeenCalled();
  });

  it("names the maker in the note, and falls back to A hero for a maker the roster lost", async () => {
    waitingRows(creation("beast", "b1", "Sock Monster"), creation("quest", "q1", "Do The Dishes", "gone"));

    await runApprovalWatch(GM, NOW);

    const bodyOf = (refId: string) => feed().find((note) => note.refId === refId)?.body;
    expect(bodyOf("beast:b1")).toBe('Ronan made a beast: "Sock Monster".');
    expect(bodyOf("quest:q1")).toBe('A hero suggested a quest: "Do The Dishes".');
  });

  it("does not push the same creation twice across two runs, but still counts it", async () => {
    waitingRows(creation("beast", "b1", "Sock Monster"));

    const first = await runApprovalWatch(GM, NOW);
    const second = await runApprovalWatch(GM, new Date(NOW.getTime() + 5 * 60 * 1000));

    expect(first.creations).toBe(1);
    expect(second.creations).toBe(1);
    expect(feed().filter((note) => note.kind === "creation-waiting")).toHaveLength(1);
  });

  it("tells again the next day when the creation still waits", async () => {
    waitingRows(creation("beast", "b1", "Sock Monster"));

    await runApprovalWatch(GM, NOW);
    await runApprovalWatch(GM, new Date(NOW.getTime() + 24 * HOUR));

    expect(feed().filter((note) => note.kind === "creation-waiting")).toHaveLength(2);
  });

  it("keeps the summary and the device alert about claims when creations wait too", async () => {
    mockPending = [claim("late", 5)];
    waitingRows(creation("beast", "b1", "Sock Monster"));

    const run = await runApprovalWatch(GM, NOW);

    expect(run).toEqual({ waiting: 1, overdue: 1, creations: 1, nudged: true });
    expect(feed().map((note) => note.kind).sort()).toEqual(["claim-waiting", "creation-waiting"]);
    expect(showAlert).toHaveBeenCalledTimes(1);
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ id: APPROVAL_ALERT_ID, title: "A chore awaits your word" }));
  });

  it("still tells of a creation when claims are fresh and nothing is overdue", async () => {
    mockPending = [claim("fresh", 0.5)];
    waitingRows(creation("quest", "q1", "Do The Dishes"));

    const run = await runApprovalWatch(GM, NOW);

    expect(run).toEqual({ waiting: 1, overdue: 0, creations: 1, nudged: false });
    expect(feed().map((note) => note.refId)).toEqual(["quest:q1"]);
    expect(showAlert).not.toHaveBeenCalled();
  });

  it("still reminds of the claims when the creations cannot be read", async () => {
    mockPending = [claim("late", 5)];
    (loadCreationRows as jest.Mock).mockRejectedValue(new Error("storage unreadable"));

    const run = await runApprovalWatch(GM, NOW);

    expect(run).toEqual({ waiting: 1, overdue: 1, creations: 0, nudged: true });
    expect(showAlert).toHaveBeenCalledTimes(1);
  });

  it("leaves a hero's run alone: no creations loaded, no alert touched", async () => {
    waitingRows(creation("beast", "b1", "Sock Monster"));

    const run = await runApprovalWatch("kid-1", NOW);

    expect(run).toEqual({ waiting: 0, overdue: 0, creations: 0, nudged: false });
    expect(loadCreationRows).not.toHaveBeenCalled();
    expect(cancelAlert).not.toHaveBeenCalled();
  });
});
