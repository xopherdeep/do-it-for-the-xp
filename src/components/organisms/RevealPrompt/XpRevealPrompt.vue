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
      if (shown.value && !isLeaving.value) {
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
  if (next !== amountValue.value) play$fx("cursor");
  amountValue.value = next;
};

const stepBy = (direction: 1 | -1, times = 1) => {
  const amount = options.value.amount;
  if (!amount || !ready.value) return;
  const next = stepAmount(amountValue.value, direction, amount, times);
  if (next !== amountValue.value) play$fx("cursor");
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
  if (spent || !shown.value) return;
  play$fx("closeMenu");
  answer(cancelAnswer(options.value));
};

const moveCursor = (delta: number) => {
  const total = options.value.choices.length;
  if (!total || !ready.value) return;
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
    if (key === undefined) return;
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

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "../../../app/Console/TempleGrounds/components/templeReveal" as *;

$rp-ink: $reveal-ink;

// ---------------------------------------------------------------------------------------------------------------
// The overlay: the dungeon's docked reveal, lifted above Ionic's modals and toasts so it reads in any building
// ---------------------------------------------------------------------------------------------------------------
.rp {
  --reveal-glow: #{$eb-color-sky-blue};
  --reveal-glow-soft: rgba(104, 168, 216, 0.4);
  @include reveal-overlay-docked;
  z-index: 100001;

  &.glow-gold {
    --reveal-glow: #{$reveal-gold};
    --reveal-glow-soft: rgba(255, 216, 74, 0.45);
  }
  &.glow-mint {
    --reveal-glow: #{$eb-color-mint-green};
    --reveal-glow-soft: rgba(128, 216, 144, 0.4);
  }
  &.glow-amber {
    --reveal-glow: #ff9a52;
    --reveal-glow-soft: rgba(255, 154, 82, 0.42);
  }
  &.glow-rose {
    --reveal-glow: #ff9aa8;
    --reveal-glow-soft: rgba(255, 154, 168, 0.4);
  }
}

.rp__backdrop {
  @include reveal-backdrop(30%);
}

// No sprite: the room stays faintly there behind the dark, like the dungeon's room actions
.rp:not(.has-sprite) .rp__backdrop {
  background: rgba(10, 2, 10, 0.62);
}

// At the ATM: keep the backdrop subtle so the themed kiosk interface remains visible
.rp.accent-atm .rp__backdrop {
  background: rgba(10, 2, 10, 0.25);
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: the sprite in a wheel of light, in the room the panel leaves above it
// ---------------------------------------------------------------------------------------------------------------
.rp__stage {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rp__rays {
  @include reveal-rays(440px);
  left: 50%;
  top: 50%;
  animation: reveal-rays-in 0.5s 0.1s ease-out forwards, reveal-rays-turn 24s linear infinite;
}

.rp__flash {
  @include reveal-flash(80px);
  z-index: 3;
  left: 50%;
  top: 50%;
  animation: reveal-flash 0.55s 0.1s ease-out forwards;
}

.rp__sprite {
  position: relative;
  z-index: 2;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45)) drop-shadow(0 0 10px var(--reveal-glow-soft));
  animation: rp-rise 0.55s 0.08s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}

// A short phone leaves less room above the panel: the scene shrinks with it
@media (max-height: 700px) {
  .rp__stage {
    transform: scale(0.75);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The panel: the RPG box with the speaker, the typed line, the stepper and the menu
// ---------------------------------------------------------------------------------------------------------------
.rp__panel {
  @include reveal-panel;
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  min-height: 0;
  // The ring around the box reaches 16 px outside it: the overlay's own padding keeps it on screen
  max-height: calc(100% - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: reveal-panel-in 0.32s 0.1s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
  // The Earthbound box exactly, but for the minty ring: the building's accent takes its place (fallback: minty);
  // the other game styles draw their own frame (--gs-frame)
  box-shadow: var(
    --gs-frame,
    0 0 0 5px #{$eb-color-medium-purple},
    0 0 0 10px var(--xp-app-accent, #68d0b8),
    0 0 0 12px #{$eb-color-pale-yellow},
    0 0 0 16px #{$eb-color-slate}
  );
}

.rp__title {
  @include reveal-title;
  flex: none;
  font-size: 1.3rem;
}

.rp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: none;
  margin: 0 0 4px;
}

.rp__speaker {
  flex: none;
  margin: 0;
  font-family: $eb-font-status;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--reveal-glow);
  text-shadow: 1px 1px 0 $rp-ink;
}

.rp__text {
  position: relative;
  flex: none;
  // Three lines are held for the line being typed, so the menu below does not move as the words come in
  min-height: 4.6em;
  padding: 2px 4px 0;
  font-family: $eb-font-status;
  font-size: 1.05rem;
  line-height: 1.45;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $rp-ink;
  cursor: pointer;

  :deep(.xp-typing-text) {
    display: block;
    cursor: inherit;
    font-family: inherit;
  }
}

.rp__more {
  position: absolute;
  right: 6px;
  bottom: 0;
  font-size: 0.85rem;
  color: $eb-color-pale-yellow;
  animation: rp-blink 0.9s steps(2, end) infinite;
}

.rp__skip {
  flex: none;
  align-self: flex-end;
  margin-top: 2px;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  font-family: $eb-font-status;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(231, 230, 179, 0.7);
  cursor: pointer;

  &:focus-visible {
    outline: 2px dashed $eb-color-pale-yellow;
    outline-offset: 2px;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The amount stepper
// ---------------------------------------------------------------------------------------------------------------
// The stepper and the menu stay folded away until the last line is typed, then the box unfolds under it
.rp__drawer {
  flex: none;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.rp.is-ready .rp__drawer {
  grid-template-rows: 1fr;
}

.rp__drawer-inner {
  min-height: 0;
  overflow: hidden;
  // Folded away, nothing in it can be focused or tapped
  visibility: hidden;
  transition: visibility 0s 0.3s;
}

.rp.is-ready .rp__drawer-inner {
  visibility: visible;
  transition-delay: 0s;
}

.rp__amount {
  flex: none;
  margin-top: 8px;
}

.rp__stepper {
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: stretch;
  gap: 8px;
}

.rp__step {
  @include reveal-button;
  @include reveal-button-ghost;
  min-height: 52px;
  font-size: 1.2rem;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;

  i {
    margin: 0;
  }
}

.rp__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  border: 2px solid rgba(231, 230, 179, 0.4);
  border-radius: 2px;
  background: rgba(10, 2, 10, 0.55);
  padding: 4px 8px;
}

.rp__value-number {
  font-family: $eb-font-status;
  font-size: 1.9rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: var(--xp-color-gp, #{$reveal-gold});
  text-shadow: 2px 2px 0 $rp-ink;
}

.rp__value-unit {
  font-family: $eb-font-status;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  color: rgba(231, 230, 179, 0.85);
}

.rp__chips {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.rp__chip {
  @include reveal-button;
  @include reveal-button-ghost;
  flex: 1 1 0;
  min-height: 42px;
  font-size: 0.95rem;
  text-transform: none;
  letter-spacing: 0.04em;

  &.is-on {
    border-color: $eb-color-pale-yellow;
    background: rgba(247, 232, 168, 0.2);
    color: $eb-color-pale-yellow;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The menu: rows with the ▶ cursor
// ---------------------------------------------------------------------------------------------------------------
.rp__choices {
  @include reveal-choice-list;
  flex: none;
  margin-top: 10px;
}

.rp__choice {
  @include reveal-choice-row;
  // The cursor, the icon and the words in a row; the icon is there on every row, the cursor only on the active one
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 4px 10px 4px 8px;
  font-family: $eb-font-status;

  // The row the cursor is on
  &.has-cursor:not(:disabled) {
    @include reveal-choice-row-selected;
    // The cursor row is tinted with the accent; with none it keeps its pale yellow
    background: color-mix(in srgb, var(--xp-app-accent, #f7e8a8) 28%, transparent);
  }
}

.rp__cursor {
  flex: none;
  width: 12px;
  font-size: 0.9rem;
  color: $eb-color-pale-yellow;
  opacity: 0;
}

.rp__icon {
  flex: none;
  width: 26px;
  text-align: center;
  font-size: 1.15rem;
  color: $eb-color-cream;
  --fa-secondary-opacity: 0.5;
  text-shadow: 1px 1px 0 $rp-ink;
}

.rp__choice.has-cursor:not(:disabled) .rp__icon {
  color: $eb-color-pale-yellow;
}

.rp__choice.tone-primary .rp__icon {
  color: $reveal-gold;
}

.rp__choice.tone-ghost .rp__icon {
  color: rgba(231, 230, 179, 0.7);
}

.rp__choice.has-cursor:not(:disabled) .rp__cursor {
  opacity: 1;
  animation: rp-blink 0.9s steps(2, end) infinite;
}

.rp__label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1.1rem;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $rp-ink;
  overflow-wrap: anywhere;
}

.rp__hint {
  flex: none;
  font-family: $eb-font-primary;
  font-size: 0.95rem;
  color: rgba(231, 230, 179, 0.8);
}

.rp__choice.tone-primary .rp__label {
  color: $reveal-gold;
}

.rp__choice.tone-ghost .rp__label {
  color: rgba(231, 230, 179, 0.75);
}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going: the dungeon's reveal, with the panel sinking back as the dark fades
// ---------------------------------------------------------------------------------------------------------------
// Coming: the dark fades in. Going: `is-leaving` fades it out with the panel sinking and the sprite settling.
.rp {
  animation: rp-fade-in 0.26s ease both;
}

.rp.is-leaving {
  animation: rp-fade-out 0.3s 0.12s ease forwards;
  // Whatever was picked has been answered: nothing under the fading panel takes a tap
  pointer-events: none;

  .rp__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
  .rp__stage {
    transition: transform 0.3s ease-in;
    transform: translateY(14px) scale(0.96);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes rp-rise {
  0% { transform: translateY(46px) scale(0.7); opacity: 0; filter: brightness(2.6) drop-shadow(0 0 14px var(--reveal-glow)); }
  55% { transform: translateY(-6px) scale(1.06, 0.96); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes rp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rp-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes rp-blink {
  50% { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .rp__sprite,
  .rp__rays,
  .rp__flash,
  .rp__panel,
  .rp__cursor,
  .rp__more {
    animation: none !important;
  }
  .rp__rays {
    opacity: 0.4;
    transform: none;
  }
  .rp__panel {
    opacity: 1;
    transform: none;
  }
}
</style>
