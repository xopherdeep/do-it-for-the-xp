<template>
  <xp-app-chip v-for="(chip, i) in chips" :key="`${chip.kind}-${i}`" :kind="chip.kind" :value="chip.value" :icon="chip.icon"
    :class="chip.class" />
</template>

<script setup lang="ts">
import XpAppChip from "./XpAppChip.vue";
import type { AppChipSpec } from "./appChips";

/**
 * A row's chips line from a list of chip descriptors, so a screen builds its chips in script and the template stays
 * flat. Renders the chips side by side with no wrapper, exactly as a run of XpAppChip would.
 */
defineProps<{
  chips: AppChipSpec[];
}>();
</script>
