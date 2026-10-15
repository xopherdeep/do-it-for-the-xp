<template>
  <!-- Rendered at the app root: inside the page, the room's floating buttons are painted over any overlay -->
  <!-- defer: on a first load the app root is not in the page yet when this mounts -->
  <Teleport to="ion-app" defer>
  <Transition name="door-reveal" :duration="{ enter: 260, leave: 380 }">
    <div
      v-if="open && door"
      ref="root"
      class="door-reveal"
      :class="[`is-${phase}`, `door-${door.kind}`, `element-${element}`, { 'is-barred': !door.canOpen }]"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="door-reveal-title"
      data-cy="door-reveal"
      @keydown.esc.prevent="leave"
    >
      <div class="door-reveal__backdrop" aria-hidden="true"></div>

      <div class="door-reveal__stage" aria-hidden="true">
        <div class="door-reveal__rays"></div>

        <svg class="door-sprite" :viewBox="`0 0 ${DOOR_W} ${DOOR_H}`" shape-rendering="crispEdges" role="presentation">
          <defs>
            <!-- The light of the next room, strongest low in the doorway -->
            <radialGradient id="door-beyond-light" cx="0.5" cy="0.85" r="0.75">
              <stop offset="0" class="door-sprite__light-core" />
              <stop offset="0.5" class="door-sprite__light-mid" />
              <stop offset="1" class="door-sprite__light-edge" />
            </radialGradient>
          </defs>
          <pixel-runs :runs="sprite.frame" />
          <pixel-runs :runs="sprite.beyond" />
          <rect
            class="door-sprite__light"
            :x="OPENING.left"
            :y="OPENING.top"
            :width="OPENING.right - OPENING.left + 1"
            :height="DOOR_H - 4 - OPENING.top"
          />
          <pixel-runs class="door-sprite__leaf door-sprite__leaf--left" :runs="sprite.leafLeft" />
          <pixel-runs class="door-sprite__leaf door-sprite__leaf--right" :runs="sprite.leafRight" />
          <g class="door-sprite__lock">
            <template v-if="door.kind === 'master'">
              <pixel-runs class="door-sprite__chains" :runs="sprite.chains" />
              <pixel-runs :runs="sprite.bossLock" />
            </template>
            <template v-else>
              <pixel-runs class="door-sprite__shackle" :runs="sprite.shackle" />
              <pixel-runs :runs="sprite.padlock" />
            </template>
          </g>
        </svg>

        <div class="door-reveal__flash"></div>

        <!-- The key, held up, then driven into the lock -->
        <span class="door-key">
          <i :class="['fad', keyIcon]"></i>
        </span>
      </div>

      <section class="door-reveal__panel">
        <h2 id="door-reveal-title" class="door-reveal__title">{{ door.header }}</h2>
        <p class="door-reveal__line">{{ door.line }}</p>

        <div class="door-key-count" :class="{ 'is-missing': !door.canOpen }">
          <span class="door-key-count__slot">
            <i :class="['fad', keyIcon]" aria-hidden="true"></i>
          </span>
          <span class="door-key-count__name">{{ keyName }}</span>
          <span class="door-key-count__value" data-cy="door-keys">{{ keyCount }}</span>
        </div>

        <div class="door-reveal__actions">
          <button
            ref="backButton"
            type="button"
            class="door-button door-button--ghost"
            :class="{ 'door-button--wide': !door.canOpen }"
            data-cy="door-leave"
            :disabled="busy"
            @click="leave"
          >
            Step back
          </button>
          <button
            v-if="door.canOpen"
            ref="unlockButton"
            type="button"
            class="door-button door-button--unlock"
            data-cy="door-unlock"
            :disabled="phase !== 'ready'"
            @click="unlock"
          >
            {{ isMaster ? "Open" : "Unlock" }}
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
import { play$fx } from "@/assets/fx";
import { feel, rumble } from "@/lib/services/feedback/haptics";
import PixelRuns from "./PixelRuns.vue";
import type { DoorView } from "./doorView";
import {
  DOOR_H,
  DOOR_W,
  OPENING,
  bossChains,
  bossLock,
  doorBeyond,
  doorFrame,
  doorLeafLeft,
  doorLeafRight,
  padlockBody,
  padlockShackle,
} from "./doorSprite";

/**
 * A locked door, close up. The door swings in on its stone arch with the lock across it. A hero who holds the key
 * presses Unlock: the key is held up, driven into the lock, the lock springs and drops (the Boss Door's chains fall
 * with it) and the leaves swing open on the light of the next room. A hero without one sees the lock rattle and can
 * only step back. The page owns `open`; it answers `unlock` by opening the door in the temple and setting `result`,
 * and closes the reveal on `leave` or, once the door has swung open, on `done`.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    door: DoorView | null;
    /** The temple's element: the stone and metal of the door */
    element?: string;
    /** What the temple said to the key: the door opened, or it would not */
    result?: "opened" | "refused" | null;
  }>(),
  { element: "wind", result: null },
);

const emit = defineEmits<{
  (e: "unlock"): void;
  (e: "leave"): void;
  (e: "done"): void;
}>();

type Phase = "arriving" | "ready" | "keying" | "unlocking" | "opening";

/** The door has settled on its arch; a barred door rattles its lock now */
const SETTLE_MS = 460;
/** The key rises, then plunges into the lock */
const KEY_MS = 620;
/** The lock springs and falls */
const UNLOCK_MS = 520;
/** The leaves swing open and the light comes through, then the reveal hands back */
const OPEN_MS = 900;

const phase = ref<Phase>("arriving");
const root = ref<HTMLElement | null>(null);
const unlockButton = ref<HTMLButtonElement | null>(null);
const backButton = ref<HTMLButtonElement | null>(null);
let timers: ReturnType<typeof setTimeout>[] = [];
let stopRumble: (() => void) | null = null;

// Ticks that match the lock-rattle keyframes: five shakes over 420 ms
const LOCK_BUZZ: Array<[number, "tick"]> = [[0, "tick"], [100, "tick"], [200, "tick"], [300, "tick"], [400, "tick"]];
/** The key is driven into the lock near the end of its flight (key-in at 88%) */
const KEY_IN_MS = 545;
/** The leaves finish swinging */
const SWING_MS = 550;

// Painted once per temple: the stone and metal follow the element
const sprite = computed(() => ({
  frame: doorFrame(props.element),
  beyond: doorBeyond(),
  leafLeft: doorLeafLeft(props.element),
  leafRight: doorLeafRight(props.element),
  shackle: padlockShackle(props.element),
  padlock: padlockBody(props.element),
  chains: bossChains(props.element),
  bossLock: bossLock(props.element),
}));

const isMaster = computed(() => props.door?.kind === "master");
const keyIcon = computed(() => (isMaster.value ? "fa-key-skeleton" : "fa-key"));
const keyName = computed(() => (isMaster.value ? "Boss Key" : "Small Keys"));
const keyCount = computed(() => {
  if (isMaster.value) return props.door?.canOpen ? "Found" : "Not found";
  return `× ${props.door?.keys ?? 0}`;
});
/** Once the key is on its way nothing else can be pressed */
const busy = computed(() => phase.value === "keying" || phase.value === "unlocking" || phase.value === "opening");

const later = (ms: number, run: () => void) => {
  timers.push(setTimeout(run, ms));
};

const clearTimers = () => {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
  stopRumble?.();
  stopRumble = null;
};

const wantsReducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const focusButton = () =>
  nextTick(() => (unlockButton.value ?? backButton.value ?? root.value)?.focus({ preventScroll: true }));

const start = () => {
  clearTimers();
  phase.value = "arriving";
  nextTick(() => root.value?.focus({ preventScroll: true }));
  const settle = () => {
    phase.value = "ready";
    // A lock without its key only rattles
    if (!props.door?.canOpen) {
      play$fx("error");
      if (wantsReducedMotion()) feel("error");
      else {
        stopRumble = rumble(LOCK_BUZZ);
        later(420, () => feel("error"));
      }
    }
    focusButton();
  };
  if (wantsReducedMotion()) settle();
  else later(SETTLE_MS, settle);
};

const unlock = () => {
  const cannotUnlock = phase.value !== "ready" || !props.door?.canOpen;
  if (cannotUnlock) return;
  phase.value = "keying";
  play$fx("key");
  feel("grab");
  emit("unlock");
  if (wantsReducedMotion()) {
    swingOpen();
    return;
  }
  later(KEY_IN_MS, () => feel("thud"));
  later(KEY_MS, swingOpen);
};

/** The key has turned: the lock falls and the doors open, if the temple let them. */
const swingOpen = () => {
  const isOpened = props.result === "opened";
  if (!isOpened) return;
  phase.value = "unlocking";
  play$fx("useKey");
  const fast = wantsReducedMotion();
  if (!fast) feel("thud");
  later(fast ? 0 : UNLOCK_MS, () => {
    phase.value = "opening";
    play$fx("openDoor");
    later(fast ? 300 : SWING_MS, () => feel("success"));
    later(fast ? 300 : OPEN_MS, () => emit("done"));
  });
};

const leave = () => {
  if (busy.value) return;
  clearTimers();
  feel("tap");
  play$fx("closeMenu");
  emit("leave");
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

// The door sprite is 64 x 72 drawn at 3x
$dr-scale: 3;
$dr-w: 64px * $dr-scale;
$dr-h: 72px * $dr-scale;
// Where the lock sits on the stage (the sprite's LOCK_Y + 5, the middle of the padlock)
$dr-lock-x: 32px * $dr-scale;
$dr-lock-y: 49px * $dr-scale;

.door-reveal {
  --reveal-glow: #fff2d0;
  --reveal-glow-soft: rgba(255, 242, 208, 0.35);
  @include reveal-overlay;

  // The light beyond each temple's doors, the same glow its open doorways show (TempleWalls)
  &.element-fire { --reveal-glow: #ff7828; --reveal-glow-soft: rgba(255, 120, 40, 0.35); }
  &.element-ice { --reveal-glow: #f0faff; --reveal-glow-soft: rgba(240, 250, 255, 0.35); }
  &.element-water { --reveal-glow: #96e6f0; --reveal-glow-soft: rgba(150, 230, 240, 0.35); }
  &.element-earth { --reveal-glow: #96be5a; --reveal-glow-soft: rgba(150, 190, 90, 0.35); }
  &.element-light { --reveal-glow: #fff0b4; --reveal-glow-soft: rgba(255, 240, 180, 0.35); }
  &.element-shadow,
  &.element-moon { --reveal-glow: #aa6eff; --reveal-glow-soft: rgba(170, 110, 255, 0.35); }
}

.door-reveal__backdrop {
  @include reveal-backdrop(36%);
}

// The light only comes up when the doors open
.door-reveal:not(.is-opening) .door-reveal__backdrop {
  @include reveal-backdrop-unlit;
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: the door on its arch, the light behind it and the key
// ---------------------------------------------------------------------------------------------------------------
.door-reveal__stage {
  position: relative;
  width: $dr-w;
  height: $dr-h;
  flex: none;
  margin-top: 72px; // room for the key held up over the door
}

.door-sprite {
  position: relative;
  z-index: 2;
  display: block;
  width: $dr-w;
  height: $dr-h;
  overflow: visible;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45));
  animation: door-arrive 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
}

.door-sprite__light {
  fill: url(#door-beyond-light);
  opacity: 0;
}
.door-sprite__light-core {
  stop-color: #fff;
  stop-opacity: 0.95;
}
.door-sprite__light-mid {
  stop-color: var(--reveal-glow);
  stop-opacity: 0.75;
}
.door-sprite__light-edge {
  stop-color: var(--reveal-glow);
  stop-opacity: 0.1;
}

// Each leaf swings on its hinge at the jamb
.door-sprite__leaf {
  transform-box: view-box;
}
.door-sprite__leaf--left {
  transform-origin: 12px 40px;
}
.door-sprite__leaf--right {
  transform-origin: 52px 40px;
}

.door-sprite__lock,
.door-sprite__shackle,
.door-sprite__chains {
  transform-box: view-box;
  transform-origin: 32px 49px;
}

// A barred door: the lock rattles against the wood once the door has settled
.is-barred.is-ready .door-sprite__lock {
  animation: lock-rattle 0.42s steps(1, end) both;
}

// The key is in: the shackle springs, the lock jumps and drops away, the chains fall with it
.is-unlocking,
.is-opening {
  .door-sprite__shackle {
    animation: shackle-spring 0.16s steps(2, end) forwards;
  }
  .door-sprite__lock {
    animation: lock-drop 0.5s 0.12s cubic-bezier(0.5, -0.4, 0.8, 0.6) forwards;
  }
  .door-sprite__chains {
    animation: chains-slack 0.3s ease-in forwards;
  }
}

.is-opening {
  .door-sprite__leaf--left {
    animation: leaf-swing-left 0.55s cubic-bezier(0.3, 0.1, 0.25, 1) forwards;
  }
  .door-sprite__leaf--right {
    animation: leaf-swing-right 0.55s cubic-bezier(0.3, 0.1, 0.25, 1) forwards;
  }
  .door-sprite__light {
    animation: light-pour 0.6s 0.1s ease-out forwards;
  }
  .door-reveal__rays {
    animation: reveal-rays-in 0.5s 0.15s ease-out forwards, reveal-rays-turn 24s linear infinite;
  }
}

.door-reveal__rays {
  @include reveal-rays(560px);
  left: 50%;
  top: 46px * $dr-scale;
}

.door-reveal__flash {
  @include reveal-flash(70px);
  z-index: 3;
  left: $dr-lock-x;
  top: $dr-lock-y;
}

.is-unlocking .door-reveal__flash {
  animation: reveal-flash 0.5s ease-out forwards;
}

// The key: held up over the door, then driven into the lock and gone
.door-key {
  position: absolute;
  z-index: 4;
  left: $dr-lock-x;
  top: $dr-lock-y;
  width: 0;
  height: 0;
  display: grid;
  place-items: center;
  font-size: 96px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;

  i {
    --fa-primary-color: #{$reveal-ink};
    --fa-secondary-color: #{$reveal-gold};
    --fa-secondary-opacity: 1;
    filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 14px var(--reveal-glow)) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45));
  }
}

.is-keying .door-key {
  animation: key-in 0.62s cubic-bezier(0.3, 0, 0.3, 1) forwards;
}

// ---------------------------------------------------------------------------------------------------------------
// The panel: what the door says, the keys in the bag, and the two buttons
// ---------------------------------------------------------------------------------------------------------------
.door-reveal__panel {
  @include reveal-panel;
}

.door-reveal:not(.is-arriving) .door-reveal__panel {
  animation: reveal-panel-in 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
}

.door-reveal__title {
  @include reveal-title;
  color: $eb-color-pale-yellow;
  text-shadow: 2px 2px 0 $reveal-ink;
}

.door-reveal__line {
  @include reveal-text;
}

.door-key-count {
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

    .door-key-count__slot {
      filter: grayscale(0.85);
      opacity: 0.6;
    }
    .door-key-count__value {
      color: #ff8a96;
    }
  }
}

.door-key-count__slot {
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

.door-key-count__name {
  font-family: $eb-font-status;
  font-size: 1.05rem;
  color: $reveal-gold;
  text-shadow: 1px 1px 0 $reveal-ink;
}

.door-key-count__value {
  font-family: $eb-font-status;
  font-size: 1.05rem;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $reveal-ink;
}

.door-reveal__actions {
  @include reveal-actions;
}

.door-button {
  @include reveal-button;
}

.door-button--wide {
  grid-column: 1 / -1;
}

.door-button--ghost {
  @include reveal-button-ghost;
}

.door-button--unlock {
  @include reveal-button-primary;
  white-space: nowrap;
}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going
// ---------------------------------------------------------------------------------------------------------------
.door-reveal-enter-active {
  transition: opacity 0.26s ease;
}
.door-reveal-enter-from {
  opacity: 0;
}
.door-reveal-leave-active {
  transition: opacity 0.3s 0.08s ease;

  .door-reveal__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
}
.door-reveal-leave-to {
  opacity: 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes door-arrive {
  0% { transform: translateY(24px) scale(0.92); opacity: 0; }
  100% { transform: none; opacity: 1; }
}

// Whole-pixel jolts, like a sprite: no easing
@keyframes lock-rattle {
  0%, 100% { transform: none; }
  14% { transform: translateX(-2px) rotate(-6deg); }
  28% { transform: translateX(2px) rotate(6deg); }
  42% { transform: translateX(-2px) rotate(-4deg); }
  57% { transform: translateX(2px) rotate(4deg); }
  71% { transform: translateX(-1px) rotate(-2deg); }
  85% { transform: translateX(1px); }
}

@keyframes key-in {
  0% { opacity: 0; transform: translateY(-150px) scale(0.6) rotate(-20deg); }
  25% { opacity: 1; transform: translateY(-170px) scale(1.05) rotate(0deg); }
  55% { opacity: 1; transform: translateY(-160px) scale(1) rotate(0deg); }
  88% { opacity: 1; transform: translateY(-6px) scale(0.42) rotate(0deg); }
  100% { opacity: 0; transform: translateY(0) scale(0.32) rotate(90deg); }
}

@keyframes shackle-spring {
  to { transform: translateY(-4px); }
}

@keyframes lock-drop {
  0% { transform: none; opacity: 1; }
  25% { transform: translateY(-3px) rotate(-6deg); opacity: 1; }
  100% { transform: translateY(40px) rotate(28deg); opacity: 0; }
}

@keyframes chains-slack {
  to { transform: translateY(10px) scaleY(1.15); opacity: 0; }
}

// A leaf turning away on its hinge: it narrows and darkens, its far edge dipping a little
@keyframes leaf-swing-left {
  0% { transform: none; filter: none; }
  100% { transform: scaleX(0.16) skewY(-10deg); filter: brightness(0.45); }
}

@keyframes leaf-swing-right {
  0% { transform: none; filter: none; }
  100% { transform: scaleX(0.16) skewY(10deg); filter: brightness(0.45); }
}

@keyframes light-pour {
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .door-sprite,
  .door-sprite__lock,
  .door-sprite__shackle,
  .door-sprite__chains,
  .door-sprite__leaf,
  .door-sprite__light,
  .door-reveal__rays,
  .door-reveal__flash,
  .door-key,
  .door-reveal__panel,
  .door-button--unlock i {
    animation: none !important;
  }
  .door-reveal:not(.is-arriving) .door-reveal__panel {
    opacity: 1;
    transform: none;
  }
  .is-unlocking,
  .is-opening {
    .door-sprite__lock { opacity: 0; }
  }
  .is-opening {
    .door-sprite__leaf--left { transform: scaleX(0.16) skewY(-10deg); filter: brightness(0.45); }
    .door-sprite__leaf--right { transform: scaleX(0.16) skewY(10deg); filter: brightness(0.45); }
    .door-sprite__light { opacity: 1; }
  }
}
</style>
