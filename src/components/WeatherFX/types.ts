export type Timer = ReturnType<typeof setTimeout>;

export type WeatherType = 'tropical' | 'rainy' | 'cloudy' | 'sunny' | 'stormy' | 'snowy' | 'plains' | 'none';

export type WeatherSoundType = 'ocean' | 'rain' | 'thunder' | 'wind' | 'ambient';

export interface WeatherEffectProps {
  intensity: number;
  soundEnabled: boolean;
  soundVolume: number;
  [key: string]: any;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  active: boolean;
}

export interface BirdState {
  flying: boolean;
  landed: boolean;
  landX: string;
  landY: string;
  flightDuration: number;
  timers: Timer[];
}

export interface WeatherSound {
  src: string;
  defaultVolume: number;
  loop: boolean;
}

export const soundLibrary: Record<WeatherSoundType, WeatherSound> = {
  ocean: {
    src: '/sounds/ocean-waves.mp3',
    defaultVolume: 0.3,
    loop: true
  },
  rain: {
    src: '/sounds/rain.mp3',
    defaultVolume: 0.4,
    loop: true
  },
  thunder: {
    src: '/sounds/thunder.mp3',
    defaultVolume: 0.5,
    loop: false
  },
  wind: {
    src: '/sounds/wind.mp3',
    defaultVolume: 0.2,
    loop: true
  },
  ambient: {
    src: '/sounds/ambient.mp3',
    defaultVolume: 0.2,
    loop: true
  }
};