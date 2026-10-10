import type { EffectFactory, WeatherEffect } from "../types";
import { countFor, makeRng } from "./util";

/** Tumbling ellipses with rotation, in a few greens and golds. */
export const leaves: EffectFactory = () => {
  const rng = makeRng(113);
  let x = new Float32Array(0), y = new Float32Array(0), r = new Float32Array(0), k = new Float32Array(0);
  const colors = ["rgba(120,160,70,0.85)", "rgba(190,150,60,0.85)", "rgba(90,130,60,0.85)", "rgba(200,110,50,0.85)"];
  let count = 0;
  const effect: WeatherEffect = {
    init(f) {
      count = countFor(f, 15, 40);
      x = new Float32Array(count); y = new Float32Array(count); r = new Float32Array(count); k = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = rng() * f.height; r[i] = rng() * 6.28; k[i] = rng(); }
    },
    update(f) {
      for (let i = 0; i < count; i++) {
        y[i] += (18 + f.intensity * 4) * (0.5 + k[i]) * f.dt; x[i] += (Math.sin(f.time * 1.2 + k[i] * 8) * 25 + 10) * f.dt; r[i] += (1 + k[i]) * f.dt * 2;
        if (y[i] > f.height + 8) { y[i] = -8; x[i] = rng() * f.width; }
        if (x[i] > f.width + 8) x[i] = -8;
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.ellipse(x[i], y[i], 3 + k[i] * 3, 1.5 + k[i] * 1.5, r[i], 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };
  return effect;
};
