import debug from "@/lib/utils/debug";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import { feelSound } from "@/lib/services/feedback/soundFeel";

import $fx from "./library";

/** The browser refused to play because the page has not had a tap or key press yet. */
export const isAutoplayBlocked = (err: { name?: string; message?: string }): boolean => {
  const message = err.message ?? '';
  return err.name === 'NotAllowedError' || message.includes('interact') || message.includes('user activation');
};

/** The sound has no source the browser can play: nothing to report */
const isNotSupported = (err: { name?: string }): boolean => err.name === 'NotSupportedError';

export const play$fx = (fx = 'select', options?: { loop?: boolean, stop?: boolean }) => {
  const { ui, rpg, theme: { ui: themeUi, rpg: themeRpg } } = $fx

  // Logic to determine if we should use 'setup' instead of 'loading'
  // When in the "backend" (GameMaster/Compendium Setup), we use the setup sound
  let targetFx = fx;
  const isLoadingInCompendium = fx === 'loading' && typeof window !== 'undefined' && window.location.pathname.includes('/game-master/compendium');
  if (isLoadingInCompendium) {
    targetFx = 'setup';
  }

  let soundFx = ui[themeUi][targetFx]

  // The reward sounds buzz too (their own Vibration switch, so a muted game can still be felt)
  feelSound(targetFx, options);

  // Only play sound if user has interacted with the page
  // Check with AudioEngine first
  const audioEngine = AudioEngine.getInstance();
  const shouldTryPlay = audioEngine.state.audioPermissionGranted || (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-user-interacted'));

  if (soundFx) {
    if (shouldTryPlay) {
      soundFx.volume = audioEngine.state.muted ? 0 : audioEngine.state.uiVolume * audioEngine.state.masterVolume;
      soundFx.currentTime = 0; // Reset to start
      soundFx.play().catch((err: any) => {
        debug.warn('UI Sound playback was prevented:', err);
        // Only trigger modal if it's a permission/interaction issue
        if (isAutoplayBlocked(err)) {
          audioEngine.state.audioPermissionGranted = false;
        }
      });
    } else {
      // We know it will fail, so don't try, but do trigger modal if we haven't already
      // But only if we actually wanted to play something
      debug.log('Skipping UI sound playback due to lack of permission');
    }
  } else {
    soundFx = rpg[themeRpg][targetFx]
    if (soundFx) {
      if (shouldTryPlay) {
        soundFx.volume = audioEngine.state.muted ? 0 : audioEngine.state.sfxVolume * audioEngine.state.masterVolume;

        // Handle stop action
        const isStopRequest = options?.stop;
        if (isStopRequest) {
          soundFx.pause();
          soundFx.currentTime = 0;
          soundFx.loop = false;
          return;
        }

        // Handle loop action
        const isLoopRequest = options?.loop;
        if (isLoopRequest) {
          soundFx.loop = true;
          // Only play if not already playing to avoid stutter
          const isPaused = soundFx.paused;
          if (isPaused) {
            soundFx.play().catch((err: any) => {
              if (isNotSupported(err)) return; // Suppress
              debug.warn('RPG Sound loop playback was prevented:', err);
            });
          }
          return;
        }

        soundFx.currentTime = 0;
        soundFx.loop = false;

        // Monophonic playback for others
        soundFx.play().catch((err: any) => {
          debug.warn('RPG Sound playback was prevented:', err);
          if (isNotSupported(err)) {
            // Suppress NotSupportedError (no supported sources)
            return;
          }
          if (isAutoplayBlocked(err)) {
            audioEngine.state.audioPermissionGranted = false;
          }
        });
      }
    }
  }
}
