"""Procedural hometown ground, SNES style: 4px cells, 4-tone shading, dithering. The town is laid out around the
default spots of src/app/Console/MyPortal/HomeTown/HomeTown.vue: every building gets a yard, the streets run from
yard to yard, the plains road leaves through a gate at the top and the trees stay at the edges, out of the way.

Styles:  village  cobbled square with a fountain, LTTP Kakariko style
         truce    dirt lanes, picket fences and gardens, Chrono Trigger Truce style
         onett    paved streets with sidewalks and lawns, Earthbound Onett style

Usage: python3 tools/art/hometown_ground.py [style] [--seed N] [--out path]
Writes src/assets/images/backgrounds/hometown-ground.png unless --out is given."""
import argparse, math, os, random
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("style", nargs="?", default="village", choices=["village", "truce", "onett"])
ap.add_argument("--seed", type=int, default=5)
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "assets", "images", "backgrounds", "hometown-ground.png"))
args = ap.parse_args()
STYLE = args.style
random.seed(args.seed)

PX = 4; CW, CH = 256, 384                       # 1024x1536
# palettes (dark -> light)
GR = [(40, 120, 60), (64, 168, 72), (84, 196, 80), (124, 214, 96), (172, 228, 110)]
if STYLE == "onett":
    GR = [(56, 128, 72), (88, 168, 88), (112, 196, 104), (148, 216, 128), (196, 236, 160)]
SD = [(150, 100, 50), (196, 142, 74), (226, 178, 102), (240, 204, 128), (250, 226, 160)]
ST = [(72, 70, 82), (118, 116, 128), (152, 150, 160), (184, 182, 190), (216, 214, 220)]     # stone
TR = [(24, 72, 48), (40, 118, 64), (62, 156, 76), (96, 190, 88), (150, 222, 110)]
WT = [(36, 84, 160), (56, 124, 206), (90, 164, 232), (140, 200, 244), (220, 240, 252)]
BK = [(84, 46, 30), (134, 80, 48), (176, 116, 70)]
WD = [(96, 54, 30), (150, 92, 50), (196, 136, 78), (232, 184, 120)]                         # wood
SOIL = [(92, 56, 36), (122, 78, 48), (150, 100, 62)]
FLOWERS = [(250, 235, 90), (245, 120, 140), (244, 244, 250), (255, 170, 60), (180, 140, 240)]
OUT = (28, 64, 44)

cells = [[None] * CW for _ in range(CH)]
def put(x, y, c):
    if 0 <= x < CW and 0 <= y < CH: cells[y][x] = c
def get(x, y): return cells[y][x] if 0 <= x < CW and 0 <= y < CH else None
def dither(x, y): return (x + y) % 2 == 0
def h(*a): return (hash(a) & 0xffff) / 0xffff

# ---------- layout: spot centres from HomeTown.vue mapped onto the image ----------
# The background is `cover`: on a 390x844 phone the image fills the height and shows the middle 69% of its width.
K = .69
def spot(px, py): return round(CW * (.5 + (px / 100 - .5) * K)), round(CH * py / 100)
SPOTS = {name: spot(*p) for name, p in {
    "town-hall": (20, 24), "plains": (50, 20), "bank": (80, 24), "shop": (22, 48), "hospital": (78, 48),
    "hero-home": (24, 74), "old-house": (50, 72), "hotel": (76, 74)}.items()}
MID = CW // 2
ROWS = [SPOTS["town-hall"][1] + 30, SPOTS["shop"][1] + 30, SPOTS["hero-home"][1] + 30]   # streets along each row's doorsteps
FOUNTAIN = (MID, 168)
WALL_Y = 52                     # just under the HUD
ROAD_Y = 352                    # the town road under the nav

# ---------- grass ----------
MOTIFS = [
 ["........", "..d.....", ".d.d..l.", "........", ".....d..", "..l.d.d.", "........", "........"],
 ["........", ".....d..", "..l.d.d.", "........", "..d.....", ".d.d..l.", "...L....", "........"],
 ["........", "........", "...d....", "..d.d.l.", "........", "........", "........", "..L....."],
 ["........", "........", "........", "........", "........", "........", "........", "........"],
]
grass = [[GR[2] for _ in range(CW)] for _ in range(CH)]
for ty in range(0, CH, 8):
    for tx in range(0, CW, 8):
        m = random.choice(MOTIFS if STYLE != "onett" else MOTIFS[2:])   # Onett lawns are mown
        shade = random.random()
        for r in range(8):
            for c in range(8):
                ch = m[r][c]; x, y = tx + c, ty + r
                if ch == 'd': grass[y][x] = GR[1]
                elif ch == 'l': grass[y][x] = GR[3]
                elif ch == 'L': grass[y][x] = GR[4]
                elif shade < .12 and dither(x, y): grass[y][x] = GR[3]
                elif shade > .9 and dither(x, y): grass[y][x] = GR[1]
for _ in range(14):
    cx, cy, rx, ry = random.randint(0, CW), random.randint(0, 340), random.randint(14, 30), random.randint(8, 18)
    for y in range(cy - ry, cy + ry):
        for x in range(cx - rx, cx + rx):
            if 0 <= x < CW and 0 <= y < CH and math.hypot((x - cx) / rx, (y - cy) / ry) < 1 and grass[y][x] == GR[2] and dither(x, y) and random.random() < .8:
                grass[y][x] = GR[3]

# ---------- ground materials ----------
def dirt(x, y, edge, north):
    if edge: return SD[3] if north else SD[1]
    return random.choice([SD[1], SD[3], SD[4]]) if random.random() < .035 else SD[2]
def cobble(x, y, edge, north):
    if edge: return ST[0]
    row = y // 3; off = (row % 2) * 2; col = (x + off) // 4
    if y % 3 == 2 or (x + off) % 4 == 3: return ST[1]
    tone = 2 + (h(row, col) > .55) + (h(col, row) > .9)
    return ST[min(4, tone + 1)] if y % 3 == 0 and (x + off) % 4 == 0 else ST[min(4, tone)]
def flagstone(x, y, edge, north):              # the fountain square: big square slabs
    if edge: return ST[0]
    if x % 8 == 7 or y % 8 == 7: return ST[1]
    t = 2 + (h(x // 8, y // 8) > .6)
    return ST[t + 1] if (x % 8 == 0 or y % 8 == 0) else ST[t]
ASPH = [(78, 80, 96), (104, 106, 122), (120, 122, 138)]
WALK = [(150, 140, 128), (196, 186, 168), (220, 212, 194), (236, 230, 214)]
def asphalt(x, y, edge, north):
    if edge: return WALK[0]
    return ASPH[2] if h(x, y) > .93 else ASPH[1]
def sidewalk(x, y, edge, north):
    if edge: return WALK[0]
    if x % 8 == 0 or y % 8 == 0: return WALK[1]
    return WALK[3] if (x % 8 == 1 and y % 8 == 1) else WALK[2]

def paint_shape(inside, mat, outline=True, edge_w=1.0):
    """inside(x, y) -> signed distance (<0 inside). Paints mat with a dark outline and dithered shadow."""
    for y in range(CH):
        for x in range(CW):
            d = inside(x + .5, y + .5)
            if d < -edge_w: put(x, y, mat(x, y, False, False))
            elif d < 0:
                north = inside(x + .5, y - .5) > d
                put(x, y, mat(x, y, True, north))
            elif outline and d < 1 and mat in (dirt,): put(x, y, OUT if random.random() < .8 else GR[1])
            elif outline and d < 2.2 and dither(x, y) and get(x, y) is None: grass[y][x] = GR[1]

def seg_dist(x, y, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1
    t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L))
    return math.hypot(x - ax - t * dx, y - ay - t * dy)
def wobble(points, steps=16, amp=1.6):
    out = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        for i in range(steps):
            t = i / steps
            out.append((x0 + (x1 - x0) * t + math.sin(t * 3.1 + y0 * .35) * amp * (x0 == x1),
                        y0 + (y1 - y0) * t + math.cos(t * 2.7 + x0 * .3) * amp * (y0 == y1)))
    out.append(points[-1]); return out
def lanes(polys, w):
    return lambda x, y: min(seg_dist(x, y, *a, *b) for p in polys for a, b in zip(p, p[1:])) - w
def ellipse(cx, cy, rx, ry, jitter=0):
    return lambda x, y: (math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * min(rx, ry) + (random.uniform(-jitter, jitter) if jitter else 0)
def rect(x0, y0, x1, y1):
    return lambda x, y: max(x0 - x, x - x1, y0 - y, y - y1)
def rrect(x0, y0, x1, y1, r):
    cx, cy, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    def d(x, y):
        qx, qy = abs(x - cx) - hx, abs(y - cy) - hy
        return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r
    return d
def union(*fs): return lambda x, y: min(f(x, y) for f in fs)

def blob(cx, cy, rx, ry, fn, lobes=0, depth=.12):
    ph = random.random() * 6.28
    for y in range(int(cy - ry - 4), int(cy + ry + 5)):
        for x in range(int(cx - rx - 4), int(cx + rx + 5)):
            ang = math.atan2(y - cy, x - cx); m = 1 + depth * math.cos(lobes * ang + ph) if lobes else 1
            fn(x, y, math.hypot((x - cx) / (rx * m), (y - cy) / (ry * m)) + random.uniform(-.02, .02))

# ---------- props ----------
def tree(cx, cy, r, palette=TR):
    def shadow(x, y, d):
        if d < 1 and (dither(x, y) or d < .6) and get(x, y) is None: put(x, y, GR[0] if d < .6 else GR[1])
    blob(cx + 2, cy + int(r * .95), r * .9, r * .36, shadow)
    lobes = random.choice([5, 6, 7])
    def f(x, y, d):
        if d > 1.0: return
        lx, ly = (x - cx) / r, (y - cy) / r
        light = -(lx * .8 + ly) + random.uniform(-.1, .1)
        if d > .92: put(x, y, OUT); return
        if d > .78: band = 1 if light < .2 else 2
        elif light > .75: band = 4
        elif light > .35: band = 3 if not (dither(x, y) and light < .5) else 2
        elif light > -.2: band = 2 if not (dither(x, y) and light < 0) else 1
        else: band = 1
        put(x, y, palette[band])
    blob(cx, cy, r, r * .9, f, lobes=lobes, depth=.1)
    for _ in range(lobes):
        ax, ay, ar = cx + random.randint(-r // 2, r // 2), cy + random.randint(-r // 2, r // 2), random.randint(r // 3, r // 2)
        for a in range(200, 340, 8):
            px_, py_ = int(ax + ar * math.cos(math.radians(a))), int(ay + ar * math.sin(math.radians(a)) * .8)
            if get(px_, py_) in (palette[2], palette[3]): put(px_, py_, palette[1])
            if get(px_, py_ - 1) in (palette[1], palette[2]) and random.random() < .5: put(px_, py_ - 1, palette[3])
    ty = cy + int(r * .9) - 2
    for dy in range(0, 5):
        for dx in range(-2, 3):
            put(cx + dx, ty + dy, BK[0] if abs(dx) == 2 else BK[2] if dx == -1 else BK[1])

def bush(cx, cy, r, berries=False):
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
    if berries:
        for _ in range(3):
            put(cx + random.randint(-r // 2, r // 2), cy + random.randint(-r // 2, r // 3), (220, 60, 70))

def hedge(x0, x1, y):
    """A clipped hedge row, 5 cells tall."""
    for x in range(x0, x1 + 1):
        for dy in range(6):
            yy = y + dy
            if x in (x0, x1) or dy in (0, 5): put(x, yy, OUT)
            elif dy == 1: put(x, yy, TR[4] if dither(x, yy) else TR[3])
            elif dy == 4: put(x, yy, TR[1])
            else: put(x, yy, TR[3] if h(x, yy) > .3 else TR[2])
        if dither(x, y + 6) and get(x, y + 6) is None: grass[y + 6][x] = GR[0] if y + 6 < CH else GR[1]

def flower_bed(x0, y0, x1, y1, colors=None):
    colors = colors or random.sample(FLOWERS, 2)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x in (x0, x1) or y in (y0, y1): put(x, y, WD[1] if y != y1 else WD[0]); continue
            put(x, y, SOIL[1] if dither(x, y) else SOIL[2])
    for y in range(y0 + 2, y1 - 1, 3):
        for x in range(x0 + 2 + (y // 3) % 2, x1 - 1, 3):
            c = colors[(x // 3 + y // 3) % len(colors)]
            put(x, y, c); put(x, y + 1, TR[2]); put(x - 1, y + 1, TR[3]) if get(x - 1, y + 1) in (SOIL[1], SOIL[2]) else None

def picket(x0, x1, y):
    for x in range(x0, x1 + 1):
        if (x - x0) % 3 == 0:
            put(x, y - 3, WD[3]); put(x, y - 2, WD[3]); put(x, y - 1, WD[2]); put(x, y, WD[2]); put(x, y + 1, WD[1])
        else:
            put(x, y - 1, WD[3]); put(x, y + 1, WD[2])
        if get(x, y + 2) is None and dither(x, y): grass[y + 2][x] = GR[1]

def lamp(x, y):
    for dy in range(8): put(x, y - dy, ST[0] if dy else ST[0]); put(x + 1, y - dy, ST[1])
    put(x - 1, y, ST[0]); put(x + 2, y, ST[0])
    for dx in range(-1, 3):
        put(x + dx, y - 10, OUT); put(x + dx, y - 8, OUT)
    put(x, y - 9, (255, 236, 150)); put(x + 1, y - 9, (255, 214, 110)); put(x - 1, y - 9, OUT); put(x + 2, y - 9, OUT)

def fountain(cx, cy, r):
    def f(x, y, d):
        if d > 1.0: return
        if d > .88: put(x, y, ST[0])
        elif d > .74: put(x, y, ST[4] if y < cy else ST[2])
        elif d > .66: put(x, y, ST[1])
        elif d > .6: put(x, y, WT[0])
        else: put(x, y, WT[2] if not (dither(x, y) and random.random() < .3) else WT[3])
    blob(cx, cy, r, r * .8, f)
    for i in range(5):
        a = random.random() * 6.28; rr = r * random.uniform(.3, .5)
        wx, wy = int(cx + math.cos(a) * rr), int(cy + math.sin(a) * rr * .8)
        for dx in range(3): put(wx + dx, wy, WT[4])
    for y in range(cy - 4, cy + 3):     # the pillar and its spray
        for x in range(cx - 2, cx + 3):
            put(x, y, ST[0] if abs(x - cx) == 2 else ST[3] if x < cx else ST[2])
    for x, y in [(cx, cy - 8), (cx - 1, cy - 7), (cx + 1, cy - 7), (cx, cy - 6), (cx - 3, cy - 6), (cx + 3, cy - 6), (cx - 4, cy - 4), (cx + 4, cy - 4), (cx, cy - 5)]:
        put(x, y, WT[4] if (x + y) % 2 else (255, 255, 255))

def gate(cx, y, half):
    """Two stone gate posts where the plains road leaves town."""
    for px in (cx - half - 4, cx + half + 1):
        for dy in range(-12, 4):
            for dx in range(4):
                put(px + dx, y + dy, ST[0] if dx in (0, 3) or dy in (-12, 3) else ST[3] if dx == 1 else ST[2])
        for dx in range(-1, 5): put(px + dx, y - 13, OUT); put(px + dx, y - 12, ST[4])

def bottom_road(mat):
    for y in range(ROAD_Y, CH):
        for x in range(CW):
            if y == ROAD_Y: put(x, y, OUT)
            elif y == CH - 1: put(x, y, OUT)
            elif y == ROAD_Y + 1: put(x, y, mat(x, y, True, True))
            else: put(x, y, mat(x, y, False, False))
    for sx in random.sample(range(4, CW - 4, 6), 14):
        put(sx, ROAD_Y - 2, ST[3]); put(sx + 1, ROAD_Y - 2, ST[2]); put(sx, ROAD_Y - 1, ST[1]); put(sx + 1, ROAD_Y - 1, ST[1])

def free(cx, cy, r):
    return all(get(x, y) is None for y in range(cy - r, cy + r + 1) for x in range(cx - r, cx + r + 1) if 0 <= x < CW and 0 <= y < CH)
def edge_trees(n, xmin_vis=36, xmax_vis=220, rmin=16, rmax=24):
    placed = tries = 0
    while placed < n and tries < 6000:
        tries += 1; r = random.randint(rmin, rmax)
        cx = random.choice([random.randint(-6, xmin_vis - r // 2), random.randint(xmax_vis + r // 2, CW + 6)])
        cy = random.randint(4, ROAD_Y - r - 6)
        if free(cx, cy, r): tree(cx, cy, r); placed += 1
def sprinkle_flowers(n, ymax=ROAD_Y - 6):
    for _ in range(n):
        col = random.choice(FLOWERS)
        cx, cy = random.randint(2, CW - 3), random.randint(2, ymax)
        if all(get(cx + dx, cy + dy) is None for dx in (-1, 0, 1, 2) for dy in (-1, 0, 1, 2)):
            grass[cy][cx] = col; grass[cy][cx + 1] = col; grass[cy + 1][cx] = col
            grass[cy + 1][cx + 1] = tuple(max(0, v - 40) for v in col); grass[cy + 2][cx] = GR[1]

# ---------- the three towns ----------
def yard_shape(name, rx=26, ry=18):
    x, y = SPOTS[name]
    return ellipse(x, y + 10, rx, ry)

DOORS = [("town-hall", 0), ("bank", 0), ("shop", 1), ("hospital", 1), ("hero-home", 2), ("hotel", 2), ("old-house", 2)]
def forecourt(name, row, w=24, r=8):
    x, y = SPOTS[name]
    return rrect(x - w, y - 6, x + w, ROWS[row] + 2, r)

def town_wall(y, gap):
    """A low crenellated stone wall across the top with an opening for the plains road."""
    for x in range(CW):
        if abs(x - MID) <= gap: continue
        for dy in range(-6, 3):
            yy = y + dy
            if dy == -6: put(x, yy, OUT if x % 6 < 3 else None) if x % 6 < 3 else None
            elif dy == -5 and x % 6 >= 3: continue
            elif dy == -5: put(x, yy, ST[4])
            elif dy in (-4, 2): put(x, yy, OUT if dy == 2 else ST[4])
            else:
                row = (yy - y) // 2; off = (row % 2) * 3
                put(x, yy, ST[1] if (x + off) % 6 == 0 or yy % 2 == 0 else ST[3] if dy < -1 else ST[2])
        if dither(x, y + 3) and get(x, y + 3) is None: grass[y + 3][x] = GR[0]

if STYLE == "village":
    # cobbled streets from forecourt to forecourt, a flagstone square with a fountain in the middle of town
    streets = [[(MID, -4), (MID, ROAD_Y)]] + [[(SPOTS["town-hall"][0] - 16, r), (SPOTS["bank"][0] + 16, r)] for r in ROWS]
    yards = union(*[forecourt(n, row) for n, row in DOORS if n != "old-house"])
    paint_shape(union(lanes(streets, 6), yards), cobble)
    paint_shape(rrect(MID - 30, FOUNTAIN[1] - 22, MID + 30, FOUNTAIN[1] + 22, 6), flagstone)
    fountain(*FOUNTAIN, 15)
    town_wall(WALL_Y, 9)
    gate(MID, WALL_Y, 8)
    bottom_road(cobble)
    for x in (MID - 34, MID + 33):
        lamp(x, FOUNTAIN[1] - 20); lamp(x, FOUNTAIN[1] + 26)
    for r in ROWS:
        lamp(MID - 12, r - 9); lamp(MID + 11, r - 9)
    # gardens in the gaps either side of the square and between the rows
    flower_bed(MID - 64, FOUNTAIN[1] - 2, MID - 42, FOUNTAIN[1] + 10)
    flower_bed(MID + 42, FOUNTAIN[1] - 2, MID + 64, FOUNTAIN[1] + 10)
    hedge(40, 100, ROWS[1] + 14); hedge(156, 216, ROWS[1] + 14)
    flower_bed(MID - 18, 268, MID + 18, 290, [FLOWERS[1], FLOWERS[0]])
    hedge(40, 100, ROWS[2] + 14); hedge(156, 216, ROWS[2] + 14)
    for x in range(6, CW, 28):          # a row of trees along the outside of the wall
        if abs(x - MID) > 24: tree(x, WALL_Y - 22, 12)
    edge_trees(12)
    for _ in range(14):
        cx, cy = random.randint(36, 220), random.randint(40, 340)
        if free(cx, cy, 9): bush(cx, cy, random.randint(5, 7), berries=random.random() < .3)
    sprinkle_flowers(60)

elif STYLE == "truce":
    # dirt lanes, fenced yards and vegetable gardens, a pond by the bank
    streets = [wobble([(MID, -4), (MID, 60), (MID, 140), (MID, 230), (MID, ROAD_Y)])] \
        + [wobble([(SPOTS["town-hall"][0] - 10, r), (MID, r), (SPOTS["bank"][0] + 10, r)]) for r in ROWS]
    yards = union(*[ellipse(SPOTS[n][0], (SPOTS[n][1] + ROWS[row]) / 2 + 4, 24, 20, jitter=.4) for n, row in DOORS if n != "old-house"])
    paint_shape(union(lanes(streets, 5.4), yards, ellipse(MID, FOUNTAIN[1], 18, 12, .4)), dirt)
    bottom_road(dirt)
    # a well in the little square
    def well(cx, cy):
        blob(cx, cy, 8, 6, lambda x, y, d: put(x, y, ST[0] if .8 < d <= 1 else ST[3] if .55 < d <= .8 and y < cy else ST[2] if .55 < d <= .8 else (20, 30, 60) if d <= .55 else None) if d <= 1 else None)
        for dy in range(-10, 0): put(cx - 7, cy + dy, WD[1]); put(cx + 7, cy + dy, WD[1])
        for dx in range(-9, 10): put(cx + dx, cy - 11, WD[0] if dx in (-9, 9) else WD[2]); put(cx + dx, cy - 12, WD[3])
    well(*FOUNTAIN)
    for n, row in DOORS:
        if n == "old-house": continue
        x = SPOTS[n][0]
        picket(x - 34, x - 24, ROWS[row] - 10); picket(x + 24, x + 34, ROWS[row] - 10)
    flower_bed(MID - 64, 156, MID - 36, 176, [FLOWERS[3], FLOWERS[0]])
    flower_bed(MID + 36, 156, MID + 64, 176, [FLOWERS[1], FLOWERS[2]])
    def veg_patch(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                put(x, y, SOIL[0] if y % 4 == 0 else SOIL[1] if dither(x, y) else SOIL[2])
        for y in range(y0 + 2, y1, 4):
            for x in range(x0 + 2, x1 - 1, 4):
                put(x, y, TR[3]); put(x + 1, y, TR[2]); put(x, y - 1, TR[4])
                if random.random() < .35: put(x + 1, y - 1, (240, 120, 40))
        picket(x0 - 1, x1 + 1, y0 - 2)
    veg_patch(MID - 18, 250, MID + 18, 270)
    for x0, x1 in ((40, 104), (152, 216)): picket(x0, x1, ROWS[2] + 22)
    PCX, PCY = 212, 150
    def pond(x, y, d):
        if d < .62: put(x, y, WT[2] if not (dither(x, y) and random.random() < .25) else WT[3])
        elif d < .84: put(x, y, WT[1] if dither(x, y) or random.random() < .5 else WT[2])
        elif d < .93: put(x, y, WT[0])
        elif d < 1.02: put(x, y, SD[1] if y > PCY else SD[3])
        elif d < 1.12: put(x, y, OUT)
        elif d < 1.3 and dither(x, y) and get(x, y) is None: grass[y][x] = GR[1]
    blob(PCX, PCY, 18, 11, pond, lobes=3, depth=.08)
    for lx, ly in [(PCX - 6, PCY + 3), (PCX + 5, PCY - 3)]:
        for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1), (2, 0)]: put(lx + dx, ly + dy, TR[3] if dy == 0 else TR[2])
        put(lx + 1, ly - 1, (250, 150, 180))
    edge_trees(14)
    for _ in range(16):
        cx, cy = random.randint(36, 220), random.randint(10, 340)
        if free(cx, cy, 9): bush(cx, cy, random.randint(5, 8), berries=random.random() < .4)
    sprinkle_flowers(90)

else:  # onett
    # asphalt streets with sidewalks on a grid, concrete lots under the buildings, street trees, a park in the middle
    road_w, walk_w = 5, 4
    streets = [[(MID, -4), (MID, ROAD_Y)]] + [[(-4, r), (CW + 4, r)] for r in ROWS]
    lots = union(*[forecourt(n, row, 25, 4) for n, row in DOORS])
    paint_shape(union(lanes(streets, road_w + walk_w), lots), sidewalk)
    paint_shape(lanes(streets, road_w), asphalt, outline=False)
    for r in ROWS:   # dashed centre lines
        for x in range(0, CW):
            if x % 10 < 5 and abs(x - MID) > road_w + 6: put(x, r, (236, 222, 120))
    for y in range(0, ROAD_Y):
        if y % 10 < 5 and all(abs(y - r) > road_w + 6 for r in ROWS): put(MID, y, (236, 222, 120))
    for r in ROWS:   # zebra crossings either side of each junction
        for k in range(-road_w + 1, road_w):
            for y in (r - road_w - walk_w - 4, r + road_w + walk_w + 2):
                if k % 2 == 0: put(MID + k, y, WALK[3]); put(MID + k, y + 1, WALK[3])
    bottom_road(asphalt)
    # the park: a pond, benches and a ring of trees in the middle block
    PCX, PCY = MID, FOUNTAIN[1]
    paint_shape(rrect(MID - 40, PCY - 24, MID + 40, PCY + 22, 10), lambda x, y, e, n: GR[0] if e else (GR[3] if dither(x, y) else GR[2]))
    def pond(x, y, d):
        if d < .62: put(x, y, WT[2] if not (dither(x, y) and random.random() < .25) else WT[3])
        elif d < .84: put(x, y, WT[1] if dither(x, y) or random.random() < .5 else WT[2])
        elif d < .93: put(x, y, WT[0])
        elif d < 1.08: put(x, y, ST[3] if y < PCY else ST[1])
        elif d < 1.16: put(x, y, ST[0])
    blob(PCX, PCY + 2, 16, 10, pond, lobes=3, depth=.06)
    for bx in (MID - 34, MID + 26):
        for dx in range(8): put(bx + dx, PCY + 14, WD[3]); put(bx + dx, PCY + 15, WD[1]); put(bx + dx, PCY + 16, OUT if dx in (0, 7) else None) if dx in (0, 7) else None
    for tx, ty in [(MID - 30, PCY - 14), (MID + 30, PCY - 14)]: tree(tx, ty, 8)
    for x in range(40, 222, 26):          # street trees on the sidewalk verges
        if abs(x - MID) > 18:
            for r in ROWS[1:]: bush(x, r + road_w + walk_w + 7, 5)
    for x in range(52, 222, 52):
        if abs(x - MID) > 18:
            for r in ROWS: lamp(x, r - road_w - walk_w - 1)
    hedge(36, 100, ROWS[1] + 22); hedge(156, 220, ROWS[1] + 22)
    flower_bed(MID - 20, 262, MID + 20, 280, [FLOWERS[0], FLOWERS[4]])
    edge_trees(10)
    sprinkle_flowers(40)

# ---------- render ----------
img = Image.new('RGB', (CW * PX, CH * PX)); px = img.load()
for y in range(CH):
    for x in range(CW):
        c = cells[y][x] or grass[y][x]
        for yy in range(PX):
            for xx in range(PX):
                px[x * PX + xx, y * PX + yy] = c
img.save(args.out)
print(args.out)
