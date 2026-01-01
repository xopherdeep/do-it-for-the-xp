import { RouteLocationNormalized } from "vue-router";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
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
      ? Math.floor(Math.random() * tracks.length)
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
  "battleroom-dev",
  "battle-field",
  "battle-field-with-participants",
  "battle-field-temple",
  "battle-field-quest",
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

  // Dispatch BGM change if payload was determined
  if (payload?.tracks?.length) {
    changeBGM(audioStore, payload, true);
  }
}
