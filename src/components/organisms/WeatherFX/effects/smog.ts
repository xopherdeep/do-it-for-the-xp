import type { EffectFactory, WeatherEffect } from "../types";
import { countFor, makeRng, pulse, softBlob } from "./util";

/** Low grey drift along the bottom and a few window lights twinkling: the city at night. */
export const smog: EffectFactory = () => {
  const rng = makeRng(149);
  let blob: HTMLCanvasElement | null = null;
  let wx = new Float32Array(0), wy = new Float32Array(0), wp = new Float32Array(0);
  let windows = 0, drift = 0;
  const effect: WeatherEffect = {
    init(f) {
      blob = softBlob(256, 120, 120, 135, 1);
      windows = countFor(f, 10, 40);
      wx = new Float32Array(windows); wy = new Float32Array(windows); wp = new Float32Array(windows);
      for (let i = 0; i < windows; i++) { wx[i] = rng() * f.width; wy[i] = f.height * (0.2 + rng() * 0.5); wp[i] = rng() * 6.28; }
    },
    update(f) { drift += f.dt * 6; },
    draw(f) {
      if (!blob) return;
      const { ctx } = f;
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const x = ((drift * (0.6 + i * 0.3) + i * 220) % (f.width + 300)) - 150;
        ctx.globalAlpha = 0.16 + f.intensity * 0.012;
        ctx.drawImage(blob, x - 150, f.height * 0.75 - 60 + i * 12, 300, 120);
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < windows; i++) {
        const on = f.reducedMotion ? 0.6 : pulse(f.time, 2 + (i % 5), wp[i]) > 0.6 ? 0.8 : 0.3;
        ctx.fillStyle = `rgba(255,220,150,${on * 0.5})`;
        ctx.fillRect(wx[i], wy[i], 2, 3);
      }
      ctx.restore();
    },
  };
  return effect;
};
