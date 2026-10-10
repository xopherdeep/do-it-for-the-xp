/**
 * The boss door (R6 of docs/Temple-Generation-Contract.md): the door into a boss room that carries
 * `locked.master` refuses small keys, bombs and riddles, and opens only for a hero holding the master key,
 * which is not spent. The temple screen reads the door through doorKind (walls) and doorActions (the dialog).
 */
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { BOSS_DOOR_LINE } from "@/lib/engine/core/dungeons/TempleSystem";
import { doorActions, resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { addHero, contextAt, dungeons, enter, makeTemple, temples } from "./templeFixtures";

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
  resetVisitMemory();
  addHero();
});

const BOSS: Room = { type: "boss", locked: { master: true }, content: { lockOnEnter: true } };
const HALL: Room = { type: "empty" };

/**
 * One row: the entrance, the room in front of the boss door, the boss room, with a locked side room above
 * the approach. The generator bars the approach's side toward the boss (`barred`); an authored temple may
 * only flag the boss room.
 */
const bossTemple = (barred = true) => {
  const id = makeTemple(
    {
      E: { type: "entrance" },
      A: { type: "empty", locked: { east: barred, north: true } },
      B: BOSS,
      S: HALL,
      W: { type: "wall" },
    },
    [
      ["W", "S", "W"],
      ["E", "A", "B"],
    ]
  );
  enter(id, [1, 1]);
  return id;
};

const keys = (id: string, count: number) => {
  for (let i = 0; i < count; i++) temples.addKey(id);
};

describe("TempleSystem.doorKind", () => {
  it("reads the boss door as master, a key door as locked and the rest as open", () => {
    const id = bossTemple();

    expect(temples.doorKind(id, [1, 1], "east")).toBe("master");
    expect(temples.doorKind(id, [1, 1], "north")).toBe("locked");
    expect(temples.doorKind(id, [1, 1], "west")).toBe("open");
    expect(temples.doorKind(id, [1, 1], "south")).toBe("open"); // the edge of the floor is no door
  });

  it("knows the boss door by the flag on the boss room alone, bar or no bar in front of it", () => {
    const id = bossTemple(false);

    expect(temples.doorKind(id, [1, 1], "east")).toBe("master");
    expect(temples.moveToPosition(id, [1, 2], "east")).toBe(false);
  });

  it("is master when the room in front carries the flag toward a boss room", () => {
    const id = makeTemple({ E: { type: "entrance" }, A: { type: "empty", locked: { master: true } }, B: { type: "boss" } }, [["E", "A", "B"]]);
    enter(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
    expect(temples.doorKind(id, [0, 1], "west")).toBe("open");
  });

  it("is not master between two ordinary rooms with a master flag lying around", () => {
    const id = makeTemple({ E: { type: "entrance" }, A: { type: "empty", locked: { master: true, east: true } }, X: HALL }, [["E", "A", "X"]]);
    enter(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("locked");
  });
});

describe("the boss door and small keys", () => {
  it("refuses a small key and keeps it, and says why", () => {
    const id = bossTemple();
    keys(id, 2);

    expect(temples.unlockDoor(id, [1, 1], "east")).toBe(false);
    expect(temples.getTempleState(id)?.playerKeys).toBe(2);
    expect(temples.explainDoor(id, [1, 1], "east")).toBe(BOSS_DOOR_LINE);
    expect(temples.moveToPosition(id, [1, 2], "east")).toBe(false);
    expect(temples.doorKind(id, [1, 1], "east")).toBe("master");
  });

  it("still spends a small key on a small lock", () => {
    const id = bossTemple();
    keys(id, 1);

    expect(temples.unlockDoor(id, [1, 1], "north")).toBe(true);
    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
    expect(temples.doorKind(id, [1, 1], "north")).toBe("open");
    expect([...temples.getTempleState(id)!.openedDoors!]).toEqual(["1F:1,1>north"]);
    expect(temples.moveToPosition(id, [0, 1], "north")).toBe(true);
  });

  it("explains a small lock only when the hero has no key", () => {
    const id = bossTemple();
    expect(temples.explainDoor(id, [1, 1], "north")).toBe("You need a key to unlock this door!");
    keys(id, 1);
    expect(temples.explainDoor(id, [1, 1], "north")).toBeNull();
    expect(temples.explainDoor(id, [1, 1], "west")).toBeNull();
  });

  it("does not open for a bomb or a riddle", () => {
    const id = bossTemple();

    expect(temples.openDoorSide(id, [1, 1], "east")).toBe(false);
    expect(temples.openDoorsAround(id, [1, 1])).toBe(1); // the small lock to the north only
    expect(temples.doorKind(id, [1, 1], "east")).toBe("master");
    expect(temples.moveToPosition(id, [1, 2], "east")).toBe(false);
  });
});

describe("the boss door and the master key", () => {
  it("opens for the master key without spending it, and the way stays open", () => {
    const id = bossTemple();
    keys(id, 1);
    temples.grantMasterKey(id);

    expect(temples.explainDoor(id, [1, 1], "east")).toBeNull();
    expect(temples.unlockDoor(id, [1, 1], "east")).toBe(true);
    expect(temples.hasMasterKey(id)).toBe(true);
    expect(temples.getTempleState(id)?.playerKeys).toBe(1);
    expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
    expect(dungeons.getRoom(id, [1, 1])?.locked?.east).toBe(false);
    expect([...temples.getTempleState(id)!.openedDoors!]).toEqual(["1F:1,1>east"]);

    // The hero walks in; the boss room seals for the fight as any lockOnEnter room does
    expect(temples.moveToPosition(id, [1, 2], "east")).toBe(true);
    expect(dungeons.getRoom(id, [1, 2])?.locked).toMatchObject({ north: true, south: true, east: true, west: true, master: true });
    temples.markRoomCleared(id, "1F", [1, 2]);
    expect(dungeons.getRoom(id, [1, 2])?.locked).toMatchObject({ north: false, south: false, east: false, west: false, master: true });
    expect(temples.moveToPosition(id, [1, 1], "west")).toBe(true);
    expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
  });

  it("opens an authored boss door that has no bar in front of it", () => {
    const id = bossTemple(false);
    temples.grantMasterKey(id);

    expect(temples.unlockDoor(id, [1, 1], "east")).toBe(true);
    expect(temples.moveToPosition(id, [1, 2], "east")).toBe(true);
  });

  it("is not a door the master key opens twice", () => {
    const id = bossTemple();
    temples.grantMasterKey(id);
    expect(temples.unlockDoor(id, [1, 1], "east")).toBe(true);
    expect(temples.unlockDoor(id, [1, 1], "east")).toBe(false);
  });
});

describe("doorActions: tapping a door", () => {
  it("says the boss door line and offers nothing without the master key", () => {
    const id = bossTemple();
    keys(id, 3);

    const sheet = doorActions(contextAt(id, [1, 1]), "east");

    expect(sheet.header).toBe("The Boss Door");
    expect(sheet.subHeader).toBe(BOSS_DOOR_LINE);
    expect(sheet.actions).toEqual([]);
  });

  it("opens the boss door with the master key", async () => {
    const id = bossTemple();
    temples.grantMasterKey(id);

    const sheet = doorActions(contextAt(id, [1, 1]), "east");
    expect(sheet.actions.map((action) => action.label)).toEqual(["Open the door"]);

    const outcome = await sheet.actions[0].run();
    expect(outcome).toEqual({ message: "The big lock falls away.", sound: "useKey" });
    expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
    expect(temples.hasMasterKey(id)).toBe(true);
  });

  it("asks for a small key at a small lock, and for one the hero has", async () => {
    const id = bossTemple();

    expect(doorActions(contextAt(id, [1, 1]), "north")).toEqual({ header: "Locked Door", subHeader: "You need a key to unlock this door!", actions: [] });

    keys(id, 1);
    const sheet = doorActions(contextAt(id, [1, 1]), "north");
    expect(sheet.actions.map((action) => action.label)).toEqual(["Unlock (-1 Key)"]);
    expect(await sheet.actions[0].run()).toEqual({ message: "Door unlocked!", sound: "useKey" });
    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
  });

  it("has nothing to say about an open way", () => {
    const id = bossTemple();
    expect(doorActions(contextAt(id, [1, 1]), "west")).toEqual({ header: "The way is open.", actions: [] });
  });
});
