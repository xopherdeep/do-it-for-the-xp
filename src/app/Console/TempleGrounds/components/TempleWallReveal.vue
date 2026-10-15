<template>
  <!-- Rendered at the app root: inside the page, the room's floating buttons are painted over any overlay -->
  <!-- defer: on a first load the app root is not in the page yet when this mounts -->
  <Teleport to="ion-app" defer>
  <Transition name="wall-reveal" :duration="{ enter: 260, leave: 380 }">
    <div
      v-if="open && wall"
      ref="root"
      class="wall-reveal"
      :class="[`is-${phase}`, `element-${element}`, { 'is-barred': !wall.canBomb }]"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wall-reveal-title"
      data-cy="wall-reveal"
      @keydown.esc.prevent="leave"
    >
      <div class="wall-reveal__backdrop" aria-hidden="true"></div>

      <div class="wall-reveal__stage" aria-hidden="true">
        <div class="wall-reveal__rays"></div>

        <!-- The flash lives on the wrapper: a filter on an HTML box works everywhere, on an SVG part it does not -->
        <div class="wall-sprite-wrap">
          <svg class="wall-sprite" :viewBox="`0 0 ${WALL_W} ${WALL_H}`" shape-rendering="crispEdges" role="presentation">
            <defs>
              <!-- The light of the passage behind the wall, strongest low in the opening -->
              <radialGradient id="wall-beyond-light" cx="0.5" cy="0.8" r="0.8">
                <stop offset="0" class="wall-sprite__light-core" />
                <stop offset="0.5" class="wall-sprite__light-mid" />
                <stop offset="1" class="wall-sprite__light-edge" />
              </radialGradient>
            </defs>
            <!-- What lies behind the stone: dark, then the light, which only comes up once the blocks have fallen -->
            <rect class="wall-sprite__behind" x="0" y="0" :width="WALL_W" :height="WALL_H" />
            <rect
              class="wall-sprite__light"
              :x="hole.left"
              :y="hole.top"
              :width="hole.right - hole.left + 1"
              :height="hole.bottom - hole.top + 1"
            />
            <g
              v-for="brick in bricks"
              :key="brick.id"
              class="wall-brick"
              :class="{ 'wall-brick--falls': brick.falls }"
              :style="brick.falls ? { '--order': brick.order, '--drift': brick.drift, '--turn': `${brick.turn}deg` } : undefined"
            >
              <pixel-runs :runs="brick.runs" />
            </g>
            <g class="wall-sprite__crack">
              <pixel-runs :runs="crack.dark" />
              <pixel-runs class="wall-sprite__glow" :runs="crack.glow" />
            </g>
          </svg>
        </div>

        <div class="wall-reveal__flash"></div>
      </div>

      <section class="wall-reveal__panel">
        <h2 id="wall-reveal-title" class="wall-reveal__title">{{ wall.header }}</h2>
        <p class="wall-reveal__line">{{ wall.line }}</p>

        <div class="wall-bomb-count" :class="{ 'is-missing': !wall.canBomb }">
          <span class="wall-bomb-count__slot">
            <i class="fad fa-bomb" aria-hidden="true"></i>
          </span>
          <span class="wall-bomb-count__name">Bombs</span>
          <span class="wall-bomb-count__value" data-cy="wall-bombs">× {{ wall.bombs }}</span>
        </div>

        <div class="wall-reveal__actions">
          <button
            ref="closeButton"
            type="button"
            class="wall-button wall-button--ghost"
            :class="{ 'wall-button--wide': !wall.canBomb }"
            data-cy="wall-leave"
            :disabled="busy"
            @click="leave"
          >
            Close
          </button>
          <button
            v-if="wall.canBomb"
            ref="bombButton"
            type="button"
            class="wall-button wall-button--bomb"
            data-cy="wall-bomb"
            :disabled="phase !== 'ready'"
            @click="bomb"
          >
            Bomb it
            <i class="fas fa-caret-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </div>
  </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useTimers } from "@/hooks/useTimers";
import { play$fx } from "@/assets/fx";
import { feel } from "@/lib/services/feedback/haptics";
import PixelRuns from "./PixelRuns.vue";
import type { BombResult, BombView } from "./bombView";
import { WALL_H, WALL_W, wallBricks, wallCrack, wallHole } from "./wallSprite";

/**
 * A cracked wall, close up: a wall of stone blocks with a fissure down it, lit from behind. A hero with the Bombs in a
 * hand and a Bomb to spend presses Bomb it: the page lights the Bomb in the temple (the tapped wall first) and answers
 * with `result`. On `blown` the wall flashes, the blocks around the fissure crumble away one after another and the
 * opening shows the light of the next room, then the sheet hands back on `done`. A hero without one reads what the wall
 * is and what would open it, and can only close the sheet. Reduced motion gets the flash and the opening, no crumble.
 * The page owns `open`; it closes the sheet on `leave` or, once the opening has shown, on `done`.
 */
interface TempleWallRevealProps {
  open: boolean;
  wall: BombView | null;
  /** The temple's element: the stone of the wall and the colour of the light behind it */
  element?: string;
  /** What the temple said to the Bomb: the wall is down (or nothing, when it refused the sheet closes at once) */
  result?: BombResult | null;
}

const props = withDefaults(
  defineProps<TempleWallRevealProps>(),
  { element: "wind", result: null },
);

const emit = defineEmits<{
  (e: "bomb"): void;
  (e: "leave"): void;
  (e: "done"): void;
}>();

type Phase = "arriving" | "ready" | "lit" | "flash" | "crumbling" | "open";

/** The wall has settled; a wall nothing can open says so now */
const SETTLE_MS = 380;
/** The wall flashes white: a frame or two, held long enough to read */
const FLASH_MS = 140;
/** The blocks fall, one after another (28 ms apart in the style, 300 ms each) */
const CRUMBLE_MS = 500;
/** The opening shows, then the sheet hands back */
const OPEN_MS = 520;

const phase = ref<Phase>("arriving");
const root = ref<HTMLElement | null>(null);
const bombButton = ref<HTMLButtonElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const timers = useTimers();

// Painted once per temple: the stone follows the element
const bricks = computed(() => wallBricks(props.element));
const crack = wallCrack();
const hole = wallHole();

/** Once the Bomb is lit nothing else can be pressed */
const busy = computed(() => phase.value === "lit" || phase.value === "flash" || phase.value === "crumbling" || phase.value === "open");

const later = (ms: number, run: () => void) => {
  timers.startTimeout(ms, run);
};

const clearTimers = () => {
  timers.cancelAll();
};

const wantsReducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const focusButton = () =>
  nextTick(() => (bombButton.value ?? closeButton.value ?? root.value)?.focus({ preventScroll: true }));

const start = () => {
  clearTimers();
  phase.value = "arriving";
  nextTick(() => root.value?.focus({ preventScroll: true }));
  const settle = () => {
    phase.value = "ready";
    focusButton();
  };
  if (wantsReducedMotion()) settle();
  else later(SETTLE_MS, settle);
};

const bomb = () => {
  const cannotBomb = phase.value !== "ready" || !props.wall?.canBomb;
  if (cannotBomb) return;
  phase.value = "lit";
  feel("grab");
  emit("bomb");
};

/** The temple blew the wall: flash, crumble (a flash alone for reduced motion), then the opening. */
const blast = () => {
  const fast = wantsReducedMotion();
  phase.value = "flash";
  play$fx("damage");
  feel("slam");
  later(FLASH_MS, () => {
    phase.value = fast ? "open" : "crumbling";
    if (fast) {
      showOpening();
      return;
    }
    later(CRUMBLE_MS, showOpening);
  });
};

const showOpening = () => {
  phase.value = "open";
  feel("success");
  later(OPEN_MS, () => emit("done"));
};

const leave = () => {
  if (busy.value) return;
  clearTimers();
  feel("tap");
  play$fx("closeMenu");
  emit("leave");
};

// The page answers the Bomb in the same tick: a blown wall plays the blast
watch(
  () => props.result,
  (result) => {
    const isBlownWhileLit = result === "blown" && phase.value === "lit";
    if (isBlownWhileLit) blast();
  },
);

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

<style lang="scss" scoped src="./_TempleWallReveal.scss" />
