<template>
  <Transition
    name="hero-fanfare"
    :duration="{ enter: 260, leave: 420 }"
  >
    <div
      v-if="open"
      ref="root"
      class="hero-fanfare"
      tabindex="-1"
      :class="[`is-${phase}`, { 'has-voxel': showVoxel }]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-fanfare-title"
      data-cy="hero-fanfare"
      @click="tapAnywhere"
      @keydown.esc.prevent="press"
    >
      <div
        class="hero-fanfare__backdrop"
        aria-hidden="true"
      ></div>

      <!-- The new hero stands alone in the dark: a glowing shape that charges up, then bursts into colour and dances -->
      <div
        class="hero-fanfare__stage"
        aria-hidden="true"
      >
        <div class="hero-fanfare__rays"></div>
        <div class="hero-fanfare__flash"></div>

        <div
          class="hero-fanfare__hero"
          :class="`charge-${charge}`"
          data-cy="hero-fanfare-hero"
        >
          <xp-hero-model
            v-if="showVoxel && look"
            class="hero-fanfare__model"
            :look="look"
            :animation="animation"
            :interactive="false"
          />
          <div
            v-else
            class="hero-fanfare__portrait"
            :class="{ 'is-dancing': phase !== 'dark' }"
          >
            <img
              v-if="portrait"
              :src="portrait"
              alt=""
            />
          </div>
        </div>

        <div class="hero-fanfare__sparks">
          <span
            v-for="n in SPARK_COUNT"
            :key="n"
            class="spark"
            :style="sparkStyle(n)"
          >&#10022;</span>
        </div>

        <!-- Reduced motion: no burst, one gentle sparkle -->
        <span
          class="hero-fanfare__twinkle"
          data-cy="hero-fanfare-twinkle"
        >&#10022;</span>
      </div>

      <xp-confetti-burst ref="confetti" />

      <section
        class="hero-fanfare__panel"
        @click.stop="tapAnywhere"
      >
        <h2
          id="hero-fanfare-title"
          class="hero-fanfare__title"
          data-cy="hero-fanfare-line"
        >
          <span>{{ lineText.slice(0, typed) }}</span
          ><span
            class="hero-fanfare__ghost"
            aria-hidden="true"
          >{{ lineText.slice(typed) }}</span>
        </h2>

        <div
          class="hero-fanfare__card"
          :class="{ 'is-unlit': !cardShown }"
          data-cy="hero-fanfare-card"
        >
          <p class="hero-fanfare__name">{{ name }}</p>
          <p
            v-if="jobClass"
            class="hero-fanfare__class"
          >
            <i
              v-if="jobIcon"
              :class="['fad', jobIcon]"
              aria-hidden="true"
            ></i>
            the {{ jobClass }}
          </p>
          <p
            v-else-if="subtitle"
            class="hero-fanfare__class"
          >
            {{ subtitle }}
          </p>
        </div>

        <div class="hero-fanfare__actions">
          <button
            ref="beginButton"
            type="button"
            class="hero-fanfare__button"
            :class="{ 'is-waiting': phase !== 'ready' }"
            data-cy="hero-fanfare-begin"
            @click.stop="press"
          >
            {{ actionText }}
            <i
              class="fas fa-caret-right"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { isTextInstant, pacedLetterMs } from "@/lib/utils/textSpeed";
import { computed, nextTick, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import { JOB_CLASS_OPTIONS } from "@/constants";
import { useTimers } from "@/hooks/useTimers";
import { feel } from "@/lib/services/feedback/haptics";
import { isHeroLook, type HeroAnimation, type HeroLook } from "@/lib/hero-look/types";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import XpConfettiBurst from "./XpConfettiBurst.vue";

interface XpHeroFanfareProps {
  open: boolean;
  /** The name the party will know the hero or quest by */
  name: string;
  jobClass?: string;
  /** Optional subtitle line (e.g. beast name or quest details) */
  subtitle?: string;
  /** Header banner announcement line */
  title?: string;
  /** Button action prompt label */
  actionText?: string;
  /** FX sound played on burst */
  sound?: string;
  /** The 3D hero; without it (or without WebGL) the portrait stands in */
  look?: HeroLook | null;
  /** The face for a hero/beast: a picture of their look, or their preset portrait */
  portrait?: string;
}

/**
 * A new hero joins the party, staged like the temple's reveals (the chest, the Pegasus): in the dark the hero stands
 * as a glowing shape that charges up in three pulses, then bursts into colour in a flash and a wheel of light with
 * confetti flying in from every edge of the screen, hops for joy ("victory") and goes on dancing. "A new hero joins
 * the party!" types in under it, the name and class light up, and the gold button at the bottom hands the page back.
 * A hero with no 3D look (or a phone with no WebGL) is the portrait in the same staging. A tap anywhere before the
 * end shows all of it at once; at the end a tap anywhere, or the button, is `done`. Reduced motion: the hero idles, no
 * burst, one gentle sparkle. The page owns `open` and does whatever comes after `done`.
 */
const props = withDefaults(
  defineProps<XpHeroFanfareProps>(),
  {
    title: "A new hero joins the party!",
    actionText: "Begin your adventure",
    sound: "levelUp",
  }
);

const emit = defineEmits<{
  /** The reveal's big moment: the stinger plays now, so the page may start the song */
  (e: "burst"): void;
  (e: "done"): void;
}>();

type Phase = "dark" | "burst" | "typing" | "card" | "ready";

const lineText = computed(() => props.title);

/** The glow pulses three times, harder each time, then the shape bursts into colour */
const CHARGE_AT_MS = [520, 840, 1160];
const BURST_AT_MS = 1480;
/** From the burst to the first letter, and from the last letter to the name lighting up */
const TYPE_AFTER_MS = 520;
const TYPE_EVERY_MS = 40;
const CARD_AFTER_MS = 260;
const READY_AFTER_MS = 520;
/** The hero hops for joy twice (the victory pose repeats every 0.9 s), then dances */
const VICTORY_MS = 1800;
/** A tap on the screen right after the end is the tap that skipped to it: it must not also leave */
const LEAVE_TAP_GUARD_MS = 500;
const SPARK_COUNT = 24;

const timers = useTimers();
const root = ref<HTMLElement | null>(null);
const beginButton = ref<HTMLButtonElement | null>(null);
const confetti = ref<{ burst: () => void; stop: () => void } | null>(null);
const phase = ref<Phase>("dark");
const charge = ref(0);
const typed = ref(0);
const animation = ref<HeroAnimation>("idle");
const cardShown = ref(false);
const canDraw3d = ref(true);
let burstDone = false;
let spent = false;
let readyAt = 0;

/** The hero is drawn in 3D when they have a look and the phone can draw it; otherwise the portrait stands in */
const showVoxel = computed(() => canDraw3d.value && isHeroLook(props.look));

const jobIcon = computed(() => JOB_CLASS_OPTIONS.find((job) => job.name === props.jobClass)?.icon ?? "");

const reducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** Feature detection: a phone without WebGL cannot draw the voxel hero, so the portrait takes its place. */
const webglWorks = (): boolean => {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
};

/** Sparks fly out in a ring: angle and reach step by the golden ratio so neighbours differ. */
const sparkStyle = (n: number) => {
  const turn = (n * 0.618034) % 1;
  return {
    "--spark-angle": `${turn * 360}deg`,
    "--spark-reach": `${110 + ((n * 43) % 95)}px`,
    "--spark-delay": `${(n % 6) * 25}ms`,
    "--spark-size": `${0.85 + ((n * 0.382) % 1) * 0.95}rem`,
  };
};

const later = (ms: number, run: () => void) => {
  timers.startTimeout(ms, run);
};

const focusButton = () => nextTick(() => (beginButton.value ?? root.value)?.focus({ preventScroll: true }));

/** The big moment, once: the stinger plays and the page is told, with or without the motion. */
const announce = () => {
  if (burstDone) return;
  burstDone = true;
  play$fx(props.sound || "levelUp");
  emit("burst");
};

/** The shape bursts into colour: the stinger, the flash, the confetti and the first hop. Once. */
const burst = () => {
  if (burstDone) return;
  announce();
  feel("thud");
  confetti.value?.burst();
  animation.value = "victory";
  later(VICTORY_MS, () => {
    animation.value = "dance";
  });
};

const markReady = () => {
  phase.value = "ready";
  cardShown.value = true;
  readyAt = performance.now();
  feel("success");
  focusButton();
};

const showCard = () => {
  phase.value = "card";
  cardShown.value = true;
  later(READY_AFTER_MS, markReady);
};

const typeNext = () => {
  // Instant text speed lands the whole line in one step
  typed.value = isTextInstant() ? lineText.value.length : typed.value + 1;
  const hasMoreToType = typed.value < lineText.value.length;
  if (hasMoreToType) {
    later(pacedLetterMs(TYPE_EVERY_MS), typeNext);
    return;
  }
  later(CARD_AFTER_MS, showCard);
};

/** Everything is there and the button works. */
const settle = () => {
  const isStillHopping = animation.value === "victory";
  timers.cancelAll();
  // The hop in progress is not cut short: the dance follows it
  if (isStillHopping) later(VICTORY_MS / 2, () => (animation.value = "dance"));
  charge.value = 3;
  typed.value = lineText.value.length;
  cardShown.value = true;
  phase.value = "ready";
  readyAt = performance.now();
  focusButton();
};

const start = () => {
  timers.cancelAll();
  confetti.value?.stop();
  burstDone = false;
  spent = false;
  phase.value = "dark";
  charge.value = 0;
  typed.value = 0;
  cardShown.value = false;
  animation.value = "idle";
  canDraw3d.value = webglWorks();
  // The dialog holds the focus from the start, so Escape works while the shape is still charging
  nextTick(() => root.value?.focus({ preventScroll: true }));

  const isMotionReduced = reducedMotion();
  if (isMotionReduced) {
    announce();
    settle();
    return;
  }
  CHARGE_AT_MS.forEach((at, index) =>
    later(at, () => {
      charge.value = index + 1;
      feel("tick");
    }),
  );
  later(BURST_AT_MS, () => {
    phase.value = "burst";
    charge.value = 3;
    burst();
    later(TYPE_AFTER_MS, () => {
      phase.value = "typing";
      typeNext();
    });
  });
};

const isRevealing = (): boolean => phase.value !== "ready";

/** A tap while the reveal is still playing shows everything at once; at the end it is the way on. */
const tapAnywhere = () => {
  if (isRevealing()) {
    burst();
    settle();
    return;
  }
  const isTooSoonToLeave = performance.now() - readyAt < LEAVE_TAP_GUARD_MS;
  if (isTooSoonToLeave) return;
  press();
};

/** The button: before the end it skips ahead; at the end it hands the hero back to the page, once. */
const press = () => {
  if (isRevealing()) {
    tapAnywhere();
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
    else timers.cancelAll();
  },
  { immediate: true },
);
</script>

<style lang="scss" src="./_XpHeroFanfare.scss" scoped />
