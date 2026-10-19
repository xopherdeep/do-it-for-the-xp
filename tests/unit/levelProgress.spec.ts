import { levelProgress } from "@/lib/services/stats/levelProgress";
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";

describe("levelProgress, the one XP bar maths for the HUD and My Profile", () => {
  it("counts the XP earned inside the current level, not the running total", () => {
    // The GH#148 hero: level 2 starts at 282 XP and level 3 at 519, so 450 XP total is 168 of 237 into the level
    const progress = levelProgress(2, 450);
    expect(progress.inLevel).toBe(168);
    expect(progress.needed).toBe(237);
    expect(progress.percent).toBe(71);
    expect(progress.fraction).toBeCloseTo(168 / 237, 5);
  });

  it("does not read total XP over the next threshold (the old My Profile said 87%)", () => {
    const oldProfilePercent = Math.round((450 / getXpForLevel(3)) * 100);
    expect(oldProfilePercent).toBe(87);
    expect(levelProgress(2, 450).percent).not.toBe(oldProfilePercent);
  });

  it("starts a fresh level at an empty bar", () => {
    const atTheDoor = levelProgress(3, getXpForLevel(3));
    expect(atTheDoor.inLevel).toBe(0);
    expect(atTheDoor.fraction).toBe(0);
    expect(atTheDoor.percent).toBe(0);
  });

  it("starts level 1 from zero XP", () => {
    expect(levelProgress(1, 0)).toMatchObject({ level: 1, inLevel: 0, needed: getXpForLevel(2), percent: 0 });
    expect(levelProgress(1, 50)).toMatchObject({ inLevel: 50, needed: 282 });
  });

  it("fills the bar and no further when the XP is past the next threshold", () => {
    const pastIt = levelProgress(2, getXpForLevel(3) + 40);
    expect(pastIt.fraction).toBe(1);
    expect(pastIt.percent).toBe(100);
  });

  it("never goes negative when the XP is below the level floor", () => {
    const behind = levelProgress(5, 10);
    expect(behind.inLevel).toBe(0);
    expect(behind.fraction).toBe(0);
  });

  it("copes with a profile missing its level or XP", () => {
    expect(levelProgress(Number.NaN, Number.NaN)).toMatchObject({ level: 1, inLevel: 0, percent: 0 });
    expect(levelProgress(0, 10)).toMatchObject({ level: 1, inLevel: 10 });
    expect(levelProgress(-3, 10).level).toBe(1);
  });

  it("always needs at least 1 XP, so a bar never divides by zero", () => {
    for (const level of [1, 2, 10, 50, 100, 101]) expect(levelProgress(level, 0).needed).toBeGreaterThanOrEqual(1);
  });

  it("gives a whole percent that is the fraction rounded, so a bar and its label agree", () => {
    for (const [level, total] of [[1, 0], [1, 120], [1, 281], [2, 282], [2, 450], [3, 519], [3, 5000]]) {
      const progress = levelProgress(level, total);
      expect(progress.percent).toBe(Math.round(progress.fraction * 100));
    }
  });
});
