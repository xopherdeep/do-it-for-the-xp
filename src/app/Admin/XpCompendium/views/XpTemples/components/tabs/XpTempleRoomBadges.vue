<template>
  <div>
    <span v-if="beasts" class="detail-badge beasts">
      <i class="fad fa-skull"></i> {{ beasts }}
    </span>
    <span v-if="hasLoot" class="detail-badge loot">
      <i class="fad fa-treasure-chest"></i>
    </span>
    <span v-if="isLocked" class="detail-badge locked">
      <i class="fas fa-lock"></i>
    </span>
  </div>
</template>

<script setup lang="ts">
/** The badges on a Rooms tab card: how many beasts the room holds, a chest, a lock. */
defineProps<{
  beasts: number;
  hasLoot: boolean;
  isLocked: boolean;
}>();
</script>

<style lang="scss" scoped>
.detail-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);

  i {
    font-size: 0.65rem;
  }

  &.beasts {
    background: rgba(175, 82, 222, 0.2);
    color: #af52de;
  }

  &.loot {
    background: rgba(255, 214, 10, 0.2);
    color: #ffd60a;
  }

  &.locked {
    background: rgba(255, 159, 10, 0.2);
    color: #ff9f0a;
  }
}
</style>
