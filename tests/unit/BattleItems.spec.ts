import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import {
  BATTLE_ITEMS,
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  ICE_WAND_MS,
  REASON_NOTHING,
  REASON_NO_MP,
  REASON_USED,
  SOL_FLARE_FACTOR,
  SOUND_HEAL,
  SOUND_ITEM,
  SOUND_NO,
  battleMpCost,
  describeBattleItem,
  useBattleItem,
  type BattleItemContext,
  type BattleItemEngine,
} from "@/lib/services/battle/BattleItems";

/**
 * Every row of the battle item table, against a mocked engine: the right engine call, the MP spent, the
 * line and the sound, plus the refusals (not enough MP, once per fight, "does nothing here"). The user store
 * is real; only what it writes to disk is faked.
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

// What a profile stores: plain copies of the catalogue, no functions
const stored = (name: string, faIcon: string, desc = "") => ({ name, faIcon, desc });
const ICE_WAND = stored("Ice Wand", "wand-magic ice", "50MP | Freeze distractions in their tracks.");
const CHRONOS = stored("Chronos' Clock", "flux-capacitor", "100MP | Manipulate time itself!");
const HAMMER = stored("Thor's Hammer", "hammer-war", "60MP | A mighty hammer.");
const ARROW = stored("Silver Arrow", "bow-arrow", "25MP | A precise magical arrow.");
const FLARE = stored("Sol's Flare", "flame", "100MP | Unleash the power of the sun!");
const FIRE_WAND = stored("Fire Wand", "wand-magic fire", "50MP | Channel fire magic.");
const BOTTLES = stored("Bottles", "flask-potion", "Store and access your potions and ethers.");
const LANTERN = stored("Lantern", "flashlight", "5MP | Illuminate dark areas.");
const BOMBS = stored("Bombs", "bomb", "40MP | Blast through tough obstacles!");
const QUESTS = stored("My Quests", "staff quest", "5HP | View and manage all your active quests.");

type Engine = { [K in keyof BattleItemEngine]: jest.Mock };

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

describe("BattleItems", () => {
  let service: Engine;
  let ctx: BattleItemContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero(300);
    service = mockEngine();
    ctx = { userId: HERO_ID, service, usedThisFight: new Set<string>() };
  });

  describe("MP costs", () => {
    it("read the number the description starts with, else the contract's table", () => {
      expect(battleMpCost(ICE_WAND)).toBe(50);
      expect(battleMpCost(stored("Ice Wand", "wand-magic ice"))).toBe(50);
      expect(battleMpCost(stored("Thor's Hammer", "hammer-war"))).toBe(60);
      expect(battleMpCost(BOTTLES)).toBe(0);
      expect(battleMpCost(stored("Pegasus Boots", "boot"))).toBe(0);
    });

    it("the table matches the contract", () => {
      expect(Object.entries(BATTLE_ITEMS).map(([name, rule]) => [name, rule.mp])).toEqual([
        ["Ice Wand", 50],
        ["Chronos' Clock", 100],
        ["Thor's Hammer", 60],
        ["Silver Arrow", 25],
        ["Sol's Flare", 100],
        ["Fire Wand", 50],
        ["Bottles", 0],
      ]);
    });
  });

  describe("Ice Wand", () => {
    it("adds 10 minutes to the clock for 50 MP", () => {
      const out = useBattleItem(ICE_WAND, ctx);
      expect(service.extendClock).toHaveBeenCalledWith(ICE_WAND_MS);
      expect(out).toEqual({ ok: true, line: "Ice creeps over the clock: +10 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(250);
    });

    it("can be used again and again while the MP lasts", () => {
      useBattleItem(ICE_WAND, ctx);
      expect(useBattleItem(ICE_WAND, ctx).ok).toBe(true);
      expect(describeBattleItem(ICE_WAND, ctx)?.reason).toBeNull();
      expect(mpNow()).toBe(200);
    });

    it("spends nothing when the clock is not running", () => {
      service.extendClock.mockReturnValue(false);
      expect(useBattleItem(ICE_WAND, ctx)).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
      expect(mpNow()).toBe(300);
    });
  });

  describe("Chronos' Clock", () => {
    it("freezes the clock for 15 minutes for 100 MP, once per fight", () => {
      const out = useBattleItem(CHRONOS, ctx);
      expect(service.freezeClock).toHaveBeenCalledWith(CHRONOS_FREEZE_MS);
      expect(out).toEqual({ ok: true, line: "Time stands still for 15 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(200);
      expect(ctx.usedThisFight.has("Chronos' Clock")).toBe(true);

      expect(useBattleItem(CHRONOS, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(service.freezeClock).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(200);
      expect(describeBattleItem(CHRONOS, ctx)?.reason).toBe(REASON_USED);
    });
  });

  describe("Thor's Hammer", () => {
    it("stuns the beast so it skips its next strike, for 60 MP", () => {
      const out = useBattleItem(HAMMER, ctx);
      expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ ok: true, line: "Socktopus is stunned! It will miss its next strike.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(240);
    });
  });

  describe("Silver Arrow", () => {
    it("asks for a chore first, without spending anything", () => {
      const out = useBattleItem(ARROW, ctx);
      expect(out.needsTaskPick).toBe(true);
      expect(out.ok).toBe(true);
      expect(service.postponeTask).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);
    });

    it("then sends the picked chore back to the board for 25 MP", () => {
      const out = useBattleItem(ARROW, { ...ctx, taskId: "t2" });
      expect(service.postponeTask).toHaveBeenCalledWith("t2");
      expect(out).toEqual({ ok: true, line: "The chore flies back to the board.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(275);
    });

    it("keeps the MP when the engine refuses (the last open chore)", () => {
      service.postponeTask.mockReturnValue(null);
      const out = useBattleItem(ARROW, { ...ctx, taskId: "t2" });
      expect(out).toEqual({ ok: false, line: "The last chore cannot fly away.", sound: SOUND_NO });
      expect(mpNow()).toBe(300);
    });
  });

  describe("Sol's Flare", () => {
    it("halves the beast's attack for 100 MP, once per fight", () => {
      const out = useBattleItem(FLARE, ctx);
      expect(service.weakenEnemy).toHaveBeenCalledWith(SOL_FLARE_FACTOR);
      expect(out).toEqual({ ok: true, line: "The sun blazes! Socktopus's attack is halved.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(200);
      expect(useBattleItem(FLARE, ctx).line).toBe(REASON_USED);
      expect(service.weakenEnemy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Fire Wand", () => {
    it("makes every chore earn 1.5x the minutes for 50 MP, once per fight", () => {
      const out = useBattleItem(FIRE_WAND, ctx);
      expect(service.scaleCooldown).toHaveBeenCalledWith(FIRE_WAND_FACTOR);
      expect(out).toEqual({ ok: true, line: "The fuse burns slow: every chore earns 1.5x the minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(250);
      expect(useBattleItem(FIRE_WAND, ctx).line).toBe(REASON_USED);
      expect(service.scaleCooldown).toHaveBeenCalledTimes(1);
    });
  });

  describe("Bottles", () => {
    it("heal 25% of max HP for no MP, once per fight", () => {
      useUserStore().updateUserHP({ userId: HERO_ID, amount: -20 });
      const out = useBattleItem(BOTTLES, ctx);
      expect(out).toEqual({ ok: true, line: "You drink from the bottles: +8 HP", sound: SOUND_HEAL });
      expect(hpNow()).toBe(18);
      expect(mpNow()).toBe(300);
      expect(useBattleItem(BOTTLES, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(hpNow()).toBe(18);
    });

    it("never heal past the maximum and are not spent on a full hero", () => {
      expect(useBattleItem(BOTTLES, ctx)).toEqual({ ok: false, line: "No need for a swig. Your HP is full.", sound: SOUND_NO });
      expect(ctx.usedThisFight.has("Bottles")).toBe(false);

      useUserStore().updateUserHP({ userId: HERO_ID, amount: -3 });
      expect(useBattleItem(BOTTLES, ctx).line).toBe("You drink from the bottles: +3 HP");
      expect(hpNow()).toBe(30);
    });
  });

  describe("everything else", () => {
    it.each([LANTERN, BOMBS, QUESTS, stored("Pegasus Boots", "boot"), stored("Gale's Wind", "wind", "300MP | Summon a wind.")])(
      "$name does nothing here and costs nothing",
      (item) => {
        const out = useBattleItem(item, ctx);
        expect(out.ok).toBe(false);
        expect(out.line).toBe(`${item.name}: ${REASON_NOTHING}`);
        expect(out.sound).toBe(SOUND_NO);
        expect(mpNow()).toBe(300);
        expect(describeBattleItem(item, ctx)).toEqual({
          name: item.name,
          faIcon: item.faIcon,
          mp: 0,
          effect: REASON_NOTHING,
          reason: REASON_NOTHING,
        });
      },
    );

    it("a nameless item does nothing", () => {
      expect(useBattleItem({}, ctx).ok).toBe(false);
      expect(describeBattleItem(null, ctx)).toBeNull();
      expect(describeBattleItem({ faIcon: "boot" }, ctx)).toBeNull();
    });
  });

  describe("not enough MP", () => {
    it("refuses before touching the engine and shows the reason on the sheet", () => {
      setActivePinia(createPinia());
      addHero(40);
      expect(useBattleItem(ICE_WAND, ctx)).toEqual({ ok: false, line: REASON_NO_MP, sound: SOUND_NO });
      expect(service.extendClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(40);
      expect(describeBattleItem(ICE_WAND, ctx)).toEqual({
        name: "Ice Wand",
        faIcon: "wand-magic ice",
        mp: 50,
        effect: "+10 minutes on the clock",
        reason: REASON_NO_MP,
      });
      // The arrow costs 25: still within reach
      expect(describeBattleItem(ARROW, ctx)?.reason).toBeNull();
      expect(describeBattleItem(BOTTLES, ctx)?.reason).toBeNull();
    });
  });
});
