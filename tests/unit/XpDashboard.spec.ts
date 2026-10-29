import { readFileSync } from "fs";
import { join } from "path";
import { approvalsTotal, emptyTileStats, tileStatsOf, wholeCount } from "@/app/Admin/XpDashboard/dashboardTiles";

const dashboardDir = join(__dirname, "../../src/app/Admin/XpDashboard");

describe("dashboard tile counts", () => {
  it("reads 0 on every tile for a family with nothing yet", () => {
    const fresh = { users: 0, achievements: 0, beasts: 0, dos: 0, donts: 0, items: 0 };
    expect(tileStatsOf(fresh)).toEqual(emptyTileStats());
    expect(tileStatsOf(fresh).items).toBe(0);
  });

  it("reads 0 when the stats have not loaded", () => {
    expect(tileStatsOf(undefined)).toEqual(emptyTileStats());
    expect(tileStatsOf(null)).toEqual(emptyTileStats());
    expect(tileStatsOf({})).toEqual(emptyTileStats());
  });

  it("passes the real counts through and ignores the stats the tiles do not show", () => {
    const system = { users: 3, achievements: 12, beasts: 7, dos: 2, donts: 1, items: 9, abilities: 4, temples: 11, shops: 5 };
    expect(tileStatsOf(system)).toEqual({ users: 3, achievements: 12, beasts: 7, dos: 2, donts: 1, items: 9 });
  });

  it("turns anything that is not a count into 0 or a whole number", () => {
    expect(wholeCount(4.8)).toBe(4);
    expect(wholeCount("6")).toBe(6);
    expect(wholeCount(-2)).toBe(0);
    expect(wholeCount(Number.NaN)).toBe(0);
    expect(wholeCount("many")).toBe(0);
    expect(wholeCount(undefined)).toBe(0);
    expect(wholeCount(null)).toBe(0);
  });

  it("adds the quests and the purchases waiting on the Game Master", () => {
    expect(approvalsTotal(2, 3)).toBe(5);
    expect(approvalsTotal(0, 0)).toBe(0);
    expect(approvalsTotal(undefined, 4)).toBe(4);
  });

  it("adds the kids' creations waiting on a verdict, and reads the same without them", () => {
    expect(approvalsTotal(2, 1, 3)).toBe(6);
    expect(approvalsTotal(2, 1)).toBe(3);
    expect(approvalsTotal(0, 0, 2)).toBe(2);
    expect(approvalsTotal(1, 1, undefined)).toBe(2);
    expect(approvalsTotal(1, 1, "many")).toBe(2);
  });

  it("counts a family reward that is earned and not yet handed over as one more", () => {
    expect(approvalsTotal(2, 3, 0, 1)).toBe(6);
    expect(approvalsTotal(0, 0, 0, 1)).toBe(1);
    expect(approvalsTotal(2, 3, 0, 0)).toBe(5);
    expect(approvalsTotal(2, 3, 0, undefined)).toBe(5);
  });
});

describe("dashboard page", () => {
  const vue = readFileSync(join(dashboardDir, "XpDashboard.vue"), "utf8");
  const script = readFileSync(join(dashboardDir, "XpDashboard.ts"), "utf8");

  it("no longer shows a made-up Items figure", () => {
    expect(vue).not.toMatch(/\|\|\s*80/);
    expect(vue).toContain(':value="stats.items || 0"');
    expect(script).not.toContain("This would come from actual data");
  });

  it("counts the waiting creations and family reward on the Approvals tile with the chores and the purchases", () => {
    expect(script).toContain('loadCreationRows(["proposed"])');
    expect(script).toContain("approvalsTotal(chores, rewards, creations, familyReward)");
  });

  it("lays the tiles out in two columns on a phone", () => {
    const scss = readFileSync(join(dashboardDir, "_XpDashboard.scss"), "utf8");
    expect(vue).toContain("dashboard-tiles");
    expect(scss).toMatch(/@media \(max-width: 5\d\dpx\)/);
    expect(scss).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  });
});
