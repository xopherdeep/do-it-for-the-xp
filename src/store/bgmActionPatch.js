/**
 * BGM (Background Music) Action Patch
 * 
 * This file contains a modified implementation of the changeBGM action
 * that can be integrated with your existing Vuex store actions to prevent
 * double playback when using the new audio engine.
 * 
 * Instructions: 
 * 1. Find your existing changeBGM action in your actions file
 * 2. Replace it with this implementation
 * OR
 * 3. Add the _usingNewAudioEngine flag check to your existing implementation
 */

// Modified changeBGM action that checks for the _usingNewAudioEngine flag
export const changeBGM = function(context, payload) {
  // Always commit the payload to update the state
  context.commit('CHANGE_BGM', payload);
  
  // Skip audio playback when using the new audio engine
  // This prevents double playback
  if (payload._usingNewAudioEngine) {
    // Just update state without playing audio
    // The new audio engine is handling playback
    return;
  }
  
  // Legacy playback code below
  // This will only run when NOT using the new audio engine
  const { state } = context;
  const audio = state.bgm.audio;
  
  // Skip if music is turned off
  if (!state.bgm.is_on) return;
  
  // Set up the audio
  if (payload.tracks && payload.tracks.length && payload.track !== undefined) {
    const track = payload.tracks[payload.track];
    const src = typeof track === 'string' ? track : (track.src || '');
    
    if (src) {
      audio.src = src;
      audio.loop = true;
      
      // Handle delay
      const startDelay = payload.startDelay || 0;
      if (startDelay > 0) {
        setTimeout(() => {
          audio.play().catch(err => console.error("Failed to play audio:", err));
        }, startDelay);
      } else {
        audio.play().catch(err => console.error("Failed to play audio:", err));
      }
    }
  }
};

/**
 * How to use this in your existing actions.js file:
 * 
 * // Example integration
 * export default {
 *   // Other actions...
 *   
 *   // Replace your existing changeBGM with this one
 *   changeBGM(context, payload) {
 *     // Always commit the payload to update the state
 *     context.commit('CHANGE_BGM', payload);
 *     
 *     // Skip audio playback when using the new audio engine
 *     if (payload._usingNewAudioEngine) {
 *       return;
 *     }
 *     
 *     // Your existing implementation follows...
 *     const audio = context.state.bgm.audio;
 *     // etc...
 *   },
 *   
 *   // Other actions...
 * };
 */