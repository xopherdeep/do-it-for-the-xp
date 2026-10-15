import { nextTick, reactive } from "vue";
import { useTownHallLink, type LinkStore } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallLink";
import type { LinkResult } from "@/lib/store/stores/townHall";
import { NATIVE_RETURN_URL } from "@/lib/services/townhall/townHallLink";

let mockNative = false;
jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockNative, getPlatform: () => (mockNative ? "ios" : "web") },
}));

const mockOpen = jest.fn(async () => undefined);
jest.mock("@capacitor/browser", () => ({ Browser: { open: (...args: unknown[]) => mockOpen(...(args as [])) } }));

let mockPending: string | null = null;
jest.mock("@/lib/services/townhall/pendingReturn", () => ({
  takeLinkReturn: () => {
    const search = mockPending;
    mockPending = null;
    return search;
  },
}));

let mockHash = true;
jest.mock("@/router/historyMode", () => ({ usesHashHistory: () => mockHash }));

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const ROUTE = "/town-hall/hero-1";
const realLocation = window.location;
const assign = jest.fn();

/** A store that links when asked and says what the spec decided. */
const fakeStore = (result: LinkResult = "linked") => {
  const store = reactive({ lastLinkResult: null as LinkResult | null }) as LinkStore;
  Object.assign(store, {
    init: jest.fn(async () => undefined),
    beginLink: jest.fn(async () => "state-1"),
    completeLink: jest.fn(async () => result),
    unlink: jest.fn(async () => "forgotten" as const),
  });
  return store;
};

const setup = (store = fakeStore(), isGameMaster = true) => {
  const announce = jest.fn(async (_result: LinkResult) => undefined);
  const link = useTownHallLink({ store, heroId: () => "hero-1", returnRoute: () => ROUTE, isGameMaster: () => isGameMaster, announce });
  return { store, announce, link };
};

describe("useTownHallLink", () => {
  beforeEach(() => {
    mockNative = false;
    mockHash = true;
    mockPending = null;
    jest.clearAllMocks();
    // jsdom cannot navigate: the page's address is a plain object that records where it was sent
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://app.forthexp.com", pathname: "/", assign },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  });

  describe("completeReturn", () => {
    it("completes a web return and announces it once", async () => {
      mockPending = "?th_state=state-1&site_url=x&user_login=mom&password=pw";
      const { store, announce, link } = setup(fakeStore("linked"));
      await expect(link.completeReturn()).resolves.toBe(true);
      expect(store.init).toHaveBeenCalledTimes(1);
      expect(store.completeLink).toHaveBeenCalledWith("?th_state=state-1&site_url=x&user_login=mom&password=pw");
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith("linked");
    });

    it("announces a failure when the store throws", async () => {
      mockPending = "?success=false";
      const store = fakeStore();
      (store.completeLink as jest.Mock).mockRejectedValueOnce(new Error("boom"));
      const { announce, link } = setup(store);
      await expect(link.completeReturn()).resolves.toBe(true);
      expect(announce).toHaveBeenCalledWith("failed");
    });

    it("announces nothing on an ordinary visit and says so", async () => {
      const { store, announce, link } = setup();
      await expect(link.completeReturn()).resolves.toBe(false);
      expect(store.init).toHaveBeenCalledTimes(1);
      expect(store.completeLink).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    });

    it("stays quiet when the return changed nothing", async () => {
      mockPending = "?nothing=1";
      const { announce, link } = setup(fakeStore("none"));
      await expect(link.completeReturn()).resolves.toBe(true);
      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe("on a phone app", () => {
    it("announces a result that lands in the store", async () => {
      mockNative = true;
      const { store, announce } = setup();
      store.lastLinkResult = "linked";
      await nextTick();
      expect(announce).toHaveBeenCalledWith("linked");
    });

    it("has nothing to follow on the web", async () => {
      const { store, announce } = setup();
      store.lastLinkResult = "linked";
      await nextTick();
      expect(announce).not.toHaveBeenCalled();
    });

    it("opens the system browser and returns through the app's own address", async () => {
      mockNative = true;
      const { link } = setup();
      await link.openAuthorizePage();
      expect(assign).not.toHaveBeenCalled();
      const { url } = (mockOpen.mock.calls[0] as unknown as [{ url: string }])[0];
      expect(new URL(url).searchParams.get("success_url")).toBe(`${NATIVE_RETURN_URL}?th_state=state-1`);
    });
  });

  describe("openAuthorizePage", () => {
    const successUrlSent = () => new URL(assign.mock.calls[0][0] as string).searchParams.get("success_url");

    it("carries the page's return route in hash mode", async () => {
      const { store, link } = setup();
      await link.openAuthorizePage();
      expect(store.beginLink).toHaveBeenCalledWith("hero-1");
      expect(successUrlSent()).toBe(`https://app.forthexp.com/#${ROUTE}?th_state=state-1`);
    });

    it("carries the page's return route in history mode", async () => {
      mockHash = false;
      const { link } = setup();
      await link.openAuthorizePage();
      expect(successUrlSent()).toBe(`https://app.forthexp.com${ROUTE}?th_state=state-1`);
    });

    it("does nothing for a hero who is not a Game Master", async () => {
      const { store, announce, link } = setup(fakeStore(), false);
      await link.openAuthorizePage();
      expect(store.beginLink).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    });

    it("announces a failure when the errand cannot start", async () => {
      const store = fakeStore();
      (store.beginLink as jest.Mock).mockRejectedValueOnce(new Error("no storage"));
      const { announce, link } = setup(store);
      await link.openAuthorizePage();
      expect(assign).not.toHaveBeenCalled();
      expect(announce).toHaveBeenCalledWith("failed");
    });
  });
});
