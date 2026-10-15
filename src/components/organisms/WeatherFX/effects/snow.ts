import type { EffectFactory, WeatherEffect } from "../types";
import { countFor, makeRng } from "./util";

/** Round flakes in three depths with a sine drift, slow and soft. */
export const snow: EffectFactory = () => {
  const rng = makeRng(31);
  let x = new Float32Array(0), y = new Float32Array(0), d = new Float32Array(0), ph = new Float32Array(0);
  let count = 0;
  const effect: WeatherEffect = {
    init(f) {
      count = countFor(f, 40, 260);
      x = new Float32Array(count); y = new Float32Array(count); d = new Float32Array(count); ph = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = rng() * f.height; d[i] = rng(); ph[i] = rng() * 6.28; }
    },
    update(f) {
      const fall = (22 + f.intensity * 7) * f.dt;
      for (let i = 0; i < count; i++) {
        y[i] += fall * (0.4 + d[i]);
        x[i] += Math.sin(f.time * (0.6 + d[i]) + ph[i]) * 18 * f.dt + 6 * f.dt;
        const isPastBottom = y[i] > f.height + 4;
        if (isPastBottom) { y[i] = -4; x[i] = rng() * f.width; }
        const isPastRightEdge = x[i] > f.width + 4;
        if (isPastRightEdge) x[i] = -4;
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      for (let i = 0; i < count; i++) {
        const r = 0.8 + d[i] * 2.4;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + d[i] * 0.55})`;
        ctx.beginPath();
        ctx.arc(x[i], y[i], r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
  return effect;
};
