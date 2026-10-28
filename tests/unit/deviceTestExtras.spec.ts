import { runDeviceExtras } from "@/lib/services/graphics/deviceTestExtras";
import { buildBuildingMeshData } from "@/components/organisms/BuildingModel/voxel/buildingShapes";
import { buildStageMeshData } from "@/components/organisms/StageModel/voxel/stageShapes";

/**
 * The speed test's extra measurements with a fake draw, a fake clock and a fake animation frame: the builder tile
 * batch, the Home Town mesh bake and the live canvas count. No WebGL here, so the thumbnailer gets an injected draw.
 */

jest.mock("@/components/organisms/BuildingModel/voxel/buildingShapes", () => ({ buildBuildingMeshData: jest.fn() }));
jest.mock("@/components/organisms/StageModel/voxel/stageShapes", () => ({ buildStageMeshData: jest.fn() }));

const FRAME_GAP_MS = 16;
const DRAW_MS = 5;
const BUILD_MS = 3;
const TILE_COUNT = 9;

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

  it("gives null ms for the town when a build throws", async () => {
    buildBuilding.mockImplementation(() => {
      throw new Error("bad shape");
    });
    const result = await runDeviceExtras({ now, raf, draw: slowDraw, countCanvases: () => 3 });
    expect(result.town).toEqual({ count: 8, ms: null });
    expect(result.canvases).toBe(3);
  });
});
