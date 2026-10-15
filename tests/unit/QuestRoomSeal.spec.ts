/**
 * A fight-sealed room (a lockOnEnter beast the hero has not beaten) has no way out but the fight: a small key, a bomb
 * or the Boss Key tried on its doors is refused and nothing is spent, so the hero cannot walk out of a guard room and
 * leave the save disagreeing with the room (an opened door recorded, the authored lock back after the win).
 */
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { SEALED_DOOR_LINE } from "@/lib/engine/core/dungeons/templeSystem/doors";
import { doorActions, resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { HERO, addHero, contextAt, dungeons, enter, makeTemple, temples } from "./templeFixtures";

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
// What the hero saved before the "reload"; a test sets it, none by default
let mockSaved: Record<string, unknown> | null = null;
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(mockSaved),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

beforeEach(() => {
  mockSaved = null;
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});

const GUARD: Room = { type: "monster", content: { lockOnEnter: true } };
const SEALED = { north: true, south: true, east: true, west: true };

/** Entrance, a guard room, a hall: the hero walks into the guard room at [0,1] and the beast seals it. */
const guardRoom = (guard: Room = GUARD, grid: string[][] = [["E", "M", "F"]], rooms: Record<string, Room> = {}) => {
  const id = makeTemple({ E: { type: "entrance" }, M: guard, F: { type: "empty" }, ...rooms }, grid);
  enter(id, [0, 0]);
  expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
  return id;
};

const keys = (id: string, count: number) => {
  for (let i = 0; i < count; i++) temples.addKey(id);
};

const openedDoors = (id: string) => Array.from(temples.getTempleState(id)?.openedDoors ?? []);

describe("a small key in a sealed room", () => {
  it("is refused on every side and not spent", () => {
    const id = guardRoom();
    keys(id, 2);

    for (const side of ["north", "south", "east", "west"] as const) {
      expect(temples.unlockDoor(id, [0, 1], side)).toBe(false);
    }

    expect(temples.getTempleState(id)?.playerKeys).toBe(2);
    expect(openedDoors(id)).toEqual([]);
    expect(dungeons.getRoom(id, [0, 1])!.locked).toEqual({ north: true, south: true, east: true, west: true });
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(false);
  });

  it("is refused by a bomb's door-opening too", () => {
    const id = guardRoom();

    expect(temples.openDoorSide(id, [0, 1], "east")).toBe(false);

    expect(dungeons.getRoom(id, [0, 1])!.locked!.east).toBe(true);
    expect(openedDoors(id)).toEqual([]);
  });

  it("leaves the save agreeing with the room once the fight is won", () => {
    const id = guardRoom({ type: "monster", locked: { east: true }, content: { lockOnEnter: true } });
    keys(id, 1);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false);

    temples.markRoomCleared(id, "1F", [0, 1]);

    // The authored lock is back and nothing says it was opened: the key still fits, once
    expect(temples.doorKind(id, [0, 1], "east")).toBe("locked");
    expect(openedDoors(id)).toEqual([]);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
    expect(openedDoors(id)).toEqual(["1F:0,1>east"]);
  });

  it("opens a plain locked door as it always did", () => {
    const id = makeTemple({ E: { type: "entrance", locked: { east: true } }, F: { type: "empty" } }, [["E", "F"]]);
    enter(id, [0, 0]);
    keys(id, 1);

    expect(temples.unlockDoor(id, [0, 0], "east")).toBe(true);
    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
  });
});

describe("a hero who slipped out of the fight (X's Invisibility)", () => {
  const LOCKED_GUARD: Room = { type: "monster", locked: { east: true }, content: { lockOnEnter: true } };

  it("opens an authored key lock of that room with a key: the seal is lifted, only the beast is left", async () => {
    const id = guardRoom(LOCKED_GUARD);
    keys(id, 1);
    temples.slipOut(id, "1F", [0, 1]);
    expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(false);

    const sheet = doorActions(contextAt(id, [0, 1]), "east");
    expect(sheet.actions.map((action) => action.label)).toEqual(["Unlock (-1 Key)"]);
    expect(await sheet.actions[0].run()).toEqual({ message: "Door unlocked!", sound: "useKey" });

    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
    expect(openedDoors(id)).toEqual(["1F:0,1>east"]);
  });

  it("lets a bomb's door-opening through, and bars the doors again when the hero walks back in", () => {
    const id = guardRoom(LOCKED_GUARD);
    temples.slipOut(id, "1F", [0, 1]);
    expect(temples.openDoorSide(id, [0, 1], "east")).toBe(true);

    temples.moveToPosition(id, [0, 2], "east");
    temples.moveToPosition(id, [0, 1], "west");

    expect(dungeons.getRoom(id, [0, 1])!.locked).toEqual(SEALED);
    keys(id, 1);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false);
  });
});

describe("a hero who reloads inside an unfinished fight", () => {
  it("is still barred: the seal is put back, so no key leaves the room", async () => {
    const id = makeTemple(
      { E: { type: "entrance" }, M: { type: "monster", locked: { east: true }, content: { lockOnEnter: true } }, F: { type: "empty" } },
      [["E", "M", "F"]]
    );
    mockSaved = {
      userId: HERO,
      templeId: id,
      currentLevel: "1F",
      currentPosition: [0, 1],
      hasMap: false,
      hasCompass: false,
      playerKeys: 1,
      visitedRooms: ["1F:0,0", "1F:0,1"],
      clearedRooms: [],
      hasMasterKey: false,
      openedDoors: [],
      openedChests: [],
      keyItems: [],
      timesCleared: 0,
      bloodMoons: 0,
      updatedAt: "2026-10-13T00:00:00.000Z",
    };

    temples.initTemple(id, [0, 0], undefined, HERO);
    await temples.whenProgressReady(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 1], playerKeys: 1 });
    expect(dungeons.getRoom(id, [0, 1])!.locked).toEqual(SEALED);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false);
    expect(temples.openDoorSide(id, [0, 1], "east")).toBe(false);
    expect(doorActions(contextAt(id, [0, 1]), "east").subHeader).toBe(SEALED_DOOR_LINE);
    expect(temples.getTempleState(id)?.playerKeys).toBe(1);

    temples.markRoomCleared(id, "1F", [0, 1]);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true); // the authored lock is back, and the key fits
  });
});

describe("the Boss Key in a sealed room", () => {
  const BOSS: Room = { type: "boss", content: { lockOnEnter: true } };

  it("does not open the boss door from inside a guard room", () => {
    const id = guardRoom(GUARD, [["E", "M", "B"]], { B: BOSS });
    temples.grantMasterKey(id);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false);
    expect(openedDoors(id)).toEqual([]);

    temples.markRoomCleared(id, "1F", [0, 1]);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
  });
});

describe("doorActions: tapping a door of a sealed room", () => {
  it("says the beast bars the door and offers no key, even with keys in hand", () => {
    const id = guardRoom();
    keys(id, 1);

    const sheet = doorActions(contextAt(id, [0, 1]), "east");

    expect(sheet.subHeader).toBe(SEALED_DOOR_LINE);
    expect(sheet.actions).toEqual([]);
    expect(temples.getTempleState(id)?.playerKeys).toBe(1);
  });

  it("says it for the boss door as well, whatever key the hero holds", () => {
    const id = guardRoom(GUARD, [["E", "M", "B"]], { B: { type: "boss", content: { lockOnEnter: true } } });
    temples.grantMasterKey(id);

    const sheet = doorActions(contextAt(id, [0, 1]), "east");

    expect(sheet.subHeader).toBe(SEALED_DOOR_LINE);
    expect(sheet.actions).toEqual([]);
  });

  it("explains a refused door with the same line", () => {
    const id = guardRoom();

    expect(temples.explainDoor(id, [0, 1], "east")).toBe(SEALED_DOOR_LINE);
  });

  it("offers the key again once the beast is beaten", async () => {
    const id = guardRoom({ type: "monster", locked: { east: true }, content: { lockOnEnter: true } });
    keys(id, 1);
    temples.markRoomCleared(id, "1F", [0, 1]);

    const sheet = doorActions(contextAt(id, [0, 1]), "east");

    expect(sheet.actions.map((action) => action.label)).toEqual(["Unlock (-1 Key)"]);
    expect(await sheet.actions[0].run()).toEqual({ message: "Door unlocked!", sound: "useKey" });
  });
});
