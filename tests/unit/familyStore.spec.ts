import { createPinia, getActivePinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import { emitHeroRemoved, emitQuestPaid } from "@/lib/services/multiplayer/gameSignals";
import * as server from "@/lib/services/multiplayer/familyServer";
import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import { cardKey, cardOf } from "@/lib/services/multiplayer/heroCard";
import type { FamilyEventsState } from "@/lib/databases/FamilyEventsDb";
import type { HeroDevice } from "@/lib/databases/HeroDeviceDb";
import type { QueuedEvent } from "@/lib/services/multiplayer/eventOutbox";
import debug from "@/lib/utils/debug";

const FAMILY = "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f";
const DEVICE = "devicetest01";
const PARENT = { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" };

let mockEnabled = true;
jest.mock("@/lib/services/multiplayer/multiplayerFlag", () => ({ __esModule: true, multiplayerEnabled: () => mockEnabled }));

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

/** The sheet the family device builds for a hero (the board behind it is not under test here) */
const mockBuildHeroSheet = jest.fn();
jest.mock("@/lib/services/multiplayer/phoneClaimIntake", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/services/multiplayer/phoneClaimIntake"),
  buildHeroSheet: (...args: any[]) => mockBuildHeroSheet(...args),
}));

jest.mock("@/lib/services/pro/familyIdentity", () => ({
  __esModule: true,
  ensureIdentity: jest.fn(),
  adoptFamily: jest.fn(),
}));

let mockHeroDevice: HeroDevice | null = null;
const mockSaveDevice = jest.fn();
const mockClearDevice = jest.fn();
jest.mock("@/lib/databases/HeroDeviceDb", () => ({
  __esModule: true,
  getHeroDeviceDb: () => ({
    getDevice: async () => (mockHeroDevice ? JSON.parse(JSON.stringify(mockHeroDevice)) : null),
    saveDevice: async (device: HeroDevice) => {
      mockSaveDevice(device);
      mockHeroDevice = JSON.parse(JSON.stringify(device));
    },
    clearDevice: async () => {
      mockClearDevice();
      mockHeroDevice = null;
    },
  }),
}));

/** The quests on this device, by id (only `difficulty` is read) */
let mockQuests: Record<string, unknown> = {};
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: {},
  AchievementDb: class {
    async get(id: string) {
      return mockQuests[id] ?? null;
    }
  },
}));

let mockState: FamilyEventsState;
const mockSaveState = jest.fn();
jest.mock("@/lib/databases/FamilyEventsDb", () => ({
  __esModule: true,
  getFamilyEventsDb: () => ({
    getState: async () => JSON.parse(JSON.stringify(mockState)),
    saveState: async (state: FamilyEventsState) => {
      mockSaveState(state);
      mockState = JSON.parse(JSON.stringify(state));
    },
  }),
}));

const mockApplyQuestRewards = jest.fn();
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  __esModule: true,
  applyQuestRewards: (...args: any[]) => mockApplyQuestRewards(...args),
}));

let mockQuestLog: any[] = [];
const mockLogCompletion = jest.fn();
const mockUpdateEntry = jest.fn();
jest.mock("@/lib/databases/QuestLogDb", () => {
  const actual = jest.requireActual("@/lib/databases/QuestLogDb");
  return {
    __esModule: true,
    ...actual,
    getQuestLogDb: () => ({
      logCompletion: async (input: any) => {
        mockLogCompletion(input);
        const entry = {
          id: `log-${mockQuestLog.length + 1}`,
          completedAt: new Date().toISOString(),
          dayKey: "2026-10-13",
          rewardsApplied: false,
          ...input,
        };
        mockQuestLog.push(entry);
        return entry;
      },
      updateEntry: async (id: string, patch: any) => {
        mockUpdateEntry(id, patch);
        const entry = mockQuestLog.find((candidate) => candidate.id === id);
        const isFound = Boolean(entry);
        if (!isFound) return null;
        Object.assign(entry, patch);
        return entry;
      },
      getEntries: async () => [...mockQuestLog],
      getAll: async () => [...mockQuestLog],
    }),
  };
});

const mockTownHall = reactive({
  isLinked: true,
  auth: PARENT as Record<string, unknown>,
  init: jest.fn(),
  forgetLink: jest.fn(),
});
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));

const mockUsers = reactive<Record<string, any>>({});
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ users: mockUsers }) }));

const bindFamily = server.bindFamily as jest.Mock;
const moveHome = server.moveHome as jest.Mock;
const getFamily = server.getFamily as jest.Mock;
const saveHero = server.saveHero as jest.Mock;
const removeHero = server.removeHero as jest.Mock;
const sendEvents = server.sendEvents as jest.Mock;
const fetchEvents = server.fetchEvents as jest.Mock;
const claimDevice = server.claimDevice as jest.Mock;
const makeLinkCode = server.makeLinkCode as jest.Mock;
const listPhones = server.listPhones as jest.Mock;
const serverRemovePhone = server.removePhone as jest.Mock;
const { adoptFamily } = require("@/lib/services/pro/familyIdentity") as { adoptFamily: jest.Mock };

const emptyState = (): FamilyEventsState => ({ outbox: [], lastSeq: 0, paidRewards: [], lastCards: {}, ageGroupPicks: {}, home: "unknown", takenClaims: [], lastSheets: {} });
/** Lets every promise the mocks settle run to the end */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const failWith = (status: number, siteCode?: string) => new TownHallError(status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "server", "no", status, siteCode);

const mia = () => ({ id: "h-1", name: { nick: "Mia", full: "Mia Pollard" }, isAdult: false });
const bo = () => ({ id: "h-2", name: { nick: "Bo", full: "Bo Pollard" }, isAdult: false });
const mom = () => ({ id: "gm-1", name: { nick: "Mom", full: "Mom Pollard" }, isAdult: true });
const noNickname = () => ({ id: "h-3", name: { nick: "", full: "Cy Pollard" }, isAdult: false });

const fillUsers = (...profiles: any[]) => {
  Object.keys(mockUsers).forEach((id) => delete mockUsers[id]);
  profiles.forEach((profile) => {
    mockUsers[profile.id] = profile;
  });
};

const started = async (store = useFamilyStore()) => {
  await store.init();
  await settle();
  return store;
};

/** jest 27 has no advanceTimersByTimeAsync: let pending promises settle, move the clock, let them settle again */
const tick = async (ms: number) => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

type SentEvent = { id: string; kind: string; heroId: string; deviceId: string; data: Record<string, unknown> };
/** The site takes every event it is sent */
const acceptAll = async (_auth: unknown, events: SentEvent[]) => ({ accepted: events.map((e) => e.id), duplicate: [], rejected: [] });
/** Every event the site was sent, in order */
const sentEvents = (): SentEvent[] => sendEvents.mock.calls.flatMap(([, events]) => events as SentEvent[]);
const kindsOf = (events: { kind: string; heroId: string }[]) => events.map((e) => `${e.kind} ${e.heroId}`);
/** A quest.done waiting in the outbox; `n` orders them by time */
const waiting = (n: number, over: Partial<QueuedEvent> = {}): QueuedEvent => ({
  id: `e-${n}`,
  heroId: "h-1",
  deviceId: DEVICE,
  kind: "quest.done",
  at: new Date(Date.UTC(2026, 9, 13, 12, 0, 0, n)).toISOString(),
  data: { difficulty: 1, xp: 10, fight: false },
  status: "queued",
  tries: 0,
  ...over,
});
/** The cards the device sent last time for the default heroes, so a start queues none */
const cardsAlreadySent = () => ({ "h-1": cardKey(cardOf(mia())!), "gm-1": cardKey(cardOf(mom())!) });
/** A reply the test lets go when it wants */
const held = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
};
const paidQuest = (over: Partial<{ heroId: string; questId: string; xp: number; fight: boolean }> = {}) => ({ heroId: "h-1", questId: "q-1", xp: 40, fight: false, ...over });
const sampleDevice = (): HeroDevice => ({
  siteUrl: "https://townhall.example.com",
  familyId: FAMILY,
  heroId: "h-1",
  deviceId: DEVICE,
  key: "xph_samplekey12345",
  label: "Mia's iPhone",
  linkedAt: 1770000000000,
  card: cardOf(mia()),
});
const sampleRewardEvent = (over: Partial<ReceivedEvent> = {}): ReceivedEvent => ({
  seq: 1,
  id: "evt-rew-1",
  heroId: "h-1",
  deviceId: "srv",
  kind: "reward.granted",
  scope: "family",
  at: "2026-10-13T12:00:00.000Z",
  receivedAt: "2026-10-13 12:00:00",
  data: { xp: 50, ap: 3, reason: "Quest Together bonus" },
  ...over,
});

describe("family store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.resetAllMocks();
    mockEnabled = true;
    mockState = emptyState();
    mockHeroDevice = null;
    mockSaveDevice.mockClear();
    mockClearDevice.mockClear();
    claimDevice.mockReset();
    makeLinkCode.mockReset();
    listPhones.mockReset();
    serverRemovePhone.mockReset();
    serverRemovePhone.mockResolvedValue(undefined);
    adoptFamily.mockReset();
    adoptFamily.mockResolvedValue(undefined);
    mockTownHall.isLinked = true;
    mockTownHall.auth = PARENT;
    mockTownHall.init.mockResolvedValue(undefined);
    mockTownHall.forgetLink.mockResolvedValue(undefined);
    (require("@/lib/services/pro/familyIdentity").ensureIdentity as jest.Mock).mockResolvedValue({ familyId: FAMILY, deviceId: DEVICE });
    bindFamily.mockResolvedValue("created");
    moveHome.mockResolvedValue(undefined);
    getFamily.mockResolvedValue({ familyId: FAMILY, heroes: [] });
    saveHero.mockResolvedValue(undefined);
    removeHero.mockResolvedValue(undefined);
    sendEvents.mockImplementation(acceptAll);
    fetchEvents.mockReset();
    fetchEvents.mockResolvedValue([]);
    mockApplyQuestRewards.mockReset();
    mockLogCompletion.mockReset();
    mockUpdateEntry.mockReset();
    mockQuestLog = [];
    mockQuests = {};
    fillUsers(mia(), mom(), noNickname());
  });

  afterEach(() => {
    // A store left running would keep listening to the shared signals and to the mocked Town Hall
    const pinia = getActivePinia() as unknown as { _s: Map<string, { $dispose: () => void }> };
    pinia._s.forEach((store) => store.$dispose());
    jest.useRealTimers();
  });

  describe("binding", () => {
    it("with the flag off makes no server call", async () => {
      mockEnabled = false;
      const store = await started();
      expect(store.enabled).toBe(false);
      expect(mockTownHall.init).not.toHaveBeenCalled();
      expect(bindFamily).not.toHaveBeenCalled();
      expect(saveHero).not.toHaveBeenCalled();
      expect(store.home).toBe("unknown");
    });

    it("an unlinked device binds nothing", async () => {
      mockTownHall.isLinked = false;
      mockTownHall.auth = { kind: "none" };
      const store = await started();
      expect(store.parentAuth).toBeNull();
      expect(bindFamily).not.toHaveBeenCalled();
    });

    it("the parent's auth is the Town Hall's while it is linked", async () => {
      const store = useFamilyStore();
      expect(store.parentAuth).toEqual(PARENT);
    });

    it("linked and created: home, and every hero with a nickname is registered with its age group", async () => {
      const store = await started();
      expect(bindFamily).toHaveBeenCalledWith(PARENT, FAMILY, DEVICE);
      expect(store.home).toBe("home");
      expect(store.problem).toBeNull();
      expect(saveHero).toHaveBeenCalledTimes(2);
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-1", "Mia", "child");
      expect(saveHero).toHaveBeenCalledWith(PARENT, "gm-1", "Mom", "adult");
      expect(saveHero).not.toHaveBeenCalledWith(PARENT, "h-3", expect.anything(), expect.anything());
      expect(mockState.home).toBe("home");
    });

    it("a family that is already home registers its heroes again", async () => {
      bindFamily.mockResolvedValue("home");
      const store = await started();
      expect(store.home).toBe("home");
      expect(saveHero).toHaveBeenCalledTimes(2);
    });

    it("keeps what the server holds for the heroes", async () => {
      const heroes = [{ heroId: "h-1", nickname: "Mia", ageGroup: "child", card: null }];
      getFamily.mockResolvedValue({ familyId: FAMILY, heroes });
      const store = await started();
      expect(getFamily).toHaveBeenCalledWith(PARENT);
      expect(store.heroes).toEqual(heroes);
    });

    it.each(["home-elsewhere", "other-family"] as const)("%s is kept and nothing is registered", async (answer) => {
      bindFamily.mockResolvedValue(answer);
      const store = await started();
      expect(store.home).toBe(answer);
      expect(mockState.home).toBe(answer);
      expect(saveHero).not.toHaveBeenCalled();
    });

    it("a profile's birthday decides the age group; a pick only fills in for a hero without one", async () => {
      mockState.ageGroupPicks = { "h-1": "teen", "h-2": "teen" };
      const bornFiveYearsAgo = `${new Date().getFullYear() - 5}-01-01`;
      fillUsers(mia(), { ...bo(), birthday: bornFiveYearsAgo });
      await started();
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-1", "Mia", "teen");
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-2", "Bo", "child");
    });

    it("shows the home the device last knew before the server answers", async () => {
      mockState.home = "home";
      bindFamily.mockReturnValue(new Promise(() => undefined));
      const store = useFamilyStore();
      await store.init();
      expect(store.home).toBe("home");
    });

    it("init() twice binds once", async () => {
      const store = useFamilyStore();
      await store.init();
      await store.init();
      await settle();
      expect(bindFamily).toHaveBeenCalledTimes(1);
      expect(mockTownHall.init).toHaveBeenCalledTimes(1);
    });

    it("does not make the first screen wait for the server", async () => {
      bindFamily.mockReturnValue(new Promise(() => undefined));
      const store = useFamilyStore();
      await expect(store.init()).resolves.toBeUndefined();
    });

    it("binds when the family is linked after the app started", async () => {
      mockTownHall.isLinked = false;
      mockTownHall.auth = { kind: "none" };
      const store = await started();
      expect(bindFamily).not.toHaveBeenCalled();
      mockTownHall.isLinked = true;
      mockTownHall.auth = PARENT;
      await settle();
      expect(bindFamily).toHaveBeenCalledTimes(1);
      expect(store.home).toBe("home");
    });

    it("a second bind while one is running joins it", async () => {
      let answer!: (value: string) => void;
      bindFamily.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      const store = useFamilyStore();
      const first = store.bind();
      const second = store.bind();
      await settle();
      answer("created");
      await Promise.all([first, second]);
      expect(bindFamily).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the site says no", () => {
    it("taken: the problem is kept and nothing is registered", async () => {
      bindFamily.mockRejectedValue(failWith(403, "xp_family_taken"));
      const store = await started();
      expect(store.problem).toBe("taken");
      expect(store.home).toBe("unknown");
      expect(saveHero).not.toHaveBeenCalled();
    });

    it("not a member: the problem is kept", async () => {
      bindFamily.mockRejectedValue(failWith(403, "xp_family_not_member"));
      const store = await started();
      expect(store.problem).toBe("not-member");
    });

    it("offline: the problem is kept, a later bind clears it", async () => {
      bindFamily.mockRejectedValueOnce(new TownHallError("offline"));
      const store = await started();
      expect(store.problem).toBe("offline");
      await store.bind();
      expect(store.problem).toBeNull();
      expect(store.home).toBe("home");
    });

    it("the link was refused: the Town Hall forgets it, the problem is unlinked", async () => {
      bindFamily.mockRejectedValue(failWith(401));
      const store = await started();
      expect(mockTownHall.forgetLink).toHaveBeenCalledTimes(1);
      expect(store.problem).toBe("unlinked");
    });

    it("a hero the site refuses does not stop the others", async () => {
      saveHero.mockRejectedValueOnce(new TownHallError("invalid", "bad nickname", 400, "xp_family_bad_request"));
      const store = await started();
      expect(saveHero).toHaveBeenCalledTimes(2);
      expect(store.home).toBe("home");
    });

    it("a dead connection stops the registering at once", async () => {
      saveHero.mockRejectedValue(new TownHallError("offline"));
      const store = await started();
      expect(saveHero).toHaveBeenCalledTimes(1);
      expect(store.problem).toBe("offline");
    });
  });

  describe("making this device home", () => {
    it("moves home, then binds again", async () => {
      bindFamily.mockResolvedValueOnce("home-elsewhere");
      const store = await started();
      expect(store.home).toBe("home-elsewhere");
      const calls: string[] = [];
      moveHome.mockImplementation(async () => void calls.push("move"));
      bindFamily.mockImplementation(async () => {
        calls.push("bind");
        return "home";
      });
      await store.makeHome();
      expect(moveHome).toHaveBeenCalledWith(PARENT, FAMILY, DEVICE);
      expect(calls).toEqual(["move", "bind"]);
      expect(store.home).toBe("home");
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-1", "Mia", "child");
    });

    it("a refused move leaves home where it was and keeps the problem", async () => {
      bindFamily.mockResolvedValueOnce("home-elsewhere");
      const store = await started();
      moveHome.mockRejectedValue(failWith(403, "xp_family_not_member"));
      await store.makeHome();
      expect(store.home).toBe("home-elsewhere");
      expect(store.problem).toBe("not-member");
      expect(bindFamily).toHaveBeenCalledTimes(1);
    });
  });

  describe("age groups", () => {
    it("setAgeGroup stores the pick and registers the hero again", async () => {
      fillUsers(mia(), bo());
      const store = await started();
      saveHero.mockClear();
      await store.setAgeGroup("h-2", "teen");
      expect(store.ageGroupPicks).toEqual({ "h-2": "teen" });
      expect(mockState.ageGroupPicks).toEqual({ "h-2": "teen" });
      expect(saveHero).toHaveBeenCalledTimes(1);
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-2", "Bo", "teen");
    });

    it("keeps the pick without calling the site while this device is not home", async () => {
      bindFamily.mockResolvedValue("home-elsewhere");
      fillUsers(bo());
      const store = await started();
      await store.setAgeGroup("h-2", "teen");
      expect(store.ageGroupPicks).toEqual({ "h-2": "teen" });
      expect(saveHero).not.toHaveBeenCalled();
    });

    it("a pick for a hero with no nickname is kept, not sent", async () => {
      const store = await started();
      saveHero.mockClear();
      await store.setAgeGroup("h-3", "teen");
      expect(store.ageGroupPicks["h-3"]).toBe("teen");
      expect(saveHero).not.toHaveBeenCalled();
    });

    it("with the flag off keeps nothing", async () => {
      mockEnabled = false;
      const store = await started();
      await store.setAgeGroup("h-1", "teen");
      expect(store.ageGroupPicks).toEqual({});
      expect(mockSaveState).not.toHaveBeenCalled();
    });
  });

  describe("removing a hero", () => {
    it("a deleted profile removes the hero on the site while this device is home", async () => {
      await started();
      emitHeroRemoved("h-1");
      await settle();
      expect(removeHero).toHaveBeenCalledWith(PARENT, "h-1");
    });

    it("forgets the removed hero's card and age pick", async () => {
      mockState.lastCards = { "h-1": "{}", "h-2": "{}" };
      mockState.ageGroupPicks = { "h-1": "teen", "h-2": "child" };
      const store = await started();
      emitHeroRemoved("h-1");
      await settle();
      // The bind's cards gave Mom an entry too (MP12); the removed hero's is gone and the others are left alone
      expect(mockState.lastCards).not.toHaveProperty("h-1");
      expect(mockState.lastCards).toHaveProperty("h-2", "{}");
      expect(mockState.ageGroupPicks).toEqual({ "h-2": "child" });
      expect(store.ageGroupPicks).toEqual({ "h-2": "child" });
    });

    it("does nothing while another device is home", async () => {
      bindFamily.mockResolvedValue("home-elsewhere");
      await started();
      emitHeroRemoved("h-1");
      await settle();
      expect(removeHero).not.toHaveBeenCalled();
    });

    it("does nothing with the flag off", async () => {
      mockEnabled = false;
      await started();
      emitHeroRemoved("h-1");
      await settle();
      expect(removeHero).not.toHaveBeenCalled();
    });

    it("an empty roster at start that fills a moment later removes and sends nothing", async () => {
      fillUsers();
      const store = useFamilyStore();
      await store.init();
      await settle();
      expect(saveHero).not.toHaveBeenCalled();
      fillUsers(mia(), mom());
      await settle();
      expect(removeHero).not.toHaveBeenCalled();
      expect(store.home).toBe("home");
    });

    it("a failed removal is kept as the problem and does not throw", async () => {
      const store = await started();
      removeHero.mockRejectedValue(failWith(403, "xp_family_not_member"));
      emitHeroRemoved("h-1");
      await settle();
      expect(store.problem).toBe("not-member");
    });
  });

  describe("hero cards (MP12)", () => {
    it("after the bind, one hero.card per hero with a nickname goes to the site", async () => {
      await started();
      expect(kindsOf(sentEvents()).sort()).toEqual(["hero.card gm-1", "hero.card h-1"]);
      const miasCard = sentEvents().find((e) => e.heroId === "h-1")!;
      expect(miasCard.deviceId).toBe(DEVICE);
      expect(Object.keys(miasCard.data).sort()).toEqual(["jobClass", "level", "look", "nickname"]);
      expect(miasCard.data).toMatchObject({ nickname: "Mia", level: 1 });
      expect(JSON.stringify(sentEvents())).not.toContain("Pollard");
      expect(Object.keys(mockState.lastCards).sort()).toEqual(["gm-1", "h-1"]);
      expect(mockState.outbox).toEqual([]);
    });

    it("the heroes the bind registered are not registered again for their first card", async () => {
      await started();
      expect(saveHero).toHaveBeenCalledTimes(2);
    });

    it("an unchanged profile queues nothing", async () => {
      mockState.lastCards = cardsAlreadySent();
      const store = await started();
      await store.queueCards();
      expect(sendEvents).not.toHaveBeenCalled();
      expect(mockState.outbox).toEqual([]);
    });

    it("a hero added after the bind is registered with saveHero, then its card is queued", async () => {
      const store = await started();
      saveHero.mockClear();
      fillUsers(mia(), mom(), bo());
      await store.queueCards();
      expect(saveHero).toHaveBeenCalledTimes(1);
      expect(saveHero).toHaveBeenCalledWith(PARENT, "h-2", "Bo", "child");
      expect(kindsOf(mockState.outbox)).toEqual(["hero.card h-2"]);
      expect(mockState.lastCards).toHaveProperty("h-2", cardKey(cardOf(bo())!));
    });

    it("a new hero the site could not take yet gets no card, and is registered again next time", async () => {
      const store = await started();
      fillUsers(mia(), mom(), bo());
      saveHero.mockRejectedValueOnce(new TownHallError("offline"));
      await store.queueCards();
      expect(mockState.outbox).toEqual([]);
      expect(mockState.lastCards).not.toHaveProperty("h-2");
      await store.queueCards();
      expect(saveHero).toHaveBeenLastCalledWith(PARENT, "h-2", "Bo", "child");
      expect(kindsOf(mockState.outbox)).toEqual(["hero.card h-2"]);
    });

    it("a nickname the site refused is not tried again until it changes", async () => {
      saveHero.mockImplementation(async (_auth, heroId: string, nickname: string) => {
        if (heroId === "h-2" && nickname === "Bo") throw new TownHallError("invalid", "bad nickname", 400, "xp_family_bad_request");
      });
      const store = await started();
      fillUsers(mia(), mom(), bo());
      await store.queueCards();
      await store.queueCards();
      expect(saveHero.mock.calls.filter(([, heroId]) => heroId === "h-2")).toHaveLength(1);
      expect(mockState.outbox).toEqual([]);
      mockUsers["h-2"].name.nick = "Bobo";
      await store.queueCards();
      expect(saveHero).toHaveBeenLastCalledWith(PARENT, "h-2", "Bobo", "child");
      expect(kindsOf(mockState.outbox)).toEqual(["hero.card h-2"]);
    });

    it("a level up from 3 to 4 queues the new card and hero.leveled", async () => {
      fillUsers({ ...mia(), jobClass: "warrior", stats: { level: 3 } });
      const store = await started();
      mockUsers["h-1"].stats.level = 4;
      await store.queueCards();
      expect(kindsOf(mockState.outbox)).toEqual(["hero.card h-1", "hero.leveled h-1"]);
      expect(mockState.outbox[0].data.level).toBe(4);
      expect(mockState.outbox[1].data).toEqual({ level: 4, jobClass: "warrior" });
    });

    it("a new nickname queues a card and no level up", async () => {
      const store = await started();
      mockUsers["h-1"].name.nick = "Mimi";
      await store.queueCards();
      expect(kindsOf(mockState.outbox)).toEqual(["hero.card h-1"]);
      expect(mockState.outbox[0].data.nickname).toBe("Mimi");
    });

    it("a profile change queues the card 2 seconds later", async () => {
      await started();
      jest.useFakeTimers();
      mockUsers["h-1"].name.nick = "Mimi";
      await tick(1999);
      expect(mockState.outbox).toEqual([]);
      await tick(1);
      expect(mockState.outbox.map((e) => e.data.nickname)).toEqual(["Mimi"]);
    });

    it("an empty roster while profiles load queues no blank cards", async () => {
      fillUsers();
      const store = await started();
      await store.queueCards();
      expect(sendEvents).not.toHaveBeenCalled();
      expect(mockState.lastCards).toEqual({});
    });

    it("while another device is home, nothing is queued", async () => {
      bindFamily.mockResolvedValue("home-elsewhere");
      const store = await started();
      await store.queueCards();
      emitQuestPaid(paidQuest());
      await settle();
      expect(mockState.outbox).toEqual([]);
      expect(mockState.lastCards).toEqual({});
      expect(sendEvents).not.toHaveBeenCalled();
    });

    it("with the flag off, nothing is queued or kept", async () => {
      mockEnabled = false;
      const store = await started();
      await store.queueCards();
      await store.flush();
      emitQuestPaid(paidQuest());
      await settle();
      expect(mockSaveState).not.toHaveBeenCalled();
      expect(sendEvents).not.toHaveBeenCalled();
    });
  });

  describe("quest events (MP12)", () => {
    it("a paid quest queues quest.done with the quest's difficulty and never its name", async () => {
      mockQuests["q-1"] = { id: "q-1", achievementName: "Take medicine", difficulty: 3 };
      await started();
      emitQuestPaid(paidQuest({ fight: true }));
      await settle();
      expect(mockState.outbox).toHaveLength(1);
      expect(mockState.outbox[0]).toMatchObject({ kind: "quest.done", heroId: "h-1", deviceId: DEVICE, status: "queued", tries: 0 });
      expect(mockState.outbox[0].data).toEqual({ difficulty: 3, xp: 40, fight: true });
      expect(JSON.stringify(mockState.outbox)).not.toContain("medicine");
    });

    it("a quest that is gone counts difficulty 0", async () => {
      await started();
      emitQuestPaid(paidQuest({ questId: "gone" }));
      await settle();
      expect(mockState.outbox[0].data).toEqual({ difficulty: 0, xp: 40, fight: false });
    });

    it("a hero without a nickname is not on the site, so their quest sends nothing", async () => {
      await started();
      emitQuestPaid(paidQuest({ heroId: "h-3" }));
      await settle();
      expect(mockState.outbox).toEqual([]);
    });
  });

  describe("sending (MP12)", () => {
    it("flush sends what waits in one batch and settles it", async () => {
      const store = await started();
      emitQuestPaid(paidQuest({ questId: "q-1" }));
      emitQuestPaid(paidQuest({ questId: "q-2" }));
      await settle();
      expect(mockState.outbox).toHaveLength(2);
      sendEvents.mockClear();
      await store.flush();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      const [auth, events] = sendEvents.mock.calls[0];
      expect(auth).toEqual(PARENT);
      expect(kindsOf(events)).toEqual(["quest.done h-1", "quest.done h-1"]);
      expect(events[0]).not.toHaveProperty("status");
      expect(events[0]).not.toHaveProperty("tries");
      expect(mockState.outbox).toEqual([]);
    });

    it("sends 60 waiting events as 50, then 10, oldest first", async () => {
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = Array.from({ length: 60 }, (_, n) => waiting(59 - n));
      await started();
      expect(sendEvents.mock.calls.map(([, events]) => events.length)).toEqual([50, 10]);
      expect(sendEvents.mock.calls[0][1][0].id).toBe("e-0");
      expect(mockState.outbox).toEqual([]);
    });

    it("one send at a time: two flushes at once send once", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockClear();
      const reply = held();
      sendEvents.mockImplementation(async (auth, events) => {
        await reply.promise;
        return acceptAll(auth, events);
      });
      const first = store.flush();
      const second = store.flush();
      await settle();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox[0].status).toBe("sending");
      reply.release();
      await Promise.all([first, second]);
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toEqual([]);
    });

    it("an event still sending when the app closed is queued again and sent on start", async () => {
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = [waiting(1, { status: "sending", tries: 2, nextTryAt: Date.now() + 600_000 })];
      await started();
      expect(sentEvents().map((e) => e.id)).toEqual(["e-1"]);
      expect(mockState.outbox).toEqual([]);
    });

    it("a rejected event is dropped and logged; the rest of the batch settles", async () => {
      const warn = jest.spyOn(debug, "warn");
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = [waiting(1), waiting(2)];
      sendEvents.mockResolvedValue({ accepted: ["e-1"], duplicate: [], rejected: [{ id: "e-2", code: "xp_family_event_invalid", message: "bad" }] });
      await started();
      expect(mockState.outbox).toEqual([]);
      expect(warn.mock.calls.some(([text]) => String(text).includes("e-2"))).toBe(true);
      warn.mockRestore();
    });

    it("a duplicate leaves the queue like an accepted event", async () => {
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = [waiting(1)];
      sendEvents.mockResolvedValue({ accepted: [], duplicate: ["e-1"], rejected: [] });
      await started();
      expect(mockState.outbox).toEqual([]);
    });

    it("an event the answer does not mention is queued again with a pause, not left sending", async () => {
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = [waiting(1)];
      sendEvents.mockResolvedValue({ accepted: [], duplicate: [], rejected: [] });
      await started();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox[0]).toMatchObject({ id: "e-1", status: "queued", tries: 1 });
    });

    it("offline: the events stay queued with a time to try again", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValue(new TownHallError("offline"));
      const before = Date.now();
      await store.flush();
      expect(mockState.outbox).toHaveLength(1);
      expect(mockState.outbox[0]).toMatchObject({ status: "queued", tries: 1 });
      expect(mockState.outbox[0].nextTryAt).toBeGreaterThanOrEqual(before + 5000);
      expect(store.problem).toBeNull();
    });

    it("rate limited: the events wait as long as the site asked", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValue(new TownHallError("server", "slow down", 429, "xp_family_rate_limited", 600));
      const before = Date.now();
      await store.flush();
      const after = Date.now();
      expect(mockState.outbox[0].nextTryAt).toBeGreaterThanOrEqual(before + 600_000);
      expect(mockState.outbox[0].nextTryAt).toBeLessThanOrEqual(after + 600_000);
    });

    it("the link was refused: the Town Hall forgets it and the events are kept", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValue(failWith(401));
      await store.flush();
      expect(mockTownHall.forgetLink).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toHaveLength(1);
      expect(mockState.outbox[0].status).toBe("queued");
    });

    it.each([
      ["xp_family_not_member", "not-member"],
      ["xp_family_taken", "taken"],
    ])("%s keeps the problem and the events", async (siteCode, found) => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValue(failWith(403, siteCode));
      await store.flush();
      expect(store.problem).toBe(found);
      expect(mockState.outbox).toHaveLength(1);
    });

    it("moved: this device is no longer home and sending stops", async () => {
      mockState.home = "home";
      mockState.lastCards = cardsAlreadySent();
      mockState.outbox = Array.from({ length: 60 }, (_, n) => waiting(n));
      sendEvents.mockRejectedValue(failWith(409, "xp_family_moved"));
      const store = await started();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(store.home).toBe("home-elsewhere");
      expect(mockState.home).toBe("home-elsewhere");
      expect(mockState.outbox).toHaveLength(60);
      expect(mockState.outbox.every((e) => e.status === "queued")).toBe(true);
      sendEvents.mockClear();
      await store.flush();
      expect(sendEvents).not.toHaveBeenCalled();
    });
  });

  describe("when to send (MP12)", () => {
    it("5 seconds after something is queued", async () => {
      await started();
      sendEvents.mockClear();
      jest.useFakeTimers();
      emitQuestPaid(paidQuest());
      await tick(4999);
      expect(mockState.outbox).toHaveLength(1);
      expect(sendEvents).not.toHaveBeenCalled();
      await tick(1);
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toEqual([]);
    });

    it("a failed send tries again after its pause", async () => {
      await started();
      sendEvents.mockClear();
      jest.useFakeTimers();
      sendEvents.mockRejectedValueOnce(new TownHallError("offline"));
      emitQuestPaid(paidQuest());
      await tick(5000);
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toHaveLength(1);
      await tick(5000);
      expect(sendEvents).toHaveBeenCalledTimes(2);
      expect(mockState.outbox).toEqual([]);
    });

    it("the browser coming back online sends what waits, pauses included", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValueOnce(new TownHallError("offline"));
      await store.flush();
      sendEvents.mockClear();
      window.dispatchEvent(new Event("online"));
      await settle();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toEqual([]);
    });

    it("the app coming back to the front sends what waits", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValueOnce(new TownHallError("offline"));
      await store.flush();
      sendEvents.mockClear();
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await settle();
      expect(sendEvents).toHaveBeenCalledTimes(1);
      expect(mockState.outbox).toEqual([]);
    });

    it("a Retry-After still holds when the browser comes back online", async () => {
      const store = await started();
      emitQuestPaid(paidQuest());
      await settle();
      sendEvents.mockRejectedValueOnce(new TownHallError("server", "slow down", 429, "xp_family_rate_limited", 600));
      await store.flush();
      sendEvents.mockClear();
      window.dispatchEvent(new Event("online"));
      await settle();
      expect(sendEvents).not.toHaveBeenCalled();
      expect(mockState.outbox).toHaveLength(1);
    });

    it("a store that is gone stops listening", async () => {
      const store = await started();
      store.$dispose();
      sendEvents.mockClear();
      emitQuestPaid(paidQuest());
      window.dispatchEvent(new Event("online"));
      await settle();
      expect(sendEvents).not.toHaveBeenCalled();
    });
  });

  describe("kid mode and phone linking (MP14)", () => {
    it("in kid mode init loads the device, calls refreshCard, and binds nothing", async () => {
      mockHeroDevice = sampleDevice();
      const updatedCard = { ...cardOf(mia())!, level: 5 };
      getFamily.mockResolvedValue({
        familyId: FAMILY,
        heroes: [{ heroId: "h-1", nickname: "Mia", card: updatedCard }],
      });
      const store = useFamilyStore();
      await store.init();
      expect(store.isKidMode).toBe(true);
      expect(store.device?.card?.level).toBe(5);
      expect(bindFamily).not.toHaveBeenCalled();
      expect(saveHero).not.toHaveBeenCalled();
    });

    it("claim saves the device, calls adoptFamily, sets isKidMode and device", async () => {
      const card = cardOf(mia())!;
      claimDevice.mockResolvedValue({
        key: "xph_key123",
        familyId: FAMILY,
        heroId: "h-1",
        card,
      });
      const store = useFamilyStore();
      const result = await store.claim("abcd-efgh");
      expect(result).toBe("linked");
      expect(claimDevice).toHaveBeenCalledWith("ABCDEFGH", DEVICE, expect.any(String));
      expect(mockSaveDevice).toHaveBeenCalledTimes(1);
      expect(adoptFamily).toHaveBeenCalledWith(FAMILY);
      expect(store.isKidMode).toBe(true);
      expect(store.device).toMatchObject({ key: "xph_key123", heroId: "h-1" });
    });

    it("a code-invalid rejection saves nothing", async () => {
      claimDevice.mockRejectedValue(failWith(404, "xp_family_code_invalid"));
      const store = useFamilyStore();
      const result = await store.claim("bad-code");
      expect(result).toBe("code-invalid");
      expect(mockSaveDevice).not.toHaveBeenCalled();
      expect(adoptFamily).not.toHaveBeenCalled();
      expect(store.isKidMode).toBe(false);
      expect(store.device).toBeNull();
    });

    it("refreshCard updates the card", async () => {
      mockHeroDevice = sampleDevice();
      const updatedCard = { ...cardOf(mia())!, level: 7 };
      getFamily.mockResolvedValue({
        familyId: FAMILY,
        heroes: [{ heroId: "h-1", nickname: "Mia", card: updatedCard }],
      });
      const store = useFamilyStore();
      store.device = mockHeroDevice;
      await store.refreshCard();
      expect(getFamily).toHaveBeenCalledWith({ kind: "hero", key: mockHeroDevice.key });
      expect(store.device?.card?.level).toBe(7);
      expect(mockSaveDevice).toHaveBeenCalledWith(expect.objectContaining({ card: expect.objectContaining({ level: 7 }) }));
    });

    it("a key-revoked sets unlinked: true", async () => {
      mockHeroDevice = { ...sampleDevice(), unlinked: false };
      getFamily.mockRejectedValue(failWith(401, "xp_family_key_revoked"));
      const store = useFamilyStore();
      store.device = mockHeroDevice;
      await store.refreshCard();
      expect(store.device?.unlinked).toBe(true);
      expect(store.problem).toBe("key-revoked");
      expect(mockSaveDevice).toHaveBeenCalledWith(expect.objectContaining({ unlinked: true }));
    });

    it("forgetDevice clears the device", async () => {
      mockHeroDevice = sampleDevice();
      const store = useFamilyStore();
      store.device = mockHeroDevice;
      await store.forgetDevice();
      expect(mockClearDevice).toHaveBeenCalledTimes(1);
      expect(store.device).toBeNull();
      expect(store.isKidMode).toBe(false);
    });

    it("linkCode asks makeLinkCode with parent auth", async () => {
      makeLinkCode.mockResolvedValue({ code: "ABCDEFGH", expiresAt: "2026-10-13T12:10:00Z" });
      const store = await started();
      const code = await store.linkCode("h-1");
      expect(makeLinkCode).toHaveBeenCalledWith(PARENT, "h-1");
      expect(code).toEqual({ code: "ABCDEFGH", expiresAt: "2026-10-13T12:10:00Z" });
    });

    it("loadPhones and removePhone manage the phones list", async () => {
      const phones = [{ id: 1, heroId: "h-1", label: "Mia's iPhone", createdAt: "2026-10-13", lastSeenAt: null }];
      listPhones.mockResolvedValue(phones);
      const store = await started();
      await store.loadPhones();
      expect(listPhones).toHaveBeenCalledWith(PARENT);
      expect(store.phones).toEqual(phones);
      await store.removePhone(1);
      expect(serverRemovePhone).toHaveBeenCalledWith(PARENT, 1);
      expect(store.phones).toEqual([]);
    });
  });

  describe("downloading rewards (MP18)", () => {
    it("a reward pays XP and AP once and writes a Party bonus log line", async () => {
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      const store = await started();
      await store.download();
      expect(mockLogCompletion).toHaveBeenCalledTimes(1);
      expect(mockLogCompletion).toHaveBeenCalledWith({
        questId: "party:evt-rew-1",
        questName: "Party bonus",
        userId: "h-1",
        status: "approved",
        source: "party",
        rewards: { xp: 50, gp: 0, ap: 3 },
      });
      expect(mockApplyQuestRewards).toHaveBeenCalledTimes(1);
      expect(mockApplyQuestRewards).toHaveBeenCalledWith(
        "h-1",
        { xp: 50, gp: 0, ap: 3 },
        "party:evt-rew-1"
      );
      expect(mockUpdateEntry).toHaveBeenCalledWith("log-1", { rewardsApplied: true });
      expect(mockState.paidRewards).toEqual([
        { id: "evt-rew-1", at: expect.any(String) },
      ]);
      expect(mockState.lastSeq).toBe(1);
    });

    it("downloading the same event again pays nothing", async () => {
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      const store = await started();
      await store.download();
      mockApplyQuestRewards.mockClear();
      mockLogCompletion.mockClear();
      mockUpdateEntry.mockClear();
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      await store.download();
      expect(mockApplyQuestRewards).not.toHaveBeenCalled();
      expect(mockLogCompletion).not.toHaveBeenCalled();
      expect(mockUpdateEntry).not.toHaveBeenCalled();
    });

    it("a lost lastSeq (0) with the id in paidRewards pays nothing", async () => {
      mockState.lastSeq = 0;
      mockState.paidRewards = [{ id: "evt-rew-1", at: "2026-10-13T12:00:00.000Z" }];
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      const store = await started();
      await store.download();
      expect(mockApplyQuestRewards).not.toHaveBeenCalled();
      expect(mockLogCompletion).not.toHaveBeenCalled();
      expect(mockState.lastSeq).toBe(1);
    });

    it("a log entry already marked rewardsApplied pays nothing", async () => {
      mockState.lastSeq = 0;
      mockState.paidRewards = [];
      mockQuestLog.push({
        id: "existing-log-1",
        questId: "party:evt-rew-1",
        questName: "Party bonus",
        userId: "h-1",
        completedAt: "2026-10-13T12:00:00.000Z",
        dayKey: "2026-10-13",
        status: "approved",
        source: "party",
        rewards: { xp: 50, gp: 0, ap: 3 },
        rewardsApplied: true,
      });
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      const store = await started();
      await store.download();
      expect(mockApplyQuestRewards).not.toHaveBeenCalled();
      expect(mockLogCompletion).not.toHaveBeenCalled();
      expect(mockState.paidRewards).toEqual([
        { id: "evt-rew-1", at: expect.any(String) },
      ]);
    });

    it("one with rewardsApplied: false is paid once (Review Focus 4)", async () => {
      mockState.lastSeq = 0;
      mockState.paidRewards = [];
      mockQuestLog.push({
        id: "existing-log-1",
        questId: "party:evt-rew-1",
        questName: "Party bonus",
        userId: "h-1",
        completedAt: "2026-10-13T12:00:00.000Z",
        dayKey: "2026-10-13",
        status: "approved",
        source: "party",
        rewards: { xp: 50, gp: 0, ap: 3 },
        rewardsApplied: false,
      });
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      const store = await started();
      await store.download();
      expect(mockLogCompletion).not.toHaveBeenCalled();
      expect(mockApplyQuestRewards).toHaveBeenCalledTimes(1);
      expect(mockApplyQuestRewards).toHaveBeenCalledWith(
        "h-1",
        { xp: 50, gp: 0, ap: 3 },
        "party:evt-rew-1"
      );
      expect(mockUpdateEntry).toHaveBeenCalledWith("existing-log-1", { rewardsApplied: true });
      expect(mockState.paidRewards).toEqual([
        { id: "evt-rew-1", at: expect.any(String) },
      ]);
    });

    it("GP is never paid even if present in event data", async () => {
      fetchEvents.mockResolvedValueOnce([
        sampleRewardEvent({ data: { xp: 50, ap: 3, gp: 100 } }),
      ]);
      const store = await started();
      await store.download();
      expect(mockApplyQuestRewards).toHaveBeenCalledWith(
        "h-1",
        { xp: 50, gp: 0, ap: 3 },
        "party:evt-rew-1"
      );
      expect(mockLogCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          rewards: { xp: 50, gp: 0, ap: 3 },
        })
      );
    });

    it("pages through events when 100 events are returned in a batch", async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        seq: i + 1,
        id: `evt-${i + 1}`,
        heroId: "h-1",
        deviceId: "srv",
        kind: "hero.leveled" as const,
        scope: "public" as const,
        at: "2026-10-13T12:00:00.000Z",
        receivedAt: "2026-10-13 12:00:00",
        data: { level: 2 },
      }));
      const page2 = [sampleRewardEvent({ seq: 101, id: "evt-rew-101" })];
      fetchEvents.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);
      const store = await started();
      await store.download();
      expect(fetchEvents).toHaveBeenCalledWith(PARENT, 0, 100);
      expect(fetchEvents).toHaveBeenCalledWith(PARENT, 100, 100);
      expect(mockState.lastSeq).toBe(101);
      expect(mockApplyQuestRewards).toHaveBeenCalledTimes(1);
    });

    it("the app coming back to the front triggers download", async () => {
      await started();
      fetchEvents.mockClear();
      fetchEvents.mockResolvedValueOnce([sampleRewardEvent()]);
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await settle();
      expect(fetchEvents).toHaveBeenCalled();
    });

    it("triggers download periodically every 2 minutes", async () => {
      jest.useFakeTimers();
      const store = useFamilyStore();
      const run = store.init();
      await tick(0);
      await run;
      await tick(0);
      fetchEvents.mockClear();
      await tick(119_999);
      expect(fetchEvents).not.toHaveBeenCalled();
      await tick(1);
      expect(fetchEvents).toHaveBeenCalled();
    });

    it("the periodic tick reads the phone list before the sheet pass", async () => {
      const linked = [{ id: 1, heroId: "h-1", label: "Mia's iPhone", createdAt: "2026-10-22T12:00:00Z", lastSeenAt: null }];
      // No phone is linked when the app starts; one is linked a minute later
      listPhones.mockResolvedValueOnce([]);
      listPhones.mockResolvedValue(linked);
      mockBuildHeroSheet.mockResolvedValue({
        stats: { level: 2, xp: 5, nextLevelXp: 100, gp: 3, ap: 1, hp: 9, maxHp: 10, mp: 1, maxMp: 2 },
        quests: [],
      });
      mockState.lastCards = cardsAlreadySent();
      jest.useFakeTimers();
      const store = useFamilyStore();
      const run = store.init();
      await tick(0);
      await run;
      await tick(0);
      expect(store.phones).toEqual([]);
      expect(mockBuildHeroSheet).not.toHaveBeenCalled();
      const readsBefore = listPhones.mock.calls.length;
      await tick(120_000);
      await tick(0);
      expect(listPhones).toHaveBeenCalledTimes(readsBefore + 1);
      expect(store.phones).toEqual(linked);
      const readAt = listPhones.mock.invocationCallOrder[readsBefore];
      const passAt = mockBuildHeroSheet.mock.invocationCallOrder[0];
      expect(readAt).toBeLessThan(passAt);
      expect(kindsOf(mockState.outbox)).toEqual(["hero.sheet h-1"]);
    });
  });
});
