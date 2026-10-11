<template>
  <div class="xp-landmark-badge">
    <span class="landmark-title">{{ title }}</span>
    <span v-if="cue" class="landmark-cue">{{ cue }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "XpLandmarkBadge",
  props: {
    title: {
      type: String,
      required: true,
    },
    cue: {
      type: String,
      default: "Tap to enter",
    },
  },
});
</script>

<style lang="scss" scoped>
.xp-landmark-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  margin-top: 3px;
  padding: 3px 10px;
  min-width: 84px;
  background: rgba(14, 16, 24, 0.9);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1.5px solid rgba(255, 215, 0, 0.75);
  border-radius: 7px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6), 0 0 6px rgba(255, 215, 0, 0.25);
  text-align: center;
  line-height: 1.15;
  pointer-events: none;
  user-select: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  .landmark-title {
    font-family: "Apple Kid", "StatusPlz", monospace;
    font-size: 0.96rem;
    font-weight: bold;
    color: #ffd700;
    letter-spacing: 0.8px;
    white-space: nowrap;
    text-shadow: 1px 1px 0 #000;
  }

  .landmark-cue {
    font-family: "Apple Kid", "StatusPlz", monospace;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
    opacity: 0.9;
  }
}
</style>
