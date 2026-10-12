// Scene transitions: which animation plays when the hero moves between two places. Pure rules, no Vue and no DOM,
// so the router guard stays thin and every rule has a jest spec. The effects themselves live in
// src/components/organisms/SceneTransition (see sceneTransitionController.ts for the contract).
import { metadataFor } from "@/lib/engine/temples/templeRegistry";

export type SceneKind = "town" | "building" | "region" | "world-map" | "temple" | "battle" | "portal" | "other";

export interface Scene {
  kind: SceneKind;
  /** Stable id: the route name plus the param that matters, e.g. 'temple:wind-temple'. */
  key: string;
  /** Display name for the title card: 'The Howling Spire', 'The Plains', 'Item Shop', 'Home Town'. */
  title?: string;
  /** Temple or region element: wind, fire, ice, water, earth, light, shadow, storm, moon. */
  element?: string;
}

export type EffectId = "fade" | "iris" | "doors" | "clouds" | "swirl";

export interface TransitionPlan {
  effect: EffectId;
  /** in = going deeper (into a building, temple or battle); out = coming back. */
  direction: "in" | "out";
  title?: string;
  subtitle?: string;
  element?: string;
  /** e.g. 'pegasus' for clouds when flying region to region. */
  variant?: string;
  /** play$fx key, played when the cover starts. */
  sound?: string;
}

interface RouteLike {
  name?: string | symbol | null;
  params: Record<string, unknown>;
  path?: string;
}

/** Buildings, by the route names that count as the same building (its sub-pages never animate). */
const BUILDING_BY_ROUTE: Record<string, { id: string; title: string }> = {
  shop: { id: "shop", title: "Item Shop" },
  bank: { id: "bank", title: "Gold Bank" },
  hospital: { id: "hospital", title: "Hospital" },
  "view-stats": { id: "hospital", title: "Hospital" },
  "town-hall": { id: "town-hall", title: "Town Hall" },
  hotel: { id: "hotel", title: "Hotel" },
  "my-home": { id: "my-home", title: "My Home" },
  "cook-food": { id: "my-home", title: "My Home" },
  "craft-item": { id: "my-home", title: "My Home" },
  storage: { id: "my-home", title: "My Home" },
  calendar: { id: "my-home", title: "My Home" },
};

/** Regions by route name: the display name and the element the title card is tinted with. */
const REGION_BY_ROUTE: Record<string, { id: string; title: string; element?: string }> = {
  "world-plains": { id: "plains", title: "The Plains", element: "wind" },
  "world-forest": { id: "forest", title: "The Forest", element: "earth" },
  "world-islands": { id: "islands", title: "The Islands", element: "water" },
  "world-swamps": { id: "swamps", title: "The Swamps", element: "shadow" },
  "world-mountains": { id: "mountains", title: "The Mountains", element: "fire" },
  "world-sands": { id: "sands", title: "The Sands", element: "fire" },
  "world-ice": { id: "ice", title: "The Tundra", element: "ice" },
  "world-clouds": { id: "clouds", title: "The Clouds", element: "storm" },
  "the-moon": { id: "moon", title: "The Moon", element: "moon" },
};

/** Region id (a temple's `world`) to its route name's entry, for "Wind Temple, The Plains". */
const REGION_BY_WORLD: Record<string, { title: string; element?: string }> = Object.values(REGION_BY_ROUTE).reduce(
  (all, region) => ({ ...all, [region.id]: region }),
  {} as Record<string, { title: string; element?: string }>
);

/** A region's flavour line, where it has one. */
const REGION_SUBTITLE: Record<string, string> = {
  plains: "Plains of Ventus",
};

const BATTLE_ROUTES = new Set(["battle-quest", "battle-temple", "battle-now", "battle-free"]);
const PORTAL_ROUTES = new Set(["my-party", "my-profile", "my-look", "my-home-redirect", "my-portal"]);

const ELEMENTS = new Set(["wind", "fire", "ice", "water", "earth", "light", "shadow", "storm", "moon"]);

/** 'gen-ember-hall' to 'Ember Hall' for temples the registry does not know. */
const prettify = (slug: string): string =>
  slug
    .replace(/^gen-/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const elementOrUndefined = (value?: string): string | undefined => (value && ELEMENTS.has(value) ? value : undefined);

export const sceneOf = (route: RouteLike): Scene => {
  const name = typeof route.name === "string" ? route.name : "";

  const building = BUILDING_BY_ROUTE[name];
  if (building) return { kind: "building", key: `building:${building.id}`, title: building.title };

  if (name === "home-town") return { kind: "town", key: "town", title: "Home Town" };
  if (name === "world-map") return { kind: "world-map", key: "world-map", title: "World Map" };

  const region = REGION_BY_ROUTE[name];
  if (region) return { kind: "region", key: `region:${region.id}`, title: region.title, element: region.element };

  if (name === "temple") {
    const id = String(route.params?.temple ?? "");
    const meta = metadataFor(id);
    return {
      kind: "temple",
      key: `temple:${id}`,
      title: meta?.name ?? (prettify(id) || "Temple"),
      element: elementOrUndefined(meta?.element),
    };
  }

  if (BATTLE_ROUTES.has(name)) return { kind: "battle", key: "battle" };
  if (PORTAL_ROUTES.has(name)) return { kind: "portal", key: `portal:${name}` };

  return { kind: "other", key: `other:${name || route.path || ""}` };
};

/** A temple's region, for the card's subtitle ("The Plains"). */
const regionOfTemple = (scene: Scene): { title: string; element?: string } | undefined => {
  const id = scene.key.replace(/^temple:/, "");
  const world = metadataFor(id)?.world;
  return world ? REGION_BY_WORLD[world] : undefined;
};

const regionSubtitle = (scene: Scene): string | undefined => {
  const id = scene.key.replace(/^region:/, "");
  return REGION_SUBTITLE[id];
};

export const transitionFor = (from: Scene, to: Scene): TransitionPlan | null => {
  if (from.key === to.key) return null;

  // Into a battle, from anywhere
  if (to.kind === "battle") return { effect: "swirl", direction: "in" };

  // Back out of a battle to where the hero was
  if (from.kind === "battle" && ["temple", "region", "town", "world-map"].includes(to.kind)) {
    return { effect: "fade", direction: "out" };
  }
  if (from.kind === "battle") return null;

  // Through a building's door
  if (to.kind === "building") {
    // The variant names the building whose doors these are (the effect paints its trim); the doors play their own creak
    return { effect: "doors", direction: "in", title: to.title, variant: to.title };
  }
  if (from.kind === "building") {
    if (to.kind === "other") return null;
    return { effect: "doors", direction: "out", title: to.title, variant: from.title };
  }

  // Into and out of a temple
  if (to.kind === "temple") {
    return {
      effect: "iris",
      direction: "in",
      title: to.title,
      subtitle: regionOfTemple(to)?.title,
      element: to.element,
    };
  }
  if (from.kind === "temple") {
    if (to.kind === "other" || to.kind === "portal") return null;
    return { effect: "iris", direction: "out", title: to.title, element: to.element };
  }

  // Travel: the hero rides the clouds between town, world map and regions
  const travel: SceneKind[] = ["town", "world-map", "region"];
  if (travel.includes(from.kind) && travel.includes(to.kind)) {
    return {
      effect: "clouds",
      direction: "in",
      title: to.title,
      subtitle: to.kind === "region" ? regionSubtitle(to) : undefined,
      element: to.element,
      variant: from.kind === "region" && to.kind === "region" ? "pegasus" : undefined,
    };
  }

  return null;
};
