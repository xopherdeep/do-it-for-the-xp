import {
  GEAR_STATS,
  addTags,
  adjustStat,
  blankItem,
  gearLine,
  itemFromRecord,
  itemSummary,
  itemToRecord,
  itemWizardSteps,
  parsePrice,
  removeTag,
} from "@/app/Admin/XpCompendium/views/XpAccessories/itemWizard";
import type { ItemDraft } from "@/app/Admin/XpCompendium/views/XpAccessories/itemWizard";
import { AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import { EconomyRoutes } from "@/router/Admin/economy.routes";
import {
  blockedBy,
  canJumpTo,
  canNext,
  firstIndex,
  isLast,
  isReady,
  lastIndex,
  nextIndex,
  previousIndex,
  progressOf,
  skippedAt,
} from "@/lib/services/wizard/wizardSteps";

/**
 * The Game Master's shop item wizard (board #1405): What is it? -> What does it cost? -> Who can buy it? -> Gear stats
 * (virtual only) -> Stock it. The steps, the draft and what the summary says are pure; the form only paints them.
 */

const steps = itemWizardSteps();
const ids = steps.map((step) => step.id);
const at = (id: string) => ids.indexOf(id);

const ready = (patch: Partial<ItemDraft> = {}): ItemDraft => ({ ...blankItem(), name: "Ice cream", basePrice: 25, ...patch });

describe("the steps", () => {
  it("asks What is it, What does it cost, Who can buy it, Gear stats and ends on the summary", () => {
    expect(ids).toEqual(["what", "cost", "who", "gear", "stock"]);
    expect(steps.map((step) => step.title)).toEqual(["What is it?", "What does it cost?", "Who can buy it?", "Gear stats", "Stock it"]);
  });

  it("gives every step a guide line in the Game Master's voice, and the summary last", () => {
    for (const step of steps) expect(step.guide.trim().length).toBeGreaterThan(8);
    expect(steps[steps.length - 1].id).toBe("stock");
  });
});

describe("validity", () => {
  it("wants a name, and says so in one line", () => {
    const what = steps[at("what")];
    expect(what.isValid(ready({ name: "" }))).toBe("Give it a name");
    expect(what.isValid(ready({ name: "   " }))).toBe("Give it a name");
    expect(what.isValid(ready())).toBe(true);
  });

  it("wants a price above zero, and says so", () => {
    const cost = steps[at("cost")];
    expect(cost.isValid(ready({ basePrice: 0 }))).toBe("Set a price");
    expect(cost.isValid(ready({ basePrice: -5 }))).toBe("Set a price");
    expect(cost.isValid(ready({ basePrice: Number.NaN }))).toBe("Set a price");
    expect(cost.isValid(ready({ basePrice: 1 }))).toBe(true);
  });

  it("lets every hero buy it by default, so Who never blocks", () => {
    const who = steps[at("who")];
    expect(who.isValid(ready())).toBe(true);
    expect(who.isValid(ready({ availableToMembers: ["hero-1"] }))).toBe(true);
  });

  it("is ready only when the name and the price are both there", () => {
    expect(isReady(steps, ready())).toBe(true);
    expect(isReady(steps, ready({ name: "" }))).toBe(false);
    expect(isReady(steps, ready({ basePrice: 0 }))).toBe(false);
  });

  it("names the first thing missing on the last step, whichever step owns it", () => {
    const last = at("stock");
    expect(blockedBy(steps, ready({ name: "", basePrice: 0 }), last)).toBe("Give it a name");
    expect(blockedBy(steps, ready({ basePrice: 0 }), last)).toBe("Set a price");
    expect(blockedBy(steps, ready(), last)).toBe("");
  });
});

describe("Gear stats are for virtual items only", () => {
  const real = ready({ type: AccessoryType.RealLife });
  const virtual = ready({ type: AccessoryType.Virtual });

  it("skips Gear stats for a Real Life item and asks it for a Virtual one", () => {
    expect(skippedAt(steps, real, at("gear"))).toBe(true);
    expect(skippedAt(steps, virtual, at("gear"))).toBe(false);
    expect(skippedAt(steps, real, at("what"))).toBe(false);
  });

  it("counts the steps that are really asked: four for Real Life, five for Virtual", () => {
    expect(progressOf(steps, real, at("stock"))).toEqual({ n: 4, total: 4 });
    expect(progressOf(steps, virtual, at("stock"))).toEqual({ n: 5, total: 5 });
  });

  it("walks Who straight to the summary for a Real Life item, through Gear for a Virtual one", () => {
    expect(nextIndex(steps, real, at("who"))).toBe(at("stock"));
    expect(nextIndex(steps, virtual, at("who"))).toBe(at("gear"));
    expect(previousIndex(steps, real, at("stock"))).toBe(at("who"));
  });

  it("opens a new item on step one and an edit on the summary", () => {
    expect(firstIndex(steps, virtual)).toBe(at("what"));
    expect(lastIndex(steps, virtual)).toBe(at("stock"));
    expect(lastIndex(steps, real)).toBe(at("stock"));
    expect(isLast(steps, real, at("stock"))).toBe(true);
  });

  it("lets an edit's dots go back to any step once the item is valid, and never to a skipped step", () => {
    expect(canJumpTo(steps, virtual, at("what"))).toBe(true);
    expect(canJumpTo(steps, virtual, at("gear"))).toBe(true);
    expect(canJumpTo(steps, real, at("gear"))).toBe(false);
  });

  it("holds Next shut on the cost step until a price is set", () => {
    expect(canNext(steps, ready({ basePrice: 0 }), at("cost"))).toBe(false);
    expect(canNext(steps, ready({ basePrice: 10 }), at("cost"))).toBe(true);
  });
});

describe("a new item", () => {
  it("starts with the safe defaults, and never with [''] in the heroes list", () => {
    const item = blankItem();
    expect(item.name).toBe("");
    expect(item.basePrice).toBe(0);
    expect(item.availableToMembers).toEqual([]);
    expect(item.type).toBe(AccessoryType.Virtual);
    expect(item.rarity).toBe(Rarity.Common);
    expect(item.isLayaway).toBe(false);
    expect(item.requiresApproval).toBe(false);
    expect(item.tags).toEqual([]);
    expect(item.id).toBeUndefined();
    for (const stat of GEAR_STATS) expect(item.bonusStats[stat.key]).toBe(0);
  });

  it("gives each draft its own arrays, so one wizard never edits another's", () => {
    const a = blankItem();
    const b = blankItem();
    a.tags.push("book");
    a.availableToMembers.push("hero-1");
    expect(b.tags).toEqual([]);
    expect(b.availableToMembers).toEqual([]);
  });
});

describe("opening a saved item (the edit that used to open empty)", () => {
  const saved: Accessory = {
    id: "item-1",
    name: "Lego Set",
    description: "A big one",
    basePrice: "60" as unknown as number,
    url: "https://example.com/lego",
    imageUrl: "https://example.com/lego.png",
    rarity: Rarity.Epic,
    rewardCount: 3,
    isLayaway: true,
    type: AccessoryType.RealLife,
    availableToMembers: [""],
    requiresApproval: true,
    tags: ["toy"],
    inventory: { total: 4, available: 3, reserved: 1 },
    expiryDate: "2026-12-31",
    icon: "gift",
    purchaseHistory: [{ userId: "hero-1", purchaseDate: "2026-10-01", amount: 1 }],
  };

  it("fills the draft from the saved record, keeping its id", () => {
    const draft = itemFromRecord(saved);
    expect(draft.id).toBe("item-1");
    expect(draft.name).toBe("Lego Set");
    expect(draft.description).toBe("A big one");
    expect(draft.url).toBe("https://example.com/lego");
    expect(draft.imageUrl).toBe("https://example.com/lego.png");
    expect(draft.rarity).toBe(Rarity.Epic);
    expect(draft.isLayaway).toBe(true);
    expect(draft.requiresApproval).toBe(true);
    expect(draft.tags).toEqual(["toy"]);
    expect(draft.type).toBe(AccessoryType.RealLife);
  });

  it("reads a price typed into the old text box as a number", () => {
    expect(itemFromRecord(saved).basePrice).toBe(60);
  });

  it("turns the old [''] default into 'every hero' and drops blanks and repeats", () => {
    expect(itemFromRecord(saved).availableToMembers).toEqual([]);
    expect(itemFromRecord({ ...saved, availableToMembers: ["", "hero-2", "hero-2", 7 as unknown as string] }).availableToMembers).toEqual([
      "hero-2",
      "7",
    ]);
  });

  it("reads an old record that lacks fields without throwing", () => {
    const draft = itemFromRecord({ id: "old", name: "Sock" } as Accessory);
    expect(draft.tags).toEqual([]);
    expect(draft.availableToMembers).toEqual([]);
    expect(draft.rarity).toBe(Rarity.Common);
    expect(draft.type).toBe(AccessoryType.Virtual);
    for (const stat of GEAR_STATS) expect(draft.bonusStats[stat.key]).toBe(0);
  });

  it("reads the type however the list wrote it", () => {
    expect(itemFromRecord({ ...saved, type: "Real" as AccessoryType }).type).toBe(AccessoryType.RealLife);
    expect(itemFromRecord({ ...saved, type: "virtual" as AccessoryType }).type).toBe(AccessoryType.Virtual);
    expect(itemFromRecord({ ...saved, type: undefined as unknown as AccessoryType }).type).toBe(AccessoryType.Virtual);
  });

  it("falls back to Common for a rarity that is not one", () => {
    expect(itemFromRecord({ ...saved, rarity: 99 as Rarity }).rarity).toBe(Rarity.Common);
    expect(itemFromRecord({ ...saved, rarity: undefined as unknown as Rarity }).rarity).toBe(Rarity.Common);
  });

  it("is a copy: changing the draft never changes the saved record", () => {
    const draft = itemFromRecord(saved);
    draft.tags.push("new");
    expect(saved.tags).toEqual(["toy"]);
  });
});

describe("saving", () => {
  const original: Accessory = {
    id: "item-1",
    name: "Old name",
    description: "",
    basePrice: 10,
    url: "",
    rarity: Rarity.Common,
    rewardCount: 3,
    isLayaway: false,
    type: AccessoryType.Virtual,
    availableToMembers: [],
    requiresApproval: false,
    tags: [],
    inventory: { total: 4, available: 3, reserved: 1 },
    expiryDate: "2026-12-31",
    icon: "flask",
    equippableBy: [],
    purchaseHistory: [{ userId: "hero-1", purchaseDate: "2026-10-01", amount: 1 }],
  };

  it("keeps the id, so an edit saves over the item and never beside it", () => {
    const record = itemToRecord(itemFromRecord(original), original);
    expect(record.id).toBe("item-1");
  });

  it("leaves the id out for a new item, so the database gives it one", () => {
    const record = itemToRecord(ready());
    expect(record.id).toBeUndefined();
  });

  it("keeps what the wizard does not ask: stock, history, icon and reward count", () => {
    const draft = itemFromRecord(original);
    draft.name = "New name";
    const record = itemToRecord(draft, original);
    expect(record.name).toBe("New name");
    expect(record.inventory).toEqual({ total: 4, available: 3, reserved: 1 });
    expect(record.expiryDate).toBe("2026-12-31");
    expect(record.icon).toBe("flask");
    expect(record.rewardCount).toBe(3);
    expect(record.purchaseHistory).toHaveLength(1);
  });

  it("trims the text and writes the price as a whole number", () => {
    const record = itemToRecord(ready({ name: "  Pizza night  ", description: " Friday ", url: " https://x.test ", basePrice: 25.9 }));
    expect(record.name).toBe("Pizza night");
    expect(record.description).toBe("Friday");
    expect(record.url).toBe("https://x.test");
    expect(record.basePrice).toBe(25);
  });

  it("never writes a blank hero into who can buy it", () => {
    expect(itemToRecord(ready({ availableToMembers: ["", "hero-1", ""] })).availableToMembers).toEqual(["hero-1"]);
    expect(itemToRecord(ready()).availableToMembers).toEqual([]);
  });

  it("writes only the bonus a Virtual item has, and none for a Real Life item", () => {
    const stats = { hp: 5, mp: 0, attack: 2, defense: 0, speed: 0 };
    expect(itemToRecord(ready({ type: AccessoryType.Virtual, bonusStats: stats })).bonusStats).toEqual({ hp: 5, attack: 2 });
    expect(itemToRecord(ready({ type: AccessoryType.RealLife, bonusStats: stats })).bonusStats).toEqual({});
  });

  it("fills the fields the database requires when it has no original", () => {
    const record = itemToRecord(ready());
    expect(record.rewardCount).toBe(0);
    expect(record.isLayaway).toBe(false);
    expect(record.requiresApproval).toBe(false);
  });
});

describe("parsePrice", () => {
  it("reads a typed price as whole gold, never negative and never NaN", () => {
    expect(parsePrice("25")).toBe(25);
    expect(parsePrice(" 40 ")).toBe(40);
    expect(parsePrice(25.9)).toBe(25);
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("abc")).toBe(0);
    expect(parsePrice(-3)).toBe(0);
    expect(parsePrice(Number.NaN)).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
  });
});

describe("tags", () => {
  it("adds the tags typed with commas, trimmed and without blanks or repeats", () => {
    expect(addTags([], "clothing, book,, digital ")).toEqual(["clothing", "book", "digital"]);
    expect(addTags(["book"], "Book, toy")).toEqual(["book", "toy"]);
  });

  it("leaves the tags as they were when nothing was typed", () => {
    expect(addTags(["book"], "  ")).toEqual(["book"]);
    expect(addTags(["book"], " , ,")).toEqual(["book"]);
  });

  it("removes one tag", () => {
    expect(removeTag(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(removeTag(["a"], "z")).toEqual(["a"]);
  });
});

describe("gear stats", () => {
  it("steps a stat up or down and keeps it in range", () => {
    expect(adjustStat(0, 1)).toBe(1);
    expect(adjustStat(5, -10)).toBe(-5);
    expect(adjustStat(998, 5)).toBe(999);
    expect(adjustStat(-998, -5)).toBe(-999);
  });

  it("says the bonus in a line, or says there is none", () => {
    expect(gearLine({ hp: 5, mp: 0, attack: 2, defense: 0, speed: 0 })).toBe("+5 HP, +2 Attack");
    expect(gearLine({ hp: 0, mp: 0, attack: 0, defense: -1, speed: 3 })).toBe("-1 Defense, +3 Speed");
    expect(gearLine({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0 })).toBe("No bonus");
  });
});

describe("the summary", () => {
  const nameOf = (id: string) => ({ "hero-1": "Ava", "hero-2": "Ben" }[id] ?? "A hero");

  it("lists what it is, what it costs, who can buy it and the gear of a Virtual item", () => {
    const rows = itemSummary(
      ready({ type: AccessoryType.Virtual, rarity: Rarity.Rare, bonusStats: { hp: 5, mp: 0, attack: 0, defense: 0, speed: 0 } }),
      nameOf
    );
    expect(rows.map((row) => row.step)).toEqual(["what", "cost", "who", "gear"]);
    expect(rows[0].value).toBe("Virtual, Rare");
    expect(rows[1].value).toBe("25 GP");
    expect(rows[2].value).toBe("Every hero");
    expect(rows[3].value).toBe("+5 HP");
  });

  it("leaves the Gear row out for a Real Life item", () => {
    const rows = itemSummary(ready({ type: AccessoryType.RealLife }), nameOf);
    expect(rows.map((row) => row.step)).toEqual(["what", "cost", "who"]);
    expect(rows[0].value).toBe("Real Life, Common");
  });

  it("says layaway and approval beside the price, and names the heroes who can buy it", () => {
    const rows = itemSummary(
      ready({ type: AccessoryType.RealLife, isLayaway: true, requiresApproval: true, availableToMembers: ["hero-1", "hero-2"] }),
      nameOf
    );
    expect(rows[1].value).toBe("25 GP, layaway, you approve it");
    expect(rows[2].value).toBe("Ava, Ben");
  });

  it("shows a missing name and price as a gap to fill, not as a blank", () => {
    const rows = itemSummary(blankItem(), nameOf);
    expect(rows[1].value).toBe("No price yet");
  });
});

describe("the route", () => {
  it("passes the id to the form, so editing opens the item and not an empty page", () => {
    const route = EconomyRoutes.find((candidate) => candidate.name === "xp-create-update-accessory");
    expect(route).toBeDefined();
    expect(route?.path).toBe("economy/create-update/:id?");
    expect(route?.props).toBe(true);
  });
});
