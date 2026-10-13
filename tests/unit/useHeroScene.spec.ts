import { mount } from "@vue/test-utils";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import { FRAME_WIDTH, placeCamera, type Frame } from "@/components/organisms/HeroModel/heroCamera";
import { buildHero } from "@/components/organisms/HeroModel/voxel/build";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";

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
  return { __esModule: true, ...actual, placeCamera: jest.fn(actual.placeCamera) };
});

jest.mock("@/components/organisms/HeroModel/voxel/build", () => {
  const actual = jest.requireActual("@/components/organisms/HeroModel/voxel/build");
  return { __esModule: true, ...actual, buildHero: jest.fn(actual.buildHero) };
});

const mockPlaceCamera = placeCamera as unknown as jest.Mock;
const mockBuildHero = buildHero as unknown as jest.Mock;

/** The close-up squeezes the view to this width (heroCamera's BUST_STAGE_WIDTH); the whole body keeps FRAME_WIDTH */
const BUST_WIDTH = 11;

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
  });

  afterEach(() => jest.restoreAllMocks());

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
    expect(aimedAt().width).toBe(BUST_WIDTH);

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
    expect(aimedAt().width).toBe(BUST_WIDTH);

    wrapper.unmount();
  });
});
