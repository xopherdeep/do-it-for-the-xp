/**
 * The dress step's rules (tools/temples/classic/dress.ts) that a dungeon of Zelda 1 asks for, on AERIE, the Eagle in
 * miniature (classicFixtures.ts): the push-block steps keep their stairway, a circle of ours, over the riddle; and the
 * plan's options the Wind Temple needs: rooms of its own beyond the dungeon's (`handRooms`), the shop in a room the
 * dungeon names (`shopAt`), a side fight standing over its chest (`guardedChests`) and every chore of the plan kept
 * (`keepsEveryChore`). The rules every classic dungeon shares are checked in ClassicDress.spec.ts, the Wind Temple
 * itself in WindTemple.spec.ts.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";
import { dressDungeon, withHandRooms } from "../../tools/temples/classic/dress";
import { AERIE_HAND_ROOMS, aerie, aeriePlan, plan } from "./classicFixtures";

const asRegistered = (temple: TempleLayout): TempleLayout => ({
  ...temple,
  rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
});

const isAt = (where: { floor: string; row: number; col: number }, floor: string, row: number, col: number): boolean => where.floor === floor && where.row === row && where.col === col;

type Maze = Record<string, string[][]>;

const roomsOf = (temple: { maze: unknown; rooms: Record<string, Room> }) => {
  const maze = temple.maze as Maze;
  return (floor: string, row: number, col: number): Room | undefined => temple.rooms[maze[floor]?.[row]?.[col]];
};

/** "puzzle 1F (1,2)": how a report entry reads */
const named = (entry: { what: string; at: { floor: string; row: number; col: number } }): string => `${entry.what} ${entry.at.floor} (${entry.at.row},${entry.at.col})`;

describe("dressing a dungeon of Zelda 1", () => {
  describe("a riddle and a circle in one cell (the Eagle's push-block steps)", () => {
    const { temple, report } = dressDungeon(aerie(), plan());
    const at = roomsOf(temple);

    it("keeps the circle in its cell, as a flight keeps its own, and drops the riddle", () => {
      expect(at("1F", 1, 2)).toMatchObject({ type: "teleport", content: { targetLevel: "B1" } });
      expect(report.dropped.map(named)).toContain("puzzle 1F (1,2)");
      const movedOut = report.moves.filter((move) => move.from.floor === "1F" && move.from.row === 1 && move.from.col === 2);
      expect(movedOut).toEqual([]);
    });

    it("rides the circle down to one beside the Big Chest, which rides back up to the steps", () => {
      expect(at("B1", 0, 0)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "Lightning Rod" } });
      expect(at("1F", 1, 2)?.content?.targetCoords).toEqual({ x: 1, y: 0 });
      expect(at("B1", 0, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: 2, y: 1 } }, sides: { west: "door" } });
    });
  });

  describe("the plan's own rooms (handRooms)", () => {
    const made = dressDungeon(aerie(), aeriePlan());
    const at = roomsOf(made.temple);

    it("join the dungeon the dress step reads: each a cell of its floor, the floor grown to hold it, its keys counted", () => {
      const converted = aerie();
      const joined = withHandRooms(converted, aeriePlan());
      const floor = joined.floors.find((level) => level.name === "1F")!;
      expect({ rows: floor.rows, cols: floor.cols, cells: floor.cells.length }).toEqual({ rows: 3, cols: 5, cells: 11 });
      expect(joined.report).toMatchObject({ cellsPerFloor: { B1: 1, "1F": 11 }, smallKeys: 2 });
      // The converter's dungeon is left as it was
      expect(converted.floors.find((level) => level.name === "1F")!.cells).toHaveLength(7);
      expect(withHandRooms(converted, plan())).toBe(converted);
    });

    it("throw when one stands on a converted cell or on a floor the dungeon does not have", () => {
      const [pantry] = AERIE_HAND_ROOMS;
      expect(() => withHandRooms(aerie(), aeriePlan({ handRooms: [{ ...pantry, row: 1, col: 1 }] }))).toThrow(/Owner's Pantry stands on the converted cell 1F \(1,1\)/);
      expect(() => withHandRooms(aerie(), aeriePlan({ handRooms: [{ ...pantry, floor: "3F" }] }))).toThrow(/floor 3F/);
    });

    it("are dressed as the dungeon's own cells, with the sides they were drawn with", () => {
      expect(at("1F", 2, 1)).toMatchObject({ type: "key", sides: { north: "wall", east: "door", south: "wall", west: "wall" } });
      expect(at("1F", 2, 4)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" }, sides: { west: "door" } });
      const placement = made.report.placements.find((entry) => isAt(entry.at, "1F", 2, 3))!;
      expect(placement).toMatchObject({ room: "Owner's Fight", grown: false });
    });

    it("ride their circle to one added beside the Big Chest, and the named fight is the mini-boss that guards the Boss Key", () => {
      expect(at("1F", 2, 2)).toMatchObject({ type: "teleport", content: { targetLevel: "B1", targetCoords: { x: 0, y: 1 } } });
      expect(at("B1", 1, 0)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: 2, y: 2 } }, sides: { north: "door", east: "wall" } });
      expect(made.report.moves.map((move) => `${move.what} ${move.from.floor} (${move.from.row},${move.from.col}) -> ${move.to.floor} (${move.to.row},${move.to.col})`)).toContain(
        "landing circle B1 (0,0) -> B1 (1,0)"
      );
      // The guard, nearer the entrance, has the easier quest
      expect(at("1F", 0, 2)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: { beastId: "beast-hoard-drake", difficulty: 3 }, drops: { dungeon: "key" } } });
      expect(at("1F", 2, 3)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: { beastId: "beast-under-bed-bogey", difficulty: 5 } } });
    });

    it("pass the solver and the audit", () => {
      expect(solveTemple(asRegistered(made.temple))).toMatchObject({ solvable: true, reasons: [] });
      expect(missingNames(auditTemple(made.temple))).toEqual([]);
    });
  });

  describe("a shop in a room the plan names (shopAt)", () => {
    it("sells there, even behind a cracked wall (Zelda's old man's room); with no pin, before any key, Bomb or seal", () => {
      const pinned = roomsOf(dressDungeon(aerie(), aeriePlan()).temple);
      expect(pinned("1F", 0, 0)).toMatchObject({ type: "shop", sides: { east: "bombable" } });
      const free = dressDungeon(aerie(), aeriePlan({ shopAt: undefined }));
      expect(free.report.placements.filter((entry) => entry.type === "shop")).toEqual([expect.objectContaining({ at: { floor: "1F", row: 2, col: 0 }, grown: true })]);
      expect(roomsOf(free.temple)("1F", 0, 0)?.type).toBe("save");
    });

    it("throws when the pin names no free converted cell", () => {
      expect(() => dressDungeon(aerie(), aeriePlan({ shopAt: { floor: "1F", row: 1, col: 0 } }))).toThrow(/pins the shop on 1F \(1,0\)/);
    });
  });

  describe("a side fight over a chest (guardedChests)", () => {
    it("keeps the cell and hands the chest out once won, as Zelda 1 leaves an item where its enemies stand", () => {
      const made = dressDungeon(aerie(), aeriePlan());
      expect(roomsOf(made.temple)("1F", 0, 1)).toMatchObject({ type: "monster", content: { drops: { chest: "dungeon", dungeon: "compass" } } });
      expect(roomsOf(made.temple)("1F", 0, 1)?.content?.lockOnEnter).toBeUndefined();
      expect(made.report.moves.filter((move) => isAt(move.from, "1F", 0, 1))).toEqual([]);
    });

    it("gives the cell to the chest when the plan does not ask, and the fight moves", () => {
      const made = dressDungeon(aerie(), aeriePlan({ guardedChests: false, shopAt: undefined }));
      expect(roomsOf(made.temple)("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "compass" } });
      expect(made.report.moves.filter((move) => isAt(move.from, "1F", 0, 1)).map((move) => move.what)).toEqual(["side fight"]);
    });
  });

  describe("every chore of the plan kept (keepsEveryChore)", () => {
    it("gives a chore the must-clear rooms leave a side room of its own, starter or not", () => {
      const made = dressDungeon(aerie(), aeriePlan());
      expect(roomsOf(made.temple)("1F", 1, 1)).toMatchObject({ type: "monster", content: { lockOnEnter: true, quest: { beastId: "beast-mess-hog" } } });
      expect(roomsOf(made.temple)("1F", 0, 1)).toMatchObject({ content: { quest: { beastId: "beast-piece-poltergeist" } } });
      expect(made.report).toMatchObject({ mustClear: 1, overflow: ["piece-poltergeist"], left: [] });
    });

    it("lets it leave when the plan does not ask: the side room repeats the floor's must-clear beast", () => {
      const made = dressDungeon(aerie(), aeriePlan({ keepsEveryChore: false }));
      expect(roomsOf(made.temple)("1F", 0, 1)).toMatchObject({ content: { quest: { beastId: "beast-mess-hog" } } });
      expect(made.report).toMatchObject({ overflow: [], left: ["piece-poltergeist"] });
    });
  });
});
