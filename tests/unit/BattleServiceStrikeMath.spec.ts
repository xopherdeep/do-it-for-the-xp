import {
  PARTING_DODGE_CEILING,
  partingDodgeChance,
  partingStrike,
  partingStrikeSoftener,
  resolvePassive,
  strikeDamage,
} from "@/lib/services/battle/battleService/strikeMath";
import type { BattlePassive } from "@/lib/services/battle/battleService/types";

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

    describe("the grudge (a sibling multiplier, docs/Quest-Rooms-Spec.md 5.7)", () => {
      it("makes the hit harder by 25% a mark: 1, 1.25, 1.5 and 1.75", () => {
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 1)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 1.25)).toBe(15);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 1.5)).toBe(18);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 1.75)).toBe(21);
      });

      it("defaults to 1, so every existing caller is unchanged", () => {
        expect(strikeDamage(100, 10, false, 0.5)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, undefined)).toBe(12);
      });

      it("is clamped to [1, 1.75]: a bigger factor counts as three marks, a smaller or broken one as none", () => {
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 3)).toBe(21);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 0.5)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, 0)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, -2)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, Number.NaN)).toBe(12);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 1, Number.POSITIVE_INFINITY)).toBe(12);
      });

      it("sits beside strikeFactor, which stays a share of at most 1: both apply, then the hit rounds down", () => {
        // 12 x 0.75 = 9, x 1.25 = 11.25 -> 11; a wrong strikeFactor is still ignored on its own
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 0.75, 1.25)).toBe(11);
        expect(strikeDamage(100, 10, false, 0.5, 0.5, 2, 1.25)).toBe(15);
      });

      it("is felt through a brace too: the brace lets its share of the harder hit through", () => {
        // 12 x 1.75 = 21, braced: floor(21 x 0.5) = 10, a Warrior's quarter floor(21 x 0.25) = 5
        expect(strikeDamage(100, 10, true, 0.5, 0.5, 1, 1.75)).toBe(10);
        expect(strikeDamage(100, 10, true, 0.5, 0.25, 1, 1.75)).toBe(5);
      });

      it("rounds down and still never costs less than 1", () => {
        // raw 4 (30 HP): 4 x 1.25 = 5, 4 x 1.5 = 6, 4 x 1.75 = 7
        expect([1.25, 1.5, 1.75].map((grudge) => strikeDamage(30, 10, false, 0.5, 0.5, 1, grudge))).toEqual([5, 6, 7]);
        expect(strikeDamage(1, 10, true, 0.5, 0.5, 1, 1.75)).toBe(1);
      });
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

  describe("there is no escape roll left", () => {
    it("retired the odds table: nothing here decides whether a run works", () => {
      const strikeMath = jest.requireActual("@/lib/services/battle/battleService/strikeMath");
      expect(strikeMath.escapeChanceAgainst).toBeUndefined();
    });
  });

  describe("partingDodgeChance (agility)", () => {
    it("is the trained bonus, a point being 1%", () => {
      expect(partingDodgeChance(passiveOf())).toBe(0);
      expect(partingDodgeChance(passiveOf({ runChanceBonus: 0.06 }))).toBe(0.06);
      expect(partingDodgeChance(passiveOf({ runChanceBonus: 0.25 }))).toBe(0.25);
    });

    it("never passes the ceiling, 0.5", () => {
      expect(PARTING_DODGE_CEILING).toBe(0.5);
      expect(partingDodgeChance(passiveOf({ runChanceBonus: 0.9 }))).toBe(0.5);
    });

    it("ignores a negative or non-finite bonus, and the class run chance does not feed it", () => {
      expect(partingDodgeChance(passiveOf({ runChanceBonus: -0.5 }))).toBe(0);
      expect(partingDodgeChance(passiveOf({ runChanceBonus: Number.NaN }))).toBe(0);
      expect(partingDodgeChance(passiveOf({ runChance: 0.9 }))).toBe(0);
    });
  });

  describe("partingStrikeSoftener", () => {
    it("is nothing for a hero who was not bracing and has no slip-away class", () => {
      expect(partingStrikeSoftener(passiveOf(), false)).toBeNull();
    });

    it("is the brace when the hero was bracing", () => {
      expect(partingStrikeSoftener(passiveOf(), true)).toBe("brace");
    });

    it("is the slip when the class has a run chance (Thief, Ninja, Assassin)", () => {
      expect(partingStrikeSoftener(passiveOf({ runChance: 0.9 }), false)).toBe("slip");
    });

    it("does not stack: a bracing Thief is softened once, and the brace gets the credit", () => {
      expect(partingStrikeSoftener(passiveOf({ runChance: 0.9 }), true)).toBe("brace");
    });
  });

  describe("partingStrike", () => {
    const owed = { shadow: false, frozen: false, hammer: false, vanish: false };
    const run = (extra: Partial<Parameters<typeof partingStrike>[0]> = {}) =>
      partingStrike({
        maxHp: 100,
        hp: 100,
        attack: 10,
        passive: passiveOf(),
        wasBracing: false,
        owed,
        dodgeRoll: 0.99,
        strikeRoll: 0.5,
        ...extra,
      });

    it("is one full strike: the same number a beast's strike costs", () => {
      expect(run()).toEqual({ dodgedBy: null, damage: strikeDamage(100, 10, false, 0.5), softener: null, emptied: false });
      expect(run().damage).toBe(12);
    });

    it("scales with the beast's attack and the roll, like any strike", () => {
      expect(run({ attack: 15 }).damage).toBe(18);
      expect(run({ strikeRoll: 0 }).damage).toBe(11);
      expect(run({ strikeRoll: 1 }).damage).toBe(13);
    });

    it("lets only strikeFactor of it land (trained strength helps here too)", () => {
      expect(run({ passive: passiveOf({ strikeFactor: 0.75 }) }).damage).toBe(9);
    });

    it("is harder by the beast's grudge: 25% a mark, and the same number a clock strike would cost", () => {
      expect(run({ grudge: 1.5 }).damage).toBe(18);
      expect(run({ grudge: 1.75 }).damage).toBe(strikeDamage(100, 10, false, 0.5, 0.5, 1, 1.75));
      expect(run({ grudge: 1.75 }).damage).toBe(21);
    });

    it("has no grudge to add when none is given, and clamps one that is too big", () => {
      expect(run({ grudge: undefined }).damage).toBe(12);
      expect(run({ grudge: 9 }).damage).toBe(21);
    });

    it("takes the grudge before the softener: a bracing hero still gets the brace factor of the harder hit", () => {
      expect(run({ grudge: 1.75, wasBracing: true })).toMatchObject({ damage: 10, softener: "brace" });
    });

    it("empties HP on the harder hit: 12 would not empty 20 HP, 21 does", () => {
      expect(run({ hp: 20 })).toMatchObject({ damage: 12, emptied: false });
      expect(run({ hp: 20, grudge: 1.75 })).toMatchObject({ damage: 21, emptied: true });
    });

    it("a dodged strike has no damage at all, whatever the grudge", () => {
      expect(run({ grudge: 1.75, owed: { ...owed, frozen: true } })).toEqual({
        dodgedBy: "frozen",
        damage: 0,
        softener: null,
        emptied: false,
      });
    });

    it("is softened by the brace factor when the hero was bracing: half, or a Warrior's quarter", () => {
      expect(run({ wasBracing: true })).toMatchObject({ damage: 6, softener: "brace" });
      expect(run({ wasBracing: true, passive: passiveOf({ braceFactor: 0.25 }) })).toMatchObject({ damage: 3, softener: "brace" });
    });

    it("is softened by the same factor for a class that slips away (Thief, Ninja), not stacked with a brace", () => {
      expect(run({ passive: passiveOf({ runChance: 0.9 }) })).toMatchObject({ damage: 6, softener: "slip" });
      expect(run({ passive: passiveOf({ runChance: 0.9 }), wasBracing: true })).toMatchObject({ damage: 6, softener: "brace" });
    });

    it("never costs less than 1 when it lands", () => {
      expect(run({ maxHp: 1, hp: 1, wasBracing: true }).damage).toBe(1);
    });

    it.each([
      ["a Ninja's owed first strike", { owed: { ...owed, shadow: true } }, "shadow"],
      ["a frozen clock (Chronos)", { owed: { ...owed, frozen: true } }, "frozen"],
      ["a Thor's Hammer skip", { owed: { ...owed, hammer: true } }, "hammer"],
      ["X's Invisibility", { owed: { ...owed, vanish: true } }, "vanish"],
    ] as const)("is dodged by %s", (_label, extra, dodgedBy) => {
      expect(run(extra)).toEqual({ dodgedBy, damage: 0, softener: null, emptied: false });
    });

    it("keeps the order a real strike does: the Ninja's shadow, then the ice, then the hammer", () => {
      expect(run({ owed: { ...owed, shadow: true, frozen: true, hammer: true } }).dodgedBy).toBe("shadow");
      expect(run({ owed: { ...owed, frozen: true, hammer: true } }).dodgedBy).toBe("frozen");
    });

    it("checks a vanish first: it wins over the shadow, the ice and the hammer", () => {
      expect(run({ owed: { shadow: false, frozen: false, hammer: false, vanish: true } }).dodgedBy).toBe("vanish");
      expect(run({ owed: { shadow: true, frozen: false, hammer: false, vanish: true } }).dodgedBy).toBe("vanish");
      expect(run({ owed: { shadow: true, frozen: true, hammer: true, vanish: true } }).dodgedBy).toBe("vanish");
    });

    it("is dodged when the agility roll falls under the bonus, and lands when it does not", () => {
      const nimble = passiveOf({ runChanceBonus: 0.2 });
      expect(run({ passive: nimble, dodgeRoll: 0.19 })).toMatchObject({ dodgedBy: "agility", damage: 0 });
      expect(run({ passive: nimble, dodgeRoll: 0.2 })).toMatchObject({ dodgedBy: null, damage: 12 });
    });

    it("never dodges on agility with nothing trained, whatever the roll", () => {
      expect(run({ dodgeRoll: 0 }).dodgedBy).toBeNull();
    });

    it("caps the agility dodge at the ceiling: a roll of 0.6 always lands", () => {
      const absurd = passiveOf({ runChanceBonus: 5 });
      expect(run({ passive: absurd, dodgeRoll: 0.49 }).dodgedBy).toBe("agility");
      expect(run({ passive: absurd, dodgeRoll: 0.6 }).dodgedBy).toBeNull();
    });

    it("says when the strike would have emptied HP, and still reports the full strike", () => {
      expect(run({ hp: 12 })).toMatchObject({ damage: 12, emptied: true });
      expect(run({ hp: 13 })).toMatchObject({ damage: 12, emptied: false });
      expect(run({ hp: 1 })).toMatchObject({ emptied: true });
    });

    it("a dodged strike empties nothing, even at 1 HP", () => {
      expect(run({ hp: 1, owed: { ...owed, frozen: true } })).toMatchObject({ dodgedBy: "frozen", emptied: false });
    });
  });
});
