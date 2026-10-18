/**
 * The Old House temple record: the Moving House pack's floor plan turned into the temple the game loads (tokens, a
 * rooms table, the locked wing, the stairs, the entrance). A matrix of homes and families proves the solver and the
 * audit accept every house, and the record rides in the pack's merge load under an id that is the same every time.
 */
import {
  DEFAULT_MOVING_ROOMS,
  buildMovingPack,
  movingPackBackup,
} from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingHero, MovingRoomId } from "@/lib/services/core/packs/movingPack";
import {
  MOVING_TEMPLE_ID,
  buildMovingTemple,
  movingTempleBackup,
  movingTempleSummary,
} from "@/lib/services/core/packs/movingTemple";
import type { MovingTemple } from "@/lib/services/core/packs/movingTemple";
import { houseCellsFor, type HouseFloor } from "@/lib/services/core/packs/movingTemple/houseRooms";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import { questTier } from "@/lib/services/temples/questRooms";
import { buildTempleGraph, solveTemple, type GraphRoom, type TempleGraph } from "@/lib/engine/dungeons/generator";
import { registerTempleRecord } from "@/lib/engine/core/dungeons/TempleAdapter";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { PARENT, SIX, TWELVE, answers } from "./movingHouseFixtures";

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
jest.mock("@/lib/databases/PackLibraryDb", () => ({ __esModule: true, packLibraryStorage: { sentinel: "packs" } }));
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

const MOM: MovingHero = { id: "mom", name: "Mom", band: "grownup" };
const TEEN: MovingHero = { id: "teen", name: "Teen", band: "kid" };
const TOT: MovingHero = { id: "tot", name: "Tot", band: "little" };

const UNPACK = "cat-move-unpack";

/** The floors of a house, bottom to top */
const FLOOR_ORDER: HouseFloor[] = ["B1", "1F", "2F"];

const templeFor = (extra: Partial<MovingAnswers> = {}) => {
  const given = answers(extra);
  const pack = buildMovingPack(given);
  return { given, pack, temple: buildMovingTemple(pack, given)! };
};

/** The room table entry for a maze cell: the floor, the row and the column of the shared frame */
const roomAt = (temple: MovingTemple, floor: string, row: number, col: number): Room => {
  const layout = temple.record.dungeonLayout!;
  const maze = layout.maze as Record<string, string[][]>;
  return layout.rooms[maze[floor][row][col]];
};

/** The room of the graph with this name in the house */
const graphRoomNamed = (graph: TempleGraph, name: string): GraphRoom => {
  const found = [...graph.rooms.values()].find((room) => room.room.content?.name === name);
  if (!found) throw new Error(`no room named ${name}`);
  return found;
};

/** The names of the rooms a room has a walking door into */
const neighboursOf = (graph: TempleGraph, room: GraphRoom): string[] =>
  (graph.out.get(room.key) ?? [])
    .filter((door) => door.kind === "door")
    .map((door) => String(graph.rooms.get(door.to)!.room.content?.name))
    .sort();

/** The token and the room table entry of the room with this name */
const recordNamed = (temple: MovingTemple, name: string): { token: string; room: Room } => {
  const entry = Object.entries(temple.record.dungeonLayout!.rooms).find(([, room]) => room.content?.name === name);
  if (!entry) throw new Error(`no room named ${name}`);
  return { token: entry[0], room: entry[1] };
};

// ---------------------------------------------------------------------------------------------------------------
// The matrix: floors x basement x ticked rooms x families

const ROOM_SETS: [string, Partial<Record<MovingRoomId, number>>][] = [
  ["the default rooms", { ...DEFAULT_MOVING_ROOMS }],
  ["every room at its most", {
    bedroom: 8, bathroom: 5, kitchen: 1, living: 1, dining: 1, laundry: 1, storage: 1, garage: 1, yard: 1, guest: 4, office: 1, pets: 1,
  }],
  ["only a kitchen", { kitchen: 1 }],
  ["only one bedroom", { bedroom: 1 }],
  ["nothing ticked", {}],
];

const FAMILIES: [string, MovingHero[]][] = [
  ["Dad, Twelve and Six", [PARENT, TWELVE, SIX]],
  ["Six alone", [SIX]],
  ["two grown-ups and four kids", [PARENT, MOM, TWELVE, SIX, TEEN, TOT]],
  ["Dad alone", [PARENT]],
];

const MATRIX: [string, Partial<MovingAnswers>][] = ([1, 2] as const).flatMap((floors) =>
  [false, true].flatMap((basement) =>
    ROOM_SETS.flatMap(([roomsLabel, rooms]) =>
      FAMILIES.map(([familyLabel, heroes]): [string, Partial<MovingAnswers>] => [
        `${floors} floor${floors > 1 ? "s" : ""}${basement ? " and a basement" : ""}, ${roomsLabel}, ${familyLabel}`,
        { floors, basement, rooms, heroes },
      ]),
    ),
  ),
);

describe("every house the setup can make", () => {
  const built = new Map<string, ReturnType<typeof templeFor> & { graph: TempleGraph }>();
  const houseOf = (label: string, extra: Partial<MovingAnswers>) => {
    if (!built.has(label)) {
      const house = templeFor(extra);
      built.set(label, { ...house, graph: buildTempleGraph(house.temple.record.dungeonLayout!) });
    }
    return built.get(label)!;
  };

  it.each(MATRIX)("%s: can be finished, and the audit passes", (label, extra) => {
    const { temple } = houseOf(label, extra);
    const solved = solveTemple(temple.record.dungeonLayout!);
    expect(solved.reasons).toEqual([]);
    expect(solved.solvable).toBe(true);
    expect(auditTemple(temple.record).passed).toBe(true);
  });

  it.each(MATRIX)("%s: lists its floors bottom to top, each within 9x9, and enters on the porch", (label, extra) => {
    const { temple } = houseOf(label, extra);
    const layout = temple.record.dungeonLayout!;
    const maze = layout.maze as Record<string, string[][]>;
    expect(Object.keys(maze)).toEqual(temple.floors);
    expect(FLOOR_ORDER.filter((floor) => temple.floors.includes(floor))).toEqual(temple.floors);
    for (const grid of Object.values(maze)) {
      expect(grid.length).toBeLessThanOrEqual(9);
      for (const line of grid) expect(line.length).toBeLessThanOrEqual(9);
    }
    const [floorIndex, row, col] = layout.entrance;
    expect(temple.floors[floorIndex]).toBe("1F");
    expect(roomAt(temple, "1F", row, col)).toEqual({ type: "entrance", visited: true, content: { name: "Front porch" } });
  });

  it.each(MATRIX)("%s: seals only the key guard and the van, each on one quest", (label, extra) => {
    const { temple, graph } = houseOf(label, extra);
    const sealed = [...graph.rooms.values()].filter((room) => room.room.content?.lockOnEnter);
    expect(sealed.map((room) => room.kind).sort()).toEqual(["boss", "miniboss"]);
    const guard = temple.rooms.find((room) => room.guardsKey)!;
    expect(sealed.find((room) => room.kind === "miniboss")!.room.content!.questIds).toEqual(guard.questIds);
    expect(guard.questIds).toHaveLength(1);
    expect(sealed.find((room) => room.kind === "boss")!.room.content!.questIds).toEqual(["move-load-van"]);
  });

  it.each(MATRIX)("%s: holds every old-house quest of the pack in exactly one room, and no unpack quest", (label, extra) => {
    const { pack, graph } = houseOf(label, extra);
    const questById = new Map(pack.quests.map((quest) => [String(quest.id), quest]));
    const held = [...graph.rooms.values()].flatMap((room) => (room.room.content?.questIds ?? []) as string[]);
    for (const id of held) {
      expect(questById.has(id)).toBe(true);
      expect(questById.get(id)!.categoryId).not.toBe(UNPACK);
    }
    const oldHouse = pack.quests.filter((quest) => quest.categoryId !== UNPACK).map((quest) => String(quest.id));
    expect([...held].sort()).toEqual(oldHouse.sort());
  });

  it.each(MATRIX)("%s: locks the one door into the quiet wing, from the room it was placed beside", (label, extra) => {
    const { given, pack, graph } = houseOf(label, extra);
    const wing = houseCellsFor(pack, given)!.find((cell) => cell.lockedFromParent);
    const lockedDoors = graph.doors.filter((door) => door.lock === "small");
    const keyChests = [...graph.rooms.values()].filter((room) => room.smallKeys > 0);
    if (!wing) {
      expect(lockedDoors).toEqual([]);
      expect(keyChests).toEqual([]);
      return;
    }
    const wingRoom = graphRoomNamed(graph, wing.name);
    const doorsIn = graph.doors.filter((door) => door.to === wingRoom.key && door.kind === "door");
    expect(doorsIn.map((door) => door.lock)).toEqual(["small"]);
    expect(lockedDoors).toEqual(doorsIn);
    expect(keyChests.map((room) => room.room.content?.name)).toEqual(["Under the couch cushions"]);
  });

  it.each(MATRIX)("%s: sends every flight of stairs to its twin on the next floor", (label, extra) => {
    const { temple, graph } = houseOf(label, extra);
    const flights = [...graph.rooms.values()].filter((room) => room.kind === "stairs-up" || room.kind === "stairs-down");
    expect(flights).toHaveLength(2 * (temple.floors.length - 1));
    for (const stairs of flights) {
      const { targetLevel, targetCoords } = stairs.room.content!;
      const step = stairs.kind === "stairs-up" ? 1 : -1;
      expect(temple.floors.indexOf(targetLevel as HouseFloor) - temple.floors.indexOf(stairs.ref.floor as HouseFloor)).toBe(step);
      expect(targetCoords).toEqual({ x: stairs.ref.col, y: stairs.ref.row });
      const twin = graph.rooms.get(`${targetLevel}:${stairs.ref.row},${stairs.ref.col}`)!;
      expect(twin.kind).toBe(stairs.kind === "stairs-up" ? "stairs-down" : "stairs-up");
      expect(twin.room.content!.targetLevel).toBe(stairs.ref.floor);
    }
  });

  it.each(MATRIX)("%s: gives every room a token of its own, the generator's way", (label, extra) => {
    const { temple } = houseOf(label, extra);
    const layout = temple.record.dungeonLayout!;
    const cells = Object.values(layout.maze as Record<string, string[][]>).flat(2).filter((token) => token !== "_");
    expect(new Set(cells).size).toBe(cells.length);
    expect(Object.keys(layout.rooms).sort()).toEqual(["_", ...cells].sort());
    for (const token of cells) expect(token).toMatch(/^[A-Za-z0-9]\d{3}$/);
    expect(layout.rooms._).toEqual({ type: "wall" });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// One house up close

describe("the default home on two floors", () => {
  const { given, pack, temple } = templeFor({ floors: 2 });
  const graph = buildTempleGraph(temple.record.dungeonLayout!);
  const questById = new Map(pack.quests.map((quest) => [String(quest.id), quest]));

  it("is one temple under an id that is the same every time", () => {
    expect(MOVING_TEMPLE_ID).toBe("gen-move-house");
    expect(temple.record).toMatchObject({
      id: MOVING_TEMPLE_ID,
      name: "The Old House",
      customName: "The Old House",
      themeId: "home",
      element: "earth",
      generated: true,
      categoryIds: [],
      level: 1,
    });
    expect(temple.floors).toEqual(["1F", "2F"]);
  });

  it("names the key guard in the description", () => {
    expect(temple.record.customDescription).toBe(
      "The old house, room by room. Every room holds the packing quests for it, and the key to the van is in the junk drawer behind the kitchen.",
    );
  });

  it("gives each hero a quest in at least three rooms", () => {
    for (const hero of given.heroes) {
      const theirs = temple.rooms.filter((room) => room.questIds.some((id) => questById.get(id)!.assignee.includes(hero.id)));
      expect(theirs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("runs the driveway off the porch: the van, then Last look, then the keys", () => {
    expect(neighboursOf(graph, graphRoomNamed(graph, "The moving van"))).toEqual(["Front porch", "Last look"]);
    expect(neighboursOf(graph, graphRoomNamed(graph, "Last look"))).toEqual(["Keys to the New House", "The moving van"]);
    expect(neighboursOf(graph, graphRoomNamed(graph, "Keys to the New House"))).toEqual(["Last look"]);
  });

  it("keeps the junk drawer behind the kitchen alone", () => {
    expect(neighboursOf(graph, graphRoomNamed(graph, "Junk drawer"))).toEqual(["Kitchen"]);
  });

  it("lists the quest, guard and boss rooms in plan order, each at its biggest quest", () => {
    expect(temple.rooms.map((room) => room.id)).toEqual([
      "van", "lastLook", "hall", "living", "dining", "pantry", "kitchen", "garage", "laundry", "yard", "bath", "storage",
      "bedroom-main", "bedroom-1", "bedroom-2",
    ]);
    expect(temple.rooms.find((room) => room.id === "kitchen")).toEqual({
      id: "kitchen",
      label: "Kitchen",
      floor: "1F",
      questIds: ["move-dishes"],
      names: ["Wrap the Dishes and Pans"],
      type: "miniboss",
      tier: "boss",
      difficulty: 13,
      guardsKey: true,
    });
    expect(temple.rooms.find((room) => room.id === "van")).toMatchObject({ type: "boss", label: "The moving van", difficulty: 13, guardsKey: false });
    for (const room of temple.rooms) {
      const difficulties = room.questIds.map((id) => Number(questById.get(id)!.difficulty));
      expect(room.difficulty).toBe(Math.max(...difficulties));
      expect(room.tier).toBe(questTier(room.difficulty));
      expect(room.names).toEqual(room.questIds.map((id) => questById.get(id)!.achievementName));
      if (room.id !== "van" && !room.guardsKey) expect(room.type).toBe("monster");
    }
    expect(temple.size).toBe(temple.rooms.reduce((sum, room) => sum + room.difficulty, 0));
  });

  it("lists the rooms floor by floor in the after-summary", () => {
    const lines = movingTempleSummary(temple).split("\n");
    expect(lines).toEqual([
      `The Old House is open in Hometown: a two-floor house with ${temple.rooms.length} rooms of packing, size ${temple.size}. Take the van keys from the junk drawer behind the kitchen, then load the van.`,
      "Downstairs: Front hall, Living room, Dining room, Pantry, Kitchen, Garage, Laundry room, Back yard, Bathroom, Storage room",
      "Upstairs: Dad's bedroom, Twelve's bedroom, Six's bedroom",
      "Driveway: The moving van, Last look",
    ]);
  });

  it("registers with the engine the way a saved temple does, and still passes the audit", () => {
    const dungeon = registerTempleRecord(MOVING_TEMPLE_ID, temple.record, { force: true })!;
    expect(dungeon).toBeDefined();
    expect(DungeonManager.getInstance().getDungeon(MOVING_TEMPLE_ID)).toBeDefined();
    expect(auditTemple({ dungeonLayout: { maze: dungeon.maze, rooms: dungeon.rooms as any } }).passed).toBe(true);
  });
});

describe("the cells as rooms", () => {
  const { temple } = templeFor({ floors: 2, basement: true, rooms: { ...DEFAULT_MOVING_ROOMS, office: 1 } });

  it("writes each kind of cell as the room the temple screen knows", () => {
    const expected: [string, string, Room][] = [
      ["Front porch", "E", { type: "entrance", visited: true, content: { name: "Front porch" } }],
      ["Kitchen", "b", { type: "miniboss", content: { name: "Kitchen", questIds: ["move-dishes"], difficulty: "hard", lockOnEnter: true } }],
      ["The moving van", "B", {
        type: "boss", content: { name: "The moving van", questIds: ["move-load-van"], difficulty: "boss", lockOnEnter: true }, locked: { master: true },
      }],
      ["Keys to the New House", "O", { type: "master", content: { name: "Keys to the New House", chest: "dungeon", dungeon: "Pegasus", pegasus: true } }],
      ["Junk drawer", "K", { type: "loot", content: { name: "Junk drawer", chest: "dungeon", dungeon: "master-key" } }],
      ["Under the couch cushions", "k", { type: "loot", content: { name: "Under the couch cushions", chest: "dungeon", dungeon: "key" } }],
      ["Coat closet", "O", { type: "loot", content: { name: "Coat closet", chest: "dungeon", dungeon: "map" } }],
      ["China cabinet", "O", { type: "loot", content: { name: "China cabinet", chest: "dungeon", dungeon: "compass" } }],
      ["Sleeping bags", "C", { type: "camp", content: { name: "Sleeping bags", healthPoints: 15 } }],
      ["Medicine cabinet", "H", { type: "health", content: { name: "Medicine cabinet", healthPoints: 15 } }],
      ["Upstairs hall", "V", { type: "save", content: { name: "Upstairs hall" } }],
      ["Forgotten box", "O", { type: "loot", content: { name: "Forgotten box", chest: "consumable", items: ["potion"] } }],
      ["Home office", "S", { type: "monster", content: { name: "Home office", questIds: ["move-office", "move-paperwork"], difficulty: "normal" } }],
    ];
    for (const [name, char, room] of expected) {
      const found = recordNamed(temple, name);
      expect(found.room).toEqual(name === "Under the couch cushions" ? { ...room, locked: { west: true } } : room);
      expect(found.token[0]).toBe(char);
    }
  });

  it("locks the door into the wing on the room it was placed beside, which need not be its first parent", () => {
    // The basement stairs hang off the front hall, but no side of the hall touched nothing else, so the plan put them by the couch
    const graph = buildTempleGraph(temple.record.dungeonLayout!);
    const stairs = graphRoomNamed(graph, "Basement stairs");
    const doorsIn = graph.doors.filter((door) => door.to === stairs.key && door.kind === "door");
    expect(doorsIn).toHaveLength(1);
    expect(doorsIn[0]).toMatchObject({ lock: "small", direction: "west" });
    expect(graph.rooms.get(doorsIn[0].from)!.room.content!.name).toBe("Under the couch cushions");
    const locked = Object.values(temple.record.dungeonLayout!.rooms).filter((room) => room.locked);
    expect(locked.map((room) => [room.content!.name, room.locked])).toEqual([
      ["Under the couch cushions", { west: true }],
      ["The moving van", { master: true }],
    ]);
  });

  it("writes the stairs with the floor and the cell of their twin", () => {
    const up = recordNamed(temple, "Stairs up");
    const landing = recordNamed(temple, "Landing");
    expect(up.token[0]).toBe("U");
    expect(landing.token[0]).toBe("D");
    expect(up.room).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F" } });
    expect(landing.room).toMatchObject({ type: "stairs-down", content: { targetLevel: "1F" } });
    expect(up.room.content!.targetCoords).toEqual(landing.room.content!.targetCoords);
    const down = recordNamed(temple, "Basement stairs");
    const basement = recordNamed(temple, "Basement");
    expect(down.room).toMatchObject({ type: "stairs-down", content: { targetLevel: "B1" } });
    expect(basement.room).toMatchObject({ type: "stairs-up", content: { targetLevel: "1F" } });
    expect(temple.record.dungeonLayout!.entrance[0]).toBe(1);
  });

  it("writes a room of small chores as an easy fight", () => {
    const { temple: six } = templeFor({ heroes: [SIX] });
    const bathroom = recordNamed(six, "Bathroom");
    expect(bathroom.room).toEqual({ type: "monster", content: { name: "Bathroom", questIds: ["move-daily-teeth"], difficulty: "easy" } });
    expect(bathroom.token[0]).toBe("s");
  });

  it("names the garage, then the packing pile, as the key guard when there is no kitchen", () => {
    const garage = templeFor({ rooms: { garage: 1 } }).temple;
    expect(garage.rooms.find((room) => room.guardsKey)).toMatchObject({ id: "garage", questIds: ["move-garage"] });
    expect(garage.record.customDescription).toMatch(/in the junk drawer behind the garage\.$/);
    const bare = templeFor({ rooms: {} }).temple;
    expect(bare.rooms.find((room) => room.guardsKey)).toMatchObject({ id: "packingPile", questIds: ["move-open-first"] });
    expect(movingTempleSummary(bare)).toContain("Take the van keys from the junk drawer behind the packing pile, then load the van.");
  });
});

describe("the summary of other houses", () => {
  it("lists a one-floor house as Rooms, with the basement on a line of its own", () => {
    const { temple } = templeFor({ basement: true });
    const lines = movingTempleSummary(temple).split("\n");
    expect(lines[0]).toMatch(/^The Old House is open in Hometown: a one-floor house with \d+ rooms of packing, size \d+\. /);
    expect(lines.slice(1)).toEqual([
      "Basement: Storage",
      "Rooms: Front hall, Living room, Dining room, Pantry, Kitchen, Garage, Laundry room, Back yard, Bathroom, Dad's bedroom, Twelve's bedroom, Six's bedroom",
      "Driveway: The moving van, Last look",
    ]);
  });
});

describe("loading the temple", () => {
  it("is the same every time for the same answers, whatever the move date", () => {
    const given = answers({ floors: 2, basement: true });
    const later = { ...given, moveDate: "2027-02-01" };
    expect(buildMovingTemple(buildMovingPack(later), later)).toEqual(buildMovingTemple(buildMovingPack(given), given));
    expect(templeFor().temple).toEqual(templeFor().temple);
  });

  it("seeds the plan with the answers that shape the house, never the date", () => {
    const { temple } = templeFor({ heroes: [PARENT, { id: "baby", name: "Baby", band: "out" }, TWELVE, SIX] });
    expect(temple.record.seed).toBe(
      'moving-day:{"rooms":{"bathroom":2,"bedroom":3,"dining":1,"garage":1,"kitchen":1,"laundry":1,"living":1,"storage":1,"yard":1},' +
        '"floors":1,"basement":false,"heroes":[["dad","grownup"],["twelve","kid"],["six","little"]]}',
    );
  });

  it("builds nothing when no hero plays", () => {
    const given = answers({ heroes: [] });
    expect(buildMovingTemple(buildMovingPack(given), given)).toBeNull();
    const out = answers({ heroes: [{ ...PARENT, band: "out" }] });
    expect(buildMovingTemple(buildMovingPack(out), out)).toBeNull();
  });

  it("rides in the pack's backup file under __temples, beside the pack's own stores", () => {
    const given = answers();
    const pack = buildMovingPack(given);
    const temple = buildMovingTemple(pack, given)!;
    const now = new Date("2026-10-01T00:00:00Z");
    const file = movingTempleBackup(pack, temple, now);
    expect(Object.keys(file.stores).sort()).toEqual(["__achievementCategories", "__achievements", "__beasts", "__temples"]);
    expect(file.stores.__temples).toEqual([{ key: MOVING_TEMPLE_ID, value: temple.record }]);
    expect(file.stores.__achievements).toEqual(movingPackBackup(pack, now).stores.__achievements);
    expect(movingTempleBackup(pack, null, now)).toEqual(movingPackBackup(pack, now));
  });

  class FakeStorage {
    readonly data = new Map<string, unknown>();
    constructor(seed: Record<string, unknown> = {}) {
      Object.entries(seed).forEach(([key, value]) => this.data.set(key, value));
    }
    async create() {
      return this;
    }
    async forEach(callback: (value: unknown, key: string, index: number) => unknown) {
      let index = 0;
      for (const [key, value] of Array.from(this.data.entries())) {
        if (callback(JSON.parse(JSON.stringify(value)), key, index++) !== undefined) return;
      }
    }
    async set(key: string, value: unknown) {
      this.data.set(key, JSON.parse(JSON.stringify(value)));
    }
    async clear() {
      this.data.clear();
    }
    asStorage() {
      return this as unknown as BackupStorage;
    }
  }

  const gmTemple = { id: "gen-our-attic", name: "Our Attic", dungeonLayout: { entrance: [0, 0], maze: [["E"]], rooms: { E: { type: "entrance" } } } };
  const shippedTemple = { id: "wind-temple", name: "Wind Temple" };
  const progress = { id: "hero-1|gen-move-house", clearedRooms: ["1F:2,3"] };
  const familyQuest = { id: "quest-the-kids-made", achievementName: "Feed the dragon" };

  const makeWorld = () => {
    const fakes = {
      __achievementCategories: new FakeStorage(),
      __beasts: new FakeStorage(),
      __achievements: new FakeStorage({ [familyQuest.id]: familyQuest }),
      __temples: new FakeStorage({ [gmTemple.id]: gmTemple, [shippedTemple.id]: shippedTemple }),
      __templeProgress: new FakeStorage({ [progress.id]: progress }),
    };
    const defs: BackupStoreDef[] = Object.entries(fakes).map(([name, fake]) => ({ name, label: name, storage: fake.asStorage() }));
    return { fakes, service: new BackupService(defs, jest.fn(async () => undefined), () => true) };
  };

  it("merges: the Game Master's temples, hero progress and every family record stay, and a reload replaces only the old house", async () => {
    const { fakes, service } = makeWorld();
    const given = answers();
    const pack = buildMovingPack(given);
    const temple = buildMovingTemple(pack, given)!;

    await service.restoreBackup(movingTempleBackup(pack, temple), { mode: "merge" });
    expect(fakes.__temples.data.get(MOVING_TEMPLE_ID)).toEqual(temple.record);
    expect(fakes.__temples.data.get(gmTemple.id)).toEqual(gmTemple);
    expect(fakes.__temples.data.get(shippedTemple.id)).toEqual(shippedTemple);
    expect(fakes.__temples.data.size).toBe(3);
    expect(fakes.__templeProgress.data.get(progress.id)).toEqual(progress);
    expect(fakes.__achievements.data.get(familyQuest.id)).toEqual(familyQuest);

    // the Game Master edits the old house, then loads the same answers again: only that record goes back
    fakes.__temples.data.set(MOVING_TEMPLE_ID, { ...temple.record, customName: "Edited" });
    await service.restoreBackup(movingTempleBackup(pack, buildMovingTemple(pack, given), new Date()), { mode: "merge" });
    expect((fakes.__temples.data.get(MOVING_TEMPLE_ID) as { customName: string }).customName).toBe("The Old House");
    expect(fakes.__temples.data.size).toBe(3);
    expect(fakes.__temples.data.get(gmTemple.id)).toEqual(gmTemple);
    expect(fakes.__templeProgress.data.get(progress.id)).toEqual(progress);
  });

  it("does not touch the temples when the family leaves the option off", async () => {
    const { fakes, service } = makeWorld();
    const pack = buildMovingPack(answers());
    await service.restoreBackup(movingPackBackup(pack), { mode: "merge" });
    expect([...fakes.__temples.data.keys()].sort()).toEqual([gmTemple.id, shippedTemple.id].sort());
  });
});
