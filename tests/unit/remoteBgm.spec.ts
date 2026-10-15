import { BGM_CDN, fallbackFor, remoteSong, streamUrl } from "@/lib/engine/audio/remoteBgm";

describe("remoteSong", () => {
  it("points at the bucket and remembers the local loop that stands in for it", () => {
    const track = remoteSong("cozy-overworld-run", "/chiptune/plains.ogg");
    expect(streamUrl(track)).toBe(`${BGM_CDN}/cozy-overworld-run.mp3`);
    expect(fallbackFor(track)).toBe("/chiptune/plains.ogg");
  });

  it("keeps each slot's own fallback when one song is listed in several slots", () => {
    const worldMap = remoteSong("cozy-overworld-run", "/chiptune/world.ogg");
    const plains = remoteSong("cozy-overworld-run", "/chiptune/plains.ogg");
    expect(fallbackFor(worldMap)).toBe("/chiptune/world.ogg");
    expect(fallbackFor(plains)).toBe("/chiptune/plains.ogg");
  });

  it("fetches every slot's copy of a song from the same bucket URL, so the CDN cache key never changes", () => {
    const worldMap = remoteSong("cozy-overworld-run", "/chiptune/world.ogg");
    const plains = remoteSong("cozy-overworld-run", "/chiptune/plains.ogg");
    expect(worldMap).not.toBe(plains);
    expect(streamUrl(worldMap)).toBe(`${BGM_CDN}/cozy-overworld-run.mp3`);
    expect(streamUrl(plains)).toBe(streamUrl(worldMap));
  });

  it("gives the same song and fallback the same track string, so a repeated slot is one track", () => {
    expect(remoteSong("cozy-overworld-run", "/chiptune/plains.ogg")).toBe(remoteSong("cozy-overworld-run", "/chiptune/plains.ogg"));
  });

  it("round-trips a fallback URL that carries query and fragment characters", () => {
    const fallback = "./media/plains loop.1a2b.ogg?v=2&x=#top";
    expect(fallbackFor(remoteSong("cozy-overworld-run", fallback))).toBe(fallback);
  });

  it("has no fallback for a track that is already local, and streams it as is", () => {
    expect(fallbackFor("/chiptune/plains.ogg")).toBeUndefined();
    expect(streamUrl("/chiptune/plains.ogg")).toBe("/chiptune/plains.ogg");
  });
});
