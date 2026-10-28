/**
 * A project run never reuses the id of an earlier run: an abandoned run's paid log entries still name its quest ids, and
 * a restart that took the same ids would read its first floor as cleared at once. Pure.
 */
import { freshProjectId, isProjectQuestId } from "@/lib/services/projects/projectIds";

describe("freshProjectId", () => {
  const ID = "spring-cleaning-2027-04-03";

  it("keeps the id when no run holds it", () => {
    expect(freshProjectId(ID, [])).toBe(ID);
    expect(freshProjectId(ID, ["moving-out-2027-04-03", "spring-cleaning-2027-03-01"])).toBe(ID);
  });

  it("suffixes ~2 when a run holds it, then ~3, and so on", () => {
    expect(freshProjectId(ID, [ID])).toBe(`${ID}~2`);
    expect(freshProjectId(ID, [ID, `${ID}~2`])).toBe(`${ID}~3`);
    expect(freshProjectId(ID, [`${ID}~2`, ID, `${ID}~3`])).toBe(`${ID}~4`);
  });

  it("takes the first free number, even when a later one is held", () => {
    expect(freshProjectId(ID, [ID, `${ID}~3`])).toBe(`${ID}~2`);
  });

  it("reads any list of ids, a set included", () => {
    expect(freshProjectId(ID, new Set([ID]))).toBe(`${ID}~2`);
  });

  it("makes ids a project quest can still be told by", () => {
    expect(isProjectQuestId(`pq-${freshProjectId(ID, [ID])}-sort`)).toBe(true);
  });
});
