/**
 * The floor clock in a project tower's header: how long the floor the hero stands on has, and the offer to clear it early
 * for a bigger bonus. Pure: a floor of the record and the day go in, a line in the hero's voice comes out. A floor that
 * was cleared reads cleared whatever its dates say (an extension from today can leave a floor cleared early with its due
 * day still ahead); the offer is floorBonus's multiplier for clearing today, and is gone at x1.
 */
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/services/core/packs/packCommon";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { floorMultiplier } from "./floorBonus";
import type { ProjectFloor, ProjectRecord } from "./projectRecord";
import { ROOF_PHASE_ID, daysBetween } from "./projectSchedule";

/** The roof is no phase, so it has no phase name of its own */
export const ROOF_NAME = "The Roof";

/** The days away that still read as a weekday ("Sat"); past it the date is clearer ("Apr 10") */
const WEEKDAY_REACH = 6;

/** What a floor is called: its phase's name ("Deep Clean"), the roof's, or its key ("2F") when the type or the phase is gone */
export const phaseNameOf = (typeId: string, floor: Pick<ProjectFloor, "floorKey" | "phaseId">): string => {
  const isRoof = floor.phaseId === ROOF_PHASE_ID;
  if (isRoof) return ROOF_NAME;
  const phase = projectTypeOf(typeId)?.phases.find((each) => each.id === floor.phaseId);
  return phase?.name ?? floor.floorKey;
};

export type FloorClockState = "cleared" | "late" | "today" | "open";

/** Days from `today` to the floor's due day: negative once it is late */
const daysLeftOf = (floor: ProjectFloor, today: string): number => daysBetween(today, floor.window.dueOn);

export const floorClockState = (floor: ProjectFloor, today: string): FloorClockState => {
  const isCleared = Boolean(floor.clearedAt);
  if (isCleared) return "cleared";
  const daysLeft = daysLeftOf(floor, today);
  const isLate = daysLeft < 0;
  if (isLate) return "late";
  return daysLeft === 0 ? "today" : "open";
};

/** The line of each state that does not count days */
const STATE_LINES = {
  cleared: "projectTower.clock.cleared",
  late: "projectTower.clock.late",
  today: "projectTower.clock.today",
} as const;

/** The due day as the clock says it: the weekday while it is near, the date when it is not */
const dueDayText = (floor: ProjectFloor, daysLeft: number): string => {
  const due = parseLocalDate(floor.window.dueOn);
  return format(due, daysLeft <= WEEKDAY_REACH ? "EEE" : "MMM d");
};

/** "Deep Clean: due Sat, 3 days left", "Deep Clean: due today", "Deep Clean: late", "Deep Clean: cleared" */
export const floorClockLine = (floor: ProjectFloor, phaseName: string, today: string, voice: Voice): string => {
  const state = floorClockState(floor, today);
  const words = { phase: phaseName };
  const countsDays = state === "open";
  if (!countsDays) return copyFor(STATE_LINES[state], voice, words);
  const daysLeft = daysLeftOf(floor, today);
  const key = daysLeft === 1 ? "projectTower.clock.dayLeft" : "projectTower.clock.daysLeft";
  return copyFor(key, voice, { ...words, day: dueDayText(floor, daysLeft), days: daysLeft });
};

/** "Clear this floor today for ×1.6"; null when the floor is cleared or clearing it today would earn no more than x1 */
export const bonusOfferLine = (floor: ProjectFloor, today: string, voice: Voice): string | null => {
  const isCleared = Boolean(floor.clearedAt);
  if (isCleared) return null;
  const multiplier = floorMultiplier(floor.window, today);
  const hasNoBonus = multiplier <= 1;
  if (hasNoBonus) return null;
  return copyFor("projectTower.clock.offer", voice, { multiplier: multiplier.toFixed(1) });
};

/** What the header shows for the floor the hero stands on */
export interface FloorClockView {
  floorKey: string;
  name: string;
  line: string;
  offer: string | null;
  state: FloorClockState;
}

/** The clock of the project's floor `floorKey`; null when the project has no such floor */
export const floorClockView = (project: ProjectRecord, floorKey: string, today: string, voice: Voice): FloorClockView | null => {
  const floor = project.floors.find((each) => each.floorKey === floorKey);
  const hasNoFloor = !floor;
  if (hasNoFloor) return null;
  const name = phaseNameOf(project.typeId, floor);
  return {
    floorKey,
    name,
    line: floorClockLine(floor, name, today, voice),
    offer: bonusOfferLine(floor, today, voice),
    state: floorClockState(floor, today),
  };
};
