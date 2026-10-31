import { awardedDoDontPoints, doDontPoints } from "@/lib/services/dosDonts/doDontPoints";
import { rewardsFor } from "@/lib/services/core/packs/packCommon";
import { DO_DONT_GP_PER_EFFORT, doDontFromSeed } from "@/lib/services/core/packs/packSeeds";
import type { DoDontSeed } from "@/lib/services/core/packs/packSeeds";

// packCommon takes only the backup version from the backup service: stand it in so this spec does not load every store
jest.mock("@/lib/services/core/BackupService", () => ({ __esModule: true, BACKUP_VERSION: 1 }));

/** The Add Do form's Fibonacci effort scale */
const EFFORT_STEPS = [1, 2, 3, 5, 8, 13];

describe("the points a Do or Don't pays", () => {
  it("pays a Do the shared chore rate: 100 XP, 15 GP and 1 AP for each point of effort", () => {
    expect(doDontPoints(1, "do")).toEqual({ xp: 100, gp: 15, ap: 1 });
    expect(doDontPoints(8, "do")).toEqual({ xp: 800, gp: 120, ap: 8 });
  });

  it("takes the same amounts away for a Don't", () => {
    expect(doDontPoints(3, "dont")).toEqual({ xp: -300, gp: -45, ap: -3 });
  });

  it.each(EFFORT_STEPS)("follows the chore curve at effort %i, with every value negated for a Don't", (effort) => {
    const chore = rewardsFor(effort);
    expect(doDontPoints(effort, "do")).toEqual(chore);
    expect(doDontPoints(effort, "dont")).toEqual({ xp: -chore.xp, gp: -chore.gp, ap: -chore.ap });
  });

  it("is the 15 GP a point the seeds pay, and no longer the form's old 20", () => {
    expect(DO_DONT_GP_PER_EFFORT).toBe(15);
    expect(DO_DONT_GP_PER_EFFORT).toBe(doDontPoints(1, "do").gp);
    expect(doDontPoints(1, "do").gp).not.toBe(20);
  });
});

describe("the points a saved Do or Don't keeps", () => {
  it("prices only the kinds of points it awards and leaves the others at 0", () => {
    expect(awardedDoDontPoints(8, "do", { xp: false, gp: true, ap: false })).toEqual({ xp: 0, gp: 120, ap: 0 });
  });

  it("takes every kind away for a Don't that awards them all", () => {
    expect(awardedDoDontPoints(3, "dont", { xp: true, gp: true, ap: true })).toEqual({ xp: -300, gp: -45, ap: -3 });
  });

  it("keeps each kind of points on its own switch", () => {
    expect(awardedDoDontPoints(5, "do", { xp: true, gp: false, ap: false })).toEqual({ xp: 500, gp: 0, ap: 0 });
    expect(awardedDoDontPoints(5, "dont", { xp: false, gp: false, ap: true })).toEqual({ xp: 0, gp: 0, ap: -5 });
  });
});

describe("a house rule written as a seed", () => {
  const seed = (type: DoDontSeed["type"]): DoDontSeed => ({ id: `rule-${type}`, type, whatFor: "Made the bed", difficulty: 3 });

  it("keeps its gold-only points, a do paying the rate and a don't taking it away", () => {
    expect(doDontFromSeed(seed("do")).points).toEqual({ xp: 0, gp: 45, ap: 0 });
    expect(doDontFromSeed(seed("dont")).points).toEqual({ xp: 0, gp: -45, ap: 0 });
    expect(doDontFromSeed(seed("do")).awardPoints).toEqual({ xp: false, gp: true, ap: false });
  });

  it("keeps the same points as a rule saved from the Add Do form", () => {
    const goldOnly = { xp: false, gp: true, ap: false };
    expect(doDontFromSeed(seed("do")).points).toEqual(awardedDoDontPoints(3, "do", goldOnly));
    expect(doDontFromSeed(seed("dont")).points).toEqual(awardedDoDontPoints(3, "dont", goldOnly));
  });
});
