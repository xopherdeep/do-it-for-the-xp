"""Paints the region shops in the Snow Shack's style (Hermit's Tent, Crystal Caverns, Cloud Market, Theia City Emporium
the Witch's Hut and the Pond of Life Oasis) and Home Town's Hospital. The Snow Shack interior (src/assets/images/backgrounds/shops/snow-shack.webp)
goes to Gemini's image model as the style anchor with a description of the new shop and its clerk. Results land in
tools/art/out/shops for review; nothing in src changes until --install.

Usage (GEMINI_API_KEY in the environment):
  python3 tools/art/shop_interiors.py                     # every shop, one take each
  python3 tools/art/shop_interiors.py -n 3 crystal-caverns   # three takes to pick from
  python3 tools/art/shop_interiors.py --sheet             # rebuild the review sheet (Snow Shack | takes, phone crop drawn on)
  python3 tools/art/shop_interiors.py --install hermits-tent=2 theia-city   # take #2, take #1 -> shops/<id>.webp
  python3 tools/art/shop_interiors.py -n 3 traveling-merchant   # the balloon: its window is drawn flat magenta, and
                                                                # --install keys that out so the world shows through
Env: XP_GEMINI_MODEL pins a model (default: the first of GEMINI_MODELS the key can use)."""
import base64, io, json, os, sys, threading, urllib.error, urllib.request
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SHOP_DIR = os.path.join(ROOT, "src", "assets", "images", "backgrounds", "shops")
ANCHOR = os.path.join(SHOP_DIR, "snow-shack.webp")
OUT_DIR = os.path.join(ROOT, "tools", "art", "out", "shops")
GEMINI_MODEL = os.environ.get("XP_GEMINI_MODEL")
GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]
W, H = 1024, 1536

# Who minds each shop (SHOP_CLERK_DEFAULTS in ShopsDb, else the registry's clerkName) and what the room is.
SHOPS = {
    "hermits-tent": dict(
        name="Hermit's Tent", region="the Forest",
        room="the inside of a big patched canvas tent deep in a leafy forest: sloping green-brown canvas walls held up by "
             "wooden poles, a woven rug over packed earth with tree roots poking through, rough plank shelves and crates "
             "of dried herbs hanging in bundles, mushrooms and berries in glass jars, little potion bottles, a mortar and "
             "pestle, rolled scrolls, a hanging lantern and a tiny stone campfire ring",
        clerk="Terrance the Hermit, a grumpy old hermit with a long grey beard and bushy eyebrows in a hooded moss-green "
              "robe, leaning on a counter made from a split log"),
    "crystal-caverns": dict(
        name="Crystal Caverns", region="the Mountains",
        room="a glittering underground cave market: rough rocky cave walls studded with glowing blue, purple and pink "
             "crystal clusters, wooden mine-shaft beams, a mine cart heaped with gems, wooden shelves of cut gemstones, "
             "rings, amulets and old relics in glass cases, a pick-axe on the wall, warm lanterns on the beams",
        clerk="Jeff, a cheerful stocky miner with a big ginger beard, a miner's helmet with a little lamp and a leather "
              "apron, standing behind a counter made of a stone slab on timber legs"),
    "cloud-market": dict(
        name="Cloud Market", region="the Clouds",
        room="a floating bazaar stall high in the sky: a floor of pale marble tiles edged with fluffy white clouds, "
             "blue-and-white striped canvas awnings on golden poles, shelves of bottled lightning, glowing storm-blue orbs, "
             "bundles of feathers, kites, wind chimes and weather vanes, sky-blue pennants, open blue sky and clouds "
             "beyond the stall",
        clerk="Skyward Sam, a jolly sky trader with aviator goggles on his forehead, a long red scarf and small feathered "
              "wings on his back, standing behind a wooden counter painted sky blue"),
    "theia-city": dict(
        name="Theia City Emporium", region="the Moon",
        room="a grand lunar shop in a city on the moon: smooth silver-white moonstone walls, tall arched windows showing "
             "a starry night sky and the blue Earth, crescent-moon carvings, deep purple velvet drapes, shelves of glowing "
             "star fragments, meteorite chunks, brass telescopes, star charts and jars of moon dust, soft silver lamps",
        clerk="The Watcher, a calm and kindly mysterious shopkeeper in a hooded indigo cloak sprinkled with tiny stars, "
              "only two soft glowing eyes visible under the hood, hands resting on a counter of polished moonstone"),
    "witchs-hut": dict(
        name="Witch's Hut", region="the Swamps",
        room="the inside of a crooked wooden swamp shack: warped plank walls and a sagging beamed roof, mossy floorboards, "
             "a big black cauldron of bubbling green brew on a stone ring behind the counter, crooked shelves of glowing "
             "potion bottles, spell books, jars of eyes and frog legs, bundles of swamp herbs and dried mushrooms hanging "
             "from the beams, melted candles, a broom in the corner, cobwebs, a black cat curled on a shelf",
        clerk="Granny Hex, a cheerful old witch with green skin, a long crooked nose, a big friendly grin, a tall bent "
              "pointed black hat and a patched purple shawl, standing behind a crooked wooden counter"),
    "pond-of-life": dict(
        name="Pond of Life Oasis", region="the Sands",
        room="a shaded trading tent at a desert oasis: a striped sand-and-teal canvas canopy on carved wooden poles, woven "
             "rugs laid over golden sand, a clear sparkling blue spring pool with lily pads behind the counter and palm "
             "trees beyond it, clay water jars, gourds and waterskins, baskets of dates and figs, healing potions in blue "
             "bottles, brass lanterns hanging from the poles",
        clerk="Oasis Guardian Miriam, a kind smiling oasis keeper in long flowing sand-coloured robes and a teal head "
              "scarf, holding a little water jug, standing behind a counter of palm wood"),
    "pegasus-ranch": dict(
        name="Pegasus Ranch", region="the Plains",
        room="a ranch's trading barn: warm wooden plank walls and floor, hay bales, saddles, bridles and coiled ropes "
             "hanging on the walls, horseshoes, sacks of feed, barrels of apples and carrots, a stable door at the back "
             "where a white winged pegasus pokes its head over the half door, lanterns on the posts",
        clerk="Francis the Rancher, a cheerful rancher with a wide brown cowboy hat, a bushy moustache, a plaid shirt and "
              "a leather vest, standing behind a wooden counter"),
    # Boobeedeedle's balloon has no room of its own: the shop draws the world he is visiting behind this picture, so
    # the window behind him is painted flat magenta and --install turns it see-through (see key_out_window). He stands
    # centred behind his counter like every other clerk; the installed picture is take 2 of 2026-10-21.
    "traveling-merchant": dict(
        name="Traveling Merchant's Balloon", region="wherever he has landed today", cutout=True,
        room="the inside of the wicker basket of a patched red-and-cream striped hot air balloon, seen from within as a tiny "
             "flying shop: the big striped balloon canopy with its burner flame and rope rigging hangs across the top of the "
             "picture, thick ropes and wooden posts run down both sides with warm hanging lanterns, and wicker shelves and "
             "stacked crates, barrels, sacks, potion bottles, a brass telescope, rolled maps, a birdcage and bundles of goods "
             "fill the left and right sides. A plank counter with goods on it runs across the lower middle and the woven "
             "wicker basket wall and floor fill the bottom. The open space behind and above the shopkeeper, between the "
             "canopy, the side rigging and the counter, is ONE flat solid pure magenta (#FF00FF) window with no sky, no "
             "ground, no clouds, no horizon and no outline of its own",
        clerk="Boobeedeedle, a plump cheerful peddler with a round red nose, flight goggles pushed up on a floppy brown hat, "
              "a patched brown coat with many pockets and a big backpack of trinkets, standing in the middle of the picture "
              "behind the plank counter, in front of the magenta window, looking at the viewer with a big grin"),
    # Home Town's general store; any shop without a picture of its own shows it too
    "hometown-market": dict(
        name="Hometown Market", region="Home Town", dest=os.path.join(ROOT, "src", "assets", "images", "midjourney", "shop.webp"),
        room="a cosy village general store: stone walls and a warm wooden plank floor, shelves of bread loaves, fruit "
             "baskets, jars of jam and honey and little potion bottles, a sword and a round shield hung on the wall, barrels "
             "and crates, woven red rugs, potted plants, warm lanterns",
        clerk="Old Man Morris, a friendly old shopkeeper with a bald head, round spectacles, a big grey moustache and a "
              "green apron, standing behind a wooden counter"),
    # Not a shop: the hospital, the stats view beside it and the game over screen share this picture
    "hospital": dict(
        name="Hospital", region="Home Town", dest=os.path.join(ROOT, "src", "assets", "images", "midjourney", "hospital.webp"),
        room="a cosy fantasy-village infirmary: clean white stone walls with warm wooden beams, a red heart in a round "
             "stained-glass window, two neat beds with white sheets and red blankets along the back wall, wooden shelves "
             "of red and pink healing potions, rolled bandages, herb bundles and a mortar and pestle, a small glowing "
             "healing spring in a stone basin, potted plants, warm lanterns",
        clerk="the town nurse, a kind smiling young woman in a white nurse's cap with a small red cross and a white apron "
              "over a pink dress, holding a clipboard, standing behind a curved wooden reception counter"),
}

CUTOUT_NOTE = """
This picture is a FRAME that goes in front of another picture: the open space behind and above the shopkeeper, between the canopy, the side rigging and the counter, is completely empty flat pure magenta (#FF00FF) with hard edges. Paint no sky, clouds, ground or horizon in it, do not use magenta anywhere else, and keep the shopkeeper's outline crisp against it. The shopkeeper stays in the middle behind the counter as in the attached picture; the magenta window replaces the back wall and its shelves."""

PROMPT = """The attached picture is the Snow Shack, a shop interior from our retro 16-bit SNES-era fantasy RPG for a portrait phone screen. Paint a NEW shop interior for the same game, the {name} in {region}.
Match the attached picture exactly in: art style (crisp pixel art with the same pixel size, outlines, dithering and shading), the top-down three-quarter view, the level of detail, the warm lantern lighting and the composition: shelves and goods along the back wall and both sides, the shopkeeper in the middle of the picture behind a counter, curved or angled counters with goods at the lower left and lower right, and an open patch of floor at the bottom centre where the customer stands.
The room: {room}.
The shopkeeper: {clerk}. Friendly enough for young children, looking at the viewer.
Keep the shopkeeper and the counter centred horizontally: the left and right edges of the picture are cropped on phones.
No text, letters, numbers, price tags, signs with writing, UI, frames or borders. One shopkeeper, no customers."""


def take_path(key, i):
    return os.path.join(OUT_DIR, f"{key}-{i}.png")


def paint(key, n):
    """n Gemini calls for `key` (the endpoint returns one image each); takes are numbered after any earlier ones."""
    buf = io.BytesIO()
    Image.open(ANCHOR).convert("RGB").save(buf, "PNG")
    anchor = base64.b64encode(buf.getvalue()).decode()
    prompt = PROMPT.format(**SHOPS[key]) + (CUTOUT_NOTE if SHOPS[key].get("cutout") else "")
    models = [GEMINI_MODEL] if GEMINI_MODEL else list(GEMINI_MODELS)
    for _ in range(n):
        for model in models:
            body = {"contents": [{"parts": [{"inline_data": {"mime_type": "image/png", "data": anchor}}, {"text": prompt}]}],
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
            models = [model]
            i = 1
            while os.path.exists(take_path(key, i)): i += 1
            im = Image.open(io.BytesIO(base64.b64decode(found[0]))).convert("RGB")
            if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
            im.save(take_path(key, i))
            print(f"{key}: take {i} drawn by {model}", flush=True)
            break


def sheet():
    """Snow Shack | takes, one row per shop, with what a phone shows (the middle 70% of the width) drawn on."""
    rows = [k for k in SHOPS if os.path.exists(take_path(k, 1))]
    if not rows: return print("no takes yet")
    tw, th = 256, 384
    counts = {k: len([f for f in os.listdir(OUT_DIR) if f.startswith(k + "-") and f.endswith(".png")]) for k in rows}
    out = Image.new("RGB", ((1 + max(counts.values())) * (tw + 8), len(rows) * (th + 24)), (20, 16, 28))
    d = ImageDraw.Draw(out)
    for r, key in enumerate(rows):
        imgs = [("snow-shack", ANCHOR)] + [(f"#{i}", take_path(key, i)) for i in range(1, counts[key] + 1)]
        for c, (label, path) in enumerate(imgs):
            im = Image.open(path).convert("RGB").resize((tw, th))
            ImageDraw.Draw(im).rectangle([tw * .15, 0, tw * .85, th - 1], outline=(255, 255, 255))
            x, y = c * (tw + 8), r * (th + 24)
            out.paste(im, (x, y + 20)); d.text((x + 2, y + 4), f"{key} {label}", fill=(240, 240, 240))
    path = os.path.join(OUT_DIR, "_sheet.png")
    out.save(path); print(path)


def key_out_window(im, tolerance=110, feather=40):
    """RGB picture with a flat magenta window -> RGBA with that window see-through. Pixels near #FF00FF go transparent,
    a band beyond the tolerance fades in, and magenta fringe on the edge is pulled back toward the neighbouring colour."""
    im = im.convert("RGB")
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", im.size)
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            dist = ((255 - r) ** 2 + g ** 2 + (255 - b) ** 2) ** 0.5
            if dist <= tolerance:
                op[x, y] = (0, 0, 0, 0)
                continue
            alpha = 255 if dist >= tolerance + feather else int(255 * (dist - tolerance) / feather)
            if alpha < 255:
                # a half-keyed edge pixel: remove the magenta it picked up
                spill = min(r, b) - g
                if spill > 0:
                    r, b = max(0, r - spill // 2), max(0, b - spill // 2)
            op[x, y] = (r, g, b, alpha)
    return out


def install(picks):
    for pick in picks:
        key, _, i = pick.partition("=")
        if key not in SHOPS: sys.exit(f"unknown shop {key}; pick from {list(SHOPS)}")
        src, dest = take_path(key, int(i or 1)), SHOPS[key].get("dest") or os.path.join(SHOP_DIR, f"{key}.webp")
        take = Image.open(src).convert("RGB")
        if SHOPS[key].get("cutout"): take = key_out_window(take)
        take.save(dest, "WEBP", quality=88, method=6)
        print(f"{src} -> {dest}")


def main(argv):
    os.makedirs(OUT_DIR, exist_ok=True)
    if "--sheet" in argv: return sheet()
    if "--install" in argv: return install([a for a in argv if a != "--install"])
    n = 1
    if "-n" in argv:
        k = argv.index("-n"); n = int(argv[k + 1]); argv = argv[:k] + argv[k + 2:]
    keys = argv or list(SHOPS)
    bad = [k for k in keys if k not in SHOPS]
    if bad: sys.exit(f"unknown shop(s) {bad}; pick from {list(SHOPS)}")
    if not os.environ.get("GEMINI_API_KEY"): sys.exit("GEMINI_API_KEY is not set")
    errors = []
    def run(k):
        try: paint(k, n)
        except Exception as e: errors.append(str(e)); print(e, file=sys.stderr, flush=True)
    threads = [threading.Thread(target=run, args=(k,)) for k in keys]
    for t in threads: t.start()
    for t in threads: t.join()
    sheet()
    if errors: sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
