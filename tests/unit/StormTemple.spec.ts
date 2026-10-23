/**
 * The Storm Temple's rooms, pinned as the classic dress step makes them from tools/temples/classic/dungeons/
 * storm-temple.json. Split from ClassicTemples.spec.ts, which checks the rules every classic temple keeps, to keep
 * that file under the line budget; WindTemple.spec.ts pins the Wind Temple the same way.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { climbLockOf } from "@/lib/services/temples/authoredDoors";
import { smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { classicReport, dressClassic } from "../../tools/temples/classic/dress";

/**
 * The Storm Temple is the Tower of Hera: what the dressing made of it, pinned. Six floors, the Boss Key in the basement
 * behind the Tridorm mini-boss, a small key under the lobby that opens the locked flight down, two must-clear rooms
 * on 2F, the Lightning Rod in the Big Chest on 3F, the Boss Key climb to Moldorm's floor and the Pegasus behind him.
 */
describe("the Storm Temple from the Tower of Hera", () => {
  const temple = dressClassic("storm-temple");
  const report = classicReport("storm-temple");
  const maze = temple.maze as Record<string, string[][]>;
  const rooms = temple.rooms as Record<string, Room>;
  const at = (floor: string, row: number, col: number): Room => rooms[maze[floor][row][col]];

  it("climbs six floors from the basement, entering on 1F", () => {
    expect(Object.keys(maze)).toEqual(["B1", "1F", "2F", "3F", "4F", "5F"]);
    expect(temple.entrance).toEqual([1, 1, 0]);
    expect(temple.name).toBe("Storm Temple");
  });

  it("guards the Boss Key with the Tridorm mini-boss and keeps the small key under the lobby", () => {
    expect(at("B1", 0, 1)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: { beastId: "beast-under-bed-bogey", difficulty: 5 } } });
    expect(at("B1", 1, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
    expect(at("1F", 0, 0)).toMatchObject({ type: "stairs-down", content: { targetLevel: "B1", locked: "small" } });
    expect(at("B1", 0, 0)).toMatchObject({ type: "stairs-up", content: { targetLevel: "1F" } });
    expect(climbLockOf(at("B1", 0, 0))).toBeUndefined();
    expect(Object.values(rooms).reduce((sum, room) => sum + smallKeysGranted(room), 0)).toBe(1);
    // The Cage's beasts, moved out of the stairs cell with its key chest, hang behind that chest and not off the vault
    expect(at("B1", 2, 0)).toMatchObject({ type: "loot", content: { dungeon: "key" }, sides: { north: "door", east: "door" } });
    expect(at("B1", 2, 1)).toMatchObject({ type: "monster", sides: { west: "door", north: "wall" } });
    expect(at("B1", 1, 1).sides?.south).toBe("wall");
  });

  it("seals the two star-tile rooms on 2F with the starter beasts, easiest nearest the entrance", () => {
    expect(at("2F", 1, 1)).toMatchObject({ type: "monster", content: { lockOnEnter: true, quest: { beastId: "beast-bed-basilisk", difficulty: 1 } } });
    expect(at("2F", 1, 0)).toMatchObject({ type: "monster", content: { lockOnEnter: true, quest: { beastId: "beast-shoe-shrew", difficulty: 1 } } });
    expect(report.mustClear).toBe(2);
    expect(report.repeats).toEqual([]);
    expect(report.overflow).toEqual(["toybox-troll"]);
  });

  it("lands the climb from the lobby beside the Beetles fight, opening on it alone, and keeps each star-tile pit under its fight", () => {
    expect(at("1F", 1, 1)).toMatchObject({ type: "stairs-up", content: { targetLevel: "2F", targetCoords: { x: 2, y: 1 } } });
    expect(at("2F", 1, 2)).toMatchObject({ type: "stairs-down", content: { targetLevel: "1F", targetCoords: { x: 1, y: 1 } }, sides: { north: "wall", east: "wall", south: "wall", west: "door" } });
    expect(at("2F", 2, 0)).toMatchObject({ type: "pit", sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
    expect(at("2F", 2, 1)).toMatchObject({ type: "pit", sides: { north: "door", east: "wall", south: "wall", west: "wall" } });
  });

  it("keeps the Lightning Rod and the compass within a walk of the 3F screens that held them, and the map beside the locked flight", () => {
    // The Big Chest's screen keeps its stairs, the compass's screen too: the Rod opens beside the stairs down, the compass takes the room's empty screen
    expect(at("3F", 0, 2)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "Lightning Rod" }, sides: { west: "door" } });
    expect(at("3F", 1, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "compass" }, sides: { north: "door" } });
    expect(at("1F", 0, 1)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "map" } });
  });

  it("locks the climb to Moldorm's floor with the Boss Key and lands beside him, the Pegasus behind", () => {
    expect(at("4F", 0, 1)).toMatchObject({ type: "stairs-up", content: { targetLevel: "5F", targetCoords: { x: 1, y: 0 }, locked: "master" } });
    expect(at("5F", 0, 0)).toMatchObject({ type: "boss", content: { lockOnEnter: true, element: "storm", quest: { beastId: "beast-clutter-chimera", difficulty: 8 } } });
    expect(at("5F", 0, 1)).toMatchObject({ type: "stairs-down", content: { targetLevel: "4F" }, sides: { west: "masterlocked" } });
    expect(at("5F", 1, 0)).toMatchObject({ type: "master", sides: { north: "masterlocked" } });
  });

  it("moves the fairy room up beside the rest of 3F, falls into it through a pit and rides a circle back up", () => {
    expect(report.compacted).toEqual([{ from: { floor: "3F", row: 16, col: 0 }, to: { floor: "3F", row: 2, col: 0 } }]);
    expect(maze["3F"]).toHaveLength(3);
    // The fall out of the Boss Key climb's screen is a pit in a dead end beside it; the fairy room rides to a circle beside the 4F fight
    expect(at("4F", 1, 2)).toMatchObject({ type: "pit", content: { targetLevel: "3F", targetCoords: { x: 0, y: 2 } }, sides: { north: "wall", east: "wall", south: "wall", west: "door" } });
    expect(at("3F", 2, 0)).toMatchObject({ type: "teleport", content: { targetLevel: "4F", targetCoords: { x: 1, y: 2 } } });
    expect(at("4F", 2, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "3F", targetCoords: { x: 0, y: 2 } } });
  });

  it("drops the Big Chest screen's warp (its ride back would skip the star-tile seals), keeps the boss's, sells beside the lobby, and plays the big-key door as a plain one", () => {
    // The 3F warp's two rooms stay as empty rooms; the boss's warp rides to a circle beside the Rod's room on 3F
    expect(at("3F", 1, 2)).toMatchObject({ type: "empty", sides: { north: "door" } });
    expect(at("1F", 2, 0)).toMatchObject({ type: "empty", sides: { north: "door" } });
    expect(at("5F", 1, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "3F", targetCoords: { x: 3, y: 0 } }, sides: { north: "door", west: "wall" } });
    expect(at("3F", 0, 3)).toMatchObject({ type: "teleport", content: { targetLevel: "5F", targetCoords: { x: 1, y: 1 } }, sides: { west: "door" } });
    // ... and the dropped warp is listed under `dropped` alone: neither its move out of the Big Chest screen nor its landing circle beside the lobby's locked flight
    expect(report.moves.filter((move) => move.what === "teleport" || move.what === "landing circle").map((move) => `${move.what} ${move.from.floor} (${move.from.row},${move.from.col})`)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(teleport 3F \(0,0\)|landing circle 1F \(0,0\))$/)])
    );
    expect(at("5F", 0, 2)).toMatchObject({ type: "pit", content: { targetLevel: "4F", targetCoords: { x: 1, y: 0 } }, sides: { west: "door", south: "wall" } });
    // The shop is added beside the lobby (no empty screen on 1F before a seal); the one empty screen on 4F is the save
    expect(at("1F", 2, 1)).toMatchObject({ type: "shop", sides: { north: "door" } });
    expect(report.placements.filter((entry) => entry.type === "shop")).toEqual([expect.objectContaining({ at: { floor: "1F", row: 2, col: 1 }, grown: true })]);
    expect(at("4F", 1, 0)?.type).toBe("save");
    expect(report.plainBigKeyDoors).toEqual([{ at: { floor: "2F", row: 0, col: 0 }, direction: "south" }]);
    expect(at("2F", 0, 0)?.sides?.south).toBe("door");
    expect(report.dropped.map((entry) => `${entry.what} ${entry.at.floor} (${entry.at.row},${entry.at.col})`)).toEqual(["puzzle B1 (0,0)", "puzzle B1 (1,1)", "teleport 3F (0,0)"]);
    expect(report.shifted).toEqual([]);
  });
});
