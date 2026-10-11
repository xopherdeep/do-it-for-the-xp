import { JOB_CLASS_OPTIONS } from "@/constants/JOB_CLASS_OPTIONS";
import {
  CLASS_LEVEL_BONUSES,
  JOB_CLASS_BASE_STATS,
  JOB_UNLOCK_REQUIREMENTS,
  calculateLevelUp,
  calculateMaxHp,
  calculateMaxMp,
  getClassStatBonus,
  getJobClassPreview,
} from "@/lib/services/stats/PlayerStatsService";

describe("calculateLevelUp", () => {
  it("counts the class level: max HP/MP after a level-up keep the class bonus the HUD shows", () => {
    const plain = calculateLevelUp(1, 2, "Warrior", undefined);
    const withClass = calculateLevelUp(1, 2, "Warrior", undefined, 4);
    const bonus = getClassStatBonus("Warrior", 4);

    expect(withClass.newMaxHp).toBe(plain.newMaxHp + bonus.hp);
    expect(withClass.newMaxMp).toBe(plain.newMaxMp + bonus.mp);
    expect(withClass.newMaxHp).toBe(calculateMaxHp(2, "Warrior", undefined, 4));
    expect(withClass.newMaxMp).toBe(calculateMaxMp(2, "Warrior", undefined, 4));
    // The gain of the level itself is the class growth; the class bonus was already there before
    expect(withClass.hpGained).toBe(plain.hpGained);
    expect(withClass.mpGained).toBe(plain.mpGained);
  });

  it("defaults to no class bonus, as before", () => {
    expect(calculateLevelUp(3, 5, "Mage", { intelligence: 4 })).toEqual(calculateLevelUp(3, 5, "Mage", { intelligence: 4 }, 0));
  });

  it("hands out the class's stat boosts per level gained, for advanced classes too", () => {
    expect(calculateLevelUp(1, 3, "Warrior").statsGained).toEqual({ strength: 4, endurance: 2, guts: 2, presence: 2 });
    // An advanced class levels like its parent
    expect(calculateLevelUp(1, 3, "Knight").statsGained).toEqual(calculateLevelUp(1, 3, "Warrior").statsGained);
    expect(calculateLevelUp(1, 2, "Paladin").statsGained).toEqual({
      strength: 2,
      endurance: 1,
      guts: 1,
      presence: 1,
      wisdom: 1,
      perception: 1,
      focus: 2,
    });
  });
});

describe("advanced classes", () => {
  const byName = (name: string) => JOB_CLASS_OPTIONS.find((job) => job.name === name)!;
  const ADVANCED = ["Knight", "Berserker", "White Mage", "Black Mage", "Assassin", "Ranger", "Martial Artist", "Mystic"];
  const CROWN = ["Paladin", "Ninja", "Sage"];

  it("are in the picker after the four base classes: 8 of tier 2, then 3 of tier 3", () => {
    expect(JOB_CLASS_OPTIONS.map((job) => [job.name, job.tier])).toEqual([
      ["Warrior", 1],
      ["Mage", 1],
      ["Thief", 1],
      ["Monk", 1],
      ...ADVANCED.map((name) => [name, 2]),
      ...CROWN.map((name) => [name, 3]),
    ]);
    expect(byName("Paladin").icon).toBe("fa-shield-cross");
    expect(byName("Ninja").icon).toBe("fa-user-ninja");
    expect(byName("Sage").icon).toBe("fa-hat-wizard");
  });

  it("unlock at level 10 of one parent (tier 2) or of both advanced parents (tier 3)", () => {
    expect(Object.keys(JOB_UNLOCK_REQUIREMENTS).sort()).toEqual([...ADVANCED, ...CROWN].sort());
    expect(JOB_UNLOCK_REQUIREMENTS.Knight).toEqual({ Warrior: 10 });
    expect(JOB_UNLOCK_REQUIREMENTS["White Mage"]).toEqual({ Mage: 10 });
    expect(JOB_UNLOCK_REQUIREMENTS.Paladin).toEqual({ Knight: 10, Mystic: 10 });
    expect(JOB_UNLOCK_REQUIREMENTS.Ninja).toEqual({ Assassin: 10, Berserker: 10 });
    expect(JOB_UNLOCK_REQUIREMENTS.Sage).toEqual({ "White Mage": 10, Mystic: 10 });
  });

  it("have a base HP/MP row, a growth row and a class-level bonus of their own", () => {
    [...ADVANCED, ...CROWN].forEach((name) => {
      expect(JOB_CLASS_BASE_STATS[name]).toBeDefined();
      expect(JOB_CLASS_BASE_STATS[name]).not.toBe(JOB_CLASS_BASE_STATS.default);
      expect(CLASS_LEVEL_BONUSES[name]).toBeDefined();
      // never the fallback pay
      expect(getClassStatBonus(name, 10)).not.toEqual(getClassStatBonus("not-a-class", 10));
    });
    expect(calculateMaxHp(1, "Knight")).toBe(JOB_CLASS_BASE_STATS.Knight.hp);
    expect(calculateMaxMp(1, "Black Mage")).toBe(JOB_CLASS_BASE_STATS["Black Mage"].mp);
    expect(calculateMaxHp(5, "Martial Artist", undefined, 3)).toBe(
      JOB_CLASS_BASE_STATS["Martial Artist"].hp + JOB_CLASS_BASE_STATS["Martial Artist"].hpGrowth * 4 + getClassStatBonus("Martial Artist", 3).hp
    );
  });

  it("keep the crown classes' HP and MP at the numbers they always had", () => {
    expect(JOB_CLASS_BASE_STATS.Paladin).toMatchObject({ hp: 48, mp: 18, hpGrowth: 8, mpGrowth: 4 });
    expect(JOB_CLASS_BASE_STATS.Ninja).toMatchObject({ hp: 43, mp: 15, hpGrowth: 7, mpGrowth: 3 });
    expect(JOB_CLASS_BASE_STATS.Sage).toMatchObject({ hp: 35, mp: 33, hpGrowth: 5, mpGrowth: 7 });
  });

  it("have a preview line of their own", () => {
    const fallback = getJobClassPreview("not-a-class").description;
    JOB_CLASS_OPTIONS.forEach((job) => {
      const preview = getJobClassPreview(job.name);
      expect(preview.description).not.toBe(fallback);
      expect(preview.hp).toBe(JOB_CLASS_BASE_STATS[job.name].hp);
      expect(preview.mp).toBe(JOB_CLASS_BASE_STATS[job.name].mp);
    });
    expect(getJobClassPreview("Sage").description).toMatch(/Mage/);
    expect(getJobClassPreview("Ninja").hp).toBe(JOB_CLASS_BASE_STATS.Ninja.hp);
  });
});
