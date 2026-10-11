<template>
  <!-- stub: replaced by task #T3 (see effects/index.ts) -->
  <fade-effect :plan="plan" :phase="phase" @covered="emit('covered')" @revealed="emit('revealed')" />
</template>

<script setup lang="ts">
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import FadeEffect from "./FadeEffect.vue";

defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();
</script>
