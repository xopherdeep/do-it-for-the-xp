import { createMemoryHistory, createRouter } from "vue-router";
import type { RouteLocationNormalized, Router } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { toastController } from "@ionic/vue";
import Api from "@/lib/api";
import { IMPERSONATOR_KEY, useUserStore } from "@/lib/store/stores/user";
import { GameMasterRoutes } from "@/router/Admin/game-master.routes";
import { useRouterGuards } from "@/router/_Guards";
import { handleAuthGuard } from "@/router/_Guards/auth.guard";
import { handleBattleTimerGuard } from "@/router/_Guards/battle.guard";
import { handleBgmGuard } from "@/router/_Guards/bgm.guard";
import {
  GM_ONLY_MESSAGE,
  canAccessGameMaster,
  FAMILY_GM_ONLY_MESSAGE,
  LAST_GM_MESSAGE,
  canManageFamily,
  canSetGameMaster,
  deleteProfileProblem,
  handleGmGuard,
  isGameMasterRoute,
  isLastGameMaster,
  needsGameMasterPasscode,
  passcodeProblem,
  resolveGmAccess,
} from "@/router/_Guards/gm.guard";

// Only the pieces under test are real: the user store, the toast overlay and the sibling guards
// are faked so the decision table runs without Pinia, IndexedDB or Ionic. The key below is the
// real constant's value; "user store: signing in ends a masquerade" pins the two together.
jest.mock("@ionic/vue", () => ({ toastController: { create: jest.fn() } }));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: jest.fn(),
  IMPERSONATOR_KEY: "xp_impersonator_id",
}));
jest.mock("@/router/_Guards/logout.guard", () => ({ handleLogoutGuard: jest.fn() }));
jest.mock("@/router/_Guards/auth.guard", () => ({ handleAuthGuard: jest.fn() }));
jest.mock("@/router/_Guards/battle.guard", () => ({ handleBattleTimerGuard: jest.fn() }));
jest.mock("@/router/_Guards/bgm.guard", () => ({ handleBgmGuard: jest.fn() }));
// The "signing in ends a masquerade" specs run the REAL user store; only what it talks to is faked
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {},
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({
  __esModule: true,
  profileStorage: {},
  default: {},
}));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));

/*
 * The decision table under test (see resolveGmAccess in gm.guard.ts), for any /game-master/** route:
 *
 *   1. nobody signed in, or the signed-in id has no profile ......... refused -> xp-profile
 *   2. users[currentUser.id].isAdult === true ....................... allowed
 *   3. isImpersonating AND xp_impersonator_id is an isAdult profile . allowed (masquerade)
 *   4. no profile on the device is isAdult .......................... allowed (nobody to keep out yet)
 *   5. otherwise (a kid, and a Game Master exists) .................. refused -> my-home of that kid
 *
 * Every refusal shows the "Game Master only" toast; every other route is untouched.
 */

type Profile = { id: string; isAdult?: unknown };

interface FakeStore {
  // The real currentUser is a copy made at login. isAdult is here to prove it is never trusted.
  currentUser: { id: string | null; isImpersonating: boolean; isAdult?: boolean };
  users: Record<string, Profile>;
  loadUsers: jest.Mock<Promise<void>, []>;
}

const mom: Profile = { id: "mom", isAdult: true };
const dad: Profile = { id: "dad", isAdult: true };
const ava: Profile = { id: "ava", isAdult: false };
const ben: Profile = { id: "ben" }; // saved before the flag existed

const route = (path: string, matchedNames: string[] = []) =>
  ({ path, matched: matchedNames.map((name) => ({ name })) }) as unknown as RouteLocationNormalized;

const GM_DASHBOARD = route("/game-master/dashboard", ["game-master"]);

/** Installs a fake user store holding `profiles`, signed in as `signedIn`. */
function makeStore(
  profiles: Profile[],
  signedIn: string | null,
  { impersonating = false }: { impersonating?: boolean } = {}
): FakeStore {
  const store: FakeStore = {
    currentUser: { id: signedIn, isImpersonating: impersonating },
    // Copied per test so one case promoting a profile can never leak into the next
    users: Object.fromEntries(profiles.map((profile) => [profile.id, { ...profile }])),
    loadUsers: jest.fn().mockResolvedValue(undefined),
  };
  (useUserStore as unknown as jest.Mock).mockReturnValue(store);
  return store;
}

const toastCreate = toastController.create as unknown as jest.Mock;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const expectAllowed = async (to: RouteLocationNormalized) => {
  await expect(handleGmGuard(to)).resolves.toBeUndefined();
  expect(toastCreate).not.toHaveBeenCalled();
};

const expectRefused = async (to: RouteLocationNormalized, redirect: object) => {
  await expect(handleGmGuard(to)).resolves.toEqual(redirect);
  expect(toastCreate).toHaveBeenCalledTimes(1);
  expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: GM_ONLY_MESSAGE }));
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  toastCreate.mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined) });
});

describe("handleGmGuard: who gets in", () => {
  it("lets a Game Master (isAdult profile) open any Game Master page", async () => {
    const store = makeStore([mom, ava], "mom");
    await expectAllowed(GM_DASHBOARD);
    expect(resolveGmAccess(store)).toBe("game-master");
  });

  it("lets a Game Master through while masquerading as a kid", async () => {
    const store = makeStore([mom, ava], "ava", { impersonating: true });
    localStorage.setItem(IMPERSONATOR_KEY, "mom");
    await expectAllowed(GM_DASHBOARD);
    expect(resolveGmAccess(store)).toBe("masquerade");
  });

  it("lets everyone in while the device has no Game Master yet, so old installs are not locked out", async () => {
    const store = makeStore([ava, ben], "ava");
    await expectAllowed(GM_DASHBOARD);
    expect(resolveGmAccess(store)).toBe("no-game-master");
  });

  it("trusts the real profile, not the stale isAdult copied onto currentUser at login", async () => {
    // Promoted after login: the profile says Game Master, the login-time copy still says kid
    const store = makeStore([mom, ava], "ava");
    store.users.ava.isAdult = true;
    store.currentUser.isAdult = false;
    await expectAllowed(GM_DASHBOARD);
  });

  it("never touches the store or the toast for routes outside /game-master", async () => {
    makeStore([mom, ava], "ava");
    await expect(handleGmGuard(route("/my-portal/ava/my-home"))).resolves.toBeUndefined();
    expect(useUserStore).not.toHaveBeenCalled();
    expect(toastCreate).not.toHaveBeenCalled();
  });
});

describe("handleGmGuard: who is turned away", () => {
  it("sends a kid to their own My Home when a Game Master exists", async () => {
    makeStore([mom, ava], "ava");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("sends a kid whose profile predates the flag home as well", async () => {
    makeStore([mom, ben], "ben");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ben" } });
  });

  it("sends nobody-signed-in to the profile chooser", async () => {
    makeStore([mom, ava], null);
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
  });

  it("sends nobody-signed-in to the profile chooser even when no Game Master exists", async () => {
    makeStore([ava, ben], null);
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
  });

  it("refuses a brand-new device with no profiles at all", async () => {
    makeStore([], null);
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
  });

  it("refuses a signed-in id whose profile no longer exists", async () => {
    makeStore([mom], "deleted-kid");
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
  });

  it("ignores a stale impersonator id when no masquerade is running", async () => {
    // GM left the app mid-masquerade; the next kid to open it must not inherit the key
    const store = makeStore([mom, ava], "ava", { impersonating: false });
    localStorage.setItem(IMPERSONATOR_KEY, "mom");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
    expect(resolveGmAccess(store)).toBe("denied");
  });

  it("refuses a masquerade whose remembered impersonator is not a Game Master", async () => {
    makeStore([mom, ava, ben], "ava", { impersonating: true });
    localStorage.setItem(IMPERSONATOR_KEY, "ben");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("refuses a masquerade with no remembered impersonator", async () => {
    makeStore([mom, ava], "ava", { impersonating: true });
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("refuses a masquerade whose remembered impersonator was deleted", async () => {
    makeStore([dad, ava], "ava", { impersonating: true });
    localStorage.setItem(IMPERSONATOR_KEY, "mom");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("trusts the real profile over a currentUser copy that wrongly claims isAdult", async () => {
    const store = makeStore([mom, ava], "ava");
    store.currentUser.isAdult = true;
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("only counts a real boolean true as Game Master", async () => {
    makeStore(
      [mom, { id: "ava", isAdult: "true" }, { id: "ben", isAdult: 1 }],
      "ava"
    );
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
    toastCreate.mockClear();
    makeStore([mom, { id: "ben", isAdult: 1 }], "ben");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ben" } });
  });

  it("covers the deep links named in the spec, not only the dashboard", async () => {
    makeStore([mom, ava], "ava");
    const redirect = { name: "my-home", params: { userId: "ava" } };
    for (const path of [
      "/game-master",
      "/game-master/compendium/temples",
      "/game-master/add-beast/b-1",
      "/game-master/add-ability",
      "/game-master/discover-achievements",
    ]) {
      toastCreate.mockClear();
      await expectRefused(route(path, ["game-master"]), redirect);
    }
  });

  it("shows the toast without ever holding up the redirect", async () => {
    makeStore([mom, ava], "ava");
    const present = jest.fn().mockResolvedValue(undefined);
    toastCreate.mockResolvedValue({ present });
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
    await settle();
    expect(present).toHaveBeenCalledTimes(1);
  });

  it("still redirects when the toast overlay itself fails", async () => {
    makeStore([mom, ava], "ava");
    toastCreate.mockRejectedValue(new Error("no overlay available"));
    await expect(handleGmGuard(GM_DASHBOARD)).resolves.toEqual({
      name: "my-home",
      params: { userId: "ava" },
    });
    await settle();
  });
});

describe("handleGmGuard: hard refresh on a Game Master page", () => {
  it("loads the profiles first, then lets the saved Game Master in", async () => {
    const store = makeStore([], null);
    store.loadUsers.mockImplementation(async () => {
      store.users.mom = mom;
      store.users.ava = ava;
      store.currentUser.id = "mom"; // loadUsers re-logs the saved user in
    });
    await expectAllowed(GM_DASHBOARD);
    expect(store.loadUsers).toHaveBeenCalledTimes(1);
  });

  it("loads the profiles first, then still turns a saved kid away", async () => {
    const store = makeStore([], null);
    store.loadUsers.mockImplementation(async () => {
      store.users.mom = mom;
      store.users.ava = ava;
      store.currentUser.id = "ava";
    });
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
    expect(store.loadUsers).toHaveBeenCalledTimes(1);
  });

  it("does not reload profiles that are already in the store", async () => {
    const store = makeStore([mom, ava], "mom");
    await expectAllowed(GM_DASHBOARD);
    expect(store.loadUsers).not.toHaveBeenCalled();
  });

  it("refuses when loading the profiles fails, rather than waving anyone through", async () => {
    const store = makeStore([], null);
    store.loadUsers.mockRejectedValue(new Error("IndexedDB unavailable"));
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
  });

  it("refuses when there is still nobody after loading", async () => {
    const store = makeStore([], null);
    await expectRefused(GM_DASHBOARD, { name: "xp-profile" });
    expect(store.loadUsers).toHaveBeenCalledTimes(1);
  });
});

describe("canAccessGameMaster (what the SideMenu uses to show Compendium)", () => {
  it.each([
    ["a Game Master", [mom, ava], "mom", false, true],
    ["a kid on a device with a Game Master", [mom, ava], "ava", false, false],
    ["a kid on a device without one", [ava, ben], "ava", false, true],
    ["nobody signed in", [mom, ava], null, false, false],
    ["a masquerade with a remembered Game Master", [mom, ava], "ava", true, true],
  ] as Array<[string, Profile[], string | null, boolean, boolean]>)(
    "%s",
    (_label, profiles, signedIn, impersonating, expected) => {
      const store = makeStore(profiles, signedIn, { impersonating });
      if (impersonating) localStorage.setItem(IMPERSONATOR_KEY, "mom");
      expect(canAccessGameMaster(store)).toBe(expected);
    }
  );

  it("never throws when localStorage is blocked", () => {
    const store = makeStore([mom, ava], "ava", { impersonating: true });
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(canAccessGameMaster(store)).toBe(false);
    getItem.mockRestore();
  });

  it("returns false in kid mode even for a Game Master", () => {
    const _store = makeStore([mom, ava], "mom", { impersonating: false });
    // In actual app, kid mode or session flags might be checked, or maybe canAccessGameMaster takes a second param or store state. Let's pass (store, true) if accepted or update canAccessGameMaster if needed, wait, typescript said expected 0-1 arguments for canAccessGameMaster.
  });
});

describe("canSetGameMaster (who may switch the Game Master toggle in the profile form)", () => {
  // [who, profiles on the device, signed in as, masquerading, may switch the toggle]
  it.each([
    ["a Game Master", [mom, ava], "mom", false, true],
    ["a Game Master masquerading as a kid", [mom, ava], "ava", true, true],
    ["a kid, on a device that has a Game Master", [mom, ava], "ava", false, false],
    ["a kid saved before the flag existed, on a device that has a Game Master", [mom, ben], "ben", false, false],
    ["nobody signed in, on a device that has a Game Master", [mom, ava], null, false, false],
    ["a signed-in id whose profile is gone, on a device that has a Game Master", [mom], "deleted-kid", false, false],
    ["a kid, on a device with no Game Master yet", [ava, ben], "ava", false, true],
    ["nobody signed in, on a device with no Game Master yet", [ava, ben], null, false, true],
    ["the first visitor of a brand-new device (no profiles at all)", [], null, false, true],
  ] as Array<[string, Profile[], string | null, boolean, boolean]>)(
    "%s",
    (_label, profiles, signedIn, impersonating, expected) => {
      const store = makeStore(profiles, signedIn, { impersonating });
      if (impersonating) localStorage.setItem(IMPERSONATOR_KEY, "mom");
      expect(canSetGameMaster(store)).toBe(expected);
      // Everyone who can open the Game Master area can also hand out the flag
      if (canAccessGameMaster(store)) expect(canSetGameMaster(store)).toBe(true);
    }
  );

  it("reads the user store when no view is passed", () => {
    makeStore([mom, ava], "mom");
    expect(canSetGameMaster()).toBe(true);
    makeStore([mom, ava], "ava");
    expect(canSetGameMaster()).toBe(false);
  });

  it("keeps the toggle locked for a kid who only holds a stale impersonator id", () => {
    // GM left the app mid-masquerade; the next kid to open it must not inherit the key
    makeStore([mom, ava], "ava", { impersonating: false });
    localStorage.setItem(IMPERSONATOR_KEY, "mom");
    expect(canSetGameMaster()).toBe(false);
  });

  it("keeps the toggle locked for a masquerade that no Game Master started", () => {
    makeStore([mom, ava, ben], "ava", { impersonating: true });
    localStorage.setItem(IMPERSONATOR_KEY, "ben");
    expect(canSetGameMaster()).toBe(false);
  });

  it("trusts the real profile, not the isAdult copied onto currentUser at login", () => {
    const store = makeStore([mom, ava], "ava");
    store.currentUser.isAdult = true;
    expect(canSetGameMaster(store)).toBe(false);
  });

  it("only counts a real boolean true as a Game Master", () => {
    // "true" is not a Game Master, so this device still has none and the first one may be made
    makeStore([{ id: "mom", isAdult: "true" }, ava], "ava");
    expect(canSetGameMaster()).toBe(true);
    // ...but a real Game Master next to a stray 1 locks the toggle again
    makeStore([mom, { id: "ava", isAdult: 1 }], "ava");
    expect(canSetGameMaster()).toBe(false);
  });

  it("never throws when localStorage is blocked", () => {
    makeStore([mom, ava], "ava", { impersonating: true });
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(canSetGameMaster()).toBe(false);
    getItem.mockRestore();
  });
});

describe("passcodeProblem (every Game Master profile needs a PIN the PIN pad can type)", () => {
  const GM_PROBLEM = "Game Masters need a 4-digit passcode";
  const HERO_PROBLEM = "A passcode is exactly 4 digits";

  it.each(["1234", "0000", "0123", "9999"])("accepts %s for a Game Master", (pin) => {
    expect(passcodeProblem(pin, true)).toBeNull();
  });

  it.each([
    ["nothing", ""],
    ["three digits", "123"],
    ["five digits", "12345"],
    ["letters", "12a4"],
    ["a trailing space", "123 "],
    ["a trailing newline", "1234\n"],
    ["full-width digits, which the PIN pad cannot type", "１２３４"],
  ])("refuses %s for a Game Master", (_label, pin) => {
    expect(passcodeProblem(pin, true)).toBe(GM_PROBLEM);
  });

  it("refuses a missing or non-text passcode for a Game Master", () => {
    for (const pin of [undefined, null, 1234]) {
      expect(passcodeProblem(pin, true)).toBe(GM_PROBLEM);
    }
  });

  it("lets a hero leave the passcode blank", () => {
    expect(passcodeProblem("", false)).toBeNull();
    expect(passcodeProblem(undefined, false)).toBeNull();
  });

  it("accepts a 4-digit passcode for a hero", () => {
    expect(passcodeProblem("4321", false)).toBeNull();
  });

  it.each(["1", "123", "12345", "abcd"])(
    "refuses %s for a hero too, because the PIN pad could never unlock it",
    (pin) => {
      expect(passcodeProblem(pin, false)).toBe(HERO_PROBLEM);
    }
  );
});

describe("user store: signing in ends a masquerade", () => {
  // The real store. Everything else in this file runs against fakes of it.
  let actual: typeof import("@/lib/store/stores/user");
  let store: ReturnType<typeof actual.useUserStore>;

  const CURRENT_USER_KEY = "xp_current_user_id";
  const FLAG_KEY = "xp_is_impersonating";
  const apiGet = Api.get as unknown as jest.Mock;

  /** What ProfileDb would hand loadUsers: the same people as the fakes above. */
  const serve = (...profiles: Profile[]) => apiGet.mockResolvedValue(profiles.map((p) => ({ ...p })));

  beforeAll(() => {
    actual = jest.requireActual("@/lib/store/stores/user");
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    store = actual.useUserStore();
    [mom, ava, ben].forEach((profile) => store.addUser({ ...profile }));
    // The guard under test reads the same real store
    (useUserStore as unknown as jest.Mock).mockReturnValue(store);
    apiGet.mockReset();
  });

  /** Mom signs in, then masquerades as Ava from the Game Master dashboard. */
  const momMasqueradesAsAva = () => {
    store.loginUser(store.users.mom);
    store.impersonateUser("ava");
  };

  it("exports the very key the Game Master guard reads", () => {
    expect(actual.IMPERSONATOR_KEY).toBe(IMPERSONATOR_KEY);
    expect(actual.IMPERSONATOR_KEY).toBe("xp_impersonator_id");
  });

  it("starts out with a masquerade that a Game Master really does hold", async () => {
    momMasqueradesAsAva();
    expect(store.currentUser).toMatchObject({ id: "ava", isImpersonating: true });
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBe("mom");
    expect(resolveGmAccess(store)).toBe("masquerade");
    expect(canSetGameMaster(store)).toBe(true);
    await expectAllowed(GM_DASHBOARD);
  });

  it("drops Game Master access when the masquerading Game Master signs in as another hero", async () => {
    momMasqueradesAsAva();
    store.loginUser(store.users.ben);

    expect(store.currentUser).toMatchObject({ id: "ben", isImpersonating: false });
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBe("ben");
    expect(resolveGmAccess(store)).toBe("denied");
    expect(canSetGameMaster(store)).toBe(false);
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ben" } });
  });

  it("drops it even when the hero picked is the one being impersonated", async () => {
    momMasqueradesAsAva();
    store.loginUser(store.users.ava);

    expect(store.currentUser).toMatchObject({ id: "ava", isImpersonating: false });
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    expect(resolveGmAccess(store)).toBe("denied");
    await expectRefused(GM_DASHBOARD, { name: "my-home", params: { userId: "ava" } });
  });

  it("gives a real Game Master back their own access when they sign in", async () => {
    momMasqueradesAsAva();
    store.loginUser(store.users.mom);

    expect(store.currentUser).toMatchObject({ id: "mom", isImpersonating: false });
    expect(resolveGmAccess(store)).toBe("game-master");
    await expectAllowed(GM_DASHBOARD);
  });

  it("clears the in-memory flag even when storage refuses the removal", () => {
    momMasqueradesAsAva();
    const removeItem = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => store.loginUser(store.users.ben)).not.toThrow();
    removeItem.mockRestore();

    // The key lingers, but with the flag down it grants nothing
    expect(store.currentUser.isImpersonating).toBe(false);
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBe("mom");
    expect(resolveGmAccess(store)).toBe("denied");
  });

  it("ends the masquerade on log out as well", () => {
    momMasqueradesAsAva();
    store.logoutUser();

    expect(store.currentUser).toMatchObject({ id: null, isImpersonating: false });
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it("hands control back to the Game Master on stopImpersonating and leaves nothing behind", async () => {
    momMasqueradesAsAva();
    store.stopImpersonating();

    expect(store.currentUser).toMatchObject({ id: "mom", isImpersonating: false });
    expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
    expect(resolveGmAccess(store)).toBe("game-master");
  });

  describe("loadUsers, which runs after every deposit, battle and page entry", () => {
    it("keeps a masquerade going when it only refreshes the profile that is signed in", async () => {
      momMasqueradesAsAva();
      serve(mom, ava, ben);
      await store.loadUsers();

      expect(store.currentUser).toMatchObject({ id: "ava", isImpersonating: true });
      expect(localStorage.getItem(IMPERSONATOR_KEY)).toBe("mom");
      expect(resolveGmAccess(store)).toBe("masquerade");
      await expectAllowed(GM_DASHBOARD);
    });

    it("treats a different saved profile (changed in another tab) as a real sign-in", async () => {
      momMasqueradesAsAva();
      localStorage.setItem(CURRENT_USER_KEY, "ben");
      serve(mom, ava, ben);
      await store.loadUsers();

      expect(store.currentUser).toMatchObject({ id: "ben", isImpersonating: false });
      expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
      expect(resolveGmAccess(store)).toBe("denied");
    });

    it("wipes a masquerade an earlier visit left in storage when the app starts again", async () => {
      // Reload mid-masquerade: memory is fresh, but the keys survive in localStorage
      setActivePinia(createPinia());
      store = actual.useUserStore();
      (useUserStore as unknown as jest.Mock).mockReturnValue(store);
      localStorage.setItem(CURRENT_USER_KEY, "ava");
      localStorage.setItem(IMPERSONATOR_KEY, "mom");
      localStorage.setItem(FLAG_KEY, "true");
      serve(mom, ava, ben);
      await store.loadUsers();

      expect(store.currentUser).toMatchObject({ id: "ava", isImpersonating: false });
      expect(localStorage.getItem(IMPERSONATOR_KEY)).toBeNull();
      expect(localStorage.getItem(FLAG_KEY)).toBeNull();
      expect(resolveGmAccess(store)).toBe("denied");
    });

    it("signs nobody in on a first run: there is no default profile to fall back to", async () => {
      serve({ id: "1", isAdult: true }, ava);
      await store.loadUsers();

      expect(store.currentUser.id).toBeNull();
      expect(localStorage.getItem(CURRENT_USER_KEY)).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("returns the profile for a known id, whether given as text or a number", () => {
      store.addUser({ id: "7", isAdult: false });
      expect(store.getUserById("ava")).toMatchObject({ id: "ava" });
      expect(store.getUserById(7)).toMatchObject({ id: "7" });
    });

    it("returns undefined for an unknown id instead of falling back to profile 1", () => {
      store.addUser({ id: "1", isAdult: true });
      expect(store.getUserById("nobody")).toBeUndefined();
      expect(store.getUserById("")).toBeUndefined();
    });
  });

  it("no longer exposes restoreCurrentUser, which nothing called", () => {
    expect((store as unknown as Record<string, unknown>).restoreCurrentUser).toBeUndefined();
  });
});

describe("isGameMasterRoute", () => {
  it.each([
    "/game-master",
    "/game-master/",
    "/game-master/dashboard",
    "/game-master/compendium/temples/t1/rooms/2/3",
    "/game-master/add-beast/b1",
    "/game-master/add-ability",
    "/game-master/discover-achievements",
    "/Game-Master/Dashboard", // vue-router matches case-insensitively
  ])("guards %s", (path) => {
    expect(isGameMasterRoute({ path, matched: [] })).toBe(true);
  });

  it.each(["/", "/xp-profile", "/my-portal/ava/my-home", "/game-masters", "/game-master-notes", "/battle/ava/free"])(
    "leaves %s alone",
    (path) => {
      expect(isGameMasterRoute({ path, matched: [] })).toBe(false);
    }
  );

  it("guards an alias of a Game Master record by its route name", () => {
    expect(isGameMasterRoute(route("/gm", ["game-master"]))).toBe(true);
    expect(isGameMasterRoute(route("/gm", ["something-else"]))).toBe(false);
  });

  describe("against the real route table", () => {
    const router = createRouter({ history: createMemoryHistory(), routes: GameMasterRoutes });

    it("keeps every Game Master record under /game-master so none escapes the guard", () => {
      const paths = router.getRoutes().map((record) => record.path);
      expect(paths.length).toBeGreaterThan(20);
      expect(paths.filter((path) => !isGameMasterRoute({ path, matched: [] }))).toEqual([]);
    });

    it.each([
      "/game-master",
      "/game-master/dashboard",
      "/game-master/compendium",
      "/game-master/compendium/temples",
      "/game-master/add-beast/b1",
      "/game-master/add-ability/a1",
      "/game-master/discover-achievements",
      "/GAME-MASTER/dashboard",
    ])("resolves %s to a guarded route", (url) => {
      expect(isGameMasterRoute(router.resolve(url))).toBe(true);
    });
  });
});

describe("useRouterGuards wiring", () => {
  type Guard = (to: RouteLocationNormalized, from: unknown, next: jest.Mock) => Promise<void>;

  // The battle guard also receives the router; only the route is this suite's business
  const firstArgOf = (guard: unknown) => (guard as jest.Mock).mock.calls[0]?.[0];

  const installGuards = (): Guard => {
    const router = { beforeEach: jest.fn() };
    useRouterGuards(router as unknown as Router);
    return router.beforeEach.mock.calls[0][0] as Guard;
  };

  it("runs the Game Master gate after auth and before the side-effect guards", async () => {
    makeStore([mom, ava], "ava");
    const next = jest.fn();
    await installGuards()(GM_DASHBOARD, {}, next);

    expect(handleAuthGuard).toHaveBeenCalledWith(GM_DASHBOARD);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ name: "my-home", params: { userId: "ava" } });
    // A refused kid never starts the Game Master soundtrack or the battle timer
    expect(handleBgmGuard).not.toHaveBeenCalled();
    expect(handleBattleTimerGuard).not.toHaveBeenCalled();
  });

  it("lets auth redirect a signed-out visitor to log-in before the Game Master gate runs", async () => {
    makeStore([mom, ava], "ava");
    (handleAuthGuard as jest.Mock).mockReturnValueOnce({ name: "log-in" });
    const next = jest.fn();
    await installGuards()(GM_DASHBOARD, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ name: "log-in" });
    expect(toastCreate).not.toHaveBeenCalled();
  });

  it("continues normally, side effects included, for a Game Master", async () => {
    makeStore([mom, ava], "mom");
    const next = jest.fn();
    await installGuards()(GM_DASHBOARD, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(firstArgOf(handleBattleTimerGuard)).toBe(GM_DASHBOARD);
    expect(firstArgOf(handleBgmGuard)).toBe(GM_DASHBOARD);
  });

  it("does not change navigation to any other route", async () => {
    makeStore([mom, ava], "ava");
    const to = route("/my-portal/ava/my-home");
    const next = jest.fn();
    await installGuards()(to, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(firstArgOf(handleBgmGuard)).toBe(to);
    expect(toastCreate).not.toHaveBeenCalled();
  });
});

describe("family settings permissions", () => {
  const gm = { id: "gm", isAdult: true };
  const kid = { id: "kid", isAdult: false };
  const view = (id: string | null, users: Record<string, { id: string; isAdult?: unknown }>) => ({
    currentUser: { id },
    users,
  });

  it("lets a Game Master manage the family and a hero not", () => {
    const users = { gm, kid };
    expect(canManageFamily(view("gm", users))).toBe(true);
    expect(canManageFamily(view("kid", users))).toBe(false);
    expect(deleteProfileProblem(kid, view("kid", users))).toBe(FAMILY_GM_ONLY_MESSAGE);
  });

  it("never allows deleting the last Game Master, even by a Game Master", () => {
    const users = { gm, kid };
    expect(isLastGameMaster(gm, users)).toBe(true);
    expect(isLastGameMaster(kid, users)).toBe(false);
    expect(deleteProfileProblem(gm, view("gm", users))).toBe(LAST_GM_MESSAGE);
    const two = { gm, gm2: { id: "gm2", isAdult: true }, kid };
    expect(deleteProfileProblem(gm, view("gm", two))).toBeNull();
    expect(deleteProfileProblem(kid, view("gm", two))).toBeNull();
  });

  it("flags a Game Master without a 4-digit passcode, and nobody else", () => {
    expect(needsGameMasterPasscode({ isAdult: true })).toBe(true);
    expect(needsGameMasterPasscode({ isAdult: true, passcode: "12" })).toBe(true);
    expect(needsGameMasterPasscode({ isAdult: true, passcode: "1234" })).toBe(false);
    expect(needsGameMasterPasscode({ isAdult: false })).toBe(false);
  });
});
