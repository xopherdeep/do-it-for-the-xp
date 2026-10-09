<template>
  <div class="battle-dialog rpg-box icon-colors" v-if="text || showMenu || accumulatedLines.length">
    <div class="dialog-content" v-if="text || accumulatedLines.length" @click="$emit('advance')">
      <!-- Earthbound-style stacked lines (level ups) -->
      <div v-if="isAppendMode && accumulatedLines.length" class="accumulated-lines">
        <div v-for="(line, index) in accumulatedLines" :key="index" class="accumulated-line">{{ line }}</div>
      </div>
      <XpTypingText
        v-if="text"
        ref="typing"
        :text="text"
        :is-victory="isVictory"
        @typing-complete="$emit('typing-complete')"
      />
      <div v-if="hasMore" class="dialog-more-indicator">▼</div>
    </div>

    <!-- The command menu lives inside the box, like the SNES originals -->
    <div class="dialog-menu" v-else-if="showMenu">
      <XpRpgMenu :actions="menuActions" borderless />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";
import type { BattleMenuAction } from "../battle/battleMenu";

defineProps<{
  text: string;
  accumulatedLines: string[];
  isAppendMode: boolean;
  isVictory: boolean;
  hasMore: boolean;
  showMenu: boolean;
  menuActions: BattleMenuAction[];
}>();

defineEmits<{
  (e: "advance"): void;
  (e: "typing-complete"): void;
}>();

const typing = ref<{ completeTyping?: () => void } | null>(null);

/** Lets the parent finish the typewriter effect on a tap. */
const completeTyping = () => typing.value?.completeTyping?.();

defineExpose({ completeTyping });
</script>
