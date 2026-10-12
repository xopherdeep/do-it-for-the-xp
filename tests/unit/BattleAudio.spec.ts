const mockBGM: Record<string, string[]> = {};
const mockBgmState = { is_on: true };
const mockPlayFx = jest.fn();
const mockChangeBGM = jest.fn();
const mockStopMusic = jest.fn();

jest.mock("@/assets/fx", () => ({
  __esModule: true,
  default: { rpg: { earthbound: { BGM: mockBGM } } },
  play$fx: (name: string) => mockPlayFx(name),
}));
jest.mock("@/lib/store/stores/audio", () => ({ useAudioStore: () => ({ bgm: mockBgmState }) }));
jest.mock("@/lib/engine/audio/routeMusic", () => ({ changeBGM: (...args: unknown[]) => mockChangeBGM(...args) }));
jest.mock("@/lib/engine/audio/AudioEngine", () => ({
  AudioEngine: { getInstance: () => ({ stopMusic: mockStopMusic }) },
}));

import { useBattleAudio } from "@/app/Console/BattleField/composables/useBattleAudio";

const playedSlot = () => mockChangeBGM.mock.calls[0]?.[1]?.tracks;

describe("useBattleAudio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockBGM).forEach((key) => delete mockBGM[key]);
    Object.assign(mockBGM, { win: ["quest-cleared.mp3"], winboss: ["legend-earned.mp3"], boss: ["final-chore-standoff.mp3"] });
    mockBgmState.is_on = true;
  });

  it("plays the victory song after a fight", () => {
    useBattleAudio().playVictory(false, false);
    expect(playedSlot()).toEqual(["quest-cleared.mp3"]);
    expect(mockPlayFx).not.toHaveBeenCalled();
  });

  it("plays the boss victory song after a boss room", () => {
    useBattleAudio().playVictory(true, false);
    expect(playedSlot()).toEqual(["legend-earned.mp3"]);
  });

  it("rings the level-up fanfare over the victory song", () => {
    useBattleAudio().playVictory(false, true);
    expect(playedSlot()).toEqual(["quest-cleared.mp3"]);
    expect(mockPlayFx).toHaveBeenCalledWith("levelUp");
  });

  it("stops the battle song and plays the local win effect when music is off", () => {
    mockBgmState.is_on = false;
    useBattleAudio().playVictory(false, false);
    expect(mockChangeBGM).not.toHaveBeenCalled();
    expect(mockStopMusic).toHaveBeenCalled();
    expect(mockPlayFx).toHaveBeenCalledWith("win");
  });

  it("falls back to the local win effect when the slot has no songs", () => {
    delete mockBGM.winboss;
    useBattleAudio().playVictory(true, false);
    expect(mockChangeBGM).not.toHaveBeenCalled();
    expect(mockPlayFx).toHaveBeenCalledWith("win");
  });

  it("swaps in the boss theme", () => {
    useBattleAudio().startBossBgm();
    expect(playedSlot()).toEqual(["final-chore-standoff.mp3"]);
  });

  it("plays the battle theme directly", () => {
    Object.assign(mockBGM, { battle: ["oddball-battle-bounce.mp3"] });
    useBattleAudio().startBattleBgm();
    expect(playedSlot()).toEqual(["oddball-battle-bounce.mp3"]);
  });

  it("stops the music through the audio engine", () => {
    useBattleAudio().stopBgm();
    expect(mockStopMusic).toHaveBeenCalled();
  });
});
