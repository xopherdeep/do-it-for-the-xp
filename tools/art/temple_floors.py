"""
Procedural room floors for the temples, in the spirit of the wind temple's painted tiles: a tiled
floor with wear and blotches inside an ornate stone-and-metal frame, coloured per element, with a
small emblem for the room type. One WebP per maze cell: src/assets/images/backgrounds/<temple>/[row,col].webp
(the dungeon screen shows the same image at that cell on every floor of the temple).
Usage: python3 temple_floors.py [temple ...]   (default: every temple without a folder)
"""
import os, re, sys, math, zlib
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
    "moon":   ((196, 198, 216), (166, 168, 192), (120, 122, 150), (138, 128, 172), (232, 232, 255), (70, 70, 98), (182, 186, 212), (242, 242, 255)),
    "storm":  ((94, 106, 130), (72, 82, 104), (44, 50, 66), (58, 80, 124), (255, 228, 92), (50, 56, 74), (150, 160, 190), (250, 238, 150)),
}

TEMPLE_DIR = os.path.join(ROOT, "src", "lib", "engine", "temples")
FLOOR_DIR = os.path.join(ROOT, "src", "assets", "images", "backgrounds")

def load_maze(temple):
    """The temple's floors (1F, 2F, ...) as grids of room tokens, and each token's room type, read from the file
    tools/temples/classic/dress.ts writes for each of the nine temples."""
    src = open(os.path.join(TEMPLE_DIR, f"{temple}.ts")).read()
    maze = src[src.index("maze: {"): src.index("rooms: {")]
    floors = [[re.findall(r'"([^"]+)"', line) for line in body.splitlines() if line.strip().startswith("[")]
              for body in re.findall(r'"\w+": \[\n(.*?)\n\s*\],', maze, re.S)]
    types = dict(re.findall(r'"(\w+)": \{ type: "([\w-]+)"', src))
    return floors, types

def cell_types(floors, types):
    """One image serves a [row,col] on every floor, so a cell shows a room's emblem only when every floor with a room
    there agrees on its type (else a plain floor); a cell that is wall on every floor is a dark wall tile."""
    kinds = {}
    for rows in floors:
        for r, row in enumerate(rows):
            for c, token in enumerate(row):
                kinds.setdefault((r, c), set()).add(types.get(token, "wall"))
    cells = {}
    for cell, found in kinds.items():
        rooms = found - {"wall"}
        cells[cell] = next(iter(rooms)) if len(rooms) == 1 else ("empty" if rooms else "wall")
    return cells

def exits(rows, types, locks, r, c):
    """What each side of this room is: 'wall', 'door' or 'locked'."""
    token = rows[r][c]
    out = {}
    for side, (dr, dc) in (("north", (-1, 0)), ("south", (1, 0)), ("west", (0, -1)), ("east", (0, 1))):
        rr, cc = r + dr, c + dc
        inside = 0 <= rr < len(rows) and 0 <= cc < len(rows[rr])
        neighbour = types.get(rows[rr][cc], "wall") if inside else "wall"
        if neighbour == "wall":
            out[side] = "wall"
        elif side in locks.get(token, set()):
            out[side] = "locked"
        else:
            out[side] = "door"
    return out

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
    return pil

def doors(pil, pal, sides):
    """Each side of the frame reads at a glance: a solid wall with a torch sconce, an archway lit from
    beyond where the hero can walk, or a barred, padlocked gate where the way is locked."""
    stone, metal, hi = [tuple(int(v) for v in np.array(c)) for c in pal[5:8]]
    glow = tuple(int(v) for v in np.array(pal[4]))
    d = ImageDraw.Draw(pil, "RGBA")
    dark = (14, 10, 12)
    OPEN = 150          # width of the opening along the wall
    def box(side):
        if side == "north": return (W // 2 - OPEN // 2, 0, W // 2 + OPEN // 2, FRAME + 6)
        if side == "south": return (W // 2 - OPEN // 2, H - FRAME - 6, W // 2 + OPEN // 2, H)
        if side == "west":  return (0, H // 2 - OPEN // 2, FRAME + 6, H // 2 + OPEN // 2)
        return (W - FRAME - 6, H // 2 - OPEN // 2, W, H // 2 + OPEN // 2)
    def draw(side, kind):
        x0, y0, x1, y1 = box(side)
        horizontal = side in ("north", "south")
        if kind == "wall":
            # a sconce: a small torch bracket on the wall, so a blank side still reads as solid stone
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            d.rectangle([cx - 5, cy - 9, cx + 5, cy + 9], fill=metal, outline=dark, width=1)
            d.ellipse([cx - 9, cy - 20, cx + 9, cy - 2], fill=glow + (190,))
            d.ellipse([cx - 5, cy - 16, cx + 5, cy - 6], fill=(255, 255, 220, 220))
            return
        # the opening: a dark passage with light at the far end, cut through the whole frame
        d.rectangle([x0, y0, x1, y1], fill=dark)
        if horizontal:
            far = y0 if side == "north" else y1
            for i in range(0, 24, 2):
                a = int(90 * (1 - i / 24))
                yy = far + (i if side == "north" else -i)
                d.rectangle([x0 + 10, yy, x1 - 10, yy + 2], fill=glow + (a,))
        else:
            far = x0 if side == "west" else x1
            for i in range(0, 24, 2):
                a = int(90 * (1 - i / 24))
                xx = far + (i if side == "west" else -i)
                d.rectangle([xx, y0 + 10, xx + 2, y1 - 10], fill=glow + (a,))
        # stone jambs and a lintel in the bright metal, and a threshold worn into the floor
        if horizontal:
            d.rectangle([x0 - 10, y0, x0, y1], fill=metal, outline=hi, width=2)
            d.rectangle([x1, y0, x1 + 10, y1], fill=metal, outline=hi, width=2)
            ly = y1 if side == "north" else y0
            d.rectangle([x0 - 10, ly - 5, x1 + 10, ly + 5], fill=hi, outline=dark, width=1)
            ty = y1 + 6 if side == "north" else y0 - 22
            d.rectangle([x0 + 8, ty, x1 - 8, ty + 16], fill=(0, 0, 0, 80))
        else:
            d.rectangle([x0, y0 - 10, x1, y0], fill=metal, outline=hi, width=2)
            d.rectangle([x0, y1, x1, y1 + 10], fill=metal, outline=hi, width=2)
            lx = x1 if side == "west" else x0
            d.rectangle([lx - 5, y0 - 10, lx + 5, y1 + 10], fill=hi, outline=dark, width=1)
            tx = x1 + 6 if side == "west" else x0 - 22
            d.rectangle([tx, y0 + 8, tx + 16, y1 - 8], fill=(0, 0, 0, 80))
        if kind == "locked":
            # bars across the opening and a padlock plate in the middle
            if horizontal:
                for x in range(x0 + 14, x1 - 8, 14):
                    d.line([x, y0 + 4, x, y1 - 4], fill=metal, width=5)
                    d.line([x - 1, y0 + 4, x - 1, y1 - 4], fill=hi, width=1)
                d.line([x0 + 6, (y0 + y1) // 2, x1 - 6, (y0 + y1) // 2], fill=metal, width=6)
            else:
                for y in range(y0 + 14, y1 - 8, 14):
                    d.line([x0 + 4, y, x1 - 4, y], fill=metal, width=5)
                    d.line([x0 + 4, y - 1, x1 - 4, y - 1], fill=hi, width=1)
                d.line([(x0 + x1) // 2, y0 + 6, (x0 + x1) // 2, y1 - 6], fill=metal, width=6)
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            d.rounded_rectangle([cx - 16, cy - 12, cx + 16, cy + 14], radius=4, fill=hi, outline=dark, width=2)
            d.ellipse([cx - 5, cy - 4, cx + 5, cy + 6], fill=dark)
            d.arc([cx - 10, cy - 24, cx + 10, cy - 4], 180, 360, fill=hi, width=4)
    for side, kind in sides.items():
        draw(side, kind)
    return pil

def shade(pil):
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
    floors, types = load_maze(temple)
    out_dir = os.path.join(FLOOR_DIR, temple)
    os.makedirs(out_dir, exist_ok=True)
    count = 0
    for (r, c), room_type in sorted(cell_types(floors, types).items()):
        rng = np.random.default_rng(zlib.crc32(f"{temple}[{r},{c}]".encode()))   # the same floor every run
        img = floor(pal, rng, room_type)
        if room_type == "wall":
            img = img * 0.35
        # Walls, doors and gates are drawn live by TempleWalls.vue so they scale to the screen;
        # the image is the floor alone, with a soft edge where the wall will stand.
        pil = shade(Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)))
        pil.save(os.path.join(out_dir, f"[{r},{c}].webp"), quality=80, method=6)
        count += 1
    print(f"{temple}: {count} cells")

def temples_without_floors():
    ids = sorted(f[:-3] for f in os.listdir(TEMPLE_DIR) if f.endswith("-temple.ts"))
    return [t for t in ids if not os.path.isdir(os.path.join(FLOOR_DIR, t))]

if __name__ == "__main__":
    temples = sys.argv[1:] or temples_without_floors()
    for t in temples:
        render(t)
