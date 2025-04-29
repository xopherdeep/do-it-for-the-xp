import { App } from 'vue';
import { AudioEngine } from './AudioEngine';
import { installGlobalCompatibilityLayer } from './migration';

/**
 * Vue plugin for the Audio Engine
 * This makes the audio engine available throughout the Vue application
 */
export const AudioEnginePlugin = {
  install: (app: App) => {
    // Get the singleton instance
    const audioEngine = AudioEngine.getInstance();
    
    // Initialize the engine
    audioEngine.initialize();
    
    // Install the compatibility layer for the old window.$fx API
    installGlobalCompatibilityLayer();
    
    // Make it available via this.$audio in options API
    app.config.globalProperties.$audio = audioEngine;
    
    // Make it available via inject() in composition API
    app.provide('audioEngine', audioEngine);
  }
};