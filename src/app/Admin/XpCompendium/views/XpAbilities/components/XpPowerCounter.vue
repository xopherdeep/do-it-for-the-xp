<template>
  <div class="ct">
    <div class="ct__text">
      <span class="ct__label">{{ label }}</span>
      <span v-if="hint" class="ct__hint">{{ hint }}</span>
    </div>
    <div class="ct__control">
      <button type="button" class="ct__btn" :disabled="!canLess" :aria-label="`Less ${label}`" data-test="less" @click="bump(-1)">
        <i class="fad fa-minus" aria-hidden="true"></i>
      </button>
      <label class="ct__field">
        <input
          ref="field"
          class="ct__input"
          type="number"
          inputmode="numeric"
          :min="min"
          :max="max"
          :step="step"
          :value="shown"
          :aria-label="label"
          @input="onType"
          @blur="settle"
        />
        <span v-if="unit" class="ct__unit">{{ unit }}</span>
      </label>
      <button type="button" class="ct__btn" :disabled="!canMore" :aria-label="`More ${label}`" data-test="more" @click="bump(1)">
        <i class="fad fa-plus" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { clamp } from "lodash";
import { play$fx } from "@/assets/fx";
import { countOf } from "../powerWizard";

/**
 * A whole number for the thumb: a big minus and plus either side of a field that can be typed in. The parent owns the
 * value. Typing a number is clamped to the limits; clearing the field to retype changes nothing until a number is
 * there, and leaving the field puts the real value back.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number;
    label: string;
    hint?: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
  }>(),
  { hint: "", unit: "", min: 0, max: 9999, step: 1 }
);

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const field = ref<HTMLInputElement | null>(null);

// A value that is not a number (a bad record) shows as an empty field and counts from the minimum
const isNumber = computed(() => Number.isFinite(props.modelValue));
const shown = computed(() => (isNumber.value ? props.modelValue : ""));
const current = computed(() => (isNumber.value ? props.modelValue : props.min));
const toRange = (value: number): number => clamp(value, props.min, props.max);

const canLess = computed(() => current.value > props.min);
const canMore = computed(() => current.value < props.max);

const bump = (direction: 1 | -1) => {
  const next = toRange(current.value + direction * props.step);
  if (next === props.modelValue) return;
  play$fx("cursor");
  emit("update:modelValue", next);
};

const onType = (event: Event) => {
  const typed = countOf((event.target as HTMLInputElement).value);
  if (typed !== null) emit("update:modelValue", toRange(typed));
};

const settle = () => {
  if (field.value) field.value.value = String(shown.value);
};
</script>

<style lang="scss" scoped>
.ct {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
}

.ct__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ct__label {
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 0.95rem;
  text-transform: var(--xp-app-title-transform);
}

.ct__hint {
  color: var(--xp-app-text-dim);
  font-size: 0.8rem;
  line-height: 1.25;
}

.ct__control {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.ct__btn {
  flex: 0 0 56px;
  min-height: 52px;
  padding: 0;
  background: var(--xp-app-accent);
  border: 1px solid transparent;
  border-radius: var(--xp-app-radius-control);
  color: var(--xp-app-on-accent);
  cursor: pointer;
  font-size: 1.3rem;
  -webkit-tap-highlight-color: transparent;

  &:active:not(:disabled) {
    filter: brightness(0.88);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
}

.ct__field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  background: var(--xp-app-bg);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-control);

  &:focus-within {
    border-color: var(--xp-app-accent);
  }
}

.ct__input {
  width: 4.5ch;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.5rem;
  outline: none;
  text-align: right;
  appearance: textfield;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    margin: 0;
    -webkit-appearance: none;
  }
}

.ct__unit {
  color: var(--xp-app-text-dim);
  font-family: var(--xp-app-font-title);
  font-size: 0.9rem;
  text-transform: var(--xp-app-title-transform);
}
</style>
