import type { EffectFactory, WeatherEffect } from "../types";
import { countFor, makeRng } from "./util";

/** Fast horizontal grains plus a tan haze band that gusts. */
export const sand: EffectFactory = () => {
  const rng = makeRng(83);
  let x = new Float32Array(0), y = new Float32Array(0), k = new Float32Array(0);
  let count = 0, gust = 0;
  const effect: WeatherEffect = {
    init(f) {
      count = countFor(f, 60, 260);
      x = new Float32Array(count); y = new Float32Array(count); k = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = f.height * (0.3 + rng() * 0.7); k[i] = rng(); }
    },
    update(f) {
      gust = 0.45 + 0.55 * Math.max(0, Math.sin(f.time * 0.4) * Math.sin(f.time * 0.17 + 2));
      const v = (160 + f.intensity * 30) * (0.3 + gust) * f.dt;
      for (let i = 0; i < count; i++) {
        x[i] += v * (0.5 + k[i]); y[i] += Math.sin(f.time * 3 + k[i] * 7) * 14 * f.dt;
        const isPastRightEdge = x[i] > f.width + 10;
        if (isPastRightEdge) { x[i] = -10; y[i] = f.height * (0.3 + rng() * 0.7); }
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      const haze = ctx.createLinearGradient(0, f.height * 0.5, 0, f.height);
      haze.addColorStop(0, "rgba(214,180,120,0)");
      haze.addColorStop(1, `rgba(214,180,120,${0.08 + gust * 0.22})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, f.height * 0.5, f.width, f.height * 0.5);
      ctx.strokeStyle = "rgba(240,215,160,0.6)";
      ctx.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.25 + k[i] * 0.5;
        ctx.beginPath(); ctx.moveTo(x[i], y[i]); ctx.lineTo(x[i] - 4 - gust * 10, y[i]); ctx.stroke();
      }
      ctx.restore();
    },
  };
  return effect;
};
