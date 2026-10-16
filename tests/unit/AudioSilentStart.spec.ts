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
    engine.state.audioPromptAnswered = false;
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

  describe("Safari blocking a song on a later screen", () => {
    const blockedTrack = () => ({
      play: jest.fn().mockRejectedValue({ name: "NotAllowedError", message: "user activation" }),
      pause: jest.fn(),
      volume: 1,
      paused: true,
      currentTime: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("does not ask again after Tap to Start when the next screen's song is blocked", async () => {
      const wrapper = mount(XpAudioPermissionModal);
      await wrapper.find(".permission-card").trigger("click");
      expect(engine.state.audioPromptAnswered).toBe(true);

      (engine as any)._musicTracks.set("next-slide", blockedTrack());
      engine.playMusic("next-slide");
      await flush();

      expect(engine.state.audioPermissionGranted).toBe(false);
      expect(engine.state.pendingMusicId).toBe("next-slide");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".xp-audio-permission-overlay").exists()).toBe(false);
    });

    it("does not ask again after Continue Silently when a sound is blocked", async () => {
      const wrapper = mount(XpAudioPermissionModal);
      await wrapper.find(".silent-option").trigger("click");

      engine.state.audioPermissionGranted = false;
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".xp-audio-permission-overlay").exists()).toBe(false);
    });

    it("starts the blocked song on the next tap once the prompt was answered", () => {
      const track = blockedTrack();
      track.play = jest.fn().mockResolvedValue(undefined);
      (engine as any)._musicTracks.set("next-slide", track);
      engine.state.audioPromptAnswered = true;
      engine.state.pendingMusicId = "next-slide";

      document.dispatchEvent(new Event("click"));

      expect(track.play).toHaveBeenCalledTimes(1);
      expect(engine.state.audioPermissionGranted).toBe(true);
    });

    it("keeps a silent hero silent on the next tap", () => {
      const track = blockedTrack();
      (engine as any)._musicTracks.set("next-slide", track);
      engine.mute();
      engine.state.audioPromptAnswered = true;
      engine.state.pendingMusicId = "next-slide";

      document.dispatchEvent(new Event("click"));

      expect(track.play).not.toHaveBeenCalled();
    });

    it("leaves the first tap to the prompt while it is still unanswered", () => {
      const playMusicSpy = jest.spyOn(engine, "playMusic");
      playMusicSpy.mockClear();
      engine.retryBlockedAudio();
      expect(playMusicSpy).not.toHaveBeenCalled();
      expect(engine.state.audioPermissionGranted).toBe(false);
    });
  });
});
