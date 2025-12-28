<template>
  <component 
    :is="tag" 
    class="xp-title"
    :class="[variant, { 'has-glow': glow }]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
  variant?: 'page' | 'section' | 'card' | 'small';
  glow?: boolean;
}

withDefaults(defineProps<Props>(), {
  tag: 'h2',
  variant: 'section',
  glow: false
});

defineOptions({
  name: 'XpTitle'
});
</script>

<style lang="scss" scoped>
.xp-title {
  font-family: "Press Start 2P", cursive;
  color: var(--eb-color-pale-yellow, #f7e8a8);
  margin: 0;
  line-height: 1.4;
  
  // Page title (largest)
  &.page {
    font-size: 1.25rem;
    letter-spacing: 2px;
    text-shadow: 0 3px 6px rgba(0, 0, 0, 0.5);
  }
  
  // Section title (default)
  &.section {
    font-size: 1rem;
    letter-spacing: 1px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  }
  
  // Card title
  &.card {
    font-size: 0.85rem;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  // Small title
  &.small {
    font-size: 0.7rem;
    letter-spacing: 0.5px;
  }
  
  // Glow effect
  &.has-glow {
    text-shadow: 
      0 0 10px currentColor,
      0 2px 4px rgba(0, 0, 0, 0.5);
  }
}
</style>
