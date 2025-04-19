<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="'/dev'"></ion-back-button>
        </ion-buttons>
        <ion-title>Weather FX Dev Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="dev-container">
        <div class="preview-area" :class="sceneType">
          <div class="weather-preview">
            <weather-fx 
              :type="selectedWeatherType"
              :active="weatherActive"
              :intensity="intensity"
              :sound-enabled="soundEnabled"
              :sound-volume="soundVolume"
              :custom-effect-props="customEffectProps"
              @effect-loaded="onEffectLoaded"
              @effect-changed="onEffectChanged"
            />
          </div>
          <div class="weather-info">
            <ion-text color="medium">
              <p v-if="effectStatus">{{ effectStatus }}</p>
            </ion-text>
          </div>
        </div>

        <ion-list class="controls-section">
          <ion-item>
            <ion-label>Weather Type</ion-label>
            <ion-select v-model="selectedWeatherType" interface="popover">
              <ion-select-option v-for="type in weatherTypes" :key="type" :value="type">
                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Intensity: {{ intensity }}</ion-label>
            <ion-range v-model="intensity" min="0" max="10" step="1" :pin="true"></ion-range>
          </ion-item>

          <ion-item>
            <ion-label>Scene Type</ion-label>
            <ion-select v-model="sceneType" interface="popover">
              <ion-select-option value="plains">Plains</ion-select-option>
              <ion-select-option value="beach">Beach</ion-select-option>
              <ion-select-option value="forest">Forest</ion-select-option>
              <ion-select-option value="mountain">Mountain</ion-select-option>
              <ion-select-option value="desert">Desert</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Weather Active</ion-label>
            <ion-toggle v-model="weatherActive"></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Sound Enabled</ion-label>
            <ion-toggle v-model="soundEnabled"></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Sound Volume: {{ soundVolume.toFixed(2) }}</ion-label>
            <ion-range v-model="soundVolume" min="0" max="1" step="0.05" :pin="true"></ion-range>
          </ion-item>
        </ion-list>

        <div class="debug-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>Debug Information</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <pre>{{ debugInfo }}</pre>
            </ion-card-content>
          </ion-card>
        </div>

        <div class="actions-section">
          <ion-button expand="block" @click="applyWeather">Apply Weather</ion-button>
          <ion-button expand="block" color="secondary" @click="resetWeather">Reset</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
         IonButton, IonList, IonItem, IonLabel, IonToggle, 
         IonRange, IonButtons, IonBackButton, IonSelect, 
         IonSelectOption, IonCard, IonCardHeader, 
         IonCardTitle, IonCardContent, IonText } from '@ionic/vue';
import WeatherFX from '@/components/WeatherFX/WeatherFX.vue';
import { useWeatherFX } from '@/components/WeatherFX';
import { WeatherType } from '@/components/WeatherFX/types';

export default defineComponent({
  name: 'weather-fx-dev-tools',
  components: {
    IonPage, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButton, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonToggle,
    IonRange, 
    IonButtons, 
    IonBackButton, 
    IonSelect, 
    IonSelectOption, 
    IonCard, 
    IonCardHeader,
    IonCardTitle, 
    IonCardContent,
    IonText,
    'weather-fx': WeatherFX // Register the component with kebab-case name to match template usage
  },
  setup() {
    // Weather parameters
    const selectedWeatherType = ref<WeatherType>('tropical');
    const weatherTypes = ['tropical', 'rainy', 'cloudy', 'sunny', 'stormy', 'snowy', 'plains', 'none'] as WeatherType[];
    const weatherActive = ref(true);
    const intensity = ref(5);
    const soundEnabled = ref(true);
    const soundVolume = ref(0.5);
    const sceneType = ref('plains');
    const customEffectProps = ref({});
    const effectStatus = ref('');
    
    // Weather FX API
    const { weatherType, updateWeather, toggleSound, setSoundVolume } = useWeatherFX();
    
    // Debug information
    const debugInfo = computed(() => {
      return {
        type: selectedWeatherType.value,
        active: weatherActive.value,
        intensity: intensity.value,
        soundEnabled: soundEnabled.value,
        soundVolume: soundVolume.value,
        sceneType: sceneType.value,
        customProps: customEffectProps.value,
        apiState: {
          weatherType: weatherType.value
        }
      };
    });
    
    // Event handlers
    const onEffectLoaded = () => {
      effectStatus.value = `${selectedWeatherType.value} effect loaded successfully`;
      setTimeout(() => {
        effectStatus.value = '';
      }, 3000);
    };
    
    const onEffectChanged = (event: any) => {
      effectStatus.value = `Weather effect changed: ${event.type}, active: ${event.active}`;
      setTimeout(() => {
        effectStatus.value = '';
      }, 3000);
    };
    
    const applyWeather = () => {
      updateWeather(selectedWeatherType.value, intensity.value / 10); // Convert 0-10 to 0-1 range
      toggleSound(soundEnabled.value);
      setSoundVolume(soundVolume.value);
      
      // Update scene-specific customEffectProps if needed
      switch (sceneType.value) {
        case 'plains':
          customEffectProps.value = { windDirection: 'horizontal', particleDensity: intensity.value / 5 };
          break;
        case 'beach':
          customEffectProps.value = { waves: true, sandParticles: intensity.value > 5 };
          break;
        case 'forest':
          customEffectProps.value = { leaves: true, leafDensity: intensity.value / 3 };
          break;
        case 'mountain':
          customEffectProps.value = { altitude: 'high', fogDensity: intensity.value / 10 };
          break;
        case 'desert':
          customEffectProps.value = { heat: true, mirageEffect: intensity.value > 7 };
          break;
        default:
          customEffectProps.value = {};
      }
      
      effectStatus.value = 'Weather updated';
      setTimeout(() => {
        effectStatus.value = '';
      }, 2000);
    };
    
    const resetWeather = () => {
      selectedWeatherType.value = 'none';
      intensity.value = 0;
      soundEnabled.value = false;
      updateWeather('none', 0);
      toggleSound(false);
      
      effectStatus.value = 'Weather reset';
      setTimeout(() => {
        effectStatus.value = '';
      }, 2000);
    };
    
    // Apply initial weather effects
    onMounted(() => {
      applyWeather();
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      resetWeather();
    });
    
    // Watch for changes and auto-apply
    watch([selectedWeatherType, intensity, soundEnabled, soundVolume], () => {
      // Uncomment to automatically apply changes as they happen
      // applyWeather();
    });
    
    return {
      selectedWeatherType,
      weatherTypes,
      weatherActive,
      intensity,
      soundEnabled,
      soundVolume,
      sceneType,
      customEffectProps,
      effectStatus,
      debugInfo,
      onEffectLoaded,
      onEffectChanged,
      applyWeather,
      resetWeather
    };
  }
});
</script>

<style lang="scss" scoped>
.dev-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .preview-area {
    height: 300px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    &.plains {
      background-color: #91c788;
    }
    
    &.beach {
      background-color: #f2d184;
    }
    
    &.forest {
      background-color: #2d6a4f;
    }
    
    &.mountain {
      background-color: #6c757d;
    }
    
    &.desert {
      background-color: #e9c46a;
    }
    
    .weather-preview {
      height: 100%;
      width: 100%;
      position: relative;
      background-color: transparent; // Make it transparent to show the parent background
      z-index: 1;
    }
    
    .weather-info {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-align: center;
      z-index: 2;
    }
  }
  
  .controls-section {
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .debug-section {
    pre {
      white-space: pre-wrap;
      font-size: 12px;
      margin: 0;
    }
  }
  
  .actions-section {
    display: flex;
    gap: 16px;
    
    ion-button {
      margin: 0;
    }
  }
}
</style>