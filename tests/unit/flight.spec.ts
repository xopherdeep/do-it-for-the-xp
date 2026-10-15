/**
 * Onboarding gates (owner's rules, 2026-10-11): on foot the hero reaches only Hometown and the Plains; the
 * first freed Pegasus unlocks the overworld; the Wind Whistle modal flies to freed Pegasi and eggs only say
 * where they sleep.
 */
import type { RouteLocationNormalized } from "vue-router";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { PEGASI } from "@/lib/services/temples/TemplePegasus";
import {
  FIRST_FLIGHT_LINE,
  PLAINS_ROUTE,
  canFly,
  eggLine,
  isFlightRoute,
  routeOfWorld,
  templeOfPegasus,
} from "@/lib/services/travel/flight";
import { handleWorldGuard } from "@/router/_Guards/world.guard";
import { useToast } from "@/hooks/useToast";
import { useUserStore } from "@/lib/store/stores/user";

// The guard talks to the user store and the toast hook; both are faked so the decision runs without Pinia or Ionic.
// (TemplePegasus, imported only for the nine Pegasi, pulls the same store in: the factory keeps it from loading.)
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn(), IMPERSONATOR_KEY: "xp_impersonator_id" }));
jest.mock("@/hooks/useToast", () => ({ useToast: jest.fn() }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

const nine = (freed: number[] = []): boolean[] => Array.from({ length: 9 }, (_, i) => freed.includes(i));
const pegasus = (name: string) => PEGASI.find((entry) => entry.name === name)!;

describe("canFly", () => {
  it("is false with all nine Pegasi still in their eggs", () => {
    expect(canFly({ stats: { pegasi: nine() } })).toBe(false);
  });

  it("is true once any one Pegasus is free, whichever it is", () => {
    expect(canFly({ stats: { pegasi: nine([8]) } })).toBe(true);
    expect(canFly({ stats: { pegasi: nine([3]) } })).toBe(true);
    expect(canFly({ stats: { pegasi: nine([0, 1, 2, 3, 4, 5, 6, 7, 8]) } })).toBe(true);
  });

  it("is false for a profile with no Pegasi list, no stats, or no hero at all", () => {
    expect(canFly({ stats: {} })).toBe(false);
    expect(canFly({ stats: null })).toBe(false);
    expect(canFly({})).toBe(false);
    expect(canFly(null)).toBe(false);
    expect(canFly(undefined)).toBe(false);
  });

  it("is false for a bare legacy profile and reads a legacy index-keyed list", () => {
    expect(canFly({ id: "old-hero", name: { nick: "Old" } } as never)).toBe(false);
    expect(canFly({ stats: { pegasi: [] } })).toBe(false);
    expect(canFly({ stats: { pegasi: "yes" } })).toBe(false);
    expect(canFly({ stats: { pegasi: { 3: true } } })).toBe(true);
    expect(canFly({ stats: { pegasi: { 3: false } } })).toBe(false);
  });
});

describe("eggLine and templeOfPegasus", () => {
  it("names the temple that keeps the Pegasus", () => {
    expect(eggLine(pegasus("Terra"))).toBe("Terra sleeps in the Rootvault Hollow.");
    expect(eggLine(pegasus("Aqua"))).toBe("Aqua sleeps in the Tidesong Palace.");
  });

  it("does not put 'the' in front of a name that starts with The or a possessive", () => {
    expect(TEMPLE_METADATA["wind-temple"].name).toBe("The Howling Spire");
    expect(eggLine(pegasus("Aura"))).toBe("Aura sleeps in The Howling Spire.");
    expect(TEMPLE_METADATA["moon-temple"].name).toBe("Selene's Silent Court");
    expect(eggLine(pegasus("Umbra"))).toBe("Umbra sleeps in Selene's Silent Court.");
  });

  it("finds a temple for every one of the nine Pegasi, each in its own world", () => {
    const found = PEGASI.map((entry) => templeOfPegasus(entry));
    expect(found.every(Boolean)).toBe(true);
    expect(new Set(found.map((temple) => temple!.id)).size).toBe(9);
    expect(templeOfPegasus(pegasus("Sol"))!.id).toBe("light-temple");
    expect(templeOfPegasus(pegasus("Umbra"))!.id).toBe("moon-temple");
  });

  it("answers a far temple (and null) for a world no temple is in", () => {
    const lost = { name: "Nimbus", world: "atlantis" };
    expect(templeOfPegasus(lost)).toBeNull();
    expect(eggLine(lost)).toBe("Nimbus sleeps in a far temple.");
  });

  it("reads the screens' other spellings of a world", () => {
    expect(templeOfPegasus({ world: "sands" })!.id).toBe("light-temple");
    expect(templeOfPegasus({ world: "tundra" })!.id).toBe("ice-temple");
    expect(templeOfPegasus({ world: "the-moon" })!.id).toBe("moon-temple");
  });
});

describe("routeOfWorld", () => {
  it("maps the nine Pegasus worlds to their region routes", () => {
    expect(PEGASI.map((entry) => routeOfWorld(entry.world))).toEqual([
      "world-clouds",
      "world-mountains",
      "world-sands",
      "world-plains",
      "world-forest",
      "world-ice",
      "world-islands",
      "world-swamps",
      "the-moon",
    ]);
  });

  it("reads sands, tundra and the-moon, and is null for an unknown world", () => {
    expect(routeOfWorld("sands")).toBe("world-sands");
    expect(routeOfWorld("tundra")).toBe("world-ice");
    expect(routeOfWorld("the-moon")).toBe("the-moon");
    expect(routeOfWorld("atlantis")).toBeNull();
  });
});

describe("isFlightRoute", () => {
  it("is false on foot: the Plains, Hometown and the hero's own pages", () => {
    expect(isFlightRoute(PLAINS_ROUTE)).toBe(false);
    expect(isFlightRoute("home-town")).toBe(false);
    expect(isFlightRoute("my-home")).toBe(false);
    expect(isFlightRoute("my-party")).toBe(false);
    expect(isFlightRoute("temple")).toBe(false);
    expect(isFlightRoute("game-master")).toBe(false);
  });

  it("is true for the overworld and every region but the Plains", () => {
    expect(isFlightRoute("world-map")).toBe(true);
    expect(isFlightRoute("world-forest")).toBe(true);
    for (const entry of PEGASI.filter((one) => one.world !== "plains")) {
      expect(isFlightRoute(routeOfWorld(entry.world))).toBe(true);
    }
  });

  it("is false for a route with no name", () => {
    expect(isFlightRoute(undefined)).toBe(false);
    expect(isFlightRoute(null)).toBe(false);
    expect(isFlightRoute(Symbol("route"))).toBe(false);
  });
});

describe("the world guard", () => {
  const showToast = jest.fn().mockResolvedValue(undefined);
  const loadUsers = jest.fn().mockResolvedValue(undefined);
  const toRoute = (name: string, params: Record<string, string> = { userId: "hero-1" }) =>
    ({ name, params, path: `/my-portal/${params.userId}/${name}`, matched: [] }) as unknown as RouteLocationNormalized;

  const store = (users: Record<string, unknown>, currentId: string | null = "hero-1") => {
    (useUserStore as unknown as jest.Mock).mockReturnValue({
      users,
      currentUser: { id: currentId, ...(currentId ? (users[currentId] as object) : {}) },
      loadUsers,
    });
  };

  beforeEach(() => {
    showToast.mockClear();
    loadUsers.mockClear();
    (useToast as jest.Mock).mockReturnValue({ showToast });
  });

  it("sends a flightless hero from a region to their own Plains and says why", async () => {
    store({ "hero-1": { stats: { pegasi: nine() } } });
    const result = await handleWorldGuard(toRoute("world-forest"));
    expect(result).toEqual({ name: "world-plains", params: { userId: "hero-1" } });
    expect(showToast).toHaveBeenCalledWith(FIRST_FLIGHT_LINE, 2500, "bottom");
  });

  it("turns the overworld back too, using the route's hero rather than whoever is signed in", async () => {
    store({ "hero-1": { stats: { pegasi: nine([4]) } }, "hero-2": { stats: { pegasi: nine() } } });
    const result = await handleWorldGuard(toRoute("world-map", { userId: "hero-2" }));
    expect(result).toEqual({ name: "world-plains", params: { userId: "hero-2" } });
  });

  it("lets a hero with one freed Pegasus into the overworld and every region", async () => {
    store({ "hero-1": { stats: { pegasi: nine([3]) } } });
    for (const name of ["world-map", "world-forest", "world-islands", "world-ice", "the-moon"]) {
      expect(await handleWorldGuard(toRoute(name))).toBeUndefined();
    }
    expect(showToast).not.toHaveBeenCalled();
  });

  it("never touches the Plains, Hometown or the Game Master's pages, so a bounce cannot loop", async () => {
    store({ "hero-1": { stats: { pegasi: nine() } } });
    for (const name of ["world-plains", "home-town", "my-home", "temple", "game-master", "xp-dashboard"]) {
      expect(await handleWorldGuard(toRoute(name))).toBeUndefined();
    }
    expect(showToast).not.toHaveBeenCalled();
    expect(loadUsers).not.toHaveBeenCalled();
  });

  it("falls back to the signed-in hero when the route has no :userId", async () => {
    store({ "hero-1": { stats: { pegasi: nine() } } });
    expect(await handleWorldGuard(toRoute("world-sands", {}))).toEqual({
      name: "world-plains",
      params: { userId: "hero-1" },
    });
  });

  it("loads the profiles first on a hard refresh, then decides", async () => {
    const users: Record<string, unknown> = {};
    loadUsers.mockImplementationOnce(async () => {
      users["hero-1"] = { stats: { pegasi: nine() } };
    });
    store(users, null);
    const result = await handleWorldGuard(toRoute("world-clouds"));
    expect(loadUsers).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ name: "world-plains", params: { userId: "hero-1" } });
  });

  it("leaves an unknown hero to the portal's own guard", async () => {
    store({ "hero-1": { stats: { pegasi: nine() } } });
    expect(await handleWorldGuard(toRoute("world-forest", { userId: "ghost" }))).toBeUndefined();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("lets the hero through when the check itself fails", async () => {
    (useUserStore as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("no store");
    });
    expect(await handleWorldGuard(toRoute("world-forest"))).toBeUndefined();
  });

  it("is not stopped by a toast that fails to show", async () => {
    store({ "hero-1": { stats: { pegasi: nine() } } });
    showToast.mockRejectedValueOnce(new Error("no overlay"));
    expect(await handleWorldGuard(toRoute("world-forest"))).toEqual({
      name: "world-plains",
      params: { userId: "hero-1" },
    });
  });
});
