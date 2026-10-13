<template>
  <section class="xp-app-section" :aria-label="label || undefined">
    <h2 v-if="label" class="xp-app-section__label">{{ label }}</h2>
    <div class="xp-app-section__rows"><slot /></div>
  </section>
</template>

<script setup lang="ts">
/** A grouped list: an optional small header ("TODAY") over a frame that holds `XpAppRow`s. */
defineProps<{ label?: string }>();
</script>
