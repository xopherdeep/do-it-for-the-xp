<template>
  <!-- The confirm step: an RPG dialog over the dock -->
  <div
    v-if="isAsking"
    class="cs-dialog-backdrop"
    :class="`is-${skin}`"
    @click.self="emit('cancel')"
  >
    <div
      class="cs-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cs-dialog-title"
      data-cy="class-confirm-dialog"
    >
      <i :class="['fad', entry.icon, 'cs-dialog-crest']"></i>
      <p
        id="cs-dialog-title"
        class="cs-dialog-title"
      >Become a {{ entry.name }}?</p>
      <p class="cs-dialog-text">{{ keepNote }}</p>
      <div class="cs-dialog-actions">
        <button
          ref="yesButton"
          type="button"
          class="cs-choice is-yes"
          data-cy="class-confirm-yes"
          @click="emit('confirm')"
        >Yes</button>
        <button
          type="button"
          class="cs-choice"
          data-cy="class-confirm-no"
          @click="emit('cancel')"
        >Not yet</button>
      </div>
    </div>
  </div>

  <!-- The celebration: a flash, rays and the new emblem. Tap to skip. -->
  <div
    v-else-if="isCelebrating"
    class="cs-celebration"
    :class="`is-${skin}`"
    data-cy="class-celebration"
    @click="finish"
  >
    <span class="cs-flash"></span>
    <span class="cs-rays"></span>
    <span
      v-for="n in 10"
      :key="n"
      class="cs-spark"
      :style="{ '--i': n }"
    ></span>
    <i :class="['fad', entry.icon, 'cs-celebration-emblem']"></i>
    <p class="cs-celebration-text">You are now a<br /><strong>{{ entry.name }}!</strong></p>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
  import type { ClassCodexEntry } from "@/lib/services/stats/ClassCodex";

  /**
   * The two overlays of Choose Your Class: "Become a Mage?" (Yes / Not yet), then the celebration, which ends on
   * its own after a moment (sooner with reduced motion) or on a tap, with `done`.
   */
  interface ClassConfirmProps {
    mode: "ask" | "celebrate" | "none";
    entry: ClassCodexEntry;
    /** The class the hero leaves, '' when they had none. */
    currentName: string;
    skin: "retro" | "modern";
  }
  const props = defineProps<ClassConfirmProps>();

  const emit = defineEmits<{
    (e: "confirm"): void;
    (e: "cancel"): void;
    (e: "done"): void;
  }>();

  const CELEBRATION_MS = 2200;
  const CELEBRATION_REDUCED_MS = 1200;

  const isAsking = computed(() => props.mode === "ask");
  const isCelebrating = computed(() => props.mode === "celebrate");
  const keepNote = computed(() =>
    props.currentName
      ? `Your ${props.currentName} levels stay yours, so you can switch back any time.`
      : "You can switch classes any time."
  );

  const yesButton = ref<HTMLButtonElement | null>(null);
  let timer: number | undefined;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const stopTimer = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };

  const finish = () => {
    stopTimer();
    emit("done");
  };

  watch(
    () => props.mode,
    async (mode) => {
      stopTimer();
      const startsCelebrating = mode === "celebrate";
      if (startsCelebrating) timer = window.setTimeout(finish, prefersReducedMotion() ? CELEBRATION_REDUCED_MS : CELEBRATION_MS);
      const startsAsking = mode === "ask";
      if (!startsAsking) return;
      // The dialog takes the focus so Enter answers Yes
      await nextTick();
      yesButton.value?.focus();
    }
  );

  onBeforeUnmount(stopTimer);
</script>

<style lang="scss" scoped src="./_XpClassConfirm.scss" />
