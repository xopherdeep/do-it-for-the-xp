import { createSpeech, plainText, speak, speech, stop } from "@/lib/engine/audio/speech";

const mockEngine = { state: { muted: false } };
jest.mock("@/lib/engine/audio/AudioEngine", () => ({
  AudioEngine: { getInstance: () => mockEngine },
}));

/** A speech synthesis that records what it was asked to say */
const fakeSynth = () => {
  const spoken: any[] = [];
  const synth = {
    spoken,
    cancel: jest.fn(),
    speak: jest.fn((line: any) => spoken.push(line)),
  };
  return synth;
};
const fakeUtterance = (text: string) => ({ text, lang: "", rate: 1, onend: null, onerror: null } as any);

describe("read-aloud", () => {
  beforeEach(() => {
    mockEngine.state.muted = false;
  });

  it("is a quiet no-op where there is no speechSynthesis (jsdom, an old webview)", () => {
    expect((window as any).speechSynthesis).toBeUndefined();
    expect(speech.isAvailable()).toBe(false);
    expect(speak("Hello there")).toBe(false);
    expect(() => stop()).not.toThrow();
    expect(speech.isSpeaking()).toBe(false);
  });

  it("is a quiet no-op when the synth throws", () => {
    const boom = {
      cancel: () => {
        throw new Error("no audio device");
      },
      speak: jest.fn(),
    };
    const reader = createSpeech({ synth: () => boom as any, utterance: fakeUtterance, isMuted: () => false });
    expect(reader.speak("Hello")).toBe(false);
    expect(() => reader.stop()).not.toThrow();
  });

  it("speaks a line a little slower than normal, in English, and cuts off the last one", () => {
    const synth = fakeSynth();
    const reader = createSpeech({ synth: () => synth as any, utterance: fakeUtterance, isMuted: () => false });
    expect(reader.isAvailable()).toBe(true);
    expect(reader.speak("Clean your room. Get 200 XP!")).toBe(true);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0]).toMatchObject({ text: "Clean your room. Get 200 XP!", lang: "en-US", rate: 0.9 });
    expect(reader.isSpeaking()).toBe(true);
    synth.spoken[0].onend();
    expect(reader.isSpeaking()).toBe(false);
    expect(reader.speak("Again", { rate: 1.2, lang: "en-GB" })).toBe(true);
    expect(synth.spoken[1]).toMatchObject({ rate: 1.2, lang: "en-GB" });
  });

  it("stops the line being read", () => {
    const synth = fakeSynth();
    const reader = createSpeech({ synth: () => synth as any, utterance: fakeUtterance, isMuted: () => false });
    reader.speak("Hello");
    synth.cancel.mockClear();
    reader.stop();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(reader.isSpeaking()).toBe(false);
  });

  it("says nothing for an empty line, markup only, or while muted", () => {
    const synth = fakeSynth();
    let muted = false;
    const reader = createSpeech({ synth: () => synth as any, utterance: fakeUtterance, isMuted: () => muted });
    expect(reader.speak("")).toBe(false);
    expect(reader.speak("  <br>  ")).toBe(false);
    muted = true;
    expect(reader.speak("Hello")).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    muted = false;
    expect(reader.speak("Hello")).toBe(true);
  });

  it("respects the app's audio mute switch by default", () => {
    const synth = fakeSynth();
    const reader = createSpeech({ synth: () => synth as any, utterance: fakeUtterance });
    mockEngine.state.muted = true;
    expect(reader.speak("Hello")).toBe(false);
    mockEngine.state.muted = false;
    expect(reader.speak("Hello")).toBe(true);
  });

  it("reads the words, not the markup", () => {
    expect(plainText("Hello <b>brave</b>&nbsp;hero &amp; friends<br/>  !")).toBe("Hello brave hero & friends !");
    expect(plainText(undefined as any)).toBe("");
  });
});
