import { v4 as uuidv4 } from "uuid";
import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

/**
 * Purchase Log: one record per time a hero buys something from a shop.
 * The GP is charged when the hero buys; the Game Master later marks the purchase delivered
 * ("fulfilled") or hands the GP back ("refunded"). Accessory records stay pure definitions.
 */
export const purchaseLogStorage = new Storage({
  name: "__purchaseLog",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export type PurchaseStatus = "pending" | "fulfilled" | "refunded";

export interface PurchaseLogEntry {
  id: string;
  userId: string;
  itemId: string;
  /** Copied at purchase time so the log still reads right if the item is renamed or deleted later */
  itemName: string;
  /** GP the hero paid (and gets back on a refund) */
  price: number;
  status: PurchaseStatus;
  /** ISO timestamp of when the hero bought it */
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
  /** A game item held for the Game Master (Settings > Rewards): it goes into the hero's bag when they hand it over */
  packed?: PackedItem;
}

/** The bag item a held game-item purchase becomes on handover */
export interface PackedItem {
  name: string;
  type: string;
  faIcon: string;
  qty: number;
}

export type NewPurchaseLogEntry = Pick<PurchaseLogEntry, "userId" | "itemId" | "itemName" | "price"> &
  Partial<Pick<PurchaseLogEntry, "status" | "note" | "createdAt" | "packed">>;

export class PurchaseLogDb extends DbStorageApi {
  public async logPurchase(input: NewPurchaseLogEntry): Promise<PurchaseLogEntry> {
    const entry: PurchaseLogEntry = {
      id: uuidv4(),
      userId: input.userId,
      itemId: input.itemId,
      itemName: input.itemName,
      price: input.price,
      status: input.status ?? "pending",
      createdAt: input.createdAt || new Date().toISOString(),
      note: input.note,
      ...(input.packed ? { packed: input.packed } : {}),
    };
    await this.set(entry.id, entry);
    return entry;
  }

  public async getEntry(id: string): Promise<PurchaseLogEntry | null> {
    return ((await this.get(id)) as PurchaseLogEntry | null) || null;
  }

  /** Every purchase, newest first */
  public async getEntries(): Promise<PurchaseLogEntry[]> {
    const entries = (await this.getAll()) as PurchaseLogEntry[];
    return entries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Purchases still waiting on the Game Master */
  public async getPending(): Promise<PurchaseLogEntry[]> {
    return (await this.getEntries()).filter((entry) => entry.status === "pending");
  }

  public async updateEntry(id: string, patch: Partial<PurchaseLogEntry>): Promise<PurchaseLogEntry | null> {
    const existing = await this.getEntry(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    await this.set(id, updated);
    return updated;
  }
}

let purchaseLogDb: PurchaseLogDb | null = null;

export const getPurchaseLogDb = (): PurchaseLogDb => {
  if (!purchaseLogDb) purchaseLogDb = new PurchaseLogDb(purchaseLogStorage);
  return purchaseLogDb;
};

export default PurchaseLogDb;
