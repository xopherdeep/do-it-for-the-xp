<template>
  <header class="xp-app-header">
    <div v-if="$slots.start" class="xp-app-header__start"><slot name="start" /></div>
    <span class="xp-app-header__tile" aria-hidden="true"><i :class="['fad', iconClass]"></i></span>
    <h1 class="xp-app-header__title">{{ title }}</h1>
    <span v-if="meta" class="xp-app-header__meta">{{ meta }}</span>
    <div v-if="$slots.end" class="xp-app-header__end"><slot name="end" /></div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { appIconClass } from "./useAppSkin";

/**
 * The compact app bar of a phone app: back button (slot `start`), the app icon tile on the accent colour, the title
 * and an optional meta line ("4 due", "12 items", "30 MP"), then slot `end`. Looks come from `_xp-app.scss`.
 */
const props = defineProps<{
  title: string;
  /** Font Awesome duotone icon: `scroll`, `fa-scroll` or `fad fa-scroll`. */
  icon: string;
  meta?: string;
}>();

const iconClass = computed(() => appIconClass(props.icon));
</script>
