import * as THREE from "three";
import { mount } from "@vue/test-utils";
import { computed, defineComponent } from "vue";
import {
  createLookThumbnailer,
  createThreeDraw,
  useLookThumbnails,
} from "@/components/organisms/HeroModel/useLookThumbnails";
import type { LookThumbnailer } from "@/components/organisms/HeroModel/useLookThumbnails";
import type { SnapshotFraming } from "@/components/organisms/HeroModel/heroCamera";
import { withoutHands } from "@/components/organisms/HeroModel/lookEditor";
import { groupMesh } from "@/components/organisms/HeroModel/voxel/build";
import { DEFAULT_LOOK, type HeroLook } from "@/lib/hero-look/types";

/**
 * The hidden thumbnail renderer without WebGL: the queue, the cache and the give-up rules run against a fake
 * `draw` and a manual scheduler (one flush = one animation frame); the three.js side runs against a fake renderer.
 */

/** `new THREE.WebGLRenderer` builds this fake when a spec sets it, and the real renderer (which jsdom cannot start) otherwise */
let mockRenderer: (() => unknown) | null = null;
jest.mock("three", () => {
  const actual = jest.requireActual("three");
  return {
    __esModule: true,
    ...actual,
    WebGLRenderer: jest.fn(function (...args: unknown[]) {
      return mockRenderer ? mockRenderer() : new actual.WebGLRenderer(...args);
    }),
  };
});

const look = (n: number): HeroLook => ({ ...DEFAULT_LOOK, hairColor: `#00000${n}` });

const manualFrames = () => {
  const runs: (() => void)[] = [];
  return {
    runs,
    schedule: (run: () => void) => {
      runs.push(run);
    },
    flush: () => runs.shift()?.(),
  };
};

const fakeDraw = () => jest.fn((_look: HeroLook, _framing: SnapshotFraming, _size: number) => "data:image/png;fake");
const drawnHair = (draw: ReturnType<typeof fakeDraw>) => draw.mock.calls.map(([drawn]) => drawn.hairColor);

/** Just what renderHeroSnapshot and the thumbnailer touch on a renderer */
const fakeRenderer = () => ({
  getRenderTarget: jest.fn(() => null),
  setRenderTarget: jest.fn(),
  setClearColor: jest.fn(),
  clear: jest.fn(),
  render: jest.fn(),
  readRenderTargetPixels: jest.fn(),
  dispose: jest.fn(),
  forceContextLoss: jest.fn(),
});

/** jsdom has no 2D canvas, so the pixel read-back writes into a fake one */
const stubCanvas = () => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: jest.fn(),
  } as never);
  jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;shot");
};

afterEach(() => {
  mockRenderer = null;
  jest.restoreAllMocks();
  (THREE.WebGLRenderer as unknown as jest.Mock).mockClear();
});

describe("createLookThumbnailer", () => {
  it("returns nothing at first, then the picture once a frame has run", () => {
    const { schedule, flush } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule });

    expect(thumbs.get(DEFAULT_LOOK, "bust")).toBe("");
    expect(draw).not.toHaveBeenCalled();

    flush();

    expect(thumbs.get(DEFAULT_LOOK, "bust")).toBe("data:image/png;fake");
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledWith(withoutHands(DEFAULT_LOOK), "bust", 96);
  });

  it("draws a look once however often it is asked for", () => {
    const { schedule, flush, runs } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule });
    const holding = { ...DEFAULT_LOOK, leftHand: "sword" };

    thumbs.get(DEFAULT_LOOK, "bust");
    thumbs.get(holding, "bust");
    thumbs.get(DEFAULT_LOOK, "bust");
    expect(runs).toHaveLength(1);
    flush();
    thumbs.get(holding, "bust");

    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw.mock.calls[0][0]).not.toHaveProperty("leftHand");
    expect(runs).toHaveLength(0);
  });

  it("keeps framing and size apart", () => {
    const { schedule, flush } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule });

    thumbs.get(DEFAULT_LOOK, "bust");
    thumbs.get(DEFAULT_LOOK, "full");
    thumbs.get(DEFAULT_LOOK, "bust", 128);
    flush();

    expect(draw.mock.calls.map(([, framing, size]) => `${framing}${size}`).sort()).toEqual(["bust128", "bust96", "full96"]);
  });

  it("draws three per frame, newest first", () => {
    const { schedule, flush, runs } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule });

    [1, 2, 3, 4].forEach((n) => thumbs.get(look(n), "bust"));
    expect(runs).toHaveLength(1);

    flush();
    expect(drawnHair(draw)).toEqual(["#000004", "#000003", "#000002"]);
    expect(runs).toHaveLength(1);

    flush();
    expect(drawnHair(draw)).toEqual(["#000004", "#000003", "#000002", "#000001"]);
    expect(runs).toHaveLength(0);
  });

  it("moves a look asked for again to the front of the line", () => {
    const { schedule, flush } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule, perFrame: 1 });

    thumbs.get(look(1), "bust");
    thumbs.get(look(2), "bust");
    thumbs.get(look(1), "bust");
    flush();

    expect(drawnHair(draw)).toEqual(["#000001"]);
  });

  it("gives up and reports unsupported when drawing throws", () => {
    const { schedule, flush, runs } = manualFrames();
    const draw = jest.fn(() => {
      throw new Error("context lost");
    });
    const thumbs = createLookThumbnailer({ draw, schedule });
    expect(thumbs.supported.value).toBe(true);

    thumbs.get(look(1), "bust");
    thumbs.get(look(2), "bust");
    flush();

    expect(thumbs.supported.value).toBe(false);
    expect(runs).toHaveLength(0);
    expect(thumbs.get(look(3), "bust")).toBe("");
    expect(thumbs.get(look(1), "bust")).toBe("");
    flush();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("reports unsupported when there is no draw to use", () => {
    const { schedule, flush } = manualFrames();
    const thumbs = createLookThumbnailer({ draw: null, schedule });

    expect(thumbs.get(DEFAULT_LOOK, "bust")).toBe("");
    flush();

    expect(thumbs.supported.value).toBe(false);
  });

  it("forgets the oldest picture past the cache size", () => {
    const { schedule, flush } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule, cacheSize: 2 });

    [1, 2, 3].forEach((n) => {
      thumbs.get(look(n), "bust");
      flush();
    });
    expect(draw).toHaveBeenCalledTimes(3);

    expect(thumbs.get(look(3), "bust")).not.toBe("");
    expect(thumbs.get(look(2), "bust")).not.toBe("");
    expect(draw).toHaveBeenCalledTimes(3);

    expect(thumbs.get(look(1), "bust")).toBe("");
    flush();
    expect(draw).toHaveBeenCalledTimes(4);
    expect(draw).toHaveBeenLastCalledWith(look(1), "bust", 96);
  });

  it("stops drawing after dispose", () => {
    const { schedule, flush } = manualFrames();
    const draw = fakeDraw();
    const thumbs = createLookThumbnailer({ draw, schedule });

    thumbs.get(look(1), "bust");
    thumbs.get(look(2), "bust");
    thumbs.dispose();
    flush();

    expect(thumbs.get(look(3), "bust")).toBe("");
    flush();
    expect(draw).not.toHaveBeenCalled();
  });

  it("is reactive: a computed over get changes when the picture lands", () => {
    const { schedule, flush } = manualFrames();
    const thumbs = createLookThumbnailer({ draw: fakeDraw(), schedule });
    const tile = computed(() => thumbs.get(DEFAULT_LOOK, "bust"));

    expect(tile.value).toBe("");
    flush();

    expect(tile.value).toBe("data:image/png;fake");
  });

  it("reports unsupported in a browser with no WebGL", () => {
    mockRenderer = null;
    const { schedule, flush } = manualFrames();
    // jsdom has no canvas and three.js logs the failed context; only this spec is allowed to hush that
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const thumbs = createLookThumbnailer({ schedule });

      expect(thumbs.get(DEFAULT_LOOK, "bust")).toBe("");
      flush();

      expect(thumbs.supported.value).toBe(false);
      expect(thumbs.get(DEFAULT_LOOK, "bust")).toBe("");
    } finally {
      error.mockRestore();
      warn.mockRestore();
    }
  });
});

describe("createThreeDraw", () => {
  it("is null when the renderer cannot start", () => {
    mockRenderer = () => {
      throw new Error("no WebGL");
    };

    expect(createThreeDraw()).toBeNull();
  });

  it("draws every look with one renderer, takes each hero out of the scene, and frees the context on dispose", () => {
    stubCanvas();

    const renderer = fakeRenderer();
    const sceneSizes: number[] = [];
    const headGeometries: THREE.BufferGeometry[] = [];
    renderer.render.mockImplementation((scene: THREE.Scene) => {
      sceneSizes.push(scene.children.length);
      const hero = scene.children.find((child) => child.userData.heroRig)!;
      const head = groupMesh(hero, "head")!;
      headGeometries.push(head.geometry);
      jest.spyOn(head.geometry, "dispose");
    });
    mockRenderer = () => renderer;

    const three = createThreeDraw()!;
    expect(three.draw(DEFAULT_LOOK, "bust", 8)).toBe("data:image/png;shot");
    expect(three.draw(look(2), "full", 8)).toBe("data:image/png;shot");

    expect(THREE.WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(THREE.WebGLRenderer).toHaveBeenCalledWith(
      expect.objectContaining({ alpha: true, powerPreference: "low-power" }),
    );
    expect(renderer.readRenderTargetPixels).toHaveBeenCalledTimes(2);
    // two lights, plus the hero only while it is being drawn
    expect(sceneSizes).toEqual([3, 3]);
    headGeometries.forEach((geometry) => expect(geometry.dispose).toHaveBeenCalled());

    expect(renderer.dispose).not.toHaveBeenCalled();
    three.dispose();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("is what the thumbnailer draws with by default, and frees the context when it is disposed", () => {
    stubCanvas();
    const renderer = fakeRenderer();
    mockRenderer = () => renderer;
    const { schedule, flush } = manualFrames();
    const thumbs = createLookThumbnailer({ schedule });

    thumbs.get(DEFAULT_LOOK, "bust", 8);
    flush();
    expect(thumbs.get(DEFAULT_LOOK, "bust", 8)).toBe("data:image/png;shot");
    expect(renderer.dispose).not.toHaveBeenCalled();

    thumbs.dispose();

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
  });
});

describe("useLookThumbnails", () => {
  it("frees the renderer when the component that asked for it goes away", () => {
    stubCanvas();
    const renderer = fakeRenderer();
    mockRenderer = () => renderer;
    const frames: (() => void)[] = [];
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((run) => frames.push(() => run(0)));
    let thumbs!: LookThumbnailer;
    const wrapper = mount(
      defineComponent({
        setup() {
          thumbs = useLookThumbnails();
          return () => null;
        },
      }),
    );

    thumbs.get(DEFAULT_LOOK, "bust", 8);
    frames.shift()!();
    expect(thumbs.get(DEFAULT_LOOK, "bust", 8)).toBe("data:image/png;shot");
    expect(renderer.dispose).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(thumbs.get(look(2), "bust")).toBe("");
    expect(frames).toHaveLength(0);
  });
});
