/**
 * However the hero reaches a room (a step, stairs, a fall down a pit, a teleport circle) the same arrival rule applies:
 * a lockOnEnter room whose beast is not beaten seals on the way in, and a beaten one lets the hero through
 * (docs/Quest-Rooms-Spec.md 7.2). The Hook Shot lands through the step, so it seals too (tests/unit/ItemUse.spec.ts).
 */
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { addHero, dungeons, enter, makeTemple, temples } from "./templeFixtures";

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

const GUARD: Room = { type: "monster", content: { lockOnEnter: true } };
const SEALED = { north: true, south: true, east: true, west: true };

/** A two-floor tower: the entrance and a pit on 1F, a guard room and a hall on 2F. The hero starts on the entrance. */
const tower = (guard: Room = GUARD) => {
  const id = makeTemple(
    { E: { type: "entrance" }, P: { type: "pit" }, M: guard, F: { type: "empty" }, W: { type: "wall" } },
    { "1F": [["E", "P", "W"]], "2F": [["M", "F", "W"]] }
  );
  enter(id, [0, 0], "1F");
  return id;
};

describe("changeLevel", () => {
  it("seals a guard room the hero lands in, the way a step into it does", () => {
    const id = tower();

    expect(temples.changeLevel(id, "2F", [0, 0])).toBe(true);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 0] });
    expect(dungeons.getRoom(id, [0, 0], "2F")!.locked).toEqual(SEALED);
    expect(temples.hasVisited(id, [0, 0])).toBe(true);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(false); // no walking out of the fight
  });

  it("puts the authored doors back when the fight is won", () => {
    const id = tower({ type: "monster", locked: { east: true }, content: { lockOnEnter: true } });
    temples.changeLevel(id, "2F", [0, 0]);

    temples.markRoomCleared(id, "2F", [0, 0]);

    expect(dungeons.getRoom(id, [0, 0], "2F")!.locked).toMatchObject({ north: false, south: false, east: true, west: false });
    expect(temples.doorKind(id, [0, 0], "south", "2F")).toBe("open");
  });

  it("lets the hero land in a room whose beast is beaten, and walk on", () => {
    const id = tower();
    temples.markRoomCleared(id, "2F", [0, 0]);

    expect(temples.changeLevel(id, "2F", [0, 0])).toBe(true);

    expect(dungeons.getRoom(id, [0, 0], "2F")!.locked).toBeUndefined();
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
  });

  it("leaves a plain room as it was", () => {
    const id = tower();

    expect(temples.changeLevel(id, "2F", [0, 1])).toBe(true);

    expect(dungeons.getRoom(id, [0, 1], "2F")!.locked).toBeUndefined();
  });

  it("changes nothing when the hero cannot stand there", () => {
    const id = tower();

    expect(temples.changeLevel(id, "2F", [0, 2])).toBe(false); // a wall

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    expect(dungeons.getRoom(id, [0, 0], "2F")!.locked).toBeUndefined();
  });
});

describe("a step", () => {
  it("still seals a guard room the hero walks into", () => {
    const id = makeTemple({ E: { type: "entrance" }, M: GUARD }, [["E", "M"]]);
    enter(id, [0, 0]);

    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);

    expect(dungeons.getRoom(id, [0, 1])!.locked).toEqual(SEALED);
  });
});

describe("handleTeleport", () => {
  it("seals a circle that holds a beast when the hero is carried there", () => {
    const id = makeTemple(
      { T: { type: "teleport" }, F: { type: "empty" }, G: { type: "teleport", content: { lockOnEnter: true } } },
      [["T", "F", "G"]]
    );
    enter(id, [0, 0]);

    expect(temples.handleTeleport(id)).toEqual([0, 2]);

    expect(dungeons.getRoom(id, [0, 2])!.locked).toEqual(SEALED);
  });
});
