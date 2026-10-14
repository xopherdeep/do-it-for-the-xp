/**
 * The engine plays one Room per cell: a layout may draw many cells with one token (the creator's palette does),
 * but the doors a hero opens, the seals of a fight and the chest ids written into a room belong to that cell alone.
 * A token only one cell draws is its own already and stays.
 */
import { roomsPerCell } from "@/lib/engine/core/dungeons/cellRooms";
import type { Room } from "@/lib/engine/core/dungeons/types";

const wall: Room = { type: "wall" };
const gap: Room = { type: "void" };
const fight: Room = { type: "monster", content: { lockOnEnter: true, difficulty: "hard" }, locked: { east: true } };
const hall: Room = { type: "empty" };

const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("roomsPerCell on one floor", () => {
  const maze = [
    ["_", "E", "F"],
    ["_", "F", "."],
  ];
  const rooms = { _: wall, ".": gap, E: { type: "entrance" } as Room, F: fight };

  it("gives the cells that share a token one each, the engine's own floor:row,col", () => {
    const result = roomsPerCell(maze, rooms);

    expect(result.maze).toEqual([
      ["_", "E", "1F:0,2"],
      ["_", "1F:1,1", "."],
    ]);
  });

  it("leaves a token only one cell draws as it is", () => {
    const { maze: perCell, rooms: perCellRooms } = roomsPerCell(maze, rooms);

    expect(perCell[0][1]).toBe("E");
    expect(perCellRooms.E).toEqual({ type: "entrance" });
  });

  it("copies the room under each new token, so two cells drawn with one token never share a Room", () => {
    const { rooms: perCell } = roomsPerCell(maze, rooms);

    expect(perCell["1F:0,2"]).toEqual(fight);
    expect(perCell["1F:1,1"]).toEqual(fight);
    expect(perCell["1F:0,2"]).not.toBe(perCell["1F:1,1"]);
    expect(perCell["1F:0,2"]).not.toBe(fight);
    expect(perCell["1F:0,2"].content).not.toBe(perCell["1F:1,1"].content);
    expect(perCell["1F:0,2"].locked).not.toBe(perCell["1F:1,1"].locked);

    perCell["1F:0,2"].locked!.east = false;
    perCell["1F:0,2"].content!.lockOnEnter = false;
    expect(perCell["1F:1,1"].locked).toEqual({ east: true });
    expect(perCell["1F:1,1"].content!.lockOnEnter).toBe(true);
  });

  it("leaves the wall and the void as they are drawn", () => {
    const { maze: perCell, rooms: perCellRooms } = roomsPerCell(maze, rooms);

    expect(perCell[0][0]).toBe("_");
    expect(perCell[1][0]).toBe("_");
    expect(perCell[1][2]).toBe(".");
    expect(perCellRooms._).toBe(wall);
    expect(perCellRooms["."]).toBe(gap);
  });

  it("drops the shared token once no cell draws it", () => {
    const { rooms: perCell } = roomsPerCell(maze, rooms);

    expect(perCell.F).toBeUndefined();
    expect(Object.keys(perCell).sort()).toEqual([".", "1F:0,2", "1F:1,1", "E", "_"]);
  });

  it("leaves the layout it was given as it was", () => {
    const mazeBefore = snapshot(maze);
    const roomsBefore = snapshot(rooms);

    roomsPerCell(maze, rooms);

    expect(maze).toEqual(mazeBefore);
    expect(rooms).toEqual(roomsBefore);
  });

  it("keeps a token that names no room, an empty cell and a room no cell draws", () => {
    const odd = roomsPerCell([["E", "", "ghost"]], { E: hall, spare: fight });

    expect(odd.maze).toEqual([["E", "", "ghost"]]);
    expect(odd.rooms.spare).toBe(fight);
  });

  it("is a layout it can be given again: the second pass changes nothing", () => {
    const once = roomsPerCell(maze, rooms);
    const twice = roomsPerCell(once.maze, once.rooms);

    expect(twice.maze).toEqual(once.maze);
    expect(twice.rooms).toEqual(once.rooms);
  });
});

describe("roomsPerCell on a tower", () => {
  const tower = {
    "1F": [["E", "S", "U"]],
    "2F": [["S", "D", "U"]],
  };
  const rooms = { E: hall, S: { type: "shop" } as Room, U: { type: "stairs_up" } as Room, D: { type: "stairs_down" } as Room };

  it("names the floor in the token, so one token drawn on two floors is two rooms", () => {
    const result = roomsPerCell(tower, rooms);

    expect(result.maze).toEqual({
      "1F": [["E", "1F:0,1", "1F:0,2"]],
      "2F": [["2F:0,0", "D", "2F:0,2"]],
    });
    expect(result.rooms["1F:0,1"]).toEqual(rooms.S);
    expect(result.rooms["2F:0,0"]).toEqual(rooms.S);
    expect(result.rooms["1F:0,1"]).not.toBe(result.rooms["2F:0,0"]);
    expect(result.rooms["1F:0,2"]).not.toBe(result.rooms["2F:0,2"]);
  });

  it("keeps the floors in the order the layout lists them", () => {
    const upsideDown = roomsPerCell({ B1: [["E", "E"]], "1F": [["E"]] }, rooms);

    expect(Object.keys(upsideDown.maze)).toEqual(["B1", "1F"]);
  });
});
