/**
 * Project Towers quests: every chore of a project's edited list as the one-off quest the board, the fights and the
 * tower's rooms know. Pure: no storage, no Vue.
 *
 * A project quest is a "once" quest (any other schedule would give it a daily window) due at PROJECT_DUE_TIME on its
 * phase's last day (`project.dueOn`, always a real "YYYY-MM-DD": a malformed one would read as today and never go
 * overdue). The roof's finale is due with the last phase. It sleeps until its floor wakes: 1F wakes at the build, so
 * only 1F quests carry `wokenAt`. A child's big chore with no grown-up on it waits for the Game Master's approval, as
 * the Moving House pack's kid chores of size 5 and up do.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { ProjectType } from "@/lib/services/core/packs/projects";
import { parseLocalDate, rewardsFor } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import type { ProjectChore, ProjectHouse } from "./projectChores";
import { ROOF_PHASE_ID, type PhaseWindow } from "./projectSchedule";

/** Every project chore is due by eight in the evening of its phase's last day */
export const PROJECT_DUE_TIME = "20:00";

/** The floor that wakes at the build */
const GROUND_FLOOR = "1F";

/** A chore this big, done by children alone, waits for the Game Master */
const APPROVAL_FROM = 5;

/** The bands that are children */
const CHILD_BANDS: ReadonlySet<string | undefined> = new Set(["kid", "little"]);

/** What the tower is built from: the wizard's answers, the edited chores and the phases' windows */
export interface ProjectTowerInput {
  /** `${typeId}-${startOn}` */
  projectId: string;
  type: ProjectType;
  house: ProjectHouse;
  chores: readonly ProjectChore[];
  windows: readonly PhaseWindow[];
  /** The build time: the 1F quests are woken at it */
  now: Date;
  /** Who plays, for the approval rule; without them no chore waits for approval */
  heroes?: readonly PackHero[];
}

export const projectQuestId = (projectId: string, choreId: string): string => `pq-${projectId}-${choreId}`;

/** A quest's `startsOn` for a window that opens on this day: the local midnight, as the packs write it */
export const projectStartsOn = (opensOn: string): string => parseLocalDate(opensOn).toISOString();

/** The window a phase's chores are due in; the roof has none of its own, so it shares the last phase's */
export const windowOfPhase = (windows: readonly PhaseWindow[], phaseId: string): PhaseWindow => {
  const isRoof = phaseId === ROOF_PHASE_ID;
  const window = isRoof ? windows[windows.length - 1] : windows.find((each) => each.phaseId === phaseId);
  if (!window) throw new Error(`The project has no dates for the phase "${phaseId}"`);
  return window;
};

/** A big chore that only children do (no grown-up on it) waits for approval; without the heroes nothing does */
const needsApproval = (chore: ProjectChore, heroes: readonly PackHero[] | undefined): boolean => {
  const isBig = chore.difficulty >= APPROVAL_FROM;
  const canTell = isBig && heroes !== undefined;
  if (!canTell) return false;
  const bands = chore.assignee.map((heroId) => heroes.find((hero) => hero.id === heroId)?.band);
  const hasChild = bands.some((band) => CHILD_BANDS.has(band));
  const hasGrownUp = bands.includes("grownup");
  const isChildrenAlone = hasChild && !hasGrownUp;
  return isChildrenAlone;
};

const questOf = (input: ProjectTowerInput, chore: ProjectChore, floor: string): Achievement => {
  const window = windowOfPhase(input.windows, chore.phaseId);
  const isAwake = floor === GROUND_FLOOR;
  return {
    id: projectQuestId(input.projectId, chore.id),
    achievementName: chore.name,
    categoryId: "",
    ...(chore.beastId ? { beastId: chore.beastId } : {}),
    subAchievementIds: [],
    requiresApproval: needsApproval(chore, input.heroes),
    bonusAchievement: false,
    type: chore.assignee.length > 1 ? "collaborate" : "individual",
    assignee: [...chore.assignee],
    startsOn: projectStartsOn(window.opensOn),
    endsOn: "",
    dueByTime: PROJECT_DUE_TIME,
    basicSchedule: "once",
    scheduleType: "basic",
    showDailyUntilComplete: false,
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    difficulty: chore.difficulty,
    ...(chore.minutes !== undefined ? { estimatedMinutes: chore.minutes } : {}),
    ...rewardsFor(chore.difficulty),
    adventureType: "beast",
    project: {
      projectId: input.projectId,
      floor,
      dueOn: window.dueOn,
      ...(isAwake ? { wokenAt: input.now.toISOString() } : {}),
    },
  };
};

/** Every chore of the input as its quest, in the list's order; `floorOf` names the tower floor of a phase */
export const questsForProject = (input: ProjectTowerInput, floorOf: (phaseId: string) => string): Achievement[] =>
  input.chores.map((chore) => questOf(input, chore, floorOf(chore.phaseId)));
