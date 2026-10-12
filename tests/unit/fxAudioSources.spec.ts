// Characterization of src/assets/fx/audioSources.ts as it behaved when it was split out of fx/index.ts.
import { BGM_CDN, fallbackFor, streamUrl } from "@/lib/engine/audio/remoteBgm";

type RequireContext = (callerDir: string, directory: string) => (key: string) => string;

describe("audioSources", () => {
  const globals = global as unknown as { __requireContext: RequireContext };
  const original = globals.__requireContext;
  let sources: typeof import("@/assets/fx/audioSources");

  beforeAll(() => {
    // Name the directory and file each loop is looked up in, instead of reading the real audio folders
    globals.__requireContext = (_callerDir, directory) => (key) => `${directory}:${key}`;
    // Each spec file gets its own module registry, so the override is in place when the module first loads
    sources = require("@/assets/fx/audioSources");
  });

  afterAll(() => {
    globals.__requireContext = original;
  });

  it("tune looks a chiptune loop up by name, as MP3 where the browser cannot play OGG", () => {
    expect(sources.tune("home")).toBe("@/assets/audio/chiptune:./home.mp3");
  });

  it("sting looks a short sting up in the sfx folder", () => {
    expect(sources.sting("encounter")).toBe("@/assets/audio/chiptune/sfx:./encounter.mp3");
  });

  it("song returns the bucket URL and remembers the chiptune loop that stands in for it", () => {
    const track = sources.song("fx-audio-sources-spec-song", "home");
    expect(streamUrl(track)).toBe(`${BGM_CDN}/fx-audio-sources-spec-song.mp3`);
    expect(fallbackFor(track)).toBe("@/assets/audio/chiptune:./home.mp3");
  });

  it("song keeps each slot's own chiptune loop when the same song sits in two slots", () => {
    const plains = sources.song("fx-audio-sources-spec-shared", "plains");
    const world = sources.song("fx-audio-sources-spec-shared", "world");
    expect(fallbackFor(plains)).toBe("@/assets/audio/chiptune:./plains.mp3");
    expect(fallbackFor(world)).toBe("@/assets/audio/chiptune:./world.mp3");
    expect(streamUrl(plains)).toBe(`${BGM_CDN}/fx-audio-sources-spec-shared.mp3`);
    expect(streamUrl(world)).toBe(streamUrl(plains));
  });
});
