"""
Procedural room floors for the temples, in the spirit of the wind temple's painted tiles: a tiled
floor with wear and blotches inside an ornate stone-and-metal frame, coloured per element, with a
small emblem for the room type. One JPG per maze cell: src/assets/images/backgrounds/<temple>/[row,col].jpg
Usage: python3 temple_floors.py [temple ...]   (default: every temple without a folder)
"""
import os, re, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
W, H = 640, 854
FRAME = 58
TILE = 40

PALETTES = {
    # tile, tile_dark, grout, blotch, glow, frame_stone, frame_metal, metal_hi
    "fire":   ((70, 58, 56), (44, 36, 36), (28, 22, 22), (120, 50, 30), (255, 120, 40), (60, 40, 40), (190, 110, 50), (255, 190, 110)),
    "ice":    ((214, 228, 240), (176, 198, 220), (150, 175, 200), (120, 150, 185), (240, 250, 255), (90, 110, 140), (160, 190, 220), (235, 245, 255)),
    "water":  ((72, 126, 140), (52, 100, 116), (36, 72, 86), (40, 90, 110), (150, 230, 240), (50, 70, 80), (150, 125, 70), (230, 200, 130)),
    "earth":  ((126, 112, 80), (96, 84, 58), (62, 52, 36), (70, 90, 50), (150, 190, 90), (70, 58, 44), (140, 100, 60), (210, 170, 110)),
    "light":  ((236, 226, 196), (214, 200, 160), (180, 160, 120), (200, 170, 110), (255, 240, 180), (120, 100, 70), (220, 180, 80), (255, 235, 150)),
    "shadow": ((54, 44, 72), (38, 30, 52), (22, 16, 32), (80, 40, 110), (170, 110, 255), (40, 32, 56), (150, 140, 170), (220, 210, 240)),
    "wind":   ((206, 198, 176), (176, 166, 144), (140, 130, 110), (120, 110, 95), (240, 240, 230), (90, 70, 90), (205, 150, 70), (250, 215, 140)),
}

def load_maze(temple):
    src = open(os.path.join(ROOT, "src", "lib", "engine", "temples", f"{temple}.ts")).read()
    body = src[src.index("maze: [") + 7: src.index("],\n  rooms")]
    rows = []
    for line in body.splitlines():
        line = line.split("//")[0].strip()
        if not line.startswith("["): continue
        cells = [c.strip() for c in line.strip("[],").split(",") if c.strip()]
        rows.append(cells)
    types = {}
    for m in re.finditer(r'\[(\w+)\]: \{ type: "(\w+)"', src):
        types[m.group(1)] = m.group(2)
    return rows, types

def noise(shape, rng, blur=3):
    n = rng.uniform(0, 1, shape).astype(np.float32)
    img = Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img).astype(np.float32) / 255

def floor(pal, rng, room_type):
    tile, tile_dark, grout, blotch, glow = [np.array(c, dtype=np.float32) for c in pal[:5]]
    img = np.zeros((H, W, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    # tiles with per-tile shade, a bevel and a grout line
    tx, ty = (xx // TILE), (yy // TILE)
    shade = noise(((H // TILE) + 2, (W // TILE) + 2), rng, blur=0)
    per_tile = shade[ty, tx][..., None]
    base = tile * (0.82 + 0.36 * per_tile) * 0.9 + tile_dark * 0.1
    inner_x, inner_y = xx % TILE, yy % TILE
    bevel = ((inner_x < 3) | (inner_y < 3)).astype(np.float32)[..., None] * 0.12
    groutm = ((inner_x < 2) | (inner_y < 2)).astype(np.float32)[..., None]
    img = base * (1 + bevel) * (1 - groutm) + grout * groutm
    # large blotches of wear and a few cracks
    wear = noise((H, W), rng, blur=28)
    wear = np.clip((wear - 0.52) * 4, 0, 1)[..., None]
    img = img * (1 - wear * 0.55) + blotch * wear * 0.55
    grain = noise((H, W), rng, blur=1)[..., None]
    img = img * (0.92 + 0.16 * grain)
    # room-type emblem in the centre
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil, "RGBA")
    cx, cy = W // 2, H // 2
    g = tuple(int(v) for v in glow)
    if room_type == "boss":
        for r in (150, 118, 86):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=g + (140,), width=6)
        d.polygon([(cx, cy - 70), (cx + 60, cy + 35), (cx - 60, cy + 35)], outline=g + (160,), width=5)
    elif room_type == "miniboss":
        d.ellipse([cx - 110, cy - 110, cx + 110, cy + 110], outline=g + (120,), width=5)
    elif room_type == "entrance":
        d.rectangle([cx - 70, cy - 10, cx + 70, H - FRAME - 10], fill=tuple(int(v) for v in blotch) + (60,))
    elif room_type in ("loot",):
        d.rectangle([cx - 90, cy - 60, cx + 90, cy + 60], outline=g + (130,), width=4)
        d.rectangle([cx - 76, cy - 46, cx + 76, cy + 46], outline=g + (80,), width=2)
    elif room_type == "trap":
        for i in range(5):
            x0, y0 = cx + rng.integers(-120, 120), cy + rng.integers(-150, 150)
            pts = [(x0, y0)]
            for _ in range(5):
                pts.append((pts[-1][0] + rng.integers(-40, 40), pts[-1][1] + rng.integers(-40, 40)))
            d.line(pts, fill=(10, 8, 8, 200), width=3)
    elif room_type in ("health", "mana"):
        d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], outline=g + (150,), width=4)
        d.line([cx - 30, cy, cx + 30, cy], fill=g + (160,), width=5)
        if room_type == "health":
            d.line([cx, cy - 30, cx, cy + 30], fill=g + (160,), width=5)
    elif room_type == "teleport":
        for r in range(20, 140, 24):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=g + (70,), width=2)
    elif room_type in ("shop", "puzzle", "gate"):
        d.rectangle([cx - 100, cy - 100, cx + 100, cy + 100], outline=g + (90,), width=3)
    # a soft vignette and a warm light from above
    v = Image.new("L", (W, H), 0)
    ImageDraw.Draw(v).ellipse([-W * 0.2, -H * 0.1, W * 1.2, H * 1.1], fill=255)
    v = v.filter(ImageFilter.GaussianBlur(120))
    vig = np.asarray(v).astype(np.float32)[..., None] / 255
    out = np.asarray(pil).astype(np.float32) * (0.72 + 0.28 * vig)
    return out

def frame(img, pal, rng):
    stone, metal, hi = [np.array(c, dtype=np.float32) for c in pal[5:8]]
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil, "RGBA")
    s = tuple(int(v) for v in stone); m = tuple(int(v) for v in metal); h = tuple(int(v) for v in hi)
    # stone band with blocks
    d.rectangle([0, 0, W, FRAME], fill=s); d.rectangle([0, H - FRAME, W, H], fill=s)
    d.rectangle([0, 0, FRAME, H], fill=s); d.rectangle([W - FRAME, 0, W, H], fill=s)
    dark = tuple(max(0, c - 28) for c in s)
    for x in range(0, W, 46):
        d.rectangle([x + 3, 6, x + 42, FRAME - 10], outline=dark, width=2)
        d.rectangle([x + 3, H - FRAME + 10, x + 42, H - 6], outline=dark, width=2)
    for y in range(0, H, 46):
        d.rectangle([6, y + 3, FRAME - 10, y + 42], outline=dark, width=2)
        d.rectangle([W - FRAME + 10, y + 3, W - 6, y + 42], outline=dark, width=2)
    # metal rail with rivets and corner bosses
    inset = FRAME - 14
    d.rectangle([inset, inset, W - inset, H - inset], outline=m, width=8)
    d.rectangle([inset + 3, inset + 3, W - inset - 3, H - inset - 3], outline=h + (120,), width=2)
    for x in range(inset, W - inset, 64):
        d.ellipse([x - 4, inset - 4, x + 4, inset + 4], fill=h); d.ellipse([x - 4, H - inset - 4, x + 4, H - inset + 4], fill=h)
    for y in range(inset, H - inset, 64):
        d.ellipse([inset - 4, y - 4, inset + 4, y + 4], fill=h); d.ellipse([W - inset - 4, y - 4, W - inset + 4, y + 4], fill=h)
    for (cx, cy) in ((inset, inset), (W - inset, inset), (inset, H - inset), (W - inset, H - inset)):
        d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=m, outline=h, width=3)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=h)
    # an inner shadow where the floor meets the frame
    arr = np.asarray(pil).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    edge = np.minimum(np.minimum(xx - FRAME, W - FRAME - xx), np.minimum(yy - FRAME, H - FRAME - yy))
    shadow = np.clip(1 - edge / 40, 0, 1)
    shadow = np.where(edge < 0, 0, shadow)[..., None]
    arr = arr * (1 - 0.35 * shadow)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def render(temple):
    element = temple.replace("-temple", "")
    pal = PALETTES[element]
    rows, types = load_maze(temple)
    out_dir = os.path.join(ROOT, "src", "assets", "images", "backgrounds", temple)
    os.makedirs(out_dir, exist_ok=True)
    count = 0
    for r, row in enumerate(rows):
        for c, token in enumerate(row):
            room_type = types.get(token, "wall")
            rng = np.random.default_rng(hash((temple, r, c)) % (2**32))
            img = floor(pal, rng, room_type)
            if room_type == "wall":
                img = img * 0.35
            pil = frame(img, pal, rng)
            pil.save(os.path.join(out_dir, f"[{r},{c}].jpg"), quality=78, optimize=True)
            count += 1
    print(f"{temple}: {count} rooms")

if __name__ == "__main__":
    temples = sys.argv[1:] or [t for t in ("earth-temple", "water-temple", "fire-temple", "ice-temple", "light-temple", "shadow-temple")]
    for t in temples:
        render(t)
