/**
 * Where the cells of the Old House go: fixed cells at their spots, landings over their stairs, every other cell beside
 * its parent, and the zones that keep the junk drawer, the van's driveway and the locked wing to themselves. Pure.
 */
import { DIRECTIONS, STEP } from "@/lib/engine/dungeons/generator";
import type { HouseCell } from "@/lib/services/core/packs/movingTemple/houseRooms";
import { HOUSE_FRAME, planHouse, type HousePlan, type PlacedCell } from "@/lib/services/core/packs/movingTemple/housePlanner";
import { SETUPS, houseFor } from "./movingHouseFixtures";

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

/** A cell with only what a test cares about; everything else is a plain fight room on the ground floor */
const cell = (id: string, overrides: Partial<HouseCell> = {}): HouseCell => ({
  id, name: id, kind: "quest", floor: "1F", parents: [], prefer: [], zone: "house", questIds: [], ...overrides,
});

const porchAt = (row: number, col: number): HouseCell => cell("porch", { kind: "entrance", at: [row, col] });

const placedOf = (plan: HousePlan, id: string): PlacedCell => {
  const found = plan.cells.find((placed) => placed.cell.id === id);
  if (!found) throw new Error(`${id} was not placed`);
  return found;
};

/** The cells touching this one on its floor */
const touching = (plan: HousePlan, of: PlacedCell): PlacedCell[] =>
  plan.cells.filter(
    (other) =>
      other.cell.floor === of.cell.floor &&
      DIRECTIONS.some((direction) => other.row === of.row + STEP[direction][0] && other.col === of.col + STEP[direction][1]),
  );

describe("planHouse", () => {
  describe("the frame and the fixed cells", () => {
    it("is nine by nine", () => {
      expect(HOUSE_FRAME).toBe(9);
    });

    it("keeps fixed cells in place relative to each other after the trim", () => {
      const plan = planHouse(
        [
          cell("van", { at: [8, 3], zone: "driveway" }),
          porchAt(8, 4),
          cell("hall", { at: [7, 4] }),
        ],
        "seed",
      );
      const van = placedOf(plan, "van");
      const porch = placedOf(plan, "porch");
      const hall = placedOf(plan, "hall");
      expect(porch.row).toBe(van.row);
      expect(porch.col).toBe(van.col + 1);
      expect(hall.col).toBe(porch.col);
      expect(hall.row).toBe(porch.row - 1);
      expect([van, porch, hall].every((placed) => placed.via === undefined)).toBe(true);
    });

    it("trims the frame to the box that holds every cell of every floor together", () => {
      const plan = planHouse([porchAt(6, 5), cell("attic", { floor: "2F", at: [2, 1] })], "seed");
      expect(plan.rows).toBe(5);
      expect(plan.cols).toBe(5);
      expect(placedOf(plan, "attic")).toMatchObject({ row: 0, col: 0 });
      expect(placedOf(plan, "porch")).toMatchObject({ row: 4, col: 4 });
    });

    it("lists only the floors that have cells, lowest first", () => {
      const cells = [
        porchAt(4, 4),
        cell("up", { floor: "2F", at: [4, 4] }),
        cell("down", { floor: "B1", at: [4, 4] }),
      ];
      expect(planHouse(cells, "seed").floors).toEqual(["B1", "1F", "2F"]);
      expect(planHouse([cells[0], cells[2]], "seed").floors).toEqual(["B1", "1F"]);
      expect(planHouse([cells[0]], "seed").floors).toEqual(["1F"]);
    });

    it("plans no cells as an empty house", () => {
      expect(planHouse([], "seed")).toEqual({ floors: [], rows: 0, cols: 0, cells: [] });
    });
  });

  describe("beside the parent", () => {
    it("goes to the preferred direction when it is free", () => {
      const plan = planHouse([porchAt(4, 4), cell("den", { parents: ["porch"], prefer: ["west"] })], "seed");
      const porch = placedOf(plan, "porch");
      const den = placedOf(plan, "den");
      expect(den.row).toBe(porch.row);
      expect(den.col).toBe(porch.col - 1);
      expect(den.via).toBe("porch");
    });

    it("tries the preferred directions in order", () => {
      const plan = planHouse(
        [porchAt(4, 4), cell("wall", { at: [4, 3] }), cell("den", { parents: ["porch"], prefer: ["west", "north"] })],
        "seed",
      );
      const porch = placedOf(plan, "porch");
      expect(placedOf(plan, "den")).toMatchObject({ row: porch.row - 1, col: porch.col });
    });

    it("never steps outside the frame", () => {
      const plan = planHouse([porchAt(0, 4), cell("den", { parents: ["porch"], prefer: ["north", "east"] })], "seed");
      const porch = placedOf(plan, "porch");
      expect(placedOf(plan, "den")).toMatchObject({ row: porch.row, col: porch.col + 1 });
    });

    it("hangs off the first parent that is already placed on its own floor", () => {
      const plan = planHouse(
        [
          porchAt(4, 4),
          cell("stairs", { kind: "stairsUp", parents: ["porch"], prefer: ["north"] }),
          cell("landing", { kind: "stairsDown", floor: "2F", twinOf: "stairs" }),
          cell("bedroom", { floor: "2F", parents: ["later", "porch", "landing"], prefer: ["south"] }),
        ],
        "seed",
      );
      expect(placedOf(plan, "bedroom").via).toBe("landing");
    });

    it("gives the same plan for the same cells and seed", () => {
      const cells = [
        porchAt(4, 4),
        ...Array.from({ length: 12 }, (_, index) => cell(`room-${index}`, { parents: ["porch"] })),
      ];
      expect(planHouse(cells, "the-move")).toEqual(planHouse(cells, "the-move"));
    });

    it("lands on its first preferred direction whatever the seed", () => {
      for (const seed of ["a", "b", "c", "d", "e", "f"]) {
        const plan = planHouse([porchAt(4, 4), cell("den", { parents: ["porch"], prefer: ["east"] })], seed);
        expect(placedOf(plan, "den")).toMatchObject({ row: placedOf(plan, "porch").row, col: placedOf(plan, "porch").col + 1 });
      }
    });

    it("lets the seed order only the directions after the preferred ones", () => {
      const blocked = [porchAt(4, 4), cell("wall", { at: [4, 5] })];
      const wheres = new Set<string>();
      for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]) {
        const plan = planHouse([...blocked, cell("den", { parents: ["porch"], prefer: ["east"] })], seed);
        const porch = placedOf(plan, "porch");
        const den = placedOf(plan, "den");
        expect(touching(plan, porch)).toContain(den);
        wheres.add(`${den.row - porch.row},${den.col - porch.col}`);
      }
      expect(wheres.size).toBeGreaterThan(1);
    });

    it("sets via on every placed cell to a cell it touches", () => {
      const cells = [
        porchAt(4, 4),
        cell("hall", { at: [3, 4], parents: ["porch"] }),
        cell("stairs", { kind: "stairsUp", parents: ["hall"], prefer: ["east"] }),
        cell("landing", { kind: "stairsDown", floor: "2F", twinOf: "stairs" }),
        cell("upHall", { floor: "2F", parents: ["landing"], prefer: ["north"] }),
        ...Array.from({ length: 14 }, (_, index) => cell(`room-${index}`, { parents: ["hall", "porch"], prefer: ["west", "north"] })),
        ...Array.from({ length: 5 }, (_, index) => cell(`bedroom-${index}`, { floor: "2F", parents: ["upHall"] })),
      ];
      const plan = planHouse(cells, "the-move");
      expect(plan.cells).toHaveLength(cells.length);
      for (const placed of plan.cells) {
        if (placed.cell.at || placed.cell.twinOf) {
          expect(placed.via).toBeUndefined();
        } else {
          const via = touching(plan, placed).find((other) => other.cell.id === placed.via);
          expect(via).toBeDefined();
        }
      }
    });
  });

  describe("the floors", () => {
    it("puts a landing on the row and column of its twin stairs", () => {
      const plan = planHouse(
        [
          porchAt(4, 4),
          cell("stairs", { kind: "stairsUp", parents: ["porch"], prefer: ["north"] }),
          cell("landing", { kind: "stairsDown", floor: "2F", twinOf: "stairs" }),
          cell("cellar", { kind: "stairsDown", parents: ["porch"], prefer: ["south"] }),
          cell("b1Landing", { kind: "stairsUp", floor: "B1", twinOf: "cellar" }),
        ],
        "seed",
      );
      for (const [landing, twin] of [["landing", "stairs"], ["b1Landing", "cellar"]]) {
        expect(placedOf(plan, landing)).toMatchObject({ row: placedOf(plan, twin).row, col: placedOf(plan, twin).col });
        expect(placedOf(plan, landing).via).toBeUndefined();
      }
    });

    it("keeps each floor's spots to itself", () => {
      const plan = planHouse(
        [
          porchAt(4, 4),
          cell("stairs", { kind: "stairsUp", parents: ["porch"], prefer: ["north"] }),
          cell("landing", { kind: "stairsDown", floor: "2F", twinOf: "stairs" }),
          cell("upHall", { floor: "2F", parents: ["landing"], prefer: ["south"] }),
        ],
        "seed",
      );
      // South of the landing is where the porch stands one floor down, and the porch does not stop the upstairs hall
      expect(placedOf(plan, "upHall")).toMatchObject({ row: placedOf(plan, "porch").row, col: placedOf(plan, "porch").col, via: "landing" });
    });

    it("builds the ground floor first so a landing always finds its stairs", () => {
      const plan = planHouse(
        [
          cell("landing", { kind: "stairsDown", floor: "2F", twinOf: "stairs" }),
          porchAt(4, 4),
          cell("stairs", { kind: "stairsUp", parents: ["porch"], prefer: ["north"] }),
        ],
        "seed",
      );
      expect(placedOf(plan, "landing")).toMatchObject({ row: placedOf(plan, "stairs").row, col: placedOf(plan, "stairs").col });
    });
  });

  describe("the zones", () => {
    it("keeps the junk drawer touching only what it hangs off, however many house cells follow", () => {
      const cells = [
        porchAt(4, 4),
        cell("kitchen", { parents: ["porch"], prefer: ["north"] }),
        cell("drawer", { kind: "masterKey", parents: ["kitchen"], prefer: ["north"], zone: "drawer" }),
        ...Array.from({ length: 20 }, (_, index) => cell(`room-${index}`, { parents: ["kitchen"], prefer: ["north", "east", "west"] })),
      ];
      const plan = planHouse(cells, "the-move");
      expect(plan.cells).toHaveLength(cells.length);
      const drawer = placedOf(plan, "drawer");
      expect(drawer.via).toBe("kitchen");
      expect(touching(plan, drawer).map((placed) => placed.cell.id)).toEqual(["kitchen"]);
    });

    it("keeps the house off the van's driveway", () => {
      const cells = [
        cell("van", { at: [8, 3], zone: "driveway" }),
        porchAt(8, 4),
        cell("hall", { at: [7, 4] }),
        ...Array.from({ length: 12 }, (_, index) => cell(`room-${index}`, { parents: ["hall"], prefer: ["west", "south", "north"] })),
      ];
      const plan = planHouse(cells, "the-move");
      const van = placedOf(plan, "van");
      expect(touching(plan, van).map((placed) => placed.cell.id)).toEqual(["porch"]);
    });

    it("keeps the locked wing to itself apart from its door", () => {
      const cells = [
        porchAt(4, 4),
        cell("hall", { parents: ["porch"], prefer: ["north"] }),
        cell("garage", { parents: ["hall"], prefer: ["east"], zone: "wing", lockedFromParent: true }),
        ...Array.from({ length: 16 }, (_, index) => cell(`room-${index}`, { parents: ["hall"], prefer: ["east", "west", "north"] })),
      ];
      const plan = planHouse(cells, "the-move");
      const garage = placedOf(plan, "garage");
      expect(touching(plan, garage).map((placed) => placed.cell.id)).toEqual(["hall"]);
    });
  });

  describe("when nothing fits beside the parent", () => {
    it("walks the placed cells of its own zone from the parent, nearest first", () => {
      const plan = planHouse(
        [
          porchAt(4, 4),
          cell("n", { at: [3, 4] }),
          cell("e", { at: [4, 5] }),
          cell("s", { at: [5, 4] }),
          cell("w", { at: [4, 3] }),
          cell("extra", { parents: ["porch"], prefer: ["west"] }),
        ],
        "seed",
      );
      // Every neighbour of the porch is taken; the first walked cell is the north one, and its first free side is north
      const north = placedOf(plan, "n");
      expect(placedOf(plan, "extra")).toMatchObject({ row: north.row - 1, col: north.col, via: "n" });
    });

    it("walks the cells of the zone a link cell comes from, so the locked wing finds a side of the house", () => {
      const plan = planHouse(
        [
          porchAt(4, 4),
          cell("hall", { at: [3, 4] }),
          cell("north", { at: [2, 4] }),
          cell("east", { at: [3, 5] }),
          cell("van", { at: [3, 3], zone: "driveway" }),
          cell("garage", { parents: ["hall"], prefer: ["west", "east"], zone: "wing", lockedFromParent: true }),
        ],
        "seed",
      );
      // The hall is boxed in, so the walk goes hall, north (its first house neighbour), and takes north's own north side
      const north = placedOf(plan, "north");
      const garage = placedOf(plan, "garage");
      expect(garage).toMatchObject({ row: north.row - 1, col: north.col, via: "north" });
      expect(touching(plan, garage).map((placed) => placed.cell.id)).toEqual(["north"]);
    });

    it("never moves the junk drawer away from its guard", () => {
      const cells = [
        porchAt(0, 0),
        cell("south", { at: [1, 0] }),
        cell("east", { at: [0, 1] }),
        cell("drawer", { kind: "masterKey", parents: ["porch"], zone: "drawer" }),
      ];
      expect(() => planHouse(cells, "seed")).toThrow("The house has no room for drawer");
    });

    it("throws when the frame is full", () => {
      const spots = Array.from({ length: HOUSE_FRAME * HOUSE_FRAME }, (_, index) =>
        cell(`fixed-${index}`, { at: [Math.floor(index / HOUSE_FRAME), index % HOUSE_FRAME] }),
      );
      const crowded = [...spots, cell("pantry", { name: "Pantry", parents: ["fixed-0"] })];
      expect(() => planHouse(crowded, "seed")).toThrow("The house has no room for Pantry");
    });

    it("throws for a cell with no parent placed on its floor", () => {
      expect(() => planHouse([porchAt(4, 4), cell("orphan", { name: "Orphan room", parents: ["nobody"] })], "seed")).toThrow(
        "The house has no room for Orphan room",
      );
    });

    it("throws for a fixed cell whose spot is taken", () => {
      expect(() => planHouse([porchAt(4, 4), cell("twin", { name: "Twin spot", at: [4, 4] })], "seed")).toThrow(
        "The house has no room for Twin spot",
      );
    });
  });

  describe("the real house", () => {
    const SEEDS = ["gen-move-house", "a", "b", "c"];
    const HOUSES = SETUPS.map(([label, extra]) => [label, houseFor(extra).cells] as const);
    const CASES = HOUSES.flatMap(([label, cells]) => SEEDS.map((seed) => [`${label}, seed ${seed}`, cells, seed] as const));

    it.each(CASES)("%s", (_label, cells, seed) => {
      const plan = planHouse(cells, seed);
      expect(plan.cells).toHaveLength(cells.length);

      // Every floor fits the frame
      expect(plan.rows).toBeLessThanOrEqual(HOUSE_FRAME);
      expect(plan.cols).toBeLessThanOrEqual(HOUSE_FRAME);
      for (const placed of plan.cells) {
        expect(placed.row).toBeGreaterThanOrEqual(0);
        expect(placed.col).toBeGreaterThanOrEqual(0);
        expect(placed.row).toBeLessThan(plan.rows);
        expect(placed.col).toBeLessThan(plan.cols);
      }

      // The junk drawer touches only the guard it hangs off
      for (const drawer of plan.cells.filter((placed) => placed.cell.kind === "masterKey")) {
        expect(drawer.via).toBe(drawer.cell.parents[0]);
        expect(touching(plan, drawer).map((placed) => placed.cell.id)).toEqual([drawer.via]);
      }

      // The locked wing touches only the cell it was placed beside
      for (const wing of plan.cells.filter((placed) => placed.cell.zone === "wing")) {
        expect(touching(plan, wing).map((placed) => placed.cell.id)).toEqual([wing.via]);
      }

      // The van touches only the porch and Last look
      expect(touching(plan, placedOf(plan, "van")).map((placed) => placed.cell.id).sort()).toEqual(["lastLook", "porch"]);
    });
  });
});
