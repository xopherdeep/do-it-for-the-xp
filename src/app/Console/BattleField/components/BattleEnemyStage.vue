<template>
  <div
    v-show="visible"
    class="enemy-container"
    :class="{ appear: appearing }"
    data-cy="enemy-stage"
    @click="emit('tap')"
  >
    <div v-if="enemy" class="enemy-name" :class="{ 'is-critical': timerCritical }">{{ enemy.name }}</div>

    <!--
      Three layers, so no animation overrides another: .enemy-container enters, .enemy-sprite-container is hit,
      strobes or fades, and the sprite itself floats. The popups sit beside the sprite container, not in it, so the
      hit flash and the fade-out never tint them.
    -->
    <div class="enemy-body">
      <div class="enemy-sprite-container" :class="[animationClass, sizeClass]">
        <img
          v-if="showSprite"
          class="enemy-sprite"
          :class="{ 'is-critical': timerCritical }"
          :src="avatarSrc"
          :alt="enemy?.name || 'Enemy'"
          draggable="false"
          @error="spriteFailed = true"
        />
        <div
          v-else-if="enemy?.emoji"
          class="enemy-emoji"
          :class="{ 'is-critical': timerCritical }"
          role="img"
          :aria-label="enemy.name"
        >{{ enemy.emoji }}</div>
        <div v-else class="enemy-placeholder" :class="{ 'is-critical': timerCritical }" aria-hidden="true">?</div>

        <!-- Red scratches on the beast that remembers the hero ran from it: 1-3, 25% harder strikes each -->
        <div
          v-if="grudgeMarks > 0"
          class="grudge-marks"
          role="img"
          :aria-label="grudgeText"
          :title="grudgeText"
          data-cy="grudge-marks"
        >
          <span v-for="n in grudgeMarks" :key="n" class="grudge-mark" aria-hidden="true"></span>
        </div>
      </div>

      <div class="damage-popups" aria-hidden="true">
        <span
          v-for="popup in popups"
          :key="popup.key"
          class="damage-popup"
          :class="{ 'is-smash': popup.smash }"
          :style="popup.style"
        >
          <template v-if="popup.smash">
            <img
              src="@/assets/images/battle/smash.png"
              alt=""
              class="smash-sprite"
              draggable="false"
            />
            <span class="sr-only">SMAAAASH!!</span>
          </template>
          <template v-else>
            {{ popup.text }}
          </template>
        </span>
      </div>
    </div>

    <div v-if="enemy && !enemy.isThief" class="chores">
      <div class="chore-pips" aria-hidden="true">
        <template v-if="showPips">
          <span
            v-for="n in total"
            :key="n"
            class="chore-pip"
            :class="{ 'is-done': n <= done, 'is-popping': n > popFrom && n <= popTo }"
          >
            <i v-if="n <= done" class="fad fa-check"></i>
          </span>
        </template>
        <div v-else class="chore-bar">
          <div class="chore-bar-fill" :style="{ '--fill': donePercent + '%' }"></div>
        </div>
      </div>
      <div class="chores-left-label">{{ choresLabel }}</div>
    </div>

    <!-- The slot keeps its height while the clock is hidden, so the beast does not jump when the clock starts. -->
    <div v-if="enemy" class="attack-timer-slot">
      <div
        v-if="timerVisible"
        class="attack-timer"
        :class="[`tone-${tone}`, { 'is-critical': timerCritical }]"
        :style="{ '--pulse-duration': `${pulseDurationSeconds}s` }"
        role="timer"
      >
        <i class="fad fa-claw-marks attack-timer-icon" aria-hidden="true"></i>
        <div class="attack-timer-bar" aria-hidden="true">
          <div class="attack-timer-fill" :style="{ '--fill': percent + '%' }"></div>
        </div>
        <div class="attack-timer-text">
          <span v-if="timerLabel" class="attack-timer-caption">strikes in</span>
          <span v-if="timerLabel" class="attack-timer-label">{{ timerLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { clampMarks, grudgeLabel } from "@/lib/services/battle/questGrudge";
import type { EnemyAnimation, EnemySize, HitPopup } from "../battle/battleView";

/**
 * The beast on stage: name plate, sprite, chore pips and the attack clock. Pure presentation: everything arrives as a
 * prop and the only thing it says back is "tap" (the page advances the dialog). The page decides when the sprite is
 * hit, strobes or fades by swapping `animationClass`; this component only draws it.
 */
interface Props {
  enemy: Enemy | null;
  avatarSrc: string;
  /** Shows the stage. Flipping it on, or a new beast arriving while it is on, plays the entrance. */
  visible: boolean;
  animationClass: EnemyAnimation;
  sizeClass: EnemySize;
  choresTotal: number;
  choresLeft: number;
  timerVisible: boolean;
  /** 0-100: the share of the clock still left. */
  timerPercent: number;
  /** "m:ss", or "" while there is nothing to count (before the intro is read, once the clock has run out). */
  timerLabel: string;
  /** Under ten seconds: the clock pulses red, the name plate tints red and the beast floats faster. */
  timerCritical: boolean;
  /** A new id floats a new "-amount" popup; `smash` is the final blow. */
  lastHit: HitPopup | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (event: "tap"): void }>();

const APPEAR_MS = 600;
const POPUP_MS = 1000;
const POPUP_LIMIT = 5;
const PIP_POP_MS = 600;
/** Up to this many chores each get a pip; more than that becomes a plain bar. */
const MAX_PIPS = 12;

// Entrance ----------------------------------------------------------------------------------------------------------

const appearing = ref(false);
let appearTimer: number | undefined;

const playEntrance = () => {
  window.clearTimeout(appearTimer);
  appearing.value = true;
  appearTimer = window.setTimeout(() => (appearing.value = false), APPEAR_MS);
};

watch(
  () => props.visible,
  (shown, wasShown) => {
    const justShown = shown && !wasShown;
    if (justShown) playEntrance();
  }
);

// A second beast in a multi-beast fight gets its own entrance. While hidden, the flip above plays it instead.
watch(
  () => props.enemy?.id,
  (id, previousId) => {
    const newBeastOnStage = props.visible && id !== undefined && id !== previousId;
    if (newBeastOnStage) playEntrance();
  }
);

// Sprite -----------------------------------------------------------------------------------------------------------

// A sprite that fails to load falls back to the emoji (or "?") instead of a broken-image icon in the arena.
const spriteFailed = ref(false);
watch(
  () => [props.avatarSrc, props.enemy?.id],
  () => (spriteFailed.value = false)
);
const showSprite = computed(() => !!props.avatarSrc && !spriteFailed.value);

// Grudge -----------------------------------------------------------------------------------------------------------

// The beast carries the marks the hero earned by running from this quest (docs/Quest-Rooms-Spec.md 5.7)
const grudgeMarks = computed(() => clampMarks(props.enemy?.grudgeMarks));
const grudgeText = computed(() => grudgeLabel(grudgeMarks.value));

// Chores -----------------------------------------------------------------------------------------------------------

/** Counts come from reactive state: keep them whole and non-negative so a stray NaN never reaches the screen. */
const wholeCount = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

const total = computed(() => wholeCount(props.choresTotal));
const left = computed(() => wholeCount(props.choresLeft));
const done = computed(() => Math.max(0, total.value - left.value));
const showPips = computed(() => total.value <= MAX_PIPS);
const donePercent = computed(() => (total.value ? Math.min(100, (done.value / total.value) * 100) : 0));
const choresLabel = computed(() => `${left.value} ${left.value === 1 ? "task" : "tasks"} left`);

// Pips fill from the left, so finishing a chore flips the pip at index `done`. Remember which ones just flipped.
const popFrom = ref(0);
const popTo = ref(0);
let popTimer: number | undefined;

watch(
  [done, total, () => props.enemy?.id],
  ([nowDone, nowTotal, nowId], [wasDone, wasTotal, wasId]) => {
    // Only a chore finished on the same beast pops; a new beast or a reset just redraws the row.
    const sameBeast = nowId === wasId && nowTotal === wasTotal;
    const choreFinished = sameBeast && nowDone > wasDone;
    if (!choreFinished) return;
    popFrom.value = wasDone;
    popTo.value = nowDone;
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => {
      popFrom.value = 0;
      popTo.value = 0;
    }, PIP_POP_MS);
  }
);

// Attack clock ------------------------------------------------------------------------------------------------------

const MAX_PULSE_DURATION_SECONDS = 1.6;
const MIN_PULSE_DURATION_SECONDS = 0.3;

const percent = computed(() =>
  Number.isFinite(props.timerPercent) ? Math.min(100, Math.max(0, props.timerPercent)) : 0
);

/**
 * Pulsation speeds up as the clock runs down:
 * Calm 1.6s rhythm at full clock (100%), accelerating to an intense 0.3s heartbeat as time gets low or critical.
 */
const pulseDurationSeconds = computed(() => {
  const isAlarmed = props.timerCritical;
  if (isAlarmed) return MIN_PULSE_DURATION_SECONDS;

  const progressRatio = percent.value / 100;
  const spread = MAX_PULSE_DURATION_SECONDS - MIN_PULSE_DURATION_SECONDS;
  const computedDuration = MIN_PULSE_DURATION_SECONDS + progressRatio * spread;

  return Number(computedDuration.toFixed(2));
});

/** Green above half, amber above a fifth, red below. The last ten seconds are red whatever the percentage says. */
const tone = computed<"ok" | "warn" | "danger">(() => {
  const alarmed = props.timerCritical || percent.value <= 20;
  if (alarmed) return "danger";
  return percent.value <= 50 ? "warn" : "ok";
});

// Damage popups -----------------------------------------------------------------------------------------------------

interface Popup {
  /** Our own counter, so two hits that reuse an id can never collide as list keys. */
  key: number;
  text: string;
  smash: boolean;
  /** Custom properties for the damage-pop keyframes: a little sideways fan-out and tilt, so stacked hits stay legible. */
  style: Record<string, string>;
}

const popups = ref<Popup[]>([]);
const popupTimers = new Map<number, number>();
let popupCount = 0;

const dropPopup = (key: number) => {
  window.clearTimeout(popupTimers.get(key));
  popupTimers.delete(key);
  popups.value = popups.value.filter((popup) => popup.key !== key);
};

watch(
  () => props.lastHit?.id,
  () => {
    const hit = props.lastHit;
    if (!hit) return;
    const key = ++popupCount;
    const offset = hit.smash ? 0 : ((key % 5) - 2) * 14;
    const tilt = hit.smash ? -5 : ((key % 3) - 1) * 3;
    popups.value = [
      ...popups.value,
      {
        key,
        text: hit.smash ? "SMAAAASH!!" : `-${wholeCount(hit.amount)}`,
        smash: !!hit.smash,
        style: { "--dx": `${offset}px`, "--rot": `${tilt}deg` },
      },
    ];
    while (popups.value.length > POPUP_LIMIT) dropPopup(popups.value[0].key);
    const timer = window.setTimeout(() => dropPopup(key), POPUP_MS);
    popupTimers.set(key, timer);
  }
);

onBeforeUnmount(() => {
  window.clearTimeout(appearTimer);
  window.clearTimeout(popTimer);
  popupTimers.forEach((timer) => window.clearTimeout(timer));
  popupTimers.clear();
});
</script>

<style lang="scss" scoped src="./_BattleEnemyStage.scss" />
