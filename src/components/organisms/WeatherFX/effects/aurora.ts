import type { EffectFactory } from "../types";

/** Two slow wavy translucent ribbons across the upper sky. */
export const aurora: EffectFactory = () => {
  return {
    init() { /* stateless */ },
    update() { /* stateless */ },
    draw(f) {
      const { ctx } = f;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ribbons = [[120, 255, 190], [150, 160, 255]];
      ribbons.forEach((c, k) => {
        ctx.beginPath();
        const baseY = f.height * (0.18 + k * 0.1);
        for (let i = 0; i <= 24; i++) {
          const px = (f.width / 24) * i;
          const py = baseY + Math.sin(i * 0.5 + f.time * (f.reducedMotion ? 0 : 0.6) + k) * 18 + Math.sin(i * 0.9 - f.time * 0.3) * 8;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        for (let i = 24; i >= 0; i--) {
          const px = (f.width / 24) * i;
          const py = baseY + 60 + Math.sin(i * 0.5 + f.time * 0.6 + k) * 18;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, baseY, 0, baseY + 60);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.14 + f.intensity * 0.012})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      ctx.restore();
    },
  };
};
