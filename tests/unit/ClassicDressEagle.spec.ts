/**
 * The dress step's rules (tools/temples/classic/dress.ts) that a dungeon of Zelda 1 asks for, on AERIE, the Eagle in
 * miniature (classicFixtures.ts): the push-block steps keep their stairway, a circle of ours, over the riddle. The
 * rules every classic dungeon shares are checked in ClassicDress.spec.ts, the Wind Temple itself in WindTemple.spec.ts.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { dressDungeon } from "../../tools/temples/classic/dress";
import { aerie, plan } from "./classicFixtures";

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
});
