<template>
  <button
    type="button"
    class="xp-speak-button"
    :class="{ 'is-compact': compact, 'is-dimmed': !canRead }"
    :aria-label="hint"
    :aria-disabled="!canRead"
    :title="hint"
    data-test="speak-button"
    @click.stop="speakIt"
  >
    <i class="fad fa-volume-up" aria-hidden="true"></i>
  </button>
</template>

<script setup lang="ts">
/**
 * The speaker button: reads `text` aloud on tap, for every voice (the simple voice also reads on its own, see
 * useReadAloud). On a device with no reading voice it is dimmed, and a tap says "No reading voice on this device"
 * instead. Stays quiet while the app is muted.
 */
import { computed } from "vue";
import { play$fx } from "@/assets/fx";
import { useCopy, useReadAloud } from "@/hooks/useVoice";
import { useToast } from "@/hooks/useToast";

const props = withDefaults(defineProps<{ text: string; label?: string; compact?: boolean }>(), { label: "Read aloud", compact: false });

const t = useCopy();
const { showToast } = useToast();
const { playLine, canRead } = useReadAloud();
/** What the button is called: its label, or the note while there is no voice (the tooltip and the screen reader say it too) */
const hint = computed(() => (canRead.value ? props.label : t("speech.noVoice")));

const speakIt = () => {
  if (!canRead.value) {
    play$fx("no");
    showToast(t("speech.noVoice"), 2500);
    return;
  }
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

  // No reading voice on this device: still there, so the hero sees why it is silent
  &.is-dimmed {
    opacity: 0.4;
    filter: grayscale(1);
  }

  // A small one beside a name plate
  &.is-compact {
    min-width: 32px;
    min-height: 32px;
    font-size: 1rem;
  }
}
</style>
