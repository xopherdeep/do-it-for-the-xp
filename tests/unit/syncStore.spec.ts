import { TextEncoder } from "util";
import { createPinia, getActivePinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useFamilyStore } from "@/lib/store/stores/family";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import * as client from "@/lib/services/sync/familySyncClient";
import type { ReceivedRecord, WireRecord } from "@/lib/services/sync/familySyncClient";
import * as server from "@/lib/services/multiplayer/familyServer";
import { emitRecordWritten, emitStoreRestored } from "@/lib/services/sync/recordSignals";
import { removePack, type PackDeps, type PackStorage } from "@/lib/services/core/packs/packService";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { emptySyncState, type SyncState } from "@/lib/databases/SyncDb";
import type { FamilyEventsState } from "@/lib/databases/FamilyEventsDb";
import type { HeroDevice } from "@/lib/databases/HeroDeviceDb";
import debug from "@/lib/utils/debug";

// jsdom has no TextEncoder; the browser and the app's WebView do
Object.assign(globalThis, { TextEncoder });

const FAMILY = "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f";
const OWN = "devicetest01";
const OTHER = "deviceother1";
const PARENT = { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" };
const HERO_KEY = "xph_samplekey12345";

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

let mockEnabled = true;
jest.mock("@/lib/services/multiplayer/multiplayerFlag", () => ({ __esModule: true, multiplayerEnabled: () => mockEnabled }));

// --- The family store's pieces, as familyStore.spec mocks them ---

jest.mock("@/lib/services/multiplayer/familyServer", () => {
  const actual = jest.requireActual("@/lib/services/multiplayer/familyServer");
  return {
    __esModule: true,
    familyProblem: actual.familyProblem,
    retryAfterMs: actual.retryAfterMs,
    bindFamily: jest.fn(),
    moveHome: jest.fn(),
    getFamily: jest.fn(),
    saveHero: jest.fn(),
    removeHero: jest.fn(),
    removePhone: jest.fn(),
    sendEvents: jest.fn(),
    fetchEvents: jest.fn(),
    claimDevice: jest.fn(),
    makeLinkCode: jest.fn(),
    listPhones: jest.fn(),
  };
});

jest.mock("@/lib/services/multiplayer/phoneClaimIntake", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/multiplayer/phoneClaimIntake"),
  buildHeroSheet: jest.fn(async () => ({ stats: {}, quests: [] })),
}));

jest.mock("@/lib/services/pro/familyIdentity", () => ({
  __esModule: true,
  ensureIdentity: jest.fn(),
  adoptFamily: jest.fn(),
}));

let mockHeroDevice: HeroDevice | null = null;
jest.mock("@/lib/databases/HeroDeviceDb", () => ({
  __esModule: true,
  getHeroDeviceDb: () => ({
    getDevice: async () => (mockHeroDevice ? JSON.parse(JSON.stringify(mockHeroDevice)) : null),
    saveDevice: async (device: HeroDevice) => {
      mockHeroDevice = JSON.parse(JSON.stringify(device));
    },
    clearDevice: async () => {
      mockHeroDevice = null;
    },
  }),
}));

jest.mock("@/lib/databases/HeroPhoneDb", () => {
  const { emptyPhoneState } = jest.requireActual("@/lib/services/multiplayer/phoneClaims");
  return {
    __esModule: true,
    getHeroPhoneDb: () => ({
      getState: async () => emptyPhoneState(),
      saveState: async () => undefined,
      clearState: async () => undefined,
    }),
  };
});

jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: {},
  achievementCategoryStorage: {},
  AchievementDb: class {
    async get() {
      return null;
    }
  },
}));

let mockFamilyState: FamilyEventsState;
jest.mock("@/lib/databases/FamilyEventsDb", () => ({
  __esModule: true,
  getFamilyEventsDb: () => ({
    getState: async () => JSON.parse(JSON.stringify(mockFamilyState)),
    saveState: async (state: FamilyEventsState) => {
      mockFamilyState = JSON.parse(JSON.stringify(state));
    },
  }),
}));

jest.mock("@/lib/services/quests/QuestCompletionService", () => ({ __esModule: true, applyQuestRewards: jest.fn() }));

jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/databases/QuestLogDb"),
  getQuestLogDb: () => ({ getEntries: async () => [], getAll: async () => [] }),
}));

const mockTownHall = reactive({
  isLinked: true,
  auth: PARENT as Record<string, unknown>,
  init: jest.fn(),
  forgetLink: jest.fn(),
});
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));

jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ users: {} }) }));

// --- What the sync store binds to: the licence, the client, its own db, the raw stores ---

const mockPro = reactive({ isPro: true, recheck: jest.fn() });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

jest.mock("@/lib/services/sync/familySyncClient", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/sync/familySyncClient"),
  putRecords: jest.fn(),
  fetchRecords: jest.fn(),
  playHero: jest.fn(),
  restHero: jest.fn(),
}));

let mockSyncState: unknown = undefined;
/** Every state the sync store saved, in order */
const mockSyncSaves: SyncState[] = [];
const mockClearSyncState = jest.fn();
jest.mock("@/lib/databases/SyncDb", () => {
  const actual = jest.requireActual("@/lib/databases/SyncDb");
  return {
    __esModule: true,
    ...actual,
    getSyncDb: () => ({
      getState: async () => actual.readSyncState(JSON.parse(JSON.stringify(mockSyncState ?? null))),
      saveState: async (state: SyncState) => {
        mockSyncState = JSON.parse(JSON.stringify(state));
        mockSyncSaves.push(JSON.parse(JSON.stringify(state)));
      },
      clearState: async () => {
        mockClearSyncState();
        mockSyncState = undefined;
      },
    }),
  };
});

/** The raw Ionic stores the game writes and the download lands in: `mockStores[store][key]` */
let mockStores: Record<string, Record<string, unknown>> = {};
const mockRefreshMirrors = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock("@/lib/services/sync/recordApply", () => {
  const actual = jest.requireActual("@/lib/services/sync/recordApply");
  const target = (store: string) => ({
    set: async (key: string, value: unknown) => {
      (mockStores[store] ??= {})[key] = value;
    },
    remove: async (key: string) => {
      delete mockStores[store]?.[key];
    },
  });
  return {
    __esModule: true,
    ...actual,
    applyRecords: (records: ReceivedRecord[], own: string) => actual.applyRecords(records, own, target),
    refreshMirrors: (...args: unknown[]) => mockRefreshMirrors(...args),
    readRawRecord: async (store: string, key: string) => mockStores[store]?.[key] ?? null,
    readRawEntries: async (store: string) => Object.entries(mockStores[store] ?? {}).map(([key, value]) => ({ key, value })),
  };
});

const putRecords = client.putRecords as jest.Mock;
const fetchRecords = client.fetchRecords as jest.Mock;
const bindFamily = server.bindFamily as jest.Mock;
const fetchEvents = server.fetchEvents as jest.Mock;
const { ensureIdentity } = require("@/lib/services/pro/familyIdentity") as { ensureIdentity: jest.Mock };

const familyState = (over: Partial<FamilyEventsState> = {}): FamilyEventsState => ({
  outbox: [],
  lastSeq: 0,
  paidRewards: [],
  lastCards: {},
  ageGroupPicks: {},
  home: "home",
  takenClaims: [],
  lastSheets: {},
  ...over,
});

const syncState = (over: Partial<SyncState> = {}): SyncState => ({ ...emptySyncState(), ...over });

const kidPhone = (): HeroDevice => ({
  siteUrl: "https://townhall.example.com",
  familyId: FAMILY,
  heroId: "h-1",
  deviceId: OWN,
  key: HERO_KEY,
  label: "Mia's iPhone",
  linkedAt: 1770000000000,
  card: null,
});

/** jest 27 has no advanceTimersByTimeAsync: let pending promises settle, move the clock, let them settle again */
const drain = async () => {
  for (let i = 0; i < 1000; i++) await Promise.resolve();
};
const tick = async (ms: number) => {
  await drain();
  jest.advanceTimersByTime(ms);
  await drain();
};

/** Starts the family store (which starts the sync store) and lets the first round finish */
const started = async () => {
  await useFamilyStore().init();
  await drain();
  return useSyncStore();
};

/** A store write the game makes: the raw store changes, then DbStorageApi announces it */
const write = (store: string, key: string, value: unknown) => {
  (mockStores[store] ??= {})[key] = value;
  emitRecordWritten({ store, key, value });
};

/** The site keeps every record it is sent, numbering them from 1000 */
let nextSeq = 1000;
const acceptAll = async (_auth: unknown, _device: string, records: WireRecord[]) => ({
  accepted: records.map((record) => ({ store: record.store, key: record.key, seq: nextSeq++ })),
  refused: [],
});

/** Every record the site was sent, in order, as the wire carries it */
const sent = (): WireRecord[] =>
  putRecords.mock.calls.flatMap(([, , records]) => (records as WireRecord[]).map(({ store, key, heroId, deleted, body }) => ({ store, key, heroId, deleted, body })));

const received = (store: string, key: string, seq: number, body: unknown = { id: key }, over: Partial<ReceivedRecord> = {}): ReceivedRecord => ({
  store,
  key,
  heroId: null,
  deleted: false,
  body: JSON.stringify(body),
  seq,
  deviceId: OTHER,
  savedAt: "2026-10-22T10:00:00.000Z",
  ...over,
});

const failWith = (status: number, siteCode?: string) =>
  new TownHallError(status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "server", "no", status, siteCode);

/** Disposes every store of the active pinia, so nothing keeps listening to the shared signals or the clock */
const disposeAll = () => {
  const pinia = getActivePinia() as unknown as { _s: Map<string, { $dispose: () => void }> };
  pinia._s.forEach((store) => store.$dispose());
};

/** A clean world for one device: a fresh pinia, nothing kept, a bound parent device unless told otherwise */
const freshDevice = () => {
  disposeAll();
  setActivePinia(createPinia());
  mockFamilyState = familyState();
  mockSyncState = undefined;
  mockHeroDevice = null;
};

describe("the sync store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
    mockEnabled = true;
    mockPro.isPro = true;
    mockPro.recheck.mockResolvedValue(undefined);
    mockTownHall.isLinked = true;
    mockTownHall.auth = PARENT;
    mockTownHall.init.mockResolvedValue(undefined);
    mockTownHall.forgetLink.mockResolvedValue(undefined);
    mockFamilyState = familyState();
    mockHeroDevice = null;
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 5 });
    mockSyncSaves.length = 0;
    mockStores = {};
    nextSeq = 1000;
    ensureIdentity.mockResolvedValue({ familyId: FAMILY, deviceId: OWN });
    bindFamily.mockResolvedValue("home");
    (server.getFamily as jest.Mock).mockResolvedValue({ familyId: FAMILY, heroes: [] });
    (server.saveHero as jest.Mock).mockResolvedValue(undefined);
    (server.sendEvents as jest.Mock).mockImplementation(async (_auth: unknown, events: { id: string }[]) => ({
      accepted: events.map((e) => e.id),
      duplicate: [],
      rejected: [],
    }));
    (server.listPhones as jest.Mock).mockResolvedValue([]);
    fetchEvents.mockResolvedValue([]);
    putRecords.mockImplementation(acceptAll);
    fetchRecords.mockResolvedValue([]);
  });

  afterEach(() => {
    disposeAll();
    jest.useRealTimers();
  });

  it("off without Pro, off with the flag off, on for a bound parent and for a linked kid phone", async () => {
    mockPro.isPro = false;
    let sync = await started();
    expect(sync.isOn).toBe(false);
    mockPro.isPro = true;
    expect(sync.isOn).toBe(true);
    expect(sync.isFamilyDevice).toBe(true);
    expect(sync.isFullPortal).toBe(false);
    // jsdom is a wide browser window
    expect(sync.deviceLabel).toBe("the family computer");

    freshDevice();
    mockEnabled = false;
    sync = await started();
    expect(sync.isOn).toBe(false);
    mockEnabled = true;

    freshDevice();
    mockFamilyState = familyState({ home: "unknown" });
    bindFamily.mockRejectedValueOnce(new TownHallError("offline"));
    sync = await started();
    expect(sync.isOn).toBe(false);

    freshDevice();
    mockHeroDevice = kidPhone();
    sync = await started();
    expect(sync.isOn).toBe(true);
    expect(sync.isFamilyDevice).toBe(false);
    expect(sync.deviceLabel).toBe("Mia's iPhone");

    freshDevice();
    mockHeroDevice = { ...kidPhone(), unlinked: true };
    sync = await started();
    expect(sync.isOn).toBe(false);

    freshDevice();
    mockPro.isPro = false;
    mockHeroDevice = kidPhone();
    sync = await started();
    expect(sync.isOn).toBe(false);
  });

  it("a record write queues its key and uploads 5 s later with the hero id", async () => {
    jest.useFakeTimers();
    const sync = await started();
    fetchRecords.mockClear();

    const entry = { id: "q1", userId: "h-1", questName: "Pair the socks" };
    write("__questLog", "q1", entry);
    await drain();
    expect(sync.state.outbox).toEqual([expect.objectContaining({ store: "__questLog", key: "q1", heroId: "h-1" })]);

    await tick(4_999);
    expect(putRecords).not.toHaveBeenCalled();
    await tick(1);

    expect(putRecords).toHaveBeenCalledTimes(1);
    expect(putRecords.mock.calls[0][0]).toEqual(PARENT);
    expect(putRecords.mock.calls[0][1]).toBe(OWN);
    expect(sent()).toEqual([{ store: "__questLog", key: "q1", heroId: "h-1", deleted: false, body: JSON.stringify(entry) }]);
    expect(sync.state.outbox).toEqual([]);
    // the upload is followed by a download
    expect(fetchRecords).toHaveBeenCalledWith(PARENT, 5, 100);
  });

  it("download applies pages in order and saves lastSeq after each", async () => {
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 0 });
    const sync = await started();
    const firstPage = Array.from({ length: 100 }, (_, i) => received("__beasts", `b${i + 1}`, i + 1));
    fetchRecords.mockReset();
    fetchRecords.mockImplementation(async (_auth: unknown, since: number) => {
      if (since === 0) return firstPage;
      if (since === 100) return [received("__beasts", "b1", 101, { id: "b1", name: "Renamed" }), received("__chat", "c1", 102)];
      return [];
    });
    mockSyncSaves.length = 0;
    mockRefreshMirrors.mockClear();

    await sync.download();

    expect(fetchRecords.mock.calls.map(([, since, limit]) => [since, limit])).toEqual([
      [0, 100],
      [100, 100],
      [102, 100],
    ]);
    expect(mockSyncSaves.map((saved) => saved.lastSeq)).toEqual([100, 102]);
    expect(Object.keys(mockStores.__beasts)).toHaveLength(100);
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Renamed" });
    expect(mockStores.__chat.c1).toEqual({ id: "c1" });
    expect(mockRefreshMirrors).toHaveBeenCalledTimes(2);
    expect(sync.state.lastSeq).toBe(102);
  });

  it("a short page that is not empty is followed by another fetch, up to 5 pages a download", async () => {
    const sync = await started();
    // The site ends a page at 1 MB of bodies as well as at the limit, so 2 records are not the end of the family's save
    let seq = 5;
    fetchRecords.mockReset();
    fetchRecords.mockImplementation(async () => {
      seq += 2;
      return [received("__beasts", `b${seq - 1}`, seq - 1), received("__beasts", `b${seq}`, seq)];
    });

    await sync.download();

    expect(fetchRecords.mock.calls.map(([, since]) => since)).toEqual([5, 7, 9, 11, 13]);
    expect(sync.state.lastSeq).toBe(15);

    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b16", 16)]).mockResolvedValue([]);
    await sync.download();
    expect(fetchRecords.mock.calls.map(([, since]) => since)).toEqual([15, 16]);
    expect(sync.state.lastSeq).toBe(16);
  });

  it("the first push sends every record of every synced store once", async () => {
    jest.useFakeTimers();
    mockSyncState = undefined;
    mockStores = {
      __beasts: { b1: { id: "b1" }, b2: { id: "b2" } },
      __profiles: { "h-1": { id: "h-1", name: { nick: "Mia" }, passcode: "1234" } },
      __questLog: { q1: { id: "q1", userId: "h-1" } },
      __localSettings: { sound: { on: true } },
    };

    const sync = await started();

    const keys = sent().map((record) => `${record.store}/${record.key}`);
    expect(keys.sort()).toEqual(["__beasts/b1", "__beasts/b2", "__profiles/h-1", "__questLog/q1"]);
    expect(sent().find((record) => record.store === "__questLog")?.heroId).toBe("h-1");
    expect(sent().find((record) => record.store === "__profiles")?.heroId).toBe("h-1");
    expect(sent().find((record) => record.store === "__beasts")?.heroId).toBeNull();
    // PINs travel sealed, the way a backup seals them
    const profile = JSON.parse(sent().find((record) => record.store === "__profiles")?.body as string);
    expect(profile.passcode).toMatch(/^pin\$1\$/);
    expect(sync.state.firstPushDone).toBe(true);
    expect(sync.state.outbox).toEqual([]);
    // the family's save is read first, from 0, so a joining device does not overwrite it
    expect(fetchRecords.mock.calls[0]).toEqual([PARENT, 0, 100]);

    putRecords.mockClear();
    await tick(60_000);
    expect(putRecords).not.toHaveBeenCalled();
  });

  it("the first pull downloads from 0 and sets firstPullDone", async () => {
    mockSyncState = undefined;
    mockHeroDevice = kidPhone();
    fetchRecords.mockImplementation(async (_auth: unknown, since: number) =>
      since === 0
        ? [
            received("__profiles", "h-1", 1, { id: "h-1", name: { nick: "Mia" } }, { heroId: "h-1" }),
            received("__beasts", "b1", 2),
            received("__achievements", "a1", 3),
          ]
        : []
    );

    const sync = await started();

    expect(fetchRecords.mock.calls[0]).toEqual([{ kind: "hero", key: HERO_KEY }, 0, 100]);
    expect(sync.state.firstPullDone).toBe(true);
    expect(sync.firstPullProgress).toBe(3);
    expect(sync.isFullPortal).toBe(true);
    expect(sync.state.lastSeq).toBe(3);
    expect(mockStores.__profiles["h-1"]).toEqual({ id: "h-1", name: { nick: "Mia" } });
    expect(mockStores.__achievements.a1).toEqual({ id: "a1" });
  });

  it("a first pull that cannot reach the site stays owed and is tried again on online", async () => {
    mockSyncState = undefined;
    mockHeroDevice = kidPhone();
    fetchRecords.mockRejectedValueOnce(new TownHallError("offline"));

    const sync = await started();
    expect(sync.state.firstPullDone).toBe(false);
    expect(sync.problem).toBe("offline");
    expect(sync.isFullPortal).toBe(false);

    window.dispatchEvent(new Event("online"));
    await drain();
    expect(sync.state.firstPullDone).toBe(true);
    expect(sync.problem).toBeNull();
  });

  it("a restore re-sends everything and tombstones the removed keys", async () => {
    jest.useFakeTimers();
    const sync = await started();
    mockStores.__questLog = { q2: { id: "q2", userId: "h-2" } };

    emitStoreRestored({ store: "__questLog", removedKeys: ["q1"], previous: new Map([["q1", { id: "q1", userId: "h-1" }]]) });
    emitStoreRestored({ store: "__localSettings", removedKeys: ["sound"] });
    await tick(5_000);

    expect(sent()).toEqual([
      { store: "__questLog", key: "q1", heroId: "h-1", deleted: true, body: undefined },
      { store: "__questLog", key: "q2", heroId: "h-2", deleted: false, body: JSON.stringify({ id: "q2", userId: "h-2" }) },
    ]);
    expect(sync.state.outbox).toEqual([]);
  });

  it("pro-required turns the store off and rechecks the licence", async () => {
    jest.useFakeTimers();
    const sync = await started();
    putRecords.mockRejectedValueOnce(failWith(403, "xp_family_pro_required"));
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);

    expect(sync.problem).toBe("pro-required");
    expect(mockPro.recheck).toHaveBeenCalled();
    expect(sync.isOn).toBe(false);
    expect(sync.state.outbox).toHaveLength(1);

    // still off while the licence says no, and on again (sending what waits) once it says Pro
    mockPro.isPro = false;
    await drain();
    expect(sync.isOn).toBe(false);
    mockPro.isPro = true;
    await drain();
    expect(sync.isOn).toBe(true);
    expect(sent().map((record) => record.key)).toEqual(["b1", "b1"]);
    expect(sync.state.outbox).toEqual([]);
    expect(sync.problem).toBeNull();
  });

  it("forgetDevice clears the sync state", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 7, turns: { "h-1": "held" } });
    const sync = await started();
    expect(sync.isFullPortal).toBe(true);
    putRecords.mockImplementation(() => new Promise(() => undefined));
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    await drain();

    await useFamilyStore().forgetDevice();
    await drain();

    expect(mockClearSyncState).toHaveBeenCalled();
    expect(mockSyncState).toBeUndefined();
    expect(sync.state).toEqual(emptySyncState());
    expect(sync.turns).toEqual({});
    expect(sync.isOn).toBe(false);
    expect(sync.isFullPortal).toBe(false);

    write("__questLog", "q2", { id: "q2", userId: "h-1" });
    await drain();
    expect(sync.state.outbox).toEqual([]);
  });

  it("a kid phone queues only what it may write: its own hero's records and the chat", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 7 });
    putRecords.mockImplementation(() => new Promise(() => undefined));
    const sync = await started();

    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    write("__questLog", "q2", { id: "q2", userId: "h-2" });
    write("__beasts", "b1", { id: "b1" });
    write("__chat", "c1", { id: "c1" });
    await drain();

    expect(sync.state.outbox.map((item) => `${item.store}/${item.key}`)).toEqual(["__questLog/q1", "__chat/c1"]);
  });

  it("an oversize record is dropped from the outbox and logged, and the rest still go", async () => {
    jest.useFakeTimers();
    const sync = await started();
    write("__profiles", "h-big", { id: "h-big", face: "x".repeat(client.MAX_RECORD_BYTES) });
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);

    expect(sent().map((record) => record.key)).toEqual(["b1"]);
    expect(sync.state.outbox).toEqual([]);
    expect(debug.warn).toHaveBeenCalledWith(expect.stringContaining("__profiles/h-big"));
  });

  it("a row whose number is not finite never advances lastSeq", async () => {
    const sync = await started();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b1", Number.NaN)]);

    await sync.download();

    expect(sync.state.lastSeq).toBe(5);
    expect(mockStores.__beasts).toBeUndefined();
  });

  it("a write to a store that does not sync is ignored, and an announced null is a removal", async () => {
    jest.useFakeTimers();
    const sync = await started();

    write("__xp_claim_photos", "p1", { id: "p1" });
    write("__localSettings", "sound", { on: true });
    write("__xp_sync", "state", {});
    await drain();
    expect(sync.state.outbox).toEqual([]);

    emitRecordWritten({ store: "__beasts", key: "b9", value: null });
    await tick(5_000);
    expect(sent()).toEqual([{ store: "__beasts", key: "b9", heroId: null, deleted: true, body: undefined }]);
  });

  it("removePack's writes are captured: the shelf it rewrites and a tombstone per record", async () => {
    jest.useFakeTimers();
    mockStores = {
      __beasts: { "beast-x": { id: "beast-x" } },
      __achievements: { "quest-x": { id: "quest-x", beastId: "beast-x" } },
      __shops: { market: { id: "market", items: [{ itemId: "reward-x" }, { itemId: "mine" }] } },
      __accessories: { "reward-x": { id: "reward-x" } },
    };
    const sync = await started();
    const pack = {
      id: "pack-x",
      content: { beasts: [{ id: "beast-x" }], quests: [{ id: "quest-x" }], rewards: [{ id: "reward-x" }], shopStock: { market: ["reward-x"] } },
    } as unknown as XpPack;
    /** The raw stores as the pack service sees them; writes and removals change them without a word, as Ionic Storage does */
    const storage = (name: string): PackStorage =>
      ({
        create: async () => undefined,
        forEach: async (callback: (value: unknown, key: string, index: number) => unknown) => {
          Object.entries(mockStores[name] ?? {}).forEach(([key, value], index) => void callback(value, key, index));
        },
        set: async (key: string, value: unknown) => {
          (mockStores[name] ??= {})[key] = value;
        },
        remove: async (key: string) => {
          delete mockStores[name]?.[key];
        },
      }) as unknown as PackStorage;
    const deps: PackDeps = { storage, restore: jest.fn(), canManage: () => true };

    await removePack(pack, [pack], deps);
    await tick(5_000);

    expect(sent()).toEqual(
      expect.arrayContaining([
        { store: "__shops", key: "market", heroId: null, deleted: false, body: JSON.stringify({ id: "market", items: [{ itemId: "mine" }] }) },
        { store: "__achievements", key: "quest-x", heroId: null, deleted: true, body: undefined },
        { store: "__beasts", key: "beast-x", heroId: null, deleted: true, body: undefined },
        { store: "__accessories", key: "reward-x", heroId: null, deleted: true, body: undefined },
      ])
    );
    expect(sent()).toHaveLength(4);
    expect(sync.state.outbox).toEqual([]);
  });

  it("a received record for a key in the outbox is not applied, and the local value is uploaded on the next send", async () => {
    jest.useFakeTimers();
    const sync = await started();
    write("__beasts", "b1", { id: "b1", name: "Local" });
    await drain();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b1", 8, { id: "b1", name: "Server" }), received("__beasts", "b2", 9)]);

    await sync.download();
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Local" });
    expect(mockStores.__beasts.b2).toEqual({ id: "b2" });
    expect(sync.state.lastSeq).toBe(9);

    await tick(5_000);
    expect(sent()).toEqual([{ store: "__beasts", key: "b1", heroId: null, deleted: false, body: JSON.stringify({ id: "b1", name: "Local" }) }]);
  });

  it("a Pro family runs one minute tick: records up and down, then the family's events, and the 2 minute tick stands down", async () => {
    jest.useFakeTimers();
    await started();
    fetchRecords.mockClear();
    fetchEvents.mockClear();

    await tick(60_000);
    expect(fetchRecords).toHaveBeenCalledTimes(1);
    expect(fetchEvents).toHaveBeenCalledTimes(1);

    await tick(60_000);
    expect(fetchRecords).toHaveBeenCalledTimes(2);
    // the family store's own 2 minute round would make it 3
    expect(fetchEvents).toHaveBeenCalledTimes(2);
  });
});
