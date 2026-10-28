import * as THREE from "three";
import { runDeviceTest } from "@/lib/services/graphics/deviceTest";
import { setVoxelTier } from "@/lib/services/graphics/deviceQuality";

/**
 * The speed test's runner with a fake WebGL renderer, a fake clock and a fake animation frame: the grid of five render
 * configs (six when a tier other than Super is chosen), what the meter is fed (render work, never the gap between
 * frames) and how the run stops early.
 */

jest.mock("three", () => {
  const actual = jest.requireActual("three");
  return {
    __esModule: true,
    ...actual,
    WebGLRenderer: jest.fn(),
  };
});

const MockRenderer = THREE.WebGLRenderer as unknown as jest.Mock;

const RENDER_MS = 4;
const FRAME_GAP_MS = 16;
// Work per frame in the slow-device specs: 400 ms is over the meter's default 250 ms stall limit, which used to drop
// every frame of a device this slow; 3000 ms is so slow that the hard cap, not the frame count, ends a config
const SLOW_RENDER_MS = 400;
const FAST_RENDER_MS = 8;
const HUGE_RENDER_MS = 3000;
// The runner's own numbers (deviceTest.ts keeps them private): its default frame count, the frames the meter drops as
// warm-up and the frames it needs kept before it reports anything
const FRAMES = 60;
const WARMUP_FRAMES = 3;
const MIN_KEPT_FRAMES = 5;

interface FakeRenderer {
  setSize: jest.Mock;
  setPixelRatio: jest.Mock;
  setClearColor: jest.Mock;
  shadowMap: { enabled: boolean };
  render: jest.Mock;
  dispose: jest.Mock;
  forceContextLoss: jest.Mock;
  getContext: jest.Mock;
}

describe("runDeviceTest", () => {
  let clock = 0;
  let renderMs = RENDER_MS; // what one render costs on the fake clock; the slow-device specs raise it
  let renderers: FakeRenderer[] = [];
  const now = (): number => clock;
  const raf = (callback: FrameRequestCallback): number => {
    clock += FRAME_GAP_MS;
    callback(clock);
    return 1;
  };
  const createCanvas = (): HTMLCanvasElement => document.createElement("canvas");
  /** Frames the loop drew on one renderer: every render but the first, which is timed apart as firstRenderMs */
  const drawnFrames = (renderer: FakeRenderer): number => renderer.render.mock.calls.length - 1;
  const originalDpr = window.devicePixelRatio;

  afterEach(() => {
    window.devicePixelRatio = originalDpr;
    setVoxelTier("super");
  });

  beforeEach(() => {
    clock = 0;
    renderMs = RENDER_MS;
    renderers = [];
    window.devicePixelRatio = 2;
    MockRenderer.mockReset();
    MockRenderer.mockImplementation(function () {
      const renderer: FakeRenderer = {
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        setClearColor: jest.fn(),
        shadowMap: { enabled: false },
        render: jest.fn(() => {
          clock += renderMs;
        }),
        dispose: jest.fn(),
        forceContextLoss: jest.fn(),
        getContext: jest.fn(() => ({ finish: jest.fn(), readPixels: jest.fn() })),
      };
      renderers.push(renderer);
      return renderer;
    });
  });

  it("runs the five configs in order on Super, with no chosen line, and frees each context", async () => {
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 30 });
    expect(result.aborted).toBe(false);
    expect(result.tier).toBe("super");
    expect(result.configs.map((c) => c.id)).toEqual(["today", "noMsaa", "noMsaaDpr1", "noMsaaDpr1Simple", "noMsaaDpr1Flat"]);
    expect(result.configs.every((c) => c.supported)).toBe(true);
    expect(renderers).toHaveLength(5);
    renderers.forEach((r) => expect(r.forceContextLoss).toHaveBeenCalledTimes(1));
    renderers.forEach((r) => expect(r.dispose).toHaveBeenCalledTimes(1));
    expect(result.coldBuildMs).not.toBeNull();
    expect(result.configs[0].buildMs).not.toBeNull();
    expect(result.configs[0].rendererMs).not.toBeNull();
    expect(result.configs[0].firstRenderMs).not.toBeNull();
  });

  it("turns MSAA off from the second config and the pixel ratio down to 1 from the third", async () => {
    await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12 });
    const antialias = MockRenderer.mock.calls.map(([options]) => options.antialias);
    expect(antialias).toEqual([false, false, false, false, false]); // a ratio of 2 already turns it off on today's config
    const ratios = renderers.map((r) => r.setPixelRatio.mock.calls[0][0]);
    expect(ratios).toEqual([2, 2, 1, 1, 1]);
  });

  it("adds the chosen config on Classic: six configs, MSAA off and a pixel ratio of 1.5 at a ratio of 2", async () => {
    setVoxelTier("classic");
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12 });
    expect(result.tier).toBe("classic");
    expect(result.configs.map((c) => c.id)).toEqual([
      "today",
      "noMsaa",
      "noMsaaDpr1",
      "noMsaaDpr1Simple",
      "noMsaaDpr1Flat",
      "chosen",
    ]);
    expect(renderers).toHaveLength(6);
    expect(MockRenderer.mock.calls[5][0].antialias).toBe(false);
    expect(renderers[5].setPixelRatio.mock.calls[0][0]).toBe(1.5);
    renderers.forEach((r) => expect(r.forceContextLoss).toHaveBeenCalledTimes(1));
  });

  it("runs the chosen config uncapped, like the others", async () => {
    setVoxelTier("pocket");
    renderMs = FAST_RENDER_MS;
    await runDeviceTest({ now, raf, createCanvas, framesPerConfig: FRAMES });
    expect(renderers).toHaveLength(6);
    expect(renderers[5].setPixelRatio.mock.calls[0][0]).toBe(1);
    expect(drawnFrames(renderers[5])).toBe(FRAMES);
  });

  it("keeps MSAA on for today's config on a 1x screen", async () => {
    window.devicePixelRatio = 1;
    await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12 });
    const antialias = MockRenderer.mock.calls.map(([options]) => options.antialias);
    expect(antialias).toEqual([true, false, false, false, false]);
  });

  it("feeds the meter render work, not the gap between frames", async () => {
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 30 });
    const work = result.configs[1].work;
    expect(work.medianMs).toBe(RENDER_MS);
    expect(work.worstMs).toBe(RENDER_MS);
    // fps comes from frames over elapsed time, which does include the gap
    const fps = result.configs[1].fps as number;
    expect(fps).toBeCloseTo(1000 / (RENDER_MS + FRAME_GAP_MS), 0);
  });

  it("measures frames that take 400 ms of work instead of dropping them as stalls", async () => {
    renderMs = SLOW_RENDER_MS;
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: FRAMES });
    result.configs.forEach((config) => {
      expect(config.work.medianMs).toBe(SLOW_RENDER_MS);
      expect(config.work.p95Ms).toBe(SLOW_RENDER_MS);
      expect(config.work.worstMs).toBe(SLOW_RENDER_MS);
    });
  });

  it("stops drawing once the time budget is spent on slow frames, keeping enough to read", async () => {
    renderMs = SLOW_RENDER_MS;
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: FRAMES });
    expect(result.aborted).toBe(false);
    expect(result.configs).toHaveLength(5);
    renderers.forEach((r) => {
      expect(drawnFrames(r)).toBeLessThan(FRAMES);
      expect(drawnFrames(r)).toBeGreaterThanOrEqual(WARMUP_FRAMES + MIN_KEPT_FRAMES);
    });
    result.configs.forEach((config) => expect(config.work.count).toBeGreaterThanOrEqual(MIN_KEPT_FRAMES));
  });

  it("still draws every frame on a fast device, dropping only the warm-up ones", async () => {
    renderMs = FAST_RENDER_MS;
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: FRAMES });
    renderers.forEach((r) => expect(drawnFrames(r)).toBe(FRAMES));
    result.configs.forEach((config) => expect(config.work.count).toBe(FRAMES - WARMUP_FRAMES));
  });

  it("gives up at the hard cap when each frame takes seconds, and still resolves with the frames it drew", async () => {
    renderMs = HUGE_RENDER_MS;
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: FRAMES });
    expect(result.aborted).toBe(false);
    expect(result.configs).toHaveLength(5);
    renderers.forEach((r) => {
      expect(drawnFrames(r)).toBeGreaterThan(0);
      expect(drawnFrames(r)).toBeLessThan(WARMUP_FRAMES + MIN_KEPT_FRAMES);
    });
    result.configs.forEach((config) => {
      expect(config.work.medianMs).toBeNull(); // too few frames to read: reported as unknown, not as a made up number
      expect(config.fps).toBeGreaterThan(0);
    });
  });

  it("stops early when the signal is aborted", async () => {
    const controller = new AbortController();
    const onProgress = jest.fn((progress: { index: number }) => {
      const isSecond = progress.index === 1;
      if (isSecond) controller.abort();
    });
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12, signal: controller.signal, onProgress });
    expect(result.aborted).toBe(true);
    expect(result.configs.map((c) => c.id)).toEqual(["today"]);
    renderers.forEach((r) => expect(r.forceContextLoss).toHaveBeenCalledTimes(1));
  });

  it("stops early when the page is hidden", async () => {
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true);
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12 });
    hidden.mockRestore();
    expect(result.aborted).toBe(true);
    expect(result.configs).toHaveLength(0);
  });

  it("stops at once when the signal aborts while a frame is pending and frees the context", async () => {
    const controller = new AbortController();
    const stalledRaf = (): number => 1; // a backgrounded app: the frame never arrives
    const run = runDeviceTest({ now, raf: stalledRaf, createCanvas, framesPerConfig: 12, signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    const result = await run;
    expect(result.aborted).toBe(true);
    expect(result.configs).toHaveLength(0);
    expect(renderers).toHaveLength(1);
    expect(renderers[0].forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("stops at once when the page goes hidden while a frame is pending", async () => {
    const stalledRaf = (): number => 1;
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(false);
    const run = runDeviceTest({ now, raf: stalledRaf, createCanvas, framesPerConfig: 12 });
    await Promise.resolve();
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    const result = await run;
    hidden.mockRestore();
    expect(result.aborted).toBe(true);
    expect(result.configs).toHaveLength(0);
    expect(renderers).toHaveLength(1);
    expect(renderers[0].forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("records an unsupported config when drawing throws, keeping the configs measured before", async () => {
    let calls = 0;
    MockRenderer.mockImplementation(function () {
      const renderer: FakeRenderer = {
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        setClearColor: jest.fn(),
        shadowMap: { enabled: false },
        render: jest.fn(() => {
          calls += 1;
          const isSecond = renderers.length === 2;
          if (isSecond) throw new Error("shader failed");
          clock += RENDER_MS;
        }),
        dispose: jest.fn(),
        forceContextLoss: jest.fn(),
        getContext: jest.fn(() => ({ finish: jest.fn(), readPixels: jest.fn() })),
      };
      renderers.push(renderer);
      return renderer;
    });
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 5 });
    expect(calls).toBeGreaterThan(0);
    expect(result.configs.map((c) => [c.id, c.supported])).toEqual([
      ["today", true],
      ["noMsaa", false],
    ]);
    renderers.forEach((r) => expect(r.forceContextLoss).toHaveBeenCalledTimes(1));
  });

  it("records an unsupported config and runs no further ones when the renderer cannot open", async () => {
    MockRenderer.mockReset();
    MockRenderer.mockImplementation(() => {
      throw new Error("no webgl");
    });
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 12 });
    expect(result.configs).toHaveLength(1);
    expect(result.configs[0]).toMatchObject({ id: "today", supported: false, rendererMs: null, buildMs: null, firstRenderMs: null, fps: null });
    expect(result.aborted).toBe(false);
    expect(MockRenderer).toHaveBeenCalledTimes(1);
  });

  it("frees the context and records the config as unsupported when setting up the renderer throws", async () => {
    MockRenderer.mockImplementation(function () {
      const renderer: FakeRenderer = {
        setSize: jest.fn(() => {
          throw new Error("context lost");
        }),
        setPixelRatio: jest.fn(),
        setClearColor: jest.fn(),
        shadowMap: { enabled: false },
        render: jest.fn(),
        dispose: jest.fn(),
        forceContextLoss: jest.fn(),
        getContext: jest.fn(() => ({ finish: jest.fn(), readPixels: jest.fn() })),
      };
      renderers.push(renderer);
      return renderer;
    });
    const result = await runDeviceTest({ now, raf, createCanvas, framesPerConfig: 5 });
    expect(result.configs.map((c) => [c.id, c.supported])).toEqual([["today", false]]);
    expect(renderers).toHaveLength(1);
    expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    expect(renderers[0].forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("keeps waiting when the page becomes visible again instead of drawing an unpaced frame", async () => {
    const stalledRaf = (): number => 1;
    const controller = new AbortController();
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(false);
    const run = runDeviceTest({ now, raf: stalledRaf, createCanvas, framesPerConfig: 12, signal: controller.signal });
    await Promise.resolve();
    document.dispatchEvent(new Event("visibilitychange")); // visible: must not end the wait
    await Promise.resolve();
    await Promise.resolve();
    expect(renderers[0].render).toHaveBeenCalledTimes(1); // the first render only, no frame was drawn
    controller.abort();
    const result = await run;
    hidden.mockRestore();
    expect(result.aborted).toBe(true);
    expect(renderers[0].render).toHaveBeenCalledTimes(1);
  });
});
