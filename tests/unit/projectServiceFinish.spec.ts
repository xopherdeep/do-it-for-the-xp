/**
 * The reads behind a project's finish (projectService.ts): the trophies, the quests and the log a run's credits are
 * read from, and the reward waiting for the Game Master. The databases are the real classes over in-memory storage.
 */
import AchievementDb, { type Achievement } from "@/lib/databases/AchievementDb";
import { ProjectDb } from "@/lib/databases/ProjectDb";
import { QuestLogDb } from "@/lib/databases/QuestLogDb";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { markRewardGiven, readFinish, readRewardToGive, readTrophies, type ProjectStores } from "@/lib/services/projects/projectService";

jest.mock("@/lib/services/quests/QuestCompletionService", () => ({ applyQuestRewards: jest.fn() }));

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

let stores: ProjectStores & { projects: ProjectDb; quests: AchievementDb; log: QuestLogDb };

beforeEach(() => {
  stores = {
    projects: new ProjectDb(fakeStorage() as never),
    quests: new AchievementDb(fakeStorage() as never),
    log: new QuestLogDb(fakeStorage() as never),
    temples: { setTemple: jest.fn(), remove: jest.fn() },
    progress: { getProgressForTemple: jest.fn(), clearProgress: jest.fn() },
    engine: { forgetTempleRun: jest.fn() },
  } as never;
});

const recordOf = (id: string, extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id,
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "cleared",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [{ floorKey: "1F", phaseId: "roof", window: { phaseId: "roof", opensOn: "2027-04-03", dueOn: "2027-04-10" }, questIds: ["pq-a"] }],
  chores: [],
  reward: { text: "Pizza night", earnedAt: "2027-04-08T20:00:00.000Z", seenBy: [] },
  creditsSeenBy: [],
  clearedAt: "2027-04-08T20:00:00.000Z",
  ...extra,
});

const save = async (...records: ProjectRecord[]) => {
  for (const record of records) await stores.projects.save(record);
};

const logOf = (questId: string, rewardsApplied: boolean) =>
  stores.log.logCompletion({ questId, questName: questId, userId: "twelve", status: "approved", source: "claim", rewards: { xp: 1, gp: 1, ap: 1 }, rewardsApplied });

describe("readTrophies", () => {
  it("lists the cleared runs, the one cleared last first, and nothing else", async () => {
    await save(
      recordOf("spring-cleaning-2026-04-03", { clearedAt: "2026-04-08T20:00:00.000Z" }),
      recordOf("spring-cleaning-2027-04-03"),
      recordOf("spring-cleaning-2027-09-01", { status: "active", clearedAt: undefined }),
      recordOf("spring-cleaning-2027-02-01", { status: "abandoned" })
    );
    expect((await readTrophies(stores)).map((record) => record.id)).toEqual(["spring-cleaning-2027-04-03", "spring-cleaning-2026-04-03"]);
  });

  it("is empty for a family that has cleared nothing", async () => {
    expect(await readTrophies(stores)).toEqual([]);
  });
});

describe("readFinish", () => {
  it("hands over the newest cleared run with the quests and only the paid entries of the log", async () => {
    await save(recordOf("spring-cleaning-2026-04-03", { clearedAt: "2026-04-08T20:00:00.000Z" }), recordOf("spring-cleaning-2027-04-03"));
    await stores.quests.set("pq-a", { id: "pq-a", achievementName: "Sort the shelf" } as Achievement);
    const paid = await logOf("pq-a", true);
    await logOf("pq-a", false);

    const finish = await readFinish(undefined, stores);

    expect(finish?.project.id).toBe("spring-cleaning-2027-04-03");
    expect(finish?.quests.map((quest) => quest.id)).toEqual(["pq-a"]);
    expect(finish?.paid.map((entry) => entry.id)).toEqual([paid.id]);
  });

  it("hands over the run asked for", async () => {
    await save(recordOf("spring-cleaning-2026-04-03", { clearedAt: "2026-04-08T20:00:00.000Z" }), recordOf("spring-cleaning-2027-04-03"));
    expect((await readFinish("spring-cleaning-2026-04-03", stores))?.project.id).toBe("spring-cleaning-2026-04-03");
  });

  it("is null when nothing was cleared, the run is unknown, or the run asked for was never cleared", async () => {
    expect(await readFinish(undefined, stores)).toBeNull();
    await save(recordOf("spring-cleaning-2027-04-03"), recordOf("spring-cleaning-2027-09-01", { status: "active", clearedAt: undefined }));
    expect(await readFinish("nobody", stores)).toBeNull();
    expect(await readFinish("spring-cleaning-2027-09-01", stores)).toBeNull();
  });
});

describe("readRewardToGive", () => {
  it("finds the cleared run whose reward was earned and not handed over", async () => {
    await save(recordOf("spring-cleaning-2027-04-03"));
    expect((await readRewardToGive(stores))?.reward.text).toBe("Pizza night");
  });

  it("finds nothing once the Game Master marked it given, and nothing before the roof is beaten", async () => {
    await save(recordOf("spring-cleaning-2027-04-03"), recordOf("spring-cleaning-2027-09-01", { status: "active", clearedAt: undefined, reward: { text: "Movie", seenBy: [] } }));
    await markRewardGiven(stores);
    expect(await readRewardToGive(stores)).toBeNull();
  });

  it("is the same run Mark as given stamps", async () => {
    await save(recordOf("spring-cleaning-2026-04-03", { clearedAt: "2026-04-08T20:00:00.000Z" }), recordOf("spring-cleaning-2027-04-03"));
    const waiting = await readRewardToGive(stores);
    await markRewardGiven(stores);
    const all = await stores.projects.getAll();
    expect(all.find((record) => record.id === waiting?.id)?.reward.givenAt).toBeTruthy();
    expect(all.find((record) => record.id !== waiting?.id)?.reward.givenAt).toBeUndefined();
  });
});
