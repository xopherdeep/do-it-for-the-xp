import { SoundEffect, MusicTrack } from './AudioEngine';
import debug from '@/lib/utils/debug';

// Import actual audio files instead of using placeholders
// Nintendo UI sounds
import nintendoSelect from '@/assets/audio/nintendo/switch/Select.wav';
import nintendoConfirm from '@/assets/audio/nintendo/switch/Tick.wav';
import nintendoCancel from '@/assets/audio/nintendo/switch/Border.wav';
import nintendoError from '@/assets/audio/nintendo/switch/Error.wav';
import nintendoPopup from '@/assets/audio/nintendo/switch/Popup + Run Title.wav';

// Sony UI sounds
import sonySelect from '@/assets/audio/sony/ps5/Navigation.mp3';
import sonyConfirm from '@/assets/audio/sony/ps5/Navigation_Enter.mp3';
import sonyCancel from '@/assets/audio/sony/ps5/Navigation_Back.mp3';
import sonyError from '@/assets/audio/sony/ps5/Prompt.mp3';
import sonyPopup from '@/assets/audio/sony/ps5/Trophy_Notification.mp3';

// Earthbound game sounds
import ebAttack from '@/assets/audio/nintendo/earthbound/attack1.wav';
import ebHit from '@/assets/audio/nintendo/earthbound/enemyhit.wav';
import ebEnemyAttack from '@/assets/audio/nintendo/earthbound/enemyattack.wav';
import ebVictory from '@/assets/audio/nintendo/earthbound/eb_win.wav';
import ebLevelUp from '@/assets/audio/nintendo/earthbound/eb_fanfare.wav';

// Use generic audio files for Chrono Trigger and FF until we can verify paths
import ctAttack from '@/assets/audio/click.wav';
import ctHit from '@/assets/audio/Cursor.wav';
import ctEnemyAttack from '@/assets/audio/Error.wav';
import ctVictory from '@/assets/audio/complete.mp3';
import ctLevelUp from '@/assets/audio/level_up_screen.mp3';

// Final Fantasy fallback sounds
import ffAttack from '@/assets/audio/click.wav';
import ffHit from '@/assets/audio/Cursor.wav';
import ffEnemyAttack from '@/assets/audio/Error.wav';
import ffVictory from '@/assets/audio/complete.mp3';
import ffLevelUp from '@/assets/audio/level_up_screen.mp3';

/**
 * Sound effects registry - organized by theme and category
 * This provides a central place to register all sound effects
 * and makes it easy to change themes at runtime
 */
export const soundEffects: Record<string, Record<string, Record<string, SoundEffect>>> = {
  // UI sound effects
  ui: {
    // Nintendo UI theme
    nintendo: {
      select: { 
        id: 'nintendo_select', 
        src: nintendoSelect,
        category: 'ui'
      },
      confirm: {
        id: 'nintendo_confirm',
        src: nintendoConfirm,
        category: 'ui'
      },
      cancel: {
        id: 'nintendo_cancel',
        src: nintendoCancel,
        category: 'ui'
      },
      error: {
        id: 'nintendo_error',
        src: nintendoError,
        category: 'ui'
      },
      popup: {
        id: 'nintendo_popup',
        src: nintendoPopup,
        category: 'ui'
      }
    },
    // Sony UI theme
    sony: {
      select: {
        id: 'sony_select',
        src: sonySelect,
        category: 'ui'
      },
      confirm: {
        id: 'sony_confirm',
        src: sonyConfirm,
        category: 'ui'
      },
      cancel: {
        id: 'sony_cancel',
        src: sonyCancel,
        category: 'ui'
      },
      error: {
        id: 'sony_error',
        src: sonyError,
        category: 'ui'
      },
      popup: {
        id: 'sony_popup',
        src: sonyPopup,
        category: 'ui'
      }
    }
  },
  
  // Game sound effects
  rpg: {
    // Earthbound sound theme
    earthbound: {
      attack: {
        id: 'earthbound_attack',
        src: ebAttack,
        category: 'sfx'
      },
      hit: {
        id: 'earthbound_hit',
        src: ebHit,
        category: 'sfx'
      },
      enemyAttack: {
        id: 'earthbound_enemy_attack',
        src: ebEnemyAttack,
        category: 'sfx'
      },
      victory: {
        id: 'earthbound_victory',
        src: ebVictory,
        category: 'sfx'
      },
      levelUp: {
        id: 'earthbound_level_up',
        src: ebLevelUp,
        category: 'sfx'
      }
    },
    // Chrono Trigger sound theme
    chronoTrigger: {
      attack: {
        id: 'chrono_attack',
        src: ctAttack,
        category: 'sfx'
      },
      hit: {
        id: 'chrono_hit',
        src: ctHit,
        category: 'sfx'
      },
      enemyAttack: {
        id: 'chrono_enemy_attack',
        src: ctEnemyAttack,
        category: 'sfx'
      },
      victory: {
        id: 'chrono_victory',
        src: ctVictory,
        category: 'sfx'
      },
      levelUp: {
        id: 'chrono_level_up',
        src: ctLevelUp,
        category: 'sfx'
      }
    },
    // Final Fantasy sound theme
    finalFantasy: {
      attack: {
        id: 'ff_attack',
        src: ffAttack,
        category: 'sfx'
      },
      hit: {
        id: 'ff_hit',
        src: ffHit,
        category: 'sfx'
      },
      enemyAttack: {
        id: 'ff_enemy_attack',
        src: ffEnemyAttack,
        category: 'sfx'
      },
      victory: {
        id: 'ff_victory',
        src: ffVictory,
        category: 'sfx'
      },
      levelUp: {
        id: 'ff_level_up',
        src: ffLevelUp,
        category: 'sfx'
      }
    }
  }
};

/**
 * Music registry - organized by theme and category
 */
export const musicTracks: Record<string, Record<string, MusicTrack[]>> = {
  // RPG music
  rpg: {
    // Battle music
    battle: [
      {
        id: 'earthbound_battle_weak',
        // Using URLs that might work in development but consider hosting these files properly
        src: 'https://example.com/audio/placeholder-battle.mp3',
        category: 'music',
        title: 'Battle Against a Weak Opponent',
        artist: 'Earthbound',
        loop: true
      },
      {
        id: 'earthbound_battle_strong',
        src: 'https://example.com/audio/placeholder-battle-strong.mp3',
        category: 'music',
        title: 'Battle Against a Mobile Opponent',
        artist: 'Earthbound',
        loop: true
      },
      {
        id: 'chrono_battle',
        src: 'https://example.com/audio/placeholder-chrono-battle.mp3',
        category: 'music',
        title: 'Battle Theme',
        artist: 'Chrono Trigger',
        loop: true
      }
    ],
    
    // Field music
    field: [
      {
        id: 'earthbound_onett',
        src: 'https://example.com/audio/placeholder-field.mp3',
        category: 'music',
        title: 'Onett',
        artist: 'Earthbound',
        loop: true
      },
      {
        id: 'chrono_peaceful',
        src: 'https://example.com/audio/placeholder-peaceful.mp3',
        category: 'music',
        title: 'Peaceful Days',
        artist: 'Chrono Trigger',
        loop: true
      }
    ],
    
    // Menu music
    menu: [
      {
        id: 'earthbound_menu',
        src: 'https://example.com/audio/placeholder-menu.mp3',
        category: 'music',
        title: 'Menu Screen',
        artist: 'Earthbound',
        loop: true
      },
      {
        id: 'ff7_menu',
        src: 'https://example.com/audio/placeholder-ff7-menu.mp3',
        category: 'music',
        title: 'World Map',
        artist: 'Final Fantasy VII',
        loop: true
      }
    ],
    
    // Victory music
    victory: [
      {
        id: 'earthbound_victory',
        src: 'https://example.com/audio/placeholder-victory.mp3',
        category: 'music',
        title: 'You Win',
        artist: 'Earthbound',
        loop: false
      },
      {
        id: 'ff_victory',
        src: 'https://example.com/audio/placeholder-ff-victory.mp3',
        category: 'music',
        title: 'Victory Fanfare',
        artist: 'Final Fantasy VII',
        loop: false
      }
    ]
  }
};

/**
 * Get a sound effect based on current theme settings
 * @param category The sound category (ui or rpg)
 * @param soundId The ID of the sound to get
 * @returns Sound effect object or undefined
 */
export function getSound(category: 'ui' | 'rpg', soundId: string, theme?: string): SoundEffect | undefined {
  // If no theme provided, we can't get the sound
  if (!theme) {
    debug.warn(`No theme provided for ${category} sound: ${soundId}`);
    return undefined;
  }
  
  // Check if the category exists
  const categoryData = soundEffects[category];
  if (!categoryData) {
    debug.warn(`Sound category not found: ${category}`);
    return undefined;
  }
  
  // Check if the theme exists
  const themeData = categoryData[theme];
  if (!themeData) {
    debug.warn(`Theme not found for ${category}: ${theme}`);
    return undefined;
  }
  
  // Check if the sound exists
  const sound = themeData[soundId];
  if (!sound) {
    debug.warn(`Sound not found in ${theme} ${category}: ${soundId}`);
    return undefined;
  }
  
  return sound;
}

/**
 * Get music tracks for a specific category
 * @param category Music category (e.g., battle, field)
 * @returns Array of music tracks or empty array
 */
export function getMusicByCategory(category: string): MusicTrack[] {
  return musicTracks.rpg[category] || [];
}