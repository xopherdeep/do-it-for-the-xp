<template>
  <div
    class="xp-glass-card"
    :class="{
      'xp-glass-card--selected': selected,
      'xp-glass-card--interactive': interactive
    }"
  >
    <div
      v-if="selected"
      class="xp-glass-card__check"
    >
      <slot name="check">
        <i class="fas fa-check-circle"></i>
      </slot>
    </div>
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'XpGlassCard',
  props: {
    selected: {
      type: Boolean,
      default: false
    },
    interactive: {
      type: Boolean,
      default: true
    }
  }
});
</script>

<style lang="scss" scoped>
  .xp-glass-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 20px;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    height: 100%;

    &--interactive {
      cursor: pointer;

      &:hover {
        background: rgba(var(--ion-color-rpg-rgb), 0.1);
        transform: scale(1.05);
      }
    }

    &--selected {
      background: linear-gradient(135deg, rgba(var(--ion-color-rpg-rgb), 0.2), rgba(var(--ion-color-rpg-rgb), 0.05));
      border-color: var(--ion-color-rpg);
      box-shadow: 0 4px 15px rgba(var(--ion-color-rpg-rgb), 0.2);

      // Apply color changes to default slots if they match expected structure?
      // Or let consumer handle internal styling. 
      // Usually a selected card implies text/icon changes too.
    }

    &__check {
      position: absolute;
      top: -5px;
      right: -5px;
      color: var(--ion-color-success);
      background: #fff;
      border-radius: 50%;
      font-size: 1.1rem;
      line-height: 1;
      z-index: 2;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    }
  }
</style>
