/**
 * Moving Out replaces the Old House. The wizard opens on Moving Out from the family's moving answers and their open
 * moving chores (movingOutPrefill.ts); building the tower retires the Old House (projectService.retireOldHouse): its
 * temple record, the heroes' walks in it and the open chores the tower carried go, every paid or waiting chore and the
 * whole log stay; and the Hometown spot hides once a Moving Out project stands (oldHouse.ts).
 */
import { addDays } from "date-fns";
import AchievementDb, { type Achievement } from "@/lib/databases/AchievementDb";
import { QuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { TempleDb } from "@/lib/databases/TempleDb";
import { TempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { DEFAULT_MOVING_ROOMS, buildMovingPack } from "@/lib/services/core/packs/movingPack";
import { dateKey, nearestDifficulty, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import { MOVING_OUT } from "@/lib/services/core/packs/projects/movingOut";
import { carriedQuestIds, openMoveQuests, prefillMovingOut } from "@/lib/services/projects/movingOutPrefill";
import { OLD_HOUSE_ID, showsOldHouse } from "@/lib/services/projects/oldHouse";
import { suggestChores } from "@/lib/services/projects/projectChores";
import { ROOF_PHASE_ID } from "@/lib/services/projects/projectSchedule";
import { readMovingOutPrefill, retireOldHouse } from "@/lib/services/projects/projectService";
import { buildProjectTower } from "@/lib/services/projects/projectTower";
import { towerInputOf } from "@/lib/services/projects/projectWizard";
import { SIX, TWELVE, answers } from "./movingHouseFixtures";

jest.mock("@/lib/services/quests/QuestCompletionService", () => ({ applyQuestRewards: jest.fn() }));

const GIVEN = answers();
const TODAY = GIVEN.today!;
const HEROES = GIVEN.heroes;
const PACK = buildMovingPack(GIVEN);
const OUT_PHASES = MOVING_OUT.phases.map((phase) => phase.id);

const phaseOf = (quest: Achievement): string => quest.categoryId.replace("cat-move-", "");
const inPhases = (phases: readonly string[]) => PACK.quests.filter((quest) => phases.includes(phaseOf(quest)));
/** The pack's quests the tower takes in, and the ones it leaves on the board */
const TOWER_QUESTS = inPhases(OUT_PHASES);
const BOARD_QUESTS = PACK.quests.filter((quest) => !OUT_PHASES.includes(phaseOf(quest)));

const choreIdOf = (quest: Achievement): string => `${phaseOf(quest)}:custom-${quest.id}`;
const ids = (quests: readonly Achievement[]): string[] => quests.map((quest) => String(quest.id)).sort();

describe("prefillMovingOut", () => {
  it("opens on Moving Out with the rooms and the basement the family answered", () => {
    const rooms = { kitchen: 1, bedroom: 2, storage: 1 };
    const draft = prefillMovingOut({ ...GIVEN, rooms, basement: true }, [], HEROES);

    expect(draft.typeId).toBe("moving-out");
    expect(draft.house.rooms).toEqual(rooms);
    expect(draft.house.basement).toBe(true);
    expect(draft.endOn).toBe(dateKey(addDays(parseLocalDate(TODAY), MOVING_OUT.defaultDays)));
  });

  it("counts a basement only while storage is ticked, and never changes the answers it was given", () => {
    const given = { ...GIVEN, rooms: { kitchen: 1 }, basement: true };
    const draft = prefillMovingOut(given, [], HEROES);
    draft.house.rooms.kitchen = 9;

    expect(draft.house.basement).not.toBe(true);
    expect(given.rooms).toEqual({ kitchen: 1 });
  });

  it("takes the usual house when there are no answers", () => {
    const draft = prefillMovingOut(null, [], HEROES);

    expect(draft.typeId).toBe("moving-out");
    expect(draft.house.rooms).toEqual(DEFAULT_MOVING_ROOMS);
    expect(draft.endOn).toBe(dateKey(addDays(new Date(), MOVING_OUT.defaultDays)));
  });

  it("is the type's own suggestions for the house while no moving chore is open", () => {
    const draft = prefillMovingOut(GIVEN, [], HEROES);

    expect(draft.chores).toEqual(suggestChores(MOVING_OUT, draft.house, HEROES));
    expect(draft.chores.some((chore) => chore.custom)).toBe(false);
  });

  it("turns each open moving chore into a custom chore on its phase, keeping its name, size, beast and assignee", () => {
    const draft = prefillMovingOut(GIVEN, TOWER_QUESTS, HEROES);

    expect(TOWER_QUESTS.length).toBeGreaterThan(10);
    for (const quest of TOWER_QUESTS) {
      const chore = draft.chores.find((each) => each.id === choreIdOf(quest));
      expect(chore).toMatchObject({
        phaseId: phaseOf(quest),
        roomId: "house",
        name: quest.achievementName,
        difficulty: nearestDifficulty(quest.difficulty),
        assignee: quest.assignee,
        beastId: quest.beastId,
        minutes: quest.estimatedMinutes,
        custom: true,
      });
    }
  });

  it("leaves out the camp, unpack and moving day chores, which stay on the board", () => {
    const draft = prefillMovingOut(GIVEN, PACK.quests, HEROES);

    const phases = new Set(BOARD_QUESTS.map(phaseOf));
    expect(["camp", "unpack"].every((phase) => phases.has(phase))).toBe(true);
    expect(carriedQuestIds(draft).sort()).toEqual(ids(TOWER_QUESTS));
  });

  it("lists only the open chores on a floor that has some, and keeps the suggestions on one that has none", () => {
    const declutter = inPhases(["declutter"]);
    const draft = prefillMovingOut(GIVEN, declutter, HEROES);
    const suggested = suggestChores(MOVING_OUT, draft.house, HEROES);

    const onDeclutter = draft.chores.filter((chore) => chore.phaseId === "declutter");
    expect(onDeclutter.map((chore) => chore.id)).toEqual(declutter.map(choreIdOf));
    for (const phase of ["quiet", "living", "last", ROOF_PHASE_ID]) {
      expect(draft.chores.filter((chore) => chore.phaseId === phase)).toEqual(suggested.filter((chore) => chore.phaseId === phase));
    }
  });

  it("keeps the floors in order with the one finale last", () => {
    const draft = prefillMovingOut(GIVEN, [...TOWER_QUESTS].reverse(), HEROES);

    const order = [...OUT_PHASES, ROOF_PHASE_ID];
    const ranks = draft.chores.map((chore) => order.indexOf(chore.phaseId));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(draft.chores.filter((chore) => chore.phaseId === ROOF_PHASE_ID)).toHaveLength(1);
    expect(draft.chores[draft.chores.length - 1].name).toBe("Hand Over the Keys");
  });

  it("ignores a chore that is not the pack's, or sits on a floor the tower does not have", () => {
    const own = { ...TOWER_QUESTS[0], id: "my-own-chore" };
    const stray = { ...TOWER_QUESTS[0], id: "move-stray", categoryId: "cat-move-nowhere" };
    const draft = prefillMovingOut(GIVEN, [own, stray], HEROES);

    expect(carriedQuestIds(draft)).toEqual([]);
    expect(draft.chores).toEqual(suggestChores(MOVING_OUT, draft.house, HEROES));
  });

  it.each([
    ["the whole pack open", PACK.quests],
    ["only the little one's chores open", PACK.quests.filter((quest) => quest.assignee.every((id) => id === SIX.id))],
    ["only the kid's chores open", PACK.quests.filter((quest) => quest.assignee.every((id) => id === TWELVE.id))],
  ])("makes a draft the wizard builds a tower from: %s", (_label, open) => {
    const draft = prefillMovingOut(GIVEN, open, HEROES);

    const input = towerInputOf(draft, { today: TODAY, now: new Date(2026, 9, 1, 9), heroes: HEROES });
    expect(() => buildProjectTower(input)).not.toThrow();
  });
});

const entry = (questId: string, extra: Partial<QuestLogEntry>): QuestLogEntry =>
  ({ id: `log-${questId}`, questId, userId: "dad", status: "approved", rewardsApplied: true, ...extra }) as QuestLogEntry;

describe("openMoveQuests", () => {
  const [paid, waiting, rejected, open] = TOWER_QUESTS;
  const log = [
    entry(String(paid.id), {}),
    entry(String(waiting.id), { status: "pending", rewardsApplied: false }),
    entry(String(rejected.id), { status: "rejected", rewardsApplied: false }),
  ];

  it("keeps the pack's chores nobody was paid for and nobody is waiting on", () => {
    const quests = openMoveQuests([...PACK.quests, { ...paid, id: "my-own-chore" }], log);

    expect(quests.map((quest) => String(quest.id))).not.toContain(String(paid.id));
    expect(quests.map((quest) => String(quest.id))).not.toContain(String(waiting.id));
    expect(quests.map((quest) => String(quest.id))).toEqual(expect.arrayContaining([String(rejected.id), String(open.id)]));
    expect(quests.map((quest) => String(quest.id))).not.toContain("my-own-chore");
  });

  it("is every move chore when the log is empty", () => {
    expect(ids(openMoveQuests(PACK.quests, []))).toEqual(ids(PACK.quests));
  });
});

describe("carriedQuestIds", () => {
  it("names the board chores still in the list, and not the ones the Game Master dropped or made", () => {
    const draft = prefillMovingOut(GIVEN, TOWER_QUESTS, HEROES);
    const [dropped, ...kept] = TOWER_QUESTS;
    const edited = {
      ...draft,
      chores: [
        ...draft.chores.filter((chore) => chore.id !== choreIdOf(dropped)),
        { id: "declutter:custom-1", phaseId: "declutter", roomId: "house", name: "Their own", difficulty: 3, assignee: [], custom: true },
      ],
    };

    expect(carriedQuestIds(edited).sort()).toEqual(ids(kept));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Retiring the Old House

const fakeStorage = () => {
  const data = new Map<string, unknown>();
  const storage = {
    create: async () => storage,
    get: async (key: string) => (data.has(key) ? data.get(key) : null),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      data.delete(key);
    },
    keys: async () => Array.from(data.keys()),
    clear: async () => data.clear(),
  };
  return storage;
};

const OTHER_TEMPLE = "wind-temple";

let stores: {
  projects: never;
  quests: AchievementDb;
  log: QuestLogDb;
  temples: TempleDb;
  progress: TempleProgressDb;
  engine: { forgetTempleRun: jest.Mock };
};

const present = async (quest: Achievement): Promise<boolean> => (await stores.quests.getTasks()).some((each) => each.id === quest.id);

const pay = (quest: Achievement, status: "approved" | "pending") =>
  stores.log.logCompletion({
    questId: String(quest.id),
    questName: quest.achievementName,
    userId: "dad",
    status,
    source: "claim",
    rewards: { xp: quest.xp, gp: quest.gp, ap: quest.ap },
    rewardsApplied: status === "approved",
  });

beforeEach(async () => {
  stores = {
    projects: undefined as never,
    quests: new AchievementDb(fakeStorage() as never),
    log: new QuestLogDb(fakeStorage() as never),
    temples: new TempleDb(fakeStorage() as never),
    progress: new TempleProgressDb(fakeStorage() as never),
    engine: { forgetTempleRun: jest.fn() },
  };
  for (const quest of PACK.quests) await stores.quests.set(String(quest.id), quest);
  await stores.temples.setTemple({ id: OLD_HOUSE_ID, name: "The Old House" } as never);
  await stores.temples.setTemple({ id: OTHER_TEMPLE, name: "Wind" } as never);
  await stores.progress.saveProgress({ userId: "twelve", templeId: OLD_HOUSE_ID } as never);
  await stores.progress.saveProgress({ userId: "six", templeId: OLD_HOUSE_ID } as never);
  await stores.progress.saveProgress({ userId: "twelve", templeId: OTHER_TEMPLE } as never);
});

describe("readMovingOutPrefill", () => {
  it("reads the board and the log: a chore that was paid is not carried into the tower", async () => {
    const [paid] = TOWER_QUESTS;
    await pay(paid, "approved");

    const draft = await readMovingOutPrefill(GIVEN, HEROES, stores as never);

    expect(draft.house.rooms).toEqual(GIVEN.rooms);
    expect(carriedQuestIds(draft)).not.toContain(String(paid.id));
    expect(carriedQuestIds(draft)).toHaveLength(TOWER_QUESTS.length - 1);
  });
});

describe("retireOldHouse", () => {
  const carried = ids(TOWER_QUESTS);

  it("removes the Old House temple record and no other temple", async () => {
    await retireOldHouse(carried, stores as never);

    expect(await stores.temples.getTempleById(OLD_HOUSE_ID)).toBeNull();
    expect(await stores.temples.getTempleById(OTHER_TEMPLE)).not.toBeNull();
  });

  it("forgets every hero's saved walk in it and the run the engine holds, and no other temple's", async () => {
    await retireOldHouse(carried, stores as never);

    expect(await stores.progress.getProgressForTemple(OLD_HOUSE_ID)).toEqual([]);
    expect(await stores.progress.getProgress("twelve", OTHER_TEMPLE)).not.toBeNull();
    expect(stores.engine.forgetTempleRun).toHaveBeenCalledWith(OLD_HOUSE_ID);
  });

  it("takes the open chores the tower carried off the board, and keeps the camp, unpack and moving day ones", async () => {
    await retireOldHouse(carried, stores as never);

    for (const quest of TOWER_QUESTS) expect(await present(quest)).toBe(false);
    for (const quest of BOARD_QUESTS) expect(await present(quest)).toBe(true);
  });

  it("keeps a chore that was paid or is waiting for approval since the tower was planned, and the whole log", async () => {
    const [paid, waiting, ...rest] = TOWER_QUESTS;
    await pay(paid, "approved");
    await pay(waiting, "pending");
    const before = await stores.log.getEntries();

    await retireOldHouse(carried, stores as never);

    expect(await present(paid)).toBe(true);
    expect(await present(waiting)).toBe(true);
    for (const quest of rest) expect(await present(quest)).toBe(false);
    expect(await stores.log.getEntries()).toEqual(before);
  });

  it("takes nothing off the board when the tower carried nothing", async () => {
    await retireOldHouse([], stores as never);

    expect((await stores.quests.getTasks()).length).toBe(PACK.quests.length);
    expect(await stores.temples.getTempleById(OLD_HOUSE_ID)).toBeNull();
  });

  it("is quiet when there is no Old House", async () => {
    await stores.temples.remove(OLD_HOUSE_ID);

    await expect(retireOldHouse([], stores as never)).resolves.toBeUndefined();
  });

  it("keeps going when one chore cannot be removed: the rest and the temple still go, and it never throws", async () => {
    const stuck = String(TOWER_QUESTS[0].id);
    const remove = stores.quests.remove.bind(stores.quests);
    jest.spyOn(stores.quests, "remove").mockImplementation(async (id: string) => {
      if (id === stuck) throw new Error("storage is full");
      return remove(id);
    });

    await expect(retireOldHouse(carried, stores as never)).resolves.toBeUndefined();

    expect(await present(TOWER_QUESTS[0])).toBe(true);
    expect(await present(TOWER_QUESTS[1])).toBe(false);
    expect(await stores.temples.getTempleById(OLD_HOUSE_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The Hometown spot

describe("showsOldHouse", () => {
  const standing = (typeId: string, status: string) => ({ typeId, status }) as never;

  it("shows the Old House while the family has its temple record and no tower", () => {
    expect(showsOldHouse(true, null)).toBe(true);
  });

  it("shows nothing without a record", () => {
    expect(showsOldHouse(false, null)).toBe(false);
  });

  it("hides once the active or the last cleared project is Moving Out", () => {
    expect(showsOldHouse(true, standing("moving-out", "active"))).toBe(false);
    expect(showsOldHouse(true, standing("moving-out", "cleared"))).toBe(false);
  });

  it("stays for another kind of project", () => {
    expect(showsOldHouse(true, standing("spring-cleaning", "active"))).toBe(true);
  });

  it("comes back after an abandoned Moving Out run only while the record is still there", () => {
    expect(showsOldHouse(true, standing("moving-out", "abandoned"))).toBe(true);
    expect(showsOldHouse(false, standing("moving-out", "abandoned"))).toBe(false);
  });
});
