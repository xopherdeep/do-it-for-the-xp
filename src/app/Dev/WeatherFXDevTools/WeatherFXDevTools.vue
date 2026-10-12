<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Weather FX Dev Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="dev-container">
        <div class="preview-area" :class="sceneType">
          <div class="weather-preview">
            <weather-fx
              ref="weatherRef"
              :type="selectedWeatherType"
              :active="weatherActive"
              :intensity="intensity"
              :sound-enabled="soundEnabled"
              :sound-volume="soundVolume"
              @effect-loaded="onEffectLoaded"
              @effect-changed="onEffectChanged"
            />
          </div>
          <div class="weather-stats" data-test="weather-stats">
            <span>{{ fps }} FPS</span>
            <span>budget {{ budgetLabel }}</span>
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
            <ion-range v-model="intensity" :min="0" :max="10" :step="1" :pin="true"></ion-range>
          </ion-item>

          <ion-item>
            <ion-label>Scene Backdrop</ion-label>
            <ion-select v-model="sceneType" interface="popover">
              <ion-select-option v-for="scene in sceneTypes" :key="scene" :value="scene">
                {{ scene.charAt(0).toUpperCase() + scene.slice(1) }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Weather Active</ion-label>
            <ion-toggle v-model="weatherActive"></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Sound</ion-label>
            <ion-toggle v-model="soundEnabled"></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Sound Volume: {{ soundVolume.toFixed(2) }}</ion-label>
            <ion-range v-model="soundVolume" :min="0" :max="1" :step="0.05" :pin="true"></ion-range>
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
          <ion-button expand="block" color="danger" @click="stress">Stress (stormy, 10)</ion-button>
          <ion-button expand="block" color="secondary" @click="resetWeather">Reset</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
         IonButton, IonList, IonItem, IonLabel, IonToggle,
         IonRange, IonButtons, IonSelect,
         IonSelectOption, IonCard, IonCardHeader,
         IonCardTitle, IonCardContent, IonText } from '@ionic/vue';
import WeatherFX from '@/components/organisms/WeatherFX/WeatherFX.vue';
import type { WeatherType } from '@/components/organisms/WeatherFX/types';

const WEATHER_TYPES: WeatherType[] = [
  'none', 'sunny', 'tropical', 'rainy', 'stormy', 'snowy', 'cloudy', 'plains',
  'desert', 'swamp', 'forest', 'mountains', 'moon', 'cave', 'dungeon', 'urban'
];

const SCENE_TYPES = ['plains', 'beach', 'forest', 'mountain', 'desert', 'night', 'cave'];

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
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    'weather-fx': WeatherFX
  },
  setup() {
    const selectedWeatherType = ref<WeatherType>('tropical');
    const weatherTypes = WEATHER_TYPES;
    const sceneTypes = SCENE_TYPES;
    const weatherActive = ref(true);
    const intensity = ref(5);
    const soundEnabled = ref(false);
    const soundVolume = ref(0.5);
    const sceneType = ref('plains');
    const effectStatus = ref('');
    const weatherRef = ref<{ engine?: unknown } | null>(null);

    // Live FPS (the engine's own measurement, page rAF as the fallback) and the engine's budget.
    const fps = ref(0);
    const budget = ref<number | null>(null);
    let frames = 0;
    let lastSample = 0;
    let rafHandle: number | null = null;

    type EngineStats = { budget: number; fps: number } | null;
    const readStats = (): EngineStats => {
      const engine = weatherRef.value?.engine as { stats?: () => EngineStats } | undefined;
      return engine?.stats ? engine.stats() : null;
    };

    const tick = (now: number) => {
      frames += 1;
      if (now - lastSample >= 500) {
        const stats = readStats();
        fps.value = stats && stats.fps > 0 ? Math.round(stats.fps) : Math.round((frames * 1000) / (now - lastSample));
        budget.value = stats ? stats.budget : null;
        frames = 0;
        lastSample = now;
      }
      rafHandle = requestAnimationFrame(tick);
    };

    const budgetLabel = computed(() => (budget.value === null ? 'n/a' : budget.value.toFixed(2)));

    const debugInfo = computed(() => ({
      type: selectedWeatherType.value,
      active: weatherActive.value,
      intensity: intensity.value,
      soundEnabled: soundEnabled.value,
      soundVolume: soundVolume.value,
      scene: sceneType.value,
      fps: fps.value,
      budget: budget.value
    }));

    let statusTimer: ReturnType<typeof setTimeout> | null = null;
    const flash = (message: string, ms = 3000) => {
      effectStatus.value = message;
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        effectStatus.value = '';
      }, ms);
    };

    const onEffectLoaded = () => flash(`${selectedWeatherType.value} effect running`);
    const onEffectChanged = (event: { type: string; active: boolean }) =>
      flash(`Weather: ${event.type}, active: ${event.active}`);

    const stress = () => {
      selectedWeatherType.value = 'stormy';
      intensity.value = 10;
      weatherActive.value = true;
      flash('Stress test: stormy at intensity 10', 4000);
    };

    const resetWeather = () => {
      selectedWeatherType.value = 'none';
      intensity.value = 0;
      soundEnabled.value = false;
      flash('Weather reset', 2000);
    };

    onMounted(() => {
      if (typeof requestAnimationFrame === 'function') {
        lastSample = performance.now();
        rafHandle = requestAnimationFrame(tick);
      }
    });

    onUnmounted(() => {
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      if (statusTimer) clearTimeout(statusTimer);
    });

    return {
      weatherRef,
      selectedWeatherType,
      weatherTypes,
      sceneTypes,
      weatherActive,
      intensity,
      soundEnabled,
      soundVolume,
      sceneType,
      effectStatus,
      fps,
      budgetLabel,
      debugInfo,
      onEffectLoaded,
      onEffectChanged,
      stress,
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

    &.night {
      background-color: #14172e;
    }

    &.cave {
      background-color: #2b2530;
    }
    
    .weather-preview {
      height: 100%;
      width: 100%;
      position: relative;
      background-color: transparent; // Make it transparent to show the parent background
      z-index: 1;
    }
    
    .weather-stats {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 8px;
      background-color: rgba(0, 0, 0, 0.55);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      z-index: 2;
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