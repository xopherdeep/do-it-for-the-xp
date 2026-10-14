import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  SHOP_ICON_NAMES,
  SHOP_WORLD_CHOICES,
  blankShop,
  daysLine,
  dropGood,
  hoursNote,
  hoursOf,
  normalWorld,
  pickGoods,
  setGoodDays,
  setGoodPrice,
  shopFromRecord,
  shopIconChoices,
  shopIconClass,
  shopIconLabel,
  shopSummary,
  shopToRecord,
  shopWizardSteps,
  worldLabel,
} from "@/app/Admin/XpCompendium/views/XpAccessories/shopWizard";
import type { ShopDraft } from "@/app/Admin/XpCompendium/views/XpAccessories/shopWizard";
import { ShopItemType } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import { EconomyRoutes } from "@/router/Admin/economy.routes";
import { blockedBy, canJumpTo, canNext, firstIndex, isLast, isReady, lastIndex, progressOf } from "@/lib/services/wizard/wizardSteps";

/**
 * The Game Master's shop wizard (board #1407): Name the shop and clerk -> Dress the shop -> Open hours -> Stock it -> Open.
 * The steps, the draft, the record it saves and what the summary says are pure; the form (XpCreateUpdateShop.vue) only
 * paints them. The world list and the icon grid are the ones the Decorate tab shows.
 */

const steps = shopWizardSteps();
const ids = steps.map((step) => step.id);
const at = (id: string) => ids.indexOf(id);

const ready = (patch: Partial<ShopDraft> = {}): ShopDraft => ({ ...blankShop(), name: "The Magic Emporium", ...patch });

const good = (itemId: string, patch: Record<string, unknown> = {}) => ({ itemId, type: ShopItemType.Accessory, availableDays: [], ...patch });

describe("the steps", () => {
  it("asks Name the shop and clerk, Dress the shop, Open hours, Stock it and ends on the summary", () => {
    expect(ids).toEqual(["name", "dress", "hours", "stock", "open"]);
    expect(steps.map((step) => step.title)).toEqual(["Name the shop and clerk", "Dress the shop", "Open hours", "Stock it", "Open the shop"]);
  });

  it("gives every step a guide line in the Game Master's voice, and the summary last", () => {
    for (const step of steps) expect(step.guide.trim().length).toBeGreaterThan(8);
    expect(steps[steps.length - 1].id).toBe("open");
  });

  it("skips no step: a shop always asks all five", () => {
    expect(steps.some((step) => step.isSkipped)).toBe(false);
    expect(progressOf(steps, blankShop(), 0)).toEqual({ n: 1, total: 5 });
  });
});

describe("validity", () => {
  it("wants a name for the shop, and says so in one line", () => {
    const name = steps[at("name")];
    expect(name.isValid(ready({ name: "" }))).toBe("Name the shop");
    expect(name.isValid(ready({ name: "   " }))).toBe("Name the shop");
    expect(name.isValid(ready())).toBe(true);
  });

  it("does not need a clerk, a greeting or a description: the portal's own clerk stands in", () => {
    expect(steps[at("name")].isValid(ready({ clerkName: "", greeting: "", description: "" }))).toBe(true);
  });

  it("wants a look and a sign for the shop", () => {
    const dress = steps[at("dress")];
    expect(dress.isValid(ready())).toBe(true);
    expect(dress.isValid(ready({ world: "" }))).toBe("Pick a look for the shop");
    expect(dress.isValid(ready({ icon: "  " }))).toBe("Pick a sign for the shop");
  });

  it("is happy with an always open shop and with two readable times", () => {
    const hours = steps[at("hours")];
    expect(hours.isValid(ready({ alwaysOpen: true, opensAt: "", closesAt: "" }))).toBe(true);
    expect(hours.isValid(ready({ alwaysOpen: false, opensAt: "07:30", closesAt: "21:00" }))).toBe(true);
  });

  it("wants both times once the shop keeps hours", () => {
    const hours = steps[at("hours")];
    expect(hours.isValid(ready({ alwaysOpen: false, opensAt: "", closesAt: "20:00" }))).toBe("Pick when it opens and closes");
    expect(hours.isValid(ready({ alwaysOpen: false, opensAt: "08:00", closesAt: "25:00" }))).toBe("Pick when it opens and closes");
  });

  it("opens with empty shelves: stocking can wait for the Items tab", () => {
    expect(steps[at("stock")].isValid(ready({ items: [] }))).toBe(true);
    expect(steps[at("open")].isValid(ready())).toBe(true);
  });

  it("is ready once the name is given, and not before", () => {
    expect(isReady(steps, blankShop())).toBe(false);
    expect(isReady(steps, ready())).toBe(true);
  });
});

describe("moving through the steps", () => {
  it("keeps Next shut on step one until the shop has a name, with the reason", () => {
    expect(canNext(steps, blankShop(), 0)).toBe(false);
    expect(blockedBy(steps, blankShop(), 0)).toBe("Name the shop");
    expect(canNext(steps, ready(), 0)).toBe(true);
    expect(blockedBy(steps, ready(), 0)).toBe("");
  });

  it("makes Open the verb of the last step, and keeps it shut for a nameless shop", () => {
    const open = at("open");
    expect(isLast(steps, ready(), open)).toBe(true);
    expect(canNext(steps, ready(), open)).toBe(true);
    expect(canNext(steps, blankShop(), open)).toBe(false);
    expect(blockedBy(steps, blankShop(), open)).toBe("Name the shop");
  });

  it("opens a new shop on step one and an edit on the summary", () => {
    expect(firstIndex(steps, blankShop())).toBe(0);
    expect(lastIndex(steps, ready())).toBe(at("open"));
  });

  it("lets a dot lead back only while the steps before it are valid", () => {
    expect(canJumpTo(steps, ready(), at("stock"))).toBe(true);
    expect(canJumpTo(steps, blankShop(), at("stock"))).toBe(false);
  });
});

describe("the worlds on offer", () => {
  const backgrounds = readdirSync(join(__dirname, "../../src/assets/images/backgrounds"));
  const worldIds = SHOP_WORLD_CHOICES.map((world) => world.id);

  it("are the art ids: mountains, ice and swamps, not mountain, snow and volcano", () => {
    expect(worldIds).toEqual(expect.arrayContaining(["mountains", "ice", "swamps", "desert", "plains", "forest", "islands", "hometown"]));
    for (const wrong of ["mountain", "snow", "volcano"]) expect(worldIds).not.toContain(wrong);
  });

  it("each have art of their own, so none falls back to the world map", () => {
    for (const id of worldIds) {
      const file = id === "hometown" ? "hometown.webp" : `world-${id}.webp`;
      expect(backgrounds).toContain(file);
    }
  });

  it("lists each world once", () => {
    expect(new Set(worldIds).size).toBe(worldIds.length);
  });

  it("reads the old free-text names as the art they meant", () => {
    expect(normalWorld("mountain")).toBe("mountains");
    expect(normalWorld("snow")).toBe("ice");
    expect(normalWorld(" Desert ")).toBe("desert");
    expect(normalWorld("plains")).toBe("plains");
    expect(normalWorld("")).toBe("");
    expect(normalWorld(null)).toBe("");
    expect(normalWorld(undefined)).toBe("");
  });

  it("names a world for a parent, and a world with no entry by its own id", () => {
    expect(worldLabel("ice")).toBe("Tundra");
    expect(worldLabel("mountains")).toBe("Mountains");
    expect(worldLabel("traveling")).toBe("Traveling");
    expect(worldLabel("")).toBe("");
  });
});

describe("the icons on offer", () => {
  it("are duotone Font Awesome names the sign can wear, without repeats", () => {
    expect(SHOP_ICON_NAMES.length).toBeGreaterThan(20);
    expect(SHOP_ICON_NAMES).toContain("store");
    expect(new Set(SHOP_ICON_NAMES).size).toBe(SHOP_ICON_NAMES.length);
    expect(shopIconClass("store")).toBe("fad fa-store");
  });

  it("labels an icon the way a parent would read it", () => {
    expect(shopIconLabel("fad fa-treasure-chest")).toBe("Treasure chest");
    expect(shopIconLabel("fad fa-store")).toBe("Store");
  });

  it("puts the shop's own icon first when it is not a stock one, and never twice", () => {
    const stock = shopIconChoices();
    expect(stock.map((choice) => choice.value)).toEqual(SHOP_ICON_NAMES.map(shopIconClass));
    const withOwn = shopIconChoices(["fad fa-farm-gate", "fad fa-store", undefined, null, ""]);
    expect(withOwn[0]).toEqual({ value: "fad fa-farm-gate", label: "Farm gate" });
    expect(withOwn.filter((choice) => choice.value === "fad fa-store")).toHaveLength(1);
    expect(withOwn).toHaveLength(stock.length + 1);
  });
});

describe("a new shop", () => {
  it("starts nameless, in the hometown, with the store sign, always open and with bare shelves", () => {
    const shop = blankShop();
    expect(shop).toEqual({
      name: "",
      description: "",
      clerkName: "",
      greeting: "",
      world: "hometown",
      icon: "fad fa-store",
      alwaysOpen: true,
      opensAt: "08:00",
      closesAt: "20:00",
      items: [],
    });
  });

  it("gives each new shop lists of its own", () => {
    const first = blankShop();
    first.items.push(good("a"));
    expect(blankShop().items).toEqual([]);
  });
});

describe("opening a saved shop", () => {
  const saved: ShopInterface = {
    id: "shop-1",
    name: "Pixel Pawn",
    description: "Trades in odds and ends",
    world: "mountain",
    icon: "fad fa-gem",
    clerkName: "Marcus",
    greeting: "Welcome in",
    hours: { open: "09:00", close: "17:30" },
    items: [good("a", { price: 12, availableDays: [1, 3] }), good("b")],
  };

  it("fills every field and reads the old mountain as the mountains art", () => {
    const draft = shopFromRecord(saved);
    expect(draft).toMatchObject({
      id: "shop-1",
      name: "Pixel Pawn",
      description: "Trades in odds and ends",
      world: "mountains",
      icon: "fad fa-gem",
      clerkName: "Marcus",
      greeting: "Welcome in",
      alwaysOpen: false,
      opensAt: "09:00",
      closesAt: "17:30",
    });
    expect(draft.items).toHaveLength(2);
  });

  it("copies the shelves, so a change in the wizard does not touch the stored shop", () => {
    const draft = shopFromRecord(saved);
    draft.items[0].price = 99;
    draft.items.push(good("c"));
    expect(saved.items[0].price).toBe(12);
    expect(saved.items).toHaveLength(2);
  });

  it("calls a shop with no readable hours always open, with the usual times ready to set", () => {
    for (const hours of [undefined, null, { open: "soon", close: "later" } as never]) {
      const draft = shopFromRecord({ ...saved, hours });
      expect(draft.alwaysOpen).toBe(true);
      expect(draft.opensAt).toBe("08:00");
      expect(draft.closesAt).toBe("20:00");
    }
  });

  it("fills what an old record lacks", () => {
    const draft = shopFromRecord({ id: "old", name: "Old Shop" });
    expect(draft).toMatchObject({ description: "", clerkName: "", greeting: "", world: "hometown", icon: "fad fa-store", items: [] });
  });

  it("shows only the clerk the Game Master chose, not the registry's stand-in", () => {
    // pegasus-ranch is a seeded shop: its record carries the registry clerk from day one
    const seeded = shopFromRecord({ id: "pegasus-ranch", name: "Pegasus Ranch", clerkName: "Rancher Gale" });
    expect(seeded.clerkName).toBe("");
    const renamed = shopFromRecord({ id: "pegasus-ranch", name: "Pegasus Ranch", clerkName: "Ada" });
    expect(renamed.clerkName).toBe("Ada");
  });
});

describe("the record to save", () => {
  it("trims the words and carries the new shop's fields", () => {
    const record = shopToRecord(
      ready({
        name: "  Gadget Gulch ",
        description: " Shiny things ",
        clerkName: " Wren ",
        greeting: " Come in! ",
        world: "ice",
        icon: "fad fa-igloo",
        items: [good("a")],
      })
    );
    expect(record).toMatchObject({
      name: "Gadget Gulch",
      description: "Shiny things",
      clerkName: "Wren",
      greeting: "Come in!",
      world: "ice",
      icon: "fad fa-igloo",
      hours: null,
    });
    expect(record.items).toEqual([{ itemId: "a", type: ShopItemType.Accessory, availableDays: [] }]);
  });

  it("leaves the id out for a new shop, so the database mints one", () => {
    expect(shopToRecord(ready()).id).toBe("");
  });

  it("keeps the id of the shop being edited and whatever else the record holds", () => {
    const original = { id: "shop-1", name: "Old", description: "", world: "plains", icon: "fad fa-store", items: [], mystery: 7 } as ShopInterface;
    const record = shopToRecord(shopFromRecord(original), original) as ShopInterface & { mystery?: number };
    expect(record.id).toBe("shop-1");
    expect(record.mystery).toBe(7);
  });

  it("writes the hours as two times, or null for an always open shop (as the Hours tab does)", () => {
    expect(shopToRecord(ready({ alwaysOpen: false, opensAt: "07:00", closesAt: "21:00" })).hours).toEqual({ open: "07:00", close: "21:00" });
    expect(shopToRecord(ready({ alwaysOpen: true })).hours).toBeNull();
  });

  it("drops a greeting that was cleared, and falls back to the registry's clerk like the Clerk tab", () => {
    const original = { id: "pegasus-ranch", name: "Pegasus Ranch", description: "", world: "plains", icon: "fad fa-farm", greeting: "Howdy", items: [] } as ShopInterface;
    const record = shopToRecord({ ...shopFromRecord(original), greeting: "", clerkName: "" }, original);
    expect(record.greeting).toBeUndefined();
    expect("greeting" in record).toBe(false);
    expect(record.clerkName).toBe("Rancher Gale");
  });

  it("falls back to the hometown and the store sign when the look was left blank", () => {
    const record = shopToRecord(ready({ world: "", icon: "" }));
    expect(record.world).toBe("hometown");
    expect(record.icon).toBe("fad fa-store");
  });

  it("mends an old world name on the way out", () => {
    expect(shopToRecord(ready({ world: "snow" })).world).toBe("ice");
  });

  it("keeps a price only when it is whole gold, and days only 0 to 6 once each in order", () => {
    const record = shopToRecord(
      ready({
        items: [
          good("a", { price: 12.9, availableDays: [3, 1, 3, 9, -1] }),
          good("b", { price: 0 }),
          good("c", { price: "x" as unknown as number }),
          good("a", { price: 5 }),
          good(""),
        ],
      })
    );
    expect(record.items).toEqual([
      { itemId: "a", type: ShopItemType.Accessory, price: 12, availableDays: [1, 3] },
      { itemId: "b", type: ShopItemType.Accessory, availableDays: [] },
      { itemId: "c", type: ShopItemType.Accessory, availableDays: [] },
    ]);
  });
});

describe("the shelves", () => {
  it("keeps what is still picked with its price and days, adds the new, drops the unpicked", () => {
    const shelves = [good("a", { price: 12, availableDays: [1] }), good("b"), good("c")];
    const next = pickGoods(shelves, ["c", "a", "d"]);
    expect(next.map((item) => item.itemId)).toEqual(["a", "c", "d"]);
    expect(next[0]).toMatchObject({ itemId: "a", price: 12, availableDays: [1] });
    expect(next[2]).toEqual({ itemId: "d", type: ShopItemType.Accessory, availableDays: [] });
  });

  it("ignores blanks and repeats in the pick", () => {
    expect(pickGoods([], ["a", "", "a", " "]).map((item) => item.itemId)).toEqual(["a"]);
  });

  it("changes nothing when the same goods are picked again", () => {
    const shelves = [good("a", { price: 3 })];
    expect(pickGoods(shelves, ["a"])).toEqual(shelves);
  });

  it("sets an own price from what is typed, and takes it away when it is cleared", () => {
    const shelves = [good("a"), good("b", { price: 9 })];
    expect(setGoodPrice(shelves, "a", "25")[0].price).toBe(25);
    expect(setGoodPrice(shelves, "a", "25.9")[0].price).toBe(25);
    expect(setGoodPrice(shelves, "b", "")[1].price).toBeUndefined();
    expect("price" in setGoodPrice(shelves, "b", "0")[1]).toBe(false);
    expect("price" in setGoodPrice(shelves, "b", "abc")[1]).toBe(false);
  });

  it("sets the days a good is stocked, in order and once each", () => {
    const shelves = [good("a"), good("b")];
    expect(setGoodDays(shelves, "b", [5, 1, 5])[1].availableDays).toEqual([1, 5]);
    expect(setGoodDays(shelves, "b", [])[1].availableDays).toEqual([]);
  });

  it("drops a good by id", () => {
    expect(dropGood([good("a"), good("b")], "a").map((item) => item.itemId)).toEqual(["b"]);
  });

  it("never changes the list it was given", () => {
    const shelves = [good("a")];
    const frozen = JSON.stringify(shelves);
    pickGoods(shelves, ["b"]);
    setGoodPrice(shelves, "a", "4");
    setGoodDays(shelves, "a", [2]);
    dropGood(shelves, "a");
    expect(JSON.stringify(shelves)).toBe(frozen);
  });

  it("says the days a good is stocked", () => {
    expect(daysLine([])).toBe("Every day");
    expect(daysLine(undefined)).toBe("Every day");
    expect(daysLine([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(daysLine([0, 6])).toBe("Sun, Sat");
    expect(daysLine([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
  });
});

describe("the hours", () => {
  it("are two times, or null when the shop is always open", () => {
    expect(hoursOf(ready({ alwaysOpen: true }))).toBeNull();
    expect(hoursOf(ready({ alwaysOpen: false, opensAt: "08:00", closesAt: "20:00" }))).toEqual({ open: "08:00", close: "20:00" });
    expect(hoursOf(ready({ alwaysOpen: false, opensAt: "", closesAt: "20:00" }))).toBeNull();
  });

  it("explain an overnight shop and a round-the-clock one, and say nothing otherwise", () => {
    expect(hoursNote(ready({ alwaysOpen: true }))).toBe("");
    expect(hoursNote(ready({ alwaysOpen: false, opensAt: "08:00", closesAt: "20:00" }))).toBe("");
    expect(hoursNote(ready({ alwaysOpen: false, opensAt: "08:00", closesAt: "08:00" }))).toBe(
      "Opening and closing at the same time keeps the shop open all day."
    );
    expect(hoursNote(ready({ alwaysOpen: false, opensAt: "20:00", closesAt: "02:00" }))).toBe(
      "This runs past midnight: heroes can shop until 2:00 AM the next morning."
    );
  });
});

describe("the summary", () => {
  it("lists the shop, the clerk, the look, the hours and the shelves, each owned by its step", () => {
    const rows = shopSummary(ready({ clerkName: "Wren", greeting: "Come in!", world: "ice", icon: "fad fa-igloo", items: [good("a")] }));
    expect(rows.map((row) => row.id)).toEqual(["shop", "clerk", "look", "hours", "shelves"]);
    expect(rows.map((row) => row.step)).toEqual(["name", "name", "dress", "hours", "stock"]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows[0].value).toBe("The Magic Emporium");
    expect(rows[1].value).toBe('Wren: "Come in!"');
    expect(rows[2].value).toBe("Tundra, Igloo sign");
    expect(rows[3].value).toBe("Always open");
    expect(rows[4].value).toBe("1 good");
  });

  it("names the portal's own clerk when none was chosen", () => {
    const rows = shopSummary(ready());
    expect(rows[1].value).toBe("Dr. Who, the usual clerk");
  });

  it("says the hours the shop keeps", () => {
    const rows = shopSummary(ready({ alwaysOpen: false, opensAt: "07:00", closesAt: "21:00" }));
    expect(rows[3].value).toBe("7:00 AM to 9:00 PM");
  });

  it("says empty shelves and the goods with their own price or days", () => {
    expect(shopSummary(ready())[4].value).toBe("Empty for now");
    const rows = shopSummary(ready({ items: [good("a", { price: 5 }), good("b", { availableDays: [1] }), good("c")] }));
    expect(rows[4].value).toBe("3 goods (1 priced by you, 1 on set days)");
  });

  it("shows a missing name as a gap to fill, not as a blank", () => {
    expect(shopSummary(blankShop())[0].value).toBe("No name yet");
  });
});

describe("the routes", () => {
  const shopRoutes = EconomyRoutes.find((route) => route.path === "economy/shops/:shopId");

  it("passes the id to the form, so editing opens the shop and not an empty page", () => {
    const route = EconomyRoutes.find((candidate) => candidate.name === "xp-create-update-shop");
    expect(route?.path).toBe("economy/create-shop/:id?");
    expect(route?.props).toBe(true);
  });

  it("sends every tab of the shop's tab bar to a page that exists (Info goes to the dashboard, not /splash)", () => {
    const pages = (shopRoutes?.children ?? []).map((child) => child.path);
    const bar = readFileSync(join(__dirname, "../../src/app/Admin/XpCompendium/views/XpAccessories/components/XpShopDetails.vue"), "utf8");
    const tabs = [...bar.matchAll(/economy\/shops\/\$\{shopId\}\/([a-z-]+)/g)].map((match) => match[1]);
    expect(tabs).toEqual(["dashboard", "items", "hours", "decorate", "clerk"]);
    for (const tab of tabs) expect(pages).toContain(tab);
    expect(bar).not.toContain("/splash");
  });
});
