import type { EffectFactory } from "../types";
import { countFor, makeRng, pulse } from "./util";

/** Twinkling stars and a shooting star every 10-20 s; `faint` for city skies. */
export const stars: EffectFactory = (options = {}) => {
  const faint = Boolean(options.faint);
  const rng = makeRng(127);
  let x = new Float32Array(0), y = new Float32Array(0), ph = new Float32Array(0), b = new Float32Array(0);
  let count = 0, shootAt = 0, shootT = -1, sx = 0, sy = 0;
  return {
    init(f) {
      count = countFor(f, faint ? 30 : 80, faint ? 80 : 200);
      x = new Float32Array(count); y = new Float32Array(count); ph = new Float32Array(count); b = new Float32Array(count);
      for (let i = 0; i < count; i++) { x[i] = rng() * f.width; y[i] = rng() * f.height * 0.7; ph[i] = rng() * 6.28; b[i] = rng(); }
      shootAt = f.time + 5 + rng() * 10; shootT = -1;
    },
    update(f) {
      if (f.reducedMotion) return;
      const shouldLaunchShootingStar = shootT < 0 && f.time >= shootAt;
      if (shouldLaunchShootingStar) { shootT = 0; sx = rng() * f.width * 0.7; sy = rng() * f.height * 0.3; }
      if (shootT >= 0) { shootT += f.dt * 1.6; if (shootT > 1) { shootT = -1; shootAt = f.time + 10 + rng() * 10; } }
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      for (let i = 0; i < count; i++) {
        const tw = f.reducedMotion ? 0.6 : 0.4 + 0.6 * pulse(f.time, 1.5 + b[i] * 3, ph[i]);
        ctx.fillStyle = `rgba(255,255,255,${(faint ? 0.3 : 0.55) * tw})`;
        ctx.fillRect(x[i], y[i], 1 + b[i], 1 + b[i]);
      }
      if (shootT >= 0) {
        ctx.globalCompositeOperation = "lighter";
        const px = sx + shootT * 260, py = sy + shootT * 120;
        const grad = ctx.createLinearGradient(px, py, px - 60, py - 28);
        grad.addColorStop(0, `rgba(255,255,255,${1 - shootT})`); grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 60, py - 28); ctx.stroke();
      }
      ctx.restore();
    },
  };
};
