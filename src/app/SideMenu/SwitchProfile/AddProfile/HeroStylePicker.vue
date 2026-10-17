<template>
  <div class="wizard-fields style-picker">
    <span class="field-label">Look and feel</span>
    <div class="choice-grid">
      <button
        v-for="card in SKIN_CHOICES"
        :key="card.key"
        type="button"
        class="choice-card"
        :class="{ active: card.key === skin }"
        :aria-pressed="card.key === skin"
        :data-test="`skin-${card.key}`"
        @click="emit('pick', { kind: 'skin', key: card.key })"
      >
        <i :class="['fad fa-2x', card.icon]"></i>
        <strong>{{ card.label }}</strong>
        <small v-if="card.hint">{{ card.hint }}</small>
        <span v-if="card.key === skin" class="choice-check"><i class="fas fa-check"></i></span>
      </button>
    </div>

    <span class="field-label">Game style</span>
    <div class="choice-grid choice-grid--small">
      <button
        v-for="style in styleCards"
        :key="style.key"
        type="button"
        class="choice-card"
        :class="{ active: style.key === rpg, locked: style.isLocked }"
        :aria-pressed="style.key === rpg"
        :data-test="`style-${style.key}`"
        @click="emit('pick', { kind: 'style', key: style.key })"
      >
        <i :class="['fad fa-lg', style.icon]"></i>
        <strong>{{ style.label }}</strong>
        <small v-if="style.isLocked">Pro</small>
        <span v-if="style.key === rpg" class="choice-check"><i class="fas fa-check"></i></span>
      </button>
    </div>

    <span class="field-label">Menu sounds</span>
    <div class="choice-grid">
      <button
        v-for="card in UI_SOUND_CHOICES"
        :key="card.key"
        type="button"
        class="choice-card"
        :class="{ active: card.key === ui }"
        :aria-pressed="card.key === ui"
        :data-test="`sounds-${card.key}`"
        @click="emit('pick', { kind: 'sounds', key: card.key })"
      >
        <i :class="['fad fa-lg', card.icon]"></i>
        <strong>{{ card.label }}</strong>
        <span v-if="card.key === ui" class="choice-check"><i class="fas fa-check"></i></span>
      </button>
    </div>
    <p class="field-hint">You can change all of this later in Settings.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { GAME_STYLE_NAMES, GAME_STYLES, isProGameStyle } from "@/lib/utils/gameStyle";
import { GAME_STYLE_ICONS, SKIN_CHOICES, UI_SOUND_CHOICES } from "./formOptions";

interface HeroStylePickerProps {
  skin: string;
  rpg: string;
  ui: string;
  /** XP Pro is active: its game styles are open */
  isPro: boolean;
}

const props = defineProps<HeroStylePickerProps>();
const emit = defineEmits<{ (e: "pick", pick: { kind: "skin" | "style" | "sounds"; key: string }): void }>();

const styleCards = computed(() =>
  GAME_STYLES.map((key) => ({
    key,
    label: GAME_STYLE_NAMES[key],
    icon: GAME_STYLE_ICONS[key],
    isLocked: isProGameStyle(key) && !props.isPro,
  }))
);
</script>

<style scoped src="./_WizardFields.css" />
