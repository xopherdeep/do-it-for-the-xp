import {
  BAG_STACKS,
  STORAGE_TIERS,
  bagUsage,
  canCarry,
  moveToBag,
  moveToStorage,
  nextStorageTier,
  rowsAfterTaking,
  storagePurchase,
  storageTierOf,
  storageUsage,
  storedOf,
} from "@/lib/services/inventory/Storage";
import { inventoryOf } from "@/lib/services/inventory/Inventory";

/** `n` different one-off bag rows: thing-0, thing-1... */
const stacks = (n: number, prefix = "thing") => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, name: `${prefix} ${i}`, qty: 1 }));

const ids = (rows: unknown[]) => inventoryOf({ inventory: rows }).map((entry) => entry.id);
const qtyOf = (rows: unknown[], id: string) => inventoryOf({ inventory: rows }).find((entry) => entry.id === id)?.qty;

describe("the rules in numbers", () => {
  it("holds 20 stacks in the bag and sells four storage tiers: 10, 20, 40 and 80 slots for 100, 250, 500 and 1000 GP", () => {
    expect(BAG_STACKS).toBe(20);
    expect(STORAGE_TIERS).toEqual([
      { slots: 10, price: 100 },
      { slots: 20, price: 250 },
      { slots: 40, price: 500 },
      { slots: 80, price: 1000 },
    ]);
  });
});

describe("bagUsage", () => {
  it("counts stacks, not quantities, and merges rows of the same id into one stack", () => {
    const bag = [{ id: "potion", name: "Potion", qty: 40 }, { name: "Potion", qty: 3 }, { id: "ether", name: "Ether" }];
    expect(bagUsage({ inventory: bag })).toEqual({ used: 2, max: 20 });
  });

  it("does not count key items", () => {
    const bag = [...stacks(3), { id: "small-key", name: "Small Key", type: "key", qty: 4 }, { itemId: "boss-key", quantity: 1, kind: "key" }];
    expect(bagUsage({ inventory: bag })).toEqual({ used: 3, max: 20 });
  });

  it("is empty for no hero, no bag or a bag that is not a list", () => {
    expect(bagUsage(null)).toEqual({ used: 0, max: 20 });
    expect(bagUsage(undefined)).toEqual({ used: 0, max: 20 });
    expect(bagUsage({})).toEqual({ used: 0, max: 20 });
    expect(bagUsage({ inventory: "nope" })).toEqual({ used: 0, max: 20 });
  });
});

describe("storageTierOf and storageUsage", () => {
  it("is locked (tier 0, no slots) for an old profile with neither field, or a broken tier", () => {
    for (const hero of [null, undefined, {}, { storageTier: 0 }, { storageTier: "x" }, { storageTier: -2 }, { storageTier: Number.NaN }]) {
      expect(storageTierOf(hero)).toBe(0);
      expect(storageUsage(hero)).toEqual({ used: 0, max: 0 });
    }
  });

  it("gives the slots of the tier bought, each tier replacing the last", () => {
    expect([1, 2, 3, 4].map((storageTier) => storageUsage({ storageTier }).max)).toEqual([10, 20, 40, 80]);
  });

  it("holds at the biggest tier however high the number reads", () => {
    expect(storageTierOf({ storageTier: 9 })).toBe(4);
    expect(storageTierOf({ storageTier: 2.9 })).toBe(2);
  });

  it("counts the stacks kept in storage", () => {
    const hero = { storageTier: 1, storage: [{ id: "a", name: "A", qty: 9 }, { id: "a", name: "A" }, { id: "b", name: "B" }] };
    expect(storageUsage(hero)).toEqual({ used: 2, max: 10 });
    expect(storedOf(hero).map((entry) => [entry.id, entry.qty])).toEqual([["a", 10], ["b", 1]]);
    expect(storedOf({})).toEqual([]);
  });
});

describe("nextStorageTier", () => {
  it("offers tier 1 to a hero with no storage, then each bigger one, then nothing", () => {
    expect(nextStorageTier({})).toEqual({ tier: 1, slots: 10, price: 100 });
    expect(nextStorageTier({ storageTier: 1 })).toEqual({ tier: 2, slots: 20, price: 250 });
    expect(nextStorageTier({ storageTier: 2 })).toEqual({ tier: 3, slots: 40, price: 500 });
    expect(nextStorageTier({ storageTier: 3 })).toEqual({ tier: 4, slots: 80, price: 1000 });
    expect(nextStorageTier({ storageTier: 4 })).toBeNull();
  });
});

describe("storagePurchase", () => {
  it("goes through when the wallet covers the price, to the exact GP, and takes nothing from savings", () => {
    expect(storagePurchase({}, 100)).toEqual({ ok: true, tier: 1, slots: 10, price: 100, fromWallet: 100, fromSavings: 0 });
    expect(storagePurchase({ storageTier: 3 }, 5000, 9999)).toEqual({ ok: true, tier: 4, slots: 80, price: 1000, fromWallet: 1000, fromSavings: 0 });
  });

  it("says how much more it takes when the wallet is short", () => {
    expect(storagePurchase({}, 99)).toEqual({ ok: false, reason: "gp", tier: 1, slots: 10, price: 100, short: 1, canTopUp: false, shortAll: 1 });
    expect(storagePurchase({ storageTier: 1 }, 0)).toMatchObject({ ok: false, reason: "gp", short: 250, shortAll: 250 });
    expect(storagePurchase({}, Number.NaN)).toMatchObject({ ok: false, reason: "gp", short: 100 });
  });

  it("refuses at the biggest storage, rich or not", () => {
    expect(storagePurchase({ storageTier: 4 }, 99999, 99999, true)).toEqual({ ok: false, reason: "max" });
  });

  describe("topping up from savings (the hero is in the bank)", () => {
    it("never touches savings unless asked: a short wallet is refused, with the news that savings would cover it", () => {
      expect(storagePurchase({}, 40, 300)).toEqual({ ok: false, reason: "gp", tier: 1, slots: 10, price: 100, short: 60, canTopUp: true, shortAll: 0 });
    });

    it("pays wallet first, then savings for the rest, when asked", () => {
      expect(storagePurchase({}, 40, 300, true)).toEqual({ ok: true, tier: 1, slots: 10, price: 100, fromWallet: 40, fromSavings: 60 });
      expect(storagePurchase({ storageTier: 1 }, 0, 250, true)).toMatchObject({ ok: true, fromWallet: 0, fromSavings: 250 });
    });

    it("takes nothing from savings when the wallet alone is enough, even when asked", () => {
      expect(storagePurchase({}, 150, 300, true)).toMatchObject({ ok: true, fromWallet: 100, fromSavings: 0 });
    });

    it("takes the exact price at the edge: wallet and savings together just cover it", () => {
      expect(storagePurchase({}, 30, 70, true)).toMatchObject({ ok: true, fromWallet: 30, fromSavings: 70 });
      expect(storagePurchase({}, 30, 69, true)).toEqual({ ok: false, reason: "gp", tier: 1, slots: 10, price: 100, short: 70, canTopUp: false, shortAll: 1 });
    });

    it("says how much is still missing counting savings when even they fall short", () => {
      const sale = storagePurchase({ storageTier: 2 }, 100, 50, true);
      expect(sale).toMatchObject({ ok: false, reason: "gp", price: 500, short: 400, canTopUp: false, shortAll: 350 });
    });

    it("ignores broken savings", () => {
      expect(storagePurchase({}, 40, Number.NaN, true)).toMatchObject({ ok: false, reason: "gp", canTopUp: false, shortAll: 60 });
      expect(storagePurchase({}, 40, -5, true)).toMatchObject({ ok: false, reason: "gp", shortAll: 60 });
    });
  });
});

describe("canCarry", () => {
  it("puts a new item in the bag while it has a free slot", () => {
    expect(canCarry({ inventory: stacks(19) }, { name: "Ether" })).toBe("bag");
    expect(canCarry({}, { name: "Ether" })).toBe("bag");
    expect(canCarry(undefined, { name: "Ether" })).toBe("bag");
  });

  it("adds to a stack the bag already holds even when the bag is full: no new slot, no top quantity", () => {
    const hero = { inventory: [...stacks(19), { id: "potion", name: "Potion", qty: 999 }] };
    expect(bagUsage(hero).used).toBe(20);
    expect(canCarry(hero, { name: "Potion", qty: 50 })).toBe("bag");
    expect(canCarry(hero, { id: "potion", name: "Whatever" })).toBe("bag");
  });

  it("never counts a key against the bag, and a key is always carried", () => {
    const hero = { inventory: stacks(20) };
    expect(canCarry(hero, { name: "Small Key", type: "key" })).toBe("bag");
    expect(canCarry({ inventory: [...stacks(20), { name: "Small Key", type: "key" }] }, { name: "Another", kind: "key" })).toBe("bag");
  });

  it("overflows to storage once it is bought and has room", () => {
    const hero = { inventory: stacks(20), storageTier: 1, storage: stacks(9, "stored") };
    expect(canCarry(hero, { name: "Ether" })).toBe("storage");
  });

  it("goes to storage for a stack storage already holds, even when storage is full", () => {
    const hero = { inventory: stacks(20), storageTier: 1, storage: stacks(10, "stored") };
    expect(canCarry(hero, { name: "Ether" })).toBe(false);
    expect(canCarry(hero, { name: "Stored 4" })).toBe("storage");
  });

  it("is false when the bag is full and storage is locked", () => {
    expect(canCarry({ inventory: stacks(20) }, { name: "Ether" })).toBe(false);
    // stuff left in storage from before does not unlock it
    expect(canCarry({ inventory: stacks(20), storage: [{ name: "Ether" }] }, { name: "Ether" })).toBe(false);
  });

  it("is false for something that names nothing", () => {
    expect(canCarry({}, {})).toBe(false);
    expect(canCarry({}, { name: "  " })).toBe(false);
  });

  it("takes nothing out of a bag that is over 20 stacks, and lets no new stack in", () => {
    const hero = { inventory: stacks(25) };
    expect(bagUsage(hero)).toEqual({ used: 25, max: 20 });
    expect(canCarry(hero, { name: "New" })).toBe(false);
    expect(canCarry(hero, { name: "Thing 24" })).toBe("bag");
  });
});

describe("rowsAfterTaking", () => {
  it("counts the first matching rows down by qty or quantity and drops a row at 0", () => {
    const rows = [{ id: "ether", name: "Ether", quantity: 3 }, { id: "potion", name: "Potion", qty: 2 }, { id: "potion", name: "Potion", qty: 3 }];
    expect(rowsAfterTaking(rows, "potion", 3)).toEqual([
      { id: "ether", name: "Ether", quantity: 3 },
      { id: "potion", name: "Potion", qty: 2 },
    ]);
    expect(rowsAfterTaking(rows, "ether", 1)).toEqual([{ id: "ether", name: "Ether", quantity: 2 }, rows[1], rows[2]]);
  });

  it("takes nothing when the rows hold fewer", () => {
    expect(rowsAfterTaking([{ id: "potion", name: "Potion", qty: 2 }], "potion", 3)).toBeNull();
    expect(rowsAfterTaking([], "potion", 1)).toBeNull();
  });
});

describe("moveToStorage", () => {
  const hero = (extra: object = {}) => ({
    inventory: [
      { id: "potion", name: "Potion", qty: 5, type: "consumable", faIcon: "flask-potion", source: "wind-temple" },
      { id: "ether", name: "Ether", quantity: 2, type: "consumable" },
      { id: "small-key", name: "Small Key", type: "key", qty: 2 },
    ],
    storageTier: 1,
    storage: [],
    ...extra,
  });

  it("moves part of a stack and keeps the rest in the bag, with whatever else the row carried", () => {
    const user = hero();
    const moved = moveToStorage(user, "potion", 2)!;
    expect(qtyOf(moved.inventory, "potion")).toBe(3);
    expect(moved.storage).toEqual([
      { id: "potion", name: "Potion", qty: 2, type: "consumable", faIcon: "flask-potion", source: "wind-temple" },
    ]);
  });

  it("moves the whole stack when no quantity is named, taking its row out of the bag", () => {
    const moved = moveToStorage(hero(), "potion")!;
    expect(ids(moved.inventory)).toEqual(["ether", "small-key"]);
    expect(qtyOf(moved.storage, "potion")).toBe(5);
  });

  it("never changes the hero it was given", () => {
    const user = hero();
    const copy = JSON.parse(JSON.stringify(user));
    moveToStorage(user, "potion", 2);
    expect(user).toEqual(copy);
  });

  it("adds to the stack storage already holds instead of starting a second row", () => {
    const user = hero({ storage: [{ id: "potion", name: "Potion", qty: 4 }] });
    const moved = moveToStorage(user, "potion", 5)!;
    expect(moved.storage).toEqual([{ id: "potion", name: "Potion", qty: 9 }]);
    expect(storedOf({ storage: moved.storage })).toHaveLength(1);
  });

  it("keeps a stack's quantity key when it adds to it, and writes qty for a row that moves", () => {
    const user = hero({ storage: [{ itemId: "ether", quantity: 1 }] });
    const moved = moveToStorage(user, "ether")!;
    expect(moved.storage).toEqual([{ itemId: "ether", quantity: 3 }]);
    const fresh = moveToStorage(hero(), "ether", 1)!;
    expect(fresh.storage).toEqual([{ id: "ether", name: "Ether", type: "consumable", qty: 1 }]);
    expect(fresh.inventory[1]).toEqual({ id: "ether", name: "Ether", quantity: 1, type: "consumable" });
  });

  it("merges a stack split over several rows and carries the icon and kind any of them gave it", () => {
    const user = hero({ inventory: [{ name: "Herb", qty: 2 }, { name: "Herb", qty: 1, faIcon: "fa-leaf", type: "material", blurb: "green" }] });
    const moved = moveToStorage(user, "herb")!;
    expect(moved.inventory).toEqual([]);
    expect(moved.storage).toEqual([{ name: "Herb", qty: 3, faIcon: "leaf", kind: "material", description: "green" }]);
    expect(inventoryOf({ inventory: moved.storage })).toEqual([
      { id: "herb", name: "Herb", qty: 3, kind: "material", faIcon: "leaf", description: "green" },
    ]);
  });

  it("refuses a key item: keys stay on the hero", () => {
    expect(moveToStorage(hero(), "small-key")).toBeNull();
    expect(moveToStorage(hero(), "small-key", 1)).toBeNull();
  });

  it("refuses while storage is locked, however empty the bag", () => {
    expect(moveToStorage(hero({ storageTier: 0 }), "potion")).toBeNull();
    expect(moveToStorage({ inventory: [{ name: "Potion" }] }, "potion")).toBeNull();
  });

  it("refuses a stack that is not in the bag, or more than it holds, or a quantity that is not a whole number from 1", () => {
    expect(moveToStorage(hero(), "elixir")).toBeNull();
    expect(moveToStorage(hero(), "potion", 6)).toBeNull();
    expect(moveToStorage(hero(), "potion", 0)).toBeNull();
    expect(moveToStorage(hero(), "potion", -1)).toBeNull();
    expect(moveToStorage(hero(), "potion", Number.NaN)).toBeNull();
    expect(moveToStorage(hero(), "potion", 0.5)).toBeNull();
    expect(qtyOf(moveToStorage(hero(), "potion", 2.9)!.storage, "potion")).toBe(2);
    expect(moveToStorage(null, "potion")).toBeNull();
  });

  it("refuses a new stack when storage is full, but takes more of a stack it holds", () => {
    const full = hero({ storage: [...stacks(9, "stored"), { id: "ether", name: "Ether", qty: 1 }] });
    expect(storageUsage(full)).toEqual({ used: 10, max: 10 });
    expect(moveToStorage(full, "potion")).toBeNull();
    expect(qtyOf(moveToStorage(full, "ether")!.storage, "ether")).toBe(3);
  });

  it("fits the 10th stack of the first tier and not the 11th", () => {
    const nine = hero({ storage: stacks(9, "stored") });
    expect(moveToStorage(nine, "potion")).not.toBeNull();
    const ten = hero({ storage: stacks(10, "stored") });
    expect(moveToStorage(ten, "potion")).toBeNull();
  });

  it("leaves rows it cannot read exactly where they were", () => {
    const user = hero({ inventory: [null, 3, { name: "Potion", qty: 2 }, { name: "  " }] });
    const moved = moveToStorage(user, "potion")!;
    expect(moved.inventory).toEqual([null, 3, { name: "  " }]);
  });
});

describe("moveToBag", () => {
  const hero = (extra: object = {}) => ({
    inventory: [] as unknown[],
    storageTier: 2,
    storage: [
      { id: "potion", name: "Potion", qty: 5, type: "consumable" },
      { id: "ether", name: "Ether", qty: 1 },
    ],
    ...extra,
  });

  it("moves part of a stored stack, or all of it when no quantity is named", () => {
    const part = moveToBag(hero(), "potion", 2)!;
    expect(qtyOf(part.storage, "potion")).toBe(3);
    expect(part.inventory).toEqual([{ id: "potion", name: "Potion", qty: 2, type: "consumable" }]);

    const all = moveToBag(hero(), "potion")!;
    expect(ids(all.storage)).toEqual(["ether"]);
    expect(qtyOf(all.inventory, "potion")).toBe(5);
  });

  it("adds to the stack the bag already holds, even when the bag is full", () => {
    const full = hero({ inventory: [...stacks(19), { id: "potion", name: "Potion", qty: 1 }] });
    expect(bagUsage(full).used).toBe(20);
    const moved = moveToBag(full, "potion")!;
    expect(qtyOf(moved.inventory, "potion")).toBe(6);
    expect(inventoryOf({ inventory: moved.inventory })).toHaveLength(20);
  });

  it("refuses a new stack when the bag is full of other stacks, and takes it once a slot is free", () => {
    const full = hero({ inventory: stacks(20) });
    expect(moveToBag(full, "potion")).toBeNull();
    expect(moveToBag(hero({ inventory: stacks(19) }), "potion")).not.toBeNull();
  });

  it("counts keys as free: a bag of 20 stacks plus keys is still full, and keys never block a move", () => {
    const keys = [{ id: "small-key", name: "Small Key", type: "key", qty: 3 }];
    expect(moveToBag(hero({ inventory: [...stacks(19), ...keys] }), "potion")).not.toBeNull();
    expect(moveToBag(hero({ inventory: [...stacks(20), ...keys] }), "potion")).toBeNull();
  });

  it("refuses a stack that is not in storage, or more than it holds", () => {
    expect(moveToBag(hero(), "elixir")).toBeNull();
    expect(moveToBag(hero(), "potion", 6)).toBeNull();
    expect(moveToBag(hero(), "potion", 0)).toBeNull();
    expect(moveToBag({}, "potion")).toBeNull();
  });

  it("works while storage reads as locked, so a hero is never cut off from what they stored", () => {
    expect(moveToBag(hero({ storageTier: 0 }), "ether")).not.toBeNull();
  });

  it("round trips: store then take leaves the same stacks", () => {
    const start = { inventory: [{ id: "potion", name: "Potion", qty: 5 }], storageTier: 1, storage: [] as unknown[] };
    const stored = moveToStorage(start, "potion", 3)!;
    const back = moveToBag({ ...start, ...stored }, "potion")!;
    expect(inventoryOf({ inventory: back.inventory })).toEqual(inventoryOf(start));
    expect(back.storage).toEqual([]);
  });
});
