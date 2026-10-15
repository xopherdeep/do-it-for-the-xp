import type { EffectFactory } from "../types";
import { countFor, makeRng } from "./util";

/** Short translucent streaks and pollen dots that gust across, for plains and mountains. */
export const wind: EffectFactory = () => {
  const rng = makeRng(71);
  let x = new Float32Array(0), y = new Float32Array(0), k = new Float32Array(0);
  let count = 0, gust = 0;
  return {
    init(f) {
      count = countFor(f, 20, 90);
      x = new Float32Array(count); y = new Float32Array(count); k = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = rng() * f.height; k[i] = rng(); }
    },
    update(f) {
      gust = 0.5 + 0.5 * Math.sin(f.time * 0.5) * Math.sin(f.time * 0.21 + 1.3);
      const v = (40 + f.intensity * 14) * (0.4 + gust) * f.dt;
      for (let i = 0; i < count; i++) {
        x[i] += v * (0.5 + k[i]); y[i] += Math.sin(f.time * 2 + k[i] * 9) * 10 * f.dt;
        if (x[i] > f.width + 30) { x[i] = -30; y[i] = rng() * f.height; }
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < count; i++) {
        if (k[i] > 0.6) {
          ctx.strokeStyle = `rgba(255,255,255,${0.08 + gust * 0.14})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x[i], y[i]); ctx.lineTo(x[i] - 18 - gust * 30, y[i] + 2); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(255,245,200,${0.25 + k[i] * 0.4})`;
          ctx.beginPath(); ctx.arc(x[i], y[i], 1 + k[i] * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    },
  };
};
