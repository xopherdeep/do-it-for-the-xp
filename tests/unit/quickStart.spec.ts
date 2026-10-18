import { BACKUP_STORES, BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import { BUILT_IN_PACKS, QUICK_START_PACK } from "@/lib/services/core/packs/catalog";
import {
  QUICK_START_MAX_HEROES,
  QuickStartError,
  gameMasterProblem,
  heroNames,
  quickStartPlan,
  runQuickStart,
} from "@/lib/services/core/packs/quickStart";
import type { QuickStartDeps } from "@/lib/services/core/packs/quickStart";
import { DEFAULT_WALLET_LIMIT } from "@/lib/services/gp/wallet";
import type { Achievement } from "@/lib/databases/AchievementDb";

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

/** A device with every backup store in memory, and the deps Quick start runs against */
const device = (seed: Record<string, Record<string, unknown>> = {}) => {
  const stores = Object.fromEntries(BACKUP_STORES.map((def) => [def.name, memory(seed[def.name])]));
  const defs: BackupStoreDef[] = BACKUP_STORES.map((def) => ({
    ...def,
    storage: stores[def.name] as unknown as BackupStorage,
    afterRestore: undefined,
  }));
  const service = new BackupService(defs, jest.fn(), () => true);
  const deps: QuickStartDeps = {
    storage: (name) => stores[name] as unknown as ReturnType<QuickStartDeps["storage"]>,
    restore: (file) => service.restoreBackup(file, { mode: "merge" }),
  };
  return { stores, deps };
};

let counter = 0;
const ids = () => `hero-${++counter}`;

describe("the hero names", () => {
  it("trims, drops blanks and repeats, and stops at six", () => {
    expect(heroNames(["  Mia ", "", "mia", "Leo  Jr", "   "])).toEqual(["Mia", "Leo Jr"]);
    const many = Array.from({ length: 10 }, (_, i) => `Kid ${i}`);
    expect(heroNames(many)).toHaveLength(QUICK_START_MAX_HEROES);
  });
});

describe("the Quick start pack", () => {
  it("is a built-in pack, so Settings > Packs can show and remove it", () => {
    expect(BUILT_IN_PACKS).toContain(QUICK_START_PACK);
  });

  it("holds the dishes, the bedroom and homework, each with its beast", () => {
    const quests = QUICK_START_PACK.content.quests ?? [];
    expect(quests.map((quest) => quest.beastId)).toEqual(["beast-dish-goblin", "beast-clutter-chimera", "beast-homework-hydra"]);
    const beasts = new Set((QUICK_START_PACK.content.beasts ?? []).map((beast) => beast.id));
    for (const quest of quests) expect(beasts.has(String(quest.beastId))).toBe(true);
  });

  it("sells every reward for what a new wallet holds, and one evening of chores buys one", () => {
    const rewards = QUICK_START_PACK.content.rewards ?? [];
    const evening = (QUICK_START_PACK.content.quests ?? []).reduce((sum, quest) => sum + Number(quest.gp), 0);
    expect(rewards).toHaveLength(3);
    for (const reward of rewards) {
      expect(Number(reward.basePrice)).toBeLessThanOrEqual(DEFAULT_WALLET_LIMIT);
      expect(Number(reward.basePrice)).toBeLessThanOrEqual(evening);
    }
    expect(QUICK_START_PACK.content.shopStock?.["hometown-market"]).toEqual(rewards.map((reward) => reward.id));
  });
});

describe("the Quick start plan", () => {
  it("makes a hero per name, none a Game Master, each with a different class and picture", () => {
    const { heroes } = quickStartPlan(["Mia", "Leo"], new Map(), new Date(), ids);
    expect(heroes.map((hero) => hero.name.nick)).toEqual(["Mia", "Leo"]);
    expect(heroes.every((hero) => hero.isAdult === false)).toBe(true);
    expect(new Set(heroes.map((hero) => hero.jobClass)).size).toBe(2);
    expect(new Set(heroes.map((hero) => hero.avatar)).size).toBe(2);
  });

  it("assigns every quest to every hero as their own to do", () => {
    const { heroes, backup } = quickStartPlan(["Mia", "Leo"], new Map(), new Date(), ids);
    const quests = backup.stores.__achievements.map((entry) => entry.value as Achievement);
    expect(quests).toHaveLength(3);
    for (const quest of quests) {
      expect(quest.type).toBe("individual");
      expect(quest.assignee).toEqual(heroes.map((hero) => hero.id));
    }
  });

  it("refuses a list with no names", () => {
    expect(() => quickStartPlan([" ", ""])).toThrow(QuickStartError);
  });
});

describe("the Game Master step", () => {
  it("may be skipped, but a name needs a 4-digit PIN and a PIN needs a name", () => {
    expect(gameMasterProblem(undefined)).toBeNull();
    expect(gameMasterProblem({ name: " ", passcode: "" })).toBeNull();
    expect(gameMasterProblem({ name: "Dad", passcode: "" })).toMatch(/4-digit/);
    expect(gameMasterProblem({ name: "Dad", passcode: "12a4" })).toMatch(/4-digit/);
    expect(gameMasterProblem({ name: "", passcode: "1234" })).toMatch(/name/);
    expect(gameMasterProblem({ name: "Dad", passcode: "1234" })).toBeNull();
  });

  it("adds the parent as a Game Master with their PIN, kept off the kids' quests", () => {
    const plan = quickStartPlan(["Mia"], new Map(), new Date(), ids, { name: "Dad", passcode: "1234" });
    expect(plan.gameMaster).toMatchObject({ isAdult: true, passcode: "1234", name: { nick: "Dad" } });
    const profiles = plan.backup.stores.__profiles.map((entry) => entry.value as { id: string });
    expect(profiles.map((profile) => profile.id)).toEqual([plan.gameMaster?.id, plan.heroes[0].id]);
    for (const entry of plan.backup.stores.__achievements) {
      expect((entry.value as Achievement).assignee).toEqual([plan.heroes[0].id]);
    }
  });

  it("leaves nobody Game Master when skipped, and refuses a half-filled step", () => {
    expect(quickStartPlan(["Mia"], new Map(), new Date(), ids, { name: "", passcode: "" }).gameMaster).toBeNull();
    expect(() => quickStartPlan(["Mia"], new Map(), new Date(), ids, { name: "Dad", passcode: "12" })).toThrow(QuickStartError);
  });
});

describe("running Quick start", () => {
  it("seeds the heroes, the beasts, the quests and the Market's shelf on a new device", async () => {
    const { stores, deps } = device();
    const { heroes } = await runQuickStart(["Mia", "Leo"], undefined, deps);
    expect(Array.from(stores.__profiles.data.keys())).toEqual(heroes.map((hero) => hero.id));
    expect(stores.__achievements.data.size).toBe(3);
    expect(stores.__beasts.data.size).toBe(3);
    expect(stores.__accessories.data.size).toBe(3);
    const market = stores.__shops.data.get("hometown-market") as { items: { itemId: string }[] };
    expect(market.items.map((item) => item.itemId)).toEqual(["quick-reward-dessert", "reward-frost-treat", "quick-reward-movie"]);
  });

  it("never runs once a profile exists, and leaves that game alone", async () => {
    const { stores, deps } = device({ __profiles: { dad: { id: "dad", isAdult: true } } });
    await expect(runQuickStart(["Mia"], undefined, deps)).rejects.toThrow(QuickStartError);
    expect(stores.__profiles.data.size).toBe(1);
    expect(stores.__achievements.data.size).toBe(0);
  });
});
