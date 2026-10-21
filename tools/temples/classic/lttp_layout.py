"""
LTTP dungeon converter, layout stages (convert.py): which screens an area owns, areas absorbed into halls, the
floors the halls sit on and the grid of cells with its open sides. Also the screen and grid helpers the later
stages share (`screen_of`, `global_cell`, `floor_name`, the direction tables).
"""
from collections import OrderedDict, defaultdict, deque

from lttp_tables import norm

DIRS = ("north", "east", "south", "west")
OPPOSITE = {"north": "south", "south": "north", "east": "west", "west": "east"}
STEP = {"north": (-1, 0), "south": (1, 0), "east": (0, 1), "west": (0, -1)}
DIR_WORD = {"No": "north", "So": "south", "We": "west", "Ea": "east"}
SLOT_HALF = {"Top": 0, "Left": 0, "Mid": 0, "Bot": 1, "Right": 1}

# the boss of each dungeon: its sprite carries no area name, yet it is the only thing that places a boss room
# that is entered by falling into it (Skull Woods, Ice Palace)
BOSS_OF = {
    "Tower of Hera": "Moldorm", "Skull Woods": "Mothula", "Desert Palace": "Lanmolas", "Swamp Palace": "Arrghus",
    "Palace of Darkness": "HelmasaurKing", "Ice Palace": "Kholdstare", "Turtle Rock": "TrinexxRockHead",
    "Ganons Tower": "Agahnim",
}


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


class LayoutStages:
    """gather_screens, absorb_empty, build_halls, assign_floors and build_cells of a Conversion."""

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
