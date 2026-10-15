import type { EffectFactory } from "../types";
import { countFor, makeRng, pulse } from "./util";

/** Twinkling points with a scale pulse, for water and sun. */
export const sparkles: EffectFactory = () => {
  const rng = makeRng(53);
  let x = new Float32Array(0), y = new Float32Array(0), ph = new Float32Array(0), sp = new Float32Array(0);
  let count = 0;
  return {
    init(f) {
      count = countFor(f, 20, 60);
      x = new Float32Array(count); y = new Float32Array(count); ph = new Float32Array(count); sp = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = f.height * (0.45 + rng() * 0.5); ph[i] = rng() * 6.28; sp[i] = 1.5 + rng() * 2; }
    },
    update() { /* positions are fixed; the twinkle comes from time */ },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,255,230,1)";
      for (let i = 0; i < count; i++) {
        const p = f.reducedMotion ? 0.5 : pulse(f.time, sp[i], ph[i]);
        const r = 0.5 + p * 2.2;
        ctx.globalAlpha = 0.15 + p * 0.7;
        ctx.beginPath();
        ctx.moveTo(x[i] - r * 2, y[i]); ctx.lineTo(x[i], y[i] - r * 0.6); ctx.lineTo(x[i] + r * 2, y[i]); ctx.lineTo(x[i], y[i] + r * 0.6);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
  };
};
