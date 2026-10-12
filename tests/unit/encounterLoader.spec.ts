import { loadEncounter } from "@/app/Console/BattleField/battle/encounterLoader";
import type { BattleContext } from "@/app/Console/BattleField/battle/battleContext";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Enemy } from "@/lib/services/battle/BattleService";
import type { BestiaryService } from "@/lib/services/battle/BestiaryService";
import templeDb from "@/lib/databases/TempleDb";

/**
 * A temple combat room names one beast on the room screen and the battle must load that same beast
 * (the rule is src/lib/services/temples/RoomBeast.ts). The bug this guards: the room said "Dust Bunny King"
 * and the fight loaded "Homework Hydra", a random beast from the whole bestiary.
 */

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  default: { getTempleById: jest.fn() },
  templeStorage: {},
  TempleDb: class {},
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTaskById = jest.fn().mockResolvedValue(null);
  },
  achievementStorage: {},
}));
jest.mock("@/lib/databases/BestiaryDb", () => {
  class MockBestiaryDb {
    getBeasts = jest.fn().mockResolvedValue([]);
    getBeastById = jest.fn().mockResolvedValue(null);
  }
  return { __esModule: true, default: MockBestiaryDb, beastStorage: {} };
});
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  __esModule: true,
  questRewards: jest.fn().mockReturnValue(null),
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const getTempleById = templeDb.getTempleById as jest.Mock;

const beast = (id: string, name: string, element: string): Beast => ({ id, name, checklist: [], element });

const dustBunnyKing = beast("beast-dust-bunny-king", "Dust Bunny King", "earth");
const weedWyrm = beast("beast-weed-wyrm", "Weed Wyrm", "earth");
const homeworkHydra = beast("beast-homework-hydra", "Homework Hydra", "light");

const enemyOf = (b: Beast): Enemy => ({
  id: String(b.id),
  name: b.name,
  type: "beast",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 8,
  tasks: [],
});

/** A bestiary holding these beasts; loadRandomBeast would hand out Homework Hydra, the old wrong answer. */
const bestiaryWith = (beasts: Beast[]) => {
  const fake = {
    listBeasts: jest.fn().mockResolvedValue(beasts),
    loadBeastById: jest.fn(async (id: string) => {
      const found = beasts.find((b) => String(b.id) === id);
      return found ? enemyOf(found) : null;
    }),
    loadRandomBeast: jest.fn().mockResolvedValue(enemyOf(homeworkHydra)),
    createSampleEnemy: jest.fn().mockReturnValue({ ...enemyOf(homeworkHydra), id: "sample", name: "Training Dummy" }),
  };
  return { fake, service: fake as unknown as BestiaryService };
};

const layout = (content: Record<string, unknown> = { monsterType: "small", beasts: [] }) => ({
  entrance: [0, 0],
  maze: { "1F": [["R0000"], ["M0001"]] },
  rooms: { R0000: { type: "entrance" }, M0001: { type: "monster", content } },
});

const temple = (extra: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  id: "earth-temple",
  categoryIds: [],
  dungeonLayout: layout(content),
  ...extra,
});

const ctx: BattleContext = { kind: "temple", userId: "u1", templeId: "earth-temple", level: "1F", x: 0, y: 1, beastIds: [] };

describe("loadEncounter for a temple combat room", () => {
  beforeEach(() => {
    getTempleById.mockReset();
  });

  it("fights the beast the room screen shows: the element's beasts indexed by row plus column", async () => {
    getTempleById.mockResolvedValue(temple());
    const { fake, service } = bestiaryWith([dustBunnyKing, weedWyrm, homeworkHydra]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.enemies).toHaveLength(1);
    expect(encounter.enemies[0].name).toBe("Weed Wyrm");
    expect(encounter.label).toBe("Weed Wyrm");
    expect(fake.loadRandomBeast).not.toHaveBeenCalled();
    expect(fake.createSampleEnemy).not.toHaveBeenCalled();
  });

  it("fights the room's stand-in when the bestiary has no beast of the element", async () => {
    getTempleById.mockResolvedValue(temple());
    const { fake, service } = bestiaryWith([homeworkHydra]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.enemies).toHaveLength(1);
    expect(encounter.enemies[0]).toMatchObject({ name: "Rock Golem", avatar: 27, type: "beast", isBoss: false });
    expect(encounter.enemies[0].tasks).toEqual([]);
    expect(encounter.enemies[0].id).toBe("stand-in-rock-golem");
    expect(fake.loadRandomBeast).not.toHaveBeenCalled();
    expect(fake.createSampleEnemy).not.toHaveBeenCalled();
  });

  it("fights the stand-in of an empty bestiary, never a Training Dummy", async () => {
    getTempleById.mockResolvedValue(temple());
    const { fake, service } = bestiaryWith([]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.enemies[0].name).toBe("Rock Golem");
    expect(fake.createSampleEnemy).not.toHaveBeenCalled();
  });

  it("fights the beast a monsterType names", async () => {
    getTempleById.mockResolvedValue(temple({}, { monsterType: "HomeworkHydra", beasts: [] }));
    const { service } = bestiaryWith([dustBunnyKing, weedWyrm, homeworkHydra]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.enemies[0].name).toBe("Homework Hydra");
  });

  it("still loads an authored beast", async () => {
    getTempleById.mockResolvedValue(temple({}, { monsterType: "small", beasts: ["beast-homework-hydra"] }));
    const { fake, service } = bestiaryWith([dustBunnyKing, weedWyrm, homeworkHydra]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.enemies.map((e) => e.name)).toEqual(["Homework Hydra"]);
    expect(fake.loadBeastById).toHaveBeenCalledWith("beast-homework-hydra");
    expect(fake.listBeasts).not.toHaveBeenCalled();
    expect(fake.loadRandomBeast).not.toHaveBeenCalled();
  });

  it("takes a generated temple's own element", async () => {
    getTempleById.mockResolvedValue(temple({ id: "gen-x", element: "light" }));
    const { fake, service } = bestiaryWith([dustBunnyKing, weedWyrm, homeworkHydra]);

    const encounter = await loadEncounter({ ...ctx, templeId: "gen-x" }, service);

    expect(encounter.enemies[0].name).toBe("Homework Hydra");
    expect(fake.loadRandomBeast).not.toHaveBeenCalled();
  });

  it("keeps the room's rewards, background and boss flag", async () => {
    getTempleById.mockResolvedValue(temple({}, { monsterType: "small", beasts: [], xp: 5, gp: 6, bg1: 7, bg2: 8 }));
    const { service } = bestiaryWith([dustBunnyKing, weedWyrm]);

    const encounter = await loadEncounter(ctx, service);

    expect(encounter.rewards).toEqual({ xp: 5, gp: 6, ap: 0 });
    expect(encounter.background).toEqual({ bg1: 7, bg2: 8 });
    expect(encounter.roomKey).toBe("M0001");
    expect(encounter.boss).toBe(false);
  });

  it("still falls back to a random beast when the temple room is not there", async () => {
    getTempleById.mockResolvedValue(null);
    const { fake, service } = bestiaryWith([dustBunnyKing]);

    const encounter = await loadEncounter(ctx, service);

    expect(fake.loadRandomBeast).toHaveBeenCalledTimes(1);
    expect(encounter.enemies[0].name).toBe("Homework Hydra");
  });
});
