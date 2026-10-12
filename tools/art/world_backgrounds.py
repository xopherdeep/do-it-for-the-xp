"""Repaints the region backgrounds without their baked-in buildings, so the voxel landmarks stand on open ground.
Each original (src/assets/images/backgrounds/world-*.webp) goes to OpenAI's image edit endpoint as the style
reference: same painting, same lettering, buildings removed, the title moved up out of the landmark row and
clearings left where the page puts its voxel landmarks. Results land in tools/art/out/worlds for review;
nothing in src changes until --install.

Usage (OPENAI_API_KEY in the environment, or GEMINI_API_KEY with --gemini to use Google's image model):
  python3 tools/art/world_backgrounds.py                 # every region, one take each
  python3 tools/art/world_backgrounds.py plains forest   # just these
  python3 tools/art/world_backgrounds.py -n 3 swamps     # three takes to pick from
  python3 tools/art/world_backgrounds.py --sheet         # rebuild the review sheet (phone crop + landmark slots drawn on)
  python3 tools/art/world_backgrounds.py --install plains=2 forest   # take #2 of plains, #1 of forest -> world-*.webp
  python3 tools/art/world_backgrounds.py --gemini plains # same edit through Gemini
  python3 tools/art/world_backgrounds.py --shrink-title forest=3 swamps=2   # Gemini: repaint a take's title smaller (new take)
  python3 tools/art/world_backgrounds.py --fit-title forest=3   # title-free plate from Gemini + the take's lettering scaled to fit
Env: XP_IMAGE_MODEL (default gpt-image-1), XP_IMAGE_QUALITY (default high), XP_GEMINI_MODEL (default: first available)."""
import base64, io, json, os, sys, threading, urllib.error, urllib.request, uuid
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BG_DIR = os.path.join(ROOT, "src", "assets", "images", "backgrounds")
OUT_DIR = os.path.join(ROOT, "tools", "art", "out", "worlds")
MODEL = os.environ.get("XP_IMAGE_MODEL", "gpt-image-1")
QUALITY = os.environ.get("XP_IMAGE_QUALITY", "high")
# Gemini: XP_GEMINI_MODEL pins one, otherwise the first of these the key can use.
GEMINI_MODEL = os.environ.get("XP_GEMINI_MODEL")
GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]
W, H = 1024, 1536

# Where the voxel landmarks stand on a 390x844 phone (the background is `cover`, so the phone sees x 15%..85%).
# Fractions of the full image. Row layout: .world-landmarks-layer (three across, 120px above the nav).
# Plaza layout: .world-landmarks-plaza in WorldPlains (2x2 plus a centre clearing for the FAB).
ROW_SLOTS = [(.27, .78), (.50, .78), (.73, .78)]
PLAZA_SLOTS = [(.29, .35), (.71, .35), (.50, .53), (.29, .71), (.71, .71)]
TITLE_BAND = (.14, .28)

ROW_LAYOUT = ("three open clearings side by side between 68% and 88% of the image height: one centred at 27% of the "
              "width, one at 50%, one at 73%")
PLAZA_LAYOUT = ("four open clearings in a 2x2 grid, two centred at 35% of the image height (at 29% and 71% of the "
                "width) and two at 71% of the height (at 29% and 71% of the width), plus one small open clearing in "
                "the exact centre at 53% of the height")

REGIONS = {
    "plains": dict(title="PLAINS", layout=PLAZA_LAYOUT, slots=PLAZA_SLOTS,
                   remove="the orange-roofed farmhouse, the columned stone temple, the barn and stable, the white horse, "
                          "the wooden huts at the bottom and every fence",
                   ground="sunny golden grassland with the winding dirt path"),
    "forest": dict(title="FOREST", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                   remove="the wooden cabin with the smoking chimney and the mossy stone temple entrance",
                   ground="grassy forest floor ringed by the leafy trees, with the dirt path"),
    "islands": dict(title="ISLANDS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                    remove="the big shipwreck, the small broken boat and the stone and coral temple in the water",
                    ground="turquoise sea with sandy palm islands; each clearing is a flat empty sandy island"),
    "swamps": dict(title="SWAMPS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                   remove="the stone temple with the eye symbol and the witch-hat hut",
                   ground="murky green marsh with reeds, lily pools and the muddy path"),
    "mountains": dict(title="MOUNTAINS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                      remove="the red castle with the lava flow and the blue crystal cave entrance",
                      ground="rocky orange mountains with pine trees and the switchback path; each clearing is a flat "
                             "rocky plateau"),
    "desert": dict(title="SANDS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                   remove="the stepped pyramid and the oasis pond (keep the palms and cacti elsewhere)",
                   ground="rolling golden dunes with the sand path"),
    "ice": dict(title="TUNDRAS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                remove="the ice castle and the igloo",
                ground="snowy tundra with frosted pine trees, the icy path and the frozen pond"),
    "clouds": dict(title="CLOUDS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                   remove="the cloud temple with the lightning bolt and both cloud market stalls",
                   ground="soft white cloud banks on a pale blue sky with the winding cloud path; each clearing is a "
                          "flat cloud platform"),
    "moon": dict(title="STARS", layout=ROW_LAYOUT, slots=ROW_SLOTS,
                 remove="the stone archway gate with the crescent and the glowing doorway",
                 ground="cratered grey moon surface under the starry night sky"),
}

SHRINK_PROMPT = """Edit this painting. Change only the title lettering "{title}": paint the same word in exactly the same lettering style, but smaller, so the whole word spans about half of the image width (from roughly 25% to 75% of the width), centred horizontally at the same height it is now. Repaint the area the old, larger letters covered with the surrounding scenery. Change nothing else: same scene, same paths, same clearings, same colours and brushwork."""

CLEAR_PROMPT = """Edit this painting. Remove the title lettering "{title}" completely and repaint that area with the surrounding scenery so no letters remain. Change nothing else: same scene, same paths, same clearings, same colours and brushwork."""
TITLE_WIDTH = .52   # --fit-title scales the lettering to this share of the image width (phones show 15%..85%)

PROMPT = """This is a painted background for a portrait mobile RPG screen. Repaint the same scene.
Keep exactly: the art style (soft painterly retro 16-bit fantasy map, same brush texture), the colour palette, the lighting, the top-down three-quarter view, the stone border and the overall mood. Region: {ground}.
Change only these things:
1. Remove every building and man-made structure: {remove}. Fill each spot with the natural ground of the region so the land is empty. Paths stay.
2. Keep the title lettering "{title}" in exactly the same lettering style as the original (same letter shapes, texture, colours and any decorative letter), but move it to the upper part of the image: centred horizontally, between {t0}% and {t1}% of the image height. Paint it smaller than in the original if needed: the whole word, every letter, must sit inside the middle 60% of the image width with clear margin on both sides, because phones crop the left and right edges. The top {t0}% of the image is hidden behind the game HUD, so keep the title below it and paint only scenery there. The title appears exactly once: erase it completely from its old position.
3. Leave {layout}. Each clearing is just a small natural open spot, about 15% of the image width, painted as the region's own ground ({ground}) and blending softly into its surroundings: not a bare rectangle, pad, frame or plaza. Keep them uncluttered (no trees, rocks, water or text in them) because game buildings will be placed on top, and let the path wander through them.
No characters, animals, buildings, ruins, signs or any text other than "{title}"."""


def original_path(key):
    return os.path.join(BG_DIR, f"world-{key}.webp")


def take_path(key, i):
    return os.path.join(OUT_DIR, f"{key}-{i}.png")


def prompt_for(key):
    r = REGIONS[key]
    return PROMPT.format(t0=round(TITLE_BAND[0] * 100), t1=round(TITLE_BAND[1] * 100), **r)


def fit_title(key, i):
    """The model will not resize lettering on request, so do it here: ask for a title-free plate of take `i`, lift
    the lettering out of take `i` (where the two differ), scale it to TITLE_WIDTH and blend it onto the plate."""
    titled_path = take_path(key, int(i))
    edit_gemini(key, 1, titled_path, CLEAR_PROMPT.format(title=REGIONS[key]["title"]))
    n = 1
    while os.path.exists(take_path(key, n + 1)): n += 1
    plate = Image.open(take_path(key, n)).convert("RGB")             # the take edit_gemini just wrote
    titled = Image.open(titled_path).convert("RGB")
    diff = ImageChops.difference(titled, plate).convert("L").point(lambda v: 255 if v > 30 else 0)
    top = diff.crop((0, 0, W, int(H * .55)))                         # titles live in the upper half
    core = top.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(15))   # drop speckle, keep letters
    box = core.getbbox()
    if not box: raise RuntimeError(f"{key}: no lettering found between take {i} and its plate")
    x0, y0, x1, y1 = max(0, box[0] - 12), max(0, box[1] - 12), min(W, box[2] + 12), min(H, box[3] + 12)
    mask = top.crop((x0, y0, x1, y1)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))
    f = min(1.0, TITLE_WIDTH * W / (x1 - x0))
    sw, sh = max(1, round((x1 - x0) * f)), max(1, round((y1 - y0) * f))
    letters = titled.crop((x0, y0, x1, y1)).resize((sw, sh), Image.LANCZOS)
    cy = (y0 + y1) // 2
    plate.paste(letters, ((W - sw) // 2, cy - sh // 2), mask.resize((sw, sh), Image.LANCZOS))
    plate.save(take_path(key, n + 1))
    print(f"{key}: take {n} is the plate, take {n + 1} has the title at {round(sw / W * 100)}% width", flush=True)


def multipart(fields, files):
    boundary = uuid.uuid4().hex
    body = b""
    for name, value in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    for name, (filename, data, ctype) in files.items():
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                 f"Content-Type: {ctype}\r\n\r\n").encode() + data + b"\r\n"
    return body + f"--{boundary}--\r\n".encode(), f"multipart/form-data; boundary={boundary}"


def edit(key, n):
    """One edit call for `key`; writes takes 1..n next to any earlier ones."""
    src = Image.open(original_path(key)).convert("RGB")
    png = os.path.join(OUT_DIR, f".{key}-source.png")
    src.save(png)
    fields = {"model": MODEL, "prompt": prompt_for(key), "size": f"{W}x{H}", "quality": QUALITY, "n": str(n),
              "input_fidelity": "high"}
    for attempt in (1, 2):
        body, ctype = multipart(fields, {"image": (f"world-{key}.png", open(png, "rb").read(), "image/png")})
        req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=body, method="POST", headers={
            "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": ctype})
        try:
            with urllib.request.urlopen(req, timeout=600) as res:
                data = json.load(res)["data"]
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if attempt == 1 and "input_fidelity" in msg:   # models without the parameter
                fields.pop("input_fidelity"); continue
            raise RuntimeError(f"{key}: HTTP {e.code} {msg[:400]}")
    os.remove(png)
    save_takes(key, [item["b64_json"] for item in data])


def save_takes(key, b64s):
    first = 1
    while os.path.exists(take_path(key, first)): first += 1
    for j, b64 in enumerate(b64s):
        im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
        if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
        im.save(take_path(key, first + j))
    print(f"{key}: takes {first}..{first + len(b64s) - 1}", flush=True)


def edit_gemini(key, n, source=None, prompt=None):
    """Same edit through Gemini's image model, one call per take (the endpoint returns one image).
    `source`/`prompt` override the original and the region prompt (used by --shrink-title)."""
    buf = io.BytesIO()
    Image.open(source or original_path(key)).convert("RGB").save(buf, "PNG")
    image = base64.b64encode(buf.getvalue()).decode()
    models = [GEMINI_MODEL] if GEMINI_MODEL else GEMINI_MODELS
    takes = []
    for _ in range(n):
        for model in models:
            body = {"contents": [{"parts": [{"inline_data": {"mime_type": "image/png", "data": image}},
                                            {"text": prompt or prompt_for(key)}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "2:3"}}}
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                data=json.dumps(body).encode(), method="POST",
                headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=600) as res:
                    parts = json.load(res)["candidates"][0]["content"]["parts"]
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors="replace")
                if e.code in (400, 404) and model != models[-1]:   # model not offered to this key: try the next
                    print(f"{key}: {model} unavailable ({e.code}), trying {models[models.index(model) + 1]}", flush=True)
                    continue
                raise RuntimeError(f"{key}: HTTP {e.code} {msg[:400]}")
            found = [p.get("inline_data", p.get("inlineData", {})).get("data") for p in parts]
            found = [f for f in found if f]
            if not found: raise RuntimeError(f"{key}: {model} returned no image: {json.dumps(parts)[:300]}")
            print(f"{key}: drawn by {model}", flush=True)
            models = [model]
            takes.append(found[0])
            break
    save_takes(key, takes)


def sheet():
    """Original | takes, each with the phone crop and the landmark slots drawn on, one row per region."""
    rows = [k for k in REGIONS if os.path.exists(take_path(k, 1))]
    if not rows: return print("no takes yet")
    tw, th = 256, 384
    cols = 1 + max(len([f for f in os.listdir(OUT_DIR) if f.startswith(k + "-") and f.endswith(".png")]) for k in rows)
    out = Image.new("RGB", (cols * (tw + 8), len(rows) * (th + 24)), (20, 16, 28))
    d = ImageDraw.Draw(out)
    for r, key in enumerate(rows):
        imgs = [("original", original_path(key))]
        i = 1
        while os.path.exists(take_path(key, i)): imgs.append((f"#{i}", take_path(key, i))); i += 1
        for c, (label, path) in enumerate(imgs):
            im = Image.open(path).convert("RGB").resize((tw, th))
            g = ImageDraw.Draw(im)
            g.rectangle([tw * .15, 0, tw * .85, th - 1], outline=(255, 255, 255))               # what a phone shows
            g.rectangle([tw * .15, 0, tw * .85, th * .11], outline=(255, 80, 80))              # under the HUD
            for sx, sy in REGIONS[key]["slots"]:
                g.ellipse([sx * tw - 18, sy * th - 18, sx * tw + 18, sy * th + 18], outline=(255, 230, 0), width=2)
            x, y = c * (tw + 8), r * (th + 24)
            out.paste(im, (x, y + 20)); d.text((x + 2, y + 4), f"{key} {label}", fill=(240, 240, 240))
    path = os.path.join(OUT_DIR, "_sheet.png")
    out.save(path); print(path)


def install(picks):
    for pick in picks:
        key, _, i = pick.partition("=")
        src = take_path(key, int(i or 1))
        Image.open(src).convert("RGB").save(original_path(key), "WEBP", quality=88, method=6)
        print(f"{src} -> {original_path(key)}")


def main(argv):
    os.makedirs(OUT_DIR, exist_ok=True)
    if "--sheet" in argv: return sheet()
    if "--install" in argv: return install([a for a in argv if a != "--install"])
    if "--fit-title" in argv:                         # Gemini plate + local resize: key=take ...
        picks = [a.partition("=") for a in argv if a != "--fit-title"]
        def fit(key, i):
            try: fit_title(key, i or 1)
            except Exception as e: print(e, file=sys.stderr, flush=True)
        threads = [threading.Thread(target=fit, args=(k, i)) for k, _, i in picks]
        for t in threads: t.start()
        for t in threads: t.join()
        return sheet()
    if "--shrink-title" in argv:                      # Gemini touch-up of chosen takes: key=take ...
        picks = [a.partition("=") for a in argv if a != "--shrink-title"]
        def shrink(key, i):
            try: edit_gemini(key, 1, take_path(key, int(i or 1)), SHRINK_PROMPT.format(title=REGIONS[key]["title"]))
            except Exception as e: print(e, file=sys.stderr, flush=True)
        threads = [threading.Thread(target=shrink, args=(k, i)) for k, _, i in picks]
        for t in threads: t.start()
        for t in threads: t.join()
        return sheet()
    n = 1
    if "-n" in argv:
        k = argv.index("-n"); n = int(argv[k + 1]); argv = argv[:k] + argv[k + 2:]
    keys = argv or list(REGIONS)
    bad = [k for k in keys if k not in REGIONS and k != "--gemini"]
    if bad: sys.exit(f"unknown region(s) {bad}; pick from {list(REGIONS)}")
    gemini = "--gemini" in argv
    keys = [k for k in keys if k != "--gemini"] or list(REGIONS)
    key_name = "GEMINI_API_KEY" if gemini else "OPENAI_API_KEY"
    if not os.environ.get(key_name): sys.exit(f"{key_name} is not set")
    errors = []
    def run(k):
        try: (edit_gemini if gemini else edit)(k, n)
        except Exception as e: errors.append(str(e)); print(e, file=sys.stderr, flush=True)
    threads = [threading.Thread(target=run, args=(k,)) for k in keys]
    for i in range(0, len(threads), 4):                     # four calls at a time
        for t in threads[i:i + 4]: t.start()
        for t in threads[i:i + 4]: t.join()
    sheet()
    if errors: sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
