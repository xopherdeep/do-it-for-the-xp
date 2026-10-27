<template>
  <ol class="chore-rows">
    <li v-for="(text, index) in chores" :key="`${index}-${text}`" class="chore-row" data-test="chore-row">
      <span class="chore-row__n" aria-hidden="true">{{ index + 1 }}</span>
      <span class="chore-row__text">{{ text }}</span>
      <button
        type="button"
        class="chore-row__btn"
        :disabled="index === 0"
        :aria-label="`Move chore ${index + 1} up`"
        data-test="chore-up"
        @click="emit('move', index, -1)"
      >
        <i class="fad fa-chevron-up" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="chore-row__btn"
        :disabled="index === chores.length - 1"
        :aria-label="`Move chore ${index + 1} down`"
        data-test="chore-down"
        @click="emit('move', index, 1)"
      >
        <i class="fad fa-chevron-down" aria-hidden="true"></i>
      </button>
      <button type="button" class="chore-row__btn chore-row__btn--drop" :aria-label="`Drop ${text}`" data-test="chore-drop" @click="emit('drop', index)">
        <i class="fad fa-times" aria-hidden="true"></i>
      </button>
    </li>
  </ol>
</template>

<script setup lang="ts">
/**
 * An ordered list of chores with a way to move each one up or down and to drop it (the Beast Maker's chores step).
 * The list is the holder's: the rows only say which move was asked for, and the holder replaces its array.
 */
defineProps<{ chores: readonly string[] }>();

const emit = defineEmits<{
  move: [index: number, step: -1 | 1];
  drop: [index: number];
}>();
</script>

<style lang="scss" scoped>
.chore-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chore-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  padding: 4px 4px 4px 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);

  &__n {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    margin-right: 6px;
    background: var(--xp-app-accent);
    border-radius: var(--xp-app-radius-chip);
    color: var(--xp-app-on-accent);
    font-family: var(--xp-app-font-title);
    font-size: 0.85rem;
    line-height: 28px;
    text-align: center;
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.95rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  &__btn {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    background: transparent;
    border: 0;
    color: var(--xp-app-text-dim);
    cursor: pointer;
    font-size: 1.1rem;
    -webkit-tap-highlight-color: transparent;

    &:active {
      color: var(--xp-app-accent);
    }

    &:disabled {
      opacity: 0.3;
    }

    &--drop {
      font-size: 1.3rem;
    }
  }
}
</style>
