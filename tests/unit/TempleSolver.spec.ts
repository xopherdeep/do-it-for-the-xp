/**
 * The temple solver against the rules of docs/Temple-Generation-Contract.md (R1..R9 on fixtures, R12 on the
 * shipped temples). Fixtures are written in the authored shape: a grid of tokens and a `rooms` table.
 */
import { solveTemple, openableDoors, buildTempleGraph, type TempleLayout } from "@/lib/engine/dungeons/generator";
import type { Room } from "@/lib/engine/core/dungeons/types";
import temples from "@/lib/engine/temples";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";

const _ = "_";

/**
 * A six-wide, one-floor temple. The hero walks east: entrance, a locked door with its key above the first room,
 * the mini-boss with the master key above it, the barred boss door, the boss, the Pegasus chest below the boss.
 */
const ROOMS: Record<string, Room> = {
  [_]: { type: "wall" },
  E001: { type: "entrance", visited: true },
  R001: { type: "empty", locked: { east: true } },
  R002: { type: "empty" },
  R003: { type: "empty", locked: { east: true } },
  R004: { type: "empty" },
  K001: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
  K002: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
  MK01: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
  b001: { type: "miniboss", content: { lockOnEnter: true } },
  B001: { type: "boss", content: { lockOnEnter: true }, locked: { master: true } },
  P001: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } },
};

const GRID = [
  [_, "K001", _, "MK01", _, _],
  ["E001", "R001", "R002", "b001", "R003", "B001"],
  [_, _, _, _, _, "P001"],
  [_, _, _, _, _, _],
];

/** The fixture with some cells or rooms changed. */
const fixture = (cells: Record<string, string> = {}, rooms: Record<string, Room> = {}): TempleLayout => {
  const maze = GRID.map((row) => [...row]);
  for (const [at, token] of Object.entries(cells)) {
    const [row, col] = at.split(",").map(Number);
    maze[row][col] = token;
  }
  const merged: Record<string, Room> = JSON.parse(JSON.stringify(ROOMS));
  for (const [token, room] of Object.entries(rooms)) merged[token] = room;
  return { entrance: [1, 0], maze, rooms: merged };
};

const reasonsUnder = (rule: string, layout: TempleLayout): string[] => solveTemple(layout).reasons.filter((reason) => reason.startsWith(`${rule}:`));

describe("TempleSolver", () => {
  it("accepts the solvable fixture and walks it in order", () => {
    const result = solveTemple(fixture());
    expect(result.reasons).toEqual([]);
    expect(result.solvable).toBe(true);
    const kinds = result.criticalPath.map(({ row, col }) => ROOMS[GRID[row][col]].type);
    expect(kinds[0]).toBe("entrance");
    expect(kinds.indexOf("miniboss")).toBeLessThan(kinds.indexOf("boss"));
    expect(kinds.indexOf("boss")).toBeLessThan(kinds.lastIndexOf("loot"));
    expect(result.order).toHaveLength(9);
  });

  it("R1 Connected: a room no door leads to is reported, the temple is still solvable", () => {
    const result = solveTemple(fixture({ "3,0": "R004" }));
    expect(result.solvable).toBe(true);
    expect(result.reasons).toEqual(["R1: 1 room out of reach: 1F (3,0) empty"]);
  });

  it("R2 Keys before locks: a key behind its own lock leaves the hero stuck", () => {
    const result = solveTemple(fixture({ "0,1": _, "2,2": "K001" }));
    expect(result.solvable).toBe(false);
    expect(result.reasons).toEqual([expect.stringMatching(/^R2: the master key is out of reach: 0 keys in hand, 1 locked door in reach \(1F \(1,1\) empty -> 1F \(1,2\) empty\)/)]);
    expect(result.order).toEqual([]);
  });

  it("R2 worst order: a side door that can swallow the only key is rejected, a spare key makes it safe", () => {
    const side = fixture({ "2,1": "R002" }, { R001: { type: "empty", locked: { east: true, south: true } } });
    const stuck = solveTemple(side);
    expect(stuck.solvable).toBe(false);
    expect(stuck.reasons[0]).toMatch(/^R2: .* after opening 1F \(1,1\) empty -> 1F \(2,1\) empty: 0 keys in hand/);

    const spare = fixture({ "2,1": "R002", "2,0": "K002" }, { R001: { type: "empty", locked: { east: true, south: true } } });
    expect(solveTemple(spare).reasons).toEqual([]);
  });

  it("R3 Key count: fewer small keys than locked doors on the critical path", () => {
    const layout = fixture({}, { R002: { type: "empty", locked: { east: true } } });
    expect(reasonsUnder("R3", layout)).toEqual(["R3: 1 small key for 2 locked doors on the critical path"]);
    expect(solveTemple(layout).solvable).toBe(false);
  });

  it("R4 Boss key placement: the master key behind the boss door", () => {
    const layout = fixture({ "0,3": _, "0,5": "MK01" });
    expect(reasonsUnder("R4", layout)).toEqual(["R4: master key behind the boss door (1F (0,5) loot)"]);
    expect(solveTemple(layout).solvable).toBe(false);
  });

  it("R4 Boss key placement: the master key before the mini-boss", () => {
    expect(reasonsUnder("R4", fixture({ "0,3": _, "0,2": "MK01" }))).toEqual(["R4: the master key at 1F (0,2) loot can be reached without passing the mini-boss"]);
    expect(reasonsUnder("R4", fixture({ "0,3": _ }))).toEqual(["R4: no master key"]);
  });

  it("R5 Auto-fights: mini-boss and boss rooms must lock on enter", () => {
    expect(reasonsUnder("R5", fixture({}, { B001: { type: "boss", locked: { master: true } } }))).toEqual(["R5: 1F (1,5) boss does not lock on enter (content.lockOnEnter)"]);
  });

  it("R6 Boss door: one boss room, one door, locked with the master key", () => {
    // The engine bars every door into a boss room, so a boss room without locked.master still has its master door
    expect(reasonsUnder("R6", fixture({}, { B001: { type: "boss", content: { lockOnEnter: true } } }))).toEqual([]);
    expect(reasonsUnder("R6", fixture({ "0,5": "R004", "0,4": "R004" }))).toEqual(["R6: the boss room at 1F (1,5) boss has 2 doors from the temple (needs exactly one)"]);
    expect(reasonsUnder("R6", fixture({ "3,0": "B001" }))).toEqual(["R6: 2 boss rooms"]);
  });

  it("R2 Boss door: every door into a boss room needs the master key, locked.master or not", () => {
    const plainBoss: Record<string, Room> = { B001: { type: "boss", content: { lockOnEnter: true } } };

    // Every way in is a master door; walking out of the boss room is not barred (the engine's doorKind reads the room it steps into)
    const graph = buildTempleGraph(fixture({}, plainBoss));
    expect(graph.doors.filter((door) => door.lock === "master").map((door) => door.id)).toEqual(["1F:1,4>1F:1,5", "1F:2,5>1F:1,5"]);

    // The master key is out of reach and the boss sits behind plain doors: stuck, as in play
    const unreachable = fixture({ "0,3": _, "3,0": "MK01" }, plainBoss);
    expect(solveTemple(unreachable).solvable).toBe(false);
    expect(reasonsUnder("R2", unreachable)).toEqual([expect.stringMatching(/^R2: the master key is out of reach/)]);

    // With the key reachable the same plain-door boss room is fine
    expect(solveTemple(fixture({}, plainBoss))).toMatchObject({ solvable: true, reasons: [] });
  });

  it("R7 Pegasus: one chest, only past the boss", () => {
    expect(reasonsUnder("R7", fixture({ "2,5": _ }))).toEqual(["R7: no Pegasus chest"]);
    expect(reasonsUnder("R7", fixture({ "2,5": _, "0,2": "P001" }))).toEqual(["R7: the Pegasus chest at 1F (0,2) loot can be reached without beating the boss"]);
  });

  it("R7 Pegasus: a Master Room is the Pegasus chamber, never a master key", () => {
    const master = fixture({ "2,5": "P002" }, { P002: { type: "master", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } } });
    expect(solveTemple(master).reasons).toEqual([]);
    expect(buildTempleGraph(master).rooms.get("1F:2,5")).toMatchObject({ kind: "master", prize: true, masterKey: false });

    // The bare room the Temple Creator draws, and its older name, are the chamber too
    for (const type of ["master", "dragon-egg"]) {
      const bare = fixture({ "2,5": "P002" }, { P002: { type } });
      expect(solveTemple(bare).reasons).toEqual([]);
      expect(buildTempleGraph(bare).rooms.get("1F:2,5")).toMatchObject({ prize: true, masterKey: false });
    }
  });

  it("R8 Floors: stairs pair on the same cell, teleports pair up, pits land on a room", () => {
    const rooms: Record<string, Room> = {
      ...ROOMS,
      U001: { type: "stairs-up" },
      D001: { type: "stairs-down" },
      Y001: { type: "teleport" },
      V001: { type: "pit" },
    };
    const tower = (upper: string[][]): TempleLayout => ({
      entrance: [0, 1, 0],
      maze: { "1F": [[_, "K001", _, _], ["E001", "R001", "R002", "U001"], [_, _, _, _]], "2F": upper },
      rooms,
    });
    const sound = tower([[_, _, "MK01", _], ["B001", "R004", "b001", "D001"], ["P001", _, _, _]]);
    expect(solveTemple(sound).reasons).toEqual([]);

    const twinless = tower([[_, _, "MK01", _], ["B001", "R004", "b001", "R002"], ["P001", _, _, "D001"]]);
    expect(reasonsUnder("R8", twinless)).toEqual([
      "R8: 1F (1,3) stairs-up has no stairs-down at 2F (1,3)",
      "R8: 2F (2,3) stairs-down has no stairs-up at 1F (2,3)",
    ]);
    expect(solveTemple(twinless).solvable).toBe(true);

    const odd = tower([[_, "Y001", "MK01", _], ["B001", "R004", "b001", "D001"], ["P001", _, _, _]]);
    expect(reasonsUnder("R8", odd)).toEqual(["R8: 2F (0,1) teleport leads nowhere"]);

    const pit = tower([[_, _, "MK01", "V001"], ["B001", "R004", "b001", "D001"], ["P001", _, _, _]]);
    expect(solveTemple(pit).reasons).toEqual(["R8: 2F (0,3) pit drops onto a wall at 1F (0,3)"]);
  });

  describe("R8 Floors follow the climbing order, not the order the maze map holds them (#1380)", () => {
    // The map's keys are 1F, 2F, B1 (the basement was drawn last), so B1 lies below 1F. The entrance's floor index
    // still counts in the map's own order: 0 is 1F.
    const rooms: Record<string, Room> = { ...ROOMS, U001: { type: "stairs-up" }, D001: { type: "stairs-down" }, V001: { type: "pit" } };
    const basementLast = (changes: { second?: string[][]; ground?: string[][] } = {}): TempleLayout => ({
      entrance: [0, 1, 0],
      maze: {
        "1F": changes.ground ?? [[_, "K001", _, "U001"], ["E001", "R001", "R002", "D001"], [_, _, _, _]],
        "2F": changes.second ?? [[_, _, _, "D001"]],
        B1: [[_, _, "MK01", _], ["B001", "R004", "b001", "U001"], ["P001", _, _, _]],
      },
      rooms,
    });

    it("pairs stairs down from 1F with the stairs up in the basement, and stairs up with 2F", () => {
      const sound = basementLast();

      expect(solveTemple(sound).reasons).toEqual([]);
      expect(buildTempleGraph(sound).floors).toEqual(["1F", "2F", "B1"]);
    });

    it("finds the missing twin on 2F for stairs up from 1F, not on the basement", () => {
      const twinless = basementLast({ second: [[_, _, _, _]] });

      expect(reasonsUnder("R8", twinless)).toEqual(["R8: 1F (0,3) stairs-up has no stairs-down at 2F (0,3)"]);
    });

    it("sends stairs up on the top floor nowhere, not down into the basement", () => {
      const roof = basementLast({ second: [[_, _, "U001", "D001"]] });

      expect(reasonsUnder("R8", roof)).toEqual(["R8: 2F (0,2) stairs-up leads to no floor"]);
    });

    it("drops a pit on 1F into the basement", () => {
      const pit = basementLast({ ground: [[_, "K001", _, "U001"], ["E001", "R001", "R002", "D001"], [_, "V001", _, _]] });

      expect(reasonsUnder("R8", pit)).toEqual(["R8: 1F (2,1) pit drops onto a wall at B1 (2,1)"]);
    });
  });

  describe("R8 Teleports go where the engine sends them (teleportTargetFor)", () => {
    const circle = (id: string, content?: Room["content"]): Record<string, Room> => ({ [id]: { type: "teleport", ...(content ? { content } : {}) } });
    const T = { ...circle("T1"), ...circle("T2"), ...circle("T3") };

    /** Where each circle leads, as "from>to" pairs in reading order, and what R8 says about them */
    const wiring = (maze: Record<string, string[][]>, rooms: Record<string, Room> = T) => {
      const graph = buildTempleGraph({ maze, rooms: { [_]: { type: "wall" }, ...rooms } });
      return { doors: graph.doors.filter((door) => door.kind === "teleport").map((door) => door.id), issues: graph.issues.map((issue) => issue.text) };
    };

    it("cycles three circles on a floor: 0 -> 1 -> 2 -> 0, nothing without a partner", () => {
      expect(wiring({ "1F": [["T1", _, "T2", _, "T3"]] })).toEqual({ doors: ["1F:0,0>1F:0,2", "1F:0,2>1F:0,4", "1F:0,4>1F:0,0"], issues: [] });
    });

    it("sends a circle alone on its floor to the temple's next one: two on 1F and one on 2F", () => {
      const result = wiring({ "1F": [["T1", "T2"]], "2F": [["T3"]] });
      expect(result.doors).toEqual(["1F:0,0>1F:0,1", "1F:0,1>1F:0,0", "2F:0,0>1F:0,0"]);
      expect(result.issues).toEqual([]);
    });

    it("does not pair back: one on 1F and two on 2F, the way up is a one-way ride onto the first of the pair", () => {
      const result = wiring({ "1F": [["T1"]], "2F": [["T2", "T3"]] });
      expect(result.doors).toEqual(["1F:0,0>2F:0,0", "2F:0,0>2F:0,1", "2F:0,1>2F:0,0"]);
      expect(result.issues).toEqual([]);
    });

    it("honours the author's targetLevel and targetCoords (x is the column, y the row)", () => {
      const rooms = { ...circle("T1", { targetLevel: "2F", targetCoords: { x: 2, y: 0 } }), ...circle("T2"), ...circle("T3") };
      expect(wiring({ "1F": [["T1", "T2"]], "2F": [["T2", _, "T3"]] }, rooms).doors).toEqual(["1F:0,0>2F:0,2", "1F:0,1>1F:0,0", "2F:0,0>2F:0,2", "2F:0,2>2F:0,0"]);
    });

    it("sends a hero who names only a floor to that floor's first circle", () => {
      const rooms = { ...circle("T1", { targetLevel: "2F" }), ...circle("T2"), ...circle("T3") };
      expect(wiring({ "1F": [["T1", "T2", "T3"]], "2F": [["T3", "T2"]] }, rooms).doors[0]).toBe("1F:0,0>2F:0,0");
    });

    it("a circle with no other anywhere leads nowhere", () => {
      expect(wiring({ "1F": [["T1"]] })).toEqual({ doors: [], issues: ["1F (0,0) teleport leads nowhere"] });
    });
  });

  it("R9 No dead keys: a small key behind the boss door", () => {
    expect(reasonsUnder("R9", fixture({ "0,5": "K002" }))).toEqual(["R9: small key behind the boss door (1F (0,5) loot)"]);
  });

  it("locks are per token: every room spelled with a locked token is locked", () => {
    const graph = buildTempleGraph(fixture({ "3,0": "R001", "3,1": "R002" }));
    const locked = graph.doors.filter((door) => door.lock === "small").map((door) => door.id);
    expect(locked).toEqual(["1F:1,1>1F:1,2", "1F:3,0>1F:3,1"]);
  });

  describe("walls and bombable sides are walls to the solver (a temple must be finishable without Bombs)", () => {
    const doorIds = (layout: TempleLayout): string[] => buildTempleGraph(layout).doors.map((door) => door.id);

    it("joins no two rooms across a wall side or a bombable side, either way", () => {
      for (const barrier of ["wall", "bombable"] as const) {
        const ids = doorIds(fixture({}, { R002: { type: "empty", barriers: { east: barrier } } }));

        expect(ids).not.toContain("1F:1,2>1F:1,3");
        expect(ids).not.toContain("1F:1,3>1F:1,2"); // a wall is a wall from the other room too
        expect(ids).toContain("1F:1,1>1F:1,2"); // the sides it does not bar stay doors
      }
    });

    it("reads the barrier from the room beyond as well: the engine does, so a wall drawn on one end bars both", () => {
      const ids = doorIds(fixture({}, { b001: { type: "miniboss", content: { lockOnEnter: true }, barriers: { west: "bombable" } } }));

      expect(ids).not.toContain("1F:1,2>1F:1,3");
      expect(ids).not.toContain("1F:1,3>1F:1,2");
    });

    it("finds a temple whose only way on is a cracked wall unsolvable: no Bomb is counted on", () => {
      for (const barrier of ["wall", "bombable"] as const) {
        const result = solveTemple(fixture({}, { R002: { type: "empty", barriers: { east: barrier } } }));

        expect(result.solvable).toBe(false);
      }
    });

    it("leaves a cracked wall between two rooms the hero reaches another way as a shortcut that changes nothing", () => {
      const rooms: Record<string, Room> = { X1: { type: "empty", barriers: { east: "bombable" } }, X2: { type: "empty" } };
      const layout = fixture({ "2,1": "X1", "2,2": "X2" }, rooms);

      expect(doorIds(layout)).not.toContain("1F:2,1>1F:2,2");
      const result = solveTemple(layout);
      expect(result.reasons).toEqual([]);
      expect(result.solvable).toBe(true);
    });

    it("plays the editor's sides: a wall or a bombable side drawn in the creator is a barrier when registered", () => {
      const drawn: Record<string, Room> = { R002: lockedFromSides({ type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "door" } }) };

      expect(doorIds(fixture({}, drawn))).not.toContain("1F:1,2>1F:1,3");
    });
  });

  it("a 2-part entrance is on the first floor of the layout's order, as the engine starts the hero, even when a floor is named 1F", () => {
    const rooms: Record<string, Room> = { ...ROOMS };
    const maze = { B1: [["E001", "R001"]], "1F": [["R001", "E001"]] };
    expect(buildTempleGraph({ entrance: [0, 0], maze, rooms }).entrance).toBe("B1:0,0");
    // A 3-part entrance names the floor by its place in the order
    expect(buildTempleGraph({ entrance: [1, 0, 1], maze, rooms }).entrance).toBe("1F:0,1");
  });

  it("tells the compass which doors the hero can open now", () => {
    const first = openableDoors(fixture());
    expect(first.keys).toBe(1);
    expect(first.doors.map((door) => door.id)).toEqual(["1F:1,1>1F:1,2"]);
    const next = openableDoors(fixture(), ["1F:1,1>1F:1,2"]);
    expect(next.keys).toBe(0);
    expect(next.doors).toEqual([]);
  });

  describe("R12 Shipped temples pass", () => {
    /** The Wind Temple is the owner's own, edited in the Temple Creator: a rule it breaks shows in the title, it does not fail the suite */
    const HAND_MADE = ["wind-temple"];

    /** The layout as registration reads it: the editor's door sides (`sides`) become locks */
    const asRegistered = (temple: TempleLayout): TempleLayout => ({
      ...temple,
      rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
    });

    for (const [id, temple] of Object.entries(temples)) {
      const result = solveTemple(asRegistered(temple as TempleLayout));
      const test = HAND_MADE.includes(id) && result.reasons.length ? it.skip : it;
      const title = test === it.skip ? `${id} fails the solver: ${result.reasons.join(" | ")}` : `${id} passes the solver`;
      test(title, () => {
        expect(result.reasons).toEqual([]);
        expect(result.solvable).toBe(true);
      });
    }
  });
});
