<template>
  <div class="weather-fx" :class="[type, { active }]">
    <component 
      v-if="active"
      :is="currentEffect" 
      v-bind="effectProps"
      @effect-loaded="onEffectLoaded"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onUnmounted } from 'vue';
import type { WeatherType, WeatherEffectProps, WeatherSoundType } from './types';
import TropicalFx from './fx/TropicalFx.vue';
import RainyFx from './fx/RainyFx.vue';
import CloudyFx from './fx/CloudyFx.vue';
import PlainsFx from './fx/PlainsFx.vue';
import { useWeatherFX } from './useWeatherFX';

type WeatherMapType = {
  [K in WeatherType]: {
    component: typeof TropicalFx | typeof RainyFx | typeof CloudyFx | typeof PlainsFx | null;
    sound: WeatherSoundType | null;
  };
};

export default defineComponent({
  name: 'weather-fx',
  components: {
    TropicalFx,
    RainyFx,
    CloudyFx,
    PlainsFx
  },
  props: {
    type: {
      type: String as () => WeatherType,
      default: 'tropical'
    },
    active: {
      type: Boolean,
      default: true
    },
    intensity: {
      type: Number,
      default: 5,
      validator: (value: number) => value >= 0 && value <= 10
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    soundVolume: {
      type: Number,
      default: 0.3,
      validator: (value: number) => value >= 0 && value <= 1
    },
    customEffectProps: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['effect-loaded', 'effect-changed', 'sound-loaded'],
  setup(props, { emit }) {
    const { 
      playWeatherSound, 
      stopWeatherSound,
      setWeatherSoundVolume
    } = useWeatherFX();
    
    const isLoaded = ref(false);
    const currentWeatherSound = ref<WeatherSoundType | null>(null);

    const weatherTypeMap: WeatherMapType = {
      tropical: {
        component: TropicalFx,
        sound: 'ocean'
      },
      rainy: {
        component: RainyFx,
        sound: 'rain'
      },
      cloudy: {
        component: CloudyFx,
        sound: null
      },
      sunny: {
        component: null,
        sound: 'ambient'
      },
      stormy: {
        component: RainyFx,
        sound: 'thunder'
      },
      snowy: {
        component: null,
        sound: null
      },
      plains: {
        component: PlainsFx,
        sound: 'wind'
      },
      none: {
        component: null,
        sound: null
      }
    };

    const currentEffect = computed(() => {
      return weatherTypeMap[props.type]?.component || null;
    });

    const effectProps = computed(() => {
      const baseProps: WeatherEffectProps = {
        intensity: props.intensity,
        soundEnabled: props.soundEnabled,
        soundVolume: props.soundVolume
      };

      if (props.type === 'stormy') {
        return {
          ...baseProps,
          intensity: Math.min(props.intensity + 2, 10),
          ...props.customEffectProps
        };
      }

      return {
        ...baseProps,
        ...props.customEffectProps
      };
    });

    watch(
      () => [props.type, props.active, props.soundEnabled, props.soundVolume] as const, 
      ([newType, newActive, newSoundEnabled, newVolume]) => {
        if (currentWeatherSound.value) {
          stopWeatherSound(currentWeatherSound.value);
          currentWeatherSound.value = null;
        }
        
        if (newActive && newSoundEnabled) {
          const soundType = weatherTypeMap[newType as WeatherType].sound;
          if (soundType) {
            currentWeatherSound.value = soundType;
            playWeatherSound(soundType, newVolume);
          }
        }
        
        emit('effect-changed', { type: newType, active: newActive });
      },
      { immediate: true }
    );

    watch(() => props.soundVolume, (newVolume) => {
      if (currentWeatherSound.value && props.soundEnabled) {
        setWeatherSoundVolume(currentWeatherSound.value, newVolume);
      }
    });

    const onEffectLoaded = () => {
      isLoaded.value = true;
      emit('effect-loaded');
    };

    onUnmounted(() => {
      if (currentWeatherSound.value) {
        stopWeatherSound(currentWeatherSound.value);
      }
    });

    return {
      currentEffect,
      effectProps,
      onEffectLoaded
    };
  }
});
</script>

<style lang="scss">
.weather-fx {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;

  &:not(.active) {
    display: none;
  }
}
</style>