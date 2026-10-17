import { createPinia, setActivePinia } from "pinia";
import Api from "@/lib/api";
import { IMPERSONATOR_KEY, useUserStore } from "@/lib/store/stores/user";

/**
 * Characterization of the user store's actions through Pinia: what each one leaves on the profile, on
 * currentUser, in localStorage and in ProfileDb TODAY. Written before the store was split into
 * src/lib/store/stores/user/*, so it pins the split to the old behaviour. Only what the store talks to
 * (Api, ProfileDb, the GP service, the notification feed) is faked.
 * This file: the bag, cooldowns, hands, look and class; signing in, masquerading, loading the roster.
 */
const mockSetProfile = jest.fn((_profile: unknown) => Promise.resolve());

jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
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
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

/** A plain copy of a profile slice, so assertions do not depend on Vue proxies */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const freshStore = (users: Record<string, unknown> = {}) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  Object.entries(users).forEach(([id, profile]) => store.addUser({ id, ...(profile as object) }));
  return store;
};

beforeEach(() => {
  localStorage.clear();
  mockSetProfile.mockClear();
  (Api.get as jest.Mock).mockReset();
});

describe("the bag, cooldowns, the hands, the look, the class", () => {
  it("puts a copy of an item in the bag", () => {
    const store = freshStore({ ava: {} });
    const potion = { name: "Potion", source: "shop" };
    expect(store.addInventoryItem("ava", potion)).toBe(true);
    expect(store.addInventoryItem("ava", { name: "Ether" })).toBe(true);
    expect(plain(store.users.ava.inventory)).toEqual([{ name: "Potion", source: "shop" }, { name: "Ether" }]);
    expect(store.users.ava.inventory[0]).not.toBe(potion);
    expect(store.addInventoryItem("ghost", potion)).toBe(false);
  });

  it("spends from the first matching rows and drops a row at zero", () => {
    const store = freshStore({
      ava: {
        inventory: [
          { id: "potion", name: "Potion", qty: 2 },
          { id: "ether", name: "Ether", quantity: 3 },
          { id: "potion", name: "Potion", qty: 3 },
        ],
      },
    });
    expect(store.spendInventoryItem("ava", "potion", 3)).toBe(true);
    expect(plain(store.users.ava.inventory)).toEqual([
      { id: "ether", name: "Ether", quantity: 3 },
      { id: "potion", name: "Potion", qty: 2 },
    ]);
    expect(store.spendInventoryItem("ava", "ether")).toBe(true);
    expect(plain(store.users.ava.inventory[0])).toEqual({ id: "ether", name: "Ether", quantity: 2 });
  });

  it("spends nothing when the bag holds too few, or the ask is empty", () => {
    const store = freshStore({ ava: { inventory: [{ id: "potion", name: "Potion", qty: 2 }] }, ben: {} });
    expect(store.spendInventoryItem("ava", "potion", 3)).toBe(false);
    expect(store.spendInventoryItem("ava", "elixir")).toBe(false);
    expect(store.spendInventoryItem("ava", "potion", 0)).toBe(false);
    expect(store.spendInventoryItem("ava", "potion", Number.NaN)).toBe(false);
    expect(store.spendInventoryItem("ben", "potion")).toBe(false);
    expect(store.spendInventoryItem("ghost", "potion")).toBe(false);
    expect(plain(store.users.ava.inventory)).toEqual([{ id: "potion", name: "Potion", qty: 2 }]);
  });

  describe("the bag's 20 stacks, storage and the Gold Bank (docs: epic #1264)", () => {
    /** A bag of `n` different one-off items */
    const stacks = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `thing-${i}`, name: `Thing ${i}`, qty: 1 }));
    const purse = (wallet: number) => ({ gp: { wallet, savings: 500, debt: 0, hospitalBill: 0, limit: 1000 } });

    it("puts an item in storage when the bag has no room for a new stack, and in the bag for a stack it holds", () => {
      const store = freshStore({ ava: { inventory: stacks(20), storage: [], storageTier: 1 } });

      expect(store.addInventoryItem("ava", { name: "Thing 3" })).toBe(true);
      expect(plain(store.users.ava.inventory)).toHaveLength(21);
      expect(plain(store.users.ava.storage)).toEqual([]);

      expect(store.addInventoryItem("ava", { name: "Ether" })).toBe(true);
      expect(plain(store.users.ava.storage)).toEqual([{ name: "Ether" }]);
      expect(plain(store.users.ava.inventory)).toHaveLength(21);
    });

    it("adds nothing and says false when the bag is full and storage is locked or full", () => {
      const locked = freshStore({ ava: { inventory: stacks(20) } });
      expect(locked.addInventoryItem("ava", { name: "Ether" })).toBe(false);
      expect(plain(locked.users.ava.inventory)).toEqual(stacks(20));
      expect(locked.users.ava.storage).toBeUndefined();

      const full = freshStore({ ava: { inventory: stacks(20), storageTier: 1, storage: stacks(10).map((row) => ({ ...row, id: `s-${row.id}`, name: `S${row.name}` })) } });
      expect(full.addInventoryItem("ava", { name: "Ether" })).toBe(false);
      expect(plain(full.users.ava.storage)).toHaveLength(10);
    });

    it("still takes a key when the bag is full: keys ride along and are not counted", () => {
      const store = freshStore({ ava: { inventory: stacks(20) } });
      expect(store.addInventoryItem("ava", { name: "Small Key", type: "key" })).toBe(true);
      expect(plain(store.users.ava.inventory)).toHaveLength(21);
    });

    it("stores part of a stack and takes it back, mirroring the signed-in hero and saving each time", () => {
      const store = freshStore({
        ava: { inventory: [{ id: "potion", name: "Potion", qty: 5 }], storageTier: 1 },
        ben: {},
      });
      store.loginUser(store.users.ava);
      mockSetProfile.mockClear();

      expect(store.storeItem("ava", "potion", 2)).toBe(true);
      expect(plain(store.users.ava.inventory)).toEqual([{ id: "potion", name: "Potion", qty: 3 }]);
      expect(plain(store.users.ava.storage)).toEqual([{ id: "potion", name: "Potion", qty: 2 }]);
      expect((store.currentUser as any).storage).toEqual(plain(store.users.ava.storage));

      expect(store.takeItem("ava", "potion")).toBe(true);
      expect(plain(store.users.ava.storage)).toEqual([]);
      expect(plain(store.users.ava.inventory)).toEqual([{ id: "potion", name: "Potion", qty: 5 }]);
      return Promise.resolve().then(() => expect(mockSetProfile).toHaveBeenCalled());
    });

    it("moves nothing for a ghost, a locked storage, a key, a missing stack, too many, or no room", () => {
      const store = freshStore({
        ava: { inventory: [{ id: "potion", name: "Potion", qty: 2 }, { id: "boss-key", name: "Boss Key", kind: "key" }] },
        ben: { inventory: stacks(20), storageTier: 1, storage: [{ id: "ether", name: "Ether", qty: 1 }] },
      });
      const before = plain(store.users.ava);

      expect(store.storeItem("ghost", "potion")).toBe(false);
      expect(store.storeItem("ava", "potion")).toBe(false); // locked
      store.users.ava.storageTier = 1;
      expect(store.storeItem("ava", "boss-key")).toBe(false);
      expect(store.storeItem("ava", "elixir")).toBe(false);
      expect(store.storeItem("ava", "potion", 3)).toBe(false);
      expect(store.takeItem("ghost", "ether")).toBe(false);
      expect(store.takeItem("ben", "ether")).toBe(false); // the bag is full of other stacks
      expect(plain(store.users.ava)).toEqual({ ...before, storageTier: 1 });
      expect(plain(store.users.ben.storage)).toEqual([{ id: "ether", name: "Ether", qty: 1 }]);
    });

    it("buys the tiers in turn out of the wallet, never the savings, and unlocks storage on the first", async () => {
      const store = freshStore({ ava: { stats: purse(1000) } });

      expect(store.buyStorageTier("ava")).toEqual({ ok: true, tier: 1, slots: 10, price: 100, fromWallet: 100, fromSavings: 0 });
      expect(store.users.ava.storageTier).toBe(1);
      expect(store.users.ava.stats.gp).toMatchObject({ wallet: 900, savings: 500 });

      expect(store.buyStorageTier("ava")).toMatchObject({ ok: true, tier: 2, slots: 20, price: 250 });
      expect(store.buyStorageTier("ava")).toMatchObject({ ok: true, tier: 3, slots: 40, price: 500 });
      expect(store.users.ava.stats.gp.wallet).toBe(150);
      expect(store.users.ava.storageTier).toBe(3);
    });

    it("tops up from savings only when asked: wallet first, then savings for the rest", () => {
      const store = freshStore({ ava: { stats: purse(40) }, ben: { stats: purse(40) } });

      // not asked: the savings stay put and nothing is bought
      expect(store.buyStorageTier("ava")).toMatchObject({ ok: false, reason: "gp", short: 60, canTopUp: true });
      expect(store.users.ava.storageTier).toBeUndefined();
      expect(store.users.ava.stats.gp).toMatchObject({ wallet: 40, savings: 500 });

      expect(store.buyStorageTier("ava", true)).toEqual({ ok: true, tier: 1, slots: 10, price: 100, fromWallet: 40, fromSavings: 60 });
      expect(store.users.ava.storageTier).toBe(1);
      expect(store.users.ava.stats.gp).toMatchObject({ wallet: 0, savings: 440 });

      // a wallet that covers it alone leaves the savings alone, asked or not
      const rich = freshStore({ cy: { stats: purse(150) } });
      expect(rich.buyStorageTier("cy", true)).toMatchObject({ ok: true, fromWallet: 100, fromSavings: 0 });
      expect(rich.users.cy.stats.gp).toMatchObject({ wallet: 50, savings: 500 });
    });

    it("refuses with savings and all when even they fall short, charging nothing", () => {
      const store = freshStore({ ava: { stats: { gp: { wallet: 10, savings: 20, debt: 0, hospitalBill: 0, limit: 1000 } } } });
      expect(store.buyStorageTier("ava", true)).toMatchObject({ ok: false, reason: "gp", short: 90, canTopUp: false, shortAll: 70 });
      expect(store.users.ava.storageTier).toBeUndefined();
      expect(store.users.ava.stats.gp).toMatchObject({ wallet: 10, savings: 20 });
    });

    it("refuses when the wallet is short (savings do not pay), at the biggest storage, and for a ghost", () => {
      const store = freshStore({ ava: { stats: purse(60) }, ben: { stats: purse(5000), storageTier: 4 } });

      expect(store.buyStorageTier("ava")).toEqual({ ok: false, reason: "gp", tier: 1, slots: 10, price: 100, short: 40, canTopUp: true, shortAll: 0 });
      expect(store.users.ava.storageTier).toBeUndefined();
      expect(store.users.ava.stats.gp.wallet).toBe(60);

      expect(store.buyStorageTier("ben")).toEqual({ ok: false, reason: "max" });
      expect(store.users.ben.stats.gp.wallet).toBe(5000);
      expect(store.buyStorageTier("ghost")).toEqual({ ok: false, reason: "hero" });
    });
  });

  it("sets and clears an item cooldown", () => {
    const store = freshStore({ ava: { itemCooldowns: { Sword: "a" } } });
    store.setItemCooldown("ava", "Shield", "2026-10-12T00:00:00.000Z");
    expect(plain(store.users.ava.itemCooldowns)).toEqual({ Sword: "a", Shield: "2026-10-12T00:00:00.000Z" });
    store.setItemCooldown("ava", "Sword", null);
    expect(plain(store.users.ava.itemCooldowns)).toEqual({ Shield: "2026-10-12T00:00:00.000Z" });
    expect(() => store.setItemCooldown("ghost", "Sword", null)).not.toThrow();
  });

  it("stamps the bed rest, and clears it", () => {
    const store = freshStore({ ava: {} });
    store.setBedRestAt("ava", "2026-10-13T08:00:00.000Z");
    expect(store.users.ava.bedRestAt).toBe("2026-10-13T08:00:00.000Z");
    store.setBedRestAt("ava", null);
    expect(store.users.ava.bedRestAt).toBeNull();
    expect(() => store.setBedRestAt("ghost", "x")).not.toThrow();
  });

  it("stamps the bench rest and replaces the quest effects with a copy", () => {
    const store = freshStore({ ava: {} });
    const effects = { snooze: { q1: 3 } };
    store.setBenchRestAt("ava", "2026-10-12T08:00:00.000Z");
    store.setQuestEffects("ava", effects);
    expect(store.users.ava.benchRestAt).toBe("2026-10-12T08:00:00.000Z");
    expect(plain(store.users.ava.questEffects)).toEqual(effects);
    expect(store.users.ava.questEffects).not.toBe(effects);
    store.setBenchRestAt("ava", null);
    expect(store.users.ava.benchRestAt).toBeNull();
  });

  it("unlocks an equipment item once, and only on a profile that has a list", () => {
    const store = freshStore({ ava: { unlockedItems: ["Sword"] }, ben: {} });
    expect(store.unlockItem("ava", "Shield")).toBe(true);
    expect(store.unlockItem("ava", "Shield")).toBe(false);
    expect(plain(store.users.ava.unlockedItems)).toEqual(["Sword", "Shield"]);
    expect(store.unlockItem("ben", "Shield")).toBe(false);
    expect(store.users.ben.unlockedItems).toBeUndefined();
    expect(store.unlockItem("ghost", "Shield")).toBe(false);
  });

  it("stores the hands as plain copies and keeps the rest of the equipment", () => {
    const store = freshStore({ ava: { equipment: { head: "Cap", leftHand: ["old"] } } });
    const sword = { name: "Sword" };
    store.setEquipment("ava", { leftHand: [sword], rightHand: [] });
    expect(plain(store.users.ava.equipment)).toEqual({ head: "Cap", leftHand: [{ name: "Sword" }], rightHand: [] });
    expect(store.users.ava.equipment.leftHand[0]).not.toBe(sword);
    expect(() => store.setEquipment("ghost", { leftHand: [], rightHand: [] })).not.toThrow();
  });

  it("stores the look, and the avatar image only when given one", () => {
    const store = freshStore({ ava: { avatarImage: "data:old" } });
    const look = { hair: "red" } as never;
    store.setLook("ava", look);
    expect(plain(store.users.ava.look)).toEqual({ hair: "red" });
    expect(store.users.ava.avatarImage).toBe("data:old");
    store.setLook("ava", look, "data:new");
    expect(store.users.ava.avatarImage).toBe("data:new");
  });

  it("changes class only to one the hero has earned", () => {
    const store = freshStore({ ava: { jobClass: "Warrior", stats: { classes: { Warrior: { level: 3, xp: 0, unlocked: true } } } } });
    expect(store.setJobClass("ava", "Knight")).toBe(false);
    expect(store.users.ava.jobClass).toBe("Warrior");
    expect(store.setJobClass("ava", "Mage")).toBe(true);
    expect(store.users.ava.jobClass).toBe("Mage");
    expect(store.setJobClass("ava", "")).toBe(false);
    expect(store.setJobClass("ghost", "Mage")).toBe(false);
  });

  it("mirrors a profile change onto the signed-in hero only", () => {
    const store = freshStore({ ava: {}, ben: {} });
    store.loginUser(store.users.ava);
    store.setBenchRestAt("ben", "x");
    expect((store.currentUser as { benchRestAt?: string }).benchRestAt).toBeUndefined();
    store.setBenchRestAt("ava", "y");
    expect((store.currentUser as { benchRestAt?: string }).benchRestAt).toBe("y");
  });
});

describe("signing in, masquerading, loading", () => {
  it("remembers the signed-in id and forgets it on logout", () => {
    const store = freshStore({ ava: { name: { nick: "Ava" } } });
    store.loginUser(store.users.ava);
    expect(localStorage.getItem("xp_current_user_id")).toBe("ava");
    expect(store.currentUser.isAuthenticated).toBe(true);
    expect(store.currentUser.id).toBe("ava");
    store.logoutUser();
    expect(localStorage.getItem("xp_current_user_id")).toBeNull();
    expect(store.currentUser.isAuthenticated).toBe(false);
    expect(store.currentUser.id).toBeNull();
  });

  it("masquerades, remembers the Game Master and hands control back", () => {
    const store = freshStore({ mom: { isAdult: true }, ava: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    expect(store.currentUser.id).toBe("ava");
    expect(store.currentUser.isImpersonating).toBe(true);
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBe("mom");
    expect(localStorage.getItem("xp_is_impersonating")).toBe("true");
    expect(localStorage.getItem("xp_current_user_id")).toBe("ava");
    store.stopImpersonating();
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(store.currentUser.id).toBe("mom");
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    expect(localStorage.getItem("xp_is_impersonating")).toBeNull();
  });

  it("keeps the first Game Master when masquerading from one masquerade to another", () => {
    const store = freshStore({ mom: {}, ava: {}, ben: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    store.impersonateUser("ben");
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBe("mom");
    expect(store.currentUser.id).toBe("ben");
  });

  it("does not masquerade as an unknown hero", () => {
    const store = freshStore({ mom: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ghost");
    expect(store.currentUser.id).toBe("mom");
    expect(store.currentUser.isImpersonating).toBe(false);
  });

  it("ends a masquerade when anyone signs in or out", () => {
    const store = freshStore({ mom: {}, ava: {}, ben: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    store.loginUser(store.users.ben);
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    store.impersonateUser("ava");
    store.logoutUser();
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(localStorage.getItem("xp_is_impersonating")).toBeNull();
  });

  it("stays signed out when the Game Master is gone", () => {
    const store = freshStore({ mom: {}, ava: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    delete store.users.mom;
    store.stopImpersonating();
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(store.currentUser.id).toBe("ava");
  });

  it("loads the roster, drops heroes that left and restores the saved one", async () => {
    const store = freshStore({ gone: {}, ava: { name: { nick: "Ava" } } });
    localStorage.setItem("xp_current_user_id", "ava");
    (Api.get as jest.Mock).mockResolvedValue({ data: [{ id: "ava", name: { nick: "Ava" } }, { id: "ben", name: { nick: "Ben" } }] });
    await store.loadUsers();
    expect(Object.keys(store.users).sort()).toEqual(["ava", "ben"]);
    expect(Api.get).toHaveBeenCalledWith("users");
    expect(store.currentUser.id).toBe("ava");
    expect(store.currentUser.isAuthenticated).toBe(true);
  });

  it("accepts a raw array and leaves a masquerade alone while refreshing the same profile", async () => {
    const store = freshStore({ mom: {}, ava: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    (Api.get as jest.Mock).mockResolvedValue([{ id: "mom" }, { id: "ava" }]);
    await store.loadUsers();
    expect(store.currentUser.isImpersonating).toBe(true);
    expect(store.currentUser.id).toBe("ava");
  });

  it("ends a masquerade when the saved profile is a different one", async () => {
    const store = freshStore({ mom: {}, ava: {} });
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
    localStorage.setItem("xp_current_user_id", "mom");
    (Api.get as jest.Mock).mockResolvedValue([{ id: "mom" }, { id: "ava" }]);
    await store.loadUsers();
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(store.currentUser.id).toBe("mom");
  });

  it("signs nobody in when there is no saved profile, and survives a failing load", async () => {
    const store = freshStore();
    (Api.get as jest.Mock).mockResolvedValue([{ id: "ava" }]);
    await store.loadUsers();
    expect(store.currentUser.id).toBeNull();
    (Api.get as jest.Mock).mockRejectedValue(new Error("offline"));
    await expect(store.loadUsers()).resolves.toBeUndefined();
    expect(Object.keys(store.users)).toEqual(["ava"]);
  });

  it("ignores a response that is not a list", async () => {
    const store = freshStore({ ava: {} });
    (Api.get as jest.Mock).mockResolvedValue({ data: "nope" });
    await store.loadUsers();
    expect(Object.keys(store.users)).toEqual(["ava"]);
  });

  it("looks a hero up by id, with no fallback, and lists heroes A to Z by nick", () => {
    const store = freshStore({
      c: { name: { nick: "Cleo" } },
      a: { name: { nick: "Ava" } },
      z: {},
      b: { name: { nick: "Ben" } },
    });
    expect(store.getUserById("a")?.name.nick).toBe("Ava");
    expect(store.getUserById("nope")).toBeUndefined();
    expect(store.usersAz.map((user) => user.id)).toEqual(["z", "a", "b", "c"]);
  });

  it("exports the members every importer relies on", () => {
    const store = freshStore();
    expect(Object.keys(store).filter((key) => !key.startsWith("$") && !key.startsWith("_")).sort()).toEqual(
      [
        "addInventoryItem",
        "addQuestGrudge",
        "addUser",
        "buyStorageTier",
        "checkClassUnlocks",
        "clearQuestGrudge",
        "currentUser",
        "getAPInTimeRange",
        "getUserById",
        "impersonateUser",
        "loadUsers",
        "loginUser",
        "logoutUser",
        "persistUser",
        "recordAPGain",
        "setAutoRead",
        "setBedRestAt",
        "setBenchRestAt",
        "setEquipment",
        "setItemCooldown",
        "setJobClass",
        "setLook",
        "setQuestEffects",
        "setPowerTimers",
        "setQuestGrudges",
        "setStreakChests",
        "setVoice",
        "setSkin",
        "setThemeChoice",
        "setWallet",
        "spendInventoryItem",
        "stopImpersonating",
        "storeItem",
        "takeItem",
        "unlockClass",
        "unlockItem",
        "unlockPegasus",
        "unlockQuickDrawSlot",
        "updateClassXp",
        "updateUserGP",
        "updateUserHP",
        "updateUserMP",
        "updateUserXP",
        "users",
        "usersAz",
      ].sort()
    );
  });
});
