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

    <div v-if="enemy" class="chores">
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
      <div v-if="timerVisible" class="attack-timer" :class="[`tone-${tone}`, { 'is-critical': timerCritical }]" role="timer">
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

const percent = computed(() =>
  Number.isFinite(props.timerPercent) ? Math.min(100, Math.max(0, props.timerPercent)) : 0
);

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

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

$ink: #1b0a1b; // text outlines and deep shadows
$outline: -2px -2px 0 $ink, 0 -2px 0 $ink, 2px -2px 0 $ink, -2px 0 0 $ink, 2px 0 0 $ink, -2px 2px 0 $ink, 0 2px 0 $ink,
  2px 2px 0 $ink;
$ember: linear-gradient(150deg, #ffd25a 0%, #ff8a2a 50%, #e8402a 100%);
$green: linear-gradient(150deg, #b9f6b4 0%, var(--xp-color-xp, #{$eb-color-mint-green}) 55%, #2d9a47 100%);

// The middle zone clips, so the plate, pips and clock keep 20 px of air at the sides (the plate's rings reach 16 px).
.enemy-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;

  // The entrance sits on the outermost layer so it never fights the hit, the strobe or the float.
  &.appear {
    animation: enemy-appear 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

.enemy-name {
  @include eb-box();
  flex-shrink: 0;
  box-sizing: border-box;
  max-width: calc(100% - 40px);
  margin: 20px 20px 18px;
  padding: 2px 12px;
  text-align: center;
  overflow-wrap: break-word;
  font-family: "StatusPlz", monospace;
  font-size: 1.2rem;
  line-height: 1.35;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: $eb-color-cream;
  transition: color 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;

  // The box's four rings, in alarm colours
  &.is-critical {
    color: #ff6b6b;
    background-color: #3a0c24;
    box-shadow: 0 0 0 5px #5a1228, 0 0 0 10px #ff4a4a, 0 0 0 12px #ffc2b8, 0 0 0 16px #4a1830;
  }
}

// Anchors the popups. A column flex box capped at 60% of the stage; the sprite container squeezes to fit.
.enemy-body {
  position: relative;
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  max-height: 60%;
}

.enemy-sprite-container {
  position: relative;
  flex: 0 1 auto;
  width: 55%;
  max-width: 320px;
  min-height: 0;
  will-change: transform;

  // A square without aspect-ratio (Chrome 79 / iOS 14 targets): the spacer is as tall as the box is wide and flex may
  // squeeze the box shorter on small screens. The sprite is laid over it, so nothing depends on percent heights.
  &::before {
    content: "";
    display: block;
    padding-top: 100%;
  }

  &.monster {
    width: 55%;
    max-width: 320px;
  }

  &.miniboss {
    width: 75%;
    max-width: 380px;
  }

  &.boss {
    width: 90%;
    max-width: 440px;
  }

  &.damaged {
    animation: enemy-damaged 0.45s ease-out;
  }

  &.fadeout {
    animation: enemy-fadeout 1s ease-in forwards;
  }

  &.victory-strobe {
    animation: victory-strobe 0.2s infinite alternate;
  }

  &.victory-fadeout {
    animation: victory-fadeout 1s ease-in forwards;
  }
}

// The sprite and its stand-ins share the idle float; it quickens when the beast is about to strike.
.enemy-sprite,
.enemy-emoji,
.enemy-placeholder {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  animation: idle-float 3s ease-in-out infinite;

  &.is-critical {
    animation-duration: 0.8s;
  }
}

.enemy-sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.enemy-emoji,
.enemy-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.enemy-emoji {
  line-height: 1;
  font-size: clamp(96px, 30vw, 200px); // never smaller than 96 px, so a sprite-less beast is still a beast
}

.miniboss .enemy-emoji {
  font-size: clamp(120px, 42vw, 280px);
}

.boss .enemy-emoji {
  font-size: clamp(140px, 52vw, 340px);
}

.enemy-placeholder {
  width: 100px;
  height: 100px;
  margin: auto;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  font-size: 40px;
  color: #fff;
}

// Claw scratches in the beast's top corner. They live inside the sprite container, so a hit shakes them and the
// victory fade takes them along; they never catch a tap.
.grudge-marks {
  position: absolute;
  top: 2%;
  right: 4%;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  pointer-events: none;
}

.grudge-mark {
  display: block;
  box-sizing: border-box;
  width: 10px;
  height: 32px;
  border: 2px solid $ink;
  border-radius: 3px;
  background: linear-gradient(180deg, #ff9a8a 0%, #ff3d2e 45%, #a3121f 100%);
  box-shadow: 0 0 6px 1px rgba(255, 61, 46, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transform: skewX(-22deg) rotate(14deg);

  // Each scratch a little longer than the one before, like a tally
  &:nth-child(2) {
    height: 38px;
  }

  &:nth-child(3) {
    height: 44px;
  }
}

.damage-popups {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
}

.damage-popup {
  position: absolute;
  top: 38%;
  right: 0;
  left: 0;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  font-family: "Pixel Takhisis", "Year Is 199X", "Apple Kid", sans-serif;
  font-size: 3.2rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fff;
  text-shadow:
    -2px -2px 0 $ink,
    2px -2px 0 $ink,
    -2px 2px 0 $ink,
    2px 2px 0 $ink,
    0 4px 10px rgba(0, 0, 0, 0.7);
  animation: damage-pop 1s ease-out forwards;

  &.is-smash {
    --pop: 1.6;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.smash-sprite {
  display: inline-block;
  width: 213px;
  height: 73px;
  max-width: 85vw;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 4px 0 $ink) drop-shadow(0 0 16px rgba(112, 80, 248, 0.95));
  vertical-align: middle;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.chores {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  margin: 8px 20px 0;
}

.chore-pips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.chore-pip {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border: 2px solid $ink;
  border-radius: 6px;
  background: $ember; // still to do: a warm ember
  box-shadow: 0 0 8px 1px rgba(255, 138, 42, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.45);

  &.is-done {
    background: $green;
    box-shadow: 0 0 5px rgba(80, 210, 110, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.5);

    i {
      font-size: 11px;
      line-height: 1;
      --fa-primary-color: #0d3d1d;
      --fa-secondary-color: #0d3d1d;
      --fa-secondary-opacity: 0.4;
    }
  }

  &.is-popping {
    animation: pip-pop 0.5s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
}

// More chores than pips
.chore-bar {
  box-sizing: border-box;
  width: 220px;
  max-width: 100%;
  height: 12px;
  overflow: hidden;
  border: 2px solid $ink;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.65);
}

.chore-bar-fill {
  width: var(--fill, 0%);
  height: 100%;
  background: $green;
  transition: width 0.4s ease-out;
}

.chores-left-label {
  margin-top: 4px;
  font-family: "StatusPlz", monospace;
  font-size: 1.15rem;
  line-height: 1.1;
  letter-spacing: 0.5px;
  white-space: nowrap;
  color: $eb-color-cream;
  text-shadow: #{$outline};
}

.attack-timer-slot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 20px;
}

.attack-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: 380px;
  min-height: 40px;
  padding: 4px 10px 4px 8px;
  border-radius: 12px;
  background: rgba(40, 8, 40, 0.78);
  box-shadow: 0 0 0 2px rgba(247, 232, 168, 0.4);
  transition: box-shadow 0.3s ease;

  // The colours of the moment, read by the icon, the fill and the label
  &.tone-ok {
    --tone-light: #9af5ae;
    --tone-mid: #46c866;
    --tone-deep: #2a9a48;
    --tone-glow: rgba(70, 200, 102, 0.65);
  }

  &.tone-warn {
    --tone-light: #ffe28a;
    --tone-mid: #ffb62e;
    --tone-deep: #e08a00;
    --tone-glow: rgba(255, 182, 46, 0.65);
  }

  &.tone-danger {
    --tone-light: #ff9a8a;
    --tone-mid: #ff4d3d;
    --tone-deep: #c42a28;
    --tone-glow: rgba(255, 77, 61, 0.7);
  }

  &.is-critical {
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.85), 0 0 12px rgba(255, 107, 107, 0.55);

    .attack-timer-fill,
    .attack-timer-label {
      animation: timer-pulse 0.5s ease-in-out infinite alternate;
    }
  }
}

.attack-timer-icon {
  flex: 0 0 auto;
  font-size: 24px;
  line-height: 1;
  --fa-primary-color: var(--tone-light);
  --fa-secondary-color: var(--tone-deep);
  --fa-secondary-opacity: 0.85;
  filter: drop-shadow(0 0 6px var(--tone-glow));
}

.attack-timer-bar {
  position: relative;
  flex: 1 1 auto;
  box-sizing: border-box;
  min-width: 0;
  height: 14px;
  overflow: hidden;
  border: 2px solid rgba(247, 232, 168, 0.7);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.75);
}

.attack-timer-fill {
  position: relative;
  width: var(--fill, 0%);
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(180deg, var(--tone-light) 0%, var(--tone-mid) 55%, var(--tone-deep) 100%);
  box-shadow: 0 0 8px var(--tone-glow);
  transition: width 0.4s ease-out; // a refill after a chore animates; the engine's 100 ms ticks glide through it

  // Gloss
  &::after {
    content: "";
    position: absolute;
    top: 1px;
    right: 3px;
    left: 3px;
    height: 30%;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.35);
  }
}

.attack-timer-text {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 3.9rem;
  line-height: 1;
}

.attack-timer-caption {
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  color: $eb-color-cream;
  opacity: 0.85;
}

.attack-timer-label {
  margin-top: 2px;
  font-family: "StatusPlz", monospace;
  font-size: 1.25rem;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  color: var(--tone-light);
  text-shadow: #{$outline};
}

// Short phones: give the beast the room.
@media (max-height: 700px) {
  .enemy-name {
    margin-top: 18px;
    margin-bottom: 16px;
  }

  .chores,
  .attack-timer-slot {
    margin-top: 6px;
  }
}

// Keyframes: the page's SCSS no longer defines any enemy keyframes.

@keyframes enemy-appear {
  0% { opacity: 0; transform: translateY(-24px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

// A shake plus a sepia flash
@keyframes enemy-damaged {
  0% { transform: translateX(0); filter: brightness(1); }
  15% { transform: translateX(-12px); filter: brightness(2) sepia(1) hue-rotate(-50deg); }
  35% { transform: translateX(10px); filter: brightness(2) sepia(1) hue-rotate(-50deg); }
  55% { transform: translateX(-7px); filter: brightness(1.6) sepia(0.6) hue-rotate(-50deg); }
  75% { transform: translateX(4px); filter: brightness(1.2); }
  100% { transform: translateX(0); filter: brightness(1); }
}

@keyframes enemy-fadeout {
  0% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-20px); }
}

@keyframes victory-strobe {
  0% { filter: brightness(1); transform: scale(1); }
  100% { filter: brightness(2); transform: scale(1.1); }
}

@keyframes victory-fadeout {
  0% { opacity: 1; filter: brightness(2); transform: scale(1.1); }
  100% { opacity: 0; filter: brightness(0); transform: scale(0.5); }
}

@keyframes idle-float {
  0%, 100% { transform: translateY(-4px); }
  50% { transform: translateY(4px); }
}

@keyframes pip-pop {
  0% { transform: scale(0.5); filter: brightness(2); }
  55% { transform: scale(1.45); filter: brightness(1.4); }
  100% { transform: scale(1); filter: brightness(1); }
}

// Pops in, settles, then floats up 60 px and fades; --dx, --rot and --pop come from the popup
@keyframes damage-pop {
  0% { opacity: 0; transform: translate(var(--dx, 0), 14px) rotate(var(--rot, 0deg)) scale(0.5); }
  14% { opacity: 1; transform: translate(var(--dx, 0), -4px) rotate(var(--rot, 0deg)) scale(var(--pop, 1.3)); }
  28% { opacity: 1; transform: translate(var(--dx, 0), -14px) rotate(var(--rot, 0deg)) scale(1); }
  60% { opacity: 1; transform: translate(var(--dx, 0), -34px) rotate(var(--rot, 0deg)) scale(1); }
  100% { opacity: 0; transform: translate(var(--dx, 0), -60px) rotate(var(--rot, 0deg)) scale(1); }
}

@keyframes timer-pulse {
  0% { filter: brightness(1); opacity: 1; }
  100% { filter: brightness(1.5); opacity: 0.8; }
}

// No float, strobe, pulse, shake or pop. The fades stay and lose their drift.
@media (prefers-reduced-motion: reduce) {
  .enemy-sprite,
  .enemy-emoji,
  .enemy-placeholder,
  .enemy-sprite-container.victory-strobe,
  .chore-pip.is-popping,
  .attack-timer.is-critical .attack-timer-fill,
  .attack-timer.is-critical .attack-timer-label {
    animation: none;
  }

  @keyframes enemy-appear {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  // A colour flash instead of a shake
  @keyframes enemy-damaged {
    0%, 100% { filter: brightness(1); }
    40% { filter: brightness(1.8) sepia(1) hue-rotate(-50deg); }
  }

  @keyframes enemy-fadeout {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes victory-fadeout {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes damage-pop {
    0% { opacity: 0; }
    14%, 60% { opacity: 1; }
    100% { opacity: 0; }
  }
}
</style>
