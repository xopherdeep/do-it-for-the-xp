import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import XpAudioPermissionModal from "@/components/molecules/Modals/XpAudioPermissionModal.vue";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import { useAudioStore } from "@/lib/store/stores/audio";
import { playRouteMusic, cancelPendingRouteMusic } from "@/lib/engine/audio/routeMusic";

describe("Silent Start and Audio Mute Safety", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    engine = AudioEngine.getInstance();
    engine.unmute();
    engine.state.audioPermissionGranted = false;
    engine.state.pendingMusicId = "test-track";
  });

  afterEach(() => {
    cancelPendingRouteMusic();
    engine.stopAllMusic(0);
  });

  it("clicking continue silently mutes engine, stops all music, and disables bgm in store", async () => {
    const audioStore = useAudioStore();
    audioStore.bgm.is_on = true;

    const stopAllMusicSpy = jest.spyOn(engine, "stopAllMusic");

    const wrapper = mount(XpAudioPermissionModal);
    const silentOption = wrapper.find(".silent-option");
    expect(silentOption.exists()).toBe(true);

    await silentOption.trigger("click");

    expect(engine.state.muted).toBe(true);
    expect(engine.state.audioPermissionGranted).toBe(true);
    expect(engine.state.pendingMusicId).toBeNull();
    expect(audioStore.bgm.is_on).toBe(false);
    expect(stopAllMusicSpy).toHaveBeenCalledWith(0);
  });

  it("playMusic does not start playback when the engine is muted", () => {
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      volume: 1,
      paused: true,
      currentTime: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    (engine as any)._musicTracks.set("test-track", mockAudio);
    engine.mute();

    engine.playMusic("test-track");

    expect(mockAudio.play).not.toHaveBeenCalled();
    expect(engine.state.currentMusic).toBe("test-track");
  });

  it("playRouteMusic does not start playback when engine is muted", () => {
    const playMusicSpy = jest.spyOn(engine, "playMusic");
    const stopAllMusicSpy = jest.spyOn(engine, "stopAllMusic");
    engine.mute();

    playRouteMusic({
      tracks: ["https://example.com/song.mp3"],
      track: 0,
    });

    expect(playMusicSpy).not.toHaveBeenCalled();
    expect(stopAllMusicSpy).toHaveBeenCalledWith(0);
  });

  it("playRouteMusic does not start playback when audioStore.bgm.is_on is false", () => {
    const playMusicSpy = jest.spyOn(engine, "playMusic");
    const audioStore = useAudioStore();
    audioStore.bgm.is_on = false;

    playRouteMusic({
      tracks: ["https://example.com/song.mp3"],
      track: 0,
    });

    expect(playMusicSpy).not.toHaveBeenCalled();
  });

  it("enabling audio un-mutes and marks bgm as on", async () => {
    engine.mute();
    const audioStore = useAudioStore();
    audioStore.bgm.is_on = false;

    const wrapper = mount(XpAudioPermissionModal);
    const startCard = wrapper.find(".permission-card");
    await startCard.trigger("click");

    expect(engine.state.muted).toBe(false);
    expect(audioStore.bgm.is_on).toBe(true);
  });
});
