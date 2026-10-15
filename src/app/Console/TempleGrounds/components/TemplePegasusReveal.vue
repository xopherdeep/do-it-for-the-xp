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
import { isTextInstant, pacedLetterMs } from "@/lib/utils/textSpeed";
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useTimers } from "@/hooks/useTimers";
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

interface TemplePegasusRevealProps {
  open: boolean;
  /** The Pegasus that was freed; null for a temple that keeps none (or a hero who has not freed it yet) */
  pegasus: RevealPegasus | null;
  /** What the temple paid. Nothing paid, nothing counted. */
  reward: RevealReward;
  levelUp: boolean;
}

/**
 * The temple is cleared, in the style of the chest and the doors: in the dark an egg in the Pegasus's colours wobbles
 * and cracks in three steps, the Pegasus rises out of it in a wheel of its own light, "{Name} is free!" types in, and
 * the reward counts up under it. One button at the bottom ("Fly home") tells the page it is done; the page walks the
 * hero out of the temple. A temple that keeps no Pegasus shows "The temple is cleared!" over a glowing temple instead
 * of the egg. A tap anywhere before the end skips to it. The page owns `open`, and runs the way home on `done`.
 */
const props = defineProps<TemplePegasusRevealProps>();

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
const timers = useTimers();
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

const wantsReducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const later = (ms: number, run: () => void) => {
  timers.startTimeout(ms, run);
};

const clearTimers = () => {
  timers.cancelAll();
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
  const hasLevelUp = props.levelUp;
  if (hasLevelUp) {
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
  const isLastStep = step >= steps;
  if (isLastStep) {
    finishCount();
    return;
  }
  later(TALLY_STEP_MS, () => countUp(step + 1));
};

const startTally = () => {
  phase.value = "tally";
  const hasNothingToTally = tallyItems.value.length === 0;
  if (hasNothingToTally) {
    finishCount();
    return;
  }
  counting.value = true;
  countUp(0);
};

const typeNext = () => {
  // Instant text speed lands the whole line in one step
  typed.value = isTextInstant() ? line.value.length : typed.value + 1;
  const isLineUnfinished = typed.value < line.value.length;
  if (isLineUnfinished) {
    later(pacedLetterMs(TYPE_EVERY_MS), typeNext);
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
  const isFirstCrack = step === 1;
  if (isFirstCrack) play$fx("shhh");
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

  if (wantsReducedMotion()) {
    heardTheWin();
    settle();
    return;
  }
  const pegasus = props.pegasus;
  if (!pegasus) {
    later(BARE_HATCH_AT_MS, hatch);
    return;
  }
  CRACK_AT_MS.forEach((at, index) => later(at, () => crack(index + 1)));
  later(HATCH_AT_MS, hatch);
};

/** A tap while the egg is still hatching, or the reward still counting, shows everything at once. */
const skip = () => {
  const isReady = phase.value === "ready";
  if (isReady) return;
  heardTheWin();
  settle();
};

/** The button: before the end it skips ahead; at the end it hands the hero back to the page, once. */
const press = () => {
  const isReady = phase.value === "ready";
  if (!isReady) {
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

<style lang="scss" scoped src="./_TemplePegasusReveal.scss" />
