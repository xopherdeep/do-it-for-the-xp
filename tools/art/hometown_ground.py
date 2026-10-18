"""Hometown ground as a voxel diorama: the ground itself is made of blocks, like the buildings that stand on it.
Each building sits on its own raised grass terrace with a stone stair down to the sand paths, a river crosses the
middle of town under a plank bridge, a pond and an orchard fill the gap before the homes, and cliffs with trees frame
the edges. Soft pastel light from the top left; no dithering.

Usage: python3 tools/art/hometown_ground.py [--out path]
Writes src/assets/images/backgrounds/hometown-ground.png unless --out is given."""
import argparse, math, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "images", "backgrounds", "hometown-ground.png"))
args = ap.parse_args()

PX = 2; CW, CH = 512, 768; C = 16; COLS, ROWS = CW // C, CH // C      # 32 x 48 cells, 16px each, scaled 2x
LIFT = 8                                                              # pixels one level of height lifts a cell

GRASS = [(116, 196, 110), (124, 204, 116)]            # checker on the ground level
GRASS_HI = [(126, 206, 118), (138, 216, 126)]         # on terraces
GRASS_LO = (96, 172, 98)                              # in the shade of a cliff
DIRT = [(176, 130, 88), (150, 106, 70), (124, 86, 58)]  # cliff face: top band, body, foot
SAND = [(238, 222, 176), (224, 204, 156)]
STONE = [(196, 192, 188), (168, 164, 160), (140, 136, 134)]
WATER = [(86, 194, 222), (70, 172, 206), (196, 240, 246)]
WOOD = [(184, 134, 84), (150, 104, 62), (112, 76, 46)]
LEAF = [(58, 142, 88), (88, 178, 100), (142, 216, 122)]
INK = (56, 60, 72)
FLOWERS = [(252, 226, 96), (244, 118, 148), (252, 252, 252), (178, 142, 238), (255, 166, 80)]

# ---------- layout: HomeTown.vue default spots in cells (phone shows the middle 69% of the width) ----------
K = .69
def cell(px, py): return round(COLS * (.5 + (px / 100 - .5) * K)), round(ROWS * py / 100)
SPOTS = {n: cell(*p) for n, p in {"town-hall": (20, 24), "bank": (80, 24), "shop": (22, 48), "hospital": (78, 48),
                                  "hero-home": (24, 74), "hotel": (76, 74)}.items()}
MIDC = COLS // 2            # 16: the main path runs down cols 15..17

height = [[0.0] * COLS for _ in range(ROWS)]
kind = [["grass"] * COLS for _ in range(ROWS)]
def fill(x0, y0, x1, y1, h=None, k=None):
    for y in range(max(0, y0), min(ROWS, y1 + 1)):
        for x in range(max(0, x0), min(COLS, x1 + 1)):
            if h is not None: height[y][x] = h
            if k is not None: kind[y][x] = k

# cliffs framing the sides and the top, with the gap the plains road leaves through
fill(0, 0, 5, ROWS - 1, 2); fill(COLS - 5, 0, COLS - 1, ROWS - 1, 2)
fill(0, 0, COLS - 1, 2, 2); fill(6, 3, 8, 3, 1); fill(COLS - 8, 3, COLS - 6, 3, 1)
fill(MIDC - 3, 0, MIDC + 3, 2, 0)
# terraces: one per building, three cells of grass around the spot and a stair at the front
TERRACE = {}
for n, (cx, cy) in SPOTS.items():
    x0, y0, x1, y1 = cx - 3, cy - 3, cx + 3, cy + 2
    fill(x0, y0, x1, y1, 1); TERRACE[n] = (x0, y0, x1, y1)
    fill(cx, y1 + 1, cx, y1 + 1, .5, "stair")
# paths: the main road, and a lane along the front of each row of terraces
fill(MIDC - 1, 0, MIDC + 1, ROWS - 1, 0, "sand")
for n in ("town-hall", "shop", "hero-home"):
    y = TERRACE[n][3] + 2; fill(SPOTS[n][0] - 1, y, SPOTS[n][0] + 1, y, 0, "sand")
    fill(SPOTS[n][0], y, MIDC, y, 0, "sand")
for n in ("bank", "hospital", "hotel"):
    y = TERRACE[n][3] + 2; fill(MIDC, y, SPOTS[n][0] + 1, y, 0, "sand")
# the river, meandering across between the first two rows, with a bridge where the road crosses
RIVER_Y = TERRACE["town-hall"][3] + 3
for x in range(COLS):
    yy = RIVER_Y + (1 if math.sin(x / 3.6) > 0 else 0)
    for dy in (0, 1): fill(x, yy + dy, x, yy + dy, -1, "water")
for x in range(MIDC - 1, MIDC + 2):
    for y in range(RIVER_Y - 3, RIVER_Y + 5):
        if kind[y][x] == "water": kind[y][x] = "bridge"
# the square with the well before the homes, and orchards either side of it
PY = TERRACE["shop"][3] + 3
fill(MIDC - 3, PY, MIDC + 3, PY + 3, 0, "sand")
# the town road under the nav
fill(0, ROWS - 4, COLS - 1, ROWS - 1, 0, "stone")

img = Image.new("RGB", (CW, CH)); d = ImageDraw.Draw(img)
def H(x, y): return height[y][x] if 0 <= x < COLS and 0 <= y < ROWS else height[min(max(y, 0), ROWS - 1)][min(max(x, 0), COLS - 1)]

def top_colour(x, y):
    k, h = kind[y][x], height[y][x]
    if k == "water": return WATER[0] if (x + y) % 2 else WATER[1]
    if k == "sand": return SAND[(x + y) % 2]
    if k == "stone": return STONE[0] if (x + y) % 2 else STONE[1]
    if k == "stair": return STONE[0]
    if k == "bridge": return WOOD[0]
    if H(x, y - 1) > h or H(x - 1, y) > h: return GRASS_LO
    return (GRASS_HI if h >= 1 else GRASS)[(x + y) % 2]

for y in range(ROWS):                         # back to front, so nearer faces cover what is behind them
    for x in range(COLS):
        h = height[y][x]; k = kind[y][x]
        top = y * C - h * LIFT
        below = H(x, y + 1) if y + 1 < ROWS else h
        if h > below:                          # the face down to the cell in front
            face_h = (h - below) * LIFT
            d.rectangle([x * C, top + C, x * C + C - 1, top + C + face_h - 1], fill=DIRT[1])
            d.rectangle([x * C, top + C, x * C + C - 1, top + C + 1], fill=DIRT[0])
            d.line([x * C, top + C + face_h - 1, x * C + C - 1, top + C + face_h - 1], fill=DIRT[2])
            if k == "stair":
                d.rectangle([x * C, top + C, x * C + C - 1, top + C + face_h - 1], fill=STONE[2])
        d.rectangle([x * C, top, x * C + C - 1, top + C - 1], fill=top_colour(x, y))
        if k == "stair":                       # two treads
            d.rectangle([x * C, top + 8, x * C + C - 1, top + C - 1], fill=STONE[1])
            d.line([x * C, top + 8, x * C + C - 1, top + 8], fill=STONE[2]); d.line([x * C, top, x * C + C - 1, top], fill=(224, 222, 218))
        if k == "water":
            if (x * 7 + y * 3) % 5 == 0: d.line([x * C + 3, top + 6, x * C + 10, top + 6], fill=WATER[2], width=1)
        if k == "bridge":
            for py in range(top + 1, top + C, 4): d.line([x * C, py, x * C + C - 1, py], fill=WOOD[1])
            if x == MIDC - 1: d.rectangle([x * C, top, x * C + 1, top + C - 1], fill=WOOD[2])
            if x == MIDC + 1: d.rectangle([x * C + C - 2, top, x * C + C - 1, top + C - 1], fill=WOOD[2])
        # the shade a taller neighbour throws across this cell
        if H(x, y - 1) > h and k in ("grass", "sand", "stone"):
            c = top_colour(x, y); d.rectangle([x * C, top, x * C + C - 1, top + 3], fill=tuple(int(v * .82) for v in c))
        if H(x - 1, y) > h and k in ("grass", "sand", "stone"):
            c = top_colour(x, y); d.rectangle([x * C, top, x * C + 3, top + C - 1], fill=tuple(int(v * .86) for v in c))
        # bevels: light on the edges that face the sun, dark on the edges that drop away
        if k in ("grass", "sand", "stone") and h >= 0:
            c = top_colour(x, y); lit = tuple(min(255, int(v * 1.14)) for v in c); dark = tuple(int(v * .78) for v in c)
            if H(x - 1, y) < h: d.rectangle([x * C, top, x * C + 1, top + C - 1], fill=lit)
            if H(x, y - 1) < h: d.rectangle([x * C, top, x * C + C - 1, top + 1], fill=lit)
            if H(x + 1, y) < h: d.rectangle([x * C + C - 2, top, x * C + C - 1, top + C - 1], fill=dark)
            if h > below: d.line([x * C, top + C - 1, x * C + C - 1, top + C - 1], fill=dark)

# ---------- props ----------
def gy(x, y): return y * C - height[y][x] * LIFT          # the screen y of a cell's top edge
def tree(cx, cy, s=1.0):
    r = int(7 * s)
    d.ellipse([cx - r + 3, cy - 2, cx + r + 4, cy + 4], fill=tuple(int(v * .78) for v in GRASS[0]))
    d.rectangle([cx - 2, cy - int(10 * s), cx + 2, cy], fill=WOOD[1]); d.line([cx + 2, cy - int(10 * s), cx + 2, cy], fill=WOOD[2])
    for i, (rr, dy, c) in enumerate([(r, 10, LEAF[0]), (int(r * .8), 15, LEAF[1]), (int(r * .5), 19, LEAF[2])]):
        yy = cy - int(dy * s)
        d.rectangle([cx - rr, yy - rr, cx + rr, yy + rr], fill=c)
        d.rectangle([cx - rr, yy + rr - 1, cx + rr, yy + rr], fill=tuple(int(v * .82) for v in c))
def bush(cx, cy):
    d.rectangle([cx - 5, cy - 6, cx + 5, cy], fill=LEAF[0]); d.rectangle([cx - 3, cy - 9, cx + 3, cy - 4], fill=LEAF[1]); d.point([(cx - 2, cy - 8)], fill=LEAF[2])
def rock(cx, cy):
    d.rectangle([cx - 4, cy - 3, cx + 4, cy + 2], fill=STONE[1]); d.rectangle([cx - 4, cy - 5, cx + 4, cy - 3], fill=STONE[0]); d.line([cx - 4, cy + 2, cx + 4, cy + 2], fill=STONE[2])
def flower(cx, cy, c):
    d.point([(cx, cy + 1)], fill=LEAF[0]); d.rectangle([cx - 1, cy - 1, cx + 1, cy], fill=c); d.point([(cx, cy - 1)], fill=(255, 255, 255))
def lantern(cx, cy):
    d.rectangle([cx - 1, cy - 12, cx, cy], fill=WOOD[2]); d.rectangle([cx - 3, cy - 17, cx + 2, cy - 12], fill=(255, 226, 140), outline=INK)
    d.ellipse([cx - 3, cy - 1, cx + 5, cy + 3], fill=tuple(int(v * .8) for v in SAND[0]))

def rnd(i): return (math.sin(i * 12.9898) * 43758.5453) % 1
# trees along the cliff tops and in the orchard, big to small so nearer ones overlap
trees = []
for x in range(COLS):
    for y in range(ROWS):
        if height[y][x] == 2 and kind[y][x] == "grass" and y < ROWS - 4:
            if (x * 3 + y * 5) % 4 == 0 and rnd(x * 31 + y) < .75: trees.append((x * C + 8 + int(rnd(x + y) * 6 - 3), gy(x, y) + 14, .9 + rnd(y * 7 + x) * .5))
for x in list(range(7, 12)) + list(range(21, 26)):
    for y in range(PY, PY + 3):
        if (x + y) % 2 == 0: trees.append((x * C + 8, gy(x, y) + 13, .85))
for cx, cy, s in sorted(trees, key=lambda t: t[1]): tree(cx, cy, s)
# the terraces: a lantern at each front corner and a few flowers; bushes on their back edge
for n, (x0, y0, x1, y1) in TERRACE.items():
    lantern(x0 * C + 8, gy(x0, y1) + 12); lantern(x1 * C + 8, gy(x1, y1) + 12)
    for i in range(5):
        fx = x0 * C + 6 + int(rnd(i * 9 + x0) * ((x1 - x0) * C)); fy = gy(x0, y1) + 3 + int(rnd(i * 5 + y1) * 10)
        flower(fx, fy, FLOWERS[(i + x0) % len(FLOWERS)])
    for x in range(x0, x1 + 1, 3): bush(x * C + 8, gy(x, y0) + 10)
# the signpost where the plains road leaves town
sx, sy = (MIDC + 2) * C + 6, gy(MIDC + 2, 3) + 12
d.rectangle([sx - 1, sy - 14, sx, sy], fill=WOOD[2]); d.rectangle([sx - 7, sy - 20, sx + 7, sy - 13], fill=WOOD[0], outline=WOOD[2]); d.line([sx - 4, sy - 17, sx + 4, sy - 17], fill=WOOD[2])
# meadow flowers, rocks and bushes in the open grass
for i in range(70):
    x, y = int(rnd(i + 300) * COLS), int(rnd(i + 700) * (ROWS - 5))
    if kind[y][x] == "grass" and height[y][x] == 0: flower(x * C + 3 + int(rnd(i) * 10), gy(x, y) + 3 + int(rnd(i + 1) * 10), FLOWERS[i % len(FLOWERS)])
for i in range(14):
    x, y = int(rnd(i + 1300) * COLS), int(rnd(i + 1700) * (ROWS - 5))
    if kind[y][x] == "grass" and height[y][x] in (0, 1) and not any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in TERRACE.values()):
        (rock if i % 3 == 0 else bush)(x * C + 8, gy(x, y) + 11)
# the well in the middle of the square
wx, wy = MIDC * C + 8, (PY + 2) * C + 4
d.ellipse([wx - 12, wy - 1, wx + 14, wy + 8], fill=tuple(int(v * .8) for v in SAND[0]))
d.ellipse([wx - 11, wy - 5, wx + 11, wy + 6], fill=STONE[2]); d.ellipse([wx - 11, wy - 7, wx + 11, wy + 4], fill=STONE[0], outline=STONE[2])
d.ellipse([wx - 7, wy - 5, wx + 7, wy + 2], fill=(52, 96, 140)); d.line([wx - 4, wy - 3, wx + 1, wy - 3], fill=WATER[2])
d.rectangle([wx - 10, wy - 22, wx - 9, wy - 4], fill=WOOD[2]); d.rectangle([wx + 9, wy - 22, wx + 10, wy - 4], fill=WOOD[2])
d.rectangle([wx - 13, wy - 27, wx + 13, wy - 22], fill=(196, 84, 72)); d.line([wx - 13, wy - 22, wx + 13, wy - 22], fill=(140, 56, 50)); d.rectangle([wx - 11, wy - 30, wx + 11, wy - 27], fill=(216, 100, 84))
d.rectangle([wx - 2, wy - 16, wx + 2, wy - 12], fill=WOOD[0], outline=WOOD[2]); d.line([wx, wy - 22, wx, wy - 16], fill=WOOD[2])

# ---------- light: warm from the top left, cooler toward the bottom ----------
wash = Image.new("RGBA", (CW, CH)); wp = wash.load()
for y in range(0, CH, 2):
    for x in range(0, CW, 2):
        t = x / CW * .4 + y / CH * .6
        c = (255, 238, 190, int(30 * (1 - t) ** 2)) if t < .6 else (40, 60, 120, int(34 * (t - .6) / .4))
        wp[x, y] = wp[x + 1, y] = wp[x, y + 1] = wp[x + 1, y + 1] = c
img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")
img.resize((CW * PX, CH * PX), Image.NEAREST).save(args.out)
print(args.out)
