import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import { heroMpBill } from "@/lib/services/stats/StatEffects";
import { CHRONOS_FREEZE_MS, REASON_HP_FULL, REASON_NO_MP, REASON_USED, SOUND_NO } from "@/lib/services/battle/BattleEffects";
import type { BattleEffectContext, BattleEffectEngine, BattleEffectId } from "@/lib/services/battle/BattleEffects";
import {
  BATTLE_EFFECT_OPTIONS,
  PRESET_BATTLE_EFFECTS,
  battleEffectOf,
  battlePowers,
  castBattlePower,
} from "@/lib/services/battle/BattlePowers";
import { createCustomAbility, HYBRID_PRESETS, REAL_LIFE_PRESETS, TECH_MAGE_PRESETS, TIME_MAGE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { AbilityType, TimePeriod, type Ability } from "@/hooks/abilities/abilityConstants";

/**
 * In-game Powers in a fight: which Powers the sheet lists, what the card says, and what a cast does. The effects
 * themselves are BattleEffects' business (BattleEffects.spec); this spec covers what a Power adds to them: the
 * effect resolution (field, preset fallback, none), the unlocked filter, the class-discounted MP bill and the
 * caster's name. The user store is real; only what it writes to disk is faked.
 */

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// A fight cast is not a real-world cast: it must never reach the ledger (cast log, Town Crier, notifications).
const mockUseAbility = jest.fn();
jest.mock("@/lib/services/abilities/AbilityService", () => {
  const useAbility = (...args: unknown[]) => mockUseAbility(...args);
  return { __esModule: true, AbilityService: class { useAbility = useAbility; }, getAbilityService: () => ({ useAbility }), default: class { useAbility = useAbility; } };
});

const HERO_ID = "hero-1";

type Engine = { [K in keyof BattleEffectEngine]: jest.Mock };

const mockEngine = (): Engine => ({
  extendClock: jest.fn().mockReturnValue(true),
  freezeClock: jest.fn().mockReturnValue(true),
  skipNextStrike: jest.fn(),
  postponeTask: jest.fn((taskId: string) => ({ id: taskId, name: "Fold the socks", isCompleted: false })),
  weakenEnemy: jest.fn().mockReturnValue(5),
  scaleCooldown: jest.fn().mockReturnValue(1.5),
  getCurrentEnemy: jest.fn().mockReturnValue({ name: "Socktopus" }),
});

const addHero = (mp: number, name: Record<string, string> = { nick: "Max" }, hp = { now: 30, max: 30 }) => {
  useUserStore().addUser({
    id: HERO_ID,
    name,
    jobClass: "warrior",
    stats: {
      level: 1,
      xp: { now: 0, next_level: 283 },
      hp,
      mp: { now: mp, max: 300 },
      gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
    },
  });
};

const mpNow = () => (useUserStore().getUserById(HERO_ID) as any).stats.mp.now as number;
const hero = () => useUserStore().getUserById(HERO_ID);

/** An in-game Power that costs 25 MP and asks for no AP, unless the test says otherwise. */
const power = (name: string, over: Partial<Ability> = {}): Ability =>
  createCustomAbility({
    id: `power-${name}`,
    name,
    type: AbilityType.InGame,
    mpCost: 25,
    apRequirement: { amount: 0, period: TimePeriod.Daily },
    ...over,
  });

describe("BattlePowers", () => {
  let service: Engine;
  let ctx: BattleEffectContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockUseAbility.mockReset();
    addHero(100);
    service = mockEngine();
    ctx = { userId: HERO_ID, service, usedThisFight: new Set<BattleEffectId>() };
  });

  describe("battleEffectOf", () => {
    it("field, preset fallback, none, garbage", () => {
      expect(battleEffectOf({ name: "Stop" })).toBe("time-stop");
      expect(battleEffectOf({ name: "Stop", battleEffect: "none" })).toBeNull();
      expect(battleEffectOf({ name: "Mine", battleEffect: "stun" })).toBe("stun");
      expect(battleEffectOf({ name: "Quick Save" })).toBeNull();
      expect(battleEffectOf({ name: "X", battleEffect: "lava" as never })).toBeNull();
    });

    it("the field wins over the preset pick, and a preset name is matched exactly", () => {
      expect(battleEffectOf({ name: "Stop", battleEffect: "heal" })).toBe("heal");
      expect(battleEffectOf({ name: "stop" })).toBeNull();
      expect(battleEffectOf({ name: "constructor" })).toBeNull();
      expect(battleEffectOf({ name: "Stop", battleEffect: null as never })).toBe("time-stop");
    });

    it("the preset picks match the spec", () => {
      expect(PRESET_BATTLE_EFFECTS).toEqual({
        Haste: "kindle",
        Slow: "frost",
        Stop: "time-stop",
        Rewind: "recall",
        Debug: "weaken",
        Overclock: "stun",
        "System Restore": "heal",
      });
    });
  });

  it("BATTLE_EFFECT_OPTIONS lists None first, then the seven effects with their labels", () => {
    expect(BATTLE_EFFECT_OPTIONS).toEqual([
      { value: "none", label: "None" },
      { value: "frost", label: "+10 minutes on the clock" },
      { value: "time-stop", label: "Pauses the clock for 15 minutes" },
      { value: "stun", label: "The beast skips its next strike" },
      { value: "recall", label: "Sends one chore back to the board" },
      { value: "weaken", label: "Halves the beast's attack" },
      { value: "kindle", label: "Chores earn 1.5x the minutes" },
      { value: "heal", label: "Heals 25% of max HP" },
    ]);
  });

  describe("battlePowers", () => {
    it("lists only unlocked in-game Powers with a fight effect", () => {
      const stop = power("Stop");
      const nightOwl = power("Night Owl", { type: AbilityType.RealLife });
      const quickSave = power("Quick Save");
      const rewind = power("Rewind", { apRequirement: { amount: 999, period: TimePeriod.Daily } });

      const listed = battlePowers([stop, nightOwl, quickSave, rewind], ctx);
      expect(listed.map((entry) => entry.ability.name)).toEqual(["Stop"]);
    });

    it("never lists a real-life Power, even one that resolves a fight effect", () => {
      const realStop = power("Stop", { type: AbilityType.RealLife });
      const realStun = power("Gloves", { type: AbilityType.RealLife, battleEffect: "stun" });
      expect(battleEffectOf(realStop)).toBe("time-stop");
      expect(battleEffectOf(realStun)).toBe("stun");
      expect(battlePowers([realStop, realStun], ctx)).toEqual([]);
      expect(battlePowers([realStop, power("Haste")], ctx).map((entry) => entry.ability.name)).toEqual(["Haste"]);
    });

    it("follows the order it is given, honours the GM's pick and drops 'none' and bad data", () => {
      const mine = power("Mine", { battleEffect: "stun" });
      const muted = power("Stop", { battleEffect: "none" });
      const broken = power("Broken", { battleEffect: "lava" as never });
      const haste = power("Haste");

      const listed = battlePowers([mine, muted, broken, haste], ctx);
      expect(listed.map((entry) => entry.ability.name)).toEqual(["Mine", "Haste"]);
      expect(listed.map((entry) => entry.card.effect)).toEqual(["The beast skips its next strike", "Chores earn 1.5x the minutes"]);
    });

    it("a Power whose prerequisite is missing is locked and not listed", () => {
      const stop = power("Stop", { prerequisites: ["power-Slow"] });
      expect(battlePowers([stop], ctx)).toEqual([]);
      expect(battlePowers([stop, power("Slow", { battleEffect: "none" })], ctx).map((entry) => entry.ability.name)).toEqual(["Stop"]);
    });

    it("the real-world cooldown does not hide a Power in a fight", () => {
      const stop = power("Stop", { lastUsed: new Date().toISOString() });
      expect(battlePowers([stop], ctx)).toHaveLength(1);
    });

    it("the card carries the class-discounted MP and the effect label", () => {
      const stop = power("Stop");
      const [entry] = battlePowers([stop], ctx);
      expect(entry.card.mp).toBe(heroMpBill(25, hero()));
      expect(entry.card.effect).toBe("Pauses the clock for 15 minutes");
      expect(entry.card.reason).toBeNull();

      (hero() as any).jobClass = "Mage";
      expect(battlePowers([stop], ctx)[0].card.mp).toBe(18);
      expect(stop.mpCost).toBe(25);
    });

    it("the card says why it can't be cast", () => {
      const stop = power("Stop");
      (hero() as any).stats.mp.now = 0;
      expect(battlePowers([stop], ctx)[0].card.reason).toBe(REASON_NO_MP);

      (hero() as any).stats.mp.now = 100;
      ctx.usedThisFight.add("time-stop");
      expect(battlePowers([stop], ctx)[0].card.reason).toBe(REASON_USED);
    });

    it("a heal Power at full HP says so", () => {
      const restore = power("System Restore", { mpCost: 50 });
      expect(battlePowers([restore], ctx)[0].card.reason).toBe(REASON_HP_FULL);
    });

    it("a free Power is never short of MP", () => {
      (hero() as any).stats.mp.now = 0;
      const [entry] = battlePowers([power("Stop", { mpCost: 0 })], ctx);
      expect(entry.card).toEqual({ mp: 0, effect: "Pauses the clock for 15 minutes", reason: null });
    });
  });

  describe("castBattlePower", () => {
    it("names the caster, runs the effect and charges MP", () => {
      const stop = power("Stop");
      const [entry] = battlePowers([stop], ctx);

      const out = castBattlePower(stop, ctx);
      expect(out).toEqual({ ok: true, line: "Max casts Stop! Time stands still for 15 minutes!", sound: "select" });
      expect(service.freezeClock).toHaveBeenCalledWith(CHRONOS_FREEZE_MS);
      expect(mpNow()).toBe(100 - entry.card.mp);
      expect(ctx.usedThisFight.has("time-stop")).toBe(true);
    });

    it("charges the class-discounted bill, not the list price", () => {
      (hero() as any).jobClass = "Mage";
      castBattlePower(power("Stop"), ctx);
      expect(mpNow()).toBe(100 - 18);
    });

    it("the caster is the nickname, else the first name, else a nameless hero reads \"You cast\"", () => {
      const slow = power("Slow");
      expect(castBattlePower(slow, ctx).line).toBe("Max casts Slow! Ice creeps over the clock: +10 minutes!");

      setActivePinia(createPinia());
      addHero(100, { first: "Maxine" });
      expect(castBattlePower(slow, ctx).line).toBe("Maxine casts Slow! Ice creeps over the clock: +10 minutes!");

      setActivePinia(createPinia());
      addHero(100, {});
      expect(castBattlePower(slow, ctx).line).toBe("You cast Slow! Ice creeps over the clock: +10 minutes!");
    });

    it("a heal Power heals through the user store", () => {
      (hero() as any).stats.hp.now = 10;
      const out = castBattlePower(power("System Restore", { mpCost: 50 }), ctx);
      expect(out).toEqual({ ok: true, line: "Max casts System Restore! +8 HP", sound: "restoreHP" });
      expect((hero() as any).stats.hp.now).toBe(18);
      expect(mpNow()).toBe(50);
    });

    it("Recall without a chore asks for one and charges nothing; the chore then charges the MP", () => {
      const rewind = power("Rewind", { mpCost: 40 });
      const asked = castBattlePower(rewind, ctx);
      expect(asked).toEqual({ ok: true, line: "Which chore flies back to the board?", sound: "select", needsTaskPick: true });
      expect(service.postponeTask).not.toHaveBeenCalled();
      expect(mpNow()).toBe(100);

      const sent = castBattlePower(rewind, { ...ctx, taskId: "task-1" });
      expect(service.postponeTask).toHaveBeenCalledWith("task-1");
      expect(sent).toEqual({ ok: true, line: "Max casts Rewind! The chore flies back to the board.", sound: "select" });
      expect(mpNow()).toBe(60);
    });

    it("a refused cast charges nothing", () => {
      service.freezeClock.mockReturnValue(false);
      const out = castBattlePower(power("Stop"), ctx);
      expect(out).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
      expect(mpNow()).toBe(100);
      expect(ctx.usedThisFight.size).toBe(0);
    });

    it("refuses without MP, and when the effect was already used this fight, before touching the engine", () => {
      const stop = power("Stop");
      (hero() as any).stats.mp.now = 24;
      expect(castBattlePower(stop, ctx)).toEqual({ ok: false, line: REASON_NO_MP, sound: SOUND_NO });

      (hero() as any).stats.mp.now = 100;
      ctx.usedThisFight.add("time-stop");
      expect(castBattlePower(stop, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });

      expect(service.freezeClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(100);
    });

    it("shares once-per-fight with whatever else cast the effect", () => {
      const stop = power("Stop");
      expect(castBattlePower(stop, ctx).ok).toBe(true);
      expect(castBattlePower(power("Pause", { battleEffect: "time-stop" }), ctx).line).toBe(REASON_USED);
      expect(service.freezeClock).toHaveBeenCalledTimes(1);
    });

    it("a Power with no fight effect, or a bad one, does nothing and costs nothing", () => {
      const out = castBattlePower(power("Quick Save"), ctx);
      expect(out.ok).toBe(false);
      expect(out.sound).toBe(SOUND_NO);
      expect(out.line).toContain("Quick Save");

      expect(castBattlePower(power("Broken", { battleEffect: "lava" as never }), ctx).ok).toBe(false);
      expect(mpNow()).toBe(100);
    });

    it("never calls AbilityService.useAbility, and does not stamp lastUsed", () => {
      const stop = power("Stop");
      castBattlePower(stop, ctx);
      castBattlePower(power("Rewind"), ctx);
      expect(mockUseAbility).not.toHaveBeenCalled();
      expect(stop.lastUsed).toBeUndefined();
    });
  });

  describe("presets", () => {
    const inGame = [...TIME_MAGE_PRESETS, ...TECH_MAGE_PRESETS, ...REAL_LIFE_PRESETS, ...HYBRID_PRESETS].filter(
      (preset) => preset.type === AbilityType.InGame
    );

    it("every in-game preset carries its pick", () => {
      expect(inGame).toHaveLength(9);
      for (const preset of inGame) {
        expect([preset.name, preset.battleEffect]).toEqual([preset.name, PRESET_BATTLE_EFFECTS[preset.name] ?? "none"]);
      }
    });

    it("Quick Save and Quantum Computing stay out of the fight; the real-life privileges have no pick", () => {
      const byName = (name: string) => inGame.find((preset) => preset.name === name);
      expect(byName("Quick Save")?.battleEffect).toBe("none");
      expect(byName("Quantum Computing")?.battleEffect).toBe("none");
      expect(REAL_LIFE_PRESETS.every((preset) => preset.battleEffect === undefined)).toBe(true);
    });
  });
});
