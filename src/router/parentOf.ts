/**
 * Where "up" is for every page, in one place.
 *
 * Back normally follows the history. A page with no history behind it (a refresh, a shared link, a
 * notification, the app starting on it) has nothing to go back to, so Back goes to the place the page
 * belongs to: a shop to the world it stands in, the bank to Home Town, a Compendium form to its list.
 * `useBack` (src/hooks/useBack.ts) asks this module; every back button, leave dialog and the Android
 * hardware button read the same answer.
 *
 * Pure on purpose (no router, no stores): the route is passed in, a path comes out. `null` means the page
 * is a top of its own stack (the hero's home, the Game Master tabs, the profile chooser) and has no "up".
 */
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { metadataFor } from "@/lib/engine/temples/templeRegistry";
import { merchantWorldOn } from "@/lib/services/shops/travelingMerchant";

/** The slice of a vue-router route this module reads. */
export interface RouteLike {
  name?: string | symbol | null;
  path?: string;
  params?: Record<string, unknown>;
}

export interface ParentOptions {
  /** The signed-in hero, for pages whose address does not carry one. */
  heroId?: string | null;
  /** The world a shop stands in when the page knows better than the registry (a Decorate-tab choice, the traveling merchant). */
  shopWorld?: string | null;
}

/** Each world's page under /my-portal/:userId (world ids are the ones in worldRegistry and shopRegistry). */
export const WORLD_PAGES: Record<string, { name: string; segment: string }> = {
  plains: { name: "world-plains", segment: "plains" },
  islands: { name: "world-islands", segment: "islands" },
  forest: { name: "world-forest", segment: "forest" },
  swamps: { name: "world-swamps", segment: "swamps" },
  mountains: { name: "world-mountains", segment: "mountains" },
  desert: { name: "world-sands", segment: "sands" },
  clouds: { name: "world-clouds", segment: "clouds" },
  ice: { name: "world-ice", segment: "world-ice" },
  moon: { name: "the-moon", segment: "the-moon" },
};

const GAME_MASTER_HOME = "/game-master/dashboard";
const COMPENDIUM = "/game-master/compendium";
const COMPENDIUM_HOME = `${COMPENDIUM}/dashboard`;
const PROFILE_CHOOSER = "/xp-profile";
const SETTINGS = "/xp-settings";
const SUPPORT = "/xp-support";
const ABOUT = "/about-xp";

interface Context {
  name: string;
  path: string;
  heroId: string;
  params: Record<string, unknown>;
  options: ParentOptions;
}
type ParentRule = (context: Context) => string | null;

const firstText = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const isText = typeof raw === "string" || typeof raw === "number";
  return isText ? String(raw) : "";
};

/** A table lookup that ignores Object.prototype (a route called "constructor" is not a rule). */
const lookup = <T>(table: Record<string, T>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

const withoutQueryAndSlash = (path: string): string => path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

const portal = (heroId: string, page: string): string => `/my-portal/${encodeURIComponent(heroId)}/${page}`;

/** A hero's page, or the profile chooser when nobody is signed in (there is no portal to go to). */
const heroPage = (heroId: string, page: string): string => (heroId ? portal(heroId, page) : PROFILE_CHOOSER);

/** A region's page, or Home Town for a world nobody has a page for (hometown, "traveling", a typo). */
export const worldPageOf = (heroId: string | null | undefined, world: string | null | undefined): string => {
  const page = lookup(WORLD_PAGES, world ?? "");
  return heroPage(heroId ?? "", page ? page.segment : "home-town");
};

/** The world a shop stands in: the page's own say first, then the registry, then wherever the traveling merchant is today. */
const shopWorldOf = (merchant: string, shopWorld?: string | null): string => {
  const meta = SHOP_METADATA[merchant];
  const world = shopWorld || meta?.world || "";
  const isTraveling = meta?.type === "traveling";
  const followsTheMerchant = isTraveling && (!world || world === "traveling");
  return followsTheMerchant ? merchantWorldOn() : world;
};

const templeParent = (heroId: string, templeId: string): string => {
  const world = metadataFor(templeId)?.world ?? "";
  const hasARegionPage = Boolean(lookup(WORLD_PAGES, world));
  return hasARegionPage ? worldPageOf(heroId, world) : heroPage(heroId, "world-map");
};

const toTown: ParentRule = ({ heroId }) => heroPage(heroId, "home-town");
const toHome: ParentRule = ({ heroId }) => heroPage(heroId, "my-home");
const toWorldMap: ParentRule = ({ heroId }) => heroPage(heroId, "world-map");
const toTop: ParentRule = () => null;

/** Pages the hero reaches by name; anything not listed here falls through to the address rules below. */
const NAMED_RULES: Record<string, ParentRule> = {
  shop: ({ heroId, params, options }) => worldPageOf(heroId, shopWorldOf(firstText(params.merchant), options.shopWorld)),
  temple: ({ heroId, params }) => templeParent(heroId, firstText(params.temple)),
  // Home Town
  bank: toTown,
  hospital: toTown,
  hotel: ({ heroId, params }) => {
    const world = firstText(params.world);
    const hasRegionalWorld = Boolean(world) && world !== "hometown";
    return hasRegionalWorld ? worldPageOf(heroId, world) : heroPage(heroId, "home-town");
  },
  "town-hall": toTown,
  "town-hall-chat": ({ heroId }) => `/town-hall/${heroId}`,
  "view-stats": toTown,
  // My Home
  "cook-food": toHome,
  "craft-item": toHome,
  storage: toHome,
  calendar: toHome,
  // The hero's own screens
  "my-tasks": toHome,
  "my-abilities": toHome,
  "my-gold-points": toHome,
  "my-records": toHome,
  "my-inventory": toHome,
  "my-profile": toHome,
  "my-party": () => PROFILE_CHOOSER,
  "home-town": toHome,
  "world-map": toHome,
  "xp-pro-return": () => `${SETTINGS}/pro`,
  // Tops of their own stacks: nothing is "up" from here, and Back there is the system's business
  "xp-intro": toTop,
  "log-in": toTop,
  "xp-profile": toTop,
  "xp-demo": toTop,
  "game-over": toTop,
  "log-out": toTop,
  "my-portal": toTop,
  "my-home": toTop,
  "my-home-redirect": toTop,
  "battle-quest": toTop,
  "battle-temple": toTop,
  "battle-free": toTop,
  "battle-now": toTop,
};
const RULES_BY_NAME = new Map<string, ParentRule>([
  ...Object.entries(NAMED_RULES),
  ...Object.values(WORLD_PAGES).map((page): [string, ParentRule] => [page.name, toWorldMap]),
]);

const toSettingsIndex: ParentRule = () => SETTINGS;

/** Pages with no name of their own, or a whole family of them, by where they live. Longest prefix first. */
const RULES_BY_PATH: Array<[prefix: string, rule: ParentRule]> = [
  [`${SETTINGS}/`, toSettingsIndex],
  ["/support/", () => SUPPORT],
  [`${ABOUT}/`, () => ABOUT],
  ["/rpg-text-demo", () => SUPPORT],
  ["/dev/", () => "/dev"],
  // A task opens from the quest log
  ["/my-tasks/", ({ heroId, path }) => `/my-tasks/${path.split("/")[2] || heroId}`],
];

// Game Master pages (/game-master/**): the Compendium's sections each have a list, forms hang off the list

const GAME_MASTER_PAGES = new Map<string, string | null>([
  ["", null],
  ["dashboard", null],
  ["chat", null],
  ["approvals", GAME_MASTER_HOME],
  ["do-this-not-that", GAME_MASTER_HOME],
  ["add-beast", `${COMPENDIUM}/bestiary`],
  ["add-ability", `${COMPENDIUM}/abilities`],
  ["discover-achievements", `${COMPENDIUM}/achievements`],
]);

const ECONOMY_TABS = new Set(["dashboard", "shops", "items", "key-items"]);
const ECONOMY_PARENTS: Record<string, string> = {
  global: `${COMPENDIUM}/economy/dashboard`,
  "create-update": `${COMPENDIUM}/economy/items`,
};

// The section rules read the rest of the address after the section: economy/shops/abc/items -> ["shops", "abc", "items"]
const economyParent = ([page = "", id = ""]: string[]): string => {
  const isOneOfTheTabs = ECONOMY_TABS.has(page) && !id;
  const isTheSectionItself = !page;
  const isOnTheCompendiumsDoorstep = isOneOfTheTabs || isTheSectionItself;
  if (isOnTheCompendiumsDoorstep) return COMPENDIUM_HOME;
  // a shop's own tabs and the shop form sit under the shop list
  return lookup(ECONOMY_PARENTS, page) ?? `${COMPENDIUM}/economy/shops`;
};

// A room's editor (temples/creator/:templeId/rooms/:row/:col, temples/:templeId/rooms/:row/:col) belongs to that temple's
// room list; every other temple page is a tab of one temple, and belongs to the temple list
const templesParent = ([first = "", second = "", third = "", fourth = ""]: string[]): string => {
  const isTheSectionItself = !first;
  if (isTheSectionItself) return COMPENDIUM_HOME;
  const isCreatorRoomEditor = first === "creator" && third === "rooms";
  if (isCreatorRoomEditor) return `${COMPENDIUM}/temples/${second}/rooms`;
  const isTempleRoomEditor = second === "rooms" && Boolean(third) && Boolean(fourth);
  return isTempleRoomEditor ? `${COMPENDIUM}/temples/${first}/rooms` : `${COMPENDIUM}/temples`;
};

const SECTION_RULES: Record<string, (rest: string[]) => string> = {
  economy: economyParent,
  temples: templesParent,
};

const gameMasterParent = (path: string): string | null => {
  const [, , page = "", section = "", ...rest] = path.split("/");
  const isFixedPage = GAME_MASTER_PAGES.has(page);
  if (isFixedPage) return GAME_MASTER_PAGES.get(page) ?? null;
  const isInTheCompendium = page === "compendium";
  if (!isInTheCompendium) return GAME_MASTER_HOME;

  const isCompendiumTab = !section || section === "dashboard";
  if (isCompendiumTab) return null;
  const sectionRule = lookup(SECTION_RULES, section);
  if (sectionRule) return sectionRule(rest);
  // Any other section: its list is the section's own page, and the list belongs to the Compendium
  return rest.length ? `${COMPENDIUM}/${section}` : COMPENDIUM_HOME;
};

const resolveParent = (context: Context): string | null => {
  const { name, path, heroId } = context;
  const isGameMaster = path === "/game-master" || path.startsWith("/game-master/");
  if (isGameMaster) return gameMasterParent(path);

  const byName = RULES_BY_NAME.get(name);
  if (byName) return byName(context);

  const byPath = RULES_BY_PATH.find(([prefix]) => path.startsWith(prefix));
  if (byPath) return byPath[1](context);

  // Everything else (the settings, support and about indexes, Pro, Membership): the hero's home
  return heroPage(heroId, "my-home");
};

/**
 * The page "up" from `route`: where Back goes when there is no history, and the default-href of a back
 * button. `null` for a page with no "up".
 */
export const parentOf = (route: RouteLike, options: ParentOptions = {}): string | null => {
  const params = route.params ?? {};
  const context: Context = {
    name: typeof route.name === "string" ? route.name : "",
    path: withoutQueryAndSlash(route.path ?? ""),
    heroId: firstText(params.userId) || options.heroId || "",
    params,
    options,
  };
  const parent = resolveParent(context);
  // A page is never its own parent
  return parent === context.path ? null : parent;
};
