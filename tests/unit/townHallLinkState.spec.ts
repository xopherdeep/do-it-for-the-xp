import {
  LINK_STATE_KEY,
  LINK_STATE_TTL_MS,
  claimLinkState,
  matchesLinkState,
  newLinkState,
  rememberLinkState,
} from "@/lib/services/townhall/townHallLinkState";

let mockNative = false;
jest.mock("@capacitor/core", () => {
  const actual = jest.requireActual("@capacitor/core");
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => mockNative } };
});

/** The phone apps keep the state in Preferences, which outlives the app being killed while the parent is in the browser. */
const mockPreferences = new Map<string, string>();
jest.mock("@capacitor/preferences", () => ({
  __esModule: true,
  Preferences: {
    get: jest.fn(async ({ key }: { key: string }) => ({ value: mockPreferences.has(key) ? mockPreferences.get(key) : null })),
    set: jest.fn(async ({ key, value }: { key: string; value: string }) => {
      mockPreferences.set(key, value);
    }),
    remove: jest.fn(async ({ key }: { key: string }) => {
      mockPreferences.delete(key);
    }),
  },
}));

const NOW = 1760000000000;

describe("the one-shot state of a Family Registration", () => {
  beforeEach(() => {
    mockNative = false;
    mockPreferences.clear();
    sessionStorage.clear();
  });

  describe("newLinkState and matchesLinkState (pure)", () => {
    it("lasts 30 minutes from the moment the Game Master leaves for the site", () => {
      expect(LINK_STATE_TTL_MS).toBe(30 * 60 * 1000);
      expect(newLinkState("gm-1", NOW, "s-1")).toEqual({ state: "s-1", heroId: "gm-1", expiresAt: NOW + LINK_STATE_TTL_MS });
    });

    it("matches only the same state, before it expires", () => {
      const stored = newLinkState("gm-1", NOW, "s-1");
      expect(matchesLinkState(stored, "s-1", NOW + 1)).toBe(true);
      expect(matchesLinkState(stored, "s-1", NOW + LINK_STATE_TTL_MS - 1)).toBe(true);
      expect(matchesLinkState(stored, "s-1", NOW + LINK_STATE_TTL_MS)).toBe(false);
      expect(matchesLinkState(stored, "s-2", NOW)).toBe(false);
      expect(matchesLinkState(stored, undefined, NOW)).toBe(false);
      expect(matchesLinkState(stored, "", NOW)).toBe(false);
      expect(matchesLinkState(null, "s-1", NOW)).toBe(false);
    });
  });

  describe("on the web (sessionStorage: the same tab comes back)", () => {
    it("remembers a fresh random state for the hero on screen and hands it back", async () => {
      const first = await rememberLinkState("gm-1", NOW);
      expect(first).toMatch(/^[0-9a-f-]{36}$/);
      expect(JSON.parse(sessionStorage.getItem(LINK_STATE_KEY) ?? "null")).toEqual(newLinkState("gm-1", NOW, first));

      const second = await rememberLinkState("gm-1", NOW);
      expect(second).not.toBe(first);
    });

    it("lets the matching state be claimed once", async () => {
      const state = await rememberLinkState("gm-1", NOW);

      expect(await claimLinkState(state, NOW + 1000)).toEqual(newLinkState("gm-1", NOW, state));
      expect(sessionStorage.getItem(LINK_STATE_KEY)).toBeNull();
      expect(await claimLinkState(state, NOW + 2000)).toBeNull();
    });

    it("turns away a missing or wrong state, and keeps the real one for the parent's own return", async () => {
      const state = await rememberLinkState("gm-1", NOW);

      expect(await claimLinkState(undefined, NOW)).toBeNull();
      expect(await claimLinkState("someone-else", NOW)).toBeNull();
      expect(await claimLinkState(state, NOW)).not.toBeNull();
    });

    it("turns away an expired state and forgets it", async () => {
      const state = await rememberLinkState("gm-1", NOW);

      expect(await claimLinkState(state, NOW + LINK_STATE_TTL_MS)).toBeNull();
      expect(sessionStorage.getItem(LINK_STATE_KEY)).toBeNull();
    });

    it("turns everything away when nothing was remembered, or what was is not a state", async () => {
      expect(await claimLinkState("s-1", NOW)).toBeNull();
      sessionStorage.setItem(LINK_STATE_KEY, "not json");
      expect(await claimLinkState("s-1", NOW)).toBeNull();
      sessionStorage.setItem(LINK_STATE_KEY, JSON.stringify({ state: "s-1" }));
      expect(await claimLinkState("s-1", NOW)).toBeNull();
    });
  });

  describe("in the phone apps (Preferences)", () => {
    beforeEach(() => {
      mockNative = true;
    });

    it("remembers the state in Preferences, not in sessionStorage", async () => {
      const state = await rememberLinkState("gm-1", NOW);

      expect(JSON.parse(mockPreferences.get(LINK_STATE_KEY) ?? "null")).toEqual(newLinkState("gm-1", NOW, state));
      expect(sessionStorage.getItem(LINK_STATE_KEY)).toBeNull();
    });

    it("claims it once, after the app was killed and started again (nothing kept in memory)", async () => {
      mockPreferences.set(LINK_STATE_KEY, JSON.stringify(newLinkState("gm-1", NOW, "s-native")));

      expect(await claimLinkState("wrong", NOW + 1000)).toBeNull();
      expect(await claimLinkState("s-native", NOW + 1000)).toEqual(newLinkState("gm-1", NOW, "s-native"));
      expect(mockPreferences.has(LINK_STATE_KEY)).toBe(false);
      expect(await claimLinkState("s-native", NOW + 2000)).toBeNull();
    });
  });
});
