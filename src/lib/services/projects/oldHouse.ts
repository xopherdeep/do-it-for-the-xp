/**
 * The Old House: the Moving Day temple the Moving House pack used to build from the family's home, and when Moving Out
 * has taken its place. Pure: the Hometown plaza asks `showsOldHouse`, the project service retires the record by id.
 */
import type { ProjectRecord } from "./projectRecord";

/** The same every time, so loading the pack again replaced this temple and nothing else. The `gen-` prefix is what makes the screens know a temple that is not one of the nine. */
export const OLD_HOUSE_ID = "gen-move-house";

/** The project the plaza's tower stands for: the running one, else the newest cleared run (towerSpot.standingProjectOf) */
type StandingProject = Pick<ProjectRecord, "typeId" | "status">;

/**
 * Whether the plaza still has an Old House. It needs its temple record, and it steps aside once a Moving Out tower
 * stands (running, or cleared and kept as the trophy). A Moving Out run that was abandoned brings it back, but only while
 * the record is still there: retiring removes it, and a record that is gone is never rebuilt.
 */
export const showsOldHouse = (hasRecord: boolean, standing: StandingProject | null): boolean => {
  const isMovingOut = standing?.typeId === "moving-out" && standing.status !== "abandoned";
  return hasRecord && !isMovingOut;
};
