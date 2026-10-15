/**
 * Storage: how much a hero can carry, where a new item goes, and what the Gold Bank sells to hold more.
 *
 * The bag (`user.inventory`) holds BAG_STACKS stacks. A stack is one InventoryEntry (same id); adding to a stack the
 * hero already has never needs a new slot, and a stack has no top quantity. Key items (temple keys) never count toward
 * the bag and can never be stored: they stay on the hero.
 *
 * Storage (`user.storage`, the same raw shape as the bag) is LOCKED (`user.storageTier` 0, or missing on an old profile)
 * until the hero buys it at the Gold Bank, tier by tier (STORAGE_TIERS). Everything here is pure: it reads a hero and
 * hands back the rows to save; the user store writes them and the screens only show the results.
 */
import { inventoryOf, toEntry, type InventoryEntry, type InventoryOwner, type RawInventoryItem } from './Inventory';

/** How many stacks the bag holds (key items not counted). */
export const BAG_STACKS = 20;

export interface StorageTier {
  /** Stacks the storage holds once this tier is bought (each tier replaces the last, it does not add to it). */
  slots: number;
  /** GP, out of the wallet. */
  price: number;
}

/** What the Gold Bank sells, smallest first: tier 1 unlocks storage, the rest make it bigger. */
export const STORAGE_TIERS: readonly StorageTier[] = [
  { slots: 10, price: 100 },
  { slots: 20, price: 250 },
  { slots: 40, price: 500 },
  { slots: 80, price: 1000 },
];

/** What the rules need from a hero: the bag, the storage and the tier bought. */
export interface StorageOwner extends InventoryOwner {
  storage?: unknown;
  storageTier?: unknown;
}

export interface Usage {
  used: number;
  max: number;
}

/** Where an item would go: the bag first, the storage when the bag has no room. */
export type CarryPlace = 'bag' | 'storage';

/** The bag and the storage as raw rows, the shape the profile saves. */
export interface BagAndStorage {
  inventory: unknown[];
  storage: unknown[];
}

/** The next tier on sale: `tier` is the number the hero will hold once it is bought (1 = storage unlocked). */
export interface NextStorageTier extends StorageTier {
  tier: number;
}

/**
 * A purchase that goes through (`fromWallet` + `fromSavings` = `price`), or why it did not: `max` (nothing bigger on sale)
 * or `gp`. On `gp`, `short` is how much more the WALLET needs; `canTopUp` says the savings would cover that gap (the bank
 * can offer them) and `shortAll` is what is still missing counting the savings (0 when they cover it).
 */
export type StoragePurchase =
  | { ok: true; tier: number; slots: number; price: number; fromWallet: number; fromSavings: number }
  | { ok: false; reason: 'max' }
  | { ok: false; reason: 'gp'; tier: number; slots: number; price: number; short: number; canTopUp: boolean; shortAll: number };

const rowsOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isKey = (entry: Pick<InventoryEntry, 'kind'>): boolean => entry.kind === 'key';

/** The tier the hero has bought: 0 when storage is locked, a profile without the field, or a broken value. */
export const storageTierOf = (user: StorageOwner | null | undefined): number => {
  const tier = Math.floor(Number(user?.storageTier));
  const isUnlocked = tier >= 1;
  if (!isUnlocked) return 0;
  return Math.min(tier, STORAGE_TIERS.length);
};

/** The stacks the hero keeps in storage. */
export const storedOf = (user: StorageOwner | null | undefined): InventoryEntry[] => inventoryOf({ inventory: user?.storage });

/** The stacks the bag counts: every stack but the keys. */
const bagStacksOf = (user: StorageOwner | null | undefined): InventoryEntry[] => inventoryOf(user).filter((entry) => !isKey(entry));

/** How full the bag is. Keys are not counted. */
export const bagUsage = (user: StorageOwner | null | undefined): Usage => ({ used: bagStacksOf(user).length, max: BAG_STACKS });

/** How full the storage is; `max` is 0 while it is locked. */
export const storageUsage = (user: StorageOwner | null | undefined): Usage => {
  const tier = storageTierOf(user);
  return { used: storedOf(user).length, max: tier ? STORAGE_TIERS[tier - 1].slots : 0 };
};

/** What the Gold Bank sells next, or null when the hero already holds the biggest storage. */
export const nextStorageTier = (user: StorageOwner | null | undefined): NextStorageTier | null => {
  const tier = storageTierOf(user);
  const isTopTier = tier >= STORAGE_TIERS.length;
  if (isTopTier) return null;
  return { tier: tier + 1, ...STORAGE_TIERS[tier] };
};

/**
 * Whether the hero can pick this item up, and where it goes. Keys always ride along in the bag. Anything else goes in the
 * bag when it already has that stack or a free slot; failing that, in storage when it is unlocked and holds that stack or
 * has a free slot; failing that, nowhere (false).
 */
export const canCarry = (user: StorageOwner | null | undefined, item: RawInventoryItem): CarryPlace | false => {
  const entry = toEntry(item);
  if (!entry) return false;
  if (isKey(entry)) return 'bag';

  const bag = bagStacksOf(user);
  const bagHasRoom = bag.some((stack) => stack.id === entry.id) || bag.length < BAG_STACKS;
  if (bagHasRoom) return 'bag';

  const storage = storageUsage(user);
  const isLocked = storage.max <= 0;
  if (isLocked) return false;
  const storageHasRoom = storedOf(user).some((stack) => stack.id === entry.id) || storage.used < storage.max;
  return storageHasRoom ? 'storage' : false;
};

const gp = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * What buying the next tier would do with this much GP in the wallet. The price comes out of the wallet first; only when
 * `useSavings` is true does the rest come out of `savings` (the Gold Bank offers that when the wallet falls short). With
 * `useSavings` false, savings are never touched, however many there are.
 */
export const storagePurchase = (
  user: StorageOwner | null | undefined,
  wallet: number,
  savings = 0,
  useSavings = false
): StoragePurchase => {
  const next = nextStorageTier(user);
  if (!next) return { ok: false, reason: 'max' };
  const inWallet = gp(wallet);
  const inSavings = gp(savings);
  const spendable = inWallet + (useSavings ? inSavings : 0);
  const isShortOfGp = spendable < next.price;
  if (isShortOfGp) {
    const short = next.price - inWallet;
    const shortAll = Math.max(0, next.price - inWallet - inSavings);
    return { ok: false, reason: 'gp', tier: next.tier, slots: next.slots, price: next.price, short, canTopUp: shortAll === 0, shortAll };
  }
  const fromWallet = Math.min(inWallet, next.price);
  return { ok: true, tier: next.tier, slots: next.slots, price: next.price, fromWallet, fromSavings: next.price - fromWallet };
};

const idOf = (row: unknown): string | undefined => toEntry(row)?.id;

/**
 * The rows after taking `qty` of one stack out of them: the first rows that match count down by their `qty` / `quantity`
 * and a row is dropped when it reaches 0. Rows that are not that stack are left as they are. Returns null, taking
 * nothing, when the rows hold fewer than `qty`.
 */
export const rowsAfterTaking = (rows: unknown[], entryId: string, qty: number): unknown[] | null => {
  const entries = rows.map((row) => toEntry(row));
  const held = entries.reduce((sum, entry) => (entry?.id === entryId ? sum + entry.qty : sum), 0);
  const isShortOfStock = held < qty;
  if (isShortOfStock) return null;

  let left = qty;
  const next: unknown[] = [];
  rows.forEach((row, index) => {
    const entry = entries[index];
    const shouldKeepRow = left <= 0 || entry?.id !== entryId;
    if (shouldKeepRow) {
      next.push(row);
      return;
    }
    const taken = Math.min(left, entry.qty);
    left -= taken;
    const hasLeftover = entry.qty > taken;
    if (hasLeftover) {
      const raw = row as RawInventoryItem;
      const key = raw.qty == null && raw.quantity != null ? 'quantity' : 'qty';
      next.push({ ...raw, [key]: entry.qty - taken });
    }
  });
  return next;
};

/** A copy of the stack's first row with `qty` of it: what moves across, keeping whatever else the row carried (source, type...). */
const movedRow = (rows: unknown[], stack: InventoryEntry, qty: number): RawInventoryItem => {
  const first = rows.find((row) => idOf(row) === stack.id) as RawInventoryItem;
  const moved = JSON.parse(JSON.stringify(first)) as RawInventoryItem;
  delete moved.quantity;
  moved.qty = qty;
  // The stack merged what its rows knew, so the row that moves keeps the icon, blurb and kind any of them gave it
  const isMissingIcon = !!stack.faIcon && !moved.faIcon && !moved.icon;
  if (isMissingIcon) moved.faIcon = stack.faIcon;
  const isMissingBlurb = !!stack.description && !moved.description && !moved.blurb;
  if (isMissingBlurb) moved.description = stack.description;
  const kindWasMerged = stack.kind !== 'misc' && toEntry(moved)?.kind !== stack.kind;
  if (kindWasMerged) moved.kind = stack.kind;
  return moved;
};

/** The rows with `qty` more of a stack: added to the row the hero already has, or a row of its own at the end. */
const rowsWithStack = (rows: unknown[], stack: InventoryEntry, qty: number, row: RawInventoryItem): unknown[] => {
  const index = rows.findIndex((existing) => idOf(existing) === stack.id);
  const isNewStack = index === -1;
  if (isNewStack) return [...rows, row];
  const held = rows[index] as RawInventoryItem;
  const key = held.qty == null && held.quantity != null ? 'quantity' : 'qty';
  const next = rows.slice();
  next[index] = { ...held, [key]: (toEntry(held)?.qty ?? 1) + qty };
  return next;
};

/** The quantity asked for: the whole stack when none is named, a whole number from 1 up, never more than the stack holds. */
const quantityOf = (stack: InventoryEntry, qty: number | undefined): number | null => {
  const isWholeStack = qty === undefined;
  if (isWholeStack) return stack.qty;
  const wanted = Math.floor(Number(qty));
  return wanted >= 1 && wanted <= stack.qty ? wanted : null;
};

/** One move between two lists of rows, or null when the stack is not in `from`, `qty` is more than it holds, or `canReceive` says no. */
const transfer = (
  from: unknown[],
  to: unknown[],
  entryId: string,
  qty: number | undefined,
  canReceive: (stack: InventoryEntry, toStacks: InventoryEntry[]) => boolean
): { from: unknown[]; to: unknown[] } | null => {
  const stack = inventoryOf({ inventory: from }).find((entry) => entry.id === entryId);
  if (!stack) return null;
  const amount = quantityOf(stack, qty);
  const isBadAmount = amount === null;
  if (isBadAmount) return null;
  if (!canReceive(stack, inventoryOf({ inventory: to }))) return null;
  const left = rowsAfterTaking(from, entryId, amount);
  if (!left) return null;
  return { from: left, to: rowsWithStack(to, stack, amount, movedRow(from, stack, amount)) };
};

/**
 * Move `qty` of a bag stack (all of it when `qty` is left out) into storage. Returns the bag and the storage as they
 * would be, or null: no such stack in the bag, `qty` out of range, a key item (keys stay on the hero), storage locked,
 * or no room (a stack storage already holds always fits).
 */
export const moveToStorage = (user: StorageOwner | null | undefined, entryId: string, qty?: number): BagAndStorage | null => {
  const { max } = storageUsage(user);
  const moved = transfer(rowsOf(user?.inventory), rowsOf(user?.storage), entryId, qty, (stack, stored) => {
    const isOffLimits = isKey(stack) || max <= 0;
    if (isOffLimits) return false;
    return stored.some((entry) => entry.id === stack.id) || stored.length < max;
  });
  return moved && { inventory: moved.from, storage: moved.to };
};

/**
 * Move `qty` of a stored stack (all of it when `qty` is left out) back into the bag. Returns the bag and the storage as
 * they would be, or null: no such stack in storage, `qty` out of range, or the bag is full of other stacks (a stack the
 * bag already holds always fits).
 */
export const moveToBag = (user: StorageOwner | null | undefined, entryId: string, qty?: number): BagAndStorage | null => {
  const moved = transfer(rowsOf(user?.storage), rowsOf(user?.inventory), entryId, qty, (stack) => {
    if (isKey(stack)) return true;
    const bag = bagStacksOf(user);
    return bag.some((entry) => entry.id === stack.id) || bag.length < BAG_STACKS;
  });
  return moved && { inventory: moved.to, storage: moved.from };
};
