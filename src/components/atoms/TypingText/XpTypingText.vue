<template>
  <span ref="textContainer" :class="['xp-typing-text  rpg-box', {'rpg-text': isRpgStyled}]">
    <slot v-if="showSlot"></slot>
    <span v-else v-html="displayedText"></span>
    <span v-if="isTyping && cursorVisible" class="typing-cursor">|</span>
    <!-- Only show the caret when typing is complete and there's more text to read -->
    <i v-if="!isTyping && hasMoreText" class="fad fa-caret-down fa-2x float-right mt-3 animate-bounce" />
  </span>
</template>

<script lang="ts">
import { play$fx } from '@/assets/fx';
import { defineComponent, ref, onMounted, onBeforeUnmount, watch } from 'vue';

export default defineComponent({
  name: 'XpTypingText',
  props: {
    text: {
      type: String,
      required: true
    },
    speed: {
      type: Number,
      default: 50 // milliseconds between characters
    },
    delay: {
      type: Number,
      default: 0 // initial delay before starting
    },
    playSound: {
      type: Boolean,
      default: true
    },
    autoStart: {
      type: Boolean,
      default: true
    },
    cursorVisible: {
      type: Boolean,
      default: true
    },
    isRpgStyled: {
      type: Boolean,
      default: true
    },
    soundTheme: {
      type: String,
      default: 'rpg'
    },
    soundType: {
      type: String,
      default: 'text'
    },
    hasMoreText: {
      type: Boolean,
      default: false
    }
  },

  emits: ['typing-complete', 'typing-start', 'typing-char'],
  setup(props, { emit }) {
    const displayedText = ref('');
    const isTyping = ref(false);
    const isPaused = ref(false);
    const textContainer = ref<HTMLElement | null>(null);
    const charIndex = ref(0);
    const showSlot = ref(false);
    let animationFrameId: number | null = null;
    let lastFrameTime: number = 0;
    let accumulatedTime: number = 0;
    const startDelayTimeout = ref<number | null>(null);

    const typeNextChar = (timestamp: number) => {
      if (!isTyping.value || isPaused.value) {
        lastFrameTime = timestamp;
        animationFrameId = window.requestAnimationFrame(typeNextChar);
        return;
      }

      if (!lastFrameTime) lastFrameTime = timestamp;
      const deltaTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      accumulatedTime += deltaTime;

      if (accumulatedTime >= props.speed) {
        // How many characters to type in this frame (handle lag spikes)
        // With looping sound, we can type as fast as needed without audio issues
        let charsToType = Math.floor(accumulatedTime / props.speed);
        
        // Cap catch-up to 5 chars per frame to prevent freezing/massive jumps
        if (charsToType > 5) charsToType = 5; 
        
        while (charsToType > 0 && isTyping.value) {
           if (charIndex.value < props.text.length) {
            const char = props.text[charIndex.value];
            displayedText.value += char;
            
            // Per-character sound removed in favor of looping background sound
            
            charIndex.value++;
            emit('typing-char', charIndex.value, char);
            charsToType--;
          } else {
             isTyping.value = false;
             
             // Stop looping sound when finished
             if (props.playSound) {
                play$fx(props.soundType, { stop: true });
             }
             
             emit('typing-complete');
             break;
          }
        }
         // Keep remainder
         accumulatedTime %= props.speed;
      }
      
      if (isTyping.value) {
        animationFrameId = window.requestAnimationFrame(typeNextChar);
      } else {
        animationFrameId = null;
      }
    };

    const startTyping = () => {
      if (isTyping.value) return;
      
      resetTypingState();
      
      isTyping.value = true;
      charIndex.value = 0;
      displayedText.value = '';
      emit('typing-start');
      
      // Start looping sound
      if (props.playSound) {
         play$fx(props.soundType, { loop: true });
      }
      
      startDelayTimeout.value = window.setTimeout(() => {
        lastFrameTime = 0;
        accumulatedTime = 0;
        animationFrameId = window.requestAnimationFrame(typeNextChar);
        startDelayTimeout.value = null;
      }, props.delay);
    };

    const resetTypingState = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (startDelayTimeout.value) {
        clearTimeout(startDelayTimeout.value);
        startDelayTimeout.value = null;
      }
    };

    const resetTyping = () => {
      resetTypingState();
      
      isTyping.value = false;
      isPaused.value = false;
      displayedText.value = '';
      charIndex.value = 0;
      
      // Stop sound if resetting
      if (props.playSound) {
         play$fx(props.soundType, { stop: true });
      }
    };


    const completeTyping = () => {
      if (!isTyping.value) return;
      
      resetTypingState(); // Cancel any pending frames
      
      displayedText.value = props.text;
      charIndex.value = props.text.length;
      isTyping.value = false;
      
      // Stop sound
      if (props.playSound) {
         play$fx(props.soundType, { stop: true });
      }
      
      emit('typing-complete');
    };

    const pauseTyping = () => {
      isPaused.value = true;
      // Stop sound when paused
      if (props.playSound) {
         play$fx(props.soundType, { stop: true });
      }
    };

    const resumeTyping = () => {
      isPaused.value = false;
      lastFrameTime = 0; // Reset frame time so we don't jump
      
      // Resume sound if we are still typing
      if (isTyping.value && props.playSound) {
         play$fx(props.soundType, { loop: true });
      }
      
      if (isTyping.value && !animationFrameId) {
         animationFrameId = window.requestAnimationFrame(typeNextChar);
      }
    };

    // Click handler to skip or complete the animation
    const handleClick = () => {
      if (isTyping.value) {
        completeTyping();
      } else {
        startTyping();
      }
    };

    // Watch for text changes and restart animation
    watch(() => props.text, () => {
      resetTyping();
      if (props.autoStart) {
        startTyping();
      }
    });

    // Start typing on mount if autoStart is true
    onMounted(() => {
      if (props.autoStart) {
        startTyping();
      }
      
      if (textContainer.value) {
        textContainer.value.addEventListener('click', handleClick);
      }
    });

    // Clean up on unmount
    onBeforeUnmount(() => {
       resetTypingState();
      
      if (textContainer.value) {
        textContainer.value.removeEventListener('click', handleClick);
      }
    });


    return {
      displayedText,
      isTyping,
      isPaused,
      textContainer,
      startTyping,
      completeTyping,
      resetTyping,
      pauseTyping,
      resumeTyping,
      showSlot
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-typing-text {
  display: inline-block;
  cursor: pointer;
  position: relative;
  padding: 0;
  text-align: left;
  &.rpg-text {
    font-family: 'StatusPlz', monospace;
    line-height: 1.5;
  }
  
  .typing-cursor {
    display: inline-block;
    animation: blink 0.7s infinite;
    margin-left: 2px;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>