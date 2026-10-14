<template>
  <div class="pc" :class="layout === 'tiles' ? ['pc--tiles', `pc--cols-${columns}`] : 'pc--rows'" role="radiogroup" :aria-label="label">
    <button
      v-for="choice in choices"
      :key="choice.id"
      type="button"
      role="radio"
      class="pc__choice"
      :class="{ 'is-picked': choice.id === modelValue }"
      :aria-checked="choice.id === modelValue"
      :data-value="choice.id"
      @click="pick(choice.id)"
    >
      <!-- A ring when it is not picked (the duotone circle is a solid disc), a ring with a dot when it is -->
      <i v-if="layout === 'rows'" :class="choice.id === modelValue ? ['fad', 'fa-dot-circle', 'pc__dot'] : ['far', 'fa-circle', 'pc__dot']" aria-hidden="true"></i>
      <span class="pc__label">{{ choice.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { play$fx } from "@/assets/fx";
import type { PowerChoice } from "../powerWizard";

/**
 * Pick one of a short list, big enough for a thumb: tiles for words that fit two or three to a row (class, attribute,
 * AP period, frequency), rows for the long lines (the board and battle effects). The parent owns the value.
 */
const props = withDefaults(
  defineProps<{
    choices: readonly PowerChoice[];
    modelValue: string;
    /** What the group is, for a screen reader ("On the quest board") */
    label: string;
    layout?: "tiles" | "rows";
    /** Tiles to a row */
    columns?: 2 | 3 | 4;
  }>(),
  { layout: "tiles", columns: 3 }
);

const emit = defineEmits<{ "update:modelValue": [id: string] }>();

const pick = (id: string) => {
  if (id === props.modelValue) return;
  play$fx("cursor");
  emit("update:modelValue", id);
};
</script>

<style lang="scss" scoped>
.pc {
  display: grid;
  gap: 8px;

  &--tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &--cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &--cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  &--rows {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pc__choice {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-title);
  font-size: 0.85rem;
  letter-spacing: 0.2px;
  line-height: 1.15;
  text-align: left;
  text-transform: var(--xp-app-title-transform);
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--xp-app-press);
  }

  &.is-picked {
    background: var(--xp-app-surface-2);
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 2px var(--xp-app-accent);
  }
}

// A tile centres its words; a row reads left to right from its dot
.pc--tiles .pc__choice {
  justify-content: center;
  text-align: center;
}

.pc__dot {
  flex: 0 0 auto;
  color: var(--xp-app-accent);
  font-size: 1.2rem;
}

.pc__label {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
