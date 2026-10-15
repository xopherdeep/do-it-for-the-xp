import type { EffectFactory } from "../types";

/** Two or three horizontal translucent bands near the horizon, wobbling slowly: the mirage. */
export const heatHaze: EffectFactory = () => {
  return {
    init() { /* stateless */ },
    update() { /* stateless */ },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      const bands = 3;
      for (let i = 0; i < bands; i++) {
        const y = f.height * (0.55 + i * 0.09) + (f.reducedMotion ? 0 : Math.sin(f.time * 1.7 + i) * 3);
        const grad = ctx.createLinearGradient(0, y - 10, 0, y + 10);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, `rgba(255,250,235,${0.05 + f.intensity * 0.006})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        const skew = f.reducedMotion ? 0 : Math.sin(f.time * 0.9 + i * 2) * 0.02;
        ctx.setTransform(f.dpr, 0, skew * f.dpr, f.dpr, 0, 0);
        ctx.fillRect(-20, y - 10, f.width + 40, 20);
      }
      ctx.restore();
    },
  };
};
