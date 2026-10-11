import type { EffectFactory, WeatherEffect } from "../types";
import { makeRng, softBlob } from "./util";

const resolveBaseCloudAlpha = (thin: boolean, dark: boolean): number => {
  if (thin) return 0.12;
  if (dark) return 0.45;
  return 0.28;
};

/** Soft cloud shapes in three parallax speeds; `dark` for storms, `thin` for high wisps. */
export const clouds: EffectFactory = (options = {}) => {
  const dark = Boolean(options.dark), thin = Boolean(options.thin);
  const rng = makeRng(41);
  let blob: HTMLCanvasElement | null = null;
  const items: { x: number; y: number; s: number; v: number; a: number }[] = [];
  const effect: WeatherEffect = {
    init(f) {
      const tone = dark ? [70, 74, 92] : [255, 255, 255];
      blob = softBlob(256, tone[0], tone[1], tone[2], 1);
      items.length = 0;
      const baseAlpha = resolveBaseCloudAlpha(thin, dark);
      const n = Math.round((thin ? 4 : 6) * Math.max(0.5, f.budget));
      for (let i = 0; i < n; i++) {
        const layer = i % 3;
        items.push({
          x: rng() * f.width,
          y: rng() * f.height * (thin ? 0.35 : 0.5),
          s: (thin ? 160 : 220) + rng() * 180 + layer * 60,
          v: (4 + layer * 5) * (1 + f.intensity / 12),
          a: baseAlpha + rng() * 0.1,
        });
      }
    },
    update(f) {
      for (const c of items) {
        c.x += c.v * f.dt;
        if (c.x - c.s > f.width) { c.x = -c.s; c.y = rng() * f.height * 0.5; }
      }
    },
    draw(f) {
      if (!blob) return;
      const { ctx } = f;
      ctx.save();
      for (const c of items) {
        ctx.globalAlpha = c.a;
        ctx.drawImage(blob, c.x - c.s / 2, c.y - c.s / 3, c.s, c.s * 0.6);
        ctx.drawImage(blob, c.x - c.s / 4, c.y - c.s / 2.4, c.s * 0.7, c.s * 0.55);
      }
      ctx.restore();
    },
  };
  return effect;
};
