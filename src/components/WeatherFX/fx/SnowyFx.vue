<template>
  <div
    class="snowy-effect"
    :class="`intensity-${intensity}`"
  >
    <!-- Snowflakes -->
    <div class="snow-container">
      <div
        v-for="i in snowflakeCount"
        :key="`snow-${i}`"
        class="snowflake"
        :style="{
          '--delay': `${Math.random() * 10}s`,
          '--duration': `${5 + Math.random() * 12}s`,
          '--left': `${Math.random() * 100}%`,
          '--size': `${1 + Math.random() * 4}px`,
          '--drift': `${Math.random() * 50 - 25}px`
        }"
      >
      </div>
    </div>

    <!-- Frost/fog overlay -->
    <div
      class="frost-overlay"
      :style="{ opacity: frostOpacity }"
    ></div>

    <!-- Wind gusts - visual effect -->
    <div
      v-for="i in 3"
      :key="`wind-gust-${i}`"
      class="wind-gust"
      :style="{
        '--delay': `${i * 7 + Math.random() * 5}s`,
        '--opacity': `${0.05 + Math.random() * 0.08}`,
        '--y-pos': `${10 + Math.random() * 70}%`
      }"
    >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue';

export default defineComponent({
  name: 'snowy-effect',
  props: {
    intensity: {
      type: Number,
      default: 5,
      validator: (value: number) => value >= 0 && value <= 10
    }
  },
  emits: ['effect-loaded'],
  setup(props, { emit }) {
    // Calculate snowflake count based on intensity
    const snowflakeCount = computed(() => {
      return Math.min(Math.max(props.intensity * 15, 30), 150);
    });

    // Calculate frost opacity
    const frostOpacity = computed(() => {
      return Math.min(props.intensity * 0.03, 0.3);
    });

    onMounted(() => {
      // Notify that the effect is loaded
      emit('effect-loaded');
    });

    return {
      snowflakeCount,
      frostOpacity
    };
  }
});
</script>

<style lang="scss">
.snowy-effect {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;

  // Snow container
  .snow-container {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 3;
  }

  // Individual snowflakes
  .snowflake {
    position: absolute;
    top: -10px;
    left: var(--left, 50%);
    width: var(--size, 3px);
    height: var(--size, 3px);
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    filter: blur(1px);
    animation: snowfall var(--duration, 10s) linear infinite;
    animation-delay: var(--delay, 0s);

    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      filter: blur(1px);
      transform: translate(calc(var(--size, 3px) * 0.3), calc(var(--size, 3px) * 0.3));
      opacity: 0.6;
    }
  }

  @keyframes snowfall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 0;
    }

    10% {
      opacity: 0.8;
    }

    45% {
      transform: translateY(45vh) translateX(var(--drift)) rotate(180deg);
    }

    75% {
      opacity: 0.8;
    }

    100% {
      transform: translateY(100vh) translateX(calc(var(--drift) * 2)) rotate(360deg);
      opacity: 0;
    }
  }

  // Frost overlay
  .frost-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: linear-gradient(to bottom,
        rgba(230, 240, 255, 0.05) 0%,
        rgba(230, 240, 255, 0.1) 40%,
        rgba(255, 255, 255, 0.15) 100%);
    z-index: 1;
    pointer-events: none;
  }

  // Wind gusts
  .wind-gust {
    position: absolute;
    height: 60px;
    width: 200%;
    left: -50%;
    top: var(--y-pos, 50%);
    background: linear-gradient(to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, var(--opacity, 0.1)) 50%,
        rgba(255, 255, 255, 0) 100%);
    opacity: 0;
    transform: translateY(-50%) rotate(-10deg);
    animation: wind-gust 20s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
    z-index: 2;
  }

  @keyframes wind-gust {

    0%,
    100% {
      opacity: 0;
      transform: translateX(-100%) translateY(-50%) rotate(-5deg);
    }

    10%,
    90% {
      opacity: 1;
    }

    50% {
      transform: translateX(100%) translateY(-50%) rotate(-5deg);
      opacity: 0.7;
    }
  }

  // Intensity modifiers
  &.intensity-1,
  &.intensity-2 {
    .snowflake {
      opacity: 0.5;
    }
  }

  &.intensity-9,
  &.intensity-10 {
    .snowflake {
      filter: blur(0.7px);
    }

    .wind-gust {
      animation-duration: 15s;
    }
  }
}
</style>