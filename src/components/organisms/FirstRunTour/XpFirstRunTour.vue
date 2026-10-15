<template>
  <Teleport to="body">
    <div v-if="stop" class="xp-tour" role="dialog" aria-modal="true" :aria-label="stop.title" data-cy="first-run-tour"
      @keydown.esc.prevent="finish" @keydown.enter.prevent="next">
      <!-- The ring: everything but the thing being explained goes dark around it -->
      <div class="xp-tour__ring" :key="`ring-${index}`" :style="ringStyle" aria-hidden="true"></div>

      <section ref="panel" class="xp-tour__panel" :class="panelAtTop ? 'is-top' : 'is-bottom'" tabindex="-1"
        :key="`panel-${index}`">
        <p class="xp-tour__speaker">{{ TOUR_GUIDE }}</p>
        <h2 class="xp-tour__title">{{ stop.title }}</h2>
        <p v-for="(line, n) in stop.lines" :key="n" class="xp-tour__line">{{ line }}</p>
        <div class="xp-tour__actions">
          <button type="button" class="xp-tour__skip" data-cy="tour-skip" @click="finish">Skip</button>
          <span class="xp-tour__count" aria-hidden="true">{{ index + 1 }} / {{ stops.length }}</span>
          <button type="button" class="xp-tour__next" data-cy="tour-next" @click="next">
            {{ isLast ? "Let's go!" : "Next ▶" }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import { feel } from "@/lib/services/feedback/haptics";
import {
  FIRST_RUN_TOUR,
  TOUR_GUIDE,
  hasSeenTour,
  markTourSeen,
  visibleStops,
  type TourStop,
} from "@/lib/services/tutorial/firstRunTour";

/**
 * The first-run tour of the hero's portal: a ring of light moves from the XP/GP bar to each button of the bottom nav,
 * and the guide's box says what each one is for. Once per hero on this device; Skip and Escape end it at once.
 */
const props = defineProps<{ heroId: string }>();
const emit = defineEmits<{ (e: "done"): void }>();

/** A beat for the page and its nav to settle before the first ring is measured */
const START_DELAY_MS = 900;
/** How often to look again while something else has the screen */
const RETRY_MS = 700;
const RING_PAD_PX = 6;
/** The ring stays this far inside the screen, so the bar at the very top still shows its whole outline */
const EDGE_PX = 3;
/**
 * The tour waits its turn behind anything else asking for the hero's attention: the Tap to Start card, a building's
 * prompt, an open modal.
 */
const BUSY_SELECTORS = [".xp-audio-permission-overlay", "[data-cy=reveal-prompt]", "ion-modal.show-modal", "[data-cy=hero-fanfare]"];

const stops = ref<TourStop[]>([]);
const index = ref(0);
const rect = ref<DOMRect | null>(null);
const panel = ref<HTMLElement | null>(null);
let startTimer: number | undefined;

const stop = computed<TourStop | null>(() => stops.value[index.value] ?? null);
const isLast = computed(() => index.value === stops.value.length - 1);

const targetOf = (target: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-tour="${target}"]`);

const isOnScreen = (target: string): boolean => {
  const box = targetOf(target)?.getBoundingClientRect();
  return Boolean(box && box.width > 0 && box.height > 0);
};

const measure = () => {
  rect.value = stop.value ? targetOf(stop.value.target)?.getBoundingClientRect() ?? null : null;
};

// The box sits on the side of the screen away from the ring, so it never covers what it is talking about
const panelAtTop = computed(() => {
  const box = rect.value;
  return box ? box.top + box.height / 2 > window.innerHeight / 2 : false;
});

const ringStyle = computed(() => {
  const box = rect.value;
  if (!box) return { display: "none" };
  const top = Math.max(EDGE_PX, box.top - RING_PAD_PX);
  const left = Math.max(EDGE_PX, box.left - RING_PAD_PX);
  const right = Math.min(window.innerWidth - EDGE_PX, box.right + RING_PAD_PX);
  const bottom = Math.min(window.innerHeight - EDGE_PX, box.bottom + RING_PAD_PX);
  return { top: `${top}px`, left: `${left}px`, width: `${right - left}px`, height: `${bottom - top}px` };
});

const show = async () => {
  measure();
  await nextTick();
  panel.value?.focus();
};

const finish = () => {
  if (!stop.value) return;
  play$fx("closeMenu");
  markTourSeen(props.heroId);
  stops.value = [];
  emit("done");
};

const next = () => {
  if (isLast.value) {
    feel("success");
    finish();
    return;
  }
  play$fx("cursor");
  feel("tick");
  index.value += 1;
};

watch(index, show);

const somethingElseShowing = () => BUSY_SELECTORS.some((selector) => document.querySelector(selector));

const start = () => {
  const alreadySeen = hasSeenTour(props.heroId);
  if (alreadySeen) return;
  const mustWait = somethingElseShowing();
  if (mustWait) {
    startTimer = window.setTimeout(start, RETRY_MS);
    return;
  }
  const found = visibleStops(FIRST_RUN_TOUR, isOnScreen);
  const nothingToShow = found.length === 0;
  if (nothingToShow) return;
  stops.value = found;
  index.value = 0;
  play$fx("openMenu");
  feel("tap");
  show();
};

onMounted(() => {
  startTimer = window.setTimeout(start, START_DELAY_MS);
  window.addEventListener("resize", measure);
});

onBeforeUnmount(() => {
  window.clearTimeout(startTimer);
  window.removeEventListener("resize", measure);
});

defineExpose({ start, next, finish });
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "../../../app/Console/TempleGrounds/components/templeReveal" as *;

// Above the portal, its nav and Ionic's modals, below the reveal prompt (100001)
.xp-tour {
  --reveal-glow: #{$eb-color-pale-yellow};
  --reveal-glow-soft: rgba(247, 232, 168, 0.45);
  position: fixed;
  inset: 0;
  z-index: 100000;
}

.xp-tour__ring {
  position: fixed;
  border-radius: 12px;
  // The one big shadow is the dark: it covers everything outside the ring
  box-shadow: 0 0 0 9999px rgba(10, 2, 10, 0.68), 0 0 0 3px $eb-color-pale-yellow, 0 0 18px 6px rgba(247, 232, 168, 0.6);
  transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
  pointer-events: none;

  // A second ring breathes out from the first, so the eye finds it
  &::after {
    content: "";
    position: absolute;
    inset: -3px;
    border: 3px solid $eb-color-pale-yellow;
    border-radius: 14px;
    animation: tour-ring-pulse 1.4s ease-out infinite;
  }
}

.xp-tour__panel {
  @include reveal-panel;
  position: fixed;
  left: 0;
  right: 0;
  margin: 0 auto;
  opacity: 1;
  transform: none;
  animation: tour-panel-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.15);
  outline: none;

  &.is-top {
    top: calc(72px + env(safe-area-inset-top));
  }

  &.is-bottom {
    bottom: calc(120px + env(safe-area-inset-bottom));
  }
}

.xp-tour__speaker {
  margin: 0 0 2px;
  font-family: $eb-font-status;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $eb-color-pale-yellow;
  opacity: 0.8;
}

.xp-tour__title {
  @include reveal-title;
  font-size: 1.2rem;
  text-align: left;
  margin-bottom: 6px;
}

.xp-tour__line {
  margin: 0 0 6px;
  font-size: 1rem;
  line-height: 1.4;
  color: #fff;
}

.xp-tour__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;

  button {
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    font-family: $eb-font-status;
    font-size: 1rem;
    letter-spacing: 0.05em;
    cursor: pointer;
  }
}

.xp-tour__skip {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
}

.xp-tour__next {
  background: $eb-color-pale-yellow;
  color: $eb-color-medium-purple;
  font-weight: 900;
}

.xp-tour__count {
  font-family: $eb-font-status;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

@keyframes tour-ring-pulse {
  from {
    opacity: 0.9;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(1.18);
  }
}

@keyframes tour-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xp-tour__ring,
  .xp-tour__ring::after,
  .xp-tour__panel {
    animation: none;
    transition: none;
  }
}
</style>
