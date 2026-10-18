"""Hometown ground: a modern, high-res take on Earthbound's Onett. Crisp 2px pixels, flat colour ramps, one dark
outline per shape, soft see-through shadows and a gentle sunlight wash; no dithering or speckle. The town is laid out
around the default spots of src/app/Console/MyPortal/HomeTown/HomeTown.vue: every building gets a lot on a paved
street grid, a park sits in the middle of town, the plains road leaves at the top and the trees frame the edges.

Usage: python3 tools/art/hometown_ground.py [--out path]
Writes src/assets/images/backgrounds/hometown-ground.png unless --out is given."""
import argparse, math, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "images", "backgrounds", "hometown-ground.png"))
args = ap.parse_args()

PX = 2; CW, CH = 512, 768                        # drawn on a 512x768 grid, scaled 2x to 1024x1536

INK = (40, 46, 62)
LAWN = [(98, 170, 98), (116, 190, 106), (124, 198, 112), (150, 214, 126)]   # shade, base, patch, tuft tip
PARK = [(84, 156, 92), (104, 180, 102), (112, 188, 108)]
ASPH, ASPH_EDGE, ASPH_LIGHT, LINE = (92, 98, 118), (72, 78, 96), (106, 112, 132), (244, 214, 100)
WALK, WALK_GROUT, CURB = (228, 220, 204), (208, 200, 184), (160, 152, 146)
LOT, LOT_GROUT = (238, 232, 218), (216, 208, 192)
LEAF = [(34, 92, 70), (56, 132, 82), (82, 164, 92), (124, 198, 108), (182, 232, 140)]
TRUNK = [(86, 56, 42), (128, 86, 58)]
WATER = [(52, 112, 188), (78, 150, 220), (120, 186, 238), (210, 238, 250)]
WOOD = [(110, 70, 46), (170, 118, 74), (206, 156, 100)]
SOIL = [(112, 76, 56), (138, 96, 68)]
FLOWERS = [(252, 226, 92), (242, 112, 146), (252, 252, 252), (176, 138, 238), (255, 168, 76)]
SHADOW = (24, 40, 56, 70)

# ---------- layout: spot centres from HomeTown.vue mapped onto the image ----------
# The background is `cover`: on a 390x844 phone the image fills the height and shows the middle 69% of its width.
K = .69
def spot(px, py): return round(CW * (.5 + (px / 100 - .5) * K)), round(CH * py / 100)
SPOTS = {name: spot(*p) for name, p in {
    "town-hall": (20, 24), "plains": (50, 20), "bank": (80, 24), "shop": (22, 48), "hospital": (78, 48),
    "hero-home": (24, 74), "old-house": (50, 72), "hotel": (76, 74)}.items()}
MID = CW // 2
ROWS = [SPOTS["town-hall"][1] + 60, SPOTS["shop"][1] + 60, SPOTS["hero-home"][1] + 60]   # streets along each row's doorsteps
ROAD_Y = 704                                     # the town road under the nav
ROAD_W, WALK_W = 11, 9                           # half widths
PARK_C = (MID, 310)
DOORS = [("town-hall", 0), ("bank", 0), ("shop", 1), ("hospital", 1), ("hero-home", 2), ("hotel", 2)]   # the Old House stands on the main street

def rnd(i):                                      # deterministic 0..1 noise, so every run paints the same town
    return (math.sin(i * 12.9898) * 43758.5453) % 1

img = Image.new("RGB", (CW, CH), LAWN[1]); d = ImageDraw.Draw(img)

# ---------- lawn: broad lighter patches and sparse grass tufts ----------
for i in range(26):
    cx, cy, rx, ry = rnd(i) * CW, rnd(i + 99) * CH, 30 + rnd(i + 7) * 50, 16 + rnd(i + 3) * 24
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=LAWN[2])
for i in range(260):
    x, y = int(rnd(i + 500) * CW), int(rnd(i + 900) * CH)
    d.point([(x, y), (x + 2, y), (x + 1, y - 1)], fill=LAWN[0]); d.point([(x + 1, y - 2)], fill=LAWN[3])

def walk_tiles(x0, y0, x1, y1, fill=WALK, grout=WALK_GROUT, step=12):
    d.rectangle([x0, y0, x1, y1], fill=fill)
    for x in range((x0 // step + 1) * step, x1, step): d.line([x, y0, x, y1], fill=grout)
    for y in range((y0 // step + 1) * step, y1, step): d.line([x0, y, x1, y], fill=grout)
    d.line([x0, y1, x1, y1], fill=CURB); d.line([x0, y1 + 1, x1, y1 + 1], fill=LAWN[0])

# ---------- lots, sidewalks, streets ----------
for n, row in DOORS:
    x, y = SPOTS[n]
    walk_tiles(x - 50, y - 14, x + 50, ROWS[row] - ROAD_W - WALK_W, LOT, LOT_GROUT, 16)
    d.rectangle([x - 50, y - 14, x + 50, y - 14], fill=CURB)
for r in ROWS:
    walk_tiles(-2, r - ROAD_W - WALK_W, CW + 2, r + ROAD_W + WALK_W)
walk_tiles(MID - ROAD_W - WALK_W, -2, MID + ROAD_W + WALK_W, ROAD_Y)
def asphalt(x0, y0, x1, y1):
    d.rectangle([x0, y0, x1, y1], fill=ASPH)
for r in ROWS:
    asphalt(-2, r - ROAD_W, CW + 2, r + ROAD_W)
    d.line([0, r - ROAD_W, CW, r - ROAD_W], fill=ASPH_EDGE); d.line([0, r - ROAD_W + 1, CW, r - ROAD_W + 1], fill=ASPH_LIGHT)
    d.line([0, r + ROAD_W, CW, r + ROAD_W], fill=ASPH_EDGE)
asphalt(MID - ROAD_W, -2, MID + ROAD_W, ROAD_Y)
for y0, y1 in zip([-2] + [r + ROAD_W for r in ROWS], [r - ROAD_W for r in ROWS] + [ROAD_Y]):
    d.line([MID - ROAD_W, y0, MID - ROAD_W, y1], fill=ASPH_EDGE); d.line([MID + ROAD_W, y0, MID + ROAD_W, y1], fill=ASPH_EDGE)
for r in ROWS:                                   # centre lines, kept clear of the junctions
    for x in range(0, CW, 20):
        if abs(x + 5 - MID) > ROAD_W + 14: d.rectangle([x, r - 1, x + 9, r], fill=LINE)
for y in range(0, ROAD_Y, 20):
    if all(abs(y + 5 - r) > ROAD_W + 14 for r in ROWS): d.rectangle([MID - 1, y, MID, y + 9], fill=LINE)
for r in ROWS:                                   # zebra crossings on each side of every junction
    for side in (-1, 1):
        y0 = r + side * (ROAD_W + 3) - (6 if side < 0 else 0)
        for k in range(-ROAD_W + 3, ROAD_W - 2, 5): d.rectangle([MID + k, y0, MID + k + 2, y0 + 5], fill=WALK)
        x0 = MID + side * (ROAD_W + 3) - (6 if side < 0 else 0)
        for k in range(-ROAD_W + 3, ROAD_W - 2, 5): d.rectangle([x0, r + k, x0 + 5, r + k + 2], fill=WALK)
walk_tiles(-2, ROAD_Y - 10, CW + 2, ROAD_Y)      # the town road under the nav
asphalt(0, ROAD_Y + 1, CW, CH)
d.line([0, ROAD_Y + 1, CW, ROAD_Y + 1], fill=ASPH_EDGE); d.line([0, ROAD_Y + 2, CW, ROAD_Y + 2], fill=ASPH_LIGHT)
for x in range(0, CW, 20): d.rectangle([x, ROAD_Y + 26, x + 9, ROAD_Y + 27], fill=LINE)

# ---------- the park in the middle of town ----------
px0, py0, px1, py1 = PARK_C[0] - 62, PARK_C[1] - 36, PARK_C[0] + 62, PARK_C[1] + 36
d.rounded_rectangle([px0 - 6, py0 - 6, px1 + 6, py1 + 6], radius=18, fill=WALK, outline=CURB, width=2)
d.rounded_rectangle([px0, py0, px1, py1], radius=14, fill=PARK[1], outline=PARK[0], width=2)
for i in range(30):
    x, y = px0 + 8 + int(rnd(i + 1300) * (px1 - px0 - 16)), py0 + 8 + int(rnd(i + 1400) * (py1 - py0 - 16))
    d.point([(x, y), (x + 2, y), (x + 1, y - 1)], fill=PARK[0])
cx, cy = PARK_C[0], PARK_C[1] + 4
d.ellipse([cx - 34, cy - 18, cx + 34, cy + 20], fill=WALK, outline=CURB, width=2)
d.ellipse([cx - 28, cy - 13, cx + 28, cy + 15], fill=WATER[0], outline=INK)
d.ellipse([cx - 25, cy - 9, cx + 26, cy + 13], fill=WATER[1])
d.arc([cx - 23, cy - 10, cx + 23, cy + 11], 200, 300, fill=WATER[3], width=2)
for wx, wy, ww in [(-10, 2, 8), (8, 7, 6), (2, -4, 5)]:
    d.line([cx + wx, cy + wy, cx + wx + ww, cy + wy], fill=WATER[2], width=2)
for lx, ly in [(cx + 13, cy - 2), (cx - 16, cy + 6)]:   # lily pads
    d.ellipse([lx - 4, ly - 2, lx + 4, ly + 3], fill=LEAF[2], outline=LEAF[0])
d.point([(cx + 14, cy - 3), (cx + 15, cy - 3)], fill=FLOWERS[1])

# ---------- props: each casts a soft shadow, drawn in one see-through pass before the props ----------
props = []                                       # (sort y, shadow fn, draw fn)
def prop(y, shadow, draw): props.append((y, shadow, draw))

def tree(cx, cy, r):
    blobs = [(0, -r * .35, r * .62), (-r * .45, -r * .05, r * .55), (r * .45, -r * .05, r * .55),
             (-r * .2, r * .3, r * .5), (r * .25, r * .3, r * .5)]
    def shadow(s):
        s.ellipse([cx - r * .9 + 6, cy + r * .45, cx + r * .9 + 10, cy + r * 1.05], fill=SHADOW)
    def draw():
        d.rectangle([cx - 3, cy + r * .5, cx + 3, cy + r * .95], fill=TRUNK[1]); d.line([cx + 2, cy + r * .5, cx + 2, cy + r * .95], fill=TRUNK[0])
        for bx, by, br in blobs: d.ellipse([cx + bx - br - 2, cy + by - br - 2, cx + bx + br + 2, cy + by + br + 2], fill=LEAF[0])
        for bx, by, br in blobs: d.ellipse([cx + bx - br, cy + by - br, cx + bx + br, cy + by + br], fill=LEAF[1])
        for bx, by, br in blobs: d.ellipse([cx + bx - br * .85 - 1, cy + by - br * .9 - 1, cx + bx + br * .55, cy + by + br * .4], fill=LEAF[2])
        for bx, by, br in blobs[:3]: d.ellipse([cx + bx - br * .6, cy + by - br * .75, cx + bx + br * .05, cy + by - br * .15], fill=LEAF[3])
        for bx, by, br in blobs[:1]: d.ellipse([cx + bx - br * .45, cy + by - br * .6, cx + bx - br * .2, cy + by - br * .35], fill=LEAF[4])
    prop(cy + r, shadow, draw)

def shrub(cx, cy, r):
    def shadow(s): s.ellipse([cx - r + 3, cy, cx + r + 5, cy + r * .8], fill=SHADOW)
    def draw():
        d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r * .5 + 2], fill=LEAF[0])
        d.ellipse([cx - r, cy - r, cx + r, cy + r * .5], fill=LEAF[1])
        d.ellipse([cx - r * .9, cy - r * .9, cx + r * .4, cy + r * .1], fill=LEAF[2])
        d.ellipse([cx - r * .55, cy - r * .7, cx - r * .05, cy - r * .3], fill=LEAF[3])
    prop(cy, shadow, draw)

def hedge(x0, x1, y):
    def shadow(s): s.rectangle([x0 + 4, y + 10, x1 + 6, y + 17], fill=SHADOW)
    def draw():
        d.rounded_rectangle([x0, y, x1, y + 13], radius=6, fill=LEAF[1], outline=LEAF[0], width=2)
        d.rounded_rectangle([x0 + 2, y + 2, x1 - 2, y + 7], radius=4, fill=LEAF[2])
        d.line([x0 + 6, y + 3, x1 - 6, y + 3], fill=LEAF[3], width=1)
    prop(y + 13, shadow, draw)

def flower_bed(x0, y0, x1, y1, colors):
    def shadow(s): s.rectangle([x0 + 3, y1 - 1, x1 + 4, y1 + 4], fill=SHADOW)
    def draw():
        d.rectangle([x0, y0, x1, y1], fill=WOOD[1], outline=WOOD[0])
        d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=WOOD[2])
        d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], fill=SOIL[1])
        i = 0
        for y in range(y0 + 8, y1 - 4, 8):
            for x in range(x0 + 8 + (4 if (y // 8) % 2 else 0), x1 - 5, 8):
                d.rectangle([x - 2, y, x + 2, y + 3], fill=LEAF[1]); d.point([(x - 2, y), (x + 2, y)], fill=LEAF[2])
                c = colors[i % len(colors)]; i += 1
                d.rectangle([x - 1, y - 3, x + 1, y - 1], fill=c); d.point([(x, y - 4), (x - 2, y - 2), (x + 2, y - 2)], fill=c)
                d.point([(x, y - 2)], fill=FLOWERS[0] if c != FLOWERS[0] else FLOWERS[4])
    prop(y1, shadow, draw)

def lamp(x, y):
    def shadow(s): s.ellipse([x - 3, y - 1, x + 10, y + 3], fill=SHADOW)
    def draw():
        d.rectangle([x - 2, y - 2, x + 2, y], fill=INK)
        d.rectangle([x - 1, y - 20, x, y - 2], fill=INK); d.line([x + 1, y - 20, x + 1, y - 2], fill=(84, 92, 112))
        d.rectangle([x - 4, y - 28, x + 4, y - 20], fill=(255, 240, 170), outline=INK)
        d.rectangle([x - 2, y - 26, x - 1, y - 23], fill=(255, 255, 230))
        d.rectangle([x - 5, y - 30, x + 5, y - 28], fill=INK)
    prop(y, shadow, draw)

def bench(x, y):
    def shadow(s): s.rectangle([x + 3, y + 8, x + 24, y + 12], fill=SHADOW)
    def draw():
        d.rectangle([x, y, x + 20, y + 3], fill=WOOD[1], outline=WOOD[0]); d.line([x + 1, y + 1, x + 19, y + 1], fill=WOOD[2])
        d.rectangle([x, y + 5, x + 20, y + 8], fill=WOOD[1], outline=WOOD[0])
        d.line([x + 2, y + 9, x + 2, y + 11], fill=INK); d.line([x + 18, y + 9, x + 18, y + 11], fill=INK)
    prop(y + 8, shadow, draw)

def mailbox(x, y):
    def shadow(s): s.ellipse([x - 2, y - 1, x + 9, y + 3], fill=SHADOW)
    def draw():
        d.rectangle([x, y - 10, x + 1, y], fill=INK)
        d.rounded_rectangle([x - 4, y - 17, x + 5, y - 9], radius=3, fill=(214, 76, 80), outline=INK)
        d.line([x - 2, y - 15, x + 2, y - 15], fill=(244, 140, 140))
        d.rectangle([x + 5, y - 19, x + 6, y - 14], fill=(250, 210, 80))
    prop(y, shadow, draw)

def hydrant(x, y):
    def shadow(s): s.ellipse([x - 3, y - 1, x + 7, y + 2], fill=SHADOW)
    def draw():
        d.rounded_rectangle([x - 3, y - 9, x + 3, y], radius=2, fill=(220, 72, 70), outline=INK)
        d.rectangle([x - 5, y - 6, x + 5, y - 4], fill=(220, 72, 70), outline=INK)
        d.point([(x - 1, y - 7)], fill=(250, 160, 150))
    prop(y, shadow, draw)

# the park's own dressing
bench(px0 + 6, py1 - 14); bench(px1 - 26, py1 - 14)
tree(px0 + 16, py0 + 16, 12); tree(px1 - 16, py0 + 16, 12)
lamp(px0 - 1, py1 + 4); lamp(px1 + 1, py1 + 4)
flower_bed(cx - 16, py0 + 3, cx + 16, py0 + 21, [FLOWERS[1], FLOWERS[2]])

# yards and verges
for n, row in DOORS:
    x = SPOTS[n][0]; y = ROWS[row] - ROAD_W - WALK_W - 4
    mailbox(x + 42, y); lamp(x - 44, y)
for r in ROWS:
    hydrant(MID + ROAD_W + 16, r + ROAD_W + WALK_W - 3)
for r in ROWS[1:]:
    hedge(72, 200, r + ROAD_W + WALK_W + 22); hedge(312, 440, r + ROAD_W + WALK_W + 22)
for x in (96, 160, 352, 416):
    shrub(x, ROWS[0] + ROAD_W + WALK_W + 22, 8)
for x in (110, 402):
    shrub(x, ROWS[1] + ROAD_W + WALK_W + 64, 7)

# trees framing the edges, outside the phone's view of the buildings
for x, y, r in [(16, 56, 26), (500, 66, 28), (30, 170, 24), (488, 186, 26), (12, 296, 28), (502, 318, 24),
                (32, 428, 26), (484, 448, 28), (14, 560, 24), (500, 578, 26), (38, 652, 20), (478, 656, 22),
                (148, 38, 20), (364, 36, 20), (206, 18, 14), (306, 16, 14)]:
    tree(x, y, r)

shadows = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); sd = ImageDraw.Draw(shadows)
for _, shadow, _ in props:
    layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); shadow(ImageDraw.Draw(layer))
    sd.bitmap((0, 0), layer.split()[3], fill=SHADOW)  # union, so overlapping shadows don't stack darker
img = Image.alpha_composite(img.convert("RGBA"), shadows).convert("RGB"); d = ImageDraw.Draw(img)
for _, _, draw in sorted(props, key=lambda p: p[0]): draw()

# ---------- a gentle sunlight wash: warm from the top left, cooler toward the bottom right ----------
wash = Image.new("RGBA", (CW, CH)); wp = wash.load()
for y in range(0, CH, 2):
    for x in range(0, CW, 2):
        t = (x / CW * .45 + y / CH * .55)
        c = (255, 236, 180, int(26 * (1 - t) ** 2)) if t < 1 else (0, 0, 0, 0)
        if t > .6: c = (40, 60, 110, int(30 * (t - .6) / .4))
        wp[x, y] = wp[x + 1, y] = wp[x, y + 1] = wp[x + 1, y + 1] = c
img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")

img.resize((CW * PX, CH * PX), Image.NEAREST).save(args.out)
print(args.out)
