import { SoundEffect, MusicTrack } from './AudioEngine';

// Helper function to generate placeholder URLs for development
function getPlaceholderAudio(name: string): string {
  // In a real implementation, you would use actual audio files
  // For now, we'll use placeholders to avoid build errors
  return `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABMYXZjNTguMTMuMTAw`;
}

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
        src: getPlaceholderAudio('nintendo_select'),
        category: 'ui'
      },
      confirm: {
        id: 'nintendo_confirm',
        src: getPlaceholderAudio('nintendo_confirm'),
        category: 'ui'
      },
      cancel: {
        id: 'nintendo_cancel',
        src: getPlaceholderAudio('nintendo_cancel'),
        category: 'ui'
      },
      error: {
        id: 'nintendo_error',
        src: getPlaceholderAudio('nintendo_error'),
        category: 'ui'
      },
      popup: {
        id: 'nintendo_popup',
        src: getPlaceholderAudio('nintendo_popup'),
        category: 'ui'
      }
    },
    // Sony UI theme
    sony: {
      select: {
        id: 'sony_select',
        src: getPlaceholderAudio('sony_select'),
        category: 'ui'
      },
      confirm: {
        id: 'sony_confirm',
        src: getPlaceholderAudio('sony_confirm'),
        category: 'ui'
      },
      cancel: {
        id: 'sony_cancel',
        src: getPlaceholderAudio('sony_cancel'),
        category: 'ui'
      },
      error: {
        id: 'sony_error',
        src: getPlaceholderAudio('sony_error'),
        category: 'ui'
      },
      popup: {
        id: 'sony_popup',
        src: getPlaceholderAudio('sony_popup'),
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
        src: getPlaceholderAudio('earthbound_attack'),
        category: 'sfx'
      },
      hit: {
        id: 'earthbound_hit',
        src: getPlaceholderAudio('earthbound_hit'),
        category: 'sfx'
      },
      enemyAttack: {
        id: 'earthbound_enemy_attack',
        src: getPlaceholderAudio('earthbound_enemy_attack'),
        category: 'sfx'
      },
      victory: {
        id: 'earthbound_victory',
        src: getPlaceholderAudio('earthbound_victory'),
        category: 'sfx'
      },
      levelUp: {
        id: 'earthbound_level_up',
        src: getPlaceholderAudio('earthbound_level_up'),
        category: 'sfx'
      }
    },
    // Chrono Trigger sound theme
    chronoTrigger: {
      attack: {
        id: 'chrono_attack',
        src: getPlaceholderAudio('chrono_attack'),
        category: 'sfx'
      },
      hit: {
        id: 'chrono_hit',
        src: getPlaceholderAudio('chrono_hit'),
        category: 'sfx'
      },
      enemyAttack: {
        id: 'chrono_enemy_attack',
        src: getPlaceholderAudio('chrono_enemy_attack'),
        category: 'sfx'
      },
      victory: {
        id: 'chrono_victory',
        src: getPlaceholderAudio('chrono_victory'),
        category: 'sfx'
      },
      levelUp: {
        id: 'chrono_level_up',
        src: getPlaceholderAudio('chrono_level_up'),
        category: 'sfx'
      }
    },
    // Final Fantasy sound theme
    finalFantasy: {
      attack: {
        id: 'ff_attack',
        src: getPlaceholderAudio('ff_attack'),
        category: 'sfx'
      },
      hit: {
        id: 'ff_hit',
        src: getPlaceholderAudio('ff_hit'),
        category: 'sfx'
      },
      enemyAttack: {
        id: 'ff_enemy_attack',
        src: getPlaceholderAudio('ff_enemy_attack'),
        category: 'sfx'
      },
      victory: {
        id: 'ff_victory',
        src: getPlaceholderAudio('ff_victory'),
        category: 'sfx'
      },
      levelUp: {
        id: 'ff_level_up',
        src: getPlaceholderAudio('ff_level_up'),
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
    console.warn(`No theme provided for ${category} sound: ${soundId}`);
    return undefined;
  }
  
  // Check if the category exists
  const categoryData = soundEffects[category];
  if (!categoryData) {
    console.warn(`Sound category not found: ${category}`);
    return undefined;
  }
  
  // Check if the theme exists
  const themeData = categoryData[theme];
  if (!themeData) {
    console.warn(`Theme not found for ${category}: ${theme}`);
    return undefined;
  }
  
  // Check if the sound exists
  const sound = themeData[soundId];
  if (!sound) {
    console.warn(`Sound not found in ${theme} ${category}: ${soundId}`);
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