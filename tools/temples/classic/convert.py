#!/usr/bin/env python3
"""
LTTP dungeon converter: writes tools/temples/classic/dungeons/<id>.json, one per temple, from the pinned
tables under vendor/ (see SOURCES.md). Standard library only; the same inputs give the same bytes.

    python3 tools/temples/classic/convert.py [id ...]      # default: all eight LTTP temples

The schema is tools/temples/classic/classicDungeon.ts. The rules (decided in the plan's Task 5 brief):

  * Cells: a supertile id gives row `id >> 4` and column `id & 0xf`; each of its four screens is one cell at
    (2*row + top/bottom, 2*col + left/right).
  * Door slots: Left/Top is the first half, Right/Bot the second, and a Mid door takes the first half on both ends.
  * Rooms: an area's screens come from its positioned doors, its sprites and its pots. Screens of one area are
    joined by `open` sides; screens of different areas are split by `wall` unless a door or a logical link joins
    them. An area with no screen of its own is absorbed by the area its logical links lead to; areas that share a
    screen become one hall. A sprite's screen is its tile x/y split at 0x10 (the tables keep 5-bit tile
    coordinates, so the brief's 0x20 can never trigger). A chest with no screen sits in its area's first screen.
  * Door kinds: small_key() or a RoomData key kind -> small-key; big_key() or BigKey -> big-key; RoomData
    Bombable/BlastWall/Dashable -> bomb; .trap() or a RoomData Trap kind -> shutter (the side on both ends, the
    `shutter` flag only on the cell whose own door is the trap); logical links named for hookshot, boots/dash,
    torches or flippers -> item; anything else open. Two different non-open kinds on one cell edge stop the run:
    an override moves one door or picks the kind. A key-locked stairway puts `lock` on the stairs link of the cell
    that holds the locked door (one end). `report.smallLocks` counts small-key sides (each pair once) plus locked
    links; `report.mustClear` counts the rooms with a fight behind a shutter or holding a key drop, `side` the
    other fight rooms (boss and miniboss rooms count for neither).
  * Floors: areas joined by plain doors and logical links share a floor; Up/Dn spiral stairs and ladders move
    one floor; a pit lands one floor down (when the landing is not placed already). Floors are named B2, B1, 1F,
    2F ... with the entrance on 1F, each trimmed to its cells.
  * Several entrances: the main door is the entrance; the other overworld doors and the main door form a ring of
    teleports (with one other entrance that is exactly "there and back"). A pit that drops two or more floors, and
    a warp tile, is a teleport.
  * Overrides: overrides/<id>.json may pin screens for an area, a door or a chest, or add or remove a side; every
    override applied is listed in the report.

The report per dungeon: cells per floor, must-clear and side fight cells, keys against locks, warnings, and the
areas the tables could not place (those stop the run with exit 1 until an override settles them).
"""
import ast
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict, deque

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "vendor")
VANILLA = os.path.join(SOURCES, "vanilla")
OUT_DIR = os.path.join(HERE, "dungeons")
OVERRIDE_DIR = os.path.join(HERE, "overrides")

# id, randomizer dungeon name (as Regions.py spells it, apostrophes aside), the main entrance door, vanilla table
TEMPLES = [
    ("storm-temple", "Tower of Hera", "Hera Lobby S", "TowerOfHera.php"),
    ("earth-temple", "Skull Woods", "Skull 1 Lobby S", "SkullWoods.php"),
    ("light-temple", "Desert Palace", "Desert Main Lobby S", "DesertPalace.php"),
    ("water-temple", "Swamp Palace", "Swamp Lobby S", "SwampPalace.php"),
    ("shadow-temple", "Palace of Darkness", "PoD Lobby S", "PalaceOfDarkness.php"),
    ("ice-temple", "Ice Palace", "Ice Lobby SE", "IcePalace.php"),
    ("fire-temple", "Turtle Rock", "TR Main Lobby SE", "TurtleRock.php"),
    ("moon-temple", "Ganons Tower", "GT Lobby S", "GanonsTower.php"),
]

DIRS = ("north", "east", "south", "west")
OPPOSITE = {"north": "south", "south": "north", "east": "west", "west": "east"}
STEP = {"north": (-1, 0), "south": (1, 0), "east": (0, 1), "west": (0, -1)}
DIR_WORD = {"No": "north", "So": "south", "We": "west", "Ea": "east"}
SLOT_HALF = {"Top": 0, "Left": 0, "Mid": 0, "Bot": 1, "Right": 1}
QUADRANT = {"A": 0, "S": 1, "Z": 2, "X": 3}  # A top-left, S top-right, Z bottom-left, X bottom-right
WALL_DOORS = ("Nrml", "StrS", "Open", "Intr")  # doors that become a side between two cells
SIDE_RANK = {"wall": 0, "open": 1, "item": 2, "shutter": 3, "bomb": 4, "small-key": 5, "big-key": 6}
KEY_KINDS = {"SmallKey", "StairKey", "StairKey2", "StairKeyLow", "HauntedStairKey"}
BOMB_KINDS = {"Bombable", "BombableEntrance", "BlastWall", "Dashable"}
TRAP_KINDS = {"Trap", "Trap2", "TrapTriggerable", "TrapTriggerableLow", "TrapLowE3"}
ITEM_GATE_WORDS = ("Hook", "Boots", "Dash", "Torch", "Flipper", "Swim")
PUZZLE_SPRITES = {"CrystalSwitch", "CorrectPullSwitch", "WrongPullSwitch", "WaterSwitch"}
PUZZLE_WORDS = ("Torch", "Peg", "Tile", "Switch", "Push")
BOSS_SPRITES = {
    "ArmosKnight", "Lanmolas", "Moldorm", "HelmasaurKing", "Arrghus", "Mothula", "Blind", "Kholdstare",
    "Vitreous", "TrinexxRockHead", "Agahnim", "Ganon",
}
# the boss of each dungeon: its sprite carries no area name, yet it is the only thing that places a boss room
# that is entered by falling into it (Skull Woods, Ice Palace)
BOSS_OF = {
    "Tower of Hera": "Moldorm", "Skull Woods": "Mothula", "Desert Palace": "Lanmolas", "Swamp Palace": "Arrghus",
    "Palace of Darkness": "HelmasaurKing", "Ice Palace": "Kholdstare", "Turtle Rock": "TrinexxRockHead",
    "Ganons Tower": "Agahnim",
}


def read(name):
    with open(os.path.join(SOURCES, name), encoding="utf8") as handle:
        return handle.read()


def norm(name):
    return name.replace("'", "").replace("’", "")


def scan_calls(src, fname):
    """Yield the argument text of every `fname(` call, aware of quotes and nested parentheses."""
    needle = fname + "("
    i = 0
    while True:
        i = src.find(needle, i)
        if i < 0:
            return
        j = i + len(needle)
        depth = 1
        quote = None
        comment = False
        while depth:
            ch = src[j]
            if comment:
                comment = ch != "\n"
            elif quote:
                if ch == "\\":
                    j += 1
                elif ch == quote:
                    quote = None
            elif ch == "#":
                comment = True
            elif ch in "'\"":
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            j += 1
        yield src[i + len(needle):j - 1]
        i = j


def block(src, name, opener, closer):
    """The bracketed literal that follows `name = <opener>`."""
    start = src.index(name + " = " + opener)
    i = src.index(opener, start)
    depth = 0
    quote = None
    comment = False
    skip = False
    for j in range(i, len(src)):
        ch = src[j]
        if skip:
            skip = False
        elif comment:
            comment = ch != "\n"
        elif quote:
            if ch == "\\":
                skip = True
            elif ch == quote:
                quote = None
        elif ch == "#":
            comment = True
        elif ch in "'\"":
            quote = ch
        elif ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return src[i:j + 1]
    raise ValueError(name)


STR = r"(?P<q>['\"])(?P<s>(?:\\.|(?!(?P=q)).)*)(?P=q)"


def unquote(text):
    return text.replace("\\'", "'").replace('\\"', '"')


class Tables:
    """Every pinned table, parsed once."""

    def __init__(self):
        self.doors = OrderedDict()
        self.portals = []  # (portal name, door name) in create_portals order
        self.regions = OrderedDict()  # name -> {"dungeon", "locations", "exits"}
        self.sprites = defaultdict(list)  # supertile -> [sprite] in creation order
        self.enemy_kind = {}  # sprite kind -> True when it must be cleared
        self.rooms = {}  # supertile -> [(position, kind)]
        self.pairs = {}  # list name -> [(a, b)]
        self.pots = defaultdict(list)  # supertile -> [(x, y, item, region)]
        self.key_drops = {}
        self.vanilla = {}  # normalised location name -> vanilla item
        self._doors()
        self._regions()
        self._sprites()
        self._rooms()
        self._shuffle()
        self._pots()
        self._vanilla()

    def _doors(self):
        src = read("Doors.py")
        chain_re = r"(?P<chain>(?:\.\w+\([^()]*\))*)"
        for m in re.finditer(r"create_door\(player, " + STR + r", (?P<type>\w+)\)" + chain_re, src):
            door = {"name": unquote(m.group("s")), "type": m.group("type"), "small": False, "big": False,
                    "trap": False, "portal": False, "dir": None, "tile": None, "slot": None, "pos": None,
                    "quad": None}
            self._apply_chain(door, m.group("chain"))
            self.doors[door["name"]] = door
        for m in re.finditer(r"^    world\.get_door\(" + STR + r", player\)" + chain_re, src, re.M):
            name = unquote(m.group("s"))
            if name in self.doors:
                self._apply_chain(self.doors[name], m.group("chain"))
        for m in re.finditer(r"create_portal\(player, " + STR + r", world\.get_door\((?P<q2>['\"])(?P<d>(?:\\.|(?!(?P=q2)).)*)(?P=q2), player\)", src):
            self.portals.append((unquote(m.group("s")), unquote(m.group("d"))))

    @staticmethod
    def _apply_chain(door, chain):
        for call in re.finditer(r"\.(\w+)\(([^()]*)\)", chain):
            method, args = call.group(1), [a.strip() for a in call.group(2).split(",")] if call.group(2).strip() else []
            if method == "dir":
                door["dir"], door["tile"], door["slot"] = args[0], int(args[1], 16), args[2]
            elif method == "pos":
                door["pos"] = int(args[0])
            elif method == "ss":
                door["quad"] = QUADRANT[args[0]]
            elif method == "edge":
                door["quad"] = QUADRANT[args[1]]
            elif method == "portal":
                door["portal"] = True
                if door["quad"] is None:
                    door["quad"] = QUADRANT[args[0]]
            elif method == "small_key":
                door["small"] = True
            elif method == "big_key":
                door["big"] = True
            elif method == "trap":
                door["trap"] = True

    def _regions(self):
        src = read("Regions.py")
        for args in scan_calls(src, "create_dungeon_region"):
            if not args.startswith("player, "):
                continue
            try:
                values = ast.literal_eval("(" + args[len("player, "):] + ",)")
            except (ValueError, SyntaxError):
                continue
            name = values[0]
            dungeon = values[1] if len(values) > 1 else "Hyrule"
            locations = list(values[2] or []) if len(values) > 2 else []
            exits = list(values[3] or []) if len(values) > 3 else []
            self.regions[name] = {"dungeon": dungeon, "locations": locations, "exits": exits}

    def _sprites(self):
        src = read("EnemyList.py")
        stats = block(src, "    stats", "{", "}")
        for m in re.finditer(r"EnemySprite\.(\w+): EnemyStats\(EnemySprite\.\w+, (True|False)([^)]*)\)", stats):
            static = m.group(2) == "True"
            ignore = "ignore=True" in m.group(3)
            self.enemy_kind[m.group(1)] = not static and not ignore
        num = r"(0x[0-9a-fA-F]+|\d+)"
        for m in re.finditer(r"create_sprite\(" + num + r", EnemySprite\.(\w+), " + num + r", (\d+), " + num + r", " + num
                             + r"(?:, " + STR + r")?", src):
            tile = int(m.group(1), 0)
            self.sprites[tile].append({
                "kind": m.group(2), "sub": int(m.group(3), 0), "x": int(m.group(5), 0), "y": int(m.group(6), 0),
                "region": unquote(m.group("s")) if m.group("s") is not None else None,
            })

    def _rooms(self):
        src = read("RoomData.py")
        for m in re.finditer(r"Room\(player, (0x[0-9a-fA-F]+), (?:0x[0-9a-fA-F]+|None)\)((?:\.door\(Position\.\w+, DoorKind\.\w+\))*)", src):
            self.rooms[int(m.group(1), 16)] = re.findall(r"\.door\(Position\.(\w+), DoorKind\.(\w+)\)", m.group(2))
        for m in re.finditer(r"^    world\.get_room\((0x[0-9a-fA-F]+), player\)\.swap\((\d+), (\d+)\)", src, re.M):
            doors = self.rooms[int(m.group(1), 16)]
            a, b = int(m.group(2)), int(m.group(3))
            doors[a], doors[b] = doors[b], doors[a]

    def _shuffle(self):
        src = read("DoorShuffle.py")
        for name in ("logical_connections", "vanilla_logical_connections", "spiral_staircases", "straight_staircases",
                     "open_edges", "falldown_pits", "dungeon_warps", "ladders", "interior_doors",
                     "default_door_connections", "default_one_way_connections"):
            self.pairs[name] = [tuple(pair) for pair in ast.literal_eval(block(src, name, "[", "]"))]

    def _pots(self):
        src = read("PotShuffle.py")
        pots = block(src, "vanilla_pots", "{", "}")
        tile = None
        for m in re.finditer(r"(?:^|\n)\s*(?P<tile>0x[0-9a-fA-F]+|\d+): \[|Pot\((?P<x>\d+), (?P<y>\d+), PotItem\.(?P<item>\w+), " + STR, pots):
            if m.group("tile"):
                tile = int(m.group("tile"), 0)
            else:
                self.pots[tile].append((int(m.group("x")), int(m.group("y")), m.group("item"), unquote(m.group("s"))))
        self.key_drops = ast.literal_eval(block(src, "key_drop_data", "{", "}"))

    def _vanilla(self):
        for _, _, _, php in TEMPLES:
            with open(os.path.join(VANILLA, php), encoding="utf8") as handle:
                text = handle.read()
            body = text[text.index("function setVanilla()"):]
            body = body[:body.index("return $this;")]
            for m in re.finditer(r"\$this->locations\[\"([^\"]+)\"\]->setItem\(Item::get\('([^']+)'\)\)", body):
                self.vanilla[norm(m.group(1))] = m.group(2)

    def door_kind(self, door):
        """The RoomData door kind behind .pos(n), or None."""
        entry = self.door_entry(door)
        return entry[1] if entry else None

    def door_position(self, door):
        """The RoomData door position behind .pos(n), or None."""
        entry = self.door_entry(door)
        return entry[0] if entry else None

    def door_entry(self, door):
        if door["pos"] is None or door["tile"] not in self.rooms:
            return None
        doors = self.rooms[door["tile"]]
        return doors[door["pos"]] if door["pos"] < len(doors) else None


def screen_of(door):
    """The (top/bottom, left/right) screen a positioned door sits in, or None."""
    kind, direction = door["type"], door["dir"]
    if kind in ("Nrml", "StrS") and door["slot"] in SLOT_HALF:
        h = SLOT_HALF[door["slot"]]
        return {"No": (0, h), "So": (1, h), "We": (h, 0), "Ea": (h, 1)}[direction]
    if kind == "Intr" and door["slot"] in SLOT_HALF:
        h = SLOT_HALF[door["slot"]]
        return {"No": (1, h), "So": (0, h), "We": (h, 1), "Ea": (h, 0)}[direction]
    if kind in ("Open", "Sprl") and door["quad"] is not None:
        return (door["quad"] >> 1, door["quad"] & 1)
    return None


def sprite_screen(sprite):
    return (1 if sprite["y"] >= 0x10 else 0, 1 if sprite["x"] >= 0x10 else 0)


def pot_screen(pot):
    """PotShuffle keeps y in 16px tiles and x in 4px units modulo 128 (its RoomObject byte is `2x mod 256`)."""
    x, y = pot[0], pot[1]
    return (1 if y >= 16 else 0, 1 if (x % 128) >= 64 else 0)


def global_cell(tile, screen):
    return (2 * (tile >> 4) + screen[0], 2 * (tile & 0xF) + screen[1])


def adjacent(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1


def direction_from(a, b):
    for name, (dr, dc) in STEP.items():
        if (a[0] + dr, a[1] + dc) == b:
            return name
    return None


def floor_name(level):
    return "1F" if level == 0 else (f"{level + 1}F" if level > 0 else f"B{-level}")


class UnionFind:
    def __init__(self, items):
        self.parent = {item: item for item in items}

    def find(self, item):
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


class Conversion:
    def __init__(self, tables, temple_id, dungeon, main_door, overrides):
        self.t = tables
        self.id = temple_id
        self.dungeon = dungeon
        self.main_door = main_door
        self.overrides = overrides
        self.applied = []
        self.warnings = []
        self.errors = []
        self.regions = [name for name, info in tables.regions.items()
                        if norm(info["dungeon"]) == norm(dungeon) and not name.endswith(" Portal")]
        self.region_set = set(self.regions)
        self.owner = {}
        for region in self.regions:
            for exit_name in tables.regions[region]["exits"]:
                self.owner[exit_name] = region
        self.doors = {name: tables.doors[name] for name in self.owner if name in tables.doors}

    # ----- areas and screens -------------------------------------------------------------------------------
    def gather_screens(self):
        """region -> ordered list of (tile, screen) from doors, sprites and pots; overrides pin instead."""
        screens = OrderedDict((region, []) for region in self.regions)

        def add(region, tile, screen):
            if region in screens and (tile, screen) not in screens[region]:
                screens[region].append((tile, screen))

        for name, door in self.doors.items():
            pinned = self.overrides.get("doors", {}).get(name)
            if pinned:
                door["tile"], door["screen"] = int(pinned[0], 16), (pinned[1], pinned[2])
                self.applied.append(f"door {name} pinned to {pinned[0]} ({pinned[1]},{pinned[2]})")
            else:
                door["screen"] = screen_of(door)
            if door["screen"] is not None:
                add(self.owner[name], door["tile"], door["screen"])
        for name in self.overrides.get("doors", {}):
            if name not in self.doors:
                self.errors.append(f"override names an unknown door: {name}")
        for tile, sprites in sorted(self.t.sprites.items()):
            for sprite in sprites:
                if sprite["region"] in screens:
                    add(sprite["region"], tile, sprite_screen(sprite))
        for tile, pots in sorted(self.t.pots.items()):
            for pot in pots:
                if pot[3] in screens:
                    add(pot[3], tile, pot_screen(pot))
        boss_region = self.boss_region()
        if boss_region and not screens[boss_region]:
            for tile, sprites in sorted(self.t.sprites.items()):
                for sprite in sprites:
                    if sprite["region"] is None and sprite["kind"] == BOSS_OF[self.dungeon] and sprite["sub"] != 7:
                        add(boss_region, tile, sprite_screen(sprite))
        for region, pins in self.overrides.get("areas", {}).items():
            if region not in screens:
                self.errors.append(f"override names an unknown area: {region}")
                continue
            screens[region] = [(int(p[0], 16), (p[1], p[2])) for p in pins]
            self.applied.append(f"area {region} pinned to " + ", ".join(f"{p[0]} ({p[1]},{p[2]})" for p in pins))
        for region in screens:
            screens[region].sort()
        self.screens = screens

    def boss_region(self):
        for region in self.regions:
            if any(self.classify(region, loc)[0] == "boss" for loc in self.t.regions[region]["locations"]):
                return region
        return None

    def classify(self, region, location):
        """("event"|"boss"|"pot"|"drop"|"chest", chest kind) for a location of this dungeon."""
        if location.endswith(" - Prize"):
            return ("prize", None)
        if location.endswith(" - Boss") or location == "Agahnim 2":
            return ("boss", None)
        if not norm(location).startswith(norm(self.dungeon) + " - "):
            return ("event", None)  # a switch, a drain, a star tile: logic events, not chests
        drop = self.t.key_drops.get(location)
        if drop and drop[0] == "Pot":
            return ("pot", None)
        if drop and drop[0] == "Drop":
            return ("drop", "big" if "Big Key" in drop[3] else "small")
        if location.endswith("Big Chest"):
            return ("chest", "big-chest")
        item = self.t.vanilla.get(norm(location))
        if item is None:
            return ("chest", None)
        for prefix, kind in (("BigKey", "big-key"), ("Key", "small-key"), ("Map", "map"), ("Compass", "compass")):
            if item.startswith(prefix):
                return ("chest", kind)
        return ("chest", "other")

    def logical_links(self):
        """(from region, to region, door) for every logical door of this dungeon."""
        links = []
        for name in ("logical_connections", "vanilla_logical_connections"):
            for door_name, target in self.t.pairs[name]:
                if door_name in self.owner and target in self.region_set:
                    links.append((self.owner[door_name], target, door_name))
        return links

    def absorb_empty(self):
        """An area with no screen joins the area its logical links lead to (or come from), else its warp's."""
        self.host = {}
        links = self.logical_links()
        warps = [(self.owner[a], b, a) for a, b in self.t.pairs["dungeon_warps"]
                 if a in self.owner and b in self.region_set]
        changed = True
        while changed:
            changed = False
            for region in self.regions:
                if self.screens[region] or region in self.host:
                    continue
                neighbours = [b for a, b, _ in links if a == region] + [a for a, b, _ in links if b == region]
                neighbours += [b for a, b, _ in warps if a == region] + [a for a, b, _ in warps if b == region]
                for other in neighbours:
                    other = self.resolve(other)
                    if self.screens[other]:
                        self.host[region] = other
                        changed = True
                        break
        for region in self.regions:
            if not self.screens[region] and region not in self.host:
                self.errors.append(f"cannot place area: {region} (no door, sprite or pot gives it a screen)")

    def resolve(self, region):
        while region in self.host:
            region = self.host[region]
        return region

    def build_halls(self):
        """Areas that share a screen are one hall; absorbed areas join their host."""
        uf = UnionFind(self.regions)
        for region, host in self.host.items():
            uf.union(host, region)
        claims = defaultdict(list)
        for region in self.regions:
            for spot in self.screens[region]:
                claims[spot].append(region)
        for spot, regions in sorted(claims.items()):
            for other in regions[1:]:
                if uf.find(regions[0]) != uf.find(other):
                    self.warnings.append(f"areas share screen {spot[0]:#04x} {spot[1]}: {regions[0]} + {other} (one hall)")
                uf.union(regions[0], other)
        self.uf = uf
        members = defaultdict(list)
        for region in self.regions:
            members[uf.find(region)].append(region)
        self.hall_name = {}
        self.hall_screens = {}
        for root, regions in members.items():
            best = max(regions, key=lambda r: (len(self.screens[r]), -self.regions.index(r)))
            spots = sorted({spot for r in regions for spot in self.screens[r]})
            for region in regions:
                self.hall_name[region] = best
            self.hall_screens[best] = spots
        self.halls = [self.hall_name[r] for r in self.regions if self.hall_name[r] == r]

    def hall(self, region):
        return self.hall_name[region]

    # ----- floors -------------------------------------------------------------------------------------------
    def wall_pairs(self):
        """(door a, door b, list name) for every two-cell door of this dungeon."""
        pairs = []
        for name in ("interior_doors", "open_edges", "straight_staircases", "default_door_connections",
                     "default_one_way_connections"):
            for a, b in self.t.pairs[name]:
                if a in self.doors and b in self.doors:
                    pairs.append((a, b, name))
        return pairs

    def stair_pairs(self):
        """(lower door, upper door) for spiral stairs and ladders."""
        pairs = []
        for a, b in self.t.pairs["spiral_staircases"]:
            if a in self.doors and b in self.doors:
                pairs.append((b, a) if self.doors[a]["dir"] == "Dn" else (a, b))
        for a, b in self.t.pairs["ladders"]:
            if a in self.doors and b in self.doors:
                pairs.append((b, a) if "Down" in a else (a, b))
        return pairs

    def assign_floors(self):
        entrance = self.hall(self.owner[self.main_door])
        level = {entrance: 0}
        edges = defaultdict(list)
        for a, b, _ in self.wall_pairs():
            edges[self.hall(self.owner[a])].append((self.hall(self.owner[b]), 0))
            edges[self.hall(self.owner[b])].append((self.hall(self.owner[a]), 0))
        for a, b, _ in self.logical_links():
            edges[self.hall(a)].append((self.hall(b), 0))
            edges[self.hall(b)].append((self.hall(a), 0))
        for lower, upper in self.stair_pairs():
            edges[self.hall(self.owner[lower])].append((self.hall(self.owner[upper]), 1))
            edges[self.hall(self.owner[upper])].append((self.hall(self.owner[lower]), -1))
        def spread(seed):
            queue = deque([seed])
            while queue:
                hall = queue.popleft()
                for other, delta in edges[hall]:
                    want = level[hall] + delta
                    if other not in level:
                        level[other] = want
                        queue.append(other)
                    elif level[other] != want:
                        self.warnings.append(f"floor conflict: {hall} ({floor_name(level[hall])}) to {other} expects "
                                             f"{floor_name(want)} but it sits on {floor_name(level[other])}")

        spread(entrance)
        # a wing that only an outside door reaches (Desert's back half) is ground level like the main door
        for _, door_name in self.t.portals:
            if door_name in self.doors and self.hall(self.owner[door_name]) not in level:
                level[self.hall(self.owner[door_name])] = 0
                spread(self.hall(self.owner[door_name]))
        pits = [(self.hall(self.owner[a]), self.hall(b)) for a, b in self.t.pairs["falldown_pits"]
                if a in self.doors and b in self.region_set]
        warps = [(self.hall(self.owner[a]), self.hall(b)) for a, b in self.t.pairs["dungeon_warps"]
                 if a in self.doors and b in self.region_set]
        # a hall placed by a pit or a warp carries the halls its doors join (the Star Pits of Ganon's Tower are
        # reached only by a warp, yet their doors lead on to the Falling Bridge)
        def settle(candidates, drop):
            for src, dst in candidates:
                if src in level and dst not in level:
                    level[dst] = level[src] - drop
                    spread(dst)
                    return True
                if dst in level and src not in level:
                    level[src] = level[dst] + drop
                    spread(src)
                    return True
            return False

        while settle(pits, 1) or settle(warps, 0):
            pass
        for hall in self.halls:
            if hall not in level:
                level[hall] = 0
                self.warnings.append(f"no path places {hall} on a floor; it sits on 1F")
        self.level = level
        self.entrance_hall = entrance

    # ----- cells ----------------------------------------------------------------------------------------------
    def build_cells(self):
        """floor level -> {(row, col): cell}; cells keep the hall and the supertile screen they come from."""
        self.cells = defaultdict(OrderedDict)
        self.cell_of = {}  # (tile, screen) -> (level, row, col)
        for hall in self.halls:
            level = self.level[hall]
            for tile, screen in self.hall_screens[hall]:
                at = global_cell(tile, screen)
                if at in self.cells[level]:
                    self.errors.append(f"two halls on one cell {floor_name(level)} {at}: {self.cells[level][at]['hall']} and {hall}")
                    continue
                self.cells[level][at] = {
                    "hall": hall, "tile": tile, "screen": screen, "sides": dict.fromkeys(DIRS, "wall"),
                    "enemies": 0, "flags": OrderedDict(), "links": OrderedDict(),
                }
                self.cell_of[(tile, screen)] = (level, at[0], at[1])
        for level, cells in self.cells.items():
            for at, cell in cells.items():
                for direction, (dr, dc) in STEP.items():
                    other = cells.get((at[0] + dr, at[1] + dc))
                    if other and other["hall"] == cell["hall"]:
                        cell["sides"][direction] = "open"

    def door_side_kind(self, a, b):
        kinds = ["open"]
        for door in (a, b):
            room_kind = self.t.door_kind(door)
            if door["big"] or room_kind == "BigKey":
                kinds.append("big-key")
            if door["small"] or room_kind in KEY_KINDS:
                kinds.append("small-key")
            if room_kind in BOMB_KINDS:
                kinds.append("bomb")
            if door["trap"] or room_kind in TRAP_KINDS:
                kinds.append("shutter")
        return max(kinds, key=SIDE_RANK.get)

    def set_side(self, level, at, direction, kind, raise_only=False):
        cell = self.cells[level].get(at)
        other_at = (at[0] + STEP[direction][0], at[1] + STEP[direction][1])
        other = self.cells[level].get(other_at)
        if cell is None or other is None:
            return False
        if raise_only and SIDE_RANK[cell["sides"][direction]] > SIDE_RANK[kind]:
            return True
        cell["sides"][direction] = kind
        other["sides"][OPPOSITE[direction]] = kind
        return True

    def place_cell(self, door):
        if door.get("screen") is None:
            return None
        return self.cell_of.get((door["tile"], door["screen"]))

    def is_trap(self, door):
        return door["trap"] or self.t.door_kind(door) in TRAP_KINDS

    def describe(self, name):
        door = self.doors[name]
        return f"{name} [{door['slot']}, {self.t.door_position(door) or '-'}]"

    def overridden_edges(self):
        """(level, cell, side) for every edge a `sides` override settles, both ends."""
        edges = set()
        for entry in self.overrides.get("sides", []):
            at = self.cell_of.get((int(entry["tile"], 16), (entry["row"], entry["col"])))
            if at is None:
                continue
            other = (at[1] + STEP[entry["side"]][0], at[2] + STEP[entry["side"]][1])
            edges.add((at[0], at[1:], entry["side"]))
            edges.add((at[0], other, OPPOSITE[entry["side"]]))
        return edges

    def apply_doors(self):
        """Door pairs become sides. Two different non-open kinds on one edge stop the run (an override settles it);
        the cell whose own door is a trap is remembered for the `shutter` flag."""
        edge_owner = {}
        settled = self.overridden_edges()
        self.shutter_candidates = []
        for a, b, _ in self.wall_pairs():
            da, db = self.doors[a], self.doors[b]
            ca, cb = self.place_cell(da), self.place_cell(db)
            if ca is None or cb is None:
                self.errors.append(f"door without a cell: {a if ca is None else b}")
                continue
            if ca[0] != cb[0] or not adjacent(ca[1:], cb[1:]):
                self.errors.append(f"door pair is not adjacent: {a} {floor_name(ca[0])} {ca[1:]} <-> {b} {floor_name(cb[0])} {cb[1:]}")
                continue
            kind = self.door_side_kind(da, db)
            level, at, direction = ca[0], ca[1:], direction_from(ca[1:], cb[1:])
            existing = self.cells[level][at]["sides"][direction]
            edge = (level, at, direction)
            if existing not in ("wall", "open") and kind not in ("wall", "open") and existing != kind:
                first = edge_owner.get(edge, ("?", "?"))
                if edge in settled:
                    self.warnings.append(f"edge settled by override: {self.describe(first[0])} <-> {self.describe(first[1])} ({existing}) "
                                         f"and {self.describe(a)} <-> {self.describe(b)} ({kind}) on {floor_name(level)} {at} {direction}")
                else:
                    self.errors.append(f"two doors on one edge {floor_name(level)} {at} {direction}: "
                                       f"{self.describe(first[0])} <-> {self.describe(first[1])} is {existing}, "
                                       f"{self.describe(a)} <-> {self.describe(b)} is {kind}; move one door to the other "
                                       f"screen of its supertile (overrides.doors) or pick the kind (overrides.sides)")
                    continue
            elif existing not in ("wall", "open") and kind == "open":
                kind = existing  # a plain doorway beside a locked one keeps the lock
            self.set_side(level, at, direction, kind)
            edge_owner[edge] = (a, b)
            edge_owner[(level, cb[1:], OPPOSITE[direction])] = (a, b)
            if self.is_trap(da):
                self.shutter_candidates.append((level, at, direction))
            if self.is_trap(db):
                self.shutter_candidates.append((level, cb[1:], OPPOSITE[direction]))
        for src, dst, door_name in self.logical_links():
            hs, hd = self.hall(src), self.hall(dst)
            if hs == hd:
                continue
            kind = "item" if any(word in door_name for word in ITEM_GATE_WORDS) else "open"
            drawn = False
            for level, cells in self.cells.items():
                for at, cell in cells.items():
                    if cell["hall"] != hs:
                        continue
                    for direction, (dr, dc) in STEP.items():
                        other = cells.get((at[0] + dr, at[1] + dc))
                        if other and other["hall"] == hd:
                            self.set_side(level, at, direction, kind, raise_only=True)
                            drawn = True
            if not drawn:
                self.warnings.append(f"logical link has no shared edge: {door_name} ({src} -> {dst})")

    # ----- links ------------------------------------------------------------------------------------------------
    def link(self, level, at, name, target):
        cell = self.cells[level][at]
        if name in cell["links"]:
            return False
        cell["links"][name] = {"to": floor_name(target[0]), "row": target[1], "col": target[2]}
        return True

    def free_cell(self, hall, name, prefer=None):
        """A cell of the hall whose `name` link is free, preferring the given supertile screen."""
        options = [self.cell_of[spot] for spot in self.hall_screens[hall] if spot in self.cell_of]
        if prefer is not None:
            options.sort(key=lambda c: (self.cells[c[0]][c[1:]]["screen"] != prefer, c))
        for option in options:
            if name not in self.cells[option[0]][option[1:]]["links"]:
                return option
        return None

    def stair_cell(self, door, name):
        """The door's own cell, or when that cell already has a stairway, a free cell of its hall."""
        cell = self.place_cell(door)
        if cell is not None and "stairs" not in self.cells[cell[0]][cell[1:]]["links"]:
            return cell
        other = self.free_cell(self.hall(self.owner[name]), "stairs")
        if cell is not None and other is not None:
            self.warnings.append(f"second stairway in one screen moved within its hall: {name}")
        return other

    def stair_lock(self, door):
        kind = self.t.door_kind(door)
        if door["big"] or kind == "BigKey":
            return "big-key"
        if door["small"] or kind in KEY_KINDS:
            return "small-key"
        return None

    def already_linked(self, lower, upper):
        """True when the two doors' own cells are already each other's stairs (a parallel stairway)."""
        cl, cu = self.place_cell(self.doors[lower]), self.place_cell(self.doors[upper])
        if cl is None or cu is None:
            return False
        link = self.cells[cl[0]][cl[1:]]["links"].get("stairs")
        return link is not None and (link["row"], link["col"], link["to"]) == (cu[1], cu[2], floor_name(cu[0]))

    def apply_links(self):
        for lower, upper in self.stair_pairs():
            if self.already_linked(lower, upper):
                self.warnings.append(f"parallel stairway skipped (its cells are already joined): {lower} <-> {upper}")
                continue
            dl, du = self.doors[lower], self.doors[upper]
            cl = self.stair_cell(dl, lower)
            cu = self.stair_cell(du, upper)
            if cl is None or cu is None:
                self.errors.append(f"stairs without a cell: {lower} <-> {upper}")
                continue
            ok = self.link(cl[0], cl[1:], "stairs", cu) and self.link(cu[0], cu[1:], "stairs", cl)
            if not ok:
                self.errors.append(f"two stairways in one cell: {lower} <-> {upper}")
                continue
            # a key-locked stairway: the lock sits on the link of the cell that holds the locked door, one end only
            locked = [(name, cell) for name, door, cell in ((lower, dl, cl), (upper, du, cu)) if self.stair_lock(door)]
            if len(locked) == 2:
                self.warnings.append(f"both ends of a stairway are locked; the lower end carries it: {lower} <-> {upper}")
            if locked:
                name, cell = locked[0]
                self.cells[cell[0]][cell[1:]]["links"]["stairs"]["lock"] = self.stair_lock(self.doors[name])
                self.warnings.append(f"locked stairway recorded on {floor_name(cell[0])} {cell[1:]}: {name}")
        # the entrance ring before pits and warps, so reachability never loses to a slot
        main_cell = self.place_cell(self.doors[self.main_door])
        self.cells[main_cell[0]][main_cell[1:]]["flags"]["entrance"] = True
        ring = [main_cell]
        for portal, door_name in self.t.portals:
            if door_name in self.doors and door_name != self.main_door:
                cell = self.place_cell(self.doors[door_name])
                if cell is None:
                    self.errors.append(f"entrance without a cell: {door_name}")
                elif cell not in ring:
                    ring.append(cell)
        if len(ring) > 1:
            for i, cell in enumerate(ring):
                self.link(cell[0], cell[1:], "teleport", ring[(i + 1) % len(ring)])
            self.warnings.append("entrance ring: " + " -> ".join(f"{floor_name(c[0])} {c[1:]}" for c in ring + [ring[0]]))
        seen = set()
        for door_name, target in self.t.pairs["falldown_pits"]:
            if door_name not in self.doors or target not in self.region_set:
                continue
            hs, hd = self.hall(self.owner[door_name]), self.hall(target)
            if hs == hd or (hs, hd) in seen:
                continue
            seen.add((hs, hd))
            drop = self.level[hs] - self.level[hd]
            name = "hole" if drop == 1 else "teleport"
            if drop != 1:
                self.warnings.append(f"pit {door_name} drops {drop} floor(s) to {target}: teleport")
            placed = False
            for spot in self.hall_screens[hs]:
                src = self.cell_of.get(spot)
                if src is None or name in self.cells[src[0]][src[1:]]["links"]:
                    continue
                dst = self.free_cell(hd, "__landing__", prefer=spot[1])
                if dst is None:
                    break
                self.link(src[0], src[1:], name, dst)
                placed = True
                break
            if not placed:
                self.warnings.append(f"pit not drawn (no free cell): {door_name} -> {target}")
        for door_name, target in self.t.pairs["dungeon_warps"]:
            if door_name not in self.doors or target not in self.region_set:
                continue
            hs, hd = self.hall(self.owner[door_name]), self.hall(target)
            if hs == hd:
                continue
            src = self.free_cell(hs, "teleport")
            dst = self.free_cell(hd, "__landing__")
            if src is None or dst is None:
                self.warnings.append(f"warp not drawn (no free cell): {door_name} -> {target}")
                continue
            self.link(src[0], src[1:], "teleport", dst)

    # ----- contents ------------------------------------------------------------------------------------------
    def region_cells(self, region):
        """The cells of an area in screen order, then the rest of its hall."""
        own = [self.cell_of[spot] for spot in self.screens[self.resolve(region)] if spot in self.cell_of]
        rest = [self.cell_of[spot] for spot in self.hall_screens[self.hall(region)] if spot in self.cell_of]
        return own + [c for c in rest if c not in own]

    def apply_contents(self):
        for tile, sprites in sorted(self.t.sprites.items()):
            for index, sprite in enumerate(sprites):
                region = sprite["region"]
                if region not in self.region_set or sprite["sub"] == 7:
                    continue
                at = self.cell_of.get((tile, sprite_screen(sprite)))
                if at is None:
                    continue
                cell = self.cells[at[0]][at[1:]]
                kind = sprite["kind"]
                is_boss_room = any(loc.endswith(" - Boss") or loc == "Agahnim 2" for loc in self.t.regions[region]["locations"])
                if self.t.enemy_kind.get(kind):
                    cell["enemies"] += 1
                elif kind in BOSS_SPRITES and not is_boss_room:
                    cell["enemies"] += 1  # a miniboss (Ganon's Tower refights) fills the room but is not must-clear
                    cell["minibosses"] = cell.get("minibosses", 0) + 1
                if kind in PUZZLE_SPRITES:
                    cell["flags"]["puzzle"] = True
        for tile, pots in sorted(self.t.pots.items()):
            for pot in pots:
                if pot[3] in self.region_set and pot[2] == "Switch":
                    at = self.cell_of.get((tile, pot_screen(pot)))
                    if at is not None:
                        self.cells[at[0]][at[1:]]["flags"]["puzzle"] = True
        known = {loc for r in self.regions for loc in self.t.regions[r]["locations"]}
        for name in self.overrides.get("chests", {}):
            if name not in known:
                self.errors.append(f"override names an unknown chest: {name}")
        # the most specific areas first: a ledge's own screen takes its chest before the hall around it fills up;
        # within an area the dungeon items take cells before plain treasure does
        order = sorted(self.regions, key=lambda r: (len(self.screens[r]) or 99, self.regions.index(r)))
        for region in order:
            locations = self.t.regions[region]["locations"]
            ranked = sorted(locations, key=lambda loc: (self.classify(region, loc)[1] == "other", locations.index(loc)))
            for location in ranked:
                self.place_location(region, location)
        for level, cells in self.cells.items():
            for cell in cells.values():
                if any(word in cell["hall"] for word in PUZZLE_WORDS):
                    cell["flags"]["puzzle"] = True

    def flag_shutters(self):
        """`shutter` goes on the cell whose own door is the trap, once the side overrides have had their say."""
        for level, at, direction in self.shutter_candidates:
            cell = self.cells[level][at]
            if cell["sides"][direction] == "shutter":
                cell["flags"]["shutter"] = True

    def place_location(self, region, location):
        what, kind = self.classify(region, location)
        if what == "prize":
            return
        candidates = self.region_cells(region)
        pinned = self.overrides.get("chests", {}).get(location)
        if pinned:
            at = self.cell_of.get((int(pinned[0], 16), (pinned[1], pinned[2])))
            if at is None:
                self.errors.append(f"override pins {location} to a screen that is not a cell: {pinned}")
                return
            candidates = [at]
            self.applied.append(f"chest {location} pinned to {pinned[0]} ({pinned[1]},{pinned[2]})")
        if not candidates:
            self.errors.append(f"cannot place {location}: area {region} has no cell")
            return
        first = self.cells[candidates[0][0]][candidates[0][1:]]
        if what == "boss":
            first["flags"]["boss"] = True
            return
        if what == "event":
            first["flags"]["puzzle"] = True
            return
        drop = self.t.key_drops.get(location)
        if what == "pot":
            spot = None
            for pot in self.t.pots.get(drop[1], []):
                if pot[2] == "Key" and pot[3] == region:
                    spot = self.cell_of.get((drop[1], pot_screen(pot)))
            self.cells[(spot or candidates[0])[0]][(spot or candidates[0])[1:]]["flags"]["potKey"] = True
            return
        if what == "drop":
            tile, index = drop[1][1], drop[1][2]
            sprites = self.t.sprites.get(tile, [])
            spot = self.cell_of.get((tile, sprite_screen(sprites[index]))) if index < len(sprites) else None
            self.cells[(spot or candidates[0])[0]][(spot or candidates[0])[1:]]["flags"]["keyDrop"] = kind
            return
        if kind is None:
            self.warnings.append(f"no vanilla item for {location}: other")
            kind = "other"
        for at in candidates:
            cell = self.cells[at[0]][at[1:]]
            if "chest" not in cell["flags"]:
                cell["flags"]["chest"] = kind
                return
        if kind == "other":
            self.warnings.append(f"chest merged into a full cell: {location}")
            return
        self.errors.append(f"cannot place {location} ({kind}): every cell of {region} already holds a chest")

    # ----- output ------------------------------------------------------------------------------------------------
    def apply_side_overrides(self):
        for entry in self.overrides.get("sides", []):
            tile, screen = int(entry["tile"], 16), (entry["row"], entry["col"])
            at = self.cell_of.get((tile, screen))
            if at is None:
                self.errors.append(f"side override names a screen that is not a cell: {entry}")
                continue
            if not self.set_side(at[0], at[1:], entry["side"], entry["kind"]):
                self.errors.append(f"side override has no neighbour cell: {entry}")
                continue
            self.applied.append(f"side {entry['tile']} ({entry['row']},{entry['col']}) {entry['side']} = {entry['kind']}")

    def reachable(self, skip=None):
        start = next(((level, at) for level, cells in self.cells.items() for at, cell in cells.items() if cell["flags"].get("entrance")), None)
        seen = {start}
        queue = deque([start])
        name_to_level = {floor_name(level): level for level in self.cells}
        while queue:
            level, at = queue.popleft()
            cell = self.cells[level][at]
            nexts = []
            for direction, (dr, dc) in STEP.items():
                if cell["sides"][direction] != "wall" and (at[0] + dr, at[1] + dc) in self.cells[level]:
                    nexts.append((level, (at[0] + dr, at[1] + dc)))
            for target in cell["links"].values():
                nexts.append((name_to_level[target["to"]], (target["row"], target["col"])))
            for node in nexts:
                if node == skip or node in seen:
                    continue
                seen.add(node)
                queue.append(node)
        return seen

    def split_halls(self):
        """A hall whose cells no longer touch through open sides (a shutter inside it) becomes numbered rooms."""
        for level in sorted(self.cells):
            cells = self.cells[level]
            by_hall = defaultdict(list)
            for at in sorted(cells):
                by_hall[cells[at]["hall"]].append(at)
            for hall, members in by_hall.items():
                remaining = list(members)
                components = []
                while remaining:
                    seen = {remaining[0]}
                    queue = deque([remaining[0]])
                    while queue:
                        at = queue.popleft()
                        for direction, (dr, dc) in STEP.items():
                            other = (at[0] + dr, at[1] + dc)
                            if cells[at]["sides"][direction] == "open" and other in remaining and other not in seen:
                                seen.add(other)
                                queue.append(other)
                    components.append(sorted(seen))
                    remaining = [at for at in remaining if at not in seen]
                if len(components) == 1:
                    continue
                # each part takes the name of the sub-area whose own screens cover it best, the hall's own name
                # first; a part no sub-area claims is numbered
                members = [r for r in self.regions if self.hall_name[r] == hall]
                members.sort(key=lambda r: (r != hall, self.regions.index(r)))
                used = set()
                components.sort(key=lambda c: (-len(c), c[0]))
                for component in components:
                    spots = {(cells[at]["tile"], cells[at]["screen"]) for at in component}

                    def fit(region):  # the share of the sub-area's own screens inside this part
                        own = set(self.screens[region])
                        return (len(spots & own) / len(own) if own else 0, -members.index(region))

                    best = max((r for r in members if r not in used), key=fit, default=None)
                    name = best if best is not None and spots & set(self.screens[best]) else None
                    if name is None:
                        index = 2
                        while f"{hall} ({index})" in used:
                            index += 1
                        name = f"{hall} ({index})"
                    used.add(name)
                    for at in component:
                        cells[at]["hall"] = name
                self.warnings.append(f"{hall} is {len(components)} rooms on {floor_name(level)}: " + ", ".join(sorted(used)))

    def finish(self):
        """Trim floors, count the report, and return the JSON object."""
        self.split_halls()
        reach = self.reachable()
        for level, cells in sorted(self.cells.items()):
            for at, cell in cells.items():
                if (level, at) not in reach:
                    self.errors.append(f"unreachable cell: {floor_name(level)} {at} {cell['hall']}")
        # must-clear: the LTTP rooms with a fight behind a shutter or holding a key drop; side: the other fight
        # rooms. The boss room and miniboss-only cells count for neither (the dress step decides minibosses).
        must_clear_rooms, fight_rooms = set(), set()
        for level, cells in self.cells.items():
            for at, cell in cells.items():
                if cell["flags"].get("boss") or cell["enemies"] - cell.get("minibosses", 0) <= 0:
                    continue
                fight_rooms.add(cell["hall"])
                if cell["flags"].get("shutter") or cell["flags"].get("keyDrop"):
                    must_clear_rooms.add(cell["hall"])
        must_clear = len(must_clear_rooms)
        side = len(fight_rooms - must_clear_rooms)
        lock_count = sum(1 for cells in self.cells.values() for cell in cells.values()
                         for kind in cell["sides"].values() if kind == "small-key") // 2
        lock_count += sum(1 for cells in self.cells.values() for cell in cells.values()
                          for link in cell["links"].values() if link.get("lock") == "small-key")
        floors = []
        cells_per_floor = OrderedDict()
        for level in sorted(self.cells):
            cells = self.cells[level]
            min_row = min(at[0] for at in cells)
            min_col = min(at[1] for at in cells)
            out = []
            for at in sorted(cells):
                cell = cells[at]
                row = OrderedDict([("row", at[0] - min_row), ("col", at[1] - min_col), ("room", cell["hall"]),
                                   ("sides", OrderedDict((d, cell["sides"][d]) for d in DIRS)), ("enemies", cell["enemies"])])
                for flag in ("chest", "keyDrop", "potKey", "boss", "puzzle", "shutter", "entrance"):
                    if flag in cell["flags"]:
                        row[flag] = cell["flags"][flag]
                for name in ("stairs", "hole", "teleport"):
                    if name in cell["links"]:
                        target = cell["links"][name]
                        target_level = next(l for l in self.cells if floor_name(l) == target["to"])
                        target_cells = self.cells[target_level]
                        row[name] = OrderedDict([("to", target["to"]),
                                                 ("row", target["row"] - min(a[0] for a in target_cells)),
                                                 ("col", target["col"] - min(a[1] for a in target_cells))])
                        if "lock" in target:
                            row[name]["lock"] = target["lock"]
                out.append(row)
            name = floor_name(level)
            floors.append(OrderedDict([("name", name), ("rows", max(at[0] for at in cells) - min_row + 1),
                                       ("cols", max(at[1] for at in cells) - min_col + 1), ("cells", out)]))
            cells_per_floor[name] = len(out)
        small_keys = sum(1 for cells in self.cells.values() for cell in cells.values()
                         if cell["flags"].get("chest") == "small-key" or cell["flags"].get("keyDrop") == "small"
                         or cell["flags"].get("potKey"))
        return OrderedDict([
            ("id", self.id), ("source", f"LTTP {self.dungeon}"), ("floors", floors),
            ("report", OrderedDict([("cellsPerFloor", cells_per_floor), ("mustClear", must_clear), ("side", side),
                                    ("smallKeys", small_keys), ("smallLocks", lock_count)])),
        ])

    def run(self):
        self.gather_screens()
        self.absorb_empty()
        if self.errors:
            return None
        self.build_halls()
        self.assign_floors()
        self.build_cells()
        if self.errors:
            return None
        self.apply_doors()
        self.apply_links()
        self.apply_side_overrides()  # before the shutter flags and the lock count, which read the final sides
        self.flag_shutters()
        self.apply_contents()
        result = self.finish()
        return None if self.errors else result


def load_overrides(temple_id):
    path = os.path.join(OVERRIDE_DIR, f"{temple_id}.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf8") as handle:
        return json.load(handle)


def debug_dump(conversion):
    """What each area's screens came from, and every cell: for reading a conversion, not for the JSON."""
    print("   -- evidence --")
    for region in conversion.regions:
        bits = []
        for name, door in conversion.doors.items():
            if conversion.owner[name] == region and door.get("screen") is not None:
                bits.append(f"door {name} {door['tile']:#04x}{door['screen']}")
        for tile, sprites in sorted(conversion.t.sprites.items()):
            for sprite in sprites:
                if sprite["region"] == region:
                    bits.append(f"sprite {sprite['kind']} {tile:#04x}{sprite_screen(sprite)} x={sprite['x']:#x} y={sprite['y']:#x}")
        for tile, pots in sorted(conversion.t.pots.items()):
            for pot in pots:
                if pot[3] == region:
                    bits.append(f"pot {pot[2]} {tile:#04x}{pot_screen(pot)} x={pot[0]} y={pot[1]}")
        host = f" -> absorbed by {conversion.host[region]}" if region in conversion.host else ""
        print(f"   {region}{host}: " + ("; ".join(bits) if bits else "(nothing)"))
    print("   -- cells --")
    for level in sorted(conversion.cells):
        for at, cell in sorted(conversion.cells[level].items()):
            sides = " ".join(f"{d[0]}={cell['sides'][d]}" for d in DIRS)
            extra = " ".join(f"{k}={v}" for k, v in cell["flags"].items())
            links = " ".join(f"{k}->{v['to']}({v['row']},{v['col']})" for k, v in cell["links"].items())
            print(f"   {floor_name(level)} {at} {cell['tile']:#04x}{cell['screen']} {cell['hall']}: enemies={cell['enemies']} {sides} {extra} {links}")


def main(argv):
    debug = "--debug" in argv
    argv = [a for a in argv if a != "--debug"]
    wanted = argv[1:] or [t[0] for t in TEMPLES]
    unknown = [w for w in wanted if w not in {t[0] for t in TEMPLES}]
    if unknown:
        print("unknown temple id(s): " + ", ".join(unknown))
        return 2
    tables = Tables()
    failed = False
    for temple_id, dungeon, main_door, _ in TEMPLES:
        if temple_id not in wanted:
            continue
        conversion = Conversion(tables, temple_id, dungeon, main_door, load_overrides(temple_id))
        result = conversion.run()
        print(f"== {temple_id}: LTTP {dungeon}")
        if result is not None:
            os.makedirs(OUT_DIR, exist_ok=True)
            with open(os.path.join(OUT_DIR, f"{temple_id}.json"), "w", encoding="utf8") as handle:
                handle.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
            report = result["report"]
            print("   cells per floor: " + ", ".join(f"{name} {count}" for name, count in report["cellsPerFloor"].items()))
            print(f"   must-clear {report['mustClear']}, side {report['side']}, small keys {report['smallKeys']} "
                  f"against {report['smallLocks']} locks")
        for line in conversion.applied:
            print("   override: " + line)
        for line in conversion.warnings:
            print("   note: " + line)
        for line in conversion.errors:
            print("   ERROR: " + line)
        if debug:
            debug_dump(conversion)
        if conversion.errors:
            failed = True
            print(f"   {temple_id} not written: settle the errors in overrides/{temple_id}.json")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
