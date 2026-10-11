#!/usr/bin/env python3
"""
Chore beasts for the bestiary, in the 16-bit style of portraits 041-073: an 80x80 sprite grid (6x on the
480 canvas), parts built from ellipses, blobs, polygons and strokes, each shaded from its own distance
field into five hue-shifted tones with a dithered seam, textured (fur, speckle, leaves), outlined in its
own darkest tone where it overlaps another part, and inked around the silhouette.
Each beast below is a list of parts, back to front. Numbers follow ROSTER order, so re-running never
renumbers a beast; append new ones at the end and bump the count in AvatarSelect.vue / BestiaryService.ts.
Usage: python3 beasts.py [--start 74] [--out DIR] [--sheet sheet.png] [slug ...]
"""
import argparse, colorsys, math, os, random, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT_DIR = os.path.join(ROOT, "src", "assets", "images", "beasts")
G = 80                      # sprite grid
SS = 4                      # supersampling while rasterising parts
SCALE = 6                   # 80 * 6 = 480
INK = (18, 14, 22)
DARK = (28, 20, 32)
WHITE = (248, 246, 240)
LIGHT = (-0.58, -0.68, 0.46)
_l = math.sqrt(sum(c * c for c in LIGHT)); LIGHT = tuple(c / _l for c in LIGHT)
BANDS = (-0.42, -0.16, 0.07, 0.24)   # thresholds on (lighting - flat lighting): deep, shadow, base, light, highlight
DITHER = 0.035


# --- colour ramps ------------------------------------------------------------------------------
def _toward(h, target, f):
    d = (target - h + 0.5) % 1.0 - 0.5
    return (h + d * f) % 1.0


def ramp(base):
    """Five tones: shadows darker, more saturated and pushed toward violet; lights paler, toward yellow."""
    h, s, v = colorsys.rgb_to_hsv(*[c / 255 for c in base])
    out = []
    for dv, ds, hue in ((-0.46, 0.20, _toward(h, 0.74, 0.10)), (-0.24, 0.10, _toward(h, 0.74, 0.05)), (0, 0, h),
                        (0.15, -0.14, _toward(h, 0.14, 0.04)), (0.30, -0.34, _toward(h, 0.14, 0.08))):
        out.append(tuple(int(round(c * 255)) for c in colorsys.hsv_to_rgb(hue, min(1, max(0, s + ds)), min(1, max(0, v + dv)))))
    return out


# --- parts ---------------------------------------------------------------------------------------
def E(cx, cy, rx, ry, col, rot=0, **kw):
    pts = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        x, y = rx * math.cos(a), ry * math.sin(a)
        r = math.radians(rot)
        pts.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    return dict(kind="poly", pts=pts, col=col, **kw)


def B(cx, cy, rx, ry, col, seed=0, amp=0.1, **kw):
    """A blob: an ellipse whose edge wobbles, for fur, slime, cloth and piles."""
    rnd = random.Random(seed)
    waves = [(rnd.randint(3, 7), rnd.uniform(0, 6.28), rnd.uniform(0.4, 1.0)) for _ in range(3)]
    pts = []
    for i in range(72):
        a = 2 * math.pi * i / 72
        w = 1 + amp * sum(k * math.sin(f * a + p) for f, p, k in waves) / 2
        pts.append((cx + rx * w * math.cos(a), cy + ry * w * math.sin(a)))
    return dict(kind="poly", pts=pts, col=col, **kw)


def P(pts, col, **kw):
    return dict(kind="poly", pts=list(pts), col=col, **kw)


def L(pts, w, col, **kw):
    return dict(kind="line", pts=list(pts), w=w, col=col, **kw)


def R(x0, y0, x1, y1, col, r=0, rot=0, **kw):
    cx, cy, hw, hh = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    pts = []
    corners = [(hw - r, hh - r, 0), (-hw + r, hh - r, 90), (-hw + r, -hh + r, 180), (hw - r, -hh + r, 270)]
    for ox, oy, start in corners:
        for i in range(7):
            a = math.radians(start + 90 * i / 6)
            pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    rr = math.radians(rot)
    pts = [(cx + x * math.cos(rr) - y * math.sin(rr), cy + x * math.sin(rr) + y * math.cos(rr)) for x, y in pts]
    return dict(kind="poly", pts=pts, col=col, **kw)


def T(cx, cy, w, h, col, rot=0, **kw):
    """An isosceles triangle pointing up (rotate for other directions), e.g. teeth, horns, pencil tips."""
    pts = [(-w / 2, h / 2), (w / 2, h / 2), (0, -h / 2)]
    rr = math.radians(rot)
    pts = [(cx + x * math.cos(rr) - y * math.sin(rr), cy + x * math.sin(rr) + y * math.cos(rr)) for x, y in pts]
    return dict(kind="poly", pts=pts, col=col, **kw)


def eye(cx, cy, r, white=WHITE, iris=None, look=(0.25, 0.2), pupil=DARK, slit=False):
    parts = [E(cx, cy, r, r * 1.1, white, flat=True, outline=True)]
    if iris:
        parts.append(E(cx + look[0] * r * 0.5, cy + look[1] * r * 0.5, r * 0.62, r * 0.68, iris, flat=True))
    px, py = cx + look[0] * r * 0.55, cy + look[1] * r * 0.55
    parts.append(E(px, py, r * (0.2 if slit else 0.42), r * (0.75 if slit else 0.46), pupil, flat=True))
    parts.append(E(cx - r * 0.35, cy - r * 0.4, max(0.7, r * 0.2), max(0.7, r * 0.2), WHITE, flat=True))
    return parts


def brow(cx, cy, r, col=DARK, angry=1):
    """A brow over an eye; angry=1 slopes down toward the centre line (pass -1 for the right eye)."""
    return [L([(cx - r * angry, cy - r * 1.35), (cx + r * angry, cy - r * 0.8)], 1.6, col, flat=True)]


def teeth(x0, x1, y, n, h=3.5, col=WHITE, down=True):
    step = (x1 - x0) / n
    return [T(x0 + step * (i + 0.5), y + (h / 2 if down else -h / 2), step * 0.8, h, col, rot=180 if down else 0, flat=True)
            for i in range(n)]


# --- rasterising and shading ---------------------------------------------------------------------
def rasterise(part):
    img = Image.new("L", (G * SS, G * SS), 0)
    d = ImageDraw.Draw(img)
    s = lambda p: (p[0] * SS, p[1] * SS)
    if part["kind"] == "poly":
        d.polygon([s(p) for p in part["pts"]], fill=255)
    else:
        w = part["w"] * SS
        pts = [s(p) for p in part["pts"]]
        d.line(pts, fill=255, width=int(round(w)), joint="curve")
        for x, y in pts:
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
    small = img.resize((G, G), Image.BOX)
    return [[small.getpixel((x, y)) >= 128 for x in range(G)] for y in range(G)]


def distance(mask):
    """Chamfer (3-4) distance to the nearest pixel outside the mask, in thirds of a pixel."""
    INF = 10 ** 6
    d = [[0 if not mask[y][x] else INF for x in range(G)] for y in range(G)]
    for y in range(G):
        for x in range(G):
            if d[y][x] == 0:
                continue
            best = 3  # the grid edge counts as outside
            if x > 0: best = min(best, d[y][x - 1] + 3)
            if y > 0:
                best = min(best, d[y - 1][x] + 3)
                if x > 0: best = min(best, d[y - 1][x - 1] + 4)
                if x < G - 1: best = min(best, d[y - 1][x + 1] + 4)
            d[y][x] = min(d[y][x], best)
    for y in range(G - 1, -1, -1):
        for x in range(G - 1, -1, -1):
            if d[y][x] == 0:
                continue
            best = d[y][x]
            if x < G - 1: best = min(best, d[y][x + 1] + 3)
            if y < G - 1:
                best = min(best, d[y + 1][x] + 3)
                if x < G - 1: best = min(best, d[y + 1][x + 1] + 4)
                if x > 0: best = min(best, d[y + 1][x - 1] + 4)
            d[y][x] = best
    return d


def hash01(x, y, seed):
    n = (x * 374761393 + y * 668265263 + seed * 982451653) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def shade_part(part, mask, seed):
    """Band index 0..4 per pixel of the part: a dome lit from the upper left, dithered, textured."""
    dist = distance(mask)
    dmax = max(max(row) for row in dist) or 1
    bulge = part.get("bulge", 1.0)
    h = [[(math.sqrt(dist[y][x] / dmax) * bulge if mask[y][x] else 0.0) for x in range(G)] for y in range(G)]
    ys = [y for y in range(G) if any(mask[y])]
    top, bottom = ys[0], ys[-1]
    span = max(1, bottom - top)
    bands = {}
    tex = part.get("tex")
    for y in range(G):
        for x in range(G):
            if not mask[y][x]:
                continue
            hx = (h[y][min(G - 1, x + 1)] - h[y][max(0, x - 1)]) * 0.5
            hy = (h[min(G - 1, y + 1)][x] - h[max(0, y - 1)][x]) * 0.5
            nl = math.sqrt(hx * hx + hy * hy + 1)
            lit = (-hx * LIGHT[0] - hy * LIGHT[1] + LIGHT[2]) / nl - LIGHT[2]
            lit += 0.16 * (1 - 2 * (y - top) / span)          # the top of every form catches more light
            lit += part.get("lift", 0)
            band = sum(1 for t in BANDS if lit > t)
            for i, t in enumerate(BANDS):
                if abs(lit - t) < DITHER and (x + y) % 2 == 0:
                    band = i if lit > t else i + 1
            if tex:
                n = hash01(x, y, seed)
                if tex == "fur":
                    c = hash01(x // 2, y // 2, seed + 7)
                    if c < 0.22 and n < 0.7: band -= 1
                    elif c > 0.86 and n < 0.5: band += 1
                elif tex == "fluff":
                    c = hash01(x // 3, y // 3, seed + 7)
                    if c < 0.14 and n < 0.6: band -= 1
                    elif c > 0.9 and n < 0.5: band += 1
                elif tex == "speckle":
                    if n < 0.10: band -= 1
                    elif n > 0.95: band += 1
                elif tex == "slime":
                    if n < 0.05: band += 1
                    elif n > 0.97: band -= 1
                elif tex == "leaves":
                    c = hash01(x // 3, (y + (x // 3) % 2) // 2, seed + 3)
                    if c < 0.3: band -= 1
                    elif c > 0.8: band += 1
            bands[(x, y)] = max(0, min(4, band))
    return bands


def render(beast):
    parts = beast["parts"]
    masks = [rasterise(p) for p in parts]
    # clip_to: a pattern drawn on another part keeps inside it
    for i, p in enumerate(parts):
        if "clip_to" in p:
            j = p["clip_to"]
            masks[i] = [[masks[i][y][x] and masks[j][y][x] for x in range(G)] for y in range(G)]
    top = [[-1] * G for _ in range(G)]
    for i, m in enumerate(masks):
        for y in range(G):
            for x in range(G):
                if m[y][x]:
                    top[y][x] = i
    shades = {}
    for i, p in enumerate(parts):
        if p.get("flat"):
            continue
        src = p.get("shade_from", i)
        if src not in shades:
            shades[src] = shade_part(parts[src], masks[src], seed=beast.get("seed", 1) * 31 + src)
    ramps = [ramp(p["col"]) for p in parts]
    img = Image.new("RGBA", (G, G), (0, 0, 0, 0))
    px = img.load()
    for y in range(G):
        for x in range(G):
            i = top[y][x]
            if i < 0:
                continue
            p = parts[i]
            if p.get("flat"):
                col = p["col"]
                if p.get("outline"):
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        xx, yy = x + dx, y + dy
                        if not (0 <= xx < G and 0 <= yy < G) or top[yy][xx] != i:
                            col = DARK
                            break
            else:
                band = shades[p.get("shade_from", i)].get((x, y), 2)
                col = ramps[i][band]
                # sel-out: the part's own darkest tone where it sits over another part
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < G and 0 <= yy < G and top[yy][xx] not in (-1, i) and top[yy][xx] < i \
                            and parts[top[yy][xx]].get("shade_from", top[yy][xx]) != p.get("shade_from", i):
                        col = ramps[i][0]
                        break
            px[x, y] = (*col, 255)
    # ink around the silhouette
    for y in range(G):
        for x in range(G):
            if px[x, y][3]:
                continue
            if any(0 <= x + dx < G and 0 <= y + dy < G and px[x + dx, y + dy][3] and px[x + dx, y + dy][:3] != INK
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = (*INK, 255)
    return img.resize((G * SCALE, G * SCALE), Image.NEAREST)


# --- the roster ------------------------------------------------------------------------------------
def dust_bunny():
    GREY, PINK, RED = (150, 146, 160), (226, 150, 170), (222, 56, 70)
    parts = [
        E(27, 16, 6, 14, GREY, rot=-14, tex="fur"), E(27, 17, 3, 10, PINK, rot=-14),
        E(53, 16, 6, 14, GREY, rot=14, tex="fur"), E(53, 17, 3, 10, PINK, rot=14),
        B(40, 52, 26, 20, GREY, seed=1, amp=0.09, tex="fur"),
        B(40, 36, 20, 16, GREY, seed=2, amp=0.07, tex="fur"),
        E(30, 68, 7, 4, GREY, tex="fur"), E(50, 68, 7, 4, GREY, tex="fur"),
    ]
    parts += eye(32, 36, 4.2, white=RED, pupil=DARK) + eye(48, 36, 4.2, white=RED, pupil=DARK)
    parts += [E(40, 43, 2.6, 1.8, PINK, flat=True), L([(36, 46), (40, 48), (44, 46)], 1.3, DARK, flat=True),
              L([(22, 42), (33, 44)], 0.9, (210, 206, 214), flat=True), L([(22, 48), (33, 46)], 0.9, (210, 206, 214), flat=True),
              L([(58, 42), (47, 44)], 0.9, (210, 206, 214), flat=True), L([(58, 48), (47, 46)], 0.9, (210, 206, 214), flat=True)]
    return parts



def sock_gremlin():
    RED, CREAM, GOLD, MAW = (200, 62, 76), (238, 232, 218), (238, 194, 80), (72, 18, 30)
    body = P([(28, 22), (52, 22), (54, 40), (52, 54), (62, 60), (68, 66), (64, 72), (40, 72), (26, 68), (20, 58), (24, 40)], RED)
    parts = [L([(26, 42), (16, 48)], 4.5, RED), L([(54, 42), (64, 48)], 4.5, RED), body]
    parts += [P([(52, 54), (62, 60), (68, 66), (64, 72), (52, 72), (50, 62)], GOLD),
              P([(20, 58), (26, 68), (30, 72), (24, 72), (18, 64)], GOLD),
              R(28, 9, 52, 24, RED, r=2)]
    cuff = len(parts) - 1
    parts += [R(26, 14, 54, 17, CREAM, clip_to=cuff, shade_from=cuff), R(26, 20, 54, 23, CREAM, clip_to=cuff, shade_from=cuff),
              R(20, 30, 60, 33, CREAM, clip_to=2, shade_from=2),
              E(40, 9.5, 11, 4.8, MAW, flat=True)]
    parts += teeth(31, 49, 7, 4, h=4.2, col=CREAM)
    parts += eye(34, 40, 4) + eye(46, 40, 4) + brow(34, 40, 4) + brow(46, 40, 4, angry=-1)
    return parts


def dish_golem():
    CHINA, BLUE, YOLK = (236, 236, 228), (96, 136, 206), (240, 196, 80)
    parts = [R(8, 44, 20, 58, CHINA, r=2), L([(8, 48), (3, 51), (8, 55)], 2, CHINA),
             R(60, 44, 72, 58, CHINA, r=2), L([(72, 48), (77, 51), (72, 55)], 2, CHINA),
             E(40, 71, 29, 6, CHINA)]
    parts += [E(40, 71, 25, 3.5, BLUE, clip_to=4, shade_from=4)]
    parts += [E(40, 63, 26, 6, CHINA), P([(22, 44), (58, 44), (54, 60), (26, 60)], CHINA)]
    bowl = len(parts) - 1
    parts += [E(40, 39, 22, 6, CHINA)]
    plate2 = len(parts) - 1
    parts += [E(40, 39, 18, 3.6, BLUE, clip_to=plate2, shade_from=plate2), E(44, 38, 7, 1.8, YOLK, clip_to=plate2, shade_from=plate2),
              P([(28, 24), (52, 24), (49, 36), (31, 36)], CHINA), E(40, 22, 16, 4, CHINA)]
    plate1 = len(parts) - 1
    parts += [E(40, 22, 12, 2.6, BLUE, clip_to=plate1, shade_from=plate1), R(34, 8, 46, 20, CHINA, r=2), L([(46, 11), (50, 14), (46, 17)], 2, CHINA)]
    parts += eye(33, 50, 3.6) + eye(47, 50, 3.6) + brow(33, 50, 3.6) + brow(47, 50, 3.6, angry=-1)
    parts += [L([(35, 57), (40, 55), (45, 57)], 1.4, DARK, flat=True), L([(14, 50), (16, 54)], 1, (150, 150, 160), flat=True)]
    return parts


def laundry_golem():
    JEANS, SHIRT, TEE, GREEN, SOCK, GLOW = (72, 98, 164), (214, 70, 80), (236, 198, 80), (110, 178, 92), (240, 238, 232), (255, 232, 90)
    parts = [L([(14, 50), (6, 66)], 6, SHIRT), L([(66, 52), (74, 66)], 6, GREEN),
             B(40, 58, 31, 17, JEANS, seed=3, amp=0.08),
             B(26, 44, 16, 14, SHIRT, seed=4, amp=0.1), B(54, 46, 15, 13, TEE, seed=5, amp=0.1),
             B(40, 32, 17, 12, GREEN, seed=6, amp=0.1), E(52, 23, 8, 4.5, SOCK, rot=-20)]
    sock = len(parts) - 1
    parts += [R(44, 20, 60, 22, SHIRT, rot=-20, clip_to=sock, shade_from=sock),
              E(40, 47, 12, 7, DARK, flat=True),
              E(35, 47, 3, 2.6, GLOW, flat=True), E(45, 47, 3, 2.6, GLOW, flat=True),
              E(35.5, 47.3, 1.1, 1.6, DARK, flat=True), E(45.5, 47.3, 1.1, 1.6, DARK, flat=True),
              L([(40, 12), (36, 18), (28, 20)], 1.3, (180, 180, 190), flat=True), L([(40, 12), (44, 18), (52, 20)], 1.3, (180, 180, 190), flat=True),
              L([(40, 12), (40, 7), (43, 5)], 1.3, (180, 180, 190), flat=True)]
    return parts


def soap_slime():
    TEAL, OLIVE, FOAM = (84, 186, 176), (112, 142, 100), (226, 246, 240)
    body = P([(40, 10), (45, 22), (52, 30), (60, 40), (64, 52), (62, 64), (54, 71), (40, 73), (26, 71), (18, 64), (16, 52), (20, 40), (28, 30), (35, 22)], TEAL, tex="slime")
    parts = [L([(24, 70), (24, 77)], 3.2, TEAL), L([(56, 70), (57, 76)], 2.6, TEAL), body]
    b = len(parts) - 1
    parts += [B(28, 61, 8, 5, OLIVE, seed=7, amp=0.2, clip_to=b, shade_from=b), B(54, 56, 6, 4, OLIVE, seed=8, amp=0.2, clip_to=b, shade_from=b),
              E(30, 30, 4, 4, FOAM, flat=True), E(30, 30, 2.6, 2.6, TEAL, clip_to=b, shade_from=b),
              E(50, 24, 3, 3, FOAM, flat=True), E(50, 24, 1.8, 1.8, TEAL, clip_to=b, shade_from=b),
              E(22, 44, 2.4, 2.4, FOAM, flat=True), E(22, 44, 1.2, 1.2, TEAL, clip_to=b, shade_from=b)]
    parts += eye(32, 43, 5.2, look=(-0.3, 0.3)) + eye(48, 43, 5.2, look=(-0.3, 0.3))
    parts += [L([(33, 57), (40, 54), (47, 57)], 1.6, DARK, flat=True)]
    return parts


def crumb_crawler():
    CRUST, BREAD, CRUMB, RUST = (142, 90, 44), (216, 164, 92), (248, 230, 160), (96, 58, 30)
    toast = [(22, 30), (24, 22), (30, 16), (36, 18), (40, 20), (44, 18), (50, 16), (56, 22), (58, 30), (58, 60), (54, 66), (26, 66), (22, 60)]
    inner = [(26, 31), (28, 25), (32, 20), (36, 22), (40, 24), (44, 22), (48, 20), (53, 25), (54, 31), (54, 58), (51, 62), (29, 62), (26, 58)]
    parts = [L([(24, 44), (12, 40), (8, 48)], 2.6, RUST), L([(24, 52), (10, 54), (8, 62)], 2.6, RUST), L([(26, 60), (14, 68), (12, 75)], 2.6, RUST),
             L([(56, 44), (68, 40), (72, 48)], 2.6, RUST), L([(56, 52), (70, 54), (72, 62)], 2.6, RUST), L([(54, 60), (66, 68), (68, 75)], 2.6, RUST),
             L([(32, 16), (26, 8)], 1.6, RUST), L([(48, 16), (54, 8)], 1.6, RUST),
             P(toast, CRUST), P(inner, BREAD, tex="speckle")]
    parts += eye(33, 36, 4, iris=(220, 60, 50)) + eye(47, 36, 4, iris=(220, 60, 50))
    parts += [P([(31, 58), (26, 68), (36, 61)], RUST), P([(49, 58), (54, 68), (44, 61)], RUST),
              L([(34, 50), (40, 52), (46, 50)], 1.5, DARK, flat=True)]
    for x, y in ((12, 26), (70, 30), (66, 18), (16, 72), (64, 72)):
        parts.append(R(x, y, x + 3, y + 3, CRUMB, rot=20, flat=True, outline=True))
    return parts



def toothpaste_serpent():
    TUBE, BLUE, MINT, CAP, RIDGE = (238, 238, 232), (60, 120, 220), (120, 230, 170), (70, 130, 230), (50, 100, 200)
    path = [(16, 66), (28, 62), (40, 54), (46, 44), (40, 34), (30, 28), (28, 24)]
    parts = [P([(5, 66), (17, 59), (21, 70), (9, 75)], TUBE), L([(8, 67), (14, 63)], 1.2, (150, 150, 160), flat=True),
             L([(10, 71), (17, 66)], 1.2, (150, 150, 160), flat=True), L(path, 11, TUBE)]
    tube = len(parts) - 1
    parts += [L(path, 3.2, BLUE, clip_to=tube, shade_from=tube), R(18, 6, 38, 24, CAP, r=2.5)]
    cap = len(parts) - 1
    for x in (21.5, 26.5, 31.5):
        parts.append(R(x, 6, x + 1.6, 24, RIDGE, clip_to=cap, shade_from=cap))
    parts += [L([(27, 6), (30, 2), (36, 3), (40, 1)], 3, MINT), E(41, 1.6, 1.8, 1.8, MINT)]
    parts += eye(23.5, 14, 3.2) + eye(32.5, 14, 3.2) + brow(23.5, 14, 3.2) + brow(32.5, 14, 3.2, angry=-1)
    parts += [L([(25, 20), (28, 21.5), (31, 20)], 1.3, DARK, flat=True)]
    return parts


def weed_wraith():
    PUFF, GREEN, LEAF, ROOT = (236, 236, 226), (88, 164, 72), (64, 134, 56), (150, 110, 70)
    parts = [L([(40, 62), (32, 70), (28, 77)], 2.6, ROOT), L([(40, 62), (44, 70), (50, 77)], 2.6, ROOT), L([(40, 62), (40, 75)], 2.6, ROOT),
             L([(40, 40), (40, 64)], 4.2, GREEN),
             P([(40, 48), (26, 40), (16, 44), (18, 50), (28, 54)], LEAF), P([(40, 52), (54, 46), (64, 50), (62, 56), (52, 58)], LEAF),
             B(40, 26, 18, 17, PUFF, seed=9, amp=0.1, tex="fur")]
    for a in range(0, 360, 36):
        x, y = 40 + 22 * math.cos(math.radians(a)), 26 + 21 * math.sin(math.radians(a))
        parts.append(L([(x - 1.5, y), (x + 1.5, y)], 0.9, PUFF, flat=True))
        parts.append(L([(x, y - 1.5), (x, y + 1.5)], 0.9, PUFF, flat=True))
    parts += [E(34, 24, 3, 3.6, DARK, flat=True), E(46, 24, 3, 3.6, DARK, flat=True),
              E(33, 23, 1, 1, WHITE, flat=True), E(45, 23, 1, 1, WHITE, flat=True),
              P([(31, 31), (49, 31), (46, 36), (34, 36)], DARK, flat=True)]
    parts += teeth(33, 47, 31, 4, h=2.4)
    return parts


def cardboard_golem():
    TAN, TAPE, CAN, LABEL, MARK = (196, 150, 96), (222, 190, 140), (176, 180, 190), (210, 60, 60), (40, 32, 36)
    parts = [R(26, 62, 38, 75, TAN, r=1), R(42, 62, 54, 75, TAN, r=1),
             R(8, 38, 20, 58, CAN, r=2), R(8, 44, 20, 50, LABEL, clip_to=2, shade_from=2), E(14, 38, 6, 2, CAN),
             R(60, 38, 72, 58, CAN, r=2), R(60, 44, 72, 50, LABEL, clip_to=5, shade_from=5), E(66, 38, 6, 2, CAN),
             R(22, 34, 58, 62, TAN, r=1)]
    body = len(parts) - 1
    parts += [R(38, 34, 43, 62, TAPE, clip_to=body, shade_from=body), L([(22, 48), (58, 48)], 1, (150, 110, 70), flat=True),
              R(28, 12, 52, 34, TAN, r=1)]
    head = len(parts) - 1
    parts += [R(28, 12, 52, 16, TAPE, clip_to=head, shade_from=head),
              E(35, 23, 3, 3, MARK, flat=True), E(45, 23, 3, 3, MARK, flat=True), E(35, 23, 1.4, 1.4, TAN, flat=True), E(45, 23, 1.4, 1.4, TAN, flat=True),
              L([(32, 29), (35, 26), (38, 29), (41, 26), (44, 29), (47, 26)], 1.4, MARK, flat=True),
              L([(26, 54), (34, 54)], 1, MARK, flat=True), L([(26, 57), (32, 57)], 1, MARK, flat=True)]
    return parts


def leaf_pile():
    MOUND, ORANGE, RED, YELLOW, BROWN, GLOW, WOOD, STEEL = (176, 110, 50), (226, 130, 46), (200, 70, 50), (236, 190, 70), (150, 94, 50), (255, 226, 80), (140, 96, 56), (150, 150, 160)
    parts = [L([(58, 20), (64, 56)], 2.6, WOOD), P([(48, 14), (72, 18), (70, 23), (46, 19)], STEEL)]
    for x in range(49, 71, 4):
        parts.append(L([(x, 18), (x - 1, 10)], 1.2, STEEL))
    parts.append(B(40, 56, 32, 19, MOUND, seed=10, amp=0.1, tex="leaves"))
    mound = len(parts) - 1
    rnd = random.Random(11)
    for _ in range(26):
        a, r = rnd.uniform(0, 6.28), rnd.uniform(0, 1) ** 0.5
        x, y = 40 + 29 * r * math.cos(a), 56 + 16 * r * math.sin(a)
        parts.append(E(x, y, 4.2, 2.4, rnd.choice([ORANGE, RED, YELLOW, BROWN, ORANGE]), rot=rnd.uniform(-60, 60), clip_to=mound))
    parts += [E(40, 50, 12, 6, DARK, flat=True), E(34, 50, 3, 2.4, GLOW, flat=True), E(46, 50, 3, 2.4, GLOW, flat=True),
              E(34.5, 50, 0.9, 1.6, DARK, flat=True), E(46.5, 50, 0.9, 1.6, DARK, flat=True),
              E(14, 28, 3.5, 2, ORANGE, rot=30), E(70, 34, 3.5, 2, RED, rot=-40), E(24, 18, 3, 1.8, YELLOW, rot=10)]
    return parts


def mud_puppy():
    MUD, DEEP, PINK = (132, 88, 52), (104, 66, 38), (230, 100, 120)
    parts = [L([(64, 46), (72, 36), (70, 26)], 4.2, MUD), L([(30, 58), (28, 73)], 5.2, MUD), L([(38, 60), (38, 73)], 5.2, MUD),
             L([(52, 60), (52, 73)], 5.2, MUD), L([(60, 58), (62, 73)], 5.2, MUD),
             E(44, 50, 23, 13, MUD, tex="speckle"), L([(36, 62), (36, 69)], 2.2, MUD), L([(48, 63), (48, 71)], 2.2, MUD),
             E(22, 38, 13, 11, MUD, tex="speckle"), E(12, 42, 7.5, 5.5, MUD), E(28, 30, 5, 8, DEEP, rot=-20),
             L([(12, 47), (11, 54)], 2.6, PINK), E(7, 41, 2.2, 1.7, DARK, flat=True)]
    parts += eye(20, 36, 3.2, look=(-0.3, 0.1))
    parts += [L([(16, 33), (23, 31)], 1.4, DARK, flat=True)]
    return parts


def cobweb_widow():
    BLACK, RED, SILK = (46, 38, 58), (222, 40, 60), (214, 214, 226)
    parts = [L([(40, 0), (40, 24)], 1, SILK, flat=True)]
    for sgn in (-1, 1):
        for a, b, c in (((34, 40), (18, 28), (8, 38)), ((32, 44), (14, 44), (6, 56)), ((32, 48), (16, 58), (10, 70)), ((34, 52), (26, 66), (24, 77))):
            parts.append(L([(40 + sgn * (40 - a[0]), a[1]), (40 + sgn * (40 - b[0]), b[1]), (40 + sgn * (40 - c[0]), c[1])], 3, BLACK))
    parts += [E(40, 53, 17, 15, BLACK), E(40, 32, 10, 9.5, BLACK)]
    abd = len(parts) - 2
    parts += [P([(35, 47), (45, 47), (40, 53)], RED, clip_to=abd, shade_from=abd), P([(40, 53), (45, 59), (35, 59)], RED, clip_to=abd, shade_from=abd),
              E(36, 29, 2.2, 2.2, RED, flat=True), E(44, 29, 2.2, 2.2, RED, flat=True), E(32.5, 32.5, 1.5, 1.5, RED, flat=True), E(47.5, 32.5, 1.5, 1.5, RED, flat=True),
              E(35.5, 28.5, 0.8, 0.8, WHITE, flat=True), E(43.5, 28.5, 0.8, 0.8, WHITE, flat=True)]
    parts += [T(37.5, 40, 2.4, 4, WHITE, rot=180, flat=True), T(42.5, 40, 2.4, 4, WHITE, rot=180, flat=True)]
    return parts



def homework_hydra():
    PENCIL, FACET, WOOD, COVER, PAPER, RING = (244, 198, 64), (226, 176, 50), (222, 184, 130), (66, 106, 196), (240, 238, 228), (170, 170, 180)
    parts = []
    for cx, ang in ((23, -26), (40, 0), (57, 26)):
        rr = math.radians(ang)
        def rot(x, y, cx=cx, rr=rr):
            dx, dy = x - cx, y - 58
            return (cx + dx * math.cos(rr) - dy * math.sin(rr), 58 + dx * math.sin(rr) + dy * math.cos(rr))
        parts.append(P([rot(cx - 5, 58), rot(cx + 5, 58), rot(cx + 5, 22), rot(cx - 5, 22)], PENCIL))
        shaft = len(parts) - 1
        parts.append(P([rot(cx + 1.5, 58), rot(cx + 5, 58), rot(cx + 5, 22), rot(cx + 1.5, 22)], FACET, clip_to=shaft, shade_from=shaft))
        parts.append(P([rot(cx - 5.2, 22), rot(cx + 5.2, 22), rot(cx, 11)], WOOD))
        parts.append(P([rot(cx - 1.8, 15), rot(cx + 1.8, 15), rot(cx, 11)], DARK, flat=True))
        for sx, angry in ((-2.7, 1), (2.7, -1)):
            ex, ey = rot(cx + sx, 29)
            parts += eye(ex, ey, 2.4)
            parts += brow(ex, ey, 2.4, angry=angry)
        mx0, mx1 = rot(cx - 2.5, 35), rot(cx + 2.5, 35)
        parts.append(L([mx0, rot(cx, 36.5), mx1], 1.2, DARK, flat=True))
    parts += [R(14, 56, 66, 76, COVER, r=2)]
    nb = len(parts) - 1
    parts += [R(26, 62, 54, 72, PAPER, clip_to=nb, shade_from=nb)]
    for x in range(18, 64, 6):
        parts.append(E(x, 56, 1.4, 2.6, RING, flat=True))
    for y in (65, 68):
        parts.append(L([(30, y), (50, y)], 0.8, (120, 130, 160), flat=True))
    return parts


def bedsheet_banshee():
    SHEET, STRIPE, PILLOW = (240, 236, 224), (170, 196, 230), (190, 210, 236)
    body = P([(16, 46), (20, 30), (28, 18), (40, 13), (52, 18), (60, 30), (64, 46), (64, 66), (58, 72), (52, 66), (46, 72), (40, 66), (34, 72), (28, 66), (22, 72), (16, 66)], SHEET)
    parts = [L([(18, 44), (8, 56)], 6, SHEET), L([(62, 44), (72, 56)], 6, SHEET), body]
    b = len(parts) - 1
    for y in (26, 40, 54):
        parts.append(R(10, y, 70, y + 3, STRIPE, clip_to=b, shade_from=b))
    parts += [R(26, 6, 54, 18, PILLOW, r=4, rot=-6),
              E(33, 36, 4, 5, DARK, flat=True), E(47, 36, 4, 5, DARK, flat=True), E(32, 35, 1, 1.2, WHITE, flat=True), E(46, 35, 1, 1.2, WHITE, flat=True),
              E(40, 50, 5, 7, DARK, flat=True),
              L([(24, 46), (22, 62)], 1, (200, 196, 184), flat=True), L([(56, 46), (58, 62)], 1, (200, 196, 184), flat=True)]
    return parts


def mold_mimic():
    BOX, MAW, PINK, MOLD, GOLD = (196, 58, 60), (60, 16, 28), (232, 104, 134), (112, 184, 90), (200, 166, 70)
    parts = [L([(32, 20), (32, 13), (48, 13), (48, 20)], 2.6, BOX),
             P([(18, 38), (62, 38), (60, 18), (20, 18)], BOX)]
    lid = len(parts) - 1
    parts += [P([(22, 36), (58, 36), (56, 24), (24, 24)], MAW, flat=True), E(40, 42, 8, 4, PINK),
              R(18, 38, 62, 70, BOX, r=2)]
    box = len(parts) - 1
    parts += teeth(24, 56, 24, 7, h=3.5) + teeth(24, 56, 40, 7, h=3.5, down=False)
    parts += [R(37, 40, 43, 47, GOLD, r=1),
              E(32, 29, 3.2, 3.2, (255, 226, 80), flat=True), E(48, 29, 3.2, 3.2, (255, 226, 80), flat=True),
              E(32.5, 29.5, 1.2, 2, DARK, flat=True), E(48.5, 29.5, 1.2, 2, DARK, flat=True),
              B(19, 40, 7, 5, MOLD, seed=12, amp=0.25, tex="fur"), B(61, 44, 6, 5, MOLD, seed=13, amp=0.25, tex="fur"),
              B(28, 18, 6, 3.5, MOLD, seed=14, amp=0.25, tex="fur"), B(54, 19, 5, 3, MOLD, seed=15, amp=0.25, tex="fur"),
              B(50, 68, 6, 3.5, MOLD, seed=16, amp=0.25, tex="fur")]
    return parts


def freezer_yeti():
    FUR, FACE, CUBE, EYE = (214, 234, 246), (120, 170, 220), (176, 214, 240), (40, 90, 170)
    parts = [E(30, 70, 9, 6, FUR, tex="fluff"), E(50, 70, 9, 6, FUR, tex="fluff"),
             L([(18, 42), (8, 60)], 10, FUR, tex="fluff"), L([(62, 42), (72, 60)], 10, FUR, tex="fluff"),
             B(40, 50, 24, 22, FUR, seed=17, amp=0.08, tex="fluff"),
             R(13, 30, 24, 41, CUBE, r=1), R(56, 30, 67, 41, CUBE, r=1),
             B(40, 28, 17, 15, FUR, seed=18, amp=0.07, tex="fluff"), E(40, 30, 11, 9, FACE)]
    parts += eye(35, 28, 3, iris=EYE) + eye(45, 28, 3, iris=EYE) + brow(35, 28, 3) + brow(45, 28, 3, angry=-1)
    parts += [E(40, 36, 6, 2.6, DARK, flat=True), T(36, 37.5, 1.8, 3, WHITE, rot=180, flat=True), T(44, 37.5, 1.8, 3, WHITE, rot=180, flat=True)]
    for x, y in ((6, 62), (10, 66), (72, 62), (70, 66)):
        parts.append(T(x, y, 2.4, 4, CUBE, rot=180, flat=True))
    for x, y in ((8, 18), (70, 22), (14, 72), (66, 74)):
        parts += [L([(x - 2, y), (x + 2, y)], 0.9, WHITE, flat=True), L([(x, y - 2), (x, y + 2)], 0.9, WHITE, flat=True)]
    return parts


def puddle_phantom():
    MILK, PUDDLE, GLASS = (242, 244, 250), (116, 168, 232), (200, 214, 226)
    parts = [E(38, 70, 30, 6, PUDDLE), R(58, 56, 76, 68, GLASS, r=2, rot=-20), R(60, 58, 74, 66, MILK, r=1, rot=-20, clip_to=1, shade_from=1),
             L([(56, 64), (50, 68)], 3, MILK),
             L([(20, 42), (10, 52)], 6, MILK), L([(60, 42), (70, 52)], 6, MILK),
             L([(28, 58), (28, 67)], 3, MILK), L([(40, 60), (40, 70)], 3, MILK), L([(52, 58), (52, 66)], 3, MILK),
             P([(18, 46), (20, 30), (28, 18), (40, 12), (52, 18), (60, 30), (62, 46), (62, 58), (40, 62), (18, 58)], MILK)]
    parts += [E(33, 32, 4, 5, DARK, flat=True), E(47, 32, 4, 5, DARK, flat=True), E(32, 31, 1.2, 1.4, WHITE, flat=True), E(46, 31, 1.2, 1.4, WHITE, flat=True),
              E(40, 46, 4, 5, DARK, flat=True)]
    return parts


def candy_blob():
    PINK, CANDY, STICK, WRAP1, WRAP2, WRAP3, DROOL = (240, 128, 170), (220, 50, 60), (236, 232, 220), (246, 206, 70), (80, 140, 230), (100, 190, 110), (250, 200, 220)
    parts = [L([(52, 30), (57, 12)], 1.8, STICK), E(58, 9, 6.5, 6.5, CANDY)]
    candy = len(parts) - 1
    parts += [L([(58, 9), (61, 8), (61, 12), (56, 12), (55, 6), (62, 5)], 1.3, WHITE, clip_to=candy, shade_from=candy),
              B(40, 50, 25, 21, PINK, seed=19, amp=0.07, tex="slime")]
    b = len(parts) - 1
    parts += [R(24, 40, 32, 45, WRAP1, rot=30, clip_to=b), R(46, 56, 54, 61, WRAP2, rot=-20, clip_to=b), R(32, 62, 39, 66, WRAP3, rot=10, clip_to=b)]
    parts += eye(32, 44, 5) + eye(48, 44, 5)
    parts += [P([(26, 38), (38, 38), (38, 44), (26, 44)], PINK, shade_from=b), P([(42, 38), (54, 38), (54, 44), (42, 44)], PINK, shade_from=b),
              L([(34, 57), (40, 59), (46, 57)], 1.5, DARK, flat=True), L([(46, 58), (47, 68)], 2.2, DROOL)]
    return parts


def litter_imp():
    RED, GOLD, EYE, WOOD, STEEL, SAND = (206, 66, 70), (236, 196, 80), (255, 226, 80), (140, 96, 56), (160, 166, 176), (214, 200, 160)
    parts = [L([(46, 60), (60, 68), (68, 60)], 2.6, RED), P([(66, 55), (73, 60), (66, 65)], RED),
             L([(34, 62), (32, 74)], 5.2, RED), L([(46, 62), (48, 74)], 5.2, RED), E(31, 75, 4, 2.2, DARK), E(49, 75, 4, 2.2, DARK),
             E(40, 50, 12, 14, RED), L([(30, 44), (18, 54)], 4.6, RED), L([(50, 44), (62, 54)], 4.6, RED),
             L([(60, 54), (66, 62)], 2.2, WOOD), P([(60, 60), (76, 60), (74, 72), (62, 72)], STEEL), E(68, 64, 5, 2.2, SAND, tex="speckle"),
             E(40, 28, 13, 12, RED), P([(30, 20), (26, 8), (34, 18)], GOLD), P([(50, 20), (54, 8), (46, 18)], GOLD)]
    parts += eye(35, 27, 3.6, white=EYE, slit=True) + eye(45, 27, 3.6, white=EYE, slit=True) + brow(35, 27, 3.6) + brow(45, 27, 3.6, angry=-1)
    parts += [P([(32, 34), (48, 34), (46, 39), (34, 39)], DARK, flat=True), T(35, 35.5, 2, 3, WHITE, rot=180, flat=True), T(45, 35.5, 2, 3, WHITE, rot=180, flat=True)]
    return parts



def soda_scorpion():
    RED, SILVER, STRAW, STRIPE, DROP, DENT = (210, 50, 56), (182, 188, 198), (236, 236, 232), (210, 50, 56), (90, 170, 240), (120, 30, 36)
    tail = [(16, 54), (8, 44), (12, 30), (26, 20), (40, 20)]
    parts = [L(tail, 4.2, STRAW)]
    for i in range(1, len(tail)):
        (x0, y0), (x1, y1) = tail[i - 1], tail[i]
        ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
        for f in (0.3, 0.7):
            mx, my = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
            parts.append(R(mx - 1, my - 3, mx + 1, my + 3, STRIPE, rot=ang, clip_to=0, shade_from=0))
    parts += [E(44, 21, 2.6, 3.2, DROP)]
    for x in (22, 30, 38, 46):
        parts += [L([(x, 62), (x - 5, 70), (x - 4, 76)], 2.2, SILVER), ]
    parts += [R(14, 46, 54, 64, RED, r=3)]
    body = len(parts) - 1
    parts += [R(24, 46, 44, 64, (236, 236, 232), clip_to=body, shade_from=body),
              L([(26, 50), (34, 58)], 1.2, DENT, flat=True), L([(38, 60), (42, 50)], 1.2, DENT, flat=True),
              E(14, 55, 2.8, 9, SILVER), R(50, 47, 66, 63, SILVER, r=4)]
    parts += eye(58, 53, 2.6) + eye(63, 56.5, 2.2)
    parts += [L([(66, 52), (74, 46)], 3, SILVER), E(75, 44.5, 4, 4, SILVER), E(75, 44.5, 1.6, 1.6, DARK, flat=True),
              L([(65, 60), (73, 66)], 3, SILVER), E(74, 67.5, 4, 4, SILVER), E(74, 67.5, 1.6, 1.6, DARK, flat=True)]
    return parts


ROSTER = [
    ("dust-bunny", "Dust Bunny", dust_bunny), ("sock-gremlin", "Sock Gremlin", sock_gremlin),
    ("dish-golem", "Dish Pile Golem", dish_golem), ("laundry-golem", "Laundry Golem", laundry_golem),
    ("soap-slime", "Soap Scum Slime", soap_slime), ("crumb-crawler", "Crumb Crawler", crumb_crawler),
    ("toothpaste-serpent", "Toothpaste Serpent", toothpaste_serpent), ("weed-wraith", "Weed Wraith", weed_wraith),
    ("cardboard-golem", "Cardboard Golem", cardboard_golem), ("leaf-pile", "Leaf Pile Lurker", leaf_pile),
    ("mud-puppy", "Mud Puppy", mud_puppy), ("cobweb-widow", "Cobweb Widow", cobweb_widow),
    ("homework-hydra", "Homework Hydra", homework_hydra), ("bedsheet-banshee", "Bedsheet Banshee", bedsheet_banshee),
    ("mold-mimic", "Mold Mimic", mold_mimic), ("freezer-yeti", "Freezer Yeti", freezer_yeti),
    ("puddle-phantom", "Puddle Phantom", puddle_phantom), ("candy-blob", "Sticky Candy Blob", candy_blob),
    ("litter-imp", "Litter Imp", litter_imp), ("soda-scorpion", "Soda Can Scorpion", soda_scorpion),
]


def contact_sheet(images, path):
    cols, cell = 5, 192
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 16)), (58, 52, 70))
    draw = ImageDraw.Draw(sheet)
    for i, (label, img) in enumerate(images):
        x, y = (i % cols) * cell, (i // cols) * (cell + 16)
        th = img.resize((cell, cell), Image.LANCZOS)
        sheet.paste(th, (x, y), th)
        draw.text((x + 4, y + cell + 1), label, fill=(240, 236, 220))
    sheet.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--start", type=int, default=74)
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--sheet")
    a = ap.parse_args()
    wanted = set(a.slugs)
    os.makedirs(a.out, exist_ok=True)
    done = []
    for i, (slug, name, build) in enumerate(ROSTER):
        if wanted and slug not in wanted:
            continue
        number = a.start + i
        img = render(dict(slug=slug, seed=i + 1, parts=build()))
        path = os.path.join(a.out, f"{number:03d}.png")
        img.save(path, optimize=True)
        done.append((f"{number:03d} {name}", img))
        print(f"{number:03d}  {name:<20} {os.path.relpath(path, ROOT)}")
    if a.sheet:
        contact_sheet(done, a.sheet)
        print("sheet", a.sheet)


if __name__ == "__main__":
    sys.exit(main())
