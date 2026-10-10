import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  assigneeOf,
  dueLabelFor,
  newQuickTask,
  questListCounts,
  questListFor,
  QUICK_TASK_REWARDS,
} from "@/lib/services/quests/QuestList";

// 2026-10-10 is a Saturday; the hero reads the list at noon.
const NOON = new Date(2026, 9, 10, 12, 0, 0);

const makeQuest = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: "quest-1",
  achievementName: "Clean the kitchen",
  categoryId: "",
  bonusAchievement: false,
  requiresApproval: false,
  type: "individual",
  assignee: ["hero-1"],
  basicSchedule: "daily",
  scheduleType: "basic",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  dueByTime: "",
  endsOn: "",
  startsOn: "2026-10-01T09:00:00",
  repeatOnDays: [],
  showDailyUntilComplete: false,
  difficulty: 1,
  xp: 100,
  gp: 10,
  ap: 1,
  adventureType: "simple",
  ...overrides,
});

const onBoard = (
  quest: Achievement,
  status: QuestBoardItem["status"] = "open",
  flags: Partial<Pick<QuestBoardItem, "pending" | "overdue">> = {}
): QuestBoardItem => ({
  quest,
  status,
  progress: status === "notDue" ? null : { done: status === "done" ? 1 : 0, allowance: 1, isOpen: status === "open" },
  pending: false,
  overdue: false,
  ...flags,
});

const users = {
  "hero-1": { id: "hero-1", name: { nick: "Max", first: "Maxwell" } },
  "hero-2": { id: "hero-2", name: { first: "Zoe" } },
  "gm-1": { id: "gm-1", name: { nick: "Mum" } },
};

describe("questListFor", () => {
  it("sorts overdue, then open by deadline, then later, then pending, then tamed", () => {
    const board = [
      onBoard(makeQuest({ id: "tamed", achievementName: "Feed the cat", dueByTime: "07:00" }), "done"),
      onBoard(makeQuest({ id: "evening", achievementName: "Dishes", dueByTime: "18:00" })),
      onBoard(makeQuest({ id: "waiting", achievementName: "Homework", requiresApproval: true }), "done", { pending: true }),
      onBoard(makeQuest({ id: "anytime", achievementName: "Water plants" })),
      onBoard(makeQuest({ id: "late", achievementName: "Make the bed", dueByTime: "08:00" }), "open", { overdue: true }),
      onBoard(makeQuest({ id: "soon", achievementName: "Walk the dog", dueByTime: "15:00" })),
      onBoard(
        makeQuest({ id: "upcoming", achievementName: "Pack for camp", basicSchedule: "once", startsOn: "2026-10-12T00:00:00" }),
        "notDue"
      ),
    ];

    const rows = questListFor("hero-1", NOON, board, users);

    expect(rows.map((row) => row.id)).toEqual(["late", "soon", "evening", "anytime", "upcoming", "waiting", "tamed"]);
    expect(rows.map((row) => row.status)).toEqual(["overdue", "open", "open", "open", "later", "pending", "done"]);
    expect(rows[0].statusLabel).toBe("Overdue");
    expect(rows[5].statusLabel).toBe("Pending the Game Master");
    expect(rows[6].statusLabel).toBe("Tamed");
  });

  it("labels due times relative to the day it is read", () => {
    const rows = questListFor(
      "hero-1",
      NOON,
      [
        onBoard(makeQuest({ id: "today", dueByTime: "18:30" })),
        onBoard(makeQuest({ id: "anytime" })),
        onBoard(
          makeQuest({ id: "tomorrow", basicSchedule: "once", startsOn: "2026-10-11T00:00:00", dueByTime: "09:00" }),
          "notDue"
        ),
        onBoard(makeQuest({ id: "next-week", basicSchedule: "once", startsOn: "2026-10-14T00:00:00" }), "notDue"),
      ],
      users
    );
    const labels = Object.fromEntries(rows.map((row) => [row.id, row.dueLabel]));

    expect(labels.today).toBe("6:30pm");
    expect(labels.anytime).toBe("Anytime");
    expect(labels.tomorrow).toBe("Tomorrow 9:00am");
    expect(labels["next-week"]).toBe("Wed 14 Oct");
    expect(rows.find((row) => row.id === "today")?.due).toEqual(new Date(2026, 9, 10, 18, 30));
  });

  it("hides recurring quests that are not due today but keeps one-off tasks that lie ahead", () => {
    const rows = questListFor(
      "hero-1",
      NOON,
      [
        onBoard(makeQuest({ id: "weekly", basicSchedule: "weekly", repeatOnDays: ["mon"] }), "notDue"),
        onBoard(makeQuest({ id: "once-ahead", basicSchedule: "once", startsOn: "2026-10-20T00:00:00" }), "notDue"),
        onBoard(makeQuest({ id: "once-snoozed", basicSchedule: "once", startsOn: "2026-10-01T00:00:00" }), "notDue"),
      ],
      users
    );
    expect(rows.map((row) => row.id)).toEqual(["once-ahead"]);
  });

  it("marks a one-off task overdue once its due time on its day has passed, even days later", () => {
    const quest = makeQuest({ id: "old", basicSchedule: "once", startsOn: "2026-10-08T00:00:00", dueByTime: "17:00" });
    const [row] = questListFor("hero-1", NOON, [onBoard(quest)], users);
    expect(row.status).toBe("overdue");
    expect(row.dueLabel).toBe("Thu 8 Oct 5:00pm");
  });

  it("honours the Ice Wand's extension on the due time", () => {
    const quest = makeQuest({ id: "extended", dueByTime: "09:00" });
    const effects = { extendedUntil: { extended: new Date(2026, 9, 10, 16, 0).toISOString() } };
    const [row] = questListFor("hero-1", NOON, [onBoard(quest)], users, effects);
    expect(row.dueLabel).toBe("4:00pm");
  });

  it("carries the quest's rewards and approval flag", () => {
    const quest = makeQuest({ xp: "250" as unknown as number, gp: 0, ap: -3, requiresApproval: true });
    const [row] = questListFor("hero-1", NOON, [onBoard(quest)], users);
    expect(row.rewards).toEqual({ xp: 250, gp: 0, ap: 0 });
    expect(row.requiresApproval).toBe(true);
  });

  it("counts rows per status", () => {
    const rows = questListFor(
      "hero-1",
      NOON,
      [
        onBoard(makeQuest({ id: "a" })),
        onBoard(makeQuest({ id: "b", dueByTime: "08:00" }), "open", { overdue: true }),
        onBoard(makeQuest({ id: "c" }), "done"),
      ],
      users
    );
    expect(questListCounts(rows)).toEqual({ overdue: 1, open: 1, later: 0, pending: 0, done: 1 });
  });
});

describe("assigneeOf", () => {
  it("names the hero by nick when the quest is theirs", () => {
    expect(assigneeOf(makeQuest({ assignee: ["hero-2", "hero-1"] }), "hero-1", users)).toEqual({
      assigneeId: "hero-1",
      assigneeName: "Max +1",
    });
  });

  it("falls back to a first name, then the id, for the first assignee", () => {
    expect(assigneeOf(makeQuest({ assignee: ["hero-2"] }), "hero-1", users).assigneeName).toBe("Zoe");
    expect(assigneeOf(makeQuest({ assignee: ["ghost"] }), "hero-1", users).assigneeName).toBe("ghost");
  });

  it("calls an open bounty Anyone and an empty list Unassigned", () => {
    expect(assigneeOf(makeQuest({ type: "asNeeded", assignee: [] }), "hero-1", users)).toEqual({
      assigneeId: null,
      assigneeName: "Anyone",
    });
    expect(assigneeOf(makeQuest({ assignee: [] }), "hero-1", users).assigneeName).toBe("Unassigned");
  });
});

describe("dueLabelFor", () => {
  it("reads yesterday and far-off days", () => {
    expect(dueLabelFor(new Date(2026, 9, 9, 8, 0), NOON)).toBe("Yesterday 8:00am");
    expect(dueLabelFor(new Date(2026, 10, 1, 8, 0), NOON)).toBe("Sun 1 Nov 8:00am");
  });
});

describe("newQuickTask", () => {
  it("builds a one-off quest for one family member due today by the given time", () => {
    const task = newQuickTask({ title: "  Take out the bins ", assigneeId: "hero-2", dueByTime: "18:00" }, NOON);
    expect(task).toMatchObject({
      id: "",
      achievementName: "Take out the bins",
      assignee: ["hero-2"],
      type: "individual",
      basicSchedule: "once",
      scheduleType: "basic",
      dueByTime: "18:00",
      endsOn: "",
      requiresApproval: false,
      adventureType: "simple",
      ...QUICK_TASK_REWARDS,
    });
    expect(new Date(task.startsOn)).toEqual(new Date(2026, 9, 10, 0, 0));
  });

  it("starts tomorrow's and dated tasks on their day, with the approval flag and chosen rewards", () => {
    const tomorrow = newQuickTask({ title: "Mow", assigneeId: "gm-1", due: "tomorrow", requiresApproval: true }, NOON);
    expect(new Date(tomorrow.startsOn)).toEqual(new Date(2026, 9, 11, 0, 0));
    expect(tomorrow.requiresApproval).toBe(true);

    const dated = newQuickTask(
      { title: "Dentist", assigneeId: "hero-1", due: "2026-12-24", dueByTime: "9:30", rewards: { gp: 50, ap: 0 } },
      NOON
    );
    expect(new Date(dated.startsOn)).toEqual(new Date(2026, 11, 24, 0, 0));
    expect(dated.dueByTime).toBe("09:30");
    expect({ xp: dated.xp, gp: dated.gp, ap: dated.ap }).toEqual({ xp: 200, gp: 50, ap: 0 });
  });

  it("drops an unreadable time and refuses a blank title, no assignee or a bad day", () => {
    expect(newQuickTask({ title: "X", assigneeId: "hero-1", dueByTime: "25:99" }, NOON).dueByTime).toBe("");
    expect(() => newQuickTask({ title: "   ", assigneeId: "hero-1" }, NOON)).toThrow(/name/);
    expect(() => newQuickTask({ title: "X", assigneeId: "" }, NOON)).toThrow(/who/);
    expect(() => newQuickTask({ title: "X", assigneeId: "hero-1", due: "someday" }, NOON)).toThrow(/calendar/);
  });

  it("shows on the hero's list the day it is due, as an open task with its assignee", () => {
    const task = { ...newQuickTask({ title: "Mow", assigneeId: "hero-1", due: "tomorrow", dueByTime: "17:00" }, NOON), id: "t1" };
    const tomorrowNoon = new Date(2026, 9, 11, 12, 0);
    const [row] = questListFor("hero-1", tomorrowNoon, [onBoard(task)], users);
    expect(row).toMatchObject({ id: "t1", status: "open", assigneeName: "Max", dueLabel: "5:00pm" });
    // and the day before, as something still ahead
    const [ahead] = questListFor("hero-1", NOON, [onBoard(task, "notDue")], users);
    expect(ahead).toMatchObject({ status: "later", dueLabel: "Tomorrow 5:00pm" });
  });
});
