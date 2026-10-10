import $fx, { play$fx } from "@/assets/fx";
import { useAudioStore } from "@/lib/store/stores/audio";

/**
 * Battle sound effects and music, in one place so the page never touches the audio store.
 *
 * Effect names must exist in src/assets/fx (ui.nintendo first, then rpg.earthbound):
 * startBattle, attack, preAttack, damage (hero hit), enemyDamage (beast hit), enemyDie, win,
 * levelUp, die, text, cursor, no, select. Unknown names play nothing, silently.
 */
export type BattleSound =
  | "startBattle"
  | "attack"
  | "preAttack"
  | "damage"
  | "enemyDamage"
  | "enemyDie"
  | "win"
  | "levelUp"
  | "die"
  | "text"
  | "cursor"
  | "no"
  | "select";

export const useBattleAudio = () => {
  const audioStore = useAudioStore();
  const bgm = () => ($fx as any).rpg.earthbound.BGM as Record<string, string[]>;

  const playSound = (effect: BattleSound | string) => play$fx(effect);

  /** The battle tracks are remote (starmen.net); offline this is simply silent. */
  const startBattleBgm = () => {
    const tracks = bgm().battle || [];
    if (!tracks.length) return;
    audioStore.changeBGM({ tracks, track: Math.floor(Math.random() * tracks.length), is_on: true });
  };

  /** Pauses whatever is playing without flipping the player's music setting. */
  const stopBgm = () => {
    try {
      audioStore.bgm.audio?.pause();
    } catch {
      // nothing was playing
    }
  };

  /** The fanfare is a local effect, so a win sounds like a win even with no network. */
  const playFanfare = (kind: "win" | "levelUp" = "win") => {
    stopBgm();
    playSound(kind);
  };

  return { playSound, startBattleBgm, stopBgm, playFanfare };
};

export type BattleAudio = ReturnType<typeof useBattleAudio>;
