<template>
  <div
    class="hero-card"
    :class="{
      'is-hit': isHit,
      'is-hit-b': isHit && hitFlip,
      'is-downed': downed,
      'is-defending': defending,
      'is-loading': isLoading,
    }"
    data-cy="hero-card"
    role="group"
    aria-label="Hero status"
  >
    <p v-if="isLoading" class="hero-loading">Loading...</p>

    <template v-else>
      <!-- Row 1: who -->
      <div class="hero-row hero-identity">
        <div class="hero-avatar" aria-hidden="true">
          <img v-if="showImage" :src="avatarSrc" alt="" draggable="false" @error="avatarBroken = true" />
          <span v-else class="hero-initial">{{ initial }}</span>
        </div>
        <span class="hero-name">{{ playerName }}</span>
        <span class="hero-level">Lv {{ level }}</span>
      </div>

      <!-- Row 2: HP, an odometer over a bar. The tiles are for eyes; .hp-value is the same number for everything else. -->
      <div class="hero-row hp-row" role="group" aria-label="Hit points">
        <span class="stat-label" aria-hidden="true">HP</span>
        <div class="hp-stack">
          <div class="hp-digits" aria-hidden="true">
            <span class="digit">{{ formattedHp.thou }}</span>
            <span class="digit">{{ formattedHp.hun }}</span>
            <span class="digit">{{ formattedHp.ten }}</span>
          </div>
          <div class="hp-track" aria-hidden="true">
            <div class="hp-bar" :class="hpTone" :style="{ width: barWidth(hpPercentage) }"></div>
          </div>
        </div>
        <span class="hp-max">/ {{ hpMax }}</span>
        <span class="hp-value">{{ hpDisplay }}</span>
      </div>

      <!-- Row 3: MP, small -->
      <div class="mp-line">
        <span class="mp-text">MP <span class="mp-value">{{ mpDisplay }}</span>/{{ mpMax }}</span>
        <div class="mp-track" aria-hidden="true">
          <div class="mp-bar" :style="{ width: barWidth(mpPercentage) }"></div>
        </div>
      </div>
    </template>

    <span v-if="defending && !isLoading" class="defending-badge" data-cy="defending-badge">
      <svg class="badge-icon" viewBox="0 0 12 14" width="12" height="14" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M6 0 12 2v5c0 3.4-2.6 5.8-6 7C2.6 12.8 0 10.4 0 7V2z" />
      </svg>
      DEFENDING
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useBattlePlayer } from "../hooks/useBattlePlayer";

/** How long one hit shakes the card. The `card-hit` keyframes below run for the same 400 ms. */
const HIT_SHAKE_MS = 400;

const props = withDefaults(
  defineProps<{
    /** Whose card this is: the id of a hero in the user store. */
    userId: string;
    /** Every increment is one hit on the hero: the card shakes for 400 ms. */
    hitSignal?: number;
    /** The hero has fallen: the card goes gray. */
    downed?: boolean;
    /** The hero is braced for the next strike: the DEFENDING badge shows. */
    defending?: boolean;
  }>(),
  { hitSignal: 0, downed: false, defending: false }
);

const {
  player,
  isLoading,
  playerName,
  level,
  avatarSrc,
  hpDisplay,
  hpMax,
  mpDisplay,
  mpMax,
  formattedHp,
  hpPercentage,
  mpPercentage,
} = useBattlePlayer(toRef(props, "userId"));

// --- avatar: the picture when the hero has one that loads, else the first letter on a purple disc ---
const avatarBroken = ref(false);
watch(avatarSrc, () => {
  avatarBroken.value = false;
});
const showImage = computed(() => Boolean(player.value?.avatar) && !avatarBroken.value);
const initial = computed(() => (Array.from(playerName.value)[0] ?? "?").toUpperCase());

// --- bars ---
const barWidth = (percent: number) => `${Math.round(percent * 10) / 10}%`;
/** Red while healthy (the app's HP colour), amber at half, red and pulsing when nearly out. */
const hpTone = computed(() => {
  if (hpPercentage.value > 50) return "";
  return hpPercentage.value >= 25 ? "is-mid" : "is-low";
});

// --- hit: each increment of hitSignal shakes the card once ---
const isHit = ref(false);
/** Flips on every hit. Two identical keyframes take turns, so a hit mid-shake swaps the animation and it starts over. */
const hitFlip = ref(false);
let hitTimer: number | undefined;

watch(
  () => props.hitSignal,
  (now, before) => {
    if (now <= before) return;
    hitFlip.value = !hitFlip.value;
    isHit.value = true;
    window.clearTimeout(hitTimer);
    hitTimer = window.setTimeout(() => {
      isHit.value = false;
    }, HIT_SHAKE_MS);
  }
);

onBeforeUnmount(() => window.clearTimeout(hitTimer));
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

$ink: #101010;

.hero-card {
  @include eb-box();
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  // The box's rings reach 16 px outside it and the arena clips at the screen edge: keep 20 px of air.
  width: calc(100% - 40px);
  max-width: 420px;
  margin: 4px auto 20px;
  padding: 8px 12px;
  user-select: none;
  -webkit-user-select: none;
  transition: filter 0.6s ease, opacity 0.6s ease;

  &.is-hit {
    animation: card-hit-a 400ms ease-in-out;

    &.is-hit-b {
      animation-name: card-hit-b;
    }

    .digit {
      color: #b3001b;
    }
  }

  &.is-downed {
    filter: grayscale(1);
    opacity: 0.6;
  }

  &.is-loading {
    min-height: 120px;
    justify-content: center;
  }
}

.hero-loading {
  margin: 0;
  text-align: center;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.2rem;
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

// --- row 1 ---
.hero-avatar {
  flex: none;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border: 2px solid $eb-color-pale-yellow;
  border-radius: 50%;
  background: #6b3fa0;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-initial {
  font-family: "Apple Kid", sans-serif;
  font-size: 1.3rem;
  line-height: 1;
  color: #fff;
}

.hero-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.35rem;
  line-height: 1.1;
  color: $eb-color-cream;
}

.hero-level {
  flex: none;
  padding: 4px 10px;
  border: 2px solid $eb-color-pale-yellow;
  border-radius: 999px;
  font-family: "StatusPlz", sans-serif;
  font-size: 1rem;
  line-height: 1;
  white-space: nowrap;
  color: $eb-color-pale-yellow;
}

// --- row 2 ---
.stat-label {
  flex: none;
  width: 34px;
  font-family: "Fourside", sans-serif;
  font-size: 1.5rem;
  line-height: 1;
  color: $eb-color-cream;
}

.hp-stack {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hp-digits {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: $ink;
}

// Today's tile look: black digit on a white-to-gray radial gradient.
.digit {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 38px;
  padding: 0 4px;
  border: 3px solid #000;
  background: radial-gradient(ellipse at 60% 45%, rgb(255, 255, 255) 45%, rgb(155, 155, 155) 80%);
  font-family: "Orange Kid", sans-serif;
  font-size: 34px;
  line-height: 1;
  color: #000;
  transition: color 0.15s ease;
}

.hp-max {
  font-family: "StatusPlz", sans-serif;
  font-size: 1rem;
  opacity: 0.8;
}

// The same number as the tiles, for screen readers and tests; it takes no room.
.hp-value {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.hp-track,
.mp-track {
  overflow: hidden;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: inset 0 0 0 1px rgba($eb-color-cream, 0.35);
}

.hp-track {
  height: 6px;
}

.hp-bar {
  height: 100%;
  background: var(--xp-color-hp);
  transition: width 0.12s linear;

  &.is-mid {
    background: #ffb347;
  }

  &.is-low {
    animation: hp-low-pulse 0.7s ease-in-out infinite;
  }
}

// --- row 3 ---
.mp-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.9rem;
  line-height: 16px;
}

.mp-text {
  flex: none;
}

.mp-track {
  flex: 1 1 auto;
  min-width: 40px;
  height: 4px;
}

.mp-bar {
  height: 100%;
  background: var(--xp-color-mp);
  transition: width 0.12s linear;
}

// --- defending: a tab hanging on the top edge of the box ---
.defending-badge {
  position: absolute;
  top: -14px;
  right: 14px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px 2px 8px;
  border: 2px solid $eb-color-sky-blue;
  border-radius: 999px;
  background: $eb-color-dark-purple;
  box-shadow: 0 0 10px rgba($eb-color-sky-blue, 0.8);
  font-family: "StatusPlz", sans-serif;
  font-size: 0.8rem;
  letter-spacing: 1px;
  line-height: 1.2;
  color: $eb-color-pale-yellow;
  animation: badge-pop 250ms ease-out;
}

@mixin shake {
  0%,
  100% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-7px);
  }
  30% {
    transform: translateX(7px);
  }
  45% {
    transform: translateX(-5px);
  }
  60% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-2px);
  }
  90% {
    transform: translateX(2px);
  }
}

// The same shake twice: see hitFlip.
@keyframes card-hit-a {
  @include shake;
}

@keyframes card-hit-b {
  @include shake;
}

@keyframes hp-low-pulse {
  0%,
  100% {
    filter: brightness(1);
    opacity: 1;
  }
  50% {
    filter: brightness(1.8);
    opacity: 0.75;
  }
}

@keyframes badge-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-card.is-hit,
  .hero-card.is-hit.is-hit-b,
  .hp-bar.is-low,
  .defending-badge {
    animation: none;
  }

  .hp-bar,
  .mp-bar {
    transition: none;
  }
}
</style>
