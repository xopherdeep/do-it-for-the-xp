/**
 * Characterization of the pure floor helper TempleSystem delegates to (templeSystem/floors.ts):
 * what it returns today, so the split keeps it.
 */
import { floorsOf } from "@/lib/engine/core/dungeons/templeSystem/floors";
import type { Dungeon } from "@/lib/engine/core/dungeons/types";

const dungeon = (maze: Dungeon["maze"]): Dungeon => ({
  id: "floors",
  name: "floors",
  maze,
  rooms: {},
  visitedPositions: new Set<string>(),
});

describe("floorsOf", () => {
  it("calls a single grid 1F", () => {
    expect(floorsOf(dungeon([["E", "A"], ["B", "C"]]))).toEqual(["1F"]);
    expect(floorsOf(dungeon([]))).toEqual(["1F"]);
  });

  it("lists a tower's floors in the order the layout gives them", () => {
    expect(floorsOf(dungeon({ B1: [["E"]], "1F": [["A"]], "2F": [["B"]] }))).toEqual(["B1", "1F", "2F"]);
  });

  it("puts integer-like floor names first, the way object keys order", () => {
    expect(floorsOf(dungeon({ B1: [["E"]], "2": [["A"]], "1": [["B"]] }))).toEqual(["1", "2", "B1"]);
  });

  it("has no floors for a tower without any", () => {
    expect(floorsOf(dungeon({}))).toEqual([]);
  });
});
