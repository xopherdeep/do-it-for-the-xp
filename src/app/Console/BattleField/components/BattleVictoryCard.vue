<template>
  <div
    v-show="visible"
    ref="root"
    class="battle-victory-card"
    :class="{ 'is-held': card.held, 'is-counting': counting }"
    data-cy="victory-card"
    role="button"
    tabindex="0"
    @click="onTap"
    @keyup.enter="onTap"
    @keyup.space="onTap"
    @keydown.space.prevent
  >
    <!-- Falling sparkles: decoration only, clipped to the card and never in the way of a tap -->
    <div class="victory-stars" aria-hidden="true">
      <span v-for="n in STAR_COUNT" :key="n" class="victory-star">✦</span>
    </div>

    <div class="victory-body">
      <div
        class="victory-title"
        :class="{ 'has-sprite': isYouWon }"
        :data-text="card.title"
      >
        <template v-if="isYouWon">
          <img
            src="@/assets/images/battle/you_won.png"
            alt=""
            class="you-won-sprite"
            draggable="false"
          />
          <span class="sr-only">{{ card.title }}</span>
        </template>
        <template v-else>
          {{ card.title }}
        </template>
      </div>
      <div v-if="card.levelUp" class="victory-levelup">LEVEL UP! Lv {{ card.levelUp.from }} → {{ card.levelUp.to }}</div>
      <div class="victory-subtitle">{{ card.subtitle }}</div>
      <div v-if="card.questName" class="victory-quest">Quest tamed: {{ card.questName }}</div>
      <div v-if="workLine" class="victory-work">{{ workLine }}</div>

      <div class="reward-tiles">
        <div
          v-for="tile in tiles"
          :key="tile.stat"
          class="reward-tile"
          :class="{ 'is-held': card.held, 'is-zero': tile.target === 0 }"
          :data-stat="tile.stat"
        >
          <span class="reward-label">{{ tile.label }}</span>
          <i :class="[tile.icon, 'reward-icon']" aria-hidden="true"></i>
          <span
            class="reward-value"
            :class="{ 'is-long': tile.long, 'is-landed': tile.landed }"
            :data-stat="tile.stat"
          >{{ tile.shown }}</span>
          <i v-if="card.held" class="fad fa-lock reward-lock" aria-hidden="true"></i>
        </div>
      </div>

      <div v-if="bonusLine" class="victory-bonus" data-test="hunt-bonus">{{ bonusLine }}</div>
      <div v-if="card.held" class="victory-held">Waiting for the Game Master</div>
      <div class="victory-footer">Tap to continue ▼</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { VictoryCardState } from "../battle/battleView";

/**
 * The victory card: the loot counts up in three tiles (XP, GP, AP), one after another, under a rain of sparkles.
 * Purely presentational. The page decides when it shows (`visible`), what it says (`card`) and what a tap means once
 * the numbers have landed (`continue`); a tap while they still roll finishes them first. It plays no sound itself: the
 * page does, from `rolling` (the count started or ended) and `land` (a number reached its exact value).
 */
const props = defineProps<{
  visible: boolean;
  card: VictoryCardState;
}>();

const isYouWon = computed(() => {
  const title = props.card?.title?.trim().toUpperCase();
  return title === "YOU WON!" || title === "YOU WON !" || title === "YOU WON" || title === "VICTORY!";
});

type Stat = "xp" | "gp" | "ap";

const emit = defineEmits<{
  (e: "continue"): void;
  /** True once when the numbers start counting, false once when they are done (landed, or finished by a tap). */
  (e: "rolling", on: boolean): void;
  /** A number reached its exact value. A tap that finishes the count early sends one `land`, not one per tile. */
  (e: "land", stat: Stat): void;
}>();

interface VictoryTile {
  stat: Stat;
  label: string;
  icon: string;
  delay: number;
}

/** A tile starts rolling `delay` ms after the card appears, so the three numbers land one after another. */
const TILES: readonly VictoryTile[] = [
  { stat: "xp", label: "XP", icon: "fad fa-star", delay: 0 },
  { stat: "gp", label: "GP", icon: "fad fa-coins", delay: 250 },
  { stat: "ap", label: "AP", icon: "fad fa-bolt", delay: 500 },
];
/** Each tile rolls through a fixed chain of 30 timeouts, 30 ms apart; the last one writes the exact target. */
const COUNT_STEPS = 30;
const COUNT_STEP_MS = 30;
/** Matches the nth-child rules in the stylesheet. */
const STAR_COUNT = 12;

const root = ref<HTMLElement | null>(null);
const shown = reactive<Record<Stat, number>>({ xp: 0, gp: 0, ap: 0 });
const landed = reactive<Record<Stat, boolean>>({ xp: false, gp: false, ap: false });
const timers = new Map<Stat, ReturnType<typeof setTimeout>>();

/** What a tile counts up to. Read at every step, so a card that changes mid-count still ends on the right number. */
const targetOf = (stat: Stat): number => {
  const value = Number(props.card.rewards?.[stat]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

/** Fast first, slow last: the number races up and settles. */
const easeOut = (progress: number): number => 1 - Math.pow(1 - progress, 3);

/** "Hunt bonus +30 XP": what winning the fight added to the XP tile; a held quest is paid it once approved. */
const bonusLine = computed(() => {
  const bonus = Math.round(Number(props.card.huntBonusXp));
  if (!(bonus > 0)) return "";
  return props.card.held ? `Hunt bonus +${bonus} XP once approved` : `Hunt bonus +${bonus} XP`;
});

const tiles = computed(() =>
  TILES.map(({ stat, label, icon }) => {
    const target = targetOf(stat);
    return {
      stat,
      label,
      icon,
      target,
      shown: shown[stat],
      landed: landed[stat] && target > 0,
      long: String(target).length >= 5,
    };
  }),
);

/** True while any tile still shows less than it is going to. A tile that has reached its number never blocks a tap. */
const counting = computed(() => TILES.some(({ stat }) => shown[stat] !== targetOf(stat)));

/** "2 chores in 2:05", "1 chore in 0:07"; nothing for a card that was not a fight. */
const workLine = computed(() => {
  if (props.card.choresDone === undefined) return "";
  const chores = Math.max(0, Math.floor(Number(props.card.choresDone) || 0));
  const seconds = Math.max(0, Math.floor((Number(props.card.elapsedMs) || 0) / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return `${chores} ${chores === 1 ? "chore" : "chores"} in ${clock}`;
});

const clearTimers = () => {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
};

/** Only a tile with loot to count makes the page's roll sound; an empty tile (no AP, say) rolls in silence. */
const hasLoot = (stat: Stat): boolean => targetOf(stat) > 0;

let isRolling = false;
/** Tells the page when the counting starts and stops, however it stops: landed, tapped, hidden or unmounted. */
const syncRolling = () => {
  const shouldRoll = TILES.some(({ stat }) => timers.has(stat) && hasLoot(stat));
  if (shouldRoll === isRolling) return;
  isRolling = shouldRoll;
  emit("rolling", shouldRoll);
};

const land = (stat: Stat) => {
  shown[stat] = targetOf(stat);
  landed[stat] = true;
};

const rollTile = (stat: Stat, step: number) => {
  timers.set(
    stat,
    setTimeout(() => {
      if (step >= COUNT_STEPS) {
        timers.delete(stat);
        land(stat);
        if (hasLoot(stat)) emit("land", stat);
        syncRolling();
        return;
      }
      shown[stat] = Math.round(targetOf(stat) * easeOut(step / COUNT_STEPS));
      rollTile(stat, step + 1);
    }, COUNT_STEP_MS),
  );
};

/** Every number lands right now: written, the chains cancelled, the page told the roll is over. */
const landAll = () => {
  clearTimers();
  TILES.forEach(({ stat }) => land(stat));
  syncRolling();
};

/** The first tap while the tiles are still rolling: everything lands, with one chime for the tiles it finished. */
const completeAll = () => {
  const unlanded = TILES.find(({ stat }) => !landed[stat] && hasLoot(stat));
  landAll();
  if (unlanded) emit("land", unlanded.stat);
};

/** Back to zero, then (when the card is showing) roll the three tiles one after another. */
const start = () => {
  clearTimers();
  syncRolling();
  TILES.forEach(({ stat }) => {
    shown[stat] = 0;
    landed[stat] = false;
  });
  if (!props.visible) return;
  TILES.forEach(({ stat, delay }) => {
    timers.set(
      stat,
      setTimeout(() => {
        rollTile(stat, 1);
        syncRolling();
      }, delay),
    );
  });
};

/** Keyboard players can press Enter straight away. */
const focusCard = () => {
  nextTick(() => root.value?.focus({ preventScroll: true }));
};

const onTap = () => {
  if (!props.visible) return;
  if (counting.value) {
    completeAll();
    return;
  }
  // The digits can all show a beat before the last tile lands: the tap ends that tail quietly, so the roll stops too.
  landAll();
  emit("continue");
};

watch(
  () => props.visible,
  () => {
    start();
    if (props.visible) focusCard();
  },
  { immediate: true },
);

// New loot while the card is up (a late-arriving card): roll it again instead of showing stale numbers.
watch(
  () => TILES.map(({ stat }) => targetOf(stat)).join("/"),
  () => {
    if (props.visible) start();
  },
);

onBeforeUnmount(() => {
  clearTimers();
  syncRolling();
});
</script>

<style lang="scss" scoped>
@use "sass:list";
@use "@/styles/themes/earthbound.scss" as *;

$vc-gold: #ffd84a;
$vc-amber: #ffb347;
$vc-ink: #4a2a00;

// Twelve sparkles, one per nth-child. Positions step by the golden ratio, so sparkles that fall one after another
// are far apart on the card; sizes, drift, spin and colour alternate the same way.
$vc-star-count: 12;
$vc-star-left: 8, 70, 32, 93, 55, 17, 79, 41, 5, 64, 26, 88;
$vc-star-size: 1.1, 0.8, 1.4, 0.7, 1, 1.25, 0.75, 1.15, 0.9, 1.35, 0.8, 1;
$vc-star-drift: -14, 10, -8, 16, -12, 8, -16, 12, -6, 14, -10, 6;
$vc-star-spin: 180, -240, 120, -180, 270, -120, 210, -150, 90, -210, 160, -90;
$vc-star-colors: #f7e8a8, #ffffff, $eb-color-sky-blue, $eb-color-mint-green, $vc-gold, #ffb3d1;

// ---------------------------------------------------------------------------------------------------------------
// The card. Just the box: the page centres it. No overflow:hidden here, the box's rings reach 16px outside it, and
// that is also why it keeps a 20px margin. Nothing on this element animates: the page's enter/leave transition
// owns its transform and opacity.
// ---------------------------------------------------------------------------------------------------------------
.battle-victory-card {
  @include eb-box();
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: calc(100% - 40px);
  max-width: 360px;
  margin: 20px auto;
  padding: 16px 14px 12px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  // A soft glow behind the title; the box colour itself comes from the mixin.
  background-image: radial-gradient(ellipse 80% 55% at 50% 0%, rgba(247, 232, 168, 0.18), transparent);

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 3px dashed $eb-color-pale-yellow;
    outline-offset: -8px;
  }
}

.victory-body {
  position: relative;
  z-index: 1;
}

// ---------------------------------------------------------------------------------------------------------------
// Falling sparkles: transform and opacity only, clipped to the card, never catch a tap.
// ---------------------------------------------------------------------------------------------------------------
.victory-stars {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.victory-star {
  position: absolute;
  top: 0;
  left: 50%;
  color: var(--star-color, #{$eb-color-pale-yellow});
  font-family: "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif;
  line-height: 1;
  text-shadow: 0 0 6px currentColor;
  // Invisible unless the animation runs, so reduced motion leaves no stray sparkles behind.
  opacity: 0;
  will-change: transform, opacity;
  animation: victory-star-fall 2.5s linear infinite;
}

@for $i from 1 through $vc-star-count {
  .victory-star:nth-child(#{$i}) {
    --star-color: #{list.nth($vc-star-colors, ($i - 1) % list.length($vc-star-colors) + 1)};
    --drift: #{list.nth($vc-star-drift, $i) * 1px};
    --spin: #{list.nth($vc-star-spin, $i) * 1deg};
    // Numbers times a unit, never "#{...}%": Sass would print "8 %" and the browser would drop the declaration.
    left: list.nth($vc-star-left, $i) * 1%;
    font-size: list.nth($vc-star-size, $i) * 1rem;
    // Negative delays (a twelfth of the loop apart): the sky is already full when the card appears.
    animation-delay: ($i - 0.5) * -0.208s;
  }
}

@keyframes victory-star-fall {
  0% {
    opacity: 0;
    transform: translate3d(0, -24px, 0) rotate(0deg) scale(0.6);
  }
  12% {
    opacity: 1;
  }
  45% {
    transform: translate3d(calc(var(--drift, 0px) * 0.5), 190px, 0) rotate(calc(var(--spin, 0deg) * 0.5)) scale(1.2);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--drift, 0px), 440px, 0) rotate(var(--spin, 0deg)) scale(0.9);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Headline: pale yellow gradient letters that pop in; a brighter copy of the title fades in and out on top of them
// (opacity only) for the slow shimmer. Gradient text takes no text-shadow, so the depth comes from drop-shadow.
// ---------------------------------------------------------------------------------------------------------------
.victory-title {
  position: relative;
  margin: 0 0 6px;
  font-family: "Pixel Takhisis", "Year Is 199X", "Apple Kid", sans-serif;
  font-size: 2.4rem;
  line-height: 1.15;
  letter-spacing: 0.06em;
  text-align: center;
  text-wrap: balance;
  color: $eb-color-pale-yellow;
  background-image: linear-gradient(180deg, #fffdf0 0%, $eb-color-pale-yellow 50%, #f0be4a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 0 $vc-ink) drop-shadow(0 0 8px rgba(247, 232, 168, 0.35));
  animation: victory-title-pop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;

  &.has-sprite {
    background-image: none;
    -webkit-text-fill-color: initial;
    filter: none;

    &::after {
      display: none !important;
    }
  }

  &::after {
    content: attr(data-text);
    // Empty alt text keeps screen readers from reading the title twice, where supported.
    content: attr(data-text) / "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-image: linear-gradient(180deg, #ffffff 0%, #fff6c4 50%, #ffe27a 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0;
    pointer-events: none;
    animation: victory-title-shimmer 2.8s ease-in-out 0.8s infinite;
  }
}

.you-won-sprite {
  display: block;
  margin: 4px auto 8px;
  width: 276px;
  height: 32px;
  max-width: 90%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 2px 0 #101010) drop-shadow(0 0 14px rgba(112, 80, 248, 0.85));
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes victory-title-pop {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  60% {
    opacity: 1;
    transform: scale(1.14);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes victory-title-shimmer {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Level-up ribbon
// ---------------------------------------------------------------------------------------------------------------
.victory-levelup {
  position: relative;
  display: table;
  max-width: 100%;
  box-sizing: border-box;
  margin: 4px auto 6px;
  padding: 4px 14px 2px;
  font-family: "Onett", "Apple Kid", sans-serif;
  font-size: 1.2rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: $vc-gold;
  text-shadow: 0 2px 0 $vc-ink, 0 0 8px rgba(255, 216, 74, 0.55);
  background-color: rgba(255, 216, 74, 0.14);
  border: 2px solid $vc-gold;
  border-radius: 2px;
  animation: victory-ribbon-pop 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) 0.4s backwards;

  // A gold ring that pings outwards, over and over.
  &::before {
    content: "";
    position: absolute;
    top: -3px;
    right: -3px;
    bottom: -3px;
    left: -3px;
    border: 2px solid $vc-gold;
    border-radius: 3px;
    opacity: 0;
    pointer-events: none;
    animation: victory-ribbon-ping 1.8s ease-out 1s infinite;
  }
}

@keyframes victory-ribbon-pop {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-6deg);
  }
  70% {
    opacity: 1;
    transform: scale(1.12) rotate(1.5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes victory-ribbon-ping {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.12, 1.6);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The lines under the title
// ---------------------------------------------------------------------------------------------------------------
.victory-subtitle {
  margin-top: 2px;
  font-family: "StatusPlz", monospace;
  font-size: 1.15rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  color: $eb-color-cream;
}

.victory-quest {
  margin-top: 4px;
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.15rem;
  line-height: 1.25;
  color: $eb-color-pale-yellow;
}

.victory-work {
  margin-top: 6px;
  padding-bottom: 10px;
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.15rem;
  line-height: 1.2;
  color: $eb-color-cream;
  border-bottom: 2px dotted rgba(231, 230, 179, 0.28);
}

// ---------------------------------------------------------------------------------------------------------------
// Reward tiles: label, icon, big number. The colour comes from the stat; the tint is a faint copy of it behind.
// ---------------------------------------------------------------------------------------------------------------
.reward-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-gap: 8px;
  gap: 8px;
  margin-top: 12px;
}

.reward-tile {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px 4px 8px;
  color: var(--tile-color);
  border: 2px solid var(--tile-color);
  border-radius: 3px;
  // Each tile pops in as its own count starts (0 / 250 / 500 ms, like the timers).
  animation: victory-tile-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) backwards;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    background-color: currentColor;
    opacity: 0.14;
  }

  &[data-stat="xp"] {
    --tile-color: var(--xp-color-xp, #1fa627);
  }

  &[data-stat="gp"] {
    --tile-color: var(--xp-color-gp, #de9a00);
    animation-delay: 0.25s;
  }

  &[data-stat="ap"] {
    --tile-color: var(--xp-color-ap, #87ceeb);
    animation-delay: 0.5s;
  }

  // Locked until the Game Master approves.
  &.is-held {
    opacity: 0.6;
  }

  // Nothing earned here (a free fight pays AP only): there still is a tile, but a quiet one.
  &.is-zero {
    opacity: 0.4;
  }
}

.reward-label {
  font-family: "StatusPlz", "Apple Kid", sans-serif;
  font-size: 0.85rem;
  line-height: 1;
  letter-spacing: 0.08em;
  color: $eb-color-cream;
}

.reward-icon {
  margin-top: 4px;
  font-size: 1.3rem;
  line-height: 1;
  --fa-primary-color: var(--tile-color);
  --fa-secondary-color: var(--tile-color);
  --fa-secondary-opacity: 0.45;
}

.reward-value {
  display: block;
  margin-top: 2px;
  font-family: "Orange Kid", "Apple Kid", monospace;
  font-size: 2rem;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--tile-color);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);

  // Five digits or more would crowd the tile.
  &.is-long {
    font-size: 1.5rem;
  }

  // The number just landed: one quick bump.
  &.is-landed {
    animation: victory-value-land 0.4s ease-out;
  }
}

.reward-lock {
  position: absolute;
  top: 4px;
  right: 5px;
  font-size: 0.75rem;
  line-height: 1;
  --fa-primary-color: #{$eb-color-cream};
  --fa-secondary-color: #{$eb-color-cream};
}

// No end frame: the tile settles into its own opacity (100 / 60 / 40 %) and no transform.
@keyframes victory-tile-pop {
  0% {
    opacity: 0;
    transform: translateY(14px) scale(0.7);
  }
  65% {
    transform: translateY(-3px) scale(1.06);
  }
}

@keyframes victory-value-land {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.22);
  }
  100% {
    transform: scale(1);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Held ribbon and footer
// ---------------------------------------------------------------------------------------------------------------
.victory-held {
  display: table;
  max-width: 100%;
  box-sizing: border-box;
  margin: 12px auto 0;
  padding: 4px 12px 3px;
  font-family: "StatusPlz", monospace;
  font-size: 0.95rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: $vc-amber;
  background-color: rgba(255, 179, 71, 0.1);
  border: 2px dashed rgba(255, 179, 71, 0.7);
  animation: victory-held-pulse 2s ease-in-out infinite;
}

@keyframes victory-held-pulse {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}

.victory-bonus {
  margin: 10px 0 0;
  font-family: "StatusPlz", monospace;
  font-size: 0.95rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: $eb-color-pale-yellow;
}

.victory-footer {
  margin-top: 12px;
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.15rem;
  line-height: 1.2;
  letter-spacing: 0.03em;
  color: $eb-color-pale-yellow;
  transition: opacity 0.3s;
  animation: victory-footer-bounce 1s ease-in-out infinite;
}

// Still counting: the prompt is there but not shouting yet.
.battle-victory-card.is-counting .victory-footer {
  opacity: 0.55;
}

@keyframes victory-footer-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Short phones (360x640): the same card, tighter
// ---------------------------------------------------------------------------------------------------------------
@media (max-height: 700px) {
  .battle-victory-card {
    padding: 12px 12px 10px;
  }

  .victory-work {
    margin-top: 4px;
    padding-bottom: 6px;
  }

  .reward-tiles {
    margin-top: 8px;
  }

  .reward-tile {
    padding-top: 5px;
    padding-bottom: 5px;
  }

  .victory-held,
  .victory-footer {
    margin-top: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .victory-star,
  .victory-title,
  .victory-title::after,
  .victory-levelup,
  .victory-levelup::before,
  .victory-held,
  .victory-footer,
  .reward-tile,
  .reward-value.is-landed {
    animation: none;
  }
}
</style>
