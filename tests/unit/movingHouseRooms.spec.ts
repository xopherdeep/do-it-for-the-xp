/**
 * The cells of the Old House: which rooms the home has, what each is called, which floor it is on, what it hangs off
 * and which of the pack's quests it holds. Pure; the next step places these cells on a grid.
 */
import { DEFAULT_MOVING_ROOMS, buildMovingPack } from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingHero, MovingRoomId } from "@/lib/services/core/packs/movingPack";
import { houseCellsFor } from "@/lib/services/core/packs/movingTemple/houseRooms";
import type { HouseCell } from "@/lib/services/core/packs/movingTemple/houseRooms";

jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, abilitiesStorage: { sentinel: "abilities" } }));
jest.mock("@/lib/databases/AccessoriesDb", () => ({
  __esModule: true,
  accessoriesStorage: { sentinel: "accessories" },
  AccessoryType: { RealLife: "real", Virtual: "virtual" },
  Rarity: { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 },
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: { sentinel: "achievements" },
  achievementCategoryStorage: { sentinel: "achievementCategories" },
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({ __esModule: true, beastStorage: { sentinel: "beasts" } }));
jest.mock("@/lib/databases/ChatDb", () => ({ __esModule: true, chatStorage: { sentinel: "chat" } }));
jest.mock("@/lib/databases/DosDontsDb", () => ({ __esModule: true, dosDontsStorage: { sentinel: "dosDonts" } }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: { sentinel: "profiles" } }));
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ __esModule: true, purchaseLogStorage: { sentinel: "purchaseLog" } }));
jest.mock("@/lib/databases/QuestLogDb", () => ({ __esModule: true, questLogStorage: { sentinel: "questLog" } }));
jest.mock("@/lib/databases/ShopsDb", () => ({
  __esModule: true,
  shopStorage: { sentinel: "shops" },
  ShopItemType: { Ability: 0, Accessory: 1 },
}));
jest.mock("@/lib/databases/TempleDb", () => ({ __esModule: true, templeStorage: { sentinel: "temples" } }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({ __esModule: true, templeProgressStorage: { sentinel: "templeProgress" } }));
jest.mock("@/lib/services/core/StorageService", () => ({ __esModule: true, default: { saveProfiles: jest.fn() } }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canManageFamily: () => true, RESTORE_GM_ONLY_MESSAGE: "GM only" }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ loadUsers: jest.fn() }) }));

const PARENT: MovingHero = { id: "dad", name: "Dad", band: "grownup" };
const TWELVE: MovingHero = { id: "twelve", name: "Twelve", band: "kid" };
const SIX: MovingHero = { id: "six", name: "Six", band: "little" };

const answers = (extra: Partial<MovingAnswers> = {}): MovingAnswers => ({
  moveDate: "2026-11-20",
  today: "2026-10-01",
  rooms: { ...DEFAULT_MOVING_ROOMS },
  heroes: [PARENT, TWELVE, SIX],
  ...extra,
});

const roomsWithout = (...gone: MovingRoomId[]): Partial<Record<MovingRoomId, number>> => {
  const rooms = { ...DEFAULT_MOVING_ROOMS };
  for (const room of gone) delete rooms[room];
  return rooms;
};

/** The pack and the house cells for a family, the way the setup builds them */
const houseFor = (extra: Partial<MovingAnswers> = {}) => {
  const given = answers(extra);
  const pack = buildMovingPack(given);
  return { pack, cells: houseCellsFor(pack, given)! };
};

const cellOf = (cells: HouseCell[], id: string): HouseCell => {
  const found = cells.find((cell) => cell.id === id);
  if (!found) throw new Error(`no cell ${id}`);
  return found;
};
const idsOf = (cells: HouseCell[]): string[] => cells.map((cell) => cell.id);

/** Setups that shape the house differently: floors, basement, ticked rooms, who plays */
const EVERYTHING: Partial<Record<MovingRoomId, number>> = {
  bedroom: 8, bathroom: 5, kitchen: 1, living: 1, dining: 1, laundry: 1, storage: 1, garage: 1, yard: 1, guest: 4, office: 1, pets: 1,
};
const SETUPS: [string, Partial<MovingAnswers>][] = [
  ["the default home", {}],
  ["two floors", { floors: 2 }],
  ["two floors and a basement", { floors: 2, basement: true }],
  ["a basement under a one-floor house", { basement: true }],
  ["two floors and no bedrooms", { floors: 2, rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 0 } }],
  ["no kitchen", { rooms: roomsWithout("kitchen") }],
  ["no kitchen and no garage", { floors: 2, rooms: roomsWithout("kitchen", "garage") }],
  ["no kitchen, garage or yard, with a basement", { basement: true, rooms: roomsWithout("kitchen", "garage", "yard") }],
  ["nothing ticked", { rooms: {} }],
  ["only the little one", { heroes: [SIX] }],
  ["only grown-ups", { floors: 2, heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }] }],
  ["a sitting-out hero", { heroes: [PARENT, { id: "baby", name: "Baby", band: "out" }, TWELVE] }],
  ["every room, two floors, a basement, six heroes", {
    floors: 2,
    basement: true,
    rooms: EVERYTHING,
    heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }, TWELVE, SIX, { id: "teen", name: "Teen", band: "kid" }, { id: "tot", name: "Tot", band: "little" }],
  }],
];

describe("houseCellsFor the default home on one floor", () => {
  const { cells } = houseFor();

  it("has the rooms the family ticked, every one on the ground floor", () => {
    expect(idsOf(cells)).toEqual(expect.arrayContaining([
      "porch", "van", "lastLook", "master", "camp", "hall", "living", "dining", "pantry", "kitchen", "drawer",
      "garage", "laundry", "yard", "bath", "storage", "bedroom-main", "bedroom-1", "bedroom-2",
    ]));
    expect(new Set(cells.map((cell) => cell.floor))).toEqual(new Set(["1F"]));
  });

  it("lists the cells in the order they are placed, the parent always before its children", () => {
    const ids = idsOf(cells);
    expect(ids.slice(0, 6)).toEqual(["porch", "van", "lastLook", "master", "camp", "hall"]);
    for (const cell of cells) {
      for (const parent of cell.parents) expect(ids.indexOf(parent)).toBeLessThan(ids.indexOf(cell.id));
    }
  });

  it("gives the kitchen its first quest and the pantry the rest, and hangs the junk drawer off the kitchen", () => {
    expect(cellOf(cells, "kitchen")).toMatchObject({ kind: "guard", name: "Kitchen", questIds: ["move-dishes"] });
    expect(cellOf(cells, "pantry").questIds).toEqual(["move-pantry-fridge", "move-mugs", "move-daily-dishes"]);
    expect(cellOf(cells, "drawer")).toMatchObject({ kind: "masterKey", zone: "drawer", parents: ["kitchen"] });
  });

  it("puts what the hall carries in the front hall: the whole-house jobs and the quests of rooms the home lacks", () => {
    expect(cellOf(cells, "hall").questIds).toEqual([
      "move-open-first", "move-donation-run", "move-light-boxes-twelve", "move-pillow-parade-six", "move-paperwork",
    ]);
  });

  it("keeps the driveway chain and the frame cells where the plan says", () => {
    expect(cellOf(cells, "porch")).toMatchObject({ kind: "entrance", name: "Front porch", at: [8, 4], zone: "house" });
    expect(cellOf(cells, "van")).toMatchObject({ kind: "boss", name: "The moving van", at: [8, 3], zone: "driveway", parents: ["porch"], questIds: ["move-load-van"] });
    expect(cellOf(cells, "lastLook")).toMatchObject({ at: [8, 2], zone: "driveway", parents: ["van"], questIds: ["move-walkthrough", "move-deep-clean"] });
    expect(cellOf(cells, "master")).toMatchObject({ kind: "master", name: "Keys to the New House", at: [8, 1], zone: "driveway", parents: ["lastLook"], questIds: [] });
    expect(cellOf(cells, "camp")).toMatchObject({ kind: "camp", name: "Sleeping bags", at: [8, 5], parents: ["porch"] });
    expect(cellOf(cells, "hall")).toMatchObject({ kind: "quest", name: "Front hall", at: [7, 4], parents: ["porch"] });
  });

  it("makes the garage the small-key room, so the small key lies under the couch and storage hangs off the hall", () => {
    expect(cellOf(cells, "garage")).toMatchObject({ kind: "quest", zone: "wing", lockedFromParent: true, parents: ["pantry", "hall"] });
    expect(cellOf(cells, "couch")).toMatchObject({ kind: "key", name: "Under the couch cushions", zone: "house" });
    expect(cellOf(cells, "storage").parents).toEqual(["hall"]);
  });

  it("deals each child a bedroom of their own, with their own chores in order", () => {
    expect(cellOf(cells, "bedroom-main")).toMatchObject({ name: "Dad's bedroom", questIds: ["move-closet-grownup-dad", "move-beds-apart"] });
    expect(cellOf(cells, "bedroom-1")).toMatchObject({
      name: "Twelve's bedroom",
      questIds: [
        "move-keep-donate-trash-twelve", "move-books-kid-twelve", "move-dresser-kid-twelve",
        "move-backpack-kid-twelve", "move-clear-old-room-twelve",
      ],
    });
    expect(cellOf(cells, "bedroom-2")).toMatchObject({
      name: "Six's bedroom",
      questIds: [
        "move-toy-triage-six", "move-books-little-six", "move-toys-little-six",
        "move-backpack-little-six", "move-dust-bunny-hunt-six",
      ],
    });
  });

  it("builds a floor plan with no landing, upstairs hall, heal room or stairs", () => {
    for (const id of ["stairsUp", "landing", "upHall", "heal", "basementStairs", "b1Landing", "forgotten"]) {
      expect(idsOf(cells)).not.toContain(id);
    }
    expect(cellOf(cells, "bedroom-1").parents).toEqual(["hall"]);
  });

  it("is the same for the same answers, whatever the move date", () => {
    const later = houseCellsFor(buildMovingPack(answers({ moveDate: "2027-03-02" })), answers({ moveDate: "2027-03-02" }));
    expect(later).toEqual(cells);
  });
});

describe("houseCellsFor with two floors", () => {
  const { cells } = houseFor({ floors: 2 });

  it("takes the bedrooms upstairs, behind a landing and an upstairs hall", () => {
    for (const id of ["bedroom-main", "bedroom-1", "bedroom-2", "upHall", "landing", "heal"]) {
      expect(cellOf(cells, id).floor).toBe("2F");
    }
    expect(cellOf(cells, "stairsUp")).toMatchObject({ kind: "stairsUp", floor: "1F", parents: ["hall"] });
    expect(cellOf(cells, "landing")).toMatchObject({ kind: "stairsDown", twinOf: "stairsUp", parents: [], zone: "house" });
    expect(cellOf(cells, "upHall")).toMatchObject({ kind: "save", parents: ["landing"] });
    expect(cellOf(cells, "bedroom-1").parents).toEqual(["upHall", "landing"]);
  });

  it("names the heal room for how many bathrooms the home has", () => {
    expect(cellOf(cells, "heal")).toMatchObject({ kind: "heal", name: "Medicine cabinet" });
    const one = houseFor({ floors: 2, rooms: { ...DEFAULT_MOVING_ROOMS, bathroom: 1 } }).cells;
    expect(cellOf(one, "heal").name).toBe("Linen closet");
  });

  it("keeps the living rooms and the kitchen on the ground floor", () => {
    for (const id of ["porch", "hall", "living", "dining", "kitchen", "pantry", "laundry", "garage", "yard", "bath", "storage"]) {
      expect(cellOf(cells, id).floor).toBe("1F");
    }
  });

  it("puts the guest room and the office upstairs when the home has them", () => {
    const { cells: big } = houseFor({ floors: 2, rooms: { ...DEFAULT_MOVING_ROOMS, guest: 1, office: 1 } });
    expect(cellOf(big, "guest")).toMatchObject({ floor: "2F", name: "Guest room", parents: ["upHall"], questIds: ["move-guest-room"] });
    expect(cellOf(big, "office")).toMatchObject({ floor: "2F", name: "Home office", parents: ["upHall"], questIds: ["move-office", "move-paperwork"] });
    expect(cellOf(big, "hall").questIds).not.toContain("move-paperwork");
  });

  it("builds the bedrooms on the ground floor of a one-floor house, off the hall", () => {
    const { cells: flat } = houseFor({ rooms: { ...DEFAULT_MOVING_ROOMS, guest: 1, office: 1 } });
    for (const id of ["bedroom-main", "bedroom-1", "guest", "office"]) {
      expect(cellOf(flat, id)).toMatchObject({ floor: "1F", parents: ["hall"] });
    }
  });

  it("builds one floor when nothing goes upstairs", () => {
    const { cells: flat } = houseFor({ floors: 2, rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 0 } });
    expect(new Set(flat.map((cell) => cell.floor))).toEqual(new Set(["1F"]));
    for (const id of ["stairsUp", "landing", "upHall", "heal"]) expect(idsOf(flat)).not.toContain(id);
  });
});

describe("houseCellsFor with a basement", () => {
  const { cells } = houseFor({ floors: 2, basement: true });

  it("makes the basement stairs the small-key room and puts storage down below", () => {
    expect(cellOf(cells, "basementStairs")).toMatchObject({
      kind: "stairsDown", floor: "1F", zone: "wing", lockedFromParent: true, parents: ["hall"],
    });
    expect(cellOf(cells, "b1Landing")).toMatchObject({ kind: "stairsUp", floor: "B1", twinOf: "basementStairs", parents: [] });
    expect(cellOf(cells, "storage")).toMatchObject({ floor: "B1", name: "Storage", parents: ["b1Landing"], questIds: ["move-storage"] });
    expect(cellOf(cells, "forgotten")).toMatchObject({ kind: "loot", floor: "B1", name: "Forgotten box", parents: ["b1Landing", "storage"] });
  });

  it("hides the small key under the couch and leaves the garage an ordinary room", () => {
    expect(idsOf(cells)).toContain("couch");
    expect(cellOf(cells, "garage")).toMatchObject({ zone: "house" });
    expect(cellOf(cells, "garage").lockedFromParent).toBeUndefined();
  });

  it("is a basement only while storage is ticked", () => {
    const { cells: none } = houseFor({ basement: true, rooms: roomsWithout("storage") });
    expect(idsOf(none)).not.toContain("basementStairs");
    expect(none.some((cell) => cell.floor === "B1")).toBe(false);
  });

  it("is a basement even under a house of one floor", () => {
    const { cells: flat } = houseFor({ basement: true });
    expect(cellOf(flat, "basementStairs").floor).toBe("1F");
    expect(cellOf(flat, "bedroom-1").floor).toBe("1F");
    expect(cellOf(flat, "storage").floor).toBe("B1");
  });
});

describe("houseCellsFor guards the key", () => {
  it("falls back to the garage, with the rest of its chores at the workbench, when there is no kitchen", () => {
    const { cells } = houseFor({ rooms: roomsWithout("kitchen") });
    expect(cellOf(cells, "garage")).toMatchObject({ kind: "guard", zone: "house", questIds: ["move-garage"] });
    expect(cellOf(cells, "workbench")).toMatchObject({ kind: "quest", name: "Workbench", parents: ["garage"], questIds: ["move-garage-gear"] });
    expect(cellOf(cells, "drawer").parents).toEqual(["garage"]);
    expect(idsOf(cells)).not.toContain("kitchen");
    expect(idsOf(cells)).not.toContain("pantry");
    // the daily dishes follow the missing kitchen to the front hall
    expect(cellOf(cells, "hall").questIds).toContain("move-daily-dishes");
  });

  it("falls back to a packing pile off the hall, holding the open-first box, with no kitchen or garage", () => {
    const { cells } = houseFor({ rooms: roomsWithout("kitchen", "garage") });
    expect(cellOf(cells, "packingPile")).toMatchObject({ kind: "guard", name: "Packing pile", parents: ["hall"], questIds: ["move-open-first"] });
    expect(cellOf(cells, "drawer").parents).toEqual(["packingPile"]);
    expect(cellOf(cells, "hall").questIds).not.toContain("move-open-first");
    expect(idsOf(cells)).not.toContain("workbench");
  });

  it("seals only the guard and the van, and each holds one quest", () => {
    for (const [, extra] of SETUPS) {
      const given = answers(extra);
      const cells = houseCellsFor(buildMovingPack(given), given);
      if (!cells) continue;
      const sealed = cells.filter((cell) => cell.kind === "guard" || cell.kind === "boss");
      expect(sealed.filter((cell) => cell.kind === "guard")).toHaveLength(1);
      expect(sealed.filter((cell) => cell.kind === "boss")).toHaveLength(1);
      for (const cell of sealed) expect(cell.questIds).toHaveLength(1);
      for (const cell of cells.filter((candidate) => candidate.kind === "quest")) expect(cell.questIds.length).toBeGreaterThan(0);
    }
  });

  it("puts a kitchen of only the daily dishes in the kitchen, with no pantry, when only the little one plays", () => {
    const { cells } = houseFor({ heroes: [SIX] });
    expect(cellOf(cells, "kitchen").questIds).toEqual(["move-daily-dishes"]);
    expect(idsOf(cells)).not.toContain("pantry");
  });
});

describe("houseCellsFor small-key wing", () => {
  it("takes the yard when the garage guards the key and there is no basement", () => {
    const { cells } = houseFor({ rooms: roomsWithout("kitchen") });
    expect(cellOf(cells, "yard")).toMatchObject({ zone: "wing", lockedFromParent: true });
    expect(idsOf(cells)).toContain("couch");
    // storage may hang off the garage when the garage is not the wing
    expect(cellOf(cells, "storage").parents).toEqual(["garage", "hall"]);
  });

  it("has no wing, and no couch key, when no room can be one", () => {
    const { cells } = houseFor({ rooms: roomsWithout("kitchen", "garage", "yard") });
    expect(idsOf(cells)).not.toContain("couch");
    expect(cells.some((cell) => cell.zone === "wing" || cell.lockedFromParent)).toBe(false);
  });
});

describe("houseCellsFor names", () => {
  it("names one grown-up's room for them and two grown-ups' room the main bedroom", () => {
    expect(cellOf(houseFor().cells, "bedroom-main").name).toBe("Dad's bedroom");
    const two = houseFor({ heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }, TWELVE] }).cells;
    expect(cellOf(two, "bedroom-main")).toMatchObject({
      name: "Main bedroom",
      questIds: ["move-closet-grownup-dad", "move-closet-grownup-mom", "move-beds-apart"],
    });
  });

  it("names a shared room for the kids in it", () => {
    const { cells } = houseFor({ rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 2 } });
    expect(cellOf(cells, "bedroom-1").name).toBe("Twelve and Six's room");
    expect(idsOf(cells)).not.toContain("bedroom-2");
    const three = houseFor({
      rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 2 },
      heroes: [PARENT, TWELVE, SIX, { id: "teen", name: "Teen", band: "kid" }],
    }).cells;
    expect(cellOf(three, "bedroom-1").name).toBe("Twelve, Six and Teen's room");
  });

  it("deals the kids round robin, in the order they were listed", () => {
    const heroes: MovingHero[] = [PARENT, TWELVE, SIX, { id: "teen", name: "Teen", band: "kid" }];
    const { cells } = houseFor({ rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 3 }, heroes });
    expect(cellOf(cells, "bedroom-1").name).toBe("Twelve and Teen's room");
    expect(cellOf(cells, "bedroom-2").name).toBe("Six's bedroom");
  });

  it("gives every kid a room when no grown-up plays", () => {
    const { cells } = houseFor({ heroes: [TWELVE, SIX], rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 2 } });
    expect(idsOf(cells)).not.toContain("bedroom-main");
    expect(cellOf(cells, "bedroom-1").name).toBe("Twelve's bedroom");
    expect(cellOf(cells, "bedroom-2").name).toBe("Six's bedroom");
  });

  it("calls a hero with no name Hero", () => {
    const { cells } = houseFor({ heroes: [{ id: "x", name: "", band: "grownup" }, TWELVE] });
    expect(cellOf(cells, "bedroom-main").name).toBe("Hero's bedroom");
  });

  it("leaves the bedroom quests to the front hall when no bedroom is ticked", () => {
    const { cells } = houseFor({ rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 0 } });
    expect(idsOf(cells).filter((id) => id.startsWith("bedroom"))).toEqual([]);
    expect(cellOf(cells, "hall").questIds).toEqual(expect.arrayContaining([
      "move-keep-donate-trash-twelve", "move-books-kid-twelve", "move-backpack-kid-twelve",
      "move-toy-triage-six", "move-dust-bunny-hunt-six",
    ]));
  });
});

describe("houseCellsFor holds every old-house chore once", () => {
  it.each(SETUPS)("%s", (_label, extra) => {
    const given = answers(extra);
    const pack = buildMovingPack(given);
    const cells = houseCellsFor(pack, given)!;
    const held = cells.flatMap((cell) => cell.questIds);
    const expected = pack.quests.filter((quest) => quest.categoryId !== "cat-move-unpack").map((quest) => String(quest.id));
    expect([...held].sort()).toEqual([...expected].sort());
    expect(new Set(held).size).toBe(held.length);

    // cells are unique, hang off cells that exist, and never off a later one
    const ids = idsOf(cells);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cell of cells) {
      for (const parent of cell.parents) expect(ids.indexOf(parent)).toBeGreaterThanOrEqual(0);
      if (cell.twinOf) expect(ids).toContain(cell.twinOf);
    }
    // the floors are the ones the house has
    const floors = new Set(cells.map((cell) => cell.floor));
    for (const floor of floors) expect(["B1", "1F", "2F"]).toContain(floor);
    expect(floors.has("1F")).toBe(true);
    // a sitting-out hero holds nothing
    for (const id of held) expect(id).not.toMatch(/-baby$/);
  });
});

describe("houseCellsFor when there is no house to build", () => {
  it("is null when nobody plays", () => {
    const given = answers({ heroes: [] });
    expect(houseCellsFor(buildMovingPack(given), given)).toBeNull();
    const sitting = answers({ heroes: [{ id: "baby", name: "Baby", band: "out" }] });
    expect(houseCellsFor(buildMovingPack(sitting), sitting)).toBeNull();
  });

  it("is null when the pack has no Load the Van quest", () => {
    const given = answers();
    const pack = buildMovingPack(given);
    const withoutVan = { ...pack, quests: pack.quests.filter((quest) => quest.id !== "move-load-van") };
    expect(houseCellsFor(withoutVan, given)).toBeNull();
  });
});
