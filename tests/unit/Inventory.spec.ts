import { groupInventory, inventoryOf, kindOf, toEntry, type InventoryEntry } from "@/lib/services/inventory/Inventory";

describe("inventoryOf", () => {
  it("is empty for no hero, no bag, or a bag that is not a list", () => {
    expect(inventoryOf(undefined)).toEqual([]);
    expect(inventoryOf(null)).toEqual([]);
    expect(inventoryOf({})).toEqual([]);
    expect(inventoryOf({ inventory: "nope" })).toEqual([]);
    expect(inventoryOf({ inventory: [null, 3, {}, { name: "  " }] })).toEqual([]);
  });

  it("reads what the temple shop puts in the bag: a bare name, one of it, misc, no icon", () => {
    const [entry] = inventoryOf({ inventory: [{ name: "FireResistPotion", source: "fire-temple" }] });
    expect(entry).toEqual({ id: "fire-resist-potion", name: "Fire Resist Potion", qty: 1, kind: "misc" });
    expect(entry.faIcon).toBeUndefined();
    expect(entry.description).toBeUndefined();
  });

  it("reads the profile form shape too (itemId + quantity)", () => {
    expect(inventoryOf({ inventory: [{ itemId: "small-key", quantity: 3, type: "key" }] })).toEqual([
      { id: "small-key", name: "Small Key", qty: 3, kind: "key" },
    ]);
  });

  it("merges duplicates by id, sums the quantities and keeps the first icon and blurb it finds", () => {
    const entries = inventoryOf({
      inventory: [
        { name: "ShadowVeil", source: "shadow-temple" },
        { id: "shadow-veil", name: "Shadow Veil", qty: 2, faIcon: "fa-mask", type: "consumable" },
        { name: "shadow veil", blurb: "slip past a guard" },
      ],
    });
    expect(entries).toEqual([
      { id: "shadow-veil", name: "Shadow Veil", qty: 4, kind: "consumable", faIcon: "mask", description: "slip past a guard" },
    ]);
  });

  it("defaults a missing, zero or broken quantity to one", () => {
    expect(toEntry({ name: "Herb", qty: 0 })?.qty).toBe(1);
    expect(toEntry({ name: "Herb", qty: -4 })?.qty).toBe(1);
    expect(toEntry({ name: "Herb", quantity: "many" })?.qty).toBe(1);
    expect(toEntry({ name: "Herb", qty: 2.9 })?.qty).toBe(2);
  });

  it("sorts by name", () => {
    const names = inventoryOf({ inventory: [{ name: "Zinc Ore" }, { name: "apple" }, { name: "Moon Pearl" }] }).map((e) => e.name);
    expect(names).toEqual(["Apple", "Moon Pearl", "Zinc Ore"]);
  });
});

describe("kindOf", () => {
  it("maps type, category or kind words onto the four tabs and falls back to misc", () => {
    expect(kindOf({ type: "potion" })).toBe("consumable");
    expect(kindOf({ category: "HP" })).toBe("consumable");
    expect(kindOf({ kind: "key" })).toBe("key");
    expect(kindOf({ type: "ingredient" })).toBe("material");
    expect(kindOf({ type: "Material" })).toBe("material");
    expect(kindOf({ type: "weird" })).toBe("misc");
    expect(kindOf({})).toBe("misc");
  });
});

describe("groupInventory", () => {
  it("buckets entries by kind and always returns every kind", () => {
    const entries: InventoryEntry[] = [
      { id: "a", name: "A", qty: 1, kind: "key" },
      { id: "b", name: "B", qty: 2, kind: "misc" },
      { id: "c", name: "C", qty: 1, kind: "key" },
    ];
    const groups = groupInventory(entries);
    expect(groups.key.map((e) => e.id)).toEqual(["a", "c"]);
    expect(groups.misc.map((e) => e.id)).toEqual(["b"]);
    expect(groups.consumable).toEqual([]);
    expect(groups.material).toEqual([]);
  });

  it("is all empty for an empty bag", () => {
    expect(groupInventory([])).toEqual({ consumable: [], key: [], material: [], misc: [] });
  });
});
