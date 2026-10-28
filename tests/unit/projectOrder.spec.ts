/**
 * The one rule for "the newest" of the family's projects. The trophy list, the portal's reveal, markSeen and
 * markRewardGiven (projectProgress.ts, projectFinish.ts) and the project store (ProjectDb.ts) all sort with it, so they
 * can never pick different runs. Pure: records go in.
 */
import { newestClearedFirst, newestFirstBy } from "@/lib/services/projects/projectOrder";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";

const runOf = (id: string, extra: Partial<ProjectRecord> = {}): ProjectRecord =>
  ({ id, typeId: "spring-cleaning", status: "cleared", startOn: "2027-04-03", endOn: "2027-04-10", ...extra }) as ProjectRecord;

describe("newestFirstBy", () => {
  const byStart = newestFirstBy((record) => record.startOn);

  it("puts the record with the latest stamp first", () => {
    const runs = [runOf("a", { startOn: "2027-01-01" }), runOf("c", { startOn: "2027-06-01" }), runOf("b", { startOn: "2027-03-01" })];
    expect([...runs].sort(byStart).map((run) => run.id)).toEqual(["c", "b", "a"]);
  });

  it("gives a tie to the later id, whatever order the records come in", () => {
    const runs = [runOf("run-a"), runOf("run-c"), runOf("run-b")];
    expect([...runs].sort(byStart).map((run) => run.id)).toEqual(["run-c", "run-b", "run-a"]);
    expect([...runs].reverse().sort(byStart).map((run) => run.id)).toEqual(["run-c", "run-b", "run-a"]);
  });

  it("is zero only for the same stamp and the same id", () => {
    expect(byStart(runOf("same"), runOf("same"))).toBe(0);
    expect(byStart(runOf("a"), runOf("b"))).toBeGreaterThan(0);
    expect(byStart(runOf("b"), runOf("a"))).toBeLessThan(0);
  });
});

describe("newestClearedFirst", () => {
  it("orders by when the run was cleared, the one cleared last first", () => {
    const runs = [runOf("a", { clearedAt: "2026-04-08T20:00:00.000Z" }), runOf("b", { clearedAt: "2027-04-08T20:00:00.000Z" })];
    expect([...runs].sort(newestClearedFirst).map((run) => run.id)).toEqual(["b", "a"]);
  });

  it("keeps a run with no clearing time behind every dated one, and a tie to the later id", () => {
    const stamp = "2027-04-08T20:00:00.000Z";
    const runs = [runOf("undated"), runOf("tie-a", { clearedAt: stamp }), runOf("tie-b", { clearedAt: stamp })];
    expect([...runs].sort(newestClearedFirst).map((run) => run.id)).toEqual(["tie-b", "tie-a", "undated"]);
  });
});
