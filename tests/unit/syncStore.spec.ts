import { TextEncoder } from "util";
import { createPinia, getActivePinia, setActivePinia } from "pinia";
import { reactive, watch } from "vue";
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
import { questClaimedEvent } from "@/lib/services/multiplayer/familyEvents";
import { applyQuestRewards } from "@/lib/services/quests/QuestCompletionService";
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

/** Taking one phone claim (the completion service behind it is not under test here) */
const mockTakePhoneClaim = jest.fn();
jest.mock("@/lib/services/multiplayer/phoneClaimIntake", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/multiplayer/phoneClaimIntake"),
  buildHeroSheet: jest.fn(async () => ({ stats: {}, quests: [] })),
  takePhoneClaim: (...args: unknown[]) => mockTakePhoneClaim(...args),
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

/** The completion service's review as a verdict applies it: a pending entry in the raw quest log is settled (and paid) once */
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  __esModule: true,
  applyQuestRewards: jest.fn(),
  paidQuestRewards: (_heroId: string, rewards: unknown) => rewards,
  approveCompletion: jest.fn(async (id: string) => mockReview(id, { status: "approved", rewardsApplied: true })),
  rejectCompletion: jest.fn(async (id: string, _reviewer: unknown, note?: string) => mockReview(id, { status: "rejected", note })),
}));

/** The quest log reads the raw store the download lands in */
jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/databases/QuestLogDb"),
  getQuestLogDb: () => ({
    getEntries: async () => Object.values(mockStores.__questLog ?? {}),
    getAll: async () => Object.values(mockStores.__questLog ?? {}),
    get: async (id: string) => mockStores.__questLog?.[id] ?? null,
    logCompletion: async (input: Record<string, unknown>) => {
      const entry = { id: `log-${Object.keys(mockStores.__questLog ?? {}).length + 1}`, rewardsApplied: false, ...input };
      (mockStores.__questLog ??= {})[entry.id] = entry;
      return entry;
    },
    updateEntry: async (id: string, patch: Record<string, unknown>) => {
      const entry = { ...(mockStores.__questLog?.[id] as Record<string, unknown>), ...patch };
      (mockStores.__questLog ??= {})[id] = entry;
      return entry;
    },
  }),
}));

const mockTownHall = reactive({
  isLinked: true,
  auth: PARENT as Record<string, unknown>,
  init: jest.fn(),
  forgetLink: jest.fn(),
});
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));

/** The user store as the sync store reads it: who is signed in on this device */
const mockUser = reactive({ users: {} as Record<string, unknown>, currentUser: { id: null as string | null } });
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUser }));

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
/** A save waits for this while it is set (a test holds a save on its way) */
let mockSaveGate: Promise<void> | null = null;
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
        await mockSaveGate;
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
/** Runs as a downloaded record lands, before it is written: a test makes the game write something meanwhile */
let mockOnApply: ((store: string, key: string) => void) | null = null;
const mockRefreshMirrors = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock("@/lib/services/sync/recordApply", () => {
  const actual = jest.requireActual("@/lib/services/sync/recordApply");
  const target = (store: string) => ({
    set: async (key: string, value: unknown) => {
      mockOnApply?.(store, key);
      (mockStores[store] ??= {})[key] = value;
    },
    remove: async (key: string) => {
      mockOnApply?.(store, key);
      delete mockStores[store]?.[key];
    },
  });
  return {
    __esModule: true,
    ...actual,
    applyRecords: (records: ReceivedRecord[], own: string) => actual.applyRecords(records, own, target),
    refreshMirrors: (...args: unknown[]) => mockRefreshMirrors(...args),
    rawTargetFor: (store: string) => target(store),
    readRawRecord: async (store: string, key: string) => mockStores[store]?.[key] ?? null,
    readRawEntries: async (store: string) => Object.entries(mockStores[store] ?? {}).map(([key, value]) => ({ key, value })),
  };
});

const putRecords = client.putRecords as jest.Mock;
const fetchRecords = client.fetchRecords as jest.Mock;
const playHero = client.playHero as jest.Mock;
const restHero = client.restHero as jest.Mock;
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

/** The quest log entries the verdicts paid, in order */
const mockPays: string[] = [];
/** approveCompletion / rejectCompletion: a pending entry is settled and written (the game's write, so it goes up); a settled one is left alone */
function mockReview(id: string, patch: Record<string, unknown>): Promise<unknown> {
  const entry = mockStores.__questLog?.[id] as Record<string, unknown> | undefined;
  const isPending = entry?.status === "pending";
  if (!isPending) return Promise.resolve(entry ?? null);
  const settled = { ...entry, ...patch };
  if (patch.status === "approved") mockPays.push(id);
  write("__questLog", id, settled);
  return Promise.resolve(settled);
}

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

/** A reply the test lets go when it wants */
const held = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
};

const showPage = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

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
    mockSaveGate = null;
    mockStores = {};
    mockPays.length = 0;
    mockTakePhoneClaim.mockReset();
    mockTakePhoneClaim.mockImplementation(async (e: { id: string }) => ({ claimId: e.id, questId: "q-dishes", status: "pending", note: "", xp: 0, gp: 0, ap: 0 }));
    mockOnApply = null;
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
    playHero.mockResolvedValue({ answer: "granted" });
    restHero.mockResolvedValue(undefined);
    mockUser.currentUser.id = null;
  });

  afterEach(() => {
    disposeAll();
    jest.useRealTimers();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
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
    // The licence agrees with the site: the family is not Pro any more
    mockPro.recheck.mockImplementation(async () => {
      mockPro.isPro = false;
    });
    putRecords.mockRejectedValueOnce(failWith(403, "xp_family_pro_required"));
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);

    expect(sync.problem).toBe("pro-required");
    expect(mockPro.recheck).toHaveBeenCalled();
    expect(sync.isOn).toBe(false);
    expect(sync.state.outbox).toHaveLength(1);

    // Writes made while it is off still wait in the outbox, and everything goes once the licence says Pro again
    write("__beasts", "b2", { id: "b2" });
    await tick(60_000);
    expect(sent().map((record) => record.key)).toEqual(["b1"]);
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["b1", "b2"]);
    mockPro.isPro = true;
    await drain();
    expect(sync.isOn).toBe(true);
    expect(sent().map((record) => record.key)).toEqual(["b1", "b1", "b2"]);
    expect(sync.state.outbox).toEqual([]);
    expect(sync.problem).toBeNull();
  });

  it("a refusal while the licence still says Pro pauses, then tries again and sends what was written meanwhile", async () => {
    jest.useFakeTimers();
    const sync = await started();
    putRecords.mockRejectedValueOnce(failWith(403, "xp_family_pro_required"));
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);
    expect(sync.problem).toBe("pro-required");
    expect(mockPro.recheck).toHaveBeenCalledTimes(1);
    // paused, not off: the site may be behind the licence (a renewal)
    expect(sync.isOn).toBe(true);

    write("__beasts", "b2", { id: "b2" });
    await tick(30_000);
    expect(sent().map((record) => record.key)).toEqual(["b1"]);
    await tick(30_000);
    expect(sent().map((record) => record.key)).toEqual(["b1", "b1", "b2"]);
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
    emitStoreRestored({ store: "__beasts", removedKeys: ["b9"] });
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

  it("a received record for a key in the outbox stops the read before it, and the local value goes up first", async () => {
    jest.useFakeTimers();
    const sync = await started();
    write("__beasts", "b1", { id: "b1", name: "Local" });
    await drain();
    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b1", 8, { id: "b1", name: "Server" }), received("__beasts", "b2", 9)]);

    await sync.download();
    // the first row is held back: the cursor does not move and nothing after it lands this round
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Local" });
    expect(mockStores.__beasts.b2).toBeUndefined();
    expect(sync.state.lastSeq).toBe(5);
    expect(fetchRecords).toHaveBeenCalledTimes(1);

    // The next round sends b1 first; the site's newest row for it is then this device's own
    fetchRecords.mockResolvedValueOnce([
      received("__beasts", "b2", 9),
      received("__beasts", "b1", 1000, { id: "b1", name: "Local" }, { deviceId: OWN }),
    ]);
    fetchRecords.mockResolvedValue([]);
    await tick(5_000);
    expect(sent()).toEqual([{ store: "__beasts", key: "b1", heroId: null, deleted: false, body: JSON.stringify({ id: "b1", name: "Local" }) }]);
    expect(putRecords.mock.invocationCallOrder[0]).toBeLessThan(fetchRecords.mock.invocationCallOrder[1]);
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Local" });
    expect(mockStores.__beasts.b2).toEqual({ id: "b2" });
    expect(sync.state.lastSeq).toBe(1000);
  });

  it("a write that lands while a page is being applied keeps its local value: the read stops before that record", async () => {
    jest.useFakeTimers();
    const sync = await started();
    mockStores.__beasts = { b2: { id: "b2", name: "Before" } };
    // The game writes b2 while the download is landing b1, before the outbox has saved it
    mockOnApply = (_store, key) => {
      if (key === "b1") write("__beasts", "b2", { id: "b2", name: "Local" });
    };
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b1", 6), received("__beasts", "b2", 7, { id: "b2", name: "Server" })]);

    await sync.download();
    mockOnApply = null;

    expect(mockStores.__beasts.b1).toEqual({ id: "b1" });
    expect(mockStores.__beasts.b2).toEqual({ id: "b2", name: "Local" });
    expect(sync.state.lastSeq).toBe(6);
    await tick(5_000);
    expect(sent()).toEqual([{ store: "__beasts", key: "b2", heroId: null, deleted: false, body: JSON.stringify({ id: "b2", name: "Local" }) }]);
  });

  it("the upload on the way to the background settles before any download starts", async () => {
    jest.useFakeTimers();
    await started();
    fetchRecords.mockClear();
    const put = held();
    putRecords.mockImplementationOnce(async (auth: unknown, device: string, records: WireRecord[]) => {
      await put.promise;
      return acceptAll(auth, device, records);
    });
    write("__beasts", "b1", { id: "b1" });
    await drain();

    showPage("hidden");
    await drain();
    expect(putRecords).toHaveBeenCalledTimes(1);

    // back in front, the 5 s send and the minute tick all wait for that upload
    showPage("visible");
    await tick(60_000);
    expect(fetchRecords).not.toHaveBeenCalled();

    put.release();
    await drain();
    expect(fetchRecords).toHaveBeenCalled();
    expect(putRecords.mock.invocationCallOrder[0]).toBeLessThan(fetchRecords.mock.invocationCallOrder[0]);
  });

  it("the first push reads the family's save first, even after a read that was cut off, and sends only what the family lacks", async () => {
    jest.useFakeTimers();
    mockSyncState = undefined;
    mockStores = {
      __beasts: { b1: { id: "b1", name: "Starter" }, b3: { id: "b3" } },
      __questLog: { q1: { id: "q1", userId: "h-1" } },
    };
    fetchRecords.mockReset();
    fetchRecords
      .mockResolvedValueOnce([received("__beasts", "b1", 1, { id: "b1", name: "Family" }), received("__beasts", "b2", 2)])
      .mockRejectedValueOnce(new TownHallError("offline"))
      .mockResolvedValue([]);

    const sync = await started();
    expect(putRecords).not.toHaveBeenCalled();
    expect(sync.state.firstPushDone).toBe(false);
    expect(sync.state.lastSeq).toBe(2);

    window.dispatchEvent(new Event("online"));
    await drain();

    expect(fetchRecords.mock.calls[2][1]).toBe(2);
    expect(fetchRecords.mock.invocationCallOrder[2]).toBeLessThan(putRecords.mock.invocationCallOrder[0]);
    expect(sent().map((record) => `${record.store}/${record.key}`).sort()).toEqual(["__beasts/b3", "__questLog/q1"]);
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Family" });
    expect(sync.state.firstPushDone).toBe(true);
  });

  it("a second Game Master device takes the family's copies and uploads only what the family lacks", async () => {
    mockSyncState = undefined;
    mockStores = { __beasts: { b1: { id: "b1", name: "Starter" }, b3: { id: "b3" } } };
    fetchRecords.mockReset();
    fetchRecords
      .mockResolvedValueOnce([received("__beasts", "b1", 4, { id: "b1", name: "Family" }), received("__beasts", "b2", 5)])
      .mockResolvedValue([]);

    const sync = await started();

    expect(sent()).toEqual([{ store: "__beasts", key: "b3", heroId: null, deleted: false, body: JSON.stringify({ id: "b3" }) }]);
    expect(mockStores.__beasts).toEqual({ b1: { id: "b1", name: "Family" }, b2: { id: "b2" }, b3: { id: "b3" } });
    expect(sync.state.firstPushDone).toBe(true);
  });

  it("a failed send backs off instead of trying again every 5 s, and the browser coming back online sends at once", async () => {
    jest.useFakeTimers();
    const sync = await started();
    putRecords.mockRejectedValue(new TownHallError("offline"));
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);
    expect(putRecords).toHaveBeenCalledTimes(1);

    for (let n = 0; n < 5; n++) {
      write("__beasts", `w${n}`, { id: `w${n}` });
      await tick(6_000);
    }
    // one more try when the first 5 s pause ended, then a 30 s pause that the writes do not cut short
    expect(putRecords).toHaveBeenCalledTimes(2);
    expect(sync.problem).toBe("offline");

    putRecords.mockImplementation(acceptAll);
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(putRecords).toHaveBeenCalledTimes(3);
    expect(sync.state.outbox).toEqual([]);
    expect(sync.problem).toBeNull();
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

  // --- The hero's turn (spec section 5) ---

  const BUSY = { answer: "busy", device: { label: "Mia's iPhone", lastSeenAt: "2026-10-22T11:55:00.000Z" } };
  const refuseTurn = async (_auth: unknown, _device: string, records: WireRecord[]) => ({
    accepted: [],
    refused: records.map((record) => ({ store: record.store, key: record.key, code: "xp_family_turn", message: "Another device is playing this hero." })),
  });

  it("signIn asks the site and holds on granted, downloads at once", async () => {
    const sync = await started();
    fetchRecords.mockClear();
    // what the device that played Mia last wrote comes down before play starts
    const fromPhone = { id: "h-1", name: { nick: "Mia" }, stats: { xp: 90 } };
    fetchRecords.mockResolvedValueOnce([received("__profiles", "h-1", 6, fromPhone, { heroId: "h-1" })]).mockResolvedValue([]);

    const answer = await sync.signIn("h-1");

    expect(answer).toBe("granted");
    expect(playHero).toHaveBeenCalledWith(PARENT, "h-1", OWN, "the family computer", false);
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sync.holds("h-1")).toBe(true);
    expect(playHero.mock.invocationCallOrder[0]).toBeLessThan(fetchRecords.mock.invocationCallOrder[0]);
    expect(mockStores.__profiles["h-1"]).toEqual(fromPhone);

    // a hero this device already holds is not asked for again
    expect(await sync.signIn("h-1")).toBe("granted");
    expect(playHero).toHaveBeenCalledTimes(1);

    // with the sync off a hero simply plays, and the site is not asked
    freshDevice();
    mockPro.isPro = false;
    const off = await started();
    playHero.mockClear();
    expect(await off.signIn("h-1")).toBe("granted");
    expect(playHero).not.toHaveBeenCalled();
  });

  it("busy keeps the hero out until play here forces it", async () => {
    jest.useFakeTimers();
    const sync = await started();
    playHero.mockResolvedValueOnce(BUSY);

    expect(await sync.signIn("h-1")).toBe("busy");
    expect(sync.turns["h-1"]).toEqual({ state: "busy", busy: BUSY.device, provisional: false });
    expect(sync.holds("h-1")).toBe(false);

    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    await tick(5_000);
    expect(sent()).toEqual([]);

    await sync.takeOver("h-1");
    expect(playHero).toHaveBeenLastCalledWith(PARENT, "h-1", OWN, "the family computer", true);
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sent().map((record) => record.key)).toEqual(["q1"]);
  });

  it("offline holds provisionally and re-asks on online", async () => {
    jest.useFakeTimers();
    const sync = await started();
    playHero.mockRejectedValue(new TownHallError("offline"));

    expect(await sync.signIn("h-1")).toBe("offline");
    // local-first: play goes on, and this device runs the hero's clocks
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: true });
    expect(sync.holds("h-1")).toBe(true);

    // the hero's records wait until the site has confirmed the turn: every send asks again first
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    await tick(5_000);
    expect(playHero).toHaveBeenCalledTimes(2);
    expect(sent()).toEqual([]);

    playHero.mockReset();
    playHero.mockResolvedValue({ answer: "granted" });
    window.dispatchEvent(new Event("online"));
    await drain();

    expect(playHero).toHaveBeenCalledWith(PARENT, "h-1", OWN, "the family computer", false);
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sent().map((record) => record.key)).toEqual(["q1"]);
    expect(playHero.mock.invocationCallOrder[0]).toBeLessThan(putRecords.mock.invocationCallOrder[0]);
  });

  it("rest uploads what waits then tells the site", async () => {
    jest.useFakeTimers();
    const sync = await started();
    await sync.signIn("h-1");
    write("__questLog", "q1", { id: "q1", userId: "h-1" });

    await sync.rest("h-1");

    expect(sent().map((record) => record.key)).toEqual(["q1"]);
    expect(restHero).toHaveBeenCalledWith(PARENT, "h-1", OWN);
    expect(putRecords.mock.invocationCallOrder[0]).toBeLessThan(restHero.mock.invocationCallOrder[0]);
    expect(sync.turns["h-1"]).toEqual({ state: "resting", busy: null, provisional: false });
    expect(sync.holds("h-1")).toBe(false);

    // a hero resting here is not given back twice
    await sync.rest("h-1");
    expect(restHero).toHaveBeenCalledTimes(1);
  });

  it("a record refused with xp_family_turn marks the hero taken over, downloads and rests", async () => {
    jest.useFakeTimers();
    const sync = await started();
    await sync.signIn("h-1");
    fetchRecords.mockClear();
    // 51 records: the first batch of 50 is refused, and the one left over is dropped with them, never sent
    for (let n = 0; n < 51; n++) write("__questLog", `q${n}`, { id: `q${n}`, userId: "h-1", status: "local" });
    write("__beasts", "b1", { id: "b1" });
    putRecords.mockImplementationOnce(refuseTurn);
    let stateWhileCatchingUp = "";
    const fromTablet = { id: "q0", userId: "h-1", status: "tablet" };
    fetchRecords.mockImplementationOnce(async () => {
      stateWhileCatchingUp = sync.turns["h-1"].state;
      return [received("__questLog", "q0", 6, fromTablet, { heroId: "h-1" })];
    });

    await tick(5_000);

    expect(putRecords.mock.calls[0][2]).toHaveLength(50);
    expect(sent().filter((record) => record.store === "__questLog")).toHaveLength(50);
    expect(sent().map((record) => record.key)).toContain("b1");
    expect(stateWhileCatchingUp).toBe("takenOver");
    expect(mockStores.__questLog.q0).toEqual(fromTablet);
    expect(sync.turns["h-1"]).toEqual({ state: "resting", busy: null, provisional: false });
    expect(sync.tookOverNotice).toBe("h-1");
    expect(sync.state.outbox).toEqual([]);
  });

  it("hero records are not sent while the hero is resting", async () => {
    jest.useFakeTimers();
    const sync = await started();
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);

    // the round carries the family record only; the hero's goes on its turn, borrowed and given back
    expect(putRecords.mock.calls.map(([, , records]) => (records as WireRecord[]).map((record) => record.key))).toEqual([["b1"], ["q1"]]);
    expect(playHero.mock.invocationCallOrder[0]).toBeLessThan(putRecords.mock.invocationCallOrder[1]);
    expect(putRecords.mock.invocationCallOrder[1]).toBeLessThan(restHero.mock.invocationCallOrder[0]);
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.state.outbox).toEqual([]);
  });

  it("withTurn takes, runs, rests, and answers false when busy", async () => {
    const sync = await started();
    const order: string[] = [];
    playHero.mockImplementation(async (_auth: unknown, heroId: string) => {
      order.push(`play ${heroId}`);
      return heroId === "h-3" ? BUSY : { answer: "granted" };
    });
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      order.push(`put ${records.map((record) => record.key).join(",")}`);
      return acceptAll(auth, device, records);
    });
    restHero.mockImplementation(async (_auth: unknown, heroId: string) => {
      order.push(`rest ${heroId}`);
    });
    const pay = jest.fn(async () => {
      order.push("pay");
      write("__questLog", "q9", { id: "q9", userId: "h-2", status: "approved" });
    });

    expect(await sync.withTurn("h-2", pay)).toBe(true);
    expect(order).toEqual(["play h-2", "pay", "put q9", "rest h-2"]);
    expect(sync.turns["h-2"]).toEqual({ state: "resting", busy: null, provisional: false });

    // another device plays h-3: nothing runs, and its turn is not forced
    const notRun = jest.fn(async () => undefined);
    expect(await sync.withTurn("h-3", notRun)).toBe(false);
    expect(notRun).not.toHaveBeenCalled();
    expect(playHero).toHaveBeenLastCalledWith(PARENT, "h-3", OWN, "the family computer", false);
    expect(sync.turns["h-3"].state).toBe("resting");

    // a hero this device plays: it simply runs, and the hero stays held
    await sync.signIn("h-1");
    order.length = 0;
    expect(await sync.withTurn("h-1", async () => undefined)).toBe(true);
    expect(order).toEqual([]);
    expect(sync.holds("h-1")).toBe(true);
  });

  it("a profile switch rests the hero who played and signs in the next; the background rests and the front signs in again", async () => {
    await started();
    const sync = useSyncStore();
    mockUser.currentUser.id = "h-1";
    await drain();
    expect(sync.holds("h-1")).toBe(true);

    mockUser.currentUser.id = "h-2";
    await drain();
    expect(restHero).toHaveBeenCalledWith(PARENT, "h-1", OWN);
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.holds("h-2")).toBe(true);

    showPage("hidden");
    await drain();
    expect(restHero).toHaveBeenLastCalledWith(PARENT, "h-2", OWN);
    expect(sync.holds("h-2")).toBe(false);

    playHero.mockClear();
    showPage("visible");
    await drain();
    expect(playHero).toHaveBeenCalledWith(PARENT, "h-2", OWN, "the family computer", false);
    expect(sync.holds("h-2")).toBe(true);
  });

  it("a hero signed out while the site was still answering is given back when the grant arrives", async () => {
    const sync = await started();
    const answer = held();
    playHero.mockImplementationOnce(async () => {
      await answer.promise;
      return { answer: "granted" };
    });

    const signingIn = sync.signIn("h-1");
    await drain();
    expect(sync.turns["h-1"].state).toBe("asking");
    await sync.rest("h-1");
    expect(restHero).not.toHaveBeenCalled();

    answer.release();
    await signingIn;
    expect(restHero).toHaveBeenCalledWith(PARENT, "h-1", OWN);
    expect(sync.turns["h-1"].state).toBe("resting");
  });

  it("the copy of the device holding a hero lands over a change made here without the turn, and the change is dropped", async () => {
    jest.useFakeTimers();
    const sync = await started();
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "here" });
    write("__beasts", "b1", { id: "b1", name: "Local" });
    await drain();
    putRecords.mockImplementation(() => new Promise(() => undefined));
    fetchRecords.mockResolvedValueOnce([
      received("__questLog", "q1", 6, { id: "q1", userId: "h-1", status: "phone" }, { heroId: "h-1" }),
      received("__beasts", "b1", 7, { id: "b1", name: "Server" }),
    ]);

    await sync.download();

    // the hero's record lands; the family record changed here is still held back
    expect(mockStores.__questLog.q1).toEqual({ id: "q1", userId: "h-1", status: "phone" });
    expect(mockStores.__beasts.b1).toEqual({ id: "b1", name: "Local" });
    expect(sync.state.lastSeq).toBe(6);
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["b1"]);
    expect(debug.warn).toHaveBeenCalledWith(expect.stringContaining("__questLog/q1"));
  });

  // --- Borrowed turns (the coordinator's ruling: after every round, and as the first push's way to send heroes) ---

  it("the first push sends two heroes' records by taking and resting each turn", async () => {
    jest.useFakeTimers();
    mockSyncState = undefined;
    mockStores = {
      __beasts: { b1: { id: "b1" } },
      __profiles: { "h-1": { id: "h-1", name: { nick: "Mia" } }, "h-2": { id: "h-2", name: { nick: "Leo" } } },
      __questLog: { q1: { id: "q1", userId: "h-1" }, q2: { id: "q2", userId: "h-2" } },
    };
    const order: string[] = [];
    playHero.mockImplementation(async (_auth: unknown, heroId: string, _device: string, _label: string, force: boolean) => {
      order.push(`play ${heroId}${force ? " force" : ""}`);
      return { answer: "granted" };
    });
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      order.push(`put ${records.map((record) => `${record.store}/${record.key}`).sort().join(",")}`);
      return acceptAll(auth, device, records);
    });
    restHero.mockImplementation(async (_auth: unknown, heroId: string) => {
      order.push(`rest ${heroId}`);
    });

    const sync = await started();
    await drain();

    expect(order).toEqual([
      "put __beasts/b1",
      "play h-1",
      "put __profiles/h-1,__questLog/q1",
      "rest h-1",
      "play h-2",
      "put __profiles/h-2,__questLog/q2",
      "rest h-2",
    ]);
    expect(sync.state.firstPushDone).toBe(true);
    expect(sync.state.outbox).toEqual([]);
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.turns["h-2"].state).toBe("resting");
  });

  it("a busy hero's records stay queued and are dropped when the holder's record lands", async () => {
    jest.useFakeTimers();
    const sync = await started();
    // a borrow's busy answer rests at once: never a busy turn a stale portal could ask about
    const states: string[] = [];
    watch(() => sync.turns["h-1"]?.state, (state) => states.push(String(state)), { flush: "sync" });
    playHero.mockResolvedValue(BUSY);
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "here" });
    await tick(5_000);

    expect(playHero).toHaveBeenCalledWith(PARENT, "h-1", OWN, "the family computer", false);
    expect(sent()).toEqual([]);
    expect(restHero).not.toHaveBeenCalled();
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(states).toEqual(["asking", "resting"]);
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q1"]);

    const fromPhone = { id: "q1", userId: "h-1", status: "phone" };
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    await tick(60_000);

    expect(mockStores.__questLog.q1).toEqual(fromPhone);
    expect(sync.state.outbox).toEqual([]);
    expect(sent()).toEqual([]);
    expect(debug.warn).toHaveBeenCalledWith(expect.stringContaining("__questLog/q1"));
  });

  it("the hero signed in here is never borrowed", async () => {
    jest.useFakeTimers();
    const sync = await started();
    mockUser.currentUser.id = "h-1";
    await drain();
    // the background rests the hero; it is still the one signed in here
    showPage("hidden");
    await drain();
    expect(sync.turns["h-1"].state).toBe("resting");
    playHero.mockClear();

    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    await tick(5_000);
    await tick(60_000);
    expect(playHero).not.toHaveBeenCalled();
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q1"]);

    showPage("visible");
    await drain();
    expect(playHero).toHaveBeenCalledTimes(1);
    expect(sent().map((record) => record.key)).toEqual(["q1"]);
  });

  it("a borrowed turn stays here while its send fails, and is given back once the send goes; again when the site did not hear it", async () => {
    jest.useFakeTimers();
    const sync = await started();
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      const carriesHero = records.some((record) => record.heroId !== null);
      if (carriesHero) throw failWith(503);
      return acceptAll(auth, device, records);
    });
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);

    // the record did not reach the site: the turn is not given back, so no other device plays the hero without it
    expect(sent().map((record) => record.key)).toEqual(["b1", "q1"]);
    expect(restHero).not.toHaveBeenCalled();
    expect(sync.holds("h-1")).toBe(true);
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q1"]);

    // the pause after the failure ends: the round sends the record on the turn still held here, then the rest owed gives
    // the turn back; the site does not hear it the first time, so the same pass gives it back again
    putRecords.mockImplementation(acceptAll);
    restHero.mockRejectedValueOnce(new TownHallError("offline"));
    await tick(5_000);
    expect(sent().map((record) => record.key)).toEqual(["b1", "q1", "q1"]);
    expect(restHero.mock.calls.map(([, heroId]) => heroId)).toEqual(["h-1", "h-1"]);
    expect(putRecords.mock.invocationCallOrder[2]).toBeLessThan(restHero.mock.invocationCallOrder[0]);
    expect(sync.state.outbox).toEqual([]);
    expect(sync.turns["h-1"].state).toBe("resting");

    // heard: nothing is owed any more
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(restHero).toHaveBeenCalledTimes(2);
  });

  it("a rest whose send fails keeps the hero held on the site, and sends then rests after the next good round", async () => {
    jest.useFakeTimers();
    const sync = await started();
    await sync.signIn("h-1");
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    putRecords.mockRejectedValueOnce(failWith(503));

    await sync.rest("h-1");

    expect(restHero).not.toHaveBeenCalled();
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q1"]);

    // the pause ends: the round sends the record, and the rest still owed gives the turn back after it
    await tick(5_000);
    expect(sent().map((record) => record.key)).toEqual(["q1", "q1"]);
    expect(restHero).toHaveBeenCalledWith(PARENT, "h-1", OWN);
    expect(putRecords.mock.invocationCallOrder[1]).toBeLessThan(restHero.mock.invocationCallOrder[0]);
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.state.outbox).toEqual([]);
  });

  it("a rest while a pause runs sends nothing and keeps the hero held; the player picking the hero again keeps it", async () => {
    jest.useFakeTimers();
    const sync = await started();
    await sync.signIn("h-1");
    // a family record's send fails: a pause starts
    putRecords.mockRejectedValueOnce(failWith(503));
    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);
    expect(putRecords).toHaveBeenCalledTimes(1);

    // the app goes to the background during the pause: nothing can go, so the turn stays here
    write("__questLog", "q1", { id: "q1", userId: "h-1" });
    await sync.rest("h-1");
    expect(putRecords).toHaveBeenCalledTimes(1);
    expect(restHero).not.toHaveBeenCalled();
    expect(sync.holds("h-1")).toBe(true);

    // the player is back on the hero before the pause ends: it plays on, and no rest is owed any more
    expect(await sync.signIn("h-1")).toBe("granted");
    await tick(5_000);
    expect(sent().map((record) => record.key).sort()).toEqual(["b1", "b1", "q1"]);
    expect(restHero).not.toHaveBeenCalled();
    expect(sync.holds("h-1")).toBe(true);
  });

  it("a hero the site no longer knows ends its restored hold and is not asked about again", async () => {
    jest.useFakeTimers();
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 5, turns: { "h-9": "held" } });
    playHero.mockRejectedValue(failWith(404, "xp_family_no_hero"));
    restHero.mockRejectedValue(failWith(404, "xp_family_no_hero"));
    const sync = await started();
    await drain();
    expect(sync.turns["h-9"].state).toBe("resting");
    const asked = playHero.mock.calls.length;
    const givenBack = restHero.mock.calls.length;

    write("__beasts", "b1", { id: "b1" });
    await tick(5_000);
    window.dispatchEvent(new Event("online"));
    await drain();

    expect(playHero.mock.calls.length).toBe(asked);
    expect(restHero.mock.calls.length).toBe(givenBack);
    const said = (debug.warn as jest.Mock).mock.calls.filter(([line]) => String(line).includes("hero h-9"));
    expect(said).toHaveLength(1);
  });

  it("the saved turns follow the last change even while a save is still on its way", async () => {
    const sync = await started();
    await sync.signIn("h-1");
    expect((mockSyncState as SyncState).turns).toEqual({ "h-1": "held" });

    // the resting save is held on its way; meanwhile the hero is held again (the sync off: Play here plays locally)
    const gate = held();
    mockSaveGate = gate.promise;
    await sync.rest("h-1");
    mockPro.isPro = false;
    await sync.takeOver("h-1");
    expect(sync.holds("h-1")).toBe(true);
    mockSaveGate = null;
    gate.release();
    await drain();

    expect((mockSyncState as SyncState).turns).toEqual({ "h-1": "held" });
  });

  it("work still waiting on the lane when the device leaves the family does nothing afterwards", async () => {
    const sync = await started();
    const gate = held();
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      await gate.promise;
      return acceptAll(auth, device, records);
    });
    write("__beasts", "b1", { id: "b1" });
    const uploading = sync.upload();
    await drain();
    expect(putRecords).toHaveBeenCalledTimes(1);
    fetchRecords.mockClear();
    fetchRecords.mockResolvedValue([received("__beasts", "b2", 9)]);
    const downloading = sync.download();

    await sync.reset();
    gate.release();
    await uploading;
    await downloading;
    await drain();

    expect(fetchRecords).not.toHaveBeenCalled();
    expect(mockStores.__beasts?.b2).toBeUndefined();
  });

  // --- Fix round 1 ---

  /** The put waits until the test lets it go */
  const holdPuts = () => {
    const gate = held();
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      await gate.promise;
      return acceptAll(auth, device, records);
    });
    return gate;
  };

  it("the front coming back while the background rest is uploading keeps the hero held, and the site is not told", async () => {
    const sync = await started();
    mockUser.currentUser.id = "h-1";
    await drain();
    expect(sync.holds("h-1")).toBe(true);
    const gate = holdPuts();
    write("__questLog", "q1", { id: "q1", userId: "h-1" });

    showPage("hidden");
    await drain();
    expect(putRecords).toHaveBeenCalledTimes(1);
    showPage("visible");
    await drain();
    gate.release();
    await drain();

    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(restHero).not.toHaveBeenCalled();
    expect(playHero).toHaveBeenCalledTimes(1);
    expect(sent().map((record) => record.key)).toEqual(["q1"]);
  });

  it("re-picking the hero while Save & Quit's rest is uploading keeps the hero held", async () => {
    const sync = await started();
    mockUser.currentUser.id = "h-1";
    await drain();
    const gate = holdPuts();
    write("__questLog", "q1", { id: "q1", userId: "h-1" });

    // Save & Quit signs out; the picker picks the same hero again before the upload is done
    mockUser.currentUser.id = null;
    await drain();
    const picked = sync.signIn("h-1");
    await drain();
    gate.release();

    expect(await picked).toBe("granted");
    await drain();
    expect(sync.holds("h-1")).toBe(true);
    expect(restHero).not.toHaveBeenCalled();
    mockUser.currentUser.id = "h-1";
    await drain();
    expect(playHero).toHaveBeenCalledTimes(1);
  });

  it("a sign-in while an earlier ask is still out joins it, and the turn this device plays is never given back", async () => {
    const sync = await started();
    const answer = held();
    playHero.mockImplementationOnce(async () => {
      await answer.promise;
      return { answer: "granted" };
    });
    mockUser.currentUser.id = "h-1";
    await drain();
    expect(sync.turns["h-1"].state).toBe("asking");

    // the background rests the hero while the ask is out, and the front signs it in again
    showPage("hidden");
    await drain();
    expect(sync.turns["h-1"].state).toBe("resting");
    showPage("visible");
    await drain();
    expect(sync.turns["h-1"].state).toBe("asking");
    expect(playHero).toHaveBeenCalledTimes(1);

    answer.release();
    await drain();
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(restHero).not.toHaveBeenCalled();
  });

  it("an offline hold the site answers busy keeps its play until the player answers: Not now yields, Play here sends", async () => {
    jest.useFakeTimers();
    const sync = await started();
    playHero.mockRejectedValue(new TownHallError("offline"));
    await sync.signIn("h-1");
    await sync.signIn("h-2");
    const offlinePlay = { id: "q1", userId: "h-1", status: "offline play" };
    write("__questLog", "q1", offlinePlay);
    write("__questLog", "q2", { id: "q2", userId: "h-2", status: "offline play" });
    await drain();

    // back online: the site says another device plays both heroes now
    playHero.mockReset();
    playHero.mockImplementation(async (_auth: unknown, _hero: string, _device: string, _label: string, force: boolean) =>
      force ? { answer: "granted" } : BUSY
    );
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(sync.turns["h-1"].state).toBe("busy");
    expect(sync.turns["h-2"].state).toBe("busy");
    expect(sent()).toEqual([]);

    // until the player answers, the holder's copy does not land over the offline play
    const fromPhone = { id: "q1", userId: "h-1", status: "phone" };
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    await sync.download();
    expect(mockStores.__questLog.q1).toEqual(offlinePlay);
    expect(sync.state.lastSeq).toBe(5);

    // Not now: the holder's copy lands and the offline change is dropped
    await sync.rest("h-1");
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    await sync.download();
    expect(mockStores.__questLog.q1).toEqual(fromPhone);
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q2"]);

    // Play here: the offline play goes up
    await sync.takeOver("h-2");
    expect(sync.turns["h-2"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sent().map((record) => record.key)).toEqual(["q2"]);
  });

  it("a hero the site does not know loses its queued records once this device no longer has it", async () => {
    jest.useFakeTimers();
    const sync = await started();
    mockUser.users = { "h-8": { id: "h-8" } };
    playHero.mockRejectedValue(failWith(404, "xp_family_no_hero"));
    write("__questLog", "q8", { id: "q8", userId: "h-8" });
    write("__questLog", "q9", { id: "q9", userId: "h-9" });
    await tick(5_000);

    // h-9 was removed here: its record goes; h-8 is still here (not registered yet): its record waits
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q8"]);
    expect(sync.turns["h-9"].state).toBe("resting");
    const said = (debug.warn as jest.Mock).mock.calls.filter(([line]) => String(line).includes("hero h-9"));
    expect(said).toHaveLength(1);
    mockUser.users = {};
  });

  it("with the sync off, a switch rests the old hero here and Play here plays locally; back on, only the current hero signs in", async () => {
    const sync = await started();
    mockUser.currentUser.id = "h-1";
    await drain();
    expect(sync.holds("h-1")).toBe(true);

    mockPro.isPro = false;
    await drain();
    mockUser.currentUser.id = "h-2";
    await drain();
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.turns["h-2"]).toBeUndefined();

    playHero.mockClear();
    mockPro.isPro = true;
    await drain();
    expect(playHero.mock.calls.map(([, heroId]) => heroId)).toEqual(["h-2"]);
    expect(sync.holds("h-2")).toBe(true);
    expect(sync.turns["h-1"].state).toBe("resting");

    // Play here while the sync is off: the hero plays here, held until the site can be asked
    playHero.mockResolvedValueOnce(BUSY);
    await sync.signIn("h-3");
    mockPro.isPro = false;
    await drain();
    await sync.takeOver("h-3");
    expect(sync.turns["h-3"]).toEqual({ state: "held", busy: null, provisional: true });
  });

  // --- Fix round 2 ---

  it("a sign-in after an ask decided to give the turn back waits for it, then asks again and holds", async () => {
    const sync = await started();
    const answer = held();
    const givenBack = held();
    playHero.mockImplementationOnce(async () => {
      await answer.promise;
      return { answer: "granted" };
    });
    restHero.mockImplementationOnce(async () => {
      await givenBack.promise;
    });
    mockUser.currentUser.id = "h-1";
    await drain();
    showPage("hidden");
    await drain();
    // the grant arrives for a hero that rests now: it is being given back
    answer.release();
    await drain();
    expect(restHero).toHaveBeenCalledTimes(1);

    showPage("visible");
    await drain();
    expect(playHero).toHaveBeenCalledTimes(1);
    expect(sync.turns["h-1"].state).toBe("resting");
    givenBack.release();
    await drain();

    expect(playHero).toHaveBeenCalledTimes(2);
    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sync.holds("h-1")).toBe(true);
  });

  it("a busy answer heard after the hero rested holds nothing back", async () => {
    const sync = await started();
    const answer = held();
    playHero.mockImplementationOnce(async () => {
      await answer.promise;
      return BUSY;
    });
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "here" });
    const signingIn = sync.signIn("h-1");
    await drain();
    await sync.rest("h-1");
    answer.release();
    expect(await signingIn).toBe("busy");
    expect(sync.turns["h-1"].state).toBe("resting");

    const fromPhone = { id: "q1", userId: "h-1", status: "phone" };
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    await sync.download();
    expect(mockStores.__questLog.q1).toEqual(fromPhone);
    expect(sync.state.outbox).toEqual([]);
  });

  it("an offline hold rested while its confirm hears busy ends with nothing held back", async () => {
    const sync = await started();
    playHero.mockRejectedValue(new TownHallError("offline"));
    await sync.signIn("h-1");
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "offline play" });
    playHero.mockReset();
    playHero.mockResolvedValue(BUSY);

    await sync.rest("h-1");
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sent()).toEqual([]);

    const fromPhone = { id: "q1", userId: "h-1", status: "phone" };
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    await sync.download();
    expect(mockStores.__questLog.q1).toEqual(fromPhone);
    expect(sync.state.outbox).toEqual([]);
  });

  it("Play here answered busy keeps the hero busy and its changes kept", async () => {
    const sync = await started();
    playHero.mockResolvedValue(BUSY);
    expect(await sync.signIn("h-1")).toBe("busy");
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "here" });
    await drain();

    await sync.takeOver("h-1");
    expect(playHero).toHaveBeenLastCalledWith(PARENT, "h-1", OWN, "the family computer", true);
    expect(sync.turns["h-1"].state).toBe("busy");
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 6, { id: "q1", userId: "h-1", status: "phone" }, { heroId: "h-1" })]);
    await sync.download();
    expect(mockStores.__questLog.q1).toEqual({ id: "q1", userId: "h-1", status: "here" });
  });

  it("the turns are saved, and after a restart a hero held here is held again until the site answers; busy keeps its play", async () => {
    let sync = await started();
    await sync.signIn("h-1");
    expect((mockSyncState as SyncState).turns).toEqual({ "h-1": "held" });
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "offline play" });
    await drain();

    // the app is killed while it plays; on the next start another device plays the hero
    freshDevice();
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 5, turns: { "h-1": "held" }, outbox: [{ store: "__questLog", key: "q1", heroId: "h-1", queuedAt: "2026-10-22T10:00:00.000Z" }] });
    mockUser.currentUser.id = "h-1";
    playHero.mockResolvedValue(BUSY);
    const fromPhone = { id: "q1", userId: "h-1", status: "phone" };
    fetchRecords.mockResolvedValue([received("__questLog", "q1", 6, fromPhone, { heroId: "h-1" })]);
    sync = await started();

    expect(sync.turns["h-1"].state).toBe("busy");
    expect(mockStores.__questLog.q1).toEqual({ id: "q1", userId: "h-1", status: "offline play" });
    expect(sync.state.outbox.map((item) => item.key)).toEqual(["q1"]);
    expect(sync.state.lastSeq).toBe(5);
  });

  it("after a restart the hero the player is on is confirmed and plays on; one held for a borrow is sent and rested", async () => {
    mockSyncState = syncState({
      firstPushDone: true,
      lastSeq: 5,
      turns: { "h-1": "held", "h-2": "held" },
      outbox: [
        { store: "__questLog", key: "q1", heroId: "h-1", queuedAt: "2026-10-22T10:00:00.000Z" },
        { store: "__questLog", key: "q2", heroId: "h-2", queuedAt: "2026-10-22T10:00:01.000Z" },
      ],
    });
    mockStores = { __questLog: { q1: { id: "q1", userId: "h-1" }, q2: { id: "q2", userId: "h-2" } } };
    mockUser.currentUser.id = "h-1";

    const sync = await started();
    await drain();

    expect(sync.turns["h-1"]).toEqual({ state: "held", busy: null, provisional: false });
    expect(sync.turns["h-2"].state).toBe("resting");
    expect(sent().map((record) => record.key).sort()).toEqual(["q1", "q2"]);
    expect(restHero.mock.calls.map(([, heroId]) => heroId)).toEqual(["h-2"]);
    expect((mockSyncState as SyncState).turns).toEqual({ "h-1": "held", "h-2": "resting" });
  });

  // --- Verdicts and claims under one writer (spec section 6, and the takeover re-send of section 5) ---

  /** A claim waiting on a Game Master, as the quest log holds it */
  const claimEntry = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    questId: "q-dishes",
    questName: "Dishes",
    userId: "h-1",
    status: "pending",
    source: "claim",
    rewards: { xp: 30, gp: 40, ap: 2 },
    completedAt: "2026-10-22T09:00:00.000Z",
    ...over,
  });
  const verdictOf = (claimId: string, status: "approved" | "rejected" = "approved", note = "") => ({ claimId, questId: "q-dishes", status, note, xp: 0, gp: 0, ap: 0 });
  /** A verdict another Game Master device sent, as the family's event download reads it */
  const settledEvent = (seq: number, claimId: string, heroId = "h-1", status: "approved" | "rejected" = "approved") => ({
    seq,
    id: `ev-${seq}`,
    heroId,
    deviceId: OTHER,
    kind: "claim.settled" as const,
    scope: "family" as const,
    at: "2026-10-22T10:00:00.000Z",
    receivedAt: "2026-10-22T10:00:01.000Z",
    data: verdictOf(claimId, status),
  });
  /** The events the family store queued for the site */
  const queuedEvents = () => mockFamilyState.outbox.map(({ kind, heroId, deviceId, data }) => ({ kind, heroId, deviceId, data }));

  it("sendVerdict pays through withTurn when nobody holds the hero", async () => {
    mockFamilyState = familyState({ lastCards: { "h-1": "{}", "h-2": "{}" } });
    const sync = await started();
    mockStores.__questLog = { e1: claimEntry("e1") };
    const order: string[] = [];
    playHero.mockImplementation(async (_auth: unknown, heroId: string) => {
      order.push(`play ${heroId}`);
      return heroId === "h-2" ? BUSY : { answer: "granted" };
    });
    putRecords.mockImplementation(async (auth: unknown, device: string, records: WireRecord[]) => {
      order.push(`put ${records.map((record) => record.key).join(",")}`);
      return acceptAll(auth, device, records);
    });
    restHero.mockImplementation(async (_auth: unknown, heroId: string) => {
      order.push(`rest ${heroId}`);
    });

    await sync.sendVerdict(verdictOf("e1"), "h-1");
    // Approvals says so at once
    expect(sync.state.verdictsSent.e1).toEqual({ approved: true, at: expect.any(String) });
    await drain();

    expect(queuedEvents()).toEqual([{ kind: "claim.settled", heroId: "h-1", deviceId: OWN, data: verdictOf("e1") }]);
    expect(order).toEqual(["play h-1", "put e1", "rest h-1"]);
    expect(mockPays).toEqual(["e1"]);
    expect(mockStores.__questLog.e1).toMatchObject({ status: "approved", rewardsApplied: true });
    expect(sync.turns["h-1"].state).toBe("resting");
    expect(sync.state.pendingVerdicts).toEqual({});
    expect(sync.state.verdictsSent).toEqual({});

    // h-2 plays on another device: the verdict waits for that device, and Approvals says so until its copy lands
    mockStores.__questLog.e2 = claimEntry("e2", { userId: "h-2" });
    await sync.sendVerdict(verdictOf("e2", "rejected", "Under the bed too"), "h-2");
    await drain();
    expect(mockPays).toEqual(["e1"]);
    expect(mockStores.__questLog.e2).toMatchObject({ status: "pending" });
    expect(sync.state.verdictsSent.e2).toEqual({ approved: false, at: expect.any(String) });
    expect(sync.state.pendingVerdicts.e2).toMatchObject({ claimId: "e2", heroId: "h-2", status: "rejected", note: "Under the bed too" });

    const fromPhone = claimEntry("e2", { userId: "h-2", status: "rejected", note: "Under the bed too" });
    fetchRecords.mockResolvedValueOnce([received("__questLog", "e2", 6, fromPhone, { heroId: "h-2" })]).mockResolvedValue([]);
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(mockStores.__questLog.e2).toEqual(fromPhone);
    expect(sync.state.pendingVerdicts).toEqual({});
    expect(sync.state.verdictsSent).toEqual({});
  });

  it("a verdict for an entry not yet here waits in pendingVerdicts and applies after the download", async () => {
    const sync = await started();
    await sync.signIn("h-1");
    fetchEvents.mockResolvedValueOnce([settledEvent(7, "e1")]);

    await useFamilyStore().download();

    expect(mockPays).toEqual([]);
    expect(sync.state.pendingVerdicts).toEqual({ e1: expect.objectContaining({ ...verdictOf("e1"), heroId: "h-1", seq: 7 }) });

    // the claim's entry comes down with the next round, and the verdict waiting for it is applied here, once
    fetchRecords.mockResolvedValueOnce([received("__questLog", "e1", 6, claimEntry("e1"), { heroId: "h-1" })]).mockResolvedValue([]);
    window.dispatchEvent(new Event("online"));
    await drain();

    expect(mockPays).toEqual(["e1"]);
    expect(mockStores.__questLog.e1).toMatchObject({ status: "approved" });
    expect(sync.state.pendingVerdicts).toEqual({});
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(mockPays).toEqual(["e1"]);
  });

  it("two devices settling one claim pay once", async () => {
    mockFamilyState = familyState({ lastCards: { "h-1": "{}" } });
    const tablet = await started();
    mockStores.__questLog = { e1: claimEntry("e1") };
    await tablet.sendVerdict(verdictOf("e1"), "h-1");
    await drain();
    expect(mockPays).toEqual(["e1"]);
    const paidCopy = mockStores.__questLog.e1;

    // the second Game Master device still shows the claim pending and approves it too; the turn it borrows downloads
    // the tablet's copy first, so the verdict finds the claim settled
    freshDevice();
    mockFamilyState = familyState({ lastCards: { "h-1": "{}" } });
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 5 });
    const second = await started();
    mockStores.__questLog = { e1: claimEntry("e1") };
    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__questLog", "e1", 1001, paidCopy, { heroId: "h-1" })]).mockResolvedValue([]);
    await second.sendVerdict(verdictOf("e1"), "h-1");
    await drain();

    expect(mockStores.__questLog.e1).toEqual(paidCopy);
    // and the tablet's own verdict, read from the family's events, finds it settled too
    fetchEvents.mockResolvedValueOnce([settledEvent(8, "e1")]);
    await useFamilyStore().download();

    expect(mockPays).toEqual(["e1"]);
    expect(second.state.pendingVerdicts).toEqual({});
  });

  it("a verdict for a hero another device holds waits, and is applied here once the hero is free; one whose entry never comes goes after a week", async () => {
    const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    mockSyncState = syncState({
      firstPushDone: true,
      lastSeq: 5,
      pendingVerdicts: { lost: { ...verdictOf("lost"), heroId: "h-1", seq: 3, at: weekAgo } },
    });
    const sync = await started();
    expect(sync.state.pendingVerdicts).toEqual({});

    mockStores.__questLog = { e2: claimEntry("e2", { userId: "h-2" }) };
    playHero.mockResolvedValue(BUSY);
    fetchEvents.mockResolvedValueOnce([settledEvent(7, "e2", "h-2")]);
    await useFamilyStore().download();
    expect(mockPays).toEqual([]);
    expect(sync.state.pendingVerdicts.e2).toMatchObject({ claimId: "e2", heroId: "h-2", seq: 7 });

    // the phone holding h-2 rested before it read the verdict: the next round finds the hero free and pays it here
    playHero.mockResolvedValue({ answer: "granted" });
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(mockPays).toEqual(["e2"]);
    expect(sync.state.pendingVerdicts).toEqual({});
  });

  it("a pending claim refused in a takeover is re-sent as an unsynced claim event", async () => {
    jest.useFakeTimers();
    mockFamilyState = familyState({ lastCards: { "h-1": "{}" } });
    const sync = await started();
    await sync.signIn("h-1");
    write("__questLog", "e1", claimEntry("e1"));
    write("__questLog", "e2", claimEntry("e2", { questId: "q-trash", status: "approved", rewardsApplied: true }));
    // a long offline stretch: the refused put carries 50 records, and the takeover drops the rest of the hero's queue unsent
    for (let n = 0; n < 48; n++) write("__questLog", `f${n}`, { id: `f${n}`, userId: "h-1", status: "local" });
    write("__questLog", "e3", claimEntry("e3", { questId: "q-laundry", completedAt: "2026-10-22T08:15:00.000Z" }));
    putRecords.mockImplementationOnce(refuseTurn);

    await tick(5_000);

    expect(sync.tookOverNotice).toBe("h-1");
    expect(sent().map((record) => record.key)).not.toContain("e3");
    // each held claim goes again as a phone-style claim, dated when the hero made it, for the device now holding the
    // hero; the paid one is not re-paid
    const claims = mockFamilyState.outbox.filter((e) => e.kind === "quest.claimed").map(({ kind, heroId, deviceId, data, at }) => ({ kind, heroId, deviceId, data, at }));
    expect(claims).toEqual([
      { kind: "quest.claimed", heroId: "h-1", deviceId: OWN, data: { questId: "q-dishes", difficulty: 1, requiresApproval: true }, at: "2026-10-22T09:00:00.000Z" },
      { kind: "quest.claimed", heroId: "h-1", deviceId: OWN, data: { questId: "q-laundry", difficulty: 1, requiresApproval: true }, at: "2026-10-22T08:15:00.000Z" },
    ]);
    // this device's copies of the claims go: the holder writes each claim's entry when it takes it
    expect(mockStores.__questLog.e1).toBeUndefined();
    expect(mockStores.__questLog.e3).toBeUndefined();
    expect(mockStores.__questLog.e2).toBeDefined();
  });

  it("a kid phone sends its hero's approval-loop events with its own key", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 5 });
    await started();
    const sendEvents = server.sendEvents as jest.Mock;
    sendEvents.mockClear();

    await useFamilyStore().queueApprovalEvent("h-1", (deviceId) => questClaimedEvent("h-1", deviceId, { questId: "q-dishes", difficulty: 2, requiresApproval: true }));
    await drain();

    expect(sendEvents).toHaveBeenCalledTimes(1);
    const [auth, events] = sendEvents.mock.calls[0];
    expect(auth).toEqual({ kind: "hero", key: HERO_KEY });
    expect(events).toEqual([expect.objectContaining({ kind: "quest.claimed", heroId: "h-1", deviceId: OWN, data: { questId: "q-dishes", difficulty: 2, requiresApproval: true } })]);
  });

  /** A claim made on another device with no synced mark (Part 1's, or a takeover's re-send), received by the site at `receivedAt` */
  const claimEvent = (seq: number, id: string, heroId = "h-1", receivedAt = new Date(Date.now() + 60_000).toISOString()) => ({
    seq,
    id,
    heroId,
    deviceId: OTHER,
    kind: "quest.claimed" as const,
    scope: "family" as const,
    at: "2026-10-22T09:00:00.000Z",
    receivedAt,
    data: { questId: "q-dishes", difficulty: 2, requiresApproval: true },
  });
  const monthAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  it("an old unmarked claim event from another device is not taken on a freshly linked phone; a claim received after the mark is", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 5 });
    // the phone reads its hero's events from the beginning: a month-old claim from the family device, and a new one
    fetchEvents.mockResolvedValueOnce([claimEvent(3, "c-old", "h-1", monthAgo()), claimEvent(4, "c-new")]);

    const sync = await started();
    await drain();

    expect(sync.state.claimsSince).toEqual(expect.any(String));
    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-new"]);
  });

  it("a newly bound Game Master device skips the family's history the same way; a device that has read the events takes what it has not", async () => {
    fetchEvents.mockResolvedValueOnce([claimEvent(3, "c-old", "h-1", monthAgo()), claimEvent(4, "c-new")]);
    await started();
    await drain();
    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-new"]);

    freshDevice();
    mockFamilyState = familyState({ lastSeq: 2 });
    mockTakePhoneClaim.mockClear();
    fetchEvents.mockReset();
    fetchEvents.mockResolvedValueOnce([claimEvent(3, "c-old", "h-1", monthAgo())]).mockResolvedValue([]);
    const sync = await started();
    await drain();
    expect(sync.state.claimsSince).toBeNull();
    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-old"]);
  });

  it("a device 12 pages behind catches up fully before applying; one that cannot catch up applies nothing and rests the turn", async () => {
    mockFamilyState = familyState({ lastCards: { "h-1": "{}", "h-2": "{}" } });
    const sync = await started();
    mockStores.__questLog = { e1: claimEntry("e1"), e2: claimEntry("e2", { userId: "h-2" }) };
    // the holder approved e1 and paid it; its copy is the twelfth page this device has not read yet
    const paidCopy = claimEntry("e1", { status: "approved", rewardsApplied: true });
    const pages = Array.from({ length: 12 }, (_, page) => [received("__beasts", `b${page}`, 10 + page)]);
    pages[11] = [received("__questLog", "e1", 21, paidCopy, { heroId: "h-1" })];
    fetchRecords.mockReset();
    fetchRecords.mockImplementation(async (_auth: unknown, since: number) => pages.find((page) => page[0].seq > since) ?? []);

    await sync.sendVerdict(verdictOf("e1"), "h-1");
    await drain();

    expect(fetchRecords.mock.calls.length).toBeGreaterThanOrEqual(13);
    expect(mockStores.__questLog.e1).toEqual(paidCopy);
    expect(mockPays).toEqual([]);
    expect(sync.state.pendingVerdicts).toEqual({});

    // the connection drops in the middle of the catch-up: nothing is applied, the borrowed turn is given back, the verdict waits
    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b99", 40)]).mockRejectedValue(new TownHallError("offline"));
    restHero.mockClear();
    await sync.sendVerdict(verdictOf("e2"), "h-2");
    await drain();

    expect(mockPays).toEqual([]);
    expect(mockStores.__questLog.e2).toMatchObject({ status: "pending" });
    expect(restHero).toHaveBeenCalledWith(PARENT, "h-2", OWN);
    expect(sync.turns["h-2"].state).toBe("resting");
    expect(sync.state.pendingVerdicts.e2).toMatchObject({ claimId: "e2", heroId: "h-2" });
  });

  it("the device that applies a verdict on a claim taken from a phone tells the phone, with the pay", async () => {
    mockFamilyState = familyState({ lastCards: { "h-1": "{}" } });
    const sync = await started();
    mockStores.__questLog = { e1: claimEntry("e1", { source: "phone", phoneClaimId: "pc-1" }) };

    await sync.sendVerdict(verdictOf("e1"), "h-1");
    await drain();

    expect(mockPays).toEqual(["e1"]);
    expect(queuedEvents()).toEqual([
      { kind: "claim.settled", heroId: "h-1", deviceId: OWN, data: verdictOf("e1") },
      { kind: "claim.settled", heroId: "h-1", deviceId: OWN, data: { claimId: "pc-1", questId: "q-dishes", status: "approved", note: "", xp: 30, gp: 40, ap: 2 } },
    ]);
  });

  it("a phone claim or a reward left for a busy holder is kept, and taken once the hero is free", async () => {
    mockFamilyState = familyState({ lastSeq: 9, lastCards: { "h-2": "{}" } });
    const sync = await started();
    playHero.mockResolvedValue(BUSY);
    const reward = { ...claimEvent(11, "r-2", "h-2"), kind: "reward.granted" as const, deviceId: "srv", data: { xp: 50, ap: 3, reason: "Quest Together bonus" } };
    fetchEvents.mockResolvedValueOnce([claimEvent(10, "c-2", "h-2"), reward]);

    await useFamilyStore().download();

    expect(mockTakePhoneClaim).not.toHaveBeenCalled();
    // one ask for the hero's turn covers both
    expect(playHero.mock.calls.filter(([, heroId]) => heroId === "h-2")).toHaveLength(1);
    expect(Object.keys(sync.state.waitingEvents).sort()).toEqual(["c-2", "r-2"]);
    expect(sync.state.waitingEvents["c-2"]).toMatchObject({ heroId: "h-2", keptAt: expect.any(String) });

    // the holder rested before it read them: the next round finds the hero free, and this device takes both on one turn
    playHero.mockClear();
    playHero.mockResolvedValue({ answer: "granted" });
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(playHero.mock.calls.filter(([, heroId]) => heroId === "h-2")).toHaveLength(1);

    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-2"]);
    expect(applyQuestRewards).toHaveBeenCalledWith("h-2", { xp: 50, gp: 0, ap: 3 }, "party:r-2");
    expect(sync.state.waitingEvents).toEqual({});
    expect(queuedEvents().filter((e) => e.kind === "claim.settled").map((e) => e.data.claimId)).toEqual(["c-2"]);
  });

  it("a kept claim is not taken on a provisional hold: it waits until the site has confirmed the hold", async () => {
    const keptAt = new Date().toISOString();
    mockSyncState = syncState({ firstPushDone: true, lastSeq: 5, waitingEvents: { "c-2": { ...claimEvent(10, "c-2", "h-2"), keptAt } } });
    // the site cannot be asked for turns: the first round's borrow gets nothing, and the player signs in as an offline hold
    playHero.mockRejectedValue(new TownHallError("offline"));
    const sync = await started();
    expect(mockTakePhoneClaim).not.toHaveBeenCalled();
    expect(await sync.signIn("h-2")).toBe("offline");
    expect(sync.turns["h-2"]).toMatchObject({ state: "held", provisional: true });
    expect(await sync.withTurn("h-2", async () => undefined)).toBe(false);

    window.dispatchEvent(new Event("online"));
    await drain();

    expect(mockTakePhoneClaim).not.toHaveBeenCalled();
    expect(Object.keys(sync.state.waitingEvents)).toEqual(["c-2"]);

    // confirmed (and caught up): the next round takes it on the hold
    playHero.mockReset();
    playHero.mockResolvedValue({ answer: "granted" });
    window.dispatchEvent(new Event("online"));
    await drain();
    expect(sync.turns["h-2"]).toMatchObject({ state: "held", provisional: false });
    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-2"]);
    expect(sync.state.waitingEvents).toEqual({});
  });

  it("a confirm that cannot catch up does not grant or send; one that can lands what came meanwhile over the offline play, then sends", async () => {
    jest.useFakeTimers();
    const sync = await started();
    playHero.mockRejectedValue(new TownHallError("offline"));
    expect(await sync.signIn("h-1")).toBe("offline");
    write("__questLog", "q1", { id: "q1", userId: "h-1", status: "offline play" });
    write("__questLog", "q2", { id: "q2", userId: "h-1", status: "offline play" });

    // the site answers again, but the read breaks off before the newest record
    playHero.mockReset();
    playHero.mockResolvedValue({ answer: "granted" });
    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__beasts", "b1", 6)]).mockRejectedValue(new TownHallError("offline"));
    window.dispatchEvent(new Event("online"));
    await tick(0);

    expect(sync.turns["h-1"]).toMatchObject({ state: "held", provisional: true });
    expect(sent().map((record) => record.key)).toEqual([]);

    // the read gets through: the tablet's copy of q1, written while this device played offline, lands over it first
    const fromTablet = { id: "q1", userId: "h-1", status: "tablet" };
    fetchRecords.mockReset();
    fetchRecords.mockResolvedValueOnce([received("__questLog", "q1", 7, fromTablet, { heroId: "h-1" })]).mockResolvedValue([]);
    window.dispatchEvent(new Event("online"));
    await tick(0);

    expect(sync.turns["h-1"]).toMatchObject({ state: "held", provisional: false });
    expect(mockStores.__questLog.q1).toEqual(fromTablet);
    expect(sent().map((record) => record.key)).toEqual(["q2"]);
  });

  it("a fresh phone whose first reads are empty marks the moment before them, so a claim received since is taken", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 5 });
    const sync = await started();
    await drain();
    expect(sync.state.claimsSince).toEqual(expect.any(String));
    const afterLink = new Date().toISOString();
    await new Promise((resolve) => setTimeout(resolve, 5));

    fetchEvents.mockResolvedValueOnce([claimEvent(1, "c-new", "h-1", afterLink)]);
    await useFamilyStore().syncPhone();
    await drain();

    expect(mockTakePhoneClaim.mock.calls.map(([e]) => e.id)).toEqual(["c-new"]);
  });

  it("a kept claim the holder answers (even turned away, with no entry anywhere) is let go without asking for the turn again", async () => {
    mockFamilyState = familyState({ lastSeq: 9 });
    const sync = await started();
    playHero.mockResolvedValue(BUSY);
    fetchEvents.mockResolvedValueOnce([claimEvent(10, "c-2", "h-2")]);
    await useFamilyStore().download();
    expect(Object.keys(sync.state.waitingEvents)).toEqual(["c-2"]);

    const turnedAway = { ...settledEvent(12, "c-2", "h-2", "rejected"), data: { ...verdictOf("c-2", "rejected", "Already done today") } };
    fetchEvents.mockResolvedValueOnce([turnedAway]);
    await useFamilyStore().download();
    playHero.mockClear();
    window.dispatchEvent(new Event("online"));
    await drain();

    expect(sync.state.waitingEvents).toEqual({});
    expect(mockTakePhoneClaim).not.toHaveBeenCalled();
    expect(playHero).not.toHaveBeenCalledWith(PARENT, "h-2", OWN, "the family computer", false);
  });

  it("a Pro kid phone holding its hero applies the verdict from its own event download", async () => {
    mockHeroDevice = kidPhone();
    mockSyncState = syncState({ firstPullDone: true, lastSeq: 5 });
    const sync = await started();
    expect(sync.isFullPortal).toBe(true);
    await sync.signIn("h-1");
    mockStores.__questLog = { e1: claimEntry("e1") };
    playHero.mockClear();
    fetchEvents.mockResolvedValueOnce([settledEvent(9, "e1")]);

    await useFamilyStore().syncPhone();
    await drain();

    expect(fetchEvents).toHaveBeenCalledWith({ kind: "hero", key: HERO_KEY }, 0, 100);
    expect(mockPays).toEqual(["e1"]);
    expect(playHero).not.toHaveBeenCalled();
    expect(sync.state.pendingVerdicts).toEqual({});
  });
});
