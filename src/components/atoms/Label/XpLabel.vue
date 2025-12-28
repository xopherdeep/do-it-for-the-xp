<template>
  <span 
    class="xp-label"
    :class="[variant, { 'uppercase': uppercase }]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'stat' | 'form' | 'badge' | 'muted';
  uppercase?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  uppercase: true
});

defineOptions({
  name: 'XpLabel'
});
</script>

<style lang="scss" scoped>
.xp-label {
  display: inline-block;
  
  &.uppercase {
    text-transform: uppercase;
  }
  
  // Stat label (matches XpStatBlock exactly)
  &.stat {
    font-family: "Press Start 2P", cursive;
    font-size: 0.45rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.5px;
  }
  
  // Default label
  &.default {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.5px;
  }
  
  // Form label
  &.form {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.25rem;
    letter-spacing: 0.5px;
  }
  
  // Badge label (compact pill)
  &.badge {
    font-family: "Press Start 2P", cursive;
    font-size: 0.5rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }
  
  // Muted label
  &.muted {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
  }
}
</style>
