import { getPurchaseLogDb } from "@/lib/databases/PurchaseLogDb";
import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { ShopItem } from "@/lib/databases/ShopsDb";
import { useUserStore } from "@/lib/store/stores/user";
import { purchaseNotification } from "@/lib/services/notifications/Notifications";
import { notify } from "@/lib/services/notifications/notify";

/**
 * The one place GP turns into a shop purchase.
 *
 * Shelf:       stockShelf() works out what a hero can buy from a shop today, and for how much.
 * Buy flow:    buyItem() charges the hero's wallet right away and writes a `pending`
 *              PurchaseLog entry, because the Game Master still has to hand the real thing over.
 * GM review:   fulfillPurchase() marks it delivered; refundPurchase() gives the GP back.
 *              Only `pending` entries can be reviewed, so nothing is ever paid or refunded twice.
 */

export type PurchaseErrorCode = "invalid-item" | "unknown-hero" | "insufficient-funds";

export class PurchaseError extends Error {
  constructor(public readonly code: PurchaseErrorCode, message: string) {
    super(message);
    this.name = "PurchaseError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The hero's wallet cannot cover the price; nothing was charged and nothing was logged. */
export class InsufficientFundsError extends PurchaseError {
  constructor(
    public readonly itemName: string,
    public readonly price: number,
    public readonly wallet: number
  ) {
    super(
      "insufficient-funds",
      `Not enough GP for ${itemName}: it costs ${price} GP and the wallet holds ${wallet} GP.`
    );
    this.name = "InsufficientFundsError";
  }

  /** How much more GP the hero needs */
  get shortBy(): number {
    return this.price - this.wallet;
  }
}

/** What a shop sells: just enough to charge for it and to name it in the log. */
export interface PurchasableItem {
  id: string | number;
  name: string;
  price: number;
}

/** The hero who is buying: their profile or just their id. */
export type Buyer = string | number | { id: string | number };

/** One thing on a shop's shelf, ready to show and to buy. */
export interface ShelfItem extends PurchasableItem {
  id: string;
  description: string;
  image: string;
}

/**
 * What a shop offers a hero right now. `shopItems` are the slots the Game Master filled in the
 * shop editor; each one points at an accessory, and only accessories can be sold (the Game
 * Master delivers them). Follows the editor's rules:
 *  - a slot with chosen weekdays is only open on those days (none chosen means every day);
 *  - an accessory limited to chosen members is hidden from everyone else (blank means everyone);
 *  - the slot's own price wins over the accessory's base price (0 or blank means use the base);
 *  - an item without a price is never offered, so a blank price can't hand out free rewards.
 */
export const stockShelf = (
  shopItems: ShopItem[],
  accessories: Accessory[],
  heroId: string,
  now: Date = new Date()
): ShelfItem[] => {
  const shelf: ShelfItem[] = [];
  for (const slot of shopItems) {
    const accessory = accessories.find((candidate) => candidate && candidate.id === slot.itemId);
    if (!accessory) continue;

    if (slot.availableDays?.length && !slot.availableDays.includes(now.getDay())) continue;

    const members = (accessory.availableToMembers || []).filter(Boolean).map(String);
    if (members.length > 0 && !members.includes(String(heroId))) continue;

    // The accessory form stores prices typed into a text box, so "25" is a normal price.
    const price = Number(slot.price || accessory.basePrice);
    if (!Number.isFinite(price) || price <= 0) continue;

    shelf.push({
      id: String(accessory.id),
      name: accessory.name || "Mystery item",
      description: accessory.description || "",
      price,
      image: accessory.imageUrl || accessory.icon || "",
    });
  }
  return shelf;
};

const heroIdOf = (buyer: Buyer): string =>
  String(typeof buyer === "object" && buyer !== null ? buyer.id : buyer);

/** Read straight from the store: getUserById returns undefined for unknown ids. */
const walletOf = (userId: string): number => {
  const wallet = Number(useUserStore().users[userId]?.stats?.gp?.wallet);
  return Number.isFinite(wallet) ? wallet : 0;
};

const placeOrder = async (userId: string, item: PurchasableItem): Promise<PurchaseLogEntry> => {
  const price = Number(item.price);
  if (!item.name || item.id === undefined || item.id === null || item.id === "") {
    throw new PurchaseError("invalid-item", "That item has no id or name, so it can't be bought.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new PurchaseError("invalid-item", `${item.name} has no valid price, so it can't be bought.`);
  }

  const userStore = useUserStore();
  if (!userStore.users[userId]) {
    throw new PurchaseError("unknown-hero", `Hero ${userId} doesn't exist, so there is no wallet to charge.`);
  }

  // Check and charge in the same tick (updateUserGP changes the wallet before its first await),
  // so two purchases racing each other can never spend the same GP.
  const wallet = walletOf(userId);
  if (wallet < price) throw new InsufficientFundsError(item.name, price, wallet);
  if (price > 0) await userStore.updateUserGP({ userId, wallet: -price });

  try {
    return await getPurchaseLogDb().logPurchase({
      userId,
      itemId: String(item.id),
      itemName: item.name,
      price,
    });
  } catch (error) {
    // Nothing was recorded, so the Game Master would never learn what to deliver: give the GP back.
    if (price > 0) await userStore.updateUserGP({ userId, wallet: price });
    throw error;
  }
};

// Purchases currently being placed. A double tap on "Buy" reaches buyItem twice for the same
// hero and item; both callers share the first purchase instead of charging a second time.
const purchasesInFlight = new Map<string, Promise<PurchaseLogEntry>>();

/**
 * Charge the hero's wallet and log a `pending` purchase for the Game Master to deliver.
 * Rejects with InsufficientFundsError when the wallet is short, and with PurchaseError for a
 * missing hero or an item without a usable price; in every rejection nothing was charged.
 */
export const buyItem = (user: Buyer, item: PurchasableItem): Promise<PurchaseLogEntry> => {
  const userId = heroIdOf(user);
  const key = `${userId}:${item.id}`;
  const running = purchasesInFlight.get(key);
  if (running) return running;

  const purchase = placeOrder(userId, item).finally(() => purchasesInFlight.delete(key));
  purchasesInFlight.set(key, purchase);
  return purchase;
};

// Entries currently being reviewed; a second fulfil/refund for the same entry while the first is
// still reading-then-writing would otherwise refund the hero twice.
const reviewsInFlight = new Set<string>();

const reviewEntry = async (
  entryId: string,
  review: (entry: PurchaseLogEntry) => Promise<PurchaseLogEntry | null>
): Promise<PurchaseLogEntry | null> => {
  if (reviewsInFlight.has(entryId)) return null;
  reviewsInFlight.add(entryId);
  try {
    const entry = await getPurchaseLogDb().getEntry(entryId);
    if (!entry || entry.status !== "pending") return entry;
    return await review(entry);
  } finally {
    reviewsInFlight.delete(entryId);
  }
};

/** The Game Master handed the item over. Returns the entry as it now stands (null if it doesn't exist). */
export const fulfillPurchase = (entryId: string, reviewerId?: string): Promise<PurchaseLogEntry | null> =>
  reviewEntry(entryId, async (entry) => {
    const fulfilled = await getPurchaseLogDb().updateEntry(entry.id, {
      status: "fulfilled",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    });
    // The hero's feed hears the item was handed over
    if (fulfilled?.status === "fulfilled") notify(purchaseNotification(fulfilled.userId, { ...fulfilled, status: "fulfilled" }));
    return fulfilled;
  });

/**
 * The Game Master called the purchase off: the hero gets the GP back (into the wallet; anything
 * past the wallet limit lands in savings, like every other GP credit). Rejects with PurchaseError
 * when the hero no longer exists, leaving the purchase pending.
 */
export const refundPurchase = (
  entryId: string,
  reviewerId?: string,
  note?: string
): Promise<PurchaseLogEntry | null> =>
  reviewEntry(entryId, async (entry) => {
    const userStore = useUserStore();
    if (!userStore.users[entry.userId]) {
      throw new PurchaseError("unknown-hero", `Hero ${entry.userId} doesn't exist, so there is nobody to refund.`);
    }

    // Mark it refunded first: if the credit below ever failed, the worst case is a purchase that
    // goes back to pending, never GP paid back twice.
    const db = getPurchaseLogDb();
    const refunded = await db.updateEntry(entry.id, {
      status: "refunded",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      note,
    });
    if (!refunded) return null;

    try {
      if (entry.price > 0) await userStore.updateUserGP({ userId: entry.userId, wallet: entry.price });
    } catch (error) {
      await db.updateEntry(entry.id, {
        status: "pending",
        reviewedAt: undefined,
        reviewedBy: undefined,
        note: entry.note,
      });
      throw error;
    }
    if (refunded.status === "refunded") notify(purchaseNotification(refunded.userId, { ...refunded, status: "refunded" }));
    return refunded;
  });
