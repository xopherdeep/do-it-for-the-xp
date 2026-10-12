import { BGM_CDN, fallbackFor, remoteSong } from "@/lib/engine/audio/remoteBgm";

describe("remoteSong", () => {
  it("points at the bucket and remembers the local loop that stands in for it", () => {
    const url = remoteSong("cozy-overworld-run", "/chiptune/plains.ogg");
    expect(url).toBe(`${BGM_CDN}/cozy-overworld-run.mp3`);
    expect(fallbackFor(url)).toBe("/chiptune/plains.ogg");
  });

  it("has no fallback for a track that is already local", () => {
    expect(fallbackFor("/chiptune/plains.ogg")).toBeUndefined();
  });
});
