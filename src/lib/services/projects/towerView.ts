/**
 * What the screens read off the running tower, kept out of them: which floor is the family's to clear now, which floors
 * read cleared (the temple's stairs climb from those), which cleared floors a hero was not yet told about, and whether
 * an end day can be asked for. Pure: the record, the quests and the quest log's entries go in; nothing is stored here.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import { phaseNameOf } from "./floorClock";
import { isFloorCleared } from "./projectProgress";
import type { ProjectFloor, ProjectRecord } from "./projectRecord";
import { ROOF_PHASE_ID } from "./projectSchedule";

const isAwakeAndOpen = (floor: ProjectFloor): boolean => Boolean(floor.wokenAt) && !floor.clearedAt;

const isNotCleared = (floor: ProjectFloor): boolean => !floor.clearedAt;

/**
 * The floor the family is on: the lowest one that is awake and not cleared (a higher floor woken by arriving early does
 * not take the place of an open one below it), else the lowest not cleared, else the top floor once all are.
 */
export const currentFloorOf = (project: ProjectRecord): ProjectFloor | undefined => {
  const { floors } = project;
  return floors.find(isAwakeAndOpen) ?? floors.find(isNotCleared) ?? floors[floors.length - 1];
};

export type FloorRowState = "cleared" | "open" | "asleep";

/** A floor in the tower sheet's list */
export interface FloorRow {
  floorKey: string;
  name: string;
  state: FloorRowState;
}

/** Cleared once settled (whatever its due day), open while awake, asleep until reached or the floor below clears */
const rowStateOf = (floor: ProjectFloor): FloorRowState => {
  if (floor.clearedAt) return "cleared";
  return floor.wokenAt ? "open" : "asleep";
};

/** Every floor of the tower, bottom to top, for the sheet's list */
export const floorRowsOf = (project: ProjectRecord): FloorRow[] =>
  project.floors.map((floor) => ({ floorKey: floor.floorKey, name: phaseNameOf(project.typeId, floor), state: rowStateOf(floor) }));

/** The keys of the floors whose chores were all paid, settled or not yet; a floor with every chore deleted reads cleared too */
export const clearedFloorKeys = (project: ProjectRecord, quests: readonly Achievement[], paid: readonly QuestLogEntry[]): string[] =>
  project.floors.filter((floor) => isFloorCleared(floor, quests, paid)).map((floor) => floor.floorKey);

export const hasSeenFloor = (floor: ProjectFloor, heroId: string): boolean => (floor.seenBy ?? []).includes(heroId);

const isToldAbout = (floor: ProjectFloor, heroId: string): boolean => {
  const isRoof = floor.phaseId === ROOF_PHASE_ID;
  return Boolean(floor.clearedAt) && !isRoof && !hasSeenFloor(floor, heroId);
};

/**
 * The cleared floors a hero has not been told about, lowest first. The roof is left out: its clear is the project's
 * finish, which the reward and the credits tell.
 */
export const unseenClearedFloors = (project: ProjectRecord, heroId: string): ProjectFloor[] =>
  project.floors.filter((floor) => isToldAbout(floor, heroId));

/** The record with the hero among those told about the floor; the same record when they already are, or the floor is not there */
export const withFloorSeen = (project: ProjectRecord, floorKey: string, heroId: string): ProjectRecord => {
  const floor = project.floors.find((each) => each.floorKey === floorKey);
  const hasNothingToAdd = !floor || hasSeenFloor(floor, heroId);
  if (hasNothingToAdd) return project;
  const told: ProjectFloor = { ...floor, seenBy: [...(floor.seenBy ?? []), heroId] };
  return { ...project, floors: project.floors.map((each) => (each.floorKey === floorKey ? told : each)) };
};

/** Why a new end day cannot be asked for: not a real YYYY-MM-DD day ("invalid"), or before today ("past"); null when it can */
export const endDateProblem = (newEndOn: string, today: string): "invalid" | "past" | null => {
  const isRealDay = /^\d{4}-\d{2}-\d{2}$/.test(newEndOn) && dateKey(parseLocalDate(newEndOn)) === newEndOn;
  if (!isRealDay) return "invalid";
  return newEndOn < today ? "past" : null;
};
