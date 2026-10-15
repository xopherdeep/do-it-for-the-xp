import type { EffectFactory } from "../types";
import { makeRng, softBlob } from "./util";

/** One fog blob: position, size, drift speed and breathing phase */
interface FogBlob {
  x: number;
  y: number;
  s: number;
  v: number;
  ph: number;
}

/** Three drifting fog blobs with soft alpha that breathe; `dark` for caves and dungeons. */
export const fog: EffectFactory = (options = {}) => {
  const dark = Boolean(options.dark);
  const rng = makeRng(97);
  let blob: HTMLCanvasElement | null = null;
  const items: FogBlob[] = [];
  return {
    init(f) {
      blob = dark ? softBlob(256, 40, 36, 60, 1) : softBlob(256, 220, 230, 235, 1);
      items.length = 0;
      for (let i = 0; i < 3 + Math.round(f.intensity / 4); i++) {
        items.push({ x: rng() * f.width, y: f.height * (0.45 + rng() * 0.5), s: f.width * (0.7 + rng() * 0.6), v: 4 + rng() * 8, ph: rng() * 6.28 });
      }
    },
    update(f) {
      for (const g of items) {
        g.x += g.v * f.dt * (f.reducedMotion ? 0.3 : 1);
        if (g.x - g.s / 2 > f.width) g.x = -g.s / 2;
      }
    },
    draw(f) {
      if (!blob) return;
      const { ctx } = f;
      ctx.save();
      for (const g of items) {
        const breathe = f.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(f.time * 0.3 + g.ph);
        ctx.globalAlpha = (dark ? 0.35 : 0.22) + breathe * 0.15 + f.intensity * 0.01;
        ctx.drawImage(blob, g.x - g.s / 2, g.y - g.s / 4, g.s, g.s / 2);
      }
      ctx.restore();
    },
  };
};
