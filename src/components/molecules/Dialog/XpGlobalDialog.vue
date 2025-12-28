<template>
  <div 
    class="xp-global-dialog" 
    :class="{ 'active': isVisible }"
    @click="handleClick"
  >
    <ion-card class="dialog-box rpg-box">
      <div class="dialog-close" @click.stop="hide">
        <i class="fad fa-times"></i>
      </div>
      <div class="dialog-content">
        <xp-typing-text
          ref="typingText"
          :text="currentText"
          :speed="30"
          :auto-start="true"
          :is-rpg-styled="true"
          :sound-theme="$fx.theme.rpg"
          sound-type="text"
          @typing-complete="onTypingComplete"
        />
      </div>
      <div v-if="!isTyping" class="dialog-indicator">
        <i v-if="hasMoreBlocks" class="fad fa-chevron-down blink"></i>
        <i v-else class="fad fa-caret-right blink"></i>
      </div>
    </ion-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { IonCard } from '@ionic/vue';
import XpTypingText from '@/components/atoms/TypingText/XpTypingText.vue';
import { dialogSystem, DialogOptions } from '@/lib/engine/core/DialogSystem';

export default defineComponent({
  name: 'XpGlobalDialog',
  components: {
    IonCard,
    XpTypingText
  },
  setup() {
    const currentText = ref('');
    const textBlocks = ref<string[]>([]);
    const currentBlockIndex = ref(0);
    const hasMoreBlocks = ref(false);
    const isVisible = ref(false);
    const isTyping = ref(false);
    const autoDismiss = ref(false);
    const onDismissCallback = ref<(() => void) | null>(null);
    const dismissTimeout = ref<number | null>(null);
    const typingText = ref<InstanceType<typeof XpTypingText> | null>(null);

    // Display function to be registered with DialogSystem
    const displayMessage = (message: string | string[], options: DialogOptions = {}) => {
      if (Array.isArray(message)) {
        textBlocks.value = message;
        currentBlockIndex.value = 0;
        currentText.value = textBlocks.value[0];
        hasMoreBlocks.value = textBlocks.value.length > 1;
      } else {
        textBlocks.value = [message];
        currentBlockIndex.value = 0;
        currentText.value = message;
        hasMoreBlocks.value = false;
      }

      autoDismiss.value = options.autoDismiss ?? false;
      onDismissCallback.value = options.onDismiss ?? null;
      isVisible.value = true;
      isTyping.value = true;
      
      // Clear any existing timeout
      if (dismissTimeout.value) {
        clearTimeout(dismissTimeout.value);
        dismissTimeout.value = null;
      }
    };

    const hide = () => {
      isVisible.value = false;
      currentText.value = '';
      textBlocks.value = [];

      if (onDismissCallback.value) {
        onDismissCallback.value();
        onDismissCallback.value = null;
      }

      if (dismissTimeout.value) {
        clearTimeout(dismissTimeout.value);
        dismissTimeout.value = null;
      }
    };

    const nextBlock = () => {
      if (currentBlockIndex.value < textBlocks.value.length - 1) {
        currentBlockIndex.value++;
        currentText.value = textBlocks.value[currentBlockIndex.value];
        hasMoreBlocks.value = currentBlockIndex.value < textBlocks.value.length - 1;
        isTyping.value = true;
      } else {
        hide();
      }
    };

    const handleClick = () => {
      if (isTyping.value && typingText.value) {
        // Complete the typing immediately
        typingText.value.completeTyping?.();
      } else if (hasMoreBlocks.value) {
        nextBlock();
      } else {
        // Dismiss the dialog
        hide();
      }
    };

    const onTypingComplete = () => {
      isTyping.value = false;
      if (autoDismiss.value && !hasMoreBlocks.value) {
        dismissTimeout.value = window.setTimeout(() => {
          hide();
        }, 2000);
      }
    };

    // Register with DialogSystem on mount
    onMounted(() => {
      dialogSystem.registerDisplayFunction('global', displayMessage);
      dialogSystem.setDefaultDisplayFunction('global');
    });

    // Unregister on unmount
    onUnmounted(() => {
      dialogSystem.unregisterDisplayFunction('global');
      if (dismissTimeout.value) {
        clearTimeout(dismissTimeout.value);
      }
    });

    return {
      isVisible,
      currentText,
      hasMoreBlocks,
      isTyping,
      typingText,
      hide,
      handleClick,
      onTypingComplete
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-global-dialog {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999; // Maximum z-index to block everything
  padding: 0 2.5%; // 2.5% margin on left and right
  padding-bottom: 10px; // Small gap from bottom edge
  pointer-events: none;
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.3s ease, transform 0.3s ease;
  display: flex;
  justify-content: center; // Center the dialog box

  &.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .dialog-box {
    width: 100%; // Takes full width of padded container
    max-width: 600px; // Cap for larger screens
    margin: 0;
    border-radius: 12px; // Rounded corners since it's not flush
    background: rgba(10, 10, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 2px solid var(--ion-color-primary);
    // min-height: 80px;
    padding: 1rem 1.25rem;
    position: relative;
    cursor: pointer;
    backdrop-filter: blur(10px);

    .dialog-close {
      position: absolute;
      top: 10px;
      right: 15px;
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      z-index: 10;
      padding: 5px;
      transition: color 0.2s;

      &:hover {
        color: white;
      }
    }

    .dialog-content {
      color: rgba(255, 255, 255, 0.95);
      font-family: 'StatusPlz', monospace;
      font-size: 1.1rem;
      line-height: 1.6;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 1);
    }

    .dialog-indicator {
      position: absolute;
      bottom: 10px;
      right: 15px;
      color: var(--ion-color-primary);

      .blink {
        animation: blink 1s infinite;
      }
    }
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
