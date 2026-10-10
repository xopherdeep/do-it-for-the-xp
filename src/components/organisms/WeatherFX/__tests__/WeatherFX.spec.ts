import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import WeatherFX from "../WeatherFX.vue";

const mockCanvasArgs: unknown[][] = [];
jest.mock("../engine/useWeatherCanvas", () => ({
  useWeatherCanvas: jest.fn((...args: unknown[]) => {
    mockCanvasArgs.push(args);
    return {};
  }),
}));

jest.mock("../presets", () => ({
  weatherPresets: {
    none: { layers: [], sound: null },
    sunny: { layers: [], sound: null },
    rainy: { layers: [], sound: "rain" },
    stormy: { layers: [], sound: "storm" },
    cave: { layers: [], sound: "cave" },
  },
}));

jest.mock("../sounds", () => ({
  SOUND_FADE_MS: 600,
  SOUND_DEFAULT_VOLUME: { rain: 0.5, storm: 0.5, wind: 0.5, ocean: 0.5, night: 0.5, cave: 0.5 },
  pickSoundSource: jest.fn((type: string) => (type === "cave" ? null : `/audio/${type}.ogg`)),
}));

const mockAppState = { muted: false };
jest.mock("@/lib/engine/audio/AudioEngine", () => ({
  AudioEngine: { getInstance: () => ({ state: mockAppState }) },
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  loop = false;
  preload = "";
  volume = 1;
  paused = true;
  currentTime = 0;
  play = jest.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
  canPlayType = jest.fn(() => "probably");
  constructor() {
    FakeAudio.instances.push(this);
  }
}

const realAudio = (global as unknown as { Audio: unknown }).Audio;

const factory = (props: Record<string, unknown> = {}) =>
  mount(WeatherFX, { props: { type: "rainy", intensity: 6, soundVolume: 1, ...props } });

describe("WeatherFX", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    FakeAudio.instances = [];
    mockCanvasArgs.length = 0;
    mockAppState.muted = false;
    (global as unknown as { Audio: unknown }).Audio = FakeAudio;
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { Audio: unknown }).Audio = realAudio;
  });

  it("renders one canvas inside the weather layer", () => {
    const wrapper = factory({ soundEnabled: false });
    expect(wrapper.find(".weather-fx").exists()).toBe(true);
    expect(wrapper.findAll("canvas.weather-canvas")).toHaveLength(1);
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["rainy", "active"]));
    wrapper.unmount();
  });

  it("hands the canvas, type, intensity and active refs to the engine", () => {
    const wrapper = factory({ soundEnabled: false });
    expect(mockCanvasArgs).toHaveLength(1);
    const [canvasRef, type, intensity, active] = mockCanvasArgs[0] as Array<{ value: unknown }>;
    expect(canvasRef.value).toBe(wrapper.find("canvas").element);
    expect([type.value, intensity.value, active.value]).toEqual(["rainy", 6, true]);
    wrapper.unmount();
  });

  it("emits effect-changed immediately and effect-loaded after the first frames", async () => {
    const wrapper = factory({ soundEnabled: false });
    expect(wrapper.emitted("effect-changed")?.[0]).toEqual([{ type: "rainy", active: true }]);
    expect(wrapper.emitted("effect-loaded")).toBeUndefined();
    jest.advanceTimersByTime(100);
    expect(wrapper.emitted("effect-loaded")).toHaveLength(1);
    await wrapper.setProps({ type: "sunny" });
    expect(wrapper.emitted("effect-changed")?.[1]).toEqual([{ type: "sunny", active: true }]);
    wrapper.unmount();
  });

  it("never plays anything when sound is disabled", async () => {
    const wrapper = factory({ soundEnabled: false });
    await nextTick();
    jest.advanceTimersByTime(1000);
    expect(FakeAudio.instances).toHaveLength(0);
    wrapper.unmount();
  });

  it("starts the preset loop, fades it in and loops it", async () => {
    const wrapper = factory({ soundEnabled: true, soundVolume: 0.5 });
    await nextTick();
    expect(FakeAudio.instances).toHaveLength(1);
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe("/audio/rain.ogg");
    expect(audio.loop).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(0);
    jest.advanceTimersByTime(700);
    expect(audio.volume).toBeCloseTo(0.25, 5); // preset default 0.5 * soundVolume 0.5
    wrapper.unmount();
  });

  it("stays silent for presets without a sound and for sounds without a file", async () => {
    const quiet = factory({ type: "sunny" });
    await nextTick();
    const missing = factory({ type: "cave" });
    await nextTick();
    expect(FakeAudio.instances.every((audio) => audio.play.mock.calls.length === 0)).toBe(true);
    quiet.unmount();
    missing.unmount();
  });

  it("does not throw when play() is rejected", async () => {
    const wrapper = factory();
    await nextTick();
    FakeAudio.instances[0].play.mockImplementation(() => Promise.reject(new Error("blocked")));
    await wrapper.setProps({ soundEnabled: false });
    await wrapper.setProps({ soundEnabled: true });
    await nextTick();
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
    wrapper.unmount();
  });

  it("fades the loop out and pauses it when the layer becomes inactive", async () => {
    const wrapper = factory();
    await nextTick();
    const audio = FakeAudio.instances[0];
    jest.advanceTimersByTime(700);
    await wrapper.setProps({ active: false });
    expect(audio.pause).not.toHaveBeenCalled();
    jest.advanceTimersByTime(700);
    expect(audio.volume).toBe(0);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.paused).toBe(true);
    wrapper.unmount();
  });

  it("stops when soundEnabled flips off and restarts when it flips back on", async () => {
    const wrapper = factory();
    await nextTick();
    const audio = FakeAudio.instances[0];
    jest.advanceTimersByTime(700);
    await wrapper.setProps({ soundEnabled: false });
    jest.advanceTimersByTime(700);
    expect(audio.paused).toBe(true);
    await wrapper.setProps({ soundEnabled: true });
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances).toHaveLength(1);
    wrapper.unmount();
  });

  it("crossfades to the new loop when the weather changes", async () => {
    const wrapper = factory();
    await nextTick();
    jest.advanceTimersByTime(700);
    await wrapper.setProps({ type: "stormy" });
    expect(FakeAudio.instances).toHaveLength(2);
    jest.advanceTimersByTime(700);
    const [rain, storm] = FakeAudio.instances;
    expect(rain.paused).toBe(true);
    expect(storm.paused).toBe(false);
    expect(storm.volume).toBeCloseTo(0.5, 5);
    wrapper.unmount();
  });

  it("follows soundVolume changes while playing", async () => {
    const wrapper = factory({ soundVolume: 1 });
    await nextTick();
    jest.advanceTimersByTime(700);
    const audio = FakeAudio.instances[0];
    expect(audio.volume).toBeCloseTo(0.5, 5);
    await wrapper.setProps({ soundVolume: 0.2 });
    jest.advanceTimersByTime(700);
    expect(audio.volume).toBeCloseTo(0.1, 5);
    wrapper.unmount();
  });

  it("does not start while the app is muted", async () => {
    mockAppState.muted = true;
    const wrapper = factory();
    await nextTick();
    jest.advanceTimersByTime(1000);
    expect(FakeAudio.instances.every((audio) => audio.paused)).toBe(true);
    wrapper.unmount();
  });

  it("stops the audio immediately on unmount", async () => {
    const wrapper = factory();
    await nextTick();
    const audio = FakeAudio.instances[0];
    jest.advanceTimersByTime(700);
    expect(audio.paused).toBe(false);
    wrapper.unmount();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.paused).toBe(true);
    expect(audio.volume).toBe(0);
    // no leftover fade timers
    expect(jest.getTimerCount()).toBe(0);
  });
});
