#!/usr/bin/env python3
"""The Traveling Merchant's balloon, seen from inside the basket: a painted frame with see-through windows.
Boobeedeedle's shop has no room of its own. It stands in whichever world he visits today (the shop draws that
world's art behind), and this frame goes in front of it: the balloon's striped envelope and ropes along the top,
wicker walls down the sides, and the basket's rim, hanging lanterns and wares along the bottom. Everything between
is transparent, so the world shows through.

Writes src/assets/images/backgrounds/shops/traveling-merchant.webp (1024x1536, RGBA, like the other shop interiors).
A painted take can replace it: any 1024x1536 webp with a see-through middle, under the same name.

Usage: python3 tools/art/merchant_frame.py [--preview]   (--preview also writes a copy on a sample sky to tools/art/out)"""
import math, os, random, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
OUT = os.path.join(ROOT, "src", "assets", "images", "backgrounds", "shops", "traveling-merchant.webp")
PREVIEW = os.path.join(ROOT, "tools", "art", "out", "traveling-merchant-preview.png")
W, H = 1024, 1536
S = 2  # supersample, then shrink for soft edges

INK = (36, 20, 28)
RED, RED_D = (196, 54, 52), (140, 34, 44)
CREAM, CREAM_D = (244, 224, 176), (200, 170, 124)
WICKER, WICKER_D, WICKER_L = (176, 120, 64), (112, 70, 40), (222, 170, 100)
WOOD, WOOD_D = (110, 70, 44), (68, 40, 30)
ROPE = (206, 176, 120)
GOLD = (255, 214, 110)


def canvas():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))


def s(v):
    return int(v * S)


def shade(color, k):
    return tuple(max(0, min(255, int(c * k))) for c in color[:3])


def envelope(img, d):
    """The balloon hanging over the basket: a dome of curved red and cream gores that meet at its mouth."""
    cx, cy, rx, ry = W / 2, 120, 540, 340
    gores = 10
    steps = 40

    def meridian(lon, lo=0.0, hi=90.0):
        pts = []
        for i in range(steps + 1):
            phi = math.radians(lo + (hi - lo) * i / steps)
            pts.append((cx + rx * math.sin(math.radians(lon)) * math.cos(phi), cy + ry * math.sin(phi)))
        return pts

    for i in range(gores):
        lon0, lon1 = -90 + i * (180 / gores), -90 + (i + 1) * (180 / gores)
        color = RED if i % 2 == 0 else CREAM
        # the upper half is off the top of the screen, so each gore runs from the dome's equator down to the mouth
        pts = meridian(lon0) + meridian(lon1)[::-1]
        d.polygon([(s(x), s(y)) for x, y in pts], fill=color + (255,))
        d.line([(s(x), s(y)) for x, y in meridian(lon0)], fill=shade(color, 0.55) + (255,), width=s(4))
    # fill the strip above the equator so the dome reaches the top of the screen
    for i in range(gores):
        lon0, lon1 = -90 + i * (180 / gores), -90 + (i + 1) * (180 / gores)
        color = RED if i % 2 == 0 else CREAM
        top = meridian(lon0, -90, 0) + meridian(lon1, -90, 0)[::-1]
        d.polygon([(s(x), s(y)) for x, y in top], fill=color + (255,))
    # round shading: bright toward the middle, dark at the limb, so it reads as a belly of cloth
    shade_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade_layer)
    for k in range(30):
        t = k / 30
        sd.ellipse([s(cx - rx * (1 - t * 0.55)), s(cy - ry * (1 - t * 0.55)), s(cx + rx * (1 - t * 0.55)), s(cy + ry * (1 - t * 0.55))], outline=(40, 10, 20, int(5 + 6 * t)), width=s(9))
    shade_layer.putalpha(ImageChops.multiply(shade_layer.getchannel("A"), img.getchannel("A")))
    img.alpha_composite(shade_layer)
    d = ImageDraw.Draw(img)
    # the mouth: a dark ring with the burner's glow under it
    my = cy + ry
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([s(cx - 120), s(my - 20), s(cx + 120), s(my + 190)], fill=(255, 170, 70, 150))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(34))))
    d = ImageDraw.Draw(img)
    d.ellipse([s(cx - 46), s(my - 16), s(cx + 46), s(my + 16)], fill=INK + (255,), outline=GOLD + (255,), width=s(5))
    d.polygon([(s(cx - 22), s(my + 8)), (s(cx), s(my + 96)), (s(cx + 22), s(my + 8))], fill=(255, 150, 50, 235))
    d.polygon([(s(cx - 11), s(my + 8)), (s(cx), s(my + 60)), (s(cx + 11), s(my + 8))], fill=(255, 236, 160, 255))


def rope(d, x0, y0, x1, y1, width=14):
    d.line([(s(x0), s(y0)), (s(x1), s(y1))], fill=shade(ROPE, 0.55) + (255,), width=s(width + 4))
    d.line([(s(x0), s(y0)), (s(x1), s(y1))], fill=ROPE + (255,), width=s(width))
    n = int(math.hypot(x1 - x0, y1 - y0) / 18)
    for i in range(n):
        t = i / max(1, n)
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        d.line([(s(x - 7), s(y - 3)), (s(x + 7), s(y + 5))], fill=shade(ROPE, 0.6) + (255,), width=s(3))


def wicker(img, box, vertical=False):
    """A woven panel: crossing strands in warm browns, dark at the bottom like a basket in shade."""
    x0, y0, x1, y1 = box
    w, h = int((x1 - x0) * S), int((y1 - y0) * S)
    panel = Image.new("RGBA", (w, h), WICKER_D + (255,))
    pd = ImageDraw.Draw(panel)
    gap = s(30)
    for k in range(-h, w + h, gap):
        pd.line([(k, 0), (k + h, h)], fill=WICKER_L + (255,), width=s(15))
        pd.line([(k, 0), (k + h, h)], fill=shade(WICKER_L, 0.6) + (255,), width=s(2))
    for k in range(-h, w + h, gap):
        # the other direction passes over every second strand, which is what makes it look woven
        for j in range(0, h, gap * 2):
            pd.line([(k + h - j - gap, j + gap), (k + h - j, j)], fill=WICKER + (255,), width=s(15))
            pd.line([(k + h - j - gap, j + gap), (k + h - j, j)], fill=WICKER_D + (255,), width=s(2))
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(255 * (0.5 + 0.5 * (1 - y / h) if vertical is False else 0.8)))
    grad = grad.resize((w, h))
    dark = Image.new("RGBA", (w, h), (34, 14, 10, 255))
    panel = Image.composite(panel, dark, grad)
    img.alpha_composite(panel, (s(x0), s(y0)))


def lantern(img, d, x, y, size=52):
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([s(x - size * 3), s(y - size * 3), s(x + size * 3), s(y + size * 3)], fill=(255, 190, 90, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(s(size * 1.2)))
    img.alpha_composite(glow)
    rope(d, x, y - 260, x, y - size, 8)
    d.rounded_rectangle([s(x - size * 0.55), s(y - size), s(x + size * 0.55), s(y - size + 12)], radius=s(5), fill=INK + (255,))
    d.rounded_rectangle([s(x - size * 0.5), s(y - size + 12), s(x + size * 0.5), s(y + size * 0.7)], radius=s(12), fill=GOLD + (255,), outline=INK + (255,), width=s(5))
    d.ellipse([s(x - size * 0.25), s(y - size * 0.35), s(x + size * 0.25), s(y + size * 0.3)], fill=(255, 250, 220, 255))
    d.rounded_rectangle([s(x - size * 0.55), s(y + size * 0.7), s(x + size * 0.55), s(y + size * 0.7 + 12)], radius=s(5), fill=INK + (255,))


def basket_front(img, d):
    """The basket's near wall along the bottom: a wicker rim, the woven wall below, a plank counter the wares stand on."""
    wicker(img, (0, 1090, W, H))
    # the planks of the counter, where the shelf stands
    d.rectangle([s(0), s(1070), s(W), s(1130)], fill=WOOD + (255,))
    for x in range(0, W, 128):
        d.line([(s(x), s(1070)), (s(x), s(1130))], fill=WOOD_D + (255,), width=s(4))
    d.line([(s(0), s(1070)), (s(W), s(1070))], fill=shade(WOOD, 1.5) + (255,), width=s(6))
    d.line([(s(0), s(1130)), (s(W), s(1130))], fill=WOOD_D + (255,), width=s(8))
    # the rolled rim, a thick woven rope on top
    d.rounded_rectangle([s(-20), s(1040), s(W + 20), s(1078)], radius=s(18), fill=WICKER_L + (255,), outline=INK + (255,), width=s(5))
    for x in range(0, W, 46):
        d.line([(s(x), s(1044)), (s(x + 24), s(1074))], fill=WICKER_D + (255,), width=s(4))
    # sacks and a crate in the corners, so it is somebody's stock and not an empty frame
    d.rounded_rectangle([s(30), s(900), s(190), s(1048)], radius=s(34), fill=(216, 190, 140, 255), outline=INK + (255,), width=s(5))
    d.line([(s(60), s(940)), (s(160), s(940))], fill=(150, 120, 80, 255), width=s(6))
    d.rectangle([s(800), s(930), s(990), s(1046)], fill=WOOD + (255,), outline=INK + (255,), width=s(5))
    for y in (960, 996):
        d.line([(s(800), s(y)), (s(990), s(y))], fill=WOOD_D + (255,), width=s(4))
    d.ellipse([s(850), s(880), s(940), s(950)], fill=(210, 80, 60, 255), outline=INK + (255,), width=s(4))


def side_walls(img, d):
    wicker(img, (0, 560, 96, 1090), vertical=True)
    wicker(img, (W - 96, 560, W, 1090), vertical=True)
    for x in (96, W - 96):
        d.line([(s(x), s(560)), (s(x), s(1090))], fill=INK + (255,), width=s(6))
    # the burner's ropes come down each side of the window to the basket
    for x in (126, W - 126):
        rope(d, x, 330, x, 1050, 16)


def paint():
    img = canvas()
    d = ImageDraw.Draw(img)
    envelope(img, d)
    d = ImageDraw.Draw(img)
    side_walls(img, d)
    basket_front(img, d)
    d = ImageDraw.Draw(img)
    lantern(img, d, 236, 640, 54)
    lantern(img, d, W - 236, 700, 48)
    out = img.resize((W, H), Image.LANCZOS)
    # a little grain, so the flat fills read as paint on cloth
    rnd = random.Random(7)
    px = out.load()
    for _ in range(90000):
        x, y = rnd.randrange(W), rnd.randrange(H)
        r, g, b, a = px[x, y]
        if a:
            k = rnd.randint(-10, 10)
            px[x, y] = (max(0, min(255, r + k)), max(0, min(255, g + k)), max(0, min(255, b + k)), a)
    return out


def main(argv):
    frame = paint()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    frame.save(OUT, "WEBP", quality=88, method=6)
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB)")
    if "--preview" in argv:
        sky = Image.new("RGBA", (W, H))
        sd = ImageDraw.Draw(sky)
        for y in range(H):
            t = y / H
            sd.line([(0, y), (W, y)], fill=(int(120 + 100 * t), int(170 + 50 * t), int(235 - 20 * t), 255))
        sky.alpha_composite(frame)
        os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
        sky.convert("RGB").save(PREVIEW)
        print("preview", os.path.relpath(PREVIEW, ROOT))


if __name__ == "__main__":
    main(sys.argv[1:])
