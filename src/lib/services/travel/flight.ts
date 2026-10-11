/**
 * Getting around the world (owner's onboarding rules, 2026-10-11):
 *  1. On foot the hero reaches only Hometown and the Plains.
 *  2. The first freed Pegasus (any of the nine in `stats.pegasi`) unlocks the overworld and the other regions.
 *  3. The Pegasus modal (the Wind Whistle) flies to a freed Pegasus's region; an egg only says where it sleeps.
 *
 * Pure rules with no store or router in them: the route guard, the "Travel World" action and the Pegasus
 * modal all ask this module.
 */
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import type { TempleMetadata } from "@/lib/engine/temples/templeRegistry";
import { WORLD_REGIONS } from "@/app/Console/BattleField/battle/battleContext";
import type { Pegasus } from "@/lib/services/temples/TemplePegasus";

/** What the hero is told when they try to leave the Plains with no Pegasus freed. */
export const FIRST_FLIGHT_LINE = "Free your first Pegasus in the Wind Temple to fly.";

/** The one region the hero can always walk to: it is never a flight route, so a bounce there cannot loop. */
export const PLAINS_ROUTE = "world-plains";

/** The overworld page (the nine regions on one map). */
export const WORLD_MAP_ROUTE = "world-map";

/** What the egg line says when no temple keeps the Pegasus. */
const FAR_TEMPLE = "a far temple";

/** The other names the screens use for a world (templeRegistry and PEGASI spell it `desert`, `ice`, `moon`). */
const WORLD_ALIASES: Record<string, string> = { sands: "desert", tundra: "ice", "the-moon": "moon" };

const normalWorld = (world: string): string => WORLD_ALIASES[world] ?? world;

/** The shape of the hero this module reads: tolerant of profiles saved before `stats.pegasi` existed. */
interface FlightHero {
  stats?: { pegasi?: unknown } | null;
}

/** True when any slot of the Pegasi list is freed (a list of nine flags, or an index-keyed map from older saves). */
const anyFreed = (slots: unknown): boolean => {
  if (Array.isArray(slots)) return slots.some(Boolean);
  if (slots && typeof slots === "object") return Object.values(slots).some(Boolean);
  return false;
};

/** True once the hero has freed at least one Pegasus. A missing hero, stats or list means "on foot". */
export const canFly = (user: FlightHero | null | undefined): boolean => anyFreed(user?.stats?.pegasi);

/** The temple that keeps this Pegasus: the one the registry places in its world, or null when none does. */
export const templeOfPegasus = (pegasus: Pick<Pegasus, "world">): TempleMetadata | null => {
  const world = normalWorld(pegasus.world);
  return Object.values(TEMPLE_METADATA).find((temple) => normalWorld(temple.world) === world) ?? null;
};

/** A temple name that already reads as a place on its own: "The Howling Spire", "Selene's Silent Court". */
const NEEDS_NO_ARTICLE = /^(the\s|[a-z]+'s\s)/i;

/** What an egg says when tapped: "Terra sleeps in the Rootvault Hollow." (never "the The ..." or "the Selene's ..."). */
export const eggLine = (pegasus: Pick<Pegasus, "name" | "world">): string => {
  const temple = templeOfPegasus(pegasus);
  if (!temple) return `${pegasus.name} sleeps in ${FAR_TEMPLE}.`;
  const place = NEEDS_NO_ARTICLE.test(temple.name) ? temple.name : `the ${temple.name}`;
  return `${pegasus.name} sleeps in ${place}.`;
};

/** The region route of a world (PEGASI's spelling, or sands / tundra / the-moon), or null for an unknown world. */
export const routeOfWorld = (world: string): string | null => WORLD_REGIONS[normalWorld(world)]?.routeName ?? null;

/** Every route a hero on foot may not open: the overworld and all region pages except the Plains. */
const FLIGHT_ROUTES: ReadonlySet<string> = new Set([
  WORLD_MAP_ROUTE,
  ...Object.values(WORLD_REGIONS)
    .map((region) => region.routeName)
    .filter((routeName) => routeName !== PLAINS_ROUTE),
]);

/** True for the overworld and every region route but the Plains; false for Hometown, the Plains and all else. */
export const isFlightRoute = (routeName: unknown): boolean =>
  typeof routeName === "string" && FLIGHT_ROUTES.has(routeName);
