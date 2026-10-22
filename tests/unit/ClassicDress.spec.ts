/**
 * The dress step's rules (tools/temples/classic/dress.ts) on small hand-made dungeons (classicFixtures.ts): what each
 * converted cell becomes, where displaced content goes, which fights seal and which guard the Boss Key, how the plan's
 * chores are dealt out, and the Bomb chest before a cracked wall on the only way. The shipped classic temples are
 * checked as a whole in ClassicTemples.spec.ts.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import { dressDungeon } from "../../tools/temples/classic/dress";
import { corridor, crack, drop, extras, plan, tower } from "./classicFixtures";

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
  });

  describe("the tower: a displaced Boss Key chest, the chores dealt out, the grid trimmed and grown", () => {
    const { temple, report } = dressDungeon(tower(), plan());
    const at = roomsOf(temple);

    it("moves the keep's Boss Key chest into the empty gallery next door, which makes the keep the mini-boss", () => {
      expect(at("2F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
      expect(at("2F", 0, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true } });
      expect(report.moves).toEqual([{ what: "big-key chest", from: { floor: "2F", row: 0, col: 2 }, to: { floor: "2F", row: 0, col: 1 }, grown: false }]);
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

    it("trims the empty column the converter wrote and grows a row for the Master Room under the boss", () => {
      const maze = temple.maze as Maze;
      expect(maze["2F"]).toHaveLength(2);
      expect(maze["2F"][0]).toHaveLength(4);
      expect(at("2F", 1, 0)).toMatchObject({ type: "master", sides: { north: "masterlocked" } });
      expect(at("2F", 0, 0)?.sides?.south).toBe("masterlocked");
      expect(maze["2F"][1].slice(1)).toEqual(["_", "_", "_"]);
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

    it("puts a Bomb chest in the nearest reachable empty cell before the wall", () => {
      expect(at("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "consumable", items: ["Bomb"] } });
      expect(report.bombChests).toEqual([{ floor: "1F", row: 0, col: 1 }]);
    });

    it("is then solvable with no wall blown by hand", () => {
      expect(solveTemple(asRegistered(temple))).toMatchObject({ solvable: true, reasons: [] });
    });
  });

  describe("holes, circles, riddles and a boss reached by stairs", () => {
    const { temple, report } = dressDungeon(drop(), plan({ minibosses: [["under-bed-bogey", 5, "weekly"]] }));
    const at = roomsOf(temple);
    const maze = temple.maze as Maze;

    it("makes a lone hole a pit, and a chest that shares a cell with stairs moves to the empty cell next door", () => {
      expect(at("2F", 0, 0)?.type).toBe("pit");
      expect(at("1F", 0, 1)).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F", targetCoords: { x: 1, y: 0 } } });
      expect(at("1F", 0, 2)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
      expect(report.moves).toEqual(expect.arrayContaining([{ what: "big-key chest", from: { floor: "1F", row: 0, col: 1 }, to: { floor: "1F", row: 0, col: 2 }, grown: false }]));
    });

    it("drops a riddle displaced by stairs and says so", () => {
      expect(at("2F", 0, 1)?.type).toBe("stairs-down");
      expect(report.dropped).toEqual(expect.arrayContaining([expect.objectContaining({ what: "puzzle", at: { floor: "2F", row: 0, col: 1 } })]));
    });

    it("turns a hole into a circle when it lands on one, and points the circle back", () => {
      const circles = report.placements.filter((entry) => entry.type === "teleport" && entry.at.floor === "2F");
      expect(circles).toHaveLength(1);
      const circle = at("2F", circles[0].at.row, circles[0].at.col)!;
      expect(circle.content).toMatchObject({ targetLevel: "1F", targetCoords: { x: 3, y: 0 } });
      expect(at("1F", 0, 3)).toMatchObject({ type: "teleport", content: { targetLevel: "2F", targetCoords: { x: circles[0].at.col, y: circles[0].at.row } } });
    });

    it("keeps the must-clear fight on its cell, relocates its stairs next door and locks that climb with the Boss Key", () => {
      expect(at("2F", 0, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true } });
      const flight = report.placements.find((entry) => entry.type === "stairs-up" && entry.at.floor === "2F")!;
      expect(flight.origin).toEqual({ floor: "2F", row: 0, col: 2 });
      const stairs = at("2F", flight.at.row, flight.at.col)!;
      expect(stairs.content).toMatchObject({ targetLevel: "3F", targetCoords: { x: 1, y: 0 }, locked: "master" });
    });

    it("lands the climb beside the boss behind the Boss door, with the Pegasus on the other side", () => {
      expect(maze["3F"]).toEqual([[expect.any(String), expect.any(String)], [expect.any(String), "_"]]);
      expect(at("3F", 0, 0)?.type).toBe("boss");
      expect(at("3F", 0, 1)).toMatchObject({ type: "stairs-down", content: { targetLevel: "2F", targetCoords: { x: expect.any(Number), y: 0 } }, sides: { west: "masterlocked" } });
      expect(at("3F", 1, 0)).toMatchObject({ type: "master", sides: { north: "masterlocked" } });
      expect(solveTemple(asRegistered(temple)).solvable).toBe(true);
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
});
