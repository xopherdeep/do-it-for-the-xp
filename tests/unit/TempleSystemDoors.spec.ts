/**
 * Characterization of the pure door helpers TempleSystem delegates to (templeSystem/doors.ts):
 * what they return today, so the split keeps it.
 */
import { BOSS_DOOR_LINE, DOOR_DIRECTIONS, doorKey, isBossDoor, sealKey } from "@/lib/engine/core/dungeons/templeSystem/doors";
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

describe("walls and bombable sides the Game Master drew", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
  });

  /** Entrance, A and B in a row; the rooms given replace the plain ones. The hero stands in A unless told otherwise. */
  const drawn = (rooms: Record<string, Room>, at: [number, number] = [0, 1]): string => {
    const id = nextTempleId();
    registerTemple(id, { maze: [["E", "A", "B"]], rooms: { E: { type: "entrance" }, A: { type: "empty" }, B: { type: "empty" }, ...rooms }, entrance: [0, 0] });
    enter(id, at);
    return id;
  };

  /** A draws a wall on its west and a cracked wall on its east; the sides it does not name are plain doors */
  const walled = (at?: [number, number]): string =>
    drawn({ A: { type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "wall" } } }, at);

  it("reads each side as the room that draws it, from both ends of the way", () => {
    const id = walled();

    expect(temples.doorKind(id, [0, 1], "west")).toBe("wall");
    expect(temples.doorKind(id, [0, 0], "east")).toBe("wall"); // the entrance draws nothing, the wall is still a wall
    expect(temples.doorKind(id, [0, 1], "east")).toBe("bombable");
    expect(temples.doorKind(id, [0, 2], "west")).toBe("bombable");
  });

  it("makes a wall of a way one end draws as a wall and the other as a cracked wall", () => {
    const id = drawn({
      A: { type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "door" } },
      B: { type: "empty", sides: { north: "door", east: "door", south: "door", west: "wall" } },
    });

    expect(temples.doorKind(id, [0, 1], "east")).toBe("wall");
    expect(temples.doorKind(id, [0, 2], "west")).toBe("wall");
  });

  it("stays a wall into a boss room: only a door is the Boss door", () => {
    const id = drawn({ A: { type: "empty", sides: { north: "door", east: "wall", south: "door", west: "door" } }, B: { type: "boss" } });

    expect(temples.doorKind(id, [0, 1], "east")).toBe("wall");
    expect(temples.explainDoor(id, [0, 1], "east")).toBe("Solid rock.");
  });

  it("refuses the step through either, from either room", () => {
    const id = walled();

    expect(temples.moveToPosition(id, [0, 0], "west")).toBe(false);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(false);
    expect(temples.getTempleState(id)?.currentPosition).toEqual([0, 1]);

    const fromBeyond = walled([0, 2]);
    expect(temples.moveToPosition(fromBeyond, [0, 1], "west")).toBe(false);
    expect(temples.getTempleState(fromBeyond)?.currentPosition).toEqual([0, 2]);

    const fromEntrance = walled([0, 0]);
    expect(temples.moveToPosition(fromEntrance, [0, 1], "east")).toBe(false); // A's west wall, seen from the entrance
    expect(temples.getTempleState(fromEntrance)?.currentPosition).toEqual([0, 0]);
  });

  it("is opened by no key, no Boss Key and no riddle, and a quest win leaves both as they are", () => {
    const id = walled();
    temples.addKey(id);
    temples.addKey(id);
    temples.grantMasterKey(id);

    for (const side of ["west", "east"] as const) {
      expect(temples.unlockDoor(id, [0, 1], side)).toBe(false);
      expect(temples.openDoorSide(id, [0, 1], side)).toBe(false);
    }
    expect(temples.openDoorsAround(id, [0, 1])).toBe(0);

    expect(temples.getTempleState(id)?.playerKeys).toBe(2);
    expect(temples.doorKind(id, [0, 1], "west")).toBe("wall");
    expect(temples.doorKind(id, [0, 1], "east")).toBe("bombable");
    expect(temples.getTempleState(id)?.openedDoors?.size).toBe(0);
  });

  it("says what stands there in the temple's voice", () => {
    const id = walled();

    expect(temples.explainDoor(id, [0, 1], "west")).toBe("Solid rock.");
    expect(temples.explainDoor(id, [0, 1], "east")).toBe("The wall is cracked. Bombs might do it.");
  });

  it("blows a cracked wall open from both rooms and remembers both ends", () => {
    const id = walled();

    expect(temples.blowBombableSide(id, [0, 1], "east")).toBe(true);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
    expect(temples.doorKind(id, [0, 2], "west")).toBe("open");
    expect(temples.explainDoor(id, [0, 1], "east")).toBeNull();
    expect([...(temples.getTempleState(id)?.openedDoors ?? [])].sort()).toEqual(["1F:0,1>east", "1F:0,2>west"]);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
    expect(temples.moveToPosition(id, [0, 1], "west")).toBe(true);
    // The other wall of the room is still a wall
    expect(temples.doorKind(id, [0, 1], "west")).toBe("wall");
  });

  it("blows the wall open from the room beyond just the same", () => {
    const id = walled([0, 2]);

    expect(temples.blowBombableSide(id, [0, 2], "west")).toBe(true);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
    expect(temples.doorKind(id, [0, 2], "west")).toBe("open");
  });

  it("blows nothing but a cracked wall: not a wall, a plain door, a small lock or the Boss door", () => {
    const withWall = drawn({ A: { type: "empty", sides: { north: "door", east: "door", south: "door", west: "wall" } }, B: { type: "boss" } });
    expect(temples.blowBombableSide(withWall, [0, 1], "west")).toBe(false); // a wall
    expect(temples.blowBombableSide(withWall, [0, 0], "east")).toBe(false); // the same wall from the entrance
    expect(temples.doorKind(withWall, [0, 1], "east")).toBe("master");
    expect(temples.blowBombableSide(withWall, [0, 1], "east")).toBe(false); // the Boss door

    const plain = drawn({});
    expect(temples.blowBombableSide(plain, [0, 1], "east")).toBe(false);

    const keyed = drawn({ A: { type: "empty", locked: { east: true } } });
    expect(temples.doorKind(keyed, [0, 1], "east")).toBe("locked");
    expect(temples.blowBombableSide(keyed, [0, 1], "east")).toBe(false);
    expect(temples.doorKind(keyed, [0, 1], "east")).toBe("locked");

    for (const id of [withWall, plain, keyed]) expect(temples.getTempleState(id)?.openedDoors?.size).toBe(0);
  });

  it("blows nothing where no room lies beyond a cracked wall", () => {
    // The cracked side is the floor's edge (north of A); a missing token is no room either
    const id = drawn({ A: { type: "empty", sides: { north: "bombable", east: "door", south: "door", west: "door" } } });

    expect(temples.blowBombableSide(id, [0, 1], "north")).toBe(false);
    expect(temples.getTempleState(id)?.openedDoors?.size).toBe(0);
  });

  it("finds a cracked wall blown open in an earlier session open from the saved record alone, the layout being cracked again", () => {
    const id = walled();
    // What a reload does: the layout registers cracked, and the hero's saved opened doors are put back (heroRuns)
    temples.getTempleState(id)!.openedDoors = new Set(["1F:0,1>east", "1F:0,2>west"]);

    expect(dungeons.getRoom(id, [0, 1])?.barriers).toEqual({ east: "bombable", west: "wall" });
    expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
    expect(temples.doorKind(id, [0, 2], "west")).toBe("open");
    expect(temples.doorKind(id, [0, 1], "west")).toBe("wall"); // a wall no record opens
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  });

  it("blows open one cracked wall and leaves the other, drawn with the same token, cracked", () => {
    const id = nextTempleId();
    const cracked: Room = { type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "door" } };
    registerTemple(id, { maze: [["K", "F"], ["K", "F"]], rooms: { K: cracked, F: { type: "empty" } }, entrance: [0, 0] });

    enter(id, [0, 0]);
    expect(temples.blowBombableSide(id, [0, 0], "east")).toBe(true);

    expect(temples.doorKind(id, [0, 0], "east")).toBe("open");
    expect(temples.doorKind(id, [1, 0], "east")).toBe("bombable");
    expect(temples.doorKind(id, [1, 1], "west")).toBe("bombable");
  });

  describe("a cracked wall into a boss room", () => {
    /** A draws a cracked wall on its east, toward the boss room B; the hero stands in A */
    const crackedIntoBoss = (): string =>
      drawn({ A: { type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "door" } }, B: { type: "boss" } });

    it("is still the Boss door once a Bomb has blown it: the blast opens the wall, not the lock", () => {
      const id = crackedIntoBoss();
      expect(temples.doorKind(id, [0, 1], "east")).toBe("bombable");

      expect(temples.blowBombableSide(id, [0, 1], "east")).toBe(true);

      expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
      expect(temples.explainDoor(id, [0, 1], "east")).toBe(BOSS_DOOR_LINE);
      expect(temples.moveToPosition(id, [0, 2], "east")).toBe(false);
      // The wall itself is open from both rooms: the way back out of the boss room is a plain way
      expect(temples.doorKind(id, [0, 2], "west")).toBe("open");
    });

    it("takes no small key, and the Boss Key is not spent opening it", () => {
      const id = crackedIntoBoss();
      temples.blowBombableSide(id, [0, 1], "east");
      temples.addKey(id);

      expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false);
      expect(temples.openDoorSide(id, [0, 1], "east")).toBe(false);
      expect(temples.getTempleState(id)?.playerKeys).toBe(1);

      temples.grantMasterKey(id);
      expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
      expect(temples.getTempleState(id)?.hasMasterKey).toBe(true);
      expect(temples.getTempleState(id)?.playerKeys).toBe(1);
      expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
      expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
    });

    it("stays the Boss door through a reload, and stays open once the Boss Key opened it", () => {
      const id = crackedIntoBoss();
      temples.blowBombableSide(id, [0, 1], "east");
      // What a reload does: the layout registers cracked again and the hero's saved opened doors are put back
      const blown = [...(temples.getTempleState(id)?.openedDoors ?? [])];
      expect(blown.sort()).toEqual(["1F:0,1>east", "1F:0,2>west"]);
      temples.getTempleState(id)!.openedDoors = new Set(blown);
      expect(temples.doorKind(id, [0, 1], "east")).toBe("master");

      temples.grantMasterKey(id);
      temples.unlockDoor(id, [0, 1], "east");
      temples.getTempleState(id)!.openedDoors = new Set([...(temples.getTempleState(id)?.openedDoors ?? [])]);
      expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
    });

    it("leaves a cracked wall into any other room, and a plain Boss door, as they were", () => {
      const plain = drawn({ A: { type: "empty", sides: { north: "door", east: "bombable", south: "door", west: "door" } } });
      expect(temples.blowBombableSide(plain, [0, 1], "east")).toBe(true);
      expect(temples.doorKind(plain, [0, 1], "east")).toBe("open");
      expect([...(temples.getTempleState(plain)?.openedDoors ?? [])].sort()).toEqual(["1F:0,1>east", "1F:0,2>west"]);

      const bossDoor = drawn({ B: { type: "boss" } });
      temples.grantMasterKey(bossDoor);
      expect(temples.unlockDoor(bossDoor, [0, 1], "east")).toBe(true);
      expect([...(temples.getTempleState(bossDoor)?.openedDoors ?? [])]).toEqual(["1F:0,1>east"]);
      expect(temples.doorKind(bossDoor, [0, 1], "east")).toBe("open");
    });
  });

  it("is not blown open from inside a fight the beast has sealed", () => {
    const id = drawn({ A: { type: "monster", content: { lockOnEnter: true }, sides: { north: "door", east: "bombable", south: "door", west: "door" } } }, [0, 0]);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
    expect(temples.isRoomBarred(id, "1F", [0, 1])).toBe(true);

    expect(temples.blowBombableSide(id, [0, 1], "east")).toBe(false);

    expect(temples.explainDoor(id, [0, 1], "east")).toBe("The beast bars the door. Win the fight first.");
    expect(temples.getTempleState(id)?.openedDoors?.size).toBe(0);
  });
});
