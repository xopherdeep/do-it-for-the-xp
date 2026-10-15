import type { EffectFactory } from "../types";
import { countFor, makeRng } from "./util";

/** Rising orange sparks that wobble and fade. */
export const embers: EffectFactory = () => {
  const rng = makeRng(131);
  let x = new Float32Array(0), y = new Float32Array(0), life = new Float32Array(0), k = new Float32Array(0);
  let count = 0;
  return {
    init(f) {
      count = countFor(f, 15, 60);
      x = new Float32Array(count); y = new Float32Array(count); life = new Float32Array(count); k = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = f.height * (0.5 + rng() * 0.5); life[i] = rng(); k[i] = rng(); }
    },
    update(f) {
      for (let i = 0; i < count; i++) {
        y[i] -= (25 + k[i] * 35) * f.dt; x[i] += Math.sin(f.time * 2.5 + k[i] * 9) * 14 * f.dt; life[i] -= f.dt * (0.18 + k[i] * 0.2);
        const shouldRespawn = life[i] <= 0 || y[i] < -5;
        if (shouldRespawn) { life[i] = 1; x[i] = rng() * f.width; y[i] = f.height + 4; }
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < count; i++) {
        const a = Math.max(0, life[i]);
        ctx.fillStyle = `rgba(255,${120 + Math.round(a * 90)},40,${a * 0.9})`;
        ctx.beginPath(); ctx.arc(x[i], y[i], 1 + k[i] * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };
};
