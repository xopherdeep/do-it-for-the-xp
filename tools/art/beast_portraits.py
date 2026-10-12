#!/usr/bin/env python3
"""Painted chore beasts for the starter bestiary. Each entry of tools/art/beast_roster.json (slug, name, chore,
element, checklist, look) is drawn by Gemini's image model in one of three storybook styles, one square take per
call, on a flat white ground that is then keyed out. Takes land in tools/art/out/beasts (raw renders in raw/);
nothing in src changes until --install.

Usage (GEMINI_API_KEY in the environment):
  python3 tools/art/beast_portraits.py socktopus dish-goblin           # one take each in style a (painted)
  python3 tools/art/beast_portraits.py -n 2 --style b socktopus        # two takes in style b (hd pixel art)
  python3 tools/art/beast_portraits.py --all -j 4                       # every beast with no take yet, 4 at a time
  python3 tools/art/beast_portraits.py --sheet [--only d] [--now] [slug ...]   # review pages (_sheet[-d][-NN].png)
  python3 tools/art/beast_portraits.py --rekey [slug ...]               # redo the background keying from raw/
  python3 tools/art/beast_portraits.py --assign                         # number every beast (roster order) in beast_numbers.json
  python3 tools/art/beast_portraits.py --install socktopus=d4 dish-goblin=d3
                                                                        # take -> src/assets/images/beasts/NNN.webp under the
                                                                        # beast's number; TOTAL_BEAST_AVATARS / nAvatars follow
                                                                        # the highest unbroken run of portrait files
  python3 tools/art/beast_portraits.py --install auto --style d          # first clean take of every beast not installed yet
  python3 tools/art/beast_portraits.py --assign --variant b              # a second number per beast for its style-b look
  python3 tools/art/beast_portraits.py --install auto --variant b        # ... installed as variantAvatar in the library
  python3 tools/art/beast_portraits.py --emit-ts                        # src/lib/services/core/beastLibrary.ts
Styles: a painted gouache storybook, b modern hd pixel art, c ink and watercolour, d painted pixel (a+b).
Env: XP_GEMINI_MODEL pins a model; XP_BEAST_STYLE sets the default style; XP_KEY_THRESH the keying tolerance."""
import argparse, base64, io, json, os, re, sys, threading, time, urllib.error, urllib.request, zlib
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
ROSTER_PATH = os.path.join(HERE, "beast_roster.json")
NUMBERS_PATH = os.path.join(HERE, "beast_numbers.json")
OUT_DIR = os.path.join(HERE, "out", "beasts")
RAW_DIR = os.path.join(OUT_DIR, "raw")
BEAST_DIR = os.path.join(ROOT, "src", "assets", "images", "beasts")
SERVICE_TS = os.path.join(ROOT, "src", "lib", "services", "battle", "BestiaryService.ts")
AVATAR_VUE = os.path.join(ROOT, "src", "components", "molecules", "AvatarSelect", "AvatarSelect.vue")
LIBRARY_TS = os.path.join(ROOT, "src", "lib", "services", "core", "beastLibrary.ts")
GEMINI_MODEL = os.environ.get("XP_GEMINI_MODEL")
GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]
KEY_THRESH = int(os.environ.get("XP_KEY_THRESH", "40"))
SIZE = 480                      # what the bestiary and the battle stage use
SENTINEL = (1, 254, 3)          # flood-fill colour that no painted beast will contain

STYLES = {
    "a": ("painted", "A hand-painted storybook monster in the style of late-1990s Japanese RPG concept art: soft gouache "
          "and watercolour shading with visible brush texture, warm saturated colours, soft dark-brown outlines, chibi "
          "proportions with a big head and a small round body, large glossy expressive eyes."),
    "b": ("hd pixel", "A modern high-definition pixel-art monster, a large detailed sprite with clean pixel clusters, a rich "
          "painterly palette of around thirty colours, soft shading built from pixel bands, a dark outline, chibi "
          "proportions with a big head and a small round body, large expressive eyes."),
    "c": ("ink", "A hand-drawn ink and watercolour monster illustration: loose confident ink outlines, wet watercolour "
          "washes with soft bleeding edges and paper texture, chibi proportions with a big head and a small round body, "
          "large expressive eyes."),
    "d": ("painted pixel", "A modern high-definition pixel-art monster painted like a storybook illustration: a large detailed "
          "sprite with crisp pixel edges, but shaded with soft gouache-like colour blends in painterly clusters rather than hard "
          "flat bands, warm saturated colours with hue-shifted shadows, soft dark-brown outlines, chibi proportions with a big "
          "head and a small round body, large glossy expressive eyes."),
}
FRAME = ("{style} A single whimsical monster for a children's chore-quest game bestiary: {look}. It is the spirit "
         "of the chore \"{chore}\". Full body, facing the viewer, centred and filling most of the frame, no ground "
         "shadow, no scenery, isolated on a plain flat solid pure white background (never a checkerboard, a transparency "
         "grid or a pixel grid behind it). No text, no letters, no logo, no border, no frame.")

# the starter beasts' current portraits, for the sheet's first column
CURRENT = {"socktopus": 7, "dish-goblin": 12, "dust-bunny-king": 23, "laundry-lurker": 31, "weed-wyrm": 40,
           "trash-troll": 48, "crumb-gremlin": 55, "homework-hydra": 61, "bed-basilisk": 66, "fang-fairy": 70}

_lock = threading.Lock()


def roster():
    with open(ROSTER_PATH) as f: return {b["slug"]: b for b in json.load(f)}


def take_path(slug, style, i): return os.path.join(OUT_DIR, f"{slug}-{style}{i}.png")
def raw_path(slug, style, i): return os.path.join(RAW_DIR, f"{slug}-{style}{i}.png")


def takes_of(slug, drawn=False):
    """(style, n) of this beast's takes; drawn=True skips the empty files reserve() leaves while a take is in flight."""
    pat = re.compile(re.escape(slug) + r"-([a-d])(\d+)\.png$")
    found = []
    for f in os.listdir(OUT_DIR) if os.path.isdir(OUT_DIR) else []:
        m = pat.match(f)
        if m and not (drawn and os.path.getsize(os.path.join(OUT_DIR, f)) == 0): found.append((m.group(1), int(m.group(2))))
    return sorted(found)


def prompt_for(beast, style):
    return FRAME.format(style=STYLES[style][1], look=beast["look"], chore=beast["chore"])


# --- drawing -----------------------------------------------------------------------------------
def gemini(prompt, label):
    models = [GEMINI_MODEL] if GEMINI_MODEL else list(GEMINI_MODELS)
    for attempt in range(4):
        for model in models:
            body = {"contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1"}}}
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                data=json.dumps(body).encode(), method="POST",
                headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=600) as res:
                    parts = json.load(res)["candidates"][0]["content"]["parts"]
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors="replace")
                if e.code in (400, 404) and model != models[-1]:
                    print(f"{label}: {model} unavailable ({e.code}), trying the next", flush=True); continue
                if e.code in (429, 500, 503) and attempt < 3:
                    wait = 15 * (attempt + 1)
                    print(f"{label}: HTTP {e.code}, retrying in {wait}s", flush=True); time.sleep(wait); break
                raise RuntimeError(f"{label}: HTTP {e.code} {msg[:400]}")
            except (KeyError, IndexError) as e:
                raise RuntimeError(f"{label}: {model} returned no candidate ({e})")
            found = [p.get("inline_data", p.get("inlineData", {})).get("data") for p in parts]
            found = [f for f in found if f]
            if not found: raise RuntimeError(f"{label}: {model} returned no image: {json.dumps(parts)[:300]}")
            return Image.open(io.BytesIO(base64.b64decode(found[0]))).convert("RGB")
    raise RuntimeError(f"{label}: gave up")


def key_out(rgb, thresh=KEY_THRESH):
    """Flood the flat white ground from the edges, erode a pixel of fringe, soften the edge, return RGBA."""
    work = rgb.copy()
    w, h = work.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if work.getpixel(seed) != SENTINEL:
            ImageDraw.floodfill(work, seed, SENTINEL, thresh=thresh)
    diff = ImageChops.difference(work, Image.new("RGB", work.size, SENTINEL)).split()
    mask = ImageChops.lighter(ImageChops.lighter(diff[0], diff[1]), diff[2]).point(lambda v: 255 if v else 0)
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = rgb.copy(); out.putalpha(mask)
    return out


def draw(slug, beast, style, i):
    label = f"{slug} {style}{i}"
    im = gemini(prompt_for(beast, style), label)
    os.makedirs(RAW_DIR, exist_ok=True)
    im.save(raw_path(slug, style, i))
    keyed = key_out(im)
    keyed.save(take_path(slug, style, i))
    h = keyed.getchannel("A").histogram(); clear = h[0] / sum(h)
    print(f"{label}: drawn" + ("" if clear >= 0.15 else f"  (only {clear:.0%} keyed: the ground is not flat white, re-roll)"), flush=True)


def reserve(slug, style, n):
    with _lock:
        used = {i for s, i in takes_of(slug) if s == style}
        out, i = [], 1
        while len(out) < n:
            if i not in used: out.append(i)
            i += 1
        for i in out: open(take_path(slug, style, i), "ab").close()   # claim the number
        return out


def run(slugs, style, n, jobs):
    if not os.environ.get("GEMINI_API_KEY"): sys.exit("GEMINI_API_KEY is not set")
    book = roster()
    os.makedirs(OUT_DIR, exist_ok=True)
    work = []
    for slug in slugs:
        if slug not in book: sys.exit(f"unknown beast {slug}")
        for i in reserve(slug, style, n): work.append((slug, book[slug], style, i))
    print(f"drawing {len(work)} takes in style {style} ({STYLES[style][0]}), {jobs} at a time", flush=True)
    failures = []

    def job(args):
        try: draw(*args)
        except Exception as e:
            os.remove(take_path(args[0], args[2], args[3])) if os.path.getsize(take_path(args[0], args[2], args[3])) == 0 else None
            failures.append(str(e)); print(f"FAILED {e}", flush=True)
    with ThreadPoolExecutor(max_workers=jobs) as pool: list(pool.map(job, work))
    if failures: print(f"{len(failures)} failed", flush=True)


def rekey(slugs):
    for slug in slugs:
        for style, i in takes_of(slug, drawn=True):
            if os.path.exists(raw_path(slug, style, i)):
                key_out(Image.open(raw_path(slug, style, i)).convert("RGB")).save(take_path(slug, style, i))
                print(f"{slug} {style}{i}: rekeyed")


# --- review ------------------------------------------------------------------------------------
def checker(size, cell=24):
    im = Image.new("RGBA", (size, size), (54, 48, 66, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2: d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(66, 60, 80, 255))
    return im


def sheet(slugs, only=None, now=False, per_page=24):
    """Review pages: each beast's takes side by side, several beasts per row, per_page beasts per page.
    --now adds the starter beasts' current portrait in front of their takes."""
    book = roster()
    def takes(s): return [t for t in takes_of(s, drawn=True) if not only or t[0] in only]
    rows = [s for s in (slugs or book) if takes(s)]
    if not rows: return print("no takes yet")
    cell, pad, lab, gap = 200, 4, 16, 14
    per_beast = max(len(takes(s)) for s in rows) + (1 if now else 0)
    group = per_beast * (cell + pad) + gap
    per_row = max(1, 1700 // group)
    pages = [rows[i:i + per_page] for i in range(0, len(rows), per_page)]
    for n, page in enumerate(pages, 1):
        nrows = (len(page) + per_row - 1) // per_row
        out = Image.new("RGB", (per_row * group, nrows * (cell + lab + pad)), (20, 16, 28))
        d = ImageDraw.Draw(out)
        for k, slug in enumerate(page):
            gx, gy = (k % per_row) * group, (k // per_row) * (cell + lab + pad)
            cells = []
            if now: cells.append(("now", os.path.join(BEAST_DIR, f"{CURRENT[slug]:03d}.webp") if slug in CURRENT else None))
            cells += [(f"{s}{i}", take_path(slug, s, i)) for s, i in takes(slug)]
            for c, (label, path) in enumerate(cells):
                x, y = gx + c * (cell + pad), gy
                if path and os.path.exists(path) and os.path.getsize(path):
                    tile = checker(cell)
                    tile.alpha_composite(Image.open(path).convert("RGBA").resize((cell, cell), Image.LANCZOS))
                    out.paste(tile.convert("RGB"), (x, y + lab))
                d.text((x + 2, y + 3), f"{book[slug]['name']} {label}", fill=(240, 236, 220))
        tag = f"-{only}" if only else ""
        path = os.path.join(OUT_DIR, f"_sheet{tag}.png" if len(pages) == 1 else f"_sheet{tag}-{n:02d}.png")
        out.save(path); print(path)


# --- install -----------------------------------------------------------------------------------
def numbers():
    return json.load(open(NUMBERS_PATH)) if os.path.exists(NUMBERS_PATH) else {}


def save_numbers(nums):
    json.dump(dict(sorted(nums.items(), key=lambda kv: kv[1])), open(NUMBERS_PATH, "w"), indent=1)


def number_key(slug, variant=None):
    """beast_numbers.json key: the main portrait by slug, a variant look (a second style) by slug~<style>."""
    return f"{slug}~{variant}" if variant else slug


def assign_numbers(variant=None):
    """Give every roster beast a portrait number in roster order, from the next free one, drawing nothing."""
    book, nums = roster(), numbers()
    nxt = max([total_avatars()] + list(nums.values())) + 1
    fresh = 0
    for slug in book:
        key = number_key(slug, variant)
        if key not in nums: nums[key] = nxt; nxt += 1; fresh += 1
    save_numbers(nums)
    print(f"{fresh} {'variant ' if variant else ''}portraits newly numbered; {len(nums)} numbered {min(nums.values())}..{max(nums.values())}")


def keyed_fraction(path):
    h = Image.open(path).convert("RGBA").getchannel("A").histogram()
    return h[0] / sum(h)


def auto_picks(style, variant=None):
    """slug=take for every numbered beast with no portrait installed yet: its first drawn take in `style` whose ground keyed."""
    book, nums = roster(), numbers()
    picks = []
    for slug in book:
        key = number_key(slug, variant)
        if key in nums and os.path.exists(os.path.join(BEAST_DIR, f"{nums[key]:03d}.webp")): continue
        for st, i in takes_of(slug, drawn=True):
            if st == style and keyed_fraction(take_path(slug, st, i)) >= 0.15:
                picks.append(f"{slug}={st}{i}"); break
    return picks


def installed_total():
    """The highest portrait number such that every number from 1 up to it has a webp file."""
    have = {int(f[:3]) for f in os.listdir(BEAST_DIR) if re.fullmatch(r"\d{3}\.webp", f)}
    n = 0
    while n + 1 in have: n += 1
    return n


def total_avatars():
    m = re.search(r"TOTAL_BEAST_AVATARS = (\d+)", open(SERVICE_TS).read())
    return int(m.group(1))


def bump_total(new_total):
    for path, pat in ((SERVICE_TS, r"(TOTAL_BEAST_AVATARS = )\d+"), (AVATAR_VUE, r"(const nAvatars = )\d+")):
        src = open(path).read()
        src2, n = re.subn(pat, lambda m: f"{m.group(1)}{new_total}", src, count=1)
        if n: open(path, "w").write(src2)
        print(f"{os.path.relpath(path, ROOT)}: {'bumped to ' + str(new_total) if n else 'pattern not found'}")


# Beasts 001-093 are the original art (many drawn with the owner's kids); the pipeline only ever adds after them
ORIGINAL_ART_MAX = 93


def install(picks, style="d", variant=None):
    """Write picked takes as numbered webp portraits; variant names the style whose look is the beast's second portrait."""
    if picks == ["auto"]:
        picks = auto_picks(style, variant); print(f"auto: {len(picks)} {'variant ' if variant else ''}portraits to install")
    book, nums = roster(), numbers()
    nxt = max([total_avatars()] + list(nums.values())) + 1
    for pick in picks:
        slug, _, take = pick.partition("=")
        if slug not in book: sys.exit(f"unknown beast {slug}")
        m = re.fullmatch(r"([a-d])(\d+)", take)
        if not m: sys.exit(f"{pick}: say slug=a2 (style letter + take number)")
        src = take_path(slug, m.group(1), int(m.group(2)))
        if not os.path.exists(src) or not os.path.getsize(src): sys.exit(f"{src} does not exist")
        key = number_key(slug, variant)
        if key not in nums: nums[key] = nxt; nxt += 1
        im = Image.open(src).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
        dst = os.path.join(BEAST_DIR, f"{nums[key]:03d}.webp")
        if nums[key] <= ORIGINAL_ART_MAX: sys.exit(f"{slug}: refusing to overwrite {nums[key]:03d}.webp, the family's original art (001-{ORIGINAL_ART_MAX:03d})")
        im.save(dst, "WEBP", quality=92, method=6)
        print(f"{slug}: {take} -> {os.path.relpath(dst, ROOT)}")
    save_numbers(nums)
    total = installed_total()
    if total > total_avatars(): bump_total(total)
    missing = sorted(n for n in nums.values() if n > total)
    if missing: print(f"{len(missing)} numbered beasts have no portrait yet (from {missing[0]:03d}); the avatar count stays at {total}")


def emit_ts():
    book, nums = roster(), numbers()
    rows = [book[s] for s in sorted((k for k in nums if "~" not in k), key=nums.get)]
    variants = {k.split("~")[0]: n for k, n in nums.items() if "~" in k}
    # the starter world's hand-picked battle backgrounds; everyone else gets a stable pair from the slug
    picked = {"socktopus": (219, 218), "dish-goblin": (44, 101), "dust-bunny-king": (150, 77), "laundry-lurker": (88, 203),
              "weed-wyrm": (12, 266), "trash-troll": (301, 55), "crumb-gremlin": (170, 9), "homework-hydra": (230, 140),
              "bed-basilisk": (120, 288), "fang-fairy": (60, 190)}
    def bg(slug, salt): return picked[slug][salt - 1] if slug in picked else zlib.crc32(f"{slug}:{salt}".encode()) % 327
    lines = ['import type { Beast } from "@/lib/databases/BestiaryDb";', "",
             "/** Starter beast library: one beast per common chore, drawn by tools/art/beast_portraits.py from",
             " *  tools/art/beast_roster.json. Generated: edit the roster and re-run --emit-ts. */",
             "export interface LibraryBeast extends Beast {", "  slug: string;", "  chore: string;", "  room: string;",
             '  age: "little" | "kid" | "teen";', "  /** A second look for the same beast (NNN.webp), for elite or shadow encounters */",
             "  variantAvatar?: number;", "}", "", "export const BEAST_LIBRARY: LibraryBeast[] = ["]
    for b in rows:
        lines.append("  " + json.dumps({"id": f"beast-{b['slug']}", "slug": b["slug"], "name": b["name"], "chore": b["chore"],
                                        "room": b["room"], "age": b["age"], "element": b["element"], "avatar": nums[b["slug"]],
                                        **({"variantAvatar": variants[b["slug"]]} if b["slug"] in variants else {}),
                                        "bg1": bg(b["slug"], 1), "bg2": bg(b["slug"], 2), "aspectRatio": 48,
                                        "checklist": b["checklist"]}, ensure_ascii=False) + ",")
    lines += ["];", ""]
    open(LIBRARY_TS, "w").write("\n".join(lines))
    print(f"{os.path.relpath(LIBRARY_TS, ROOT)}: {len(rows)} beasts")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("-n", type=int, default=1, help="takes per beast")
    ap.add_argument("-j", type=int, default=3, help="parallel requests")
    ap.add_argument("--style", default=os.environ.get("XP_BEAST_STYLE", "a"), choices=list(STYLES))
    ap.add_argument("--all", action="store_true", help="every beast without a take in this style")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--only", help="style letters to show on the sheet, e.g. abd")
    ap.add_argument("--now", action="store_true", help="sheet: show the starter beasts' current portrait too")
    ap.add_argument("--rekey", action="store_true")
    ap.add_argument("--assign", action="store_true", help="number every roster beast in roster order, drawing nothing")
    ap.add_argument("--variant", metavar="STYLE", help="assign/install: number this style's takes as each beast's second look")
    ap.add_argument("--install", nargs="+", metavar="slug=a1", help="or `auto`: the first clean take of every beast not yet installed")
    ap.add_argument("--emit-ts", action="store_true")
    a = ap.parse_args()
    if a.assign: return assign_numbers(a.variant)
    if a.install: return install(a.install, a.variant or a.style, a.variant)
    if a.emit_ts: return emit_ts()
    if a.sheet: return sheet(a.slugs, a.only, a.now)
    if a.rekey: return rekey(a.slugs or list(roster()))
    slugs = a.slugs
    if a.all: slugs = [s for s in roster() if not any(st == a.style for st, _ in takes_of(s, drawn=True))]
    if not slugs: return ap.print_help()
    run(slugs, a.style, a.n, a.j)


if __name__ == "__main__":
    main()
