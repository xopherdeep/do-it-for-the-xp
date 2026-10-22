import { createPinia, setActivePinia } from "pinia";
import type { RouteLocationNormalized, Router } from "vue-router";
import { freeBattleRoute, questBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { initialTurn, maySend, turnReducer } from "@/lib/services/sync/heroTurn";
import type { HeroTurn, TurnEvent } from "@/lib/services/sync/heroTurn";
import { handleBattleTimerGuard } from "@/router/_Guards/battle.guard";
import debug from "@/lib/utils/debug";

// The guard talks to eight things only: the battle store, the user store, the router, the alert bridge,
// the Ionic alert controller, debug, the quest board and the bestiary. All eight are faked here, and the guard is
// driven through the same entry point the router uses. Each spec sets `mockBattleStore` to a fresh fake (or, in
// the pacing block, to the real store). The quest ambush rule itself (questAmbush) is the real one.
let mockBattleStore: any;
const mockUserStore = {
  currentUser: { id: "hero-1" as string | null },
  users: {} as Record<string, any>,
  // The ambush cooldowns live on the hero's grudge record (spec 5.7): the guard hands the rebuilt record back whole
  setQuestGrudges: jest.fn((heroId: string, record: Record<string, unknown>) => {
    mockUserStore.users[heroId] = { ...mockUserStore.users[heroId], questGrudges: record };
  }),
};

// Family Sync: whether it is on, and the hero's turn on this device. The turns move through the real reducer
// (heroTurn.ts), so a spec says what the sync did (sign in, granted, rest, busy, refused) and not what the store answers.
// Off by default, as for a family that has not joined; the specs under "with Family Sync" turn it on.
let mockSyncOn = false;
let mockTurns: Record<string, HeroTurn> = {};
const mockHolds = (id: string): boolean => (mockTurns[id] ? maySend(mockTurns[id]) : false);
jest.mock("@/lib/store/stores/sync", () => ({
  useSyncStore: () => ({
    get isOn() {
      return mockSyncOn;
    },
    holds: (id: string) => mockHolds(id),
    stateOf: (id: string) => mockTurns[id]?.state ?? null,
  }),
}));

// The alert bridge: every call is a jest.fn and the hero's choice is whatever the test says it is.
// The factory reaches them lazily (names start with "mock" for jest's hoisting).
const mockBridge = {
  alertPermission: jest.fn(),
  requestAlertPermission: jest.fn(),
  battleAlertsChoice: jest.fn(),
  setBattleAlertsChoice: jest.fn(),
  showAlert: jest.fn(),
  scheduleAlert: jest.fn(),
  cancelAlert: jest.fn(),
  isNativeApp: jest.fn(),
};
const mockAlertController = { create: jest.fn() };
const mockCapacitorApp = { addListener: jest.fn() };
// The hero's quest board (an empty one unless a spec fills it) and the bestiary's beasts by id.
const mockBoard = jest.fn();
const mockLoadBeast = jest.fn();

jest.mock("@/lib/store/stores/battle", () => ({ useBattleStore: () => mockBattleStore }));
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: () => mockUserStore }));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  AMBUSH_ALERT_ID: 7001,
  alertPermission: (...args: unknown[]) => mockBridge.alertPermission(...args),
  requestAlertPermission: (...args: unknown[]) => mockBridge.requestAlertPermission(...args),
  battleAlertsChoice: (...args: unknown[]) => mockBridge.battleAlertsChoice(...args),
  setBattleAlertsChoice: (...args: unknown[]) => mockBridge.setBattleAlertsChoice(...args),
  showAlert: (...args: unknown[]) => mockBridge.showAlert(...args),
  scheduleAlert: (...args: unknown[]) => mockBridge.scheduleAlert(...args),
  cancelAlert: (...args: unknown[]) => mockBridge.cancelAlert(...args),
  isNativeApp: (...args: unknown[]) => mockBridge.isNativeApp(...args),
}));
jest.mock("@ionic/vue", () => ({
  alertController: { create: (...args: unknown[]) => mockAlertController.create(...args) },
}));
jest.mock("@capacitor/app", () => ({
  App: { addListener: (...args: unknown[]) => mockCapacitorApp.addListener(...args) },
}));
jest.mock("@/lib/services/battle/thiefEncounter", () => ({
  ...jest.requireActual("@/lib/services/battle/thiefEncounter"),
  isThiefRoll: () => false,
}));
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  getQuestEngine: () => ({ getQuestBoardForUser: (...args: unknown[]) => mockBoard(...args) }),
}));
jest.mock("@/lib/services/battle/BestiaryService", () => ({
  BestiaryService: class {
    loadBeastById(id: string) {
      return mockLoadBeast(id);
    }
  },
}));

const AMBUSH_ALERT = { id: 7001, title: "⚔️ A beast blocks your path!", body: "Come back and fight!" };

// --- fakes -------------------------------------------------------------------------------------

type FakeRouter = { currentRoute: { value: { name?: string } }; push: jest.Mock };

/** A router that is standing on `name` and accepts every push. */
const makeRouter = (name = "home-town"): FakeRouter => ({
  currentRoute: { value: { name } },
  push: jest.fn().mockResolvedValue(undefined),
});

const asRouter = (router: FakeRouter) => router as unknown as Router;

const toRoute = (name: string) =>
  ({ name, params: {}, query: {}, meta: {} }) as unknown as RouteLocationNormalized;

/**
 * Stand-in for the battle store with a toy step counter: the encounter is due on the 3rd tick
 * after arming. If the guard forgot to re-arm, `counter` would stay at 0 and every later tick
 * would fire again, which is exactly the bug the specs below pin down.
 */
const ARM_STEPS = 3;
type Ambush = { heroId: string; region?: string; at: number; questId?: string };
const makeBattleStore = () => {
  const store = {
    active: false,
    counter: ARM_STEPS,
    interval: null as number | null,
    pendingAmbush: null as Ambush | null,
    startBattleTimer: jest.fn(() => {
      store.interval = 1;
    }),
    stopBattleTimer: jest.fn(() => {
      store.interval = null;
    }),
    setTerrainForRoute: jest.fn(),
    resetBattleTimer: jest.fn(() => {
      store.counter = ARM_STEPS;
    }),
    randomEncounter: jest.fn(() => {
      store.counter -= 1;
      return store.counter <= 0 && !store.active;
    }),
    restWalk: jest.fn(),
    setPendingAmbush: jest.fn((ambush: Ambush) => {
      store.pendingAmbush = ambush;
    }),
    clearPendingAmbush: jest.fn(() => {
      store.pendingAmbush = null;
    }),
    nextEncounterAt: jest.fn((_now: Date, _invisibleUntil?: Date | null): Date | null => null),
  };
  return store;
};

/** Enter `routeName` like router.beforeEach does and hand back the per-tick callback the guard registered. */
const enter = (routeName: string, router: FakeRouter) => {
  handleBattleTimerGuard(toRoute(routeName), asRouter(router));
  const { onEncounter } = mockBattleStore.startBattleTimer.mock.calls[0][0];
  return onEncounter as () => Promise<void>;
};

/** Run `tick` `times` times, one after the other. */
const tickTimes = async (tick: () => Promise<void>, times: number) => {
  for (let i = 0; i < times; i++) await tick();
};

/** Let queued promise callbacks run */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

// Whether the page is in front: the guard reads document.visibilityState and listens for visibilitychange.
let mockVisibility: "visible" | "hidden" = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => mockVisibility });

/** The hero leaves (hidden) or comes back (visible), and the page says so. */
const setVisibility = (state: "visible" | "hidden") => {
  mockVisibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUserStore.currentUser.id = "hero-1";
  mockUserStore.users = {};
  mockSyncOn = false;
  mockTurns = {};
  mockVisibility = "visible";
  mockBridge.battleAlertsChoice.mockReturnValue("off");
  mockBridge.isNativeApp.mockReturnValue(false);
  mockBridge.showAlert.mockResolvedValue({ shown: true });
  mockBridge.scheduleAlert.mockResolvedValue({ shown: false, reason: "web" });
  mockBridge.cancelAlert.mockResolvedValue(undefined);
  mockBoard.mockReset().mockResolvedValue([]);
  mockLoadBeast.mockReset().mockResolvedValue(null);
});

// --- guard decisions (stores and router faked) ---------------------------------------------------

describe("battle guard", () => {
  beforeEach(() => {
    mockBattleStore = makeBattleStore();
  });

  describe("timer lifecycle", () => {
    it.each([
      "home-town",
      "world-map",
      "world-plains",
      "world-islands",
      "world-forest",
      "world-swamps",
      "world-mountains",
      "world-sands",
      "world-clouds",
      "world-ice",
      "the-moon",
    ])("starts the encounter timer on %s", (name) => {
      handleBattleTimerGuard(toRoute(name), asRouter(makeRouter()));

      expect(mockBattleStore.startBattleTimer).toHaveBeenCalledTimes(1);
      expect(mockBattleStore.startBattleTimer).toHaveBeenCalledWith({ onEncounter: expect.any(Function) });
      expect(mockBattleStore.stopBattleTimer).not.toHaveBeenCalled();
    });

    it.each(["my-tasks", "temple", "battle-free", "log-in"])(
      "stops the encounter timer on %s",
      (name) => {
        handleBattleTimerGuard(toRoute(name), asRouter(makeRouter()));

        expect(mockBattleStore.stopBattleTimer).toHaveBeenCalledTimes(1);
        expect(mockBattleStore.startBattleTimer).not.toHaveBeenCalled();
      }
    );
  });

  describe("random encounter", () => {
    it("fires once when the counter runs out, then re-arms and waits for the next one", async () => {
      const router = makeRouter();
      const tick = enter("home-town", router);

      await tickTimes(tick, ARM_STEPS - 1);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.resetBattleTimer).not.toHaveBeenCalled();

      await tick(); // the counter runs out
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(1);
      expect(debug.log).toHaveBeenCalledWith("Random encounter triggered!");

      await tickTimes(tick, ARM_STEPS - 1); // re-armed: quiet again
      expect(router.push).toHaveBeenCalledTimes(1);

      await tick(); // and the next encounter arrives
      expect(router.push).toHaveBeenCalledTimes(2);
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(2);
    });

    it("re-arms before it navigates, so a slow navigation cannot fire a second encounter", async () => {
      const router = makeRouter();
      router.push.mockReturnValue(new Promise(() => undefined)); // the navigation never lands
      const tick = enter("home-town", router);

      mockBattleStore.counter = 1;
      void tick(); // fires; the quest lookup and then the push are in flight
      void tick(); // the next tick arrives before the navigation does
      await flush();

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(1);
    });

    it("sends the hero who is current when the counter runs out, not the one who armed the timer", async () => {
      const router = makeRouter();
      const tick = enter("world-map", router);

      mockUserStore.currentUser.id = "hero-2";
      mockBattleStore.counter = 1;
      await tick();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-2"));
    });

    it("logs and carries on when the navigation fails", async () => {
      const failure = new Error("chunk failed to load");
      const router = makeRouter();
      router.push.mockRejectedValueOnce(failure);
      const tick = enter("home-town", router);

      mockBattleStore.counter = 1;
      await expect(tick()).resolves.toBeUndefined();

      expect(debug.error).toHaveBeenCalledWith(expect.any(String), failure);
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe("region pages", () => {
    it("weighs the terrain of the region on entry, plains elsewhere", () => {
      handleBattleTimerGuard(toRoute("world-forest"), asRouter(makeRouter()));
      expect(mockBattleStore.setTerrainForRoute).toHaveBeenLastCalledWith("forest");
      handleBattleTimerGuard(toRoute("world-plains"), asRouter(makeRouter()));
      expect(mockBattleStore.setTerrainForRoute).toHaveBeenLastCalledWith(null);
      handleBattleTimerGuard(toRoute("home-town"), asRouter(makeRouter()));
      expect(mockBattleStore.setTerrainForRoute).toHaveBeenLastCalledWith(null);
    });

    it("sends the fight out with the region, so the pool and the way back follow it", async () => {
      const router = makeRouter("world-ice");
      const tick = enter("world-ice", router);
      mockBattleStore.counter = 1;
      await tick();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1", [], "ice"));
    });
  });

  describe("suppressed ticks spend no steps, so the encounter that was coming is still coming", () => {
    it.each(["battle-free", "battle-quest", "battle-temple"])(
      "never fires while the hero is on %s",
      async (name) => {
        // Returning from a fight restarts the timer while the live route is still the battle page.
        const router = makeRouter(name);
        const tick = enter("home-town", router);
        mockBattleStore.counter = 1; // one step from an encounter

        await tickTimes(tick, 5);
        expect(router.push).not.toHaveBeenCalled();
        expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
        expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(5);
        expect(mockBattleStore.counter).toBe(1);

        router.currentRoute.value.name = "home-town"; // back in town
        await tick();
        expect(router.push).toHaveBeenCalledTimes(1);
      }
    );

    it.each([null, ""])("never fires without a current hero (id %p)", async (noHero) => {
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;
      mockUserStore.currentUser.id = noHero;

      await tickTimes(tick, 5);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(5);
      expect(mockBattleStore.counter).toBe(1);

      mockUserStore.currentUser.id = "hero-1"; // a hero picks up the controller
      await tick();
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
    });

    it("never fires while a modal is open", async () => {
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;

      const modal = document.createElement("ion-modal");
      modal.className = "show-modal";
      document.body.appendChild(modal);
      await tickTimes(tick, 3);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(3);

      modal.remove(); // closed: the encounter that was coming lands
      await tick();
      expect(router.push).toHaveBeenCalledTimes(1);
    });

    it("never fires while X's Invisibility holds the encounters back", async () => {
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;
      mockUserStore.users["hero-1"] = { questEffects: { noEncountersUntil: new Date(Date.now() + 60_000).toISOString() } };

      await tickTimes(tick, 3);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(3);

      mockUserStore.users["hero-1"] = { questEffects: { noEncountersUntil: new Date(Date.now() - 1_000).toISOString() } };
      await tick(); // worn off
      expect(router.push).toHaveBeenCalledTimes(1);
    });

    it("never fires while a battle is active", async () => {
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;
      mockBattleStore.active = true;

      await tickTimes(tick, 5);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(5);
      expect(mockBattleStore.counter).toBe(1);

      mockBattleStore.active = false; // the fight is over
      await tick();
      expect(router.push).toHaveBeenCalledTimes(1);
    });
  });

  describe("quest ambushes", () => {
    const NOON = new Date(2026, 9, 12, 12, 0, 0, 0);
    const HOUR = 60 * 60_000;

    /** A daily quest for hero-1 due at 08:00 (so overdue at noon) whose beast is the Dish Goblin. */
    const makeQuest = (id: string, overrides: Record<string, unknown> = {}) =>
      ({
        id,
        achievementName: `Chore ${id}`,
        beastId: "beast-dish-goblin",
        type: "individual",
        assignee: ["hero-1"],
        basicSchedule: "daily",
        dueByTime: "08:00",
        repeatOnDays: [],
        ...overrides,
      }) as unknown as Achievement;

    /** The board's row for an open quest, overdue at noon unless `overrides` push its due time later. */
    const openRow = (id: string, overrides: Record<string, unknown> = {}): QuestBoardItem => ({
      quest: makeQuest(id, overrides),
      status: "open",
      progress: null,
      pending: false,
      overdue: true,
    });

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NOON);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /** The hero stands on `routeName`, the encounter is one step away, and the tick springs it. */
    const spring = async (routeName = "home-town") => {
      const router = makeRouter(routeName);
      const tick = enter(routeName, router);
      mockBattleStore.counter = 1;
      await tick();
      return { router, tick };
    };

    it("sends the hero into the battle of an overdue quest instead of a free fight", async () => {
      mockBoard.mockResolvedValue([openRow("q-dishes")]);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes"));
      expect(mockBoard).toHaveBeenCalledWith("hero-1", NOON, undefined, undefined);
      expect(mockUserStore.setQuestGrudges).toHaveBeenCalledWith("hero-1", {
        "q-dishes": { marks: 0, lastAmbushAt: NOON.getTime() },
      });
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(1);
    });

    it("takes the encounter on a region page too, and the fight comes back to that page", async () => {
      mockBoard.mockResolvedValue([openRow("q-dishes")]);
      const { router } = await spring("world-ice");

      expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes", "ice"));
    });

    it("sends the quest with the oldest deadline first", async () => {
      mockBoard.mockResolvedValue([
        openRow("later", { dueByTime: "10:00" }),
        openRow("oldest", { dueByTime: "06:30" }),
        openRow("middle", { dueByTime: "08:00" }),
      ]);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "oldest"));
    });

    it("stays a free fight when nothing is overdue or anytime", async () => {
      mockBoard.mockResolvedValue([
        openRow("not-yet", { dueByTime: "18:00" }),
        { ...openRow("done"), status: "done" },
        { ...openRow("waiting"), pending: true },
      ]);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      expect(mockUserStore.setQuestGrudges).not.toHaveBeenCalled();
    });

    it("sends an anytime quest instead of a free fight", async () => {
      mockBoard.mockResolvedValue([openRow("no-clock", { dueByTime: "" })]);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "no-clock"));
    });

    it("stays a free fight when the overdue quest has no beast", async () => {
      mockBoard.mockResolvedValue([openRow("q1", { beastId: undefined, noBeast: true })]);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
    });

    it("stays a free fight, and says so, when the board cannot be read", async () => {
      const failure = new Error("storage is gone");
      mockBoard.mockRejectedValue(failure);
      const { router } = await spring();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      expect(debug.warn).toHaveBeenCalledWith(expect.any(String), failure);
    });

    describe("the 60-minute cooldown", () => {
      it("lets an overdue quest ambush a hero once an hour, and the next encounter is free", async () => {
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router, tick } = await spring();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-1", "q-dishes"));

        jest.setSystemTime(NOON.getTime() + 30 * 60_000);
        mockBattleStore.counter = 1;
        await tick();
        expect(router.push).toHaveBeenLastCalledWith(freeBattleRoute("hero-1"));

        jest.setSystemTime(NOON.getTime() + HOUR);
        mockBattleStore.counter = 1;
        await tick();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-1", "q-dishes"));
        expect(mockUserStore.setQuestGrudges).toHaveBeenCalledTimes(2);
      });

      it("gives the slot to the next overdue quest while the first one rests", async () => {
        mockBoard.mockResolvedValue([openRow("first", { dueByTime: "07:00" }), openRow("second", { dueByTime: "09:00" })]);
        const { router, tick } = await spring();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-1", "first"));

        mockBattleStore.counter = 1;
        await tick();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-1", "second"));

        mockBattleStore.counter = 1;
        await tick();
        expect(router.push).toHaveBeenLastCalledWith(freeBattleRoute("hero-1"));
      });

      it("is read from the hero's own grudge record: a stamp from ten minutes ago keeps the quest resting", async () => {
        mockUserStore.users["hero-1"] = {
          questGrudges: { "q-dishes": { marks: 2, lastAmbushAt: NOON.getTime() - 10 * 60_000 } },
        };
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await spring();

        expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
        expect(mockUserStore.setQuestGrudges).not.toHaveBeenCalled();
      });

      it("lets a quest whose last ambush is over an hour old ambush again, and keeps the marks it holds", async () => {
        mockUserStore.users["hero-1"] = {
          questGrudges: { "q-dishes": { marks: 2, lastFledAt: 5, lastAmbushAt: NOON.getTime() - 2 * HOUR } },
        };
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await spring();

        expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes"));
        expect(mockUserStore.users["hero-1"].questGrudges).toEqual({
          "q-dishes": { marks: 2, lastFledAt: 5, lastAmbushAt: NOON.getTime() },
        });
      });

      it("a grudge with no ambush stamp does not stop the quest from ambushing", async () => {
        mockUserStore.users["hero-1"] = { questGrudges: { "q-dishes": { marks: 3, lastFledAt: NOON.getTime() - 60_000 } } };
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await spring();

        expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes"));
      });

      it("is kept for each hero on their own", async () => {
        mockBoard.mockResolvedValue([openRow("q-dishes", { assignee: ["hero-1", "hero-2"] })]);
        const { router, tick } = await spring();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-1", "q-dishes"));

        mockUserStore.currentUser.id = "hero-2";
        mockBattleStore.counter = 1;
        await tick();
        expect(router.push).toHaveBeenLastCalledWith(questBattleRoute("hero-2", "q-dishes"));
      });
    });

    describe("what still holds the ambush back", () => {
      it("sends nothing while X's Invisibility holds every encounter back", async () => {
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const router = makeRouter();
        const tick = enter("home-town", router);
        mockBattleStore.counter = 1;
        mockUserStore.users["hero-1"] = { questEffects: { noEncountersUntil: new Date(NOON.getTime() + 60_000).toISOString() } };

        await tickTimes(tick, 3);
        expect(router.push).not.toHaveBeenCalled();
        expect(mockBoard).not.toHaveBeenCalled();
        expect(mockUserStore.setQuestGrudges).not.toHaveBeenCalled();

        jest.setSystemTime(NOON.getTime() + 2 * 60_000); // worn off
        await tick();
        expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes"));
      });

      it("reads the hero's items: Chronos' Clock holds the deadline, so the encounter stays free", async () => {
        const questEffects = {
          pause: { from: new Date(NOON.getTime() - HOUR).toISOString(), until: new Date(NOON.getTime() + HOUR).toISOString() },
        };
        mockUserStore.users["hero-1"] = { questEffects };
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await spring();

        expect(mockBoard).toHaveBeenCalledWith("hero-1", NOON, undefined, questEffects);
        expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      });

      it("never stacks a quest fight on a fight that started while the board was loading", async () => {
        let loaded!: (board: QuestBoardItem[]) => void;
        mockBoard.mockReturnValue(new Promise((resolve) => (loaded = resolve)));
        const router = makeRouter();
        const tick = enter("home-town", router);
        mockBattleStore.counter = 1;

        const pending = tick();
        router.currentRoute.value.name = "battle-quest"; // the hero opened a fight by hand
        loaded([openRow("q-dishes")]);
        await pending;

        expect(router.push).not.toHaveBeenCalled();
        expect(mockUserStore.setQuestGrudges).not.toHaveBeenCalled();
        expect(mockBattleStore.setPendingAmbush).not.toHaveBeenCalled();
      });
    });

    describe("while the hero is away", () => {
      const springAway = async (routeName = "home-town") => {
        mockVisibility = "hidden";
        return spring(routeName);
      };

      it("waits for the hero with the quest it sent, and navigates nowhere", async () => {
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await springAway("world-ice");

        expect(router.push).not.toHaveBeenCalled();
        expect(mockBattleStore.pendingAmbush).toEqual({
          heroId: "hero-1",
          region: "ice",
          at: NOON.getTime(),
          questId: "q-dishes",
        });
        expect(mockUserStore.setQuestGrudges).toHaveBeenCalledWith("hero-1", {
          "q-dishes": { marks: 0, lastAmbushAt: NOON.getTime() },
        });
      });

      it("holds a free ambush with no quest when nothing is overdue", async () => {
        mockBoard.mockResolvedValue([openRow("not-yet", { dueByTime: "18:00" })]);
        await springAway();

        expect(mockBattleStore.pendingAmbush).toEqual({ heroId: "hero-1", at: NOON.getTime(), region: undefined });
        expect(mockBattleStore.pendingAmbush.questId).toBeUndefined();
      });

      it("names the beast and the chore in the alert, as the family's bestiary calls the beast", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
        mockBoard.mockResolvedValue([openRow("q-dishes", { achievementName: "Load the dishwasher" })]);
        mockLoadBeast.mockResolvedValue({ name: "Plate Gremlin" });
        await springAway();

        expect(mockLoadBeast).toHaveBeenCalledWith("beast-dish-goblin");
        expect(mockBridge.showAlert).toHaveBeenCalledTimes(1);
        expect(mockBridge.showAlert).toHaveBeenCalledWith({
          id: 7001,
          title: "⚔️ The Plate Gremlin blocks your path!",
          body: "Load the dishwasher is waiting. Come back and fight!",
        });
      });

      it("falls back to the library's name for a beast the bestiary does not hold", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
        mockBoard.mockResolvedValue([openRow("q-dishes", { achievementName: "Load the dishwasher" })]);
        await springAway();

        expect(mockBridge.showAlert.mock.calls[0][0].title).toBe("⚔️ The Dish Goblin blocks your path!");
      });

      it("still names the chore when nobody knows the beast", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
        mockBoard.mockResolvedValue([openRow("q-dishes", { beastId: "custom-beast-1" })]);
        await springAway();

        expect(mockBridge.showAlert).toHaveBeenCalledWith({
          id: 7001,
          title: "⚔️ A beast blocks your path!",
          body: "Chore q-dishes is waiting. Come back and fight!",
        });
      });

      it("rings the plain alert for a free ambush", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
        await springAway();

        expect(mockBridge.showAlert).toHaveBeenCalledWith(AMBUSH_ALERT);
      });

      it("rings nothing, and does not read the bestiary, when the hero did not ask for alerts", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("off");
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        await springAway();

        expect(mockBattleStore.pendingAmbush.questId).toBe("q-dishes");
        expect(mockBridge.showAlert).not.toHaveBeenCalled();
        expect(mockLoadBeast).not.toHaveBeenCalled();
      });

      it("rings the alert once, without naming a beast it could not read", async () => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
        mockBoard.mockResolvedValue([openRow("q-dishes", { beastId: "custom-beast-1" })]);
        mockLoadBeast.mockRejectedValue(new Error("bestiary is gone"));
        await springAway();

        expect(mockBridge.showAlert).toHaveBeenCalledTimes(1);
        expect(mockBridge.showAlert.mock.calls[0][0].title).toBe("⚔️ A beast blocks your path!");
      });

      it("springs the quest's battle when the hero comes back, from the page it sprang on", async () => {
        mockBoard.mockResolvedValue([openRow("q-dishes")]);
        const { router } = await springAway("world-forest");
        setVisibility("visible");

        expect(router.push).toHaveBeenCalledTimes(1);
        expect(router.push).toHaveBeenCalledWith(questBattleRoute("hero-1", "q-dishes", "forest"));
        expect(mockBattleStore.pendingAmbush).toBeNull();
      });
    });
  });

  describe("an encounter while the hero is away", () => {
    /** The page is hidden, the encounter is one step away, and the tick springs it. */
    const springAway = async (routeName = "home-town") => {
      const router = makeRouter(routeName);
      const tick = enter(routeName, router);
      mockBattleStore.counter = 1;
      mockVisibility = "hidden";
      await tick();
      return { router, tick };
    };

    it("waits for the hero instead of navigating, and remembers the hero and the region", async () => {
      const { router } = await springAway("world-ice");

      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.resetBattleTimer).toHaveBeenCalledTimes(1);
      expect(mockBattleStore.setPendingAmbush).toHaveBeenCalledTimes(1);
      expect(mockBattleStore.pendingAmbush).toEqual({ heroId: "hero-1", region: "ice", at: expect.any(Number) });
    });

    it("has no region to remember on the home town", async () => {
      await springAway("home-town");

      expect(mockBattleStore.pendingAmbush.region).toBeUndefined();
    });

    it("rings the ambush alert when the hero chose alerts", async () => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      await springAway();

      expect(mockBridge.showAlert).toHaveBeenCalledTimes(1);
      expect(mockBridge.showAlert).toHaveBeenCalledWith(AMBUSH_ALERT);
    });

    it.each(["off", "unasked"])("rings nothing when the choice is %s", async (choice) => {
      mockBridge.battleAlertsChoice.mockReturnValue(choice);
      await springAway();

      expect(mockBattleStore.setPendingAmbush).toHaveBeenCalledTimes(1);
      expect(mockBridge.showAlert).not.toHaveBeenCalled();
    });

    it("sends a visible encounter straight to battle, with no ambush and no alert", async () => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;
      await tick();

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      expect(mockBattleStore.setPendingAmbush).not.toHaveBeenCalled();
      expect(mockBridge.showAlert).not.toHaveBeenCalled();
    });

    it("keeps walking in a hidden tab until an ambush is waiting", async () => {
      mockVisibility = "hidden";
      const router = makeRouter();
      const tick = enter("home-town", router);

      await tickTimes(tick, 2);
      expect(mockBattleStore.randomEncounter).toHaveBeenCalledTimes(2);
      expect(mockBattleStore.restWalk).not.toHaveBeenCalled();
      expect(mockBattleStore.counter).toBe(ARM_STEPS - 2);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("holds one ambush at a time: ticks while it waits spend no steps and ring nothing more", async () => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      const { router, tick } = await springAway();
      const counter = mockBattleStore.counter;
      mockBattleStore.randomEncounter.mockClear();
      mockBattleStore.restWalk.mockClear();

      await tickTimes(tick, 5);
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(5);
      expect(mockBattleStore.counter).toBe(counter);
      expect(mockBattleStore.setPendingAmbush).toHaveBeenCalledTimes(1);
      expect(mockBridge.showAlert).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
    });

    describe("coming back", () => {
      it("takes the alert back and springs the ambush for the same hero and region", async () => {
        const { router } = await springAway("world-forest");
        setVisibility("visible");

        expect(mockBridge.cancelAlert).toHaveBeenCalledWith(7001);
        expect(router.push).toHaveBeenCalledTimes(1);
        expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1", [], "forest"));
        expect(mockBattleStore.pendingAmbush).toBeNull();
      });

      it("springs it on the home town too, with no region", async () => {
        const { router } = await springAway("home-town");
        setVisibility("visible");

        expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      });

      it("springs it once, however many times the page flips back", async () => {
        const { router } = await springAway();
        setVisibility("visible");
        setVisibility("hidden");
        setVisibility("visible");

        expect(router.push).toHaveBeenCalledTimes(1);
      });

      it("does not rest the walk clock: the time away counts as walking", async () => {
        await springAway();
        mockBattleStore.restWalk.mockClear();
        setVisibility("visible");

        expect(mockBattleStore.restWalk).not.toHaveBeenCalled();
      });

      it("does not spring it while the page is still hidden", async () => {
        const { router } = await springAway();
        setVisibility("hidden");

        expect(router.push).not.toHaveBeenCalled();
        expect(mockBattleStore.pendingAmbush).not.toBeNull();
        expect(mockBridge.cancelAlert).not.toHaveBeenCalled();
      });

      it("drops an ambush meant for another hero", async () => {
        const { router } = await springAway();
        mockUserStore.currentUser.id = "hero-2";
        setVisibility("visible");

        expect(router.push).not.toHaveBeenCalled();
        expect(mockBattleStore.pendingAmbush).toBeNull();
      });

      it("drops an ambush when a battle page is already open", async () => {
        const { router } = await springAway();
        router.currentRoute.value.name = "battle-free";
        setVisibility("visible");

        expect(router.push).not.toHaveBeenCalled();
        expect(mockBattleStore.pendingAmbush).toBeNull();
      });

      it("only takes the alert back when nothing is waiting", () => {
        const router = makeRouter();
        enter("home-town", router);
        setVisibility("visible");

        expect(mockBridge.cancelAlert).toHaveBeenCalledWith(7001);
        expect(router.push).not.toHaveBeenCalled();
      });

      it("logs and carries on when the navigation fails", async () => {
        const failure = new Error("chunk failed to load");
        const { router } = await springAway();
        router.push.mockRejectedValueOnce(failure);
        setVisibility("visible");
        await flush();

        expect(debug.error).toHaveBeenCalledWith(expect.any(String), failure);
        expect(mockBattleStore.pendingAmbush).toBeNull();
      });

      it("never throws into the page when the store gives out", async () => {
        await springAway();
        mockBattleStore.clearPendingAmbush.mockImplementationOnce(() => {
          throw new Error("store is gone");
        });

        expect(() => setVisibility("visible")).not.toThrow();
        await flush();
        expect(debug.error).toHaveBeenCalled();
      });

      it("listens once, however many times the guard runs", async () => {
        const router = makeRouter();
        const tick = enter("home-town", router);
        handleBattleTimerGuard(toRoute("world-map"), asRouter(router));
        handleBattleTimerGuard(toRoute("home-town"), asRouter(router));
        mockBattleStore.counter = 1;
        mockVisibility = "hidden";
        await tick();
        setVisibility("visible");

        expect(mockBridge.cancelAlert).toHaveBeenCalledTimes(1);
        expect(router.push).toHaveBeenCalledTimes(1);
      });
    });

    describe("going away", () => {
      const due = new Date("2026-10-10T20:00:00.000Z");

      /** The hero stands on `routeName` with the encounter timer running and the next encounter due at `due`. */
      const standOn = (routeName = "home-town", currentRoute = routeName) => {
        const router = makeRouter(currentRoute);
        enter(routeName, router);
        mockBattleStore.nextEncounterAt.mockReturnValue(due);
        return router;
      };

      beforeEach(() => {
        mockBridge.battleAlertsChoice.mockReturnValue("on");
      });

      it("books the alert for the moment the encounter is due", () => {
        standOn();
        setVisibility("hidden");

        expect(mockBattleStore.nextEncounterAt).toHaveBeenCalledWith(expect.any(Date), null);
        expect(mockBridge.scheduleAlert).toHaveBeenCalledTimes(1);
        expect(mockBridge.scheduleAlert).toHaveBeenCalledWith({ ...AMBUSH_ALERT, at: due });
      });

      it("hands X's Invisibility to the clock, so the alert waits for it to wear off", () => {
        const until = new Date(Date.now() + 10 * 60_000).toISOString();
        mockUserStore.users["hero-1"] = { questEffects: { noEncountersUntil: until } };
        standOn();
        setVisibility("hidden");

        expect(mockBattleStore.nextEncounterAt).toHaveBeenCalledWith(expect.any(Date), new Date(until));
        expect(mockBridge.scheduleAlert).toHaveBeenCalledWith({ ...AMBUSH_ALERT, at: due });
      });

      it("replaces its own booking when the live tick springs the ambush while still hidden", async () => {
        const router = standOn();
        setVisibility("hidden");
        mockBattleStore.counter = 1;
        const { onEncounter } = mockBattleStore.startBattleTimer.mock.calls[0][0];
        await onEncounter();

        expect(router.push).not.toHaveBeenCalled();
        expect(mockBridge.showAlert.mock.calls[0][0].id).toBe(mockBridge.scheduleAlert.mock.calls[0][0].id);
      });

      it.each(["off", "unasked"])("books nothing when the choice is %s", (choice) => {
        mockBridge.battleAlertsChoice.mockReturnValue(choice);
        standOn();
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing while the encounter timer is not running", () => {
        standOn();
        mockBattleStore.interval = null;
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing while an ambush already waits", () => {
        standOn();
        mockBattleStore.pendingAmbush = { heroId: "hero-1", at: Date.now() };
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing on a battle page", () => {
        standOn("home-town", "battle-free"); // the timer restarts while the live route is still the fight
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing when no encounter is coming", () => {
        standOn();
        mockBattleStore.nextEncounterAt.mockReturnValue(null);
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing without a current hero or while a battle is active", () => {
        standOn();
        mockUserStore.currentUser.id = null;
        setVisibility("hidden");
        mockUserStore.currentUser.id = "hero-1";
        mockBattleStore.active = true;
        setVisibility("hidden");

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("books nothing while a modal is open", () => {
        standOn();
        const modal = document.createElement("ion-modal");
        modal.className = "show-modal";
        document.body.appendChild(modal);
        setVisibility("hidden");
        modal.remove();

        expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
      });

      it("never throws into the page when booking fails", () => {
        standOn();
        mockBridge.scheduleAlert.mockImplementationOnce(() => {
          throw new Error("no alarm clock");
        });

        expect(() => setVisibility("hidden")).not.toThrow();
        expect(debug.error).toHaveBeenCalled();
      });
    });
  });
});

// --- Family Sync: the encounter clock runs for the hero signed in here unless another device holds them ---

describe("battle guard with Family Sync", () => {
  beforeEach(() => {
    mockBattleStore = makeBattleStore();
    mockSyncOn = true;
  });

  /** What the sync did with the hero's turn: each event goes through the real reducer, one after the other. */
  const turnSees = (heroId: string, ...events: TurnEvent["type"][]) => {
    for (const type of events) {
      mockTurns[heroId] = turnReducer(mockTurns[heroId] ?? initialTurn(), { type } as TurnEvent);
    }
  };
  const BUSY: TurnEvent = { type: "busy", device: { label: "Dad's tablet", lastSeenAt: null } };
  const turnIsBusy = (heroId: string) => {
    turnSees(heroId, "signIn");
    mockTurns[heroId] = turnReducer(mockTurns[heroId], BUSY);
  };
  /** The hero signed in and the site granted the turn */
  const holdTurn = (heroId = "hero-1") => turnSees(heroId, "signIn", "granted");
  /** The app goes to the background: the sync rests the hero, then the page hides */
  const hideApp = () => {
    turnSees("hero-1", "signOut");
    setVisibility("hidden");
  };
  /** The app comes back: the sync asks for the turn again (and the site grants it), then the page shows */
  const showApp = (answer: "granted" | "busy" | "refused" = "granted") => {
    turnSees("hero-1", "signIn");
    if (answer === "busy") mockTurns["hero-1"] = turnReducer(mockTurns["hero-1"], BUSY);
    else turnSees("hero-1", "granted");
    if (answer === "refused") turnSees("hero-1", "refused");
    setVisibility("visible");
  };

  /** The hero stands on the home town with the encounter one step away. */
  const standNearEncounter = () => {
    const router = makeRouter();
    const tick = enter("home-town", router);
    mockBattleStore.counter = 1;
    return { router, tick };
  };

  it("with sync off, the encounter fires for the current hero whatever the turns say", async () => {
    mockSyncOn = false;
    turnIsBusy("hero-1");
    const { router, tick } = standNearEncounter();
    await tick();

    expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
  });

  it("fires for a hero whose turn this device holds", async () => {
    holdTurn();
    const { router, tick } = standNearEncounter();
    await tick();

    expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
  });

  it.each([
    ["being asked for, as the app comes to the front", ["signIn"]],
    ["resting, as the app goes to the background", ["signIn", "granted", "signOut"]],
    ["unknown, on a cold start", []],
  ] as Array<[string, TurnEvent["type"][]]>)("still fires for the signed-in hero while the turn is %s", async (_label, events) => {
    turnSees("hero-1", ...events);
    const { router, tick } = standNearEncounter();
    await tick();

    expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
  });

  describe("an ambush never fires for a hero another device holds while sync is on", () => {
    it.each([
      ["busy", () => turnIsBusy("hero-1")],
      ["taken over", () => turnSees("hero-1", "signIn", "granted", "refused")],
    ] as Array<[string, () => void]>)("when the device knows it (%s)", async (_label, knowTheTurnIsElsewhere) => {
      knowTheTurnIsElsewhere();
      const { router, tick } = standNearEncounter();

      await tickTimes(tick, 5);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      expect(mockBattleStore.setPendingAmbush).not.toHaveBeenCalled();
      // The tick rests the walk, so the encounter that was coming is still coming when the hero plays here again
      expect(mockBattleStore.restWalk).toHaveBeenCalledTimes(5);
      expect(mockBattleStore.counter).toBe(1);
    });

    it("and fires again once the player says 'Play here anyway'", async () => {
      turnIsBusy("hero-1");
      const { router, tick } = standNearEncounter();
      await tickTimes(tick, 2);
      expect(router.push).not.toHaveBeenCalled();

      turnSees("hero-1", "force", "granted");
      await tick();
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
    });

    it("reads no quest board for a hero the device knows is played elsewhere", async () => {
      turnIsBusy("hero-1");
      const { tick } = standNearEncounter();
      await tickTimes(tick, 3);

      expect(mockBoard).not.toHaveBeenCalled();
    });

    it("waits for no ambush and rings no alert, even when the page is hidden", async () => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      turnIsBusy("hero-1");
      const { router, tick } = standNearEncounter();
      mockVisibility = "hidden";
      await tick();

      expect(mockBattleStore.setPendingAmbush).not.toHaveBeenCalled();
      expect(mockBridge.showAlert).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("an ambush that waited while the app was in the background", () => {
    /** The hero holds the turn; the app hides (the hero rests) and the encounter springs while it is hidden. */
    const springAway = async () => {
      holdTurn();
      const { router, tick } = standNearEncounter();
      hideApp();
      await tick();
      expect(mockBattleStore.pendingAmbush).not.toBeNull();
      return { router, tick };
    };

    it("springs when the app comes back, though the hero rested on hiding and is being asked for again", async () => {
      const { router } = await springAway();
      expect(mockTurns["hero-1"].state).toBe("resting");
      showApp();

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
      expect(mockBattleStore.pendingAmbush).toBeNull();
    });

    it("springs while the turn is still being asked for", async () => {
      const { router } = await springAway();
      turnSees("hero-1", "signIn");
      expect(mockTurns["hero-1"].state).toBe("asking");
      setVisibility("visible");

      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
    });

    it("is dropped when the site says another device holds the hero", async () => {
      const { router } = await springAway();
      showApp("busy");

      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.pendingAmbush).toBeNull();
    });

    it("is dropped when another device took the turn", async () => {
      const { router } = await springAway();
      showApp("refused");

      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.pendingAmbush).toBeNull();
    });
  });

  describe("the alert booked when the hero goes away", () => {
    const due = new Date("2026-10-10T20:00:00.000Z");

    beforeEach(() => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      enter("home-town", makeRouter());
      mockBattleStore.nextEncounterAt.mockReturnValue(due);
    });

    it("is booked as the app hides, after the sync has rested the hero", () => {
      holdTurn();
      hideApp();

      expect(mockTurns["hero-1"].state).toBe("resting");
      expect(mockBridge.scheduleAlert).toHaveBeenCalledWith({ ...AMBUSH_ALERT, at: due });
    });

    it("is booked as the app hides, before the sync has rested the hero", () => {
      holdTurn();
      setVisibility("hidden");

      expect(mockTurns["hero-1"].state).toBe("held");
      expect(mockBridge.scheduleAlert).toHaveBeenCalledWith({ ...AMBUSH_ALERT, at: due });
    });

    it.each([
      ["busy", () => turnIsBusy("hero-1")],
      ["taken over", () => turnSees("hero-1", "signIn", "granted", "refused")],
    ] as Array<[string, () => void]>)("is not booked once the device knows another device holds the hero (%s)", (_label, knowTheTurnIsElsewhere) => {
      knowTheTurnIsElsewhere();
      setVisibility("hidden");

      expect(mockBridge.scheduleAlert).not.toHaveBeenCalled();
    });
  });
});

// --- the one-time ask and the packaged app (a fresh copy of the guard per test) ------------------------
// "Asked this session" and the installed listeners are module state, so these load their own copy of the
// guard, and take its page listeners off the shared document afterwards.

describe("battle guard, one fresh copy per test", () => {
  type Guard = typeof import("@/router/_Guards/battle.guard");
  let addListener: jest.SpyInstance;
  let dialog: { present: jest.Mock };

  beforeEach(() => {
    mockBattleStore = makeBattleStore();
    dialog = { present: jest.fn().mockResolvedValue(undefined) };
    mockAlertController.create.mockResolvedValue(dialog);
    addListener = jest.spyOn(document, "addEventListener");
  });

  afterEach(() => {
    addListener.mock.calls
      .filter(([type]) => type === "visibilitychange")
      .forEach(([type, listener]) => document.removeEventListener(type, listener as EventListener));
    addListener.mockRestore();
  });

  /** A new copy of the guard with its own debug fake, entered on `routeName`. */
  const enterFresh = async (routeName = "home-town") => {
    let guard!: Guard;
    let freshDebug!: typeof debug;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-var-requires */
      guard = require("@/router/_Guards/battle.guard");
      freshDebug = require("@/lib/utils/debug").default;
      /* eslint-enable @typescript-eslint/no-var-requires */
    });
    const router = makeRouter(routeName);
    guard.handleBattleTimerGuard(toRoute(routeName), asRouter(router));
    await flush();
    return { guard, router, freshDebug };
  };

  describe("the one-time ask", () => {
    beforeEach(() => {
      mockBridge.battleAlertsChoice.mockReturnValue("unasked");
      mockBridge.alertPermission.mockResolvedValue("prompt");
    });

    /** The buttons of the dialog that was shown. */
    const shownButtons = () => mockAlertController.create.mock.calls[0][0].buttons;

    it("asks in the game's words when the device has not been asked", async () => {
      await enterFresh();

      expect(mockAlertController.create).toHaveBeenCalledTimes(1);
      const options = mockAlertController.create.mock.calls[0][0];
      expect(options.header).toBe("Ambush alerts");
      expect(options.message).toBe("Want a heads-up when a beast ambushes you while you're away?");
      expect(options.buttons).toEqual([
        expect.objectContaining({ text: "No thanks", role: "cancel" }),
        expect.objectContaining({ text: "Sure!" }),
      ]);
      expect(dialog.present).toHaveBeenCalledTimes(1);
      expect(mockBridge.setBattleAlertsChoice).not.toHaveBeenCalled();
    });

    it("turns alerts off for good on 'No thanks'", async () => {
      await enterFresh();
      shownButtons()[0].handler();

      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("off");
      expect(mockBridge.requestAlertPermission).not.toHaveBeenCalled();
    });

    it("asks the device inside the tap on 'Sure!', and turns alerts on when it says yes", async () => {
      mockBridge.requestAlertPermission.mockResolvedValue("granted");
      await enterFresh();
      shownButtons()[1].handler();

      // Nothing was awaited before the request: a browser only opens its prompt inside the tap
      expect(mockBridge.requestAlertPermission).toHaveBeenCalledTimes(1);
      await flush();
      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("on");
    });

    it.each(["denied", "prompt", "unsupported"])("turns alerts off on 'Sure!' when the device says %s", async (answer) => {
      mockBridge.requestAlertPermission.mockResolvedValue(answer);
      await enterFresh();
      shownButtons()[1].handler();
      await flush();

      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("off");
    });

    it("turns alerts off on 'Sure!' when the request itself fails", async () => {
      mockBridge.requestAlertPermission.mockRejectedValue(new Error("no prompt"));
      await enterFresh();
      shownButtons()[1].handler();
      await flush();

      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("off");
    });

    it("settles it silently when the device already allowed alerts", async () => {
      mockBridge.alertPermission.mockResolvedValue("granted");
      await enterFresh();

      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("on");
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it("settles it silently when the device blocked alerts", async () => {
      mockBridge.alertPermission.mockResolvedValue("denied");
      await enterFresh();

      expect(mockBridge.setBattleAlertsChoice).toHaveBeenCalledWith("off");
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it("leaves a device that cannot ring alerts alone", async () => {
      mockBridge.alertPermission.mockResolvedValue("unsupported");
      await enterFresh();

      expect(mockBridge.setBattleAlertsChoice).not.toHaveBeenCalled();
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it.each(["on", "off"])("does not ask when the hero already chose %s", async (choice) => {
      mockBridge.battleAlertsChoice.mockReturnValue(choice);
      await enterFresh();

      expect(mockBridge.alertPermission).not.toHaveBeenCalled();
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it("does not ask on a page the beasts do not roam", async () => {
      await enterFresh("my-tasks");

      expect(mockBridge.alertPermission).not.toHaveBeenCalled();
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it("asks once per session, however many exploration pages the hero walks into", async () => {
      const { guard, router } = await enterFresh("home-town");
      guard.handleBattleTimerGuard(toRoute("world-map"), asRouter(router));
      guard.handleBattleTimerGuard(toRoute("world-plains"), asRouter(router));
      await flush();

      expect(mockBridge.alertPermission).toHaveBeenCalledTimes(1);
      expect(mockAlertController.create).toHaveBeenCalledTimes(1);
    });

    it("does not hold the navigation up, and logs when the ask fails", async () => {
      mockBridge.alertPermission.mockRejectedValue(new Error("no bridge"));
      const { freshDebug } = await enterFresh();

      expect(mockBattleStore.startBattleTimer).toHaveBeenCalledTimes(1);
      expect(freshDebug.warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
    });

    it("starts the timer before the answer comes back", () => {
      mockBridge.alertPermission.mockReturnValue(new Promise(() => undefined)); // the device never answers
      let guard!: Guard;
      jest.isolateModules(() => {
        guard = require("@/router/_Guards/battle.guard"); // eslint-disable-line @typescript-eslint/no-var-requires
      });

      expect(guard.handleBattleTimerGuard(toRoute("home-town"), asRouter(makeRouter()))).toBeUndefined();
      expect(mockBattleStore.startBattleTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe("in the packaged app", () => {
    beforeEach(() => {
      mockBridge.isNativeApp.mockReturnValue(true);
      mockCapacitorApp.addListener.mockResolvedValue({ remove: jest.fn() });
    });

    /** The appStateChange callback the guard registered with the app plugin. */
    const appStateCallback = (): ((state: { isActive: boolean }) => void) => {
      const [event, callback] = mockCapacitorApp.addListener.mock.calls[0];
      expect(event).toBe("appStateChange");
      return callback;
    };

    it("listens for the app going to the background and coming back, once", async () => {
      const { guard, router } = await enterFresh();
      guard.handleBattleTimerGuard(toRoute("world-map"), asRouter(router));
      guard.handleBattleTimerGuard(toRoute("home-town"), asRouter(router));
      await flush();

      expect(mockCapacitorApp.addListener).toHaveBeenCalledTimes(1);
      expect(mockCapacitorApp.addListener).toHaveBeenCalledWith("appStateChange", expect.any(Function));
    });

    it("books the alert when the app goes to the background", async () => {
      mockBridge.battleAlertsChoice.mockReturnValue("on");
      const due = new Date("2026-10-10T20:00:00.000Z");
      await enterFresh();
      mockBattleStore.nextEncounterAt.mockReturnValue(due);

      appStateCallback()({ isActive: false });

      expect(mockBridge.scheduleAlert).toHaveBeenCalledWith({ ...AMBUSH_ALERT, at: due });
    });

    it("takes the alert back and springs the waiting ambush when the app comes to the front", async () => {
      const { router } = await enterFresh("world-swamps");
      mockBattleStore.pendingAmbush = { heroId: "hero-1", region: "swamps", at: Date.now() };

      appStateCallback()({ isActive: true });
      await flush();

      expect(mockBridge.cancelAlert).toHaveBeenCalledWith(7001);
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1", [], "swamps"));
      expect(mockBattleStore.pendingAmbush).toBeNull();
    });

    it("shares its handlers with the page: both signals together spring the ambush once", async () => {
      const { router } = await enterFresh();
      mockBattleStore.pendingAmbush = { heroId: "hero-1", at: Date.now() };

      appStateCallback()({ isActive: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await flush();

      expect(router.push).toHaveBeenCalledTimes(1);
    });

    it("carries on and logs when the app plugin cannot be loaded", async () => {
      mockCapacitorApp.addListener.mockRejectedValue(new Error("plugin not installed"));
      const { freshDebug } = await enterFresh();

      expect(mockBattleStore.startBattleTimer).toHaveBeenCalledTimes(1);
      expect(freshDebug.warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
    });

    it("leaves the app plugin alone in a browser", async () => {
      mockBridge.isNativeApp.mockReturnValue(false);
      await enterFresh();

      expect(mockCapacitorApp.addListener).not.toHaveBeenCalled();
    });
  });
});

// --- pacing (real battle store, fake timers) -------------------------------------------------------

describe("encounter pacing with the real battle store", () => {
  const { useBattleStore: useRealBattleStore } = jest.requireActual("@/lib/store/stores/battle");
  let random: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    random = jest.spyOn(Math, "random").mockReturnValue(0); // every roll is the shortest wait ...
    mockBattleStore = useRealBattleStore(); // ... including the first one, rolled when the store is created
  });

  afterEach(() => {
    mockBattleStore.stopBattleTimer();
    random.mockRestore();
    jest.useRealTimers();
  });

  it("an encounter lands 2 to 4 minutes apart and the wait is rolled again after every one", async () => {
    const router = makeRouter();
    handleBattleTimerGuard(toRoute("home-town"), asRouter(router));
    random.mockReturnValue(0.999999); // the roll after the first encounter is the longest wait

    jest.advanceTimersByTime(119_000);
    expect(router.push).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000); // 2:00, the shortest wait
    await flush(); // the tick looks at the quest board before it sends the hero
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));

    jest.advanceTimersByTime(239_000);
    expect(router.push).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1_000); // 4:00 later, the longest wait
    await flush();
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it("rolls the wait anywhere inside steps.min..steps.max", () => {
    const { steps } = mockBattleStore;

    for (const [roll, expected] of [
      [0, steps.min],
      [0.5, (steps.min + steps.max) / 2],
      [0.999999, steps.max],
    ]) {
      random.mockReturnValue(roll);
      mockBattleStore.resetBattleTimer();
      expect(steps.counter).toBe(expected);
    }
  });

  it("spends no steps on a battle page or without a hero, then picks up where it left off", async () => {
    const router = makeRouter("battle-free");
    handleBattleTimerGuard(toRoute("home-town"), asRouter(router));
    const stepsLeft = mockBattleStore.steps.counter;

    jest.advanceTimersByTime(10 * 60_000); // ten minutes standing on the battle page
    expect(mockBattleStore.steps.counter).toBe(stepsLeft);

    router.currentRoute.value.name = "home-town";
    mockUserStore.currentUser.id = null;
    jest.advanceTimersByTime(10 * 60_000); // ten minutes in town with nobody at the controls
    expect(mockBattleStore.steps.counter).toBe(stepsLeft);
    expect(router.push).not.toHaveBeenCalled();

    mockUserStore.currentUser.id = "hero-1";
    jest.advanceTimersByTime((stepsLeft - 1) * 1_000);
    expect(router.push).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000); // exactly the steps that were left
    await flush();
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("counts every terrain except plains double, so danger zones come around twice as fast", () => {
    const stepsUntilEncounter = () => {
      for (let step = 1; step <= 1_000; step++) {
        if (mockBattleStore.randomEncounter()) return step;
      }
      throw new Error("no encounter within 1000 steps");
    };

    mockBattleStore.steps.counter = 120;
    expect(stepsUntilEncounter()).toBe(120);

    mockBattleStore.terrain.plains = 0;
    mockBattleStore.terrain.forest = 1;
    mockBattleStore.steps.counter = 120;
    expect(stepsUntilEncounter()).toBe(60);
  });
});
