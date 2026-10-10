export type WeatherType =
  | "none" | "sunny" | "tropical" | "rainy" | "stormy" | "snowy" | "cloudy" | "plains"
  | "desert" | "swamp" | "forest" | "mountains" | "moon" | "cave" | "dungeon" | "urban" | "temple";

export type WeatherSoundType = "rain" | "storm" | "wind" | "ocean" | "night" | "cave";

export interface EffectFrame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels */
  width: number;
  height: number;
  dpr: number;
  /** 0-10 */
  intensity: number;
  /** seconds since the effect started */
  time: number;
  /** seconds since the last frame, clamped to 0.05 */
  dt: number;
  /** 0.25-1: particle multiplier the engine lowers on slow devices */
  budget: number;
  reducedMotion: boolean;
}

export interface WeatherEffect {
  /** Called once with the first frame and again after a resize. Allocate particles here. */
  init(frame: EffectFrame): void;
  /** Advance state; may be skipped on dropped frames. */
  update(frame: EffectFrame): void;
  /** Draw this layer; the engine clears the canvas before the first layer. */
  draw(frame: EffectFrame): void;
  dispose?(): void;
}

export type EffectFactory = (options?: Record<string, unknown>) => WeatherEffect;

export interface WeatherPreset {
  layers: EffectFactory[];
  sound: WeatherSoundType | null;
}

/** Kept for the old API surface of WeatherFX.vue. */
export interface WeatherEffectProps {
  intensity: number;
  soundEnabled: boolean;
  soundVolume: number;
  [key: string]: unknown;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  active: boolean;
}
