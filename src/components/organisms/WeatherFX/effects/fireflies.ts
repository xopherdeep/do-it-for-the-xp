import type { EffectFactory, WeatherEffect } from "../types";
import { countFor, makeRng } from "./util";

/** Glowing dots that wander with easing and blink, additive. */
export const fireflies: EffectFactory = () => {
  const rng = makeRng(101);
  let x = new Float32Array(0), y = new Float32Array(0), tx = new Float32Array(0), ty = new Float32Array(0), ph = new Float32Array(0);
  let count = 0;
  const effect: WeatherEffect = {
    init(f) {
      count = countFor(f, 12, 40);
      x = new Float32Array(count); y = new Float32Array(count); tx = new Float32Array(count); ty = new Float32Array(count); ph = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = tx[i] = rng() * f.width; y[i] = ty[i] = f.height * (0.3 + rng() * 0.7); ph[i] = rng() * 6.28; }
    },
    update(f) {
      for (let i = 0; i < count; i++) {
        const hasReachedTarget = Math.abs(x[i] - tx[i]) + Math.abs(y[i] - ty[i]) < 4;
        if (hasReachedTarget) { tx[i] = x[i] + (rng() - 0.5) * 120; ty[i] = y[i] + (rng() - 0.5) * 80; }
        x[i] += (tx[i] - x[i]) * f.dt * 0.8; y[i] += (ty[i] - y[i]) * f.dt * 0.8;
      }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < count; i++) {
        const blink = f.reducedMotion ? 0.7 : Math.max(0, Math.sin(f.time * 1.6 + ph[i]));
        const isDark = blink < 0.05;
        if (isDark) continue;
        const grad = ctx.createRadialGradient(x[i], y[i], 0, x[i], y[i], 7);
        grad.addColorStop(0, `rgba(220,255,140,${blink * 0.9})`);
        grad.addColorStop(1, "rgba(220,255,140,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x[i], y[i], 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };
  return effect;
};
