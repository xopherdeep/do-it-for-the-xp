/**
 * The dress step's rules (tools/temples/classic/dress.ts) on small hand-made dungeons (classicFixtures.ts): what each
 * converted cell becomes, where displaced content goes, which fights seal and which guard the Boss Key, how the plan's
 * chores are dealt out, and the Bomb chest before a cracked wall on the only way. The shipped classic temples are
 * checked as a whole in ClassicTemples.spec.ts.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import { dressDungeon } from "../../tools/temples/classic/dress";
import { byway, corridor, crack, crossroads, drop, extras, fall, passage, plan, shifted, tower, treasury, twoScreens } from "./classicFixtures";

const DIRS = ["north", "east", "south", "west"] as const;

/** How many sides of a room are not walls */
const openSides = (room: Room | undefined): number => DIRS.filter((dir) => room?.sides?.[dir] !== "wall").length;

type Maze = Record<string, string[][]>;

const roomsOf = (temple: { maze: unknown; rooms: Record<string, Room> }) => {
  const maze = temple.maze as Maze;
  return (floor: string, row: number, col: number): Room | undefined => temple.rooms[maze[floor]?.[row]?.[col]];
};

const asRegistered = (temple: TempleLayout): TempleLayout => ({
  ...temple,
  rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
});

const beastsOf = (temple: { maze: unknown; rooms: Record<string, Room> }, type: string): string[] => {
  const at = roomsOf(temple);
  const found: string[] = [];
  for (const [floor, grid] of Object.entries(temple.maze as Maze)) {
    grid.forEach((line, row) =>
      line.forEach((_token, col) => {
        const room = at(floor, row, col);
        const isWanted = room?.type === type && room.content?.quest;
        if (isWanted) found.push(room!.content!.quest!.beastId.replace(/^beast-/, ""));
      })
    );
  }
  return found;
};

describe("dressing a classic dungeon", () => {
  describe("the corridor: doors, a key drop, a key in the open, the mini-boss before the Boss Key", () => {
    const { temple, report } = dressDungeon(corridor(), plan());
    const at = roomsOf(temple);

    it("makes the shutter guard that opens on the Boss Key vault the mini-boss, sealed, with its key in its drops", () => {
      expect(at("1F", 0, 1)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, difficulty: "hard", drops: { chest: "dungeon", dungeon: "key" }, quest: { beastId: "beast-under-bed-bogey", difficulty: 5 } } });
      expect(report.mustClear).toBe(0);
    });

    it("locks a small-key side on the end the hero reaches first and leaves the far end a door", () => {
      expect(at("1F", 0, 1)?.sides?.east).toBe("locked");
      expect(at("1F", 0, 2)?.sides?.west).toBe("door");
    });

    it("cracks a bomb side on both ends, and puts no Bomb chest before a wall that is off the way to the boss", () => {
      expect(at("1F", 1, 1)?.sides?.east).toBe("bombable");
      expect(at("1F", 1, 2)?.sides?.west).toBe("bombable");
      expect(report.bombChests).toEqual([]);
      expect(at("1F", 1, 2)).toMatchObject({ type: "loot", content: { chest: "gold", gold: 25 } });
    });

    it("lays a pot key in the open as a key room and the Boss Key in a Dungeon Item chest", () => {
      expect(at("1F", 1, 1)?.type).toBe("key");
      expect(at("1F", 0, 2)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
    });

    it("puts the Master Room in the wall under the boss, inside the grid, both doors Boss-locked", () => {
      expect((temple.maze as Maze)["1F"][0]).toHaveLength(4);
      expect(at("1F", 1, 3)).toMatchObject({ type: "master", content: { pegasus: true }, sides: { north: "masterlocked", west: "wall", south: "wall", east: "wall" } });
      expect(at("1F", 0, 3)?.sides).toEqual({ north: "wall", east: "wall", south: "masterlocked", west: "masterlocked" });
      expect(at("1F", 0, 2)?.sides?.east).toBe("masterlocked");
      expect(at("1F", 1, 2)?.sides?.east).toBe("wall");
      expect(report.placements.find((entry) => entry.type === "master")).toMatchObject({ at: { floor: "1F", row: 1, col: 3 }, grown: true });
    });

    it("passes the audit and the solver", () => {
      expect(auditTemple(temple).passed).toBe(true);
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });

    it("lists the plan's beasts that found no room", () => {
      expect(report.left).toEqual(["bed-basilisk", "shoe-shrew", "toybox-troll", "mess-hog", "piece-poltergeist"]);
      expect(report.overflow).toEqual([]);
    });

    it("opens one shop beside the entrance when the dungeon has no empty cell, and no save or camp", () => {
      expect(at("1F", 1, 0)).toMatchObject({ type: "shop", sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
      expect(at("1F", 0, 0)?.sides?.south).toBe("door");
      expect(report.placements.find((entry) => entry.type === "shop")).toMatchObject({ at: { floor: "1F", row: 1, col: 0 }, grown: true });
      expect(report.placements.filter((entry) => entry.type === "save" || entry.type === "camp")).toEqual([]);
    });
  });

  describe("the tower: a displaced Boss Key chest, the chores dealt out, the grid trimmed and grown", () => {
    const { temple, report } = dressDungeon(tower(), plan());
    const at = roomsOf(temple);

    it("moves the keep's Boss Key chest into a room added beside the keep, behind its seal, which makes the keep the mini-boss", () => {
      expect(at("2F", 1, 2)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" }, sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
      expect(at("2F", 0, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true }, sides: { south: "door" } });
      // The gallery the chest no longer takes is the save (the shop stays on the entrance floor)
      expect(at("2F", 0, 1)?.type).toBe("save");
      expect(report.moves).toEqual([
        { what: "big-key chest", from: { floor: "2F", row: 0, col: 2 }, to: { floor: "2F", row: 1, col: 2 }, grown: true },
        // The tower has no empty cell left, so the one shop is added beside the entrance
        { what: "shop", from: { floor: "1F", row: 0, col: 0 }, to: { floor: "1F", row: 1, col: 0 }, grown: true },
      ]);
    });

    it("deals the first starter to the one must-clear room, the next starter to the side hall, and leaves the rest", () => {
      expect(at("1F", 0, 2)).toMatchObject({ type: "monster", content: { lockOnEnter: true, difficulty: "easy", theme: "clouds", quest: { beastId: "beast-bed-basilisk", difficulty: 1, basicSchedule: "daily", dueByTime: "08:00" } } });
      expect(at("1F", 0, 1)).toMatchObject({ type: "monster", content: { difficulty: "easy", quest: { beastId: "beast-shoe-shrew" } } });
      expect(at("1F", 0, 1)?.content?.lockOnEnter).toBeUndefined();
      expect(report).toMatchObject({ mustClear: 1, repeats: [], overflow: ["shoe-shrew"], left: ["toybox-troll", "mess-hog", "piece-poltergeist"] });
    });

    it("keeps the stairs on the same cell of both floors and names the landing", () => {
      expect(at("1F", 0, 3)).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F", targetCoords: { x: 3, y: 0 } } });
      expect(at("2F", 0, 3)).toMatchObject({ type: "stairs-down", content: { targetLevel: "1F", targetCoords: { x: 3, y: 0 } } });
    });

    it("draws a Big-Key door between two ordinary rooms as a plain door, and lists it", () => {
      expect(at("2F", 0, 1)?.sides?.east).toBe("door");
      expect(at("2F", 0, 2)?.sides?.west).toBe("door");
      expect(report.plainBigKeyDoors).toEqual([{ at: { floor: "2F", row: 0, col: 1 }, direction: "east" }]);
    });

    it("lands the stairs of a two-screen shutter room beside the fight, never in the screen beyond the seal nor in the free closet past it", () => {
      const { temple: wide, report: wideReport } = dressDungeon(twoScreens(), plan());
      const atWide = roomsOf(wide);
      const flight = wideReport.placements.find((entry) => entry.type === "stairs-up")!;
      expect(flight).toMatchObject({ at: { floor: "1F", row: 1, col: 2 }, origin: { floor: "1F", row: 0, col: 2 }, grown: true });
      expect(atWide("1F", 0, 3)?.type).not.toMatch(/^stairs-/);
      expect(atWide("1F", 0, 4)?.type).not.toMatch(/^stairs-/);
      expect(atWide("1F", 1, 2)).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F", targetCoords: { x: 3, y: 0 } }, sides: { north: "door" } });
      expect(atWide("2F", 0, 3)).toMatchObject({ type: "stairs-down", content: { targetLevel: "1F", targetCoords: { x: 2, y: 1 } } });
      expect(solveTemple(asRegistered(wide))).toMatchObject({ solvable: true, reasons: [] });
    });

    it("trims the empty column the converter wrote, grows a row for the Boss Key chest and puts the Master Room under the boss", () => {
      const maze = temple.maze as Maze;
      expect(maze["2F"]).toHaveLength(2);
      expect(maze["2F"][0]).toHaveLength(4);
      expect(at("2F", 1, 0)).toMatchObject({ type: "master", sides: { north: "masterlocked" } });
      expect(at("2F", 0, 0)?.sides?.south).toBe("masterlocked");
      expect([maze["2F"][1][1], maze["2F"][1][3]]).toEqual(["_", "_"]);
    });

    it("passes the solver", () => {
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });

    it("promotes the must-clear room nearest the Boss Key chest when the plan has a second mini-boss", () => {
      const two = dressDungeon(tower(), plan({ minibosses: [["under-bed-bogey", 5, "weekly"], ["hoard-drake", 5, "weekly"]] }));
      const atTwo = roomsOf(two.temple);
      expect(atTwo("1F", 0, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: { beastId: "beast-under-bed-bogey" } } });
      expect(atTwo("2F", 0, 2)).toMatchObject({ type: "miniboss", content: { quest: { beastId: "beast-hoard-drake" } } });
      expect(two.report.mustClear).toBe(0);
      expect(two.report.overflow).toEqual(["bed-basilisk"]);
    });

    it("deals the easiest chore nearest the entrance, and repeats a beast when the plan is short", () => {
      const twoRooms = dressDungeon(tower(true), plan({ mustClear: [["mess-hog", 2, "daily"], ["bed-basilisk", 1, "daily am"]] }));
      expect(beastsOf(twoRooms.temple, "monster")).toEqual(["bed-basilisk", "mess-hog"]);
      expect(twoRooms.report).toMatchObject({ mustClear: 2, repeats: [], overflow: [] });

      const short = dressDungeon(tower(true), plan({ mustClear: [["bed-basilisk", 1, "daily am"]] }));
      expect(beastsOf(short.temple, "monster")).toEqual(["bed-basilisk", "bed-basilisk"]);
      expect(short.report.repeats).toEqual(["bed-basilisk"]);
    });
  });

  describe("the cracked wall on the only way", () => {
    const { temple, report } = dressDungeon(crack(), plan());
    const at = roomsOf(temple);

    it("puts a Bomb chest in the nearest reachable empty cell before the wall, and none for a crack that cuts nothing off", () => {
      expect(at("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "consumable", items: ["Bomb"] } });
      expect(report.bombChests).toEqual([{ floor: "1F", row: 0, col: 1 }]);
    });

    it("sells before any cracked wall: the cellar behind one is no shop, a room added beside the entrance is", () => {
      expect(at("1F", 1, 1)?.type).toBe("save");
      expect(at("1F", 1, 0)).toMatchObject({ type: "shop", sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
      expect(report.placements.find((entry) => entry.type === "shop")).toMatchObject({ at: { floor: "1F", row: 1, col: 0 }, grown: true });
    });

    it("is then solvable with no wall blown by hand", () => {
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });

    it("never hides the Bomb or the shop behind a small lock: the yard before the locked door gets the Bomb, the shop opens beside it", () => {
      const locked = dressDungeon(crack(true), plan());
      const atLocked = roomsOf(locked.temple);
      expect(locked.report.bombChests).toEqual([{ floor: "1F", row: 0, col: 1 }]);
      expect(atLocked("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "consumable", items: ["Bomb"] } });
      expect(atLocked("1F", 0, 2)?.type).toBe("save");
      expect(atLocked("1F", 1, 1)).toMatchObject({ type: "shop", sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
      expect(solveTemple(asRegistered(locked.temple))).toMatchObject({ solvable: true, reasons: [] });
    });
  });

  describe("a boss reached by a fall alone", () => {
    const { temple, report } = dressDungeon(fall(), plan());
    const at = roomsOf(temple);

    it("lands the fall in an added room beside the boss, behind the Boss door, with a circle back beside the room the hero fell from", () => {
      expect(at("1F", 0, 3)).toMatchObject({ type: "pit", content: { targetLevel: "2F", targetCoords: { x: 1, y: 0 } } });
      expect(at("2F", 0, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: 2, y: 1 } }, sides: { west: "masterlocked" } });
      expect(at("2F", 0, 0)).toMatchObject({ type: "boss", sides: { east: "masterlocked", south: "masterlocked" } });
      expect(at("2F", 1, 0)?.type).toBe("master");
      // The way back lands under the vault, the room the hero steps into the drop from: never a shortcut from the entrance
      expect(at("1F", 1, 2)).toMatchObject({ type: "teleport", content: { targetLevel: "2F", targetCoords: { x: 1, y: 0 } }, sides: { north: "door", west: "wall" } });
      expect(at("1F", 0, 2)?.sides?.south).toBe("door");
      // ... and, the dungeon having no empty cell, the one shop beside the entrance
      expect(report.placements.filter((entry) => entry.grown).map((entry) => `${entry.type} ${entry.at.floor} (${entry.at.row},${entry.at.col})`).sort()).toEqual(["master 2F (1,0)", "shop 1F (1,0)", "teleport 1F (1,2)", "teleport 2F (0,1)"]);
    });

    it("keeps the dungeon's route: the ride back from the boss is no shorter a way to him than the fall", () => {
      const graph = buildTempleGraph(asRegistered(temple));
      const hops = new Map<string, number>([[graph.entrance!, 0]]);
      const queue = [graph.entrance!];
      while (queue.length) {
        const key = queue.shift()!;
        for (const door of graph.out.get(key) ?? []) {
          const isNew = !hops.has(door.to);
          if (isNew) {
            hops.set(door.to, hops.get(key)! + 1);
            queue.push(door.to);
          }
        }
      }
      // Gate, guard, vault, drop, the antechamber: four doors to the Boss door, and the circle back adds no shorter way
      expect(hops.get("2F:0,1")).toBe(4);
    });

    it("needs the Boss Key to reach the boss, and clears with it", () => {
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
      const keyless: TempleLayout = asRegistered({ ...temple, rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, room.content?.dungeon === "master-key" ? { ...room, content: { chest: "gold", gold: 1 } } : room])) });
      const stuck = solveTemple(keyless);
      expect(stuck.solvable).toBe(false);
      expect(stuck.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/^R2: the master key is out of reach/)]));
    });
  });

  describe("holes, circles, riddles and a boss reached by stairs", () => {
    const { temple, report } = dressDungeon(drop(), plan({ minibosses: [["under-bed-bogey", 5, "weekly"]] }));
    const at = roomsOf(temple);
    const maze = temple.maze as Maze;

    it("makes a lone hole a pit that names where it drops, and a chest that shares a cell with stairs moves to the empty cell next door", () => {
      expect(at("2F", 1, 0)).toMatchObject({ type: "pit", content: { targetLevel: "1F", targetCoords: { x: 0, y: 0 } } });
      expect(at("1F", 0, 1)).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F", targetCoords: { x: 1, y: 1 } } });
      expect(at("1F", 0, 2)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
      expect(report.moves).toEqual(expect.arrayContaining([{ what: "big-key chest", from: { floor: "1F", row: 0, col: 1 }, to: { floor: "1F", row: 0, col: 2 }, grown: false }]));
    });

    it("drops a riddle displaced by stairs and says so, and drops nothing else", () => {
      expect(at("2F", 1, 1)?.type).toBe("stairs-down");
      expect(report.dropped).toEqual([expect.objectContaining({ what: "puzzle", at: { floor: "2F", row: 1, col: 1 } })]);
    });

    it("puts a hole that left its cell in a dead end of its own, so no one walks into the drop on the way somewhere", () => {
      for (const pit of report.placements.filter((entry) => entry.type === "pit")) {
        expect({ at: pit.at, openSides: openSides(at(pit.at.floor, pit.at.row, pit.at.col)) }).toEqual({ at: pit.at, openSides: 1 });
      }
    });

    it("moves the far fairy room next to the floor's used cells and points every link at it", () => {
      expect(report.compacted).toEqual([{ from: { floor: "1F", row: 0, col: 9 }, to: { floor: "1F", row: 0, col: 3 } }]);
      expect(maze["1F"][0]).toHaveLength(4);
      expect(at("1F", 0, 3)?.type).toBe("teleport");
      const fallen = report.placements.find((entry) => entry.type === "pit" && entry.at.floor === "2F" && entry.origin?.col === 2)!;
      expect(fallen).toMatchObject({ origin: { floor: "2F", row: 0, col: 2 }, grown: true });
      expect(at("2F", fallen.at.row, fallen.at.col)?.content).toMatchObject({ targetLevel: "1F", targetCoords: { x: 3, y: 0 } });
      expect(report.moves).toEqual(expect.arrayContaining([expect.objectContaining({ what: "hole", from: { floor: "2F", row: 1, col: 2 }, grown: true })]));
    });

    it("gives a circle that lands on no circle one beside its landing, never where its ride back opens a cell past a seal, and points it back", () => {
      const circles = report.placements.filter((entry) => entry.type === "teleport" && entry.at.floor === "2F");
      expect(circles).toHaveLength(1);
      const circle = at("2F", circles[0].at.row, circles[0].at.col)!;
      expect(circle.content).toMatchObject({ targetLevel: "1F", targetCoords: { x: 3, y: 0 } });
      expect(at("1F", 0, 3)).toMatchObject({ type: "teleport", content: { targetLevel: "2F", targetCoords: { x: circles[0].at.col, y: circles[0].at.row } } });
      // The fairies ride in from a room past the climb's seal: on the riddle's side their circle's ride back would open the
      // fairy room with every seal shut, so it opens on the climb alone, in a row grown above 2F (every 2F room moved down)
      expect(circles[0].at).toEqual({ floor: "2F", row: 0, col: 2 });
      expect(circle.sides).toEqual({ north: "wall", east: "wall", south: "door", west: "wall" });
      expect(report.shifted).toEqual([{ floor: "2F", rows: -1, cols: 0 }]);
    });

    it("keeps the must-clear fight on its cell, relocates its stairs next door and locks that climb with the Boss Key", () => {
      expect(at("2F", 1, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true } });
      const flight = report.placements.find((entry) => entry.type === "stairs-up" && entry.at.floor === "2F")!;
      expect(flight.origin).toEqual({ floor: "2F", row: 0, col: 2 });
      const stairs = at("2F", flight.at.row, flight.at.col)!;
      expect(stairs.content).toMatchObject({ targetLevel: "3F", targetCoords: { x: 1, y: 0 }, locked: "master" });
    });

    it("lands the climb beside the boss behind the Boss door, with the Pegasus on the other side", () => {
      expect(maze["3F"]).toEqual([[expect.any(String), expect.any(String)], [expect.any(String), "_"]]);
      expect(at("3F", 0, 0)?.type).toBe("boss");
      expect(at("3F", 0, 1)).toMatchObject({ type: "stairs-down", content: { targetLevel: "2F", targetCoords: { x: 3, y: 1 } }, sides: { west: "masterlocked" } });
      // The flight out of the sealed climb takes the nook that opens on the fight alone, before the hole takes a side of it
      expect(at("2F", 1, 3)).toMatchObject({ type: "stairs-up", sides: { north: "wall", east: "wall", south: "wall", west: "door" } });
      expect(report.placements.find((entry) => entry.type === "stairs-up" && entry.at.floor === "2F")).toMatchObject({ at: { floor: "2F", row: 1, col: 3 }, grown: false });
      expect(at("3F", 1, 0)).toMatchObject({ type: "master", sides: { north: "masterlocked" } });
      const verdict = solveTemple(asRegistered(temple));
      expect(verdict.solvable).toBe(true);
      expect(verdict.reasons.filter((reason) => reason.startsWith("R8"))).toEqual([]);
    });
  });

  describe("a hole and a circle pushed out of a crossroads", () => {
    const { temple, report } = dressDungeon(crossroads(), plan());
    const at = roomsOf(temple);

    it("puts the hole in the dead end of its own room, never in the passage, with its drop named", () => {
      expect(at("1F", 0, 3)).toMatchObject({ type: "pit", content: { targetLevel: "B1", targetCoords: { x: 0, y: 0 } } });
      expect(at("1F", 0, 2)?.type).not.toBe("pit");
      expect(report.moves).toEqual(expect.arrayContaining([{ what: "hole", from: { floor: "1F", row: 0, col: 1 }, to: { floor: "1F", row: 0, col: 3 }, grown: false }]));
    });

    it("keeps the circle too, beside its source when its room has no dead end left, pointed at its landing circle", () => {
      const circle = report.placements.find((entry) => entry.type === "teleport" && entry.origin?.floor === "1F" && entry.origin.col === 1)!;
      expect(circle).toMatchObject({ grown: true });
      expect(Math.abs(circle.at.row - 0) + Math.abs(circle.at.col - 1)).toBe(1);
      expect(at(circle.at.floor, circle.at.row, circle.at.col)?.content).toMatchObject({ targetLevel: "B1", targetCoords: { x: 1, y: 0 } });
      expect(at("B1", 0, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: circle.at.col, y: circle.at.row } } });
      expect(report.dropped.map((entry) => entry.what)).toEqual([]);
    });
  });

  describe("a floor that starts past the first row", () => {
    const { temple, report } = dressDungeon(shifted(), plan());
    const at = roomsOf(temple);

    it("moves up, and keeps the small lock on the end the hero reaches first", () => {
      expect(report.shifted).toEqual([{ floor: "1F", rows: 2, cols: 0 }]);
      expect(at("1F", 0, 0)?.type).toBe("entrance");
      expect(at("1F", 0, 1)).toMatchObject({ type: "key", sides: { east: "locked" } });
      expect(at("1F", 0, 2)).toMatchObject({ type: "miniboss", sides: { west: "door" } });
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });

    it("names a merged screen where it stands now, not where the converter drew it", () => {
      const wide = dressDungeon(shifted(true), plan());
      expect(wide.report.merged).toEqual([expect.objectContaining({ what: "enemies", at: { floor: "1F", row: 1, col: 2 } })]);
      // The screen with the fight folded out of it is a free cell: the extras take it (the save)
      expect(roomsOf(wide.temple)("1F", 1, 2)?.type).toBe("save");
    });
  });

  describe("a hole in a passage", () => {
    const { temple, report } = dressDungeon(passage(), plan());
    const at = roomsOf(temple);

    it("goes to a dead end added beside the passage, which stays a room", () => {
      expect(at("1F", 0, 1)?.type).not.toBe("pit");
      const pit = report.placements.find((entry) => entry.type === "pit")!;
      expect(pit).toMatchObject({ origin: { floor: "1F", row: 0, col: 1 }, grown: true });
      expect(Math.abs(pit.at.row - 0) + Math.abs(pit.at.col - 1)).toBe(1);
      expect(at(pit.at.floor, pit.at.row, pit.at.col)).toMatchObject({ content: { targetLevel: "B1", targetCoords: { x: 0, y: 0 } } });
      expect(openSides(at(pit.at.floor, pit.at.row, pit.at.col))).toBe(1);
      expect(report.moves).toEqual(expect.arrayContaining([expect.objectContaining({ what: "hole", from: { floor: "1F", row: 0, col: 1 }, grown: true })]));
    });
  });

  describe("the extras in the empty cells, and side rooms that borrow a floor's beasts", () => {
    const { temple, report } = dressDungeon(extras(), plan({ mustClear: [["mess-hog", 2, "daily"]], shop: "LightningScroll" }));
    const at = roomsOf(temple);

    it("opens the shop and the save nearest the entrance, then a camp per floor, and leaves the rest empty", () => {
      expect(at("1F", 0, 2)).toMatchObject({ type: "shop", content: { specialItem: "LightningScroll" } });
      expect(at("B1", 0, 2)?.type).toBe("save");
      expect(at("1F", 0, 3)).toMatchObject({ type: "camp", content: { healthPoints: 15 } });
      expect(at("1F", 1, 3)?.type).toBe("empty");
    });

    it("gives every side room its floor's must-clear beast, a basement borrowing the nearest floor's", () => {
      expect(at("1F", 1, 0)).toMatchObject({ type: "monster", content: { lockOnEnter: true, quest: { beastId: "beast-mess-hog" } } });
      expect(at("1F", 1, 1)).toMatchObject({ type: "miniboss" });
      expect(at("1F", 0, 4)).toMatchObject({ type: "monster", content: { difficulty: "normal", quest: { beastId: "beast-mess-hog" } } });
      expect(at("B1", 0, 0)).toMatchObject({ type: "monster", content: { quest: { beastId: "beast-mess-hog" } } });
      expect(at("B1", 0, 0)?.content?.lockOnEnter).toBeUndefined();
      expect(report).toMatchObject({ mustClear: 1, repeats: [], overflow: [], left: [] });
    });

    it("passes the solver", () => {
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });
  });

  describe("a plan with more than one relic", () => {
    it("keeps every gold chest gold when the plan has one relic", () => {
      const at = roomsOf(dressDungeon(treasury(), plan()).temple);
      expect([at("1F", 0, 1)?.content, at("1F", 1, 3)?.content]).toEqual([{ chest: "gold", gold: 25 }, { chest: "gold", gold: 25 }]);
    });

    it("puts the relics beyond the first, in order, into the `other` chests nearest the entrance", () => {
      const one = roomsOf(dressDungeon(treasury(), plan({ extraRelics: ["Moon Shard"] })).temple);
      expect(one("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "Moon Shard" } });
      expect(one("1F", 1, 3)?.content).toEqual({ chest: "gold", gold: 25 });
      const two = roomsOf(dressDungeon(treasury(), plan({ extraRelics: ["Moon Shard", "Star Shard"] })).temple);
      expect([two("1F", 0, 1)?.content?.dungeon, two("1F", 1, 3)?.content?.dungeon]).toEqual(["Moon Shard", "Star Shard"]);
    });

    it("throws when the dungeon has fewer `other` chests than the plan has relics beyond the first", () => {
      expect(() => dressDungeon(treasury(), plan({ extraRelics: ["Moon Shard", "Star Shard", "Sun Shard"] }))).toThrow(/3 relics beyond the first for 2/);
    });
  });

  describe("a Boss Key down a byway the design's mini-boss does not guard", () => {
    const solved = (made: { temple: TempleLayout }) => solveTemple(asRegistered(made.temple));

    it("leaves the Boss Key unguarded (R4) when the plan names no room: the Statue before the Big Chest is the mini-boss", () => {
      const made = dressDungeon(byway(), plan());
      expect(roomsOf(made.temple)("1F", 0, 1)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true } });
      expect(solved(made).reasons).toEqual(["R4: the master key at 1F (1,3) loot can be reached without passing the mini-boss"]);
    });

    it("makes the room the plan names the mini-boss, sealing a side fight, and the Statue a must-clear monster", () => {
      const made = dressDungeon(byway(), plan({ minibossRooms: ["Trench"] }));
      const at = roomsOf(made.temple);
      expect(at("1F", 1, 1)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, difficulty: "hard", quest: { beastId: "beast-under-bed-bogey", difficulty: 5 } } });
      expect(at("1F", 0, 1)).toMatchObject({ type: "monster", content: { lockOnEnter: true, quest: { beastId: "beast-bed-basilisk" } } });
      expect(made.report.mustClear).toBe(1);
      expect(solved(made)).toMatchObject({ solvable: true, reasons: [] });
    });

    it("gives the mini-boss nearest the entrance the easiest quest, whatever the plan's order", () => {
      const made = dressDungeon(byway(), plan({ minibossRooms: ["Trench"], minibosses: [["under-bed-bogey", 5, "weekly"], ["hoard-drake", 3, "weekly"]] }));
      const at = roomsOf(made.temple);
      // The Statue is one door from the entrance, the Trench two
      expect(at("1F", 0, 1)).toMatchObject({ type: "miniboss", content: { quest: { beastId: "beast-hoard-drake", difficulty: 3 } } });
      expect(at("1F", 1, 1)).toMatchObject({ type: "miniboss", content: { quest: { beastId: "beast-under-bed-bogey", difficulty: 5 } } });
    });

    it("fights in a named room the converter read no enemies in, in its first screen", () => {
      const made = dressDungeon(byway(), plan({ minibossRooms: ["Armory"] }));
      const at = roomsOf(made.temple);
      expect(at("1F", 1, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true }, sides: { west: "door", east: "door" } });
      expect(at("1F", 1, 1)?.content?.lockOnEnter).toBeUndefined();
      expect(solved(made)).toMatchObject({ solvable: true, reasons: [] });
    });

    it("fights in the screen of a named room that holds the Big Key, and the Boss Key waits behind the fight", () => {
      const made = dressDungeon(byway(), plan({ minibossRooms: ["Alcove"] }));
      const at = roomsOf(made.temple);
      expect(at("1F", 1, 3)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true } });
      const chest = made.report.moves.find((move) => move.what === "big-key chest")!;
      expect(chest.from).toEqual({ floor: "1F", row: 1, col: 3 });
      expect(at(chest.to.floor, chest.to.row, chest.to.col)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
      expect(openSides(at(chest.to.floor, chest.to.row, chest.to.col))).toBe(1);
      expect(solved(made)).toMatchObject({ solvable: true, reasons: [] });
    });

    it("throws on a named room the dungeon does not have, or on more named rooms than the plan has mini-bosses", () => {
      expect(() => dressDungeon(byway(), plan({ minibossRooms: ["Nowhere"] }))).toThrow(/Nowhere/);
      expect(() => dressDungeon(byway(), plan({ minibossRooms: ["Trench", "Armory"] }))).toThrow(/2 mini-boss rooms/);
    });
  });
});
