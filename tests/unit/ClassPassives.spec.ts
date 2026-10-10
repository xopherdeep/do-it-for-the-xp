import {
  bonusGp,
  canonicalClassName,
  classLevelsOf,
  classPassive,
  classRequirementLabel,
  discountedMp,
  isClassUnlocked,
  rewardsWithPassive,
  winRegen,
} from "@/lib/services/stats/ClassPassives";

/** Section C of docs/Items-And-Classes-Contract.md, one row per class, on the pure table. */
describe("classPassive", () => {
  const none = classPassive("default");

  it("gives an unknown or missing class the no-trick table", () => {
    expect(none).toMatchObject({
      braceFactor: 0.5,
      mpDiscount: 0,
      mpRegenOnWin: 0,
      gpBonus: 0,
      runChance: null,
      cooldownMinutesBonus: 0,
      apBonusOnWin: 0,
      hpRegenOnWin: 0,
      skipFirstStrike: false,
    });
    expect(classPassive(undefined)).toEqual(none);
    expect(classPassive("Bard")).toEqual(none);
    expect(none.blurb.length).toBeGreaterThan(0);
  });

  it("Warrior braces like a wall: a quarter of the strike, nothing else changes", () => {
    expect(classPassive("Warrior")).toEqual({ ...none, braceFactor: 0.25, blurb: expect.any(String) });
  });

  it("Mage pays 25% less MP and wins restore 10% MP", () => {
    expect(classPassive("Mage")).toEqual({ ...none, mpDiscount: 0.25, mpRegenOnWin: 0.1, blurb: expect.any(String) });
  });

  it("Thief loots +25% GP and runs from monsters 90% of the time", () => {
    expect(classPassive("Thief")).toEqual({ ...none, gpBonus: 0.25, runChance: 0.9, blurb: expect.any(String) });
  });

  it("Monk earns +1 minute per chore and +1 AP per win", () => {
    expect(classPassive("Monk")).toEqual({ ...none, cooldownMinutesBonus: 1, apBonusOnWin: 1, blurb: expect.any(String) });
  });

  it("Paladin keeps the Warrior's brace and heals 10% HP on a win", () => {
    expect(classPassive("Paladin")).toEqual({ ...none, braceFactor: 0.25, hpRegenOnWin: 0.1, blurb: expect.any(String) });
  });

  it("Ninja keeps the Thief's run and loot and skips the beast's first strike", () => {
    expect(classPassive("Ninja")).toEqual({
      ...none,
      gpBonus: 0.25,
      runChance: 0.9,
      skipFirstStrike: true,
      blurb: expect.any(String),
    });
  });

  it("Sage doubles the Mage's discount and adds the Monk's minute", () => {
    expect(classPassive("Sage")).toEqual({
      ...none,
      mpDiscount: 0.5,
      mpRegenOnWin: 0.1,
      cooldownMinutesBonus: 1,
      blurb: expect.any(String),
    });
  });

  it("reads class names however a profile cased them", () => {
    expect(classPassive("warrior")).toEqual(classPassive("Warrior"));
    expect(classPassive(" MAGE ")).toEqual(classPassive("Mage"));
    expect(canonicalClassName("thief")).toBe("Thief");
    expect(canonicalClassName("Bard")).toBe("Bard");
  });
});

describe("discountedMp", () => {
  it("takes the class share off, rounding down", () => {
    expect(discountedMp(50, "Mage")).toBe(37);
    expect(discountedMp(50, "Sage")).toBe(25);
    expect(discountedMp(25, "Sage")).toBe(12);
    expect(discountedMp(50, "Warrior")).toBe(50);
    expect(discountedMp(50, undefined)).toBe(50);
  });

  it("keeps a free thing free and never goes negative", () => {
    expect(discountedMp(0, "Mage")).toBe(0);
    expect(discountedMp(-5, "Mage")).toBe(0);
    expect(discountedMp(NaN, "Sage")).toBe(0);
  });
});

describe("bonusGp", () => {
  it("adds the class loot share to whole coins", () => {
    expect(bonusGp(20, "Thief")).toBe(25);
    expect(bonusGp(3, "Ninja")).toBe(4);
    expect(bonusGp(20, "Warrior")).toBe(20);
    expect(bonusGp(0, "Thief")).toBe(0);
  });
});

describe("isClassUnlocked", () => {
  it("opens every tier-1 and unknown class", () => {
    expect(isClassUnlocked("Warrior", {})).toBe(true);
    expect(isClassUnlocked("Bard", {})).toBe(true);
    expect(isClassUnlocked(undefined, {})).toBe(true);
  });

  it("locks a tier-2 class until both parents reach their level", () => {
    expect(isClassUnlocked("Paladin", {})).toBe(false);
    expect(isClassUnlocked("Paladin", { Warrior: 10, Monk: 9 })).toBe(false);
    expect(isClassUnlocked("Paladin", { Warrior: 10, Monk: 10 })).toBe(true);
    expect(isClassUnlocked("Ninja", { Thief: 12, Warrior: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { Mage: 10, Monk: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { Mage: 10, Warrior: 10 })).toBe(false);
  });

  it("matches class levels a profile cased differently", () => {
    expect(isClassUnlocked("paladin", { warrior: 10, monk: 10 })).toBe(true);
  });

  it("prints the requirement as the picker shows it", () => {
    expect(classRequirementLabel("Paladin")).toBe("Warrior 10 + Monk 10");
    expect(classRequirementLabel("Ninja")).toBe("Thief 10 + Warrior 10");
    expect(classRequirementLabel("Sage")).toBe("Mage 10 + Monk 10");
    expect(classRequirementLabel("Warrior")).toBe("");
  });

  it("reads the levels off the hero's stats.classes", () => {
    expect(classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 3 }, Thief: undefined })).toEqual({
      Warrior: 10,
      Monk: 3,
      Thief: 0,
    });
    expect(classLevelsOf(undefined)).toEqual({});
  });
});

describe("rewardsWithPassive", () => {
  it("puts the loot bonus on GP and the Monk's AP on top, leaving XP alone", () => {
    const base = { xp: 100, gp: 40, ap: 1 };
    expect(rewardsWithPassive(base, classPassive("Thief"))).toEqual({ xp: 100, gp: 50, ap: 1 });
    expect(rewardsWithPassive(base, classPassive("Monk"))).toEqual({ xp: 100, gp: 40, ap: 2 });
    expect(rewardsWithPassive(base, classPassive("Warrior"))).toEqual(base);
  });

  it("gives a free fight's AP-only pay the Monk's extra point and no GP from nothing", () => {
    expect(rewardsWithPassive({ xp: 0, gp: 0, ap: 1 }, classPassive("Monk"))).toEqual({ xp: 0, gp: 0, ap: 2 });
    expect(rewardsWithPassive({ xp: 0, gp: 0, ap: 1 }, classPassive("Thief"))).toEqual({ xp: 0, gp: 0, ap: 1 });
  });
});

describe("winRegen", () => {
  it("restores the class share of max HP and MP, never past the max", () => {
    expect(winRegen(classPassive("Mage"), { now: 10, max: 50 }, { now: 20, max: 80 })).toEqual({ hp: 0, mp: 8 });
    expect(winRegen(classPassive("Paladin"), { now: 10, max: 50 }, { now: 20, max: 80 })).toEqual({ hp: 5, mp: 0 });
    expect(winRegen(classPassive("Sage"), { now: 10, max: 50 }, { now: 78, max: 80 })).toEqual({ hp: 0, mp: 2 });
    expect(winRegen(classPassive("Warrior"), { now: 1, max: 50 }, { now: 1, max: 80 })).toEqual({ hp: 0, mp: 0 });
  });

  it("gives at least one point when the share rounds to nothing and something is missing", () => {
    expect(winRegen(classPassive("Mage"), { now: 4, max: 4 }, { now: 1, max: 4 })).toEqual({ hp: 0, mp: 1 });
  });
});
