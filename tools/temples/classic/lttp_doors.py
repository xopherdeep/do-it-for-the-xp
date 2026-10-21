"""
LTTP dungeon converter, door stages (convert.py): door pairs and logical links become cell sides, stairs, pits
and warps become links between cells, then the side overrides and the `shutter` flags.
"""
from lttp_layout import OPPOSITE, STEP, adjacent, direction_from, floor_name

WALL_DOORS = ("Nrml", "StrS", "Open", "Intr")  # doors that become a side between two cells
SIDE_RANK = {"wall": 0, "open": 1, "item": 2, "shutter": 3, "bomb": 4, "small-key": 5, "big-key": 6}
KEY_KINDS = {"SmallKey", "StairKey", "StairKey2", "StairKeyLow", "HauntedStairKey"}
BOMB_KINDS = {"Bombable", "BombableEntrance", "BlastWall", "Dashable"}
TRAP_KINDS = {"Trap", "Trap2", "TrapTriggerable", "TrapTriggerableLow", "TrapLowE3"}
ITEM_GATE_WORDS = ("Hook", "Boots", "Dash", "Torch", "Flipper", "Swim")


class DoorStages:
    """apply_doors, apply_links, apply_side_overrides and flag_shutters of a Conversion."""

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

    def flag_shutters(self):
        """`shutter` goes on the cell whose own door is the trap, once the side overrides have had their say."""
        for level, at, direction in self.shutter_candidates:
            cell = self.cells[level][at]
            if cell["sides"][direction] == "shutter":
                cell["flags"]["shutter"] = True
