import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import {
  BATTLE_EFFECTS,
  BATTLE_EFFECT_IDS,
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  ICE_WAND_MS,
  REASON_HP_FULL,
  REASON_STRIKE_WAITING,
  REASON_USED,
  SOL_FLARE_FACTOR,
  SOUND_HEAL,
  SOUND_ITEM,
  SOUND_NO,
  applyBattleEffect,
  battleEffectBlocked,
  isBattleEffectId,
  normalizeBattleEffect,
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
  weakenEnemy: jest.fn().mockReturnValue(5),
  scaleCooldown: jest.fn().mockReturnValue(1.5),
  refillClock: jest.fn().mockReturnValue(true),
  vanishNextRun: jest.fn(),
  hasPendingDamage: jest.fn().mockReturnValue(false),
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

  it("lists the effects in dropdown order", () => {
    expect(BATTLE_EFFECT_IDS).toEqual(["frost", "time-stop", "kindle", "gust", "stun", "pin", "weaken", "vanish", "charge", "moonlight", "heal"]);
    expect(BATTLE_EFFECT_IDS.every((id) => BATTLE_EFFECTS[id].id === id)).toBe(true);
  });

  it.each([
    ["frost", "+10 minutes on the clock"],
    ["time-stop", "Pauses the clock for 15 minutes"],
    ["kindle", "Chores earn 1.5x the minutes"],
    ["gust", "Refills the clock to full"],
    ["stun", "The beast misses its next strike"],
    ["pin", "The beast misses its next two strikes"],
    ["weaken", "Halves the beast's attack"],
    ["vanish", "Run away with no parting strike"],
    ["charge", "Chores give back double MP"],
    ["moonlight", "Each chore heals 5% of max HP"],
    ["heal", "Heals 25% of max HP"],
  ])("labels %s", (id, label) => expect(BATTLE_EFFECTS[id as BattleEffectId].label).toBe(label));

  it("makes every effect once per fight", () => {
    expect(BATTLE_EFFECT_IDS.every((id) => BATTLE_EFFECTS[id].oncePerFight)).toBe(true);
  });

  it("isBattleEffectId knows the eleven ids and nothing else", () => {
    expect(BATTLE_EFFECT_IDS).toHaveLength(11);
    expect(BATTLE_EFFECT_IDS.every((id) => isBattleEffectId(id))).toBe(true);
    expect(isBattleEffectId("none")).toBe(false);
    expect(isBattleEffectId("Frost")).toBe(false);
    expect(isBattleEffectId(undefined)).toBe(false);
    expect(isBattleEffectId(3)).toBe(false);
  });

  it("reads a stored recall as gust", () => {
    expect(normalizeBattleEffect("recall")).toBe("gust");
    expect(normalizeBattleEffect("nope")).toBeNull();
    expect(isBattleEffectId("recall")).toBe(false);
    expect(BATTLE_EFFECT_IDS.every((id) => normalizeBattleEffect(id) === id)).toBe(true);
    expect(normalizeBattleEffect(undefined)).toBeNull();
    expect(normalizeBattleEffect("none")).toBeNull();
  });

  it("frost adds ten minutes once per fight", () => {
    const out = applyBattleEffect("frost", ctx);
    expect(service.extendClock).toHaveBeenCalledWith(600000);
    expect(ICE_WAND_MS).toBe(600000);
    expect(out).toEqual({ ok: true, line: "Ice creeps over the clock: +10 minutes!", sound: SOUND_ITEM });
    expect(ctx.usedThisFight.has("frost")).toBe(true);
    expect(battleEffectBlocked("frost", ctx)).toBe(REASON_USED);
    expect(applyBattleEffect("frost", ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
    expect(service.extendClock).toHaveBeenCalledTimes(1);
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
    expect(ctx.usedThisFight.has("stun")).toBe(true);

    service.getCurrentEnemy.mockReturnValue(null);
    const fresh: BattleEffectContext = { ...ctx, usedThisFight: new Set<BattleEffectId>() };
    expect(applyBattleEffect("stun", fresh).line).toBe("The beast is stunned! It will miss its next strike.");
  });

  it("refuses a second stun in the same fight", () => {
    applyBattleEffect("stun", ctx);
    expect(applyBattleEffect("stun", ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
    expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
  });

  it("gust refills the clock", () => {
    expect(applyBattleEffect("gust", ctx)).toEqual({ ok: true, line: "A gust blows the beast back: the clock is full again!", sound: SOUND_ITEM });
    expect(service.refillClock).toHaveBeenCalledTimes(1);
    expect(ctx.usedThisFight.has("gust")).toBe(true);
  });

  it("gust refuses a stopped clock and stays unspent", () => {
    service.refillClock.mockReturnValue(false);
    expect(applyBattleEffect("gust", ctx)).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
    expect(ctx.usedThisFight.has("gust")).toBe(false);
  });

  it("pin skips two strikes", () => {
    expect(applyBattleEffect("pin", ctx)).toEqual({ ok: true, line: "Socktopus is pinned! It will miss its next two strikes.", sound: SOUND_ITEM });
    expect(service.skipNextStrike).toHaveBeenCalledTimes(2);
    expect(ctx.usedThisFight.has("pin")).toBe(true);
  });

  it("vanish arms the getaway and asks the page to run", () => {
    const out = applyBattleEffect("vanish", ctx);
    expect(out).toEqual({ ok: true, line: "Max vanishes into the shadows...", sound: SOUND_ITEM, runsAway: true });
    expect(service.vanishNextRun).toHaveBeenCalledTimes(1);
    expect(ctx.usedThisFight.has("vanish")).toBe(true);
  });

  it("vanish names the hero by nickname, else first name, else \"You\"", () => {
    const fresh = (): BattleEffectContext => ({ ...ctx, usedThisFight: new Set<BattleEffectId>() });
    const hero = useUserStore().getUserById(HERO_ID) as any;
    hero.name = { first: "Maxine" };
    expect(applyBattleEffect("vanish", fresh()).line).toBe("Maxine vanishes into the shadows...");
    hero.name = {};
    expect(applyBattleEffect("vanish", fresh()).line).toBe("You vanish into the shadows...");
  });

  it("vanish refuses while a strike is waiting to land", () => {
    service.hasPendingDamage.mockReturnValue(true);
    expect(REASON_STRIKE_WAITING).toBe("A strike is already on its way.");
    expect(battleEffectBlocked("vanish", ctx)).toBe(REASON_STRIKE_WAITING);
    expect(applyBattleEffect("vanish", ctx)).toEqual({ ok: false, line: "A strike is already on its way.", sound: SOUND_NO });
    expect(service.vanishNextRun).not.toHaveBeenCalled();
    expect(ctx.usedThisFight.has("vanish")).toBe(false);
  });

  it.each([
    ["charge", "Lightning crackles: every chore gives back double MP!"],
    ["moonlight", "Moonlight settles on you: every chore heals you!"],
  ])("%s only marks the fight", (id, line) => {
    expect(applyBattleEffect(id as BattleEffectId, ctx)).toEqual({ ok: true, line, sound: SOUND_ITEM });
    expect(ctx.usedThisFight.has(id as BattleEffectId)).toBe(true);
    expect(applyBattleEffect(id as BattleEffectId, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
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
      applyBattleEffect(effect, ctx);
      expect(mpNow()).toBe(120);
    }
    expect(hpNow()).toBe(35);
  });
});
