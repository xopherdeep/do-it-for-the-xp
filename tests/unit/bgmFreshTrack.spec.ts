import { pickFreshTrack } from "@/router/_Guards/bgm.guard";

describe("pickFreshTrack", () => {
  it("never repeats the previous pick for the same playlist", () => {
    const playlist = ["a", "b", "c"];
    let last = pickFreshTrack(playlist);
    for (let i = 0; i < 200; i += 1) {
      const next = pickFreshTrack(playlist);
      expect(next).not.toBe(last);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(playlist.length);
      last = next;
    }
  });

  it("returns 0 for a single track", () => {
    expect(pickFreshTrack(["only"])).toBe(0);
    expect(pickFreshTrack(["only"])).toBe(0);
  });
});
