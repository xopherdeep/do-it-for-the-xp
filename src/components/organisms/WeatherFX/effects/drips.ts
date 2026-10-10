import type { EffectFactory, WeatherEffect } from "../types";
import { makeRng } from "./util";

/** The occasional drop falling from the dark with a ripple where it lands. */
export const drips: EffectFactory = () => {
  const rng = makeRng(137);
  const drops: { x: number; y: number; v: number; ripple: number }[] = [];
  let nextAt = 0;
  const effect: WeatherEffect = {
    init(f) { drops.length = 0; nextAt = f.time + 1; },
    update(f) {
      if (f.time >= nextAt) { nextAt = f.time + 1.2 + rng() * 3 / Math.max(0.3, f.intensity / 5); drops.push({ x: rng() * f.width, y: 0, v: 0, ripple: -1 }); }
      for (const d of drops) {
        if (d.ripple < 0) { d.v += 900 * f.dt; d.y += d.v * f.dt; if (d.y >= f.height * 0.9) d.ripple = 0; }
        else d.ripple += f.dt * 1.4;
      }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].ripple > 1) drops.splice(i, 1);
    },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      for (const d of drops) {
        if (d.ripple < 0) {
          ctx.strokeStyle = "rgba(200,220,255,0.6)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(d.x, d.y - 8); ctx.lineTo(d.x, d.y); ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(200,220,255,${0.5 * (1 - d.ripple)})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(d.x, f.height * 0.9, 3 + d.ripple * 26, 1 + d.ripple * 8, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    },
  };
  return effect;
};
