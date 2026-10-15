<template>
  <component
    :is="effect"
    v-if="state.plan && state.phase !== 'idle'"
    :key="state.plan.effect"
    :plan="state.plan"
    :phase="state.phase"
    @covered="notifyCovered"
    @revealed="notifyRevealed"
  />
  <xp-area-title
    v-if="state.card"
    :key="state.card.title"
    :title="state.card.title"
    :subtitle="state.card.subtitle"
    :element="state.card.element"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { EFFECTS } from "./effects";
import XpAreaTitle from "./XpAreaTitle.vue";
import { state, notifyCovered, notifyRevealed } from "./sceneTransitionController";

const effect = computed(() => (state.plan ? EFFECTS[state.plan.effect] : null));
</script>
