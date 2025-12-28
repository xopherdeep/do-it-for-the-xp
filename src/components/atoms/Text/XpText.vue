<template>
  <component
    :is="tag"
    class="xp-text"
    :class="[variant, { 'rpg-styled': rpgStyled }]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
  interface Props {
    tag?: 'p' | 'span' | 'div';
    variant?: 'body' | 'caption' | 'hint' | 'value' | 'title';
    rpgStyled?: boolean;
  }

  withDefaults(defineProps<Props>(), {
    tag: 'span',
    variant: 'body',
    rpgStyled: true
  });

  defineOptions({
    name: 'XpText'
  });
</script>

<style lang="scss" scoped>
  .xp-text {
    line-height: 1.5;

    &.rpg-styled {
      font-family: "StatusPlz", "Apple Kid", sans-serif;
    }

    // Body text (default)
    &.body {
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.9);
    }

    // Title text (headers)
    &.title {
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 1.5rem;
      color: rgba(255, 255, 255, 0.95);
      font-weight: bold;
    }

    // Caption (smaller descriptive text)
    &.caption {
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
    }

    // Hint text (very subtle)
    &.hint {
      font-family: "StatusPlz", "Apple Kid", sans-serif;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
    }

    // Value text (matches XpStatBlock stat-value exactly)
    &.value {
      font-family: "Press Start 2P", cursive;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.9);
      white-space: pre-wrap;
    }
  }
</style>
