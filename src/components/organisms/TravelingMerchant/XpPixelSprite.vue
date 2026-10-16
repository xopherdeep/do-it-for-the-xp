<template>
  <!-- A pixel map drawn as runs of crisp rects; the CSS width sets how big a pixel is -->
  <svg class="xp-pixel-sprite" :viewBox="`0 0 ${size.w} ${size.h}`" shape-rendering="crispEdges" aria-hidden="true">
    <rect v-for="(run, i) in runs" :key="i" :x="run.x" :y="run.y" :width="run.w" height="1" :fill="run.fill" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { spriteRuns, spriteSize } from "./merchantStallSprites";

const props = defineProps<{ rows: readonly string[] }>();

const runs = computed(() => spriteRuns(props.rows));
const size = computed(() => spriteSize(props.rows));
</script>

<style lang="scss" scoped>
.xp-pixel-sprite {
  display: block;
  height: auto;
  overflow: visible;
}
</style>
