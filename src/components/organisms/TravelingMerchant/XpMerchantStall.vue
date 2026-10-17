<template>
  <!-- Boobeedeedle's roadside stall: the world he is visiting today, dimmed to dusk, his lantern on a post, the
       peddler under his pack and the blanket the shelf's wares stand on. Drawn once; only the glow and his bob move. -->
  <div class="xp-merchant-stall">
    <div class="xp-merchant-stall__backdrop" :style="backdropStyle" />
    <div class="xp-merchant-stall__dusk" />
    <div class="xp-merchant-stall__glow" />

    <xp-pixel-sprite class="xp-merchant-stall__post" :rows="STALL_SPRITES.post" />
    <div class="xp-merchant-stall__peddler">
      <xp-pixel-sprite :rows="STALL_SPRITES.peddler" />
    </div>
    <div class="xp-merchant-stall__blanket">
      <xp-pixel-sprite :rows="STALL_SPRITES.blanket" />
      <xp-pixel-sprite class="xp-merchant-stall__ware is-potion" :rows="STALL_SPRITES.potion" />
      <xp-pixel-sprite class="xp-merchant-stall__ware is-scroll" :rows="STALL_SPRITES.scroll" />
      <xp-pixel-sprite class="xp-merchant-stall__ware is-pouch" :rows="STALL_SPRITES.pouch" />
      <xp-pixel-sprite class="xp-merchant-stall__ware is-ring" :rows="STALL_SPRITES.ring" />
    </div>

    <!-- What he calls out to passers-by; tap it to talk, like the clerk button -->
    <transition name="xp-merchant-stall__say">
      <button
        v-if="line && !quiet"
        type="button"
        class="xp-merchant-stall__bubble"
        data-test="merchant-line"
        :aria-label="`Talk to ${shopkeeper}`"
        @click="$emit('talk')"
      >
        <span class="xp-merchant-stall__who">{{ shopkeeper }}</span>
        <span class="xp-merchant-stall__line">{{ line }}</span>
      </button>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import XpPixelSprite from "./XpPixelSprite.vue";
import { STALL_SPRITES } from "./merchantStallSprites";

interface XpMerchantStallProps {
  /** The picture of the world he stands in today, behind the stall */
  backdrop?: string;
  /** Who minds the stall */
  shopkeeper?: string;
  /** What he calls out */
  line?: string;
  /** Hide the call while he is already talking, or the stall is shut */
  quiet?: boolean;
}

const props = withDefaults(defineProps<XpMerchantStallProps>(), {
  backdrop: "",
  shopkeeper: "Boobeedeedle",
  line: "",
  quiet: false,
});

defineEmits<{ (event: "talk"): void }>();

const backdropStyle = computed(() => (props.backdrop ? { backgroundImage: `url("${props.backdrop}")` } : {}));
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

// Where the ground line sits: just behind the middle item's feet, above its name and tag and the clerk button
$ground: 190px;

.xp-merchant-stall {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: #14091f;

  // The world's own art, softened and dimmed so the stall reads in front of it (a static filter is painted once)
  &__backdrop {
    position: absolute;
    inset: -12px;
    background-size: cover;
    background-position: center;
    filter: blur(2px) brightness(0.6) saturate(0.9);
  }

  // Dusk: a violet sky up top, the road darkening toward the viewer
  &__dusk {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to bottom, rgba(32, 14, 52, 0.7) 0%, rgba(32, 14, 52, 0.25) 38%, rgba(20, 9, 31, 0) 58%),
      linear-gradient(to top, rgba(20, 9, 31, 0.75) 0%, rgba(20, 9, 31, 0) 30%);
  }

  // The lantern's pool of warm light over the stall
  &__glow {
    position: absolute;
    right: -30%;
    bottom: calc(#{$ground} - 40px);
    width: 130%;
    aspect-ratio: 1;
    background: radial-gradient(
      circle at 62% 42%,
      rgba(255, 201, 74, 0.46) 0%,
      rgba(255, 170, 60, 0.2) 30%,
      rgba(255, 150, 50, 0) 60%
    );
    animation: stall-flicker 2.8s steps(1, end) infinite;
  }

  &__post {
    position: absolute;
    right: max(4%, 10px);
    bottom: calc(#{$ground} + 30px);
    width: 60px;
  }

  &__peddler {
    position: absolute;
    left: max(1%, 4px);
    bottom: calc(#{$ground} + 26px);
    width: clamp(136px, 44vw, 190px);
    animation: stall-bob 1.6s steps(2, jump-none) infinite alternate;

    > * {
      width: 100%;
    }
  }

  &__blanket {
    position: absolute;
    left: 50%;
    bottom: calc(#{$ground} - 10px);
    width: min(104%, 440px);
    transform: translateX(-50%);

    > .xp-pixel-sprite:first-child {
      width: 100%;
    }
  }

  // A few odds and ends at the blanket's corners, around whatever the shelf shows in the middle
  &__ware {
    position: absolute;
    width: 30px;

    &.is-potion {
      left: 8%;
      bottom: 46%;
      width: 26px;
    }

    &.is-scroll {
      left: 14%;
      bottom: 18%;
    }

    &.is-pouch {
      right: 10%;
      bottom: 44%;
      width: 26px;
    }

    &.is-ring {
      right: 16%;
      bottom: 16%;
      width: 22px;
    }
  }

  &__bubble {
    all: unset;
    @include eb-box();
    position: absolute;
    left: 24px;
    right: 24px;
    // On a short screen it hangs from the top instead of running off it
    bottom: min(calc(#{$ground} + 280px), calc(100% - 118px));
    max-width: 300px;
    padding: 8px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: "Apple Kid", sans-serif;
    font-size: 1.25rem;
    line-height: 1.15;
    pointer-events: auto;
    cursor: pointer;

    &:focus-visible {
      outline: 2px dashed $eb-color-pale-yellow;
      outline-offset: 3px;
    }
  }

  &__who {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $eb-color-pale-yellow;
  }

  &__say-enter-active,
  &__say-leave-active {
    transition: opacity 0.2s ease;
  }

  &__say-enter-from,
  &__say-leave-to {
    opacity: 0;
  }
}

// He shifts his weight under the pack: two frames, a pixel apart
@keyframes stall-bob {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-3px);
  }
}

// The flame gutters now and then
@keyframes stall-flicker {
  0%,
  100% {
    opacity: 1;
  }
  31% {
    opacity: 0.86;
  }
  37% {
    opacity: 1;
  }
  72% {
    opacity: 0.92;
  }
}

// A short phone: a smaller peddler and a tighter call, so the bubble clears his hat
@media (max-height: 740px) {
  .xp-merchant-stall__peddler {
    width: clamp(108px, 30vw, 124px);
  }

  .xp-merchant-stall__bubble {
    padding: 6px 10px;
    font-size: 1.1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xp-merchant-stall__peddler,
  .xp-merchant-stall__glow {
    animation: none;
  }
}
</style>
