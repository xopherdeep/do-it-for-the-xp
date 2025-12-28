<template>
  <div class="xp-stat-grid">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'XpStatGrid'
});
</script>

<style lang="scss" scoped>
.xp-stat-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;

  // Stats row - direct child div elements act as rows
  :deep(.stats-row) {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
  }
}
</style>
