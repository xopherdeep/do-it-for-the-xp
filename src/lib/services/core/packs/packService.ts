/**
 * Loading and removing content packs (packFormat.ts).
 *
 * Loading turns a pack into a backup file and hands it to BackupService.restoreBackup in "merge" mode, so it keeps
 * every record the family made, replaces only the records whose ids the pack lists, and is rolled back as a whole
 * if a store fails. Shop stock is merged into the shop records already there (or the registry's shop when there is
 * none yet), so a pack only ever adds items to a shelf.
 *
 * Removing takes back the records the pack lists, except:
 * - ids another loaded pack also lists (a library beast, a preset reward), which stay while that pack is loaded;
 * - a beast or quest category that a quest staying behind still points at, so nothing the family keeps breaks.
 * The pack's rewards leave every shelf with them, and the items only this pack stocked leave the shops it stocked.
 *
 * Pure planning (packToBackup, packStatus, planRemoval) is kept apart from storage (loadPack, removePack), so the
 * rules are tested without a database.
 */
import type { BackupEntry, BackupFile, RestoreResult } from "@/lib/services/core/BackupService";
import { BACKUP_STORES, BACKUP_VERSION, BackupPermissionError, backupService } from "@/lib/services/core/BackupService";
import type { Storage } from "@ionic/storage";
import { ShopItemType } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import type { ShopMetadata } from "@/lib/engine/core/shopRegistry";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import type { PackContent, XpPack } from "./packFormat";

/** Each record list of a pack and the store (its Ionic Storage name) it lands in */
export const PACK_LIST_STORES = {
  categories: "__achievementCategories",
  beasts: "__beasts",
  quests: "__achievements",
  abilities: "__abilities",
  rewards: "__accessories",
  dosDonts: "__dosDonts",
} as const;

export type PackList = keyof typeof PACK_LIST_STORES;
export type PackStoreName = (typeof PACK_LIST_STORES)[PackList] | "__shops";

/** Restore order: categories and beasts before the quests that use them, rewards before the shops that sell them */
const PACK_LISTS: readonly PackList[] = ["categories", "beasts", "quests", "abilities", "rewards", "dosDonts"];
export const PACK_STORES: readonly PackStoreName[] = [...PACK_LISTS.map((list) => PACK_LIST_STORES[list]), "__shops"];

/** What each store holds right now, by key */
export type PackSnapshot = Record<PackStoreName, Map<string, unknown>>;

export const emptySnapshot = (): PackSnapshot =>
  Object.fromEntries(PACK_STORES.map((name) => [name, new Map<string, unknown>()])) as PackSnapshot;

const idsOf = (records: readonly { id?: unknown }[] | undefined): string[] => (records ?? []).map((record) => String(record.id));

/** Every id the pack lists, per list */
export const packIds = (pack: XpPack): Record<PackList, string[]> =>
  Object.fromEntries(PACK_LISTS.map((list) => [list, idsOf(pack.content[list])])) as Record<PackList, string[]>;

/** A short count of what is inside, for the pack card: "12 quests, 8 beasts, 6 rewards" */
export const packSummary = (pack: XpPack): string => {
  const counts: [number, string, string][] = [
    [pack.content.quests?.length ?? 0, "quest", "quests"],
    [pack.content.beasts?.length ?? 0, "beast", "beasts"],
    [pack.content.abilities?.length ?? 0, "Power", "Powers"],
    [pack.content.rewards?.length ?? 0, "reward", "rewards"],
    [pack.content.dosDonts?.length ?? 0, "house rule", "house rules"],
  ];
  return counts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
    .join(", ");
};

const registryShop = (meta: ShopMetadata): ShopInterface => ({
  id: meta.id,
  name: meta.name,
  description: meta.description,
  world: meta.world,
  icon: `fad fa-${meta.icon}`,
  clerkName: meta.clerkName,
  items: [],
});

/** The shop records after the pack's stock is put on their shelves; a shop the registry and the store don't know is skipped */
export const stockedShops = (
  shopStock: PackContent["shopStock"],
  shopsNow: ReadonlyMap<string, unknown>,
  registry: readonly ShopMetadata[] = getAllShops()
): ShopInterface[] =>
  Object.entries(shopStock ?? {}).flatMap(([shopId, itemIds]) => {
    const current = shopsNow.get(shopId) as ShopInterface | undefined;
    const meta = registry.find((shop) => shop.id === shopId);
    const base = current ?? (meta ? registryShop(meta) : undefined);
    if (!base) return [];
    const items = [...(base.items ?? [])];
    const shelved = new Set(items.map((item) => item.itemId));
    for (const itemId of itemIds) {
      const isShelved = shelved.has(itemId);
      if (isShelved) continue;
      shelved.add(itemId);
      items.push({ itemId, type: ShopItemType.Accessory });
    }
    return [{ ...base, items }];
  });

const entries = (records: readonly { id?: unknown }[]): BackupEntry[] =>
  records.map((record) => ({ key: String(record.id), value: record }));

/** The pack as a backup file for restoreBackup(file, { mode: "merge" }); only the stores it fills are in it */
export const packToBackup = (
  pack: XpPack,
  shopsNow: ReadonlyMap<string, unknown> = new Map(),
  now: Date = new Date(),
  registry?: readonly ShopMetadata[]
): BackupFile => {
  const stores: Record<string, BackupEntry[]> = {};
  for (const list of PACK_LISTS) {
    const records = pack.content[list] ?? [];
    const hasRecords = records.length > 0;
    if (hasRecords) stores[PACK_LIST_STORES[list]] = entries(records);
  }
  const shops = stockedShops(pack.content.shopStock, shopsNow, registry);
  const hasStockedShops = shops.length > 0;
  if (hasStockedShops) stores.__shops = entries(shops);
  return { version: BACKUP_VERSION, exportedAt: now.toISOString(), stores };
};

/** Ids the other packs also list, per list, so a pack's status and removal look only at what is truly its own */
const othersIds = (pack: XpPack, packs: readonly XpPack[]): Record<PackList, Set<string>> => {
  const shared = Object.fromEntries(PACK_LISTS.map((list) => [list, new Set<string>()])) as Record<PackList, Set<string>>;
  for (const other of packs) {
    const isSamePack = other.id === pack.id;
    if (isSamePack) continue;
    const ids = packIds(other);
    for (const list of PACK_LISTS) ids[list].forEach((id) => shared[list].add(id));
  }
  return shared;
};

export interface PackStatus {
  state: "loaded" | "partial" | "none";
  /** How many of the pack's own records are in the app now, out of `total` */
  present: number;
  total: number;
}

/**
 * Whether a pack is in the app, read from the records themselves (so it survives a backup and restore): a pack counts
 * the records only it lists, or every record when it shares them all.
 */
export const packStatus = (pack: XpPack, packs: readonly XpPack[], snapshot: PackSnapshot): PackStatus => {
  const ids = packIds(pack);
  const shared = othersIds(pack, packs);
  let own = PACK_LISTS.flatMap((list) => ids[list].filter((id) => !shared[list].has(id)).map((id) => [list, id] as const));
  const isAllShared = !own.length;
  if (isAllShared) own = PACK_LISTS.flatMap((list) => ids[list].map((id) => [list, id] as const));
  const present = own.filter(([list, id]) => snapshot[PACK_LIST_STORES[list]].has(id)).length;
  const total = own.length;
  return { state: loadState(present, total), present, total };
};

const loadState = (present: number, total: number): PackStatus["state"] => {
  const isAbsent = present === 0;
  if (isAbsent) return "none";
  return present === total ? "loaded" : "partial";
};

export interface RemovalPlan {
  /** Keys to delete, per store */
  remove: Record<PackStoreName, string[]>;
  /** Shop records with the pack's items taken off the shelf */
  shops: ShopInterface[];
  /** Records deleted, across every store */
  total: number;
}

export const planRemoval = (pack: XpPack, packs: readonly XpPack[], snapshot: PackSnapshot): RemovalPlan => {
  const ids = packIds(pack);
  // Ids other packs list stay while that pack is still loaded
  const loadedOthers = packs.filter((other) => other.id !== pack.id && packStatus(other, packs, snapshot).state !== "none");
  const kept = othersIds(pack, loadedOthers);

  const remove = Object.fromEntries(PACK_STORES.map((name) => [name, [] as string[]])) as Record<PackStoreName, string[]>;
  for (const list of PACK_LISTS) {
    const store = PACK_LIST_STORES[list];
    remove[store] = ids[list].filter((id) => snapshot[store].has(id) && !kept[list].has(id));
  }

  // A quest that stays keeps its beast and its category
  const leaving = new Set(remove.__achievements);
  const staying = Array.from(snapshot.__achievements.entries())
    .filter(([key]) => !leaving.has(key))
    .map(([, quest]) => quest as { beastId?: unknown; categoryId?: unknown });
  const usedBeasts = new Set(staying.map((quest) => String(quest.beastId ?? "")));
  const usedCategories = new Set(staying.map((quest) => String(quest.categoryId ?? "")));
  remove.__beasts = remove.__beasts.filter((id) => !usedBeasts.has(id));
  remove.__achievementCategories = remove.__achievementCategories.filter((id) => !usedCategories.has(id));

  // Rewards that leave come off every shelf; items only this pack stocked come off the shelves it stocked
  const goneRewards = new Set(remove.__accessories);
  const stockedByOthers = (shopId: string, itemId: string) =>
    loadedOthers.some((other) => other.content.shopStock?.[shopId]?.includes(itemId));
  const shops = Array.from(snapshot.__shops.values()).flatMap((value) => {
    const shop = value as ShopInterface;
    const ownStock = new Set(pack.content.shopStock?.[shop.id] ?? []);
    const items = (shop.items ?? []).filter(
      (item) => !goneRewards.has(item.itemId) && !(ownStock.has(item.itemId) && !stockedByOthers(shop.id, item.itemId))
    );
    return items.length === (shop.items ?? []).length ? [] : [{ ...shop, items }];
  });

  const total = PACK_STORES.reduce((sum, name) => sum + remove[name].length, 0);
  return { remove, shops, total };
};

/** The slice of Ionic Storage packs need; the unit tests pass an in-memory fake */
export type PackStorage = Pick<Storage, "create" | "forEach" | "set" | "remove">;

export interface PackDeps {
  storage: (name: PackStoreName) => PackStorage;
  /** A merge restore: BackupService checks who is asking, writes everything or nothing, and reloads the heroes */
  restore: (file: BackupFile) => Promise<RestoreResult>;
  canManage: () => boolean;
}

const defaultDeps: PackDeps = {
  storage: (name) => {
    const def = BACKUP_STORES.find((store) => store.name === name);
    if (!def) throw new Error(`Unknown store ${name}`);
    return def.storage as unknown as PackStorage;
  },
  restore: (file) => backupService.restoreBackup(file, { mode: "merge" }),
  canManage: () => canManageFamily(),
};

export const readSnapshot = async (deps: PackDeps = defaultDeps): Promise<PackSnapshot> => {
  const snapshot = emptySnapshot();
  for (const name of PACK_STORES) {
    const storage = deps.storage(name);
    await storage.create();
    await storage.forEach((value, key) => {
      // Block body on purpose: forEach stops as soon as the callback returns anything but undefined
      const isStored = value !== undefined;
      if (isStored) snapshot[name].set(key, value);
    });
  }
  return snapshot;
};

export const loadPack = async (pack: XpPack, deps: PackDeps = defaultDeps): Promise<RestoreResult> => {
  if (!deps.canManage()) throw new BackupPermissionError();
  const snapshot = await readSnapshot(deps);
  return deps.restore(packToBackup(pack, snapshot.__shops));
};

/** Takes the pack's records back out (see planRemoval for what stays). Returns how many records were deleted */
export const removePack = async (pack: XpPack, packs: readonly XpPack[], deps: PackDeps = defaultDeps): Promise<number> => {
  if (!deps.canManage()) throw new BackupPermissionError();
  const plan = planRemoval(pack, packs, await readSnapshot(deps));
  // Shelves first, so no shop ever sells a reward that is already gone; then the dependants before what they use
  const shops = deps.storage("__shops");
  for (const shop of plan.shops) await shops.set(shop.id, shop);
  for (const name of [...PACK_STORES].reverse()) {
    const storage = deps.storage(name);
    for (const key of plan.remove[name]) await storage.remove(key);
  }
  return plan.total;
};
