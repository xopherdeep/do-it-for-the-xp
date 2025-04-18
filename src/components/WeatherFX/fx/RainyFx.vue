<template>
  <div class="rainy-fx" :class="`intensity-${intensity}`">
    <!-- Rain droplets -->
    <div class="rain-container">
      <div v-for="i in rainDensity" :key="`rain-${i}`" 
           class="raindrop"
           :style="{
             '--delay': `${Math.random() * 4}s`,
             '--duration': `${0.6 + Math.random() * 1}s`,
             '--left': `${Math.random() * 100}%`,
             '--opacity': 0.5 + (Math.random() * 0.3)
           }">
      </div>
    </div>
    
    <!-- Ripples on water surface -->
    <div class="ripples-container">
      <div v-for="i in rippleDensity" :key="`ripple-${i}`"
           class="ripple"
           :style="{
             '--delay': `${Math.random() * 10}s`,
             '--duration': `${2 + Math.random() * 2}s`,
             '--left': `${Math.random() * 100}%`,
             '--top': `${50 + Math.random() * 40}%`,
             '--size': `${5 + Math.random() * 15}px`
           }">
      </div>
    </div>
    
    <!-- Fog/mist overlay -->
    <div class="mist-overlay" :style="{ opacity: mistOpacity }"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'rainy-fx',
  props: {
    intensity: {
      type: Number,
      default: 5,
      validator: (value: number) => value >= 0 && value <= 10
    }
  },
  emits: ['effect-loaded'],
  setup(props, { emit }) {
    // Calculate rain density based on intensity
    const rainDensity = computed(() => {
      return Math.min(Math.max(props.intensity * 12, 20), 120);
    });
    
    // Calculate ripple density
    const rippleDensity = computed(() => {
      return Math.min(Math.max(props.intensity * 3, 5), 30);
    });
    
    // Calculate mist opacity based on intensity
    const mistOpacity = computed(() => {
      return Math.min(props.intensity * 0.03, 0.3);
    });
    
    // Notify when component is ready
    setTimeout(() => {
      emit('effect-loaded');
    }, 100);
    
    return {
      rainDensity,
      rippleDensity,
      mistOpacity
    };
  }
});
</script>

<style lang="scss">
.rainy-fx {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  
  // Rain container
  .rain-container {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 3;
  }
  
  // Individual raindrops
  .raindrop {
    position: absolute;
    top: -20px;
    left: var(--left, 50%);
    height: 20px;
    width: 1px;
    background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,var(--opacity, 0.7)) 100%);
    animation: raindrop-fall var(--duration, 0.7s) linear infinite;
    animation-delay: var(--delay, 0s);
  }
  
  @keyframes raindrop-fall {
    0% {
      transform: translateY(0) rotate(0);
      opacity: 0;
    }
    15% {
      opacity: var(--opacity, 0.5);
    }
    90% {
      opacity: var(--opacity, 0.5);
    }
    100% {
      transform: translateY(100vh) rotate(20deg);
      opacity: 0;
    }
  }
  
  // Ripples on water
  .ripples-container {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 2;
    opacity: 0.7;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    left: var(--left, 50%);
    top: var(--top, 70%);
    width: var(--size, 10px);
    height: var(--size, 10px);
    border: 1px solid rgba(255,255,255,0.7);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-expand var(--duration, 2s) ease-out infinite;
    animation-delay: var(--delay, 0s);
  }
  
  @keyframes ripple-expand {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0.8;
      border-width: 1px;
    }
    100% {
      transform: translate(-50%, -50%) scale(4);
      opacity: 0;
      border-width: 0.1px;
    }
  }
  
  // Mist overlay
  .mist-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: linear-gradient(to bottom, 
                              rgba(255,255,255,0.05) 0%,
                              rgba(200,200,220,0.2) 40%, 
                              rgba(200,200,220,0.25) 100%);
    z-index: 1;
    pointer-events: none;
  }
  
  // Intensity modifiers
  &.intensity-1, &.intensity-2 {
    .raindrop {
      opacity: 0.3;
    }
    
    .ripple {
      opacity: 0.3;
    }
  }
  
  &.intensity-9, &.intensity-10 {
    .raindrop {
      width: 1.5px;
    }
  }
}
</style>