import {
  heroWithoutQuest,
  mergeLinks,
  prerequisiteLinks,
  questLinks,
  shelfLinks,
  shopRoomLinks,
  SHELF_ITEM,
  SHELF_POWER,
  unlinkPrerequisite,
  unlinkQuest,
  unlinkShop,
  unstock,
  usageNote,
  type LinkedRoom,
  type LinkedTemple,
} from "@/lib/services/compendium/contentLinks";

const temple = (id: string, rooms: Record<string, LinkedRoom>, both = false): LinkedTemple =>
  both ? { id, dungeonLayout: { rooms }, rooms } : { id, dungeonLayout: { rooms } };

describe("questLinks / unlinkQuest", () => {
  const quests = [
    { id: "dishes", achievementName: "Dishes" },
    { id: "chain", achievementName: "Big clean", subAchievementIds: ["dishes", "laundry"] },
    { id: "other", achievementName: "Other", subAchievementIds: ["laundry"] },
  ];
  const beasts = [
    { id: "b1", name: "Socktopus", achievementIds: ["dishes"] },
    { id: "b2", name: "Grimer", achievementIds: ["laundry"] },
  ];
  const temples = [
    temple(
      "t1",
      {
        "0,0": { type: "monster", content: { questId: "dishes" } },
        "0,1": { type: "monster", content: { questIds: ["laundry", "dishes"] } },
        "0,2": { type: "monster", content: { questIds: ["dishes"], beasts: ["b1"] } },
        "0,3": { type: "empty" },
      },
      true
    ),
    temple("t2", { "1,1": { type: "monster", content: { questId: "laundry" } } }),
  ];

  it("lists the quests, beasts and rooms that name the quest, each room once", () => {
    const links = questLinks("dishes", { quests, beasts, temples });
    expect(links.quests).toEqual(["Big clean"]);
    expect(links.beasts).toEqual(["Socktopus"]);
    expect(links.rooms).toEqual([
      { templeId: "t1", roomKey: "0,0" },
      { templeId: "t1", roomKey: "0,1" },
      { templeId: "t1", roomKey: "0,2" },
    ]);
    expect(usageNote(links)).toBe("Used by 1 quest (Big clean), 1 beast (Socktopus) and 3 temple rooms");
  });

  it("finds nothing for an empty id or an unused quest", () => {
    expect(usageNote(questLinks("", { quests, beasts, temples }))).toBe("");
    expect(usageNote(questLinks("nobody", { quests, beasts, temples }))).toBe("");
  });

  it("hands back only the records that change, with the quest taken off and the inputs untouched", () => {
    const changed = unlinkQuest("dishes", { quests, beasts, temples });
    expect(changed.quests).toEqual([{ id: "chain", achievementName: "Big clean", subAchievementIds: ["laundry"] }]);
    expect(changed.beasts).toEqual([{ id: "b1", name: "Socktopus", achievementIds: [] }]);
    expect(changed.temples.map((t) => t.id)).toEqual(["t1"]);

    const rooms = changed.temples[0].dungeonLayout?.rooms ?? {};
    expect(rooms["0,0"].content).toEqual({});
    expect(rooms["0,1"].content).toEqual({ questIds: ["laundry"] });
    expect(rooms["0,2"].content).toEqual({ beasts: ["b1"] });
    expect(rooms["0,3"]).toBe(temples[0].dungeonLayout?.rooms?.["0,3"]);
    expect(changed.temples[0].rooms?.["0,0"].content).toEqual({});

    expect(quests[1].subAchievementIds).toEqual(["dishes", "laundry"]);
    expect(temples[0].dungeonLayout?.rooms?.["0,0"].content).toEqual({ questId: "dishes" });
  });
});

describe("heroWithoutQuest", () => {
  it("drops the quest's grudge and per-quest Power effects, keeping the rest", () => {
    const hero = {
      id: "h1",
      questGrudges: { dishes: { marks: 2 }, laundry: { marks: 1 } },
      questEffects: { snoozedOn: { dishes: "2026-10-18" }, extendedUntil: { laundry: "x" }, quietDay: "2026-10-18" },
    };
    expect(heroWithoutQuest("dishes", hero)).toEqual({
      questGrudges: { laundry: { marks: 1 } },
      questEffects: { snoozedOn: {}, extendedUntil: { laundry: "x" }, quietDay: "2026-10-18" },
    });
  });

  it("changes nothing for a hero who never met the quest", () => {
    expect(heroWithoutQuest("dishes", { id: "h1", questGrudges: { laundry: {} }, questEffects: {} })).toEqual({});
    expect(heroWithoutQuest("dishes", { id: "h2" })).toEqual({});
  });
});

describe("shop shelves", () => {
  const shops = [
    { id: "s1", name: "Market", items: [{ itemId: "x", type: SHELF_ITEM }, { itemId: "x", type: SHELF_POWER }] },
    { id: "s2", name: "Hut", items: [{ itemId: "y", type: SHELF_ITEM }] },
    { id: "s3", name: "Empty" },
  ];

  it("finds and unstocks an item without touching a Power that shares its id", () => {
    expect(shelfLinks("x", SHELF_ITEM, shops).shops).toEqual(["Market"]);
    expect(unstock("x", SHELF_ITEM, shops)).toEqual([{ id: "s1", name: "Market", items: [{ itemId: "x", type: SHELF_POWER }] }]);
    expect(unstock("z", SHELF_ITEM, shops)).toEqual([]);
  });
});

describe("Power prerequisites", () => {
  const powers = [
    { id: "a", name: "Fire" },
    { id: "b", name: "Fira", prerequisites: ["a"] },
    { id: "c", name: "Firaga", prerequisites: ["a", "b"] },
  ];

  it("lists and unlinks the Powers that need this one first", () => {
    expect(prerequisiteLinks("a", powers).powers).toEqual(["Fira", "Firaga"]);
    expect(unlinkPrerequisite("b", powers)).toEqual([{ id: "c", name: "Firaga", prerequisites: ["a"] }]);
  });

  it("merges the shelf and prerequisite links into one note", () => {
    const links = mergeLinks(shelfLinks("a", SHELF_POWER, [{ id: "s", name: "Market", items: [{ itemId: "a", type: SHELF_POWER }] }]), prerequisiteLinks("a", powers));
    expect(usageNote(links)).toBe("Used by 1 shop (Market) and 2 Powers (Fira, Firaga)");
  });
});

describe("shop rooms", () => {
  it("finds the temple rooms that open the shop and forgets the shop there", () => {
    const temples = [temple("t1", { "0,0": { type: "shop", content: { shopId: "s1", name: "Stall" } }, "0,1": { type: "shop", content: { shopId: "s2" } } })];
    expect(shopRoomLinks("s1", temples).rooms).toEqual([{ templeId: "t1", roomKey: "0,0" }]);
    const [changed] = unlinkShop("s1", temples);
    expect(changed.dungeonLayout?.rooms?.["0,0"].content).toEqual({ name: "Stall" });
    expect(changed.dungeonLayout?.rooms?.["0,1"].content).toEqual({ shopId: "s2" });
  });
});

describe("usageNote", () => {
  it("names at most four and counts the rest", () => {
    const links = mergeLinks({ quests: [], beasts: [], powers: [], rooms: [], shops: ["A", "B", "", "D", "E", "F"] });
    expect(usageNote(links)).toBe("Used by 6 shops (A, B, Unnamed shop, D, +2 more)");
  });
});
