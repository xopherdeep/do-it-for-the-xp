import { ref, Ref, onMounted, onUnmounted } from 'vue';
import { WeatherType, WeatherSoundType, soundLibrary } from './types';

export interface WeatherFXAPI {
  weatherType: Ref<WeatherType>;
  intensity: Ref<number>;
  soundEnabled: Ref<boolean>;
  soundVolume: Ref<number>;
  playWeatherSound: (type: WeatherSoundType, volume?: number) => void;
  stopWeatherSound: (type: WeatherSoundType) => void;
  setWeatherSoundVolume: (type: WeatherSoundType, volume: number) => void;
  updateWeather: (type: WeatherType, newIntensity: number) => void;
  toggleSound: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
}

export function useWeatherFX(): WeatherFXAPI {
  const weatherType = ref<WeatherType>('none');
  const intensity = ref(0);
  const soundEnabled = ref(true);
  const soundVolume = ref(0.5);
  const audioElements = new Map<WeatherSoundType, HTMLAudioElement>();

  const playWeatherSound = (type: WeatherSoundType, volume?: number) => {
    if (!audioElements.has(type)) {
      const sound = soundLibrary[type];
      const audio = new Audio(sound.src);
      audio.loop = sound.loop;
      audio.volume = sound.defaultVolume * (volume ?? soundVolume.value);
      audioElements.set(type, audio);
    }
    
    const audio = audioElements.get(type);
    if (audio && soundEnabled.value) {
      if (volume !== undefined) {
        audio.volume = soundLibrary[type].defaultVolume * volume;
      }
      audio.play().catch(() => {
        // Silent error handling to comply with ESLint rules
      });
    }
  };

  const stopWeatherSound = (type: WeatherSoundType) => {
    const audio = audioElements.get(type);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const setWeatherSoundVolume = (type: WeatherSoundType, volume: number) => {
    const audio = audioElements.get(type);
    if (audio && soundLibrary[type]) {
      audio.volume = volume * soundLibrary[type].defaultVolume;
    }
  };

  const updateWeather = (type: WeatherType, newIntensity: number) => {
    weatherType.value = type;
    intensity.value = newIntensity;

    // Stop all sounds first
    Array.from(audioElements.keys()).forEach(stopWeatherSound);

    // Play appropriate sounds based on weather type
    switch (type) {
      case 'tropical':
        playWeatherSound('ocean');
        playWeatherSound('ambient');
        break;
      case 'rainy':
        playWeatherSound('rain');
        if (newIntensity > 0.7) playWeatherSound('thunder');
        break;
      case 'stormy':
        playWeatherSound('wind');
        playWeatherSound('rain');
        playWeatherSound('thunder');
        break;
      case 'cloudy':
        playWeatherSound('wind');
        break;
      case 'plains':
        playWeatherSound('wind', newIntensity * 0.4);
        playWeatherSound('ambient', newIntensity * 0.2);
        break;
      case 'sunny':
        playWeatherSound('ambient');
        break;
    }
  };

  const toggleSound = (enabled: boolean) => {
    soundEnabled.value = enabled;
    if (!enabled) {
      Array.from(audioElements.keys()).forEach(stopWeatherSound);
    }
  };

  const setSoundVolume = (volume: number) => {
    soundVolume.value = Math.max(0, Math.min(1, volume));
    audioElements.forEach((audio, type) => {
      audio.volume = soundLibrary[type].defaultVolume * soundVolume.value;
    });
  };

  onMounted(() => {
    // Initialize all sound effects
    Object.keys(soundLibrary).forEach(type => {
      playWeatherSound(type as WeatherSoundType);
    });
  });

  onUnmounted(() => {
    // Cleanup all audio elements
    Array.from(audioElements.keys()).forEach(stopWeatherSound);
    audioElements.clear();
  });

  return {
    weatherType,
    intensity,
    soundEnabled,
    soundVolume,
    playWeatherSound,
    stopWeatherSound,
    setWeatherSoundVolume,
    updateWeather,
    toggleSound,
    setSoundVolume
  };
}