import { createPinia, getActivePinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import { emitHeroRemoved } from "@/lib/services/multiplayer/gameSignals";
import * as server from "@/lib/services/multiplayer/familyServer";
import type { FamilyEventsState } from "@/lib/databases/FamilyEventsDb";

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
  };
});

jest.mock("@/lib/services/pro/familyIdentity", () => ({ __esModule: true, ensureIdentity: jest.fn() }));

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

const emptyState = (): FamilyEventsState => ({ outbox: [], lastSeq: 0, paidRewards: [], lastCards: {}, ageGroupPicks: {}, home: "unknown" });
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

describe("family store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.resetAllMocks();
    mockEnabled = true;
    mockState = emptyState();
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
    fillUsers(mia(), mom(), noNickname());
  });

  afterEach(() => {
    // A store left running would keep listening to the shared signals and to the mocked Town Hall
    const pinia = getActivePinia() as unknown as { _s: Map<string, { $dispose: () => void }> };
    pinia._s.forEach((store) => store.$dispose());
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
      expect(mockState.lastCards).toEqual({ "h-2": "{}" });
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
});
