import type { EffectFactory } from "../types";
import { makeRng } from "./util";

/** A full-screen flash that decays in 180 ms plus a jagged bolt shown for two frames; only at intensity >= 6. */
export const lightning: EffectFactory = () => {
  const rng = makeRng(23);
  let nextAt = 6, flash = 0, boltFrames = 0;
  const bolt: number[] = [];
  return {
    init(f) { nextAt = f.time + 4 + rng() * 10; flash = 0; boltFrames = 0; },
    update(f) {
      const cannotStrike = f.reducedMotion || f.intensity < 6;
      if (cannotStrike) return;
      const isStrikeDue = f.time >= nextAt;
      if (isStrikeDue) {
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
      const isFlashing = flash > 0;
      if (isFlashing) flash = Math.max(0, flash - f.dt / 0.18);
    },
    draw(f) {
      const isSkyQuiet = flash <= 0 && boltFrames <= 0;
      if (isSkyQuiet) return;
      const { ctx } = f;
      ctx.save();
      const isFlashing = flash > 0;
      if (isFlashing) {
        ctx.fillStyle = `rgba(235,240,255,${flash * 0.55})`;
        ctx.fillRect(0, 0, f.width, f.height);
      }
      const isBoltShowing = boltFrames > 0;
      if (isBoltShowing) {
        boltFrames -= 1;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(180,200,255,0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let i = 0; i < bolt.length; i += 2) {
          const isFirstPoint = i === 0;
          if (isFirstPoint) ctx.moveTo(bolt[i], bolt[i + 1]); else ctx.lineTo(bolt[i], bolt[i + 1]);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  };
};
