<template>
  <div class="cloudy-fx" :class="`intensity-${intensity}`">
    <!-- Cloud layers -->
    <div class="clouds-container">
      <!-- Background light rays -->
      <div class="light-rays" :style="{ '--opacity': lightRayOpacity }">
        <div v-for="i in 5" :key="`ray-${i}`" class="light-ray"></div>
      </div>
      
      <!-- Multiple cloud layers -->
      <div v-for="layer in 3" :key="`layer-${layer}`"
           class="cloud-layer"
           :style="{
             '--speed': `${150 + layer * 50}s`,
             '--opacity': layerOpacity(layer),
             '--z-index': 3 - layer,
             '--delay': `${-layer * 20}s`
           }">
        <!-- Individual clouds -->
        <div v-for="i in cloudCount" :key="`cloud-${layer}-${i}`"
             class="cloud"
             :style="{
               '--delay': `${Math.random() * -20}s`,
               '--duration': `${20 + Math.random() * 10}s`,
               '--opacity': 0.4 + (Math.random() * 0.3),
               '--scale': 0.8 + (Math.random() * 0.4),
               '--top': `${Math.random() * 60}%`
             }">
          <div class="cloud-part"></div>
          <div class="cloud-part"></div>
          <div class="cloud-part"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'cloudy-fx',
  props: {
    intensity: {
      type: Number,
      default: 5,
      validator: (value: number) => value >= 0 && value <= 10
    }
  },
  emits: ['effect-loaded'],
  setup(props, { emit }) {
    // Calculate number of clouds based on intensity
    const cloudCount = computed(() => {
      return Math.min(Math.max(Math.floor(props.intensity * 1.5), 3), 12);
    });

    // Calculate light ray opacity based on intensity (inverse relationship)
    const lightRayOpacity = computed(() => {
      return Math.max(0.1, 0.4 - (props.intensity * 0.03));
    });

    // Calculate opacity for each cloud layer
    const layerOpacity = (layer: number) => {
      const baseOpacity = 0.7 - ((layer - 1) * 0.15);
      return baseOpacity * (props.intensity / 10);
    };
    
    // Notify when component is ready
    setTimeout(() => emit('effect-loaded'), 100);
    
    return {
      cloudCount,
      lightRayOpacity,
      layerOpacity
    };
  }
});
</script>

<style lang="scss">
.cloudy-fx {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  
  // Cloud container
  .clouds-container {
    position: absolute;
    width: 200%;
    height: 100%;
    left: -50%;
    z-index: 2;
  }

  // Light rays effect
  .light-rays {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: var(--opacity, 0.3);
    pointer-events: none;
    z-index: 1;
    
    .light-ray {
      position: absolute;
      width: 100px;
      height: 200%;
      background: linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0));
      transform-origin: 50% 0;
      animation: ray-rotate 20s infinite linear;
      
      @for $i from 1 through 5 {
        &:nth-child(#{$i}) {
          left: #{$i * 20}%;
          animation-delay: #{$i * -4}s;
        }
      }
    }
  }
  
  // Cloud layers
  .cloud-layer {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: var(--opacity, 0.6);
    animation: layer-drift var(--speed, 150s) linear infinite;
    animation-delay: var(--delay, 0s);
    z-index: var(--z-index, 2);
  }
  
  // Individual clouds
  .cloud {
    position: absolute;
    width: 180px;
    height: 60px;
    top: var(--top, 30%);
    opacity: var(--opacity, 0.6);
    transform: scale(var(--scale, 1));
    animation: cloud-drift var(--duration, 25s) linear infinite;
    animation-delay: var(--delay, 0s);
    
    .cloud-part {
      position: absolute;
      width: 60px;
      height: 60px;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      filter: blur(3px);
      
      &:nth-child(1) {
        left: 40px;
        top: 0;
      }
      
      &:nth-child(2) {
        left: 0;
        top: 10px;
      }
      
      &:nth-child(3) {
        left: 80px;
        top: 10px;
      }
    }
  }
  
  @keyframes cloud-drift {
    from {
      transform: translateX(-100%) scale(var(--scale, 1));
    }
    to {
      transform: translateX(200%) scale(var(--scale, 1));
    }
  }
  
  @keyframes layer-drift {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }
  
  @keyframes ray-rotate {
    from {
      transform: rotate(-30deg);
    }
    to {
      transform: rotate(30deg);
    }
  }
  
  // Intensity modifiers
  &.intensity-1, &.intensity-2 {
    .cloud {
      opacity: calc(var(--opacity, 0.6) * 0.6);
    }
    .light-rays {
      opacity: calc(var(--opacity, 0.3) * 1.4);
    }
  }
  
  &.intensity-9, &.intensity-10 {
    .cloud {
      opacity: calc(var(--opacity, 0.6) * 1.4);
      filter: blur(1px);
    }
    .light-rays {
      opacity: calc(var(--opacity, 0.3) * 0.6);
    }
  }
}
</style>