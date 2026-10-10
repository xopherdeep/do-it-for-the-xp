import { RouteLocationNormalized } from "vue-router";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import { metadataForAsync } from "@/lib/engine/temples/templeRegistry";
import debug from "@/lib/utils/debug";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";

// ============================================================================
// TYPES
// ============================================================================

interface BgmPayload {
  tracks: string[];
  track: number;
  startDelay: number;
  saveBookmark?: boolean;
  repeat?: boolean;
}

interface SimpleBgmRouteConfig {
  key: string;
  options?: {
    track?: number | "random";
    saveBookmark?: boolean;
    repeat?: boolean;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidTrackList(tracks: unknown): tracks is string[] {
  return Array.isArray(tracks) && tracks.length > 0;
}

// The last random pick per playlist, so two fights in a row never get the same song
const lastRandomPick = new WeakMap<object, number>();

/** A random track index that differs from the playlist's previous random pick (when it has more than one). */
export function pickFreshTrack(tracks: unknown[]): number {
  if (tracks.length < 2) return 0;
  const last = lastRandomPick.get(tracks);
  let index = Math.floor(Math.random() * tracks.length);
  if (index === last) index = (index + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length;
  lastRandomPick.set(tracks, index);
  return index;
}

function createBgmPayload(
  tracks: unknown,
  options: {
    track?: number | "random";
    startDelay: number;
    saveBookmark?: boolean;
    repeat?: boolean;
  }
): BgmPayload | null {
  if (!isValidTrackList(tracks)) return null;

  const trackIndex =
    options.track === "random"
      ? pickFreshTrack(tracks)
      : options.track ?? 0;

  return {
    tracks,
    track: trackIndex,
    startDelay: options.startDelay,
    ...(options.saveBookmark !== undefined && {
      saveBookmark: options.saveBookmark,
    }),
    ...(options.repeat !== undefined && { repeat: options.repeat }),
  };
}

// ============================================================================
// ROUTE MAPPINGS
// ============================================================================

/** Route-to-track mapping for simple routes */
const SIMPLE_BGM_ROUTES: Record<string, SimpleBgmRouteConfig> = {
  "xp-intro": { key: "intro", options: { saveBookmark: false } },
  "xp-demo": { key: "demo", options: { saveBookmark: false } },
  "log-in": {
    key: "startScreen",
    options: { repeat: false, saveBookmark: false },
  },
  "log-out": {
    key: "startScreen",
    options: { repeat: false, saveBookmark: false },
  },
  "xp-profile": { key: "chooseFile", options: { saveBookmark: false } },
  "my-portal": { key: "chooseFile", options: { saveBookmark: false } },
  "my-home": { key: "home" },
  "home-town": { key: "hometown", options: { track: "random" } },
  hospital: { key: "hospital" },
  bank: { key: "hotel" },
  hotel: { key: "hotel" },
  "world-map": {
    key: "world",
    options: { track: "random", saveBookmark: false },
  },
  shop: { key: "shop", options: { saveBookmark: false } },
  "game-over": { key: "gameover", options: { saveBookmark: false } },
};

/** Terrain-to-world route mapping */
const TERRAIN_BGM_ROUTES: Record<string, string> = {
  "world-plains": "plains",
  "world-desert": "desert",
  "world-sands": "desert",
  "world-ice": "snow",
  "world-swamps": "swamp",
  "world-mountains": "mountains",
  "world-forest": "forest",
  "world-islands": "islands",
  "world-urban": "urban",
  "world-city": "urban",
  "the-moon": "moon",
  "world-clouds": "clouds",
  "world-cave": "cave",
  temple: "dungeon",
};

/** Battle-related routes */
const BATTLE_BGM_ROUTES = [
  "battle-quest",
  "battle-temple",
  "battle-free",
] as const;

// ============================================================================
// GUARD
// ============================================================================

/**
 * Manages background music based on current route.
 */
export function handleBgmGuard(to: RouteLocationNormalized): void {
  const audioStore = useAudioStore();
  const gameStore = useGameStore();
  const battleStore = useBattleStore();

  const bgm = audioStore.bgm;
  const rpgTheme = gameStore.theme?.rpg;
  const BGM = bgm?.$fx?.rpg?.[rpgTheme]?.BGM;

  if (!BGM) {
    debug.warn("BGM data is missing, some music features may not work.");
    return;
  }

  const startDelay = 333;
  const terrains = BGM?.worlds?.terrains;
  const routeName = to.name as string;

  let payload: BgmPayload | null = null;

  // 1. Check area-based BGM (e.g., entire Game Master area)
  if (to.path.startsWith("/game-master")) {
    payload = createBgmPayload(BGM.chooseFile, {
      startDelay,
      saveBookmark: false,
    });
  }
  // 2. Check simple route mappings
  else if (SIMPLE_BGM_ROUTES[routeName]) {
    const { key, options = {} } = SIMPLE_BGM_ROUTES[routeName];
    payload = createBgmPayload(BGM[key], { startDelay, ...options });
  }
  // 3a. A temple plays its own theme when it has one (BGM.temples["fire-temple"]), else the dungeon set
  else if (routeName === "temple" && BGM.temples?.[String(to.params.temple)]) {
    payload = createBgmPayload(BGM.temples[String(to.params.temple)], { startDelay, saveBookmark: true });
  }
  // 3b. A generated temple (gen-<slug>) plays its element's theme (its record is in the TempleDb, so the pick is async)
  else if (routeName === "temple" && String(to.params.temple).startsWith("gen-")) {
    void metadataForAsync(String(to.params.temple)).then((meta) => {
      const tracks = BGM.temples?.[`${meta.element}-temple`] ?? terrains?.dungeon;
      const picked = createBgmPayload(tracks, { track: "random", startDelay, saveBookmark: true });
      if (!picked || (picked.tracks === bgm.tracks && bgm.is_on)) return;
      changeBGM(audioStore, picked, true);
    });
  }
  // 3. Check terrain routes
  else if (TERRAIN_BGM_ROUTES[routeName]) {
    const terrainKey = TERRAIN_BGM_ROUTES[routeName];
    payload = createBgmPayload(terrains?.[terrainKey], {
      track: "random",
      startDelay,
      saveBookmark: true,
    });
  }
  // 4. Check battle routes
  else if (
    BATTLE_BGM_ROUTES.includes(routeName as (typeof BATTLE_BGM_ROUTES)[number])
  ) {
    payload = createBgmPayload(BGM.battle, {
      track: "random",
      startDelay: battleStore.bgmWaitToStart || startDelay,
      saveBookmark: true,
    });
  }

  // Dispatch BGM change if payload was determined. The same playlist already playing (a hero
  // stepping out to the quest log and back into the temple) keeps playing: no new random pick, no restart.
  if (payload?.tracks?.length) {
    if (payload.tracks === bgm.tracks && bgm.is_on) return;
    changeBGM(audioStore, payload, true);
  }
}
