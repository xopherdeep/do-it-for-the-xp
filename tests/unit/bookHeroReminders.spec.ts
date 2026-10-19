import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";

/** bookHeroReminders: one hero's board becomes that hero's phone reminders, without touching the feed or the penalties. */
const NOON = new Date(2026, 9, 18, 12, 0, 0);

const mockBoardFor = jest.fn();
const mockSchedule = jest.fn(async (..._args: unknown[]) => ({ scheduled: 1 }));
const mockPush = jest.fn();

jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  ...jest.requireActual("@/lib/engine/quests/QuestEngine"),
  getQuestEngine: () => ({ getQuestBoardForUser: mockBoardFor }),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ getUserById: (id: string) => (id === "kid-1" ? { id, questEffects: undefined } : undefined) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  useNotificationsStore: () => ({ push: mockPush, load: jest.fn() }),
}));
jest.mock("@/lib/services/notifications/deviceReminders", () => ({
  ...jest.requireActual("@/lib/services/notifications/deviceReminders"),
  scheduleDueReminders: (...args: unknown[]) => mockSchedule(...args),
}));

import { bookHeroReminders } from "@/lib/services/notifications/questWatch";

const quest = (id: string, dueByTime: string, name = `Quest ${id}`) =>
  ({ id, achievementName: name, dueByTime } as QuestBoardItem["quest"]);
const row = (q: QuestBoardItem["quest"], extra: Partial<QuestBoardItem> = {}): QuestBoardItem => ({
  quest: q,
  status: "open",
  progress: null,
  pending: false,
  overdue: false,
  ...extra,
});

describe("bookHeroReminders", () => {
  beforeEach(() => {
    mockBoardFor.mockReset();
    mockSchedule.mockClear();
    mockPush.mockClear();
  });

  it("reads the hero's own board and books only the quests still ahead, under that hero", async () => {
    mockBoardFor.mockResolvedValue([row(quest("soon", "13:30", "Dishes")), row(quest("late", "11:00"), { overdue: true })]);
    const result = await bookHeroReminders("kid-1", NOON);
    expect(mockBoardFor).toHaveBeenCalledWith("kid-1", NOON, undefined, undefined);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const [heroId, reminders, now] = mockSchedule.mock.calls[0] as [string, Array<{ questId: string }>, Date];
    expect(heroId).toBe("kid-1");
    expect(reminders.map((r) => r.questId)).toEqual(["soon"]);
    expect(now).toBe(NOON);
    expect(result).toEqual({ scheduled: 1 });
  });

  it("still asks the scheduler with an empty list when nothing is ahead, so booked reminders are taken back", async () => {
    mockBoardFor.mockResolvedValue([row(quest("done", "13:30"), { status: "done" })]);
    await bookHeroReminders("kid-1", NOON);
    expect(mockSchedule).toHaveBeenCalledWith("kid-1", [], NOON);
  });

  it("books a hero who is not in the roster by id alone and leaves the feed untouched", async () => {
    mockBoardFor.mockResolvedValue([]);
    await bookHeroReminders("stranger", NOON);
    expect(mockSchedule).toHaveBeenCalledWith("stranger", [], NOON);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
