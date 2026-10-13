import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import type { BattleEffectId } from "@/lib/services/battle/BattleEffects";
import { unlockHintOf } from "@/lib/services/quests/ItemEffects";
import {
  BATTLE_ITEMS,
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  ICE_WAND_MS,
  REASON_NOTHING,
  REASON_NO_MP,
  REASON_USED,
  SOL_FLARE_FACTOR,
  SOUND_ITEM,
  SOUND_NO,
  battleBagRole,
  battleMpCost,
  describeBattleItem,
  heroMpCost,
  useBattleItem,
  type BattleItemContext,
  type BattleItemEngine,
} from "@/lib/services/battle/BattleItems";

/**
 * Every row of the battle item table, against a mocked engine: the right engine call, the MP spent, the
 * line and the sound, plus the refusals (locked, not enough MP, once per fight, "can't use that in a fight")
 * and the bag roles (effect items, the potion and Power containers). The user store is real; only what it
 * writes to disk is faked.
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
const GOODS = stored("Goods", "backpack", "View all items you've collected on your journey.");
const BOOK = stored("Book Of Spells", "book-spells", "Access your magical abilities.");
const LANTERN = stored("Lantern", "flashlight", "5MP | Illuminate dark areas.");
const BOMBS = stored("Bombs", "bomb", "40MP | Blast through tough obstacles!");
const QUESTS = stored("My Quests", "staff quest", "5HP | View and manage all your active quests.");

type Engine = { [K in keyof BattleItemEngine]: jest.Mock };

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

describe("BattleItems", () => {
  let service: Engine;
  let ctx: BattleItemContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero(300);
    service = mockEngine();
    ctx = { userId: HERO_ID, service, usedThisFight: new Set<BattleEffectId>() };
  });

  describe("MP costs", () => {
    it("come from the rules table by name, whatever the stored description says", () => {
      expect(battleMpCost(ICE_WAND)).toBe(10);
      expect(battleMpCost(stored("Ice Wand", "wand-magic ice"))).toBe(10);
      expect(battleMpCost(stored("Thor's Hammer", "hammer-war"))).toBe(15);
      expect(battleMpCost(CHRONOS)).toBe(20);
      expect(battleMpCost(BOTTLES)).toBe(0);
      expect(battleMpCost(stored("Pegasus Boots", "boot"))).toBe(0);
    });

    it("a Mage pays 25% less and a Sage half; the list price itself does not move", () => {
      (useUserStore().getUserById(HERO_ID) as any).jobClass = "Mage";
      expect(battleMpCost(CHRONOS)).toBe(20);
      expect(heroMpCost(CHRONOS, HERO_ID)).toBe(15);
      expect(describeBattleItem(CHRONOS, ctx)?.mp).toBe(15);
      useBattleItem(CHRONOS, ctx);
      expect(mpNow()).toBe(285);

      (useUserStore().getUserById(HERO_ID) as any).jobClass = "Sage";
      expect(heroMpCost(ICE_WAND, HERO_ID)).toBe(5);
      expect(heroMpCost(BOTTLES, HERO_ID)).toBe(0);
      expect(heroMpCost(CHRONOS, "nobody")).toBe(20);
    });

    it("the discount is taken before the MP check, so a Mage with 20 MP can loose a 25 MP arrow", () => {
      (useUserStore().getUserById(HERO_ID) as any).jobClass = "Mage";
      (useUserStore().getUserById(HERO_ID) as any).stats.mp.now = 20;
      expect(describeBattleItem(ARROW, ctx)?.reason).toBeNull();
      expect(useBattleItem(ARROW, ctx).ok).toBe(true);
      expect(mpNow()).toBe(2);
      expect(describeBattleItem(ARROW, { ...ctx, usedThisFight: new Set<BattleEffectId>() })?.reason).toBe(REASON_NO_MP);
    });

    it("the table matches the contract", () => {
      expect(Object.entries(BATTLE_ITEMS).map(([name, rule]) => [name, rule.mp, rule.effect])).toEqual([
        ["Ice Wand", 50, "frost"],
        ["Chronos' Clock", 100, "time-stop"],
        ["Thor's Hammer", 60, "stun"],
        ["Silver Arrow", 25, "pin"],
        ["Sol's Flare", 100, "weaken"],
        ["Fire Wand", 50, "kindle"],
      ]);
    });
  });

  describe("Ice Wand", () => {
    it("adds 10 minutes to the clock for 10 MP", () => {
      const out = useBattleItem(ICE_WAND, ctx);
      expect(service.extendClock).toHaveBeenCalledWith(ICE_WAND_MS);
      expect(out).toEqual({ ok: true, line: "Ice creeps over the clock: +10 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(290);
    });

    it("works once per fight", () => {
      useBattleItem(ICE_WAND, ctx);
      expect(useBattleItem(ICE_WAND, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(describeBattleItem(ICE_WAND, ctx)?.reason).toBe(REASON_USED);
      expect(service.extendClock).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(290);
    });

    it("spends nothing when the clock is not running", () => {
      service.extendClock.mockReturnValue(false);
      expect(useBattleItem(ICE_WAND, ctx)).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
      expect(mpNow()).toBe(300);
    });
  });

  describe("Chronos' Clock", () => {
    it("freezes the clock for 15 minutes for 20 MP, once per fight", () => {
      const out = useBattleItem(CHRONOS, ctx);
      expect(service.freezeClock).toHaveBeenCalledWith(CHRONOS_FREEZE_MS);
      expect(out).toEqual({ ok: true, line: "Time stands still for 15 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(280);
      expect(ctx.usedThisFight.has("time-stop")).toBe(true);

      expect(useBattleItem(CHRONOS, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(service.freezeClock).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(280);
      expect(describeBattleItem(CHRONOS, ctx)?.reason).toBe(REASON_USED);
    });
  });

  describe("Thor's Hammer", () => {
    it("stuns the beast so it skips its next strike, for 15 MP", () => {
      const out = useBattleItem(HAMMER, ctx);
      expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ ok: true, line: "Socktopus is stunned! It will miss its next strike.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(285);
    });
  });

  describe("Silver Arrow", () => {
    it("pins the beast so it misses its next two strikes, for 25 MP", () => {
      const out = useBattleItem(ARROW, ctx);
      expect(service.skipNextStrike).toHaveBeenCalledTimes(2);
      expect(out).toEqual({ ok: true, line: "Socktopus is pinned! It will miss its next two strikes.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(275);
    });
  });

  describe("Sol's Flare", () => {
    it("halves the beast's attack for 20 MP, once per fight", () => {
      const out = useBattleItem(FLARE, ctx);
      expect(service.weakenEnemy).toHaveBeenCalledWith(SOL_FLARE_FACTOR);
      expect(out).toEqual({ ok: true, line: "The sun blazes! Socktopus's attack is halved.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(280);
      expect(useBattleItem(FLARE, ctx).line).toBe(REASON_USED);
      expect(service.weakenEnemy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Fire Wand", () => {
    it("makes every chore earn 1.5x the minutes for 10 MP, once per fight", () => {
      const out = useBattleItem(FIRE_WAND, ctx);
      expect(service.scaleCooldown).toHaveBeenCalledWith(FIRE_WAND_FACTOR);
      expect(out).toEqual({ ok: true, line: "The fuse burns slow: every chore earns 1.5x the minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(290);
      expect(useBattleItem(FIRE_WAND, ctx).line).toBe(REASON_USED);
      expect(service.scaleCooldown).toHaveBeenCalledTimes(1);
    });
  });

  describe("everything else", () => {
    it.each([LANTERN, BOMBS, QUESTS, stored("Pegasus Boots", "boot"), stored("Gale's Wind", "wind", "300MP | Summon a wind.")])(
      "$name does nothing here and costs nothing",
      (item) => {
        expect(REASON_NOTHING).toBe("Can't use that in a fight.");
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
      addHero(15);
      expect(useBattleItem(CHRONOS, ctx)).toEqual({ ok: false, line: REASON_NO_MP, sound: SOUND_NO });
      expect(service.freezeClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(15);
      expect(describeBattleItem(CHRONOS, ctx)).toEqual({
        name: "Chronos' Clock",
        faIcon: "flux-capacitor",
        mp: 20,
        effect: "Pauses the clock for 15 minutes",
        reason: REASON_NO_MP,
      });
      // The Ice Wand costs 10: still within reach
      expect(describeBattleItem(ICE_WAND, ctx)?.reason).toBeNull();
      expect(describeBattleItem(BOTTLES, ctx)?.reason).toBeNull();
    });
  });

  describe("the bag", () => {
    it("battleBagRole sorts the bag", () => {
      expect(battleBagRole(ICE_WAND)).toBe("effect");
      expect(battleBagRole(BOTTLES)).toBe("potions");
      expect(battleBagRole(GOODS)).toBe("potions");
      expect(battleBagRole(BOOK)).toBe("powers");
      expect(battleBagRole(LANTERN)).toBe("none");
      expect(battleBagRole(null)).toBe("none");
      // Containers are matched whatever the case
      expect(battleBagRole(stored("BOTTLES", "flask-potion"))).toBe("potions");
      expect(battleBagRole(stored("book of spells", "book-spells"))).toBe("powers");
    });

    it("a locked item says how to earn it", () => {
      (useUserStore().getUserById(HERO_ID) as any).unlockedItems = [];
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBe(unlockHintOf("Thor's Hammer"));
      expect(useBattleItem(HAMMER, ctx)).toEqual({ ok: false, line: unlockHintOf("Thor's Hammer"), sound: SOUND_NO });
      expect(service.skipNextStrike).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);

      // Unlocked but not in a hand: any bag item works in a fight
      (useUserStore().getUserById(HERO_ID) as any).unlockedItems = ["Thor's Hammer"];
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBeNull();
      expect(useBattleItem(HAMMER, ctx).ok).toBe(true);
    });

    it("containers carry no reason and no MP", () => {
      expect(describeBattleItem(BOTTLES, ctx)).toEqual({
        name: "Bottles",
        faIcon: "flask-potion",
        mp: 0,
        effect: "Your potions",
        reason: null,
      });
      expect(describeBattleItem(GOODS, ctx)).toMatchObject({ mp: 0, effect: "Your potions", reason: null });
      expect(describeBattleItem(BOOK, ctx)).toMatchObject({ mp: 0, effect: "Your Powers", reason: null });
    });

    it("Chronos' Clock and Time Stop share one use", () => {
      ctx.usedThisFight = new Set<BattleEffectId>(["time-stop"]);
      expect(describeBattleItem(CHRONOS, ctx)?.reason).toBe(REASON_USED);
      expect(useBattleItem(CHRONOS, ctx)).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(service.freezeClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);
    });
  });
});
