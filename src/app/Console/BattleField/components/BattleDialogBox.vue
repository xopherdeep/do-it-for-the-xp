<template>
  <div
    class="battle-dialog rpg-box icon-colors"
    :class="{ 'is-victory': isVictory }"
    data-cy="battle-dialog"
    v-if="text || showMenu || accumulatedLines.length"
    @click="onTap"
  >
    <!-- One tap finishes the line, the next moves on: the box owns the tap, the typing atom does not -->
    <div ref="content" class="dialog-content" v-if="text || accumulatedLines.length" aria-live="polite">
      <!-- Earthbound-style stacked lines (level ups) -->
      <div v-if="isAppendMode && accumulatedLines.length" class="accumulated-lines">
        <div v-for="(line, index) in accumulatedLines" :key="index" class="accumulated-line">{{ line }}</div>
      </div>
      <XpTypingText
        v-if="text"
        ref="typing"
        :text="text"
        :interactive="false"
        @typing-complete="$emit('typing-complete')"
      />
      <div v-if="hasMore" class="dialog-more-indicator" aria-hidden="true">▼</div>
    </div>

    <!-- The command menu lives inside the box, like the SNES originals -->
    <div class="dialog-menu" v-else-if="showMenu">
      <p v-if="prompt" class="dialog-prompt">{{ prompt }}</p>
      <XpRpgMenu :actions="menuActions" borderless />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";
import type { BattleMenuAction } from "../battle/battleMenu";

const props = withDefaults(
  defineProps<{
    text: string;
    accumulatedLines: string[];
    isAppendMode: boolean;
    isVictory: boolean;
    hasMore: boolean;
    showMenu: boolean;
    menuActions: BattleMenuAction[];
    /** A short hint or question shown above the menu ("Do its chores to win!", "Run away?") */
    prompt?: string;
  }>(),
  { prompt: "" }
);

const emit = defineEmits<{
  (e: "advance"): void;
  (e: "typing-complete"): void;
}>();

const typing = ref<{ completeTyping?: () => void } | null>(null);
const content = ref<HTMLElement | null>(null);

/** Level-up lines and typed text grow downward; keep the newest line in view. */
const scrollToBottom = () => {
  const box = content.value;
  if (box) box.scrollTop = box.scrollHeight;
};

const growthObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(scrollToBottom);
const watchGrowth = (box: HTMLElement | null) => {
  growthObserver?.disconnect();
  if (!box) return;
  growthObserver?.observe(box, { childList: true, subtree: true, characterData: true });
  scrollToBottom();
};

watch(content, watchGrowth);
watch(() => [props.text, props.accumulatedLines.length], scrollToBottom, { flush: "post" });
onBeforeUnmount(() => growthObserver?.disconnect());

/** Taps advance the text; menu taps bubble up here too, and must not count as a dismiss. */
const onTap = () => {
  const hasTextToAdvance = !!props.text || props.accumulatedLines.length > 0;
  if (hasTextToAdvance) emit("advance");
};

/** Lets the parent finish the typewriter effect on a tap. */
const completeTyping = () => typing.value?.completeTyping?.();

defineExpose({ completeTyping });
</script>
