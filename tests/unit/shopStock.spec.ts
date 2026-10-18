import { ShopItemType, registryShop } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import {
  DEFAULT_SHOP_STOCK,
  defaultStockPlan,
  reshelveItem,
  shelvesHolding,
} from "@/lib/services/shops/shopStock";

const meta = (id: string) => getAllShops().find((shop) => shop.id === id)!;
const shelf = (shop: ShopInterface | undefined) => (shop?.items ?? []).map((slot) => slot.itemId);

describe("defaultStockPlan", () => {
  it("opens every registry shop with potions when nothing is stored yet, and adds the potion records", () => {
    const plan = defaultStockPlan([], []);
    expect(plan.shops.map((shop) => shop.id).sort()).toEqual(getAllShops().map((shop) => shop.id).sort());
    for (const shop of plan.shops) {
      expect(shop.defaultStocked).toBe(true);
      expect(shelf(shop).length).toBeGreaterThan(0);
      expect(shop.items.every((slot) => slot.type === ShopItemType.Accessory)).toBe(true);
    }
    expect(shelf(plan.shops.find((shop) => shop.id === "pegasus-ranch"))).toEqual(["item-health-potion", "item-mana-potion"]);
    expect(shelf(plan.shops.find((shop) => shop.id === "theia-city"))).toContain("item-elixir");
    expect(plan.items.map((item) => item.id).sort()).toEqual(["item-elixir", "item-ether", "item-health-potion", "item-mana-potion"]);
    expect(plan.items.find((item) => item.id === "item-ether")?.name).toBe("Ether");
  });

  it("only names items the stock table knows", () => {
    const known = new Set(defaultStockPlan([], []).items.map((item) => item.id));
    for (const stock of Object.values(DEFAULT_SHOP_STOCK)) stock.forEach((id) => expect(known.has(id)).toBe(true));
  });

  it("stocks an empty stored shelf but keeps a filled one, marking both done", () => {
    const empty = registryShop(meta("wrecked-ship"));
    const filled = { ...registryShop(meta("hometown-market")), items: [{ itemId: "reward-1", type: ShopItemType.Accessory }] };
    const plan = defaultStockPlan([empty, filled], [], [meta("wrecked-ship"), meta("hometown-market")]);
    expect(shelf(plan.shops.find((shop) => shop.id === "wrecked-ship"))).toEqual(["item-health-potion", "item-mana-potion"]);
    const market = plan.shops.find((shop) => shop.id === "hometown-market");
    expect(shelf(market)).toEqual(["reward-1"]);
    expect(market?.defaultStocked).toBe(true);
  });

  it("leaves a shop alone once it has been stocked, even when the Game Master emptied it", () => {
    const emptied = { ...registryShop(meta("snow-shack")), defaultStocked: true };
    expect(defaultStockPlan([emptied], [], [meta("snow-shack")])).toEqual({ shops: [], items: [] });
  });

  it("keeps the Game Master's own clerk and hours on a shop it stocks", () => {
    const own = { ...registryShop(meta("witchs-hut")), clerkName: "Aunt May", hours: { open: "08:00", close: "20:00" } };
    const [shop] = defaultStockPlan([own], [], [meta("witchs-hut")]).shops;
    expect(shop.clerkName).toBe("Aunt May");
    expect(shop.hours).toEqual({ open: "08:00", close: "20:00" });
    expect(shelf(shop)).toEqual(["item-mana-potion", "item-ether"]);
  });

  it("does not re-add a potion the catalogue already holds", () => {
    const plan = defaultStockPlan([], [{ id: "item-health-potion" }, { id: "item-mana-potion" }], [meta("pegasus-ranch")]);
    expect(plan.items).toEqual([]);
  });
});

describe("shelves for one item", () => {
  const shops: ShopInterface[] = [
    { ...registryShop(meta("hometown-market")), items: [{ itemId: "cape", type: ShopItemType.Accessory, price: 9 }] },
    { ...registryShop(meta("pegasus-ranch")), items: [] },
    { ...registryShop(meta("snow-shack")), items: [{ itemId: "boots", type: ShopItemType.Accessory }] },
  ];

  it("lists the shops whose shelf holds the item", () => {
    expect(shelvesHolding(shops, "cape")).toEqual(["hometown-market"]);
    expect(shelvesHolding(shops, "nothing")).toEqual([]);
  });

  it("adds the item to chosen shelves, takes it off the others, and returns only the shops that change", () => {
    const changed = reshelveItem(shops, "cape", ["pegasus-ranch", "snow-shack"]);
    expect(changed.map((shop) => shop.id)).toEqual(["hometown-market", "pegasus-ranch", "snow-shack"]);
    expect(shelf(changed[0])).toEqual([]);
    expect(shelf(changed[1])).toEqual(["cape"]);
    expect(shelf(changed[2])).toEqual(["boots", "cape"]);
  });

  it("keeps a shelf's price for an item that stays on it", () => {
    expect(reshelveItem(shops, "cape", ["hometown-market"])).toEqual([]);
  });
});
