/**
 * Utility to migrate from the old window.$fx based audio system
 * to the new AudioEngine system
 */

import { AudioEngine } from './AudioEngine';
import { getSound } from './soundRegistry';

// Define the new compatibility interface
interface CompatibilityLayer {
  theme: {
    ui: string;
    rpg: string;
  };
  play$fx: (soundId: string) => string;
  set$fxTheme: (theme: string) => void;
  set$rpgTheme: (theme: string) => void;
  // Add additional legacy properties as needed
  nintendo?: any;
  sony?: any;
  rpg?: any;
}

/**
 * Creates a compatibility layer that maps the old window.$fx methods
 * to the new AudioEngine methods
 * 
 * This allows existing components to continue using the old syntax
 * while we gradually migrate to the new system
 */
export function createCompatibilityLayer(): CompatibilityLayer {
  // Get the AudioEngine instance
  const engine = AudioEngine.getInstance();
  
  // Define the compatibility object
  const compatLayer: CompatibilityLayer = {
    // Store theme settings
    theme: {
      ui: engine.state.currentTheme.ui,
      rpg: engine.state.currentTheme.rpg
    },
    
    // Play a sound effect using the old syntax
    play$fx: (soundId: string) => {
      // Check if it's a UI sound first
      const uiSound = getSound('ui', soundId, engine.state.currentTheme.ui);
      if (uiSound) {
        // Calculate volume based on UI volume
        const volume = engine.state.uiVolume / engine.state.sfxVolume;
        return engine.playSound(uiSound.id, { volume });
      }
      
      // Then check if it's an RPG sound
      const rpgSound = getSound('rpg', soundId, engine.state.currentTheme.rpg);
      if (rpgSound) {
        return engine.playSound(rpgSound.id);
      }
      
      // If sound not found, log a warning
      console.warn(`Sound not found in compatibility layer: ${soundId}`);
      return '';
    },
    
    // Set the UI theme
    set$fxTheme: (theme: string) => {
      compatLayer.theme.ui = theme;
      engine.setTheme('ui', theme);
    },
    
    // Set the RPG theme
    set$rpgTheme: (theme: string) => {
      compatLayer.theme.rpg = theme;
      engine.setTheme('rpg', theme);
    }
  };
  
  // Setup legacy object structure to avoid breaking old code
  compatLayer.nintendo = {
    switch: {
      play: () => console.warn('Legacy audio API used. Please migrate to the new audio system.')
    }
  };
  
  compatLayer.sony = {
    ps4: {
      play: () => console.warn('Legacy audio API used. Please migrate to the new audio system.')
    }
  };
  
  compatLayer.rpg = {
    earthbound: {
      play: () => console.warn('Legacy audio API used. Please migrate to the new audio system.')
    }
  };
  
  // Return the compatibility layer
  return compatLayer;
}

/**
 * Install the compatibility layer as a global window.$fx object
 * This should only be used during the transition period
 */
export function installGlobalCompatibilityLayer(): CompatibilityLayer {
  const compat = createCompatibilityLayer();
  
  // Cast to any to avoid the type error - we know the structure isn't exactly the same
  // but it should be compatible enough for our migration period
  (window as any).$fx = compat;
  console.log('Installed audio compatibility layer as window.$fx');
  return compat;
}

// Instead of redefining window.$fx, let's create a module augmentation
// that extends the existing $fx with our properties. This avoids conflict.
declare global {
  interface Window {
    _pendingAudioPlay?: boolean;
  }
}

// Type assertion to let TypeScript know that $fx exists on window
export function getFxFromWindow(): CompatibilityLayer {
  return (window as any).$fx as CompatibilityLayer;
}