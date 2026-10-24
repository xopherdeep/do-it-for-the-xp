/**
 * A project record: the family-level state of one project (its dates, its floors with their bonus state, the reward and
 * the edited chore list), made from the tower the builder just made. The 1F floor wakes at the build; every other floor
 * sleeps until the settling wakes it. Pure data: the store round trip is ProjectDb.spec.ts.
 */
import { newProjectRecord, type ProjectRecord } from "@/lib/services/projects/projectRecord";
import { buildProjectTower, projectTempleId, type ProjectTower, type ProjectTowerInput } from "@/lib/services/projects/projectTower";
import { FAMILIES, ROOM_SETS } from "./movingHouseFixtures";
import { NOW, SPRING, START, endOf, inputFor } from "./projectTowerFixtures";

const REWARD = "Pizza night, your pick";

const DEFAULT_ROOMS = ROOM_SETS[0][1];
const DAD_TWELVE_SIX = FAMILIES[0][1];

describe("newProjectRecord", () => {
  let input: ProjectTowerInput;
  let tower: ProjectTower;
  let record: ProjectRecord;

  beforeEach(() => {
    input = inputFor(SPRING, DEFAULT_ROOMS, DAD_TWELVE_SIX);
    tower = buildProjectTower(input);
    record = newProjectRecord(tower, input, REWARD);
  });

  it("is the active run of the project, named as the quests and the temple name it", () => {
    expect(record.id).toBe(input.projectId);
    expect(record.id).toBe(`spring-cleaning-${START}`);
    expect(record.typeId).toBe("spring-cleaning");
    expect(record.templeId).toBe(tower.record.id);
    expect(record.templeId).toBe(projectTempleId("spring-cleaning"));
    expect(record.status).toBe("active");
  });

  it("runs from the first window's opening to the last window's due day", () => {
    expect(record.startOn).toBe(input.windows[0].opensOn);
    expect(record.startOn).toBe(START);
    expect(record.endOn).toBe(input.windows[input.windows.length - 1].dueOn);
    expect(record.endOn).toBe(endOf(SPRING, START));
  });

  it("carries the house and the edited chore list as they were at the build", () => {
    expect(record.house).toEqual(input.house);
    expect(record.chores).toEqual(input.chores);
    expect(record.chores.length).toBeGreaterThan(0);
  });

  it("copies the tower's floors with their windows and quests, bottom to top, the roof last", () => {
    expect(record.floors).toHaveLength(tower.floors.length);
    expect(record.floors.map((floor) => floor.floorKey)).toEqual(tower.floors.map((floor) => floor.floorKey));
    expect(record.floors.map((floor) => floor.phaseId)).toEqual([...SPRING.phases.map((phase) => phase.id), "roof"]);
    record.floors.forEach((floor, index) => {
      expect(floor.window).toEqual(tower.floors[index].window);
      expect(floor.questIds).toEqual(tower.floors[index].questIds);
    });
    expect(record.floors[0].floorKey).toBe("1F");
    expect(record.floors[record.floors.length - 1].window).toEqual(record.floors[record.floors.length - 2].window);
  });

  it("wakes the 1F floor at the build, the same instant its quests carry, and no other", () => {
    const wokenAt = NOW.toISOString();
    expect(record.floors[0].wokenAt).toBe(wokenAt);
    const [firstQuestId] = record.floors[0].questIds;
    const firstQuest = tower.quests.find((quest) => quest.id === firstQuestId);
    expect(firstQuest?.project?.wokenAt).toBe(wokenAt);
    record.floors.slice(1).forEach((floor) => expect(floor.wokenAt).toBeUndefined());
  });

  it("leaves every floor unsettled: nothing cleared, no multiplier, no bonus paid", () => {
    record.floors.forEach((floor) => {
      expect(floor.clearedAt).toBeUndefined();
      expect(floor.multiplier).toBeUndefined();
      expect(floor.bonusPaidAt).toBeUndefined();
    });
    expect(record.clearedAt).toBeUndefined();
  });

  it("holds the reward's text, not yet earned or given, and seen by no one", () => {
    expect(record.reward).toEqual({ text: REWARD, seenBy: [] });
    expect(record.creditsSeenBy).toEqual([]);
  });

  it("is its own copy: editing it never reaches the tower or the input", () => {
    record.floors[0].questIds.push("extra");
    record.floors[0].window.dueOn = "2099-01-01";
    record.chores[0].assignee.push("someone");
    record.chores[0].name = "Renamed";
    (record.house.rooms as Record<string, number>).kitchen = 99;
    record.reward.seenBy.push("hero");

    expect(tower.floors[0].questIds).not.toContain("extra");
    expect(tower.floors[0].window.dueOn).not.toBe("2099-01-01");
    expect(input.windows[0].dueOn).not.toBe("2099-01-01");
    expect(input.chores[0].assignee).not.toContain("someone");
    expect(input.chores[0].name).not.toBe("Renamed");
    expect(input.house.rooms.kitchen).not.toBe(99);
  });

  it("survives a JSON round trip unchanged (it is what the store keeps)", () => {
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it("refuses an input with no dates", () => {
    expect(() => newProjectRecord(tower, { ...input, windows: [] }, REWARD)).toThrow(/dates/i);
  });
});
