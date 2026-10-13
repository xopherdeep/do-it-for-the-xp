<template>
  <div class="builder-nav">
    <!-- What to change: one tab per look category, icon over label -->
    <div
      class="tab-strip"
      role="tablist"
      aria-label="What to change"
    >
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: modelValue === t.id }"
        :aria-selected="modelValue === t.id"
        @click="pick(t.id)"
      >
        <i :class="['fad', t.icon, 'tab-icon']"></i>
        <span class="tab-label">{{ t.label }}</span>
      </button>
    </div>

    <!-- Done is not a category: it stands apart from the tabs, in gold -->
    <button
      type="button"
      class="done-button"
      data-cy="builder-done"
      aria-label="Done, save my hero"
      @click="emit('done')"
    >
      <i class="fad fa-check-circle done-icon"></i>
      <span class="done-label">Done</span>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { TABS, type LookTabId } from "../lookEditor";

  /**
   * The hero builder's own bottom nav (it sits under the thumb): the look categories as tabs, then Done.
   * It only emits: `update:modelValue` when a different tab is tapped, `done` when the hero is finished.
   * Plain HTML, no Ionic, no sounds; the builder screen decides what each tap does.
   */
  const props = defineProps<{
    modelValue: LookTabId;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", id: LookTabId): void;
    (e: "done"): void;
  }>();

  const pick = (id: LookTabId) => {
    if (id !== props.modelValue) emit("update:modelValue", id);
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  $done-gold: #f0c040;
  $done-gold-edge: #a87c10;
  $done-gold-pressed: #d8a830;

  .builder-nav {
    display: flex;
    align-items: stretch;
    gap: 10px;
    padding: 6px 8px;
    background: $eb-color-dark-purple;
    border-top: 3px solid $eb-color-medium-purple;
  }

  .tab-strip {
    display: flex;
    flex: 1;
    min-width: 0;
    border: 3px solid $eb-color-medium-purple;
  }

  .tab {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    min-height: 56px;
    padding: 0 2px;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 0.85rem;
    color: $eb-color-cream;
    background: transparent;
    border: 0;
    border-right: 3px solid $eb-color-medium-purple;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:last-child {
      border-right: 0;
    }

    &.active {
      color: $eb-color-dark-purple;
      background: $eb-color-pale-yellow;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: -4px;
    }
  }

  .tab-icon,
  .done-icon {
    display: inline-block;
    font-size: 1.25rem;
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
    --fa-secondary-opacity: 0.55;
  }

  .done-button {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 64px;
    min-height: 56px;
    padding: 0 8px;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 0.85rem;
    color: $eb-color-dark-purple;
    background: $done-gold;
    border: 3px solid $done-gold-edge;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      background: $done-gold-pressed;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }
</style>
