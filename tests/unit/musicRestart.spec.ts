import { AudioEngine } from "@/lib/engine/audio/AudioEngine";

/** A stand-in audio element that keeps the pieces the engine reads and writes */
const fakeTrack = () => {
  const track: any = { paused: true, volume: 1, currentTime: 0, loop: true };
  track.play = jest.fn(() => {
    track.paused = false;
    return Promise.resolve();
  });
  track.pause = jest.fn(() => {
    track.paused = true;
  });
  return track;
};

describe("music starts from the top", () => {
  let engine: AudioEngine;
  let a: any;
  let b: any;

  beforeEach(() => {
    engine = AudioEngine.getInstance();
    engine.unmute();
    a = fakeTrack();
    b = fakeTrack();
    (engine as any)._musicTracks.set("song-a", a);
    (engine as any)._musicTracks.set("song-b", b);
  });

  afterEach(() => {
    engine.stopAllMusic(0);
  });

  it("a song stopped instantly is rewound", () => {
    engine.playMusic("song-a", 0);
    a.currentTime = 42;
    engine.playMusic("song-b", 0);
    expect(a.currentTime).toBe(0);
    expect(a.paused).toBe(true);
  });

  it("the next scene's song begins at zero, whatever the last one reached", () => {
    engine.playMusic("song-a", 0);
    a.currentTime = 42;
    b.currentTime = 17;
    engine.playMusic("song-b", 0);
    expect(b.currentTime).toBe(0);
  });

  it("a song called back while it is still fading out restarts instead of carrying on", () => {
    engine.playMusic("song-a", 0);
    a.currentTime = 42;
    engine.playMusic("song-b", 5000);
    // a is fading out now, still playing
    expect(a.paused).toBe(false);
    engine.playMusic("song-a", 0);
    expect(a.currentTime).toBe(0);
  });

  it("asking again for the song that is already playing leaves it alone", () => {
    engine.playMusic("song-a", 0);
    a.currentTime = 42;
    engine.playMusic("song-a", 0);
    expect(a.currentTime).toBe(42);
  });
});
