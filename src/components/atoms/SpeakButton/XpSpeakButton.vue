<template>
  <button v-if="canSpeak" type="button" class="xp-speak-button" :class="{ 'is-compact': compact }" :aria-label="label" :title="label" @click.stop="speakIt">
    <i class="fad fa-volume-up" aria-hidden="true"></i>
  </button>
</template>

<script setup lang="ts">
/**
 * The speaker button: reads `text` aloud on tap, for every voice (the simple voice also reads on its own, see
 * useReadAloud). Not drawn where the device cannot speak. Stays quiet while the app is muted.
 */
import { play$fx } from "@/assets/fx";
import { useReadAloud } from "@/hooks/useVoice";
import { speech } from "@/lib/engine/audio/speech";

const props = withDefaults(defineProps<{ text: string; label?: string; compact?: boolean }>(), { label: "Read aloud", compact: false });

const { playLine } = useReadAloud();
const canSpeak = speech.isAvailable();

const speakIt = () => {
  play$fx("cursor");
  playLine(props.text);
};
</script>

<style lang="scss" scoped>
.xp-speak-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--xp-app-accent, currentColor);
  font-size: 1.25rem;
  cursor: pointer;

  &:active {
    opacity: 0.6;
  }

  // A small one beside a name plate
  &.is-compact {
    min-width: 32px;
    min-height: 32px;
    font-size: 1rem;
  }
}
</style>
