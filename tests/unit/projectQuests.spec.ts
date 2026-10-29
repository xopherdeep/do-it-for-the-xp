/**
 * A project's chores as quests: each chore of the edited list becomes a one-off quest due at 20:00 on its phase's
 * date, tied to its tower floor, woken at the build only on 1F, paid on the Fibonacci scale, and sent for approval
 * when a child does a big chore without a grown-up. Pure: no storage, no Vue.
 */
import { dateKey } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import type { ProjectType } from "@/lib/services/core/packs/projects";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import type { PhaseWindow } from "@/lib/services/projects/projectSchedule";
import {
  PROJECT_DUE_TIME,
  projectQuestId,
  projectStartsOn,
  questsForProject,
  type ProjectTowerInput,
} from "@/lib/services/projects/projectQuests";

const dad: PackHero = { id: "dad", name: "Dad", band: "grownup" };
const kai: PackHero = { id: "kai", name: "Kai", band: "kid" };
const kit: PackHero = { id: "kit", name: "Kit", band: "kid" };
const lia: PackHero = { id: "lia", name: "Lia", band: "little" };
const HEROES = [dad, kai, kit, lia];

const TYPE: ProjectType = {
  id: "spring-cleaning", name: "Test", towerName: "The Test Spire", element: "wind", defaultDays: 6,
  phases: [
    { id: "p1", name: "One", share: 0.5, chores: [] },
    { id: "p2", name: "Two", share: 0.5, chores: [] },
  ],
  finale: { slug: "boss", name: "The Boss", rooms: "house", difficulty: 8, who: "team" },
};

const WINDOWS: PhaseWindow[] = [
  { phaseId: "p1", opensOn: "2027-04-03", dueOn: "2027-04-05" },
  { phaseId: "p2", opensOn: "2027-04-06", dueOn: "2027-04-08" },
];

const NOW = new Date(2027, 3, 3, 9, 30);

const chore = (over: Partial<ProjectChore> & { id: string }): ProjectChore => ({
  phaseId: "p1", roomId: "kitchen", name: `Chore ${over.id}`, difficulty: 2, assignee: ["kai"], ...over,
});

/** The input around these chores; `null` heroes leaves the heroes out */
const inputOf = (chores: ProjectChore[], heroes: readonly PackHero[] | null = HEROES): ProjectTowerInput => ({
  projectId: "spring-cleaning-2027-04-03",
  type: TYPE,
  house: { rooms: { kitchen: 1 } },
  chores,
  windows: WINDOWS,
  now: NOW,
  ...(heroes ? { heroes } : {}),
});

const FLOORS: Record<string, string> = { p1: "1F", p2: "2F", roof: "3F" };
const floorOf = (phaseId: string): string => FLOORS[phaseId];

const questOf = (one: ProjectChore, heroes: readonly PackHero[] | null = HEROES) => questsForProject(inputOf([one], heroes), floorOf)[0];

describe("projectQuestId and the due time", () => {
  it("names a quest pq-<projectId>-<choreId> and makes every chore due at 20:00", () => {
    expect(projectQuestId("spring-cleaning-2027-04-03", "p1:sweep:kitchen")).toBe("pq-spring-cleaning-2027-04-03-p1:sweep:kitchen");
    expect(PROJECT_DUE_TIME).toBe("20:00");
  });
});

describe("questsForProject", () => {
  it("makes a chore a one-off quest due at 20:00 on its phase's date, tied to its floor and still asleep above 1F", () => {
    const quest = questOf(chore({ id: "p2:dust:kitchen", phaseId: "p2", name: "Dust the Shelves", difficulty: 3, beastId: "beast-dust", minutes: 25 }));
    expect(quest).toEqual({
      id: "pq-spring-cleaning-2027-04-03-p2:dust:kitchen",
      achievementName: "Dust the Shelves",
      categoryId: "",
      beastId: "beast-dust",
      subAchievementIds: [],
      requiresApproval: false,
      bonusAchievement: false,
      type: "individual",
      assignee: ["kai"],
      startsOn: projectStartsOn("2027-04-06"),
      endsOn: "",
      dueByTime: "20:00",
      basicSchedule: "once",
      scheduleType: "basic",
      showDailyUntilComplete: false,
      customFrequency: 1,
      customPeriodType: "day",
      customPeriodNumber: 1,
      repeatOnDays: [],
      difficulty: 3,
      estimatedMinutes: 25,
      xp: 300,
      gp: 45,
      ap: 3,
      adventureType: "beast",
      project: { projectId: "spring-cleaning-2027-04-03", floor: "2F", dueOn: "2027-04-08" },
    });
  });

  it("starts a quest on its window's first day, read as a local day", () => {
    const quest = questOf(chore({ id: "c", phaseId: "p2" }));
    expect(dateKey(new Date(quest.startsOn))).toBe("2027-04-06");
    expect(new Date(quest.startsOn).getHours()).toBe(0);
  });

  it("wakes the 1F quests at the build", () => {
    const quest = questOf(chore({ id: "c", phaseId: "p1" }));
    expect(quest.project).toEqual({ projectId: "spring-cleaning-2027-04-03", floor: "1F", dueOn: "2027-04-05", wokenAt: NOW.toISOString() });
  });

  it("puts the finale on the roof, due on the last phase's date", () => {
    const quest = questOf(chore({ id: "roof:boss:roof", phaseId: "roof", roomId: "roof", difficulty: 8, assignee: ["dad", "kai"] }));
    expect(quest.project).toEqual({ projectId: "spring-cleaning-2027-04-03", floor: "3F", dueOn: "2027-04-08" });
    expect(quest.startsOn).toBe(projectStartsOn("2027-04-06"));
  });

  it("makes a chore of several heroes a collaborate quest and one hero's an individual one, with its own copy of the list", () => {
    const team = chore({ id: "team", assignee: ["dad", "kai", "lia"] });
    const [shared, own] = questsForProject(inputOf([team, chore({ id: "own", assignee: ["lia"] })]), floorOf);
    expect(shared.type).toBe("collaborate");
    expect(shared.assignee).toEqual(["dad", "kai", "lia"]);
    expect(shared.assignee).not.toBe(team.assignee);
    expect(own.type).toBe("individual");
  });

  it("pays the Fibonacci rewards for the chore's size", () => {
    expect(questOf(chore({ id: "c", difficulty: 13, assignee: ["dad"] }))).toMatchObject({ difficulty: 13, xp: 1300, gp: 195, ap: 13 });
  });

  it("leaves the beast and the minutes out when the chore has none, so the library and the default clock take over", () => {
    const quest = questOf(chore({ id: "c" }));
    expect(quest).not.toHaveProperty("beastId");
    expect(quest).not.toHaveProperty("estimatedMinutes");
    expect(quest).not.toHaveProperty("createdBy");
  });

  it("keeps the chore list's order", () => {
    const quests = questsForProject(inputOf([chore({ id: "b", phaseId: "p2" }), chore({ id: "a" })]), floorOf);
    expect(quests.map((quest) => quest.id)).toEqual(["pq-spring-cleaning-2027-04-03-b", "pq-spring-cleaning-2027-04-03-a"]);
  });

  it("throws for a chore whose phase has no window", () => {
    expect(() => questsForProject(inputOf([chore({ id: "c", phaseId: "p9" })]), floorOf)).toThrow(/p9/);
  });

  describe("approval", () => {
    it.each([
      ["a kid alone on a size 5", 5, ["kai"], true],
      ["a little one alone on a size 8", 8, ["lia"], true],
      ["two kids together on a size 5", 5, ["kai", "kit"], true],
      ["a kid alone on a size 3", 3, ["kai"], false],
      ["a kid with a grown-up on a size 8", 8, ["kai", "dad"], false],
      ["a grown-up alone on a size 13", 13, ["dad"], false],
      ["nobody on a size 8", 8, [], false],
      ["a hero the list does not know on a size 8", 8, ["ghost"], false],
    ])("%s: approval %s", (_label, difficulty, assignee, expected) => {
      expect(questOf(chore({ id: "c", difficulty: difficulty as number, assignee: assignee as string[] })).requiresApproval).toBe(expected);
    });

    it("asks for no approval when no heroes are given", () => {
      expect(questOf(chore({ id: "c", difficulty: 8, assignee: ["kai"] }), null).requiresApproval).toBe(false);
    });
  });
});
