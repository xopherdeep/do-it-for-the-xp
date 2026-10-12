import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import { SOUND_HEAL, SOUND_NO } from "@/lib/services/battle/BattleEffects";
import { drinkPotion, potionShelf } from "@/lib/services/battle/BattlePotions";

/**
 * The potions in the hero's pack: the shelf (only potions, merged, with the reason one would do nothing),
 * drinking one (heal, restore, spend one), the "already full" refusals that spend nothing, and the user
 * store's `spendInventoryItem` that takes the bottle out of the pack. The user store is real; only what
 * it writes to disk is faked.
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

const addHero = (inventory: object[], hp = { now: 10, max: 100 }, mp = { now: 0, max: 300 }) => {
  useUserStore().addUser({
    id: HERO_ID,
    name: { nick: "Max" },
    jobClass: "warrior",
    stats: {
      level: 1,
      xp: { now: 0, next_level: 283 },
      hp,
      mp,
      gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
    },
    inventory,
  });
};

const hero = () => useUserStore().getUserById(HERO_ID) as any;
const hpNow = () => hero().stats.hp.now as number;
const mpNow = () => hero().stats.mp.now as number;
const qtyOf = (id: string) => potionShelf(HERO_ID).find((card) => card.id === id)?.qty;

describe("BattlePotions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("the shelf", () => {
    it("lists only potions, merged, with counts", () => {
      addHero([{ name: "Health Potion" }, { name: "Health Potion" }, { name: "Small Key" }, { name: "Ether", qty: 2 }]);
      const shelf = potionShelf(HERO_ID);
      expect(shelf.map((card) => [card.name, card.qty])).toEqual([
        ["Ether", 2],
        ["Health Potion", 2],
      ]);
      expect(shelf.find((card) => card.name === "Small Key")).toBeUndefined();
    });

    it("carries the id, the effect line and a flask icon by default", () => {
      addHero([{ name: "Health Potion" }, { name: "Mana Potion", faIcon: "fa-bottle-water" }]);
      const [health, mana] = potionShelf(HERO_ID);
      expect(health).toEqual({
        id: "health-potion",
        name: "Health Potion",
        qty: 1,
        faIcon: "flask-potion",
        effect: "Restores 50 HP",
        reason: null,
      });
      expect(mana.effect).toBe("Restores 30 MP");
      expect(mana.faIcon).toBe("bottle-water");
    });

    it("is empty for an empty pack and for an unknown hero", () => {
      addHero([]);
      expect(potionShelf(HERO_ID)).toEqual([]);
      expect(potionShelf("nobody")).toEqual([]);
    });

    it("greys a potion that would do nothing", () => {
      addHero([{ name: "Health Potion" }, { name: "Mana Potion" }, { name: "Elixir" }], { now: 100, max: 100 }, { now: 300, max: 300 });
      const reasons = Object.fromEntries(potionShelf(HERO_ID).map((card) => [card.name, card.reason]));
      expect(reasons).toEqual({
        Elixir: "You are already at full strength.",
        "Health Potion": "Your HP is full.",
        "Mana Potion": "Your MP is full.",
      });
    });

    it("leaves a potion open while there is something to restore", () => {
      addHero([{ name: "Health Potion" }, { name: "Elixir" }], { now: 100, max: 100 }, { now: 0, max: 300 });
      const reasons = Object.fromEntries(potionShelf(HERO_ID).map((card) => [card.name, card.reason]));
      expect(reasons).toEqual({ Elixir: null, "Health Potion": "Your HP is full." });
    });
  });

  describe("drinking", () => {
    it("a Health Potion heals 50 and is spent", () => {
      addHero([{ name: "Health Potion" }, { name: "Health Potion" }]);
      const outcome = drinkPotion(HERO_ID, "health-potion");
      expect(outcome).toEqual({ ok: true, line: "You drink a Health Potion: +50 HP", sound: SOUND_HEAL });
      expect(SOUND_HEAL).toBe("restoreHP");
      expect(hpNow()).toBe(60);
      expect(mpNow()).toBe(0);
      expect(qtyOf("health-potion")).toBe(1);
    });

    it("the last bottle leaves the shelf", () => {
      addHero([{ name: "Health Potion" }]);
      expect(drinkPotion(HERO_ID, "health-potion").ok).toBe(true);
      expect(potionShelf(HERO_ID)).toEqual([]);
      expect(drinkPotion(HERO_ID, "health-potion")).toEqual({ ok: false, line: "You don't have that.", sound: SOUND_NO });
    });

    it("a Mana Potion restores 30 MP and an Ether 50 MP, with the right article", () => {
      addHero([{ name: "Mana Potion" }, { name: "Ether" }]);
      expect(drinkPotion(HERO_ID, "mana-potion").line).toBe("You drink a Mana Potion: +30 MP");
      expect(mpNow()).toBe(30);
      expect(drinkPotion(HERO_ID, "ether")).toEqual({ ok: true, line: "You drink an Ether: +50 MP", sound: SOUND_HEAL });
      expect(mpNow()).toBe(80);
      expect(hpNow()).toBe(10);
    });

    it("gains stop at max, and the line says what was gained", () => {
      addHero([{ name: "Health Potion" }], { now: 90, max: 100 });
      expect(drinkPotion(HERO_ID, "health-potion").line).toBe("You drink a Health Potion: +10 HP");
      expect(hpNow()).toBe(100);
    });

    it("an Elixir fills both", () => {
      addHero([{ name: "Elixir" }]);
      expect(drinkPotion(HERO_ID, "elixir")).toEqual({
        ok: true,
        line: "You drink an Elixir: HP and MP fully restored!",
        sound: SOUND_HEAL,
      });
      expect(hpNow()).toBe(100);
      expect(mpNow()).toBe(300);
      expect(potionShelf(HERO_ID)).toEqual([]);
    });

    it("an Elixir still works when only one of the two is low", () => {
      addHero([{ name: "Elixir" }], { now: 100, max: 100 }, { now: 100, max: 300 });
      expect(drinkPotion(HERO_ID, "elixir").ok).toBe(true);
      expect(mpNow()).toBe(300);
    });
  });

  describe("refusals spend nothing", () => {
    it("full HP refuses a Health Potion", () => {
      addHero([{ name: "Health Potion" }], { now: 100, max: 100 });
      expect(drinkPotion(HERO_ID, "health-potion")).toEqual({ ok: false, line: "Your HP is full.", sound: SOUND_NO });
      expect(SOUND_NO).toBe("no");
      expect(hpNow()).toBe(100);
      expect(qtyOf("health-potion")).toBe(1);
    });

    it("full MP refuses a Mana Potion and an Ether", () => {
      addHero([{ name: "Mana Potion" }, { name: "Ether" }], { now: 10, max: 100 }, { now: 300, max: 300 });
      expect(drinkPotion(HERO_ID, "mana-potion")).toEqual({ ok: false, line: "Your MP is full.", sound: SOUND_NO });
      expect(drinkPotion(HERO_ID, "ether").line).toBe("Your MP is full.");
      expect(potionShelf(HERO_ID).map((card) => card.qty)).toEqual([1, 1]);
    });

    it("an Elixir refuses only when both are full", () => {
      addHero([{ name: "Elixir" }], { now: 100, max: 100 }, { now: 300, max: 300 });
      expect(drinkPotion(HERO_ID, "elixir")).toEqual({ ok: false, line: "You are already at full strength.", sound: SOUND_NO });
      expect(qtyOf("elixir")).toBe(1);
    });

    it("an unknown entry, a non-potion and an unknown hero refuse", () => {
      addHero([{ name: "Small Key" }]);
      const refusal = { ok: false, line: "You don't have that.", sound: SOUND_NO };
      expect(drinkPotion(HERO_ID, "nope")).toEqual(refusal);
      expect(drinkPotion(HERO_ID, "small-key")).toEqual(refusal);
      expect(drinkPotion("nobody", "health-potion")).toEqual(refusal);
      expect(hero().inventory).toHaveLength(1);
    });
  });

  describe("spendInventoryItem", () => {
    it("removes the last one", () => {
      addHero([{ name: "Ether", qty: 1 }]);
      expect(useUserStore().spendInventoryItem(HERO_ID, "ether")).toBe(true);
      expect(hero().inventory).toEqual([]);
    });

    it("counts a row down by qty or by quantity, whichever it carries", () => {
      addHero([{ name: "Ether", quantity: 3 }, { name: "Mana Potion", qty: 2 }]);
      const store = useUserStore();
      expect(store.spendInventoryItem(HERO_ID, "ether")).toBe(true);
      expect(store.spendInventoryItem(HERO_ID, "mana-potion")).toBe(true);
      expect(hero().inventory).toEqual([
        { name: "Ether", quantity: 2 },
        { name: "Mana Potion", qty: 1 },
      ]);
    });

    it("takes a duplicate row first, leaving the rest of the pack alone", () => {
      addHero([{ name: "Health Potion" }, { name: "Small Key" }, { name: "Health Potion" }]);
      expect(useUserStore().spendInventoryItem(HERO_ID, "health-potion")).toBe(true);
      expect(hero().inventory).toEqual([{ name: "Small Key" }, { name: "Health Potion" }]);
    });

    it("spends several across rows, or none when the pack holds fewer", () => {
      addHero([{ name: "Ether", qty: 2 }, { name: "Ether", qty: 2 }]);
      const store = useUserStore();
      expect(store.spendInventoryItem(HERO_ID, "ether", 5)).toBe(false);
      expect(hero().inventory).toEqual([{ name: "Ether", qty: 2 }, { name: "Ether", qty: 2 }]);
      expect(store.spendInventoryItem(HERO_ID, "ether", 3)).toBe(true);
      expect(hero().inventory).toEqual([{ name: "Ether", qty: 1 }]);
    });

    it("answers false for an unknown id, an unknown hero and a bad amount", () => {
      addHero([{ name: "Ether" }]);
      const store = useUserStore();
      expect(store.spendInventoryItem(HERO_ID, "nope")).toBe(false);
      expect(store.spendInventoryItem("nobody", "ether")).toBe(false);
      expect(store.spendInventoryItem(HERO_ID, "ether", 0)).toBe(false);
      expect(hero().inventory).toEqual([{ name: "Ether" }]);
    });
  });
});
