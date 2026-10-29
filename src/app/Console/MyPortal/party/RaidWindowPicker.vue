<template>
  <div class="raid-window-picker" role="group" aria-label="How long a raid lasts">
    <button
      v-for="option in OPTIONS"
      :key="option.id"
      type="button"
      class="raid-window-picker__option"
      :class="{ 'is-chosen': isChosen(option.id) }"
      :aria-pressed="isChosen(option.id)"
      :disabled="disabled"
      :data-cy="`${cyPrefix}-${option.id}`"
      @click="emit('update:modelValue', option.id)"
    >
      {{ option.label }}
      <small>{{ RAID_DAYS[option.id] }} days</small>
    </button>
  </div>
</template>

<script setup lang="ts">
import { RAID_DAYS, type RaidWindow } from "@/lib/services/party/raidRules";

const props = withDefaults(defineProps<{ modelValue: RaidWindow; cyPrefix: string; disabled?: boolean }>(), {
  disabled: false,
});
const emit = defineEmits<{ (event: "update:modelValue", window: RaidWindow): void }>();

const OPTIONS: { id: RaidWindow; label: string }[] = [
  { id: "quick", label: "Quick" },
  { id: "standard", label: "Standard" },
  { id: "epic", label: "Epic" },
];

const isChosen = (id: RaidWindow): boolean => id === props.modelValue;
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.raid-window-picker {
  display: flex;
  gap: 10px;
}

.raid-window-picker__option {
  @include party-button();
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
