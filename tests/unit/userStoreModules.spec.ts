import {
  CURRENT_USER_KEY,
  IMPERSONATING_FLAG_KEY,
  IMPERSONATOR_KEY,
  clearMasqueradeKeys,
  getSavedUserId,
  replaceRoster,
  saveCurrentUserId,
  sortByNick,
} from "@/lib/store/stores/user/session";
import {
  applyGpChange,
  applyHpChange,
  applyMpChange,
  applyWallet,
  needsPointsObject,
} from "@/lib/store/stores/user/resources";
import {
  cooldownsWith,
  createProfileSetters,
  equipmentWith,
  inventoryAfterSpend,
  inventoryWithItem,
} from "@/lib/store/stores/user/profileFields";
import {
  apInTimeRange,
  applyApGain,
  applyClassUnlock,
  applyClassXp,
  applyPegasusUnlock,
  applyQuickDrawSlotUnlock,
  applyXpGain,
  forEachClassUnlockMet,
  newClassLevelUpInfo,
  newLevelUpInfo,
} from "@/lib/store/stores/user/progression";
import { createProfilePersister } from "@/lib/store/stores/user/persistence";

/**
 * The pure pieces split out of the user store (src/lib/store/stores/user/*), called directly. Each assertion
 * pins what the piece returned when it still lived inside useUserStore.
 */
const mockSetProfile = jest.fn((_profile: unknown) => Promise.resolve());
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile(profile: unknown) {
      return mockSetProfile(profile);
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));

beforeEach(() => {
  localStorage.clear();
  mockSetProfile.mockClear();
});

describe("session", () => {
  it("keeps the storage keys the Game Master guard and the saved login rely on", () => {
    expect(CURRENT_USER_KEY).toBe("xp_current_user_id");
    expect(IMPERSONATOR_KEY).toBe("xp_impersonator_id");
    expect(IMPERSONATING_FLAG_KEY).toBe("xp_is_impersonating");
  });

  it("saves, reads and forgets the signed-in id", () => {
    expect(getSavedUserId()).toBeNull();
    saveCurrentUserId("ava");
    expect(getSavedUserId()).toBe("ava");
    saveCurrentUserId(null);
    expect(getSavedUserId()).toBeNull();
  });

  it("clears both masquerade keys", () => {
    localStorage.setItem(IMPERSONATING_FLAG_KEY, "true");
    localStorage.setItem(IMPERSONATOR_KEY, "mom");
    clearMasqueradeKeys();
    expect(localStorage.getItem(IMPERSONATING_FLAG_KEY)).toBeNull();
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    const remove = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(() => clearMasqueradeKeys()).not.toThrow();
    } finally {
      remove.mockRestore();
    }
  });

  it("sorts the roster by nick, nick-less heroes first", () => {
    const sorted = sortByNick({ c: { id: "c", name: { nick: "Cleo" } }, a: { id: "a", name: { nick: "Ava" } }, n: { id: "n" } });
    expect(sorted.map((user) => user.id)).toEqual(["n", "a", "c"]);
  });

  it("replaces the roster in place: drops who left, refreshes the rest", () => {
    const users: Record<string, { id: string; v?: number }> = { gone: { id: "gone" }, ava: { id: "ava", v: 1 } };
    const refreshed = { id: "ava", v: 2 };
    replaceRoster(users, [refreshed, { id: "ben" }]);
    expect(Object.keys(users)).toEqual(["ava", "ben"]);
    expect(users.ava).toBe(refreshed);
  });
});

describe("resources: HP, MP, GP", () => {
  it("says which stats still need a { now, max } object", () => {
    expect(needsPointsObject(undefined)).toBe(true);
    expect(needsPointsObject(null)).toBe(true);
    expect(needsPointsObject(50)).toBe(true);
    expect(needsPointsObject({ now: 1, max: 2 })).toBe(false);
  });

  it("applies HP damage, standardizing both HP and MP", () => {
    const stats: Record<string, unknown> = { hp: 50, maxHp: 80, mp: 10 };
    expect(applyHpChange(stats, -20)).toBe(true);
    expect(stats).toEqual({ hp: { now: 30, max: 80 }, maxHp: 80, mp: { now: 10, max: 100 } });
  });

  it("clamps HP between 0 and the max and reports a defeat", () => {
    const stats = { hp: { now: 5, max: 10 } };
    expect(applyHpChange(stats, 100)).toBe(true);
    expect(stats.hp.now).toBe(10);
    expect(applyHpChange(stats, -100)).toBe(false);
    expect(stats.hp.now).toBe(0);
  });

  it("builds 100/100 objects for empty stats", () => {
    const stats: Record<string, unknown> = {};
    applyHpChange(stats, 0);
    expect(stats).toEqual({ hp: { now: 100, max: 100 }, mp: { now: 100, max: 100 } });
  });

  it("applies MP spending, standardizing both MP and HP", () => {
    const stats: Record<string, unknown> = { mp: 20, maxMp: 30, hp: 7 };
    expect(applyMpChange(stats, -5)).toBe(true);
    expect(stats).toEqual({ mp: { now: 15, max: 30 }, maxMp: 30, hp: { now: 7, max: 100 } });
    expect(applyMpChange(stats, -999)).toBe(false);
    expect((stats.mp as { now: number }).now).toBe(0);
  });

  it("adds to the purse and overflows the wallet into savings", () => {
    const stats = applyGpChange({ gp: { wallet: 90, savings: 7, debt: 0 } }, { userId: "ava", wallet: 80, debt: 4 });
    expect(stats.gp).toEqual({ wallet: 100, savings: 77, debt: 4 });
  });

  it("starts a purse when there are no stats, or stats without one", () => {
    expect(applyGpChange(undefined, { userId: "ava", savings: 3 })).toEqual({
      gp: { wallet: 0, savings: 3, debt: 0, hospitalBill: 0, limit: 100 },
    });
    expect(applyGpChange({ level: 2 }, { userId: "ava", wallet: 3 })).toEqual({
      level: 2,
      gp: { wallet: 3, savings: 0, debt: 0, hospitalBill: 0, limit: 100 },
    });
  });

  it("moves the hospital bill apart from debt, and never lets it go below 0", () => {
    const stats = applyGpChange({ gp: { wallet: 50, savings: 0, debt: 9, hospitalBill: 60 } }, { userId: "ava", wallet: -20, hospitalBill: -20 });
    expect(stats.gp).toMatchObject({ wallet: 30, debt: 9, hospitalBill: 40 });
    expect(applyGpChange(stats, { userId: "ava", hospitalBill: -500 }).gp.hospitalBill).toBe(0);
    expect(applyGpChange({ gp: { wallet: 0 } }, { userId: "ava", hospitalBill: 100 }).gp.hospitalBill).toBe(100);
  });

  it("replaces the purse wholesale, coercing numbers and defaulting the limit", () => {
    const user = { stats: { gp: { wallet: 10, savings: 20, debt: 3, limit: 100, extra: "kept" } } };
    expect(applyWallet(user, { wallet: "40" as unknown as number, limit: 300 })).toBe(user.stats);
    expect(user.stats.gp).toEqual({ wallet: 40, savings: 20, debt: 3, hospitalBill: 0, limit: 300, extra: "kept" });
    expect(applyWallet({}, { wallet: Number.NaN, limit: -5 })).toEqual({ gp: { wallet: 0, savings: 0, debt: 0, hospitalBill: 0, limit: 100 } });
  });

  it("carries the hospital bill through a wholesale purse replacement", () => {
    const user = { stats: { gp: { wallet: 10, savings: 20, debt: 3, hospitalBill: 60, limit: 100 } } };
    applyWallet(user, { wallet: 0, hospitalBill: 35 });
    expect(user.stats.gp.hospitalBill).toBe(35);
    applyWallet(user, { wallet: 5 });
    expect(user.stats.gp.hospitalBill).toBe(35);
  });
});

describe("profileFields: the bag, cooldowns, hands", () => {
  it("adds a copy of an item to the bag, starting one when there is none", () => {
    const item = { name: "Potion" };
    const bag = inventoryWithItem({}, item);
    expect(bag).toEqual([{ name: "Potion" }]);
    expect(bag[0]).not.toBe(item);
    expect(inventoryWithItem({ inventory: [{ name: "Ether" }] }, item)).toEqual([{ name: "Ether" }, { name: "Potion" }]);
    expect(inventoryWithItem({ inventory: "junk" }, item)).toEqual([{ name: "Potion" }]);
  });

  it("takes from the first matching rows and drops a row at zero", () => {
    const bag = [
      { id: "potion", name: "Potion", qty: 2 },
      { id: "ether", name: "Ether", quantity: 3 },
      { id: "potion", name: "Potion", qty: 3 },
    ];
    expect(inventoryAfterSpend(bag, "potion", 3)).toEqual([
      { id: "ether", name: "Ether", quantity: 3 },
      { id: "potion", name: "Potion", qty: 2 },
    ]);
    expect(inventoryAfterSpend(bag, "ether", 1)).toEqual([
      { id: "potion", name: "Potion", qty: 2 },
      { id: "ether", name: "Ether", quantity: 2 },
      { id: "potion", name: "Potion", qty: 3 },
    ]);
    expect(bag).toHaveLength(3);
  });

  it("returns null when the bag holds too few", () => {
    expect(inventoryAfterSpend([{ id: "potion", name: "Potion", qty: 2 }], "potion", 3)).toBeNull();
    expect(inventoryAfterSpend([], "potion", 1)).toBeNull();
  });

  it("sets and clears a cooldown on a copy", () => {
    const user = { itemCooldowns: { Sword: "a" } };
    expect(cooldownsWith(user, "Shield", "b")).toEqual({ Sword: "a", Shield: "b" });
    expect(cooldownsWith(user, "Sword", null)).toEqual({});
    expect(cooldownsWith({}, "Sword", "c")).toEqual({ Sword: "c" });
    expect(user.itemCooldowns).toEqual({ Sword: "a" });
  });

  it("copies both hands and keeps the rest of the equipment", () => {
    const sword = { name: "Sword" };
    const next = equipmentWith({ equipment: { head: "Cap", leftHand: ["old"] } }, { leftHand: [sword], rightHand: [] });
    expect(next).toEqual({ head: "Cap", leftHand: [{ name: "Sword" }], rightHand: [] });
    expect(next.leftHand[0]).not.toBe(sword);
    expect(equipmentWith({}, { leftHand: [], rightHand: [] })).toEqual({ leftHand: [], rightHand: [] });
  });

  it("builds setters that edit the given state, mirror it to the signed-in hero and queue a save", () => {
    const users: Record<string, any> = { ava: { id: "ava", unlockedItems: ["Sword"] }, ben: { id: "ben" } };
    const currentUser = { id: "ava" as string | null };
    const persistUser = jest.fn();
    const syncCurrentUser = jest.fn();
    const setters = createProfileSetters({ users, currentUser, persistUser, syncCurrentUser, updateUserGP: jest.fn() });
    expect(Object.keys(setters)).toEqual([
      "addInventoryItem",
      "spendInventoryItem",
      "storeItem",
      "takeItem",
      "buyStorageTier",
      "setItemCooldown",
      "setBenchRestAt",
      "setQuestEffects",
      "unlockItem",
      "setEquipment",
      "setLook",
      "setJobClass",
      "addQuestGrudge",
      "clearQuestGrudge",
      "setQuestGrudges",
      "setVoice",
      "setAutoRead",
    ]);

    expect(setters.unlockItem("ava", "Shield")).toBe(true);
    expect(users.ava.unlockedItems).toEqual(["Sword", "Shield"]);
    expect(syncCurrentUser).toHaveBeenCalledWith(users.ava);
    expect(persistUser).toHaveBeenCalledWith("ava");

    syncCurrentUser.mockClear();
    persistUser.mockClear();
    setters.setBenchRestAt("ben", "x");
    expect(users.ben.benchRestAt).toBe("x");
    expect(syncCurrentUser).not.toHaveBeenCalled();
    expect(persistUser).toHaveBeenCalledWith("ben");

    persistUser.mockClear();
    expect(setters.addInventoryItem("ghost", { name: "Potion" })).toBe(false);
    expect(setters.unlockItem("ben", "Shield")).toBe(false);
    expect(persistUser).not.toHaveBeenCalled();
  });
});

describe("grudge setters (docs/Quest-Rooms-Spec.md 5.7)", () => {
  const build = (users: Record<string, any>, signedIn: string | null = "ava") => {
    const currentUser = { id: signedIn };
    const persistUser = jest.fn();
    const syncCurrentUser = jest.fn();
    const setters = createProfileSetters({ users, currentUser, persistUser, syncCurrentUser, updateUserGP: jest.fn() });
    return { setters, persistUser, syncCurrentUser };
  };

  it("addQuestGrudge puts a mark on the hero's own record, mirrors it to the signed-in hero and queues a save", () => {
    const users: Record<string, any> = { ava: { id: "ava" }, ben: { id: "ben" } };
    const { setters, persistUser, syncCurrentUser } = build(users);

    expect(setters.addQuestGrudge("ava", "q1", 1234)).toBe(1);
    expect(users.ava.questGrudges).toEqual({ q1: { marks: 1, lastFledAt: 1234 } });
    expect(users.ben.questGrudges).toBeUndefined(); // each hero's grudge is their own
    expect(syncCurrentUser).toHaveBeenCalledWith(users.ava);
    expect(persistUser).toHaveBeenCalledWith("ava");
  });

  it("adds a mark each flight, three at the most, and keeps the other quests' marks", () => {
    const users: Record<string, any> = { ava: { id: "ava", questGrudges: { q2: { marks: 2 } } } };
    const { setters } = build(users);

    expect([1, 2, 3, 4, 5].map(() => setters.addQuestGrudge("ava", "q1", 50))).toEqual([1, 2, 3, 3, 3]);
    expect(users.ava.questGrudges).toEqual({ q1: { marks: 3, lastFledAt: 50 }, q2: { marks: 2 } });
  });

  it("starts a record for a hero from before grudges, and mends a broken one", () => {
    const users: Record<string, any> = { ava: { id: "ava", questGrudges: "junk" } };
    const { setters } = build(users);
    expect(setters.addQuestGrudge("ava", "q1", 7)).toBe(1);
    expect(users.ava.questGrudges).toEqual({ q1: { marks: 1, lastFledAt: 7 } });
  });

  it("addQuestGrudge refuses an unknown hero or a quest with no id: nothing is written", () => {
    const users: Record<string, any> = { ava: { id: "ava" } };
    const { setters, persistUser } = build(users);
    expect(setters.addQuestGrudge("ghost", "q1")).toBe(0);
    expect(setters.addQuestGrudge("ava", "")).toBe(0);
    expect(users.ava.questGrudges).toBeUndefined();
    expect(persistUser).not.toHaveBeenCalled();
  });

  it("clearQuestGrudge takes the marks off and queues a save; the other quests keep theirs", () => {
    const users: Record<string, any> = {
      ava: { id: "ava", questGrudges: { q1: { marks: 3, lastFledAt: 5 }, q2: { marks: 1 } } },
    };
    const { setters, persistUser, syncCurrentUser } = build(users);

    expect(setters.clearQuestGrudge("ava", "q1")).toBe(true);
    expect(users.ava.questGrudges).toEqual({ q2: { marks: 1 } });
    expect(syncCurrentUser).toHaveBeenCalledWith(users.ava);
    expect(persistUser).toHaveBeenCalledWith("ava");
  });

  it("clearQuestGrudge on a hero with no marks for the quest writes nothing and says so", () => {
    const users: Record<string, any> = { ava: { id: "ava", questGrudges: { q2: { marks: 1 } } }, ben: { id: "ben" } };
    const { setters, persistUser } = build(users);

    expect(setters.clearQuestGrudge("ava", "q1")).toBe(false);
    expect(setters.clearQuestGrudge("ben", "q1")).toBe(false);
    expect(setters.clearQuestGrudge("ghost", "q1")).toBe(false);
    expect(users.ava.questGrudges).toEqual({ q2: { marks: 1 } });
    expect(users.ben.questGrudges).toBeUndefined();
    expect(persistUser).not.toHaveBeenCalled();
  });

  it("setQuestGrudges replaces the whole record with a copy, mirrors it and queues a save", () => {
    const users: Record<string, any> = { ava: { id: "ava", questGrudges: { q1: { marks: 1 } } }, ben: { id: "ben" } };
    const { setters, persistUser, syncCurrentUser } = build(users);
    const record = { q2: { marks: 0, lastAmbushAt: 99 } };

    setters.setQuestGrudges("ava", record);

    expect(users.ava.questGrudges).toEqual(record);
    expect(users.ava.questGrudges).not.toBe(record);
    expect(users.ben.questGrudges).toBeUndefined();
    expect(syncCurrentUser).toHaveBeenCalledWith(users.ava);
    expect(persistUser).toHaveBeenCalledWith("ava");

    persistUser.mockClear();
    setters.setQuestGrudges("ghost", record);
    expect(persistUser).not.toHaveBeenCalled();
  });

  it("clearing keeps the ambush cooldown a quest's entry holds", () => {
    const users: Record<string, any> = { ava: { id: "ava", questGrudges: { q1: { marks: 2, lastAmbushAt: 99 } } } };
    const { setters } = build(users);
    expect(setters.clearQuestGrudge("ava", "q1")).toBe(true);
    expect(users.ava.questGrudges).toEqual({ q1: { marks: 0, lastAmbushAt: 99 } });
  });
});

describe("progression: XP, classes, unlocks, AP", () => {
  it("starts from the empty results", () => {
    expect(newLevelUpInfo()).toEqual({
      didLevelUp: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      hpGained: 0,
      mpGained: 0,
      newMaxHp: 0,
      newMaxMp: 0,
      statsGained: {},
    });
    expect(newLevelUpInfo()).not.toBe(newLevelUpInfo());
    expect(newClassLevelUpInfo("Mage")).toEqual({ didLevelUp: false, oldLevel: 1, newLevel: 1, levelsGained: 0, jobClassId: "Mage" });
  });

  it("adds XP without a level-up", () => {
    const stats: Record<string, any> = {};
    const result = newLevelUpInfo();
    applyXpGain(stats, "default", 50, result);
    expect(stats).toEqual({ level: 1, xp: { now: 50, next_level: 282 } });
    expect(result.didLevelUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });

  it("levels up, fills HP and MP and adds the stat gains", () => {
    const stats: Record<string, any> = { hp: { now: 1, max: 1 } };
    const result = newLevelUpInfo();
    applyXpGain(stats, "Warrior", 400, result);
    expect(result).toEqual(
      expect.objectContaining({ didLevelUp: true, oldLevel: 1, newLevel: 2, levelsGained: 1 })
    );
    expect(stats.level).toBe(2);
    expect(stats.xp).toEqual({ now: 400, next_level: 519 });
    expect(stats.hp).toEqual({ now: result.newMaxHp, max: result.newMaxHp });
    expect(stats.mp).toEqual({ now: result.newMaxMp, max: result.newMaxMp });
    expect(stats.special).toEqual(result.statsGained);
    expect(Object.keys(result.statsGained ?? {}).length).toBeGreaterThan(0);
  });

  it("starts a class entry, adds class XP and calls the unlock check on a level-up only", () => {
    const checkUnlocks = jest.fn();
    const stats: Record<string, any> = {};
    const first = newClassLevelUpInfo("Warrior");
    applyClassXp(stats, "Warrior", "Warrior", 50, first, checkUnlocks);
    expect(stats.classes.Warrior).toEqual({ level: 1, xp: 50, unlocked: true });
    expect(first.didLevelUp).toBe(false);
    expect(checkUnlocks).not.toHaveBeenCalled();

    const second = newClassLevelUpInfo("Warrior");
    applyClassXp(stats, "Warrior", "Warrior", 400, second, checkUnlocks);
    expect(second).toEqual({ didLevelUp: true, oldLevel: 1, newLevel: 2, levelsGained: 1, jobClassId: "Warrior" });
    expect(checkUnlocks).toHaveBeenCalledTimes(1);
  });

  it("grows max HP and MP only for the hero's own class (no class means the default one)", () => {
    const own: Record<string, any> = { hp: { now: 10, max: 20 }, mp: { now: 1, max: 2 } };
    applyClassXp(own, "Warrior", "Warrior", 400, newClassLevelUpInfo("Warrior"), () => undefined);
    expect(own.hp).toEqual({ now: 15, max: 25 });
    expect(own.mp).toEqual({ now: 1, max: 2 });

    const other: Record<string, any> = { hp: { now: 10, max: 20 } };
    applyClassXp(other, "Mage", "Warrior", 400, newClassLevelUpInfo("Warrior"), () => undefined);
    expect(other.hp).toEqual({ now: 10, max: 20 });

    const bare: Record<string, any> = { hp: { now: 10, max: 20 } };
    applyClassXp(bare, undefined, "default", 400, newClassLevelUpInfo("default"), () => undefined);
    expect(bare.hp).toEqual({ now: 12, max: 22 });
  });

  it("records AP with its source, and stamps now when the time is not a date", () => {
    const stats: Record<string, any> = {};
    applyApGain(stats, { userId: "ava", amount: 5, source: "battle", at: "2026-10-01T10:00:00.000Z" });
    applyApGain(stats, { userId: "ava", amount: 2, source: "quest", at: "nope" });
    expect(stats.ap.total).toBe(7);
    expect(stats.ap.history[0]).toEqual({ amount: 5, timestamp: "2026-10-01T10:00:00.000Z", source: "battle" });
    expect(stats.ap.history[1].timestamp).not.toBe("nope");
    expect(Number.isNaN(new Date(stats.ap.history[1].timestamp).getTime())).toBe(false);
  });

  it("totals the AP from the last N days", () => {
    const day = 24 * 60 * 60 * 1000;
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * day).toISOString();
    const stats = { ap: { history: [{ amount: 1, timestamp: at(0.5) }, { amount: 2, timestamp: at(3) }, { amount: 4, timestamp: at(30) }] } };
    expect(apInTimeRange(stats, 1).total).toBe(1);
    expect(apInTimeRange(stats, 7).total).toBe(3);
    expect(apInTimeRange(stats, 7).records).toHaveLength(2);
    expect(apInTimeRange({}, 7)).toEqual({ total: 0, records: [] });
  });

  it("rebuilds the Pegasus flags as nine booleans and sets a valid index", () => {
    const stats: Record<string, any> = { pegasi: { 3: true } };
    applyPegasusUnlock(stats, 5);
    expect(stats.pegasi).toEqual([false, false, false, true, false, true, false, false, false]);
    applyPegasusUnlock(stats, 9);
    applyPegasusUnlock(stats, 1.5);
    expect(stats.pegasi).toEqual([false, false, false, true, false, true, false, false, false]);
    const fresh: Record<string, any> = {};
    applyPegasusUnlock(fresh, 0);
    expect(fresh.pegasi).toHaveLength(9);
    expect(fresh.pegasi[0]).toBe(true);
  });

  it("opens Quick Draw slots from 1 up to 3", () => {
    const stats: Record<string, any> = {};
    applyQuickDrawSlotUnlock(stats);
    expect(stats.quickDrawSlots).toBe(2);
    applyQuickDrawSlotUnlock(stats);
    applyQuickDrawSlotUnlock(stats);
    expect(stats.quickDrawSlots).toBe(3);
  });

  it("unlocks a class, creating its entry and keeping its level and XP", () => {
    const stats: Record<string, any> = { classes: { Knight: { level: 3, xp: 50, unlocked: false } } };
    applyClassUnlock(stats, "Knight");
    applyClassUnlock(stats, "Ranger");
    expect(stats.classes).toEqual({
      Knight: { level: 3, xp: 50, unlocked: true },
      Ranger: { level: 1, xp: 0, unlocked: true },
    });
    const bare: Record<string, any> = {};
    applyClassUnlock(bare, "Mage");
    expect(bare.classes.Mage).toEqual({ level: 1, xp: 0, unlocked: true });
  });

  it("names every locked class whose requirements are met, in table order", () => {
    const unlock = jest.fn();
    forEachClassUnlockMet(
      {
        Warrior: { level: 10, unlocked: true },
        Mage: { level: 10, unlocked: true },
        Knight: { level: 1, unlocked: true },
        Mystic: { level: 10, unlocked: true },
      },
      unlock
    );
    expect(unlock.mock.calls.map((call) => call[0])).toEqual(["Berserker", "White Mage", "Black Mage"]);
    unlock.mockClear();
    forEachClassUnlockMet({}, unlock);
    expect(unlock).not.toHaveBeenCalled();
  });
});

describe("persistence", () => {
  /** Let the persistence queue (a microtask, then one await per hero) run to the end */
  const flush = async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  };

  it("coalesces writes in one tick and writes plain copies in the order asked", async () => {
    const users = { ava: { id: "ava", n: 1 }, ben: { id: "ben" } };
    const persistUser = createProfilePersister(users);
    persistUser("ava");
    persistUser("ben");
    persistUser("ava");
    expect(mockSetProfile).not.toHaveBeenCalled();
    await flush();
    expect(mockSetProfile.mock.calls.map((call) => call[0])).toEqual([{ id: "ava", n: 1 }, { id: "ben" }]);
  });

  it("skips unknown and empty ids, and a hero removed before the flush", async () => {
    const users: Record<string, { id: string }> = { ava: { id: "ava" }, ben: { id: "ben" } };
    const persistUser = createProfilePersister(users);
    persistUser("");
    persistUser("ghost");
    persistUser("ben");
    delete users.ben;
    await flush();
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it("keeps a separate queue for each store", async () => {
    const first = createProfilePersister({ ava: { id: "ava" } });
    const second = createProfilePersister({ ava: { id: "ava" } });
    first("ava");
    second("ava");
    await flush();
    expect(mockSetProfile).toHaveBeenCalledTimes(2);
  });
});
