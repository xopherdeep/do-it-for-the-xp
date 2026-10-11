"""Procedural hometown ground, SNES style (LTTP / Chrono Trigger overworld): 4px cells, 4-tone shading, dithering.
Writes src/assets/images/backgrounds/hometown-ground.png. Usage: python3 tools/art/hometown_ground.py [seed]   (the shipped image is seed 5)"""
import math, os, random, sys
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "images", "backgrounds", "hometown-ground.png")
from PIL import Image
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 5)
PX = 4; CW, CH = 256, 384                       # 1024x1536
# palettes (dark -> light)
GR = [(40, 120, 60), (64, 168, 72), (84, 196, 80), (124, 214, 96), (172, 228, 110)]
SD = [(150, 100, 50), (196, 142, 74), (226, 178, 102), (240, 204, 128), (250, 226, 160)]
TR = [(24, 72, 48), (40, 118, 64), (62, 156, 76), (96, 190, 88), (150, 222, 110)]
WT = [(36, 84, 160), (56, 124, 206), (90, 164, 232), (140, 200, 244), (220, 240, 252)]
BK = [(84, 46, 30), (134, 80, 48), (176, 116, 70)]
OUT = (28, 64, 44)
cells = [[None] * CW for _ in range(CH)]
def put(x, y, c):
    if 0 <= x < CW and 0 <= y < CH: cells[y][x] = c
def get(x, y): return cells[y][x] if 0 <= x < CW and 0 <= y < CH else None
def dither(x, y): return (x + y) % 2 == 0

# ---------- grass: tiled 8x8 motifs with 3 variants, plus flowers ----------
MOTIFS = [
 ["........", "..d.....", ".d.d..l.", "........", ".....d..", "..l.d.d.", "........", "........"],
 ["........", ".....d..", "..l.d.d.", "........", "..d.....", ".d.d..l.", "...L....", "........"],
 ["........", "........", "...d....", "..d.d.l.", "........", "........", "........", "..L....."],
 ["........", "........", "........", "........", "........", "........", "........", "........"],
]
grass = [[GR[2] for _ in range(CW)] for _ in range(CH)]
for ty in range(0, CH, 8):
    for tx in range(0, CW, 8):
        m = random.choice(MOTIFS)
        shade = random.random()
        for r in range(8):
            for c in range(8):
                ch = m[r][c]; x, y = tx + c, ty + r
                if ch == 'd': grass[y][x] = GR[1]
                elif ch == 'l': grass[y][x] = GR[3]
                elif ch == 'L': grass[y][x] = GR[4]
                elif shade < .12 and dither(x, y): grass[y][x] = GR[3]      # a lighter, sunlit tile
                elif shade > .9 and dither(x, y): grass[y][x] = GR[1]       # a shaded tile
# soft meadow patches (dithered lighter zones)
for _ in range(14):
    cx, cy, rx, ry = random.randint(0, CW), random.randint(0, 340), random.randint(14, 30), random.randint(8, 18)
    for y in range(cy - ry, cy + ry):
        for x in range(cx - rx, cx + rx):
            if 0 <= x < CW and 0 <= y < CH and math.hypot((x - cx) / rx, (y - cy) / ry) < 1 and grass[y][x] == GR[2] and dither(x, y) and random.random() < .8:
                grass[y][x] = GR[3]

# ---------- paths ----------
def wobble(points, steps=16, amp=2.4):
    out = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        for i in range(steps):
            t = i / steps
            out.append((x0 + (x1 - x0) * t + math.sin(t * 3.1 + x0 * .35) * amp, y0 + (y1 - y0) * t + math.cos(t * 2.7 + y0 * .3) * amp))
    out.append(points[-1]); return out
def dist_poly(x, y, poly):
    best = 9e9
    for (ax, ay), (bx, by) in zip(poly, poly[1:]):
        dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L)); best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
    return best
S = 2
routes = [wobble([(64, 184), (64, 148), (62, 122), (64, 96), (64, 70), (64, 58)]),
          wobble([(64, 66), (46, 68), (30, 62)]), wobble([(64, 66), (84, 68), (100, 62)]),
          wobble([(63, 104), (40, 104), (22, 100)]), wobble([(63, 104), (90, 104), (106, 100)]),
          wobble([(64, 142), (44, 144), (28, 140)]), wobble([(64, 142), (86, 144), (102, 140)]),
          wobble([(30, 62), (26, 50), (32, 40)])]
routes = [[(x * S, y * S) for x, y in r] for r in routes]
W = 5.6
dist = [[min(dist_poly(x + .5, y + .5, r) for r in routes) + random.uniform(-.3, .3) for x in range(CW)] for y in range(CH)]
for y in range(CH):
    for x in range(CW):
        d = dist[y][x]
        if y >= 352:                                        # bottom road
            if y == 352: put(x, y, OUT)
            elif y == 353: put(x, y, SD[1] if dither(x, y) else SD[2])
            elif y < 356: put(x, y, SD[3])
            elif y >= 380: put(x, y, OUT if y == 383 else SD[0] if y == 382 else SD[1])
            else: put(x, y, SD[2] if random.random() > .04 else random.choice([SD[1], SD[3]]))
            continue
        if d < W: 
            up = dist[y - 1][x] if y > 0 else d
            c = SD[2]
            if d > W - 1.2: c = SD[3] if up > d else SD[1]            # light rim on the north side, dark on the south
            elif random.random() < .035: c = random.choice([SD[1], SD[3], SD[4]])  # pebbles / sun flecks
            put(x, y, c)
        elif d < W + 1.0: put(x, y, OUT if random.random() < .8 else GR[1])
        elif d < W + 2.2 and dither(x, y): grass[y][x] = GR[1]        # dithered shadow into the grass
# a few stones along the road edge
for sx in random.sample(range(4, CW - 4, 6), 14):
    put(sx, 357, (190, 190, 180)); put(sx + 1, 357, (150, 150, 140)); put(sx, 358, (120, 120, 110)); put(sx + 1, 358, (120, 120, 110))

# ---------- pond ----------
def blob(cx, cy, rx, ry, fn, lobes=0, depth=.12):
    ph = random.random() * 6.28
    for y in range(int(cy - ry - 4), int(cy + ry + 5)):
        for x in range(int(cx - rx - 4), int(cx + rx + 5)):
            ang = math.atan2(y - cy, x - cx); m = 1 + depth * math.cos(lobes * ang + ph) if lobes else 1
            fn(x, y, math.hypot((x - cx) / (rx * m), (y - cy) / (ry * m)) + random.uniform(-.02, .02))
PCX, PCY = 44, 60
def pond(x, y, d):
    if d < .62: put(x, y, WT[2] if not (dither(x, y) and random.random() < .25) else WT[3])
    elif d < .84: put(x, y, WT[1] if dither(x, y) or random.random() < .5 else WT[2])
    elif d < .93: put(x, y, WT[0])
    elif d < 1.02: put(x, y, SD[1] if y > PCY else SD[3])
    elif d < 1.12: put(x, y, OUT)
    elif d < 1.3 and dither(x, y): grass[y][x] = GR[1]
blob(PCX, PCY, 22, 14, pond, lobes=3, depth=.08)
for i in range(6):   # wave glints
    wx, wy = PCX + random.randint(-14, 10), PCY + random.randint(-8, 6)
    for dx in range(random.randint(3, 6)): put(wx + dx, wy, WT[4] if dx % 3 != 2 else WT[3])
for lx, ly in [(PCX + 8, PCY + 5), (PCX - 12, PCY - 3)]:   # lily pads
    for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (-1, 1)]: put(lx + dx, ly + dy, TR[3] if dy == 0 else TR[2])
    put(lx + 1, ly - 1, (250, 150, 180))

# ---------- trees & bushes ----------
PLAZA = [(60, 124), (200, 124), (44, 200), (128, 200), (212, 200), (56, 280), (204, 280)]
def free(cx, cy, r):
    return all(get(x, y) is None for y in range(cy - r, cy + r + 1) for x in range(cx - r, cx + r + 1) if 0 <= x < CW and 0 <= y < CH) and cx - r > 1 and cx + r < CW - 2 and cy - r > 1 and cy + r < 346
def near_plaza(cx, cy, r): return any(math.hypot(cx - px, cy - py) < r + 30 for px, py in PLAZA)
def tree(cx, cy, r):
    def shadow(x, y, d):
        if d < 1 and (dither(x, y) or d < .6) and get(x, y) is None: put(x, y, GR[0] if d < .6 else GR[1])
    blob(cx + 2, cy + int(r * .95), r * .9, r * .36, shadow)
    lobes = random.choice([5, 6, 7]); ph = random.random() * 6.28
    def f(x, y, d):
        if d > 1.0: return
        lx, ly = (x - cx) / r, (y - cy) / r
        light = -(lx * .8 + ly) + random.uniform(-.1, .1)   # +ve toward upper left
        if d > .92: put(x, y, OUT); return
        if d > .78: band = 1 if light < .2 else 2
        elif light > .75: band = 4
        elif light > .35: band = 3 if not (dither(x, y) and light < .5) else 2
        elif light > -.2: band = 2 if not (dither(x, y) and light < 0) else 1
        else: band = 1
        put(x, y, TR[band])
    blob(cx, cy, r, r * .9, f, lobes=lobes, depth=.1)
    # inner clump outlines: a few dark arcs that read as leaf clusters
    for _ in range(lobes):
        ax, ay, ar = cx + random.randint(-r // 2, r // 2), cy + random.randint(-r // 2, r // 2), random.randint(r // 3, r // 2)
        for a in range(200, 340, 8):
            px_, py_ = int(ax + ar * math.cos(math.radians(a))), int(ay + ar * math.sin(math.radians(a)) * .8)
            if get(px_, py_) in (TR[2], TR[3]): put(px_, py_, TR[1])
            if get(px_, py_ - 1) in (TR[1], TR[2]) and random.random() < .5: put(px_, py_ - 1, TR[3])
    ty = cy + int(r * .9) - 2
    for dy in range(0, 6):
        for dx in range(-2, 3):
            put(cx + dx, ty + dy, BK[0] if abs(dx) == 2 else BK[2] if dx == -1 else BK[1])
    put(cx - 3, ty + 5, BK[0]); put(cx + 3, ty + 5, BK[0]); put(cx - 3, ty + 4, BK[1]); put(cx + 3, ty + 4, BK[1])
def bush(cx, cy, r):
    def f(x, y, d):
        lx, ly = (x - cx) / r, (y - cy) / r; light = -(lx * .8 + ly)
        if d > 1.0: 
            if d < 1.14 and y > cy and dither(x, y) and get(x, y) is None: put(x, y, GR[1])
            return
        if d > .86: put(x, y, OUT)
        elif light > .5: put(x, y, TR[4] if random.random() < .5 else TR[3])
        elif light > -.1: put(x, y, TR[3] if not dither(x, y) else TR[2])
        else: put(x, y, TR[2] if not dither(x, y) else TR[1])
    blob(cx, cy, r, r * .8, f, lobes=4, depth=.16)
placed = tries = 0
while placed < 9 and tries < 8000:
    tries += 1; r = random.randint(18, 26); cx, cy = random.randint(0, CW), random.randint(0, 340)
    if free(cx, cy, r + 3) and not near_plaza(cx, cy, r): tree(cx, cy, r); placed += 1
placed = tries = 0
while placed < 18 and tries < 8000:
    tries += 1; r = random.randint(6, 9); cx, cy = random.randint(0, CW), random.randint(0, 340)
    if free(cx, cy, r + 2) and not near_plaza(cx, cy, r - 4): bush(cx, cy, r); placed += 1
# flowers in the open
for _ in range(70):
    col = random.choice([(250, 235, 90), (245, 120, 140), (244, 244, 250), (255, 170, 60), (180, 140, 240)])
    cx, cy = random.randint(2, CW - 3), random.randint(2, 344)
    if all(get(cx + dx, cy + dy) is None for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
        grass[cy][cx] = col; grass[cy][cx + 1] = col; grass[cy + 1][cx] = col; grass[cy + 1][cx + 1] = col
        grass[cy + 1][cx + 1] = tuple(max(0, v - 40) for v in col); grass[cy + 2][cx] = GR[1]; grass[cy][cx - 1] = GR[3]

# ---------- render ----------
img = Image.new('RGB', (CW * PX, CH * PX)); px = img.load()
for y in range(CH):
    for x in range(CW):
        c = cells[y][x] or grass[y][x]
        for yy in range(PX):
            for xx in range(PX):
                px[x * PX + xx, y * PX + yy] = c
img.save(OUT_PATH)

print('ok')
