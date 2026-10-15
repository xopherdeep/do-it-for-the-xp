/**
 * Characterization of the pure run-state helpers TempleSystem delegates to (templeSystem/runState.ts):
 * what they return today, so the split keeps it.
 */
import { isReactive } from "vue";
import { clearedRoomKey, createTempleState, parseRoomKey } from "@/lib/engine/core/dungeons/templeSystem/runState";

describe("clearedRoomKey", () => {
  it("keys a room as level:row,col", () => {
    expect(clearedRoomKey("1F", [2, 3])).toBe("1F:2,3");
    expect(clearedRoomKey("B1:east", [0, 10])).toBe("B1:east:0,10");
  });
});

describe("parseRoomKey", () => {
  it("splits a room key back into its floor and position", () => {
    expect(parseRoomKey("1F:2,3")).toEqual({ level: "1F", position: [2, 3] });
    expect(parseRoomKey("tower:B1:0,10")).toEqual({ level: "tower:B1", position: [0, 10] });
    expect(parseRoomKey("1F:-1,3")).toEqual({ level: "1F", position: [-1, 3] });
    expect(parseRoomKey("1F:2,3,4")).toEqual({ level: "1F", position: [2, 3] });
  });

  it("reads nothing out of a malformed key", () => {
    expect(parseRoomKey(":1,2")).toBeNull();
    expect(parseRoomKey("1F")).toBeNull();
    expect(parseRoomKey("1F:2")).toBeNull();
    expect(parseRoomKey("1F:a,3")).toBeNull();
    expect(parseRoomKey("1F:2.5,3")).toBeNull();
  });
});

describe("createTempleState", () => {
  it("starts a run with nothing found, nothing beaten, the hero at the given spot", () => {
    const state = createTempleState([4, 5], "2F");
    expect(isReactive(state)).toBe(true);
    expect(state.currentPosition).toEqual([4, 5]);
    expect(state.currentLevel).toBe("2F");
    expect(state.hasMap).toBe(false);
    expect(state.hasCompass).toBe(false);
    expect(state.playerKeys).toBe(0);
    expect(state.hasMasterKey).toBe(false);
    expect(state.keyItems).toEqual([]);
    expect(state.timesCleared).toBe(0);
    expect(state.bloodMoons).toBe(0);
    for (const set of [state.visitedRooms, state.clearedRooms, state.openedDoors, state.openedChests, state.takenFromChests]) {
      expect(set).toBeInstanceOf(Set);
      expect(set?.size).toBe(0);
    }
    expect(state.bloodMoonAt).toBeUndefined();
    expect(state.bloodMoonEvery).toBeUndefined();
  });

  it("hands out a new run each time", () => {
    const a = createTempleState([0, 0], "1F");
    const b = createTempleState([0, 0], "1F");
    a.visitedRooms.add("1F:0,0");
    expect(b.visitedRooms.size).toBe(0);
  });
});
