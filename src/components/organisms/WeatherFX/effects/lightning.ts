import type { EffectFactory, WeatherEffect } from "../types";
import { makeRng } from "./util";

/** A full-screen flash that decays in 180 ms plus a jagged bolt shown for two frames; only at intensity >= 6. */
export const lightning: EffectFactory = () => {
  const rng = makeRng(23);
  let nextAt = 6, flash = 0, boltFrames = 0;
  const bolt: number[] = [];
  const effect: WeatherEffect = {
    init(f) { nextAt = f.time + 4 + rng() * 10; flash = 0; boltFrames = 0; },
    update(f) {
      if (f.reducedMotion || f.intensity < 6) return;
      if (f.time >= nextAt) {
        nextAt = f.time + 6 + rng() * 14;
        flash = 1;
        boltFrames = 2;
        bolt.length = 0;
        let bx = f.width * (0.2 + rng() * 0.6), by = 0;
        bolt.push(bx, by);
        while (by < f.height * (0.5 + rng() * 0.4)) {
          bx += (rng() - 0.5) * 60; by += 18 + rng() * 30;
          bolt.push(bx, by);
        }
      }
      if (flash > 0) flash = Math.max(0, flash - f.dt / 0.18);
    },
    draw(f) {
      if (flash <= 0 && boltFrames <= 0) return;
      const { ctx } = f;
      ctx.save();
      if (flash > 0) {
        ctx.fillStyle = `rgba(235,240,255,${flash * 0.55})`;
        ctx.fillRect(0, 0, f.width, f.height);
      }
      if (boltFrames > 0) {
        boltFrames -= 1;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(180,200,255,0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let i = 0; i < bolt.length; i += 2) {
          if (i === 0) ctx.moveTo(bolt[i], bolt[i + 1]); else ctx.lineTo(bolt[i], bolt[i + 1]);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  return effect;
};
