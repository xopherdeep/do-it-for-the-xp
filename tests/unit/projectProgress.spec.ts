/**
 * Project Towers progress rules: when a floor is cleared, what its bonus is and who gets it, which floor wakes next
 * (past a floor with no chores left), how the roof finishes the project, and how an extension moves the open floors.
 * Pure: records, quests and log entries are plain data; the commits are projectService.spec.ts.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { projectStartsOn } from "@/lib/services/projects/projectQuests";
import {
  isFloorCleared,
  newestCleared,
  openQuestIds,
  questsWokenBy,
  rescheduleFloors,
  settleFloor,
  settleReady,
  wakeFloor,
  wakeOnArrival,
  withRewardGiven,
  withSeen,
} from "@/lib/services/projects/projectProgress";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";

const NOW = new Date(2027, 3, 5, 18, 30);

/** A local noon on a day of April 2027 */
const april = (date: number, hour = 12): Date => new Date(2027, 3, date, hour);

const FIRST = { phaseId: "sort", opensOn: "2027-04-03", dueOn: "2027-04-06" };
const SECOND = { phaseId: "clean", opensOn: "2027-04-07", dueOn: "2027-04-10" };

const floorOf = (floorKey: string, phaseId: string, window: ProjectFloor["window"], questIds: string[], extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey, phaseId, window: { ...window }, questIds, ...extra,
});

/** Three floors: 1F (two chores), 2F (one), the roof 3F (the finale, in the last phase's window); 1F awake */
const projectOf = (extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "spring-cleaning-2027-04-03",
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "active",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [
    floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z" }),
    floorOf("2F", "clean", SECOND, ["pq-c"]),
    floorOf("3F", "roof", SECOND, ["pq-fin"]),
  ],
  chores: [],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
  ...extra,
});

const questOf = (id: string, floor: string, xp: number, gp: number, extra: Partial<Achievement> = {}): Achievement =>
  ({
    id, achievementName: id, xp, gp, ap: 3, type: "individual", assignee: [], startsOn: projectStartsOn("2027-04-03"),
    project: { projectId: "spring-cleaning-2027-04-03", floor, dueOn: "2027-04-06" },
    ...extra,
  } as unknown as Achievement);

const QUESTS = (): Achievement[] => [
  questOf("pq-a", "1F", 200, 20),
  questOf("pq-b", "1F", 100, 10),
  questOf("pq-c", "2F", 300, 30),
  questOf("pq-fin", "3F", 500, 50),
];

const entryOf = (questId: string, userId: string, completedAt: Date, extra: Partial<QuestLogEntry> = {}): QuestLogEntry => ({
  id: `entry-${questId}-${userId}`,
  questId,
  questName: questId,
  userId,
  completedAt: completedAt.toISOString(),
  dayKey: dateKey(completedAt),
  status: "approved",
  source: "claim",
  rewards: { xp: 0, gp: 0, ap: 0 },
  rewardsApplied: true,
  ...extra,
});

const floorByKey = (project: ProjectRecord, floorKey: string): ProjectFloor => project.floors.find((floor) => floor.floorKey === floorKey)!;

describe("isFloorCleared", () => {
  const floor = projectOf().floors[0];

  it("is true when every chore of the floor has a paid entry", () => {
    const paid = [entryOf("pq-a", "ann", april(4)), entryOf("pq-b", "ben", april(4))];
    expect(isFloorCleared(floor, QUESTS(), paid)).toBe(true);
  });

  it("is false while a chore has no paid entry", () => {
    expect(isFloorCleared(floor, QUESTS(), [entryOf("pq-a", "ann", april(4))])).toBe(false);
  });

  it("does not count a claim held for approval or a rejected one", () => {
    const held = entryOf("pq-b", "ben", april(4), { status: "pending", rewardsApplied: false });
    const rejected = entryOf("pq-b", "ben", april(4), { status: "rejected", rewardsApplied: false });
    const first = entryOf("pq-a", "ann", april(4));
    expect(isFloorCleared(floor, QUESTS(), [first, held])).toBe(false);
    expect(isFloorCleared(floor, QUESTS(), [first, rejected])).toBe(false);
  });

  it("does not count a payment for a chore of another floor", () => {
    const paid = [entryOf("pq-a", "ann", april(4)), entryOf("pq-c", "ben", april(4))];
    expect(isFloorCleared(floor, QUESTS(), paid)).toBe(false);
  });

  it("ignores a deleted chore", () => {
    const quests = QUESTS().filter((quest) => quest.id !== "pq-b");
    expect(isFloorCleared(floor, quests, [entryOf("pq-a", "ann", april(4))])).toBe(true);
  });

  it("reads a floor with no chores left as cleared", () => {
    expect(isFloorCleared(floor, [], [])).toBe(true);
  });
});

describe("wakeFloor", () => {
  it("stamps the floor and each of its quests with the wake time, leaving the other floors asleep", () => {
    const project = projectOf();
    const quests = QUESTS();
    const woken = wakeFloor(project, "2F", quests, NOW);
    expect(floorByKey(woken.project, "2F").wokenAt).toBe(NOW.toISOString());
    expect(floorByKey(woken.project, "3F").wokenAt).toBeUndefined();
    expect(woken.quests.map((quest) => quest.id)).toEqual(["pq-c"]);
    expect(woken.quests[0].project?.wokenAt).toBe(NOW.toISOString());
    // the inputs are not touched
    expect(floorByKey(project, "2F").wokenAt).toBeUndefined();
    expect(quests[2].project?.wokenAt).toBeUndefined();
  });

  it("returns unchanged copies when the floor is already woken", () => {
    const project = projectOf();
    const quests = [questOf("pq-a", "1F", 200, 20, { project: { projectId: "p", floor: "1F", dueOn: "2027-04-06", wokenAt: "2027-04-03T15:00:00.000Z" } }), ...QUESTS().slice(1)];
    const woken = wakeFloor(project, "1F", quests, NOW);
    expect(woken.project).toEqual(project);
    expect(woken.project).not.toBe(project);
    expect(woken.quests.map((quest) => quest.project?.wokenAt)).toEqual(["2027-04-03T15:00:00.000Z", undefined]);
    expect(woken.quests[0]).toEqual(quests[0]);
    expect(woken.quests[0]).not.toBe(quests[0]);
  });

  it("changes nothing for a floor the project does not have", () => {
    const woken = wakeFloor(projectOf(), "9F", QUESTS(), NOW);
    expect(woken.project).toEqual(projectOf());
    expect(woken.quests).toEqual([]);
  });
});

describe("wakeOnArrival", () => {
  it("wakes the floor reached for the family: the floor and its quests carry the instant", () => {
    const woke = wakeOnArrival(projectOf(), "2F", QUESTS(), NOW)!;
    expect(floorByKey(woke.project, "2F").wokenAt).toBe(NOW.toISOString());
    expect(floorByKey(woke.project, "3F").wokenAt).toBeUndefined();
    expect(woke.quests.map((quest) => quest.id)).toEqual(["pq-c"]);
    expect(woke.quests[0].project?.wokenAt).toBe(NOW.toISOString());
  });

  it("wakes a floor above the open one when it is reached out of order (a pit, a teleport)", () => {
    const woke = wakeOnArrival(projectOf(), "3F", QUESTS(), NOW)!;
    expect(floorByKey(woke.project, "3F").wokenAt).toBe(NOW.toISOString());
    expect(floorByKey(woke.project, "2F").wokenAt).toBeUndefined();
  });

  it("is null for a floor that is awake already, so waking twice changes nothing", () => {
    expect(wakeOnArrival(projectOf(), "1F", QUESTS(), NOW)).toBeNull();
    const woke = wakeOnArrival(projectOf(), "2F", QUESTS(), NOW)!;
    expect(wakeOnArrival(woke.project, "2F", QUESTS(), april(9))).toBeNull();
  });

  it("is null for a floor the project does not have and for a project that is not running", () => {
    expect(wakeOnArrival(projectOf(), "9F", QUESTS(), NOW)).toBeNull();
    expect(wakeOnArrival(projectOf({ status: "cleared" }), "2F", QUESTS(), NOW)).toBeNull();
    expect(wakeOnArrival(projectOf({ status: "abandoned" }), "2F", QUESTS(), NOW)).toBeNull();
  });

  it("does not touch the record or the quests it was given", () => {
    const project = projectOf();
    const quests = QUESTS();
    wakeOnArrival(project, "2F", quests, NOW);
    expect(floorByKey(project, "2F").wokenAt).toBeUndefined();
    expect(quests[2].project?.wokenAt).toBeUndefined();
  });
});

describe("settleFloor", () => {
  const bothPaidOn = (date: number) => [entryOf("pq-a", "ann", april(date)), entryOf("pq-b", "ben", april(date, 13))];

  it("settles a cleared floor", () => {
    const settled = settleFloor(projectOf(), "1F", QUESTS(), bothPaidOn(4), NOW)!;
    const floor = floorByKey(settled.project, "1F");
    expect(floor.multiplier).toBe(2);
    expect(floor.clearedAt).toBe(NOW.toISOString());
    expect(floor.bonusPaidAt).toBe(NOW.toISOString());
    // the pool is the part above x1 of the floor's 300 XP and 30 GP, split between the two who worked it
    expect(settled.grants).toEqual({ ann: { xp: 150, gp: 15 }, ben: { xp: 150, gp: 15 } });
    expect(settled.wake).toBe("2F");
    expect(settled.finished).toBe(false);
  });

  it("wakes the next floor when a floor clears", () => {
    const project = projectOf();
    const settled = settleFloor(project, "1F", QUESTS(), bothPaidOn(4), NOW)!;
    expect(floorByKey(settled.project, "2F").wokenAt).toBe(NOW.toISOString());
    expect(floorByKey(settled.project, "3F").wokenAt).toBeUndefined();
    const woken = questsWokenBy(project, settled.project, QUESTS());
    expect(woken.map((quest) => quest.id)).toEqual(["pq-c"]);
    expect(woken[0].project?.wokenAt).toBe(NOW.toISOString());
  });

  it("dates the clear by the claim, not the approval", () => {
    // claimed on the 5th, approved on the 8th: the window closes on the 6th, so the claim day earns x1.5
    const last = entryOf("pq-b", "ben", april(5), { reviewedAt: april(8).toISOString() });
    const settled = settleFloor(projectOf(), "1F", QUESTS(), [entryOf("pq-a", "ann", april(4)), last], NOW)!;
    expect(floorByKey(settled.project, "1F").multiplier).toBe(1.5);
  });

  it("ignores a deleted chore", () => {
    const quests = QUESTS().filter((quest) => quest.id !== "pq-b");
    const settled = settleFloor(projectOf(), "1F", quests, [entryOf("pq-a", "ann", april(4))], NOW)!;
    expect(floorByKey(settled.project, "1F").multiplier).toBe(2);
    // only the chore that is still there makes the pool, and only its hero shares it
    expect(settled.grants).toEqual({ ann: { xp: 200, gp: 20 } });
  });

  it("does not settle a floor with a chore still to pay", () => {
    expect(settleFloor(projectOf(), "1F", QUESTS(), [entryOf("pq-a", "ann", april(4))], NOW)).toBeNull();
  });

  it("settles a floor once", () => {
    const first = settleFloor(projectOf(), "1F", QUESTS(), bothPaidOn(4), NOW)!;
    expect(settleFloor(first.project, "1F", QUESTS(), bothPaidOn(4), NOW)).toBeNull();
  });

  it("knows no floor it does not have", () => {
    expect(settleFloor(projectOf(), "9F", QUESTS(), [], NOW)).toBeNull();
  });

  it("gives the part that does not divide to the hero who cleared the floor last", () => {
    // x1.5 of 300 XP and 30 GP is 150 XP and 15 GP: 75 and 7 each, and the odd gold piece goes to ben
    const settled = settleFloor(projectOf(), "1F", QUESTS(), [entryOf("pq-a", "ann", april(5, 9)), entryOf("pq-b", "ben", april(5, 17))], NOW)!;
    expect(settled.grants).toEqual({ ann: { xp: 75, gp: 7 }, ben: { xp: 75, gp: 8 } });
  });

  it("counts a team chore once, however many heroes were paid for it", () => {
    const team = [
      entryOf("pq-a", "ann", april(4)),
      entryOf("pq-a", "ben", april(4)),
      entryOf("pq-a", "cat", april(4)),
      entryOf("pq-b", "ann", april(4)),
    ];
    const settled = settleFloor(projectOf(), "1F", QUESTS(), team, NOW)!;
    // the same 300 XP and 30 GP pool, now among three
    expect(settled.grants).toEqual({ ann: { xp: 100, gp: 10 }, ben: { xp: 100, gp: 10 }, cat: { xp: 100, gp: 10 } });
  });

  it("pays no bonus on a floor cleared on its last day, but still settles it", () => {
    const settled = settleFloor(projectOf(), "1F", QUESTS(), bothPaidOn(6), NOW)!;
    expect(settled.grants).toEqual({});
    const floor = floorByKey(settled.project, "1F");
    expect(floor.multiplier).toBe(1);
    expect(floor.clearedAt).toBe(NOW.toISOString());
    expect(settled.wake).toBe("2F");
  });

  it("does not count a held claim as work on the floor", () => {
    const held = entryOf("pq-b", "cat", april(4), { status: "pending", rewardsApplied: false });
    const settled = settleFloor(projectOf(), "1F", QUESTS(), [...bothPaidOn(4), held], NOW)!;
    expect(Object.keys(settled.grants).sort()).toEqual(["ann", "ben"]);
  });

  it("does not touch the record it was given", () => {
    const project = projectOf();
    settleFloor(project, "1F", QUESTS(), bothPaidOn(4), NOW);
    expect(project).toEqual(projectOf());
  });

  it("wakes past an empty floor", () => {
    // 2F's only chore was deleted: clearing 1F settles 2F with it (no bonus) and opens the roof
    const quests = QUESTS().filter((quest) => quest.id !== "pq-c");
    const project = projectOf();
    const settled = settleFloor(project, "1F", quests, bothPaidOn(4), NOW)!;
    const second = floorByKey(settled.project, "2F");
    expect(second.wokenAt).toBe(NOW.toISOString());
    expect(second.clearedAt).toBe(NOW.toISOString());
    expect(second.bonusPaidAt).toBe(NOW.toISOString());
    expect(floorByKey(settled.project, "3F").wokenAt).toBe(NOW.toISOString());
    expect(floorByKey(settled.project, "3F").clearedAt).toBeUndefined();
    expect(settled.wake).toBe("3F");
    expect(settled.finished).toBe(false);
    // only the first floor paid a bonus
    expect(Object.keys(settled.grants).sort()).toEqual(["ann", "ben"]);
    expect(questsWokenBy(project, settled.project, quests).map((quest) => quest.id)).toEqual(["pq-fin"]);
  });

  it("stamps x1 on a floor with no chores, however early it settles", () => {
    // 2F's window has not even opened (it would read x2), but no bonus was earned on a floor with nothing to do
    const quests = QUESTS().filter((quest) => quest.id !== "pq-c");
    const settled = settleFloor(projectOf(), "1F", quests, bothPaidOn(4), NOW)!;
    expect(floorByKey(settled.project, "2F").multiplier).toBe(1);
    expect(floorByKey(settled.project, "1F").multiplier).toBe(2);
    // the same when the empty floor is the one being settled
    const emptied = settleFloor(projectOf(), "2F", quests, [], NOW)!;
    expect(floorByKey(emptied.project, "2F").multiplier).toBe(1);
    expect(emptied.grants).toEqual({});
  });

  it("wakes past a floor above that is already settled, leaving it as it was", () => {
    // a floor cleared out of order (an arrival wake): the climb does not name it, nor stamp it again
    const project = projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z" }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T09:00:00.000Z", clearedAt: "2027-04-04T09:30:00.000Z", multiplier: 1.5, bonusPaidAt: "2027-04-04T09:30:00.000Z" }),
        floorOf("3F", "roof", SECOND, ["pq-fin"]),
      ],
    });
    const settled = settleFloor(project, "1F", QUESTS(), bothPaidOn(4), NOW)!;
    expect(settled.wake).toBe("3F");
    expect(settled.finished).toBe(false);
    expect(floorByKey(settled.project, "2F")).toEqual(floorByKey(project, "2F"));
    expect(floorByKey(settled.project, "3F").wokenAt).toBe(NOW.toISOString());
    expect(questsWokenBy(project, settled.project, QUESTS()).map((quest) => quest.id)).toEqual(["pq-fin"]);
  });

  it("finishes the project when the roof is empty too", () => {
    const quests = QUESTS().slice(0, 2);
    const settled = settleFloor(projectOf(), "1F", quests, bothPaidOn(4), NOW)!;
    expect(settled.finished).toBe(true);
    expect(settled.wake).toBeUndefined();
    expect(settled.project.status).toBe("cleared");
  });

  it("finishes on the roof", () => {
    const climbed = projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-04T12:00:00.000Z", multiplier: 2 }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T12:00:00.000Z", clearedAt: "2027-04-08T12:00:00.000Z", multiplier: 1.5 }),
        floorOf("3F", "roof", SECOND, ["pq-fin"], { wokenAt: "2027-04-08T12:00:00.000Z" }),
      ],
    });
    const paid = [entryOf("pq-fin", "ann", april(9))];
    const settled = settleFloor(climbed, "3F", QUESTS(), paid, NOW)!;
    expect(settled.finished).toBe(true);
    expect(settled.wake).toBeUndefined();
    expect(settled.project.status).toBe("cleared");
    expect(settled.project.clearedAt).toBe(NOW.toISOString());
    expect(settled.project.reward.earnedAt).toBe(NOW.toISOString());
    expect(settled.project.reward.text).toBe("Pizza night");
    // the roof pays its own bonus: cleared a day before the last phase's last day, so x1.5 of 500 XP and 50 GP
    expect(floorByKey(settled.project, "3F").multiplier).toBe(1.5);
    expect(settled.grants).toEqual({ ann: { xp: 250, gp: 25 } });
  });

  it("keeps a project that is not finished active, with no reward earned", () => {
    const settled = settleFloor(projectOf(), "1F", QUESTS(), bothPaidOn(4), NOW)!;
    expect(settled.project.status).toBe("active");
    expect(settled.project.clearedAt).toBeUndefined();
    expect(settled.project.reward.earnedAt).toBeUndefined();
  });
});

describe("settleReady", () => {
  /** 1F and 2F both woken and unsettled (a settle that failed, then a wake elsewhere), the roof asleep */
  const stuck = (): ProjectRecord =>
    projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z" }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T12:00:00.000Z" }),
        floorOf("3F", "roof", SECOND, ["pq-fin"]),
      ],
    });
  const paidBoth = (): QuestLogEntry[] => [entryOf("pq-a", "ann", april(4)), entryOf("pq-b", "ben", april(4, 13)), entryOf("pq-c", "ann", april(8))];

  it("settles every woken floor that reads cleared, lowest first, and climbs to the floor left open", () => {
    const settled = settleReady(stuck(), QUESTS(), paidBoth(), NOW)!;
    expect(settled.floors.map((floor) => floor.floorKey)).toEqual(["1F", "2F"]);
    expect(settled.floors[0].grants).toEqual({ ann: { xp: 150, gp: 15 }, ben: { xp: 150, gp: 15 } });
    expect(settled.floors[1].grants).toEqual({ ann: { xp: 300, gp: 30 } });
    // the total, for whoever only wants to say what was handed out
    expect(settled.grants).toEqual({ ann: { xp: 450, gp: 45 }, ben: { xp: 150, gp: 15 } });
    expect(floorByKey(settled.project, "1F").clearedAt).toBe(NOW.toISOString());
    expect(floorByKey(settled.project, "2F").clearedAt).toBe(NOW.toISOString());
    expect(floorByKey(settled.project, "3F").wokenAt).toBe(NOW.toISOString());
    expect(settled.wake).toBe("3F");
    expect(settled.finished).toBe(false);
    expect(settled.project.status).toBe("active");
  });

  it("settles nothing twice", () => {
    const settled = settleReady(stuck(), QUESTS(), paidBoth(), NOW)!;
    expect(settleReady(settled.project, QUESTS(), paidBoth(), NOW)).toBeNull();
  });

  it("is null when no woken floor reads cleared", () => {
    expect(settleReady(projectOf(), QUESTS(), [entryOf("pq-a", "ann", april(4))], NOW)).toBeNull();
  });

  it("leaves a floor that is still asleep, however empty it reads", () => {
    // 2F has no chores left, but 1F is not done: the empty floor above is not woken or settled from the side
    const quests = QUESTS().filter((quest) => quest.id !== "pq-c");
    expect(settleReady(projectOf(), quests, [entryOf("pq-a", "ann", april(4))], NOW)).toBeNull();
  });

  it("settles a floor emptied by deleting its last open chore", () => {
    const quests = QUESTS().filter((quest) => quest.id !== "pq-b");
    const settled = settleReady(projectOf(), quests, [entryOf("pq-a", "ann", april(4))], NOW)!;
    expect(settled.floors.map((floor) => floor.floorKey)).toEqual(["1F"]);
    expect(settled.wake).toBe("2F");
  });

  it("finishes the project when the woken roof reads cleared", () => {
    const project = projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "x", clearedAt: "2027-04-04T12:00:00.000Z", multiplier: 2 }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "x", clearedAt: "2027-04-08T12:00:00.000Z", multiplier: 1.5 }),
        floorOf("3F", "roof", SECOND, ["pq-fin"], { wokenAt: "x" }),
      ],
    });
    const settled = settleReady(project, QUESTS(), [entryOf("pq-fin", "ann", april(9))], NOW)!;
    expect(settled.finished).toBe(true);
    expect(settled.wake).toBeUndefined();
    expect(settled.project.status).toBe("cleared");
    expect(settled.project.reward.earnedAt).toBe(NOW.toISOString());
  });

  it("settles nothing for a project that is no longer running", () => {
    expect(settleReady({ ...stuck(), status: "abandoned" }, QUESTS(), paidBoth(), NOW)).toBeNull();
    expect(settleReady({ ...stuck(), status: "cleared" }, QUESTS(), paidBoth(), NOW)).toBeNull();
  });

  it("does not touch the record it was given", () => {
    const project = stuck();
    settleReady(project, QUESTS(), paidBoth(), NOW);
    expect(project).toEqual(stuck());
  });
});

describe("questsWokenBy", () => {
  it("is empty when no floor woke between the two records", () => {
    const project = projectOf();
    expect(questsWokenBy(project, projectOf(), QUESTS())).toEqual([]);
  });
});

describe("rescheduleFloors", () => {
  const SHARES = { sort: 0.5, clean: 0.5 };

  it("spreads the uncleared phases again from today and moves their quests with them", () => {
    const project = projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-04T12:00:00.000Z", multiplier: 2, bonusPaidAt: "2027-04-04T12:00:00.000Z" }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T12:00:00.000Z" }),
        floorOf("3F", "roof", SECOND, ["pq-fin"]),
      ],
    });
    const moved = rescheduleFloors(project, SHARES, QUESTS(), "2027-04-08", "2027-04-20");
    const window = { phaseId: "clean", opensOn: "2027-04-08", dueOn: "2027-04-20" };
    expect(moved.project.endOn).toBe("2027-04-20");
    // the cleared floor keeps its window, multiplier and bonus
    expect(moved.project.floors[0]).toEqual(project.floors[0]);
    expect(moved.project.floors[1].window).toEqual(window);
    expect(moved.project.floors[1].wokenAt).toBe("2027-04-04T12:00:00.000Z");
    // the roof takes the last phase's new window
    expect(moved.project.floors[2].window).toEqual(window);
    expect(moved.quests.map((quest) => quest.id)).toEqual(["pq-c", "pq-fin"]);
    moved.quests.forEach((quest) => {
      expect(quest.startsOn).toBe(projectStartsOn("2027-04-08"));
      expect(quest.project?.dueOn).toBe("2027-04-20");
    });
    // the inputs are not touched
    expect(project.endOn).toBe("2027-04-10");
    expect(QUESTS()[2].project?.dueOn).toBe("2027-04-06");
  });

  it("gives every uncleared phase its share of the days left", () => {
    const moved = rescheduleFloors(projectOf(), SHARES, QUESTS(), "2027-04-03", "2027-04-12");
    expect(moved.project.floors[0].window).toEqual({ phaseId: "sort", opensOn: "2027-04-03", dueOn: "2027-04-07" });
    expect(moved.project.floors[1].window).toEqual({ phaseId: "clean", opensOn: "2027-04-08", dueOn: "2027-04-12" });
    expect(moved.project.floors[2].window).toEqual(moved.project.floors[1].window);
    expect(moved.quests.find((quest) => quest.id === "pq-a")?.project?.dueOn).toBe("2027-04-07");
    expect(moved.quests.find((quest) => quest.id === "pq-c")?.project?.dueOn).toBe("2027-04-12");
  });

  it("gives the roof the new end when only the roof is left", () => {
    const project = projectOf({
      floors: [
        floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "x", clearedAt: "2027-04-04T12:00:00.000Z" }),
        floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "x", clearedAt: "2027-04-08T12:00:00.000Z" }),
        floorOf("3F", "roof", SECOND, ["pq-fin"], { wokenAt: "x" }),
      ],
    });
    const moved = rescheduleFloors(project, SHARES, QUESTS(), "2027-04-11", "2027-04-20");
    expect(moved.project.floors[1].window).toEqual(SECOND);
    expect(moved.project.floors[2].window).toEqual({ phaseId: "clean", opensOn: "2027-04-11", dueOn: "2027-04-20" });
    expect(moved.quests.map((quest) => quest.id)).toEqual(["pq-fin"]);
    expect(moved.quests[0].project?.dueOn).toBe("2027-04-20");
    expect(moved.project.endOn).toBe("2027-04-20");
  });

  it.each(["2027-4-8", "2027-02-30", "2027-13-01", "tomorrow", "", "2027-04-08T10:00:00"])("refuses an end that is not a real day: %p", (bad) => {
    // extendWindows would read the text as today, and the roof's dueOn and the endOn would keep the raw text
    expect(() => rescheduleFloors(projectOf(), SHARES, QUESTS(), "2027-04-08", bad)).toThrow(RangeError);
    expect(() => rescheduleFloors(projectOf(), SHARES, QUESTS(), "2027-04-08", bad)).toThrow(/YYYY-MM-DD/);
  });

  it.each(["2027-4-8", "2027-02-30", "now", ""])("refuses a today that is not a real day: %p", (bad) => {
    expect(() => rescheduleFloors(projectOf(), SHARES, QUESTS(), bad, "2027-04-20")).toThrow(RangeError);
  });

  it("takes the last day of a leap February as a real day", () => {
    const moved = rescheduleFloors(projectOf(), SHARES, QUESTS(), "2028-02-20", "2028-02-29");
    expect(moved.project.endOn).toBe("2028-02-29");
  });

  it("refuses an end before today", () => {
    expect(() => rescheduleFloors(projectOf(), SHARES, QUESTS(), "2027-04-08", "2027-04-07")).toThrow(RangeError);
  });

  it("refuses an end that leaves a day short for every phase left", () => {
    expect(() => rescheduleFloors(projectOf(), SHARES, QUESTS(), "2027-04-08", "2027-04-08")).toThrow(RangeError);
  });
});

describe("openQuestIds", () => {
  it("names the project's quests that have no paid entry, whatever their claims", () => {
    const entries = [
      entryOf("pq-a", "ann", april(4)),
      entryOf("pq-b", "ben", april(4), { status: "pending", rewardsApplied: false }),
      entryOf("elsewhere", "ann", april(4)),
    ];
    const quests = [...QUESTS(), questOf("elsewhere", "1F", 10, 1, { project: undefined })];
    expect(openQuestIds(projectOf(), quests, entries)).toEqual(["pq-b", "pq-c", "pq-fin"]);
  });
});

describe("the reward and the credits", () => {
  const cleared = (id: string, clearedAt: string, extra: Partial<ProjectRecord> = {}): ProjectRecord =>
    projectOf({ id, status: "cleared", clearedAt, reward: { text: "Pizza", earnedAt: clearedAt, seenBy: [] }, ...extra });

  it("finds the newest cleared record, by when it was cleared", () => {
    const records = [cleared("a", "2027-04-10T12:00:00.000Z"), cleared("b", "2027-05-10T12:00:00.000Z"), projectOf({ id: "c" })];
    expect(newestCleared(records)?.id).toBe("b");
    expect(newestCleared([projectOf()])).toBeNull();
  });

  it("can ask for the newest cleared record whose reward is still to give", () => {
    const given = cleared("b", "2027-05-10T12:00:00.000Z", { reward: { text: "Pizza", earnedAt: "2027-05-10T12:00:00.000Z", givenAt: "2027-05-11T12:00:00.000Z", seenBy: [] } });
    const records = [cleared("a", "2027-04-10T12:00:00.000Z"), given];
    expect(newestCleared(records, (record) => Boolean(record.reward.earnedAt) && !record.reward.givenAt)?.id).toBe("a");
  });

  it("marks the reward given", () => {
    const record = cleared("a", "2027-04-10T12:00:00.000Z");
    const given = withRewardGiven(record, NOW);
    expect(given.reward.givenAt).toBe(NOW.toISOString());
    expect(given.reward.earnedAt).toBe(record.reward.earnedAt);
    expect(record.reward.givenAt).toBeUndefined();
  });

  it("adds a hero to the reveal or the credits once", () => {
    const record = cleared("a", "2027-04-10T12:00:00.000Z");
    const seen = withSeen(withSeen(record, "ann", "reward"), "ann", "reward");
    expect(seen.reward.seenBy).toEqual(["ann"]);
    expect(seen.creditsSeenBy).toEqual([]);
    const credited = withSeen(withSeen(seen, "ann", "credits"), "ben", "credits");
    expect(credited.creditsSeenBy).toEqual(["ann", "ben"]);
    expect(credited.reward.seenBy).toEqual(["ann"]);
    expect(record.reward.seenBy).toEqual([]);
  });
});
