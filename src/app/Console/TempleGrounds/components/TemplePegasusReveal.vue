<template>
  <Transition name="pegasus-reveal" :duration="{ enter: 260, leave: 420 }">
    <div
      v-if="open"
      ref="root"
      class="pegasus-reveal"
      tabindex="-1"
      :class="[`is-${phase}`, { 'has-pegasus': Boolean(pegasus) }]"
      :style="paint"
      :data-world="pegasus?.world"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pegasus-reveal-title"
      data-cy="pegasus-reveal"
      @click="skip"
      @keydown.esc.prevent="press"
    >
      <div class="pegasus-reveal__backdrop" aria-hidden="true"></div>

      <!-- The egg in the dark; it cracks, and the Pegasus rises out of it in a wheel of its own light -->
      <div class="pegasus-reveal__stage" aria-hidden="true">
        <div class="pegasus-reveal__rays"></div>
        <div class="pegasus-reveal__flash"></div>

        <div v-if="pegasus" class="peg-egg" :class="`crack-${crackStep}`" data-cy="pegasus-egg">
          <i class="peg-egg__half peg-egg__half--top fad fa-egg"></i>
          <i class="peg-egg__half peg-egg__half--bottom fad fa-egg"></i>
          <svg class="peg-egg__cracks" viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation">
            <polyline class="peg-crack peg-crack--1" points="28,45 42,57 56,45 70,57" />
            <polyline class="peg-crack peg-crack--2" points="0,50 14,57 28,45" />
            <polyline class="peg-crack peg-crack--3" points="70,57 86,46 100,52" />
          </svg>
        </div>

        <div class="peg-rise" data-cy="pegasus-figure">
          <i v-if="pegasus" class="peg-figure fad fa-pegasus"></i>
          <i v-else class="peg-figure fad fa-place-of-worship"></i>
        </div>

        <div class="pegasus-reveal__sparks">
          <span v-for="n in SPARK_COUNT" :key="n" class="spark" :style="sparkStyle(n)">&#10022;</span>
        </div>
      </div>

      <section class="pegasus-reveal__panel" @click.stop="skip">
        <h2 id="pegasus-reveal-title" class="pegasus-reveal__title" data-cy="pegasus-line">
          <span data-cy="pegasus-line-typed">{{ line.slice(0, typed) }}</span
          ><span class="pegasus-reveal__ghost" aria-hidden="true">{{ line.slice(typed) }}</span>
        </h2>

        <p
          v-if="tallyItems.length"
          class="pegasus-tally"
          :class="{ 'is-unlit': phase === 'egg' || phase === 'hatch' || phase === 'typing', 'is-counting': counting }"
          data-cy="pegasus-tally"
        >
          <span
            v-for="item in tallyItems"
            :key="item.key"
            class="pegasus-tally__item"
            :class="`pegasus-tally__item--${item.key}`"
            >+{{ item.amount }} {{ item.label }}</span
          >
        </p>
        <p v-if="levelUp" class="pegasus-levelup" :class="{ 'is-shown': levelUpShown }" data-cy="pegasus-levelup">Level up!</p>

        <div class="pegasus-reveal__actions">
          <button
            ref="flyButton"
            type="button"
            class="pegasus-button"
            :class="{ 'is-waiting': phase !== 'ready' }"
            data-cy="pegasus-fly-home"
            @click.stop="press"
          >
            Fly home
            <i class="fas fa-caret-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import { feel } from "@/lib/services/feedback/haptics";

interface RevealPegasus {
  name: string;
  color: string;
  secondaryColor: string;
  world: string;
  temple: string;
}

interface RevealReward {
  xp: number;
  gp: number;
  ap: number;
}

type Phase = "egg" | "hatch" | "typing" | "tally" | "ready";
type Stat = "xp" | "gp" | "ap";

/**
 * The temple is cleared, in the style of the chest and the doors: in the dark an egg in the Pegasus's colours wobbles
 * and cracks in three steps, the Pegasus rises out of it in a wheel of its own light, "{Name} is free!" types in, and
 * the reward counts up under it. One button at the bottom ("Fly home") tells the page it is done; the page walks the
 * hero out of the temple. A temple that keeps no Pegasus shows "The temple is cleared!" over a glowing temple instead
 * of the egg. A tap anywhere before the end skips to it. The page owns `open`, and runs the way home on `done`.
 */
const props = defineProps<{
  open: boolean;
  /** The Pegasus that was freed; null for a temple that keeps none (or a hero who has not freed it yet) */
  pegasus: RevealPegasus | null;
  /** What the temple paid. Nothing paid, nothing counted. */
  reward: RevealReward;
  levelUp: boolean;
}>();

const emit = defineEmits<{
  (e: "done"): void;
}>();

/** The egg lands and wobbles; the cracks open at these times, and the shell bursts after the last */
const CRACK_AT_MS = [760, 1100, 1440];
const HATCH_AT_MS = 1800;
/** A temple with no egg to crack: the glow comes up after a beat in the dark */
const BARE_HATCH_AT_MS = 380;
/** From the Pegasus rising to the first letter */
const TYPE_AFTER_MS = 560;
const TYPE_EVERY_MS = 42;
/** From the last letter to the first count, and from the last count to the button */
const TALLY_AFTER_MS = 300;
const TALLY_MS = 900;
const TALLY_STEP_MS = 30;
const READY_AFTER_MS = 360;
const SPARK_COUNT = 12;
const PALE_YELLOW = "#f7e8a8";
const PALE_YELLOW_RGB: [number, number, number] = [247, 232, 168];

const root = ref<HTMLElement | null>(null);
const flyButton = ref<HTMLButtonElement | null>(null);
const phase = ref<Phase>("egg");
const crackStep = ref(0);
const typed = ref(0);
const shown = reactive<Record<Stat, number>>({ xp: 0, gp: 0, ap: 0 });
const counting = ref(false);
const levelUpShown = ref(false);
let timers: ReturnType<typeof setTimeout>[] = [];
let heardWin = false;
let spent = false;

const line = computed(() => (props.pegasus ? `${props.pegasus.name} is free!` : "The temple is cleared!"));

const STATS: Array<{ key: Stat; label: string }> = [
  { key: "xp", label: "XP" },
  { key: "gp", label: "GP" },
  { key: "ap", label: "AP" },
];

const amountOf = (key: Stat): number => Math.max(0, Math.round(Number(props.reward?.[key]) || 0));

/** The stats the temple paid in, in the order the hero reads them; a stat paid at zero is left out. */
const tallyItems = computed(() =>
  STATS.filter((stat) => amountOf(stat.key) > 0).map((stat) => ({ key: stat.key, label: stat.label, amount: shown[stat.key] })),
);

// --- the Pegasus's colours -------------------------------------------------------------------------

const rgbOf = (hex: string): [number, number, number] | null => {
  const found = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!found) return null;
  const full = found[1].length === 3 ? [...found[1]].map((digit) => digit + digit).join("") : found[1];
  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as [number, number, number];
};

const brightness = ([r, g, b]: [number, number, number]): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** The colour of the light: the Pegasus's own, unless it is too dark to glow (Umbra), then its second colour. */
const glowOf = (pegasus: RevealPegasus | null): string => {
  if (!pegasus) return PALE_YELLOW;
  for (const candidate of [pegasus.color, pegasus.secondaryColor]) {
    const rgb = rgbOf(candidate);
    const isBrightEnoughToGlow = rgb && brightness(rgb) >= 0.22;
    if (isBrightEnoughToGlow) return candidate;
  }
  return PALE_YELLOW;
};

const paint = computed(() => {
  const glow = glowOf(props.pegasus);
  const [r, g, b] = rgbOf(glow) ?? PALE_YELLOW_RGB;
  return {
    "--reveal-glow": glow,
    "--reveal-glow-soft": `rgba(${r}, ${g}, ${b}, 0.45)`,
    "--peg-color": props.pegasus?.color ?? PALE_YELLOW,
    "--peg-color-2": props.pegasus?.secondaryColor ?? "#ffffff",
  };
});

/** Sparks fly out of the shell in a ring: angle and reach step by the golden ratio so neighbours differ. */
const sparkStyle = (n: number) => {
  const turn = (n * 0.618034) % 1;
  return {
    "--spark-angle": `${turn * 360}deg`,
    "--spark-reach": `${80 + ((n * 37) % 60)}px`,
    "--spark-delay": `${(n % 5) * 30}ms`,
    "--spark-size": `${0.7 + ((n * 0.382) % 1) * 0.8}rem`,
  };
};

// --- the sequence ----------------------------------------------------------------------------------

const reducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const later = (ms: number, run: () => void) => {
  timers.push(setTimeout(run, ms));
};

const clearTimers = () => {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
};

const heardTheWin = () => {
  if (heardWin) return;
  heardWin = true;
  play$fx("win");
};

const focusButton = () => nextTick(() => (flyButton.value ?? root.value)?.focus({ preventScroll: true }));

/** Everything is there and the button works. */
const settle = () => {
  clearTimers();
  crackStep.value = 3;
  typed.value = line.value.length;
  STATS.forEach((stat) => (shown[stat.key] = amountOf(stat.key)));
  counting.value = false;
  levelUpShown.value = props.levelUp;
  phase.value = "ready";
  focusButton();
};

const finishCount = () => {
  counting.value = false;
  STATS.forEach((stat) => (shown[stat.key] = amountOf(stat.key)));
  if (props.levelUp) {
    levelUpShown.value = true;
    feel("success");
  }
  later(READY_AFTER_MS, () => {
    phase.value = "ready";
    focusButton();
  });
};

const countUp = (step: number) => {
  const steps = Math.round(TALLY_MS / TALLY_STEP_MS);
  const progress = Math.min(1, step / steps);
  // Fast at first and slowing into the total, so the last digits are seen settling
  const eased = 1 - (1 - progress) * (1 - progress);
  STATS.forEach((stat) => (shown[stat.key] = Math.round(amountOf(stat.key) * eased)));
  if (step >= steps) {
    finishCount();
    return;
  }
  later(TALLY_STEP_MS, () => countUp(step + 1));
};

const startTally = () => {
  phase.value = "tally";
  if (tallyItems.value.length === 0) {
    finishCount();
    return;
  }
  counting.value = true;
  countUp(0);
};

const typeNext = () => {
  typed.value += 1;
  if (typed.value < line.value.length) {
    later(TYPE_EVERY_MS, typeNext);
    return;
  }
  later(TALLY_AFTER_MS, startTally);
};

const hatch = () => {
  phase.value = "hatch";
  crackStep.value = 3;
  heardTheWin();
  feel("thud");
  later(TYPE_AFTER_MS, () => {
    phase.value = "typing";
    typeNext();
  });
};

const crack = (step: number) => {
  crackStep.value = step;
  // The secret sting is the crack: once, on the first
  if (step === 1) play$fx("shhh");
  feel("tick");
};

const start = () => {
  clearTimers();
  spent = false;
  heardWin = false;
  phase.value = "egg";
  crackStep.value = 0;
  typed.value = 0;
  counting.value = false;
  levelUpShown.value = false;
  STATS.forEach((stat) => (shown[stat.key] = 0));
  // The dialog holds the focus from the start, so Escape works while the egg is still cracking
  nextTick(() => root.value?.focus({ preventScroll: true }));

  if (reducedMotion()) {
    heardTheWin();
    settle();
    return;
  }
  if (!props.pegasus) {
    later(BARE_HATCH_AT_MS, hatch);
    return;
  }
  CRACK_AT_MS.forEach((at, index) => later(at, () => crack(index + 1)));
  later(HATCH_AT_MS, hatch);
};

/** A tap while the egg is still hatching, or the reward still counting, shows everything at once. */
const skip = () => {
  if (phase.value === "ready") return;
  heardTheWin();
  settle();
};

/** The button: before the end it skips ahead; at the end it hands the hero back to the page, once. */
const press = () => {
  if (phase.value !== "ready") {
    skip();
    return;
  }
  if (spent) return;
  spent = true;
  feel("tap");
  play$fx("select");
  emit("done");
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) start();
    else clearTimers();
  },
  { immediate: true },
);

onBeforeUnmount(clearTimers);
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./templeReveal" as *;

$pr-ink: $reveal-ink;
// The egg and the Pegasus are icon-font glyphs; their size is the font size
$pr-egg: 120px;
$pr-horse: 124px;

// ---------------------------------------------------------------------------------------------------------------
// The overlay: the stage fills the room above the panel, the panel (and the button) dock at the bottom
// ---------------------------------------------------------------------------------------------------------------
.pegasus-reveal {
  --reveal-glow: #{$eb-color-pale-yellow};
  --reveal-glow-soft: rgba(247, 232, 168, 0.45);
  --peg-color: #{$eb-color-pale-yellow};
  --peg-color-2: #fff;
  @include reveal-overlay-docked;
}

.pegasus-reveal__backdrop {
  @include reveal-backdrop(36%);
}

// The light only comes up when the shell breaks
.is-egg .pegasus-reveal__backdrop {
  @include reveal-backdrop-unlit;
}

.pegasus-reveal__stage {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ---------------------------------------------------------------------------------------------------------------
// The egg: two halves cut along one crack, so the shell can fall apart where it was broken
// ---------------------------------------------------------------------------------------------------------------
.peg-egg {
  --wobble: 3deg;
  --wobble-speed: 0.7s;
  position: relative;
  z-index: 2;
  width: $pr-egg * 0.75;
  height: $pr-egg;
  font-size: $pr-egg;
  transform-origin: 50% 92%;
  animation: peg-egg-land 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.25) both,
    peg-egg-wobble var(--wobble-speed) 0.5s ease-in-out infinite;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45)) drop-shadow(0 0 12px var(--reveal-glow-soft));

  // Every crack shakes it harder and faster
  &.crack-1 {
    --wobble: 5deg;
    --wobble-speed: 0.5s;
  }
  &.crack-2 {
    --wobble: 8deg;
    --wobble-speed: 0.36s;
  }
  &.crack-3 {
    --wobble: 11deg;
    --wobble-speed: 0.24s;
  }
}

.peg-egg__half {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  line-height: 1;
  --fa-primary-color: var(--peg-color);
  --fa-secondary-color: var(--peg-color-2);
  --fa-secondary-opacity: 0.85;
  // The same zigzag, top and bottom, so the halves meet along the crack
  &--top {
    clip-path: polygon(0 0, 100% 0, 100% 52%, 86% 46%, 70% 57%, 56% 45%, 42% 57%, 28% 45%, 14% 57%, 0 50%);
  }
  &--bottom {
    clip-path: polygon(0 50%, 14% 57%, 28% 45%, 42% 57%, 56% 45%, 70% 57%, 86% 46%, 100% 52%, 100% 100%, 0 100%);
  }
}

// The light leaking out of the shell along the cracks, laid on the same zigzag
.peg-egg__cracks {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.peg-crack {
  fill: none;
  stroke: #fff;
  stroke-width: 2.5px;
  stroke-linecap: square;
  stroke-linejoin: miter;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 3px var(--reveal-glow));
  opacity: 0;
}

.crack-1 .peg-crack--1,
.crack-2 .peg-crack--1,
.crack-3 .peg-crack--1,
.crack-2 .peg-crack--2,
.crack-3 .peg-crack--2,
.crack-3 .peg-crack--3 {
  opacity: 1;
}

// The shell breaks: the halves fly apart and are gone
.is-hatch,
.is-typing,
.is-tally,
.is-ready {
  .peg-egg {
    animation: none;
    pointer-events: none;
  }
  .peg-egg__half--top {
    animation: peg-shell-top 0.7s cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
  }
  .peg-egg__half--bottom {
    animation: peg-shell-bottom 0.7s cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
  }
  .peg-crack {
    opacity: 0;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The Pegasus (or the lit temple) rises in its own light
// ---------------------------------------------------------------------------------------------------------------
.peg-rise {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  width: $pr-horse;
  height: $pr-horse;
  margin: ($pr-horse / -2) 0 0 ($pr-horse / -2);
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(46px) scale(0.5);
}

.peg-figure {
  --fa-primary-color: var(--peg-color);
  --fa-secondary-color: var(--peg-color-2);
  --fa-secondary-opacity: 1;
  display: block;
  font-size: $pr-horse;
  line-height: 1;
  // The light round it also keeps a dark Pegasus (Umbra) readable on the dark
  filter: drop-shadow(0 0 4px var(--reveal-glow)) drop-shadow(0 0 16px var(--reveal-glow)) drop-shadow(0 5px 0 rgba(0, 0, 0, 0.45));
}

.is-hatch,
.is-typing,
.is-tally,
.is-ready {
  .peg-rise {
    opacity: 1;
    transform: none;
    animation: peg-rise 0.75s 0.1s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
  }
  .peg-figure {
    animation: peg-float 2.6s 0.9s ease-in-out infinite;
  }
}

.pegasus-reveal__rays {
  @include reveal-rays(460px);
  left: 50%;
  top: 50%;
}

.pegasus-reveal__flash {
  @include reveal-flash(90px);
  z-index: 4;
  left: 50%;
  top: 50%;
}

.is-hatch,
.is-typing,
.is-tally,
.is-ready {
  .pegasus-reveal__rays {
    animation: reveal-rays-in 0.6s ease-out forwards, reveal-rays-turn 24s linear infinite;
  }
  .pegasus-reveal__flash {
    animation: reveal-flash 0.6s ease-out forwards;
  }
}

// Sparks out of the shell, once
.pegasus-reveal__sparks {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
}

.spark {
  position: absolute;
  left: 0;
  top: 0;
  font-size: var(--spark-size);
  line-height: 1;
  color: var(--reveal-glow);
  text-shadow: 0 0 6px var(--reveal-glow);
  opacity: 0;
  transform: translate(-50%, -50%);

  &:nth-child(3n) {
    color: #fff;
  }
}

.is-hatch .spark,
.is-typing .spark,
.is-tally .spark,
.is-ready .spark {
  animation: peg-spark-fly 1s var(--spark-delay) cubic-bezier(0.15, 0.7, 0.35, 1) both;
}

// A short phone leaves less room above the panel: the scene shrinks with it
@media (max-height: 660px) {
  .pegasus-reveal__stage {
    transform: scale(0.78);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The panel: the line, the reward and the button
// ---------------------------------------------------------------------------------------------------------------
.pegasus-reveal__panel {
  @include reveal-panel;
  flex: none;
  // The panel comes up as the shell breaks (it holds its place until then, so nothing jumps)
  animation: none;
}

.is-egg .pegasus-reveal__panel {
  opacity: 0;
  transform: translateY(18px);
  pointer-events: none;
}

.is-hatch,
.is-typing,
.is-tally,
.is-ready {
  .pegasus-reveal__panel {
    animation: reveal-panel-in 0.32s 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
  }
}

.pegasus-reveal__title {
  @include reveal-title;
  margin-bottom: 8px;
  min-height: 1.4em;
  font-size: 1.5rem;
  line-height: 1.25;
  // The line is typed over its own ghost, so the panel never grows a row as the words arrive
  overflow-wrap: anywhere;
}

.pegasus-reveal__ghost {
  visibility: hidden;
}

.pegasus-tally {
  margin: 4px 0 2px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px 0;
  font-family: $eb-font-status;
  font-size: 1.2rem;
  letter-spacing: 0.04em;
  text-align: center;
  text-shadow: 1px 1px 0 $pr-ink;
  color: $eb-color-cream;
}

// Its room is kept from the start, but nothing shows until the line is typed and the count begins
.pegasus-tally.is-unlit {
  visibility: hidden;
}

.pegasus-tally__item {
  white-space: nowrap;
  // Digits keep their width while they count, so the row does not shiver
  font-variant-numeric: tabular-nums;

  & + &::before {
    content: "\00b7";
    margin: 0 0.55em;
    color: rgba(231, 230, 179, 0.6);
  }

  &--xp {
    color: var(--xp-color-xp, #{$eb-color-mint-green});
  }
  &--gp {
    color: var(--xp-color-gp, #{$reveal-gold});
  }
  &--ap {
    color: var(--xp-color-ap, #{$eb-color-sky-blue});
  }
}

.pegasus-levelup {
  margin: 8px 0 0;
  font-family: $eb-font-status;
  font-size: 1.35rem;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
  color: $eb-color-pale-yellow;
  text-shadow: 2px 2px 0 $pr-ink, 0 0 10px rgba(247, 232, 168, 0.5);
  // Its room is kept from the start; it only lights up when the count is done
  visibility: hidden;

  &.is-shown {
    visibility: visible;
    animation: peg-levelup-pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
}

.pegasus-reveal__actions {
  @include reveal-actions-stacked;
  margin-top: 12px;
}

.pegasus-button {
  @include reveal-button;
  @include reveal-button-tall;
  @include reveal-button-primary;
  width: 100%;

  // Before the end it only skips ahead: it reads as waiting, but a tap still works
  &.is-waiting {
    opacity: 0.55;
    filter: saturate(0.6);
  }
  &.is-waiting i {
    animation: none;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going: the same as the chest, with the panel sinking back as the dark fades
// ---------------------------------------------------------------------------------------------------------------
.pegasus-reveal-enter-active {
  transition: opacity 0.26s ease;
}
.pegasus-reveal-enter-from {
  opacity: 0;
}
.pegasus-reveal-leave-active {
  transition: opacity 0.3s 0.12s ease;
  pointer-events: none;

  .pegasus-reveal__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
}
.pegasus-reveal-leave-to {
  opacity: 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes peg-egg-land {
  0% { transform: translateY(-70px) scale(0.85); opacity: 0; }
  60% { transform: translateY(5px) scale(1.05, 0.93); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

// The egg rocks one way, then the other; every crack makes it rock harder (--wobble) and faster
@keyframes peg-egg-wobble {
  0%, 100% { rotate: 0deg; }
  25% { rotate: var(--wobble); }
  75% { rotate: calc(var(--wobble) * -1); }
}

@keyframes peg-shell-top {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  100% { transform: translate(-46px, -78px) rotate(-34deg); opacity: 0; }
}

@keyframes peg-shell-bottom {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  100% { transform: translate(18px, 52px) rotate(14deg); opacity: 0; }
}

@keyframes peg-rise {
  0% { transform: translateY(46px) scale(0.5); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes peg-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes peg-spark-fly {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(0) scale(0.4); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(var(--spark-reach)) scale(1); }
}

@keyframes peg-levelup-pop {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .peg-egg,
  .peg-egg__half,
  .peg-rise,
  .peg-figure,
  .spark,
  .pegasus-reveal__rays,
  .pegasus-reveal__flash,
  .pegasus-reveal__panel,
  .pegasus-levelup,
  .pegasus-button i {
    animation: none !important;
  }
  .pegasus-reveal__rays {
    opacity: 0.4;
    transform: none;
  }
  .pegasus-reveal__panel {
    opacity: 1;
    transform: none;
  }
  // The egg stays down; the Pegasus is simply there
  .peg-egg {
    display: none;
  }
}
</style>
