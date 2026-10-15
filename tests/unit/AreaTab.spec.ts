import {
  areaTabFor,
  forgetPlaces,
  isPartyRoute,
  navTabFor,
  placeOfRoute,
  rememberPlace,
  rememberedPlace,
} from "@/app/Console/MyPortal/areaTab";
import { handleAreaGuard } from "@/router/_Guards/area.guard";
import { useUserStore } from "@/lib/store/stores/user";

// The guard asks the store only for the signed-in hero; the store itself is not what these specs are about
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn() }));

const HERO = "hero-1";
const OTHER = "hero-2";
// A hero with a freed Pegasus; the onboarding gate (on foot) has its own cases below
const FLIES = true;
const ON_FOOT = false;

const route = (name: string, path: string, params: Record<string, string> = { userId: HERO }) => ({ name, path, params });
const portal = (name: string, segment: string, userId = HERO) => route(name, `/my-portal/${userId}/${segment}`, { userId });

const WORLD_MAP = portal("world-map", "world-map");
const PLAINS = portal("world-plains", "plains");
const HOME_TOWN = portal("home-town", "home-town");
const PARTY = portal("my-party", "my-party");
const PROFILE = portal("my-profile", "my-profile");
const INVENTORY = route("my-inventory", `/my-inventory/${HERO}`);
const BANK = route("bank", `/bank/${HERO}`);
const WIND_TEMPLE = route("temple", `/temple/wind-temple/${HERO}/2/3`, { temple: "wind-temple", userId: HERO, x: "2", y: "3" });

beforeEach(() => forgetPlaces());

describe("placeOfRoute: which routes are places", () => {
  it("names the world map, a region, Home Town and home with their icons and their pages", () => {
    expect(placeOfRoute(WORLD_MAP, FLIES)).toEqual({ name: "The World", icon: "pegasus", link: `/my-portal/${HERO}/world-map` });
    expect(placeOfRoute(PLAINS, FLIES)).toEqual({ name: "Plains", icon: "tornado", link: `/my-portal/${HERO}/plains` });
    expect(placeOfRoute(portal("world-ice", "world-ice"), FLIES)).toEqual({
      name: "Tundras",
      icon: "igloo",
      link: `/my-portal/${HERO}/world-ice`,
    });
    expect(placeOfRoute(HOME_TOWN, FLIES)).toEqual({ name: "Hometown", icon: "archway", link: `/my-portal/${HERO}/home-town` });
    expect(placeOfRoute(portal("my-home", "my-home"), FLIES)).toEqual({
      name: "My Home",
      icon: "house-user",
      link: `/my-portal/${HERO}/my-home`,
    });
  });

  it("names a town building and links to the page the hero stood on", () => {
    expect(placeOfRoute(BANK, FLIES)).toEqual({ name: "Bank", icon: "piggy-bank", link: `/bank/${HERO}` });
    const shop = route("shop", `/shop/hometown-market/${HERO}?tab=buy`, { merchant: "hometown-market", userId: HERO });
    expect(placeOfRoute(shop, FLIES)).toEqual({ name: "Shop", icon: "store", link: `/shop/hometown-market/${HERO}` });
  });

  it("names a temple by the label its own tab wears and links to it without the room, so a saved run resumes", () => {
    expect(placeOfRoute(WIND_TEMPLE, FLIES)).toEqual({
      name: "wind temple",
      icon: "place-of-worship",
      link: `/temple/wind-temple/${HERO}`,
    });
  });

  it("names a generated temple from its id until the TempleDb has resolved its name", () => {
    const generated = route("temple", `/temple/gen-old-attic/${HERO}`, { temple: "gen-old-attic", userId: HERO });
    expect(placeOfRoute(generated, FLIES)?.name).toBe("gen old attic");
  });

  it("reads the hero from the signed-in one when the address carries none", () => {
    const bareBank = route("bank", "/bank", {});
    expect(placeOfRoute(bareBank, FLIES)).toBeNull();
    expect(placeOfRoute(bareBank, FLIES, HERO)).toEqual({ name: "Bank", icon: "piggy-bank", link: "/bank" });
  });

  it("is not a place on Party, Profile, a hand's screen, or a page nobody named", () => {
    expect(placeOfRoute(PARTY, FLIES)).toBeNull();
    expect(placeOfRoute(PROFILE, FLIES)).toBeNull();
    expect(placeOfRoute(INVENTORY, FLIES)).toBeNull();
    expect(placeOfRoute(route("constructor", "/constructor"), FLIES)).toBeNull();
    expect(placeOfRoute({ name: undefined, path: "/", params: {} }, FLIES)).toBeNull();
  });
});

describe("navTabFor: which tab lights", () => {
  it("lights Party on the Party screen, with or without a name", () => {
    expect(navTabFor(PARTY, false)).toBe("party");
    expect(isPartyRoute({ path: `/my-portal/${HERO}/my-party/` })).toBe(true);
    expect(isPartyRoute({ path: `/my-portal/${HERO}/my-party?from=temple` })).toBe(true);
  });

  it("lights Area everywhere else, and Profile while the profile sheet is open", () => {
    expect(navTabFor(PLAINS, false)).toBe("area");
    expect(navTabFor(PROFILE, false)).toBe("area");
    expect(navTabFor(PLAINS, true)).toBe("profile");
    expect(navTabFor(PARTY, true)).toBe("profile");
  });
});

describe("areaTabFor: the Area tab keeps the last place", () => {
  it("shows the place the hero is on", () => {
    expect(areaTabFor(PLAINS, FLIES, HERO)).toEqual(placeOfRoute(PLAINS, FLIES));
  });

  it("keeps the world map's label and icon on Party, and the tab returns there (the reported bug)", () => {
    rememberPlace(WORLD_MAP);
    const onParty = areaTabFor(PARTY, FLIES, HERO);
    expect(onParty).toEqual({ name: "The World", icon: "pegasus", link: `/my-portal/${HERO}/world-map` });
    expect(onParty.name).not.toBe("Party");
  });

  it("keeps the place on Profile and on a hand's screen too", () => {
    rememberPlace(HOME_TOWN);
    expect(areaTabFor(PROFILE, FLIES, HERO).name).toBe("Hometown");
    expect(areaTabFor(INVENTORY, FLIES, HERO).name).toBe("Hometown");
  });

  it("walks a temple to Party and back, resuming the temple", () => {
    rememberPlace(WIND_TEMPLE);
    expect(areaTabFor(PARTY, FLIES, HERO)).toEqual({
      name: "wind temple",
      icon: "place-of-worship",
      link: `/temple/wind-temple/${HERO}`,
    });
  });

  it("follows the hero from place to place and ignores the screens in between", () => {
    rememberPlace(WORLD_MAP);
    rememberPlace(PARTY);
    expect(areaTabFor(PARTY, FLIES, HERO).name).toBe("The World");
    rememberPlace(PLAINS);
    rememberPlace(PROFILE);
    rememberPlace(PARTY);
    expect(areaTabFor(PARTY, FLIES, HERO).name).toBe("Plains");
    expect(rememberedPlace(HERO, FLIES)?.link).toBe(`/my-portal/${HERO}/plains`);
  });

  it("falls back to home when no place has been seen yet (a refresh on Party)", () => {
    expect(areaTabFor(PARTY, FLIES, HERO)).toEqual({
      name: "My Home",
      icon: "house-user",
      link: `/my-portal/${HERO}/my-home`,
    });
  });

  it("keeps each hero's place apart", () => {
    rememberPlace(PLAINS);
    rememberPlace(portal("the-moon", "the-moon", OTHER));
    expect(areaTabFor(portal("my-party", "my-party", HERO), FLIES, HERO).name).toBe("Plains");
    expect(areaTabFor(portal("my-party", "my-party", OTHER), FLIES, OTHER).name).toBe("The Moon");
  });

  it("sends a hero who can fly back to the world map", () => {
    rememberPlace(WORLD_MAP);
    expect(areaTabFor(PARTY, FLIES, HERO)).toEqual({
      name: "The World",
      icon: "pegasus",
      link: `/my-portal/${HERO}/world-map`,
    });
  });

  it("sends a hero on foot to the Plains instead: the overworld opens with the first Pegasus", () => {
    rememberPlace(WORLD_MAP);
    const expected = { name: "Plains", icon: "tornado", link: `/my-portal/${HERO}/plains` };
    expect(areaTabFor(PARTY, ON_FOOT, HERO)).toEqual(expected);
    expect(areaTabFor(WORLD_MAP, ON_FOOT, HERO)).toEqual(expected);
    // The gate is read when the tab is shown: the same memory serves the hero once the Pegasus is freed
    expect(areaTabFor(PARTY, FLIES, HERO).name).toBe("The World");
  });

  it("remembers only places", () => {
    expect(rememberPlace(PARTY)).toBe(false);
    expect(rememberPlace(PLAINS)).toBe(true);
    expect(rememberedPlace(null, FLIES)).toBeNull();
  });
});

describe("handleAreaGuard: the memory is fed by the router", () => {
  type AfterEach = (to: unknown, from: unknown, failure?: unknown) => void;
  const routerWithHook = () => {
    let hook: AfterEach = () => undefined;
    const router = { afterEach: (fn: AfterEach) => { hook = fn; } };
    return { router, navigate: (to: unknown, failure?: unknown) => hook(to, {}, failure) };
  };

  beforeEach(() => {
    (useUserStore as unknown as jest.Mock).mockReturnValue({ currentUser: { id: HERO } });
  });

  it("remembers each place the hero arrives at, a temple outside the portal included", () => {
    const { router, navigate } = routerWithHook();
    handleAreaGuard(router as never);
    navigate(PLAINS);
    navigate(WIND_TEMPLE);
    navigate(PARTY);
    expect(areaTabFor(PARTY, FLIES, HERO).name).toBe("wind temple");
  });

  it("leaves the memory alone when the navigation failed", () => {
    const { router, navigate } = routerWithHook();
    handleAreaGuard(router as never);
    navigate(PLAINS);
    navigate(HOME_TOWN, new Error("cancelled"));
    expect(areaTabFor(PARTY, FLIES, HERO).name).toBe("Plains");
  });

  it("never throws into the navigation", () => {
    (useUserStore as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("no store");
    });
    const { router, navigate } = routerWithHook();
    handleAreaGuard(router as never);
    expect(() => navigate(PLAINS)).not.toThrow();
  });
});
