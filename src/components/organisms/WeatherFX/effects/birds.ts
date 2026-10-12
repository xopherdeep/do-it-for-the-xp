import type { EffectFactory, WeatherEffect } from "../types";
import { makeRng } from "./util";

/** Two to five tiny flapping V shapes crossing the sky every 8-15 s. */
export const birds: EffectFactory = () => {
  const rng = makeRng(67);
  const flock: { x: number; y: number; v: number; ph: number }[] = [];
  let nextAt = 0, active = false;
  const effect: WeatherEffect = {
    init(f) { nextAt = f.time + 2 + rng() * 6; active = false; flock.length = 0; },
    update(f) {
      if (f.reducedMotion) return;
      const shouldLaunchFlock = !active && f.time >= nextAt;
      if (shouldLaunchFlock) {
        active = true;
        flock.length = 0;
        const n = 2 + Math.floor(rng() * 4), dir = rng() < 0.5 ? 1 : -1;
        for (let i = 0; i < n; i++) flock.push({ x: dir > 0 ? -40 - i * 22 : f.width + 40 + i * 22, y: f.height * (0.08 + rng() * 0.3) + i * 6, v: dir * (55 + rng() * 25), ph: rng() * 6.28 });
      }
      if (active) {
        let gone = true;
        for (const b of flock) {
          b.x += b.v * f.dt; b.y += Math.sin(f.time * 1.3 + b.ph) * 4 * f.dt;
          const isStillCrossingSky = b.x > -60 && b.x < f.width + 60;
          if (isStillCrossingSky) gone = false;
        }
        if (gone) { active = false; nextAt = f.time + 8 + rng() * 7; }
      }
    },
    draw(f) {
      if (!active) return;
      const { ctx } = f;
      ctx.save();
      ctx.strokeStyle = "rgba(30,30,45,0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      for (const b of flock) {
        const flap = Math.sin(f.time * 9 + b.ph) * 4;
        ctx.beginPath();
        ctx.moveTo(b.x - 6, b.y + flap); ctx.quadraticCurveTo(b.x - 2, b.y - 2, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 2, b.y - 2, b.x + 6, b.y + flap);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  return effect;
};
