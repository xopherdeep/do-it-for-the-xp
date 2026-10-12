const mockLoaded = new Set<string>();
const mockLoadMusic = jest.fn((id: string) => mockLoaded.add(id));
const mockPlayMusic = jest.fn();
const mockSetLoopOption = jest.fn();
const mockStopAllMusic = jest.fn();
const mockBgmState = { is_on: true };

jest.mock("@/lib/engine/audio/AudioEngine", () => ({
  AudioEngine: {
    getInstance: () => ({
      hasMusicTrack: (id: string) => mockLoaded.has(id),
      loadMusic: mockLoadMusic,
      playMusic: mockPlayMusic,
      setLoopOption: mockSetLoopOption,
      setTrackSequence: jest.fn(),
      stopAllMusic: mockStopAllMusic,
    }),
  },
}));
jest.mock("@/lib/store/stores/audio", () => ({ useAudioStore: () => ({ bgm: mockBgmState }) }));

import { playRouteMusic } from "@/lib/engine/audio/routeMusic";
import { BGM_CDN, remoteSong } from "@/lib/engine/audio/remoteBgm";

describe("playRouteMusic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoaded.clear();
    mockBgmState.is_on = true;
  });

  it("gives two slots that share one song the same track id, so the song is loaded once and played on", () => {
    const sandsMap = remoteSong("sun-temple-shrine", "./chiptune/sands.ogg");
    const lightTemple = remoteSong("sun-temple-shrine", "./chiptune/temple-light.ogg");
    expect(sandsMap).not.toBe(lightTemple);

    playRouteMusic({ tracks: [sandsMap], track: 0 });
    playRouteMusic({ tracks: [lightTemple], track: 0 });

    expect(mockPlayMusic).toHaveBeenCalledTimes(2);
    const [firstId] = mockPlayMusic.mock.calls[0];
    const [secondId] = mockPlayMusic.mock.calls[1];
    expect(secondId).toBe(firstId);
    expect(firstId).toBe("route-music-sun-temple-shrine.mp3");
    // The second slot finds the song already loaded: it is neither reloaded nor restarted
    expect(mockLoadMusic).toHaveBeenCalledTimes(1);
    expect(mockLoadMusic).toHaveBeenCalledWith(firstId, sandsMap, expect.objectContaining({ title: "sun temple shrine" }));
    expect(mockSetLoopOption).toHaveBeenCalledTimes(1);
  });

  it("names the track the same way for a { src, title } entry", () => {
    const track = remoteSong("sun-temple-shrine", "./chiptune/sands.ogg");
    playRouteMusic({ tracks: [{ src: track, title: "Sun Temple" }], track: 0 });
    expect(mockPlayMusic.mock.calls[0][0]).toBe("route-music-sun-temple-shrine.mp3");
  });

  it("keeps different songs on different track ids", () => {
    playRouteMusic({ tracks: [remoteSong("cozy-overworld-run", "./a.ogg")], track: 0 });
    playRouteMusic({ tracks: [remoteSong("overworld-quest", "./a.ogg")], track: 0 });
    expect(mockLoadMusic).toHaveBeenCalledTimes(2);
    expect(mockPlayMusic.mock.calls[0][0]).not.toBe(mockPlayMusic.mock.calls[1][0]);
  });

  it("names a plain local track by its file, as before", () => {
    playRouteMusic({ tracks: [`${BGM_CDN}/x/../plain.mp3`, "/audio/cave.abc123.ogg"], track: 1 });
    expect(mockPlayMusic.mock.calls[0][0]).toBe("route-music-cave.abc123.ogg");
  });
});
