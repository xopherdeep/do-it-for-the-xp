"""
LTTP dungeon converter, content stages (convert.py): enemies, puzzles, chests, keys and bosses placed on the
cells, then `finish`: split halls, the reachability check and the report and JSON object of one dungeon.
"""
from collections import OrderedDict, defaultdict, deque

from lttp_layout import DIRS, STEP, floor_name, pot_screen, sprite_screen

PUZZLE_SPRITES = {"CrystalSwitch", "CorrectPullSwitch", "WrongPullSwitch", "WaterSwitch"}
PUZZLE_WORDS = ("Torch", "Peg", "Tile", "Switch", "Push")
BOSS_SPRITES = {
    "ArmosKnight", "Lanmolas", "Moldorm", "HelmasaurKing", "Arrghus", "Mothula", "Blind", "Kholdstare",
    "Vitreous", "TrinexxRockHead", "Agahnim", "Ganon",
}


class ContentStages:
    """apply_contents and finish of a Conversion, with the room placement and the reachability they use."""

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
