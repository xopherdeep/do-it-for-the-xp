<template>
  <!-- Rendered at the app root, above pages and modals: nothing in the building paints over it -->
  <!-- defer: on a first load the app root is not in the page yet when this mounts -->
  <Teleport to="ion-app" defer :disabled="inline">
    <!-- No Transition: coming (a CSS fade) and going (`is-leaving`, removed on a timer) do not wait on animation frames -->
    <div
        v-if="shown"
        :key="shown.key"
        ref="root"
        class="rp"
        :class="[`glow-${glow}`, { 'has-sprite': Boolean(sprite), 'is-ready': ready, 'is-leaving': isLeaving }, options.accent ? `accent-${options.accent}` : '']"
        :style="accentStyle"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-label="options.speaker || options.title || 'Message'"
        data-cy="reveal-prompt"
        @keydown="onKey"
      >
        <div class="rp__backdrop" aria-hidden="true"></div>

        <!-- The picture rising in its light, like the dungeon's chests and doors -->
        <div v-if="sprite" class="rp__stage" aria-hidden="true">
          <div class="rp__rays"></div>
          <div class="rp__flash"></div>
          <svg
            class="rp__sprite"
            :style="{ width: `${sprite.width * 3}px`, height: `${sprite.height * 3}px` }"
            :viewBox="`0 0 ${sprite.width} ${sprite.height}`"
            shape-rendering="crispEdges"
            role="presentation"
          >
            <pixel-runs :runs="sprite.runs" />
          </svg>
        </div>

        <section class="rp__panel">
          <h2 v-if="options.title" class="rp__title">{{ options.title }}</h2>
          <div v-if="options.speaker" class="rp__head">
            <p class="rp__speaker" data-cy="reveal-speaker">{{ options.speaker }}</p>
            <!-- The speaker button reads the whole prompt; the simple voice also reads each line as it types -->
            <xp-speak-button class="rp__speak" compact :text="spokenText" />
          </div>

          <!-- The speaker's line types out; a tap finishes it, the next tap turns to the next line -->
          <div class="rp__text" data-cy="reveal-text" role="button" aria-live="polite" @click="advance">
            <xp-typing-text
              ref="typing"
              :text="line"
              :speed="26"
              :interactive="false"
              :cursor-visible="false"
              @typing-complete="onTyped"
            />
            <span v-if="hasMoreLines && typed" class="rp__more" aria-hidden="true">&#9660;</span>
          </div>

          <button v-if="hasMoreLines" type="button" class="rp__skip" data-cy="reveal-skip" @click.stop="skipToEnd">
            Skip <i class="fas fa-forward" aria-hidden="true"></i>
          </button>

          <!-- The drawer unfolds under the last line once it is typed: the stepper (a number pick) and the menu -->
          <div class="rp__drawer"><div class="rp__drawer-inner">
          <!-- A number pick: a stepper and preset chips, never a keyboard -->
          <div v-if="options.amount" class="rp__amount" data-cy="reveal-amount">
            <div class="rp__stepper">
              <button
                type="button"
                class="rp__step"
                aria-label="Less"
                data-cy="reveal-minus"
                :disabled="!ready || amountValue <= amountFloor"
                @pointerdown="holdStep(-1)"
                @pointerup="endHold"
                @pointercancel="releaseStep"
                @pointerleave="releaseStep"
                @click="clickStep($event, -1)"
              >
                <i class="fas fa-minus" aria-hidden="true"></i>
              </button>
              <output class="rp__value" data-cy="reveal-value" aria-live="polite">
                <span class="rp__value-number">{{ amountValue }}</span>
                <span class="rp__value-unit">{{ unit }}</span>
              </output>
              <button
                type="button"
                class="rp__step"
                aria-label="More"
                data-cy="reveal-plus"
                :disabled="!ready || amountValue >= amountCeiling"
                @pointerdown="holdStep(1)"
                @pointerup="endHold"
                @pointercancel="releaseStep"
                @pointerleave="releaseStep"
                @click="clickStep($event, 1)"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
              </button>
            </div>
            <div v-if="presets.length" class="rp__chips">
              <button
                v-for="preset in presets"
                :key="preset.label"
                type="button"
                class="rp__chip"
                :class="{ 'is-on': amountValue === heldToRange(preset.value) }"
                :disabled="!ready"
                :data-cy="`reveal-preset-${preset.label}`"
                @click.stop="setAmount(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- The menu: the ▶ is the cursor -->
          <ul class="rp__choices" role="menu" data-cy="reveal-choices">
            <li v-for="(choice, index) in options.choices" :key="choice.id" role="none">
              <button
                type="button"
                class="rp__choice"
                :class="[`tone-${choice.tone ?? 'plain'}`, { 'has-cursor': cursor === index }]"
                role="menuitem"
                :disabled="!ready || choice.disabled"
                :data-cy="`reveal-choice-${choice.id}`"
                @pointerenter="cursor = index"
                @focus="cursor = index"
                @click.stop="choose(choice)"
              >
                <span class="rp__cursor" aria-hidden="true">&#9654;</span>
                <i v-if="choice.icon" class="fad rp__icon" :class="iconClass(choice.icon)" aria-hidden="true"></i>
                <span class="rp__label">{{ choice.label }}</span>
                <span v-if="choice.hint" class="rp__hint">{{ choice.hint }}</span>
              </button>
            </li>
          </ul>
          </div></div>
        </section>
      </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import XpSpeakButton from "@/components/atoms/SpeakButton/XpSpeakButton.vue";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import { useReadAloud } from "@/hooks/useVoice";
import {
  amountMax,
  amountMin,
  accentOf,
  cancelAnswer,
  clampAmount,
  glowOf,
  initialAmount,
  linesOf,
  stepAmount,
  type ActiveRevealPrompt,
  type RevealAnswer,
  type RevealChoice,
  type RevealPromptOptions,
} from "./revealPrompt";
import { spriteFor } from "./revealSprites";

/**
 * The game's own way of asking the hero something, in place of a native alert: the dungeon's reveal (a sprite rising
 * in a wheel of light), the speaker's lines typed out in the RPG box, and an RPG menu with a ▶ cursor at the bottom of
 * the screen in thumb reach. A number pick adds a stepper with preset chips. Escape is the cancel choice.
 * Use it through `useRevealPrompt()`, which owns `prompt` and settles the promise `respond` carries back.
 */
const props = withDefaults(
  defineProps<{
    prompt: ActiveRevealPrompt | null;
    /** Render in place, not at the app root (specs) */
    inline?: boolean;
  }>(),
  { inline: false },
);

const emit = defineEmits<{
  (e: "respond", answer: RevealAnswer): void;
}>();

const EMPTY: RevealPromptOptions = { lines: [], choices: [] };
/**
 * The prompt on screen. A prompt that arrives while the last one is still sinking away waits for it to finish, so two
 * prompts in a row never overlap (the screen asks the next question the moment the last is answered).
 */
const shown = ref<ActiveRevealPrompt | null>(null);
/** The prompt was answered and is sinking away; it is removed (and the next one shown) when the timer runs out. */
const isLeaving = ref(false);
const LEAVE_MS = 460;
let pending: ActiveRevealPrompt | null = null;
let leaveTimer: number | undefined;

const endLeave = () => {
  leaveTimer = undefined;
  isLeaving.value = false;
  shown.value = pending;
  pending = null;
};

watch(
  () => props.prompt,
  (next) => {
    if (!next) {
      pending = null;
      const isShowingStill = Boolean(shown.value) && !isLeaving.value;
      if (isShowingStill) {
        isLeaving.value = true;
        window.clearTimeout(leaveTimer);
        leaveTimer = window.setTimeout(endLeave, LEAVE_MS);
      }
      return;
    }
    if (isLeaving.value) {
      pending = next;
      return;
    }
    shown.value = next;
  },
  { immediate: true },
);

const options = computed<RevealPromptOptions>(() => shown.value?.options ?? EMPTY);

const root = ref<HTMLElement | null>(null);
const typing = ref<{ completeTyping?: () => void } | null>(null);

const lines = computed(() => linesOf(options.value));
const lineIndex = ref(0);
const { startAutoReading, stopReading } = useReadAloud();
/** Every line of the prompt, for the speaker button */
const spokenText = computed(() => lines.value.join(" "));
const typed = ref(false);
const line = computed(() => lines.value[Math.min(lineIndex.value, lines.value.length - 1)]);
const hasMoreLines = computed(() => lineIndex.value < lines.value.length - 1);
/** The last line is typed: the menu (and the stepper) can be used. */
const ready = computed(() => !hasMoreLines.value && typed.value);

const glow = computed(() => glowOf(options.value));
/** The building's accent as the box's ring colour; with none, the CSS fallback keeps the minty ring. */
const accentStyle = computed(() => {
  const accent = accentOf(options.value.accent);
  return accent ? { "--xp-app-accent": accent } : undefined;
});
const sprite = computed(() => (options.value.sprite ? spriteFor(options.value.sprite) : null));

/** A Font Awesome duotone name ("wallet" or "fa-wallet") as its class. */
const iconClass = (name: string): string => `fa-${name.replace(/^fa-/, "")}`;

const cursor = ref(0);
/** The prompt has answered and is on its way out: a second tap must not answer again. */
let spent = false;

// --- The amount stepper ---------------------------------------------------------------------------------------
const amountValue = ref(0);
const amountFloor = computed(() => (options.value.amount ? amountMin(options.value.amount) : 0));
const amountCeiling = computed(() => (options.value.amount ? amountMax(options.value.amount) : 0));
const unit = computed(() => options.value.amount?.unit ?? "GP");
const presets = computed(() => options.value.amount?.presets ?? []);
const heldToRange = (value: number): number => (options.value.amount ? clampAmount(value, options.value.amount) : value);

const setAmount = (value: number) => {
  if (!ready.value) return;
  const next = heldToRange(value);
  const isAmountChanged = next !== amountValue.value;
  if (isAmountChanged) play$fx("cursor");
  amountValue.value = next;
};

const stepBy = (direction: 1 | -1, times = 1) => {
  const amount = options.value.amount;
  const isStepperIdle = !amount || !ready.value;
  if (isStepperIdle) return;
  const next = stepAmount(amountValue.value, direction, amount, times);
  const isAmountChanged = next !== amountValue.value;
  if (isAmountChanged) play$fx("cursor");
  amountValue.value = next;
};

// Tap + or - to step once (the click); hold it to run, faster the longer it is held. The click that ends a hold is
// swallowed, so a hold does not take one step more than it showed.
let holdDelay: number | undefined;
let holdTick: number | undefined;
let heldTicks = 0;
let didRun = false;

const stopRunning = () => {
  window.clearTimeout(holdDelay);
  window.clearInterval(holdTick);
  holdDelay = undefined;
  holdTick = undefined;
  heldTicks = 0;
};

const releaseStep = () => {
  stopRunning();
  didRun = false;
};

const holdStep = (direction: 1 | -1) => {
  releaseStep();
  holdDelay = window.setTimeout(() => {
    didRun = true;
    stepBy(direction);
    holdTick = window.setInterval(() => {
      heldTicks += 1;
      stepBy(direction, heldTicks > 20 ? 10 : 1);
    }, 80);
  }, 380);
};

/** A press ending on the button: the click follows, and it only counts when the hold had not started running. */
const endHold = () => stopRunning();

const clickStep = (_event: MouseEvent, direction: 1 | -1) => {
  if (didRun) {
    didRun = false;
    return;
  }
  stepBy(direction);
};

// --- The dialog -----------------------------------------------------------------------------------------------
const onTyped = () => {
  typed.value = true;
};

/** A tap on the text: finish the line being typed, or turn to the next one. */
const advance = () => {
  if (spent) return;
  if (!typed.value) {
    typing.value?.completeTyping?.();
    return;
  }
  if (hasMoreLines.value) {
    typed.value = false;
    lineIndex.value += 1;
    play$fx("cursor");
  }
};

const skipToEnd = () => {
  if (!hasMoreLines.value) return;
  typed.value = false;
  lineIndex.value = lines.value.length - 1;
  play$fx("cursor");
};

// --- Answering ------------------------------------------------------------------------------------------------
const answer = (value: RevealAnswer) => {
  if (spent) return;
  spent = true;
  stopReading();
  releaseStep();
  emit("respond", value);
};

const choose = (choice: RevealChoice) => {
  const isBlocked = spent || !ready.value || choice.disabled;
  if (isBlocked) return;
  const isCancel = choice.id === cancelAnswer(options.value).id;
  play$fx(isCancel ? "closeMenu" : "select");
  answer({ id: choice.id, amount: options.value.amount ? amountValue.value : null });
};

const cancel = () => {
  const isCancelMoot = spent || !shown.value;
  if (isCancelMoot) return;
  play$fx("closeMenu");
  answer(cancelAnswer(options.value));
};

const moveCursor = (delta: number) => {
  const total = options.value.choices.length;
  const isCursorIdle = !total || !ready.value;
  if (isCursorIdle) return;
  cursor.value = (cursor.value + delta + total) % total;
  play$fx("cursor");
};

const onKey = (event: KeyboardEvent) => {
  const onButton = (event.target as HTMLElement | null)?.tagName === "BUTTON";
  switch (event.key) {
    case "Escape":
      event.preventDefault();
      cancel();
      break;
    case "ArrowDown":
      event.preventDefault();
      moveCursor(1);
      break;
    case "ArrowUp":
      event.preventDefault();
      moveCursor(-1);
      break;
    case "ArrowLeft":
      event.preventDefault();
      stepBy(-1);
      break;
    case "ArrowRight":
      event.preventDefault();
      stepBy(1);
      break;
    case "Enter":
    case " ": {
      // A focused button answers through its own click; anywhere else, Enter turns the page or picks the cursor
      if (onButton) break;
      event.preventDefault();
      if (!ready.value) advance();
      else {
        const picked = options.value.choices[cursor.value];
        if (picked) choose(picked);
      }
      break;
    }
  }
};

// Each prompt starts at its first line with the cursor on the first choice and the stepper at its start
watch(
  () => shown.value?.key,
  (key) => {
    spent = false;
    releaseStep();
    lineIndex.value = 0;
    typed.value = false;
    cursor.value = Math.max(0, options.value.choices.findIndex((choice) => !choice.disabled));
    amountValue.value = options.value.amount ? initialAmount(options.value.amount) : 0;
    const isPromptGone = key === undefined;
    if (isPromptGone) return;
    play$fx(options.value.sound ?? "openMenu");
    // The simple voice reads the first line as it starts to type; the next lines follow below
    startAutoReading(line.value);
    // The dialog holds the focus from the start, so Escape and the arrows work at once
    nextTick(() => root.value?.focus({ preventScroll: true }));
  },
  { immediate: true },
);

// The next line of a prompt is read as it starts to type (the first one is read when the prompt opens)
watch(lineIndex, (index) => {
  const isNextLine = index > 0 && shown.value !== null;
  if (isNextLine) startAutoReading(line.value);
});

onBeforeUnmount(() => {
  releaseStep();
  window.clearTimeout(leaveTimer);
});
</script>

<style lang="scss" scoped src="./_XpRevealPrompt.scss" />
