/**
 * Characterization of the pure door helpers TempleSystem delegates to (templeSystem/doors.ts):
 * what they return today, so the split keeps it.
 */
import { DOOR_DIRECTIONS, doorKey, isBossDoor, sealKey } from "@/lib/engine/core/dungeons/templeSystem/doors";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { createPinia, setActivePinia } from "pinia";
import { addHero, dungeons, enter, nextTempleId, temples } from "./templeFixtures";

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

describe("cells drawn with one token keep doors of their own", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
  });

  const sealedSides = (id: string, position: [number, number]) =>
    DOOR_DIRECTIONS.filter((side) => dungeons.getRoom(id, position)?.locked?.[side]);

  it("seals the guard room the hero stepped into and leaves the other one open", () => {
    const id = nextTempleId();
    const guard: Room = { type: "monster", content: { lockOnEnter: true } };
    registerTemple(id, { maze: [["E", "G", "G"]], rooms: { E: { type: "entrance" }, G: guard }, entrance: [0, 0] });

    enter(id, [0, 0]);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);

    expect(temples.isRoomBarred(id, "1F", [0, 1])).toBe(true);
    expect(sealedSides(id, [0, 1])).toEqual(DOOR_DIRECTIONS);
    expect(sealedSides(id, [0, 2])).toEqual([]);
  });

  it("opens one key door and leaves the other, drawn with the same token, locked", () => {
    const id = nextTempleId();
    const keyed: Room = { type: "empty", locked: { east: true } };
    registerTemple(id, { maze: [["K", "E"], ["K", "E"]], rooms: { K: keyed, E: { type: "empty" } }, entrance: [0, 0] });

    enter(id, [0, 0]);
    temples.addKey(id);
    expect(temples.unlockDoor(id, [0, 0], "east")).toBe(true);

    expect(temples.doorKind(id, [0, 0], "east")).toBe("open");
    expect(temples.doorKind(id, [1, 0], "east")).toBe("locked");
  });
});
