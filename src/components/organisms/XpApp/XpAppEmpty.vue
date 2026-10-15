<template>
  <div class="xp-app-empty">
    <span class="xp-app-empty__tile" aria-hidden="true"><i :class="['fad', iconClass]"></i></span>
    <p class="xp-app-empty__text">{{ text }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { appIconClass } from "./useAppSkin";

/** The empty list: a centred icon tile and one line of copy; the default slot may add a button under it. */
const props = defineProps<{
  /** Font Awesome duotone icon: `scroll`, `fa-scroll` or `fad fa-scroll`. */
  icon: string;
  text: string;
}>();

const iconClass = computed(() => appIconClass(props.icon));
</script>
