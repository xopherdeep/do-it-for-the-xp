/**
 * Project Towers record: the family-level state of one run of a project (its dates, its floors with their bonus
 * state, the reward and the edited chore list), made from the tower the builder just made and kept by ProjectDb. The
 * quests and the tower's temple are the game's; this is the ledger the settling reads and writes (floors woken and
 * cleared, bonuses paid, the reward earned and given). Pure: no storage, no Vue.
 */
import type { ProjectTypeId } from "@/lib/services/core/packs/projects";
import type { ProjectChore, ProjectHouse } from "./projectChores";
import type { ProjectTowerInput } from "./projectQuests";
import type { PhaseWindow } from "./projectSchedule";
import type { ProjectTower } from "./projectTower";

export type ProjectStatus = "active" | "cleared" | "abandoned";

export interface ProjectFloor {
  floorKey: string;
  /** A phase id, or "roof" */
  phaseId: string;
  /** The roof shares the last phase's */
  window: PhaseWindow;
  /** The quests of the floor's chores, in list order */
  questIds: string[];
  /** When the floor's quests woke: 1F at the build, the others when the floor below is settled */
  wokenAt?: string;
  clearedAt?: string;
  /** What the bonus was multiplied by when the floor was cleared (floorBonus.ts) */
  multiplier?: number;
  /** Set once the floor's bonus is paid, so it is never paid twice */
  bonusPaidAt?: string;
}

export interface ProjectReward {
  /** What the family agreed on, in their own words */
  text: string;
  earnedAt?: string;
  givenAt?: string;
  /** The heroes who have been shown the reward's reveal */
  seenBy: string[];
}

export interface ProjectRecord {
  /** `${typeId}-${startOn}`: the quests' project id, and the key it is stored under */
  id: string;
  typeId: ProjectTypeId;
  /** The tower's generated temple */
  templeId: string;
  status: ProjectStatus;
  /** The first phase's opening day, "YYYY-MM-DD" */
  startOn: string;
  /** The last phase's due day, "YYYY-MM-DD" */
  endOn: string;
  house: ProjectHouse;
  /** Bottom to top, the roof last */
  floors: ProjectFloor[];
  /** The list the Game Master edited before the build, kept for the next run to start from */
  chores: ProjectChore[];
  reward: ProjectReward;
  /** The heroes who have watched the credits */
  creditsSeenBy: string[];
  clearedAt?: string;
}

/** The house as its own copy: the record outlives the wizard's answers, so none of them may be shared with it */
const houseCopy = (house: ProjectHouse): ProjectHouse => ({ ...house, rooms: { ...house.rooms } });

const choreCopy = (chore: ProjectChore): ProjectChore => ({ ...chore, assignee: [...chore.assignee] });

/**
 * The record of a project just built: active, the floors as the tower has them with 1F woken at the build (the instant
 * its quests carry), nothing cleared or paid, the reward not yet earned. Throws for an input with no dates.
 */
export function newProjectRecord(tower: ProjectTower, input: ProjectTowerInput, rewardText: string): ProjectRecord {
  const first = input.windows[0];
  const last = input.windows[input.windows.length - 1];
  const hasDates = Boolean(first && last);
  if (!hasDates) throw new Error("The project has no dates for its phases");
  const wokenAt = input.now.toISOString();
  return {
    id: input.projectId,
    typeId: input.type.id,
    templeId: tower.record.id,
    status: "active",
    startOn: first.opensOn,
    endOn: last.dueOn,
    house: houseCopy(input.house),
    floors: tower.floors.map((floor, index) => {
      const isGroundFloor = index === 0;
      return {
        floorKey: floor.floorKey,
        phaseId: floor.phaseId,
        window: { ...floor.window },
        questIds: [...floor.questIds],
        ...(isGroundFloor ? { wokenAt } : {}),
      };
    }),
    chores: input.chores.map(choreCopy),
    reward: { text: rewardText, seenBy: [] },
    creditsSeenBy: [],
  };
}
