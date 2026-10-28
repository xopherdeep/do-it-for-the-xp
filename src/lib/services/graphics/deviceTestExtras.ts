// The "Test this device" extras: three measurements aimed at the screens likelier to hurt than the hero alone.
// (a) the builder's option tiles, drawn by the production thumbnailer (a batch of 9 skin tiles, request to last
// picture), (b) the Home Town mesh bake (CPU time of every building the town mounts plus the plains stage), and
// (c) how many canvases the page holds right now (free, and it shows whether earlier Ionic pages stay mounted).
// Never throws: a part that fails reports ms null, an abort leaves the later parts out.
// PRIVACY: memory only, the result is never stored or sent.
import { DEFAULT_LOOK, FANTASY_SKIN_TONES, REAL_SKIN_TONES } from "@/lib/hero-look/types";
import type { HeroLook } from "@/lib/hero-look/types";
import { createLookThumbnailer } from "@/components/organisms/HeroModel/useLookThumbnails";
import type { ThumbDraw } from "@/components/organisms/HeroModel/useLookThumbnails";
import { buildBuildingMeshData } from "@/components/organisms/BuildingModel/voxel/buildingShapes";
import { buildStageMeshData } from "@/components/organisms/StageModel/voxel/stageShapes";
import type { DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";

export type DeviceExtras = Pick<DeviceTestResult, "tiles" | "town" | "canvases">;

export interface DeviceExtrasOptions {
  now?: () => number;
  raf?: (callback: FrameRequestCallback) => number;
  countCanvases?: () => number;
  /** How the tiles are drawn; the production three.js renderer when left out (tests inject a fake) */
  draw?: ThumbDraw;
  signal?: AbortSignal;
}

const TILE_COUNT = 9;
const TILE_SIZE = 96;
/** The tiles give up waiting after this long, so a stuck device cannot hold the whole run */
const TILE_BUDGET_MS = 6000;
/** The buildings HomeTown.vue mounts (the Old House only while the move is on, counted anyway: it is the worst case) */
const TOWN_BUILDINGS = ["town-hall", "bank", "shop", "hospital", "hero-home", "old-house", "hotel"];
const TOWN_STAGE = "world-plains";

const tileLooks = (): HeroLook[] =>
  [...REAL_SKIN_TONES, ...FANTASY_SKIN_TONES].slice(0, TILE_COUNT).map((skin) => ({ ...DEFAULT_LOOK, skin }));

export async function runDeviceExtras(options: DeviceExtrasOptions = {}): Promise<DeviceExtras> {
  const now = options.now ?? (() => performance.now());
  const raf = options.raf ?? ((callback: FrameRequestCallback) => requestAnimationFrame(callback));
  const countCanvases = options.countCanvases ?? (() => document.querySelectorAll("canvas").length);
  const { signal } = options;
  const isAborted = (): boolean => !!signal?.aborted;
  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => {
      raf(() => resolve());
    });

  const measureTiles = async (): Promise<number | null> => {
    const looks = tileLooks();
    const thumbnailer = createLookThumbnailer({ draw: options.draw, schedule: (run) => void raf(run) });
    try {
      const start = now();
      for (;;) {
        const pictures = looks.map((look) => thumbnailer.get(look, "full", TILE_SIZE));
        const isFailed = !thumbnailer.supported.value;
        if (isFailed) return null;
        const isDone = pictures.every((picture) => picture !== "");
        if (isDone) return now() - start;
        const isOutOfTime = now() - start > TILE_BUDGET_MS;
        const isGivenUp = isOutOfTime || isAborted();
        if (isGivenUp) return null;
        await nextFrame();
      }
    } finally {
      // forceContextLoss, so the page does not keep a second GL context for the rest of the run
      thumbnailer.dispose();
    }
  };

  const measureTown = (): number | null => {
    try {
      const start = now();
      TOWN_BUILDINGS.forEach((id) => buildBuildingMeshData(id));
      buildStageMeshData(TOWN_STAGE);
      return now() - start;
    } catch {
      return null;
    }
  };

  const readCanvases = (): number | null => {
    try {
      return countCanvases();
    } catch {
      return null;
    }
  };

  const extras: DeviceExtras = {};
  if (isAborted()) return extras;
  try {
    extras.tiles = { count: TILE_COUNT, ms: await measureTiles() };
  } catch {
    extras.tiles = { count: TILE_COUNT, ms: null };
  }
  if (isAborted()) return extras;
  extras.town = { count: TOWN_BUILDINGS.length + 1, ms: measureTown() };
  if (isAborted()) return extras;
  extras.canvases = readCanvases();
  return extras;
}
