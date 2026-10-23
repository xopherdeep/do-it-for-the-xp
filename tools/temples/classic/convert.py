#!/usr/bin/env python3
"""
Classic dungeon converter: writes tools/temples/classic/dungeons/<id>.json, one per temple, from the pinned
tables under vendor/ (see SOURCES.md). Standard library only; the same inputs give the same bytes.

    python3 tools/temples/classic/convert.py [id ...]      # default: the eight LTTP temples and wind-temple

`wind-temple` is Zelda 1 Level 1 (the Eagle), matched from TheVGLC's LoZ_1.dot by loz_eagle.py, which explains its own
rules. The rest of this note is the LTTP converter.

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
import json
import os
import sys

from lttp_contents import ContentStages
from lttp_doors import DoorStages
from loz_eagle import SOURCE, WIND_ID, EagleConversion
from lttp_layout import DIRS, LayoutStages, floor_name, pot_screen, sprite_screen
from lttp_tables import HERE, TEMPLES, Tables, norm

OUT_DIR = os.path.join(HERE, "dungeons")
OVERRIDE_DIR = os.path.join(HERE, "overrides")


class Conversion(LayoutStages, DoorStages, ContentStages):
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


def emit(temple_id, title, conversion, result):
    """Write one conversion's JSON and print its report, overrides applied, notes and errors. True when it failed."""
    print(f"== {temple_id}: {title}")
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
    if conversion.errors:
        print(f"   {temple_id} not written: settle the errors in overrides/{temple_id}.json")
    return bool(conversion.errors)


def main(argv):
    debug = "--debug" in argv
    argv = [a for a in argv if a != "--debug"]
    wanted = argv[1:] or [t[0] for t in TEMPLES] + [WIND_ID]
    unknown = [w for w in wanted if w not in {t[0] for t in TEMPLES} | {WIND_ID}]
    if unknown:
        print("unknown temple id(s): " + ", ".join(unknown))
        return 2
    failed = False
    tables = Tables() if any(t[0] in wanted for t in TEMPLES) else None
    for temple_id, dungeon, main_door, _ in TEMPLES:
        if temple_id not in wanted:
            continue
        conversion = Conversion(tables, temple_id, dungeon, main_door, load_overrides(temple_id))
        result = conversion.run()
        failed = emit(temple_id, f"LTTP {dungeon}", conversion, result) or failed
        if debug:
            debug_dump(conversion)
    if WIND_ID in wanted:  # Zelda 1 Level 1: the Eagle, from the pinned graph (loz_eagle.py)
        conversion = EagleConversion(os.path.join(HERE, "vendor", "LoZ_1.dot"), load_overrides(WIND_ID))
        result = conversion.run()
        failed = emit(WIND_ID, SOURCE, conversion, result) or failed
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
