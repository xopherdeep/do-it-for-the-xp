import { strikeDamage } from "@/lib/services/battle/BattleService";
import { classPassive } from "@/lib/services/stats/ClassPassives";
import { calculateMaxHp } from "@/lib/services/stats/PlayerStatsService";
import {
  FLAVOUR_STATS,
  STAT_NAMES,
  STAT_RATES,
  heroEffects,
  heroGold,
  heroMpBill,
  heroPassive,
  luckyTop,
  shopDiscountLabel,
  shopPrice,
  statEffectLine,
  statEffects,
  statTotal,
  trainedStats,
} from "@/lib/services/stats/StatEffects";
import { PILLARS } from "@/constants/PILLARS";

/** docs/Stats-Contract.md: every stat on the profile sheet does what its line says, from trained points only. */
describe("trainedStats", () => {
  it("reads stats.special, ignores junk and negatives, and falls back to the old top-level keys", () => {
    expect(trainedStats({ stats: { special: { strength: 4, luck: -2, guts: "7", focus: NaN } } })).toEqual({
      strength: 4,
      guts: 7,
    });
    expect(trainedStats({ stats: { agility: 8 } })).toEqual({ agility: 8 });
    expect(trainedStats(null)).toEqual({});
    expect(trainedStats({ stats: { special: { strength: 2.9 } } })).toEqual({ strength: 2 });
  });

  it("the badge total is the class base (5 without a class) plus the trained points", () => {
    expect(statTotal({ jobClass: "Warrior", stats: { special: { strength: 4 } } }, "strength")).toBe(16);
    expect(statTotal({ stats: {} }, "charisma")).toBe(5);
    expect(statTotal({ jobClass: "Thief", stats: {} }, "luck")).toBe(10);
  });
});

describe("statEffects", () => {
  it("is neutral with nothing trained", () => {
    expect(statEffects({})).toEqual({
      strikeFactor: 1,
      braceMultiplier: 1,
      mpCostFactor: 1,
      runChanceBonus: 0,
      clockSecondsPerChore: 0,
      findChanceBonus: 0,
      goldMultiplier: 1,
      luckyRangeBonus: 0,
      shopPriceFactor: 1,
    });
  });

  it("moves 1% (2% for perception and luck) a point and stops at each cap", () => {
    expect(statEffects({ strength: 4 }).strikeFactor).toBe(0.96);
    expect(statEffects({ strength: 99 }).strikeFactor).toBe(1 - STAT_RATES.strikeCap);
    expect(statEffects({ guts: 10 }).braceMultiplier).toBe(0.9);
    expect(statEffects({ intelligence: 30 }).mpCostFactor).toBe(0.75);
    expect(statEffects({ agility: 12 })).toMatchObject({ runChanceBonus: 0.12, clockSecondsPerChore: 12 });
    expect(statEffects({ agility: 500 })).toMatchObject({ runChanceBonus: 0.25, clockSecondsPerChore: 120 });
    expect(statEffects({ perception: 5 }).findChanceBonus).toBe(0.1);
    expect(statEffects({ perception: 50 }).findChanceBonus).toBe(0.3);
    expect(statEffects({ awareness: 7 }).goldMultiplier).toBe(1.07);
    expect(statEffects({ luck: 10 }).luckyRangeBonus).toBe(0.2);
    expect(statEffects({ luck: 100 }).luckyRangeBonus).toBe(0.5);
    expect(statEffects({ charisma: 8 }).shopPriceFactor).toBe(0.92);
    expect(statEffects({ charisma: 40 }).shopPriceFactor).toBe(0.8);
  });

  it("the flavour stats change nothing", () => {
    const neutral = statEffects({});
    FLAVOUR_STATS.forEach((stat) => expect(statEffects({ [stat]: 50 })).toEqual(neutral));
    expect(FLAVOUR_STATS).toEqual(["focus", "flow", "presence", "mastery"]);
  });
});

describe("heroPassive lays the stats over the class table (multiply, never replace)", () => {
  it("a Warrior's quarter brace with 10 guts is 0.225; strength and agility are the stats' own", () => {
    const passive = heroPassive({ jobClass: "Warrior", stats: { special: { guts: 10, strength: 5, agility: 6 } } });
    expect(passive).toMatchObject({
      braceFactor: 0.225,
      strikeFactor: 0.95,
      runChanceBonus: 0.06,
      cooldownMinutesBonus: 0.1,
      runChance: null,
      skipFirstStrike: false,
    });
  });

  it("a Monk's minute and agility's seconds add up; a Mage's discount and intelligence compound", () => {
    expect(heroPassive({ jobClass: "Monk", stats: { special: { agility: 30 } } }).cooldownMinutesBonus).toBe(1.5);
    expect(heroPassive({ jobClass: "Mage", stats: { special: { intelligence: 4 } } }).mpDiscount).toBe(0.28);
    expect(heroPassive({ jobClass: "Thief", stats: { special: { awareness: 10 } } }).gpBonus).toBe(0.375);
  });

  it("a hero with nothing trained gets exactly the class table", () => {
    expect(heroPassive({ jobClass: "Sage", stats: {} })).toEqual(classPassive("Sage"));
    expect(heroPassive(undefined)).toEqual(classPassive(undefined));
  });
});

describe("the bills and the loot", () => {
  it("heroMpBill: class discount then intelligence, floored, a free thing stays free", () => {
    expect(heroMpBill(50, { jobClass: "Warrior", stats: { special: { intelligence: 4 } } })).toBe(48);
    expect(heroMpBill(50, { jobClass: "Mage", stats: { special: { intelligence: 4 } } })).toBe(36);
    expect(heroMpBill(50, { jobClass: "Sage", stats: {} })).toBe(25);
    expect(heroMpBill(0, { jobClass: "Mage", stats: { special: { intelligence: 20 } } })).toBe(0);
  });

  it("heroGold: the class loot bonus and awareness, rounded to whole coins", () => {
    expect(heroGold(20, { jobClass: "Warrior", stats: {} })).toBe(20);
    expect(heroGold(20, { jobClass: "Thief", stats: {} })).toBe(25);
    expect(heroGold(20, { jobClass: "Thief", stats: { special: { awareness: 10 } } })).toBe(28);
    expect(heroGold(0, { jobClass: "Thief", stats: {} })).toBe(0);
  });

  it("luckyTop lifts the top of a gold range, rounded up, and leaves the floor alone", () => {
    expect(luckyTop(5, { stats: {} })).toBe(5);
    expect(luckyTop(5, { stats: { special: { luck: 10 } } })).toBe(6);
    expect(luckyTop(20, { stats: { special: { luck: 10 } } })).toBe(24);
    expect(luckyTop(20, { stats: { special: { luck: 100 } } })).toBe(30);
    expect(luckyTop(0, { stats: { special: { luck: 100 } } })).toBe(0);
  });

  it("shopPrice takes charisma off every price, never below a coin, and the sign says how much", () => {
    const hero = { jobClass: "Thief", stats: { special: { charisma: 8 } } };
    expect(shopPrice(100, hero)).toBe(92);
    expect(shopPrice(50, hero)).toBe(46);
    expect(shopPrice(1, hero)).toBe(1);
    expect(shopPrice(0, hero)).toBe(0);
    expect(shopPrice(100, { stats: {} })).toBe(100);
    expect(shopDiscountLabel(hero)).toBe("8% off");
    expect(shopDiscountLabel({ stats: {} })).toBe("");
  });
});

describe("the engine and the HP formula honour the same numbers", () => {
  it("strikeDamage lets only the strike share land, then the brace", () => {
    expect(strikeDamage(100, 10, false, 0.5, 0.5, 1)).toBe(12);
    expect(strikeDamage(100, 10, false, 0.5, 0.5, 0.75)).toBe(9);
    expect(strikeDamage(100, 10, true, 0.5, 0.5, 0.75)).toBe(4);
    expect(strikeDamage(1, 10, false, 0, 0.5, 0.75)).toBe(1);
    // Nonsense shares keep the full strike
    expect(strikeDamage(100, 10, false, 0.5, 0.5, 0)).toBe(12);
    expect(strikeDamage(100, 10, false, 0.5, 0.5, 2)).toBe(12);
  });

  it("defense adds a point of HP per point trained, on top of endurance and guts", () => {
    const plain = calculateMaxHp(1, "Warrior", {});
    expect(calculateMaxHp(1, "Warrior", { defense: 7 })).toBe(plain + 7);
    expect(calculateMaxHp(1, "Warrior", { defense: 7, endurance: 2, guts: 4 })).toBe(plain + 7 + 6 + 2);
  });
});

describe("the profile sheet", () => {
  it("has a line for every stat, and the flavour ones say so", () => {
    const described = Object.values(PILLARS).flatMap((pillar) => Object.keys(pillar.stats));
    expect(described.sort()).toEqual([...STAT_NAMES].sort());
    FLAVOUR_STATS.forEach((stat) => {
      const pillar = Object.values(PILLARS).find((candidate) => stat in candidate.stats)!;
      expect(pillar.stats[stat].description).toMatch(/Flavour for now/);
    });
  });

  it("statEffectLine reads the trained points back as what they do right now", () => {
    const hero = {
      jobClass: "Warrior",
      stats: { special: { strength: 4, endurance: 2, guts: 10, agility: 6, charisma: 8, intelligence: 3, luck: 5, awareness: 7, perception: 5, defense: 3, wisdom: 2 } },
    };
    expect(statEffectLine("strength", hero)).toBe("Trained 4: strikes land 4% softer");
    expect(statEffectLine("endurance", hero)).toBe("Trained 2: +6 max HP");
    expect(statEffectLine("defense", hero)).toBe("Trained 3: +3 max HP");
    expect(statEffectLine("guts", hero)).toBe("Trained 10: Defend blocks 10% more, +5 max HP");
    expect(statEffectLine("agility", hero)).toBe("Trained 6: +6% Run Away odds, +6s per chore on the clock");
    expect(statEffectLine("charisma", hero)).toBe("Trained 8: shop prices 8% off");
    expect(statEffectLine("intelligence", hero)).toBe("Trained 3: +1 max MP, MP costs 3% off");
    expect(statEffectLine("wisdom", hero)).toBe("Trained 2: +1 max MP");
    expect(statEffectLine("luck", hero)).toBe("Trained 5: gold ranges reach 10% higher");
    expect(statEffectLine("awareness", hero)).toBe("Trained 7: +7% temple gold");
    expect(statEffectLine("perception", hero)).toBe("Trained 5: +10% to find things in temple rooms");
    expect(statEffectLine("focus", { stats: { special: { focus: 9 } } })).toBe("");
    expect(statEffectLine("strength", { stats: {} })).toBe("");
  });

  it("heroEffects of a stored hero equals statEffects of their trained points", () => {
    const hero = { jobClass: "Thief", stats: { special: { luck: 3, charisma: 2 } } };
    expect(heroEffects(hero)).toEqual(statEffects({ luck: 3, charisma: 2 }));
  });
});

/** The advanced classes (Knight, Berserker, White Mage, ...) run through the same stat rules as the four base classes. */
describe("the advanced classes in the stat rules", () => {
  it("the badge total starts from the advanced class's raised base stats", () => {
    expect(statTotal({ jobClass: "Knight", stats: {} }, "strength")).toBe(14); // Warrior 12, +10 % rounded up
    expect(statTotal({ jobClass: "Knight", stats: { special: { strength: 4 } } }, "strength")).toBe(18);
    expect(statTotal({ jobClass: "Black Mage", stats: {} }, "intelligence")).toBe(14); // Mage 12, +10 % rounded up
    expect(statTotal({ jobClass: "Mystic", stats: {} }, "focus")).toBe(11); // Monk 10, +10 %: 11, not 12
  });

  it("a hero with nothing trained gets exactly the advanced class's table", () => {
    ["Knight", "Berserker", "White Mage", "Black Mage", "Assassin", "Ranger", "Martial Artist", "Mystic"].forEach((jobClass) => {
      expect(heroPassive({ jobClass, stats: {} })).toEqual(classPassive(jobClass));
    });
  });

  it("trained guts lower a Berserker's brace the way they do a Warrior's", () => {
    const passive = heroPassive({ jobClass: "Berserker", stats: { special: { guts: 10 } } });
    expect(passive.braceFactor).toBeCloseTo(0.315, 5); // 0.35 * 0.9
    expect(passive.hpRegenOnWin).toBe(0.15);
  });

  it("the MP bill and the loot use the new passives", () => {
    expect(heroMpBill(100, { jobClass: "Black Mage", stats: {} })).toBe(65);
    expect(heroMpBill(100, { jobClass: "White Mage", stats: {} })).toBe(75);
    expect(heroGold(20, { jobClass: "Assassin", stats: {} })).toBe(26);
    expect(heroGold(20, { jobClass: "Ranger", stats: {} })).toBe(25);
    expect(heroGold(20, { jobClass: "Mystic", stats: {} })).toBe(20);
  });

  it("statEffectLine reads the advanced class's HP and MP growth, for names with a space too", () => {
    expect(statEffectLine("endurance", { jobClass: "Martial Artist", stats: { special: { endurance: 4 } } })).toBe("Trained 4: +11 max HP");
    expect(statEffectLine("wisdom", { jobClass: "Mystic", stats: { special: { wisdom: 3 } } })).toBe("Trained 3: +6 max MP");
    expect(statEffectLine("intelligence", { jobClass: "Black Mage", stats: { special: { intelligence: 2 } } })).toBe(
      "Trained 2: +7 max MP, MP costs 2% off"
    );
  });

  it("max HP and MP use the advanced class's own row", () => {
    expect(calculateMaxHp(1, "Knight", { endurance: 2 })).toBe(54 + 6);
    expect(calculateMaxHp(1, "Martial Artist", {})).toBe(48);
  });
});
