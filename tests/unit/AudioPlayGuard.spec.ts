import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import { guardMediaPlay, isPlayGuarded } from "@/lib/engine/audio/playGuard";

type FakeMedia = { play: (...args: unknown[]) => unknown };

const refusal = (name: string, message: string): Error => Object.assign(new Error(message), { name });
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("guardMediaPlay", () => {
  it("hands the play() promise back untouched when the sound plays", async () => {
    const proto: FakeMedia = { play: jest.fn(() => Promise.resolve("played")) };
    const onRefused = jest.fn();
    guardMediaPlay(proto, onRefused);

    await expect(proto.play()).resolves.toBe("played");

    expect(onRefused).not.toHaveBeenCalled();
  });

  it("reports a play() cut short by pause() without leaving an unhandled rejection", async () => {
    const reason = refusal("AbortError", "The play() request was interrupted by a call to pause().");
    const proto: FakeMedia = { play: () => Promise.reject(reason) };
    const onRefused = jest.fn();
    guardMediaPlay(proto, onRefused);

    const result = proto.play() as Promise<unknown>;
    await tick();

    expect(onRefused).toHaveBeenCalledWith(reason);
    // a caller that does care still hears the refusal
    await expect(result).rejects.toBe(reason);
  });

  it("reports a play() before the hero has tapped anything", async () => {
    const reason = refusal("NotAllowedError", "play() failed because the user didn't interact with the document first.");
    const proto: FakeMedia = { play: () => Promise.reject(reason) };
    const onRefused = jest.fn();
    guardMediaPlay(proto, onRefused);

    void proto.play();
    await tick();

    expect(onRefused).toHaveBeenCalledWith(reason);
  });

  it("lets a play() that returns no promise (an old browser) pass through", () => {
    const proto: FakeMedia = { play: () => undefined };
    guardMediaPlay(proto, jest.fn());

    expect(proto.play()).toBeUndefined();
  });

  it("keeps the element and the arguments of the call", () => {
    const seen: unknown[] = [];
    const proto: FakeMedia = {
      play(this: unknown, ...args: unknown[]) {
        seen.push(this, ...args);
        return Promise.resolve();
      },
    };
    guardMediaPlay(proto, jest.fn());
    const element = Object.create(proto) as FakeMedia;

    void element.play("a", "b");

    expect(seen).toEqual([element, "a", "b"]);
  });

  it("guards once, however many times it is asked", async () => {
    const reason = refusal("AbortError", "interrupted");
    const proto: FakeMedia = { play: () => Promise.reject(reason) };
    const onRefused = jest.fn();

    expect(isPlayGuarded(proto)).toBe(false);
    expect(guardMediaPlay(proto, onRefused)).toBe(true);
    expect(guardMediaPlay(proto, onRefused)).toBe(false);
    expect(isPlayGuarded(proto)).toBe(true);

    void proto.play();
    await tick();
    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an object with no play()", () => {
    const proto = {} as FakeMedia;

    expect(guardMediaPlay(proto, jest.fn())).toBe(false);
  });
});

describe("the audio engine", () => {
  it("guards every audio element's play() as it starts", () => {
    AudioEngine.getInstance();

    expect(isPlayGuarded(window.HTMLMediaElement.prototype as unknown as FakeMedia)).toBe(true);
  });
});
