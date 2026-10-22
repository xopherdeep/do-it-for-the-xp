# Pinned sources for the classic dungeon converter

Everything under `vendor/` is a verbatim copy of an MIT-licensed file at the commit named below. The app never
reads these files; only the converter does, through `lttp_tables.py` (and Task 6's Wind converter reads `LoZ_1.dot`). Re-download with
`curl --retry 3` against the raw URL, which names the commit, and check the SHA-256 before replacing a copy.

## aerinon/ALttPDoorRandomizer, branch `DoorDev`

Commit `6f390947159b6d2162b52a60aebfd969ccf9b922`. Licence: `vendor/LICENSE-ALttPDoorRandomizer.txt` (MIT, LLCoolDave 2017).
Base URL: `https://raw.githubusercontent.com/aerinon/ALttPDoorRandomizer/6f390947159b6d2162b52a60aebfd969ccf9b922/`

| File | Path in the repository | What the converter reads | SHA-256 (first 20) |
|---|---|---|---|
| `Doors.py` | `Doors.py` | every door: type, supertile, wall, slot, layer, stairs quadrant, key flags, portal | `d06b8a8832d0a34e5221` |
| `Regions.py` | `Regions.py` | the dungeon areas, their chest locations and door names | `5f2aaa6627d4ee8a8d6e` |
| `EnemyList.py` | `source/dungeon/EnemyList.py` | the vanilla sprites per supertile with tile x/y and area, plus which kinds are real enemies | `41ed8563dd9a6c7517af` |
| `DoorShuffle.py` | `DoorShuffle.py` | the vanilla pairings: interior doors, normal doors, open edges, straight and spiral stairs, ladders, pits, warps, logical links | `433407dc25d9dd77193c` |
| `RoomData.py` | `RoomData.py` | each supertile's door list (`.pos(n)` in Doors.py indexes it): bombable, dashable, trap and key door kinds | `2c8988520b31dace7f43` |
| `PotShuffle.py` | `PotShuffle.py` | where pot keys and enemy key drops sit (`vanilla_pots`, `key_drop_data`) | `4930098403e328d1cea7` |

The brief named the first three; the other three are needed because `Doors.py` alone does not say which stairs,
ladders, pits and warps connect, nor which doors are bomb walls or shutters (those kinds live in `RoomData.py`), nor
where a pot key sits.

## TheVGLC/TheVGLC

Commit `0e86a8f31f20ecad4eaa5741ff061af88767f7fb`. Licence: `vendor/LICENSE-TheVGLC.md` (MIT, Summerville, Ontanon, Snodgrass 2016).

| File | Path in the repository | SHA-256 (first 20) |
|---|---|---|
| `LoZ_1.dot` | `The Legend of Zelda/Graph Processed/LoZ_1.dot` | `730d56e56ec29de7e6cc` |

Read by `loz_eagle.py` (the Wind temple: Level 1's rooms are matched onto the Eagle's cells and written as `dungeons/wind-temple.json`);
copied here so every classic source sits in one place.

## sporchia/alttp_vt_randomizer (vanilla chest contents)

Commit `8c043a4089e0a058ca8d7eafebea93f76b129ae6` ("V30", 2018-10-01), the last revision whose region classes still
carry `setVanilla()`; later commits dropped the method. Licence: `vendor/LICENSE-alttp_vt_randomizer.txt` (MIT, sporchia 2016).
Base URL: `https://raw.githubusercontent.com/sporchia/alttp_vt_randomizer/8c043a4089e0a058ca8d7eafebea93f76b129ae6/app/Region/Standard/`

`vendor/vanilla/<Dungeon>.php` for `TowerOfHera`, `SkullWoods`, `DesertPalace`, `SwampPalace`, `PalaceOfDarkness`,
`IcePalace`, `TurtleRock`, `GanonsTower`. The converter reads only each file's `setVanilla()` body: location name to
vanilla item, which decides a chest's kind (`map`, `compass`, `big-key`, `small-key`, `big-chest`, `other`). The
door randomizer's own location names are not reliable for this (Turtle Rock's map is in "Roller Room - Left").
