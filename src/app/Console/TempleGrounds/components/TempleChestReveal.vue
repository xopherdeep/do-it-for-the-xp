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
 * comes with `closed` first lands shut and waits: Leave, or Open, which plays the same lid sequence from a shake. Everything
 * starts unticked; tap a line to tick that piece, and Take hands over only what is ticked (Take stays disabled until a
 * line is ticked; whatever is left stays in the chest). A tap anywhere while the chest is still opening skips to
 * the end. An empty chest opens the same way, on a puff of dust instead of light, and can only be closed. The page
 * owns `open`, and closes the reveal on `take` or `leave`.
 */
const props = defineProps<{
  open: boolean;
  loot: ChestLoot[];
  /** The chest starts shut, waiting for Open (or Leave); the loot sequence plays when it is pressed. An empty chest never waits. */
  closed?: boolean;
}>();

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
let timers: ReturnType<typeof setTimeout>[] = [];
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
  timers.push(setTimeout(run, ms));
};

const clearTimers = () => {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
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
  // A row that comes ticked (a Pegasus chest's egg and whistle) starts ticked; every other row starts unticked
  selected.value = new Set(props.loot.filter((item) => item.checked).map((item) => item.value));
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

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./templeReveal" as *;

$cr-gold: $reveal-gold;
$cr-amber: $reveal-amber;
$cr-ink: $reveal-ink;
// The chest sprite is 64 x 48 drawn at 3x, whole pixels on every phone
$cr-scale: 3;
$cr-chest-w: 64px * $cr-scale;
$cr-chest-h: 48px * $cr-scale;

// ---------------------------------------------------------------------------------------------------------------
// The overlay. It covers the temple page (ion-page is its containing block) and stacks the stage over the panel.
// ---------------------------------------------------------------------------------------------------------------
.chest-reveal {
  --reveal-glow: #{$cr-gold};
  --reveal-glow-soft: rgba(255, 216, 74, 0.45);
  @include reveal-overlay;

  &.glow-relic {
    --reveal-glow: #fff6d0;
    --reveal-glow-soft: rgba(255, 246, 208, 0.55);
  }
  &.glow-gold {
    --reveal-glow: #{$cr-amber};
    --reveal-glow-soft: rgba(255, 179, 71, 0.45);
  }
  &.glow-supply {
    --reveal-glow: #{$eb-color-mint-green};
    --reveal-glow-soft: rgba(128, 216, 144, 0.4);
  }
  &.glow-item {
    --reveal-glow: #{$eb-color-sky-blue};
    --reveal-glow-soft: rgba(104, 168, 216, 0.4);
  }
  &.glow-empty {
    --reveal-glow: #9c93a8;
    --reveal-glow-soft: rgba(156, 147, 168, 0.12);
  }
}

.chest-reveal__backdrop {
  @include reveal-backdrop(34%);
}

// The light only comes up once the lid is open
.is-landing .chest-reveal__backdrop,
.is-closed .chest-reveal__backdrop,
.is-rattle .chest-reveal__backdrop {
  @include reveal-backdrop-unlit;
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: rays, flash, the fan of loot, the chest and its sparks, all centred on the chest's mouth
// ---------------------------------------------------------------------------------------------------------------
.chest-reveal__stage {
  --orb-icon: 120px;
  position: relative;
  width: $cr-chest-w;
  height: $cr-chest-h;
  flex: none;
}

.chest-sprite {
  position: relative;
  z-index: 2;
  display: block;
  width: $cr-chest-w;
  height: $cr-chest-h;
  overflow: visible;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45));
  animation: chest-land 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.25) both, chest-rattle 0.36s 0.42s steps(1, end) both;
}

// A shut chest waiting to be opened only lands; Open then makes it shake (it does not land again)
.is-closed .chest-sprite {
  animation: chest-land 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}
.is-rattle .chest-sprite {
  animation: chest-rattle 0.36s steps(1, end) both;
}

// The closed lid hinges on the body's top edge; the open lid on its own bottom edge
.chest-sprite__lid {
  transform-box: view-box;
  transform-origin: 32px 20px;
}
.chest-sprite__open-lid {
  transform-box: view-box;
  transform-origin: 32px 14px;
  transform: scaleY(0);
}
.chest-sprite__mouth {
  opacity: 0;
}
.chest-sprite__glow {
  fill: url(#chest-hollow-light);
  opacity: 0;
}
.chest-sprite__light-core {
  stop-color: #fff;
  stop-opacity: 0.95;
}
.chest-sprite__light-mid {
  stop-color: var(--reveal-glow);
  stop-opacity: 0.7;
}
.chest-sprite__light-edge {
  stop-color: var(--reveal-glow);
  stop-opacity: 0;
}

.is-burst,
.is-rising,
.is-ready {
  .chest-sprite {
    animation: chest-pop 0.32s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  .chest-sprite__lid {
    animation: lid-fly 0.16s steps(2, end) forwards;
  }
  .chest-sprite__open-lid {
    animation: open-lid-swing 0.34s 0.08s cubic-bezier(0.25, 1.7, 0.5, 1) forwards;
  }
  .chest-sprite__mouth {
    opacity: 1;
  }
  .chest-sprite__glow {
    animation: hollow-glow 1.8s 0.1s ease-in-out infinite;
  }
}

// God rays behind the chest: a slow-turning wheel of light from the mouth
.chest-reveal__rays {
  @include reveal-rays(520px);
  left: 50%;
  top: 16 * $cr-scale;
}

.chest-reveal__flash {
  @include reveal-flash(80px);
  z-index: 3;
  left: 50%;
  top: 16 * $cr-scale;
}

.is-burst,
.is-rising,
.is-ready {
  .chest-reveal__rays {
    animation: reveal-rays-in 0.5s ease-out forwards, reveal-rays-turn 24s linear infinite;
  }
  .chest-reveal__flash {
    animation: reveal-flash 0.55s ease-out forwards;
  }
}

.glow-relic .chest-reveal__rays {
  background: repeating-conic-gradient(
    from 0deg,
    #fff6d0 0deg 6deg,
    transparent 6deg 15deg,
    #b9e8ff 15deg 19deg,
    transparent 19deg 30deg,
    #ffc8e6 30deg 34deg,
    transparent 34deg 45deg
  );
}

// Sparks out of the mouth, once, as the lid flies
.chest-reveal__sparks {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 17 * $cr-scale;
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

.is-burst .spark {
  animation: spark-fly 0.9s var(--spark-delay) cubic-bezier(0.15, 0.7, 0.35, 1) both;
}

// A tinted icon (an egg in its Pegasus's colours) keeps a pale edge, so a dark shell still reads on the dark box
.loot-row__slot i.is-tinted {
  filter: drop-shadow(0 0 1.5px #fff);
}

// The loot above the chest, each piece in a bright orb
.chest-reveal__fan {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: 17 * $cr-scale;
  width: 0;
  height: 0;
}

.loot-orb {
  --orb: var(--reveal-glow);
  --orb-size: calc(var(--orb-icon) * 1.6);
  position: absolute;
  left: calc(var(--orb-size) / -2);
  top: calc(var(--orb-size) / -2);
  width: var(--orb-size);
  height: var(--orb-size);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.75) 0, var(--orb) 26%, transparent 66%);
  font-size: var(--orb-icon);
  line-height: 1;
  opacity: 0;
  transform: translate(0, 0) scale(0.2);
  transition: opacity 0.3s ease, filter 0.3s ease;

  i {
    --fa-primary-color: #{$cr-ink};
    --fa-secondary-color: var(--orb);
    --fa-secondary-opacity: 1;
    // A hard ink edge and a drop shadow, like a sprite held up over the hero's head
    filter: drop-shadow(0 0 2px #fff) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45));
  }

  &.tier-key { --orb: #{$cr-gold}; }
  &.tier-gold { --orb: #{$cr-amber}; }
  &.tier-supply { --orb: #{$eb-color-mint-green}; }
  &.tier-item { --orb: #{$eb-color-sky-blue}; }
  &.tier-relic { --orb: #fff6d0; }

  &.is-out {
    opacity: 1;
    animation:
      orb-rise 0.62s cubic-bezier(0.2, 1.3, 0.4, 1) both,
      orb-bob 2.4s 0.62s ease-in-out infinite;
  }

  // Pieces left in the chest when Take is pressed dim while the rest fly off
  &.is-left {
    opacity: 0.4;
    filter: grayscale(0.8);
  }

  // Grabbed: the piece hops and glints
  &.is-hop i {
    animation: orb-hop 0.28s steps(5, end);
  }
}

// An empty chest: no rays and no light in the hollow, just a dim flash and a puff of dust drifting up
.is-empty {
  .chest-reveal__rays,
  .chest-sprite__glow {
    display: none;
  }
  .chest-reveal__flash {
    background: radial-gradient(circle, rgba(200, 192, 210, 0.5) 0, transparent 70%);
  }
  .spark {
    width: calc(var(--spark-size) * 0.9);
    height: calc(var(--spark-size) * 0.9);
    border-radius: 50%;
    background: rgba(190, 182, 200, 0.55);
    box-shadow: 0 0 6px rgba(190, 182, 200, 0.4);
    text-shadow: none;
  }
  &.is-burst .spark {
    animation: dust-drift 1.4s var(--spark-delay) ease-out both;
  }
}

.chest-reveal__empty {
  @include reveal-text;
}


// ---------------------------------------------------------------------------------------------------------------
// The panel: the RPG box with what came out of the chest, and the two buttons
// ---------------------------------------------------------------------------------------------------------------
.chest-reveal__panel {
  @include reveal-panel;
}

.is-closed .chest-reveal__panel,
.is-rising .chest-reveal__panel,
.is-ready .chest-reveal__panel {
  animation: reveal-panel-in 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
}

// Open was pressed: the panel steps back while the chest shakes, and comes up again with the loot
.is-rattle .chest-reveal__panel {
  animation: reveal-panel-out 0.22s ease-in forwards;
  pointer-events: none;
}

.chest-reveal__title {
  @include reveal-title;
}

.loot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  max-height: 34vh;
  overflow-y: auto;
}

.loot-row {
  --orb: var(--reveal-glow);
  opacity: 0;
  transform: translateX(-10px);

  &.tier-key { --orb: #{$cr-gold}; }
  &.tier-gold { --orb: #{$cr-amber}; }
  &.tier-supply { --orb: #{$eb-color-mint-green}; }
  &.tier-item { --orb: #{$eb-color-sky-blue}; }
  &.tier-relic { --orb: #fff6d0; }

  &.is-out {
    animation: row-in 0.28s var(--row-delay) cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
  }
}

.loot-row__button {
  width: 100%;
  display: grid;
  grid-template-columns: 44px 1fr 26px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 2px solid rgba(231, 230, 179, 0.18);
  border-radius: 2px;
  background: rgba(56, 48, 80, 0.75);
  color: $eb-color-cream;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px dashed $eb-color-pale-yellow;
    outline-offset: 2px;
  }
  &:active {
    transform: translateY(1px);
  }
}

.loot-row__slot {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 2px;
  background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.18), transparent 70%), $eb-color-dark-purple;
  box-shadow: inset 0 0 0 2px var(--orb), inset 0 0 0 4px $eb-color-dark-purple, 0 0 8px var(--orb);
  font-size: 1.35rem;

  i {
    --fa-primary-color: #{$eb-color-cream};
    --fa-secondary-color: var(--orb);
    --fa-secondary-opacity: 1;
  }
}

.loot-row__text {
  display: grid;
  min-width: 0;
  line-height: 1.15;
}

.loot-row__name {
  font-family: $eb-font-status;
  font-size: 1.05rem;
  color: var(--orb);
  text-shadow: 1px 1px 0 $cr-ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loot-row__blurb {
  font-family: $eb-font-primary;
  font-size: 0.95rem;
  color: rgba(231, 230, 179, 0.82);
}

.loot-row__check {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 2px solid $eb-color-pale-yellow;
  border-radius: 2px;
  background: $eb-color-pale-yellow;
  color: $cr-ink;
  font-size: 0.8rem;
  // Not picked yet: an empty box with a soft pulse, asking to be ticked
  background: transparent;
  color: transparent;
  animation: check-invite 1.6s ease-in-out infinite;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.loot-row.is-picked {
  .loot-row__button {
    border-color: rgba(255, 216, 74, 0.55);
  }
  .loot-row__check {
    background: $cr-gold;
    border-color: $cr-gold;
    color: $cr-ink;
    // The check stamps in
    animation: check-stamp 0.18s steps(3, end);
  }
}

.loot-row.tier-relic .loot-row__name {
  background: linear-gradient(90deg, #fff6d0, #b9e8ff, #ffc8e6, #fff6d0);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: none;
  filter: drop-shadow(1px 1px 0 $cr-ink);
  animation: relic-shimmer 3s linear infinite;
}

.chest-reveal__actions {
  @include reveal-actions;
}

.chest-button {
  @include reveal-button;
}

.chest-button--wide {
  grid-column: 1 / -1;
}

.chest-button--ghost {
  @include reveal-button-ghost;
}

.chest-button--take {
  @include reveal-button-primary;

}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going. Taking sends the loot up and away; leaving lets the chest sink back into the dark.
// ---------------------------------------------------------------------------------------------------------------
.chest-reveal-enter-active {
  transition: opacity 0.26s ease;
}
.chest-reveal-enter-from {
  opacity: 0;
}
.chest-reveal-leave-active {
  transition: opacity 0.3s 0.12s ease;
}
.chest-reveal-leave-to {
  opacity: 0;
}

.chest-reveal-leave-active {
  .chest-reveal__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
  &.exit-take .loot-orb.is-out:not(.is-left) {
    animation: orb-collect 0.36s cubic-bezier(0.5, 0, 0.8, 0.4) forwards;
  }
  &.exit-leave .chest-reveal__stage {
    transition: transform 0.3s ease-in;
    transform: translateY(14px) scale(0.96);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes chest-land {
  0% { transform: translateY(-60px) scale(0.85); opacity: 0; }
  60% { transform: translateY(4px) scale(1.04, 0.94); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

// Two hard shakes, the way a sprite jitters: whole steps, no easing
@keyframes chest-rattle {
  0% { transform: translateX(0) rotate(0); }
  16% { transform: translateX(-3px) rotate(-2deg); }
  33% { transform: translateX(3px) rotate(2deg); }
  50% { transform: translateX(-3px) rotate(-1.5deg); }
  66% { transform: translateX(3px) rotate(1.5deg); }
  83% { transform: translateX(0) translateY(-2px); }
  100% { transform: translateX(0) rotate(0); }
}

@keyframes chest-pop {
  0% { transform: scale(1.08, 0.9); }
  55% { transform: scale(0.96, 1.06); }
  100% { transform: scale(1); }
}

@keyframes lid-fly {
  0% { transform: scaleY(1); }
  50% { transform: translateY(-6px) scaleY(0.5); }
  100% { transform: translateY(-8px) scaleY(0); }
}

@keyframes open-lid-swing {
  0% { transform: scaleY(0); }
  100% { transform: scaleY(1); }
}

@keyframes hollow-glow {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

@keyframes spark-fly {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(0) scale(0.4); }
  15% { opacity: 1; }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(var(--spark-reach)) scale(1);
  }
}

// Dust rises slower and shorter than sparks, and spreads as it goes
@keyframes dust-drift {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(0) scale(0.5); }
  20% { opacity: 0.9; }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(calc(var(--spark-reach) * 0.6)) scale(1.6);
  }
}

@keyframes orb-rise {
  0% { transform: translate(0, 12px) scale(0.1) rotate(0); }
  70% { transform: translate(var(--fan-x), calc(var(--fan-y) - 14px)) scale(1.1) rotate(var(--fan-tilt)); }
  100% { transform: translate(var(--fan-x), var(--fan-y)) scale(1) rotate(var(--fan-tilt)); }
}

@keyframes orb-bob {
  0%, 100% { transform: translate(var(--fan-x), var(--fan-y)) scale(1) rotate(var(--fan-tilt)); }
  50% { transform: translate(var(--fan-x), calc(var(--fan-y) - 8px)) scale(1) rotate(var(--fan-tilt)); }
}

@keyframes orb-collect {
  0% { transform: translate(var(--fan-x), var(--fan-y)) scale(1); opacity: 1; }
  100% { transform: translate(var(--fan-x), calc(var(--fan-y) - 140px)) scale(0.3); opacity: 0; }
}

@keyframes check-stamp {
  0% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

@keyframes check-invite {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 216, 74, 0); }
  50% { box-shadow: 0 0 0 3px rgba(255, 216, 74, 0.35); }
}

@keyframes orb-hop {
  0% { transform: translateY(0); filter: drop-shadow(0 0 2px #fff) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45)); }
  40% { transform: translateY(-14px) scale(1.12); filter: brightness(1.8) drop-shadow(0 0 6px #fff) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45)); }
  100% { transform: translateY(0); filter: drop-shadow(0 0 2px #fff) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45)); }
}

@keyframes row-in {
  to { opacity: 1; transform: translateX(0); }
}

@keyframes relic-shimmer {
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .chest-sprite,
  .chest-sprite__lid,
  .chest-sprite__open-lid,
  .chest-sprite__glow,
  .chest-reveal__rays,
  .chest-reveal__flash,
  .spark,
  .loot-orb.is-out,
  .loot-row.is-out,
  .chest-reveal__panel,
  .loot-row.tier-relic .loot-row__name,
  .chest-button--take i,
  .loot-row__check,
  .loot-orb.is-hop i {
    animation: none !important;
  }
  .is-closed .chest-reveal__panel { opacity: 1; transform: none; }
  .is-ready {
    .chest-sprite__lid { transform: scaleY(0); }
    .chest-sprite__open-lid { transform: scaleY(1); }
    .chest-sprite__glow { opacity: 0.7; }
    .chest-reveal__rays { opacity: 0.4; transform: none; }
    .chest-reveal__panel { opacity: 1; transform: none; }
  }
  .loot-orb.is-out { transform: translate(var(--fan-x), var(--fan-y)); }
  .loot-row.is-out { opacity: 1; transform: none; }
}
</style>
