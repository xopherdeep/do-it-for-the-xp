import { createSpeech, hasReadingVoice, plainText, speak, speech, stop } from "@/lib/engine/audio/speech";
import type { NativeTts } from "@/lib/engine/audio/speech";

const mockEngine = { state: { muted: false } };
jest.mock("@/lib/engine/audio/AudioEngine", () => ({
  AudioEngine: { getInstance: () => mockEngine },
}));

/** A speech synthesis that records what it was asked to say, and lists the voices it is given (one by default) */
const fakeSynth = (voices: unknown[] = [{ name: "Test voice" }]) => {
  const spoken: any[] = [];
  const listeners: Record<string, () => void> = {};
  const synth = {
    spoken,
    voices,
    listeners,
    cancel: jest.fn(),
    speak: jest.fn((line: any) => spoken.push(line)),
    getVoices: jest.fn(() => synth.voices),
    addEventListener: jest.fn((name: string, listener: () => void) => {
      listeners[name] = listener;
    }),
  };
  return synth;
};

/** The phone's text-to-speech plugin, recording calls; `languages` is what the phone says it can read */
const fakePlugin = (languages: string[] = ["en-US"], voices: unknown[] = []) => {
  const plugin = {
    languages,
    voices,
    speak: jest.fn((_options: unknown) => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    getSupportedLanguages: jest.fn(() => Promise.resolve({ languages: plugin.languages })),
    getSupportedVoices: jest.fn(() => Promise.resolve({ voices: plugin.voices })),
  };
  return plugin satisfies NativeTts & Record<string, unknown>;
};
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const fakeUtterance = (text: string) => ({ text, lang: "", rate: 1, onend: null, onerror: null } as any);

describe("read-aloud", () => {
  beforeEach(() => {
    mockEngine.state.muted = false;
  });

  it("is a quiet no-op where there is no speechSynthesis (jsdom, an old webview)", () => {
    expect((window as any).speechSynthesis).toBeUndefined();
    expect(speech.route()).toBe("none");
    expect(speech.hasReadingVoice()).toBe(false);
    expect(hasReadingVoice()).toBe(false);
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
    expect(reader.route()).toBe("web");
    expect(reader.hasReadingVoice()).toBe(true);
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

describe("read-aloud routes: phone, browser, nothing", () => {
  beforeEach(() => {
    mockEngine.state.muted = false;
  });

  const onWeb = (synth = fakeSynth(), extra: Record<string, unknown> = {}) =>
    createSpeech({ synth: () => synth as any, utterance: fakeUtterance, isMuted: () => false, isNative: () => false, retryMs: 0, ...extra });

  it("reads on the web when the browser lists a voice, and says none when it lists none", () => {
    expect(onWeb().route()).toBe("web");
    const empty = onWeb(fakeSynth([]));
    expect(empty.route()).toBe("none");
    expect(empty.hasReadingVoice()).toBe(false);
    expect(empty.speak("Hello")).toBe(false);
  });

  it("waits for the browser's late voices (voiceschanged) and tells a screen when they arrive", () => {
    const synth = fakeSynth([]);
    const reader = onWeb(synth);
    const heard = jest.fn();
    const stopListening = reader.onChange(heard);
    expect(reader.hasReadingVoice()).toBe(false);
    expect(reader.speak("Hello")).toBe(false);
    synth.voices = [{ name: "Late voice" }];
    synth.listeners.voiceschanged();
    expect(heard).toHaveBeenCalledTimes(1);
    expect(reader.hasReadingVoice()).toBe(true);
    expect(reader.speak("Hello")).toBe(true);
    stopListening();
    synth.listeners.voiceschanged();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("speaks through the plugin on the phone, never through speechSynthesis", async () => {
    const plugin = fakePlugin();
    const synth = fakeSynth();
    const reader = createSpeech({
      synth: () => synth as any,
      utterance: fakeUtterance,
      isMuted: () => false,
      isNative: () => true,
      nativeTts: () => Promise.resolve(plugin),
      retryMs: 0,
    });
    expect(reader.route()).toBe("native");
    expect(reader.hasReadingVoice()).toBe(false); // the phone has not answered yet
    const heard = jest.fn();
    reader.onChange(heard);
    await settle();
    expect(plugin.getSupportedLanguages).toHaveBeenCalled();
    expect(reader.hasReadingVoice()).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);

    expect(reader.speak("Hello! This is <b>the Gold Bank</b>.")).toBe(true);
    expect(reader.isSpeaking()).toBe(true);
    await settle();
    expect(plugin.speak).toHaveBeenCalledWith({ text: "Hello! This is the Gold Bank .", lang: "en-US", rate: 0.9 });
    expect(synth.speak).not.toHaveBeenCalled();
    expect(reader.isSpeaking()).toBe(false); // the plugin's speak resolves when the line is done

    expect(reader.speak("Again", { rate: 1.1, lang: "en-GB" })).toBe(true);
    await settle();
    expect(plugin.speak).toHaveBeenLastCalledWith({ text: "Again", lang: "en-GB", rate: 1.1 });
  });

  it("stops the plugin when a line is cut off, and cuts the last line off before the next", async () => {
    const plugin = fakePlugin();
    plugin.speak.mockImplementation(() => new Promise(() => undefined)); // never finishes by itself
    const reader = createSpeech({
      synth: () => null,
      utterance: () => null,
      isMuted: () => false,
      isNative: () => true,
      nativeTts: () => Promise.resolve(plugin),
      retryMs: 0,
    });
    reader.speak("One");
    await settle();
    expect(plugin.stop).not.toHaveBeenCalled();
    reader.speak("Two");
    await settle();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
    expect(plugin.speak).toHaveBeenCalledTimes(2);
    plugin.stop.mockClear();
    reader.stop();
    await settle();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
    expect(reader.isSpeaking()).toBe(false);
  });

  it("falls back to the browser's voices when the phone has none, and to nothing when neither does", async () => {
    const plugin = fakePlugin([], []);
    const synth = fakeSynth();
    const reader = createSpeech({
      synth: () => synth as any,
      utterance: fakeUtterance,
      isMuted: () => false,
      isNative: () => true,
      nativeTts: () => Promise.resolve(plugin),
      retryMs: 0,
    });
    reader.watch();
    await settle();
    expect(plugin.getSupportedVoices).toHaveBeenCalled(); // no languages: it asks for voices before giving up
    expect(reader.route()).toBe("web");
    synth.voices = [];
    expect(reader.route()).toBe("none");
    expect(reader.hasReadingVoice()).toBe(false);
    expect(reader.speak("Hello")).toBe(false);
    expect(plugin.speak).not.toHaveBeenCalled();
  });

  it("counts the phone's voices when it lists no languages", async () => {
    const reader = createSpeech({
      synth: () => null,
      isMuted: () => false,
      isNative: () => true,
      nativeTts: () => Promise.resolve(fakePlugin([], [{ name: "Voice" }])),
      retryMs: 0,
    });
    reader.watch();
    await settle();
    expect(reader.route()).toBe("native");
    expect(reader.hasReadingVoice()).toBe(true);
  });

  it("is none when the plugin cannot load or throws, and never throws itself", async () => {
    const noPlugin = createSpeech({ synth: () => null, isMuted: () => false, isNative: () => true, nativeTts: () => Promise.resolve(null), retryMs: 0 });
    noPlugin.watch();
    await settle();
    expect(noPlugin.route()).toBe("none");
    expect(noPlugin.speak("Hello")).toBe(false);

    const broken = fakePlugin();
    broken.getSupportedLanguages.mockImplementation(() => Promise.reject(new Error("TextToSpeech plugin is not implemented on android")));
    const brokenReader = createSpeech({ synth: () => null, isMuted: () => false, isNative: () => true, nativeTts: () => Promise.resolve(broken), retryMs: 0 });
    brokenReader.watch();
    await settle();
    expect(brokenReader.hasReadingVoice()).toBe(false);
    expect(brokenReader.route()).toBe("none");

    const rejecting = createSpeech({ synth: () => null, isMuted: () => false, isNative: () => true, nativeTts: () => Promise.reject(new Error("no chunk")), retryMs: 0 });
    rejecting.watch();
    await settle();
    expect(rejecting.route()).toBe("none");
  });

  it("asks the phone again after its first 'no voice' (its engine starts late) and when a screen comes up", async () => {
    jest.useFakeTimers();
    try {
      const plugin = fakePlugin([]);
      const reader = createSpeech({ synth: () => null, isMuted: () => false, isNative: () => true, nativeTts: () => Promise.resolve(plugin), retryMs: 500 });
      reader.watch();
      await settle();
      expect(reader.hasReadingVoice()).toBe(false);
      plugin.languages = ["en-US"];
      jest.advanceTimersByTime(500);
      await settle();
      expect(reader.hasReadingVoice()).toBe(true);

      // A phone that said no stays "no" until asked; a screen coming up asks
      const later = fakePlugin([]);
      const second = createSpeech({ synth: () => null, isMuted: () => false, isNative: () => true, nativeTts: () => Promise.resolve(later), retryMs: 0 });
      second.watch();
      await settle();
      later.languages = ["en-US"];
      second.onChange(() => undefined);
      await settle();
      expect(second.hasReadingVoice()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("a failed plugin speak ends the line and stays quiet; mute and empty text never reach the plugin", async () => {
    const plugin = fakePlugin();
    plugin.speak.mockImplementation(() => Promise.reject(new Error("This language is not supported.")));
    let muted = false;
    const reader = createSpeech({ synth: () => null, isMuted: () => muted, isNative: () => true, nativeTts: () => Promise.resolve(plugin), retryMs: 0 });
    expect(reader.speak("Hello")).toBe(true);
    await settle();
    expect(reader.isSpeaking()).toBe(false);
    plugin.speak.mockClear();
    muted = true;
    expect(reader.speak("Hello")).toBe(false);
    muted = false;
    expect(reader.speak("  <br> ")).toBe(false);
    expect(plugin.speak).not.toHaveBeenCalled();
  });
});
