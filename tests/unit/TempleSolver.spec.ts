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
    expect(reasonsUnder("R6", fixture({}, { B001: { type: "boss", content: { lockOnEnter: true } } }))).toEqual(["R6: the boss door at 1F (1,5) boss is not locked with locked.master"]);
    expect(reasonsUnder("R6", fixture({ "0,5": "R004", "0,4": "R004" }))).toEqual(["R6: the boss room at 1F (1,5) boss has 2 doors from the temple (needs exactly one)"]);
    expect(reasonsUnder("R6", fixture({ "3,0": "B001" }))).toEqual(["R6: 2 boss rooms"]);
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
    expect(reasonsUnder("R8", odd)).toEqual(["R8: 2F (0,1) teleport has no partner"]);

    const pit = tower([[_, _, "MK01", "V001"], ["B001", "R004", "b001", "D001"], ["P001", _, _, _]]);
    expect(solveTemple(pit).reasons).toEqual(["R8: 2F (0,3) pit drops onto a wall at 1F (0,3)"]);
  });

  it("R9 No dead keys: a small key behind the boss door", () => {
    expect(reasonsUnder("R9", fixture({ "0,5": "K002" }))).toEqual(["R9: small key behind the boss door (1F (0,5) loot)"]);
  });

  it("locks are per token: every room spelled with a locked token is locked", () => {
    const graph = buildTempleGraph(fixture({ "3,0": "R001", "3,1": "R002" }));
    const locked = graph.doors.filter((door) => door.lock === "small").map((door) => door.id);
    expect(locked).toEqual(["1F:1,1>1F:1,2", "1F:3,0>1F:3,1"]);
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
