<template>
  <div class="plains-fx" :style="containerStyle">
    <div 
      v-for="(cloud, index) in clouds" 
      :key="`cloud-${index}`"
      class="cloud"
      :style="getCloudStyle(cloud)"
    ></div>
    
    <div 
      v-for="(grass, index) in grasses" 
      :key="`grass-${index}`"
      class="grass"
      :style="getGrassStyle(grass)"
    ></div>
    
    <div 
      v-if="showHeatWaves && intensity > 0.6" 
      class="heat-waves"
      :style="{ opacity: Math.min(1, intensity * 1.2) }"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue';
import type { PropType } from 'vue';
import type { WeatherEffectProps } from '../types';

interface CloudState {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface GrassState {
  x: number;
  y: number;
  height: number;
  width: number;
  angle: number;
  speed: number;
  baseAngle: number;
}

export default defineComponent({
  name: 'plains-fx',
  props: {
    intensity: {
      type: Number,
      default: 0.5,
      validator: (value: number) => value >= 0 && value <= 1
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    soundVolume: {
      type: Number,
      default: 0.5
    },
    windDirection: {
      type: String,
      default: 'horizontal'
    },
    particleDensity: {
      type: Number,
      default: 1
    },
    showHeatWaves: {
      type: Boolean,
      default: false
    }
  },
  emits: ['effect-loaded'],
  setup(props, { emit }) {
    // Calculate the number of clouds based on intensity and density
    const cloudCount = computed(() => {
      return Math.floor((props.intensity * 10) * props.particleDensity);
    });
    
    // Calculate grass count (more static than clouds)
    const grassCount = 20;
    
    // States
    const clouds = ref<CloudState[]>([]);
    const grasses = ref<GrassState[]>([]);
    const animationFrameId = ref<number | null>(null);
    
    // Container style based on intensity
    const containerStyle = computed(() => {
      return {
        '--sky-color': getSkyColor(props.intensity),
        '--wind-factor': props.intensity
      };
    });
    
    // Generate cloud style based on its state
    const getCloudStyle = (cloud: CloudState) => {
      return {
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        width: `${cloud.size}px`,
        height: `${cloud.size * 0.6}px`,
        opacity: cloud.opacity,
        transform: `translateX(${cloud.x}px)`,
        transition: `transform ${10 / cloud.speed}s linear`
      };
    };
    
    // Generate grass style based on its state
    const getGrassStyle = (grass: GrassState) => {
      const windEffect = Math.sin(Date.now() / 1000 * grass.speed) * 10 * props.intensity;
      const currentAngle = grass.baseAngle + windEffect;
      
      return {
        left: `${grass.x}%`,
        bottom: `0`,
        height: `${grass.height}px`,
        width: `${grass.width}px`,
        transform: `rotate(${currentAngle}deg)`,
        transformOrigin: 'bottom center'
      };
    };
    
    // Get sky color based on intensity
    const getSkyColor = (intensity: number) => {
      // Start with a light blue color
      const baseColor = [135, 206, 235]; // Light sky blue
      
      // Adjust based on intensity - higher intensity makes it more yellow/orange
      // Lower intensity makes it more blue/gray
      const r = Math.min(255, baseColor[0] + (intensity * 40));
      const g = Math.min(255, baseColor[1] + (intensity * 10));
      const b = Math.max(100, baseColor[2] - (intensity * 50));
      
      return `rgb(${r}, ${g}, ${b})`;
    };
    
    // Initialize the clouds
    const initClouds = () => {
      const newClouds: CloudState[] = [];
      
      for (let i = 0; i < cloudCount.value; i++) {
        newClouds.push({
          x: Math.random() * 100, // Position X (%)
          y: Math.random() * 25 + 5, // Position Y (%, mostly in upper part)
          size: Math.random() * 80 + 40, // Size between 40px and 120px
          speed: Math.random() * 2 + 0.5, // Speed factor
          opacity: Math.random() * 0.5 + 0.2 // Opacity between 0.2 and 0.7
        });
      }
      
      clouds.value = newClouds;
    };
    
    // Initialize the grass
    const initGrass = () => {
      const newGrasses: GrassState[] = [];
      
      for (let i = 0; i < grassCount; i++) {
        newGrasses.push({
          x: Math.random() * 100, // Position X (%)
          y: 0, // Position Y is always at bottom
          height: Math.random() * 20 + 10, // Height between 10px and 30px
          width: Math.random() * 3 + 1, // Width between 1px and 4px
          angle: 0, // Current angle
          speed: Math.random() * 2 + 0.5, // Speed of wind effect
          baseAngle: Math.random() * 10 - 5 // Base angle between -5 and 5 degrees
        });
      }
      
      grasses.value = newGrasses;
    };
    
    // Animate the clouds
    const animateClouds = () => {
      clouds.value = clouds.value.map(cloud => {
        // Move the cloud based on its speed and wind direction
        let x = cloud.x;
        
        if (props.windDirection === 'horizontal') {
          x += cloud.speed * props.intensity * 0.05;
          
          // Reset if the cloud goes off-screen
          if (x > 120) {
            x = -20;
            cloud.y = Math.random() * 25 + 5;
            cloud.size = Math.random() * 80 + 40;
            cloud.opacity = Math.random() * 0.5 + 0.2;
          }
        }
        
        return { ...cloud, x };
      });
    };
    
    // Animation loop
    const animate = () => {
      animateClouds();
      animationFrameId.value = requestAnimationFrame(animate);
    };
    
    // Initialize on mount
    onMounted(() => {
      initClouds();
      initGrass();
      animate();
      emit('effect-loaded');
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      if (animationFrameId.value !== null) {
        cancelAnimationFrame(animationFrameId.value);
      }
    });
    
    return {
      clouds,
      grasses,
      containerStyle,
      getCloudStyle,
      getGrassStyle
    };
  }
});
</script>

<style lang="scss" scoped>
.plains-fx {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background-color: var(--sky-color, #87CEEB);
  pointer-events: none;
  overflow: hidden;
  
  .cloud {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 
      10px 10px 15px rgba(255, 255, 255, 0.3),
      -10px 10px 15px rgba(255, 255, 255, 0.3),
      10px -10px 15px rgba(255, 255, 255, 0.3);
    filter: blur(5px);
    transition: transform 0.5s linear;
  }
  
  .grass {
    position: absolute;
    background-color: #5a9e3b;
    transform-origin: bottom center;
    transition: transform 0.1s ease-out;
    border-radius: 2px 2px 0 0;
  }
  
  .heat-waves {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      rgba(255, 255, 255, 0.1) 1px,
      transparent 2px,
      transparent 4px
    );
    animation: heat-wave-animation 2s infinite alternate;
    pointer-events: none;
  }
}

@keyframes heat-wave-animation {
  0% {
    transform: scaleY(1);
    opacity: 0.3;
  }
  100% {
    transform: scaleY(1.02);
    opacity: 0.6;
  }
}
</style>