<template>
  <g>
    <rect v-for="(run, i) in runs" :key="i" :x="run.x" :y="run.y" :width="run.w" height="1" :fill="run.fill" />
  </g>
</template>

<script setup lang="ts">
import type { PixelRun } from "./pixelGrid";

/** One part of a pixel sprite inside an SVG with crisp edges: each run is a one-pixel-high rect. */
defineProps<{ runs: PixelRun[] }>();
</script>
