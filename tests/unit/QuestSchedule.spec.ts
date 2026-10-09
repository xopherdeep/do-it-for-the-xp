import QuestEngine from "@/lib/engine/quests/QuestEngine";
import {
  countPendingInWindow,
  getQuestWindow,
  hasPendingClaimFor,
  isQuestActiveOn,
  isQuestOpenFor,
  getQuestProgressFor,
  QuestScheduleFields,
} from "@/lib/engine/quests/QuestSchedule";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";

// The quest board reads quests and the quest log from IndexedDB-backed storage; these specs feed it plain arrays.
const mockGetTasks = jest.fn();
const mockGetEntriesForUser = jest.fn();

jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTasks() {
      return mockGetTasks();
    }
  },
  achievementStorage: {},
}));

jest.mock("@/lib/databases/QuestLogDb", () => ({
  getQuestLogDb: () => ({ getEntriesForUser: (userId: string) => mockGetEntriesForUser(userId) }),
}));

// Calendar facts used below: 2026-10-05 is a Monday, 2026-10-08 is a Thursday.
const makeQuest = (overrides: Partial<QuestScheduleFields> = {}): QuestScheduleFields => ({
  id: "quest-1",
  basicSchedule: "daily",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  repeatOnDays: [],
  showDailyUntilComplete: false,
  startsOn: "2026-10-01T09:00:00",
  endsOn: "",
  ...overrides,
});

const makeEntry = (completedAt: string, overrides: Partial<QuestLogEntry> = {}): QuestLogEntry => ({
  id: `entry-${completedAt}`,
  questId: "quest-1",
  questName: "Clean the kitchen",
  userId: "hero-1",
  completedAt,
  dayKey: completedAt.slice(0, 10),
  status: "approved",
  source: "claim",
  rewards: { xp: 100, gp: 10, ap: 1 },
  rewardsApplied: true,
  ...overrides,
});

const at = (iso: string) => new Date(iso);

describe("QuestSchedule", () => {
  describe("activity window", () => {
    it("is inactive before startsOn and after endsOn", () => {
      const quest = makeQuest({ startsOn: "2026-10-05T00:00:00", endsOn: "2026-10-10T00:00:00" });
      expect(isQuestActiveOn(quest, at("2026-10-04T23:00:00"))).toBe(false);
      expect(isQuestActiveOn(quest, at("2026-10-05T00:30:00"))).toBe(true);
      expect(isQuestActiveOn(quest, at("2026-10-10T23:00:00"))).toBe(true);
      expect(isQuestActiveOn(quest, at("2026-10-11T00:00:00"))).toBe(false);
      expect(getQuestWindow(quest, at("2026-10-11T12:00:00"))).toBeNull();
    });
  });

  describe("once", () => {
    const quest = makeQuest({ basicSchedule: "once" });

    it("stays open until it has been completed, on any day", () => {
      expect(isQuestOpenFor(quest, [], "hero-1", at("2026-10-08T10:00:00"))).toBe(true);
      const done = [makeEntry("2026-10-02T10:00:00")];
      expect(isQuestOpenFor(quest, done, "hero-1", at("2026-10-08T10:00:00"))).toBe(false);
    });

    it("re-opens when the only completion was rejected, and ignores other heroes", () => {
      const rejected = [makeEntry("2026-10-02T10:00:00", { status: "rejected" })];
      expect(isQuestOpenFor(quest, rejected, "hero-1", at("2026-10-08T10:00:00"))).toBe(true);
      const someoneElse = [makeEntry("2026-10-02T10:00:00", { userId: "hero-2" })];
      expect(isQuestOpenFor(quest, someoneElse, "hero-1", at("2026-10-08T10:00:00"))).toBe(true);
    });

    it("counts pending completions so a hero cannot claim twice while waiting for approval", () => {
      const pending = [makeEntry("2026-10-08T08:00:00", { status: "pending" })];
      expect(isQuestOpenFor(quest, pending, "hero-1", at("2026-10-08T10:00:00"))).toBe(false);
    });
  });

  describe("daily", () => {
    const quest = makeQuest({ basicSchedule: "daily" });

    it("is open once per local day", () => {
      expect(isQuestOpenFor(quest, [], "hero-1", at("2026-10-08T10:00:00"))).toBe(true);
      const doneToday = [makeEntry("2026-10-08T07:00:00")];
      expect(isQuestOpenFor(quest, doneToday, "hero-1", at("2026-10-08T22:00:00"))).toBe(false);
      const doneYesterday = [makeEntry("2026-10-07T23:30:00")];
      expect(isQuestOpenFor(quest, doneYesterday, "hero-1", at("2026-10-08T00:10:00"))).toBe(true);
    });
  });

  describe("weekly", () => {
    it("is only due on the listed weekdays and each listed day is its own window", () => {
      const quest = makeQuest({ basicSchedule: "weekly", repeatOnDays: ["mon", "wed"] });
      expect(getQuestWindow(quest, at("2026-10-06T10:00:00"))).toBeNull(); // Tuesday
      expect(isQuestOpenFor(quest, [], "hero-1", at("2026-10-05T10:00:00"))).toBe(true); // Monday
      const doneMonday = [makeEntry("2026-10-05T10:00:00")];
      expect(isQuestOpenFor(quest, doneMonday, "hero-1", at("2026-10-05T18:00:00"))).toBe(false);
      expect(isQuestOpenFor(quest, doneMonday, "hero-1", at("2026-10-07T10:00:00"))).toBe(true); // Wednesday
    });

    it("with showDailyUntilComplete it stays open all week until the listed days are used up", () => {
      const quest = makeQuest({
        basicSchedule: "weekly",
        repeatOnDays: ["mon"],
        showDailyUntilComplete: true,
        startsOn: "2026-10-05T00:00:00",
      });
      expect(isQuestOpenFor(quest, [], "hero-1", at("2026-10-06T10:00:00"))).toBe(true); // Tuesday
      const doneMonday = [makeEntry("2026-10-05T10:00:00")];
      expect(isQuestOpenFor(quest, doneMonday, "hero-1", at("2026-10-06T10:00:00"))).toBe(false);
      expect(isQuestOpenFor(quest, doneMonday, "hero-1", at("2026-10-12T10:00:00"))).toBe(true); // next Monday
    });

    it("with no listed days it is once per week from the start date", () => {
      const quest = makeQuest({ basicSchedule: "weekly", repeatOnDays: [], startsOn: "2026-10-05T00:00:00" });
      const window = getQuestWindow(quest, at("2026-10-08T10:00:00"));
      expect(window?.start).toEqual(at("2026-10-05T00:00:00"));
      expect(window?.end).toEqual(at("2026-10-12T00:00:00"));
      expect(window?.allowance).toBe(1);
    });
  });

  describe("custom", () => {
    it("allows N completions per period: 2 times every 1 week", () => {
      const quest = makeQuest({
        basicSchedule: "custom",
        customFrequency: 2,
        customPeriodNumber: 1,
        customPeriodType: "week",
        startsOn: "2026-10-05T00:00:00",
      });
      const one = [makeEntry("2026-10-05T10:00:00")];
      expect(getQuestProgressFor(quest, one, "hero-1", at("2026-10-08T10:00:00"))).toEqual({
        done: 1,
        allowance: 2,
        isOpen: true,
      });
      const two = [...one, makeEntry("2026-10-07T10:00:00")];
      expect(isQuestOpenFor(quest, two, "hero-1", at("2026-10-08T10:00:00"))).toBe(false);
      expect(isQuestOpenFor(quest, two, "hero-1", at("2026-10-12T10:00:00"))).toBe(true); // next week
    });

    it("1 time every 2 days uses two-day windows anchored on the start date", () => {
      const quest = makeQuest({
        basicSchedule: "custom",
        customFrequency: 1,
        customPeriodNumber: 2,
        customPeriodType: "day",
        startsOn: "2026-10-05T00:00:00",
      });
      const done = [makeEntry("2026-10-05T10:00:00")];
      expect(isQuestOpenFor(quest, done, "hero-1", at("2026-10-06T10:00:00"))).toBe(false);
      expect(isQuestOpenFor(quest, done, "hero-1", at("2026-10-07T10:00:00"))).toBe(true);
    });

    it("monthly windows do not overshoot when the start date is the 31st", () => {
      const quest = makeQuest({
        basicSchedule: "custom",
        customFrequency: 1,
        customPeriodNumber: 1,
        customPeriodType: "month",
        startsOn: "2026-01-31T00:00:00",
      });
      const window = getQuestWindow(quest, at("2026-03-05T10:00:00"));
      expect(window?.start).toEqual(at("2026-02-28T00:00:00"));
      expect(window?.end).toEqual(at("2026-03-28T00:00:00"));
      const doneEarlyFeb = [makeEntry("2026-02-03T10:00:00")];
      expect(isQuestOpenFor(quest, doneEarlyFeb, "hero-1", at("2026-02-15T10:00:00"))).toBe(false);
      expect(isQuestOpenFor(quest, doneEarlyFeb, "hero-1", at("2026-03-05T10:00:00"))).toBe(true);
    });
  });

  describe("pending claims", () => {
    const daily = makeQuest({ basicSchedule: "daily" });
    const pendingToday = makeEntry("2026-10-08T07:00:00", { status: "pending" });

    it("sees a claim that still waits for the Game Master inside the current window", () => {
      expect(hasPendingClaimFor(daily, [pendingToday], "hero-1", at("2026-10-08T22:00:00"))).toBe(true);
    });

    it("keeps the claim counted toward the allowance: used up, but pending rather than tamed", () => {
      const progress = getQuestProgressFor(daily, [pendingToday], "hero-1", at("2026-10-08T22:00:00"));
      expect(progress).toEqual({ done: 1, allowance: 1, isOpen: false });
    });

    it("is false once the window has moved on, because the quest is open again", () => {
      expect(hasPendingClaimFor(daily, [pendingToday], "hero-1", at("2026-10-09T08:00:00"))).toBe(false);
      expect(isQuestOpenFor(daily, [pendingToday], "hero-1", at("2026-10-09T08:00:00"))).toBe(true);
    });

    it("is false with no claims, and once the Game Master approved or rejected the claim", () => {
      const now = at("2026-10-08T22:00:00");
      expect(hasPendingClaimFor(daily, [], "hero-1", now)).toBe(false);
      expect(hasPendingClaimFor(daily, [{ ...pendingToday, status: "approved" }], "hero-1", now)).toBe(false);
      const rejected = [{ ...pendingToday, status: "rejected" as const }];
      expect(hasPendingClaimFor(daily, rejected, "hero-1", now)).toBe(false);
      expect(isQuestOpenFor(daily, rejected, "hero-1", now)).toBe(true); // a rejected claim re-opens the quest
    });

    it("ignores the claims of other heroes and other quests", () => {
      const now = at("2026-10-08T22:00:00");
      expect(hasPendingClaimFor(daily, [{ ...pendingToday, userId: "hero-2" }], "hero-1", now)).toBe(false);
      expect(hasPendingClaimFor(daily, [{ ...pendingToday, questId: "quest-2" }], "hero-1", now)).toBe(false);
    });

    it("is false on a day the quest is not due, even though the claim exists", () => {
      const weekly = makeQuest({ basicSchedule: "weekly", repeatOnDays: ["mon"] });
      const pendingMonday = makeEntry("2026-10-05T10:00:00", { status: "pending" });
      expect(hasPendingClaimFor(weekly, [pendingMonday], "hero-1", at("2026-10-05T18:00:00"))).toBe(true);
      expect(hasPendingClaimFor(weekly, [pendingMonday], "hero-1", at("2026-10-06T10:00:00"))).toBe(false); // Tuesday
    });

    it("follows a once quest on every later day until the Game Master decides", () => {
      const once = makeQuest({ basicSchedule: "once" });
      const pending = makeEntry("2026-10-02T10:00:00", { status: "pending" });
      expect(hasPendingClaimFor(once, [pending], "hero-1", at("2026-10-08T10:00:00"))).toBe(true);
      expect(hasPendingClaimFor(once, [{ ...pending, status: "approved" }], "hero-1", at("2026-10-08T10:00:00"))).toBe(false);
    });

    it("flags a pending claim while the allowance still has room: 2 times every 1 week", () => {
      const quest = makeQuest({
        basicSchedule: "custom",
        customFrequency: 2,
        customPeriodNumber: 1,
        customPeriodType: "week",
        startsOn: "2026-10-05T00:00:00",
      });
      const now = at("2026-10-08T10:00:00");
      const approved = makeEntry("2026-10-05T10:00:00");
      const pending = makeEntry("2026-10-07T10:00:00", { status: "pending" });

      // One claim, still waiting: the hero may claim again, but one claim is pending
      expect(getQuestProgressFor(quest, [pending], "hero-1", now)).toEqual({ done: 1, allowance: 2, isOpen: true });
      expect(hasPendingClaimFor(quest, [pending], "hero-1", now)).toBe(true);

      // Allowance used up by one approved and one pending claim: done, and still pending
      expect(getQuestProgressFor(quest, [approved, pending], "hero-1", now)?.isOpen).toBe(false);
      expect(hasPendingClaimFor(quest, [approved, pending], "hero-1", now)).toBe(true);

      // Both approved: done for good, nothing pending
      expect(hasPendingClaimFor(quest, [approved, { ...pending, status: "approved" }], "hero-1", now)).toBe(false);
    });

    it("counts only pending claims of that hero and quest inside the window", () => {
      const quest = makeQuest({ basicSchedule: "weekly", repeatOnDays: [], startsOn: "2026-10-05T00:00:00" });
      const window = getQuestWindow(quest, at("2026-10-08T10:00:00"))!;
      const entries = [
        makeEntry("2026-10-06T10:00:00", { status: "pending" }),
        makeEntry("2026-10-07T10:00:00", { status: "pending" }),
        makeEntry("2026-10-07T11:00:00", { status: "approved" }),
        makeEntry("2026-10-07T12:00:00", { status: "rejected" }),
        makeEntry("2026-10-07T13:00:00", { status: "pending", userId: "hero-2" }),
        makeEntry("2026-10-07T14:00:00", { status: "pending", questId: "quest-2" }),
        makeEntry("2026-10-04T23:00:00", { status: "pending" }), // the week before
        makeEntry("2026-10-12T00:00:00", { status: "pending" }), // the window ends exclusive
      ];
      expect(countPendingInWindow(entries, "quest-1", "hero-1", window)).toBe(2);
    });
  });
});

describe("QuestEngine board", () => {
  const hero = "hero-1";
  const now = at("2026-10-08T12:00:00");
  const quest = (id: string, overrides: Partial<QuestScheduleFields> = {}) =>
    ({
      ...makeQuest({ id, ...overrides }),
      achievementName: `Quest ${id}`,
      type: "assigned",
      assignee: [hero],
    }) as unknown as Achievement;

  const board = async (quests: Achievement[], entries: QuestLogEntry[]) => {
    mockGetTasks.mockResolvedValue(quests);
    mockGetEntriesForUser.mockResolvedValue(entries);
    return new QuestEngine().getQuestBoardForUser(hero, now);
  };

  it("marks a used-up quest whose claim awaits the Game Master as done and pending", async () => {
    const [item] = await board(
      [quest("quest-1")],
      [makeEntry("2026-10-08T08:00:00", { status: "pending" })]
    );
    expect(item).toMatchObject({ status: "done", pending: true, progress: { done: 1, allowance: 1, isOpen: false } });
  });

  it("marks an approved quest as done but not pending", async () => {
    const [item] = await board([quest("quest-1")], [makeEntry("2026-10-08T08:00:00")]);
    expect(item).toMatchObject({ status: "done", pending: false });
  });

  it("keeps open and not-due quests out of pending, and drops a rejected claim", async () => {
    const items = await board(
      [
        quest("quest-1"), // daily, nothing logged today
        quest("quest-2", { basicSchedule: "weekly", repeatOnDays: ["mon"] }), // Thursday: not due
        quest("quest-3"), // daily, claim rejected
      ],
      [
        makeEntry("2026-10-07T08:00:00", { status: "pending" }), // yesterday's claim for quest-1: another window
        makeEntry("2026-10-05T08:00:00", { questId: "quest-2", status: "pending" }),
        makeEntry("2026-10-08T08:00:00", { questId: "quest-3", status: "rejected" }),
      ]
    );
    expect(items.map(({ status, pending }) => ({ status, pending }))).toEqual([
      { status: "open", pending: false },
      { status: "notDue", pending: false },
      { status: "open", pending: false },
    ]);
  });

  it("keeps a pending claim visible next to an open allowance", async () => {
    const [item] = await board(
      [
        quest("quest-1", {
          basicSchedule: "custom",
          customFrequency: 2,
          customPeriodNumber: 1,
          customPeriodType: "week",
          startsOn: "2026-10-05T00:00:00",
        }),
      ],
      [makeEntry("2026-10-07T08:00:00", { status: "pending" })]
    );
    expect(item).toMatchObject({ status: "open", pending: true, progress: { done: 1, allowance: 2, isOpen: true } });
  });
});
