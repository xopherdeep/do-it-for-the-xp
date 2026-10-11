import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { TempleHydrator } from "@/lib/engine/core/dungeons/TempleHydrator";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { Dungeon, Room } from "@/lib/engine/core/dungeons/types";
import {
  needsTravelControls,
  pairingNote,
  teleportsOn,
  teleportTargetFor,
  withRoomAt,
} from "@/lib/engine/core/dungeons/teleportPairing";

// Whether progress reaches the database is TempleProgress.spec's business
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();

let counter = 0;
const nextId = () => `teleport-pairing-${++counter}`;

/** A temple from one blueprint per floor; rooms are keyed "<floor>:R<row>_<col>". */
const temple = (floors: Record<string, string>, id = nextId()): Dungeon => TempleHydrator.hydrateMultiFloor(floors, id, id);

const target = (dungeon: Dungeon, floor: string, row: number, col: number, content: Room["content"]) => {
  dungeon.rooms[`${floor}:R${row}_${col}`].content = content;
};

describe("teleportsOn", () => {
  it("lists the circles of one floor in reading order, row then column", () => {
    const hall = temple({ "1F": "EXIT R000 TELE\nTELE R000 R000\nR000 TELE R000" });

    expect(teleportsOn(hall, "1F")).toEqual([[0, 2], [1, 0], [2, 1]]);
  });

  it("keeps the floors apart", () => {
    const tower = temple({ "1F": "EXIT TELE", "2F": "TELE R000 TELE" });

    expect(teleportsOn(tower, "1F")).toEqual([[0, 1]]);
    expect(teleportsOn(tower, "2F")).toEqual([[0, 0], [0, 2]]);
    expect(teleportsOn(tower, "3F")).toEqual([]);
  });

  it("reads a temple with a single grid as 1F", () => {
    const single: Pick<Dungeon, "maze" | "rooms"> = { maze: [["a", "b"]], rooms: { a: { type: "empty" }, b: { type: "teleport" } } };

    expect(teleportsOn(single, "1F")).toEqual([[0, 1]]);
  });
});

describe("teleportTargetFor", () => {
  it("pairs two circles on a floor: each leads to the other", () => {
    const hall = temple({ "1F": "EXIT TELE R000 TELE" });

    expect(teleportTargetFor(hall, "1F", [0, 1])).toEqual({ level: "1F", position: [0, 3] });
    expect(teleportTargetFor(hall, "1F", [0, 3])).toEqual({ level: "1F", position: [0, 1] });
  });

  it("takes the next circle in reading order, wrapping, when a floor holds three", () => {
    const hall = temple({ "1F": "EXIT TELE R000\nTELE R000 R000\nR000 R000 TELE" });

    expect(teleportTargetFor(hall, "1F", [0, 1])).toEqual({ level: "1F", position: [1, 0] });
    expect(teleportTargetFor(hall, "1F", [1, 0])).toEqual({ level: "1F", position: [2, 2] });
    expect(teleportTargetFor(hall, "1F", [2, 2])).toEqual({ level: "1F", position: [0, 1] });
  });

  it("obeys an explicit target before the order: coordinates are x = column, y = row", () => {
    const hall = temple({ "1F": "EXIT TELE R000\nTELE R000 R000\nR000 R000 TELE" });
    target(hall, "1F", 0, 1, { targetLevel: "1F", targetCoords: { x: 2, y: 2 } });

    expect(teleportTargetFor(hall, "1F", [0, 1])).toEqual({ level: "1F", position: [2, 2] });
  });

  it("reads flat targetX and targetY the same way", () => {
    const hall = temple({ "1F": "EXIT TELE R000\nTELE R000 R000\nR000 R000 TELE" });
    target(hall, "1F", 0, 1, { targetX: 2, targetY: 2 });

    expect(teleportTargetFor(hall, "1F", [0, 1])).toEqual({ level: "1F", position: [2, 2] });
  });

  it("sends the hero to another floor named by the author", () => {
    const tower = temple({ "1F": "EXIT TELE R000 TELE", "2F": "R000 R000 TELE\nTELE R000 R000" });
    target(tower, "1F", 0, 1, { targetLevel: "2F", targetCoords: { x: 0, y: 1 } });

    expect(teleportTargetFor(tower, "1F", [0, 1])).toEqual({ level: "2F", position: [1, 0] });
  });

  it("sends the hero to a floor's first circle when only the floor is named", () => {
    const tower = temple({ "1F": "EXIT TELE R000 TELE", "2F": "R000 R000 TELE\nTELE R000 R000" });
    target(tower, "1F", 0, 1, { targetLevel: "2F", targetCoords: { x: 0, y: 0 } }); // the editor's default zeros land on no circle

    expect(teleportTargetFor(tower, "1F", [0, 1])).toEqual({ level: "2F", position: [0, 2] });
  });

  it("ignores a target that lands on no circle, or on the circle itself, and pairs as usual", () => {
    const hall = temple({ "1F": "EXIT TELE R000 TELE" });
    target(hall, "1F", 0, 1, { targetLevel: "1F", targetCoords: { x: 2, y: 0 } }); // an empty hall
    target(hall, "1F", 0, 3, { targetLevel: "1F", targetCoords: { x: 3, y: 0 } }); // itself

    expect(teleportTargetFor(hall, "1F", [0, 1])).toEqual({ level: "1F", position: [0, 3] });
    expect(teleportTargetFor(hall, "1F", [0, 3])).toEqual({ level: "1F", position: [0, 1] });
  });

  it("fizzles for a lone circle", () => {
    const hall = temple({ "1F": "EXIT TELE R000" });

    expect(teleportTargetFor(hall, "1F", [0, 1])).toBeNull();
  });

  it("fizzles on a room that is not a circle", () => {
    const hall = temple({ "1F": "EXIT TELE R000 TELE" });

    expect(teleportTargetFor(hall, "1F", [0, 0])).toBeNull();
    expect(teleportTargetFor(hall, "1F", [4, 4])).toBeNull();
  });

  it("links a circle alone on its floor to the temple's next one, the way the generator pairs them", () => {
    const tower = temple({ "1F": "EXIT TELE R000", "2F": "R000 R000 TELE" });

    expect(teleportTargetFor(tower, "1F", [0, 1])).toEqual({ level: "2F", position: [0, 2] });
    expect(teleportTargetFor(tower, "2F", [0, 2])).toEqual({ level: "1F", position: [0, 1] });
  });
});

describe("needsTravelControls", () => {
  it("is false for one floor with up to two circles", () => {
    expect(needsTravelControls(temple({ "1F": "EXIT R000" }), "1F")).toBe(false);
    expect(needsTravelControls(temple({ "1F": "EXIT TELE" }), "1F")).toBe(false);
    expect(needsTravelControls(temple({ "1F": "EXIT TELE R000 TELE" }), "1F")).toBe(false);
  });

  it("is true for one floor with more than two circles", () => {
    expect(needsTravelControls(temple({ "1F": "EXIT TELE TELE TELE" }), "1F")).toBe(true);
  });

  it("is true for any temple with several floors", () => {
    expect(needsTravelControls(temple({ "1F": "EXIT TELE", "2F": "R000 TELE" }), "1F")).toBe(true);
    expect(needsTravelControls(temple({ "1F": "EXIT R000", "2F": "R000 R000" }), "2F")).toBe(true);
  });

  it("counts only the floor asked about", () => {
    const tower = temple({ "1F": "EXIT TELE TELE TELE" });

    expect(needsTravelControls(tower, "2F")).toBe(false);
  });
});

describe("pairingNote", () => {
  it("says what the circle does without the controls", () => {
    expect(pairingNote(temple({ "1F": "EXIT TELE R000 TELE" }), "1F")).toBe("Pairs with the other circle on this floor.");
    expect(pairingNote(temple({ "1F": "EXIT TELE" }), "1F")).toBe("Add a second circle on this floor to pair with.");
  });
});

describe("withRoomAt", () => {
  it("counts the room being edited before it reaches the store", () => {
    const hall = temple({ "1F": "EXIT TELE R000 TELE" });
    const editing = withRoomAt(hall, "1F", [0, 2], { type: "teleport" });

    expect(teleportsOn(editing, "1F")).toEqual([[0, 1], [0, 2], [0, 3]]);
    expect(needsTravelControls(editing, "1F")).toBe(true);
    expect(teleportsOn(hall, "1F")).toEqual([[0, 1], [0, 3]]); // the store's temple is left alone
  });

  it("drops a circle that is being turned into something else", () => {
    const hall = temple({ "1F": "EXIT TELE R000 TELE" });

    expect(teleportsOn(withRoomAt(hall, "1F", [0, 1], { type: "empty" }), "1F")).toEqual([[0, 3]]);
  });
});

describe("TempleSystem.handleTeleport", () => {
  const stand = (dungeon: Dungeon, position: [number, number], level = "1F") => {
    dungeons.registerDungeon(dungeon);
    temples.initTemple(dungeon.id, position, level);
    return dungeon.id;
  };

  it("bounces the hero between a pair of circles", () => {
    const id = stand(temple({ "1F": "EXIT TELE R000 TELE" }), [0, 1]);

    expect(temples.handleTeleport(id)).toEqual([0, 3]);
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 3] });
    expect(temples.hasVisited(id, [0, 3])).toBe(true);

    expect(temples.handleTeleport(id)).toEqual([0, 1]);
    expect(temples.getTempleState(id)?.currentPosition).toEqual([0, 1]);
  });

  it("follows an explicit target, onto another floor the way stairs do", () => {
    const tower = temple({ "1F": "EXIT TELE R000 TELE", "2F": "R000 R000 R000\nTELE R000 R000" });
    target(tower, "1F", 0, 1, { targetLevel: "2F", targetCoords: { x: 0, y: 1 } });
    const id = stand(tower, [0, 1]);

    expect(temples.handleTeleport(id)).toEqual([1, 0]);
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [1, 0] });
    expect(temples.hasVisited(id, [1, 0])).toBe(true);
    expect(dungeons.hasVisited(id, [1, 0], "2F")).toBe(true);
  });

  it("leaves the hero where they stand when the circle is alone", () => {
    const id = stand(temple({ "1F": "EXIT TELE R000" }), [0, 1]);

    expect(temples.handleTeleport(id)).toBeUndefined();
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });
});
