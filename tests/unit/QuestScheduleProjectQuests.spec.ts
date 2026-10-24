import AchievementDb from "@/lib/databases/AchievementDb";
import type { Achievement, ProjectQuestLink } from "@/lib/databases/AchievementDb";
import {
  deadlineDayOf,
  effectiveDeadline,
  getEffectiveWindow,
  isProjectQuest,
  isQuestActiveOn,
  isQuestOverdue,
} from "@/lib/engine/quests/QuestSchedule";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { questListFor } from "@/lib/services/quests/QuestList";

// A project chore is a one-off quest tied to a tower floor: asleep until the floor wakes, due on its phase's date.
// Calendar facts used below: 2027-04-03 is a Saturday, 2027-04-09 is a Friday.
const base: Achievement = {
  ...AchievementDb.getDefault(),
  id: "pq-x",
  basicSchedule: "once",
  startsOn: "2027-04-03",
  dueByTime: "20:00",
};

const link = (patch: Partial<ProjectQuestLink> = {}): ProjectQuestLink => ({
  projectId: "p",
  floor: "2F",
  dueOn: "2027-04-09",
  ...patch,
});

const projectQuest = (patch: Partial<ProjectQuestLink> = {}): Achievement => ({ ...base, project: link(patch) });

describe("project quests", () => {
  it("hides a project quest until its floor wakes", () => {
    expect(isQuestActiveOn(projectQuest(), new Date(2027, 3, 5))).toBe(false);
  });

  it("stays hidden before and after its dates while its floor sleeps", () => {
    expect(isQuestActiveOn(projectQuest(), new Date(2027, 3, 1))).toBe(false);
    expect(isQuestActiveOn(projectQuest(), new Date(2027, 3, 12))).toBe(false);
  });

  it("shows a woken project quest before its startsOn", () => {
    const woken = projectQuest({ wokenAt: "2027-04-01T10:00:00Z" });
    expect(isQuestActiveOn(woken, new Date(2027, 3, 1))).toBe(true);
  });

  it("keeps a woken project quest on the board past its due date, so it can be late", () => {
    const woken = projectQuest({ floor: "1F", wokenAt: "2027-04-03T08:00:00Z" });
    expect(isQuestActiveOn(woken, new Date(2027, 3, 20))).toBe(true);
  });

  it("is due on project.dueOn at its due time", () => {
    const woken = projectQuest({ floor: "1F", wokenAt: "2027-04-03T08:00:00Z" });
    expect(effectiveDeadline(woken, undefined, new Date(2027, 3, 5))).toEqual(new Date(2027, 3, 9, 20, 0));
  });

  it("reads the same due day from any day it is looked at", () => {
    const woken = projectQuest({ wokenAt: "2027-04-03T08:00:00Z" });
    expect(deadlineDayOf(woken, undefined, new Date(2027, 3, 4, 15))).toEqual(new Date(2027, 3, 9));
    expect(deadlineDayOf(woken, undefined, new Date(2027, 3, 14, 15))).toEqual(new Date(2027, 3, 9));
  });

  it("goes overdue once the due time on dueOn has passed", () => {
    const woken = projectQuest({ wokenAt: "2027-04-03T08:00:00Z" });
    expect(isQuestOverdue(woken, undefined, new Date(2027, 3, 9, 19, 59))).toBe(false);
    expect(isQuestOverdue(woken, undefined, new Date(2027, 3, 9, 20, 1))).toBe(true);
  });

  it("still gets a day more from the Snooze Power on its due day", () => {
    const woken = projectQuest({ wokenAt: "2027-04-03T08:00:00Z" });
    const effects = { snoozedOn: { "pq-x": "2027-04-09" } };
    expect(deadlineDayOf(woken, effects, new Date(2027, 3, 9, 9))).toEqual(new Date(2027, 3, 10));
  });

  it("has a window once woken and none while its floor sleeps", () => {
    const day = new Date(2027, 3, 5);
    expect(getEffectiveWindow(projectQuest(), undefined, day)).toBeNull();
    expect(getEffectiveWindow(projectQuest({ wokenAt: "2027-04-03T08:00:00Z" }), undefined, day)).not.toBeNull();
  });

  it("leaves a once quest without a project link as it was", () => {
    // A local stamp, so the day does not move with the time zone the specs run in
    const once: Achievement = { ...base, startsOn: "2027-04-03T00:00:00" };
    expect(isQuestActiveOn(once, new Date(2027, 3, 2))).toBe(false);
    expect(isQuestActiveOn(once, new Date(2027, 3, 3))).toBe(true);
    expect(deadlineDayOf(once, undefined, new Date(2027, 3, 5))).toEqual(new Date(2027, 3, 3));
    expect(effectiveDeadline(once, undefined, new Date(2027, 3, 3))).toEqual(new Date(2027, 3, 3, 20, 0));
  });
});

describe("isProjectQuest", () => {
  it("tells a project quest from any other", () => {
    expect(isProjectQuest(projectQuest())).toBe(true);
    expect(isProjectQuest(base)).toBe(false);
  });
});

describe("the hero's quest list", () => {
  const day = new Date(2027, 3, 1, 12);
  const sleeping = (quest: Achievement): QuestBoardItem => ({ quest, status: "notDue", progress: null, pending: false, overdue: false });
  const open = (quest: Achievement): QuestBoardItem => ({
    quest,
    status: "open",
    progress: { done: 0, allowance: 1, isOpen: true },
    pending: false,
    overdue: false,
  });

  it("leaves a project quest out while its floor sleeps, even before its startsOn", () => {
    const quest = { ...projectQuest(), startsOn: "2027-04-03T00:00:00" };
    expect(questListFor("hero-1", day, [sleeping(quest)], {})).toEqual([]);
  });

  it("lists a project quest as open once its floor has woken", () => {
    const quest = { ...projectQuest({ wokenAt: "2027-04-01T10:00:00Z" }), startsOn: "2027-04-03T00:00:00" };
    const rows = questListFor("hero-1", day, [open(quest)], {});
    expect(rows.map((row) => row.status)).toEqual(["open"]);
    expect(rows[0].due).toEqual(new Date(2027, 3, 9, 20, 0));
  });

  it("still lists an ordinary one-off task that starts later", () => {
    const quest = { ...base, startsOn: "2027-04-03T00:00:00" };
    expect(questListFor("hero-1", day, [sleeping(quest)], {}).map((row) => row.status)).toEqual(["later"]);
  });
});
