import { createPinia, setActivePinia } from "pinia";
import { loadEncounter } from "@/app/Console/BattleField/battle/encounterLoader";
import type { BattleContext } from "@/app/Console/BattleField/battle/battleContext";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { Enemy } from "@/lib/services/battle/BattleService";
import type { BestiaryService } from "@/lib/services/battle/BestiaryService";
import templeDb from "@/lib/databases/TempleDb";
import { useUserStore } from "@/lib/store/stores/user";

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
const mockGetTaskById = jest.fn();
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTaskById = (id: string) => mockGetTaskById(id);
  },
  achievementStorage: {},
}));
// The hero's quest board, as the temple run reads it (QuestEngine + their item effects)
const mockReadQuestBoard = jest.fn();
jest.mock("@/lib/engine/core/dungeons/templeSystem/questRooms", () => ({
  __esModule: true,
  readQuestBoard: (...args: unknown[]) => mockReadQuestBoard(...args),
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
  questRewards: (quest: { xp?: number; gp?: number; ap?: number }) => ({
    xp: Number(quest.xp) || 0,
    gp: Number(quest.gp) || 0,
    ap: Number(quest.ap) || 0,
  }),
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
    mockReadQuestBoard.mockReset();
    mockGetTaskById.mockReset();
  });

  it("never reads the quest board for a classic beast room", async () => {
    getTempleById.mockResolvedValue(temple());
    const { service } = bestiaryWith([dustBunnyKing, weedWyrm]);

    await loadEncounter(ctx, service);

    expect(mockReadQuestBoard).not.toHaveBeenCalled();
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

/**
 * A quest room's fight (docs/Quest-Rooms-Spec.md 7.4): the room resolves its quest from the hero's board (5.2) and the
 * fight is built as a board fight is: the quest's beast (questBeastId) or a stand-in of its tier, its checklist as the
 * attacks (the quest name when there is none), the quest's rewards, the tier (5.1) and the strike clock (5.5). The
 * encounter carries both the quest and the room key. A dormant room fights as today.
 */
describe("loadEncounter for a quest room", () => {
  const NOW = new Date();
  const dishGoblin: Beast = {
    id: "beast-dish-goblin",
    name: "Dish Goblin",
    element: "water",
    checklist: ["Scrape the plates", "Rinse and load them", "Add a pod and start it", "Wipe the counter"],
  };
  const bareBeast: Beast = { id: "beast-bare", name: "Bare Beast", element: "earth", checklist: [] };

  /** A bestiary that converts checklists to tasks the way BestiaryService does. */
  const familyBestiary = (beasts: Beast[]) => {
    const fake = {
      listBeasts: jest.fn().mockResolvedValue(beasts),
      loadBeastById: jest.fn(async (id: string) => {
        const found = beasts.find((b) => String(b.id) === id);
        if (!found) return null;
        return {
          ...enemyOf(found),
          tasks: found.checklist.map((name, index) => ({ id: `task-${index}`, name, isCompleted: false })),
        };
      }),
      loadRandomBeast: jest.fn().mockResolvedValue(enemyOf(homeworkHydra)),
      createSampleEnemy: jest.fn().mockReturnValue({ ...enemyOf(homeworkHydra), id: "sample", name: "Training Dummy" }),
    };
    return { fake, service: fake as unknown as BestiaryService };
  };

  const quest = (extra: Partial<Achievement> = {}): Achievement =>
    ({
      id: "q-dishes",
      achievementName: "Load the Dishwasher",
      type: "individual",
      assignee: ["u1"],
      basicSchedule: "daily",
      startsOn: new Date(2026, 0, 1).toISOString(),
      endsOn: "",
      beastId: "beast-dish-goblin",
      difficulty: 2,
      estimatedMinutes: 12,
      xp: 200,
      gp: 20,
      ap: 2,
      requiresApproval: false,
      ...extra,
    } as Achievement);

  const row = (q: Achievement, status: "open" | "done" | "notDue" = "open"): QuestBoardItem => ({
    quest: q,
    status,
    progress: null,
    pending: false,
    overdue: false,
  });

  const boardOf = (...quests: Achievement[]) => {
    mockReadQuestBoard.mockResolvedValue({ heroId: "u1", board: quests.map((q) => row(q)), liveQuests: quests });
  };

  const roomCtx: BattleContext = { kind: "temple", userId: "u1", templeId: "shadow-temple", level: "1F", x: 0, y: 1, beastIds: [] };
  const questTemple = (content: Record<string, unknown>, type = "monster") => ({
    id: "shadow-temple",
    categoryIds: [],
    dungeonLayout: {
      entrance: [0, 0],
      maze: { "1F": [["R0000"], ["Q0001"]] },
      rooms: { R0000: { type: "entrance" }, Q0001: { type, content } },
    },
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    getTempleById.mockReset();
    mockReadQuestBoard.mockReset();
    mockGetTaskById.mockReset();
  });

  it("fights the quest's beast with its checklist, pays the quest and ignores the room's own rewards", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes", xp: 5, gp: 6, ap: 1, bg1: 7, bg2: 8 }));
    boardOf(quest());
    const { service } = familyBestiary([dishGoblin, weedWyrm]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(mockReadQuestBoard).toHaveBeenCalledWith("u1", expect.any(Date));
    expect(encounter.quest?.id).toBe("q-dishes");
    expect(encounter.roomKey).toBe("Q0001");
    expect(encounter.rewards).toEqual({ xp: 200, gp: 20, ap: 2 });
    expect(encounter.background).toEqual({ bg1: 7, bg2: 8 });
    expect(encounter.label).toBe("Dish Goblin");
    const [enemy] = encounter.enemies;
    expect(enemy.name).toBe("Dish Goblin");
    expect(enemy.tasks?.map((task) => task.name)).toEqual(dishGoblin.checklist);
    // 12 minutes over 4 chores: 3 minutes a chore, the whole estimate on the first clock
    expect(enemy.attackCooldown).toBe(3);
    expect(enemy).toMatchObject({ isBoss: false, type: "beast", attack: 10 });
    expect(encounter.boss).toBe(false);
  });

  it("a quest of difficulty 3-5 is a miniboss that hits 1.2x; 8 and up a boss at 1.5x with the boss theme", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
    const { service } = familyBestiary([dishGoblin]);

    boardOf(quest({ difficulty: 5 }));
    const miniboss = await loadEncounter(roomCtx, service);
    expect(miniboss.enemies[0]).toMatchObject({ type: "miniboss", isBoss: false });
    expect(miniboss.enemies[0].attack).toBeCloseTo(12);
    expect(miniboss.boss).toBe(false);

    boardOf(quest({ difficulty: 8 }));
    const boss = await loadEncounter(roomCtx, service);
    expect(boss.enemies[0].isBoss).toBe(true);
    expect(boss.enemies[0].attack).toBeCloseTo(15);
    expect(boss.boss).toBe(true);
  });

  it("the clock defaults from the difficulty when the parent gave no minutes", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
    boardOf(quest({ estimatedMinutes: undefined, difficulty: 8 })); // 20 minutes
    const { service } = familyBestiary([dishGoblin]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(encounter.enemies[0].attackCooldown).toBe(5);
  });

  it("a beast with no checklist is beaten by doing the chore itself, on the whole clock", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
    boardOf(quest({ beastId: "beast-bare" }));
    const { service } = familyBestiary([bareBeast]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(encounter.enemies[0].name).toBe("Bare Beast");
    expect(encounter.enemies[0].tasks?.map((task) => task.name)).toEqual(["Load the Dishwasher"]);
    expect(encounter.enemies[0].attackCooldown).toBe(12);
  });

  it("a library beast the family has not adopted fights as itself", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
    boardOf(quest({ beastId: "beast-suds-serpent" }));
    const { service } = familyBestiary([]);

    const encounter = await loadEncounter(roomCtx, service);

    const [enemy] = encounter.enemies;
    expect(enemy).toMatchObject({ id: "beast-suds-serpent", name: "Suds Serpent", avatar: 105 });
    expect(enemy.tasks).toHaveLength(4);
    expect(enemy.attackCooldown).toBe(3);
  });

  it("a quest marked No beast fights a stand-in of its tier, with the chore as its move", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
    boardOf(quest({ beastId: "", noBeast: true, difficulty: 5 }));
    const { fake, service } = familyBestiary([dishGoblin]);

    const encounter = await loadEncounter(roomCtx, service);

    const [enemy] = encounter.enemies;
    expect(enemy.name).toBe("Dark Phantom"); // the shadow temple's miniboss stand-in
    expect(enemy).toMatchObject({ type: "miniboss", avatar: 41 });
    expect(enemy.tasks?.map((task) => task.name)).toEqual(["Load the Dishwasher"]);
    expect(enemy.attackCooldown).toBe(12);
    expect(fake.loadRandomBeast).not.toHaveBeenCalled();
  });

  it("a shipped template room fights the family quest whose beast is the template's", async () => {
    const template = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    getTempleById.mockResolvedValue(questTemple({ quest: template, xp: 5 }));
    boardOf(quest({ beastId: "beast-dish-goblin" }));
    const { service } = familyBestiary([dishGoblin]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(encounter.quest?.id).toBe("q-dishes");
    expect(encounter.rewards).toEqual({ xp: 200, gp: 20, ap: 2 });
  });

  it("a dormant room (no family quest fills it) fights its template beast with the room's rewards, as today", async () => {
    const template = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    getTempleById.mockResolvedValue(questTemple({ quest: template, xp: 5, gp: 6 }));
    boardOf(quest({ id: "q-other", beastId: "beast-weed-wyrm" }));
    const { service } = familyBestiary([dishGoblin, weedWyrm]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(encounter.quest).toBeUndefined();
    expect(encounter.enemies[0].name).toBe("Dish Goblin");
    expect(encounter.enemies[0].attackCooldown).toBeUndefined();
    expect(encounter.rewards).toEqual({ xp: 5, gp: 6, ap: 0 });
    expect(encounter.roomKey).toBe("Q0001");
  });

  it("a board that cannot be read leaves the room to the classic rules", async () => {
    getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes", beasts: ["beast-weed-wyrm"] }));
    mockReadQuestBoard.mockResolvedValue(null);
    const { service } = familyBestiary([dishGoblin, weedWyrm]);

    const encounter = await loadEncounter(roomCtx, service);

    expect(encounter.quest).toBeUndefined();
    expect(encounter.enemies[0].name).toBe("Weed Wyrm");
  });

  describe("the grudge (docs/Quest-Rooms-Spec.md 5.7)", () => {
    const hero = (questGrudges?: Record<string, unknown>) =>
      useUserStore().addUser({ id: "u1", name: { nick: "Max" }, stats: {}, ...(questGrudges ? { questGrudges } : {}) });

    beforeEach(() => {
      getTempleById.mockResolvedValue(questTemple({ questId: "q-dishes" }));
      boardOf(quest());
    });

    it("is 1 for a hero the beast holds nothing against, and the beast shows no marks", async () => {
      hero();
      const encounter = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);

      expect(encounter.grudge).toBe(1);
      expect(encounter.enemies[0].grudgeMarks).toBeUndefined();
    });

    it.each([
      [1, 1.25],
      [2, 1.5],
      [3, 1.75],
    ])("puts %i marks on the beast and a factor of %s on the fight", async (marks, factor) => {
      hero({ "q-dishes": { marks, lastFledAt: 5 } });
      const encounter = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);

      expect(encounter.grudge).toBe(factor);
      expect(encounter.enemies[0].grudgeMarks).toBe(marks);
    });

    it("reads this quest's marks and no other quest's", async () => {
      hero({ "q-other": { marks: 3 } });
      const encounter = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);
      expect(encounter.grudge).toBe(1);
    });

    it("reads this hero's marks, not a sibling's", async () => {
      hero();
      useUserStore().addUser({ id: "u2", name: { nick: "Mia" }, stats: {}, questGrudges: { "q-dishes": { marks: 3 } } });
      const encounter = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);
      expect(encounter.grudge).toBe(1);
    });

    it("is tolerant of a hero who is not loaded and a record that holds nonsense", async () => {
      const unloaded = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);
      expect(unloaded.grudge).toBe(1);

      hero({ "q-dishes": { marks: 99 } });
      const absurd = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);
      expect(absurd.grudge).toBe(1.75);
      expect(absurd.enemies[0].grudgeMarks).toBe(3);
    });

    it("keeps the rest of the fight as it was: the quest, its rewards, its clock and the beast's attack", async () => {
      hero({ "q-dishes": { marks: 2 } });
      const encounter = await loadEncounter(roomCtx, familyBestiary([dishGoblin]).service);

      expect(encounter.quest?.id).toBe("q-dishes");
      expect(encounter.roomKey).toBe("Q0001");
      expect(encounter.rewards).toEqual({ xp: 200, gp: 20, ap: 2 });
      expect(encounter.enemies[0]).toMatchObject({ attack: 10, attackCooldown: 3 });
    });

    it("a dormant or classic room carries no grudge", async () => {
      hero({ "q-dishes": { marks: 3 } });
      getTempleById.mockResolvedValue(questTemple({ quest: { beastId: "beast-weed-wyrm", difficulty: 2, basicSchedule: "daily" } }));
      const encounter = await loadEncounter(roomCtx, familyBestiary([weedWyrm]).service);
      expect(encounter.quest).toBeUndefined();
      expect(encounter.grudge).toBeUndefined();
      expect(encounter.enemies[0].grudgeMarks).toBeUndefined();
    });
  });
});

/** A board fight (and a quest ambush, which is one) builds the same fight a quest room does. */
describe("loadEncounter for a quest from the board", () => {
  const questCtx: BattleContext = { kind: "quest", userId: "u1", questId: "q-dishes", beastIds: [] };
  const familyBestiary = (beasts: Beast[]) =>
    ({
      listBeasts: jest.fn().mockResolvedValue(beasts),
      loadBeastById: jest.fn(async (id: string) => {
        const found = beasts.find((b) => String(b.id) === id);
        return found
          ? { ...enemyOf(found), tasks: found.checklist.map((name, index) => ({ id: `t${index}`, name, isCompleted: false })) }
          : null;
      }),
      loadRandomBeast: jest.fn().mockResolvedValue(enemyOf(homeworkHydra)),
      createSampleEnemy: jest.fn(),
    } as unknown as BestiaryService);

  beforeEach(() => {
    setActivePinia(createPinia());
    mockGetTaskById.mockReset();
    mockReadQuestBoard.mockReset();
  });

  it("a board fight (and so an ambush) carries the hero's grudge: marks on the beast and the factor on the fight", async () => {
    useUserStore().addUser({ id: "u1", name: { nick: "Max" }, stats: {}, questGrudges: { "q-dishes": { marks: 2 } } });
    mockGetTaskById.mockResolvedValue({
      id: "q-dishes",
      achievementName: "Wash the dishes by hand",
      beastId: "beast-dish-goblin",
      difficulty: 2,
      xp: 200,
      gp: 20,
      ap: 2,
    });
    const dishGoblin: Beast = { id: "beast-dish-goblin", name: "Dish Goblin", element: "water", checklist: ["Scrape", "Rinse"] };

    const encounter = await loadEncounter(questCtx, familyBestiary([dishGoblin]));

    expect(encounter.grudge).toBe(1.5);
    expect(encounter.enemies[0].grudgeMarks).toBe(2);
  });

  it("a board fight with no marks carries a factor of 1", async () => {
    useUserStore().addUser({ id: "u1", name: { nick: "Max" }, stats: {} });
    mockGetTaskById.mockResolvedValue({ id: "q-dishes", achievementName: "Dishes", beastId: "", difficulty: 1, xp: 100, gp: 10, ap: 1 });

    const encounter = await loadEncounter(questCtx, familyBestiary([]));

    expect(encounter.grudge).toBe(1);
    expect(encounter.enemies[0].grudgeMarks).toBeUndefined();
  });

  it("a quest that has gone fights a random beast with no grudge at all", async () => {
    mockGetTaskById.mockResolvedValue(null);
    const encounter = await loadEncounter(questCtx, familyBestiary([]));
    expect(encounter.grudge).toBeUndefined();
  });

  it("a quest with no beast of its own fights the beast the library suggests, on the quest's clock", async () => {
    mockGetTaskById.mockResolvedValue({
      id: "q-dishes",
      achievementName: "Wash the dishes by hand",
      beastId: "",
      difficulty: 3,
      estimatedMinutes: 20,
      xp: 300,
      gp: 30,
      ap: 3,
    });

    const encounter = await loadEncounter(questCtx, familyBestiary([]));

    expect(encounter.quest?.id).toBe("q-dishes");
    expect(encounter.rewards).toEqual({ xp: 300, gp: 30, ap: 3 });
    const [enemy] = encounter.enemies;
    expect(enemy.name).toBe("Suds Serpent");
    expect(enemy.attackCooldown).toBe(5);
    expect(enemy.type).toBe("miniboss");
    expect(mockReadQuestBoard).not.toHaveBeenCalled();
  });

  it("a quest marked No beast fights a stand-in of its tier named for no temple", async () => {
    mockGetTaskById.mockResolvedValue({
      id: "q-piano",
      achievementName: "Practice piano",
      beastId: "",
      noBeast: true,
      difficulty: 1,
      xp: 100,
      gp: 10,
      ap: 1,
    });

    const encounter = await loadEncounter({ ...questCtx, questId: "q-piano" }, familyBestiary([]));

    const [enemy] = encounter.enemies;
    expect(enemy).toMatchObject({ name: "Dust Bunny", avatar: 74, isBoss: false });
    expect(enemy.tasks?.map((task) => task.name)).toEqual(["Practice piano"]);
    expect(enemy.attackCooldown).toBe(3);
  });

  it("still falls back to a random beast when the quest is gone", async () => {
    mockGetTaskById.mockResolvedValue(null);
    const bestiary = familyBestiary([]);

    const encounter = await loadEncounter(questCtx, bestiary);

    expect(encounter.quest).toBeUndefined();
    expect(encounter.enemies[0].name).toBe("Homework Hydra");
  });
});
