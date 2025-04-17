`<template>
  <div class="xp-dialog-container" :class="{ 'active': isVisible }">
    <div class="xp-dialog-box rpg-box">
      <div class="dialog-content">
        <xp-typing-text
          ref="typingText"
          :text="currentText"
          :speed="textSpeed"
          :is-rpg-styled="true"
          :sound-theme="$fx.theme.rpg"
          sound-type="text"
          @typing-complete="onTypingComplete"
        />
      </div>
      <div v-if="hasMoreText" class="dialog-indicator">
        <i class="fad fa-chevron-down blink"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import XpTypingText from '@/components/XpTypingText';

export default defineComponent({
  name: 'XpDialog',
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
    const currentText = ref(props.textBlocks[0] || '');
    const hasMoreText = ref(props.textBlocks.length > 1);

    const show = () => {
      isVisible.value = true;
      if (typingText.value) {
        typingText.value.startTyping();
      }
    };

    const hide = () => {
      isVisible.value = false;
      currentBlockIndex.value = 0;
      currentText.value = props.textBlocks[0] || '';
      hasMoreText.value = props.textBlocks.length > 1;
    };

    const nextBlock = () => {
      if (currentBlockIndex.value < props.textBlocks.length - 1) {
        currentBlockIndex.value++;
        currentText.value = props.textBlocks[currentBlockIndex.value];
        hasMoreText.value = currentBlockIndex.value < props.textBlocks.length - 1;
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

    return {
      isVisible,
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
  z-index: 1000;
  padding: 1rem;
  pointer-events: none;
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.3s ease, transform 0.3s ease;

  &.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
}

.xp-dialog-box {
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid var(--ion-color-light);
  border-radius: 8px;
  padding: 1rem;
  min-height: 100px;
  position: relative;
  cursor: pointer;

  .dialog-content {
    font-size: 1.1em;
    line-height: 1.5;
    color: var(--ion-color-light);
  }

  .dialog-indicator {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    color: var(--ion-color-light);
    
    .blink {
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>`