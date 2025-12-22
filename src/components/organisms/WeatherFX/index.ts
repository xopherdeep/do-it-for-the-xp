export { default as WeatherFX } from './WeatherFX.vue';
export { default as TropicalFx } from './fx/TropicalFx.vue';
export { default as RainyFx } from './fx/RainyFx.vue';
export { default as CloudyFx } from './fx/CloudyFx.vue';
export { default as PlainsFx } from './fx/PlainsFx.vue';
export { useWeatherFX } from './useWeatherFX';
export * from './types';

export type WeatherType = 'tropical' | 'rainy' | 'snowy' | 'cloudy' | 'sunny' | 'stormy' | 'none';

export interface WeatherEffectProps {
  intensity?: number;
  soundEnabled?: boolean;
  soundVolume?: number;
  customEffectProps?: Record<string, any>;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  active: boolean;
}