import * as THREE from "three";
import {
  DEFAULT_YAW,
  FRAME_WIDTH,
  addHeroLights,
  bustFrame,
  easeOutCubic,
  fullFrame,
  lerpFrame,
  measureHero,
  pixelsToDataUrl,
  placeCamera,
  renderHeroSnapshot,
  stageFrame,
  stepFrame,
} from "@/components/organisms/HeroModel/heroCamera";
import { animateHero } from "@/components/organisms/HeroModel/voxel/animate";
import { buildHero } from "@/components/organisms/HeroModel/voxel/build";
import { FIT_MARGIN } from "@/components/organisms/voxel/fitCamera";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";

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
    // 11 is the close-up's width; a head that sweeps wider than that (the cube's corners turning) keeps its own
    const headWidth = measureHero(hero).headReach * 2;
    expect(headWidth).toBeLessThan(FRAME_WIDTH);
    expect(stageFrame(hero, "bust")).toEqual({ ...bustFrame(hero), width: Math.max(11, headWidth) });
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

/** Hats and what the hands hold: the tallest and the widest the hero gets */
const WIZARD_WITH_A_SWORD: HeroLook = { ...DEFAULT_LOOK, hat: "wizard", leftHand: "shield", rightHand: "sword" };

const ANIMATIONS: HeroAnimation[] = ["idle", "wave", "walk", "victory", "hurt", "dance", "hop"];

/** Every part's box corners, on screen (-1..1 each way), as the live stage would draw the hero turned `yaw` at `time` */
const screenCorners = (hero: THREE.Group, camera: THREE.PerspectiveCamera, animation: HeroAnimation, time: number, yaw: number): THREE.Vector3[] => {
  animateHero(hero, animation, time);
  hero.rotation.y = yaw;
  hero.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const out: THREE.Vector3[] = [];
  hero.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || mesh.name === "shadow") return;
    mesh.geometry.computeBoundingBox();
    const { min, max } = mesh.geometry.boundingBox as THREE.Box3;
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) out.push(new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera));
  });
  return out;
};

describe("the hero stays inside its view", () => {
  it("the whole-body frame is cut for the animation: a victory hop needs more height than standing still", () => {
    const hero = buildHero(DEFAULT_LOOK);
    const still = fullFrame(hero, "idle");
    const cheering = fullFrame(hero, "victory");
    expect(cheering.height).toBeGreaterThan(still.height + 1);
    expect(cheering.centerY).toBeGreaterThan(still.centerY);
    // the quick builder hop is a bounce on the spot: it keeps the idle frame instead of pumping the camera
    expect(fullFrame(hero, "hop")).toEqual(still);
  });

  it("a wide wielder widens the frame, a bare hero keeps the standard width", () => {
    expect(fullFrame(buildHero(DEFAULT_LOOK)).width).toBe(FRAME_WIDTH);
    expect(fullFrame(buildHero(WIZARD_WITH_A_SWORD)).width).toBeGreaterThan(FRAME_WIDTH);
  });

  it("the close-up keeps a wizard's whole hat: no cap on the height, the brim's width asked for", () => {
    const plain = buildHero(DEFAULT_LOOK);
    const wizard = buildHero({ ...DEFAULT_LOOK, hat: "wizard" });
    const plainTop = bustFrame(plain).centerY + bustFrame(plain).height / 2;
    const wizardTop = bustFrame(wizard).centerY + bustFrame(wizard).height / 2;
    expect(wizardTop).toBeGreaterThan(21);
    expect(wizardTop).toBeGreaterThan(plainTop + 3);
    expect(stageFrame(wizard, "bust").width).toBeGreaterThanOrEqual(measureHero(wizard).headReach * 2);
  });

  it.each([
    ["a phone stage", 390 / 844],
    ["a square thumbnail", 1],
    ["the builder's wide stage", 390 / 330],
  ])("nothing of the hero is cut off on %s, in any animation, turned any way", (_name, aspect) => {
    const hero = buildHero(WIZARD_WITH_A_SWORD);
    const camera = new THREE.PerspectiveCamera();
    for (const animation of ANIMATIONS) {
      placeCamera(camera, fullFrame(hero, animation), aspect);
      // the hop keeps the idle frame, so its peak may touch the air round the frame: it is allowed to use all of it
      const limit = animation === "hop" ? 1 : 1 - FIT_MARGIN / 2;
      for (const yaw of [0, DEFAULT_YAW, Math.PI / 2, Math.PI]) {
        for (let step = 0; step < 14; step++) {
          for (const corner of screenCorners(hero, camera, animation, step * 0.1, yaw)) {
            expect(Math.abs(corner.x)).toBeLessThanOrEqual(limit);
            expect(Math.abs(corner.y)).toBeLessThanOrEqual(limit);
          }
        }
      }
    }
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

  it("shoots with 4 samples unless asked for another number", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: jest.fn(),
    } as never);
    jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;shot");
    const hero = buildHero(DEFAULT_LOOK);
    const renderer = {
      getRenderTarget: jest.fn(() => null),
      setRenderTarget: jest.fn(),
      setClearColor: jest.fn(),
      clear: jest.fn(),
      render: jest.fn(),
      readRenderTargetPixels: jest.fn(),
    };

    renderHeroSnapshot(renderer as never, new THREE.Scene(), hero, 8, "bust");
    renderHeroSnapshot(renderer as never, new THREE.Scene(), hero, 8, "bust", 0);

    const firstTarget = renderer.setRenderTarget.mock.calls[0][0] as THREE.WebGLRenderTarget;
    const secondShot = renderer.setRenderTarget.mock.calls[2][0] as THREE.WebGLRenderTarget;
    expect(firstTarget.samples).toBe(4);
    expect(secondShot.samples).toBe(0);
  });
});
