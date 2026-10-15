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
import { useTimers } from "@/hooks/useTimers";
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

interface TempleDoorRevealProps {
  open: boolean;
  door: DoorView | null;
  /** The temple's element: the stone and metal of the door */
  element?: string;
  /** What the temple said to the key: the door opened, or it would not */
  result?: "opened" | "refused" | null;
}

/**
 * A locked door, close up. The door swings in on its stone arch with the lock across it. A hero who holds the key
 * presses Unlock: the key is held up, driven into the lock, the lock springs and drops (the Boss Door's chains fall
 * with it) and the leaves swing open on the light of the next room. A hero without one sees the lock rattle and can
 * only step back. The page owns `open`; it answers `unlock` by opening the door in the temple and setting `result`,
 * and closes the reveal on `leave` or, once the door has swung open, on `done`.
 */
const props = withDefaults(
  defineProps<TempleDoorRevealProps>(),
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
const timers = useTimers();
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
  timers.startTimeout(ms, run);
};

const clearTimers = () => {
  timers.cancelAll();
  stopRumble?.();
  stopRumble = null;
};

const reducedMotion = (): boolean =>
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
      if (reducedMotion()) feel("error");
      else {
        stopRumble = rumble(LOCK_BUZZ);
        later(420, () => feel("error"));
      }
    }
    focusButton();
  };
  if (reducedMotion()) settle();
  else later(SETTLE_MS, settle);
};

const unlock = () => {
  const cannotUnlock = phase.value !== "ready" || !props.door?.canOpen;
  if (cannotUnlock) return;
  phase.value = "keying";
  play$fx("key");
  feel("grab");
  emit("unlock");
  if (reducedMotion()) {
    swingOpen();
    return;
  }
  later(KEY_IN_MS, () => feel("thud"));
  later(KEY_MS, swingOpen);
};

/** The key has turned: the lock falls and the doors open, if the temple let them. */
const swingOpen = () => {
  if (props.result !== "opened") return;
  phase.value = "unlocking";
  play$fx("useKey");
  const fast = reducedMotion();
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

<style lang="scss" scoped src="./_TempleDoorReveal.scss" />
