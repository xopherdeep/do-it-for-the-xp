import * as THREE from "three";
import {
  DEFAULT_YAW,
  FRAME_WIDTH,
  addHeroLights,
  bustFrame,
  easeOutCubic,
  fullFrame,
  lerpFrame,
  pixelsToDataUrl,
  placeCamera,
  renderHeroSnapshot,
  stageFrame,
  stepFrame,
} from "@/components/organisms/HeroModel/heroCamera";
import { buildHero } from "@/components/organisms/HeroModel/voxel/build";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";

/**
 * The hero's camera without WebGL: frames, the focus tween and the snapshot pixel loop. jsdom has no canvas, so the
 * 2D context and the renderer are small fakes that record what they were handed.
 */

describe("heroCamera frames", () => {
  it("lerpFrame starts on from, ends on to, and clamps", () => {
    const a = { centerY: 8, height: 20 };
    const b = { centerY: 12, height: 13, width: 11 };
    expect(lerpFrame(a, b, 0)).toEqual({ centerY: 8, height: 20, width: FRAME_WIDTH });
    expect(lerpFrame(a, b, 1)).toEqual({ centerY: 12, height: 13, width: 11 });
    expect(lerpFrame(a, b, 2)).toEqual(lerpFrame(a, b, 1));
    expect(lerpFrame(a, b, -1)).toEqual(lerpFrame(a, b, 0));
  });

  it("lerpFrame is linear in every field halfway", () => {
    const half = lerpFrame({ centerY: 8, height: 20 }, { centerY: 12, height: 13, width: 11 }, 0.5);
    expect(half.centerY).toBeCloseTo(10);
    expect(half.height).toBeCloseTo(16.5);
    expect(half.width).toBeCloseTo(13);
  });

  it("easeOutCubic runs 0 to 1 and runs ahead of linear", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.75));
  });

  it("steps a frame toward its target and lands exactly", () => {
    const from = { centerY: 8, height: 20 };
    const to = { centerY: 12, height: 13, width: 11 };

    const start = stepFrame(from, to, 0, 0);
    expect(start.done).toBe(false);
    expect(start.frame).toEqual({ centerY: 8, height: 20, width: FRAME_WIDTH });

    const mid = stepFrame(from, to, 0, 0.15); // halfway through the default 0.3 seconds
    expect(mid.done).toBe(false);
    expect(mid.frame.centerY).toBeGreaterThan(8);
    expect(mid.frame.centerY).toBeLessThan(12);
    expect(mid.frame.height).toBeLessThan(20);
    expect(mid.frame.height).toBeGreaterThan(13);
    expect(mid.frame).toEqual(lerpFrame(from, to, easeOutCubic(0.5)));

    const end = stepFrame(from, to, 0, 0.3);
    expect(end.done).toBe(true);
    expect(end.frame).toBe(to);

    const late = stepFrame(from, to, 0, 9);
    expect(late.done).toBe(true);
    expect(late.frame).toBe(to);

    // a time before the start stays on `from`, and a custom duration is honoured
    expect(stepFrame(from, to, 5, 4).frame.centerY).toBe(8);
    expect(stepFrame(from, to, 0, 0.5, 1).done).toBe(false);
    expect(stepFrame(from, to, 0, 1, 1).done).toBe(true);
  });

  it("a narrower frame puts the camera closer on a square stage", () => {
    const wide = new THREE.PerspectiveCamera();
    const narrow = new THREE.PerspectiveCamera();
    placeCamera(wide, { centerY: 10, height: 13 }, 1);
    placeCamera(narrow, { centerY: 10, height: 13, width: 11 }, 1);
    expect(narrow.position.length()).toBeLessThan(wide.position.length());
  });

  it("stageFrame zooms to the head for bust and keeps the whole hero for full", () => {
    const hero = buildHero(DEFAULT_LOOK);
    expect(stageFrame(hero, "full")).toEqual(fullFrame(hero));
    expect(stageFrame(hero, "bust")).toEqual({ ...bustFrame(hero), width: 11 });
  });

  it("the bust close-up sits closer than the whole body on a tall stage", () => {
    const hero = buildHero(DEFAULT_LOOK);
    const full = new THREE.PerspectiveCamera();
    const bust = new THREE.PerspectiveCamera();
    placeCamera(full, stageFrame(hero, "full"), 0.6);
    placeCamera(bust, stageFrame(hero, "bust"), 0.6);
    expect(bust.position.length()).toBeLessThan(full.position.length());
  });
});

describe("addHeroLights", () => {
  it("lights the scene with a hemisphere and a sun", () => {
    const scene = new THREE.Scene();
    addHeroLights(scene);
    expect(scene.children.some((c) => c instanceof THREE.HemisphereLight)).toBe(true);
    expect(scene.children.some((c) => c instanceof THREE.DirectionalLight)).toBe(true);
  });
});

describe("pixelsToDataUrl", () => {
  type Image = { data: Uint8ClampedArray };
  let putImageData: jest.Mock;

  const fakeCanvas = (context: unknown): void => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
    jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;x");
  };

  beforeEach(() => {
    putImageData = jest.fn();
  });
  afterEach(() => jest.restoreAllMocks());

  it("flips rows and un-premultiplies", () => {
    fakeCanvas({
      createImageData: (w: number, h: number): Image => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData,
    });
    // GL order: row 0 is the bottom. Bottom-left is opaque red, top-right is half-faded red (premultiplied).
    const pixels = new Uint8Array([
      255, 0, 0, 255, /* */ 0, 0, 0, 0,
      0, 0, 0, 0, /*     */ 25, 0, 0, 51,
    ]);
    expect(pixelsToDataUrl(pixels, 2)).toBe("data:image/png;x");

    const image = putImageData.mock.calls[0][0] as Image;
    expect(Array.from(image.data)).toEqual([
      0, 0, 0, 0, /*       */ 125, 0, 0, 51, // top row of the picture: the old GL top row, un-premultiplied
      255, 0, 0, 255, /*   */ 0, 0, 0, 0, // bottom row: the old GL bottom row, red stays bottom-left
    ]);
  });

  it("gives back an empty string when there is no 2D context", () => {
    fakeCanvas(null);
    expect(pixelsToDataUrl(new Uint8Array(16), 2)).toBe("");
    expect(putImageData).not.toHaveBeenCalled();
  });
});

describe("renderHeroSnapshot", () => {
  afterEach(() => jest.restoreAllMocks());

  it("poses the hero at rest, shoots it turned a little, and puts everything back", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: jest.fn(),
    } as never);
    jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;shot");

    const hero = buildHero(DEFAULT_LOOK);
    hero.rotation.y = 2;
    const previousTarget = { id: "screen" };
    const yawAtRender: number[] = [];
    const renderer = {
      getRenderTarget: jest.fn(() => previousTarget),
      setRenderTarget: jest.fn(),
      setClearColor: jest.fn(),
      clear: jest.fn(),
      render: jest.fn(() => yawAtRender.push(hero.rotation.y)),
      readRenderTargetPixels: jest.fn(),
    };

    const url = renderHeroSnapshot(renderer as never, new THREE.Scene(), hero, 8, "bust");

    expect(url).toBe("data:image/png;shot");
    expect(yawAtRender).toEqual([DEFAULT_YAW - 0.1]);
    expect(hero.rotation.y).toBe(2);
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(previousTarget);
    expect(renderer.readRenderTargetPixels).toHaveBeenCalledWith(expect.anything(), 0, 0, 8, 8, expect.any(Uint8Array));
  });
});
