import { endBurst, playBurst } from "@/assets/fx/burst";

const fakeAudio = () => {
  const audio = {
    paused: true,
    loop: false,
    currentTime: 0,
    play: jest.fn(() => {
      audio.paused = false;
      return Promise.resolve();
    }),
    pause: jest.fn(() => {
      audio.paused = true;
    }),
  };
  return audio;
};

describe("fx bursts (the coin counter)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("ticks for the burst and then stops on its own", () => {
    const audio = fakeAudio();
    playBurst(audio as any, 900);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.loop).toBe(true);
    jest.advanceTimersByTime(899);
    expect(audio.paused).toBe(false);
    jest.advanceTimersByTime(1);
    expect(audio.paused).toBe(true);
    expect(audio.loop).toBe(false);
    expect(audio.currentTime).toBe(0);
  });

  it("a second burst keeps ticking and restarts the clock", () => {
    const audio = fakeAudio();
    playBurst(audio as any, 900);
    jest.advanceTimersByTime(600);
    playBurst(audio as any, 900);
    expect(audio.play).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(600);
    expect(audio.paused).toBe(false);
    jest.advanceTimersByTime(300);
    expect(audio.paused).toBe(true);
  });

  it("stops at once when asked", () => {
    const audio = fakeAudio();
    playBurst(audio as any, 900);
    endBurst(audio as any);
    expect(audio.paused).toBe(true);
    jest.advanceTimersByTime(900);
    expect(audio.pause).toHaveBeenCalledTimes(1);
  });
});
