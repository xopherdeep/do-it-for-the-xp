/**
 * Characterization of the floor helpers TempleSystem delegates to (templeSystem/floors.ts):
 * what they return today, so the split keeps it. Where the hero may stand: a wall and a void are not floor
 * (the solver agrees: templeGraph IMPASSABLE), a pit is (it drops the hero).
 */
import { canStandAt, floorsOf, isImpassable } from "@/lib/engine/core/dungeons/templeSystem/floors";
import type { TempleRuns } from "@/lib/engine/core/dungeons/templeSystem/runState";
import type { Dungeon } from "@/lib/engine/core/dungeons/types";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useTemple } from "@/hooks/temples/useTemple";
import { HERO, addHero, dungeons, enter, makeTemple, temples } from "./templeFixtures";

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  addHero();
});

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

describe("isImpassable", () => {
  it("is true for a wall and a void, however the room is written", () => {
    expect(isImpassable({ type: "wall" })).toBe(true);
    expect(isImpassable({ type: "void" })).toBe(true);
  });

  it("is false for every room a hero can be in, a pit included, and for no room at all", () => {
    for (const type of ["empty", "entrance", "pit", "monster", "boss", "stairs-up", "teleport", "secret"]) {
      expect(isImpassable({ type })).toBe(false);
    }
    expect(isImpassable(undefined)).toBe(false);
  });
});

describe("where the hero can stand", () => {
  // Entrance, a void record, floor, a pit, floor, a wall: the shape a Temple Creator void moat has
  const moat = () =>
    makeTemple(
      { E: { type: "entrance" }, V: { type: "void" }, G: { type: "empty" }, P: { type: "pit" }, W: { type: "wall" } },
      [["E", "V", "G", "P", "G", "W"]]
    );

  it("canStandAt refuses a void record and a wall, and allows a pit", () => {
    const id = moat();
    const runs = { dungeonManager: dungeons } as unknown as TempleRuns;

    expect(canStandAt(runs, id, "1F", [0, 0])).toBe(true);
    expect(canStandAt(runs, id, "1F", [0, 1])).toBe(false); // void
    expect(canStandAt(runs, id, "1F", [0, 2])).toBe(true);
    expect(canStandAt(runs, id, "1F", [0, 3])).toBe(true); // pit: it drops the hero
    expect(canStandAt(runs, id, "1F", [0, 5])).toBe(false); // wall
    expect(canStandAt(runs, id, "1F", [0, 9])).toBe(false); // off the map
    expect(canStandAt(runs, id, "2F", [0, 0])).toBe(false); // no such floor
  });

  it("a step onto a void is refused, so the void is no free bridge", () => {
    const id = moat();
    enter(id, [0, 0]);

    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(false);

    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
    expect(temples.hasVisited(id, [0, 1])).toBe(false);
  });

  it("stairs, a fall or a teleport cannot land on a void either, but can land on a pit", () => {
    const id = moat();
    enter(id, [0, 0]);

    expect(temples.changeLevel(id, "1F", [0, 1])).toBe(false);
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
    expect(temples.changeLevel(id, "1F", [0, 3])).toBe(true);
  });

  it("a step onto a pit is allowed: the pit drops the hero", () => {
    const id = moat();
    enter(id, [0, 2]);

    expect(temples.moveToPosition(id, [0, 3], "east")).toBe(true);
  });
});

describe("the arrows of the temple screen", () => {
  /** The temple screen's hook, mounted for the hero standing at `at` */
  const screen = (id: string, at: [number, number]) => {
    const wrapper = mount(defineComponent({ setup: () => useTemple(id, at, undefined, HERO), render: () => null }));
    return { vm: wrapper.vm as any, unmount: () => wrapper.unmount() };
  };

  /** Entrance, a void, floor, a pit, a wall, in a temple of its own with the hero at `at` */
  const moatScreen = (at: [number, number]) => {
    const id = makeTemple(
      { E: { type: "entrance" }, V: { type: "void" }, G: { type: "empty" }, P: { type: "pit" }, W: { type: "wall" } },
      [["E", "V", "G", "P", "W"]]
    );
    enter(id, at);
    return screen(id, at);
  };

  it("stay dark over a void", () => {
    const atEntrance = moatScreen([0, 0]);
    expect(atEntrance.vm.canMoveRight).toBe(false);
    atEntrance.unmount();

    const onFloor = moatScreen([0, 2]);
    expect(onFloor.vm.canMoveLeft).toBe(false);
    onFloor.unmount();
  });

  it("light over a pit, and stay dark over a wall", () => {
    const onFloor = moatScreen([0, 2]);
    expect(onFloor.vm.canMoveRight).toBe(true);
    onFloor.unmount();

    const atPit = moatScreen([0, 3]);
    expect(atPit.vm.canMoveLeft).toBe(true);
    expect(atPit.vm.canMoveRight).toBe(false);
    atPit.unmount();
  });
});
