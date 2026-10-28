/**
 * What the screens read off a finished project, kept out of them: days early, the trophies (cleared runs, newest
 * first), which of the two finish moments a hero is still owed, the credits roll's view of a run, the trophy sheet's
 * view of a run, and the words of the reward reveal. Pure: records, quests and log entries go in.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { copyFor } from "@/lib/services/copy/copy";
import { VOICES } from "@/lib/services/copy/voices";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { creditHeroesOf, creditsViewOf, daysEarly, finishStepFor, rewardToGive, trophiesOf, trophyOf } from "@/lib/services/projects/projectFinish";
import { rewardRevealPrompt } from "@/lib/services/projects/finishPrompts";
import { newestCleared } from "@/lib/services/projects/projectProgress";

const floorOf = (floorKey: string, phaseId: string, questIds: string[], extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey,
  phaseId,
  window: { phaseId, opensOn: "2027-04-03", dueOn: "2027-04-10" },
  questIds,
  ...extra,
});

/** A chore of the run's list, handed to the heroes given */
const choreFor = (id: string, ...assignee: string[]): ProjectChore => ({ id, phaseId: "declutter", roomId: "house", name: id, difficulty: 3, assignee });

/** Spring Cleaning cleared on the evening of 2027-04-08, two days before its end day; Twelve and Six had chores in it */
const clearedProject = (extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "spring-cleaning-2027-04-03",
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "cleared",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [
    floorOf("1F", "declutter", ["pq-a", "pq-b"], { multiplier: 2, clearedAt: new Date(2027, 3, 4, 12).toISOString() }),
    floorOf("2F", "deep-clean", ["pq-c"], { multiplier: 1.4, clearedAt: new Date(2027, 3, 6, 12).toISOString() }),
    floorOf("3F", "roof", ["pq-fin"], { multiplier: 1, clearedAt: new Date(2027, 3, 8, 20).toISOString() }),
  ],
  chores: [choreFor("a", "twelve"), choreFor("b", "six"), choreFor("c", "twelve", "six")],
  reward: { text: "Pizza night", earnedAt: new Date(2027, 3, 8, 20).toISOString(), seenBy: [] },
  creditsSeenBy: [],
  clearedAt: new Date(2027, 3, 8, 20).toISOString(),
  ...extra,
});

describe("daysEarly", () => {
  it("counts the days between the local day it was cleared and the end day", () => {
    expect(daysEarly(clearedProject())).toBe(2);
  });

  it("reads the day the hero lived, not the UTC day", () => {
    const lateEvening = clearedProject({ clearedAt: new Date(2027, 3, 9, 23, 30).toISOString() });
    expect(daysEarly(lateEvening)).toBe(1);
  });

  it("is 0 on the end day and for a late finish, never negative", () => {
    expect(daysEarly(clearedProject({ clearedAt: new Date(2027, 3, 10, 9).toISOString() }))).toBe(0);
    expect(daysEarly(clearedProject({ clearedAt: new Date(2027, 3, 13, 9).toISOString() }))).toBe(0);
  });

  it("is 0 for a project with no clear day or an unreadable one", () => {
    expect(daysEarly(clearedProject({ clearedAt: undefined }))).toBe(0);
    expect(daysEarly(clearedProject({ clearedAt: "not a day" }))).toBe(0);
  });
});

describe("trophiesOf", () => {
  it("lists the cleared runs newest first and leaves the others out", () => {
    const old = clearedProject({ id: "spring-cleaning-2026-04-03", clearedAt: new Date(2026, 3, 8, 20).toISOString() });
    const recent = clearedProject({ id: "moving-out-2027-06-01", typeId: "moving-out", clearedAt: new Date(2027, 5, 20, 20).toISOString() });
    const running = clearedProject({ id: "spring-cleaning-2027-09-01", status: "active", clearedAt: undefined });
    const dropped = clearedProject({ id: "spring-cleaning-2027-02-01", status: "abandoned" });
    expect(trophiesOf([old, running, recent, dropped, clearedProject()]).map((record) => record.id)).toEqual([
      "moving-out-2027-06-01",
      "spring-cleaning-2027-04-03",
      "spring-cleaning-2026-04-03",
    ]);
  });

  it("starts with the run newestCleared picks (the one markSeen stamps), over a tie and a run with no clear time, in any input order", () => {
    const stamp = new Date(2027, 3, 8, 20).toISOString();
    const records = [
      clearedProject({ id: "run-a", clearedAt: stamp }),
      clearedProject({ id: "run-b", clearedAt: stamp }),
      clearedProject({ id: "run-undated", clearedAt: undefined }),
      clearedProject({ id: "run-old", clearedAt: new Date(2026, 3, 8, 20).toISOString() }),
    ];
    const orders = [records, [...records].reverse(), [records[2], records[0], records[3], records[1]]];
    for (const order of orders) {
      expect(trophiesOf(order)[0].id).toBe(newestCleared(order)?.id);
      expect(trophiesOf(order).map((record) => record.id)).toEqual(["run-b", "run-a", "run-old", "run-undated"]);
    }
    const onlyUndated = [clearedProject({ id: "run-x", clearedAt: undefined }), clearedProject({ id: "run-y", clearedAt: undefined })];
    expect(trophiesOf(onlyUndated)[0].id).toBe(newestCleared(onlyUndated)?.id);
  });

  it("is empty when nothing was cleared", () => {
    expect(trophiesOf([])).toEqual([]);
    expect(trophiesOf([clearedProject({ status: "active" })])).toEqual([]);
  });
});

describe("rewardToGive", () => {
  const given = { text: "Movie night", earnedAt: new Date(2026, 3, 8).toISOString(), givenAt: new Date(2026, 3, 9).toISOString(), seenBy: [] };

  it("is the newest cleared run whose reward was earned and not handed over", () => {
    const old = clearedProject({ id: "spring-cleaning-2026-04-03", clearedAt: new Date(2026, 3, 8, 20).toISOString() });
    expect(rewardToGive([old, clearedProject()])?.id).toBe("spring-cleaning-2027-04-03");
  });

  it("passes over a run whose reward was given, and one still being climbed", () => {
    const handedOver = clearedProject({ id: "spring-cleaning-2027-06-01", clearedAt: new Date(2027, 5, 8, 20).toISOString(), reward: given });
    const climbing = clearedProject({ id: "moving-out-2027-09-01", status: "active", clearedAt: undefined, reward: { text: "Pizza", seenBy: [] } });
    expect(rewardToGive([handedOver, climbing, clearedProject()])?.id).toBe("spring-cleaning-2027-04-03");
    expect(rewardToGive([handedOver, climbing])).toBeNull();
  });

  it("is null when there is nothing to hand over", () => {
    expect(rewardToGive([])).toBeNull();
  });
});

describe("finishStepFor", () => {
  it("owes a hero the reward reveal first, then the credits, then nothing", () => {
    expect(finishStepFor(clearedProject(), "twelve")).toBe("reward");
    expect(finishStepFor(clearedProject({ reward: { text: "Pizza night", seenBy: ["twelve"] } }), "twelve")).toBe("credits");
    expect(finishStepFor(clearedProject({ reward: { text: "Pizza night", seenBy: ["twelve"] }, creditsSeenBy: ["twelve"] }), "twelve")).toBeNull();
  });

  it("asks each hero for themselves", () => {
    const project = clearedProject({ reward: { text: "Pizza night", seenBy: ["twelve"] }, creditsSeenBy: ["twelve"] });
    expect(finishStepFor(project, "six")).toBe("reward");
    expect(finishStepFor(project, "twelve")).toBeNull();
  });

  it("owes the reward reveal to a hero who has watched the credits but not been told of the reward", () => {
    expect(finishStepFor(clearedProject({ creditsSeenBy: ["six"] }), "six")).toBe("reward");
  });

  it("owes nothing to a hero who had no chore in the run, such as a profile added months later", () => {
    const project = clearedProject();
    expect(finishStepFor(project, "late")).toBeNull();
    expect(finishStepFor(clearedProject({ chores: [] }), "twelve")).toBeNull();
  });

  it("owes it to a hero who was given a chore alone or with others, a team chore included", () => {
    const project = clearedProject({ chores: [choreFor("a", "mom"), choreFor("b", "twelve", "six", "dad")] });
    for (const hero of ["mom", "twelve", "six", "dad"]) expect(finishStepFor(project, hero)).toBe("reward");
    expect(finishStepFor(project, "other")).toBeNull();
  });

  it("owes nothing before the roof is beaten, or without a project", () => {
    expect(finishStepFor(clearedProject({ status: "active", clearedAt: undefined }), "six")).toBeNull();
    expect(finishStepFor(clearedProject({ status: "abandoned" }), "six")).toBeNull();
    expect(finishStepFor(null, "six")).toBeNull();
  });
});

describe("creditHeroesOf", () => {
  it("takes a hero's nickname, else first name, else full name, and their class", () => {
    const profiles = [
      { id: 7, name: { nick: "Kai", first: "Kairos" }, jobClass: "Mage" },
      { id: "8", name: { first: "Ronan", full: "Ronan Tesla" } },
      { id: "9", name: { full: "Gaia Rhae-Satori" }, jobClass: "Ranger" },
      { id: "10" },
    ];
    expect(creditHeroesOf(profiles)).toEqual([
      { id: "7", name: "Kai", className: "Mage" },
      { id: "8", name: "Ronan", className: "" },
      { id: "9", name: "Gaia Rhae-Satori", className: "Ranger" },
      { id: "10", name: "Hero", className: "" },
    ]);
  });
});

describe("creditsViewOf", () => {
  const quests = [{ id: "pq-a", type: "individual", assignee: ["twelve"] }] as unknown as Achievement[];
  const paid = [{ id: "e1", questId: "pq-a", userId: "twelve", completedAt: new Date(2027, 3, 4, 12).toISOString(), dayKey: "2027-04-04", status: "approved", source: "claim", rewards: { xp: 0, gp: 0, ap: 0 }, rewardsApplied: true, questName: "a" }] as QuestLogEntry[];

  it("gives the tower's name, the dates, the days early and the heroes' part", () => {
    const view = creditsViewOf(clearedProject(), quests, paid, [{ id: "twelve", name: "Twelve", className: "Mage" }]);
    expect(view).toMatchObject({ towerName: "The Spring Spire", startOn: "2027-04-03", finishedOn: "2027-04-08", daysEarly: 2 });
    expect(view.heroes).toMatchObject([{ heroId: "twelve", name: "Twelve", className: "Mage", chores: 1, floors: ["1F"] }]);
  });

  it("calls the tower of a project type that is gone a project tower", () => {
    const view = creditsViewOf(clearedProject({ typeId: "a-type-that-is-gone" as never }), quests, paid, []);
    expect(view.towerName).toBe(copyFor("projectTower.spot.fallbackName", "adventure"));
  });
});

describe("trophyOf", () => {
  it("shows the dates, the days early, the reward and each floor's multiplier in the hero's voice", () => {
    const trophy = trophyOf(clearedProject(), "adventure");
    expect(trophy).toMatchObject({ id: "spring-cleaning-2027-04-03", towerName: "The Spring Spire", startOn: "2027-04-03", finishedOn: "2027-04-08", daysEarly: 2, rewardText: "Pizza night", isRewardGiven: false });
    expect(trophy.floors.map((floor) => [floor.floorKey, floor.multiplier])).toEqual([
      ["1F", 2],
      ["2F", 1.4],
      ["3F", 1],
    ]);
    expect(trophy.floors[2].name).toBe(copyFor("projectTower.roofName", "adventure"));
  });

  it("reads a floor with no multiplier as x1 and a given reward as given", () => {
    const project = clearedProject({ reward: { text: "Pizza night", givenAt: new Date(2027, 3, 9).toISOString(), seenBy: [] } });
    project.floors[1] = { ...project.floors[1], multiplier: undefined };
    const trophy = trophyOf(project, "classic");
    expect(trophy.floors[1].multiplier).toBe(1);
    expect(trophy.isRewardGiven).toBe(true);
  });
});

describe("rewardRevealPrompt", () => {
  it.each(VOICES)("tells the %s voice the tower's name and the family's own words for the reward, with one way on", (voice) => {
    const prompt = rewardRevealPrompt(clearedProject(), voice);
    const said = prompt.lines.join(" ");
    expect(prompt.title).toBe(copyFor("projectFinish.reward.title", voice));
    expect(prompt.lines).toContain("Pizza night");
    expect(said).toContain("The Spring Spire");
    expect(prompt.choices).toHaveLength(1);
    expect(prompt.cancelId).toBe(prompt.choices[0].id);
    expect(prompt.sprite).toBe("chest");
    expect(said + (prompt.title ?? "")).not.toMatch(/—/);
  });
});
