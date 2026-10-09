import $fx, { play$fx } from "@/assets/fx";
import { useAudioStore } from "@/lib/store/stores/audio";

/** Battle sound effects and music, in one place so the page never touches the audio store. */
export const useBattleAudio = () => {
  const audioStore = useAudioStore();
  const bgm = () => ($fx as any).rpg.earthbound.BGM as Record<string, string[]>;

  const playSound = (effect: string) => play$fx(effect);

  const startBattleBgm = () => {
    const tracks = bgm().battle || [];
    if (!tracks.length) return;
    audioStore.changeBGM({ tracks, track: Math.floor(Math.random() * tracks.length), is_on: true });
  };

  const playVictoryBgm = (isBoss: boolean) => {
    const tracks = (isBoss && bgm().winboss) || bgm().win || [];
    if (!tracks.length) return;
    audioStore.changeBGM({ tracks, track: 0, is_on: true });
  };

  return { playSound, startBattleBgm, playVictoryBgm };
};

export type BattleAudio = ReturnType<typeof useBattleAudio>;
