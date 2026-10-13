/**
 * The Moving Day temple: the old house as a dungeon. The pack's quests become the rooms (one combat room per room the
 * family ticks, a bedroom per hero, the kitchen guarding the key to the van, "Load the Van" as the boss), and the temple
 * rides in the same merge load as the pack, under an id that is the same every time.
 */
import {
  DEFAULT_MOVING_ROOMS,
  buildMovingPack,
  movingPackBackup,
} from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingHero } from "@/lib/services/core/packs/movingPack";
import {
  MOVING_TEMPLE_ID,
  buildMovingTemple,
  movingTempleBackup,
  movingTempleSummary,
} from "@/lib/services/core/packs/movingTemple";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import { TEMPLE_FULL_SIZE, questTier } from "@/lib/services/temples/questRooms";
import { buildTempleGraph, solveTemple } from "@/lib/engine/dungeons/generator";
import { registerTempleRecord } from "@/lib/engine/core/dungeons/TempleAdapter";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";

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

const templeFor = (extra: Partial<MovingAnswers> = {}) => {
  const given = answers(extra);
  const pack = buildMovingPack(given);
  return { pack, temple: buildMovingTemple(pack, given)! };
};

/** The quest ids the temple's rooms hold, in a stable order */
const heldIds = (temple: NonNullable<ReturnType<typeof buildMovingTemple>>): string[] => temple.rooms.map((room) => room.questId).sort();

describe("buildMovingTemple for a typical home", () => {
  const { pack, temple } = templeFor();
  const questById = new Map(pack.quests.map((quest) => [String(quest.id), quest]));

  it("is one temple under an id that is the same every time", () => {
    expect(MOVING_TEMPLE_ID).toBe("gen-move-house");
    expect(temple.record.id).toBe(MOVING_TEMPLE_ID);
    expect(temple.record.name).toBe("The Old House");
    expect(temple.record.customName).toBe("The Old House");
    expect(temple.record.dungeonLayout!.entrance).toEqual([0, 2, 0]);
  });

  it("holds a real quest of the pack in every combat room, each quest once", () => {
    const rooms = temple.record.dungeonLayout!.rooms;
    const questRooms = Object.values(rooms).filter((room) => room.content?.questId);
    expect(questRooms).toHaveLength(temple.rooms.length);
    const ids = questRooms.map((room) => String(room.content!.questId));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(questById.has(id)).toBe(true);
    expect(ids.sort()).toEqual(heldIds(temple));
    // a quest room is not a classic beast room
    for (const room of questRooms) {
      expect(room.content!.beasts).toBeUndefined();
      expect(room.content!.monsterType).toBeUndefined();
      expect(["monster", "miniboss", "boss"]).toContain(room.type);
    }
  });

  it("walks the house room by room: a bedroom per hero, the ticked rooms, the kitchen as the miniboss, the van as the boss", () => {
    const quests = heldIds(temple);
    expect(quests).toEqual(
      [
        "move-closet-grownup-dad",
        "move-dresser-kid-twelve",
        "move-toys-little-six",
        "move-storage",
        "move-garage",
        "move-yard",
        "move-living-dining",
        "move-dishes",
        "move-bathrooms",
        "move-laundry",
        "move-open-first",
        "move-walkthrough",
        "move-load-van",
      ].sort()
    );
    const byQuest = new Map(temple.rooms.map((room) => [room.questId, room]));
    expect(byQuest.get("move-load-van")).toMatchObject({ type: "boss", tier: "boss", difficulty: 13 });
    expect(byQuest.get("move-dishes")).toMatchObject({ type: "miniboss", guardsKey: true });
    expect(temple.rooms.filter((room) => room.guardsKey)).toHaveLength(1);
    expect(byQuest.get("move-toys-little-six")).toMatchObject({ type: "monster", tier: "monster", difficulty: 2 });
    expect(byQuest.get("move-dresser-kid-twelve")).toMatchObject({ type: "miniboss", tier: "miniboss", difficulty: 5 });
  });

  it("takes each room's type from the quest's tier, with one boss and the weightiest jobs as sealed minibosses", () => {
    for (const room of temple.rooms) {
      const quest = questById.get(room.questId)!;
      expect(room.difficulty).toBe(quest.difficulty);
      expect(room.tier).toBe(questTier(quest.difficulty));
      if (room.type === "boss") expect(room.questId).toBe("move-load-van");
      else if (room.tier === "monster") expect(room.type).toBe("monster");
      else expect(room.type).toBe("miniboss");
    }
    const rooms = temple.record.dungeonLayout!.rooms;
    for (const room of Object.values(rooms)) {
      if (room.type === "miniboss" || room.type === "boss") expect(room.content!.lockOnEnter).toBe(true);
    }
  });

  it("is a full temple: the audit passes every check and the size is 21 or more", () => {
    const rooms = temple.record.dungeonLayout!.rooms;
    const sizeOf = (room: { content?: Record<string, any> }) => {
      const id = room.content?.questId;
      return id ? Number(questById.get(String(id))!.difficulty) : null;
    };
    const result = auditTemple(temple.record, { sizeOf });
    expect(result.checks.filter((check) => !check.ok)).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.checks.map((check) => check.id)).toEqual(["entrance", "exit", "boss", "bossKey", "masterRoom", "map", "compass", "size"]);
    expect(temple.size).toBeGreaterThanOrEqual(TEMPLE_FULL_SIZE);
    expect(temple.size).toBe(temple.rooms.reduce((sum, room) => sum + room.difficulty, 0));
    expect(Object.keys(rooms).length).toBeGreaterThan(temple.rooms.length);
  });

  it("can be finished: the solver finds no broken rule", () => {
    const solved = solveTemple(temple.record.dungeonLayout!);
    expect(solved.reasons).toEqual([]);
    expect(solved.solvable).toBe(true);
    const kinds = solved.criticalPath.map((ref) => buildTempleGraph(temple.record.dungeonLayout!).rooms.get(`${ref.floor}:${ref.row},${ref.col}`)!.kind);
    expect(kinds.indexOf("miniboss")).toBeLessThan(kinds.indexOf("boss"));
  });

  it("keeps the master key behind the kitchen and the boss behind one locked door", () => {
    const layout = temple.record.dungeonLayout!;
    const graph = buildTempleGraph(layout);
    const rooms = [...graph.rooms.values()];
    const kitchen = rooms.find((room) => room.room.content?.questId === "move-dishes")!;
    const keyRoom = rooms.find((room) => room.masterKey)!;
    const around = graph.out.get(keyRoom.key)!.map((door) => door.to);
    expect(around).toEqual([kitchen.key]);
    // the doors into the boss from the rest of the temple (the Master Room behind it is not the rest of the temple)
    const bossDoors = graph.doors.filter(
      (door) => graph.rooms.get(door.to)!.kind === "boss" && graph.rooms.get(door.from)!.kind !== "master" && door.kind === "door"
    );
    expect(bossDoors.map((door) => door.lock)).toEqual(["master"]);
    expect(layout.rooms[graph.rooms.get(bossDoors[0].to)!.token].locked).toEqual({ master: true });
  });

  it("registers with the engine the way a saved temple does, and still passes the audit", () => {
    const dungeon = registerTempleRecord(MOVING_TEMPLE_ID, temple.record, { force: true })!;
    expect(dungeon).toBeDefined();
    expect(DungeonManager.getInstance().getDungeon(MOVING_TEMPLE_ID)).toBeDefined();
    const questRooms = Object.values(dungeon.rooms).filter((room) => room.content?.questId);
    expect(questRooms).toHaveLength(temple.rooms.length);
    expect(auditTemple({ dungeonLayout: { maze: dungeon.maze, rooms: dungeon.rooms as any } }).passed).toBe(true);
  });
});

describe("the rooms follow the ticked rooms", () => {
  const held = (extra: Partial<MovingAnswers>) => heldIds(templeFor(extra).temple);

  it("adds a room for each room the family ticks and none for the rest", () => {
    const base = held({ rooms: { kitchen: 1 } });
    expect(base).not.toContain("move-garage");
    expect(base).not.toContain("move-storage");
    expect(base).not.toContain("move-bathrooms");
    expect(base).not.toContain("move-closet-grownup-dad");
    expect(base).toContain("move-dishes");
    const more = held({ rooms: { kitchen: 1, garage: 1, office: 1, pets: 1, guest: 2, storage: 1, laundry: 1 } });
    expect(more).toEqual(expect.arrayContaining(["move-garage", "move-office", "move-pets", "move-guest-room", "move-storage", "move-laundry"]));
    expect(held({ rooms: { yard: 1 } })).toContain("move-yard");
  });

  it("makes a bedroom for each hero who plays, with their own quest", () => {
    const ids = held({ rooms: { bedroom: 3 } });
    expect(ids).toEqual(expect.arrayContaining(["move-closet-grownup-dad", "move-dresser-kid-twelve", "move-toys-little-six"]));
    const out = held({ rooms: { bedroom: 3 }, heroes: [PARENT, TWELVE, { ...SIX, band: "out" }] });
    expect(out).not.toContain("move-toys-little-six");
    expect(out).toContain("move-dresser-kid-twelve");
    const noBedrooms = held({ rooms: { kitchen: 1 } });
    expect(noBedrooms.some((id) => /closet|dresser|toys-little/.test(id))).toBe(false);
    const mom: MovingHero = { id: "mom", name: "Mom", band: "grownup" };
    expect(held({ rooms: { bedroom: 4 }, heroes: [PARENT, mom, TWELVE, SIX] })).toEqual(
      expect.arrayContaining(["move-closet-grownup-dad", "move-closet-grownup-mom"])
    );
  });

  it("shares one room between the living and the dining room", () => {
    expect(held({ rooms: { living: 1 } })).toContain("move-living-dining");
    expect(held({ rooms: { dining: 1 } })).toContain("move-living-dining");
    const both = held({ rooms: { living: 1, dining: 1 } });
    expect(both.filter((id) => id === "move-living-dining")).toHaveLength(1);
  });

  it("picks the garage to guard the key when there is no kitchen, and the Open First Box when there is neither", () => {
    const garage = templeFor({ rooms: { garage: 1 } }).temple;
    expect(garage.rooms.find((room) => room.guardsKey)!.questId).toBe("move-garage");
    const bare = templeFor({ rooms: {} }).temple;
    expect(bare.rooms.find((room) => room.guardsKey)!.questId).toBe("move-open-first");
    expect(auditTemple(bare.record).passed).toBe(true);
    expect(solveTemple(bare.record.dungeonLayout!).reasons).toEqual([]);
  });

  it("falls back to the quest the band has: a family of kids has no grown-up kitchen job, only the mugs", () => {
    const kids = templeFor({ rooms: { kitchen: 1, garage: 1, storage: 1 }, heroes: [TWELVE, SIX] }).temple;
    const ids = heldIds(kids);
    expect(ids).toContain("move-mugs");
    expect(ids).toContain("move-garage-gear");
    expect(ids).not.toContain("move-storage");
    expect(ids).not.toContain("move-dishes");
    expect(kids.rooms.find((room) => room.guardsKey)!.questId).toBe("move-mugs");
  });

  it("builds nothing when no hero plays", () => {
    const given = answers({ heroes: [] });
    expect(buildMovingTemple(buildMovingPack(given), given)).toBeNull();
    const out = answers({ heroes: [{ ...PARENT, band: "out" }] });
    expect(buildMovingTemple(buildMovingPack(out), out)).toBeNull();
  });

  it("stays finishable and wide enough as the home grows to the most rooms and heroes", () => {
    const heroes: MovingHero[] = [PARENT, TWELVE, SIX, { id: "mom", name: "Mom", band: "grownup" }, { id: "kid2", name: "Kid2", band: "kid" }, { id: "little2", name: "Little2", band: "little" }];
    const rooms = { bedroom: 8, bathroom: 5, kitchen: 1, living: 1, dining: 1, laundry: 1, storage: 1, garage: 1, yard: 1, guest: 4, office: 1, pets: 1 };
    const { temple } = templeFor({ rooms, heroes });
    expect(temple.rooms.length).toBeGreaterThan(18);
    expect(auditTemple(temple.record).passed).toBe(true);
    expect(solveTemple(temple.record.dungeonLayout!).reasons).toEqual([]);
    const tokens = Object.keys(temple.record.dungeonLayout!.rooms);
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});

describe("loading the temple", () => {
  it("is the same every time for the same answers, whatever the move date", () => {
    expect(templeFor().temple).toEqual(templeFor().temple);
    expect(templeFor({ moveDate: "2027-02-01" }).temple.record).toEqual(templeFor().temple.record);
  });

  it("says where it is in the after-summary", () => {
    const { temple } = templeFor();
    const line = movingTempleSummary(temple);
    expect(line).toContain("The Old House");
    expect(line).toMatch(/\b13 rooms\b/);
    expect(line).toContain("Hometown");
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
