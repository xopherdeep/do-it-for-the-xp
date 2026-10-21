"""
LTTP tables for the dungeon converter (convert.py): reads the pinned files under vendor/ (Doors, Regions,
EnemyList, RoomData, DoorShuffle, PotShuffle and the vanilla PHP item tables) once into `Tables`, with the
temple list, the file paths and the small text scanners those readers share. Standard library only.
"""
import ast
import os
import re
from collections import OrderedDict, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "vendor")
VANILLA = os.path.join(SOURCES, "vanilla")

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

QUADRANT = {"A": 0, "S": 1, "Z": 2, "X": 3}  # A top-left, S top-right, Z bottom-left, X bottom-right


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
