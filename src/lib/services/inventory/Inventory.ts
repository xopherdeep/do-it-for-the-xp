/**
 * Inventory: a pure view over the hero's bag (`user.inventory`) for the My Goods page.
 *
 * Two shapes reach the bag today and both are read here:
 *  - the temple shop (`RoomInteractions.buyWare`) via `userStore.addInventoryItem`: `{ name, source?, ...any }`
 *  - the profile form (`ProfileDb.InventoryItem`): `{ itemId, quantity }`
 * Each entry is normalised to an InventoryEntry, duplicates are merged by id with their quantities summed,
 * and the result is sorted by name. Nothing here touches a store or the screen.
 */

export type InventoryKind = 'consumable' | 'key' | 'material' | 'misc';

export const INVENTORY_KINDS: readonly InventoryKind[] = ['consumable', 'key', 'material', 'misc'];

export interface InventoryEntry {
  id: string;
  name: string;
  qty: number;
  kind: InventoryKind;
  faIcon?: string;
  description?: string;
}

/** The loose shape of what sits in `user.inventory`: anything with a name or an itemId. */
export interface RawInventoryItem {
  id?: string;
  itemId?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  kind?: string;
  type?: string;
  category?: string;
  faIcon?: string;
  icon?: string;
  description?: string;
  blurb?: string;
  [key: string]: unknown;
}

/** What the helper needs from a hero: only the bag. */
export interface InventoryOwner {
  inventory?: unknown;
}

/** "FireResistPotion" -> "fire resist potion" */
const words = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** "fire resist potion" -> "Fire Resist Potion" */
const titleWords = (value: string): string => words(value).replace(/(^|\s)([a-z])/g, (_, gap, letter) => gap + letter.toUpperCase());

/** "Fire Resist Potion" -> "fire-resist-potion" */
const slug = (value: string): string => words(value).replace(/\s/g, '-');

const KIND_WORDS: Record<string, InventoryKind> = {
  consumable: 'consumable',
  potion: 'consumable',
  food: 'consumable',
  hp: 'consumable',
  mp: 'consumable',
  key: 'key',
  material: 'material',
  ingredient: 'material',
  crafting: 'material',
  misc: 'misc',
};

/** The tab an item belongs under, from its kind, type or category; anything unknown is misc. */
export const kindOf = (item: RawInventoryItem): InventoryKind => {
  for (const hint of [item.kind, item.type, item.category]) {
    const isNotText = typeof hint !== 'string';
    if (isNotText) continue;
    const found = KIND_WORDS[hint.trim().toLowerCase()];
    if (found) return found;
  }
  return 'misc';
};

const text = (value: unknown): string | undefined => {
  const isNotText = typeof value !== 'string';
  if (isNotText) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
};

/** One bag item as a list entry, or null when it names nothing. */
export const toEntry = (item: unknown): InventoryEntry | null => {
  const isNotAnItem = !item || typeof item !== 'object';
  if (isNotAnItem) return null;
  const raw = item as RawInventoryItem;
  const label = text(raw.name) ?? text(raw.itemId) ?? text(raw.id);
  if (!label) return null;
  const id = text(raw.id) ?? text(raw.itemId) ?? slug(label);
  const entry: InventoryEntry = {
    id,
    name: titleWords(label),
    qty: count(raw.qty ?? raw.quantity),
    kind: kindOf(raw),
  };
  const faIcon = text(raw.faIcon) ?? text(raw.icon);
  if (faIcon) entry.faIcon = faIcon.replace(/^fa-/, '');
  const description = text(raw.description) ?? text(raw.blurb);
  if (description) entry.description = description;
  return entry;
};

/** The hero's bag as list entries: duplicates merged by id (quantities summed), sorted by name. */
export const inventoryOf = (user: InventoryOwner | null | undefined): InventoryEntry[] => {
  const bag = Array.isArray(user?.inventory) ? user!.inventory : [];
  const byId = new Map<string, InventoryEntry>();
  for (const item of bag) {
    const entry = toEntry(item);
    if (!entry) continue;
    const seen = byId.get(entry.id);
    if (!seen) {
      byId.set(entry.id, entry);
      continue;
    }
    seen.qty += entry.qty;
    const canFillIcon = !seen.faIcon && Boolean(entry.faIcon);
    if (canFillIcon) seen.faIcon = entry.faIcon;
    const canFillDescription = !seen.description && Boolean(entry.description);
    if (canFillDescription) seen.description = entry.description;
    const canRefineKind = seen.kind === 'misc' && entry.kind !== 'misc';
    if (canRefineKind) seen.kind = entry.kind;
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
};

/** The entries under each kind; every kind is present, empty or not. */
export const groupInventory = (entries: InventoryEntry[]): Record<InventoryKind, InventoryEntry[]> => {
  const groups: Record<InventoryKind, InventoryEntry[]> = { consumable: [], key: [], material: [], misc: [] };
  for (const entry of entries) groups[entry.kind].push(entry);
  return groups;
};
