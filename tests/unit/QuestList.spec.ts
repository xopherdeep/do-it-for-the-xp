import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  assigneeOf,
  cardDueLabelFor,
  dueFor,
  dueLabelFor,
  listedQuests,
  newQuickTask,
  questListCounts,
  questListFor,
  QUICK_TASK_REWARDS,
} from "@/lib/services/quests/QuestList";
import { suggestedRewards } from "@/lib/services/quests/sizeRewards";

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

  it("marks the open rows the family locked, and leaves a tamed one alone", () => {
    const board = [
      onBoard(makeQuest({ id: "closed", dueByTime: "08:00" }), "open", { overdue: true }),
      onBoard(makeQuest({ id: "fine", dueByTime: "18:00" })),
      onBoard(makeQuest({ id: "tamed", dueByTime: "07:00" }), "done"),
    ];
    const notice = "Too late: this one closed at 8:00am";
    const rows = questListFor("hero-1", NOON, board, users, undefined, { closed: notice, tamed: notice });
    expect(rows.find((row) => row.id === "closed")?.lockedNotice).toBe(notice);
    expect(rows.find((row) => row.id === "fine")?.lockedNotice).toBeUndefined();
    expect(rows.find((row) => row.id === "tamed")?.lockedNotice).toBeUndefined();
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

  it("shows a weekly quest due on its week's last day and open until then", () => {
    // The week runs Monday 5 to Sunday 11 Oct; the hero reads the list on Saturday noon, past 09:00
    const quest = makeQuest({ id: "weekly", basicSchedule: "weekly", startsOn: "2026-10-05T00:00:00", dueByTime: "09:00" });
    const [row] = questListFor("hero-1", NOON, [onBoard(quest)], users);
    expect(row.status).toBe("open");
    expect(row.due).toEqual(new Date(2026, 9, 11, 9, 0));
    expect(row.dueLabel).toBe("Tomorrow 9:00am");
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

describe("shared quests on the list", () => {
  const team = (overrides: Partial<Achievement> = {}) =>
    makeQuest({ type: "collaborate", assignee: ["hero-1", "hero-2"], ...overrides });
  const doneBy = (item: QuestBoardItem, ids: string[]): QuestBoardItem => ({ ...item, doneBy: ids });

  it("says who cleared a shared quest for the hero", () => {
    const [row] = questListFor("hero-1", NOON, [doneBy(onBoard(team(), "done"), ["hero-2"])], users);
    expect(row).toMatchObject({ status: "done", statusLabel: "Done by Zoe" });
  });

  it("names the first and counts the rest when several others cleared it", () => {
    const race = team({ type: "compete", assignee: ["hero-1", "hero-2", "gm-1"] });
    const [row] = questListFor("hero-1", NOON, [doneBy(onBoard(race, "done"), ["hero-2", "gm-1"])], users);
    expect(row.statusLabel).toBe("Done by Zoe +1");
  });

  it("keeps Tamed when the hero helped clear it, and for every individual quest", () => {
    const helped = questListFor("hero-1", NOON, [doneBy(onBoard(team(), "done"), ["hero-2", "hero-1"])], users);
    expect(helped[0].statusLabel).toBe("Tamed");
    const solo = questListFor("hero-1", NOON, [doneBy(onBoard(makeQuest(), "done"), ["hero-2"])], users);
    expect(solo[0].statusLabel).toBe("Tamed");
  });

  it("keeps a shared claim that waits on the Game Master pending", () => {
    const [row] = questListFor("hero-1", NOON, [doneBy(onBoard(team(), "done", { pending: true }), ["hero-2"])], users);
    expect(row).toMatchObject({ status: "pending", statusLabel: "Pending the Game Master" });
  });
});

describe("drafts (GitHub issue #126)", () => {
  // Three Feed The Dog runs: one made Ready, two left mid-wizard (drafts), and a quest saved before drafts existed
  const ready = makeQuest({ id: "ready", achievementName: "Feed The Dog", draft: false });
  const leftAtStepFour = makeQuest({ id: "draft-1", achievementName: "Feed The Dog", draft: true });
  const leftAgain = makeQuest({ id: "draft-2", achievementName: "Feed The Dog", categoryId: "", draft: true });
  const old = makeQuest({ id: "old", achievementName: "Walk the dog" });

  it("leaves every draft off the hero's Beast Log, and out of its counts", () => {
    const board = [onBoard(ready), onBoard(leftAtStepFour), onBoard(leftAgain, "open", { overdue: true }), onBoard(old)];
    const rows = questListFor("hero-1", NOON, board, users);
    expect(rows.map((row) => row.id)).toEqual(["ready", "old"]);
    expect(questListCounts(rows)).toEqual({ overdue: 0, open: 2, later: 0, pending: 0, done: 0 });
  });

  it("keeps a quest saved before the marker existed: nothing leaves a Beast Log", () => {
    const rows = questListFor("hero-1", NOON, [onBoard(old)], users);
    expect(rows.map((row) => row.id)).toEqual(["old"]);
  });

  it("lists every quest for the Game Master's Compendium, drafts too, and only the published ones for a hero", () => {
    const records = [ready, leftAtStepFour, old, leftAgain];
    expect(listedQuests(records, "gameMaster").map((quest) => quest.id)).toEqual(["ready", "draft-1", "old", "draft-2"]);
    expect(listedQuests(records, "hero").map((quest) => quest.id)).toEqual(["ready", "old"]);
    expect(records).toHaveLength(4);
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

describe("cardDueLabelFor", () => {
  it("keeps today's due time a bare clock", () => {
    expect(cardDueLabelFor(new Date(2026, 9, 10, 18, 0), NOON)).toBe("6:00PM");
  });

  it("names the due day for a quest that is not due today", () => {
    // NOON is Saturday 2026-10-10: a weekly quest due next Friday, a custom one due in a fortnight, one a day late
    expect(cardDueLabelFor(new Date(2026, 9, 11, 18, 0), NOON)).toBe("Tomorrow 6:00PM");
    expect(cardDueLabelFor(new Date(2026, 9, 16, 18, 0), NOON)).toBe("Fri 6:00PM");
    expect(cardDueLabelFor(new Date(2026, 9, 17, 18, 0), NOON)).toBe("Sat 17 Oct 6:00PM");
    expect(cardDueLabelFor(new Date(2026, 9, 24, 9, 30), NOON)).toBe("Sat 24 Oct 9:30AM");
    expect(cardDueLabelFor(new Date(2026, 9, 9, 18, 0), NOON)).toBe("Yesterday 6:00PM");
    expect(cardDueLabelFor(new Date(2026, 9, 5, 18, 0), NOON)).toBe("Mon 5 Oct 6:00PM");
  });

  it("reads a weekly quest's due day off its deadline, the way the list row does", () => {
    // A weekly quest with no listed weekdays is due on the last day of its Monday-to-Sunday week
    const weekly = makeQuest({ id: "weekly", basicSchedule: "weekly", startsOn: "2026-10-05T00:00:00", dueByTime: "18:00" });
    const wednesday = new Date(2026, 9, 7, 12, 0);
    const due = dueFor(weekly, undefined, wednesday)!;
    expect(cardDueLabelFor(due, wednesday)).toBe("Sun 6:00PM");
    const [row] = questListFor("hero-1", wednesday, [onBoard(weekly)], {});
    expect(row.dueLabel).toBe("Sun 11 Oct 6:00pm");
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

  it("pays the shared size table for its own difficulty, not a rate of its own", () => {
    const task = newQuickTask({ title: "Take out the bins", assigneeId: "hero-2" }, NOON);
    const { xp, gp, ap } = suggestedRewards(task.difficulty);
    expect({ xp: task.xp, gp: task.gp, ap: task.ap }).toEqual({ xp, gp, ap });
    expect(QUICK_TASK_REWARDS).toEqual(suggestedRewards(task.difficulty));
    expect(QUICK_TASK_REWARDS).toEqual({ xp: 60, gp: 15, ap: 1 });
  });

  it("a task that asks for a photo needs approval, and a plain one carries no photo flag", () => {
    const photo = newQuickTask({ title: "Bed", assigneeId: "gm-1", requiresApproval: false, requiresPhoto: true }, NOON);
    expect(photo).toMatchObject({ requiresPhoto: true, requiresApproval: true });
    const plain = newQuickTask({ title: "Bins", assigneeId: "gm-1" }, NOON);
    expect(plain.requiresPhoto).toBeUndefined();
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
    expect({ xp: dated.xp, gp: dated.gp, ap: dated.ap }).toEqual({ xp: QUICK_TASK_REWARDS.xp, gp: 50, ap: 0 });
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

describe("newQuickTask approval", () => {
  const base = { title: "Bins", assigneeId: "hero-2" };

  it("is honor system unless asked, for a Game Master or an unknown poster", () => {
    expect(newQuickTask(base, NOON).requiresApproval).toBe(false);
    expect(newQuickTask({ ...base, isGm: true }, NOON).requiresApproval).toBe(false);
  });

  it("follows the Game Master toggle", () => {
    expect(newQuickTask({ ...base, isGm: true, requiresApproval: true }, NOON).requiresApproval).toBe(true);
  });

  it("always waits for a Game Master when a hero posts it", () => {
    expect(newQuickTask({ ...base, isGm: false, requiresApproval: false }, NOON).requiresApproval).toBe(true);
  });
});
