<template>
  <div 
    class="xp-dialog-container" 
    :class="{ 'active': isVisible }"
    @click="handleClick"
  >
    <ion-card class="xp-dialog-box rpg-box">
      <div class="dialog-content">
        <xp-typing-text
          ref="typingText"
          :text="currentText"
          :speed="textSpeed"
          :is-rpg-styled="true"
          :has-more-text="hasMoreText"
          :sound-theme="$fx.theme.rpg"
          sound-type="text"
          @typing-complete="onTypingComplete"
        />
      </div>
      <div v-if="!isTyping" class="dialog-indicator">
        <i v-if="hasMoreText" class="fad fa-chevron-down blink"></i>
        <i v-else class="fad fa-caret-right blink"></i>
      </div>
    </ion-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, watch } from 'vue';
import XpTypingText from '@/components/atoms/TypingText/XpTypingText.vue';
import debug from '@/lib/utils/debug';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'XpDialog',
  mixins: [Ionic],
  components: {
    XpTypingText
  },
  props: {
    // Array of text paragraphs to display
    textBlocks: {
      type: Array as PropType<string[]>,
      required: true
    },
    // Speed of text typing animation in ms
    textSpeed: {
      type: Number,
      default: 50
    }
  },
  setup(props, { emit }) {
    const isVisible = ref(false);
    const currentBlockIndex = ref(0);
    const typingText = ref<InstanceType<typeof XpTypingText> | null>(null);
    const currentText = ref('');
    const isTyping = ref(false);
    const hasMoreText = ref(false);

    // Update the text based on current index
    const updateCurrentText = () => {
      if (props.textBlocks.length > 0 && currentBlockIndex.value < props.textBlocks.length) {
        currentText.value = props.textBlocks[currentBlockIndex.value];
        isTyping.value = true;
      } else {
        currentText.value = '';
        isTyping.value = false;
      }
      hasMoreText.value = currentBlockIndex.value < props.textBlocks.length - 1;
    };

    // Reset component state
    const resetState = () => {
      currentBlockIndex.value = 0;
      updateCurrentText();
      debug.log(`Dialog reset with ${props.textBlocks.length} blocks. First block: "${currentText.value.substring(0, 20)}..."`);
    };

    // Watch for changes in textBlocks
    watch(() => props.textBlocks, () => {
      resetState();
    }, { deep: true });

    const show = () => {
      resetState();
      isVisible.value = true;
      if (typingText.value) {
        typingText.value.startTyping();
      }
    };

    const hide = () => {
      isVisible.value = false;
      resetState();
    };

    const nextBlock = () => {
      if (currentBlockIndex.value < props.textBlocks.length - 1) {
        currentBlockIndex.value++;
        updateCurrentText();
        if (typingText.value) {
          typingText.value.startTyping();
        }
      } else {
        hide();
        emit('dialog-complete');
      }
    };

    const handleClick = () => {
      if (typingText.value?.isTyping) {
        typingText.value.completeTyping();
      } else {
        nextBlock();
      }
    };

    const onTypingComplete = () => {
      emit('block-complete', currentBlockIndex.value);
    };

    // Initialize text on component creation
    resetState();

    return {
      isVisible,
      isTyping,
      currentText,
      hasMoreText,
      typingText,
      show,
      hide,
      handleClick,
      onTypingComplete
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-dialog-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 1rem;
  pointer-events: none;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);

  &.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
}

.xp-dialog-box {
  background: rgba(13, 13, 25, 0.95);
  border: 2px solid var(--ion-color-primary);
  border-radius: 12px;
  padding: 1.25rem;
  min-height: 120px;
  position: relative;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(var(--ion-color-primary-rgb), 0.1);
  backdrop-filter: blur(8px);

  .dialog-content {
    color: #fff;
    font-size: 1.15rem;
    line-height: 1.6;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .dialog-indicator {
    position: absolute;
    bottom: 0.75rem;
    right: 1rem;
    color: var(--ion-color-primary);
    font-size: 1.2rem;
    
    .blink {
      animation: blink 0.8s infinite;
    }
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.9); }
}
</style>