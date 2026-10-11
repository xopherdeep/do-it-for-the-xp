#!/usr/bin/env python3
"""
Chore beasts for the bestiary: chunky SNES-style pixel sprites in the spirit of the later portraits
(the sponge goblin, the dust devil). Each beast is a hand-authored pixel map below; the renderer adds a
one-pixel ink outline, lights it from the top-left, and scales it to the 480x480 transparent PNG the
Compendium's avatar picker expects (src/assets/images/beasts/NNN.png, numbered after the existing set).
Numbers follow ROSTER order, so re-running never renumbers a beast; append new beasts at the end.
Usage: python3 beasts.py [--start 74] [--out DIR] [--sheet sheet.png] [slug ...]
"""
import argparse, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT_DIR = os.path.join(ROOT, "src", "assets", "images", "beasts")
SIZE = 480          # the portrait canvas
TARGET = 408        # the sprite's longest side on that canvas, like the goblin's
INK = (26, 20, 30)
COMMON = {"k": INK, "p": (28, 22, 32), "w": (248, 248, 244), ".": None}
FLAT = {"k", "p", "w"}   # never shaded: ink lines, pupils, eye whites and teeth


def mix(c, to, t):
    return tuple(int(round(a + (b - a) * t)) for a, b in zip(c, to))


def light(c, t):
    return mix(c, (255, 255, 255), t)


def dark(c, t):
    return mix(c, (0, 0, 0), t)


def expand(rows, mirror, width):
    """Pad every row to `width`; a mirrored beast is authored as its left half only."""
    out = []
    for r in rows:
        r = r.ljust(width, ".")
        if len(r) > width:
            raise ValueError(f"row wider than {width}: {r!r}")
        out.append(r + r[::-1] if mirror else r)
    return out


def render(beast):
    half = beast.get("mirror", False)
    width = beast.get("width", 16 if half else 32)
    rows = expand(beast["rows"], half, width)
    palette = {**COMMON, **beast["palette"]}
    flat = FLAT | set(beast.get("flat", ""))
    unknown = {ch for r in rows for ch in r} - set(palette)
    if unknown:
        raise ValueError(f"{beast['slug']}: no colour for {sorted(unknown)}")
    H, W = len(rows), len(rows[0])

    def solid(x, y):
        return 0 <= x < W and 0 <= y < H and palette[rows[y][x]] is not None

    img = Image.new("RGBA", (W + 2, H + 2), (0, 0, 0, 0))
    px = img.load()
    for y in range(H):
        for x in range(W):
            base = palette[rows[y][x]]
            if base is None:
                continue
            c = base
            if rows[y][x] not in flat:
                if not solid(x, y - 1):
                    c = light(base, 0.30)
                elif not solid(x - 1, y):
                    c = light(base, 0.16)
                elif not solid(x, y + 1):
                    c = dark(base, 0.32)
                elif not solid(x + 1, y):
                    c = dark(base, 0.18)
            px[x + 1, y + 1] = (*c, 255)
    # the ink outline: every empty cell that touches the sprite on a side
    for y in range(H + 2):
        for x in range(W + 2):
            if px[x, y][3]:
                continue
            if any(solid(x - 1 + dx, y - 1 + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = (*INK, 255)

    scale = max(6, min(14, TARGET // max(W + 2, H + 2)))
    big = img.resize(((W + 2) * scale, (H + 2) * scale), Image.NEAREST)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ox = (SIZE - big.width) // 2
    oy = (SIZE - big.height) // 2 + scale // 2
    canvas.alpha_composite(big, (ox, max(0, min(SIZE - big.height, oy))))
    return canvas


# --- the roster -------------------------------------------------------------------------------
# '.' is transparent, 'k' ink, 'p' pupil, 'w' white. Mirrored beasts are drawn as their left half.
ROSTER = [
    dict(slug="dust-bunny", name="Dust Bunny", mirror=True,
         palette={"g": (172, 166, 176), "e": (222, 160, 180), "r": (226, 56, 70), "n": (236, 128, 150)},
         rows=[
             "..........gg....",
             ".........geeg...",
             ".........geeg...",
             "........ggeeg...",
             "........geeeg...",
             "........geeeg...",
             "........ggeeg...",
             ".........geegg..",
             ".........gggggg.",
             "......gggggggggg",
             "....gggggggggggg",
             "...ggggggggggggg",
             "..gggggggggggggg",
             "..gggrrrgggggggg",
             "..gggrkrgggggggg",
             ".ggggggggggggggg",
             ".gggggggggggggnn",
             ".ggggggggggggggg",
             "..ggggggggggggkk",
             "..gggggggggggggg",
             "...ggggggggggggg",
             "....gggggggggggg",
             ".....ggggggggggg",
             "......gggggggggg",
             ".....ggg.ggggggg",
             "....gggg..gggg..",
             "....gggg........",
         ]),
    dict(slug="sock-gremlin", name="Sock Gremlin",
         palette={"s": (206, 64, 78), "t": (238, 236, 228), "d": (70, 20, 30), "h": (242, 196, 84)},
         rows=[
             "..........sssssssssss...........",
             ".........sdddddddddddds.........",
             ".........sdtdtdtdtdtdds.........",
             ".........sdddddddddddds.........",
             ".........sssssssssssss..........",
             ".........ttttttttttttt..........",
             ".........sssssssssssss..........",
             ".........sskkssssskkss..........",
             ".........swwwssssswwws..........",
             ".........swpwssssswpws..........",
             ".........sssssssssssss..........",
             ".........ttttttttttttt..........",
             ".........sssssssssssss..........",
             "........sssssssssssssss.........",
             ".......ssssssssssssssss.........",
             "......sssssssssssssssss.........",
             ".....ssssssssssssssssss.........",
             "....sssssssssssssssssssss.......",
             "...sssssssssssssssssssssss......",
             "..hhsssssssssssssssssssssss.....",
             "..hhhssssssssssssssssssssssss...",
             "...hhhsssssssssssssssssssssss...",
             "....hhhhssssssssssssssssshhhh...",
             "......hhhhhhhssssssssshhhhhhh...",
             "........hhhhhhhhhhhhhhhhhhhh....",
             "..........hhhhhhhhhhhhhhhh......",
         ]),
    dict(slug="dish-golem", name="Dish Pile Golem", mirror=True,
         palette={"c": (240, 240, 234), "b": (96, 136, 206)},
         rows=[
             "...........ccccc",
             "..........cbbbbb",
             "..........cccccc",
             "...........ccccc",
             ".......ccccccccc",
             ".....ccccccccccc",
             "......bbbbbbbbbb",
             ".......ccccccccc",
             "........cccccccc",
             ".........ccccccc",
             "..........cccccc",
             "......kccccccccc",
             "....ccckkccccccc",
             "....cccwpccccccc",
             "....cccppccccccc",
             "....cccccccccccc",
             ".....cccccckkkkk",
             "......cccccccccc",
             ".......bbbbbbbbb",
             ".........ccccccc",
             "..cc....cccccccc",
             ".ccccc..cccccccc",
             "...ccccccccccccc",
             ".....ccccccccccc",
             "......bbbbbbbbbb",
             "....cccccccccccc",
             "..ccccckcccccccc",
             "...bbbbbbbbbbbbb",
         ]),
    dict(slug="laundry-heap", name="Laundry Heap", mirror=True,
         palette={"j": (70, 96, 160), "s": (214, 70, 80), "y": (236, 200, 80), "t": (240, 240, 236),
                  "g": (110, 180, 90), "d": (36, 30, 40), "e": (255, 230, 90)}, flat="de",
         rows=[
             "..........tt....",
             ".........tttt...",
             "........ssstt...",
             ".......ssssss...",
             "......sssssssyyy",
             ".....ssssssyyyyy",
             "....jjjsssyyyyyy",
             "...jjjjjjsyyyyyy",
             "..jjjjjjjjyyyyyy",
             "..jjjjjjjjjyyyyy",
             ".jjjjjjjjddddddd",
             ".jjjjjjjddddeedd",
             ".jjjjjjjddddeedd",
             ".ggjjjjjjddddddd",
             "gggggjjjjjjjjjjj",
             "ggggggggjjjjjjjj",
             "gggggggggjjjjjjj",
             "ggggggggsssssssj",
             ".ggggggsssssssss",
             ".tttgggsssssssss",
             "..ttttgsssssssss",
             "...ttttsssssssss",
             "....tttttsssssss",
             ".....ttttttttttt",
         ]),
    dict(slug="soap-slime", name="Soap Scum Slime", mirror=True,
         palette={"a": (90, 190, 180), "m": (120, 150, 110), "o": (220, 245, 240)},
         rows=[
             "...............a",
             "..............aa",
             ".............aaa",
             "............aaaa",
             "...........aaaaa",
             "..........aaaaaa",
             ".........aaaaaaa",
             "........aaaaaaaa",
             ".......aaaaaaaaa",
             "......aaaoaaaaaa",
             ".....aaaoooaaaaa",
             ".....aaaaoaaaaaa",
             "....aaaaaaaaaaaa",
             "....aaawwwwaaaaa",
             "...aaaawwppaaaaa",
             "...aaaawwppaaaaa",
             "...aaaaawwaaaaaa",
             "..aaaaaaaaaaaaaa",
             "..aaaaaaaaakkkkk",
             "..aaaaaaaaakaaaa",
             "..aaaammaaaaaaaa",
             ".aaaammmmaaaaaaa",
             ".aaaaammaaaaaaaa",
             ".aaaaaaaaaaaaaaa",
             ".aaaaaaaaaaaaaaa",
             "..aaaaaaaaaaaaaa",
             "...aaaaaaaaaaaaa",
         ]),
    dict(slug="crumb-crawler", name="Crumb Crawler", mirror=True,
         palette={"b": (214, 160, 86), "c": (150, 96, 46), "y": (248, 226, 150), "r": (220, 40, 50)},
         rows=[
             "..........k.....",
             "...........k....",
             "..........cccccc",
             ".........ccbbbbb",
             "........ccbbrbbb",
             "........cbbbrbbb",
             "........cbbbbbbb",
             ".......kkcbbbbbb",
             "......cccccccccc",
             "....ccbbbbbbbbbb",
             "...ccbbbybbbbbbb",
             "..ccbbbbbbbbybbb",
             "..cbbbbbbbbbbbbb",
             "kkcbbbbybbbbbbbb",
             ".kcbbbbbbbbbbbbb",
             "..cbbbbbbbbbbybb",
             "kkcbbbbbbbbbbbbb",
             ".kcbbbybbbbbbbbb",
             "..cbbbbbbbbbbbbb",
             "kkccbbbbbbbbbbbb",
             ".kkccbbbbbybbbbb",
             "....ccbbbbbbbbbb",
             "......ccbbbbbbbb",
             "........cccccccc",
         ]),
    dict(slug="grease-ghoul", name="Grease Ghoul",
         palette={"o": (78, 46, 96), "y": (250, 220, 70), "g": (110, 114, 124), "h": (60, 60, 70),
                  "n": (140, 90, 50)}, flat="y",
         rows=[
             ".............ooooo..............",
             "...........ooooooooo............",
             "..........ooooooooooo...........",
             ".........ooooooooooooo..........",
             ".........ooyyooooooyyo..........",
             "........oooyyooooooyyoo.........",
             "........ooooooooooooooo.........",
             "........ooooooooooooooo.........",
             "........ooookkkkkkkoooo.........",
             "........oookkkkkkkkkooo.........",
             ".........ooookkkkkoooo..........",
             ".........oooooooooooooo.........",
             "..........ooooooooooooo.........",
             "..........oooooooooooooo........",
             "...........ooooooooooooo........",
             "...........oooooooooooooo.......",
             "..........ooooooooooooooo.......",
             ".........ooooo.oooo.ooooo.......",
             ".........oooo..ooo...oooo.......",
             "..........oo...oo.....oo........",
             "..........o....o.......o........",
             ".....ggggggggggggggggggggggg....",
             "....ghhhhhhhhhhhhhhhhhhhhgnnnnnn",
             ".....ghhhhhhhhhhhhhhhhhhhg......",
             "......ggggggggggggggggggg.......",
         ]),
    dict(slug="weed-wraith", name="Weed Wraith", mirror=True,
         palette={"f": (238, 238, 228), "g": (84, 160, 70), "d": (50, 110, 46), "n": (150, 110, 70),
                  "y": (250, 220, 70)}, flat="y",
         rows=[
             "............ff..",
             "..........ffffff",
             "........ffffffff",
             ".......fffffffff",
             "......ffffffffff",
             ".....fffffffffff",
             ".....fffykffffff",
             ".....fffkkffffff",
             "....ffffffffffff",
             "....ffffffffffff",
             ".....fffffffkkkk",
             "......ffffffffff",
             ".......fffffffff",
             "........ffffffff",
             "..........ffffff",
             "..............gg",
             "..............gg",
             "..dd..........gg",
             ".dddd.........gg",
             "..ddddd.......gg",
             "....ddddddd...gg",
             "......dddddddggg",
             "...........ggggg",
             "..............gg",
             "..............gg",
             "..............gg",
             ".........nnnnnng",
             ".......nnn....ng",
             ".....nn.......nn",
             "....n.........n.",
         ]),
    dict(slug="trash-troll", name="Trash Troll",
         palette={"b": (52, 52, 62), "y": (250, 220, 70), "n": (240, 200, 60), "m": (120, 180, 90)}, flat="ym",
         rows=[
             "..m.......bb....bb.......m......",
             "...m.....bbbb..bbbb.....m.......",
             "..m.......bbbbbbbb.......m......",
             "...........bbbbbb...............",
             ".........bbbbbbbbbb.............",
             ".......bbbbbbbbbbbbbb...........",
             "......bbbbbbbbbbbbbbbb..........",
             ".....bbbbyybbbbbbyybbbb.........",
             "....bbbbbyybbbbbbyybbbbb........",
             "....bbbbbbbbbbbbbbbbbbbb........",
             "...bbbbbbbbbbbbbbbbbbbbbb.......",
             "...bbbbbbkwkwkwkwkbbbbbbb.......",
             "...bbbbbbkkkkkkkkkbbbbbbb.......",
             "..bbbbbbbbbbbbbbbbbbbbbbbbnn....",
             "..bbbbbbbbbbbbbbbbbbbbbbbnnnn...",
             "..bbbbbbbbbbbbbbbbbbbbbbbnn.nn..",
             "..bbbbbbbbbbbbbbbbbbbbbbbbb..nn.",
             "..bbbbbbbbbbbbbbbbbbbbbbbbb.....",
             "...bbbbbbbbbbbbbbbbbbbbbbb......",
             "...bbbbbbbbbbbbbbbbbbbbbbb......",
             "....bbbbbbbbbbbbbbbbbbbbb.......",
             ".....bbbbbbbbbbbbbbbbbbb........",
             "......bbbbbbbbbbbbbbbbb.........",
             ".......bbbbb.....bbbbb..........",
             ".......bbbbb.....bbbbb..........",
             "......bbbbbb.....bbbbbb.........",
         ]),
    dict(slug="lint-lurker", name="Lint Lurker", mirror=True,
         palette={"l": (154, 164, 186), "d": (120, 128, 150), "c": (120, 240, 255)}, flat="c",
         rows=[
             "........ll...l..",
             "......lllll.lll.",
             "....llllllllllll",
             "...lllllllllllll",
             "..llllllllllllll",
             ".lllllllllllllll",
             ".lllllccllllllll",
             "llllllccllllllll",
             "llllllllllllllll",
             "lllllllllllkllll",
             ".llllllllllkkkkk",
             ".llllllllllllkll",
             "..llllllllllllll",
             "...lllllllllllll",
             "....llllllllllll",
             ".....llll.lllll.",
             "....ddd....llll.",
             "...ddd......ll..",
             "..kdk...........",
             ".k.k.k..........",
         ]),
    dict(slug="mud-puppy", name="Mud Puppy",
         palette={"m": (128, 86, 52), "t": (230, 100, 120)},
         rows=[
             "....mm..........................",
             "...mmmm.....................mm..",
             "...mmmmmmmmmm..............mmm..",
             "..mmmmmmmmmmmm............mmmm..",
             "..mmmwwmmmmmmm...........mmmm...",
             "..mmmwpmmmmmmmm.........mmmm....",
             "..mmmmmmmmmmmmmm.......mmmm.....",
             "..mmmmmmmmmmmmmmmmmmmmmmmmm.....",
             ".mmmkmmmmmmmmmmmmmmmmmmmmmm.....",
             ".mmkkmmmmmmmmmmmmmmmmmmmmmm.....",
             "..mmmmmmmmmmmmmmmmmmmmmmmmm.....",
             "..mmmttmmmmmmmmmmmmmmmmmmm......",
             "...mmttmmmmmmmmmmmmmmmmmmm......",
             "....ttmmmmmmmmmmmmmmmmmmmmm.....",
             ".....mmmmmmmmmmmmmmmmmmmmmm.....",
             ".....mmmmm.mmmmmmmm.mmmmmmm.....",
             ".....mmmm...mmmmmm...mmmmm......",
             "......mmm....mmmm.....mmmm......",
             "......mmm....mmmm.....mmmm......",
             ".....mmmm....mmm......mmmm......",
             ".....mmm......mm.......mmm......",
             "......m.......m.........m.......",
         ]),
    dict(slug="cobweb-widow", name="Cobweb Widow", mirror=True,
         palette={"b": (44, 38, 54), "r": (220, 40, 60), "t": (220, 220, 230)}, flat="rt",
         rows=[
             "...............t",
             "...............t",
             "...............t",
             "............bbbb",
             "...........bbbbb",
             "..........bbrbrb",
             "..........bbbrbb",
             "...........bbbbb",
             "...........bwbbb",
             ".bb.....bbbbbbbb",
             "..bb..bbbbbbbbbb",
             "...bbbbbbbbbbbbb",
             "....bbbbbbbbbbbb",
             "bbbbbbbbbbbbbbbb",
             "bbbbbbbbbbbbbbrr",
             "b...bbbbbbbbbbbr",
             "....bbbbbbbbbbrr",
             "bbbbbbbbbbbbbbbb",
             "bb..bbbbbbbbbbbb",
             "b....bbbbbbbbbbb",
             "b.....bbbbbbbbbb",
             ".......bbbbbbbbb",
             "...bbbbbbbbbbbbb",
             "..bb....bbbbbbbb",
             ".bb.......bbbbbb",
             "bb..............",
             "b...............",
         ]),
    dict(slug="homework-hydra", name="Homework Hydra", mirror=True,
         palette={"y": (246, 204, 70), "e": (236, 120, 150), "g": (190, 190, 190), "n": (70, 110, 200),
                  "t": (240, 240, 236), "d": (150, 100, 50)},
         rows=[
             "..............kk",
             ".............ddd",
             "............dddd",
             "....kk.....yyyyy",
             "...ddd.....ykyyy",
             "...dddd....yyyyy",
             "..yyyyy....yyyyy",
             "..ykyyy....yyyyy",
             "..yyyyyy...yyyyy",
             "..yyyyyy...yyyyy",
             "...yyyyyy..yyyyy",
             "...yyyyyy..yyyyy",
             "....yyyyyy.yyyyy",
             "....yyyyyyyyyyyy",
             ".....yyyyyyyyyyy",
             "......gggggggggg",
             "......eeeeeeeeee",
             "....nnnnnnnnnnnn",
             "...nnnnnnnnnnnnn",
             "...nttttttttttnn",
             "...nttttttttttnn",
             "...nnnnnnnnnnnnn",
             "...nnnnnnnnnnnnn",
             "..nnnnnnnnnnnnnn",
             "..nnnnnnnnnnnnnn",
         ]),
    dict(slug="toy-tornado", name="Toy Tornado", mirror=True,
         palette={"v": (176, 194, 214), "r": (226, 60, 60), "b": (60, 110, 220), "y": (246, 204, 60),
                  "o": (226, 150, 80)},
         rows=[
             "....vvvvvvvvvvvv",
             "r.vvvvvvvvvvvvvv",
             ".vvvvvrrvvvvvvvv",
             ".vvvvvrrvvvvbbvv",
             "..vvvvvvvvvvbbvv",
             "...vvvvvvvvvvvvv",
             "y...vvvvvvvvvvvv",
             ".....vvvvwwvvvvv",
             ".....vvvvwpvvvvv",
             "......vvvvvvvvvv",
             ".......vvyyvvvvv",
             ".......vvyyvvvvv",
             "........vvvvvvvv",
             ".........vvvvvvv",
             ".........vvvooov",
             "..........vvoooo",
             "..........vvoooo",
             "...........vvvvv",
             "...........vvvvv",
             "............vvvv",
             "............vvvv",
             ".............vvv",
             ".............vvv",
             "..............vv",
             "..............vv",
             "...............v",
         ]),
    dict(slug="mold-mimic", name="Mold Mimic", mirror=True,
         palette={"c": (200, 60, 60), "d": (60, 20, 30), "t": (240, 240, 236), "m": (110, 180, 90),
                  "y": (250, 220, 70), "r": (230, 100, 130), "h": (190, 160, 80)}, flat="dty",
         rows=[
             "......mm.m......",
             ".....mmmmmmm.m..",
             "....cccccccccccc",
             "...ccccccccccccc",
             "...ccyyccccccccc",
             "...ccyyccccccccc",
             "...ccccccccccccc",
             "...ccccccccccccc",
             "...ddddddddddddd",
             "...dtdtdtdtdtdtd",
             "...ddddddddddddd",
             "..mdddddddddrrrr",
             "..mmddddrrrrrrrr",
             "...dtdtdtdtdtdtd",
             "...ccccccccccccc",
             "..mcccccccccchhh",
             "..mmcccccccccccc",
             "...ccccccccccccc",
             "...ccccccccccccc",
             "...cmmccccccmccc",
             "...ccccccccccccc",
             "...ccccccccccccc",
             "...ccccccccccccc",
             "....cccccccccccc",
         ]),
    dict(slug="freezer-yeti", name="Freezer Yeti", mirror=True,
         palette={"i": (206, 232, 246), "b": (120, 170, 220), "e": (40, 90, 170), "u": (170, 210, 240)},
         rows=[
             "..........iiiiii",
             "........iiiiiiii",
             ".......iiiiiiiii",
             "......iiiibbbbbb",
             "......iiibbbbbbb",
             ".....iiiibbwebbb",
             ".....iiiibbeebbb",
             ".....iiiibbbbbbb",
             ".....iiiibkkkkkk",
             ".....iiiibkwkwkw",
             "......iiibbbbbbb",
             ".......iiiiiiiii",
             "..uu..iiiiiiiiii",
             ".uuuuiiiiiiiiiii",
             ".uuuuiiiiiiiiiii",
             "iiiiiiiiiiiiiiii",
             "iiiiiiiiiiiiiiii",
             "iiii.iiiiiiiiiii",
             "iiii..iiiiiiiiii",
             "iiii..iiiiiiiiii",
             ".ii...iiiiiiiiii",
             "......iiiiiiiiii",
             "......iiiiiiiiii",
             "......iiiiiiiiii",
             ".......iiii.iiii",
             ".......iiii.iiii",
             "......iiiii.iiii",
         ]),
    dict(slug="puddle-phantom", name="Puddle Phantom",
         palette={"l": (186, 214, 242), "b": (120, 170, 230), "g": (220, 235, 245), "m": (246, 248, 250)}, flat="m",
         rows=[
             "............llllllll............",
             "..........llllllllllll..........",
             ".........llllllllllllll.........",
             "........llllllllllllllll........",
             "........lllppllllllpplll........",
             "........lllppllllllpplll........",
             "........llllllllllllllll........",
             "........llllllllllllllll........",
             "........llllllkkkkllllll........",
             "........lllllkkkkkklllll........",
             "........llllllkkkkllllll........",
             ".....ll.llllllllllllllll.ll.....",
             "....llllllllllllllllllllllll....",
             "....llllllllllllllllllllllll....",
             ".....lllllllllllllllllllllll....",
             ".......llllllllllllllllllll.....",
             ".......lllll.llllll.lllllll.....",
             ".......llll...llll...lllll......",
             ".......lll.....ll.....lll.......",
             ".......ll.......l......ll.ggggg.",
             "...bbbbbbbbbbbbbbbbbbbbbbbgmmmmg",
             ".bbbbbbbbbbbbbbbbbbbbbbbbmmmmmmg",
             "...bbbbbbbbbbbbbbbbbbbbbbbbgggg.",
             ".......bbbbbbbbbbbbbbbb.........",
         ]),
    dict(slug="candy-blob", name="Sticky Candy Blob", mirror=True,
         palette={"c": (240, 132, 172), "y": (250, 220, 70), "b": (80, 140, 230), "r": (226, 60, 60),
                  "t": (240, 240, 236)},
         rows=[
             "..........rrrr..",
             ".........rrwrrr.",
             ".........rrrrrr.",
             "..........rrrr..",
             "...........tt...",
             "........ccctt...",
             "......cccccttccc",
             ".....ccccccccccc",
             "....cccccccccccc",
             "...ccccyyccccccc",
             "...cccccyyycccbb",
             "..ccccccccccccbb",
             "..cccwwwcccccccc",
             "..cccwppcccccccc",
             "..cccwwwcccccccc",
             "..cccccccccccccc",
             ".ccccccccccckkkk",
             ".cccccccccckcccc",
             ".cccccccccccccc.",
             ".cccbbcccccccccc",
             "..ccbbbccccccccc",
             "..cccccccccccccc",
             "...ccccccccccccc",
             "....cccccccccccc",
             ".....ccc.ccccccc",
             "......c..ccccc..",
             ".........cc.....",
         ]),
    dict(slug="litter-imp", name="Litter Imp",
         palette={"r": (206, 66, 70), "h": (240, 200, 80), "y": (250, 230, 80), "s": (170, 170, 180),
                  "n": (140, 90, 50), "g": (200, 190, 160)}, flat="y",
         rows=[
             "..........hh......hh............",
             "..........hhh....hhh............",
             "...........rrrrrrrr.............",
             "..........rrrrrrrrrr............",
             ".........rrrrrrrrrrrr...........",
             ".........rryyrrrryyrr...........",
             ".........rrykrrrrkyrr...........",
             ".........rrrrrrrrrrrr...........",
             ".........rrrkwkwkwrrr...........",
             "..........rrkkkkkkrr............",
             "...........rrrrrrrr.............",
             "...........rrrrrrrr.............",
             ".........rrrrrrrrrrrr...........",
             "........rrrrrrrrrrrrrr..........",
             ".......rrrrrrrrrrrrrrrr.........",
             "......rrr.rrrrrrrr.rrrr.........",
             ".....rrr..rrrrrrrr..rrrr........",
             "....rrr...rrrrrrrr...rrrr.......",
             "...rrr....rrrrrrrr....nnn.......",
             "..rrr.....rrrrrrrr.....nn.......",
             "..rr......rrrrrrrr......nn......",
             "..........rrrrrrrr.......nn.....",
             "..........rrrrrrrr........ssss..",
             ".....r.....rrrrrr........ssggss.",
             "....rrr....rr..rr........ssggss.",
             ".....rr....rr..rr.........ssss..",
             "......rrrrrrr..rrr..............",
             "..........kk....kk..............",
         ]),
    dict(slug="dust-bat", name="Dust Bat", mirror=True,
         palette={"d": (140, 126, 112), "r": (230, 50, 60), "m": (170, 160, 150)}, flat="rm",
         rows=[
             "..........dd....",
             "..........ddd...",
             "..........dddd..",
             ".........dddddd.",
             "........ddddddd.",
             "........ddrrddd.",
             "........ddrkddd.",
             "........ddddddd.",
             "d........ddddwd.",
             "dd.......ddddddd",
             "ddd.....dddddddd",
             "dddd...ddddddddd",
             "ddddd.dddddddddd",
             "dddddddddddddddd",
             "dddddddddddddddd",
             ".ddddddddddddddd",
             "..dddddddddddddd",
             "...ddd.dddd.dddd",
             "....d...dd..dddd",
             ".............ddd",
             "............dd.d",
         ]),
]


def contact_sheet(images, path):
    cols, cell = 5, 160
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 18)), (58, 52, 70))
    draw = ImageDraw.Draw(sheet)
    for i, (label, img) in enumerate(images):
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        sheet.paste(img.resize((cell, cell), Image.NEAREST), (x, y), img.resize((cell, cell), Image.NEAREST))
        draw.text((x + 4, y + cell + 2), label, fill=(240, 236, 220))
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
    for i, beast in enumerate(ROSTER):
        number = a.start + i
        if wanted and beast["slug"] not in wanted:
            continue
        img = render(beast)
        path = os.path.join(a.out, f"{number:03d}.png")
        img.save(path, optimize=True)
        done.append((f"{number:03d} {beast['name']}", img))
        print(f"{number:03d}  {beast['name']:<20} {os.path.relpath(path, ROOT)}")
    if a.sheet:
        contact_sheet(done, a.sheet)
        print("sheet", a.sheet)


if __name__ == "__main__":
    sys.exit(main())
