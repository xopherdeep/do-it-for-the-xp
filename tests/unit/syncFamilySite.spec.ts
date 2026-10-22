/**
 * Family Sync end to end on one shared fake site: a records table numbered per family, one turn per hero, the family's
 * events, and the site's refusals (a hero record from a device that does not hold the hero's turn is refused with
 * xp_family_turn). Two devices run the real family and sync stores, each in its own pinia with its own raw stores, kept
 * state and sign-ins: the family tablet (a Game Master's device) and Mia's phone (a Pro kid phone linked to h-1). One
 * device acts at a time (`on(device)`), and the signals a device raises reach only that device's stores.
 *
 * The verdict's pay is real enough to see: approving a claim adds its GP to the hero's profile record.
 */
import { TextEncoder } from "util";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { reactive } from "vue";
import { useSyncStore } from "@/lib/store/stores/sync";
import { useFamilyStore } from "@/lib/store/stores/family";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import type { ReceivedRecord, WireRecord } from "@/lib/services/sync/familySyncClient";
import type { FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import { emitRecordWritten } from "@/lib/services/sync/recordSignals";
import { isHeroWatched } from "@/lib/services/sync/watchGate";
import type { FamilyEventsState } from "@/lib/databases/FamilyEventsDb";
import type { HeroDevice } from "@/lib/databases/HeroDeviceDb";

Object.assign(globalThis, { TextEncoder });

const FAMILY = "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f";
const PARENT = { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" };
const HERO_KEY = "xph_miaphonekey123";

// --- The two devices ---

interface Device {
  id: string;
  label: string;
  pinia: Pinia;
  /** The raw stores the game writes and the download lands in: store -> key -> value */
  stores: Record<string, Record<string, unknown>>;
  syncState: unknown;
  familyState: FamilyEventsState;
  heroDevice: HeroDevice | null;
  user: { users: Record<string, unknown>; currentUser: { id: string | null } };
  townHall: { isLinked: boolean; auth: unknown; init: jest.Mock; forgetLink: jest.Mock };
  /** The site cannot be reached from this device */
  offline: boolean;
}

/** The device acting now: every faked boundary reads and writes its world */
let mockActive: Device;
const setActiveId = (id: string) => Object.assign(globalThis, { __mockActiveDevice: id });

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/services/multiplayer/multiplayerFlag", () => ({ __esModule: true, multiplayerEnabled: () => true }));

/** The signals a device raises reach only the stores of that device (each device is its own app) */
jest.mock("@/lib/services/sync/recordSignals", () => {
  const lists: Record<string, { device: string; fn: (payload: unknown) => void }[]> = { written: [], restored: [], landed: [] };
  const activeId = () => (globalThis as unknown as { __mockActiveDevice: string }).__mockActiveDevice;
  const on = (kind: string) => (fn: (payload: unknown) => void) => {
    const entry = { device: activeId(), fn };
    lists[kind].push(entry);
    return () => {
      const at = lists[kind].indexOf(entry);
      if (at >= 0) lists[kind].splice(at, 1);
    };
  };
  const emit = (kind: string) => (payload: unknown) =>
    lists[kind].filter((listener) => listener.device === activeId()).forEach((listener) => listener.fn(payload));
  return {
    __esModule: true,
    onRecordWritten: on("written"),
    emitRecordWritten: emit("written"),
    onStoreRestored: on("restored"),
    emitStoreRestored: emit("restored"),
    onRecordsLanded: on("landed"),
    emitRecordsLanded: emit("landed"),
  };
});

/** Each device's own browser signals (the connection back, the app to the front, the minute tick), raised by the test */
const mockDeviceSignals = new Map<string, { online(): void; visibility(isInFront: boolean): void; tick(): void }>();
jest.mock("@/lib/store/stores/sync/syncSignals", () => ({
  __esModule: true,
  listenToDevice: (signals: { online(): void; visibility(isInFront: boolean): void; tick(): void }) => {
    const id = (globalThis as unknown as { __mockActiveDevice: string }).__mockActiveDevice;
    mockDeviceSignals.set(id, signals);
    return () => mockDeviceSignals.delete(id);
  },
}));

// --- The shared site ---

interface SiteRow extends ReceivedRecord {}
const mockSite = {
  seq: 0,
  rows: new Map<string, SiteRow>(),
  /** heroId -> the device holding its turn */
  turns: new Map<string, string>(),
  labels: new Map<string, string>(),
  events: [] as ReceivedEvent[],
  /** Puts fail with a 503 while set */
  failPuts: false,
};

const mockOffline = () => {
  if (mockActive.offline) throw new TownHallError("offline");
};
/** The hero a call's sign-in may act for: a hero key's own hero, or any for a parent */
const mockHeroOfAuth = (auth: { kind: string; key?: string }): string | null => (auth.kind === "hero" ? "h-1" : null);

jest.mock("@/lib/services/sync/familySyncClient", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/sync/familySyncClient"),
  putRecords: jest.fn(async (_auth: unknown, deviceId: string, records: WireRecord[]) => {
    mockOffline();
    if (mockSite.failPuts) throw new (jest.requireActual("@/lib/services/townhall/townHallClient").TownHallError)("server", "no", 503);
    const accepted: { store: string; key: string; seq: number }[] = [];
    const refused: { store: string; key: string; code: string; message: string }[] = [];
    for (const record of records) {
      const isHeroRecord = record.heroId !== null;
      const isNotHolder = isHeroRecord && mockSite.turns.get(record.heroId as string) !== deviceId;
      if (isNotHolder) {
        refused.push({ store: record.store, key: record.key, code: "xp_family_turn", message: "Another device is playing this hero." });
        continue;
      }
      const seq = ++mockSite.seq;
      mockSite.rows.set(`${record.store}/${record.key}`, { ...record, seq, deviceId, savedAt: new Date().toISOString() });
      accepted.push({ store: record.store, key: record.key, seq });
    }
    return { accepted, refused };
  }),
  fetchRecords: jest.fn(async (auth: { kind: string }, since: number, limit: number) => {
    mockOffline();
    const ownHero = mockHeroOfAuth(auth);
    return Array.from(mockSite.rows.values())
      .filter((row) => row.seq > since)
      .filter((row) => ownHero === null || row.heroId === null || row.heroId === ownHero)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((row) => ({ ...row }));
  }),
  playHero: jest.fn(async (_auth: unknown, heroId: string, deviceId: string, label: string, force: boolean) => {
    mockOffline();
    mockSite.labels.set(deviceId, label);
    const holder = mockSite.turns.get(heroId);
    const isFree = holder === undefined || holder === deviceId || force;
    if (isFree) {
      mockSite.turns.set(heroId, deviceId);
      return { answer: "granted" };
    }
    return { answer: "busy", device: { label: mockSite.labels.get(holder as string) ?? "", lastSeenAt: null } };
  }),
  restHero: jest.fn(async (_auth: unknown, heroId: string, deviceId: string) => {
    mockOffline();
    const isHolder = mockSite.turns.get(heroId) === deviceId;
    if (isHolder) mockSite.turns.delete(heroId);
  }),
}));

jest.mock("@/lib/services/multiplayer/familyServer", () => {
  const actual = jest.requireActual("@/lib/services/multiplayer/familyServer");
  return {
    __esModule: true,
    familyProblem: actual.familyProblem,
    retryAfterMs: actual.retryAfterMs,
    bindFamily: jest.fn(async () => "home"),
    moveHome: jest.fn(),
    getFamily: jest.fn(async () => ({ familyId: FAMILY, heroes: [] })),
    saveHero: jest.fn(async () => undefined),
    removeHero: jest.fn(),
    removePhone: jest.fn(),
    claimDevice: jest.fn(),
    makeLinkCode: jest.fn(),
    listPhones: jest.fn(async () => []),
    sendEvents: jest.fn(async (_auth: unknown, events: FamilyEvent[]) => {
      mockOffline();
      for (const e of events) {
        const seq = mockSite.events.length + 1;
        mockSite.events.push({ ...e, seq, scope: "family", receivedAt: new Date().toISOString() } as ReceivedEvent);
      }
      return { accepted: events.map((e) => e.id), duplicate: [], rejected: [] };
    }),
    fetchEvents: jest.fn(async (auth: { kind: string }, since: number, limit: number) => {
      mockOffline();
      const ownHero = mockHeroOfAuth(auth);
      return mockSite.events
        .filter((e) => e.seq > since && (ownHero === null || e.heroId === ownHero))
        .slice(0, limit)
        .map((e) => ({ ...e }));
    }),
  };
});

jest.mock("@/lib/services/pro/familyIdentity", () => ({
  __esModule: true,
  ensureIdentity: jest.fn(async () => ({ familyId: FAMILY, deviceId: mockActive.id })),
  adoptFamily: jest.fn(),
}));

jest.mock("@/lib/databases/HeroDeviceDb", () => ({
  __esModule: true,
  getHeroDeviceDb: () => ({
    getDevice: async () => (mockActive.heroDevice ? JSON.parse(JSON.stringify(mockActive.heroDevice)) : null),
    saveDevice: async (device: HeroDevice) => {
      mockActive.heroDevice = JSON.parse(JSON.stringify(device));
    },
    clearDevice: async () => {
      mockActive.heroDevice = null;
    },
  }),
}));

jest.mock("@/lib/databases/HeroPhoneDb", () => {
  const { emptyPhoneState } = jest.requireActual("@/lib/services/multiplayer/phoneClaims");
  return { __esModule: true, getHeroPhoneDb: () => ({ getState: async () => emptyPhoneState(), saveState: async () => undefined, clearState: async () => undefined }) };
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

jest.mock("@/lib/databases/FamilyEventsDb", () => ({
  __esModule: true,
  getFamilyEventsDb: () => ({
    getState: async () => JSON.parse(JSON.stringify(mockActive.familyState)),
    saveState: async (state: FamilyEventsState) => {
      mockActive.familyState = JSON.parse(JSON.stringify(state));
    },
  }),
}));

jest.mock("@/lib/databases/SyncDb", () => {
  const actual = jest.requireActual("@/lib/databases/SyncDb");
  return {
    __esModule: true,
    ...actual,
    getSyncDb: () => ({
      getState: async () => actual.readSyncState(JSON.parse(JSON.stringify(mockActive.syncState ?? null))),
      saveState: async (state: unknown) => {
        mockActive.syncState = JSON.parse(JSON.stringify(state));
      },
      clearState: async () => {
        mockActive.syncState = undefined;
      },
    }),
  };
});

/** A write the game makes on the device acting now: the raw store changes, then the storage layer announces it */
const mockWrite = (store: string, key: string, value: unknown) => {
  (mockActive.stores[store] ??= {})[key] = JSON.parse(JSON.stringify(value));
  emitRecordWritten({ store, key, value });
};

/** The completion service's review, with the pay: an approved claim's GP goes into the hero's profile */
const mockReview = (id: string, status: "approved" | "rejected", note?: string) => {
  const entry = mockActive.stores.__questLog?.[id] as Record<string, any> | undefined;
  const isPending = entry?.status === "pending";
  if (!isPending) return entry ?? null;
  const settled = { ...entry, status, note: note ?? "", rewardsApplied: status === "approved" };
  if (status === "approved") {
    const profile = mockActive.stores.__profiles[entry.userId] as Record<string, any>;
    mockWrite("__profiles", entry.userId, { ...profile, stats: { ...profile.stats, gp: profile.stats.gp + entry.rewards.gp } });
  }
  mockWrite("__questLog", id, settled);
  return settled;
};
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  __esModule: true,
  applyQuestRewards: jest.fn(),
  paidQuestRewards: (_heroId: string, rewards: unknown) => rewards,
  approveCompletion: jest.fn(async (id: string) => mockReview(id, "approved")),
  rejectCompletion: jest.fn(async (id: string, _reviewer: unknown, note?: string) => mockReview(id, "rejected", note)),
}));

jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/databases/QuestLogDb"),
  getQuestLogDb: () => ({
    getEntries: async () => Object.values(mockActive.stores.__questLog ?? {}),
    getAll: async () => Object.values(mockActive.stores.__questLog ?? {}),
    get: async (id: string) => mockActive.stores.__questLog?.[id] ?? null,
  }),
}));

jest.mock("@/lib/services/sync/recordApply", () => {
  const actual = jest.requireActual("@/lib/services/sync/recordApply");
  const target = (store: string) => ({
    set: async (key: string, value: unknown) => {
      (mockActive.stores[store] ??= {})[key] = value;
    },
    remove: async (key: string) => {
      delete mockActive.stores[store]?.[key];
    },
  });
  return {
    __esModule: true,
    ...actual,
    applyRecords: (records: ReceivedRecord[], own: string) => actual.applyRecords(records, own, target),
    refreshMirrors: async () => undefined,
    rawTargetFor: (store: string) => target(store),
    readRawRecord: async (store: string, key: string) => mockActive.stores[store]?.[key] ?? null,
    readRawEntries: async (store: string) => Object.entries(mockActive.stores[store] ?? {}).map(([key, value]) => ({ key, value })),
  };
});

jest.mock("@/lib/services/multiplayer/phoneClaimIntake", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/multiplayer/phoneClaimIntake"),
  buildHeroSheet: jest.fn(async () => ({ stats: {}, quests: [] })),
  takePhoneClaim: jest.fn(),
}));
const mockNotify = jest.fn();
jest.mock("@/lib/services/notifications/notify", () => ({ __esModule: true, notify: (...args: unknown[]) => mockNotify(...args), settleWaiting: jest.fn() }));
jest.mock("@/lib/services/quests/waitingClaims", () => ({ __esModule: true, refreshWaitingClaims: jest.fn(async () => 0) }));

jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockActive.townHall }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockActive.user }));
const mockPro = reactive({ isPro: true, recheck: jest.fn(async () => undefined), adoptedFamily: jest.fn() });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

// --- Helpers ---

const drain = async () => {
  for (let i = 0; i < 2000; i++) await Promise.resolve();
};

const familyState = (over: Partial<FamilyEventsState> = {}): FamilyEventsState => ({
  outbox: [],
  lastSeq: 0,
  paidRewards: [],
  lastCards: { "h-1": "{}" },
  ageGroupPicks: {},
  home: "home",
  takenClaims: [],
  lastSheets: {},
  ...over,
});

const MIA = { id: "h-1", name: { nick: "Mia" }, stats: { gp: 10 } };
const MOM = { id: "gm-1", name: { nick: "Mom" }, isAdult: true, stats: { gp: 0 } };

const device = (id: string, over: Partial<Device> = {}): Device => ({
  id,
  label: id,
  pinia: createPinia(),
  stores: {},
  syncState: { firstPushDone: true, firstPullDone: true, lastSeq: 0 },
  familyState: familyState(),
  heroDevice: null,
  user: reactive({ users: { "h-1": MIA, "gm-1": MOM }, currentUser: { id: null } }) as Device["user"],
  townHall: reactive({ isLinked: true, auth: PARENT, init: jest.fn(async () => undefined), forgetLink: jest.fn() }) as unknown as Device["townHall"],
  offline: false,
  ...over,
});

let tablet: Device;
let phone: Device;

/** The device that acts next; whatever the last one started is let finish first */
const on = async (next: Device) => {
  await drain();
  mockActive = next;
  setActiveId(next.id);
  setActivePinia(next.pinia);
  await useFamilyStore().init();
  await drain();
  return useSyncStore();
};

/** The connection is back on the device acting now: a round, and what follows one */
const online = async () => {
  mockDeviceSignals.get(mockActive.id)?.online();
  await drain();
};

const siteRow = (store: string, key: string) => {
  const row = mockSite.rows.get(`${store}/${key}`);
  return row ? JSON.parse(row.body as string) : undefined;
};

/** A claim of Mia's, waiting on a Game Master */
const claimOf = (id: string) => ({ id, questId: "q-dishes", questName: "Dishes", userId: "h-1", status: "pending", source: "claim", rewards: { xp: 30, gp: 40, ap: 2 }, completedAt: "2026-10-22T09:00:00.000Z" });
const verdict = (claimId: string) => ({ claimId, questId: "q-dishes", status: "approved" as const, note: "", xp: 0, gp: 0, ap: 0 });

describe("Family Sync on one shared site, two devices", () => {
  beforeEach(() => {
    // No clock runs by itself: each device's rounds are raised by the test, never while the other device acts
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSite.seq = 0;
    mockSite.rows.clear();
    mockSite.turns.clear();
    mockSite.labels.clear();
    mockSite.events = [];
    mockSite.failPuts = false;
    mockPro.isPro = true;
    // Both devices start with the family's save: Mia's profile with 10 GP, and the site holds it too
    tablet = device("tablet0000000001", { stores: { __profiles: { "h-1": MIA, "gm-1": MOM } } });
    phone = device("miaphone00000001", {
      stores: { __profiles: { "h-1": MIA } },
      heroDevice: { siteUrl: "https://townhall.example.com", familyId: FAMILY, heroId: "h-1", deviceId: "miaphone00000001", key: HERO_KEY, label: "Mia's iPhone", linkedAt: 1, card: null },
      familyState: familyState({ lastCards: {} }),
    });
    mockSite.rows.set("__profiles/h-1", { store: "__profiles", key: "h-1", heroId: "h-1", deleted: false, body: JSON.stringify(MIA), seq: ++mockSite.seq, deviceId: tablet.id, savedAt: "" });
    tablet.syncState = { firstPushDone: true, lastSeq: 1 };
    phone.syncState = { firstPullDone: true, lastSeq: 1 };
  });

  afterEach(() => {
    jest.useRealTimers();
    [tablet, phone].forEach((each) => {
      const pinia = each.pinia as unknown as { _s: Map<string, { $dispose: () => void }> };
      pinia._s.forEach((store) => store.$dispose());
    });
  });

  it("C1: a rest whose send fails keeps the hero's turn on the site, so the phone hears busy and never plays a copy without those records", async () => {
    let sync = await on(tablet);
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 99 } });
    mockSite.failPuts = true;
    await sync.rest("h-1");
    expect(mockSite.turns.get("h-1")).toBe(tablet.id);

    // the phone asks: busy, named after the tablet; its copy is still the old one
    sync = await on(phone);
    expect(await sync.signIn("h-1")).toBe("busy");
    expect(sync.turns["h-1"].busy?.label).toBe("the family computer");
    await sync.rest("h-1");

    // the tablet's next good round sends the record, then gives the turn back
    mockSite.failPuts = false;
    sync = await on(tablet);
    await online();
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(99);
    expect(mockSite.turns.has("h-1")).toBe(false);

    // now the phone is granted, and plays the copy with the record in it
    sync = await on(phone);
    expect(await sync.signIn("h-1")).toBe("granted");
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(99);
  });

  it("the two-device verdict: a claim made on the phone is approved on the tablet and paid once, by the phone that plays the hero", async () => {
    // Mia plays on her phone and claims the dishes
    let sync = await on(phone);
    phone.user.currentUser.id = "h-1";
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__questLog", "e1", claimOf("e1"));
    await sync.upload();
    expect(siteRow("__questLog", "e1").status).toBe("pending");

    // the tablet reads it and Mom approves: the phone holds Mia, so the verdict is sent, not paid here
    sync = await on(tablet);
    await sync.download();
    expect((tablet.stores.__questLog.e1 as { status: string }).status).toBe("pending");
    await sync.sendVerdict(verdict("e1"), "h-1");
    await drain();
    await useFamilyStore().flush();
    expect(sync.state.pendingVerdicts.e1).toBeDefined();
    expect((tablet.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(10);

    // the phone reads the verdict and pays: once, on its own copy, with Mia's notice
    sync = await on(phone);
    await useFamilyStore().syncPhone();
    await drain();
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(50);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ heroId: "h-1", kind: "approved", refId: "e1" }));
    await sync.upload();

    // the tablet lands the paid copy; its kept verdict finds the claim settled and pays nothing more
    sync = await on(tablet);
    await online();
    expect((tablet.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(50);
    expect((tablet.stores.__questLog.e1 as { status: string }).status).toBe("approved");
    expect(sync.state.pendingVerdicts).toEqual({});
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(50);
  });

  it("borrow, then grant: a verdict the tablet paid on a borrowed turn is in the copy the phone is granted next", async () => {
    // Mia claimed on her phone and rested (Save & Quit): nobody holds her
    let sync = await on(phone);
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__questLog", "e1", claimOf("e1"));
    await sync.rest("h-1");
    expect(mockSite.turns.has("h-1")).toBe(false);

    // Mom approves on the tablet: the turn is free, so the tablet borrows it, pays, uploads and gives it back
    sync = await on(tablet);
    await sync.download();
    await sync.sendVerdict(verdict("e1"), "h-1");
    await drain();
    expect(mockSite.turns.has("h-1")).toBe(false);
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(50);
    expect(siteRow("__questLog", "e1").status).toBe("approved");

    // Mia opens her phone: granted, and the catch-up lands the paid copy before she plays
    sync = await on(phone);
    expect(await sync.signIn("h-1")).toBe("granted");
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(50);
    expect((phone.stores.__questLog.e1 as { status: string }).status).toBe("approved");
  });

  it("Play here with the tablet's rows for the hero on the site: the phone's offline play is the truth, and the tablet's new record lands too", async () => {
    // Mia plays offline on her phone (the hold never reached the site)
    let sync = await on(phone);
    phone.user.currentUser.id = "h-1";
    phone.offline = true;
    expect(await sync.signIn("h-1")).toBe("offline");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 77 } });
    await drain();

    // meanwhile Mia plays on the tablet: it rewrites her profile and logs a new quest
    sync = await on(tablet);
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 12 } });
    mockWrite("__questLog", "t1", { id: "t1", userId: "h-1", status: "approved", questId: "q-bed" });
    await sync.upload();

    // the phone is back: the tablet holds Mia (busy); Play here takes her with the phone's copy whole
    sync = await on(phone);
    phone.offline = false;
    await online();
    expect(sync.turns["h-1"].state).toBe("busy");
    await sync.takeOver("h-1");
    expect(mockSite.turns.get("h-1")).toBe(phone.id);
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(77);
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(77);
    expect(phone.stores.__questLog?.t1).toMatchObject({ id: "t1" });

    // the tablet's next write is refused as a takeover: it catches up to the phone's copy
    sync = await on(tablet);
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 13 } });
    await sync.upload();
    await drain();
    expect(sync.tookOverNotice).toBe("h-1");
    expect((tablet.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(77);
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(77);
  });

  it("offline play in the car while Mom approves at home: the phone's copy is the truth, and the verdict pays on it once", async () => {
    // Mia claims on her phone and saves; then she plays offline (the hold never reaches the site)
    let sync = await on(phone);
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__questLog", "e1", claimOf("e1"));
    await sync.rest("h-1");
    phone.offline = true;
    phone.user.currentUser.id = "h-1";
    expect(await sync.signIn("h-1")).toBe("offline");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 70 } });
    await drain();

    // Mom approves at home: nobody holds Mia on the site, so the tablet pays on a borrowed turn (10 + 40)
    sync = await on(tablet);
    await sync.download();
    await sync.sendVerdict(verdict("e1"), "h-1");
    await drain();
    await useFamilyStore().flush();
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(50);

    // the phone is back: its offline copy goes up whole (the claim still pending in it), and the verdict, read from the
    // family's events, applies on that copy: the offline play and the pay, once
    sync = await on(phone);
    phone.offline = false;
    await online();
    expect(sync.turns["h-1"]).toMatchObject({ state: "held", provisional: false });
    await useFamilyStore().syncPhone();
    await drain();
    await sync.upload();
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(110);
    expect((phone.stores.__questLog.e1 as { status: string }).status).toBe("approved");
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(110);
    expect(siteRow("__questLog", "e1").status).toBe("approved");
  });

  it("Not now on the kid phone: the tablet is the truth, the phone's offline play goes, and nothing of Mia runs on the phone", async () => {
    // the tablet plays Mia
    let sync = await on(tablet);
    expect(await sync.signIn("h-1")).toBe("granted");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 30 } });
    await sync.upload();

    // the phone played offline, then hears busy and says Not now
    sync = await on(phone);
    phone.offline = true;
    phone.user.currentUser.id = "h-1";
    expect(await sync.signIn("h-1")).toBe("offline");
    mockWrite("__profiles", "h-1", { ...MIA, stats: { gp: 500 } });
    phone.offline = false;
    await online();
    expect(sync.turns["h-1"].state).toBe("busy");
    await sync.rest("h-1");

    expect(sync.state.outbox).toEqual([]);
    expect(sync.stateOf("h-1")).toBe("busy");
    expect(isHeroWatched("h-1", sync, "h-1")).toBe(false);
    await sync.download();
    expect((phone.stores.__profiles["h-1"] as typeof MIA).stats.gp).toBe(30);
    expect(siteRow("__profiles", "h-1").stats.gp).toBe(30);
    expect(mockSite.turns.get("h-1")).toBe(tablet.id);
  });
});
