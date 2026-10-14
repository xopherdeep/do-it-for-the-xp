<template>
  <div
    class="hero-card battle-hero-card"
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
    <div class="status-box">
      <p v-if="isLoading" class="hero-loading">Loading...</p>

      <template v-else>
        <!-- The name line, like the party boxes: name left, a tiny avatar and level tucked right -->
        <div class="hero-identity">
          <span class="hero-name">{{ playerName }}</span>
          <span class="hero-level">Lv {{ level }}</span>
          <div class="hero-avatar" aria-hidden="true">
            <img v-if="showImage" :src="avatarSrc" alt="" draggable="false" @error="avatarBroken = true" />
            <span v-else class="hero-initial">{{ initial }}</span>
          </div>
        </div>

        <!-- HP: three rolling tiles. The tiles are for eyes; .hp-value is the same number for everything else. -->
        <div class="stat-row hp-row" role="group" aria-label="Hit points">
          <span class="stat-label" aria-hidden="true"><span>H</span><span>P</span></span>
          <div class="odometer hp-digits" aria-hidden="true">
            <span class="digit">{{ formattedHp.thou }}</span>
            <span class="digit">{{ formattedHp.hun }}</span>
            <span class="digit">{{ formattedHp.ten }}</span>
            <div class="hp-track">
              <div class="hp-bar" :class="hpTone" :style="{ width: barWidth(hpPercentage) }"></div>
            </div>
          </div>
          <span class="hp-value">{{ hpDisplay }}</span>
          <span class="hp-max">/ {{ hpMax }}</span>
        </div>

        <!-- MP: the same odometer -->
        <div class="stat-row mp-row" role="group" aria-label="Magic points">
          <span class="stat-label" aria-hidden="true"><span>M</span><span>P</span></span>
          <div class="odometer mp-digits" aria-hidden="true">
            <span class="digit">{{ formattedMp.thou }}</span>
            <span class="digit">{{ formattedMp.hun }}</span>
            <span class="digit">{{ formattedMp.ten }}</span>
            <div class="mp-track">
              <div class="mp-bar" :style="{ width: barWidth(mpPercentage) }"></div>
            </div>
          </div>
          <span class="mp-line">MP <span class="mp-value">{{ mpDisplay }}</span>/{{ mpMax }}</span>
        </div>

        <!-- Every Game Style but Earthbound draws HP and MP its own way from these (see the unscoped styles below).
             Drawn only: the odometer rows above keep the accessible numbers. -->
        <div class="gs-stats" :class="hpTone" aria-hidden="true">
          <div class="gs-stat gs-hp">
            <span class="gs-label"></span>
            <span class="gs-num"><b>{{ hpDisplay }}</b><i>/{{ hpMax }}</i></span>
            <span class="gs-meter"><span class="gs-fill" :style="{ width: barWidth(hpPercentage) }"></span></span>
            <span class="gs-hearts">
              <span v-for="(fill, i) in hearts" :key="i" class="gs-heart" :class="`is-${fill}`"></span>
            </span>
          </div>
          <div class="gs-stat gs-mp">
            <span class="gs-label"></span>
            <span class="gs-num"><b>{{ mpDisplay }}</b><i>/{{ mpMax }}</i></span>
            <span class="gs-meter"><span class="gs-fill" :style="{ width: barWidth(mpPercentage) }"></span></span>
          </div>
        </div>
      </template>
    </div>

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
  formattedMp,
  hpPercentage,
  mpPercentage,
} = useBattlePlayer(toRef(props, "userId"));

// --- avatar: the picture when the hero has one that loads, else the first letter on a purple disc ---
const avatarBroken = ref(false);
watch(avatarSrc, () => {
  avatarBroken.value = false;
});
const showImage = computed(() => Boolean(player.value?.avatar || player.value?.avatarImage) && !avatarBroken.value);
const initial = computed(() => (Array.from(playerName.value)[0] ?? "?").toUpperCase());

// --- bars ---
const barWidth = (percent: number) => `${Math.round(percent * 10) / 10}%`;
/** Red while healthy (the app's HP colour), amber at half, red and pulsing when nearly out. */
const hpTone = computed(() => {
  if (hpPercentage.value > 50) return "";
  return hpPercentage.value >= 25 ? "is-mid" : "is-low";
});

/** Zelda draws HP as a row of hearts: 3 to 10 of them (one per 20 max HP), each full, half or empty. */
const hearts = computed<("full" | "half" | "empty")[]>(() => {
  const count = Math.min(10, Math.max(3, Math.ceil(hpMax.value / 20)));
  const filled = (hpPercentage.value / 100) * count;
  return Array.from({ length: count }, (_, i) => {
    if (filled >= i + 1) return "full";
    return filled >= i + 0.5 ? "half" : "empty";
  });
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

// The Earthbound party status box: a lavender checkerboard card in a bone-and-ink frame,
// the name on top, HP and MP as three-digit rolling odometers.
$ink: #101010;
$bone: #f0f0f0;
$sage: #98a080;
$lavender: #9090e8;
$lavender-dark: #9080a8;

.hero-card {
  position: relative;
  width: 100%;
  max-width: 192px;
  margin: 0 auto;
  border-radius: 4px;
  background: $lavender;
  background-image:
    linear-gradient(45deg, $lavender-dark 25%, transparent 25%, transparent 75%, $lavender-dark 75%, $lavender-dark),
    linear-gradient(45deg, $lavender-dark 25%, transparent 25%, transparent 75%, $lavender-dark 75%, $lavender-dark);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
  box-shadow:
    0 0 0 2px $sage,
    0 0 0 4px $bone,
    0 0 0 6px $sage,
    0 0 0 8px $ink;
  color: $bone;
  user-select: none;
  transition: filter 0.4s ease, opacity 0.4s ease;

  &.is-hit {
    animation: card-hit-a 400ms ease-out;
  }

  &.is-hit.is-hit-b {
    animation-name: card-hit-b;
  }

  &.is-downed {
    filter: grayscale(1);
    opacity: 0.6;
  }
}

.status-box {
  padding: 4px 7px 6px;
}

.hero-loading {
  margin: 0;
  padding: 10px 0;
  font-family: "StatusPlz", monospace;
  font-size: 1.2rem;
  text-align: center;
}

.hero-identity {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  min-height: 20px;
}

.hero-name {
  flex: 1 1 auto;
  min-width: 0;
  font-family: "StatusPlz", monospace;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 1px 1px 0 $ink;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-level {
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: auto;
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  text-shadow: 1px 1px 0 $ink;
  opacity: 0.9;
}

.hero-avatar {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  overflow: hidden;
  background: $ink;
  display: grid;
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-initial {
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  color: $bone;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;

  & + & {
    margin-top: 3px;
  }
}

// Fourside gives the HP / MP captions their outlined pixel look
.stat-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 30px;
  font-family: "Fourside", "StatusPlz", monospace;
  font-size: 0.85rem;
  line-height: 0.88;
  -webkit-text-stroke: 1px $bone;
  text-shadow: 1px 1px 0 $ink;

  span {
    display: block;
    text-align: center;
  }
}

.odometer {
  position: relative;
  display: flex;
  flex: 1;
  gap: 1px;
  padding: 2px 2px 4px;
  background: $ink;
  border-radius: 2px;
}

.digit {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 4px;
  font-family: "Pixel Takhisis", "Orange Kid", "StatusPlz", monospace;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: $ink;
  background: radial-gradient(ellipse at 60% 45%, rgb(255, 255, 255) 45%, rgb(165, 165, 165) 85%);
  border: 1px solid $ink;
  border-radius: 1px;
}

// The screen-reader number and the max: present, not drawn
.hp-value,
.mp-line,
.hp-max {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

// A hairline under the tiles that drains with the number
.hp-track,
.mp-track {
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: 1px;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  overflow: hidden;
}

.hp-bar {
  height: 100%;
  background: var(--xp-color-hp);
  transition: width 0.3s ease-out;

  &.is-mid {
    background: #ffb347;
  }

  &.is-low {
    background: #ff3b3b;
    animation: hp-low-pulse 0.8s ease-in-out infinite;
  }
}

.mp-bar {
  height: 100%;
  background: var(--xp-color-mp);
  transition: width 0.3s ease-out;
}

// Shown by the other Game Styles only (src/styles/themes/battleHud.scss)
.gs-stats {
  display: none;
}

.defending-badge {
  position: absolute;
  top: -14px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: $eb-color-dark-purple;
  border: 2px solid $bone;
  color: $bone;
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  letter-spacing: 1px;
  animation: badge-pop 0.2s ease-out;
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
