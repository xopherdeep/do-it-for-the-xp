/**
 * The service that commits the progress rules (projectProgress.spec.ts has the rules): a paid chore settles its floor,
 * the shared bonus is paid through applyQuestRewards, the next floor's quests are woken and the roof finishes the
 * project; and starting, extending, abandoning and the reward's bookkeeping. The databases are the real classes over
 * in-memory storage, so what is saved is read back the way the app reads it; only the hero's pocket is faked.
 */
import AchievementDb, { type Achievement } from "@/lib/databases/AchievementDb";
import { ProjectDb } from "@/lib/databases/ProjectDb";
import { QuestLogDb } from "@/lib/databases/QuestLogDb";
import { TempleDb } from "@/lib/databases/TempleDb";
import { applyQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import { floorMultiplier } from "@/lib/services/projects/floorBonus";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { projectStartsOn } from "@/lib/services/projects/projectQuests";
import { phaseWindows } from "@/lib/services/projects/projectSchedule";
import { abandonProject, extendProject, markRewardGiven, markSeen, onEntryPaid, onQuestPaid, settleReadyFloors, startProject } from "@/lib/services/projects/projectService";
import { buildProjectTower } from "@/lib/services/projects/projectTower";
import { newProjectRecord } from "@/lib/services/projects/projectRecord";
import { FAMILIES, ROOM_SETS } from "./movingHouseFixtures";
import { SPRING, START, inputFor } from "./projectTowerFixtures";

jest.mock("@/lib/services/quests/QuestCompletionService", () => ({ applyQuestRewards: jest.fn() }));

const paidBonus = applyQuestRewards as jest.Mock;

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

const HEROES = FAMILIES[0][1];
const ROOMS = ROOM_SETS[0][1];
const REWARD = "Pizza night, your pick";

/** The real databases over in-memory storage: more than the service asks of them, so the specs can read back what it saved */
let stores: { projects: ProjectDb; quests: AchievementDb; log: QuestLogDb; temples: TempleDb };

beforeEach(() => {
  paidBonus.mockReset();
  stores = {
    projects: new ProjectDb(fakeStorage() as never),
    quests: new AchievementDb(fakeStorage() as never),
    log: new QuestLogDb(fakeStorage() as never),
    temples: new TempleDb(fakeStorage() as never),
  };
});

/** The default two weeks, or the dates given: a longer run leaves the last phase, and so the roof, days to finish early in */
const begin = async (start = START, endOn?: string): Promise<ProjectRecord> => {
  const input = inputFor(SPRING, ROOMS, HEROES, start);
  return startProject(endOn ? { ...input, windows: phaseWindows(SPRING.phases, start, endOn) } : input, REWARD, stores);
};

const active = async (): Promise<ProjectRecord> => (await stores.projects.getActive())!;

const floorOf = (project: ProjectRecord, floorKey: string): ProjectFloor => project.floors.find((floor) => floor.floorKey === floorKey)!;

const questsOf = async (floor: ProjectFloor): Promise<Achievement[]> => {
  const all = await stores.quests.getTasks();
  return floor.questIds.map((id) => all.find((quest) => String(quest.id) === id)!);
};

/** A chore paid to its first assignee on `day` at noon (a local time, as the quest log stamps it) */
const payQuest = async (quest: Achievement, day: string, userId = quest.assignee[0]) => {
  const [year, month, date] = day.split("-").map(Number);
  return stores.log.logCompletion({
    questId: String(quest.id),
    questName: quest.achievementName,
    userId,
    status: "approved",
    source: "claim",
    rewards: { xp: quest.xp, gp: quest.gp, ap: quest.ap },
    rewardsApplied: true,
    completedAt: new Date(year, month - 1, date, 12).toISOString(),
  });
};

/** Pays every chore of the floor on `day`, the last one through onQuestPaid, as the claim does; returns what that settled */
const clearFloor = async (project: ProjectRecord, floorKey: string, day: string, at = "2027-04-04T12:00:00.000Z") => {
  const quests = await questsOf(floorOf(project, floorKey));
  for (const quest of quests) await payQuest(quest, day);
  return onQuestPaid(quests[quests.length - 1], at, stores);
};

describe("onQuestPaid", () => {
  it("pays each grant through applyQuestRewards", async () => {
    const project = await begin();
    const first = floorOf(project, "1F");
    const quests = await questsOf(first);
    const at = "2027-04-04T12:00:00.000Z";

    const settlement = await clearFloor(project, "1F", "2027-04-04", at);

    // paid a couple of days before the floor's last day: the best multiplier
    const settled = floorOf(await active(), "1F");
    expect(settled.multiplier).toBe(floorMultiplier(first.window, "2027-04-04"));
    expect(settled.multiplier).toBe(2);
    const workers = [...new Set(quests.map((quest) => quest.assignee[0]))];
    expect(Object.keys(settlement!.grants).sort()).toEqual([...workers].sort());
    for (const hero of workers) {
      expect(paidBonus).toHaveBeenCalledWith(hero, { ...settlement!.grants[hero], ap: 0 }, `project:${project.id}:1F`, at, "Floor bonus: Declutter");
    }
    expect(paidBonus).toHaveBeenCalledTimes(workers.length);
    // x2: the bonus is as big as the floor's own XP and GP, and AP is never in it
    const paidXp = paidBonus.mock.calls.reduce((total, call) => total + call[1].xp, 0);
    const paidGp = paidBonus.mock.calls.reduce((total, call) => total + call[1].gp, 0);
    expect(paidXp).toBe(quests.reduce((total, quest) => total + quest.xp, 0));
    expect(paidGp).toBe(quests.reduce((total, quest) => total + quest.gp, 0));
    paidBonus.mock.calls.forEach((call) => expect(call[1].ap).toBe(0));
  });

  it("wakes the next floor: the record and its quests", async () => {
    const project = await begin();
    const settlement = await clearFloor(project, "1F", "2027-04-04");

    expect(settlement?.wake).toBe("2F");
    const saved = await active();
    expect(floorOf(saved, "1F").clearedAt).toBeDefined();
    expect(floorOf(saved, "1F").bonusPaidAt).toBeDefined();
    const woken = floorOf(saved, "2F").wokenAt!;
    expect(woken).toBeDefined();
    const second = await questsOf(floorOf(saved, "2F"));
    expect(second.length).toBeGreaterThan(0);
    second.forEach((quest) => expect(quest.project?.wokenAt).toBe(woken));
    // the floors above stay asleep
    expect(floorOf(saved, "3F").wokenAt).toBeUndefined();
    (await questsOf(floorOf(saved, "3F"))).forEach((quest) => expect(quest.project?.wokenAt).toBeUndefined());
  });

  it("settles nothing while a chore of the floor is still to pay", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    await payQuest(quests[0], "2027-04-04");
    expect(await onQuestPaid(quests[0], "2027-04-04T12:00:00.000Z", stores)).toBeNull();
    expect(paidBonus).not.toHaveBeenCalled();
    expect(await active()).toEqual(project);
  });

  it("settles a floor once, even when two phones pay at the same time", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    for (const quest of quests) await payQuest(quest, "2027-04-04");
    const last = quests[quests.length - 1];
    const both = await Promise.all([onQuestPaid(last, "2027-04-04T12:00:00.000Z", stores), onQuestPaid(last, "2027-04-04T12:00:01.000Z", stores)]);
    expect(both.filter(Boolean)).toHaveLength(1);
    const paidOnce = paidBonus.mock.calls.length;
    expect(paidOnce).toBeGreaterThan(0);
    expect(await onQuestPaid(last, "2027-04-04T12:00:02.000Z", stores)).toBeNull();
    expect(paidBonus).toHaveBeenCalledTimes(paidOnce);
  });

  it("pays no bonus for a floor cleared on its last day, and still opens the next", async () => {
    const project = await begin();
    const first = floorOf(project, "1F");
    const settlement = await clearFloor(project, "1F", first.window.dueOn);
    expect(settlement?.grants).toEqual({});
    expect(paidBonus).not.toHaveBeenCalled();
    expect(floorOf(await active(), "1F").multiplier).toBe(1);
    expect(floorOf(await active(), "2F").wokenAt).toBeDefined();
  });

  it("does nothing for a quest that is not a project chore, or one of a project that is not running", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    const plain = { id: "plain", achievementName: "Dishes" } as Achievement;
    const stranger = { ...quests[0], project: { ...quests[0].project!, projectId: "moving-out-2027-01-01" } };
    expect(await onQuestPaid(plain, "2027-04-04T12:00:00.000Z", stores)).toBeNull();
    expect(await onQuestPaid(stranger, "2027-04-04T12:00:00.000Z", stores)).toBeNull();
    await abandonProject(stores);
    expect(await onQuestPaid(quests[0], "2027-04-04T12:00:00.000Z", stores)).toBeNull();
  });

  it("settles a floor whose earlier settling failed on the next payment, wherever it is", async () => {
    const project = await begin();
    const first = await questsOf(floorOf(project, "1F"));
    for (const quest of first) await payQuest(quest, "2027-04-04");
    // the record cannot be saved this once (the quests of 2F were woken just before): the floor is cleared, unsettled
    jest.spyOn(stores.projects, "save").mockRejectedValueOnce(new Error("the storage is full"));
    await expect(onQuestPaid(first[first.length - 1], "2027-04-04T12:00:00.000Z", stores)).rejects.toThrow("the storage is full");
    expect(floorOf(await active(), "1F").clearedAt).toBeUndefined();
    expect(paidBonus).not.toHaveBeenCalled();

    // a chore of another floor is paid: that payment settles 1F too
    const [elsewhere] = await questsOf(floorOf(project, "2F"));
    await payQuest(elsewhere, "2027-04-08");
    const settlement = await onQuestPaid(elsewhere, "2027-04-08T12:00:00.000Z", stores);

    expect(settlement?.floors.map((floor) => floor.floorKey)).toEqual(["1F"]);
    expect(settlement?.wake).toBe("2F");
    const saved = await active();
    expect(floorOf(saved, "1F").clearedAt).toBeDefined();
    expect(floorOf(saved, "2F").wokenAt).toBeDefined();
    expect(paidBonus).toHaveBeenCalledWith(expect.any(String), expect.any(Object), `project:${project.id}:1F`, "2027-04-08T12:00:00.000Z", "Floor bonus: Declutter");
    // and not settled a second time by the next one
    const paidOnce = paidBonus.mock.calls.length;
    expect(await onQuestPaid(elsewhere, "2027-04-08T12:00:01.000Z", stores)).toBeNull();
    expect(paidBonus).toHaveBeenCalledTimes(paidOnce);
  });

  it("climbs every floor and finishes on the roof", async () => {
    const project = await begin(START, "2027-05-30");
    for (const floor of project.floors) await clearFloor(await active(), floor.floorKey, floor.window.opensOn);

    expect(await stores.projects.getActive()).toBeNull();
    const done = (await stores.projects.getAll())[0];
    expect(done.status).toBe("cleared");
    expect(done.clearedAt).toBeDefined();
    expect(done.reward.earnedAt).toBe(done.clearedAt);
    expect(done.reward.text).toBe(REWARD);
    expect(done.floors.every((floor) => floor.clearedAt && floor.bonusPaidAt)).toBe(true);
    expect((await stores.projects.lastOfType("spring-cleaning"))?.id).toBe(done.id);
    // each floor's bonus is named for its phase; the roof has no phase, so it is named for the roof
    const labels = paidBonus.mock.calls.map((call) => `${call[2].split(":").pop()} ${call[4]}`);
    expect(new Set(labels)).toEqual(new Set(["1F Floor bonus: Declutter", "2F Floor bonus: Deep Clean", "3F Floor bonus: Organize", "4F Floor bonus: Final Inspection", "5F Floor bonus: The Roof"]));
  });
});

describe("onEntryPaid", () => {
  it("settles a floor from the chore's id, the way an approval has it", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    for (const quest of quests) await payQuest(quest, "2027-04-04");
    const settlement = await onEntryPaid(String(quests[quests.length - 1].id), "2027-04-04T12:00:00.000Z", stores);
    expect(settlement?.wake).toBe("2F");
    expect(paidBonus).toHaveBeenCalled();
    expect(floorOf(await active(), "2F").wokenAt).toBeDefined();
  });

  it("still settles what is ready when the chore that was approved has been deleted", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    for (const quest of quests) await payQuest(quest, "2027-04-04");
    const approved = quests[quests.length - 1];
    await stores.quests.remove(String(approved.id));
    const settlement = await onEntryPaid(String(approved.id), "2027-04-04T12:00:00.000Z", stores);
    expect(settlement?.floors.map((floor) => floor.floorKey)).toEqual(["1F"]);
    expect(floorOf(await active(), "2F").wokenAt).toBeDefined();
  });

  it("reads nothing for a plain chore, and settles nothing for a project chore that is gone", async () => {
    await begin();
    const read = jest.spyOn(stores.quests, "get");
    expect(await onEntryPaid("dishes", "2027-04-04T12:00:00.000Z", stores)).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(await onEntryPaid("pq-spring-cleaning-2027-04-03-gone", "2027-04-04T12:00:00.000Z", stores)).toBeNull();
    expect(paidBonus).not.toHaveBeenCalled();
  });
});

describe("settleReadyFloors", () => {
  it("settles a floor emptied by deleting its last open chore", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    const open = quests[quests.length - 1];
    for (const quest of quests.slice(0, -1)) await payQuest(quest, "2027-04-04");
    // nothing is settled while the last chore is still there to do
    expect(await settleReadyFloors(new Date(2027, 3, 5, 18), stores)).toBeNull();

    await stores.quests.remove(String(open.id));
    const settlement = await settleReadyFloors(new Date(2027, 3, 5, 18), stores);

    expect(settlement?.floors.map((floor) => floor.floorKey)).toEqual(["1F"]);
    expect(settlement?.wake).toBe("2F");
    const saved = await active();
    expect(floorOf(saved, "1F").clearedAt).toBe(new Date(2027, 3, 5, 18).toISOString());
    expect(floorOf(saved, "1F").multiplier).toBe(2);
    (await questsOf(floorOf(saved, "2F"))).forEach((quest) => expect(quest.project?.wokenAt).toBe(floorOf(saved, "2F").wokenAt));
    const heroes = Object.keys(settlement!.grants);
    expect(heroes.length).toBeGreaterThan(0);
    expect(paidBonus).toHaveBeenCalledTimes(heroes.length);
    expect(paidBonus).toHaveBeenCalledWith(heroes[0], expect.objectContaining({ ap: 0 }), `project:${project.id}:1F`, new Date(2027, 3, 5, 18).toISOString(), "Floor bonus: Declutter");
  });

  it("settles a floor once, however often it is asked", async () => {
    const project = await begin();
    const quests = await questsOf(floorOf(project, "1F"));
    for (const quest of quests.slice(0, -1)) await payQuest(quest, "2027-04-04");
    await stores.quests.remove(String(quests[quests.length - 1].id));
    expect(await settleReadyFloors(new Date(2027, 3, 5, 18), stores)).not.toBeNull();
    const paidOnce = paidBonus.mock.calls.length;
    expect(await settleReadyFloors(new Date(2027, 3, 5, 19), stores)).toBeNull();
    expect(paidBonus).toHaveBeenCalledTimes(paidOnce);
  });

  it("settles nothing while every floor still has a chore to pay, or when no project is running", async () => {
    expect(await settleReadyFloors(new Date(2027, 3, 5, 18), stores)).toBeNull();
    const project = await begin();
    expect(await settleReadyFloors(new Date(2027, 3, 5, 18), stores)).toBeNull();
    expect(await active()).toEqual(project);
    expect(paidBonus).not.toHaveBeenCalled();
  });
});

describe("startProject", () => {
  it("saves the tower's temple, a quest for every chore and the record", async () => {
    const input = inputFor(SPRING, ROOMS, HEROES);
    const tower = buildProjectTower(input);
    const started = await startProject(input, REWARD, stores);

    expect(started).toEqual(newProjectRecord(tower, input, REWARD));
    expect(await stores.projects.getActive()).toEqual(started);
    expect(await stores.temples.getTempleById("gen-project-spring-cleaning")).toEqual(tower.record);
    const saved = await stores.quests.getTasks();
    expect(saved.map((quest) => String(quest.id)).sort()).toEqual(tower.quests.map((quest) => String(quest.id)).sort());
    expect(saved.find((quest) => quest.id === tower.quests[0].id)).toEqual(tower.quests[0]);
  });

  it("keeps the heroes, so a child's big chore waits for approval", async () => {
    await begin();
    const saved = await stores.quests.getTasks();
    expect(saved.some((quest) => quest.requiresApproval)).toBe(true);
    const withoutHeroes = buildProjectTower({ ...inputFor(SPRING, ROOMS, HEROES), heroes: undefined });
    expect(withoutHeroes.quests.some((quest) => quest.requiresApproval)).toBe(false);
  });

  it("refuses while one is active", async () => {
    await begin();
    const quests = (await stores.quests.getTasks()).length;
    await expect(begin("2027-05-01")).rejects.toThrow(/already/i);
    expect((await stores.projects.getAll())).toHaveLength(1);
    expect((await stores.quests.getTasks()).length).toBe(quests);
  });

  it("adds to what the family has, never wiping it", async () => {
    await stores.quests.set("dishes", { id: "dishes", achievementName: "Dishes" });
    await stores.temples.setTemple({ id: "wind-temple", categoryIds: [] });
    await begin();
    expect(await stores.quests.get("dishes")).toEqual({ id: "dishes", achievementName: "Dishes" });
    expect(await stores.temples.getTempleById("wind-temple")).not.toBeNull();
  });

  it("starts again after the last project was cleared, replacing the type's temple", async () => {
    const first = await begin();
    for (const floor of first.floors) await clearFloor(await active(), floor.floorKey, floor.window.opensOn);
    const next = await begin("2027-06-01");
    expect(next.status).toBe("active");
    const temple = await stores.temples.getTempleById("gen-project-spring-cleaning");
    expect(temple?.seed).toBe(`project:${next.id}`);
  });
});

describe("abandonProject", () => {
  it("deletes open project quests and the temple record and sets abandoned", async () => {
    const project = await begin();
    const [paid, ...rest] = await questsOf(floorOf(project, "1F"));
    await payQuest(paid, "2027-04-04");
    expect(rest.length).toBeGreaterThan(0);

    await abandonProject(stores);

    // the paid chore stays, with its log entry; every other chore of the project is gone
    const left = await stores.quests.getTasks();
    expect(left.map((quest) => String(quest.id))).toEqual([String(paid.id)]);
    expect(await stores.log.getEntries()).toHaveLength(1);
    expect(await stores.temples.getTempleById(project.templeId)).toBeNull();
    const kept = (await stores.projects.getAll())[0];
    expect(kept.status).toBe("abandoned");
    expect(kept.clearedAt).toBeUndefined();
    expect(kept.reward.earnedAt).toBeUndefined();
    expect(await stores.projects.getActive()).toBeNull();
    expect(await stores.projects.lastOfType("spring-cleaning")).toBeNull();
  });

  it("leaves the family's other quests and temples alone", async () => {
    await stores.quests.set("dishes", { id: "dishes", achievementName: "Dishes" });
    await stores.temples.setTemple({ id: "wind-temple", categoryIds: [] });
    await begin();
    await abandonProject(stores);
    expect(await stores.quests.get("dishes")).not.toBeNull();
    expect(await stores.temples.getTempleById("wind-temple")).not.toBeNull();
  });

  it("lets the next project start", async () => {
    await begin();
    await abandonProject(stores);
    await expect(begin("2027-05-01")).resolves.toMatchObject({ status: "active" });
  });

  it("is quiet when nothing is running", async () => {
    await expect(abandonProject(stores)).resolves.toBeUndefined();
  });
});

describe("extendProject", () => {
  it("rewrites uncleared floors' windows and their quests' startsOn and project.dueOn", async () => {
    const project = await begin();
    await clearFloor(project, "1F", "2027-04-04");
    const cleared = await active();
    const clearedQuests = await questsOf(floorOf(cleared, "1F"));

    const extended = await extendProject("2027-05-01", "2027-04-07", stores);

    expect(extended.endOn).toBe("2027-05-01");
    expect(await active()).toEqual(extended);
    // the cleared floor keeps its window, multiplier, bonus and quests
    expect(floorOf(extended, "1F")).toEqual(floorOf(cleared, "1F"));
    expect(await questsOf(floorOf(extended, "1F"))).toEqual(clearedQuests);
    // the others run from today to the new end, end to end
    const open = extended.floors.filter((floor) => !floor.clearedAt);
    expect(open.length).toBeGreaterThan(0);
    const phases = extended.floors.filter((floor) => floor.phaseId !== "roof" && !floor.clearedAt);
    expect(phases[0].window.opensOn).toBe("2027-04-07");
    expect(phases[phases.length - 1].window.dueOn).toBe("2027-05-01");
    // the roof takes the last phase's new window
    expect(floorOf(extended, "5F").window).toEqual(phases[phases.length - 1].window);
    for (const floor of open) {
      for (const quest of await questsOf(floor)) {
        expect(quest.startsOn).toBe(projectStartsOn(floor.window.opensOn));
        expect(quest.project?.dueOn).toBe(floor.window.dueOn);
      }
    }
    // the woken floor stays woken
    expect(floorOf(extended, "2F").wokenAt).toBe(floorOf(cleared, "2F").wokenAt);
  });

  it("refuses an end before today, and one too short for the floors left", async () => {
    await begin();
    const before = await active();
    await expect(extendProject("2027-04-06", "2027-04-07", stores)).rejects.toThrow(RangeError);
    await expect(extendProject("2027-04-08", "2027-04-07", stores)).rejects.toThrow(RangeError);
    expect(await active()).toEqual(before);
  });

  it("refuses a date that is not a real day, and writes nothing", async () => {
    await begin();
    const before = await active();
    const questsBefore = await stores.quests.getTasks();
    await expect(extendProject("2027-5-1", "2027-04-07", stores)).rejects.toThrow(RangeError);
    await expect(extendProject("2027-02-30", "2027-04-07", stores)).rejects.toThrow(RangeError);
    await expect(extendProject("2027-05-01", "next week", stores)).rejects.toThrow(RangeError);
    expect(await active()).toEqual(before);
    expect(await stores.quests.getTasks()).toEqual(questsBefore);
  });

  it("needs a running project", async () => {
    await expect(extendProject("2027-05-01", "2027-04-07", stores)).rejects.toThrow(/no project/i);
  });
});

describe("the reward and the credits", () => {
  const clearedRecord = (id: string, clearedAt: string, extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
    id,
    typeId: "spring-cleaning",
    templeId: "gen-project-spring-cleaning",
    status: "cleared",
    startOn: "2027-04-03",
    endOn: "2027-04-16",
    house: { rooms: {} },
    floors: [],
    chores: [],
    reward: { text: "Pizza", earnedAt: clearedAt, seenBy: [] },
    creditsSeenBy: [],
    clearedAt,
    ...extra,
  });

  it("marks the newest earned reward given, and no older one", async () => {
    await stores.projects.save(clearedRecord("older", "2027-04-16T12:00:00.000Z"));
    await stores.projects.save(clearedRecord("newer", "2027-06-16T12:00:00.000Z"));
    await markRewardGiven(stores);
    const all = await stores.projects.getAll();
    expect(all.find((record) => record.id === "newer")?.reward.givenAt).toEqual(expect.any(String));
    expect(all.find((record) => record.id === "older")?.reward.givenAt).toBeUndefined();
  });

  it("skips a reward already given, for the one before it", async () => {
    await stores.projects.save(clearedRecord("older", "2027-04-16T12:00:00.000Z"));
    await stores.projects.save(clearedRecord("newer", "2027-06-16T12:00:00.000Z", { reward: { text: "Pizza", earnedAt: "2027-06-16T12:00:00.000Z", givenAt: "2027-06-17T12:00:00.000Z", seenBy: [] } }));
    await markRewardGiven(stores);
    const all = await stores.projects.getAll();
    expect(all.find((record) => record.id === "older")?.reward.givenAt).toEqual(expect.any(String));
    expect(all.find((record) => record.id === "newer")?.reward.givenAt).toBe("2027-06-17T12:00:00.000Z");
  });

  it("adds a hero to the reveal and the credits of the newest cleared project, once", async () => {
    await stores.projects.save(clearedRecord("older", "2027-04-16T12:00:00.000Z"));
    await stores.projects.save(clearedRecord("newer", "2027-06-16T12:00:00.000Z"));
    await markSeen("twelve", "reward", stores);
    await markSeen("twelve", "reward", stores);
    await markSeen("twelve", "credits", stores);
    await markSeen("six", "credits", stores);
    const all = await stores.projects.getAll();
    const newer = all.find((record) => record.id === "newer")!;
    expect(newer.reward.seenBy).toEqual(["twelve"]);
    expect(newer.creditsSeenBy).toEqual(["twelve", "six"]);
    expect(all.find((record) => record.id === "older")).toEqual(clearedRecord("older", "2027-04-16T12:00:00.000Z"));
  });

  it("does nothing when no project has been cleared", async () => {
    await begin();
    const before = await stores.projects.getAll();
    await markRewardGiven(stores);
    await markSeen("twelve", "reward", stores);
    await markSeen("twelve", "credits", stores);
    expect(await stores.projects.getAll()).toEqual(before);
  });
});
