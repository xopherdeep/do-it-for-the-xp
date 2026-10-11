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

  // Tier 2: the parent's passive plus one nudge, made only of existing fields (no engine change)
  it("Knight keeps the Warrior's wall and heals 5% HP on a win", () => {
    expect(classPassive("Knight")).toEqual({ ...none, braceFactor: 0.25, hpRegenOnWin: 0.05, blurb: "Braces like a wall, and every win mends a little." });
  });

  it("Berserker braces a little less than a Warrior but heals 15% HP on a win", () => {
    expect(classPassive("Berserker")).toEqual({ ...none, braceFactor: 0.35, hpRegenOnWin: 0.15, blurb: "Shrugs off the hit; wins heal a chunk." });
  });

  it("White Mage keeps the Mage's 25% discount, gets 20% MP back and heals 10% HP on a win", () => {
    expect(classPassive("White Mage")).toEqual({
      ...none,
      mpDiscount: 0.25,
      mpRegenOnWin: 0.2,
      hpRegenOnWin: 0.1,
      blurb: "Cheap casts, MP back on wins, and a little HP too.",
    });
  });

  it("Black Mage pays 35% less MP and gets 10% MP back on a win", () => {
    expect(classPassive("Black Mage")).toEqual({ ...none, mpDiscount: 0.35, mpRegenOnWin: 0.1, blurb: "A deep MP discount; spells come easy." });
  });

  it("Assassin runs from monsters 90% of the time and loots +30% GP", () => {
    expect(classPassive("Assassin")).toEqual({
      ...none,
      runChance: 0.9,
      gpBonus: 0.3,
      blurb: "Slips away from almost anything, and pockets extra GP.",
    });
  });

  it("Ranger loots +25% GP and earns +1 minute per chore", () => {
    expect(classPassive("Ranger")).toEqual({
      ...none,
      gpBonus: 0.25,
      cooldownMinutesBonus: 1,
      blurb: "Extra GP from every quest, and a spare minute on the clock.",
    });
  });

  it("Martial Artist earns +2 minutes per chore and +1 AP per win", () => {
    expect(classPassive("Martial Artist")).toEqual({
      ...none,
      cooldownMinutesBonus: 2,
      apBonusOnWin: 1,
      blurb: "Two extra minutes a chore, and AP on every win.",
    });
  });

  it("Mystic earns +2 AP per win and gets 10% MP back on a win", () => {
    expect(classPassive("Mystic")).toEqual({
      ...none,
      apBonusOnWin: 2,
      mpRegenOnWin: 0.1,
      blurb: "Double AP on every win, and MP back as you go.",
    });
  });

  it("no class, old or new, completes a chore or mints XP: a passive only touches the fields the engines already read", () => {
    const fields = Object.keys(none).sort();
    ["Knight", "Berserker", "White Mage", "Black Mage", "Assassin", "Ranger", "Martial Artist", "Mystic", "Paladin", "Ninja", "Sage"].forEach((name) => {
      expect(Object.keys(classPassive(name)).sort()).toEqual(fields);
      expect(classPassive(name).strikeFactor).toBe(1);
      expect(classPassive(name).runChanceBonus).toBe(0);
    });
  });

  // Tier 3 (Paladin = Knight + Mystic, Ninja = Assassin + Berserker, Sage = White Mage + Mystic) keeps its old passive
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
    expect(classPassive("white mage")).toEqual(classPassive("White Mage"));
    expect(classPassive(" MARTIAL ARTIST ")).toEqual(classPassive("Martial Artist"));
    expect(canonicalClassName("thief")).toBe("Thief");
    expect(canonicalClassName("black mage")).toBe("Black Mage");
    expect(canonicalClassName("Bard")).toBe("Bard");
  });
});

describe("discountedMp", () => {
  it("takes the class share off, rounding down", () => {
    expect(discountedMp(50, "Mage")).toBe(37);
    expect(discountedMp(50, "Sage")).toBe(25);
    expect(discountedMp(25, "Sage")).toBe(12);
    expect(discountedMp(100, "White Mage")).toBe(75);
    expect(discountedMp(100, "Black Mage")).toBe(65);
    expect(discountedMp(10, "Black Mage")).toBe(6);
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
    expect(bonusGp(20, "Assassin")).toBe(26);
    expect(bonusGp(20, "Ranger")).toBe(25);
    expect(bonusGp(20, "Mystic")).toBe(20);
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

  it("locks an advanced class until its parent reaches level 10", () => {
    expect(isClassUnlocked("Knight", {})).toBe(false);
    expect(isClassUnlocked("Knight", { Warrior: 9 })).toBe(false);
    expect(isClassUnlocked("Knight", { Warrior: 10 })).toBe(true);
    expect(isClassUnlocked("Berserker", { Warrior: 12 })).toBe(true);
    expect(isClassUnlocked("White Mage", { Mage: 10 })).toBe(true);
    expect(isClassUnlocked("Black Mage", { Warrior: 10 })).toBe(false);
    expect(isClassUnlocked("Martial Artist", { Monk: 10 })).toBe(true);
  });

  it("locks a crown class until both advanced parents reach level 10", () => {
    expect(isClassUnlocked("Paladin", {})).toBe(false);
    expect(isClassUnlocked("Paladin", { Knight: 10, Mystic: 9 })).toBe(false);
    expect(isClassUnlocked("Paladin", { Knight: 10, Mystic: 10 })).toBe(true);
    expect(isClassUnlocked("Paladin", { Warrior: 10, Monk: 10 })).toBe(false);
    expect(isClassUnlocked("Ninja", { Assassin: 12, Berserker: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { "White Mage": 10, Mystic: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { "White Mage": 10, "Black Mage": 10 })).toBe(false);
  });

  it("matches class levels a profile cased differently", () => {
    expect(isClassUnlocked("knight", { warrior: 10 })).toBe(true);
    expect(isClassUnlocked("paladin", { knight: 10, mystic: 10 })).toBe(true);
    expect(isClassUnlocked("sage", { "white mage": 10, mystic: 10 })).toBe(true);
  });

  it("prints the requirement as the picker shows it", () => {
    expect(classRequirementLabel("Knight")).toBe("Warrior 10");
    expect(classRequirementLabel("Martial Artist")).toBe("Monk 10");
    expect(classRequirementLabel("Paladin")).toBe("Knight 10 + Mystic 10");
    expect(classRequirementLabel("Ninja")).toBe("Assassin 10 + Berserker 10");
    expect(classRequirementLabel("Sage")).toBe("White Mage 10 + Mystic 10");
    expect(classRequirementLabel("white mage")).toBe("Mage 10");
    expect(classRequirementLabel("Warrior")).toBe("");
  });

  it("reads the levels off the hero's stats.classes", () => {
    expect(classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 3 }, Thief: undefined })).toEqual({
      Warrior: 10,
      Monk: 3,
      Thief: 0,
    });
    expect(classLevelsOf({ "White Mage": { level: 4 } })).toEqual({ "White Mage": 4 });
    expect(classLevelsOf(undefined)).toEqual({});
  });
});

describe("rewardsWithPassive", () => {
  it("puts the loot bonus on GP and the Monk's AP on top, leaving XP alone", () => {
    const base = { xp: 100, gp: 40, ap: 1 };
    expect(rewardsWithPassive(base, classPassive("Thief"))).toEqual({ xp: 100, gp: 50, ap: 1 });
    expect(rewardsWithPassive(base, classPassive("Monk"))).toEqual({ xp: 100, gp: 40, ap: 2 });
    expect(rewardsWithPassive(base, classPassive("Mystic"))).toEqual({ xp: 100, gp: 40, ap: 3 });
    expect(rewardsWithPassive(base, classPassive("Martial Artist"))).toEqual({ xp: 100, gp: 40, ap: 2 });
    expect(rewardsWithPassive(base, classPassive("Assassin"))).toEqual({ xp: 100, gp: 52, ap: 1 });
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
    expect(winRegen(classPassive("Knight"), { now: 10, max: 100 }, { now: 1, max: 80 })).toEqual({ hp: 5, mp: 0 });
    expect(winRegen(classPassive("Berserker"), { now: 10, max: 100 }, { now: 1, max: 80 })).toEqual({ hp: 15, mp: 0 });
    expect(winRegen(classPassive("White Mage"), { now: 10, max: 100 }, { now: 1, max: 80 })).toEqual({ hp: 10, mp: 16 });
    expect(winRegen(classPassive("Black Mage"), { now: 10, max: 100 }, { now: 1, max: 80 })).toEqual({ hp: 0, mp: 8 });
    expect(winRegen(classPassive("Mystic"), { now: 10, max: 100 }, { now: 1, max: 80 })).toEqual({ hp: 0, mp: 8 });
  });

  it("gives at least one point when the share rounds to nothing and something is missing", () => {
    expect(winRegen(classPassive("Mage"), { now: 4, max: 4 }, { now: 1, max: 4 })).toEqual({ hp: 0, mp: 1 });
  });
});
