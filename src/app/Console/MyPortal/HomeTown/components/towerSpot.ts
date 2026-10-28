/**
 * The tower's spot on the Hometown plaza (HomeTown.vue): the name under the building, the cue under the name and the
 * voxel scene that draws it. Pure: the project (the running one, or the newest cleared run once none runs: the trophy)
 * and the voice go in; the screen only places what comes out.
 */
import { projectTowerSceneId } from "@/components/organisms/BuildingModel/voxel/buildingShapes";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { phaseNameOf } from "@/lib/services/projects/floorClock";
import { newestCleared } from "@/lib/services/projects/projectProgress";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { ROOF_PHASE_ID } from "@/lib/services/projects/projectSchedule";
import { currentFloorOf } from "@/lib/services/projects/towerView";

export interface TowerSpot {
  /** The building scene: the floor count and the element's colours (buildingShapes.projectTowerSceneId) */
  sceneId: string;
  /** The tower's name, "The Spring Spire" */
  label: string;
  /** Where the family is on it, "Now on 2F: Deep Clean"; empty for a record with no floors */
  cue: string;
}

const FALLBACK_ELEMENT = "wind";

/** Where the family is on a running tower, or the trophy's cue once it is cleared (a cleared tower has no floor to be on) */
const cueOf = (project: ProjectRecord, voice: Voice): string => {
  const isCleared = project.status === "cleared";
  if (isCleared) return copyFor("projectFinish.spot.trophy", voice);
  const floor = currentFloorOf(project);
  return floor ? copyFor("projectTower.spot.cue", voice, { floor: floor.floorKey, phase: phaseNameOf(project.typeId, floor, voice) }) : "";
};

export const towerSpotOf = (project: ProjectRecord, voice: Voice): TowerSpot => {
  const type = projectTypeOf(project.typeId);
  const phaseCount = project.floors.filter((floor) => floor.phaseId !== ROOF_PHASE_ID).length;
  return {
    sceneId: projectTowerSceneId(phaseCount, type?.element ?? FALLBACK_ELEMENT),
    label: type?.towerName ?? copyFor("projectTower.spot.fallbackName", voice),
    cue: cueOf(project, voice),
  };
};

/**
 * The project the plaza's tower stands for: the running one, else the newest cleared run (its trophy stays in town as a
 * monument), else none. `cleared` is the family's cleared runs, in any order.
 */
export const standingProjectOf = (active: ProjectRecord | null, cleared: readonly ProjectRecord[]): ProjectRecord | null =>
  active ?? newestCleared(cleared);
