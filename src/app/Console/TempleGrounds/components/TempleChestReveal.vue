<template>
  <!-- Rendered at the app root: inside the page, the room's floating buttons are painted over any overlay -->
  <!-- defer: on a first load the app root is not in the page yet when this mounts -->
  <Teleport to="ion-app" defer>
  <Transition name="chest-reveal" :duration="{ enter: 260, leave: 420 }">
    <div
      v-if="open"
      ref="root"
      class="chest-reveal"
      tabindex="-1"
      :class="[`is-${phase}`, `glow-${glow}`, `exit-${exitMode}`, { 'is-empty': isEmpty }]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chest-reveal-title"
      data-cy="chest-reveal"
      @click="skip"
      @keydown.esc.prevent="leave"
    >
      <div class="chest-reveal__backdrop" aria-hidden="true"></div>

      <div class="chest-reveal__stage" :style="stageStyle" aria-hidden="true">
        <div class="chest-reveal__rays"></div>
        <div class="chest-reveal__flash"></div>

        <!-- The loot rises out of the chest and fans out above it -->
        <div class="chest-reveal__fan">
          <span
            v-for="(item, index) in loot"
            :key="item.value"
            class="loot-orb"
            :class="[`tier-${item.tier}`, { 'is-out': index < revealed, 'is-left': isLeftBehind(item.value), 'is-hop': hopping === item.value }]"
            :style="fanStyle(index)"
          >
            <i :class="['fad', `fa-${item.icon}`, { 'is-tinted': Boolean(item.color) }]" :style="iconStyle(item)"></i>
          </span>
        </div>

        <svg
          class="chest-sprite"
          :viewBox="`0 0 ${CHEST_W} ${CHEST_H}`"
          shape-rendering="crispEdges"
          role="presentation"
        >
          <defs>
            <!-- Light welling up from the loot at the bottom of the hollow -->
            <radialGradient id="chest-hollow-light" cx="0.5" cy="1" r="0.8">
              <stop offset="0" class="chest-sprite__light-core" />
              <stop offset="0.45" class="chest-sprite__light-mid" />
              <stop offset="1" class="chest-sprite__light-edge" />
            </radialGradient>
          </defs>
          <pixel-runs class="chest-sprite__open-lid" :runs="sprite.openLid" />
          <g class="chest-sprite__mouth">
            <pixel-runs :runs="sprite.mouth" />
            <!-- The light from the loot, pooled in the hollow -->
            <rect class="chest-sprite__glow" :x="3" :y="OPEN_LID_BOTTOM + 1" :width="CHEST_W - 6" :height="BODY_TOP - OPEN_LID_BOTTOM - 1" />
          </g>
          <pixel-runs class="chest-sprite__body" :runs="sprite.body" />
          <pixel-runs class="chest-sprite__lid" :runs="sprite.lid" />
        </svg>

        <div class="chest-reveal__sparks">
          <span v-for="n in SPARK_COUNT" :key="n" class="spark" :style="sparkStyle(n)">{{ isEmpty ? "" : "✦" }}</span>
        </div>
      </div>

      <section class="chest-reveal__panel" @click.stop="skip">
        <h2 id="chest-reveal-title" class="chest-reveal__title">
          <span>{{ title }}</span>
        </h2>

        <p v-if="waiting" class="chest-reveal__empty" data-cy="chest-hint">What is inside?</p>

        <p v-else-if="isEmpty" class="chest-reveal__empty">Nothing but dust. Whatever was here is already in your bag.</p>

        <ul v-else class="loot-list">
          <li
            v-for="(item, index) in loot"
            :key="item.value"
            class="loot-row"
            :class="[`tier-${item.tier}`, { 'is-out': index < revealed, 'is-picked': selected.has(item.value) }]"
            :style="{ '--row-delay': `${ROW_LAG_MS}ms` }"
          >
            <button
              type="button"
              class="loot-row__button"
              role="checkbox"
              :aria-checked="selected.has(item.value)"
              :aria-disabled="whole || undefined"
              :tabindex="index < revealed ? 0 : -1"
              :data-cy="`chest-loot-${item.value}`"
              @click.stop="toggle(item.value)"
            >
              <span class="loot-row__slot">
                <i :class="['fad', `fa-${item.icon}`, { 'is-tinted': Boolean(item.color) }]" :style="iconStyle(item)" aria-hidden="true"></i>
              </span>
              <span class="loot-row__text">
                <span class="loot-row__name">{{ item.name }}</span>
                <span class="loot-row__blurb">{{ item.blurb }}</span>
              </span>
              <span class="loot-row__check" aria-hidden="true">
                <i class="fas fa-check"></i>
              </span>
            </button>
          </li>
        </ul>

        <div class="chest-reveal__actions">
          <!-- A shut chest waits for the hero: Leave, or Open it -->
          <template v-if="waiting">
            <button type="button" class="chest-button chest-button--ghost" data-cy="chest-leave" @click.stop="leave">
              Leave
            </button>
            <button
              ref="openButton"
              type="button"
              class="chest-button chest-button--take"
              data-cy="chest-open"
              :disabled="phase !== 'closed'"
              @click.stop="openLid"
            >
              Open
              <i class="fas fa-caret-right" aria-hidden="true"></i>
            </button>
          </template>
          <button
            v-else-if="isEmpty"
            ref="closeButton"
            type="button"
            class="chest-button chest-button--ghost chest-button--wide"
            data-cy="chest-close"
            :disabled="phase !== 'ready'"
            @click.stop="leave"
          >
            Leave
          </button>
          <template v-else>
            <button type="button" class="chest-button chest-button--ghost" data-cy="chest-leave" @click.stop="leave">
              Leave
            </button>
            <button
              ref="takeButton"
              type="button"
              class="chest-button chest-button--take"
              data-cy="chest-take"
              :disabled="phase !== 'ready' || selected.size === 0"
              @click.stop="take"
            >
              {{ takeLabel }}
              <i class="fas fa-caret-right" aria-hidden="true"></i>
            </button>
          </template>
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
import { chestGlow, type ChestLoot } from "@/lib/services/temples/ChestLoot";
import {
  BODY_TOP,
  CHEST_H,
  CHEST_W,
  OPEN_LID_BOTTOM,
  chestBody,
  chestLidClosed,
  chestLidOpen,
  chestMouth,
} from "./chestSprite";
import PixelRuns from "./PixelRuns.vue";

/**
 * Opening a treasure chest: the chest lands and rattles, the lid flies open in a burst of light and the loot rises
 * out of it one piece after another, fanning out above the chest while each piece's line fills in below. A chest that
 * comes with `closed` first lands shut and waits: Leave, or Open, which plays the same lid sequence from a shake. A
 * chest's rows start unticked but for one that comes ticked (a Pegasus chest's egg and whistle); tap a line to tick that
 * piece, and Take hands over only what is ticked (Take stays disabled until a line is ticked; whatever is left stays in
 * the chest). A beast's drop (`whole`) comes with every row ticked and is taken whole. A tap anywhere while the chest is
 * still opening skips to the end. An empty chest opens the same way, on a puff of dust instead of light, and can only
 * be closed. The page owns `open`, and closes the reveal on `take` or `leave`.
 */
interface ChestRevealProps {
  open: boolean;
  loot: ChestLoot[];
  /** The chest starts shut, waiting for Open (or Leave); the loot sequence plays when it is pressed. An empty chest never waits. */
  closed?: boolean;
  /**
   * A beast's drop, taken whole: every row comes ticked and no row can be unticked (the temple hands out the whole drop
   * whatever is ticked, so a row that looked left out would be a lie). Take still hands over every row.
   */
  whole?: boolean;
}

const props = defineProps<ChestRevealProps>();

const emit = defineEmits<{
  (e: "take", values: string[]): void;
  (e: "leave"): void;
}>();

type Phase = "closed" | "rattle" | "landing" | "burst" | "rising" | "ready";

/** When the lid flies open, after the chest has landed and rattled */
const BURST_AT_MS = 820;
/** When the first piece of loot leaves the chest */
const RISE_AT_MS = 1040;
/** A shut chest that is opened has landed already: it rattles at once, and the lid flies after the shake */
const OPEN_BURST_AT_MS = 420;
const OPEN_RISE_AT_MS = 640;
/** Between one piece of loot and the next */
const RISE_EVERY_MS = 300;
/** A row fills in once its piece has cleared the chest */
const ROW_LAG_MS = 180;
const SPARK_COUNT = 14;

// The sprite never changes, so it is painted once for every chest
const sprite = { lid: chestLidClosed(), openLid: chestLidOpen(), mouth: chestMouth(), body: chestBody() };

const phase = ref<Phase>("landing");
const revealed = ref(0);
const selected = ref(new Set<string>());
const exitMode = ref<"take" | "leave">("leave");
const root = ref<HTMLElement | null>(null);
const takeButton = ref<HTMLButtonElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const openButton = ref<HTMLButtonElement | null>(null);
const hopping = ref<string | null>(null);
const timers = useTimers();
let stopRumble: (() => void) | null = null;
let hopTimer: ReturnType<typeof setTimeout> | undefined;

// Ticks that match the chest-rattle keyframes: it starts shaking 420 ms in and shakes for 360 ms
const RATTLE_BUZZ: Array<[number, "tick"]> = [[420, "tick"], [540, "tick"], [660, "tick"], [780, "tick"]];
// The same ticks for a chest that is already there to be opened: the shake starts at once
const OPEN_RATTLE_BUZZ: Array<[number, "tick"]> = [[0, "tick"], [100, "tick"], [220, "tick"], [340, "tick"]];

const isEmpty = computed(() => props.loot.length === 0);
/** The chest is shut and the hero has not opened it yet (or has just pressed Open and the shake has begun) */
const waiting = computed(() => phase.value === "closed" || phase.value === "rattle");

// A shut chest gives nothing away: its light has the plain colour until the lid flies
const glow = computed(() => {
  if (waiting.value) return "item";
  if (isEmpty.value) return "empty";
  return chestGlow(props.loot) ?? "item";
});

const title = computed(() => {
  if (waiting.value) return "A chest!";
  if (isEmpty.value) return "Empty...";
  const isRelic = glow.value === "relic";
  if (isRelic) return "A relic!";
  return props.loot.length === 1 ? "You found..." : "Treasure!";
});

const takeLabel = computed(() => {
  const count = selected.value.size;
  // Nothing ticked: the button is disabled and only says "Take"; "Take all" is every row ticked
  const isNoneTicked = count === 0;
  if (isNoneTicked) return "Take";
  const isEveryRowTicked = count === props.loot.length;
  if (isEveryRowTicked) return props.loot.length === 1 ? "Take" : "Take all";
  return `Take ${count}`;
});

/** A row's own icon colours (a Pegasus's egg is painted in its shell colours), else the reveal's. */
const iconStyle = (item: ChestLoot) =>
  item.color
    ? { "--fa-primary-color": item.color, "--fa-secondary-color": item.secondaryColor ?? item.color, "--fa-secondary-opacity": "1" }
    : undefined;

/** What Take hands over: only the pieces that are ticked, in the chest's order. Whatever is not ticked stays in the chest. */
const taking = (): string[] => props.loot.map((item) => item.value).filter((value) => selected.value.has(value));

/** Once Take is pressed, the pieces not being taken stay behind in the chest. */
const isLeftBehind = (value: string): boolean => exitMode.value === "take" && !taking().includes(value);

const wantsReducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const later = (ms: number, run: () => void) => {
  timers.startTimeout(ms, run);
};

const clearTimers = () => {
  timers.cancelAll();
  stopRumble?.();
  stopRumble = null;
  clearTimeout(hopTimer);
  hopping.value = null;
};

/** Every piece is out and the buttons work: the keyboard lands on Take (or Close, for an empty chest). */
const settle = () => {
  clearTimers();
  revealed.value = props.loot.length;
  phase.value = "ready";
  nextTick(() => (takeButton.value ?? closeButton.value)?.focus({ preventScroll: true }));
};

/**
 * The lid sequence: the chest rattles, the lid flies in a burst of light and the loot rises piece by piece.
 * `shut` is a chest that was waiting to be opened: it has landed already, so it only rattles.
 */
const playOpening = (shut: boolean) => {
  phase.value = shut ? "rattle" : "landing";
  stopRumble = rumble(shut ? OPEN_RATTLE_BUZZ : RATTLE_BUZZ);
  later(shut ? OPEN_BURST_AT_MS : BURST_AT_MS, () => {
    phase.value = "burst";
    play$fx("openChest");
    feel("thud");
  });
  later(shut ? OPEN_RISE_AT_MS : RISE_AT_MS, () => {
    // Nothing rises out of an empty chest: the dust settles and the panel comes up
    if (isEmpty.value) {
      feel("warning");
      settle();
      return;
    }
    phase.value = "rising";
    props.loot.forEach((_, index) =>
      later(index * RISE_EVERY_MS, () => {
        revealed.value = index + 1;
        feel("tick");
      }),
    );
    later(Math.max(0, props.loot.length - 1) * RISE_EVERY_MS + ROW_LAG_MS + 240, settle);
  });
};

const start = () => {
  clearTimers();
  revealed.value = 0;
  exitMode.value = "leave";
  // A row that comes ticked (a Pegasus chest's egg and whistle) starts ticked; every other row starts unticked. A drop
  // taken whole has every row ticked.
  selected.value = new Set(props.loot.filter((item) => props.whole || item.checked).map((item) => item.value));
  // The dialog holds the focus from the start, so Escape leaves even while the chest is opening
  nextTick(() => root.value?.focus({ preventScroll: true }));
  // A shut chest waits for Open: it lands, and nothing else happens until the hero presses it
  const shouldWaitForOpen = props.closed && !isEmpty.value;
  if (shouldWaitForOpen) {
    phase.value = "closed";
    nextTick(() => openButton.value?.focus({ preventScroll: true }));
    return;
  }
  if (wantsReducedMotion()) {
    play$fx("openChest");
    // No rumbles without motion, but an empty chest still says so
    if (isEmpty.value) feel("warning");
    settle();
    return;
  }
  playOpening(false);
};

/** Open was pressed on the shut chest: the lid sequence plays, then the take flow is exactly the one for any chest. */
const openLid = () => {
  const isShut = phase.value === "closed";
  if (!isShut) return;
  feel("tap");
  if (wantsReducedMotion()) {
    play$fx("openChest");
    settle();
    return;
  }
  play$fx("select");
  playOpening(true);
};

/** A tap while the chest is still opening shows everything at once. */
const skip = () => {
  // A shut chest is opened with its button, never by a stray tap
  const hasNothingToSkip = phase.value === "ready" || phase.value === "closed";
  if (hasNothingToSkip) return;
  const isLidOpening = phase.value === "landing" || phase.value === "rattle";
  if (isLidOpening) play$fx("openChest");
  settle();
};

const toggle = (value: string) => {
  const isReady = phase.value === "ready";
  if (!isReady) {
    skip();
    return;
  }
  // A drop is taken whole: there is nothing to tick or untick
  if (props.whole) return;
  const next = new Set(selected.value);
  const isTicked = next.has(value);
  if (isTicked) {
    next.delete(value);
    play$fx("cursor");
    feel("tick");
  } else {
    next.add(value);
    play$fx("select");
    feel("grab");
    // The orb above hops and glints
    clearTimeout(hopTimer);
    hopping.value = null;
    nextTick(() => {
      hopping.value = value;
      hopTimer = setTimeout(() => (hopping.value = null), 300);
    });
  }
  selected.value = next;
};

const take = () => {
  const isReady = phase.value === "ready";
  if (!isReady) return;
  const picked = taking();
  // Nothing is ticked: the button is disabled, and a take that gets here anyway takes nothing
  const isNothingPicked = picked.length === 0;
  if (isNothingPicked) return;
  exitMode.value = "take";
  // In the chest's order, whatever order they were ticked in
  feel("success");
  emit("take", picked);
};

const leave = () => {
  clearTimers();
  exitMode.value = "leave";
  feel("tap");
  play$fx("closeMenu");
  emit("leave");
};

/** How big the loot is held up, by how many pieces share the space above the chest (px, the icon itself). */
const ORB_ICON_PX = [120, 120, 104, 84, 68];
/** The fan never reaches wider than this, so it fits a phone held upright */
const FAN_WIDTH_PX = 320;

const orbIcon = computed(() => ORB_ICON_PX[Math.min(props.loot.length, ORB_ICON_PX.length - 1)]);

/** The stage keeps room above the chest for the fan of loot. */
const stageStyle = computed(() => ({
  "--orb-icon": `${orbIcon.value}px`,
  marginTop: `${orbIcon.value + 64}px`,
}));

/** Where a piece of loot hangs above the chest: spread across an arc, the middle ones highest. */
const fanStyle = (index: number) => {
  const count = props.loot.length;
  const spread = Math.min(orbIcon.value * 1.3, FAN_WIDTH_PX / Math.max(1, count - 1));
  const offset = index - (count - 1) / 2;
  return {
    "--fan-x": `${offset * spread}px`,
    "--fan-y": `${-(orbIcon.value / 2 + 52) + Math.abs(offset) * 12}px`,
    "--fan-tilt": `${offset * 5}deg`,
  };
};

/** Sparks fly out of the mouth in a fan: angle and reach step by the golden ratio so neighbours differ. */
const sparkStyle = (n: number) => {
  const turn = (n * 0.618034) % 1;
  const angle = -160 + turn * 140;
  const reach = 70 + ((n * 37) % 60);
  return {
    "--spark-angle": `${angle}deg`,
    "--spark-reach": `${reach}px`,
    "--spark-delay": `${(n % 5) * 30}ms`,
    "--spark-size": `${0.7 + ((n * 0.382) % 1) * 0.8}rem`,
  };
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

<style lang="scss" scoped src="./_TempleChestReveal.scss" />
