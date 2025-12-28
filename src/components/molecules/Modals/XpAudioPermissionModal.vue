<template>
  <transition name="fade">
    <div v-if="showModal" class="xp-audio-permission-overlay">
      <div class="permission-card rpg-box" @click="enableAudio">
        <div class="icon-wrapper">
          <i class="fal fa-music main-pulse-icon"></i>
        </div>
        <h2 class="start-text">Tap to Start</h2>
        <p class="explanation">Experience depends on audio interaction.</p>
        
        
      </div>
      
      <div class="silent-option" @click.stop="continueSilently">
        <span class="silent-text">Continue Silently</span>
        <i class="fal fa-music-slash mute-icon"></i>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { AudioEngine } from '@/lib/engine/audio/AudioEngine';

export default defineComponent({
  name: 'XpAudioPermissionModal',
  setup() {
    const audioEngine = AudioEngine.getInstance();
    
    // We show the modal if audio is NOT ready/granted
    const showModal = computed(() => {
      // Use the reactive state from AudioEngine
      return !audioEngine.state.audioPermissionGranted;
    });

    const enableAudio = async () => {
      await audioEngine.resumeContext();
    };

    const continueSilently = () => {
        // Mute the engine
        audioEngine.mute();
        // Grant permission (conceptually) so the modal closes, but context remains suspended/muted until later interaction
        audioEngine.state.audioPermissionGranted = true;
        // Clear pending music so it doesn't try to auto-play if they unmute later without selecting a track
        audioEngine.state.pendingMusicId = null; 
    };

    return {
      showModal,
      enableAudio,
      continueSilently
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-audio-permission-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 99999; /* Top level */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.permission-card {
  background: rgba(20, 20, 30, 0.95);
  border: 2px solid var(--ion-color-primary, #4a90e2);
  border-radius: 16px;
  padding: 1rem;
  max-width: 90%;
  width: 320px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 0 30px rgba(var(--ion-color-primary-rgb, 74, 144, 226), 0.3);
  animation: pulse-border 2s infinite;
  cursor: pointer;
  color: white;
  font-family: "Press Start 2P", cursive;
}

.silent-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
    }

    .silent-text {
        color: rgba(255, 255, 255, 0.8);
        font-family: "Press Start 2P", cursive;
        font-size: 0.7rem;
    }

    .mute-icon {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
    }
}

.icon-wrapper {
  color: var(--ion-color-primary, #4a90e2);
  text-shadow: 0 0 15px rgba(var(--ion-color-primary-rgb, 74, 144, 226), 0.5);
  margin: 1rem 0;

  .main-pulse-icon {
    font-size: 5rem;
    animation: pulse-opacity 1.5s infinite;
  }
}

.explanation {
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.6);
  font-family: sans-serif;
  margin: 0;
  max-width: 80%;
}

.start-text {
  font-size: 1.2rem;
  margin: 0;
  color: white;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Animations */
@keyframes pulse-border {
  0% { box-shadow: 0 0 10px rgba(var(--ion-color-primary-rgb), 0.2); }
  50% { box-shadow: 0 0 25px rgba(var(--ion-color-primary-rgb), 0.6); }
  100% { box-shadow: 0 0 10px rgba(var(--ion-color-primary-rgb), 0.2); }
}

@keyframes pulse-opacity {
  0% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.4; transform: scale(0.95); }
}

/* Vue Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
