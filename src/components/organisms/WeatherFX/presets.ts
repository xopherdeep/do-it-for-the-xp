import type { WeatherPreset, WeatherType } from "./types";
import * as fx from "./effects";

const opt = (factory: (o?: Record<string, unknown>) => ReturnType<typeof fx.rain>, options: Record<string, unknown>) => () => factory(options);

/** Every weather type: its layers (drawn back to front) and the ambient loop it asks for. */
export const weatherPresets: Record<WeatherType, WeatherPreset> = {
  none: { layers: [], sound: null },
  sunny: { layers: [fx.sunRays, fx.sparkles], sound: null },
  tropical: { layers: [fx.sunRays, fx.sparkles, fx.birds], sound: "ocean" },
  rainy: { layers: [fx.clouds, fx.rain], sound: "rain" },
  stormy: { layers: [opt(fx.clouds, { dark: true }), opt(fx.rain, { heavy: true }), fx.lightning, fx.wind], sound: "storm" },
  snowy: { layers: [opt(fx.clouds, { thin: true }), fx.snow], sound: "wind" },
  cloudy: { layers: [fx.clouds, opt(fx.sunRays, { faint: true })], sound: "wind" },
  plains: { layers: [fx.wind, fx.heatHaze, fx.birds], sound: "wind" },
  desert: { layers: [fx.sand, fx.heatHaze, opt(fx.sunRays, { faint: true })], sound: "wind" },
  swamp: { layers: [fx.fog, fx.fireflies], sound: "night" },
  forest: { layers: [fx.leaves, fx.fireflies, opt(fx.sunRays, { faint: true })], sound: "night" },
  mountains: { layers: [opt(fx.clouds, { thin: true }), fx.wind, fx.embers, fx.birds], sound: "wind" },
  moon: { layers: [fx.stars, fx.aurora], sound: "night" },
  cave: { layers: [opt(fx.fog, { dark: true }), fx.drips], sound: "cave" },
  dungeon: { layers: [fx.embers, opt(fx.fog, { dark: true }), fx.lantern], sound: "cave" },
  urban: { layers: [fx.smog, opt(fx.stars, { faint: true })], sound: "wind" },
  // Temple rooms: the lanterns breathe and dust drifts; no sound, the dungeon music carries the mood
  temple: { layers: [fx.lantern], sound: null },
};
