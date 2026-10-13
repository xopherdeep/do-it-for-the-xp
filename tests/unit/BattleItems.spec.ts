import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import type { BattleEffectId } from "@/lib/services/battle/BattleEffects";
import { ITEM_RULES } from "@/lib/services/items/ItemRules";
import { unlockHintOf } from "@/lib/services/quests/ItemEffects";
import { bombInPack } from "@/lib/services/temples/ItemUse";
import {
  BATTLE_ITEMS,
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  ICE_WAND_MS,
  REASON_NOTHING,
  REASON_NOT_HELD,
  REASON_NO_BOMBS,
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
 * line and the sound, plus the refusals (locked, not held, not enough MP, once per fight, out of bombs, "can't
 * use that in a fight") and the bag roles (effect items, the potion and Power containers). A tool works only
 * from a hand: each case says what the hero holds. The user store is real; only what it writes to disk is faked.
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
const INVISIBILITY = stored("X's Invisibility", "user-secret", "15MP | Slip away unseen.");
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
  /** The fight context with these tools in the hero's hands (the spent set is shared, so a second use sees the first). */
  const held = (...items: { name: string }[]): BattleItemContext => ({ ...ctx, heldItems: items.map((item) => item.name) });

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
      expect(describeBattleItem(CHRONOS, held(CHRONOS))?.mp).toBe(15);
      useBattleItem(CHRONOS, held(CHRONOS));
      expect(mpNow()).toBe(285);

      (useUserStore().getUserById(HERO_ID) as any).jobClass = "Sage";
      expect(heroMpCost(ICE_WAND, HERO_ID)).toBe(5);
      expect(heroMpCost(BOTTLES, HERO_ID)).toBe(0);
      expect(heroMpCost(CHRONOS, "nobody")).toBe(20);
    });

    it("the discount is taken before the MP check, so a Mage with 20 MP can loose a 25 MP arrow", () => {
      (useUserStore().getUserById(HERO_ID) as any).jobClass = "Mage";
      (useUserStore().getUserById(HERO_ID) as any).stats.mp.now = 20;
      expect(describeBattleItem(ARROW, held(ARROW))?.reason).toBeNull();
      expect(useBattleItem(ARROW, held(ARROW)).ok).toBe(true);
      expect(mpNow()).toBe(2);
      expect(describeBattleItem(ARROW, { ...held(ARROW), usedThisFight: new Set<BattleEffectId>() })?.reason).toBe(REASON_NO_MP);
    });

    it("the fight table is the rules table's fight tools, with their price and effect", () => {
      const fightTools = Object.entries(ITEM_RULES).filter(([, rule]) => rule.fight);
      expect(Object.entries(BATTLE_ITEMS).map(([name, rule]) => [name, rule.mp, rule.effect])).toEqual(
        fightTools.map(([name, rule]) => [name, rule.mp, rule.fight]),
      );
      expect(BATTLE_ITEMS["Ice Wand"]).toEqual({ mp: 10, effect: "frost" });
      expect(BATTLE_ITEMS["Chronos' Clock"]).toEqual({ mp: 20, effect: "time-stop" });
      expect(BATTLE_ITEMS["X's Invisibility"]).toEqual({ mp: 15, effect: "vanish" });
      expect(BATTLE_ITEMS.Bombs).toEqual({ mp: 0, effect: "stun" });
    });

    it("a rule at 0 MP costs 0 MP, whatever the stored description says", () => {
      expect(battleMpCost(BOMBS)).toBe(0);
      expect(battleMpCost(stored("Bombs", "bomb"))).toBe(0);
      expect(heroMpCost(BOMBS, HERO_ID)).toBe(0);
    });
  });

  describe("the fight tools", () => {
    it("lists every fight tool", () => {
      expect(Object.keys(BATTLE_ITEMS).sort()).toEqual([
        "Bombs", "Chronos' Clock", "Fire Wand", "Gale's Wind", "Ice Wand", "Night's Light",
        "Silver Arrow", "Sol's Flare", "Tesla's Bolt", "Thor's Hammer", "X's Invisibility",
      ]);
    });

    it("refuses a tool that is not in a hand", () => {
      expect(REASON_NOT_HELD).toBe("Hold it in a hand before a fight.");
      expect(describeBattleItem(HAMMER, { ...ctx, heldItems: ["Ice Wand"] })?.reason).toBe("Hold it in a hand before a fight.");
      expect(useBattleItem(HAMMER, { ...ctx, heldItems: [] })).toEqual({ ok: false, line: "Hold it in a hand before a fight.", sound: SOUND_NO });
      // Nothing held at all is the same as an empty hand list
      expect(useBattleItem(HAMMER, ctx).line).toBe(REASON_NOT_HELD);
      expect(service.skipNextStrike).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);
    });

    it("lets potions and the containers work from the bag", () => {
      (useUserStore().getUserById(HERO_ID) as any).stats.hp.now = 10;
      expect(describeBattleItem(BOTTLES, { ...ctx, heldItems: [] })?.reason).toBeNull();
      expect(describeBattleItem(GOODS, { ...ctx, heldItems: [] })?.reason).toBeNull();
      expect(describeBattleItem(BOOK, { ...ctx, heldItems: [] })?.reason).toBeNull();
      expect(describeBattleItem({ name: "Health Potion" }, { ...ctx, heldItems: [] })?.reason).toBeNull();
    });

    it("charges the table price, not the stored description", () => {
      const before = mpNow();
      useBattleItem({ name: "Ice Wand", desc: "50MP | old text" }, { ...ctx, heldItems: ["Ice Wand"] });
      expect(mpNow()).toBe(before - 10);
    });

    it("spends one Bomb and no MP", () => {
      useUserStore().addInventoryItem(HERO_ID, { name: "Bomb", kind: "consumable", qty: 1 });
      const before = mpNow();
      const out = useBattleItem(BOMBS, { ...ctx, heldItems: ["Bombs"] });
      expect(out).toEqual({ ok: true, line: "Socktopus is stunned! It will miss its next strike.", sound: SOUND_ITEM });
      expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(before);
      expect(bombInPack(HERO_ID)).toBeNull();
    });

    it("spends only one Bomb of a stack", () => {
      useUserStore().addInventoryItem(HERO_ID, { name: "Bomb", kind: "consumable", qty: 3 });
      expect(useBattleItem(BOMBS, held(BOMBS)).ok).toBe(true);
      expect(bombInPack(HERO_ID)?.qty).toBe(2);
    });

    it("says out of bombs with an empty pack and spends nothing", () => {
      expect(REASON_NO_BOMBS).toBe("Out of bombs.");
      expect(describeBattleItem(BOMBS, { ...ctx, heldItems: ["Bombs"] })?.reason).toBe("Out of bombs.");
      expect(useBattleItem(BOMBS, held(BOMBS))).toEqual({ ok: false, line: "Out of bombs.", sound: SOUND_NO });
      expect(service.skipNextStrike).not.toHaveBeenCalled();
      expect(ctx.usedThisFight.has("stun")).toBe(false);
    });

    it("keeps a Bomb when the stun is already spent this fight", () => {
      useUserStore().addInventoryItem(HERO_ID, { name: "Bomb", kind: "consumable", qty: 1 });
      ctx.usedThisFight.add("stun");
      expect(useBattleItem(BOMBS, held(BOMBS))).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(bombInPack(HERO_ID)?.qty).toBe(1);
    });

    it("asks in order: locked, not held, spent this fight, out of bombs, then MP", () => {
      const hero = useUserStore().getUserById(HERO_ID) as any;
      hero.stats.mp.now = 0;
      ctx.usedThisFight.add("stun");
      hero.unlockedItems = [];
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBe(unlockHintOf("Thor's Hammer"));
      hero.unlockedItems = ["Thor's Hammer"];
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBe(REASON_NOT_HELD);
      expect(describeBattleItem(HAMMER, held(HAMMER))?.reason).toBe(REASON_USED);
      // The Bombs: the spent stun speaks before the empty pack, and the empty pack before anything else
      expect(describeBattleItem(BOMBS, held(BOMBS))?.reason).toBe(REASON_USED);
      ctx.usedThisFight.clear();
      expect(describeBattleItem(BOMBS, held(BOMBS))?.reason).toBe(REASON_NO_BOMBS);
      // A hammer with no MP left: held and unspent, so the MP is what stops it
      expect(describeBattleItem(HAMMER, held(HAMMER))?.reason).toBe(REASON_NO_MP);
    });

    it("X's Invisibility waits while a strike is on its way: nothing charged, not marked used", () => {
      service.hasPendingDamage.mockReturnValue(true);
      expect(describeBattleItem(INVISIBILITY, held(INVISIBILITY))?.reason).toBe("A strike is already on its way.");
      expect(useBattleItem(INVISIBILITY, held(INVISIBILITY))).toEqual({
        ok: false,
        line: "A strike is already on its way.",
        sound: SOUND_NO,
      });
      expect(service.vanishNextRun).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);
      expect(ctx.usedThisFight.has("vanish")).toBe(false);

      // The strike lands; the same item now works, once
      service.hasPendingDamage.mockReturnValue(false);
      const out = useBattleItem(INVISIBILITY, held(INVISIBILITY));
      expect(out).toMatchObject({ ok: true, runsAway: true });
      expect(service.vanishNextRun).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(285);
      expect(ctx.usedThisFight.has("vanish")).toBe(true);
    });
  });

  describe("Ice Wand", () => {
    it("adds 10 minutes to the clock for 10 MP", () => {
      const out = useBattleItem(ICE_WAND, held(ICE_WAND));
      expect(service.extendClock).toHaveBeenCalledWith(ICE_WAND_MS);
      expect(out).toEqual({ ok: true, line: "Ice creeps over the clock: +10 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(290);
    });

    it("works once per fight", () => {
      useBattleItem(ICE_WAND, held(ICE_WAND));
      expect(useBattleItem(ICE_WAND, held(ICE_WAND))).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(describeBattleItem(ICE_WAND, held(ICE_WAND))?.reason).toBe(REASON_USED);
      expect(service.extendClock).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(290);
    });

    it("spends nothing when the clock is not running", () => {
      service.extendClock.mockReturnValue(false);
      expect(useBattleItem(ICE_WAND, held(ICE_WAND))).toEqual({ ok: false, line: "The clock is not running.", sound: SOUND_NO });
      expect(mpNow()).toBe(300);
    });
  });

  describe("Chronos' Clock", () => {
    it("freezes the clock for 15 minutes for 20 MP, once per fight", () => {
      const out = useBattleItem(CHRONOS, held(CHRONOS));
      expect(service.freezeClock).toHaveBeenCalledWith(CHRONOS_FREEZE_MS);
      expect(out).toEqual({ ok: true, line: "Time stands still for 15 minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(280);
      expect(ctx.usedThisFight.has("time-stop")).toBe(true);

      expect(useBattleItem(CHRONOS, held(CHRONOS))).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(service.freezeClock).toHaveBeenCalledTimes(1);
      expect(mpNow()).toBe(280);
      expect(describeBattleItem(CHRONOS, held(CHRONOS))?.reason).toBe(REASON_USED);
    });
  });

  describe("Thor's Hammer", () => {
    it("stuns the beast so it skips its next strike, for 15 MP", () => {
      const out = useBattleItem(HAMMER, held(HAMMER));
      expect(service.skipNextStrike).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ ok: true, line: "Socktopus is stunned! It will miss its next strike.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(285);
    });
  });

  describe("Silver Arrow", () => {
    it("pins the beast so it misses its next two strikes, for 25 MP", () => {
      const out = useBattleItem(ARROW, held(ARROW));
      expect(service.skipNextStrike).toHaveBeenCalledTimes(2);
      expect(out).toEqual({ ok: true, line: "Socktopus is pinned! It will miss its next two strikes.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(275);
    });
  });

  describe("Sol's Flare", () => {
    it("halves the beast's attack for 20 MP, once per fight", () => {
      const out = useBattleItem(FLARE, held(FLARE));
      expect(service.weakenEnemy).toHaveBeenCalledWith(SOL_FLARE_FACTOR);
      expect(out).toEqual({ ok: true, line: "The sun blazes! Socktopus's attack is halved.", sound: SOUND_ITEM });
      expect(mpNow()).toBe(280);
      expect(useBattleItem(FLARE, held(FLARE)).line).toBe(REASON_USED);
      expect(service.weakenEnemy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Fire Wand", () => {
    it("makes every chore earn 1.5x the minutes for 10 MP, once per fight", () => {
      const out = useBattleItem(FIRE_WAND, held(FIRE_WAND));
      expect(service.scaleCooldown).toHaveBeenCalledWith(FIRE_WAND_FACTOR);
      expect(out).toEqual({ ok: true, line: "The fuse burns slow: every chore earns 1.5x the minutes!", sound: SOUND_ITEM });
      expect(mpNow()).toBe(290);
      expect(useBattleItem(FIRE_WAND, held(FIRE_WAND)).line).toBe(REASON_USED);
      expect(service.scaleCooldown).toHaveBeenCalledTimes(1);
    });
  });

  describe("everything else", () => {
    it.each([LANTERN, QUESTS, stored("Pegasus Boots", "boot"), stored("Gaia's Quake", "mountain", "10MP | Hidden rooms appear.")])(
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
      expect(useBattleItem(CHRONOS, held(CHRONOS))).toEqual({ ok: false, line: REASON_NO_MP, sound: SOUND_NO });
      expect(service.freezeClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(15);
      expect(describeBattleItem(CHRONOS, held(CHRONOS))).toEqual({
        name: "Chronos' Clock",
        faIcon: "flux-capacitor",
        mp: 20,
        effect: "Pauses the clock for 15 minutes",
        reason: REASON_NO_MP,
      });
      // The Ice Wand costs 10: still within reach
      expect(describeBattleItem(ICE_WAND, held(ICE_WAND))?.reason).toBeNull();
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
      expect(describeBattleItem(HAMMER, held(HAMMER))?.reason).toBe(unlockHintOf("Thor's Hammer"));
      expect(useBattleItem(HAMMER, held(HAMMER))).toEqual({ ok: false, line: unlockHintOf("Thor's Hammer"), sound: SOUND_NO });
      expect(service.skipNextStrike).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);

      // Locked comes before "not held": a tool the hero cannot have yet says how to earn it
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBe(unlockHintOf("Thor's Hammer"));

      // Unlocked and held: it works. Unlocked but only in the bag: it waits for a hand.
      (useUserStore().getUserById(HERO_ID) as any).unlockedItems = ["Thor's Hammer"];
      expect(describeBattleItem(HAMMER, ctx)?.reason).toBe(REASON_NOT_HELD);
      expect(describeBattleItem(HAMMER, held(HAMMER))?.reason).toBeNull();
      expect(useBattleItem(HAMMER, held(HAMMER)).ok).toBe(true);
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
      expect(describeBattleItem(CHRONOS, held(CHRONOS))?.reason).toBe(REASON_USED);
      expect(useBattleItem(CHRONOS, held(CHRONOS))).toEqual({ ok: false, line: REASON_USED, sound: SOUND_NO });
      expect(service.freezeClock).not.toHaveBeenCalled();
      expect(mpNow()).toBe(300);
    });
  });
});
