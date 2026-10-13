import { createPinia, setActivePinia } from "pinia";
import Api from "@/lib/api";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Characterization of the user store's actions through Pinia: what each one leaves on the profile, on
 * currentUser, in localStorage and in ProfileDb TODAY. Written before the store was split into
 * src/lib/store/stores/user/*, so it pins the split to the old behaviour. Only what the store talks to
 * (Api, ProfileDb, the GP service, the notification feed) is faked.
 * This file: the write queue, HP and MP, GP and the wallet, hero XP.
 */
const mockSetProfile = jest.fn((_profile: unknown) => Promise.resolve());
const mockSyncGP = jest.fn((_userId: string) => Promise.resolve());
const mockNotify = jest.fn();

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
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: mockSyncGP }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: (input: unknown) => mockNotify(input) }));

/** A plain copy of a profile slice, so assertions do not depend on Vue proxies */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
/** Let the persistence queue (a microtask, then one await per hero) run to the end */
const flush = async () => {
  for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
};

const freshStore = (users: Record<string, unknown> = {}) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  Object.entries(users).forEach(([id, profile]) => store.addUser({ id, ...(profile as object) }));
  return store;
};

beforeEach(() => {
  localStorage.clear();
  mockSetProfile.mockClear();
  mockSyncGP.mockClear();
  mockNotify.mockClear();
  (Api.get as jest.Mock).mockReset();
});

describe("persistence", () => {
  it("coalesces writes made in one tick into one write per hero", async () => {
    const store = freshStore({ ava: { name: { nick: "Ava" } }, ben: {} });
    store.updateUserHP({ userId: "ava", amount: -1 });
    store.updateUserMP({ userId: "ava", amount: -1 });
    store.updateUserHP({ userId: "ben", amount: -1 });
    expect(mockSetProfile).not.toHaveBeenCalled();
    await flush();
    expect(mockSetProfile).toHaveBeenCalledTimes(2);
    expect(mockSetProfile.mock.calls.map((call) => (call[0] as { id: string }).id)).toEqual(["ava", "ben"]);
  });

  it("writes a plain copy of the profile as it stood at flush time", async () => {
    const store = freshStore({ ava: {} });
    store.updateUserHP({ userId: "ava", amount: -10 });
    store.updateUserHP({ userId: "ava", amount: -10 });
    await flush();
    const written = mockSetProfile.mock.calls[0][0] as { stats: { hp: { now: number } } };
    expect(written.stats.hp.now).toBe(80);
  });

  it("ignores an unknown hero and an empty id", async () => {
    const store = freshStore({ ava: {} });
    store.persistUser("nobody");
    store.persistUser("");
    await flush();
    expect(mockSetProfile).not.toHaveBeenCalled();
    store.persistUser("ava");
    await flush();
    expect(mockSetProfile).toHaveBeenCalledTimes(1);
  });

  it("keeps writing the next hero when one write fails", async () => {
    const store = freshStore({ ava: {}, ben: {} });
    mockSetProfile.mockImplementationOnce(() => Promise.reject(new Error("disk full")));
    store.persistUser("ava");
    store.persistUser("ben");
    await flush();
    expect(mockSetProfile).toHaveBeenCalledTimes(2);
  });

  it("writes again for a change made after a flush", async () => {
    const store = freshStore({ ava: {} });
    store.persistUser("ava");
    await flush();
    store.persistUser("ava");
    await flush();
    expect(mockSetProfile).toHaveBeenCalledTimes(2);
  });
});

describe("HP and MP", () => {
  it("turns a plain-number HP and MP into { now, max } objects", () => {
    const store = freshStore({ ava: { stats: { hp: 50, maxHp: 80, mp: 10 } } });
    expect(store.updateUserHP({ userId: "ava", amount: -20 })).toBe(true);
    expect(plain(store.users.ava.stats)).toEqual({
      hp: { now: 30, max: 80 },
      maxHp: 80,
      mp: { now: 10, max: 100 },
    });
  });

  it("builds both objects at 100 for a hero with no stats", () => {
    const store = freshStore({ ava: {} });
    expect(store.updateUserHP({ userId: "ava", amount: -5 })).toBe(true);
    expect(plain(store.users.ava.stats)).toEqual({ hp: { now: 95, max: 100 }, mp: { now: 100, max: 100 } });
  });

  it("follows a top-level maxHp over the object's max", () => {
    const store = freshStore({ ava: { stats: { hp: { now: 40, max: 50 }, maxHp: 60, mp: { now: 5, max: 5 } } } });
    store.updateUserHP({ userId: "ava", amount: 100 });
    expect(plain(store.users.ava.stats.hp)).toEqual({ now: 60, max: 60 });
  });

  it("clamps at zero and says the hero is down", () => {
    const store = freshStore({ ava: { stats: { hp: { now: 5, max: 10 }, mp: { now: 1, max: 1 } } } });
    expect(store.updateUserHP({ userId: "ava", amount: -50 })).toBe(false);
    expect(store.users.ava.stats.hp.now).toBe(0);
  });

  it("answers true for an unknown hero and writes nothing", async () => {
    const store = freshStore();
    expect(store.updateUserHP({ userId: "ghost", amount: -5 })).toBe(true);
    expect(store.updateUserMP({ userId: "ghost", amount: -5 })).toBe(true);
    await flush();
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it("mirrors the stats onto currentUser only for the signed-in hero", () => {
    const store = freshStore({ ava: {}, ben: {} });
    store.loginUser(store.users.ava);
    store.updateUserHP({ userId: "ben", amount: -1 });
    expect(store.currentUser.stats).toBeNull();
    store.updateUserHP({ userId: "ava", amount: -1 });
    expect(store.currentUser.stats).toBe(store.users.ava.stats);
  });

  it("spends and restores MP, standardizing HP while it is there", () => {
    const store = freshStore({ ava: { stats: { mp: 20, maxMp: 30, hp: 7 } } });
    expect(store.updateUserMP({ userId: "ava", amount: -5 })).toBe(true);
    expect(plain(store.users.ava.stats)).toEqual({
      mp: { now: 15, max: 30 },
      maxMp: 30,
      hp: { now: 7, max: 100 },
    });
    expect(store.updateUserMP({ userId: "ava", amount: -999 })).toBe(false);
    expect(store.users.ava.stats.mp.now).toBe(0);
    store.updateUserMP({ userId: "ava", amount: 999 });
    expect(store.users.ava.stats.mp.now).toBe(30);
  });

  it("builds both objects at 100 for a hero with no stats (MP first)", () => {
    const store = freshStore({ ava: {} });
    store.updateUserMP({ userId: "ava", amount: -40 });
    expect(plain(store.users.ava.stats)).toEqual({ mp: { now: 60, max: 100 }, hp: { now: 100, max: 100 } });
  });
});

describe("GP and the wallet", () => {
  it("starts a purse for a hero with no stats", async () => {
    const store = freshStore({ ava: {} });
    await store.updateUserGP({ userId: "ava", wallet: 40 });
    expect(plain(store.users.ava.stats.gp)).toEqual({ wallet: 40, savings: 0, debt: 0, hospitalBill: 0, limit: 100 });
    expect(mockSyncGP).toHaveBeenCalledWith("ava");
  });

  it("adds to wallet, savings and debt, and skips the ones left out", async () => {
    const store = freshStore({ ava: { stats: { gp: { wallet: 10, savings: 5, debt: 2, limit: 500 } } } });
    await store.updateUserGP({ userId: "ava", wallet: 5, debt: 3 });
    expect(plain(store.users.ava.stats.gp)).toEqual({ wallet: 15, savings: 5, debt: 5, limit: 500 });
  });

  it("sends wallet overflow to savings", async () => {
    const store = freshStore({ ava: { stats: { gp: { wallet: 90, savings: 7, debt: 0 } } } });
    await store.updateUserGP({ userId: "ava", wallet: 80 });
    expect(plain(store.users.ava.stats.gp)).toEqual({ wallet: 100, savings: 77, debt: 0 });
  });

  it("gives stats that lack a purse the starting purse", async () => {
    const store = freshStore({ ava: { stats: { level: 3 } } });
    await store.updateUserGP({ userId: "ava", savings: 12 });
    expect(plain(store.users.ava.stats)).toEqual({ level: 3, gp: { wallet: 0, savings: 12, debt: 0, hospitalBill: 0, limit: 100 } });
  });

  it("does nothing for an unknown hero", async () => {
    const store = freshStore();
    await store.updateUserGP({ userId: "ghost", wallet: 5 });
    expect(mockSyncGP).not.toHaveBeenCalled();
  });

  it("replaces the purse wholesale and coerces what it is given", () => {
    const store = freshStore({ ava: { stats: { gp: { wallet: 10, savings: 20, debt: 3, limit: 100, extra: "kept" } } } });
    store.loginUser(store.users.ava);
    store.setWallet("ava", { wallet: "40" as unknown as number, limit: 300 });
    expect(plain(store.users.ava.stats.gp)).toEqual({ wallet: 40, savings: 20, debt: 3, hospitalBill: 0, limit: 300, extra: "kept" });
    expect(store.currentUser.stats).toBe(store.users.ava.stats);
  });

  it("falls back to 0 for a broken number and to the starting limit", () => {
    const store = freshStore({ ava: {} });
    store.setWallet("ava", { wallet: Number.NaN, savings: undefined, limit: -5 });
    expect(plain(store.users.ava.stats.gp)).toEqual({ wallet: 0, savings: 0, debt: 0, hospitalBill: 0, limit: 100 });
    expect(() => store.setWallet("ghost", { wallet: 1 })).not.toThrow();
  });
});

describe("hero XP", () => {
  it("does nothing but answer for an unknown hero", () => {
    const store = freshStore();
    expect(store.updateUserXP({ userId: "ghost", amount: 500 })).toEqual({
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
  });

  it("adds XP without a level-up and sets the next target", () => {
    const store = freshStore({ ava: {} });
    const info = store.updateUserXP({ userId: "ava", amount: 50 });
    expect(info.didLevelUp).toBe(false);
    expect(info.newLevel).toBe(1);
    expect(plain(store.users.ava.stats)).toEqual({ level: 1, xp: { now: 50, next_level: 282 } });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("levels up, fills HP and MP, grows the stats and tells the feed", () => {
    const store = freshStore({ ava: { jobClass: "Warrior", stats: { hp: { now: 3, max: 60 }, mp: { now: 1, max: 10 } } } });
    const info = store.updateUserXP({ userId: "ava", amount: 400 });
    expect(info.didLevelUp).toBe(true);
    expect(info.oldLevel).toBe(1);
    expect(info.newLevel).toBe(2);
    expect(info.levelsGained).toBe(1);
    const stats = plain(store.users.ava.stats);
    expect(stats.level).toBe(2);
    expect(stats.xp).toEqual({ now: 400, next_level: 519 });
    expect(stats.hp).toEqual({ now: info.newMaxHp, max: info.newMaxHp });
    expect(stats.mp).toEqual({ now: info.newMaxMp, max: info.newMaxMp });
    expect(stats.special).toEqual(info.statsGained);
    expect(mockNotify).toHaveBeenCalledWith({
      heroId: "ava",
      kind: "level-up",
      refId: "level-2",
      title: "Level 2!",
      body: "You grew stronger. HP and MP are full again.",
    });
  });

  it("counts every level climbed in one go", () => {
    const store = freshStore({ ava: { jobClass: "Mage" } });
    const info = store.updateUserXP({ userId: "ava", amount: 1100 });
    expect(info.levelsGained).toBe(info.newLevel - 1);
    expect(info.levelsGained).toBeGreaterThan(1);
    expect(mockNotify.mock.calls[0][0].body).toBe(`You climbed ${info.levelsGained} levels. HP and MP are full again.`);
  });

  it("adds the hero's class level to the new maximum (an absent class counts as level 1)", () => {
    const plainHero = freshStore({ ava: { jobClass: "Warrior" } });
    const classy = freshStore({ ava: { jobClass: "Warrior", stats: { classes: { Warrior: { level: 4, xp: 0, unlocked: true } } } } });
    const without = plainHero.updateUserXP({ userId: "ava", amount: 400 });
    const withClass = classy.updateUserXP({ userId: "ava", amount: 400 });
    expect(withClass.newMaxHp).toBe(without.newMaxHp + 15);
  });

  it("previews without touching the profile when commit is false", async () => {
    const store = freshStore({ ava: { jobClass: "Warrior", stats: { level: 1, xp: { now: 10, next_level: 282 }, hp: { now: 5, max: 5 } } } });
    mockSetProfile.mockClear();
    const before = plain(store.users.ava.stats);
    const info = store.updateUserXP({ userId: "ava", amount: 400, commit: false });
    expect(info.didLevelUp).toBe(true);
    expect(info.newLevel).toBe(2);
    expect(plain(store.users.ava.stats)).toEqual(before);
    expect(mockNotify).not.toHaveBeenCalled();
    await flush();
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it("gives a hero with no stats a stats object when committing, and none when previewing", () => {
    const store = freshStore({ ava: {}, ben: {} });
    store.updateUserXP({ userId: "ava", amount: 10 });
    expect(plain(store.users.ava.stats)).toEqual({ level: 1, xp: { now: 10, next_level: 282 } });
    store.updateUserXP({ userId: "ben", amount: 10, commit: false });
    expect(store.users.ben.stats).toBeUndefined();
  });

  it("mirrors a commit onto currentUser", () => {
    const store = freshStore({ ava: {} });
    store.loginUser(store.users.ava);
    store.updateUserXP({ userId: "ava", amount: 10 });
    expect(store.currentUser.stats).toBe(store.users.ava.stats);
  });
});
