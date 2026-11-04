import { BACKUP_STORES, BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import { existingHeroes, isGameEmpty, runSetup, setupBlocked } from "@/lib/services/setup/runSetup";
import type { SetupDeps } from "@/lib/services/setup/runSetup";
import { setupBlockedReason, SETUP_GM_ONLY_MESSAGE } from "@/lib/services/setup/setupGuard";
import type { SetupAnswers } from "@/lib/services/setup/setupPlan";

jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, abilitiesStorage: { sentinel: "abilities" } }));
jest.mock("@/lib/databases/AccessoriesDb", () => ({
  __esModule: true,
  accessoriesStorage: { sentinel: "accessories" },
  AccessoryType: { RealLife: "real", Virtual: "virtual" },
  Rarity: { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 },
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: { sentinel: "achievements" },
  achievementCategoryStorage: { sentinel: "achievementCategories" },
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({ __esModule: true, beastStorage: { sentinel: "beasts" } }));
jest.mock("@/lib/databases/ChatDb", () => ({ __esModule: true, chatStorage: { sentinel: "chat" } }));
jest.mock("@/lib/databases/DosDontsDb", () => ({ __esModule: true, dosDontsStorage: { sentinel: "dosDonts" } }));
jest.mock("@/lib/databases/PackLibraryDb", () => ({ __esModule: true, packLibraryStorage: { sentinel: "packs" } }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: { sentinel: "profiles" } }));
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ __esModule: true, purchaseLogStorage: { sentinel: "purchaseLog" } }));
jest.mock("@/lib/databases/QuestLogDb", () => ({ __esModule: true, questLogStorage: { sentinel: "questLog" } }));
jest.mock("@/lib/databases/ShopsDb", () => ({
  __esModule: true,
  shopStorage: { sentinel: "shops" },
  ShopItemType: { Ability: 0, Accessory: 1 },
}));
jest.mock("@/lib/databases/TempleDb", () => ({ __esModule: true, templeStorage: { sentinel: "temples" } }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({ __esModule: true, templeProgressStorage: { sentinel: "templeProgress" } }));
jest.mock("@/lib/services/core/StorageService", () => ({ __esModule: true, default: { saveProfiles: jest.fn() } }));
jest.mock("@/router/_Guards/gm.guard", () => ({
  __esModule: true,
  canManageFamily: () => false,
  RESTORE_GM_ONLY_MESSAGE: "GM only",
  passcodeProblem: (passcode: string) => (/^\d{4}$/.test(passcode) ? null : "Game Masters need a 4-digit passcode"),
}));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ loadUsers: jest.fn() }) }));

/** In-memory Ionic Storage stand-in */
const memory = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, unknown>(Object.entries(seed));
  return {
    data,
    create: async () => undefined,
    forEach: async (callback: (value: unknown, key: string, index: number) => unknown) => {
      let index = 0;
      for (const [key, value] of Array.from(data.entries())) {
        if (callback(JSON.parse(JSON.stringify(value)), key, index++) !== undefined) return;
      }
    },
    set: async (key: string, value: unknown) => {
      data.set(key, JSON.parse(JSON.stringify(value)));
    },
    remove: async (key: string) => {
      data.delete(key);
    },
    clear: async () => {
      data.clear();
    },
  };
};

/** A device with every backup store in memory, and the deps the wizard runs against */
const device = (seed: Record<string, Record<string, unknown>> = {}) => {
  const stores = Object.fromEntries(BACKUP_STORES.map((def) => [def.name, memory(seed[def.name])]));
  const defs: BackupStoreDef[] = BACKUP_STORES.map((def) => ({
    ...def,
    storage: stores[def.name] as unknown as BackupStorage,
    afterRestore: undefined,
  }));
  const service = new BackupService(defs, jest.fn(), () => true);
  const deps: SetupDeps = {
    storage: (name) => stores[name] as unknown as ReturnType<SetupDeps["storage"]>,
    restore: (file) => service.restoreBackup(file, { mode: "merge" }),
  };
  return { stores, deps };
};

const answers = (over: Partial<SetupAnswers> = {}): SetupAnswers => ({
  heroes: [{ id: "w1", name: "Mia", age: 9, existing: false, isParent: false }],
  rooms: ["Kitchen"],
  chores: { w1: ["beast-dish-goblin"] },
  extras: false,
  ...over,
});

describe("isGameEmpty", () => {
  it("is true on empty stores, false once a beast or a quest exists", async () => {
    expect(await isGameEmpty(device().deps)).toBe(true);
    expect(await isGameEmpty(device({ __beasts: { b1: { id: "b1" } } }).deps)).toBe(false);
    expect(await isGameEmpty(device({ __achievements: { q1: { id: "q1" } } }).deps)).toBe(false);
  });
});

describe("existingHeroes", () => {
  it("lists profiles with existing true and the adult as isParent", async () => {
    const { deps } = device({
      __profiles: {
        p1: { id: "p1", name: { full: "Dad" }, isAdult: true },
        p2: { id: "p2", name: { full: "Mia" }, isAdult: false },
      },
    });
    expect(await existingHeroes(deps)).toEqual([
      { id: "p1", name: "Dad", age: null, existing: true, isParent: true },
      { id: "p2", name: "Mia", age: null, existing: true, isParent: false },
    ]);
  });
});

describe("runSetup", () => {
  it("restores the plan in merge mode and returns it", async () => {
    const { stores, deps } = device();
    const plan = await runSetup(answers(), deps);
    expect(plan.newProfiles).toHaveLength(1);
    expect(stores.__profiles.data.has(plan.profileIds.w1)).toBe(true);
    expect(stores.__achievements.data.size).toBe(1);
    expect(stores.__beasts.data.size).toBe(1);
  });

  it("keeps a shop that already exists", async () => {
    const { stores, deps } = device();
    await runSetup(answers({ extras: true }), deps);
    const [shopId] = Array.from(stores.__shops.data.keys());
    stores.__shops.data.set(shopId, { id: shopId, mine: true });
    const plan = await runSetup(answers({ extras: true }), deps);
    expect(stores.__shops.data.get(shopId)).toEqual({ id: shopId, mine: true });
    expect(plan.backup.stores.__shops.map((entry) => entry.key)).not.toContain(shopId);
  });

  it("rejects with the restore's error and writes nothing it was not asked to", async () => {
    const { stores, deps } = device();
    const failing: SetupDeps = { ...deps, restore: jest.fn().mockRejectedValueOnce(new Error("disk full")) };
    await expect(runSetup(answers(), failing)).rejects.toThrow("disk full");
    expect(stores.__profiles.data.size).toBe(0);
    expect(stores.__achievements.data.size).toBe(0);
    const plan = await runSetup(answers(), deps);
    expect(stores.__profiles.data.size).toBe(1);
    expect(plan.newProfiles).toHaveLength(1);
  });

  it("never touches __profiles when every hero is existing", async () => {
    const { stores, deps } = device({ __profiles: { p1: { id: "p1", name: { full: "Mia" }, isAdult: false } } });
    const plan = await runSetup(
      answers({
        heroes: [{ id: "p1", name: "Mia", age: 9, existing: true, isParent: false }],
        chores: { p1: ["beast-dish-goblin"] },
      }),
      deps
    );
    expect(plan.newProfiles).toEqual([]);
    expect(plan.backup.stores.__profiles).toEqual([]);
    expect(Array.from(stores.__profiles.data.keys())).toEqual(["p1"]);
  });

  it("refuses when a Game Master exists and the person cannot manage the family, and writes nothing", async () => {
    const { stores, deps } = device({ __profiles: { gm: { id: "gm", name: { full: "Dad" }, isAdult: true } } });
    const kid: SetupDeps = { ...deps, canManage: () => false };
    await expect(runSetup(answers(), kid)).rejects.toThrow(SETUP_GM_ONLY_MESSAGE);
    expect(await setupBlocked(kid)).toBe(SETUP_GM_ONLY_MESSAGE);
    expect(stores.__achievements.data.size).toBe(0);
    expect(stores.__profiles.data.size).toBe(1);
    const gm: SetupDeps = { ...deps, canManage: () => true };
    await runSetup(answers(), gm);
    expect(stores.__achievements.data.size).toBe(1);
  });

  it("stays open while the device has no Game Master", async () => {
    const { deps } = device({ __profiles: { k: { id: "k", name: { full: "Mia" }, isAdult: false } } });
    expect(await setupBlocked({ ...deps, canManage: () => false })).toBeNull();
  });

  it("a re-run keeps an edited beast and quest, and only adds the new hero to the quest", async () => {
    const { stores, deps } = device();
    const first = await runSetup(answers(), deps);
    const [oldHero] = Object.values(first.profileIds);
    const [questId] = Array.from(stores.__achievements.data.keys());
    const beastId = "beast-dish-goblin";
    stores.__beasts.data.set(beastId, { ...(stores.__beasts.data.get(beastId) as object), localImage: "mine.png", achievementIds: ["quest-x"] });
    stores.__achievements.data.set(questId, { ...(stores.__achievements.data.get(questId) as object), name: "Dishes!", reward: 42 });
    await runSetup(
      answers({
        heroes: [
          { id: oldHero, name: "Mia", age: 9, existing: true, isParent: false },
          { id: "w2", name: "Leo", age: 9, existing: false, isParent: false },
        ],
        chores: { [oldHero]: [beastId], w2: [beastId] },
        extras: true,
      }),
      deps
    );
    expect(stores.__beasts.data.get(beastId)).toMatchObject({ localImage: "mine.png", achievementIds: ["quest-x"] });
    const quest = stores.__achievements.data.get(questId) as { name: string; reward: number; assignee: string[] };
    expect(quest).toMatchObject({ name: "Dishes!", reward: 42 });
    expect(quest.assignee).toHaveLength(2);
    expect(quest.assignee[0]).toBe(oldHero);
  });
});

describe("setupBlockedReason", () => {
  it("blocks only when a Game Master exists and the caller cannot manage", () => {
    expect(setupBlockedReason([{ isAdult: true }], false)).toBe(SETUP_GM_ONLY_MESSAGE);
    expect(setupBlockedReason([{ isAdult: true }], true)).toBeNull();
    expect(setupBlockedReason([{ isAdult: false }], false)).toBeNull();
    expect(setupBlockedReason([], false)).toBeNull();
  });
});
