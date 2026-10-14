import $fx, { play$fx } from "@/assets/fx";
import { useAudioStore } from "@/lib/store/stores/audio";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import { changeBGM } from "@/lib/engine/audio/routeMusic";

/**
 * Battle sound effects and music, in one place so the page never touches the audio store.
 *
 * Effect names must exist in src/assets/fx (ui.nintendo first, then rpg.earthbound):
 * startBattle, attack, preAttack, damage (hero hit), enemyDamage (beast hit), enemyDie, win,
 * levelUp, die, text, cursor, no, select, gp (the rupee chime), fillPoints (the points roll). Unknown names play
 * nothing, silently.
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
  | "select"
  | "gp"
  | "fillPoints";

/** The loot a victory tile counts up. */
export type TallyStat = "xp" | "gp" | "ap";

/** The chime that rings as a tile lands its number: gold has its own, XP and AP share the plain select. */
const TALLY_LANDING: Record<TallyStat, BattleSound> = { xp: "select", gp: "gp", ap: "select" };

export const useBattleAudio = () => {
  const audioStore = useAudioStore();
  const bgm = () => ($fx as any).rpg.earthbound.BGM as Record<string, string[]>;

  const playSound = (effect: BattleSound | string) => play$fx(effect);

  /** Plays one of a BGM slot's songs through the audio engine; false when the slot is empty or music is off. */
  const playSlot = (slot: string): boolean => {
    const tracks = bgm()[slot] || [];
    const isSlotSilent = !tracks.length || audioStore.bgm?.is_on === false;
    if (isSlotSilent) return false;
    changeBGM(audioStore, { tracks, track: Math.floor(Math.random() * tracks.length), startDelay: 0 }, true);
    return true;
  };

  const startBattleBgm = () => playSlot("battle");

  /** The route guard only knows this is a temple fight; a boss room swaps in the boss theme once it loads. */
  const startBossBgm = () => playSlot("boss");

  /** Stops whatever is playing without flipping the player's music setting. */
  const stopBgm = () => {
    AudioEngine.getInstance().stopMusic(300);
  };

  /**
   * A win plays the victory song over the card (the boss one after a boss room; offline its chiptune loop).
   * A level up rings its fanfare on top; with music off the local win effect still sounds.
   */
  const playVictory = (boss: boolean, leveled: boolean) => {
    const playing = playSlot(boss ? "winboss" : "win");
    if (!playing) stopBgm();
    if (leveled) playSound("levelUp");
    else if (!playing) playSound("win");
  };

  /**
   * The points roll is one sustained sound (about four seconds), so the count-up starts it once and stops it when the
   * numbers are done; the card's three tiles overlap, so a tile landing early must not cut it for the others.
   */
  const startTally = () => playSound("fillPoints");
  const stopTally = () => play$fx("fillPoints", { stop: true });

  /** One chime as a tile lands its exact number (once for a tap that finishes the count early). */
  const playLanding = (stat: TallyStat) => playSound(TALLY_LANDING[stat]);

  return { playSound, startBattleBgm, startBossBgm, stopBgm, playVictory, startTally, stopTally, playLanding };
};

export type BattleAudio = ReturnType<typeof useBattleAudio>;
