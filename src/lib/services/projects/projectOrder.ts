/**
 * The one rule for "the newest" of the family's projects. The trophy list and the portal's reveal (projectFinish.ts),
 * markSeen and markRewardGiven (projectProgress.ts) and the project store's picks (ProjectDb.ts) all sort with it, so
 * none of them can ever pick a different run than the others. Pure, and free of imports but a type: the project store
 * uses it, and the store sits below the services (a cycle through the packs would otherwise close).
 */
import type { ProjectRecord } from "./projectRecord";

/** Negative, zero or positive by plain character order (the stamps are ISO text, which sorts as time does) */
const compareText = (a: string, b: string): number => Number(a > b) - Number(a < b);

/** Sorts records newest first by a stamp; a tie goes to the later id, so the answer never depends on the order they were stored in */
export const newestFirstBy =
  (stamp: (record: ProjectRecord) => string) =>
  (a: ProjectRecord, b: ProjectRecord): number =>
    compareText(stamp(b), stamp(a)) || compareText(b.id, a.id);

/** Sorts records by when they were cleared, the one cleared last first (a run with no clearing time comes last) */
export const newestClearedFirst = newestFirstBy((record) => record.clearedAt ?? "");
