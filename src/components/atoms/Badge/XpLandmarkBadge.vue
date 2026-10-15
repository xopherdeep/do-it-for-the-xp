<template>
  <div class="xp-landmark-badge">
    <span class="landmark-title">{{ title }}</span>
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
      default: "",
    },
  },
});
</script>

<style lang="scss" scoped>
.xp-landmark-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  text-align: center;
  line-height: 1;
  pointer-events: none;
  user-select: none;

  .landmark-title {
    font-family: "Apple Kid", "StatusPlz", sans-serif;
    font-size: 1.25rem;
    font-weight: normal;
    letter-spacing: 0.6px;
    color: #ffd700;
    white-space: nowrap;
    text-shadow:
      -2px -2px 0 #000,
      2px -2px 0 #000,
      -2px 2px 0 #000,
      2px 2px 0 #000,
      0 3px 6px rgba(0, 0, 0, 0.9);
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease, text-shadow 0.2s ease;
  }
}
</style>
