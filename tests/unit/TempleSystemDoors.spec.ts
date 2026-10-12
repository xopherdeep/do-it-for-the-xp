/**
 * Characterization of the pure door helpers TempleSystem delegates to (templeSystem/doors.ts):
 * what they return today, so the split keeps it.
 */
import { DOOR_DIRECTIONS, doorKey, isBossDoor, sealKey } from "@/lib/engine/core/dungeons/templeSystem/doors";

describe("DOOR_DIRECTIONS", () => {
  it("lists every side of a room", () => {
    expect(DOOR_DIRECTIONS).toEqual(["north", "south", "east", "west"]);
  });
});

describe("sealKey", () => {
  it("keys a sealed room as temple|level:row,col", () => {
    expect(sealKey("temple-1", "1F", [0, 1])).toBe("temple-1|1F:0,1");
    expect(sealKey("t", "B2", [10, 3])).toBe("t|B2:10,3");
  });
});

describe("doorKey", () => {
  it("keys an opened door as level:row,col>direction of the room the hero stood in", () => {
    expect(doorKey("2F", [3, 4], "east")).toBe("2F:3,4>east");
    expect(doorKey("1F", [0, 0], "north")).toBe("1F:0,0>north");
  });
});

describe("isBossDoor", () => {
  it("is a boss door into a boss room however the type is spelled", () => {
    expect(isBossDoor({ type: "boss" })).toBe(true);
    expect(isBossDoor({ type: " Boss " })).toBe(true);
  });

  it("is no boss door into any other room, or none at all", () => {
    expect(isBossDoor({ type: "monster" })).toBe(false);
    expect(isBossDoor({ type: "wall" })).toBe(false);
    expect(isBossDoor(undefined)).toBe(false);
  });
});
