import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";

/**
 * The quest watch under Family Sync (spec section 5, "Late penalties, deadlines, encounters"): a device charges late
 * penalties and fills the feed only for heroes whose turn it holds, so a penalty is charged once and an alert reaches the
 * phone in the hero's hand. With sync off every hero is watched, as before.
 */
const NOON = new Date(2026, 9, 18, 12, 0, 0);

let mockSyncOn = false;
let mockHeld = new Set<string>();
jest.mock("@/lib/store/stores/sync", () => ({
  useSyncStore: () => ({
    get isOn() {
      return mockSyncOn;
    },
    holds: (id: string) => mockHeld.has(id),
  }),
}));

const mockBoardFor = jest.fn();
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  ...jest.requireActual("@/lib/engine/quests/QuestEngine"),
  getQuestEngine: () => ({ getQuestBoardForUser: (...args: unknown[]) => mockBoardFor(...args) }),
}));

const mockPush = jest.fn(() => true);
const mockLoad = jest.fn();
jest.mock("@/lib/store/stores/notifications", () => ({
  useNotificationsStore: () => ({ push: mockPush, load: mockLoad }),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ getUserById: (id: string) => ({ id, questEffects: undefined }) }),
}));

const mockCharge = jest.fn();
jest.mock("@/lib/services/quests/lateChores", () => ({
  ...jest.requireActual("@/lib/services/quests/lateChores"),
  chargeLatePenalties: (...args: unknown[]) => mockCharge(...args),
  lockedNoticesFor: async () => ({}),
}));

const mockRecap = jest.fn();
jest.mock("@/lib/services/notifications/weeklyRecapWatch", () => ({
  runWeeklyRecapWatch: (...args: unknown[]) => mockRecap(...args),
}));

const mockPurge = jest.fn();
jest.mock("@/lib/services/quests/claimPhotoRetention", () => ({
  runClaimPhotoPurge: (...args: unknown[]) => mockPurge(...args),
}));

import { heroesToWatch, runQuestWatch } from "@/lib/services/notifications/questWatch";

const overdueRow = (id: string): QuestBoardItem => ({
  quest: { id, achievementName: `Quest ${id}`, dueByTime: "09:00" } as QuestBoardItem["quest"],
  status: "open",
  progress: null,
  pending: false,
  overdue: true,
});

describe("heroesToWatch", () => {
  const holdsOnly = (...held: string[]) => ({ holds: (id: string) => held.includes(id) });

  it("with sync off, every hero is watched", () => {
    expect(heroesToWatch(["ana", "ben", "cy"], { isOn: false, ...holdsOnly() })).toEqual(["ana", "ben", "cy"]);
  });

  it("with sync on, only held heroes are watched", () => {
    expect(heroesToWatch(["ana", "ben", "cy"], { isOn: true, ...holdsOnly("ben") })).toEqual(["ben"]);
  });

  it("with sync on and no turn held, no hero is watched", () => {
    expect(heroesToWatch(["ana", "ben"], { isOn: true, ...holdsOnly() })).toEqual([]);
  });
});

describe("runQuestWatch with Family Sync", () => {
  beforeEach(() => {
    mockSyncOn = false;
    mockHeld = new Set();
    mockBoardFor.mockReset();
    mockBoardFor.mockResolvedValue([overdueRow("dishes")]);
    mockPush.mockClear();
    mockLoad.mockClear();
    mockCharge.mockReset();
    mockCharge.mockResolvedValue([{ questId: "dishes", questName: "Dishes", taken: 5 }]);
    mockRecap.mockReset();
    mockRecap.mockResolvedValue(false);
    mockPurge.mockReset();
  });

  it("with sync off, charges and notifies a hero as it always did", async () => {
    const run = await runQuestWatch("ana", NOON);
    expect(mockCharge).toHaveBeenCalledWith(expect.anything(), "ana", NOON);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(run.pushed).toBe(2);
  });

  it("with sync on, charges and notifies a hero whose turn this device holds", async () => {
    mockSyncOn = true;
    mockHeld = new Set(["ana"]);
    const run = await runQuestWatch("ana", NOON);
    expect(mockCharge).toHaveBeenCalledWith(expect.anything(), "ana", NOON);
    expect(run.pushed).toBe(2);
  });

  it("with sync on, charges nothing and notifies nobody for a hero another device holds", async () => {
    mockSyncOn = true;
    mockHeld = new Set(["ben"]);
    const run = await runQuestWatch("ana", NOON);
    expect(mockCharge).not.toHaveBeenCalled();
    expect(mockBoardFor).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRecap).not.toHaveBeenCalled();
    expect(run).toEqual({ pushed: 0 });
  });

  it("still sweeps the device's old claim photos when the hero is not held", async () => {
    mockSyncOn = true;
    await runQuestWatch("ana", NOON);
    expect(mockPurge).toHaveBeenCalledWith(NOON.getTime());
  });
});
