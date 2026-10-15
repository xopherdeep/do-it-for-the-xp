<template>
  <span ref="textContainer" :class="['xp-typing-text  rpg-box', {'rpg-text': isRpgStyled}]">
    <slot v-if="showSlot"></slot>
    <span v-else v-html="sanitizeHtml(displayedText)"></span>
    <span v-if="isTyping && cursorVisible" class="typing-cursor">|</span>
    <!-- Only show the continue marker when typing is complete and there's more text to read -->
    <span v-if="!isTyping && hasMoreText" class="typing-more-marker" aria-hidden="true">&#9660;</span>
  </span>
</template>

<script lang="ts">
import { play$fx } from '@/assets/fx';
import { defineComponent, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { pacedLetterMs } from '@/lib/utils/textSpeed';

export default defineComponent({
  name: 'XpTypingText',
  props: {
    text: {
      type: String,
      required: true
    },
    speed: {
      type: Number,
      default: 50 // milliseconds between characters at Normal text speed; the player's Text speed setting scales it
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
    },
    /** Tapping the text finishes (or restarts) the typing. Hosts that own the tap, like the battle dialog, turn this off. */
    interactive: {
      type: Boolean,
      default: true
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

    const isSoundOn = () => props.playSound;
    const isAutoStart = () => props.autoStart;
    /** The authored pace scaled by the player's Text speed; 0 is Instant */
    const letterMs = () => pacedLetterMs(props.speed);

    const typeNextChar = (timestamp: number) => {
      const isTypingOnHold = !isTyping.value || isPaused.value;
      if (isTypingOnHold) {
        lastFrameTime = timestamp;
        animationFrameId = window.requestAnimationFrame(typeNextChar);
        return;
      }

      if (!lastFrameTime) lastFrameTime = timestamp;
      const deltaTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      accumulatedTime += deltaTime;

      const msPerChar = letterMs();
      const isShownAtOnce = msPerChar <= 0;
      if (isShownAtOnce) {
        completeTyping();
        return;
      }

      const isCharDue = accumulatedTime >= msPerChar;
      if (isCharDue) {
        // How many characters to type in this frame (handle lag spikes)
        // With looping sound, we can type as fast as needed without audio issues
        let charsToType = Math.floor(accumulatedTime / msPerChar);
        
        // Cap catch-up to 5 chars per frame to prevent freezing/massive jumps
        const isCatchUpTooBig = charsToType > 5;
        if (isCatchUpTooBig) charsToType = 5; 
        
        while (charsToType > 0 && isTyping.value) {
           const hasCharsLeft = charIndex.value < props.text.length;
           if (hasCharsLeft) {
            const char = props.text[charIndex.value];
            displayedText.value += char;

            // One short blip every other visible character, like the SNES text box
            const shouldBlip = props.playSound && char !== ' ' && charIndex.value % 2 === 0;
            if (shouldBlip) {
              play$fx(props.soundType);
            }

            charIndex.value++;
            emit('typing-char', charIndex.value, char);
            charsToType--;
          } else {
             isTyping.value = false;
             
             // Stop looping sound when finished
             if (isSoundOn()) {
                play$fx(props.soundType, { stop: true });
             }
             
             emit('typing-complete');
             break;
          }
        }
         // Keep remainder
         accumulatedTime %= msPerChar;
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
      
      startDelayTimeout.value = window.setTimeout(() => {
        startDelayTimeout.value = null;
        // Instant text: the whole line lands at once, no blips
        const isShownAtOnce = letterMs() <= 0;
        if (isShownAtOnce) {
          completeTyping();
          return;
        }
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
      if (isSoundOn()) {
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
      if (isSoundOn()) {
         play$fx(props.soundType, { stop: true });
      }
      
      emit('typing-complete');
    };

    const pauseTyping = () => {
      isPaused.value = true;
      // Stop sound when paused
      if (isSoundOn()) {
         play$fx(props.soundType, { stop: true });
      }
    };

    const resumeTyping = () => {
      isPaused.value = false;
      lastFrameTime = 0; // Reset frame time so we don't jump
      
      const needsFrameLoop = isTyping.value && !animationFrameId;
      if (needsFrameLoop) {
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
      if (isAutoStart()) {
        startTyping();
      }
    });

    // Start typing on mount if autoStart is true
    onMounted(() => {
      if (isAutoStart()) {
        startTyping();
      }
      
      const container = textContainer.value;
      const canTapToSkip = props.interactive && container;
      if (canTapToSkip) {
        container.addEventListener('click', handleClick);
      }
    });

    // Clean up on unmount
    onBeforeUnmount(() => {
      resetTypingState();
      // Leaving mid-line must not leave the typewriter blip looping
      const shouldSilenceBlip = isTyping.value && props.playSound;
      if (shouldSilenceBlip) {
        play$fx(props.soundType, { stop: true });
      }

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
      showSlot,
      sanitizeHtml,
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

  .typing-more-marker {
    display: inline-block;
    margin-left: 6px;
    font-size: 0.85em;
    color: #ffd84a;
    vertical-align: baseline;
    animation: marker-bounce 0.9s ease-in-out infinite;
  }
}

@keyframes marker-bounce {
  0%, 100% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(3px);
    opacity: 0.5;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>