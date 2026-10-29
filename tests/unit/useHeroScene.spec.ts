import { mount } from "@vue/test-utils";
import * as THREE from "three";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import { FRAME_WIDTH, placeCamera, stageFrame, type Frame } from "@/components/organisms/HeroModel/heroCamera";
import { buildHero, disposeHero } from "@/components/organisms/HeroModel/voxel/build";
import { DEFAULT_DETAIL } from "@/components/organisms/HeroModel/voxel/detail";
import { setVoxelTier } from "@/lib/services/graphics/deviceQuality";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import type { HeroLook } from "@/lib/hero-look/types";

/**
 * The live hero's scene in jsdom: when it rebuilds the hero and how the camera moves between the whole body and the
 * head close-up. The WebGL renderer is a fake, the clock and the animation frames are driven by hand, and the
 * camera is read through `placeCamera`, which receives the frame it is aimed at on every step.
 */

jest.mock("three", () => {
  const actual = jest.requireActual("three");
  return {
    __esModule: true,
    ...actual,
    WebGLRenderer: jest.fn(function () {
      return {
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        setClearColor: jest.fn(),
        shadowMap: { enabled: false },
        render: jest.fn(),
        dispose: jest.fn(),
        forceContextLoss: jest.fn(),
      };
    }),
  };
});

jest.mock("@/components/organisms/HeroModel/heroCamera", () => {
  const actual = jest.requireActual("@/components/organisms/HeroModel/heroCamera");
  return {
    __esModule: true,
    ...actual,
    placeCamera: jest.fn(actual.placeCamera),
    renderHeroSnapshot: jest.fn(() => "data:image/png;base64,"),
  };
});

jest.mock("@/components/organisms/HeroModel/voxel/build", () => {
  const actual = jest.requireActual("@/components/organisms/HeroModel/voxel/build");
  return { __esModule: true, ...actual, buildHero: jest.fn(actual.buildHero), disposeHero: jest.fn(actual.disposeHero) };
});

const mockPlaceCamera = placeCamera as unknown as jest.Mock;
const mockBuildHero = buildHero as unknown as jest.Mock;
const mockDisposeHero = disposeHero as unknown as jest.Mock;
const mockRenderer = THREE.WebGLRenderer as unknown as jest.Mock;

/**
 * The close-up squeezes the view to the head's width: heroCamera's BUST_STAGE_WIDTH, or wider for a head that sweeps more
 * (a crown, a wizard's brim) so the whole head stays in view; the whole body keeps FRAME_WIDTH. Read off a hero of the same
 * look built outside the mocked builder, so the build counts below stay the scene's own.
 */
const bustWidthOf = (look: HeroLook): number => {
  const { buildHero: realBuildHero } = jest.requireActual("@/components/organisms/HeroModel/voxel/build");
  return stageFrame(realBuildHero(look), "bust").width as number;
};
const BUST_WIDTH = bustWidthOf(DEFAULT_LOOK);

describe("useHeroScene", () => {
  let clock = 1000;
  let animationFrames: Array<() => void> = [];

  /** Moves the clock by `ms` and runs the next animation frame */
  const frame = (ms: number) => {
    clock += ms;
    animationFrames.shift()?.();
  };

  /** The frame the camera was last aimed at */
  const aimedAt = (): Frame => mockPlaceCamera.mock.calls[mockPlaceCamera.mock.calls.length - 1][1];

  const show = () =>
    mount(XpHeroModel, {
      props: { look: { ...DEFAULT_LOOK }, focus: "full", animation: "idle" },
      attachTo: document.body,
    });

  beforeEach(() => {
    clock = 1000;
    animationFrames = [];
    jest.spyOn(performance, "now").mockImplementation(() => clock);
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((run) => animationFrames.push(() => run(0)));
    mockPlaceCamera.mockClear();
    mockBuildHero.mockClear();
    mockDisposeHero.mockClear();
    mockRenderer.mockClear();
  });

  afterEach(() => {
    setVoxelTier("super");
    jest.restoreAllMocks();
  });

  const withDpr = (ratio: number) => Object.defineProperty(window, "devicePixelRatio", { value: ratio, configurable: true });
  const rendererOptions = () => mockRenderer.mock.calls[0][0];
  const pixelRatioSet = () => (mockRenderer.mock.results[0].value.setPixelRatio as jest.Mock).mock.calls[0][0];
  const drawCalls = (wrapper: ReturnType<typeof show>) => {
    const renderer = mockRenderer.mock.results[0].value.render as jest.Mock;
    renderer.mockClear();
    return { renderer, wrapper };
  };
  type Snapshotter = { snapshot: (size?: number) => string };

  it("keeps today's renderer options for Super at every pixel ratio", () => {
    withDpr(1.25);
    show().unmount();
    expect(rendererOptions().antialias).toBe(true);
    expect(pixelRatioSet()).toBe(1.25);

    mockRenderer.mockClear();
    withDpr(2);
    show().unmount();
    expect(rendererOptions().antialias).toBe(false);
    expect(pixelRatioSet()).toBe(2);
  });

  it.each([
    ["classic", 1.5],
    ["pocket", 1],
  ] as const)("%s turns antialiasing off and caps the pixel ratio", (tier, cap) => {
    setVoxelTier(tier);
    withDpr(2);
    show().unmount();
    expect(rendererOptions().antialias).toBe(false);
    expect(pixelRatioSet()).toBe(cap);

    mockRenderer.mockClear();
    withDpr(1.25);
    show().unmount();
    expect(rendererOptions().antialias).toBe(false);
  });

  it("draws Pocket at 20 fps: a frame 16 ms after the last is skipped", () => {
    setVoxelTier("pocket");
    const { renderer, wrapper } = drawCalls(show());
    frame(16);
    expect(renderer).not.toHaveBeenCalled();
    frame(16);
    expect(renderer).not.toHaveBeenCalled();
    frame(20);
    expect(renderer).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("draws Classic at 30 fps: frames 33 ms apart both render", () => {
    setVoxelTier("classic");
    const { renderer, wrapper } = drawCalls(show());
    frame(33);
    frame(33);
    expect(renderer).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("draws Super at every display frame", () => {
    const { renderer, wrapper } = drawCalls(show());
    frame(16);
    frame(16);
    expect(renderer).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("builds the stage hero with the tier's shading", () => {
    setVoxelTier("pocket");
    show().unmount();
    expect(mockBuildHero).toHaveBeenCalledWith(expect.anything(), { material: "flat" });
  });

  it("snapshots from a Super-detail hero on Pocket and disposes it", () => {
    setVoxelTier("pocket");
    const wrapper = show();
    mockBuildHero.mockClear();
    mockDisposeHero.mockClear();
    const dataUrl = (wrapper.vm as unknown as Snapshotter).snapshot(64);
    expect(dataUrl).toContain("data:image/png");
    expect(mockBuildHero).toHaveBeenCalledTimes(1);
    expect(mockBuildHero).toHaveBeenCalledWith(expect.anything(), DEFAULT_DETAIL);
    expect(mockDisposeHero).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("snapshots the stage hero itself on Super", () => {
    const wrapper = show();
    mockBuildHero.mockClear();
    (wrapper.vm as unknown as Snapshotter).snapshot(64);
    expect(mockBuildHero).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("builds nothing for an equal look and eases the camera to the new focus", async () => {
    const wrapper = show();
    expect(mockBuildHero).toHaveBeenCalledTimes(1);
    const body = aimedAt();

    // A copy with the same content (what a tab switch hands over) is the same hero
    await wrapper.setProps({ look: { ...DEFAULT_LOOK }, focus: "bust" });
    expect(mockBuildHero).toHaveBeenCalledTimes(1);

    mockPlaceCamera.mockClear();
    frame(150);
    const halfway = aimedAt();
    expect(halfway.height).toBeLessThan(body.height);
    expect(halfway.width).toBeLessThan(FRAME_WIDTH);
    expect(halfway.width).toBeGreaterThan(BUST_WIDTH);

    frame(10);
    expect(aimedAt().height).toBeLessThan(halfway.height);

    // Past 300ms the camera lands exactly on the close-up
    frame(200);
    const head = aimedAt();
    expect(head.height).toBeLessThan(halfway.height);
    expect(head.width).toBe(BUST_WIDTH);

    wrapper.unmount();
  });

  it("rebuilds for a changed look in the same tick as a focus change and still eases", async () => {
    const wrapper = show();
    const body = aimedAt();

    await wrapper.setProps({ look: { ...DEFAULT_LOOK, hat: "crown" }, focus: "bust" });
    expect(mockBuildHero).toHaveBeenCalledTimes(2);

    // The camera starts from where it was: the first step is not already on the close-up
    mockPlaceCamera.mockClear();
    frame(100);
    const early = aimedAt();
    expect(early.height).toBeLessThan(body.height);
    expect(early.width).toBeGreaterThan(BUST_WIDTH);

    frame(300);
    expect(aimedAt().width).toBe(bustWidthOf({ ...DEFAULT_LOOK, hat: "crown" }));

    wrapper.unmount();
  });

  it("keeps an ease under way when the hero is rebuilt without a focus change", async () => {
    const wrapper = show();
    await wrapper.setProps({ focus: "bust" });
    frame(100);
    expect(aimedAt().width).toBeGreaterThan(BUST_WIDTH);

    await wrapper.setProps({ look: { ...DEFAULT_LOOK, hat: "wizard" } });
    expect(mockBuildHero).toHaveBeenCalledTimes(2);

    // The rebuilt hero did not make the camera jump to the close-up: it is still on its way
    mockPlaceCamera.mockClear();
    frame(10);
    expect(aimedAt().width).toBeGreaterThan(BUST_WIDTH);

    frame(400);
    expect(aimedAt().width).toBe(bustWidthOf({ ...DEFAULT_LOOK, hat: "wizard" }));

    wrapper.unmount();
  });

  it("eases out to a taller frame for an animation that reaches higher, and back; the builder's hop keeps the frame", async () => {
    const wrapper = show();
    const standing = aimedAt();

    await wrapper.setProps({ animation: "victory" });
    mockPlaceCamera.mockClear();
    frame(100);
    const early = aimedAt();
    expect(early.height).toBeGreaterThan(standing.height);
    frame(300);
    const cheering = aimedAt();
    expect(cheering.height).toBeGreaterThan(standing.height + 1);
    expect(cheering.height).toBeGreaterThan(early.height);

    await wrapper.setProps({ animation: "idle" });
    frame(400);
    expect(aimedAt().height).toBeCloseTo(standing.height, 6);

    // A hop is a bounce on the spot: the camera does not move for it
    await wrapper.setProps({ animation: "hop" });
    mockPlaceCamera.mockClear();
    frame(100);
    frame(400);
    expect(mockPlaceCamera).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
