import {
  approvalHint,
  assigneeLabel,
  difficultyLabel,
  formatPoints,
  minutesLabel,
  partyHint,
  priorityHint,
  questSubtitle,
  questTypeHint,
  scheduleLabel,
  statusIconLabels,
  tierLabel,
} from "@/lib/services/quests/QuestLabels";

const users = [
  { id: "a", name: { nick: "Sam", first: "Samuel" } },
  { id: "b", name: { first: "Alex" } },
  { id: "c", name: { nick: "Jo" } },
  { id: "d", name: { nick: "Kit" } },
];

describe("questTypeHint", () => {
  it("says what the flavor name stands for from the real fields", () => {
    expect(questTypeHint("individual", "beast")).toBe("beast fight · one hero");
    expect(questTypeHint("collaborate", "chain")).toBe("quest chain · a team");
    expect(questTypeHint("asNeeded", "simple")).toBe("simple task · open to anyone");
    expect(questTypeHint("rotate", "beast")).toBe("beast fight · heroes take turns");
    expect(questTypeHint("compete", "simple")).toBe("simple task · heroes race");
  });

  it("is empty until a quest type is picked, and drops an assignment it does not know", () => {
    expect(questTypeHint("individual", "")).toBe("");
    expect(questTypeHint(undefined, undefined)).toBe("");
    expect(questTypeHint("mystery", "beast")).toBe("beast fight");
  });
});

describe("partyHint", () => {
  it("names what the number counts", () => {
    expect(partyHint("individual", 1)).toBe("hero assigned");
    expect(partyHint("collaborate", 3)).toBe("heroes assigned");
    expect(partyHint("individual", 0)).toBe("pick a hero");
  });

  it("calls an open bounty open to every hero whatever the count", () => {
    expect(partyHint("asNeeded", 0)).toBe("any hero can claim it");
  });
});

describe("approvalHint and priorityHint", () => {
  it("explain Honor / Review and Bonus / Reqd", () => {
    expect(approvalHint(false)).toBe("no approval needed");
    expect(approvalHint(true)).toBe("the Game Master approves first");
    expect(priorityHint(false)).toBe("must be done");
    expect(priorityHint(true)).toBe("optional extra");
  });
});

describe("difficultyLabel", () => {
  it("names the slider steps", () => {
    expect(difficultyLabel(1)).toBe("Difficulty: Trivial (1)");
    expect(difficultyLabel(13)).toBe("Difficulty: Difficult (13)");
    expect(difficultyLabel(144)).toBe("Difficulty: Mythical (144)");
  });

  it("keeps the number of a value off the steps, and admits an unset one", () => {
    expect(difficultyLabel(4)).toBe("Difficulty: 4");
    expect(difficultyLabel(0)).toBe("Difficulty: not set");
    expect(difficultyLabel(undefined)).toBe("Difficulty: not set");
  });
});

describe("scheduleLabel", () => {
  it("reads the basic schedules", () => {
    expect(scheduleLabel({ basicSchedule: "once" })).toBe("One-time");
    expect(scheduleLabel({ basicSchedule: "daily" })).toBe("Daily");
    expect(scheduleLabel({})).toBe("One-time");
  });

  it("lists the weekly days in week order", () => {
    expect(scheduleLabel({ basicSchedule: "weekly", repeatOnDays: ["wed", "mon"] })).toBe("Weekly on Mon, Wed");
    expect(scheduleLabel({ basicSchedule: "weekly", repeatOnDays: [] })).toBe("Weekly");
  });

  it("spells out a custom frequency", () => {
    expect(scheduleLabel({ basicSchedule: "custom", customFrequency: 2, customPeriodNumber: 3, customPeriodType: "day" })).toBe(
      "2x every 3 days"
    );
    expect(scheduleLabel({ scheduleType: "custom", customFrequency: 1, customPeriodNumber: 1, customPeriodType: "week" })).toBe(
      "1x every week"
    );
  });
});

describe("assigneeLabel", () => {
  it("names the heroes by nickname, falling back to the first name", () => {
    expect(assigneeLabel({ type: "individual", assignee: ["a"] }, users)).toBe("Sam");
    expect(assigneeLabel({ type: "collaborate", assignee: ["a", "b"] }, users)).toBe("Sam, Alex");
  });

  it("counts the heroes past the third", () => {
    expect(assigneeLabel({ type: "collaborate", assignee: ["a", "b", "c", "d"] }, users)).toBe("Sam, Alex, Jo +1");
  });

  it("says Anyone for an open bounty and Unassigned for a quest nobody holds", () => {
    expect(assigneeLabel({ type: "asNeeded", assignee: [] }, users)).toBe("Anyone");
    expect(assigneeLabel({ type: "individual", assignee: [] }, users)).toBe("Unassigned");
  });

  it("does not lose a hero whose profile is gone", () => {
    expect(assigneeLabel({ type: "individual", assignee: ["zzz"] }, users)).toBe("Unknown hero");
  });
});

describe("questSubtitle", () => {
  const quest = { type: "individual", assignee: ["a"], basicSchedule: "daily" };

  it("pairs who with when", () => {
    expect(questSubtitle(quest, users, "Around the House")).toBe("Sam · Daily");
  });

  it("swaps the heroes for the category when the list is already grouped by hero", () => {
    expect(questSubtitle(quest, users, "Around the House", true)).toBe("Around the House · Daily");
  });

  it("leaves just the schedule when the family's profiles were not given", () => {
    expect(questSubtitle(quest, undefined, "Around the House")).toBe("Daily");
  });
});

describe("statusIconLabels", () => {
  it("describes each icon in words", () => {
    const labels = statusIconLabels({ difficulty: 3, type: "individual", basicSchedule: "daily" });
    expect(labels.difficulty).toBe("Difficulty: Easy (3)");
    expect(labels.schedule).toBe("Schedule: Daily");
    expect(labels.assignment).toBe("Assignment: Solo Mission (one hero)");
    expect(labels.approval).toMatch(/approves it first/);
    expect(labels.bonus).toMatch(/optional/);
  });

  it("keeps the raw type when the assignment is not one the form offers", () => {
    expect(statusIconLabels({ difficulty: 1, type: "mystery", basicSchedule: "once" }).assignment).toBe("Assignment: mystery");
  });
});

describe("formatPoints", () => {
  it("shows a reward as a whole number", () => {
    expect(formatPoints(30)).toBe("30");
    expect(formatPoints(30.4)).toBe("30");
    expect(formatPoints(1300)).toBe("1,300");
  });

  it("shows nothing-ish values as 0", () => {
    expect(formatPoints(undefined)).toBe("0");
    expect(formatPoints(NaN)).toBe("0");
  });
});

describe("tierLabel", () => {
  it("names the room a difficulty makes", () => {
    expect(tierLabel(1)).toBe("Monster");
    expect(tierLabel(2)).toBe("Monster");
    expect(tierLabel(3)).toBe("Miniboss");
    expect(tierLabel(5)).toBe("Miniboss");
    expect(tierLabel(8)).toBe("Boss");
    expect(tierLabel(13)).toBe("Boss");
  });

  it("rounds a legacy in-between value down, like the room does", () => {
    expect(tierLabel(4)).toBe("Miniboss");
    expect(tierLabel(7)).toBe("Miniboss");
    expect(tierLabel(9)).toBe("Boss");
  });

  it("calls an unset difficulty a Monster, the smallest tier", () => {
    expect(tierLabel(undefined)).toBe("Monster");
    expect(tierLabel(0)).toBe("Monster");
  });
});

describe("minutesLabel", () => {
  it("says minutes under an hour", () => {
    expect(minutesLabel(5)).toBe("5 min");
    expect(minutesLabel(45)).toBe("45 min");
    expect(minutesLabel(59)).toBe("59 min");
  });

  it("says hours and minutes from an hour up", () => {
    expect(minutesLabel(60)).toBe("1 hr");
    expect(minutesLabel(90)).toBe("1 hr 30 min");
    expect(minutesLabel(120)).toBe("2 hr");
  });

  it("rounds a fractional estimate to the minute, never below 1", () => {
    expect(minutesLabel(2.6)).toBe("3 min");
    expect(minutesLabel(0.2)).toBe("1 min");
  });

  it("shows nothing for a missing or broken estimate", () => {
    expect(minutesLabel(undefined)).toBe("");
    expect(minutesLabel(0)).toBe("");
    expect(minutesLabel(NaN)).toBe("");
    expect(minutesLabel(-5)).toBe("");
  });
});
