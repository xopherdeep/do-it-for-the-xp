"""
Breathe a little life into a temple room image: a slow shimmer across the gold trim, two warm
lantern glows that pulse, and dust motes drifting up. Writes an animated WebP (and optionally APNG).
Usage: python3 animate_room.py <in.jpg> <out.webp> [--apng out.png] [--width 768]
"""
import sys, math, argparse
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--apng"); ap.add_argument("--width", type=int, default=768)
ap.add_argument("--frames", type=int, default=30); ap.add_argument("--seconds", type=float, default=3.0)
a = ap.parse_args()

base = Image.open(a.src).convert("RGB")
scale = a.width / base.width
base = base.resize((a.width, int(base.height * scale)), Image.LANCZOS)
W, H = base.size
arr = np.asarray(base).astype(np.float32)

# Where is the gold? Warm, bright pixels: these get the shimmer.
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
gold = ((r > 140) & (g > 95) & (b < 110) & (r - b > 60)).astype(np.float32)
gold = np.asarray(Image.fromarray((gold * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255

# Lanterns: two warm glows near the top corners inside the frame
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def glow(cx, cy, radius):
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (radius * radius)
    return np.exp(-d2 * 2.2)
lanterns = [(W * 0.18, H * 0.16, W * 0.22), (W * 0.82, H * 0.84, W * 0.22)]
glows = [glow(*l) for l in lanterns]
warm = np.array([255, 190, 110], dtype=np.float32)

rng = np.random.default_rng(5)
motes = rng.uniform(0, 1, (26, 4))   # x, y, speed, size

frames = []
for i in range(a.frames):
    t = i / a.frames
    out = arr.copy()
    # shimmer: a soft diagonal band sweeping across the gold once per loop
    band_pos = (xx + yy) / (W + H)
    band = np.exp(-((band_pos - t) % 1.0 - 0.5) ** 2 / 0.0025) * 0.9 + np.exp(-((band_pos - t) % 1.0) ** 2 / 0.0025) * 0.9
    out += (band * gold)[..., None] * np.array([70, 55, 25], dtype=np.float32)
    # lanterns breathe, slightly out of phase
    for k, gl in enumerate(glows):
        pulse = 0.18 + 0.07 * math.sin(2 * math.pi * (t + k * 0.37))
        out += gl[..., None] * warm * pulse
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    # dust motes
    d = ImageDraw.Draw(img, "RGBA")
    for mx, my, sp, sz in motes:
        y = (my - t * sp * 0.5) % 1.0
        x = (mx + 0.02 * math.sin(2 * math.pi * (t * 2 + my * 7))) % 1.0
        alpha = int(90 + 60 * math.sin(2 * math.pi * (t * 3 + mx * 9)))
        rad = 1.2 + sz * 2.2
        d.ellipse([x * W - rad, y * H - rad, x * W + rad, y * H + rad], fill=(255, 240, 200, max(20, alpha)))
    frames.append(img)

duration = int(a.seconds * 1000 / a.frames)
frames[0].save(a.out, save_all=True, append_images=frames[1:], duration=duration, loop=0, quality=78, method=4)
print("wrote", a.out)
if a.apng:
    frames[0].save(a.apng, save_all=True, append_images=frames[1:], duration=duration, loop=0, optimize=True)
    print("wrote", a.apng)
