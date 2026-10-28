/**
 * The project store: one record per run of a project, kept under its id in `__projects`, and carried in a backup. The
 * base class only calls create, get, set, remove, keys and clear, so an in-memory stand-in for the ionic Storage will do.
 */
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { ProjectDb, getProjectDb, projectStorage } from "@/lib/databases/ProjectDb";
import { newestCleared } from "@/lib/services/projects/projectProgress";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";

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

const floorOf = (floorKey: string, phaseId: string, extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey,
  phaseId,
  window: { phaseId, opensOn: "2027-04-03", dueOn: "2027-04-09" },
  questIds: [`pq-x-${floorKey}`],
  ...extra,
});

const recordOf = (id: string, extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id,
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "active",
  startOn: "2027-04-03",
  endOn: "2027-04-30",
  house: { rooms: { kitchen: 1, bedroom: 2 } },
  floors: [floorOf("1F", "sort", { wokenAt: "2027-04-03T15:00:00.000Z" }), floorOf("2F", "roof")],
  chores: [{ id: "c1", phaseId: "sort", roomId: "kitchen", name: "Clear the counters", difficulty: 2, assignee: ["h-1"] }],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
  ...extra,
});

const clearedOn = (id: string, clearedAt: string, extra: Partial<ProjectRecord> = {}): ProjectRecord =>
  recordOf(id, { status: "cleared", clearedAt, ...extra });

describe("ProjectDb", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: ProjectDb;
  beforeEach(() => {
    storage = fakeStorage();
    db = new ProjectDb(storage as never);
  });

  it("holds nothing at first", async () => {
    expect(await db.getAll()).toEqual([]);
    expect(await db.getActive()).toBeNull();
    expect(await db.lastOfType("spring-cleaning")).toBeNull();
  });

  it("round-trips a record under its id", async () => {
    const record = recordOf("spring-cleaning-2027-04-03", {
      floors: [floorOf("1F", "sort", { wokenAt: "2027-04-03T15:00:00.000Z", clearedAt: "2027-04-05T10:00:00.000Z", multiplier: 1.5, bonusPaidAt: "2027-04-05T10:00:01.000Z" })],
      reward: { text: "Pizza night", earnedAt: "2027-04-30T12:00:00.000Z", givenAt: "2027-05-01T12:00:00.000Z", seenBy: ["h-1"] },
      creditsSeenBy: ["h-1", "h-2"],
    });
    await db.save(record);
    expect(await storage.get(record.id)).toEqual(record);
    expect(await db.getAll()).toEqual([record]);
  });

  it("saves a record again under the same id, replacing it", async () => {
    await db.save(recordOf("p-1"));
    await db.save(recordOf("p-1", { endOn: "2027-05-15" }));
    const all = await db.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].endOn).toBe("2027-05-15");
  });

  it("keeps a copy: editing the record after saving does not change what is stored", async () => {
    const record = recordOf("p-1");
    await db.save(record);
    record.reward.seenBy.push("h-9");
    expect((await db.getAll())[0].reward.seenBy).toEqual([]);
  });

  it("skips anything stored that is not a record", async () => {
    await db.save(recordOf("p-1"));
    await storage.set("junk", "text");
    await storage.set("nothing", null);
    await storage.set("list", [1, 2]);
    expect((await db.getAll()).map((record) => record.id)).toEqual(["p-1"]);
  });

  describe("getActive", () => {
    it("returns only the active run", async () => {
      await db.save(clearedOn("old-1", "2026-10-01T10:00:00.000Z", { startOn: "2026-09-01" }));
      await db.save(recordOf("old-2", { status: "abandoned", startOn: "2026-11-01" }));
      await db.save(recordOf("now"));
      expect((await db.getActive())?.id).toBe("now");
    });

    it("is null when no run is active", async () => {
      await db.save(clearedOn("old-1", "2026-10-01T10:00:00.000Z"));
      await db.save(recordOf("old-2", { status: "abandoned" }));
      expect(await db.getActive()).toBeNull();
    });

    it("pins the newest by start day when the store somehow holds two", async () => {
      await db.save(recordOf("older", { startOn: "2027-03-01" }));
      await db.save(recordOf("newer", { startOn: "2027-04-03" }));
      await db.save(recordOf("oldest", { startOn: "2027-01-15" }));
      expect((await db.getActive())?.id).toBe("newer");
    });

    it("picks the same one of two that start on one day, whatever the order they were saved in", async () => {
      await db.save(recordOf("moving-out-2027-04-03", { typeId: "moving-out", startOn: "2027-04-03" }));
      await db.save(recordOf("spring-cleaning-2027-04-03", { startOn: "2027-04-03" }));
      const first = (await db.getActive())?.id;

      const other = new ProjectDb(fakeStorage() as never);
      await other.save(recordOf("spring-cleaning-2027-04-03", { startOn: "2027-04-03" }));
      await other.save(recordOf("moving-out-2027-04-03", { typeId: "moving-out", startOn: "2027-04-03" }));
      expect((await other.getActive())?.id).toBe(first);
    });
  });

  describe("lastOfType", () => {
    it("returns the newest cleared run of the type by when it was cleared", async () => {
      await db.save(clearedOn("spring-a", "2026-04-30T10:00:00.000Z"));
      await db.save(clearedOn("spring-c", "2028-04-30T10:00:00.000Z"));
      await db.save(clearedOn("spring-b", "2027-04-30T10:00:00.000Z"));
      expect((await db.lastOfType("spring-cleaning"))?.id).toBe("spring-c");
    });

    it("goes by the clearing, not by the start day", async () => {
      await db.save(clearedOn("started-late", "2027-05-01T10:00:00.000Z", { startOn: "2027-04-20" }));
      await db.save(clearedOn("started-early", "2027-06-01T10:00:00.000Z", { startOn: "2027-03-01" }));
      expect((await db.lastOfType("spring-cleaning"))?.id).toBe("started-early");
    });

    it("ignores runs that are active or abandoned, and other types", async () => {
      await db.save(clearedOn("spring-old", "2026-04-30T10:00:00.000Z"));
      await db.save(recordOf("spring-live", { startOn: "2027-04-03" }));
      await db.save(recordOf("spring-dropped", { status: "abandoned", clearedAt: "2028-01-01T10:00:00.000Z" }));
      await db.save(clearedOn("moving-new", "2028-06-01T10:00:00.000Z", { typeId: "moving-out" }));
      expect((await db.lastOfType("spring-cleaning"))?.id).toBe("spring-old");
      expect((await db.lastOfType("moving-out"))?.id).toBe("moving-new");
    });

    it("is null for a type that was never cleared", async () => {
      await db.save(recordOf("spring-live"));
      await db.save(clearedOn("spring-old", "2026-04-30T10:00:00.000Z"));
      expect(await db.lastOfType("moving-out")).toBeNull();
    });

    it("picks the very run newestCleared picks over a tie and an undated run, whatever order they were saved in", async () => {
      const stamp = "2027-04-30T10:00:00.000Z";
      const runs = [clearedOn("spring-a", stamp), clearedOn("spring-b", stamp), recordOf("undated", { status: "cleared" })];
      for (const order of [runs, [...runs].reverse()]) {
        const fresh = new ProjectDb(fakeStorage() as never);
        for (const run of order) await fresh.save(run);
        const picked = (await fresh.lastOfType("spring-cleaning"))?.id;
        expect(picked).toBe(newestCleared(order)?.id);
        expect(picked).toBe("spring-b");
      }
    });

    it("keeps a cleared run with no clearing time behind every dated one", async () => {
      await db.save(recordOf("undated", { status: "cleared" }));
      await db.save(clearedOn("dated", "2027-04-30T10:00:00.000Z"));
      expect((await db.lastOfType("spring-cleaning"))?.id).toBe("dated");
    });
  });
});

describe("the project store", () => {
  it("is __projects, and one lazy database serves every caller", () => {
    expect((projectStorage as unknown as { _config: { name: string } })._config.name).toBe("__projects");
    expect(getProjectDb()).toBeInstanceOf(ProjectDb);
    expect(getProjectDb()).toBe(getProjectDb());
  });

  it("is carried in a backup: BACKUP_STORES lists __projects on this storage", () => {
    const line = BACKUP_STORES.find((store) => store.name === "__projects");
    expect(line).toBeDefined();
    expect(line?.storage).toBe(projectStorage);
    expect(line?.label.length).toBeGreaterThan(0);
  });

  it("comes after the temples and quests its records point at", () => {
    const names = BACKUP_STORES.map((store) => store.name);
    const at = names.indexOf("__projects");
    expect(at).toBeGreaterThan(names.indexOf("__temples"));
    expect(at).toBeGreaterThan(names.indexOf("__achievements"));
  });
});
