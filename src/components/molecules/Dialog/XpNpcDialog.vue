<template>
  <div
    v-if="open"
    class="npc-dialog-overlay"
    role="dialog"
    :aria-label="speaker"
    tabindex="0"
    @click="advance"
    @keydown.enter.space.prevent="advance"
  >
    <!-- A building's clerk talking: the Gold Bank's box (ion-card in the Earthbound frame), shared.
         A tap finishes the line, the next tap turns to the next one, the last tap closes it. -->
    <ion-card class="npc-dialog-box">
      <ion-card-title class="dialog-header">
        <i v-if="icon" :class="icon" class="fa-lg mr-2" />
        <span>{{ speaker }}</span>
      </ion-card-title>
      <div class="dialog-content">
        <xp-typing-text
          ref="typingRef"
          :text="lines[index] || ''"
          :speed="30"
          :auto-start="true"
          :interactive="false"
          :has-more-text="hasMore"
          sound-type="text"
          class="npc-text"
          @typing-complete="onTypingComplete"
        />
      </div>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonCard, IonCardTitle } from "@ionic/vue";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import { play$fx } from "@/assets/fx";

interface NpcDialogProps {
  open: boolean;
  speaker: string;
  lines: string[];
  /** Font Awesome class for the speaker's name line */
  icon?: string;
}

const props = withDefaults(
  defineProps<NpcDialogProps>(),
  { icon: "" }
);

const emit = defineEmits<{
  (event: "update:open", open: boolean): void;
  /** The hero read the last line */
  (event: "done"): void;
}>();

const index = ref(0);
const isTyping = ref(true);
const typingRef = ref<InstanceType<typeof XpTypingText> | null>(null);
const hasMore = computed(() => index.value < props.lines.length - 1);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    index.value = 0;
    isTyping.value = true;
  },
  { immediate: true }
);

const onTypingComplete = () => {
  isTyping.value = false;
  if (hasMore.value) play$fx("text");
};

const advance = () => {
  if (isTyping.value) {
    isTyping.value = false;
    (typingRef.value as { completeTyping?: () => void } | null)?.completeTyping?.();
    return;
  }
  if (hasMore.value) {
    index.value += 1;
    isTyping.value = true;
    return;
  }
  emit("update:open", false);
  emit("done");
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.npc-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem 1rem max(1rem, env(safe-area-inset-bottom));
  background: rgba(10, 2, 10, 0.45);
  backdrop-filter: blur(2px);
  z-index: 100000;
  cursor: pointer;
}

.npc-dialog-box {
  width: 100%;
  max-width: 520px;
  margin: 0;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);

  .dialog-header {
    display: flex;
    align-items: center;
    padding: 8px 14px;
    font-family: $eb-font-status;
    font-size: 1.05rem;
    color: #ffd84a;
    border-bottom: 1px solid rgba(231, 230, 179, 0.22);
    margin: 0;
  }

  .dialog-content {
    padding: 10px 14px 12px;
    min-height: 48px;
  }
}

.npc-text {
  font-size: 1.05rem;
  line-height: 1.45;
}
</style>
