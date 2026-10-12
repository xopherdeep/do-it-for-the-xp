import {
  escapeChanceAgainst,
  resolvePassive,
  strikeDamage,
} from "@/lib/services/battle/battleService/strikeMath";
import type { BattlePassive, Enemy } from "@/lib/services/battle/battleService/types";

const beast = (extra: Partial<Enemy> = {}): Enemy => ({
  id: "b1",
  name: "Dust Bunny",
  type: "monster",
  isBoss: false,
  health: 10,
  maxHealth: 10,
  attack: 10,
  defense: 1,
  speed: 1,
  ...extra,
});

const passiveOf = (extra: Partial<BattlePassive> = {}): BattlePassive => resolvePassive(extra);

describe("strikeMath (characterization)", () => {
  describe("strikeDamage", () => {
    it("costs about 12% of max HP at the baseline attack and a middle roll", () => {
      expect(strikeDamage(100, 10, false, 0.5)).toBe(12);
    });

    it("scales with the beast's attack, treating 0 as the baseline 10", () => {
      expect(strikeDamage(100, 15, false, 0.5)).toBe(18);
      expect(strikeDamage(100, 0, false, 0)).toBe(11);
    });

    it("rolls plus or minus 10%", () => {
      expect(strikeDamage(100, 10, false, 0)).toBe(11);
      expect(strikeDamage(100, 10, false, 1)).toBe(13);
    });

    it("never goes below 1", () => {
      expect(strikeDamage(1, 10, false, 0.5)).toBe(1);
      expect(strikeDamage(Number.NaN, 10, false, 0.5)).toBe(1);
    });

    it("lets half through a brace by default and the class factor when given", () => {
      expect(strikeDamage(100, 10, true, 0.5)).toBe(6);
      expect(strikeDamage(100, 10, true, 0.5, 0.25)).toBe(3);
      expect(strikeDamage(100, 10, true, 0.5, -1)).toBe(6);
    });

    it("lets only strikeFactor of the hit land, ignoring a factor outside (0, 1]", () => {
      expect(strikeDamage(100, 10, false, 0.5, 0.5, 0.75)).toBe(9);
      expect(strikeDamage(100, 10, false, 0.5, 0.5, 2)).toBe(12);
    });
  });

  describe("resolvePassive", () => {
    it("fills every field with the default rule", () => {
      expect(resolvePassive()).toEqual({
        braceFactor: 0.5,
        strikeFactor: 1,
        runChance: null,
        runChanceBonus: 0,
        cooldownMinutesBonus: 0,
        skipFirstStrike: false,
      });
    });

    it("lets the given fields win and keeps the rest", () => {
      expect(resolvePassive({ braceFactor: 0.25, runChance: 0.9 })).toEqual({
        braceFactor: 0.25,
        strikeFactor: 1,
        runChance: 0.9,
        runChanceBonus: 0,
        cooldownMinutesBonus: 0,
        skipFirstStrike: false,
      });
    });
  });

  describe("escapeChanceAgainst", () => {
    it("is 75% against an ordinary monster, and with nobody on the field", () => {
      expect(escapeChanceAgainst(beast(), passiveOf())).toBe(0.75);
      expect(escapeChanceAgainst(null, passiveOf())).toBe(0.75);
    });

    it("is 25% against a boss and 50% against a miniboss", () => {
      expect(escapeChanceAgainst(beast({ isBoss: true }), passiveOf())).toBe(0.25);
      expect(escapeChanceAgainst(beast({ type: "miniboss" }), passiveOf())).toBe(0.5);
    });

    it("takes the class run chance for ordinary monsters only", () => {
      const thief = passiveOf({ runChance: 0.9 });
      expect(escapeChanceAgainst(beast(), thief)).toBe(0.9);
      expect(escapeChanceAgainst(beast({ isBoss: true }), thief)).toBe(0.25);
      expect(escapeChanceAgainst(beast({ type: "miniboss" }), thief)).toBe(0.5);
    });

    it("adds the trained bonus and stops at 95%", () => {
      expect(escapeChanceAgainst(beast(), passiveOf({ runChanceBonus: 0.1 }))).toBeCloseTo(0.85, 10);
      expect(escapeChanceAgainst(beast(), passiveOf({ runChance: 0.9, runChanceBonus: 0.2 }))).toBe(0.95);
    });

    it("ignores a zero, negative or non-finite bonus", () => {
      expect(escapeChanceAgainst(beast(), passiveOf({ runChanceBonus: 0 }))).toBe(0.75);
      expect(escapeChanceAgainst(beast(), passiveOf({ runChanceBonus: -0.5 }))).toBe(0.75);
      expect(escapeChanceAgainst(beast(), passiveOf({ runChanceBonus: Number.NaN }))).toBe(0.75);
    });
  });
});
