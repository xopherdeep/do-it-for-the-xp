import { createPinia, setActivePinia } from "pinia";
import { nextEncounterAt, stepsPerSecond, stepsWalked } from "@/lib/services/battle/encounterClock";
import { useBattleStore } from "@/lib/store/stores/battle";

// The encounter clock turns wall-clock time into steps. The pure half is checked on its own; the battle
// store half runs the real store under fake timers, where jest.setSystemTime moves Date.now().

const at = (hours: number, minutes: number) => new Date(2026, 9, 10, hours, minutes, 0);

const plains = { plains: 1, swamp: 0, forest: 0, mountain: 0, island: 0 };

describe("stepsPerSecond", () => {
  it("walks plains at 1 step a second", () => {
    expect(stepsPerSecond(plains)).toBe(1);
  });

  it.each(["swamp", "forest", "mountain", "island"] as const)("walks %s at 2 steps a second", (key) => {
    expect(stepsPerSecond({ ...plains, plains: 0, [key]: 1 })).toBe(2);
  });
});

describe("stepsWalked", () => {
  it("counts a second of walking as perSecond steps", () => {
    expect(stepsWalked(1000, 1)).toBe(1);
    expect(stepsWalked(60_000, 2)).toBe(120);
  });

  it("keeps the fractions", () => {
    expect(stepsWalked(500, 1)).toBe(0.5);
    expect(stepsWalked(250, 2)).toBe(0.5);
  });

  it("walks nothing for negative, NaN or non-finite time", () => {
    expect(stepsWalked(-5, 1)).toBe(0);
    expect(stepsWalked(NaN, 1)).toBe(0);
    expect(stepsWalked(Infinity, 1)).toBe(0);
    expect(stepsWalked(0, 1)).toBe(0);
  });

  it("walks nothing at a speed that is not a speed", () => {
    expect(stepsWalked(1000, 0)).toBe(0);
    expect(stepsWalked(1000, NaN)).toBe(0);
  });
});

describe("nextEncounterAt", () => {
  it("is the steps left divided by the pace, from now", () => {
    expect(nextEncounterAt(120, 1, at(12, 0))).toEqual(at(12, 2));
    expect(nextEncounterAt(120, 2, at(12, 0))).toEqual(at(12, 1));
  });

  it("starts the walk when X's Invisibility wears off", () => {
    expect(nextEncounterAt(120, 1, at(12, 0), at(12, 10))).toEqual(at(12, 12));
  });

  it("ignores an Invisibility that is already over, or none at all", () => {
    expect(nextEncounterAt(120, 1, at(12, 20), at(12, 10))).toEqual(at(12, 22));
    expect(nextEncounterAt(120, 1, at(12, 0), null)).toEqual(at(12, 2));
  });

  it("is due the moment the walk starts when there is nothing left to walk", () => {
    expect(nextEncounterAt(0, 1, at(12, 0))).toEqual(at(12, 0));
    expect(nextEncounterAt(-3, 2, at(12, 0), at(12, 10))).toEqual(at(12, 10));
  });

  it("never arrives for a hero who covers no ground", () => {
    expect(nextEncounterAt(120, 0, at(12, 0))).toBeNull();
    expect(nextEncounterAt(120, -1, at(12, 0))).toBeNull();
    expect(nextEncounterAt(NaN, 1, at(12, 0))).toBeNull();
  });

  it("does not hand back the Date it was given", () => {
    const now = at(12, 0);
    expect(nextEncounterAt(0, 1, now)).not.toBe(now);
  });
});

describe("battle store on the wall clock", () => {
  const COUNTER = 200;
  let start: number;
  let store: ReturnType<typeof useBattleStore>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(at(12, 0));
    start = Date.now();
    setActivePinia(createPinia());
    store = useBattleStore();
    store.steps.counter = COUNTER;
  });

  afterEach(() => {
    store.stopBattleTimer();
    jest.useRealTimers();
  });

  describe("with the timer running", () => {
    beforeEach(() => {
      store.startBattleTimer({ onEncounter: jest.fn() });
    });

    it("starts the walk clock when it creates the interval", () => {
      expect(store.lastWalkAt).toBe(start);
    });

    it("leaves the walk clock alone when the interval already runs", () => {
      jest.setSystemTime(start + 30_000);
      store.startBattleTimer({ onEncounter: jest.fn() });
      expect(store.lastWalkAt).toBe(start);
    });

    it("walks the seconds since the last walk, not one step a tick", () => {
      expect(store.randomEncounter(start + 60_000)).toBe(false);
      expect(store.steps.counter).toBe(COUNTER - 60);
      expect(store.lastWalkAt).toBe(start + 60_000);

      store.randomEncounter(start + 90_000);
      expect(store.steps.counter).toBe(COUNTER - 90);
    });

    it("walks twice as fast off the plains", () => {
      store.setTerrainForRoute("forest");
      store.randomEncounter(start + 60_000);
      expect(store.steps.counter).toBe(COUNTER - 120);
    });

    it("reads Date.now() when it is not told the time", () => {
      jest.setSystemTime(start + 25_000);
      store.randomEncounter();
      expect(store.steps.counter).toBe(COUNTER - 25);
    });

    it("rests a blocked stretch without walking it", () => {
      store.restWalk(start + 30_000);
      expect(store.lastWalkAt).toBe(start + 30_000);
      expect(store.steps.counter).toBe(COUNTER);

      store.randomEncounter(start + 40_000);
      expect(store.steps.counter).toBe(COUNTER - 10);
    });

    it("says an encounter is due after a long time away, and not while a battle is active", () => {
      store.active = true;
      expect(store.randomEncounter(start + 10 * 60_000)).toBe(false);
      expect(store.steps.counter).toBeLessThanOrEqual(0);

      store.active = false;
      expect(store.randomEncounter(start + 10 * 60_000)).toBe(true);
    });

    it("walks nothing if the clock goes backwards", () => {
      store.randomEncounter(start - 5_000);
      expect(store.steps.counter).toBe(COUNTER);
      expect(store.lastWalkAt).toBe(start - 5_000);
    });

    it("clears the walk clock when the timer stops", () => {
      store.stopBattleTimer();
      expect(store.lastWalkAt).toBeNull();
      expect(store.interval).toBeNull();
    });

    it("starts a fresh walk clock when the timer starts again", () => {
      store.stopBattleTimer();
      jest.setSystemTime(start + 5 * 60_000);
      store.startBattleTimer({ onEncounter: jest.fn() });
      expect(store.lastWalkAt).toBe(start + 5 * 60_000);
    });
  });

  describe("without the timer (specs, console)", () => {
    it("walks exactly one tick a call: 1 step on plains, 2 in a forest", () => {
      expect(store.lastWalkAt).toBeNull();

      store.randomEncounter();
      expect(store.steps.counter).toBe(COUNTER - 1);

      store.setTerrainForRoute("forest");
      store.randomEncounter();
      expect(store.steps.counter).toBe(COUNTER - 3);
    });

    it("walks one tick however much time the call is told has passed", () => {
      store.randomEncounter(start + 60_000);
      expect(store.steps.counter).toBe(COUNTER - 1);
      expect(store.lastWalkAt).toBeNull();
    });

    it("has no walk clock to rest", () => {
      store.restWalk(start + 30_000);
      expect(store.lastWalkAt).toBeNull();
    });
  });

  describe("nextEncounterAt", () => {
    it("is when the counter runs out at the terrain's pace", () => {
      store.steps.counter = 120;
      expect(store.nextEncounterAt(at(12, 0))).toEqual(at(12, 2));

      store.setTerrainForRoute("swamp");
      expect(store.nextEncounterAt(at(12, 0))).toEqual(at(12, 1));
    });

    it("waits for X's Invisibility to wear off", () => {
      store.steps.counter = 120;
      expect(store.nextEncounterAt(at(12, 0), at(12, 10))).toEqual(at(12, 12));
    });

    it("is due at once when the counter has run out", () => {
      store.steps.counter = 0;
      expect(store.nextEncounterAt(at(12, 0))).toEqual(at(12, 0));
    });
  });
});
