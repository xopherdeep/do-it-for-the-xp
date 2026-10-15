import { RouteLocationNormalized, Router } from "vue-router";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import { metadataForAsync } from "@/lib/engine/temples/templeRegistry";
import debug from "@/lib/utils/debug";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";

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

interface BgmPayloadOptions {
  track?: number | "random";
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

// Counts guard runs, so an async pick can tell a newer navigation has superseded it
let guardRun = 0;

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
  options: BgmPayloadOptions
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
  "xp-demo": { key: "demo", options: { track: "random", saveBookmark: false } },
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
  "town-hall": { key: "townHall", options: { track: "random" } },
  "world-map": {
    key: "world",
    options: { track: "random", saveBookmark: false },
  },
  shop: { key: "shop", options: { track: "random", saveBookmark: false } },
  "game-over": { key: "gameover", options: { track: "random", saveBookmark: false } },
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

// ============================================================================
// GUARD
// ============================================================================

/**
 * Manages background music based on current route.
 */
export function handleBgmGuard(to: RouteLocationNormalized, router?: Router): void {
  // Each run supersedes the one before: an async pick (generated temple) from an earlier route must not play
  const run = ++guardRun;
  const audioStore = useAudioStore();
  const gameStore = useGameStore();

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

  // 1. Check area-based BGM: Settings, the Compendium and the rest of the Game Master area each have their own music
  if (to.path.startsWith("/xp-settings")) {
    payload = createBgmPayload(BGM.settings, { track: "random", startDelay, saveBookmark: false });
  } else if (to.path.startsWith("/game-master/compendium")) {
    payload = createBgmPayload(BGM.compendium, { track: "random", startDelay, saveBookmark: false });
  } else if (to.path.startsWith("/game-master")) {
    payload = createBgmPayload(BGM.gameMaster, { track: "random", startDelay, saveBookmark: false });
  }
  // 2. Check simple route mappings
  else if (SIMPLE_BGM_ROUTES[routeName]) {
    const { key, options = {} } = SIMPLE_BGM_ROUTES[routeName];
    payload = createBgmPayload(BGM[key], { startDelay, ...options });
  }
  // 3a. A temple plays its own theme when it has one (BGM.temples["fire-temple"]), else the dungeon set
  else if (routeName === "temple" && BGM.temples?.[String(to.params.temple)]) {
    payload = createBgmPayload(BGM.temples[String(to.params.temple)], { track: "random", startDelay, saveBookmark: true });
  }
  // 3b. A generated temple (gen-<slug>) plays its element's theme (its record is in the TempleDb, so the pick is async)
  else if (routeName === "temple" && String(to.params.temple).startsWith("gen-")) {
    const fullPath = to.fullPath;
    void metadataForAsync(String(to.params.temple)).then((meta) => {
      const tracks = BGM.temples?.[`${meta.element}-temple`] ?? terrains?.dungeon;
      const picked = createBgmPayload(tracks, { track: "random", startDelay, saveBookmark: true });
      const play = () => {
        const hasNothingNewToPlay = !picked || (picked.tracks === bgm.tracks && bgm.is_on);
        if (hasNothingNewToPlay) return;
        changeBGM(audioStore, picked, true);
      };
      // The hero navigated on before the element resolved: the wrong track must not start
      if (run !== guardRun) return;
      const current = router?.currentRoute.value;
      const canPlayNow = !router || current?.fullPath === fullPath;
      if (canPlayNow) return play();
      // Still on the route being left (this guard runs before the navigation lands): play once it lands here
      const off = router.afterEach((landed, _from, failure) => {
        off();
        const shouldPlayOnLanding = !failure && run === guardRun && landed.fullPath === fullPath;
        if (shouldPlayOnLanding) play();
      });
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

  // Dispatch BGM change if payload was determined. The same playlist already playing (a hero
  // stepping out to the quest log and back into the temple) keeps playing: no new random pick, no restart.
  if (payload?.tracks?.length) {
    const isPlaylistAlreadyPlaying = payload.tracks === bgm.tracks && bgm.is_on;
    if (isPlaylistAlreadyPlaying) return;
    changeBGM(audioStore, payload, true);
  }
}
