import type { EffectFactory } from "../types";

/** Rotating translucent wedges from the top-left corner, additive; `faint` for overcast light. */
export const sunRays: EffectFactory = (options = {}) => {
  const faint = Boolean(options.faint);
  return {
    init() { /* stateless */ },
    update() { /* stateless */ },
    draw(f) {
      const { ctx } = f;
      const rays = faint ? 3 : 5;
      const alpha = (faint ? 0.05 : 0.11) * (0.6 + f.intensity / 25);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(f.width * 0.08, -f.height * 0.05);
      const sway = f.reducedMotion ? 0 : Math.sin(f.time * 0.18) * 0.08;
      for (let i = 0; i < rays; i++) {
        const a0 = 0.35 + i * 0.22 + sway, w = 0.09 + (i % 2) * 0.05;
        const grad = ctx.createLinearGradient(0, 0, Math.cos(a0) * f.height * 1.6, Math.sin(a0) * f.height * 1.6);
        grad.addColorStop(0, `rgba(255,240,190,${alpha})`);
        grad.addColorStop(1, "rgba(255,240,190,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, f.height * 1.6, a0 - w, a0 + w);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  };
};
