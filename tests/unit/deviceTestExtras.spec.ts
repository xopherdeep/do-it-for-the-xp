import { runDeviceExtras } from "@/lib/services/graphics/deviceTestExtras";
import { buildBuildingMeshData } from "@/components/organisms/BuildingModel/voxel/buildingShapes";
import { buildStageMeshData } from "@/components/organisms/StageModel/voxel/stageShapes";

/**
 * The speed test's extra measurements with a fake draw, a fake clock and a fake animation frame: the builder tile
 * batch, the Home Town mesh bake and the live canvas count. No WebGL here, so the thumbnailer gets an injected draw.
 */

// The real thumbnailer, with its dispose watched: the speed test must hand the GL context back
const mockDisposeSpy = jest.fn();
jest.mock("@/components/organisms/HeroModel/useLookThumbnails", () => {
  const actual = jest.requireActual("@/components/organisms/HeroModel/useLookThumbnails");
  return {
    ...actual,
    createLookThumbnailer: (options: unknown) => {
      const thumbnailer = actual.createLookThumbnailer(options);
      return {
        ...thumbnailer,
        dispose: () => {
          mockDisposeSpy();
          thumbnailer.dispose();
        },
      };
    },
  };
});
jest.mock("@/components/organisms/BuildingModel/voxel/buildingShapes", () => ({ buildBuildingMeshData: jest.fn() }));
jest.mock("@/components/organisms/StageModel/voxel/stageShapes", () => ({ buildStageMeshData: jest.fn() }));

const FRAME_GAP_MS = 16;
const DRAW_MS = 5;
const BUILD_MS = 3;
const TILE_COUNT = 9;
const BAKE_COUNT = 8;

describe("runDeviceExtras", () => {
  let clock = 0;
  const now = (): number => clock;
  const raf = (callback: FrameRequestCallback): number => {
    clock += FRAME_GAP_MS;
    callback(clock);
    return 1;
  };
  const buildBuilding = buildBuildingMeshData as jest.Mock;
  const buildStage = buildStageMeshData as jest.Mock;

  beforeEach(() => {
    clock = 0;
    mockDisposeSpy.mockClear();
    buildBuilding.mockReset().mockImplementation(() => {
      clock += BUILD_MS;
    });
    buildStage.mockReset().mockImplementation(() => {
      clock += BUILD_MS;
    });
  });

  const slowDraw = jest.fn(() => {
    clock += DRAW_MS;
    return "data:image/png;base64,x";
  });

  it("times the tile batch from the request to the last picture", async () => {
    slowDraw.mockClear();
    let lastDrawAt = 0;
    const draw = jest.fn(() => {
      slowDraw();
      lastDrawAt = clock;
      return "data:image/png;base64,x";
    });
    const result = await runDeviceExtras({ now, raf, draw, countCanvases: () => 2 });
    expect(draw).toHaveBeenCalledTimes(TILE_COUNT);
    expect(result.tiles?.count).toBe(TILE_COUNT);
    // the check that sees the last picture comes one animation frame after the draw that made it
    expect(result.tiles?.ms).toBe(lastDrawAt + FRAME_GAP_MS);
    expect(result.tiles?.ms).toBeGreaterThanOrEqual(TILE_COUNT * DRAW_MS);
  });

  it("sums the Home Town builds and counts them, the plains stage included", async () => {
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 0 });
    expect(buildBuilding.mock.calls.map((call) => call[0])).toEqual([
      "town-hall",
      "bank",
      "shop",
      "hospital",
      "hero-home",
      "old-house",
      "hotel",
    ]);
    expect(buildStage).toHaveBeenCalledWith("world-plains");
    expect(result.town).toEqual({ count: 8, ms: 8 * BUILD_MS });
  });

  it("reads the injected canvas counter", async () => {
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 7 });
    expect(result.canvases).toBe(7);
  });

  it("gives null for a counter that throws", async () => {
    const result = await runDeviceExtras({
      now,
      raf,
      draw: slowDraw,
      countCanvases: () => {
        throw new Error("no document");
      },
    });
    expect(result.canvases).toBeNull();
  });

  it("stops early on an abort and leaves the later parts out", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 1, signal: controller.signal });
    expect(result.town).toBeUndefined();
    expect(result.canvases).toBeUndefined();
    expect(buildBuilding).not.toHaveBeenCalled();
  });

  it("gives null ms for tiles when the draw throws, and still measures the rest", async () => {
    const broken = jest.fn(() => {
      throw new Error("lost context");
    });
    const result = await runDeviceExtras({ now, raf, draw: broken, countCanvases: () => 3 });
    expect(result.tiles).toEqual({ count: TILE_COUNT, ms: null });
    expect(result.town?.ms).toBe(8 * BUILD_MS);
    expect(result.canvases).toBe(3);
  });

  it("releases the thumbnailer after a normal run", async () => {
    await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 1 });
    expect(mockDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it("releases the thumbnailer when the draw throws", async () => {
    const broken = jest.fn(() => {
      throw new Error("lost context");
    });
    await runDeviceExtras({ now, raf, draw: broken, countCanvases: () => 1 });
    expect(mockDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it("gives up waiting for the tiles after the cap, and the run still resolves", async () => {
    const TILE_CAP_PASSED_MS = 7000;
    const neverFinishes = jest.fn(() => "");
    const jumpPastCap = (callback: FrameRequestCallback): number => {
      clock += TILE_CAP_PASSED_MS;
      callback(clock);
      return 1;
    };
    const result = await runDeviceExtras({ now, raf: jumpPastCap, draw: neverFinishes, countCanvases: () => 4 });
    expect(result.tiles).toEqual({ count: TILE_COUNT, ms: null });
    expect(result.town?.ms).toBe(8 * BUILD_MS);
    expect(result.canvases).toBe(4);
    expect(mockDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it("gives null ms for the town when a build throws", async () => {
    buildBuilding.mockImplementation(() => {
      throw new Error("bad shape");
    });
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 3 });
    expect(result.town).toEqual({ count: 8, ms: null });
    expect(result.canvases).toBe(3);
  });

  it("gives null ms for the whole town when a bake throws part way, and bakes no further", async () => {
    buildBuilding.mockImplementation((id: string) => {
      const isTheBadShape = id === "hospital";
      if (isTheBadShape) throw new Error("bad shape");
      clock += BUILD_MS;
    });
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 3 });
    // no half sum of the three bakes that worked, the later part still runs, and the town stops at the failure
    expect(result.town).toEqual({ count: BAKE_COUNT, ms: null });
    expect(result.canvases).toBe(3);
    expect(buildBuilding.mock.calls.map((call) => call[0])).toEqual(["town-hall", "bank", "shop", "hospital"]);
    expect(buildStage).not.toHaveBeenCalled();
  });

  describe("when the frames and the bakes are slow", () => {
    const SLOW_FRAME_MS = 50;
    const SLOW_BAKE_MS = 10;
    let events: string[] = [];
    const slowFrame = (callback: FrameRequestCallback): number => {
      events.push("frame");
      clock += SLOW_FRAME_MS;
      callback(clock);
      return 1;
    };

    beforeEach(() => {
      events = [];
      const slowBake = (): void => {
        events.push("bake");
        clock += SLOW_BAKE_MS;
      };
      buildBuilding.mockImplementation(slowBake);
      buildStage.mockImplementation(slowBake);
    });

    it("gives the page an animation frame before every Home Town bake", async () => {
      await runDeviceExtras({ now, raf: slowFrame, draw: slowDraw, countCanvases: () => 0 });
      // the town's first frame is the one right before its first bake: the tiles drew in the frames before that
      const townEvents = events.slice(events.indexOf("bake") - 1);
      expect(townEvents).toEqual(Array.from({ length: BAKE_COUNT }, () => ["frame", "bake"]).flat());
    });

    it("adds up the time of each bake and leaves the frame waits out of the figure", async () => {
      const result = await runDeviceExtras({ now, raf: slowFrame, draw: slowDraw, countCanvases: () => 0 });
      // eight bakes of 10 ms: the eight 50 ms frames between them are the browser's time, not the bake's
      expect(result.town).toEqual({ count: BAKE_COUNT, ms: BAKE_COUNT * SLOW_BAKE_MS });
    });
  });

  it.each([2, 7])("stops the town part when the signal aborts in the frame after %i bakes", async (bakesBefore) => {
    const controller = new AbortController();
    const bakesDone = (): number => buildBuilding.mock.calls.length + buildStage.mock.calls.length;
    // The tiles draw while no bake has run, so a frame that sees one or more bakes done is a town frame
    const abortInTownFrame = (callback: FrameRequestCallback): number => {
      const isTheFrame = bakesDone() === bakesBefore;
      if (isTheFrame) controller.abort();
      return raf(callback);
    };
    const result = await runDeviceExtras({
      now,
      raf: abortInTownFrame,
      draw: slowDraw,
      countCanvases: () => 1,
      signal: controller.signal,
    });
    // the figure is dropped, no bake starts once the abort has landed, and the later part stays out
    expect(result.town).toEqual({ count: BAKE_COUNT, ms: null });
    expect(bakesDone()).toBe(bakesBefore);
    expect(result.canvases).toBeUndefined();
  });
});
