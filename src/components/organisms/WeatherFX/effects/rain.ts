import type { EffectFactory, EffectFrame, WeatherEffect } from "../types";
import { countFor, makeRng } from "./util";

/** Angled streaks in three depths with splashes at the bottom edge; `heavy` doubles the count. */
export const rain: EffectFactory = (options = {}) => {
  const heavy = Boolean(options.heavy);
  const rng = makeRng(11);
  let x = new Float32Array(0), y = new Float32Array(0), depth = new Float32Array(0), len = new Float32Array(0);
  let splashX = new Float32Array(0), splashT = new Float32Array(0);
  let count = 0, splashes = 0, wind = 0;

  const effect: WeatherEffect = {
    init(f: EffectFrame) {
      count = countFor(f, 60, heavy ? 800 : 400);
      x = new Float32Array(count); y = new Float32Array(count); depth = new Float32Array(count); len = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        x[i] = rng() * f.width; y[i] = rng() * f.height; depth[i] = rng(); len[i] = 10 + depth[i] * 18;
      }
      splashes = Math.round(count / 6);
      splashX = new Float32Array(splashes); splashT = new Float32Array(splashes);
      for (let i = 0; i < splashes; i++) { splashX[i] = rng() * f.width; splashT[i] = rng(); }
    },
    update(f) {
      wind = Math.sin(f.time * 0.35) * 0.35 + 0.25;
      const base = (520 + f.intensity * 60) * f.dt;
      for (let i = 0; i < count; i++) {
        const speed = base * (0.55 + depth[i]);
        y[i] += speed; x[i] += speed * wind;
        const isPastBottom = y[i] > f.height;
        if (isPastBottom) { y[i] = -len[i]; x[i] = rng() * (f.width + 60) - 30; }
        const isPastRightEdge = x[i] > f.width + 20;
        if (isPastRightEdge) x[i] = -20;
      }
      for (let i = 0; i < splashes; i++) {
        splashT[i] += f.dt * 2.6;
        const isSplashDone = splashT[i] > 1;
        if (isSplashDone) { splashT[i] = 0; splashX[i] = rng() * f.width; }
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < count; i++) {
        const d = depth[i];
        ctx.strokeStyle = `rgba(210,225,255,${0.12 + d * 0.38})`;
        ctx.lineWidth = 0.6 + d * 1.2;
        ctx.beginPath();
        ctx.moveTo(x[i], y[i]);
        ctx.lineTo(x[i] - len[i] * wind, y[i] - len[i]);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(220,235,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < splashes; i++) {
        const t = splashT[i];
        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.ellipse(splashX[i], f.height - 2, 2 + t * 10, 1 + t * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  return effect;
};
