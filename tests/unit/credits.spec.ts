/**
 * The credits' data and the heroes' part of the roll: the game's makers in order (names and roles only), and who did
 * what in a cleared tower, read from the quest log's paid entries. The tower is a real one built from the wizard's
 * input, so the "boss" the credits count is checked against the rooms the tower itself builds.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { MAKERS, bossQuestIds, heroCredits, type HeroCredit } from "@/lib/services/copy/credits";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import { projectQuestId } from "@/lib/services/projects/projectQuests";
import { newProjectRecord, type ProjectRecord } from "@/lib/services/projects/projectRecord";
import { ROOF_PHASE_ID } from "@/lib/services/projects/projectSchedule";
import { buildProjectTower, type ProjectTower, type ProjectTowerInput } from "@/lib/services/projects/projectTower";
import { FAMILIES, ROOM_SETS } from "./movingHouseFixtures";
import { SPRING, biggestOf, cellsOf, choresOf, holding, inputFor } from "./projectTowerFixtures";

describe("the game's makers", () => {
  it("lists the six makers in the order of the roll, each with a role and a name", () => {
    expect(MAKERS.map((maker) => [maker.role, maker.name])).toEqual([
      ["Producer", "Xopher Pollard aka XP"],
      ["Character Design / Original Chore List", "Krislynn Night"],
      ["World Map Design", "Khronus Infinidee"],
      ["Bestiary / Chore / Enemy Design", "Gaia Rhae-Satori"],
      ["Dungeon Mechanics", "Ronan Tesla"],
      ["Play Tester", "Kairos Sol"],
    ]);
  });

  it("keeps a name and a role for each maker and nothing else", () => {
    for (const maker of MAKERS) expect(Object.keys(maker).sort()).toEqual(["name", "role"]);
  });
});

// ---- Who did what ---------------------------------------------------------------------------------------------

const DAD = { id: "dad", name: "Dad", className: "Knight" };
const TWELVE = { id: "twelve", name: "Twelve", className: "Mage" };
const SIX = { id: "six", name: "Six", className: "Rogue" };
const HEROES = [DAD, TWELVE, SIX];

const entryOf = (questId: string, userId: string, extra: Partial<QuestLogEntry> = {}): QuestLogEntry => ({
  id: `entry-${questId}-${userId}`,
  questId,
  questName: questId,
  userId,
  completedAt: new Date(2027, 3, 5, 12).toISOString(),
  dayKey: "2027-04-05",
  status: "approved",
  source: "claim",
  rewards: { xp: 0, gp: 0, ap: 0 },
  rewardsApplied: true,
  ...extra,
});

interface Built {
  input: ProjectTowerInput;
  tower: ProjectTower;
  project: ProjectRecord;
}

/** Spring Cleaning for Dad, Twelve and Six: the wizard's suggested chores, built into a tower and its record */
const springBuilt = (): Built => {
  const input = inputFor(SPRING, ROOM_SETS[0][1], FAMILIES[0][1]);
  const tower = buildProjectTower(input);
  return { input, tower, project: newProjectRecord(tower, input, "Pizza night") };
};

const floorKeyOf = (project: ProjectRecord, questId: string): string => project.floors.find((floor) => floor.questIds.includes(questId))!.floorKey;

/** The first quest of a floor that is not its boss */
const plainQuestOf = (project: ProjectRecord, floorKey: string): string => {
  const bosses = bossQuestIds(project);
  return project.floors.find((floor) => floor.floorKey === floorKey)!.questIds.find((id) => !bosses.has(id))!;
};

const creditOf = (credits: HeroCredit[], heroId: string): HeroCredit | undefined => credits.find((credit) => credit.heroId === heroId);

describe("heroCredits", () => {
  const { project, tower } = springBuilt();
  const quests = tower.quests;
  const [floor1, floor2] = project.floors;
  const first = floor1.questIds[0];
  const second = floor1.questIds[1];
  const third = floor2.questIds[0];

  it("counts each hero's paid project chores, with their class", () => {
    const paid = [entryOf(first, "twelve"), entryOf(second, "twelve"), entryOf(third, "six")];
    const credits = heroCredits(project, quests, paid, HEROES);
    expect(creditOf(credits, "twelve")).toMatchObject({ name: "Twelve", className: "Mage", chores: 2 });
    expect(creditOf(credits, "six")).toMatchObject({ name: "Six", className: "Rogue", chores: 1 });
  });

  it("counts a chore once however many times it was paid", () => {
    const paid = [entryOf(first, "twelve"), entryOf(first, "twelve", { id: "again" })];
    expect(creditOf(heroCredits(project, quests, paid, HEROES), "twelve")?.chores).toBe(1);
  });

  it("leaves out entries that were never paid, and chores of other projects", () => {
    const paid = [
      entryOf(first, "twelve", { rewardsApplied: false, status: "pending" }),
      entryOf(second, "twelve", { rewardsApplied: false, status: "rejected" }),
      entryOf("quest-from-somewhere-else", "twelve"),
    ];
    expect(heroCredits(project, quests, paid, HEROES)).toEqual([]);
  });

  it("lists the heroes in the family's order and leaves out a hero who cleared nothing", () => {
    const paid = [entryOf(first, "six"), entryOf(second, "dad")];
    expect(heroCredits(project, quests, paid, HEROES).map((credit) => credit.heroId)).toEqual(["dad", "six"]);
  });

  it("leaves out someone who is no longer in the family's list", () => {
    const paid = [entryOf(first, "twelve"), entryOf(second, "a-hero-who-left")];
    expect(heroCredits(project, quests, paid, HEROES).map((credit) => credit.heroId)).toEqual(["twelve"]);
  });

  it("names the floors a hero worked, once each, lowest first", () => {
    const paid = [entryOf(third, "twelve"), entryOf(first, "twelve"), entryOf(second, "twelve")];
    expect(creditOf(heroCredits(project, quests, paid, HEROES), "twelve")?.floors).toEqual([floor1.floorKey, floor2.floorKey]);
  });

  it("counts the boss rooms among the chores: each floor's boss, the key guard and the finale", () => {
    const bosses = [...bossQuestIds(project)];
    const paid = [...bosses.map((id) => entryOf(id, "twelve")), entryOf(plainQuestOf(project, floor1.floorKey), "twelve")];
    const credit = creditOf(heroCredits(project, quests, paid, HEROES), "twelve")!;
    expect(credit.bosses).toBe(bosses.length);
    expect(credit.chores).toBe(bosses.length + 1);
  });

  it("counts a plain chore as a chore and not a boss", () => {
    const paid = [entryOf(plainQuestOf(project, floor1.floorKey), "six")];
    expect(creditOf(heroCredits(project, quests, paid, HEROES), "six")).toMatchObject({ chores: 1, bosses: 0 });
  });

  it("counts a team chore for every assignee when one of them was paid for it", () => {
    const finaleId = project.floors[project.floors.length - 1].questIds[0];
    const teamQuests = quests.map((quest): Achievement => (String(quest.id) === finaleId ? { ...quest, type: "collaborate", assignee: ["dad", "twelve", "six"] } : quest));
    const credits = heroCredits(project, teamQuests, [entryOf(finaleId, "twelve")], HEROES);
    expect(credits.map((credit) => [credit.heroId, credit.chores, credit.bosses])).toEqual([
      ["dad", 1, 1],
      ["twelve", 1, 1],
      ["six", 1, 1],
    ]);
    expect(creditOf(credits, "dad")?.floors).toEqual([project.floors[project.floors.length - 1].floorKey]);
  });

  it("gives a chore that is not a team's to the hero who was paid for it alone", () => {
    const soloQuests = quests.map((quest): Achievement => (String(quest.id) === first ? { ...quest, type: "individual", assignee: ["dad", "twelve"] } : quest));
    const credits = heroCredits(project, soloQuests, [entryOf(first, "twelve")], HEROES);
    expect(credits.map((credit) => credit.heroId)).toEqual(["twelve"]);
  });

  it("still credits the hero for a chore whose quest the Game Master deleted", () => {
    const without = quests.filter((quest) => String(quest.id) !== first);
    expect(creditOf(heroCredits(project, without, [entryOf(first, "twelve")], HEROES), "twelve")?.chores).toBe(1);
  });

  it("is empty for a family nobody played", () => {
    expect(heroCredits(project, quests, [], HEROES)).toEqual([]);
    expect(heroCredits(project, quests, [entryOf(first, "twelve")], [])).toEqual([]);
  });
});

// ---- What the credits call a boss ---------------------------------------------------------------------------

/** The towers the wizard can build for a few families and houses: both project types */
const BUILDS: [string, ProjectTowerInput][] = Object.values(PROJECT_TYPES).flatMap((type) =>
  ROOM_SETS.slice(0, 3).flatMap(([roomsLabel, rooms]) => FAMILIES.slice(0, 2).map(([familyLabel, heroes]): [string, ProjectTowerInput] => [`${type.name}, ${roomsLabel}, ${familyLabel}`, inputFor(type, rooms, heroes)])),
);

describe("what the credits count as a boss", () => {
  it.each(BUILDS)("%s: is each phase's biggest chore (the first on a tie) and the roof's finale", (_label, input) => {
    const tower = buildProjectTower(input);
    const project = newProjectRecord(tower, input, "Pizza night");
    const phaseBosses = input.type.phases.filter((phase) => choresOf(input, phase.id).length > 0).map((phase) => projectQuestId(input.projectId, biggestOf(choresOf(input, phase.id)).id));
    const finale = projectQuestId(input.projectId, choresOf(input, ROOF_PHASE_ID)[0].id);
    expect([...bossQuestIds(project)].sort()).toEqual([...phaseBosses, finale].sort());
  });

  it.each(BUILDS)("%s: is the quest the tower keeps alone in its boss room, the key guard's and the finale's sealed", (_label, input) => {
    const tower = buildProjectTower(input);
    const project = newProjectRecord(tower, input, "Pizza night");
    const cells = cellsOf(tower);
    const bosses = [...bossQuestIds(project)];
    for (const id of bosses) {
      const [room] = holding(cells, id);
      expect(room.room.content).toMatchObject({ questIds: [id], difficulty: "boss" });
    }
    const rooms = bosses.map((id) => holding(cells, id)[0].room.type);
    expect(rooms.filter((type) => type === "miniboss")).toHaveLength(1);
    expect(rooms.filter((type) => type === "boss")).toHaveLength(1);
    const guard = bosses.find((id) => holding(cells, id)[0].room.type === "miniboss")!;
    expect(floorKeyOf(project, guard)).toBe(project.floors[input.type.phases.length - 1].floorKey);
  });

  it("is known from the record alone: a deleted boss quest hands the boss to no other chore", () => {
    const { project, tower } = springBuilt();
    const bosses = [...bossQuestIds(project)];
    const [deleted, ...others] = bosses;
    const without = tower.quests.filter((quest) => String(quest.id) !== deleted);
    const paid = [entryOf(deleted, "twelve"), entryOf(plainQuestOf(project, "1F"), "twelve")];
    expect(others.length).toBeGreaterThan(0);
    expect(heroCredits(project, without, paid, HEROES)).toMatchObject([{ heroId: "twelve", chores: 2, bosses: 1 }]);
  });
});
