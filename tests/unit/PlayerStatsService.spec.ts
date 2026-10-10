import { JOB_CLASS_OPTIONS, averageBaseStats, combineStatBoosts } from "@/constants/JOB_CLASS_OPTIONS";
import {
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

  it("hands out the class's stat boosts per level gained, for tier-2 classes too", () => {
    expect(calculateLevelUp(1, 3, "Warrior").statsGained).toEqual({ strength: 4, endurance: 2, guts: 2, presence: 2 });
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

describe("tier-2 classes", () => {
  const byName = (name: string) => JOB_CLASS_OPTIONS.find((job) => job.name === name)!;

  it("Paladin, Ninja and Sage are in the picker as tier 2 with their icons", () => {
    expect(JOB_CLASS_OPTIONS.map((job) => [job.name, job.tier])).toEqual([
      ["Warrior", 1],
      ["Mage", 1],
      ["Thief", 1],
      ["Monk", 1],
      ["Paladin", 2],
      ["Ninja", 2],
      ["Sage", 2],
    ]);
    expect(byName("Paladin").icon).toBe("fa-shield-cross");
    expect(byName("Ninja").icon).toBe("fa-user-ninja");
    expect(byName("Sage").icon).toBe("fa-hat-wizard");
    expect(Object.keys(JOB_UNLOCK_REQUIREMENTS).sort()).toEqual(["Ninja", "Paladin", "Sage"]);
  });

  it("have base stats averaging their parents and boosts combining them", () => {
    const warrior = byName("Warrior");
    const monk = byName("Monk");
    expect(byName("Paladin").baseStats).toEqual(averageBaseStats(warrior.baseStats, monk.baseStats));
    expect(byName("Paladin").baseStats?.strength).toBe(10); // (12 + 8) / 2
    expect(byName("Paladin").baseStats?.focus).toBe(7); // (4 + 10) / 2
    expect(byName("Paladin").statBoosts).toEqual(combineStatBoosts(warrior.statBoosts, monk.statBoosts));
    expect(byName("Sage").baseStats?.intelligence).toBe(8); // (12 + 4) / 2
    expect(byName("Ninja").statBoosts).toEqual(expect.arrayContaining([{ stat: "agility", amount: 2 }, { stat: "strength", amount: 2 }]));
  });

  it("draw their pillars from their parents", () => {
    for (const [name, parents] of [
      ["Paladin", ["Warrior", "Monk"]],
      ["Ninja", ["Thief", "Warrior"]],
      ["Sage", ["Mage", "Monk"]],
    ] as const) {
      const job = byName(name);
      const parentPillars = parents.flatMap((parent) => {
        const p = byName(parent);
        return [p.primaryPillar, p.secondaryPillar, p.tertiaryPillar];
      });
      expect(parentPillars).toContain(job.primaryPillar);
      expect(parentPillars).toContain(job.secondaryPillar);
      expect(parentPillars).toContain(job.tertiaryPillar);
      expect(new Set([job.primaryPillar, job.secondaryPillar, job.tertiaryPillar]).size).toBe(3);
    }
  });

  it("have HP/MP growth of their own, between their parents', and a preview line", () => {
    const { Warrior, Monk, Paladin, Thief, Ninja, Mage, Sage } = JOB_CLASS_BASE_STATS;
    expect(Paladin.hp).toBe(Math.round((Warrior.hp + Monk.hp) / 2));
    expect(Ninja.hp).toBe(Math.round((Thief.hp + Warrior.hp) / 2));
    expect(Sage.mp).toBe(Math.round((Mage.mp + Monk.mp) / 2));
    expect(getJobClassPreview("Sage").description).toMatch(/Mage/);
    expect(getJobClassPreview("Ninja").hp).toBe(Ninja.hp);
  });
});
