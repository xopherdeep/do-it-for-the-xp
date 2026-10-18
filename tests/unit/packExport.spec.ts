import { FAMILY_PACK } from "@/lib/services/core/packs/catalog";
import { parsePack, packToJson } from "@/lib/services/core/packs/packFormat";
import { buildOwnPack, hasOwnContent, newPackId, ownContent, packFileName, packSlug } from "@/lib/services/core/packs/packExport";
import { emptySnapshot } from "@/lib/services/core/packs/packService";
import type { PackSnapshot, PackStoreName } from "@/lib/services/core/packs/packService";

/** A Compendium with the family's own records in it beside the Family pack's */
const snapshotOf = (seed: Partial<Record<PackStoreName, object[]>>): PackSnapshot => {
  const snapshot = emptySnapshot();
  for (const [store, records] of Object.entries(seed) as [PackStoreName, { id: string }[]][]) {
    for (const record of records) snapshot[store].set(String(record.id), record);
  }
  return snapshot;
};

const packQuest = FAMILY_PACK.content.quests![0];
const packBeast = FAMILY_PACK.content.beasts![0];

const ownQuest = {
  id: "q-dishes",
  achievementName: "Wash the dishes",
  categoryId: "cat-kitchen",
  beastId: packBeast.id,
  assignee: ["hero-1", "hero-2"],
  createdBy: "hero-1",
  imageUrl: "blob:http://localhost/123",
  xp: 10,
};

const world = () =>
  snapshotOf({
    __achievements: [packQuest, ownQuest, { id: "q-draft", achievementName: "Half done", draft: true }],
    __achievementCategories: [{ id: "cat-kitchen", name: "Kitchen" }, { id: "cat-unused", name: "Garage" }],
    __beasts: [packBeast, { id: "b-unused", name: "Dust bunny" }],
    __abilities: [
      { id: "a-screen", name: "30 minutes of games", isPreset: false, lastUsed: "2026-10-01" },
      { id: "a-preset", name: "Heal", isPreset: true },
    ],
    __accessories: [
      {
        id: "r-movie",
        name: "Movie night",
        availableToMembers: ["hero-1"],
        purchaseHistory: [{ userId: "hero-1", purchaseDate: "2026-10-02", amount: 1 }],
        inventory: { total: 3, available: 1, reserved: 2 },
      },
    ],
    __dosDonts: [{ id: "d-thanks", type: "do", whatFor: "Saying thanks" }],
    __shops: [
      { id: "hometown-market", name: "Market", items: [{ itemId: "r-movie", type: 1 }, { itemId: "other", type: 1 }] },
      { id: "empty-shop", name: "Empty", items: [] },
    ],
  });

describe("ownContent", () => {
  const content = ownContent(world(), [FAMILY_PACK]);

  it("takes the family's own quests, never a pack's or a draft", () => {
    expect(content.quests?.map((quest) => quest.id)).toEqual(["q-dishes"]);
  });

  it("leaves out who in this home a quest is for, who made it, and a picture only this device has", () => {
    const [quest] = content.quests!;
    expect(quest.assignee).toEqual([]);
    expect(quest).not.toHaveProperty("createdBy");
    expect(quest).not.toHaveProperty("imageUrl");
    expect(quest.achievementName).toBe("Wash the dishes");
  });

  it("brings the beast and category the quests use, whoever made them, and nothing else", () => {
    expect(content.beasts?.map((beast) => beast.id)).toEqual([packBeast.id]);
    expect(content.categories).toEqual([{ id: "cat-kitchen", name: "Kitchen" }]);
  });

  it("takes own Powers without the presets or when they were cast", () => {
    expect(content.abilities).toEqual([{ id: "a-screen", name: "30 minutes of games", isPreset: false }]);
  });

  it("takes own rewards without who bought them, back on the shelves they sit on", () => {
    const [reward] = content.rewards!;
    expect(reward.availableToMembers).toEqual([]);
    expect(reward).not.toHaveProperty("purchaseHistory");
    expect(reward.inventory).toEqual({ total: 3, available: 3, reserved: 0 });
    expect(content.shopStock).toEqual({ "hometown-market": ["r-movie"] });
  });

  it("takes own house rules", () => {
    expect(content.dosDonts?.map((rule) => rule.id)).toEqual(["d-thanks"]);
  });

  it("is empty for a family that only loaded packs", () => {
    const onlyPack = ownContent(snapshotOf({ __achievements: [packQuest], __beasts: [packBeast] }), [FAMILY_PACK]);
    expect(hasOwnContent(onlyPack)).toBe(false);
    expect(hasOwnContent(content)).toBe(true);
  });
});

describe("buildOwnPack", () => {
  it("makes a pack that reads back as a pack file", () => {
    const pack = buildOwnPack(world(), [FAMILY_PACK], { name: "The Smiths' Chores", description: "" }, "the-smiths-chores-k3f9");
    expect(parsePack(packToJson(pack))).toEqual(pack);
    expect(pack.id).toBe("the-smiths-chores-k3f9");
    expect(pack.description).toBe("Quests and rewards from The Smiths' Chores.");
  });

  it("keeps the id it had, and takes in what was in its own earlier copy", () => {
    const earlier = buildOwnPack(world(), [FAMILY_PACK], { name: "Ours", description: "x" }, "ours-aaaa");
    const again = buildOwnPack(world(), [FAMILY_PACK, earlier], { name: "Ours", description: "x", id: "ours-aaaa" }, "ours-bbbb");
    expect(again.id).toBe("ours-aaaa");
    expect(again.content.quests?.map((quest) => quest.id)).toEqual(["q-dishes"]);
  });
});

describe("pack names", () => {
  it("slugs a name into an id", () => {
    expect(packSlug("The Smiths' Chores!")).toBe("the-smiths-chores");
    expect(packSlug("Café Crew")).toBe("cafe-crew");
    expect(packSlug("🧹🧹")).toBe("pack");
    expect(newPackId("Our Chores", "K3F9")).toBe("our-chores-k3f9");
    expect(packFileName({ id: "our-chores-k3f9" })).toBe("xp-pack-our-chores-k3f9.json");
  });
});
