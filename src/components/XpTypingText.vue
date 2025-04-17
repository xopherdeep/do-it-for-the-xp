<template>
  <div class="typing-text">
    <span>{{ displayedText }}</span>
    <span v-if="isTyping" class="typing-cursor">|</span>
  </div>
</template>

<script lang="ts">
import { play$fx } from '@/assets/fx';
import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue';

export default defineComponent({
  name: 'XpTypingText',
  props: {
    text: {
      type: String,
      required: true
    },
    speed: {
      type: Number,
      default: 50
    },
    autoStart: {
      type: Boolean,
      default: false
    },
    soundTheme: {
      type: Object,
      default: null
    },
    soundType: {
      type: String,
      default: 'text'
    }
  },
  emits: ['typing-complete'],
  setup(props, { emit }) {
    const displayedText = ref('');
    const isTyping = ref(false);
    const currentIndex = ref(0);
    let typingInterval: number | null = null;

    const playTypeSound = () => {
      // Only play sound if sound theme is provided
      play$fx("text")
    };

    const typeText = () => {
      if (!isTyping.value) {
        isTyping.value = true;
        currentIndex.value = 0;
        displayedText.value = '';
      }

      typingInterval = window.setInterval(() => {
        if (currentIndex.value < props.text.length) {
          displayedText.value += props.text.charAt(currentIndex.value);
          currentIndex.value++;
          
          // Play typing sound every few characters to avoid sound overload
          if (currentIndex.value % 3 === 0) {
            playTypeSound();
          }
        } else {
          stopTyping();
          emit('typing-complete');
        }
      }, props.speed);
    };

    const stopTyping = () => {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      isTyping.value = false;
    };

    const resetTyping = () => {
      stopTyping();
      currentIndex.value = 0;
      displayedText.value = '';
    };

    // Start typing when autoStart becomes true
    watch(() => props.autoStart, (newVal) => {
      if (newVal) {
        resetTyping();
        typeText();
      }
    });

    // When text changes, reset the animation
    watch(() => props.text, () => {
      resetTyping();
      if (props.autoStart) {
        typeText();
      }
    });

    // Start typing automatically if autoStart is true
    onMounted(() => {
      if (props.autoStart) {
        typeText();
      }
    });

    // Clean up interval when component is destroyed
    onBeforeUnmount(() => {
      stopTyping();
    });

    return {
      displayedText,
      isTyping,
      typeText,
      stopTyping,
      resetTyping
    };
  }
});
</script>

<style scoped>
.typing-text {
  display: inline-block;
  min-height: 1.5em;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  animation: blink 0.7s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>