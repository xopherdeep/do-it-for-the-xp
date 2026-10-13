import { createPinia, setActivePinia } from "pinia";
import { useBattleStore } from "@/lib/store/stores/battle";
import debug from "@/lib/utils/debug";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const KEY = "xp.questAmbushes";
const NOW = new Date(2026, 9, 12, 12, 0, 0, 0).getTime();
const MIN = 60_000;

/** A battle store the way a fresh app start builds it: it reads whatever the device kept. */
const freshStore = () => {
  setActivePinia(createPinia());
  return useBattleStore();
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("the battle store's quest ambush record", () => {
  it("starts empty", () => {
    expect(freshStore().questAmbushesOf("hero-1")).toEqual({});
  });

  it("hands the ambush rule each quest as { lastAmbushAt }", () => {
    const store = freshStore();
    store.recordQuestAmbush("hero-1", "q1", NOW);

    expect(store.questAmbushesOf("hero-1")).toEqual({ q1: { lastAmbushAt: NOW } });
  });

  it("keeps each hero's quests apart", () => {
    const store = freshStore();
    store.recordQuestAmbush("hero-1", "q1", NOW);
    store.recordQuestAmbush("hero-2", "q2", NOW + MIN);

    expect(store.questAmbushesOf("hero-1")).toEqual({ q1: { lastAmbushAt: NOW } });
    expect(store.questAmbushesOf("hero-2")).toEqual({ q2: { lastAmbushAt: NOW + MIN } });
  });

  it("forgets the quests whose hour is over when it notes a new one", () => {
    const store = freshStore();
    store.recordQuestAmbush("hero-1", "old", NOW - 90 * MIN);
    store.recordQuestAmbush("hero-1", "recent", NOW - 10 * MIN);
    store.recordQuestAmbush("hero-1", "q1", NOW);

    expect(Object.keys(store.questAmbushesOf("hero-1")).sort()).toEqual(["q1", "recent"]);
  });

  it("stamps the moment of the call when no time is given", () => {
    const store = freshStore();
    const before = Date.now();
    store.recordQuestAmbush("hero-1", "q1");

    const { lastAmbushAt } = store.questAmbushesOf("hero-1").q1;
    expect(lastAmbushAt).toBeGreaterThanOrEqual(before);
    expect(lastAmbushAt).toBeLessThanOrEqual(Date.now());
  });

  describe("on this device", () => {
    it("is kept across an app restart", () => {
      freshStore().recordQuestAmbush("hero-1", "q1", NOW);

      expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ "hero-1": { q1: NOW } });
      expect(freshStore().questAmbushesOf("hero-1")).toEqual({ q1: { lastAmbushAt: NOW } });
    });

    it("starts over, and says so, when what it kept cannot be read", () => {
      localStorage.setItem(KEY, "{not json");

      expect(freshStore().questAmbushesOf("hero-1")).toEqual({});
      expect(debug.warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
    });

    it("starts over when what it kept is not a record of stamps", () => {
      localStorage.setItem(KEY, JSON.stringify(["q1"]));
      expect(freshStore().questAmbushesOf("hero-1")).toEqual({});

      localStorage.setItem(KEY, JSON.stringify({ "hero-1": { good: NOW, bad: "yesterday", worse: null }, "hero-2": 7 }));
      expect(freshStore().questAmbushesOf("hero-1")).toEqual({ good: { lastAmbushAt: NOW } });
      expect(freshStore().questAmbushesOf("hero-2")).toEqual({});
    });

    it("keeps the record in memory, and says so, when the device will not store it", () => {
      const store = freshStore();
      const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("storage is full");
      });

      expect(() => store.recordQuestAmbush("hero-1", "q1", NOW)).not.toThrow();
      expect(store.questAmbushesOf("hero-1")).toEqual({ q1: { lastAmbushAt: NOW } });
      expect(debug.warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
      setItem.mockRestore();
    });
  });
});
