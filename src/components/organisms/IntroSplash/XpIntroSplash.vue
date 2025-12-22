<template>
  <div class="xp-intro-splash" :class="{ 'active': isActive }">
    <!-- Main splash image with background transition -->
    <div class="splash-container" :class="{ 'fade-in': fadeIn, 'fade-out': fadeOut }">
      <!-- Main splash image -->
      <div v-if="currentSplash" class="splash-image">
        <img 
          :src="currentSplash.image" 
          :alt="currentSplash.alt || 'Splash image'"
          :class="{ 'pixel-art': usePixelArtScaling }"
        >
      </div>

      <!-- Text overlay with RPG style typing -->
      <div v-if="showText && currentSplash?.text" class="splash-text rpg-box">
        <xp-typing-text
          ref="typingText"
          :text="currentSplash.text"
          :speed="textSpeed"
          :is-rpg-styled="true"
          :sound-theme="$fx.theme.rpg"
          sound-type="text"
          @typing-complete="onTypingComplete"
        />
      </div>

      <!-- Skip button -->
      <div v-if="showSkipButton" class="skip-button" @click.stop="skipIntro">
        Press any key to skip
      </div>
      
      <!-- Hidden image preloader -->
      <div class="preload-container">
        <img 
          v-for="(splash, i) in splashScreens" 
          :key="i" 
          :src="splash.image"
          @load="onImagePreloaded()"
          @error="onImagePreloaded()"
          class="preload-image"
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, onMounted, onUnmounted, watch } from 'vue';
import XpTypingText from '@/components/atoms/TypingText/XpTypingText.vue';
import debug from '@/lib/utils/debug';

// Define the structure of a splash screen
export interface SplashScreen {
  image: string;        // Path to image
  text?: string;        // Optional text to display
  alt?: string;         // Alt text for image
  duration?: number;    // How long to display this splash
  soundEffect?: string; // Optional sound effect to play
}

export default defineComponent({
  name: 'XpIntroSplash',
  components: {
    XpTypingText
  },
  props: {
    splashScreens: {
      type: Array as PropType<SplashScreen[]>,
      required: true
    },
    autoPlay: {
      type: Boolean,
      default: true
    },
    defaultDuration: {
      type: Number,
      default: 3000 // 3 seconds
    },
    transitionDuration: {
      type: Number,
      default: 800 // milliseconds
    },
    textSpeed: {
      type: Number,
      default: 50 // milliseconds between characters
    },
    usePixelArtScaling: {
      type: Boolean,
      default: true // Use pixel art scaling by default
    },
    skipEnabled: {
      type: Boolean,
      default: true
    },
    showSkipButton: {
      type: Boolean,
      default: true
    },
    playIntroSound: {
      type: Boolean,
      default: true
    }
  },
  emits: ['complete', 'skip', 'splash-change'],
  setup(props, { emit }) {
    // Core state
    const isActive = ref(true); // Start active by default
    const currentIndex = ref(-1);
    const currentSplash = ref<SplashScreen | null>(null);
    const fadeIn = ref(false);
    const fadeOut = ref(false);
    const showText = ref(false);
    const typingComplete = ref(false);
    const typingText = ref<InstanceType<typeof XpTypingText> | null>(null);
    
    // Preloading tracking
    const preloadedImages = ref(0);
    const totalImages = ref(props.splashScreens.length);
    const imagesReady = ref(false);
    let fallbackTimeout: number | null = null;
    
    // Reset all state variables to their initial values
    const resetState = () => {
      isActive.value = true;
      currentIndex.value = -1;
      currentSplash.value = null;
      fadeIn.value = false;
      fadeOut.value = false;
      showText.value = false;
      typingComplete.value = false;
      preloadedImages.value = 0;
      totalImages.value = props.splashScreens.length;
      imagesReady.value = false;
      
      // Clean up any timers
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      
      // Remove event listeners to prevent duplication
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    // Handle keyboard and click events for skipping
    const handleKeyDown = (event: KeyboardEvent) => {
      debug.log('Key pressed:', event.key);
      if (props.skipEnabled && isActive.value) {
        skipIntro();
      }
    };
    
    // Image preloading handler
    const onImagePreloaded = () => {
      preloadedImages.value++;
      if (preloadedImages.value >= totalImages.value) {
        imagesReady.value = true;
        if (props.autoPlay && currentIndex.value === -1) {
          startIntro();
        }
      }
    };
    
    // Handle screen click
    const handleClick = () => {
      if (!props.skipEnabled || !isActive.value) return;
      
      // If typing is in progress, complete it immediately
      if (showText.value && !typingComplete.value && typingText.value) {
        typingText.value.completeTyping();
        typingComplete.value = true;
        return;
      }
      
      // If typing is complete, advance to next splash
      if (showText.value && typingComplete.value) {
        nextSplash();
        return;
      }
      
      // Otherwise skip the entire intro
      skipIntro();
    };
    
    // Play intro sound effect
    const playSound = (sound?: string) => {
      try {
        if (sound && window.$fx && window.$fx.ui) {
          const soundPath = sound.split('.');
          if (soundPath.length > 1 && window.$fx.ui[soundPath[0]] && window.$fx.ui[soundPath[0]][soundPath[1]]) {
            window.$fx.ui[soundPath[0]][soundPath[1]].play();
          }
        }
      } catch (error) {
        debug.error("Error playing sound:", error);
      }
    };
    
    // Start the intro sequence
    const startIntro = () => {
      if (!imagesReady.value && props.splashScreens.length > 0) {
        // Wait for images to load before starting
        return;
      }
      
      isActive.value = true;
      currentIndex.value = -1;
      nextSplash();
      
      // Attach keyboard event listener
      document.addEventListener('keydown', handleKeyDown);
    };
    
    // Finish the intro sequence
    const finishIntro = () => {
      isActive.value = false;
      emit('complete');
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    // Skip the entire intro
    const skipIntro = () => {
      fadeOut.value = true;
      setTimeout(() => {
        isActive.value = false;
        emit('skip');
        document.removeEventListener('keydown', handleKeyDown);
      }, props.transitionDuration);
    };
    
    // Advance to next splash screen
    const nextSplash = async () => {
      // Handle fade out of current splash
      if (currentIndex.value >= 0) {
        fadeOut.value = true;
        showText.value = false;
        
        await new Promise(resolve => setTimeout(resolve, props.transitionDuration));
        fadeOut.value = false;
      }
      
      // Advance to next splash or finish
      currentIndex.value++;
      if (currentIndex.value >= props.splashScreens.length) {
        finishIntro();
        return;
      }
      
      // Update current splash and start fade in
      currentSplash.value = props.splashScreens[currentIndex.value];
      typingComplete.value = false;
      fadeIn.value = true;
      emit('splash-change', currentIndex.value);
      
      // Play sound effect if available
      if (currentSplash.value.soundEffect) {
        playSound(currentSplash.value.soundEffect);
      }
      
      // After transition, show text if available
      setTimeout(() => {
        fadeIn.value = false;
        if (currentSplash.value?.text) {
          showText.value = true;
        } else {
          // No text to show, move to next splash after duration
          const duration = currentSplash.value?.duration || props.defaultDuration;
          setTimeout(nextSplash, duration);
        }
      }, props.transitionDuration);
    };
    
    // Handle typing completion
    const onTypingComplete = () => {
      typingComplete.value = true;
      // Auto-advance after a delay if text is shown
      if (props.autoPlay) {
        const duration = currentSplash.value?.duration || props.defaultDuration;
        setTimeout(nextSplash, duration);
      }
    };
    
    // Watch for changes in splashScreens prop to reset the component
    watch(() => props.splashScreens, () => {
      resetState();
      totalImages.value = props.splashScreens.length;
    });
    
    // Initialize component
    onMounted(() => {
      // Reset state first to ensure clean start
      resetState();
      
      // If no images to preload, start immediately
      if (props.splashScreens.length === 0) {
        imagesReady.value = true;
        if (props.autoPlay) {
          startIntro();
        }
      }
      
      // Play intro sound if enabled
      if (props.playIntroSound) {
        playSound('splash.intro');
      }
      
      // If all images are already cached, they might not trigger load events
      // In this case, we need to start the intro manually after a short delay
      fallbackTimeout = window.setTimeout(() => {
        if (preloadedImages.value < totalImages.value && props.autoPlay) {
          debug.log('Starting intro despite not all images loaded');
          imagesReady.value = true;
          startIntro();
        }
      }, 1000);
    });
    
    // Clean up when component is unmounted
    onUnmounted(() => {
      resetState();
    });
    
    // Public method to reset and restart the intro (can be called from parent via refs)
    const restart = () => {
      resetState();
      
      // Set images as ready if they were previously loaded
      // Browsers typically cache images, so we can skip the loading phase on restart
      imagesReady.value = true;
      
      if (props.autoPlay) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          startIntro();
        }, 0);
      }
    };
    
    return {
      isActive,
      currentSplash,
      fadeIn,
      fadeOut,
      showText,
      typingText,
      skipIntro,
      startIntro,
      handleClick,
      onTypingComplete,
      onImagePreloaded,
      restart // Expose restart method for parent components
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-intro-splash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  
  &.active {
    opacity: 1;
    pointer-events: all;
  }
  
  .splash-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: start;
    
    &.fade-in {
      animation: fadeIn 0.8s ease forwards;
    }
    
    &.fade-out {
      animation: fadeOut 0.8s ease forwards;
    }
  }
  
  .splash-image {
    max-width: 100%;
    max-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      
      &.pixel-art {
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      }
    }
  }
  
  .splash-text {
    position: absolute;
    width: 95%;
    bottom: 10%;
    min-height: 160px;
    max-width: 90%;
    background-color: rgba(0, 0, 0, 0.8);
    padding: 15px;
    border-radius: 5px;
    color: white;
    border: 2px solid #444;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    z-index: 2;
  }
  
  .skip-button {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);

    background-color: rgba(0, 0, 0, 0.5);
    padding: 8px 16px;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    animation: blink 1.5s infinite;
  }
  
  .preload-container {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    
    .preload-image {
      width: 1px;
      height: 1px;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes blink {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
</style>