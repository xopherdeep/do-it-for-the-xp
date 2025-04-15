<template>
  <span ref="textContainer" :class="['xp-typing-text', {'rpg-text': isRpgStyled}]">
    <slot v-if="showSlot"></slot>
    <span v-else v-html="displayedText"></span>
    <span v-if="isTyping && cursorVisible" class="typing-cursor">|</span>
  </span>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, PropType } from 'vue';

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
    let typingInterval: number | null = null;
    let soundCooldown = false;

    const playTextSound = () => {
      if (!props.playSound || soundCooldown) return;
      
      try {
        // Using the app's existing sound system
        if (window.$fx && window.$fx[props.soundTheme] && window.$fx[props.soundTheme][props.soundType]) {
          window.$fx[props.soundTheme][props.soundType].play();
          
          // Add small cooldown to avoid sound overlap
          soundCooldown = true;
          setTimeout(() => {
            soundCooldown = false;
          }, 50);
        }
      } catch (err) {
        console.warn('Error playing text sound:', err);
      }
    };

    const typeNextChar = () => {
      if (isPaused.value || !isTyping.value) return;
      
      if (charIndex.value < props.text.length) {
        const char = props.text[charIndex.value];
        displayedText.value += char;
        
        // Don't play sound for spaces and some punctuation
        if (char !== ' ' && char !== ',' && char !== '.') {
          playTextSound();
        }
        
        charIndex.value++;
        emit('typing-char', charIndex.value, char);
      } else {
        isTyping.value = false;
        clearInterval(typingInterval!);
        typingInterval = null;
        emit('typing-complete');
      }
    };

    const startTyping = () => {
      if (isTyping.value) return;
      
      isTyping.value = true;
      charIndex.value = 0;
      displayedText.value = '';
      emit('typing-start');
      
      if (typingInterval) {
        clearInterval(typingInterval);
      }
      
      setTimeout(() => {
        typingInterval = window.setInterval(typeNextChar, props.speed);
      }, props.delay);
    };

    const completeTyping = () => {
      if (!isTyping.value) return;
      
      clearInterval(typingInterval!);
      displayedText.value = props.text;
      charIndex.value = props.text.length;
      isTyping.value = false;
      emit('typing-complete');
    };

    const resetTyping = () => {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      
      isTyping.value = false;
      isPaused.value = false;
      displayedText.value = '';
      charIndex.value = 0;
    };

    const pauseTyping = () => {
      isPaused.value = true;
    };

    const resumeTyping = () => {
      isPaused.value = false;
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
    watch(() => props.text, (newText) => {
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
      if (typingInterval) {
        clearInterval(typingInterval);
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