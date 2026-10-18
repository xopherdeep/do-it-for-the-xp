import { Drivers, Storage } from "@ionic/storage";
import {
  BACKUP_STORES,
  BackupFormatError,
  BackupPermissionError,
  BackupService,
  BackupStorageError,
  backupFileName,
} from "@/lib/services/core/BackupService";
import type { BackupFile, BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import StorageService from "@/lib/services/core/StorageService";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import { useUserStore } from "@/lib/store/stores/user";
import { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import { achievementCategoryStorage, achievementStorage } from "@/lib/databases/AchievementDb";
import { beastStorage } from "@/lib/databases/BestiaryDb";
import { chatStorage } from "@/lib/databases/ChatDb";
import { dosDontsStorage } from "@/lib/databases/DosDontsDb";
import { packLibraryStorage } from "@/lib/databases/PackLibraryDb";
import { profileStorage } from "@/lib/databases/profileStorage";
import { purchaseLogStorage } from "@/lib/databases/PurchaseLogDb";
import { questLogStorage } from "@/lib/databases/QuestLogDb";
import { shopStorage } from "@/lib/databases/ShopsDb";
import { templeStorage } from "@/lib/databases/TempleDb";
import { templeProgressStorage } from "@/lib/databases/TempleProgressDb";
import { castLogStorage } from "@/lib/databases/CastLogDb";
import { familySettingsStorage } from "@/lib/databases/FamilySettingsDb";
import { latePenaltyStorage } from "@/lib/databases/LatePenaltyLogDb";
import { notificationsStorage } from "@/lib/databases/NotificationsDb";
import { localSettingsStorage } from "@/lib/services/core/localSettingsBackup";

// Every database module is swapped for a sentinel storage: the registry spec only has to see WHICH
// storage sits on which line. All behaviour specs inject in-memory fakes through the constructor.
jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, abilitiesStorage: { sentinel: "abilities" } }));
jest.mock("@/lib/databases/AccessoriesDb", () => ({ __esModule: true, accessoriesStorage: { sentinel: "accessories" } }));
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
jest.mock("@/lib/databases/ShopsDb", () => ({ __esModule: true, shopStorage: { sentinel: "shops" } }));
jest.mock("@/lib/databases/TempleDb", () => ({ __esModule: true, templeStorage: { sentinel: "temples" } }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  __esModule: true,
  templeProgressStorage: { sentinel: "templeProgress" },
}));
jest.mock("@/lib/databases/CastLogDb", () => ({ __esModule: true, castLogStorage: { sentinel: "castLog" } }));
jest.mock("@/lib/databases/FamilySettingsDb", () => ({ __esModule: true, familySettingsStorage: { sentinel: "familySettings" } }));
jest.mock("@/lib/databases/LatePenaltyLogDb", () => ({ __esModule: true, latePenaltyStorage: { sentinel: "latePenalties" } }));
jest.mock("@/lib/databases/NotificationsDb", () => ({ __esModule: true, notificationsStorage: { sentinel: "notifications" } }));
jest.mock("@/lib/services/core/localSettingsBackup", () => ({ __esModule: true, localSettingsStorage: { sentinel: "localSettings" } }));
jest.mock("@/lib/services/core/backupFile", () => ({ __esModule: true, saveBackupFile: jest.fn() }));
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveProfiles: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn() }));
jest.mock("@/router/_Guards/gm.guard", () => ({
  __esModule: true,
  canManageFamily: jest.fn(() => true),
  RESTORE_GM_ONLY_MESSAGE: "Only a Game Master can restore a backup.",
}));

type Seed = Record<string, unknown>;
type StoreName = "__profiles" | "__beasts" | "__questLog";

/** In-memory stand-in for an Ionic Storage that refuses to work before create(), like the real one. */
class FakeStorage {
  readonly data = new Map<string, unknown>();
  created = 0;
  failRead = false;
  /** 1-based number of the set() call that rejects (once) */
  failSetOnCall: number | null = null;
  /** 1-based number of the clear() call that rejects (once) */
  failClearOnCall: number | null = null;
  private setCalls = 0;
  private clearCalls = 0;

  constructor(readonly label: string, private readonly log: string[], seed: Seed = {}) {
    Object.entries(seed).forEach(([key, value]) => this.data.set(key, value));
  }

  asStorage(): BackupStorage {
    return this as unknown as BackupStorage;
  }

  async create() {
    this.created += 1;
    this.log.push(`${this.label}:create`);
    return this;
  }

  /** Like localforage.iterate: stops as soon as the callback returns anything but undefined */
  async forEach(callback: (value: unknown, key: string, index: number) => unknown) {
    this.assertOpen();
    if (this.failRead) throw new Error("read failed");
    let index = 0;
    for (const [key, value] of Array.from(this.data.entries())) {
      const copy = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
      if (callback(copy, key, index++) !== undefined) return;
    }
  }

  async set(key: string, value: unknown) {
    this.assertOpen();
    this.setCalls += 1;
    this.log.push(`${this.label}:set:${key}`);
    if (this.failSetOnCall === this.setCalls) throw new Error("disk full");
    this.data.set(key, JSON.parse(JSON.stringify(value)));
  }

  async clear() {
    this.assertOpen();
    this.clearCalls += 1;
    this.log.push(`${this.label}:clear`);
    if (this.failClearOnCall === this.clearCalls) throw new Error("clear failed");
    this.data.clear();
  }

  contents(): Seed {
    return Object.fromEntries(this.data);
  }

  private assertOpen() {
    if (this.created === 0) throw new Error("Database not created. Must call create() first");
  }
}

const makeWorld = (seed: Partial<Record<StoreName, Seed>> = {}) => {
  const log: string[] = [];
  const fakes = {
    __profiles: new FakeStorage("profiles", log, seed.__profiles),
    __beasts: new FakeStorage("beasts", log, seed.__beasts),
    __questLog: new FakeStorage("questLog", log, seed.__questLog),
  };
  const defs: BackupStoreDef[] = [
    { name: "__profiles", label: "Profiles", storage: fakes.__profiles.asStorage() },
    { name: "__beasts", label: "Bestiary", storage: fakes.__beasts.asStorage() },
    { name: "__questLog", label: "Quest log", storage: fakes.__questLog.asStorage() },
  ];
  const reloadUsers = jest.fn(async () => {
    log.push("reloadUsers");
  });
  return { log, fakes, defs, reloadUsers, service: new BackupService(defs, reloadUsers) };
};

/** A version-1 backup from [key, value] pairs per store */
const backupOf = (stores: Record<string, Array<[string, unknown]>>): BackupFile => ({
  version: 1,
  exportedAt: "2026-10-09T05:30:00.000Z",
  stores: Object.fromEntries(
    Object.entries(stores).map(([name, pairs]) => [name, pairs.map(([key, value]) => ({ key, value }))])
  ),
});

const hero = (id: string, extra: Seed = {}) => ({ id, name: { full: `Hero ${id}` }, ...extra });

describe("BACKUP_STORES registry", () => {
  it("lists every store, parents before the records that point at them", () => {
    expect(BACKUP_STORES.map((store) => store.name)).toEqual([
      "__profiles",
      "__achievementCategories",
      "__beasts",
      "__achievements",
      "__abilities",
      "__accessories",
      "__shops",
      "__temples",
      "__templeProgress",
      "__questLog",
      "__purchaseLog",
      "__chat",
      "__dosDonts",
      "__family_settings",
      "__castLog",
      "__latePenalties",
      "__notifications",
      "__localSettings",
      "__packs",
    ]);
  });

  it("puts each database's own storage instance on its line", () => {
    const storageOf = (name: string) => BACKUP_STORES.find((store) => store.name === name)?.storage;
    expect(storageOf("__profiles")).toBe(profileStorage);
    expect(storageOf("__achievementCategories")).toBe(achievementCategoryStorage);
    expect(storageOf("__beasts")).toBe(beastStorage);
    expect(storageOf("__achievements")).toBe(achievementStorage);
    expect(storageOf("__abilities")).toBe(abilitiesStorage);
    expect(storageOf("__accessories")).toBe(accessoriesStorage);
    expect(storageOf("__shops")).toBe(shopStorage);
    expect(storageOf("__temples")).toBe(templeStorage);
    expect(storageOf("__templeProgress")).toBe(templeProgressStorage);
    expect(storageOf("__questLog")).toBe(questLogStorage);
    expect(storageOf("__purchaseLog")).toBe(purchaseLogStorage);
    expect(storageOf("__chat")).toBe(chatStorage);
    expect(storageOf("__dosDonts")).toBe(dosDontsStorage);
    expect(storageOf("__family_settings")).toBe(familySettingsStorage);
    expect(storageOf("__castLog")).toBe(castLogStorage);
    expect(storageOf("__latePenalties")).toBe(latePenaltyStorage);
    expect(storageOf("__notifications")).toBe(notificationsStorage);
    expect(storageOf("__localSettings")).toBe(localSettingsStorage);
    expect(storageOf("__packs")).toBe(packLibraryStorage);
  });

  it("keeps device-only and private stores out of the file", () => {
    const names = BACKUP_STORES.map((store) => store.name);
    ["__xp_family_events", "__xp_hero_device", "__xp_town_hall", "__xp_pro", "__xp_claim_photos"].forEach((name) =>
      expect(names).not.toContain(name)
    );
  });

  it("never reuses a name or a storage, and every store has a label", () => {
    expect(new Set(BACKUP_STORES.map((store) => store.name)).size).toBe(BACKUP_STORES.length);
    expect(new Set(BACKUP_STORES.map((store) => store.storage)).size).toBe(BACKUP_STORES.length);
    BACKUP_STORES.forEach((store) => expect(store.label.length).toBeGreaterThan(0));
  });

  it("mirrors the restored profiles into persistent storage, like ProfileDb does on every write", async () => {
    const profiles = BACKUP_STORES.find((store) => store.name === "__profiles");
    await profiles?.afterRestore?.([
      { key: "p1", value: hero("p1") },
      { key: "p2", value: hero("p2") },
    ]);
    expect(StorageService.saveProfiles).toHaveBeenCalledWith([hero("p1"), hero("p2")]);
  });
});

describe("backupFileName", () => {
  it("names the file for the local calendar date", () => {
    expect(backupFileName(new Date(2026, 9, 9, 23, 59))).toBe("do-it-for-the-xp-backup-2026-10-09.json");
    expect(backupFileName(new Date(2026, 0, 5, 0, 1))).toBe("do-it-for-the-xp-backup-2026-01-05.json");
  });
});

describe("createBackup", () => {
  it("reads every store into { version, exportedAt, stores } and keeps each storage key", async () => {
    const { service } = makeWorld({
      __profiles: { p1: hero("p1"), "legacy-key": hero("other-id") },
      __beasts: { b1: { id: "b1", name: "Slime" } },
    });
    const now = new Date("2026-10-09T05:30:00.000Z");

    const backup = await service.createBackup(now);

    expect(backup).toEqual({
      version: 1,
      exportedAt: "2026-10-09T05:30:00.000Z",
      stores: {
        __profiles: [
          { key: "p1", value: hero("p1") },
          { key: "legacy-key", value: hero("other-id") },
        ],
        __beasts: [{ key: "b1", value: { id: "b1", name: "Slime" } }],
        __questLog: [],
      },
    });
  });

  it("opens each storage before reading it, once", async () => {
    const { service, fakes } = makeWorld({ __profiles: { p1: hero("p1") } });
    await service.createBackup();
    expect(fakes.__profiles.created).toBe(1);
    expect(fakes.__beasts.created).toBe(1);
    expect(fakes.__questLog.created).toBe(1);
  });

  it("reads past the first entry (forEach stops if the callback returns a value)", async () => {
    const { service } = makeWorld({ __questLog: { q1: { id: "q1" }, q2: { id: "q2" }, q3: { id: "q3" } } });
    const backup = await service.createBackup();
    expect(backup.stores.__questLog.map((entry) => entry.key)).toEqual(["q1", "q2", "q3"]);
  });

  it("skips records whose value is undefined and survives a JSON round trip unchanged", async () => {
    const { service } = makeWorld({ __profiles: { p1: hero("p1"), ghost: undefined, empty: null } });
    const backup = await service.createBackup();
    expect(backup.stores.__profiles.map((entry) => entry.key)).toEqual(["p1", "empty"]);
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup);
  });

  it("is all or nothing: one unreadable store fails the whole backup and names that store", async () => {
    const { service, fakes } = makeWorld({ __profiles: { p1: hero("p1") } });
    fakes.__beasts.failRead = true;

    const error = await service.createBackup().catch((caught) => caught);

    expect(error).toBeInstanceOf(BackupStorageError);
    expect(error).toMatchObject({ store: "__beasts", dataIntact: true });
    expect(error.message).toContain("Bestiary");
  });
});

describe("exportAll", () => {
  const backupStore = (): BackupStoreDef => ({ name: "__profiles", label: "Profiles", storage: new FakeStorage("profiles", [], { p1: hero("p1") }).asStorage() });

  it("hands the pretty-printed backup to the saver under the export date's file name and reports where it went", async () => {
    const saveFile = jest.fn(async (fileName: string) => ({ fileName, savedTo: "in Documents" }));
    const result = await new BackupService([backupStore()], jest.fn(), () => true, saveFile).exportAll();

    const [fileName, json] = saveFile.mock.calls[0] as unknown as [string, string];
    const backup = JSON.parse(json) as BackupFile;
    expect(fileName).toBe(backupFileName(new Date(backup.exportedAt)));
    expect(json).toBe(JSON.stringify(backup, null, 2));
    expect(backup.stores.__profiles).toEqual([{ key: "p1", value: hero("p1") }]);
    expect(result).toEqual(expect.objectContaining({ fileName, savedTo: "in Documents" }));
    expect(result.summary.total).toBe(1);
  });

  it("fails, instead of reporting a backup, when the file could not be saved", async () => {
    const saveFile = jest.fn().mockRejectedValue(new Error("The share sheet was closed"));
    await expect(new BackupService([backupStore()], jest.fn(), () => true, saveFile).exportAll()).rejects.toThrow("share sheet was closed");
  });
});

describe("parseBackup", () => {
  const { service } = makeWorld();
  const valid = () => ({
    version: 1,
    exportedAt: "2026-10-09T05:30:00.000Z",
    stores: { __profiles: [{ key: "p1", value: hero("p1") }] },
  });

  it("accepts the JSON text or the parsed object and returns clean entries", () => {
    const withExtras = {
      ...valid(),
      stores: { __profiles: [{ key: "p1", value: hero("p1"), stray: true }], __beasts: [] },
    };
    const expected = {
      version: 1,
      exportedAt: "2026-10-09T05:30:00.000Z",
      stores: { __profiles: [{ key: "p1", value: hero("p1") }], __beasts: [] },
    };
    expect(service.parseBackup(JSON.stringify(withExtras))).toEqual(expected);
    expect(service.parseBackup(withExtras)).toEqual(expected);
  });

  it("keeps stores this app does not know so they can be reported", () => {
    const parsed = service.parseBackup({ ...valid(), stores: { ...valid().stores, __futureThing: [{ key: "f", value: 1 }] } });
    expect(Object.keys(parsed.stores)).toEqual(["__profiles", "__futureThing"]);
  });

  const malformed: Array<[string, unknown, RegExp]> = [
    ["text that is not JSON", "{not json", /not valid JSON/],
    ["a bare list (a profile or quest export)", "[]", /single list/],
    ["JSON null", "null", /not a backup/],
    ["a JSON number", "42", /not a backup/],
    ["a newer backup version", { ...valid(), version: 2 }, /newer version/],
    ["a version that is not a number", { ...valid(), version: "1" }, /unknown version/],
    ["no version", { exportedAt: valid().exportedAt, stores: valid().stores }, /unknown version/],
    ["no export date", { version: 1, stores: valid().stores }, /export date/],
    ["no stores", { version: 1, exportedAt: valid().exportedAt }, /list of stores/],
    ["stores as a list", { ...valid(), stores: [] }, /list of stores/],
    ["a store that is not a list", { ...valid(), stores: { __profiles: { p1: hero("p1") } } }, /"__profiles" must be a list/],
    ["an entry that is null", { ...valid(), stores: { __profiles: [null] } }, /"__profiles", entry 1/],
    ["an entry without a key", { ...valid(), stores: { __profiles: [{ value: hero("p1") }] } }, /entry 1: every entry needs/],
    ["an entry with an empty key", { ...valid(), stores: { __profiles: [{ key: "", value: hero("p1") }] } }, /every entry needs/],
    ["an entry with a numeric key", { ...valid(), stores: { __profiles: [{ key: 7, value: hero("p1") }] } }, /every entry needs/],
    [
      "an entry without a value",
      { ...valid(), stores: { __profiles: [{ key: "a", value: hero("a") }, { key: "b" }] } },
      /entry 2: every entry needs/,
    ],
    [
      "a key listed twice",
      { ...valid(), stores: { __profiles: [{ key: "p1", value: hero("p1") }, { key: "p1", value: hero("p1") }] } },
      /"p1" more than once/,
    ],
    ["no stores at all", { ...valid(), stores: {} }, /nothing to restore/],
    ["only stores this app does not know", { ...valid(), stores: { __futureThing: [] } }, /nothing to restore/],
  ];

  it.each(malformed)("refuses %s with a BackupFormatError", (_label, input, message) => {
    expect(() => service.parseBackup(input)).toThrow(BackupFormatError);
    expect(() => service.parseBackup(input)).toThrow(message);
  });
});

describe("summarizeBackup", () => {
  it("counts what each store would get, in restore order, and reports what is skipped or left alone", () => {
    const { service } = makeWorld();
    const backup = backupOf({
      __beasts: [["b1", { id: "b1" }]],
      __profiles: [
        ["p1", hero("p1")],
        ["p2", hero("p2")],
      ],
      __futureThing: [["f", 1]],
    });

    expect(service.summarizeBackup(backup)).toEqual({
      exportedAt: "2026-10-09T05:30:00.000Z",
      stores: [
        { name: "__profiles", label: "Profiles", count: 2 },
        { name: "__beasts", label: "Bestiary", count: 1 },
      ],
      total: 3,
      ignored: ["__futureThing"],
      untouched: ["Quest log"],
    });
  });
});

describe("restoreBackup", () => {
  it("replaces the contents of every store in the file and keeps every key", async () => {
    const { service, fakes } = makeWorld({
      __profiles: { stale: hero("stale") },
      __beasts: { oldBeast: { id: "oldBeast" } },
      __questLog: { oldEntry: { id: "oldEntry" } },
    });
    const backup = backupOf({
      __profiles: [
        ["p1", hero("p1")],
        ["legacy-key", hero("another-id")],
      ],
      __beasts: [["b1", { id: "b1", achievementIds: ["a1"] }]],
      __questLog: [],
    });

    const result = await service.restoreBackup(backup);

    expect(fakes.__profiles.contents()).toEqual({ p1: hero("p1"), "legacy-key": hero("another-id") });
    expect(fakes.__beasts.contents()).toEqual({ b1: { id: "b1", achievementIds: ["a1"] } });
    expect(fakes.__questLog.contents()).toEqual({});
    expect(result).toMatchObject({
      total: 3,
      usersReloaded: true,
      ignored: [],
      untouched: [],
      stores: [
        { name: "__profiles", count: 2 },
        { name: "__beasts", count: 1 },
        { name: "__questLog", count: 0 },
      ],
    });
  });

  it("restores in registry order (not file order): clear then refill, one store at a time, users reloaded last", async () => {
    const { service, log } = makeWorld();
    const backup = backupOf({
      __questLog: [["q1", { id: "q1" }]],
      __beasts: [["b1", { id: "b1" }]],
      __profiles: [["p1", hero("p1")]],
    });

    await service.restoreBackup(backup);

    expect(log.filter((line) => !line.endsWith(":create"))).toEqual([
      "profiles:clear",
      "profiles:set:p1",
      "beasts:clear",
      "beasts:set:b1",
      "questLog:clear",
      "questLog:set:q1",
      "reloadUsers",
    ]);
  });

  it("accepts the backup as JSON text", async () => {
    const { service, fakes } = makeWorld();
    await service.restoreBackup(JSON.stringify(backupOf({ __profiles: [["p1", hero("p1")]] })));
    expect(fakes.__profiles.contents()).toEqual({ p1: hero("p1") });
  });

  it("round trips: a backup made now restores to exactly what was backed up", async () => {
    const original = {
      __profiles: { p1: hero("p1", { stats: { gp: { wallet: 12 } } }), "odd-key": hero("p2") },
      __beasts: { b1: { id: "b1", name: "Slime", checklist: ["a", "b"] } },
      __questLog: { q1: { id: "q1", questId: "x", userId: "p1" } },
    };
    const source = makeWorld(original);
    const text = JSON.stringify(await source.service.createBackup(), null, 2);

    const target = makeWorld({ __profiles: { junk: { id: "junk" } } });
    await target.service.restoreBackup(text);

    expect(target.fakes.__profiles.contents()).toEqual(original.__profiles);
    expect(target.fakes.__beasts.contents()).toEqual(original.__beasts);
    expect(target.fakes.__questLog.contents()).toEqual(original.__questLog);
  });

  it("writes more records than one batch holds", async () => {
    const { service, fakes } = makeWorld();
    const entries: Array<[string, unknown]> = Array.from({ length: 250 }, (_, index) => [`m${index}`, { id: `m${index}` }]);

    await service.restoreBackup(backupOf({ __questLog: entries }));

    expect(fakes.__questLog.data.size).toBe(250);
    expect(fakes.__questLog.data.get("m249")).toEqual({ id: "m249" });
  });

  it("leaves a store the file does not mention completely alone, and reports it", async () => {
    const { service, fakes, log } = makeWorld({ __questLog: { q1: { id: "q1" } } });

    const result = await service.restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }));

    expect(fakes.__questLog.contents()).toEqual({ q1: { id: "q1" } });
    expect(log.filter((line) => line.startsWith("questLog:"))).toEqual([]);
    expect(result.untouched).toEqual(["Bestiary", "Quest log"]);
  });

  it("skips stores this version does not have, and says so", async () => {
    const { service, fakes } = makeWorld();

    const result = await service.restoreBackup(
      backupOf({ __profiles: [["p1", hero("p1")]], __futureThing: [["f1", { id: "f1" }]] })
    );

    expect(fakes.__profiles.contents()).toEqual({ p1: hero("p1") });
    expect(result.ignored).toEqual(["__futureThing"]);
  });

  describe("a malformed file", () => {
    it.each([
      ["invalid JSON", "{ nope"],
      ["a profile-only export", JSON.stringify([hero("p1")])],
      ["a newer backup", JSON.stringify({ version: 9, exportedAt: "x", stores: {} })],
      ["an entry without a key", JSON.stringify({ version: 1, exportedAt: "x", stores: { __profiles: [{ value: 1 }] } })],
      [
        "a bad entry in the LAST store (earlier stores are valid)",
        JSON.stringify({
          version: 1,
          exportedAt: "x",
          stores: { __profiles: [{ key: "p1", value: hero("p1") }], __questLog: [{ key: "q1" }] },
        }),
      ],
    ])("%s is refused before any store is opened, cleared or written", async (_label, text) => {
      const { service, fakes, log, reloadUsers } = makeWorld({
        __profiles: { keep: hero("keep") },
        __beasts: { keepBeast: { id: "keepBeast" } },
      });

      await expect(service.restoreBackup(text)).rejects.toBeInstanceOf(BackupFormatError);

      expect(log).toEqual([]);
      expect(fakes.__profiles.contents()).toEqual({ keep: hero("keep") });
      expect(fakes.__beasts.contents()).toEqual({ keepBeast: { id: "keepBeast" } });
      expect(reloadUsers).not.toHaveBeenCalled();
    });
  });

  describe("a store that fails", () => {
    const seed = {
      __profiles: { old1: hero("old1"), old2: hero("old2") },
      __beasts: { oldBeast: { id: "oldBeast" } },
      __questLog: { oldEntry: { id: "oldEntry" } },
    };
    const incoming = backupOf({
      __profiles: [["p1", hero("p1")]],
      __beasts: [
        ["b1", { id: "b1" }],
        ["b2", { id: "b2" }],
      ],
      __questLog: [["q1", { id: "q1" }]],
    });

    it("on a failed write: puts every touched store back, never reaches the later ones, skips the post-restore steps", async () => {
      const { service, fakes, defs, reloadUsers } = makeWorld(seed);
      const afterRestore = jest.fn(async () => undefined);
      defs[0].afterRestore = afterRestore;
      fakes.__beasts.failSetOnCall = 2;

      const error = await service.restoreBackup(incoming).catch((caught) => caught);

      expect(error).toBeInstanceOf(BackupStorageError);
      expect(error).toMatchObject({ store: "__beasts", dataIntact: true });
      expect(error.message).toContain("Bestiary");
      expect(error.message).toContain("disk full");
      expect(error.message).toContain("previous data was put back");
      expect(fakes.__profiles.contents()).toEqual(seed.__profiles);
      expect(fakes.__beasts.contents()).toEqual(seed.__beasts);
      expect(fakes.__questLog.contents()).toEqual(seed.__questLog);
      expect(fakes.__questLog.created).toBe(1);
      expect(afterRestore).not.toHaveBeenCalled();
      expect(reloadUsers).not.toHaveBeenCalled();
    });

    it("on a failed clear: the store that failed and the ones before it are put back", async () => {
      const { service, fakes } = makeWorld(seed);
      fakes.__questLog.failClearOnCall = 1;

      const error = await service.restoreBackup(incoming).catch((caught) => caught);

      expect(error).toMatchObject({ store: "__questLog", dataIntact: true });
      expect(fakes.__profiles.contents()).toEqual(seed.__profiles);
      expect(fakes.__beasts.contents()).toEqual(seed.__beasts);
      expect(fakes.__questLog.contents()).toEqual(seed.__questLog);
    });

    it("when putting data back fails too: says which store may be incomplete and that the data is not intact", async () => {
      const { service, fakes } = makeWorld(seed);
      fakes.__beasts.failSetOnCall = 2;
      // call 1 is the restore's own clear, call 2 is the rollback's
      fakes.__profiles.failClearOnCall = 2;

      const error = await service.restoreBackup(incoming).catch((caught) => caught);

      expect(error).toBeInstanceOf(BackupStorageError);
      expect(error).toMatchObject({ store: "__beasts", dataIntact: false });
      expect(error.message).toContain("also failed for Profiles");
      expect(error.message).toContain("Restore the same file again");
      // the other stores were still rolled back
      expect(fakes.__beasts.contents()).toEqual(seed.__beasts);
    });

    it("when a store cannot be read up front: changes nothing at all", async () => {
      const { service, fakes, log, reloadUsers } = makeWorld(seed);
      fakes.__beasts.failRead = true;

      const error = await service.restoreBackup(incoming).catch((caught) => caught);

      expect(error).toMatchObject({ store: "__beasts", dataIntact: true });
      expect(error.message).toContain("Nothing was changed");
      expect(log.some((line) => line.includes(":clear") || line.includes(":set:"))).toBe(false);
      expect(fakes.__profiles.contents()).toEqual(seed.__profiles);
      expect(reloadUsers).not.toHaveBeenCalled();
    });
  });

  describe("after the data is in", () => {
    it("runs each store's afterRestore hook with its restored entries, after the last store and before the user store reload", async () => {
      const { service, defs, log } = makeWorld();
      const hook = jest.fn(async (entries: readonly { key: string }[]) => {
        log.push(`afterRestore:${entries.map((entry) => entry.key).join(",")}`);
      });
      defs[0].afterRestore = hook;

      await service.restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]], __questLog: [["q1", { id: "q1" }]] }));

      expect(hook).toHaveBeenCalledTimes(1);
      expect(log.slice(-3)).toEqual(["questLog:set:q1", "afterRestore:p1", "reloadUsers"]);
    });

    it("still succeeds when an afterRestore hook throws", async () => {
      const { service, defs, fakes } = makeWorld();
      defs[0].afterRestore = async () => {
        throw new Error("preferences unavailable");
      };

      const result = await service.restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }));

      expect(result.usersReloaded).toBe(true);
      expect(fakes.__profiles.contents()).toEqual({ p1: hero("p1") });
    });

    it("reports usersReloaded false, instead of failing, when the user store cannot be reloaded", async () => {
      const { defs, fakes } = makeWorld();
      const service = new BackupService(defs, async () => {
        throw new Error("no active pinia");
      });

      const result = await service.restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }));

      expect(result.usersReloaded).toBe(false);
      expect(fakes.__profiles.contents()).toEqual({ p1: hero("p1") });
    });

    it("refuses a restore from anyone but a Game Master, before touching a single record", async () => {
      const { defs, fakes } = makeWorld({ __profiles: { stale: hero("stale") } });
      const service = new BackupService(defs, jest.fn(), () => false);

      const error = await service
        .restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }))
        .catch((caught) => caught);

      expect(error).toBeInstanceOf(BackupPermissionError);
      expect(error.message).toBe("Only a Game Master can restore a backup.");
      expect(fakes.__profiles.contents()).toEqual({ stale: hero("stale") });
    });

    it("asks canManageFamily by default", async () => {
      (canManageFamily as jest.Mock).mockReturnValueOnce(false);
      const { defs } = makeWorld();

      await expect(new BackupService(defs).restoreBackup(backupOf({}))).rejects.toBeInstanceOf(BackupPermissionError);
    });

    it("reloads the real user store by default", async () => {
      const loadUsers = jest.fn(async () => undefined);
      (useUserStore as unknown as jest.Mock).mockReturnValue({ loadUsers });
      const { defs } = makeWorld();

      const result = await new BackupService(defs).restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }));

      expect(loadUsers).toHaveBeenCalledTimes(1);
      expect(result.usersReloaded).toBe(true);
    });
  });
});

describe("restoreBackup in merge mode", () => {
  const familyBeast = { id: "beast-made-by-the-kids", name: "Moanin Ronan's Cousin", avatar: 50, checklist: ["Hum"] };
  const oldDishGoblin = { id: "beast-dish-goblin", name: "Edited Goblin", avatar: 12, checklist: [] };
  const starterBeasts = backupOf({
    __beasts: [
      ["beast-dish-goblin", { id: "beast-dish-goblin", name: "Dish Goblin", avatar: 104, checklist: ["Scrape"] }],
      ["beast-classic-050", { id: "beast-classic-050", name: "Moanin Ronan", avatar: 50, checklist: ["Get ready"] }],
    ],
  });

  it("adds the file's records, replaces the ones it owns by id and keeps every other record", async () => {
    const { service, fakes, log } = makeWorld({
      __beasts: { [familyBeast.id]: familyBeast, "beast-dish-goblin": oldDishGoblin },
      __questLog: { oldEntry: { id: "oldEntry" } },
    });

    const result = await service.restoreBackup(starterBeasts, { mode: "merge" });

    expect(fakes.__beasts.contents()).toEqual({
      [familyBeast.id]: familyBeast,
      "beast-dish-goblin": { id: "beast-dish-goblin", name: "Dish Goblin", avatar: 104, checklist: ["Scrape"] },
      "beast-classic-050": { id: "beast-classic-050", name: "Moanin Ronan", avatar: 50, checklist: ["Get ready"] },
    });
    expect(fakes.__questLog.contents()).toEqual({ oldEntry: { id: "oldEntry" } });
    expect(log.some((line) => line.endsWith(":clear"))).toBe(false);
    expect(result).toMatchObject({ mode: "merge", total: 2, usersReloaded: true, stores: [{ name: "__beasts", count: 2 }] });
  });

  it("does nothing to a store the file lists with no records, where a replace would empty it", async () => {
    const merged = makeWorld({ __beasts: { [familyBeast.id]: familyBeast } });
    await merged.service.restoreBackup(backupOf({ __beasts: [] }), { mode: "merge" });
    expect(merged.fakes.__beasts.contents()).toEqual({ [familyBeast.id]: familyBeast });

    const replaced = makeWorld({ __beasts: { [familyBeast.id]: familyBeast } });
    await replaced.service.restoreBackup(backupOf({ __beasts: [] }));
    expect(replaced.fakes.__beasts.contents()).toEqual({});
  });

  it("is still a replace by default: the same file empties the store first", async () => {
    const seed = { __beasts: { [familyBeast.id]: familyBeast, "beast-dish-goblin": oldDishGoblin } };
    const byDefault = makeWorld(seed);
    const explicit = makeWorld(seed);

    const result = await byDefault.service.restoreBackup(starterBeasts);
    await explicit.service.restoreBackup(starterBeasts, { mode: "replace" });

    expect(result.mode).toBe("replace");
    expect(Object.keys(byDefault.fakes.__beasts.contents()).sort()).toEqual(["beast-classic-050", "beast-dish-goblin"]);
    expect(explicit.fakes.__beasts.contents()).toEqual(byDefault.fakes.__beasts.contents());
    expect(byDefault.log).toContain("beasts:clear");
  });

  it("puts the store back exactly as it was, family records included, when a write fails", async () => {
    const seed = { __beasts: { [familyBeast.id]: familyBeast, "beast-dish-goblin": oldDishGoblin } };
    const { service, fakes, reloadUsers } = makeWorld(seed);
    fakes.__beasts.failSetOnCall = 2;

    const error = await service.restoreBackup(starterBeasts, { mode: "merge" }).catch((caught) => caught);

    expect(error).toMatchObject({ store: "__beasts", dataIntact: true });
    expect(fakes.__beasts.contents()).toEqual(seed.__beasts);
    expect(reloadUsers).not.toHaveBeenCalled();
  });

  it("hands a store's afterRestore hook the whole store, since a mirror wants everything, not only the new records", async () => {
    const { service, defs } = makeWorld({ __profiles: { kept: hero("kept"), p1: hero("old p1") } });
    const mirrored: Array<readonly { key: string; value: unknown }[]> = [];
    defs[0].afterRestore = async (entries) => {
      mirrored.push(entries);
    };

    await service.restoreBackup(backupOf({ __profiles: [["p1", hero("p1")]] }), { mode: "merge" });

    expect(mirrored).toHaveLength(1);
    expect(mirrored[0]).toHaveLength(2);
    expect(mirrored[0]).toEqual(
      expect.arrayContaining([
        { key: "kept", value: hero("kept") },
        { key: "p1", value: hero("p1") },
      ])
    );
  });

  it("is Game Master only, like any restore, and a bad file touches nothing", async () => {
    const seed = { __beasts: { [familyBeast.id]: familyBeast } };
    const { defs, fakes, service } = makeWorld(seed);

    await expect(new BackupService(defs, jest.fn(), () => false).restoreBackup(starterBeasts, { mode: "merge" })).rejects.toBeInstanceOf(
      BackupPermissionError
    );
    await expect(service.restoreBackup("not json", { mode: "merge" })).rejects.toBeInstanceOf(BackupFormatError);
    expect(fakes.__beasts.contents()).toEqual(seed.__beasts);
  });
});

describe("against a real Ionic Storage (localStorage driver)", () => {
  // The fakes above encode assumptions about Storage: forEach(value, key), create() being safe to call
  // again, clear() emptying only its own database. This pins them to the real class.
  const open = async (name: string) => {
    const storage = new Storage({ name, driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage] });
    await storage.create();
    return storage;
  };
  const keysOf = async (storage: Storage) => (await storage.keys()).sort();

  it("backs up and restores records under their own keys, replacing what was there and nothing else", async () => {
    const source = await open("__backupSpecSource");
    await source.set("p1", hero("p1"));
    await source.set("hero-1:temple-1", { userId: "hero-1", templeId: "temple-1", clearedRooms: ["1F:0,1"] });
    const target = await open("__backupSpecTarget");
    await target.set("stale", { id: "stale" });
    const bystander = await open("__backupSpecBystander");
    await bystander.set("untouched", { id: "untouched" });

    const registry = (storage: Storage): BackupStoreDef[] => [{ name: "__templeProgress", label: "Temple progress", storage }];
    const backup = await new BackupService(registry(source), jest.fn()).createBackup();

    expect(backup.stores.__templeProgress).toHaveLength(2);
    const reload = jest.fn(async () => undefined);
    await new BackupService(registry(target), reload).restoreBackup(JSON.stringify(backup));

    expect(await keysOf(target)).toEqual(["hero-1:temple-1", "p1"]);
    expect(await target.get("hero-1:temple-1")).toEqual({ userId: "hero-1", templeId: "temple-1", clearedRooms: ["1F:0,1"] });
    expect(await target.get("p1")).toEqual(hero("p1"));
    expect(await keysOf(bystander)).toEqual(["untouched"]);
    expect(await keysOf(source)).toEqual(["hero-1:temple-1", "p1"]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("merges into a real storage: same keys replaced, other keys kept", async () => {
    const target = await open("__backupSpecMerge");
    await target.set("family", { id: "family" });
    await target.set("owned", { id: "owned", name: "old" });
    const registry: BackupStoreDef[] = [{ name: "__beasts", label: "Bestiary", storage: target }];

    await new BackupService(registry, jest.fn()).restoreBackup(
      backupOf({ __beasts: [["owned", { id: "owned", name: "new" }], ["added", { id: "added" }]] }),
      { mode: "merge" }
    );

    expect(await keysOf(target)).toEqual(["added", "family", "owned"]);
    expect(await target.get("owned")).toEqual({ id: "owned", name: "new" });
    expect(await target.get("family")).toEqual({ id: "family" });
  });

  it("opens a storage that nobody has called create() on yet", async () => {
    const storage = new Storage({ name: "__backupSpecUnopened", driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage] });
    const registry: BackupStoreDef[] = [{ name: "__chat", label: "Chat", storage }];

    await new BackupService(registry, jest.fn()).restoreBackup(backupOf({ __chat: [["m1", { id: "m1", text: "hi" }]] }));

    expect(await storage.get("m1")).toEqual({ id: "m1", text: "hi" });
  });
});
