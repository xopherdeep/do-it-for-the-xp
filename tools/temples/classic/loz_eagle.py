"""
Wind Temple converter (convert.py wind-temple): TheVGLC's Zelda 1 Level 1 graph (vendor/LoZ_1.dot, the Eagle)
matched onto the Eagle's 17 cells and written as dungeons/wind-temple.json, in the same schema as the LTTP dungeons
(classicDungeon.ts). Standard library only; the same inputs give the same bytes.

The graph. Each node is a room tagged `e` enemies, `k` key, `i` map or compass, `I` a key item (bow, boomerang),
`p` puzzle, `b` boss, `t` Triforce, `s` start. An edge is a door, one line per direction, labelled `` open, `k` locked
with a small key, `b` bombable or `l` a shutter. The graph has 19 nodes for 17 rooms, because two nodes are not rooms:

  * `s` is the way in from outside: it has one neighbour, and that room is the entrance cell.
  * The bow's basement is reached by a stairway, not a door. The dot labels that edge `l`, the same as a shutter, so the
    stairway is named in overrides/wind-temple.json (`stairways`); its target becomes a one-cell floor B1 and the cells
    on both ends carry a `teleport` link to each other.

The match. Every other node is placed on one of the 17 Eagle cells (the non-wall cells of the Wind outline minus the
owner's four east rooms, spelled out below) by a backtracking search: every edge must join orthogonal neighbours, and
the anchors are fixed: the neighbour of `s` on the entrance (5,2), `b` on (1,4), `t` on (1,5). A node that fits no cell,
a cell left with no node, or two different layouts that fit all stop the run with a message naming them: nothing is
guessed. (Level 1 has two matches that give the same JSON: the two rooms west and east of the entrance have the same
tags and doors.)

The doors. `k` -> small-key, `b` -> bomb, `l` -> shutter, anything else open, merged over both directions of an edge
with the LTTP ranking (lttp_doors.SIDE_RANK): the boss door is `k` one way and `l` the other, and reads small-key. A
direction's label is the door in the wall of the room it leaves, so the `shutter` flag goes on the cell that leaves by
an `l` door whose side stayed a shutter (the same rule as LTTP: the cell whose own door is the trap).

The contents. `e` -> one enemy; `k` with `e` -> `keyDrop: small`, `k` alone -> `chest: small-key`; `i` -> map, then
compass, in graph order; `I` -> `big-chest` in the stairway basement (the bow; the Eagle has no Big Key) and `other`
anywhere else (the boomerang); `p` -> `puzzle`; `b` -> `boss`; the entrance cell -> `entrance`. A room's name is its
cell, `Eagle (row,col)`, except the entrance, the boss, the Triforce room and the basement, which say so.
"""
import json
import re
from collections import OrderedDict, deque

from lttp_doors import SIDE_RANK
from lttp_layout import DIRS, OPPOSITE, STEP

WIND_ID = "wind-temple"
SOURCE = "Zelda 1 Level 1 (Eagle)"
GRID = 6  # rows and columns of floor 1F, like today's Wind outline
EAGLE_CELLS = [
    (0, 1), (0, 2),
    (1, 2), (1, 4), (1, 5),
    (2, 0), (2, 1), (2, 2), (2, 3), (2, 4),
    (3, 1), (3, 2), (3, 3),
    (4, 2),
    (5, 1), (5, 2), (5, 3),
]
ENTRANCE_CELL, BOSS_CELL, TRIFORCE_CELL = (5, 2), (1, 4), (1, 5)
TAGS = set("eiIkpsbt")
DOOR_KINDS = {"": "open", "k": "small-key", "b": "bomb", "l": "shutter"}
ITEM_CHESTS = ("map", "compass")  # the `i` rooms in graph order
SOLUTION_LIMIT = 10000

NODE_LINE = re.compile(r'^(\d+) \[label="([^"]*)"\]$')
EDGE_LINE = re.compile(r'^(\d+) -> (\d+) \[label="([^"]*)"\]$')


def around(at):
    return [(at[0] + dr, at[1] + dc) for dr, dc in STEP.values()]


def search_order(links, anchored):
    """Breadth first from the anchored nodes, so every node after the first of a part has a placed neighbour."""
    order, seen = [], set()
    for first in sorted(anchored) + sorted(links):
        if first in seen:
            continue
        seen.add(first)
        queue = deque([first])
        while queue:
            node = queue.popleft()
            order.append(node)
            for other in sorted(links[node]):
                if other not in seen:
                    seen.add(other)
                    queue.append(other)
    return order


def match_cells(links, anchors, cells):
    """
    Every placement of the nodes of `links` (node -> set of neighbour nodes) on distinct `cells` with every edge
    between orthogonal neighbours and the `anchors` (node -> cell) kept. Returns the placements (up to
    SOLUTION_LIMIT, in a fixed order) and the node the search could not place at its deepest dead end.
    """
    cell_set = set(cells)
    room = {at: sum(1 for other in around(at) if other in cell_set) for at in cells}
    order = search_order(links, anchors)
    placements = []
    stuck = {"depth": -1, "node": None}
    mapping, used = {}, set()

    def options(node):
        placed = [mapping[other] for other in links[node] if other in mapping]
        pool = [anchors[node]] if node in anchors else sorted(cells)
        return [at for at in pool
                if at in cell_set and at not in used and room[at] >= len(links[node])
                and all(abs(at[0] - p[0]) + abs(at[1] - p[1]) == 1 for p in placed)]

    def place(depth):
        if len(placements) >= SOLUTION_LIMIT:
            return
        if depth == len(order):
            placements.append(dict(mapping))
            return
        node = order[depth]
        found = options(node)
        if not found and depth > stuck["depth"]:
            stuck.update(depth=depth, node=node)
        for at in found:
            mapping[node] = at
            used.add(at)
            place(depth + 1)
            del mapping[node]
            used.discard(at)

    place(0)
    return placements, stuck["node"]


class EagleConversion:
    """The Wind conversion: the same `run`, `applied`, `warnings` and `errors` as convert.Conversion."""

    def __init__(self, dot_path, overrides):
        self.dot_path = dot_path
        self.overrides = overrides
        self.applied = []
        self.warnings = []
        self.errors = []
        self.nodes = OrderedDict()  # node -> its tags, in file order
        self.edges = {}  # (from, to) -> label, one per direction

    # ----- the graph -----------------------------------------------------------------------------------------
    def read(self):
        with open(self.dot_path, encoding="utf8") as handle:
            lines = [line.strip() for line in handle if line.strip() not in ("", "digraph {", "}")]
        for line in lines:
            node, edge = NODE_LINE.match(line), EDGE_LINE.match(line)
            if node:
                tags = [t for t in node.group(2).split(",") if t]
                for tag in tags:
                    if tag not in TAGS:
                        self.errors.append(f"node {node.group(1)} has the tag '{tag}', which the Eagle converter does not know")
                self.nodes[int(node.group(1))] = tags
            elif edge:
                label = edge.group(3)
                if label not in DOOR_KINDS:
                    self.errors.append(f"edge {edge.group(1)} -> {edge.group(2)} has the label '{label}', which the Eagle converter does not know")
                self.edges[(int(edge.group(1)), int(edge.group(2)))] = label
            else:
                self.errors.append(f"cannot read the dot line: {line}")
        for a, b in self.edges:
            if a not in self.nodes or b not in self.nodes:
                self.errors.append(f"edge {a} -> {b} names a node the graph does not have")

    def settle_parts(self):
        """The stairway targets (one-cell floors below) and the start node; what is left are the rooms."""
        self.stairs = []
        for entry in self.overrides.get("stairways", []):
            source, target = entry["from"], entry["to"]
            others = [pair for pair in self.edges if target in pair and set(pair) != {source, target}]
            if source not in self.nodes or target not in self.nodes:
                self.errors.append(f"stairway {source} -> {target} names a node the graph does not have")
            elif others:
                self.errors.append(f"stairway target {target} has doors of its own ({others[0]}): it is not a one-room basement")
            else:
                self.stairs.append((source, target))
                self.applied.append(f"stairway {source} -> {target}: {entry.get('why', 'a stairway')}")
        self.basements = [target for _, target in self.stairs]
        starts = [node for node, tags in self.nodes.items() if "s" in tags]
        neighbours = sorted({b for a, b in self.edges if a in starts} | {a for a, b in self.edges if b in starts})
        if len(starts) != 1 or len(neighbours) != 1:
            self.errors.append(f"the graph needs one start node with one neighbour (the entrance), not {starts} with {neighbours}")
            return
        self.start, self.entry_node = starts[0], neighbours[0]
        self.rooms = [n for n in self.nodes if n != self.start and n not in self.basements]
        self.links = {n: set() for n in self.rooms}
        for a, b in self.edges:
            if a in self.links and b in self.links:
                self.links[a].add(b)
                self.links[b].add(a)
        self.notes_for_edges()

    def notes_for_edges(self):
        """A door pair whose two directions disagree on a lock kind is merged by rank; say so."""
        for a, b in sorted({tuple(sorted(pair)) for pair in self.edges if pair[0] in self.links and pair[1] in self.links}):
            kinds = {self.edges.get((a, b), ""), self.edges.get((b, a), "")} - {""}
            if len(kinds) > 1:
                names = [DOOR_KINDS[k] for k in sorted(kinds)]
                self.warnings.append(f"door {a}-{b} is {' and '.join(names)}: {self.side_of(a, b)} wins")

    def side_of(self, a, b):
        kinds = [DOOR_KINDS[self.edges.get((a, b), "")], DOOR_KINDS[self.edges.get((b, a), "")]]
        return max(kinds, key=SIDE_RANK.get)

    # ----- the match -----------------------------------------------------------------------------------------
    def anchors(self):
        anchors = {self.entry_node: ENTRANCE_CELL}
        for tag, cell in (("b", BOSS_CELL), ("t", TRIFORCE_CELL)):
            holders = [n for n in self.rooms if tag in self.nodes[n]]
            if len(holders) != 1:
                self.errors.append(f"the graph needs exactly one '{tag}' node, not {holders}")
            elif anchors.get(holders[0], cell) != cell:
                self.errors.append(f"node {holders[0]} is anchored to two cells: {anchors[holders[0]]} and {cell}")
            else:
                anchors[holders[0]] = cell
        return anchors

    def describe(self, node):
        return f"node {node} [{','.join(self.nodes[node])}]"

    def match(self):
        anchors = self.anchors()
        if self.errors:
            return None
        placements, stuck = match_cells(self.links, anchors, EAGLE_CELLS)
        if not placements:
            hint = ""
            if len(self.rooms) != len(EAGLE_CELLS):
                hint = f"; {len(self.rooms)} rooms for {len(EAGLE_CELLS)} cells, so a stairway the dot labels like a door may need naming in overrides/{WIND_ID}.json"
            self.errors.append(f"{self.describe(stuck)} fits no Eagle cell: with the anchors kept and every door between "
                               f"orthogonal neighbours, the search ran out of cells there{hint}")
            return None
        if len(placements) >= SOLUTION_LIMIT:
            self.errors.append(f"over {SOLUTION_LIMIT} placements fit: name more anchors")
            return None
        layouts = OrderedDict()
        for mapping in placements:
            result, problems = self.build(mapping)
            layouts.setdefault(json.dumps(result, ensure_ascii=False), (mapping, result, problems))
        if len(layouts) > 1:
            self.errors.append(f"{len(layouts)} different layouts fit the Eagle cells: name more anchors to choose one")
            return None
        mapping, result, problems = next(iter(layouts.values()))
        left = [at for at in EAGLE_CELLS if at not in mapping.values()]
        if left:
            self.errors.append(f"Eagle cell(s) with no node: {left}")
        self.errors.extend(problems)
        self.warnings.insert(0, f"{len(self.rooms)} rooms placed on the {len(EAGLE_CELLS)} Eagle cells: "
                                f"{len(placements)} placement(s) fit, {len(layouts)} JSON")
        return None if self.errors else result

    # ----- the JSON ------------------------------------------------------------------------------------------
    def build(self, mapping):
        """The result for one placement, and the problems found while building it (nothing is stored on self)."""
        problems = []
        at_of = dict(mapping)
        cells = {}  # (floor, (row, col)) -> cell dict
        basement_of = {}
        for index, (source, target) in enumerate(self.stairs):
            basement_of[target] = (f"B{index + 1}", source)
        item_chests = dict(zip([n for n in self.nodes if "i" in self.nodes[n]], ITEM_CHESTS))
        if sum(1 for n in self.nodes if "i" in self.nodes[n]) != len(ITEM_CHESTS):
            problems.append(f"the graph has {sum(1 for n in self.nodes if 'i' in self.nodes[n])} 'i' rooms, not the {len(ITEM_CHESTS)} dungeon items")
        for node in list(self.rooms) + self.basements:
            tags = self.nodes[node]
            floor, at = ("1F", at_of[node]) if node in at_of else (basement_of[node][0], (0, 0))
            name = f"Eagle ({at[0]},{at[1]})"
            name = "Eagle Entrance" if node == self.entry_node else name
            name = "Eagle Boss" if "b" in tags else ("Eagle Triforce" if "t" in tags else name)
            name = "Eagle Basement" if node in basement_of else name
            cell = {"row": at[0], "col": at[1], "room": name, "sides": {d: "wall" for d in DIRS},
                    "enemies": 1 if "e" in tags else 0, "flags": {}}
            chests = []
            if "k" in tags and "e" in tags:
                cell["flags"]["keyDrop"] = "small"
            elif "k" in tags:
                chests.append("small-key")
            if "i" in tags:
                chests.append(item_chests.get(node, "other"))
            if "I" in tags:
                chests.append("big-chest" if node in basement_of else "other")
            if len(chests) > 1:
                problems.append(f"{self.describe(node)} would hold {len(chests)} chests: {chests}")
            if chests:
                cell["flags"]["chest"] = chests[0]
            for tag, flag in (("b", "boss"), ("p", "puzzle")):
                if tag in tags:
                    cell["flags"][flag] = True
            if node == self.entry_node:
                cell["flags"]["entrance"] = True
            cell["links"] = {}
            cells[(floor, at)] = cell
            cell["node"] = node
        index_of = {cell["node"]: key for key, cell in cells.items()}
        for a, b in sorted({tuple(sorted(pair)) for pair in self.edges if pair[0] in self.links and pair[1] in self.links}):
            (_, at_a), (_, at_b) = index_of[a], index_of[b]
            direction = next((d for d in DIRS if (at_a[0] + STEP[d][0], at_a[1] + STEP[d][1]) == at_b), None)
            if direction is None:
                problems.append(f"door {a}-{b} joins {at_a} and {at_b}, which are not orthogonal neighbours")
                continue
            side = self.side_of(a, b)
            cells[index_of[a]]["sides"][direction] = side
            cells[index_of[b]]["sides"][OPPOSITE[direction]] = side
            for source, other in ((a, b), (b, a)):
                if self.edges.get((source, other)) == "l" and side == "shutter":
                    cells[index_of[source]]["flags"]["shutter"] = True
        for source, target in self.stairs:
            (up, up_at), (down, down_at) = index_of[source], index_of[target]
            cells[(up, up_at)]["links"]["teleport"] = OrderedDict([("to", down), ("row", down_at[0]), ("col", down_at[1])])
            cells[(down, down_at)]["links"]["teleport"] = OrderedDict([("to", up), ("row", up_at[0]), ("col", up_at[1])])
        problems.extend(self.unreachable(cells))
        return self.assemble(cells), problems

    def unreachable(self, cells):
        start = next(key for key, cell in cells.items() if cell["flags"].get("entrance"))
        seen, queue = {start}, deque([start])
        while queue:
            floor, at = queue.popleft()
            cell = cells[(floor, at)]
            nexts = [(floor, (at[0] + STEP[d][0], at[1] + STEP[d][1])) for d in DIRS if cell["sides"][d] != "wall"]
            nexts += [(link["to"], (link["row"], link["col"])) for link in cell["links"].values()]
            for key in nexts:
                if key in cells and key not in seen:
                    seen.add(key)
                    queue.append(key)
        return [f"unreachable cell: {floor} {at} {cell['room']}" for (floor, at), cell in sorted(cells.items()) if (floor, at) not in seen]

    def assemble(self, cells):
        """The JSON object, and the report counted the way the LTTP converter counts it (each cell is its own room)."""
        floors, per_floor = [], OrderedDict()
        names = sorted({floor for floor, _ in cells}, key=lambda n: (n == "1F", n))  # B1, B2 ... then 1F, bottom to top
        for name in names:
            out = []
            for (floor, at), cell in sorted(cells.items()):
                if floor != name:
                    continue
                row = OrderedDict([("row", at[0]), ("col", at[1]), ("room", cell["room"]),
                                   ("sides", OrderedDict((d, cell["sides"][d]) for d in DIRS)), ("enemies", cell["enemies"])])
                for flag in ("chest", "keyDrop", "potKey", "boss", "puzzle", "shutter", "entrance"):
                    if flag in cell["flags"]:
                        row[flag] = cell["flags"][flag]
                row.update(cell["links"])
                out.append(row)
            size = GRID if name == "1F" else 1
            floors.append(OrderedDict([("name", name), ("rows", size), ("cols", size), ("cells", out)]))
            per_floor[name] = len(out)
        every = list(cells.values())
        fights = [c for c in every if not c["flags"].get("boss") and c["enemies"] > 0]
        must_clear = [c for c in fights if c["flags"].get("shutter") or c["flags"].get("keyDrop")]
        locks = sum(1 for c in every for kind in c["sides"].values() if kind == "small-key") // 2
        locks += sum(1 for c in every for link in c["links"].values() if link.get("lock") == "small-key")
        keys = sum(1 for c in every if c["flags"].get("chest") == "small-key" or c["flags"].get("keyDrop") == "small")
        return OrderedDict([
            ("id", WIND_ID), ("source", SOURCE), ("floors", floors),
            ("report", OrderedDict([("cellsPerFloor", per_floor), ("mustClear", len(must_clear)),
                                    ("side", len(fights) - len(must_clear)), ("smallKeys", keys), ("smallLocks", locks)])),
        ])

    def run(self):
        self.read()
        if self.errors:
            return None
        self.settle_parts()
        if self.errors:
            return None
        return self.match()
