/**
 * The Area tab of the hero's bottom nav: where the hero stands, and the way back to it.
 *
 * The tab wears the place's name and icon (the world map, a region, Home Town, a town building, a temple,
 * home). Party, Profile and the screens a hand opens are not places: they must never rewrite the tab, or the
 * hero loses the way back. So the tab remembers the last place the hero stood and keeps it while one of those
 * is open; tapping Area from Party walks back to it.
 *
 * Pure rules (route in, place out) plus a small memory per hero. A router guard feeds the memory on every
 * navigation (`@/router/_Guards/area.guard`), because a temple or a building is not under the portal shell
 * and the shell cannot see the hero leave them.
 */
import { metadataFor } from "@/lib/engine/temples/templeRegistry";

/** The slice of a vue-router route this module reads. */
export interface AreaRoute {
  name?: string | symbol | null;
  path?: string;
  params?: Record<string, unknown>;
}

/** What the Area tab shows, and where tapping it goes when the hero is on Party. */
export interface AreaPlace {
  name: string;
  icon: string;
  link: string;
}

export type NavTab = "profile" | "area" | "party";

interface PortalPlace {
  name: string;
  icon: string;
  /** The page's path under /my-portal/:userId. */
  segment: string;
}

/** The pages under /my-portal/:userId that are places, by route name (the segments are the routes' own paths). */
const PORTAL_PLACES: Record<string, PortalPlace> = {
  "world-map": { name: "The World", icon: "pegasus", segment: "world-map" },
  "home-town": { name: "Hometown", icon: "archway", segment: "home-town" },
  "my-home": { name: "My Home", icon: "house-user", segment: "my-home" },
  "world-plains": { name: "Plains", icon: "tornado", segment: "plains" },
  "world-islands": { name: "Islands", icon: "island-tropical", segment: "islands" },
  "world-forest": { name: "Forests", icon: "trees", segment: "forest" },
  "world-swamps": { name: "Swamps", icon: "skull-crossbones", segment: "swamps" },
  "world-mountains": { name: "Mountains", icon: "mountains", segment: "mountains" },
  "world-sands": { name: "Sands", icon: "cactus", segment: "sands" },
  "world-ice": { name: "Tundras", icon: "igloo", segment: "world-ice" },
  "world-clouds": { name: "Clouds", icon: "cloud", segment: "clouds" },
  "the-moon": { name: "The Moon", icon: "moon", segment: "the-moon" },
};

/** The town's buildings, by route name. They sit outside the portal, so their link is the page the hero is on. */
const TOWN_BUILDINGS: Record<string, { name: string; icon: string }> = {
  shop: { name: "Shop", icon: "store" },
  bank: { name: "Bank", icon: "piggy-bank" },
  hospital: { name: "Hospital", icon: "hospital-alt" },
  "town-hall": { name: "Town Hall", icon: "landmark" },
  hotel: { name: "Hotel", icon: "hotel" },
};

const WORLD_MAP_ROUTE = "world-map";
/** On foot there is no overworld to return to: the Plains is as far as the hero's feet go. */
const WALKING_WORLD_ROUTE = "world-plains";
const TEMPLE_ICON = "place-of-worship";
const HOME_ROUTE = "my-home";
const PARTY_ROUTE = "my-party";

const lookup = <T>(table: Record<string, T>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

const firstText = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const isText = typeof raw === "string" || typeof raw === "number";
  return isText ? String(raw) : "";
};

/** The hero a page belongs to: the one its address names, else the signed-in one. */
const heroOf = (route: AreaRoute, fallbackHeroId: string | null | undefined): string =>
  firstText(route.params?.userId) || firstText(fallbackHeroId);

const portalPath = (heroId: string, segment: string): string =>
  `/my-portal/${encodeURIComponent(heroId)}/${segment}`;

const withoutQuery = (path: string | undefined): string => String(path ?? "").split(/[?#]/)[0];

/** The name the temple's own Area tab wears: a generated temple its name, a registry one its id spelled out. */
const templeLabel = (templeId: string): string => {
  const meta = metadataFor(templeId);
  const isGenerated = templeId.startsWith("gen-") || templeId === "moving-house" || !meta;
  const name = (isGenerated && meta?.name) || templeId.replace(/-/g, " ");
  return name.replace(/<[^>]*>/g, "").trim() || "Temple";
};

const homePlace = (heroId: string): AreaPlace => {
  const home = PORTAL_PLACES[HOME_ROUTE];
  return { name: home.name, icon: home.icon, link: portalPath(heroId, home.segment) };
};

export const isPartyRoute = (route: AreaRoute): boolean => {
  const isPartyName = route.name === PARTY_ROUTE;
  const isPartyPath = withoutQuery(route.path).replace(/\/+$/, "").endsWith(`/${PARTY_ROUTE}`);
  return isPartyName || isPartyPath;
};

/** The nav tab to light: Party on the Party screen, Profile while the profile sheet is open, else Area. */
export const navTabFor = (route: AreaRoute, isProfileOpen: boolean): NavTab => {
  if (isProfileOpen) return "profile";
  if (isPartyRoute(route)) return "party";
  return "area";
};

/**
 * The place a route is, or null when the route is not a place (Party, Profile, a hand's screen, the
 * Game Master's pages). `canFly` is the onboarding gate: until the first Pegasus is freed the overworld is the
 * Plains (name, icon and link), so the way back never lands on a page the world guard turns away.
 * `fallbackHeroId` is for pages whose address carries no hero.
 */
export const placeOfRoute = (route: AreaRoute, canFly: boolean, fallbackHeroId?: string | null): AreaPlace | null => {
  const routeName = typeof route.name === "string" ? route.name : "";
  const heroId = heroOf(route, fallbackHeroId);
  if (!routeName || !heroId) return null;

  const isOverworldOnFoot = routeName === WORLD_MAP_ROUTE && !canFly;
  const portalPlace = lookup(PORTAL_PLACES, isOverworldOnFoot ? WALKING_WORLD_ROUTE : routeName);
  if (portalPlace) {
    return { name: portalPlace.name, icon: portalPlace.icon, link: portalPath(heroId, portalPlace.segment) };
  }

  const building = lookup(TOWN_BUILDINGS, routeName);
  if (building) return { name: building.name, icon: building.icon, link: withoutQuery(route.path) };

  const templeId = firstText(route.params?.temple);
  const isTemple = routeName === "temple" && templeId !== "";
  if (isTemple) {
    // Without the room in the address: a hero with a saved run resumes it wherever it stopped
    const link = `/temple/${encodeURIComponent(templeId)}/${encodeURIComponent(heroId)}`;
    return { name: templeLabel(templeId), icon: TEMPLE_ICON, link };
  }

  return null;
};

// The last place each hero stood, as the route that was a place (the label is read when it is shown, so a
// generated temple that resolves a moment after the hero walks in still gets its name, and the flight gate
// applies to what the hero can do now, not to what they could do when they stood there).
const lastPlaceRoute = new Map<string, AreaRoute>();

/** Remember a route if it is a place. Returns whether it was one. */
export const rememberPlace = (route: AreaRoute, fallbackHeroId?: string | null): boolean => {
  const heroId = heroOf(route, fallbackHeroId);
  const isPlace = placeOfRoute(route, true, fallbackHeroId) !== null;
  if (!isPlace) return false;
  lastPlaceRoute.set(heroId, {
    name: route.name,
    path: withoutQuery(route.path),
    params: { ...route.params, userId: heroId },
  });
  return true;
};

/** The last place this hero stood, or null when the app has not seen one yet (a refresh on Party). */
export const rememberedPlace = (heroId: string | null | undefined, canFly: boolean): AreaPlace | null => {
  const remembered = lastPlaceRoute.get(firstText(heroId));
  return remembered ? placeOfRoute(remembered, canFly, heroId) : null;
};

/** What the Area tab shows for this route: the place itself, else the last place the hero stood, else home. */
export const areaTabFor = (route: AreaRoute, canFly: boolean, fallbackHeroId?: string | null): AreaPlace => {
  const here = placeOfRoute(route, canFly, fallbackHeroId);
  if (here) return here;
  const heroId = heroOf(route, fallbackHeroId);
  return rememberedPlace(heroId, canFly) ?? homePlace(heroId);
};

/** Forget every hero's last place (for tests). */
export const forgetPlaces = (): void => {
  lastPlaceRoute.clear();
};
