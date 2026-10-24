/**
 * The per-floor early-finish bonus: x1 on the due day up to x2 at the halfway mark of the floor's window, paid as a
 * pool of the floor's XP and GP and split evenly among the heroes who worked it. Pure math.
 */
import { floorBonusPool, floorMultiplier, splitFloorBonus } from "@/lib/services/projects/floorBonus";

describe("floorMultiplier", () => {
  const fourDays = { phaseId: "p1", opensOn: "2027-04-03", dueOn: "2027-04-06" };

  it("is 1 on the due day", () => {
    expect(floorMultiplier(fourDays, "2027-04-06")).toBe(1);
  });

  it("climbs by half a phase's span: 1.5 a day early on a four day floor", () => {
    expect(floorMultiplier(fourDays, "2027-04-05")).toBe(1.5);
  });

  it("is 2 at half the window early, and stays 2 earlier", () => {
    expect(floorMultiplier(fourDays, "2027-04-04")).toBe(2);
    expect(floorMultiplier(fourDays, "2027-04-03")).toBe(2);
    expect(floorMultiplier(fourDays, "2027-03-20")).toBe(2);
  });

  it("is 1 when late", () => {
    expect(floorMultiplier(fourDays, "2027-04-08")).toBe(1);
  });

  it("rounds to one decimal", () => {
    // 7 days: 1 day early is 1 / 3.5 = 0.2857 -> 1.3; 2 days early is 0.5714 -> 1.6
    const week = { phaseId: "p2", opensOn: "2027-04-07", dueOn: "2027-04-13" };
    expect(floorMultiplier(week, "2027-04-12")).toBe(1.3);
    expect(floorMultiplier(week, "2027-04-11")).toBe(1.6);
  });

  it("pays a one day floor 2 when it is cleared a day early", () => {
    const oneDay = { phaseId: "p4", opensOn: "2027-04-16", dueOn: "2027-04-16" };
    expect(floorMultiplier(oneDay, "2027-04-16")).toBe(1);
    expect(floorMultiplier(oneDay, "2027-04-15")).toBe(2);
  });

  it("is not thrown by the daylight saving change", () => {
    const spring = { phaseId: "p1", opensOn: "2027-03-12", dueOn: "2027-03-15" };
    expect(floorMultiplier(spring, "2027-03-14")).toBe(1.5);
  });
});

describe("floorBonusPool", () => {
  it("pays the multiplier above 1 on the floor's XP and GP", () => {
    const quests = [
      { xp: 300, gp: 30 },
      { xp: 500, gp: 50 },
    ];
    expect(floorBonusPool(quests, 1.5)).toEqual({ xp: 400, gp: 40 });
  });

  it("floors XP and GP separately", () => {
    expect(floorBonusPool([{ xp: 101, gp: 11 }], 1.5)).toEqual({ xp: 50, gp: 5 });
  });

  it("does not lose a point to float error", () => {
    // (1.2 - 1) * 100 is 19.999999999999996 in floats
    expect(floorBonusPool([{ xp: 100, gp: 10 }], 1.2)).toEqual({ xp: 20, gp: 2 });
  });

  it("pays nothing at 1 or on no quests", () => {
    expect(floorBonusPool([{ xp: 300, gp: 30 }], 1)).toEqual({ xp: 0, gp: 0 });
    expect(floorBonusPool([], 2)).toEqual({ xp: 0, gp: 0 });
  });

  it("never takes points away for a multiplier under 1", () => {
    expect(floorBonusPool([{ xp: 300, gp: 30 }], 0.5)).toEqual({ xp: 0, gp: 0 });
  });
});

describe("splitFloorBonus", () => {
  it("splits evenly and gives the remainder to the last worker", () => {
    expect(splitFloorBonus({ xp: 400, gp: 41 }, ["a", "b", "c"], "b")).toEqual({
      a: { xp: 133, gp: 13 },
      b: { xp: 134, gp: 15 },
      c: { xp: 133, gp: 13 },
    });
  });

  it("pays a lone worker the whole pool", () => {
    expect(splitFloorBonus({ xp: 400, gp: 41 }, ["a"], "a")).toEqual({ a: { xp: 400, gp: 41 } });
  });

  it("pays out exactly the pool", () => {
    const split = splitFloorBonus({ xp: 1000, gp: 97 }, ["a", "b", "c", "d", "e", "f"], "e");
    const total = Object.values(split).reduce((sum, share) => ({ xp: sum.xp + share.xp, gp: sum.gp + share.gp }), { xp: 0, gp: 0 });
    expect(total).toEqual({ xp: 1000, gp: 97 });
  });

  it("returns nothing when no one worked the floor", () => {
    expect(splitFloorBonus({ xp: 400, gp: 41 }, [], "b")).toEqual({});
  });

  it("gives the remainder to the first worker when the last worker is not on the list", () => {
    expect(splitFloorBonus({ xp: 400, gp: 41 }, ["a", "b", "c"], "zed")).toEqual({
      a: { xp: 134, gp: 15 },
      b: { xp: 133, gp: 13 },
      c: { xp: 133, gp: 13 },
    });
  });

  it("counts a hero listed twice once", () => {
    expect(splitFloorBonus({ xp: 400, gp: 40 }, ["a", "b", "a"], "a")).toEqual({
      a: { xp: 200, gp: 20 },
      b: { xp: 200, gp: 20 },
    });
  });
});
