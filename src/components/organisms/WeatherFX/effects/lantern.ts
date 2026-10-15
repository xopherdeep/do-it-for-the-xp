import type { EffectFactory } from "../types";
import { makeRng, softBlob } from "./util";

/** Temple rooms: two warm lantern glows that breathe, dust motes drifting up, a slow shimmer along the edges. */
export const lantern: EffectFactory = () => {
  const rng = makeRng(151);
  let glow: HTMLCanvasElement | null = null;
  let x = new Float32Array(0), y = new Float32Array(0), k = new Float32Array(0);
  let motes = 0;
  return {
    init(f) {
      glow = softBlob(256, 255, 190, 110, 1);
      motes = Math.round(24 * f.budget);
      x = new Float32Array(motes); y = new Float32Array(motes); k = new Float32Array(motes);
      for (let i = 0; i < motes; i++) { x[i] = rng() * f.width; y[i] = rng() * f.height; k[i] = rng(); }
    },
    update(f) {
      for (let i = 0; i < motes; i++) {
        y[i] -= (6 + k[i] * 10) * f.dt; x[i] += Math.sin(f.time * 1.1 + k[i] * 9) * 6 * f.dt;
        if (y[i] < -4) { y[i] = f.height + 4; x[i] = rng() * f.width; }
      }
    },
    draw(f) {
      if (!glow) return;
      const { ctx } = f;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const spots: [number, number, number][] = [[0.18, 0.16, 0], [0.82, 0.84, 2.3]];
      for (const [px, py, ph] of spots) {
        const breathe = f.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(f.time * 1.3 + ph);
        const s = f.width * (0.5 + breathe * 0.08);
        ctx.globalAlpha = 0.16 + breathe * 0.1 + f.intensity * 0.01;
        ctx.drawImage(glow, f.width * px - s / 2, f.height * py - s / 2, s, s);
      }
      // the shimmer: a soft diagonal highlight sweeping along the frame edges
      const t = f.reducedMotion ? 0.5 : (f.time * 0.12) % 1;
      const grad = ctx.createLinearGradient(0, 0, f.width, f.height);
      grad.addColorStop(Math.max(0, t - 0.08), "rgba(255,230,160,0)");
      grad.addColorStop(t, "rgba(255,230,160,0.16)");
      grad.addColorStop(Math.min(1, t + 0.08), "rgba(255,230,160,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(10, f.width * 0.05);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, f.width - ctx.lineWidth, f.height - ctx.lineWidth);
      ctx.fillStyle = "rgba(255,240,200,1)";
      for (let i = 0; i < motes; i++) {
        ctx.globalAlpha = 0.15 + k[i] * 0.35;
        ctx.beginPath(); ctx.arc(x[i], y[i], 0.8 + k[i] * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };
};
