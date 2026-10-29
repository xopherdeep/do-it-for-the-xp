import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import {
  queueWidgetSync,
  syncAllWidgets,
  WIDGET_SYNC_DEBOUNCE_MS
} from "@/lib/services/widgets/widgetSyncTrigger";
import type { WidgetSyncPayload } from "@/lib/services/widgets/widgetCatalog";

/**
 * The widget sync as the app actually calls it: with no arguments at all.
 *
 * The hero below is the real nested profile shape (tests/e2e/fixtures/battle-backup.json), because the
 * bug this guards against is reading it flat: `Number(stats.hp)` on `{now,max}` is NaN, which serialises
 * to null and leaves every widget drawing a hardcoded native default.
 * Only what the sync talks to is faked: the native bridge, the quest engine, the quest log and the
 * family settings the Game Master's streak switch lives in.
 */
const mockSyncWidgetData = jest.fn((_options: { data: string }) => Promise.resolve({ success: true }));
const mockReloadAllWidgets = jest.fn(() => Promise.resolve({ success: true }));
const mockBoard = jest.fn((_userId: string) => Promise.resolve([] as unknown[]));
const mockEntries = jest.fn(() => Promise.resolve([] as unknown[]));
const mockStreaksOn = { value: true };

jest.mock("@capacitor/core", () => ({
  __esModule: true,
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android"
  },
  registerPlugin: () => ({
    syncWidgetData: (options: { data: string }) => mockSyncWidgetData(options),
    reloadAllWidgets: () => mockReloadAllWidgets(),
    saveWidgetConfig: () => Promise.resolve({ success: true })
  })
}));
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  __esModule: true,
  getQuestEngine: () => ({ getQuestBoardForUser: mockBoard })
}));
jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  getQuestLogDb: () => ({ getEntries: mockEntries })
}));
jest.mock("@/lib/services/quests/lateChores", () => ({
  __esModule: true,
  lockedNoticesFor: () => Promise.resolve({})
}));
jest.mock("@/lib/store/stores/gameRules", () => ({
  __esModule: true,
  useGameRulesStore: () => ({
    get streaks() {
      return mockStreaksOn.value;
    },
    load: () => Promise.resolve()
  })
}));

jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile() {
      return Promise.resolve();
    }
  },
  default: class {}
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const maxPower = () => ({
  id: "hero-1",
  name: { full: "Max Power", first: "Max", nick: "Max" },
  avatar: "003-gamer",
  jobClass: "warrior",
  stats: {
    level: 3,
    xp: { now: 300, next_level: 900 },
    gp: { limit: 100, debt: 0, wallet: 40, savings: 100 },
    hp: { now: 20, max: 42, min: 0 },
    mp: { now: 300, max: 300, min: 0 },
    ap: { total: 4 }
  }
});

const sidekick = () => ({
  id: "hero-2",
  name: { nick: "Pixel" },
  avatar: "007-ninja",
  jobClass: "mage",
  stats: {
    level: 1,
    xp: { now: 10, next_level: 100 },
    gp: { wallet: 5, savings: 0 },
    hp: { now: 12, max: 12 },
    mp: { now: 8, max: 8 },
    ap: { total: 0 }
  }
});

/** The family signed in, with `signedIn` as the current hero */
const familyStore = (profiles: any[], signedIn?: any) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  profiles.forEach((profile) => store.addUser(profile));
  if (signedIn) store.loginUser(signedIn);
  return store;
};

/** What the last native call was handed */
const lastPayload = (): WidgetSyncPayload => {
  const calls = mockSyncWidgetData.mock.calls;
  return JSON.parse(String(calls[calls.length - 1]?.[0]?.data ?? "{}"));
};

beforeEach(() => {
  localStorage.clear();
  mockSyncWidgetData.mockClear();
  mockReloadAllWidgets.mockClear();
  mockBoard.mockReset();
  mockBoard.mockResolvedValue([]);
  mockEntries.mockReset();
  mockEntries.mockResolvedValue([]);
  mockStreaksOn.value = true;
});

describe("syncAllWidgets", () => {
  it("sends the hero's real numbers, read from the nested profile", async () => {
    familyStore([maxPower()], maxPower());

    const result = await syncAllWidgets();

    expect(result).toEqual({ ok: true });
    const hero = lastPayload().heroes["hero-1"];
    expect(hero).toMatchObject({
      name: "Max",
      level: 3,
      className: "warrior",
      avatar: "003-gamer",
      hp: 20,
      maxHp: 42,
      mp: 300,
      maxMp: 300,
      xp: 300,
      nextLevelXp: 900,
      gp: 40,
      savings: 100,
      ap: 4
    });
    // The NaN this rewrite exists for: a flat read would have written null for every one of them
    Object.values(hero).forEach((value) => expect(value).not.toBeNull());
  });

  it("puts every family member in the payload, with the signed-in hero as the primary", async () => {
    familyStore([maxPower(), sidekick()], maxPower());

    await syncAllWidgets();

    const payload = lastPayload();
    expect(payload.primaryHeroId).toBe("hero-1");
    expect(Object.keys(payload.heroes).sort()).toEqual(["hero-1", "hero-2"]);
    expect(payload.heroes["hero-2"].maxHp).toBe(12);
    expect(payload.questsByHero["hero-2"]).toEqual([]);
  });

  it("includes the active RPG game style from the game store", async () => {
    familyStore([maxPower()], maxPower());
    const gameStore = useGameStore();
    gameStore.theme.rpg = "dragonquest";

    await syncAllWidgets();

    const payload = lastPayload();
    expect(payload.gameStyle).toBe("dragonquest");
  });

  it("counts the hero's streak from the quest log, and sends 0 when the Game Master switched streaks off", async () => {
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    mockEntries.mockResolvedValue([{ userId: "hero-1", dayKey, status: "approved" }]);
    familyStore([maxPower()], maxPower());

    await syncAllWidgets();
    expect(lastPayload().heroes["hero-1"].streak).toBe(1);

    mockStreaksOn.value = false;
    await syncAllWidgets();
    expect(lastPayload().heroes["hero-1"].streak).toBe(0);
  });

  it("still writes a payload when nobody is signed in, with no primary hero", async () => {
    const store = familyStore([maxPower()], maxPower());
    store.logoutUser();

    const result = await syncAllWidgets();

    expect(result).toEqual({ ok: true });
    expect(lastPayload().primaryHeroId).toBe("");
    expect(lastPayload().heroes["hero-1"]).toBeDefined();
  });

  it("answers with a reason instead of rejecting when the quest board cannot be read", async () => {
    mockBoard.mockRejectedValue(new Error("the board is gone"));
    familyStore([maxPower()], maxPower());

    const result = await syncAllWidgets();

    expect(result.ok).toBe(false);
    expect(mockSyncWidgetData).not.toHaveBeenCalled();
  });

  it("reports no profiles rather than writing an empty family", async () => {
    familyStore([]);

    expect(await syncAllWidgets()).toEqual({ ok: false, reason: "no profiles are loaded yet" });
    expect(mockSyncWidgetData).not.toHaveBeenCalled();
  });
});

describe("queueWidgetSync", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /** Let the queued promises inside the sync run; fake timers do not flush those */
  const flush = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };

  it("folds a burst of calls into one native write", async () => {
    familyStore([maxPower()], maxPower());
    mockSyncWidgetData.mockClear();

    queueWidgetSync();
    queueWidgetSync();
    queueWidgetSync();
    expect(mockSyncWidgetData).not.toHaveBeenCalled();

    jest.advanceTimersByTime(WIDGET_SYNC_DEBOUNCE_MS);
    await flush();

    expect(mockSyncWidgetData).toHaveBeenCalledTimes(1);
  });

  it("drops a queued run when an explicit sync has already sent fresher numbers", async () => {
    familyStore([maxPower()], maxPower());
    mockSyncWidgetData.mockClear();

    queueWidgetSync();
    await syncAllWidgets();
    jest.advanceTimersByTime(WIDGET_SYNC_DEBOUNCE_MS * 2);
    await flush();

    expect(mockSyncWidgetData).toHaveBeenCalledTimes(1);
  });
});
