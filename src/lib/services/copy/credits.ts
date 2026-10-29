/**
 * The credits roll's data. Two parts, both here:
 *
 *  - MAKERS: the people who made the game, in the order of the roll. This is the one place to add, drop or reword a
 *    maker: the roll shows each maker's role and name, nothing else.
 *  - heroCredits: the heroes' part of the roll. Who did what in a cleared tower is read from the quest log's paid
 *    entries of the project's quests, never from a second store.
 *
 * Pure: no storage, no Vue.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import { isPaidEntry } from "@/lib/services/projects/projectProgress";
import { projectQuestId } from "@/lib/services/projects/projectQuests";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";

export interface Maker {
  name: string;
  role: string;
}

export const MAKERS: readonly Maker[] = [
  { role: "Producer", name: "Xopher Pollard aka XP" },
  { role: "Character Design / Original Chore List", name: "Krislynn Night" },
  { role: "World Map Design", name: "Khronus Infinidee" },
  { role: "Bestiary / Chore / Enemy Design", name: "Gaia Rhae-Satori" },
  { role: "Dungeon Mechanics", name: "Ronan Tesla" },
  { role: "Play Tester", name: "Kairos Sol" },
];

// ---- The heroes' part ----------------------------------------------------------------------------------------

export interface HeroCredit {
  heroId: string;
  name: string;
  className: string;
  /** The project's chores paid to them, or done by the team they were on */
  chores: number;
  /** How many of those were boss rooms of the tower */
  bosses: number;
  /** The keys of the floors they worked ("1F"), lowest first */
  floors: string[];
}

/** As much of a hero as the roll reads */
interface CreditHero {
  id: string;
  name: string;
  className: string;
}

/** The type of a quest that a team shares: one assignee's clear is the whole team's */
const TEAM_QUEST_TYPE = "collaborate";

/** The phase's biggest chore, the first on a tie: the one the tower builds the floor's boss room for (projectTower.ts) */
const biggestOf = (chores: readonly ProjectChore[]): ProjectChore | undefined =>
  chores.reduce<ProjectChore | undefined>((best, chore) => {
    const isBigger = best === undefined || chore.difficulty > best.difficulty;
    return isBigger ? chore : best;
  }, undefined);

/**
 * The quests that are boss rooms of the tower: each floor's boss (the last phase's is the key guard) and the roof's
 * finale, which is the biggest chore of its phase too. Read from the chore list the tower was built from, so a quest the
 * Game Master deleted later does not hand its boss to another chore, and an old run's tower need not still stand.
 */
export function bossQuestIds(project: ProjectRecord): ReadonlySet<string> {
  const phaseIds = new Set(project.chores.map((chore) => chore.phaseId));
  const bosses = [...phaseIds].flatMap((phaseId) => {
    const boss = biggestOf(project.chores.filter((chore) => chore.phaseId === phaseId));
    return boss ? [projectQuestId(project.id, boss.id)] : [];
  });
  return new Set(bosses);
}

/** The heroes each of the project's chores counts for: those it was paid to, and the whole team of a team's chore */
const creditedHeroes = (project: ProjectRecord, quests: readonly Achievement[], paid: readonly QuestLogEntry[]): Map<string, Set<string>> => {
  const projectQuestIds = new Set(project.floors.flatMap((floor) => floor.questIds));
  const questById = new Map(quests.map((quest) => [String(quest.id), quest]));
  const credited = new Map<string, Set<string>>();
  for (const entry of paid) {
    const questId = String(entry.questId);
    const isProjectChoreDone = isPaidEntry(entry) && projectQuestIds.has(questId);
    if (!isProjectChoreDone) continue;
    const quest = questById.get(questId);
    const isTeamChore = quest?.type === TEAM_QUEST_TYPE;
    const team = isTeamChore ? (quest?.assignee ?? []).map(String) : [];
    credited.set(questId, new Set([...(credited.get(questId) ?? []), String(entry.userId), ...team]));
  }
  return credited;
};

/**
 * What each hero did in the project: the chores counted for them, the boss rooms among those and the floors they
 * worked. A team's chore counts for every hero on the team once any of them was paid for it (only one is paid: the
 * team's first clear fills the chore for all). Heroes come out in the family's order; one who cleared nothing, and
 * anyone no longer in the family's list, is left out.
 */
export function heroCredits(project: ProjectRecord, quests: readonly Achievement[], paid: readonly QuestLogEntry[], heroes: readonly CreditHero[]): HeroCredit[] {
  const credited = creditedHeroes(project, quests, paid);
  const bosses = bossQuestIds(project);
  const floorOf = new Map(project.floors.flatMap((floor) => floor.questIds.map((id) => [id, floor.floorKey] as const)));
  return heroes.flatMap((hero): HeroCredit[] => {
    const mine = [...credited].filter(([, who]) => who.has(hero.id)).map(([questId]) => questId);
    const hasNoWork = mine.length === 0;
    if (hasNoWork) return [];
    const worked = new Set(mine.map((questId) => floorOf.get(questId)));
    return [
      {
        heroId: hero.id,
        name: hero.name,
        className: hero.className,
        chores: mine.length,
        bosses: mine.filter((questId) => bosses.has(questId)).length,
        floors: project.floors.map((floor) => floor.floorKey).filter((key) => worked.has(key)),
      },
    ];
  });
}
