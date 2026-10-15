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

const reducedMotion = (): boolean =>
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
  if (reducedMotion()) settle();
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
  const fast = reducedMotion();
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
    if (result === "blown" && phase.value === "lit") blast();
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

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./templeReveal" as *;

// The wall sprite is 56 x 48 drawn at 4x
$wr-scale: 4;
$wr-w: 56px * $wr-scale;
$wr-h: 48px * $wr-scale;
// The heart of the opening on the stage
$wr-heart-x: 28px * $wr-scale;
$wr-heart-y: 24px * $wr-scale;
// One block lets go every 28 ms
$wr-stagger: 28ms;

.wall-reveal {
  --reveal-glow: #fff2d0;
  --reveal-glow-soft: rgba(255, 242, 208, 0.35);
  @include reveal-overlay-docked;

  // The light behind each temple's walls, the same glow its open doorways show (TempleWalls)
  &.element-fire { --reveal-glow: #ff7828; --reveal-glow-soft: rgba(255, 120, 40, 0.35); }
  &.element-ice { --reveal-glow: #f0faff; --reveal-glow-soft: rgba(240, 250, 255, 0.35); }
  &.element-water { --reveal-glow: #96e6f0; --reveal-glow-soft: rgba(150, 230, 240, 0.35); }
  &.element-earth { --reveal-glow: #96be5a; --reveal-glow-soft: rgba(150, 190, 90, 0.35); }
  &.element-light { --reveal-glow: #fff0b4; --reveal-glow-soft: rgba(255, 240, 180, 0.35); }
  &.element-shadow,
  &.element-moon { --reveal-glow: #aa6eff; --reveal-glow-soft: rgba(170, 110, 255, 0.35); }
}

.wall-reveal__backdrop {
  @include reveal-backdrop(36%);
}

// The light only comes up once the stone has gone
.wall-reveal:not(.is-crumbling):not(.is-open) .wall-reveal__backdrop {
  @include reveal-backdrop-unlit;
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: the wall, the light behind it
// ---------------------------------------------------------------------------------------------------------------
.wall-reveal__stage {
  position: relative;
  width: $wr-w;
  height: $wr-h;
  flex: none;
}

.wall-sprite-wrap {
  position: relative;
  z-index: 2;
  width: $wr-w;
  height: $wr-h;
}

// The wall comes in on its own, so the flash (on the wrapper) never restarts it
.wall-sprite {
  display: block;
  width: $wr-w;
  height: $wr-h;
  overflow: visible;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45));
  animation: wall-arrive 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
}

.wall-sprite__behind {
  fill: #0c080a;
}

.wall-sprite__light {
  fill: url(#wall-beyond-light);
  opacity: 0;
}
.wall-sprite__light-core {
  stop-color: #fff;
  stop-opacity: 0.8;
}
.wall-sprite__light-mid {
  stop-color: var(--reveal-glow);
  stop-opacity: 0.75;
}
.wall-sprite__light-edge {
  stop-color: var(--reveal-glow);
  stop-opacity: 0.1;
}

// The fissure's lit edges breathe slowly, like the sconce in the room's own walls
.wall-sprite__glow {
  color: var(--reveal-glow);
  animation: crack-pulse 1.8s ease-in-out infinite;
}

// Each block turns on its own middle as it falls
.wall-brick {
  transform-box: fill-box;
  transform-origin: center;
}

.is-flash,
.is-crumbling,
.is-open {
  // The fissure goes with the stone around it
  .wall-sprite__crack {
    opacity: 0;
  }
}

.is-crumbling,
.is-open {
  .wall-brick--falls {
    // In whole-pixel jumps, like a sprite: no easing
    animation: brick-fall 0.3s steps(6, end) calc(var(--order) * #{$wr-stagger}) forwards;
  }
  .wall-sprite__light {
    animation: light-pour 0.4s 0.1s ease-out forwards;
  }
  .wall-reveal__rays {
    animation: reveal-rays-in 0.5s 0.15s ease-out forwards, reveal-rays-turn 24s linear infinite;
  }
}

// The Bomb goes off: the wall whites out for a frame or two, and the whole stage jolts
.is-flash {
  .wall-sprite-wrap {
    animation: wall-flash 0.14s steps(2, end) both;
  }
  .wall-reveal__stage {
    animation: stage-jolt 0.3s steps(1, end);
  }
  .wall-reveal__flash {
    animation: reveal-flash 0.5s ease-out forwards;
  }
}

.wall-reveal__rays {
  @include reveal-rays(560px);
  left: $wr-heart-x;
  top: $wr-heart-y;
}

.wall-reveal__flash {
  @include reveal-flash(90px);
  z-index: 3;
  left: $wr-heart-x;
  top: $wr-heart-y;
}

// ---------------------------------------------------------------------------------------------------------------
// The panel: what the wall says, the Bombs in the bag, and the two buttons
// ---------------------------------------------------------------------------------------------------------------
.wall-reveal__panel {
  @include reveal-panel;
}

.wall-reveal:not(.is-arriving) .wall-reveal__panel {
  animation: reveal-panel-in 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
}

.wall-reveal__title {
  @include reveal-title;
  color: $eb-color-pale-yellow;
  text-shadow: 2px 2px 0 $reveal-ink;
}

.wall-reveal__line {
  @include reveal-text;
}

.wall-bomb-count {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 6px 10px 6px 8px;
  border: 2px solid rgba(231, 230, 179, 0.18);
  border-radius: 2px;
  background: rgba(56, 48, 80, 0.75);

  &.is-missing {
    border-style: dashed;

    .wall-bomb-count__slot {
      filter: grayscale(0.85);
      opacity: 0.6;
    }
    .wall-bomb-count__value {
      color: #ff8a96;
    }
  }
}

.wall-bomb-count__slot {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 2px;
  background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.18), transparent 70%), $eb-color-dark-purple;
  box-shadow: inset 0 0 0 2px $reveal-gold, inset 0 0 0 4px $eb-color-dark-purple, 0 0 8px rgba(255, 216, 74, 0.5);
  font-size: 1.35rem;

  i {
    --fa-primary-color: #{$eb-color-cream};
    --fa-secondary-color: #{$reveal-gold};
    --fa-secondary-opacity: 1;
  }
}

.wall-bomb-count__name,
.wall-bomb-count__value {
  font-family: $eb-font-status;
  font-size: 1.05rem;
  text-shadow: 1px 1px 0 $reveal-ink;
}
.wall-bomb-count__name {
  color: $reveal-gold;
}
.wall-bomb-count__value {
  color: $eb-color-cream;
}

.wall-reveal__actions {
  @include reveal-actions;
}

.wall-button {
  @include reveal-button;
  @include reveal-button-tall;
}

.wall-button--wide {
  grid-column: 1 / -1;
}

.wall-button--ghost {
  @include reveal-button-ghost;
}

.wall-button--bomb {
  @include reveal-button-primary;
  white-space: nowrap;
}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going
// ---------------------------------------------------------------------------------------------------------------
.wall-reveal-enter-active {
  transition: opacity 0.26s ease;
}
.wall-reveal-enter-from {
  opacity: 0;
}
.wall-reveal-leave-active {
  transition: opacity 0.3s 0.08s ease;

  .wall-reveal__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
}
.wall-reveal-leave-to {
  opacity: 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes wall-arrive {
  0% { transform: translateY(24px) scale(0.92); opacity: 0; }
  100% { transform: none; opacity: 1; }
}

@keyframes crack-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}

// White out, then half way back: two frames
@keyframes wall-flash {
  0% { filter: brightness(5) saturate(0); }
  50% { filter: brightness(2.4) saturate(0.4); }
  100% { filter: none; }
}

// Whole-pixel jolts of the stage, in screen pixels
@keyframes stage-jolt {
  0% { transform: translate(-4px, 2px); }
  20% { transform: translate(4px, -2px); }
  40% { transform: translate(-3px, -2px); }
  60% { transform: translate(3px, 2px); }
  80% { transform: translate(-1px, 1px); }
  100% { transform: none; }
}

// A block drops away, drifting and turning, in sprite pixels (the wall is drawn at 4x)
@keyframes brick-fall {
  0% { transform: none; opacity: 1; }
  100% { transform: translate(calc(var(--drift) * 1px), 22px) rotate(var(--turn)); opacity: 0; }
}

@keyframes light-pour {
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .wall-sprite,
  .wall-reveal__flash,
  .wall-sprite__glow,
  .wall-brick,
  .wall-sprite__light,
  .wall-reveal__rays,
  .wall-reveal__panel,
  .wall-reveal__stage,
  .wall-button--bomb i {
    animation: none !important;
  }
  // The flash alone, once and softly, and no crumble: the stone is simply gone when the opening shows
  .is-flash .wall-sprite-wrap {
    animation: wall-flash-soft 0.16s ease-out both !important;
  }
  .wall-reveal:not(.is-arriving) .wall-reveal__panel {
    opacity: 1;
    transform: none;
  }
  .wall-sprite__glow {
    opacity: 0.8;
  }
  .is-open {
    .wall-brick--falls { opacity: 0; }
    .wall-sprite__light { opacity: 1; }
  }
}

@keyframes wall-flash-soft {
  0% { filter: brightness(2.6) saturate(0.3); }
  100% { filter: none; }
}
</style>
