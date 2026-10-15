// Add declaration for the window._pendingAudioPlay property
declare global {
  interface Window {
    _pendingAudioPlay?: boolean;
  }
}

// Sound and music for the whole app. This file is the entry point (`@/assets/fx`):
//   player.ts       play$fx(key): picks the themed sound and plays it once the page was interacted with
//   library.ts      the $fx object: theme, UI sounds and the RPG sets (earthbound, chronoTrigger, finalFantasy)
//   uiSounds.ts     the nintendo / sony UI sound sets
//   rpgSounds.ts    the RPG sound sets (sound effects and the legacy online battle lists)
//   bgmSlots.ts     the earthbound BGM slots, per region, per temple, with their starmen.net fallbacks
//   sharedSounds.ts the Audio singletons that several sets share (gold, chests, doors, steps, coins)
//   audioSources.ts tune / sting / song: bundled chiptune loops, stings and the remote R2 songs
import { play$fx } from "./player";
import $fx from "./library";

const hasWindow = typeof window !== 'undefined';
if (hasWindow) {
  (window as any).play$fx = play$fx;
}

export { play$fx };
export default $fx;
