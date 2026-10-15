import { createPinia, setActivePinia } from "pinia";
import Api from "@/lib/api";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Characterization of the user store's actions through Pinia: what each one leaves on the profile, on
 * currentUser, in localStorage and in ProfileDb TODAY. Written before the store was split into
 * src/lib/store/stores/user/*, so it pins the split to the old behaviour. Only what the store talks to
 * (Api, ProfileDb, the GP service, the notification feed) is faked.
 * This file: class XP and class unlocks, Pegasi and Quick Draw slots, AP.
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

describe("class XP, class unlocks", () => {
  it("starts an unlocked class entry and adds XP", () => {
    const store = freshStore({ ava: {} });
    const info = store.updateClassXp("ava", "Warrior", 50);
    expect(info).toEqual({ didLevelUp: false, oldLevel: 1, newLevel: 1, levelsGained: 0, jobClassId: "Warrior" });
    expect(plain(store.users.ava.stats.classes)).toEqual({ Warrior: { level: 1, xp: 50, unlocked: true } });
  });

  it("answers the default result for an unknown hero", () => {
    const store = freshStore();
    expect(store.updateClassXp("ghost", "Warrior", 50)).toEqual({
      didLevelUp: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      jobClassId: "Warrior",
    });
  });

  it("levels the class and grows the hero's max HP and MP when it is their own class", () => {
    const store = freshStore({
      ava: { jobClass: "Warrior", stats: { hp: { now: 10, max: 20 }, mp: { now: 1, max: 2 } } },
    });
    const info = store.updateClassXp("ava", "Warrior", 400);
    expect(info).toEqual({ didLevelUp: true, oldLevel: 1, newLevel: 2, levelsGained: 1, jobClassId: "Warrior" });
    expect(plain(store.users.ava.stats.hp)).toEqual({ now: 15, max: 25 });
    expect(plain(store.users.ava.stats.mp)).toEqual({ now: 1, max: 2 });
  });

  it("treats a hero with no jobClass as the default class", () => {
    const store = freshStore({ ava: { stats: { hp: { now: 10, max: 20 }, mp: { now: 10, max: 20 } } } });
    store.updateClassXp("ava", "default", 400);
    expect(plain(store.users.ava.stats.hp)).toEqual({ now: 12, max: 22 });
    expect(plain(store.users.ava.stats.mp)).toEqual({ now: 12, max: 22 });
  });

  it("leaves max HP alone when it levels another class", () => {
    const store = freshStore({ ava: { jobClass: "Mage", stats: { hp: { now: 10, max: 20 } } } });
    store.updateClassXp("ava", "Warrior", 400);
    expect(plain(store.users.ava.stats.hp)).toEqual({ now: 10, max: 20 });
  });

  it("opens an advanced class when its parent reaches the required level", () => {
    const store = freshStore({ ava: { stats: { classes: { Warrior: { level: 9, xp: 0, unlocked: true } } } } });
    const info = store.updateClassXp("ava", "Warrior", 100 * Math.pow(10, 1.5) + 1);
    expect(info.newLevel).toBe(10);
    expect(plain(store.users.ava.stats.classes.Knight)).toEqual({ level: 1, xp: 0, unlocked: true });
    expect(plain(store.users.ava.stats.classes.Berserker)).toEqual({ level: 1, xp: 0, unlocked: true });
    expect(store.users.ava.stats.classes.Mystic).toBeUndefined();
  });

  it("unlockClass makes the entry when it is missing and keeps XP on one that exists", () => {
    const store = freshStore({ ava: { stats: { classes: { Knight: { level: 3, xp: 50, unlocked: false } } } } });
    store.unlockClass("ava", "Knight");
    store.unlockClass("ava", "Ranger");
    expect(plain(store.users.ava.stats.classes)).toEqual({
      Knight: { level: 3, xp: 50, unlocked: true },
      Ranger: { level: 1, xp: 0, unlocked: true },
    });
    expect(() => store.unlockClass("ghost", "Knight")).not.toThrow();
  });

  it("checkClassUnlocks needs every parent for a crown class", () => {
    const store = freshStore({
      ava: {
        stats: {
          classes: {
            Knight: { level: 10, xp: 0, unlocked: true },
            Mystic: { level: 9, xp: 0, unlocked: true },
          },
        },
      },
    });
    store.checkClassUnlocks("ava");
    expect(store.users.ava.stats.classes.Paladin).toBeUndefined();
    store.users.ava.stats.classes.Mystic.level = 10;
    store.checkClassUnlocks("ava");
    expect(plain(store.users.ava.stats.classes.Paladin)).toEqual({ level: 1, xp: 0, unlocked: true });
  });

  it("checkClassUnlocks skips a class that is already open and a hero that does not exist", () => {
    const store = freshStore({
      ava: { stats: { classes: { Warrior: { level: 10, xp: 0, unlocked: true }, Knight: { level: 4, xp: 9, unlocked: true } } } },
    });
    store.checkClassUnlocks("ava");
    expect(plain(store.users.ava.stats.classes.Knight)).toEqual({ level: 4, xp: 9, unlocked: true });
    expect(() => store.checkClassUnlocks("ghost")).not.toThrow();
  });

  it("checkClassUnlocks does nothing for a hero with no classes", () => {
    const store = freshStore({ ava: {} });
    store.checkClassUnlocks("ava");
    expect(store.users.ava.stats).toBeUndefined();
  });
});

describe("Pegasi and Quick Draw slots", () => {
  it("rebuilds an index-keyed object into nine flags and sets one", () => {
    const store = freshStore({ ava: { stats: { pegasi: { 3: true } } } });
    store.unlockPegasus("ava", 5);
    expect(plain(store.users.ava.stats.pegasi)).toEqual([false, false, false, true, false, true, false, false, false]);
  });

  it("starts from nothing and keeps an array's flags", () => {
    const store = freshStore({ ava: {}, ben: { stats: { pegasi: [true, false] } } });
    store.unlockPegasus("ava", 0);
    store.unlockPegasus("ben", 8);
    expect(plain(store.users.ava.stats.pegasi)).toEqual([true, false, false, false, false, false, false, false, false]);
    expect(plain(store.users.ben.stats.pegasi)).toEqual([true, false, false, false, false, false, false, false, true]);
  });

  it("rebuilds the flags but sets none for an out-of-range or fractional index", () => {
    const store = freshStore({ ava: { stats: { pegasi: { 1: true } } } });
    store.unlockPegasus("ava", 9);
    store.unlockPegasus("ava", -1);
    store.unlockPegasus("ava", 1.5);
    expect(plain(store.users.ava.stats.pegasi)).toEqual([false, true, false, false, false, false, false, false, false]);
  });

  it("opens Quick Draw slots up to three", () => {
    const store = freshStore({ ava: {} });
    store.unlockQuickDrawSlot("ava");
    expect(store.users.ava.stats.quickDrawSlots).toBe(2);
    store.unlockQuickDrawSlot("ava");
    store.unlockQuickDrawSlot("ava");
    store.unlockQuickDrawSlot("ava");
    expect(store.users.ava.stats.quickDrawSlots).toBe(3);
    expect(() => store.unlockQuickDrawSlot("ghost")).not.toThrow();
  });
});

describe("AP", () => {
  it("records a gain with its source and a timestamp", () => {
    const store = freshStore({ ava: {} });
    store.recordAPGain({ userId: "ava", amount: 5, source: "battle" });
    store.recordAPGain({ userId: "ava", amount: 3, source: "quest", at: "2026-10-01T10:00:00.000Z" });
    const ap = plain(store.users.ava.stats.ap);
    expect(ap.total).toBe(8);
    expect(ap.history).toHaveLength(2);
    expect(ap.history[0]).toEqual({ amount: 5, timestamp: expect.any(String), source: "battle" });
    expect(ap.history[1]).toEqual({ amount: 3, timestamp: "2026-10-01T10:00:00.000Z", source: "quest" });
  });

  it("stamps now when the given time is not a date", () => {
    const store = freshStore({ ava: {} });
    store.recordAPGain({ userId: "ava", amount: 1, source: "x", at: "not a date" });
    expect(new Date(store.users.ava.stats.ap.history[0].timestamp).getTime()).not.toBeNaN();
    expect(store.users.ava.stats.ap.history[0].timestamp).not.toBe("not a date");
  });

  it("records nothing for zero, negative or an unknown hero", () => {
    const store = freshStore({ ava: {} });
    store.recordAPGain({ userId: "ava", amount: 0, source: "x" });
    store.recordAPGain({ userId: "ava", amount: -2, source: "x" });
    store.recordAPGain({ userId: "ghost", amount: 2, source: "x" });
    expect(store.users.ava.stats).toBeUndefined();
  });

  it("totals the gains from the last N days", () => {
    const day = 24 * 60 * 60 * 1000;
    const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * day).toISOString();
    const store = freshStore({
      ava: {
        stats: {
          ap: {
            total: 10,
            history: [
              { amount: 1, timestamp: iso(0.5), source: "a" },
              { amount: 2, timestamp: iso(2), source: "b" },
              { amount: 4, timestamp: iso(20), source: "c" },
            ],
          },
        },
      },
    });
    expect(store.getAPInTimeRange("ava", 1)).toEqual({ total: 1, records: [expect.objectContaining({ source: "a" })] });
    expect(store.getAPInTimeRange("ava", 7).total).toBe(3);
    expect(store.getAPInTimeRange("ava", 30).total).toBe(7);
    expect(store.getAPInTimeRange("ghost", 7)).toEqual({ total: 0, records: [] });
    expect(freshStore({ ben: {} }).getAPInTimeRange("ben", 7)).toEqual({ total: 0, records: [] });
  });
});
