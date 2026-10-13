import QuestEngine, { boardStatusInSegment, type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  countPendingInWindow,
  deadlineDayOf,
  effectiveDeadline,
  emptyBoardLine,
  getQuestWindow,
  hasPendingClaimFor,
  isQuestActiveOn,
  isQuestOpenFor,
  isQuestOverdue,
  isSharedQuest,
  getQuestProgressFor,
  questCompletersFor,
  questMatchesSegment,
  questTimesOfDay,
  slotsFor,
  timeOfDayOf,
  timeOfDayOfHour,
  TIMES_OF_DAY,
  QuestScheduleFields,
} from "@/lib/engine/quests/QuestSchedule";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";

// The quest board reads quests and the quest log from IndexedDB-backed storage; these specs feed it plain arrays.
// The board reads every hero's log: a shared quest counts its other assignees' clears.
const mockGetTasks = jest.fn();
const mockGetEntries = jest.fn();

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
  getQuestLogDb: () => ({ getEntries: () => mockGetEntries() }),
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

  describe("shared quests (Team Effort, Rat Race)", () => {
    const now = at("2026-10-08T12:00:00");
    const assigned = (type: string, overrides: Partial<QuestScheduleFields> = {}) => ({
      ...makeQuest(overrides),
      type,
      assignee: ["hero-1", "hero-2"],
    });
    const miaToday = makeEntry("2026-10-08T08:00:00", { userId: "hero-2" });

    it("calls Team Effort and Rat Race shared and every other type individual", () => {
      expect(isSharedQuest({ type: "collaborate" })).toBe(true);
      expect(isSharedQuest({ type: "compete" })).toBe(true);
      for (const type of ["individual", "rotate", "asNeeded", "assigned", undefined]) {
        expect(isSharedQuest({ type })).toBe(false);
      }
    });

    it("fills a shared quest's window for every assignee when one of them clears it", () => {
      for (const type of ["collaborate", "compete"]) {
        const quest = assigned(type);
        expect(getQuestProgressFor(quest, [miaToday], "hero-1", now)).toEqual({ done: 1, allowance: 1, isOpen: false });
        expect(isQuestOpenFor(quest, [miaToday], "hero-2", now)).toBe(false);
        expect(questCompletersFor(quest, [miaToday], "hero-1", now)).toEqual(["hero-2"]);
      }
    });

    it("keeps every other type counting per hero, as before", () => {
      for (const type of ["individual", "rotate", "asNeeded"]) {
        const quest = assigned(type);
        expect(isQuestOpenFor(quest, [miaToday], "hero-1", now)).toBe(true);
        expect(isQuestOpenFor(quest, [miaToday], "hero-2", now)).toBe(false);
        expect(questCompletersFor(quest, [miaToday], "hero-1", now)).toEqual([]);
      }
    });

    it("ignores clears by heroes who are not assigned, rejected claims and other windows", () => {
      const quest = assigned("collaborate");
      expect(isQuestOpenFor(quest, [{ ...miaToday, userId: "hero-3" }], "hero-1", now)).toBe(true);
      expect(isQuestOpenFor(quest, [{ ...miaToday, status: "rejected" }], "hero-1", now)).toBe(true);
      expect(isQuestOpenFor(quest, [makeEntry("2026-10-07T08:00:00", { userId: "hero-2" })], "hero-1", now)).toBe(true);
    });

    it("shares a claim that waits on the Game Master, and only for a shared quest", () => {
      const pending = { ...miaToday, status: "pending" as const };
      expect(hasPendingClaimFor(assigned("collaborate"), [pending], "hero-1", now)).toBe(true);
      expect(hasPendingClaimFor(assigned("individual"), [pending], "hero-1", now)).toBe(false);
    });

    it("lists who filled the window in the order they did it, the hero included", () => {
      const quest = assigned("compete", {
        basicSchedule: "custom",
        customFrequency: 3,
        customPeriodType: "week",
        startsOn: "2026-10-05T00:00:00",
      });
      const entries = [
        makeEntry("2026-10-08T09:00:00"),
        makeEntry("2026-10-07T09:00:00", { userId: "hero-2" }),
        makeEntry("2026-10-06T09:00:00", { userId: "hero-2" }),
      ];
      expect(getQuestProgressFor(quest, entries, "hero-1", now)).toEqual({ done: 3, allowance: 3, isOpen: false });
      expect(questCompletersFor(quest, entries, "hero-1", now)).toEqual(["hero-2", "hero-1"]);
    });
  });

  describe("the one due-date rule", () => {
    // Weekly quests below start Monday 5 Oct 2026, so their week runs Monday 5 to Sunday 11
    const weekly = (overrides: Partial<QuestScheduleFields> = {}) => ({
      ...makeQuest({ basicSchedule: "weekly", startsOn: "2026-10-05T00:00:00", ...overrides }),
      dueByTime: "18:00",
    });

    it("makes a quest whose window spans the week due on the window's last day", () => {
      const quest = weekly();
      expect(deadlineDayOf(quest, undefined, at("2026-10-07T19:00:00"))).toEqual(at("2026-10-11T00:00:00"));
      expect(effectiveDeadline(quest, undefined, at("2026-10-07T19:00:00"))).toEqual(at("2026-10-11T18:00:00"));
      const untilDone = weekly({ repeatOnDays: ["mon", "thu"], showDailyUntilComplete: true });
      expect(effectiveDeadline(untilDone, undefined, at("2026-10-06T12:00:00"))).toEqual(at("2026-10-11T18:00:00"));
    });

    it("does not read a weekly quest overdue every evening of its week, only after the last day's time", () => {
      const quest = weekly();
      expect(isQuestOverdue(quest, undefined, at("2026-10-05T19:00:00"))).toBe(false);
      expect(isQuestOverdue(quest, undefined, at("2026-10-07T19:00:00"))).toBe(false);
      expect(isQuestOverdue(quest, undefined, at("2026-10-11T17:59:00"))).toBe(false);
      expect(isQuestOverdue(quest, undefined, at("2026-10-11T18:30:00"))).toBe(true);
      expect(isQuestOverdue(quest, undefined, at("2026-10-12T19:00:00"))).toBe(false); // a new week
    });

    it("keeps one-day windows (listed weekdays, daily) due on their own day", () => {
      const monday = weekly({ repeatOnDays: ["mon"] });
      expect(effectiveDeadline(monday, undefined, at("2026-10-05T09:00:00"))).toEqual(at("2026-10-05T18:00:00"));
      expect(isQuestOverdue(monday, undefined, at("2026-10-05T17:00:00"))).toBe(false);
      expect(isQuestOverdue(monday, undefined, at("2026-10-05T19:00:00"))).toBe(true);
      const daily = { ...makeQuest(), dueByTime: "18:00" };
      expect(effectiveDeadline(daily, undefined, at("2026-10-07T12:00:00"))).toEqual(at("2026-10-07T18:00:00"));
      expect(isQuestOverdue(daily, undefined, at("2026-10-07T19:00:00"))).toBe(true);
    });

    it("puts a custom period's deadline on the period's last day", () => {
      const custom = (overrides: Partial<QuestScheduleFields>, dueByTime: string) => ({
        ...makeQuest({ basicSchedule: "custom", ...overrides }),
        dueByTime,
      });
      const fortnight = custom({ customPeriodType: "week", customPeriodNumber: 2, startsOn: "2026-10-05T00:00:00" }, "09:00");
      expect(effectiveDeadline(fortnight, undefined, at("2026-10-08T12:00:00"))).toEqual(at("2026-10-18T09:00:00"));
      const monthly = custom({ customPeriodType: "month", startsOn: "2026-10-01T00:00:00" }, "20:00");
      expect(effectiveDeadline(monthly, undefined, at("2026-10-08T12:00:00"))).toEqual(at("2026-10-31T20:00:00"));
      const everyDay = custom({ customPeriodType: "day" }, "20:00");
      expect(effectiveDeadline(everyDay, undefined, at("2026-10-08T12:00:00"))).toEqual(at("2026-10-08T20:00:00"));
    });

    it("brings the deadline in to the day the quest ends", () => {
      const quest = weekly({ endsOn: "2026-10-08T00:00:00" });
      expect(effectiveDeadline(quest, undefined, at("2026-10-06T12:00:00"))).toEqual(at("2026-10-08T18:00:00"));
    });

    it("makes a once quest due on the day it starts, and late on every day after", () => {
      const once = { ...makeQuest({ basicSchedule: "once", startsOn: "2026-10-06T00:00:00" }), dueByTime: "17:00" };
      expect(effectiveDeadline(once, undefined, at("2026-10-08T09:00:00"))).toEqual(at("2026-10-06T17:00:00"));
      expect(isQuestOverdue(once, undefined, at("2026-10-08T09:00:00"))).toBe(true);
    });

    it("makes a day the Hook Shot pulled a quest into due that day", () => {
      const effects = { pulledInOn: { "quest-1": "2026-10-08" } };
      const monday = weekly({ repeatOnDays: ["mon"] });
      expect(effectiveDeadline(monday, effects, at("2026-10-08T12:00:00"))).toEqual(at("2026-10-08T18:00:00"));
    });

    it("still lets the Ice Wand push the last day's deadline later", () => {
      const effects = { extendedUntil: { "quest-1": at("2026-10-12T18:00:00").toISOString() } };
      expect(effectiveDeadline(weekly(), effects, at("2026-10-07T12:00:00"))).toEqual(at("2026-10-12T18:00:00"));
      expect(isQuestOverdue(weekly(), effects, at("2026-10-11T19:00:00"))).toBe(false);
    });
  });
});

describe("times of day", () => {
  const timed = (timesOfDay?: QuestScheduleFields["timesOfDay"], dueByTime = "") => ({ timesOfDay, dueByTime });

  it("keeps the four parts of the day in order", () => {
    expect(TIMES_OF_DAY).toEqual(["morning", "noon", "evening", "night"]);
  });

  it("maps an hour to its part of the day: morning 6-11, noon 12-17, evening 18-23, night 0-5", () => {
    expect([5, 6, 11, 12, 17, 18, 23, 0].map(timeOfDayOfHour)).toEqual([
      "night",
      "morning",
      "morning",
      "noon",
      "noon",
      "evening",
      "evening",
      "night",
    ]);
    expect(timeOfDayOf(at("2026-10-08T07:45:00"))).toBe("morning");
    expect(timeOfDayOf(at("2026-10-08T23:59:00"))).toBe("evening");
  });

  describe("questTimesOfDay", () => {
    it("lists the quest's own times in day order, without repeats", () => {
      expect(questTimesOfDay(timed(["night", "morning", "night"]))).toEqual(["morning", "night"]);
    });

    it("prefers the listed times over the due time", () => {
      expect(questTimesOfDay(timed(["evening"], "07:30"))).toEqual(["evening"]);
    });

    it("falls back to the part of the day the due time falls in", () => {
      expect(questTimesOfDay(timed(undefined, "07:30"))).toEqual(["morning"]);
      expect(questTimesOfDay(timed([], "13:00"))).toEqual(["noon"]);
      expect(questTimesOfDay(timed(undefined, "00:15"))).toEqual(["night"]);
      expect(questTimesOfDay(timed(undefined, "2026-10-08T19:00:00"))).toEqual(["evening"]);
    });

    it("is empty for an untimed quest or an unreadable due time", () => {
      expect(questTimesOfDay(timed(undefined, ""))).toEqual([]);
      expect(questTimesOfDay(timed([], "soon"))).toEqual([]);
      expect(questTimesOfDay(timed(undefined, "25:00"))).toEqual([]);
    });
  });

  describe("questMatchesSegment", () => {
    it("shows every quest under All", () => {
      expect(questMatchesSegment(timed(), "all")).toBe(true);
      expect(questMatchesSegment(timed(["night"]), "all")).toBe(true);
    });

    it("shows an untimed quest only under All", () => {
      for (const time of TIMES_OF_DAY) expect(questMatchesSegment(timed(), time)).toBe(false);
    });

    it("shows a timed quest under each of its times and no other", () => {
      const teeth = timed(["morning", "night"]);
      expect(TIMES_OF_DAY.filter((time) => questMatchesSegment(teeth, time))).toEqual(["morning", "night"]);
      expect(questMatchesSegment(timed(undefined, "07:30"), "morning")).toBe(true);
      expect(questMatchesSegment(timed(undefined, "07:30"), "noon")).toBe(false);
    });
  });

  describe("daily allowance", () => {
    const day = at("2026-10-08T10:00:00");

    it("allows one completion for each listed time", () => {
      expect(getQuestWindow(makeQuest({ timesOfDay: ["morning", "night"] }), day)?.allowance).toBe(2);
      expect(getQuestWindow(makeQuest({ timesOfDay: ["night", "morning", "night", "noon"] }), day)?.allowance).toBe(3);
    });

    it("stays at one for a single time, none, or a lone due time", () => {
      expect(getQuestWindow(makeQuest({ timesOfDay: ["evening"] }), day)?.allowance).toBe(1);
      expect(getQuestWindow(makeQuest({ timesOfDay: [] }), day)?.allowance).toBe(1);
      // A quest with only a dueByTime is not in QuestScheduleFields: it never changes the window
      expect(getQuestWindow(makeQuest(), day)?.allowance).toBe(1);
    });

    it("leaves once, weekly and custom windows alone: the times only decide the tabs there", () => {
      const timesOfDay: QuestScheduleFields["timesOfDay"] = ["morning", "night"];
      expect(getQuestWindow(makeQuest({ basicSchedule: "once", timesOfDay }), day)?.allowance).toBe(1);
      expect(getQuestWindow(makeQuest({ basicSchedule: "weekly", repeatOnDays: ["thu"], timesOfDay }), day)?.allowance).toBe(1);
      expect(
        getQuestWindow(makeQuest({ basicSchedule: "custom", customFrequency: 3, customPeriodType: "week", timesOfDay }), day)
          ?.allowance
      ).toBe(3);
    });

    it("is open until every time has been done, then used up", () => {
      const quest = makeQuest({ timesOfDay: ["morning", "night"] });
      const one = [makeEntry("2026-10-08T07:00:00")];
      const two = [...one, makeEntry("2026-10-08T21:00:00")];
      expect(getQuestProgressFor(quest, [], "hero-1", day)).toEqual({ done: 0, allowance: 2, isOpen: true });
      expect(getQuestProgressFor(quest, one, "hero-1", day)).toEqual({ done: 1, allowance: 2, isOpen: true });
      expect(getQuestProgressFor(quest, two, "hero-1", day)).toEqual({ done: 2, allowance: 2, isOpen: false });
    });
  });

  describe("slotsFor", () => {
    const quest = { timesOfDay: ["night", "morning"] as QuestScheduleFields["timesOfDay"] };
    const progress = (done: number) => ({ done, allowance: 2, isOpen: done < 2 });

    it("fills the slots in day order, however many are done", () => {
      expect(slotsFor(quest, progress(0))).toEqual([
        { time: "morning", done: false },
        { time: "night", done: false },
      ]);
      expect(slotsFor(quest, progress(1))).toEqual([
        { time: "morning", done: true },
        { time: "night", done: false },
      ]);
      expect(slotsFor(quest, progress(2))).toEqual([
        { time: "morning", done: true },
        { time: "night", done: true },
      ]);
    });

    it("is empty without listed times or without a window today", () => {
      expect(slotsFor({ timesOfDay: undefined }, progress(1))).toEqual([]);
      expect(slotsFor({ timesOfDay: [] }, progress(1))).toEqual([]);
      expect(slotsFor(quest, null)).toEqual([]);
    });
  });

  describe("boardStatusInSegment", () => {
    const item = (status: QuestBoardItem["status"], slots: QuestBoardItem["slots"]): QuestBoardItem => ({
      quest: {} as QuestBoardItem["quest"],
      status,
      progress: null,
      pending: false,
      overdue: false,
      slots,
    });
    const teethDoneInMorning = item("open", [
      { time: "morning", done: true },
      { time: "night", done: false },
    ]);

    it("reads a done slot as done and an open one as open under its own tab", () => {
      expect(boardStatusInSegment(teethDoneInMorning, "morning")).toBe("done");
      expect(boardStatusInSegment(teethDoneInMorning, "night")).toBe("open");
    });

    it("keeps the item's own status under All and under a tab the quest has no slot for", () => {
      expect(boardStatusInSegment(teethDoneInMorning, "all")).toBe("open");
      expect(boardStatusInSegment(teethDoneInMorning, "noon")).toBe("open");
      expect(boardStatusInSegment(item("done", []), "evening")).toBe("done");
      expect(boardStatusInSegment(item("open", undefined), "evening")).toBe("open");
    });

    it("keeps a quest that is not due as not due", () => {
      expect(boardStatusInSegment(item("notDue", []), "morning")).toBe("notDue");
    });
  });

  it("says something plain for a tab with no chores", () => {
    expect(emptyBoardLine("all")).toBe("No chores today.");
    expect(emptyBoardLine("morning")).toBe("No chores this morning.");
    expect(emptyBoardLine("noon")).toBe("No chores this afternoon.");
    expect(emptyBoardLine("evening")).toBe("No chores this evening.");
    expect(emptyBoardLine("night")).toBe("No chores tonight.");
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

  const board = async (quests: Achievement[], entries: QuestLogEntry[], date: Date = now) => {
    mockGetTasks.mockResolvedValue(quests);
    mockGetEntries.mockResolvedValue(entries);
    return new QuestEngine().getQuestBoardForUser(hero, date);
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

  it("never shows a hero a draft quest", async () => {
    const draft = { ...quest("quest-2"), draft: true } as Achievement;
    const items = await board([quest("quest-1"), draft], []);
    expect(items.map(({ quest }) => quest.id)).toEqual(["quest-1"]);
  });

  it("clears a shared quest for every assignee and says who did it; a solo quest stays the hero's own", async () => {
    const team = { ...quest("quest-1"), type: "collaborate", assignee: [hero, "hero-2"] } as Achievement;
    const solo = { ...quest("quest-2"), type: "individual", assignee: [hero, "hero-2"] } as Achievement;
    const items = await board(
      [team, solo],
      [
        makeEntry("2026-10-08T08:00:00", { userId: "hero-2" }),
        makeEntry("2026-10-08T08:00:00", { questId: "quest-2", userId: "hero-2" }),
      ]
    );
    expect(items[0]).toMatchObject({ status: "done", pending: false, doneBy: ["hero-2"] });
    expect(items[1]).toMatchObject({ status: "open", pending: false, doneBy: [] });
  });

  it("reads a weekly quest overdue only after the due time on its week's last day", async () => {
    // The week runs Monday 5 to Sunday 11 Oct; `now` is Thursday noon, past the 10:00 due time
    const chores = { ...quest("quest-1", { basicSchedule: "weekly", startsOn: "2026-10-05T00:00:00" }), dueByTime: "10:00" };
    const [midWeek] = await board([chores as Achievement], []);
    expect(midWeek).toMatchObject({ status: "open", overdue: false });
    const [lastDay] = await board([chores as Achievement], [], at("2026-10-11T10:30:00"));
    expect(lastDay).toMatchObject({ status: "open", overdue: true });
  });

  describe("calendar tabs", () => {
    const timedQuest = (id: string, timesOfDay?: QuestScheduleFields["timesOfDay"], dueByTime = "") =>
      ({ ...quest(id, { timesOfDay }), dueByTime }) as Achievement;
    const engine = () => new QuestEngine();
    const idsIn = (quests: Achievement[], segment: "all" | "morning" | "noon" | "evening" | "night") =>
      engine()
        .filterQuests(quests, { segment })
        .map(({ id }) => id);
    const quests = [
      timedQuest("teeth", ["morning", "night"]),
      timedQuest("dishes", ["evening"]),
      timedQuest("walk", undefined, "13:30"),
      timedQuest("dust"),
    ];

    it("lists each chore under its own times and the untimed one only under All", () => {
      expect(idsIn(quests, "all")).toEqual(["teeth", "dishes", "walk", "dust"]);
      expect(idsIn(quests, "morning")).toEqual(["teeth"]);
      expect(idsIn(quests, "noon")).toEqual(["walk"]);
      expect(idsIn(quests, "evening")).toEqual(["dishes"]);
      expect(idsIn(quests, "night")).toEqual(["teeth"]);
    });

    it("gives a tab with no chores an empty list", () => {
      expect(idsIn([timedQuest("dust")], "morning")).toEqual([]);
    });

    it("keeps getQuestSegment on the first time a quest belongs to, All when it has none", () => {
      expect(engine().getQuestSegment(timedQuest("teeth", ["night", "morning"]))).toBe("morning");
      expect(engine().getQuestSegment(timedQuest("walk", undefined, "13:30"))).toBe("noon");
      expect(engine().getQuestSegment(timedQuest("dust"))).toBe("all");
    });

    it("fills a many-times-a-day quest one slot at a time on the board", async () => {
      const teeth = timedQuest("quest-1", ["morning", "night"]);
      const [none] = await board([teeth], []);
      expect(none).toMatchObject({ status: "open", progress: { done: 0, allowance: 2 } });
      expect(none.slots).toEqual([
        { time: "morning", done: false },
        { time: "night", done: false },
      ]);

      const [one] = await board([teeth], [makeEntry("2026-10-08T07:00:00")]);
      expect(one).toMatchObject({ status: "open", progress: { done: 1, allowance: 2 } });
      expect(one.slots).toEqual([
        { time: "morning", done: true },
        { time: "night", done: false },
      ]);
      expect(boardStatusInSegment(one, "morning")).toBe("done");
      expect(boardStatusInSegment(one, "night")).toBe("open");

      const [both] = await board([teeth], [makeEntry("2026-10-08T07:00:00"), makeEntry("2026-10-08T08:00:00")]);
      expect(both.status).toBe("done");
      expect(boardStatusInSegment(both, "night")).toBe("done");
    });

    it("gives an untimed quest no slots", async () => {
      const [item] = await board([quest("quest-1")], []);
      expect(item.slots).toEqual([]);
    });
  });
});
