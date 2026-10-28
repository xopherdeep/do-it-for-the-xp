/**
 * What a hero (and the Game Master) read off the running tower: which floor they are on the clock of, which floors read
 * cleared, which cleared floors they were not yet told about, and whether a new end day can be asked for. Pure.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { clearedFloorKeys, currentFloorOf, endDateProblem, floorRowsOf, unseenClearedFloors, withFloorSeen } from "@/lib/services/projects/towerView";

const FIRST = { phaseId: "sort", opensOn: "2027-04-03", dueOn: "2027-04-06" };
const SECOND = { phaseId: "clean", opensOn: "2027-04-07", dueOn: "2027-04-10" };

const floorOf = (floorKey: string, phaseId: string, window: ProjectFloor["window"], questIds: string[], extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey, phaseId, window: { ...window }, questIds, ...extra,
});

/** 1F (two chores) awake, 2F (one) asleep, the roof 3F (the finale) asleep */
const projectOf = (floors?: ProjectFloor[]): ProjectRecord => ({
  id: "spring-cleaning-2027-04-03",
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "active",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: floors ?? [
    floorOf("1F", "sort", FIRST, ["pq-a", "pq-b"], { wokenAt: "2027-04-03T15:00:00.000Z" }),
    floorOf("2F", "clean", SECOND, ["pq-c"]),
    floorOf("3F", "roof", SECOND, ["pq-fin"]),
  ],
  chores: [],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
});

const questOf = (id: string): Achievement => ({ id, achievementName: id, type: "individual", assignee: [] } as unknown as Achievement);

const QUESTS = (): Achievement[] => ["pq-a", "pq-b", "pq-c", "pq-fin"].map(questOf);

const paidEntry = (questId: string, extra: Partial<QuestLogEntry> = {}): QuestLogEntry =>
  ({ id: `entry-${questId}`, questId, userId: "ann", completedAt: "2027-04-04T12:00:00.000Z", status: "approved", rewardsApplied: true, ...extra } as QuestLogEntry);

describe("currentFloorOf", () => {
  it("is the lowest floor that is awake and not cleared", () => {
    expect(currentFloorOf(projectOf())?.floorKey).toBe("1F");
    const climbed = projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-05T12:00:00.000Z" }),
      floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-05T12:00:00.000Z" }),
      floorOf("3F", "roof", SECOND, ["pq-fin"]),
    ]);
    expect(currentFloorOf(climbed)?.floorKey).toBe("2F");
  });

  it("keeps the lowest open floor when a higher one was woken by arriving early", () => {
    const early = projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { wokenAt: "2027-04-03T15:00:00.000Z" }),
      floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T09:00:00.000Z" }),
      floorOf("3F", "roof", SECOND, ["pq-fin"]),
    ]);
    expect(currentFloorOf(early)?.floorKey).toBe("1F");
  });

  it("falls back to the lowest floor not cleared, then to the top floor when all are", () => {
    const asleep = projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { clearedAt: "2027-04-05T12:00:00.000Z", wokenAt: "2027-04-03T15:00:00.000Z" }),
      floorOf("2F", "clean", SECOND, ["pq-c"]),
    ]);
    expect(currentFloorOf(asleep)?.floorKey).toBe("2F");
    const done = projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { clearedAt: "2027-04-05T12:00:00.000Z" }),
      floorOf("2F", "roof", SECOND, ["pq-fin"], { clearedAt: "2027-04-06T12:00:00.000Z" }),
    ]);
    expect(currentFloorOf(done)?.floorKey).toBe("2F");
  });

  it("is nothing for a record with no floors", () => {
    expect(currentFloorOf(projectOf([]))).toBeUndefined();
  });
});

describe("clearedFloorKeys", () => {
  it("lists the floors whose chores were all paid, settled or not", () => {
    const paid = [paidEntry("pq-a"), paidEntry("pq-b")];
    expect(clearedFloorKeys(projectOf(), QUESTS(), paid)).toEqual(["1F"]);
  });

  it("counts a floor emptied by deleting its chores as cleared", () => {
    const withoutC = QUESTS().filter((quest) => quest.id !== "pq-c");
    expect(clearedFloorKeys(projectOf(), withoutC, [])).toEqual(["2F"]);
  });

  it("does not count a claim held for approval", () => {
    const held = [paidEntry("pq-a"), paidEntry("pq-b", { status: "pending", rewardsApplied: false })];
    expect(clearedFloorKeys(projectOf(), QUESTS(), held)).toEqual([]);
  });
});

describe("unseenClearedFloors", () => {
  const cleared = (seenBy?: string[]): ProjectRecord =>
    projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-05T12:00:00.000Z", multiplier: 1.6, ...(seenBy ? { seenBy } : {}) }),
      floorOf("2F", "clean", SECOND, ["pq-c"], { wokenAt: "2027-04-05T12:00:00.000Z", clearedAt: "2027-04-06T12:00:00.000Z", multiplier: 1 }),
      floorOf("3F", "roof", SECOND, ["pq-fin"], { wokenAt: "2027-04-06T12:00:00.000Z" }),
    ]);

  it("lists the cleared floors a hero was not told about, lowest first", () => {
    expect(unseenClearedFloors(cleared(), "kai").map((floor) => floor.floorKey)).toEqual(["1F", "2F"]);
  });

  it("leaves out the floors that hero saw, and still lists them for another hero", () => {
    expect(unseenClearedFloors(cleared(["kai"]), "kai").map((floor) => floor.floorKey)).toEqual(["2F"]);
    expect(unseenClearedFloors(cleared(["kai"]), "lia").map((floor) => floor.floorKey)).toEqual(["1F", "2F"]);
  });

  it("never lists a floor that is not cleared, nor the roof (its clear is the project's finish)", () => {
    const roofCleared = projectOf([
      floorOf("1F", "sort", FIRST, ["pq-a"], { clearedAt: "2027-04-05T12:00:00.000Z" }),
      floorOf("2F", "roof", SECOND, ["pq-fin"], { clearedAt: "2027-04-06T12:00:00.000Z" }),
    ]);
    expect(unseenClearedFloors(roofCleared, "kai").map((floor) => floor.floorKey)).toEqual(["1F"]);
    expect(unseenClearedFloors(projectOf(), "kai")).toEqual([]);
  });
});

describe("withFloorSeen", () => {
  it("adds the hero to the floor's seenBy once, on a copy", () => {
    const base = projectOf([floorOf("1F", "sort", FIRST, ["pq-a"], { clearedAt: "2027-04-05T12:00:00.000Z" })]);
    const once = withFloorSeen(base, "1F", "kai");
    expect(once.floors[0].seenBy).toEqual(["kai"]);
    expect(base.floors[0].seenBy).toBeUndefined();
    expect(withFloorSeen(once, "1F", "kai")).toBe(once);
    expect(withFloorSeen(once, "1F", "lia").floors[0].seenBy).toEqual(["kai", "lia"]);
  });

  it("changes nothing for a floor the record does not have", () => {
    const base = projectOf();
    expect(withFloorSeen(base, "9F", "kai")).toBe(base);
  });
});

describe("floorRowsOf", () => {
  it("lists every floor bottom to top with its phase's name and where it stands", () => {
    const climbed = projectOf([
      floorOf("1F", "declutter", FIRST, ["pq-a"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-04T12:00:00.000Z" }),
      floorOf("2F", "deep-clean", SECOND, ["pq-c"], { wokenAt: "2027-04-04T12:00:00.000Z" }),
      floorOf("3F", "organize", SECOND, ["pq-d"]),
      floorOf("4F", "roof", SECOND, ["pq-fin"]),
    ]);

    expect(floorRowsOf(climbed)).toEqual([
      { floorKey: "1F", name: "Declutter", state: "cleared" },
      { floorKey: "2F", name: "Deep Clean", state: "open" },
      { floorKey: "3F", name: "Organize", state: "asleep" },
      { floorKey: "4F", name: "The Roof", state: "asleep" },
    ]);
  });

  it("reads a floor cleared early as cleared, however far ahead its due day still is", () => {
    const early = projectOf([floorOf("1F", "declutter", { ...FIRST, dueOn: "2099-01-01" }, ["pq-a"], { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-04T12:00:00.000Z" })]);
    expect(floorRowsOf(early)[0].state).toBe("cleared");
  });
});

describe("endDateProblem", () => {
  it("accepts today and any later real day", () => {
    expect(endDateProblem("2027-04-10", "2027-04-10")).toBeNull();
    expect(endDateProblem("2027-06-01", "2027-04-10")).toBeNull();
  });

  it("refuses a day before today", () => {
    expect(endDateProblem("2027-04-09", "2027-04-10")).toBe("past");
  });

  it("refuses text that is not a real day", () => {
    expect(endDateProblem("", "2027-04-10")).toBe("invalid");
    expect(endDateProblem("soon", "2027-04-10")).toBe("invalid");
    expect(endDateProblem("2027-02-30", "2027-04-10")).toBe("invalid");
    expect(endDateProblem("2027-4-8", "2027-04-10")).toBe("invalid");
  });
});
