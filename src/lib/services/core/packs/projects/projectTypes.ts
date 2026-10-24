/**
 * Project types as data: a big real-life project (Spring Cleaning, Moving Out) is a list of phases, each with the
 * chores the family is suggested to do in it, and a finale boss chore. The builder turns a type into a tower (one
 * floor per phase, a roof for the finale); a type adds no engine work. Pure: no storage, no Vue.
 */
import type { MovingRoomId } from "../movingPack";
import type { PackBand } from "../packCommon";
import { MOVING_OUT } from "./movingOut";
import { SPRING_CLEANING } from "./springCleaning";

// The data files import only the types above, so there is no import cycle at run time.

export type ProjectTypeId = "spring-cleaning" | "moving-out";

/** One chore a type suggests; the Game Master ticks, renames, resizes and reassigns it before the build. */
export interface ProjectChoreSuggestion {
  /** Unique within the type */
  slug: string;
  name: string;
  /** The room kinds the chore needs (it is left out of a house without them), or the whole house */
  rooms: readonly MovingRoomId[] | "house";
  /** On the Fibonacci slider: 1, 2, 3, 5, 8 or 13 */
  difficulty: number;
  /** The band the chore is sized for, anyone, or the whole family together */
  who: PackBand | "any" | "team";
  /** One chore for each hero of the band, not one shared */
  perHero?: boolean;
  /** The id of the beast that carries the chore's checklist; absent leaves the pick to the chore library */
  beastId?: string;
  minutes?: number;
}

export interface ProjectPhase {
  id: string;
  name: string;
  /** The fraction of the project's days this phase takes; a type's shares sum to 1 */
  share: number;
  chores: readonly ProjectChoreSuggestion[];
}

export interface ProjectType {
  id: ProjectTypeId;
  name: string;
  towerName: string;
  /** The tower's element, for its look and music */
  element: string;
  /** The suggested length of the project, in days */
  defaultDays: number;
  phases: readonly ProjectPhase[];
  /** The final boss chore, on the tower's roof */
  finale: ProjectChoreSuggestion;
}

export const PROJECT_TYPES: Readonly<Record<ProjectTypeId, ProjectType>> = {
  "spring-cleaning": SPRING_CLEANING,
  "moving-out": MOVING_OUT,
};

export const projectTypeOf = (id: string): ProjectType | undefined =>
  Object.prototype.hasOwnProperty.call(PROJECT_TYPES, id) ? PROJECT_TYPES[id as ProjectTypeId] : undefined;
