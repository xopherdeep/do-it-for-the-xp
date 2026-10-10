import { createPinia, setActivePinia } from "pinia";
import type { RouteLocationNormalized, Router } from "vue-router";
import { freeBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import { handleBattleTimerGuard } from "@/router/_Guards/battle.guard";
import debug from "@/lib/utils/debug";

// The guard talks to four things only: the battle store, the user store, the router and debug.
// All four are faked here, and the guard is driven through the same entry point the router uses.
// Each spec sets `mockBattleStore` to a fresh fake (or, in the pacing block, to the real store).
let mockBattleStore: any;
const mockUserStore = { currentUser: { id: "hero-1" as string | null } };

jest.mock("@/lib/store/stores/battle", () => ({ useBattleStore: () => mockBattleStore }));
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: () => mockUserStore }));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

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
const makeBattleStore = () => {
  const store = {
    active: false,
    counter: ARM_STEPS,
    startBattleTimer: jest.fn(),
    stopBattleTimer: jest.fn(),
    setTerrainForRoute: jest.fn(),
    resetBattleTimer: jest.fn(() => {
      store.counter = ARM_STEPS;
    }),
    randomEncounter: jest.fn(() => {
      store.counter -= 1;
      return store.counter <= 0 && !store.active;
    }),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUserStore.currentUser.id = "hero-1";
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

    it("re-arms before it navigates, so a slow navigation cannot fire a second encounter", () => {
      const router = makeRouter();
      router.push.mockReturnValue(new Promise(() => undefined)); // the navigation never lands
      const tick = enter("home-town", router);

      mockBattleStore.counter = 1;
      void tick(); // fires; the push is now in flight
      void tick(); // the next tick arrives before the navigation does

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
      expect(mockBattleStore.counter).toBe(1);

      mockUserStore.currentUser.id = "hero-1"; // a hero picks up the controller
      await tick();
      expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));
    });

    it("never fires while the tab is hidden or a modal is open", async () => {
      const router = makeRouter();
      const tick = enter("home-town", router);
      mockBattleStore.counter = 1;

      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      await tickTimes(tick, 3);
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });

      const modal = document.createElement("ion-modal");
      modal.className = "show-modal";
      document.body.appendChild(modal);
      await tickTimes(tick, 3);
      expect(router.push).not.toHaveBeenCalled();
      expect(mockBattleStore.randomEncounter).not.toHaveBeenCalled();

      modal.remove(); // closed: the encounter that was coming lands
      await tick();
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
      expect(mockBattleStore.counter).toBe(1);

      mockBattleStore.active = false; // the fight is over
      await tick();
      expect(router.push).toHaveBeenCalledTimes(1);
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

  it("an encounter lands 2 to 4 minutes apart and the wait is rolled again after every one", () => {
    const router = makeRouter();
    handleBattleTimerGuard(toRoute("home-town"), asRouter(router));
    random.mockReturnValue(0.999999); // the roll after the first encounter is the longest wait

    jest.advanceTimersByTime(119_000);
    expect(router.push).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000); // 2:00, the shortest wait
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(freeBattleRoute("hero-1"));

    jest.advanceTimersByTime(239_000);
    expect(router.push).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1_000); // 4:00 later, the longest wait
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

  it("spends no steps on a battle page or without a hero, then picks up where it left off", () => {
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
