import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import {
  BATTLE_EFFECTS,
  BATTLE_EFFECT_IDS,
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  ICE_WAND_MS,
  REASON_HP_FULL,
  REASON_USED,
  SOL_FLARE_FACTOR,
  SOUND_HEAL,
  SOUND_ITEM,
  SOUND_NO,
  applyBattleEffect,
  battleEffectBlocked,
  isBattleEffectId,
  type BattleEffectContext,
  type BattleEffectEngine,
  type BattleEffectId,
} from "@/lib/services/battle/BattleEffects";

/**
 * The shared fight effects that items and Powers both point at, against a mocked engine: the right engine
 * call, the line and the sound, once-per-fight per effect, and the refusals that change nothing. MP is never
 * touched here (the caller charges it). The user store is real; only what it writes to disk is faked.
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

const addHero = (mp: number, hp = { now: 30, max: 30 }) => {
  useUserStore().addUser({
    id: HERO_ID,
    name: { nick: "Max" },
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
const hpNow = () => (useUserStore().getUserById(HERO_ID) as any).stats.hp.now as number;

describe("BattleEffects", () => {
  let service: Engine;
  let ctx: BattleEffectContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero(300);
    service = mockEngine();
    ctx = { userId: HERO_ID, service, usedThisFight: new Set<BattleEffectId>() };
  });

  it("the table matches the spec", () => {
    expect(BATTLE_EFFECT_IDS).toEqual(["frost", "time-stop", "stun", "recall", "weaken", "kindle", "heal"]);
    expect(BATTLE_EFFECT_IDS.map((id) => [BATTLE_EFFECTS[id].id, BATTLE_EFFECTS[id].label, BATTLE_EFFECTS[id].oncePerFight])).toEqual([
      ["frost", "+10 minutes on the clock", false],
      ["time-stop", "Pauses the clock for 15 minutes", true],
      ["stun", "The beast skips its next strike", false],
      ["recall", "Sends one chore back to the board", false],
      ["weaken", "Halves the beast's attack", true],
      ["kindle", "Chores earn 1.5x the minutes", true],
      ["heal", "Heals 25% of max HP", true],
    ]);
  });

  it("isBattleEffectId knows the seven ids and nothing else", () => {
    expect(BATTLE_EFFECT_IDS.every((id) => isBattleEffectId(id))).toBe(true);
    expect(isBattleEffectId("none")).toBe(false);
    expect(isBattleEffectId("Frost")).toBe(false);
    expect(isBattleEffectId(undefined)).toBe(false);
    expect(isBattleEffectId(3)).toBe(false);
  });

  it("frost adds ten minutes and can be used again", () => {
    const out = applyBattleEffect("frost", ctx);
    expect(service.extendClock).toHaveBeenCalledWith(600000);
    expect(ICE_WAND_MS).toBe(600000);
    expect(out).toEqual({ ok: true, line: "Ice creeps over the clock: +10 minutes!", sound: SOUND_ITEM });
    expect(ctx.usedThisFight.has("frost")).toBe(false);
    expect(battleEffectBlocked("frost", ctx)).toBeNull();
    expect(applyBattleEffect("frost", ctx).ok).toBe(true);
  });

  it("time-stop pauses fifteen minutes once per fight", () => {
    const out = applyBattleEffect("time-stop", ctx);
    expect(service.freezeClock).toHaveBeenCalledWith(900000);
    expect(CHRONOS_FREEZE_MS).toBe(900000);
    expect(out).toEqual({ ok: true, line: "Time stands still for 15 minutes!", sound: SOUND_ITEM });
    expect(ctx.usedThisFight.has("time-stop")).toBe(true);

    expect(battleEffectBlocked("time-stop", ctx)).toBe(REASON_USED);
    expect(applyBattleEffect("time-stop", ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
    expect(service.freezeClock).toHaveBeenCalledTimes(1);
  });

  it("stun names the beast", () => {
    const out = applyBattleEffect("stun", ctx);
    expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ ok: true, line: "Socktopus is stunned! It will miss its next strike.", sound: SOUND_ITEM });
    expect(ctx.usedThisFight.has("stun")).toBe(false);

    service.getCurrentEnemy.mockReturnValue(null);
    expect(applyBattleEffect("stun", ctx).line).toBe("The beast is stunned! It will miss its next strike.");
  });

  it("recall without a chore asks for one and changes nothing", () => {
    const out = applyBattleEffect("recall", ctx);
    expect(out).toEqual({ ok: true, needsTaskPick: true, line: "Which chore flies back to the board?", sound: SOUND_ITEM });
    expect(service.postponeTask).not.toHaveBeenCalled();
    expect(ctx.usedThisFight.size).toBe(0);
  });

  it("recall with a chore sends it back", () => {
    const out = applyBattleEffect("recall", { ...ctx, taskId: "t1" });
    expect(service.postponeTask).toHaveBeenCalledWith("t1");
    expect(out).toEqual({ ok: true, line: "The chore flies back to the board.", sound: SOUND_ITEM });

    service.postponeTask.mockReturnValue(null);
    expect(applyBattleEffect("recall", { ...ctx, taskId: "t2" })).toEqual({
      ok: false,
      line: "The last chore cannot fly away.",
      sound: SOUND_NO,
    });
  });

  it("weaken halves the attack once per fight", () => {
    const out = applyBattleEffect("weaken", ctx);
    expect(service.weakenEnemy).toHaveBeenCalledWith(0.5);
    expect(SOL_FLARE_FACTOR).toBe(0.5);
    expect(out).toEqual({ ok: true, line: "The sun blazes! Socktopus's attack is halved.", sound: SOUND_ITEM });
    expect(applyBattleEffect("weaken", ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
    expect(service.weakenEnemy).toHaveBeenCalledTimes(1);
  });

  it("kindle scales the clock once per fight", () => {
    const out = applyBattleEffect("kindle", ctx);
    expect(service.scaleCooldown).toHaveBeenCalledWith(1.5);
    expect(FIRE_WAND_FACTOR).toBe(1.5);
    expect(out).toEqual({ ok: true, line: "The fuse burns slow: every chore earns 1.5x the minutes!", sound: SOUND_ITEM });
    expect(applyBattleEffect("kindle", ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
    expect(service.scaleCooldown).toHaveBeenCalledTimes(1);
  });

  it("heal restores a quarter of max HP and refuses at full", () => {
    setActivePinia(createPinia());
    addHero(300, { now: 10, max: 100 });
    expect(battleEffectBlocked("heal", ctx)).toBeNull();
    expect(applyBattleEffect("heal", ctx)).toEqual({ ok: true, line: "+25 HP", sound: SOUND_HEAL });
    expect(hpNow()).toBe(35);
    expect(ctx.usedThisFight.has("heal")).toBe(true);

    setActivePinia(createPinia());
    addHero(300, { now: 100, max: 100 });
    const fresh: BattleEffectContext = { ...ctx, usedThisFight: new Set<BattleEffectId>() };
    expect(REASON_HP_FULL).toBe("Your HP is full.");
    expect(battleEffectBlocked("heal", fresh)).toBe("Your HP is full.");
    expect(applyBattleEffect("heal", fresh)).toEqual({ ok: false, line: "Your HP is full.", sound: SOUND_NO });
    expect(hpNow()).toBe(100);
    expect(fresh.usedThisFight.has("heal")).toBe(false);
  });

  it("heal never goes past the maximum", () => {
    setActivePinia(createPinia());
    addHero(300, { now: 97, max: 100 });
    expect(applyBattleEffect("heal", ctx).line).toBe("+3 HP");
    expect(hpNow()).toBe(100);
  });

  it("a stopped clock refuses frost and time-stop", () => {
    service.extendClock.mockReturnValue(false);
    service.freezeClock.mockReturnValue(false);
    expect(applyBattleEffect("frost", ctx)).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
    expect(applyBattleEffect("time-stop", ctx)).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
    expect(ctx.usedThisFight.has("time-stop")).toBe(false);
    expect(ctx.usedThisFight.size).toBe(0);
  });

  it("applyBattleEffect never touches MP", () => {
    setActivePinia(createPinia());
    addHero(120, { now: 10, max: 100 });
    for (const effect of BATTLE_EFFECT_IDS) {
      applyBattleEffect(effect, { ...ctx, taskId: "t1" });
      expect(mpNow()).toBe(120);
    }
    expect(hpNow()).toBe(35);
  });
});
