import { BACKUP_STORES, BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import { BUILT_IN_PACKS, FAMILY_PACK } from "@/lib/services/core/packs/catalog";
import { PACK_FORMAT, PACK_FORMAT_VERSION, PackFormatError, packToJson, parsePack } from "@/lib/services/core/packs/packFormat";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import {
  PACK_STORES,
  loadPack,
  packIds,
  packStatus,
  packToBackup,
  readSnapshot,
  removePack,
} from "@/lib/services/core/packs/packService";
import type { PackDeps, PackStoreName } from "@/lib/services/core/packs/packService";
import { getAllShops } from "@/lib/engine/core/shopRegistry";

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
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canManageFamily: () => true, RESTORE_GM_ONLY_MESSAGE: "GM only" }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ loadUsers: jest.fn() }) }));

/** In-memory Ionic Storage stand-in, enough for BackupService and the pack service */
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

type Memory = ReturnType<typeof memory>;

/** A world with the family's own records in it, and the deps that load and remove packs against it */
const world = (seed: Partial<Record<PackStoreName, Record<string, unknown>>> = {}) => {
  const stores = Object.fromEntries(PACK_STORES.map((name) => [name, memory(seed[name])])) as Record<PackStoreName, Memory>;
  const defs: BackupStoreDef[] = BACKUP_STORES.map((def) =>
    stores[def.name as PackStoreName] ? { ...def, storage: stores[def.name as PackStoreName] as unknown as BackupStorage } : def
  );
  const service = new BackupService(defs, jest.fn(), () => true);
  const deps: PackDeps = {
    storage: (name) => stores[name] as unknown as ReturnType<PackDeps["storage"]>,
    restore: (file) => service.restoreBackup(file, { mode: "merge" }),
    canManage: () => true,
  };
  return { stores, deps };
};

/** A small second pack that shares a beast, a reward and the Market with the Family pack */
const TINY: XpPack = {
  format: PACK_FORMAT,
  formatVersion: PACK_FORMAT_VERSION,
  id: "tiny",
  name: "Tiny",
  version: "1.0.0",
  audience: "Tests",
  description: "A pack for the specs.",
  content: {
    categories: [{ id: "cat-tiny", name: "Tiny" }],
    beasts: [FAMILY_PACK.content.beasts!.find((beast) => beast.id === "beast-homework-hydra")!],
    quests: [{ ...FAMILY_PACK.content.quests!.find((quest) => quest.id === "quest-homework")!, id: "tiny-homework", categoryId: "cat-tiny" }],
    rewards: [FAMILY_PACK.content.rewards!.find((reward) => reward.id === "reward-frost-treat")!],
    shopStock: { "hometown-market": ["reward-frost-treat"] },
  },
};

describe("the pack file", () => {
  it("reads back every built-in pack from its own JSON", () => {
    for (const pack of BUILT_IN_PACKS) {
      expect(parsePack(packToJson(pack))).toEqual(JSON.parse(packToJson(pack)));
    }
  });

  it("turns away files that are not packs, from another format, or with repeated ids", () => {
    const json = JSON.parse(packToJson(TINY));
    expect(() => parsePack("{oops")).toThrow(PackFormatError);
    expect(() => parsePack({ ...json, format: "xp-backup" })).toThrow(PackFormatError);
    expect(() => parsePack({ ...json, formatVersion: 2 })).toThrow(/format 2/);
    expect(() => parsePack({ ...json, id: "Not An Id" })).toThrow(PackFormatError);
    expect(() => parsePack({ ...json, name: "" })).toThrow(/"name"/);
    expect(() => parsePack({ ...json, content: { categories: [{ id: "a" }, { id: "a" }] } })).toThrow(/more than once/);
    expect(() => parsePack({ ...json, content: { shopStock: { market: [1] } } })).toThrow(PackFormatError);
  });
});

describe("the built-in packs", () => {
  const shopIds = new Set(getAllShops().map((shop) => shop.id));

  it("have distinct pack ids", () => {
    const ids = BUILT_IN_PACKS.map((pack) => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BUILT_IN_PACKS.map((pack) => [pack.id, pack] as const))("%s carries everything its quests and shelves point at", (_id, pack) => {
    const beasts = new Set(packIds(pack).beasts);
    const categories = new Set(packIds(pack).categories);
    const rewards = new Set(packIds(pack).rewards);
    for (const quest of pack.content.quests ?? []) {
      expect(categories.has(quest.categoryId)).toBe(true);
      if (quest.beastId) expect(beasts.has(quest.beastId)).toBe(true);
    }
    for (const [shopId, itemIds] of Object.entries(pack.content.shopStock ?? {})) {
      expect(shopIds.has(shopId)).toBe(true);
      for (const itemId of itemIds) expect(rewards.has(itemId)).toBe(true);
    }
    expect(pack.content.quests?.length).toBeGreaterThan(0);
  });

  it("never share a quest, category or house rule id, so each pack owns its own", () => {
    for (const list of ["quests", "categories", "dosDonts"] as const) {
      const all = BUILT_IN_PACKS.flatMap((pack) => packIds(pack)[list]);
      expect(new Set(all).size).toBe(all.length);
    }
  });
});

describe("loading a pack", () => {
  const family = {
    __achievements: { "quest-kids-own": { id: "quest-kids-own", achievementName: "Feed the dragon", beastId: "beast-dish-goblin", categoryId: "cat-kids" } },
    __achievementCategories: { "cat-kids": { id: "cat-kids", name: "The Kids' Own Chores" } },
    __shops: { "hometown-market": { id: "hometown-market", name: "Our Market", items: [{ itemId: "my-reward", type: 1 }] } },
    __accessories: { "my-reward": { id: "my-reward", name: "Ice Cream Trip" } },
  };

  it("adds the pack, keeps the family's own records and adds stock to a shelf without dropping theirs", async () => {
    const { stores, deps } = world(family);
    await loadPack(FAMILY_PACK, deps);

    expect(stores.__achievements.data.get("quest-kids-own")).toEqual(family.__achievements["quest-kids-own"]);
    expect(stores.__achievements.data.size).toBe(FAMILY_PACK.content.quests!.length + 1);
    const market = stores.__shops.data.get("hometown-market") as { name: string; items: { itemId: string }[] };
    expect(market.name).toBe("Our Market");
    expect(market.items[0].itemId).toBe("my-reward");
    expect(market.items.length).toBe(1 + FAMILY_PACK.content.shopStock!["hometown-market"].length);
    expect(packStatus(FAMILY_PACK, BUILT_IN_PACKS, await readSnapshot(deps)).state).toBe("loaded");
  });

  it("can be loaded again without a second copy of anything", async () => {
    const { stores, deps } = world(family);
    await loadPack(FAMILY_PACK, deps);
    const sizes = () => PACK_STORES.map((name) => stores[name].data.size);
    const market = () => (stores.__shops.data.get("hometown-market") as { items: unknown[] }).items.length;
    const before = [sizes(), market()];
    await loadPack(FAMILY_PACK, deps);
    expect([sizes(), market()]).toEqual(before);
  });

  it("only writes the stores the pack fills", () => {
    expect(Object.keys(packToBackup(TINY).stores).sort()).toEqual(
      ["__accessories", "__achievementCategories", "__achievements", "__beasts", "__shops"].sort()
    );
  });

  it("refuses anyone who is not a Game Master", async () => {
    const { deps } = world();
    await expect(loadPack(TINY, { ...deps, canManage: () => false })).rejects.toThrow("GM only");
    await expect(removePack(TINY, [TINY], { ...deps, canManage: () => false })).rejects.toThrow("GM only");
  });
});

describe("removing a pack", () => {
  const packs = [FAMILY_PACK, TINY];

  it("takes back only the pack's records and leaves an empty-handed pack status", async () => {
    const { stores, deps } = world({ __accessories: { "my-reward": { id: "my-reward" } } });
    await loadPack(FAMILY_PACK, deps);
    await removePack(FAMILY_PACK, packs, deps);

    expect(stores.__achievements.data.size).toBe(0);
    expect(stores.__dosDonts.data.size).toBe(0);
    expect(Array.from(stores.__accessories.data.keys())).toEqual(["my-reward"]);
    for (const shop of Array.from(stores.__shops.data.values()) as { items: unknown[] }[]) expect(shop.items).toEqual([]);
    expect(packStatus(FAMILY_PACK, packs, await readSnapshot(deps)).state).toBe("none");
  });

  it("keeps a beast and a category a family quest still uses", async () => {
    const { stores, deps } = world({
      __achievements: { mine: { id: "mine", beastId: "beast-socktopus", categoryId: "cat-chamber" } },
    });
    await loadPack(FAMILY_PACK, deps);
    await removePack(FAMILY_PACK, packs, deps);

    expect(stores.__beasts.data.has("beast-socktopus")).toBe(true);
    expect(stores.__achievementCategories.data.has("cat-chamber")).toBe(true);
    expect(stores.__beasts.data.has("beast-dish-goblin")).toBe(false);
    expect(stores.__achievements.data.has("mine")).toBe(true);
  });

  it("keeps what another loaded pack shares, and lets it go once that pack is gone too", async () => {
    const { stores, deps } = world();
    await loadPack(FAMILY_PACK, deps);
    await loadPack(TINY, deps);
    await removePack(FAMILY_PACK, packs, deps);

    expect(stores.__beasts.data.has("beast-homework-hydra")).toBe(true);
    expect(stores.__accessories.data.has("reward-frost-treat")).toBe(true);
    const market = stores.__shops.data.get("hometown-market") as { items: { itemId: string }[] };
    expect(market.items.map((item) => item.itemId)).toEqual(["reward-frost-treat"]);
    expect(stores.__achievements.data.has("tiny-homework")).toBe(true);

    await removePack(TINY, packs, deps);
    expect(stores.__beasts.data.size).toBe(0);
    expect(stores.__accessories.data.size).toBe(0);
  });

  it("calls a pack partly loaded when only some of its own records are there", async () => {
    const { stores, deps } = world();
    await loadPack(FAMILY_PACK, deps);
    stores.__achievements.data.delete("quest-socks");
    expect(packStatus(FAMILY_PACK, packs, await readSnapshot(deps)).state).toBe("partial");
  });
});
