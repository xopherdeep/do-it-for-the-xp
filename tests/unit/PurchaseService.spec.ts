import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import {
  buyItem,
  fulfillPurchase,
  InsufficientFundsError,
  PurchaseError,
  refundPurchase,
  stockShelf,
} from "@/lib/services/shop/PurchaseService";
import type { NewPurchaseLogEntry, PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { ShopItem } from "@/lib/databases/ShopsDb";

// The user store is real; only what it writes to disk is faked, so GP moves exactly as in the app.
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));

// In-memory PurchaseLogDb with the same methods the service calls.
const mockLog = {
  entries: new Map<string, PurchaseLogEntry>(),
  failNextWrite: false,
  nextId: 1,
  reset() {
    this.entries.clear();
    this.failNextWrite = false;
    this.nextId = 1;
  },
  async logPurchase(input: NewPurchaseLogEntry): Promise<PurchaseLogEntry> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("storage is full");
    }
    const entry: PurchaseLogEntry = {
      id: `purchase-${this.nextId++}`,
      userId: input.userId,
      itemId: input.itemId,
      itemName: input.itemName,
      price: input.price,
      status: input.status ?? "pending",
      createdAt: input.createdAt || new Date().toISOString(),
      note: input.note,
    };
    this.entries.set(entry.id, entry);
    return entry;
  },
  async getEntry(id: string): Promise<PurchaseLogEntry | null> {
    return this.entries.get(id) ?? null;
  },
  async getEntries(): Promise<PurchaseLogEntry[]> {
    return Array.from(this.entries.values());
  },
  async getPending(): Promise<PurchaseLogEntry[]> {
    return (await this.getEntries()).filter((entry) => entry.status === "pending");
  },
  async updateEntry(id: string, patch: Partial<PurchaseLogEntry>): Promise<PurchaseLogEntry | null> {
    const existing = this.entries.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    this.entries.set(id, updated);
    return updated;
  },
};
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ getPurchaseLogDb: () => mockLog }));

const hero = (id: string, wallet: number, limit = 1000) => ({
  id,
  name: { nick: id, full: id },
  stats: { gp: { wallet, savings: 0, debt: 0, limit } },
});

const lego = { id: "acc-lego", name: "Lego Set", price: 60 };

const rejection = async (promise: Promise<unknown>): Promise<any> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
};

describe("PurchaseService", () => {
  let store: ReturnType<typeof useUserStore>;
  const wallet = (id = "hero-1") => store.users[id].stats.gp.wallet;
  const savings = (id = "hero-1") => store.users[id].stats.gp.savings;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockLog.reset();
    store = useUserStore();
    store.users["hero-1"] = hero("hero-1", 100);
  });

  describe("buyItem", () => {
    it("charges the wallet and logs a pending purchase for the Game Master", async () => {
      const entry = await buyItem(store.users["hero-1"], lego);

      expect(wallet()).toBe(40);
      expect(entry).toMatchObject({
        userId: "hero-1",
        itemId: "acc-lego",
        itemName: "Lego Set",
        price: 60,
        status: "pending",
      });
      expect(entry.id).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false);
      expect(entry.reviewedAt).toBeUndefined();
      expect(await mockLog.getPending()).toEqual([entry]);
    });

    it("accepts a plain hero id as well as a profile", async () => {
      store.users["7"] = hero("7", 100);
      const entry = await buyItem(7, lego);

      expect(entry.userId).toBe("7");
      expect(wallet("7")).toBe(40);
    });

    it("lets a hero spend exactly what the wallet holds", async () => {
      await buyItem("hero-1", { id: "acc-exact", name: "Exact Change", price: 100 });

      expect(wallet()).toBe(0);
      expect(mockLog.entries.size).toBe(1);
    });

    it("rejects with a typed InsufficientFundsError and charges nothing when the wallet is short", async () => {
      const error = await rejection(buyItem("hero-1", { id: "acc-bike", name: "Bike", price: 150 }));

      expect(error).toBeInstanceOf(InsufficientFundsError);
      expect(error).toBeInstanceOf(PurchaseError);
      expect(error).toMatchObject({ code: "insufficient-funds", itemName: "Bike", price: 150, wallet: 100 });
      expect(error.shortBy).toBe(50);
      expect(wallet()).toBe(100);
      expect(mockLog.entries.size).toBe(0);
    });

    it("never lets the wallet go below zero, even one GP short", async () => {
      store.users["hero-1"].stats.gp.wallet = 59;
      const error = await rejection(buyItem("hero-1", lego));

      expect(error).toBeInstanceOf(InsufficientFundsError);
      expect(error.shortBy).toBe(1);
      expect(wallet()).toBe(59);
    });

    it("counts a hero with no GP record as having an empty wallet", async () => {
      store.users["broke"] = { id: "broke", name: { nick: "broke" } };
      const error = await rejection(buyItem("broke", lego));

      expect(error).toBeInstanceOf(InsufficientFundsError);
      expect(error.wallet).toBe(0);
    });

    it("rejects an unknown hero instead of charging the first profile", async () => {
      const error = await rejection(buyItem("ghost", lego));

      expect(error).toBeInstanceOf(PurchaseError);
      expect(error.code).toBe("unknown-hero");
      expect(wallet()).toBe(100);
      expect(mockLog.entries.size).toBe(0);
    });

    it.each([
      ["a negative price", -5],
      ["a price that isn't a number", Number.NaN],
      ["a price that never ends", Number.POSITIVE_INFINITY],
    ])("rejects an item with %s without touching the wallet", async (_label, price) => {
      const error = await rejection(buyItem("hero-1", { id: "acc-odd", name: "Odd Item", price }));

      expect(error).toBeInstanceOf(PurchaseError);
      expect(error.code).toBe("invalid-item");
      expect(wallet()).toBe(100);
      expect(mockLog.entries.size).toBe(0);
    });

    it("reads a price that arrives as text, as the accessory form stores it", async () => {
      const entry = await buyItem("hero-1", { id: "acc-text", name: "Text Price", price: "25" as unknown as number });

      expect(entry.price).toBe(25);
      expect(wallet()).toBe(75);
    });

    it("logs a free item without charging", async () => {
      const entry = await buyItem("hero-1", { id: "acc-free", name: "Sticker", price: 0 });

      expect(entry.price).toBe(0);
      expect(wallet()).toBe(100);
      expect(mockLog.entries.size).toBe(1);
    });

    it("buys straight off a shop shelf at the slot's price", async () => {
      const accessory = { id: "acc-lego", name: "Lego Set", basePrice: 60, availableToMembers: [""] } as unknown as Accessory;
      const [item] = stockShelf([{ itemId: "acc-lego", type: 1, price: 40 }], [accessory], "hero-1");

      const entry = await buyItem("hero-1", item);

      expect(entry).toMatchObject({ itemId: "acc-lego", itemName: "Lego Set", price: 40, status: "pending" });
      expect(wallet()).toBe(60);
    });

    it("charges once when the buy button is double tapped", async () => {
      const [first, second] = await Promise.all([buyItem("hero-1", lego), buyItem("hero-1", lego)]);

      expect(second).toBe(first);
      expect(wallet()).toBe(40);
      expect(mockLog.entries.size).toBe(1);
    });

    it("lets the same item be bought again once the first purchase is done", async () => {
      const first = await buyItem("hero-1", { id: "acc-pen", name: "Pen", price: 10 });
      const second = await buyItem("hero-1", { id: "acc-pen", name: "Pen", price: 10 });

      expect(second.id).not.toBe(first.id);
      expect(wallet()).toBe(80);
      expect(mockLog.entries.size).toBe(2);
    });

    it("never lets two purchases spend the same GP", async () => {
      const results = await Promise.allSettled([
        buyItem("hero-1", { id: "acc-a", name: "Item A", price: 70 }),
        buyItem("hero-1", { id: "acc-b", name: "Item B", price: 70 }),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
      const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
      expect(failure.reason).toBeInstanceOf(InsufficientFundsError);
      expect(wallet()).toBe(30);
      expect(mockLog.entries.size).toBe(1);
    });

    it("gives the GP back when the purchase can't be recorded", async () => {
      mockLog.failNextWrite = true;
      const error = await rejection(buyItem("hero-1", lego));

      expect(error.message).toBe("storage is full");
      expect(wallet()).toBe(100);
      expect(mockLog.entries.size).toBe(0);
    });
  });

  describe("fulfillPurchase", () => {
    it("marks the purchase delivered, records the reviewer, and leaves the GP alone", async () => {
      const bought = await buyItem("hero-1", lego);
      const fulfilled = await fulfillPurchase(bought.id, "gm-1");

      expect(fulfilled).toMatchObject({ id: bought.id, status: "fulfilled", reviewedBy: "gm-1" });
      expect(Number.isNaN(Date.parse(fulfilled?.reviewedAt as string))).toBe(false);
      expect(wallet()).toBe(40);
      expect(await mockLog.getPending()).toEqual([]);
    });

    it("returns null for a purchase that doesn't exist", async () => {
      expect(await fulfillPurchase("nope", "gm-1")).toBeNull();
    });

    it("leaves an already reviewed purchase as it was", async () => {
      const bought = await buyItem("hero-1", lego);
      const first = await fulfillPurchase(bought.id, "gm-1");
      const again = await fulfillPurchase(bought.id, "gm-2");

      expect(again).toEqual(first);
      expect(again?.reviewedBy).toBe("gm-1");
    });
  });

  describe("refundPurchase", () => {
    it("credits the GP back and records who, when and why", async () => {
      const bought = await buyItem("hero-1", lego);
      expect(wallet()).toBe(40);

      const refunded = await refundPurchase(bought.id, "gm-1", "Out of stock");

      expect(refunded).toMatchObject({
        id: bought.id,
        status: "refunded",
        reviewedBy: "gm-1",
        note: "Out of stock",
      });
      expect(Number.isNaN(Date.parse(refunded?.reviewedAt as string))).toBe(false);
      expect(wallet()).toBe(100);
      expect(await mockLog.getPending()).toEqual([]);
    });

    it("refunds without a note", async () => {
      const bought = await buyItem("hero-1", lego);
      const refunded = await refundPurchase(bought.id, "gm-1");

      expect(refunded?.status).toBe("refunded");
      expect(refunded?.note).toBeUndefined();
      expect(wallet()).toBe(100);
    });

    it("refunds only once when the button is tapped twice at the same time", async () => {
      const bought = await buyItem("hero-1", lego);
      const results = await Promise.all([refundPurchase(bought.id, "gm-1"), refundPurchase(bought.id, "gm-1")]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(wallet()).toBe(100);
    });

    it("refunds only once when asked again later", async () => {
      const bought = await buyItem("hero-1", lego);
      await refundPurchase(bought.id, "gm-1", "first");
      const again = await refundPurchase(bought.id, "gm-1", "second");

      expect(again?.status).toBe("refunded");
      expect(again?.note).toBe("first");
      expect(wallet()).toBe(100);
    });

    it("won't refund a purchase that was already delivered", async () => {
      const bought = await buyItem("hero-1", lego);
      await fulfillPurchase(bought.id, "gm-1");
      const refunded = await refundPurchase(bought.id, "gm-1");

      expect(refunded?.status).toBe("fulfilled");
      expect(wallet()).toBe(40);
    });

    it("returns null for a purchase that doesn't exist", async () => {
      expect(await refundPurchase("nope", "gm-1")).toBeNull();
      expect(wallet()).toBe(100);
    });

    it("leaves the purchase pending when the hero no longer exists", async () => {
      const orphan = await mockLog.logPurchase({ userId: "ghost", itemId: "acc-1", itemName: "Lego", price: 60 });
      const error = await rejection(refundPurchase(orphan.id, "gm-1"));

      expect(error).toBeInstanceOf(PurchaseError);
      expect(error.code).toBe("unknown-hero");
      expect((await mockLog.getEntry(orphan.id))?.status).toBe("pending");
    });

    it("puts the purchase back in the queue when the GP can't be returned", async () => {
      const bought = await buyItem("hero-1", lego);
      const credit = jest.spyOn(store, "updateUserGP").mockRejectedValueOnce(new Error("wallet is locked"));

      const error = await rejection(refundPurchase(bought.id, "gm-1", "Sold out"));

      expect(error.message).toBe("wallet is locked");
      const entry = await mockLog.getEntry(bought.id);
      expect(entry?.status).toBe("pending");
      expect(entry?.reviewedBy).toBeUndefined();
      expect(entry?.note).toBeUndefined();
      expect(wallet()).toBe(40);
      credit.mockRestore();
    });

    it("sends refunded GP past the wallet limit to savings instead of losing it", async () => {
      store.users["hero-1"] = hero("hero-1", 100, 120);
      const bought = await buyItem("hero-1", lego);
      store.users["hero-1"].stats.gp.wallet = 110;

      await refundPurchase(bought.id, "gm-1");

      expect(wallet()).toBe(120);
      expect(savings()).toBe(50);
    });
  });
});

describe("stockShelf", () => {
  // 2026-10-08 is a Thursday (getDay() === 4)
  const thursday = new Date(2026, 9, 8, 12, 0, 0);

  const accessory = (overrides: Record<string, unknown> = {}): Accessory =>
    ({
      id: "acc-1",
      name: "Lego Set",
      description: "A big box of bricks",
      url: "",
      basePrice: 60,
      availableToMembers: [""],
      requiresApproval: false,
      ...overrides,
    } as unknown as Accessory);

  // type 1 is ShopItemType.Accessory, which is what the shop editor saves
  const slot = (itemId: string, overrides: Partial<ShopItem> = {}): ShopItem => ({ itemId, type: 1, ...overrides });

  it("offers accessories at the slot's price, falling back to the base price", () => {
    const shelf = stockShelf(
      [slot("a", { price: 45 }), slot("b"), slot("c", { price: 0 })],
      [
        accessory({ id: "a", name: "Alpha", basePrice: 60 }),
        accessory({ id: "b", name: "Beta", basePrice: 30 }),
        accessory({ id: "c", name: "Gamma", basePrice: 20 }),
      ],
      "hero-1",
      thursday
    );

    expect(shelf.map((item) => [item.id, item.name, item.price])).toEqual([
      ["a", "Alpha", 45],
      ["b", "Beta", 30],
      ["c", "Gamma", 20],
    ]);
  });

  it("reads a base price that was typed into the form as text", () => {
    const shelf = stockShelf([slot("a")], [accessory({ id: "a", basePrice: "25" })], "hero-1", thursday);

    expect(shelf[0].price).toBe(25);
  });

  it.each([
    ["no price", undefined],
    ["a blank price", ""],
    ["a zero price", 0],
    ["a negative price", -5],
    ["a price that isn't a number", "lots"],
  ])("never offers an item with %s", (_label, basePrice) => {
    expect(stockShelf([slot("a")], [accessory({ id: "a", basePrice })], "hero-1", thursday)).toEqual([]);
  });

  it("skips slots that point at something that isn't an accessory", () => {
    const shelf = stockShelf(
      [slot("pegasus-boots"), slot("a")],
      [accessory({ id: "a", name: "Alpha" })],
      "hero-1",
      thursday
    );

    expect(shelf.map((item) => item.id)).toEqual(["a"]);
  });

  it("opens a slot only on its chosen weekdays", () => {
    const accessories = [accessory({ id: "a" })];

    expect(stockShelf([slot("a", { availableDays: [1, 4] })], accessories, "hero-1", thursday)).toHaveLength(1);
    expect(stockShelf([slot("a", { availableDays: [0, 6] })], accessories, "hero-1", thursday)).toHaveLength(0);
    expect(stockShelf([slot("a", { availableDays: [] })], accessories, "hero-1", thursday)).toHaveLength(1);
    expect(stockShelf([slot("a")], accessories, "hero-1", thursday)).toHaveLength(1);
  });

  it("hides member-only accessories from every other hero", () => {
    const only = [accessory({ id: "a", availableToMembers: ["", "hero-2", 7] })];

    expect(stockShelf([slot("a")], only, "hero-2", thursday)).toHaveLength(1);
    expect(stockShelf([slot("a")], only, "7", thursday)).toHaveLength(1);
    expect(stockShelf([slot("a")], only, "hero-1", thursday)).toHaveLength(0);
  });

  it("offers an accessory nobody was singled out for to every hero", () => {
    expect(stockShelf([slot("a")], [accessory({ id: "a", availableToMembers: [""] })], "hero-9", thursday)).toHaveLength(1);
    expect(stockShelf([slot("a")], [accessory({ id: "a", availableToMembers: [] })], "hero-9", thursday)).toHaveLength(1);
  });

  // The catalogue's icon is a Font Awesome name ("film"), not a picture: it must never end up as an image address
  it("carries the name, description, photo and icon to show, each in its own field", () => {
    const [withPhoto, withIcon, bare] = stockShelf(
      [slot("a"), slot("b"), slot("c")],
      [
        accessory({ id: "a", imageUrl: "https://example.com/a.png", icon: "cubes" }),
        accessory({ id: "b", imageUrl: "", icon: "film" }),
        accessory({ id: "c", name: "", description: undefined }),
      ],
      "hero-1",
      thursday
    );

    expect(withPhoto).toMatchObject({
      name: "Lego Set",
      description: "A big box of bricks",
      photo: "https://example.com/a.png",
      icon: "cubes",
    });
    expect(withIcon).toMatchObject({ photo: "", icon: "film" });
    expect(bare).toMatchObject({ name: "Mystery item", description: "", photo: "", icon: "" });
    expect(withIcon).not.toHaveProperty("image");
  });
});
