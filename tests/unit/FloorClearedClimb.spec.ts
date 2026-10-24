/**
 * The third stairs lock, "floor cleared" (Project Towers): a flight of stairs whose `content.locked` is 'floorCleared'
 * opens only when every chore on its floor is done. The solver opens it once every fight room of the floor has been
 * reached, the stairs sheet reads `ctx.floorCleared` each time it is shown, and the engine never stores the climb as
 * unlocked (there is no key to spend and nothing to remember).
 */
import { createPinia, setActivePinia } from "pinia";
import { buildTempleGraph, solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { climbLockOf } from "@/lib/services/temples/authoredDoors";
import { copyFor } from "@/lib/services/copy/copy";
import { VOICES } from "@/lib/services/copy/voices";
import { roomActions, type RoomOutcome } from "@/lib/services/temples/RoomInteractions";
import { climb, stairsSheet } from "@/lib/services/temples/roomInteractions/travel";
import { addHero, contextAt, dungeons, enter, hero, makeTemple, temples } from "./templeFixtures";

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

const FLOOR_LINE = "Clear every chore on this floor to climb";

beforeEach(() => {
  setActivePinia(createPinia());
  addHero();
});

// --- the solver ------------------------------------------------------------------------------------

const _ = "_";
const ROOMS: Record<string, Room> = {
  [_]: { type: "wall" },
  E: { type: "entrance", visited: true },
  M1: { type: "monster" },
  M2: { type: "monster" },
  Q: { type: "empty", content: { questIds: ["chore-1"] } },
  Z: { type: "empty", content: { questIds: [] } },
  R: { type: "empty" },
  U: { type: "stairs-up", content: { locked: "floorCleared" } },
  D: { type: "stairs-down" },
  m: { type: "miniboss", content: { lockOnEnter: true } },
  K: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
  B: { type: "boss", content: { lockOnEnter: true }, locked: { master: true } },
  P: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } },
};

/** 2F: the stairs down at (0,1), the master key behind the mini-boss, the boss and the Pegasus chest below */
const UPSTAIRS = [
  [_, "D", "m", "K"],
  ["B", "R", _, _],
  ["P", _, _, _],
];

/**
 * 1F: the entrance, the stairs up right beside it (the climb is in reach at once) and two rooms to clear, one past the
 * other. `ground` changes cells; `rooms` changes what a token is.
 */
const tower = (ground: string[][] = [["E", "U", _], ["M1", "R", "M2"], [_, _, _]], rooms: Record<string, Room> = {}): TempleLayout => ({
  entrance: [0, 0, 0],
  maze: { "1F": ground, "2F": UPSTAIRS },
  rooms: { ...JSON.parse(JSON.stringify(ROOMS)), ...rooms },
});

const floorOf = (ref: { floor: string }): string => ref.floor;

describe("the floor-cleared lock in the solver", () => {
  it("reads content.locked 'floorCleared' as a lock of its own", () => {
    expect(climbLockOf({ content: { locked: "floorCleared" } })).toBe("floorCleared");
    expect(climbLockOf({ content: { locked: "somethingElse" } })).toBeUndefined();
    const stairsDoors = buildTempleGraph(tower()).doors.filter((door) => door.kind === "stairs");
    expect(stairsDoors.map(({ id, lock }) => [id, lock])).toEqual([
      ["1F:0,1>2F:0,1", "floorCleared"],
      ["2F:0,1>1F:0,1", "none"],
    ]);
  });

  it("is solvable, and the hero meets both rooms of 1F before any room of 2F", () => {
    const result = solveTemple(tower());
    expect(result).toMatchObject({ solvable: true, reasons: [] });

    const floors = result.order.map(floorOf);
    const firstUpstairs = floors.indexOf("2F");
    const monsters = result.order.map((ref, at) => ({ ref, at })).filter(({ ref }) => ref.floor === "1F" && ["1,0", "1,2"].includes(`${ref.row},${ref.col}`));
    expect(monsters).toHaveLength(2);
    for (const { at } of monsters) expect(at).toBeLessThan(firstUpstairs);
  });

  it("would let the hero up before the fights if the stairs were free (the lock is what holds them back)", () => {
    const free = solveTemple(tower(undefined, { U: { type: "stairs-up" } }));
    const floors = free.order.map(floorOf);
    const lastMonster = Math.max(...free.order.map((ref, at) => (ref.floor === "1F" && ref.row === 1 && ref.col !== 1 ? at : -1)));
    expect(floors.indexOf("2F")).toBeLessThan(lastMonster);
  });

  it("is not solvable when a room of the floor is walled off, and the reason names the stairs", () => {
    const walledOff = tower([["E", "U", _], ["M1", "R", _], [_, _, "M2"]]);
    const result = solveTemple(walledOff);

    expect(result.solvable).toBe(false);
    const naming = result.reasons.filter((reason) => reason.includes("1F (0,1) stairs-up"));
    expect(naming).toHaveLength(1);
    expect(naming[0]).toMatch(/^R2: /);
    expect(naming[0]).toContain("1F (2,2) monster");
  });

  it("counts a room that holds quests as a room to clear, and an empty list of quests as none", () => {
    expect(solveTemple(tower([["E", "U", _], ["M1", "R", "Q"], [_, _, _]])).solvable).toBe(true);

    const walledQuest = solveTemple(tower([["E", "U", _], ["M1", "R", _], [_, _, "Q"]]));
    expect(walledQuest.solvable).toBe(false);
    expect(walledQuest.reasons.some((reason) => reason.includes("1F (0,1) stairs-up") && reason.includes("1F (2,2) empty"))).toBe(true);

    // A room with `questIds: []` is an ordinary room: nothing to clear there
    expect(solveTemple(tower([["E", "U", _], ["M1", "R", _], [_, _, "Z"]])).reasons.filter((reason) => reason.includes("stairs-up"))).toEqual([]);
  });

  it("asks only for the rooms of its own floor: the fights upstairs do not hold the climb back", () => {
    // 2F has a mini-boss and a boss; if they counted, the climb could never open
    expect(solveTemple(tower()).solvable).toBe(true);
  });

  it("opens at once on a floor with nothing to clear", () => {
    const bare = tower([["E", "U", _], ["R", _, _], [_, _, _]]);
    expect(solveTemple(bare)).toMatchObject({ solvable: true, reasons: [] });
  });
});

// --- the stairs sheet and the climb ----------------------------------------------------------------

/** 1F: the entrance and the locked stairs at [0,1]; 2F: a room and the stairs down. */
const lockedTower = () =>
  makeTemple(
    { E: { type: "entrance" }, U: { type: "stairs-up", content: { locked: "floorCleared" } }, D: { type: "stairs-down" }, F: { type: "empty" } },
    { "1F": [["E", "U"]], "2F": [["F", "D"]] }
  );

const standAtStairs = (extra: { floorCleared?: boolean } = {}) => {
  const id = lockedTower();
  enter(id, [0, 1]);
  return { id, room: dungeons.getRoom(id, [0, 1], "1F")!, ctx: contextAt(id, [0, 1], extra) };
};

const labels = (sheet: { actions: Array<{ label: string }> }) => sheet.actions.map((action) => action.label);

describe("the floor-cleared lock on the stairs sheet", () => {
  it.each([
    ["absent", {}],
    ["false", { floorCleared: false }],
  ])("says to clear the floor and offers no climb while floorCleared is %s", (_name, extra) => {
    const { id, room, ctx } = standAtStairs(extra);
    // Neither a small key nor the Boss Key opens it
    temples.addKey(id);
    temples.grantMasterKey(id);

    const sheet = stairsSheet(room, ctx, "up");

    expect(sheet).toMatchObject({ header: "Stairs lead up.", subHeader: FLOOR_LINE, actions: [] });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1], playerKeys: 1 });
  });

  it("offers the climb once the floor is cleared, and spends no key to take it", async () => {
    const { id, room, ctx } = standAtStairs({ floorCleared: true });
    temples.addKey(id);
    temples.addKey(id);

    const sheet = stairsSheet(room, ctx, "up");
    expect(sheet.header).toBe("Stairs lead up.");
    expect(labels(sheet)).toEqual(["Climb"]);
    const outcome: RoomOutcome = await sheet.actions[0].run();

    expect(outcome).toMatchObject({ message: "You climb up to 2F.", sound: "steps", moved: true });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1], playerKeys: 2 });
    expect(temples.hasMasterKey(id)).toBe(false);
  });

  it("reaches the sheet through roomActions with the same context", () => {
    const { room, ctx } = standAtStairs({ floorCleared: true });
    expect(labels(roomActions(room, ctx))).toEqual(["Climb"]);
    expect(roomActions(room, { ...ctx, floorCleared: false })).toMatchObject({ subHeader: FLOOR_LINE, actions: [] });
  });

  it("asks again every time: the climb is shut once more when a chore is undone", async () => {
    const { id, room, ctx } = standAtStairs({ floorCleared: true });
    await stairsSheet(room, ctx, "up").actions[0].run();
    temples.changeLevel(id, "1F", [0, 1]);

    const later = stairsSheet(room, { ...ctx, floorCleared: false }, "up");

    expect(later).toMatchObject({ subHeader: FLOOR_LINE, actions: [] });
  });

  it("turns the hero back where they stand when the sheet was stale", () => {
    const { id, room, ctx } = standAtStairs({ floorCleared: false });

    const outcome = climb(room, ctx, "up");

    expect(outcome).toEqual({ message: FLOOR_LINE, sound: "error" });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("lets the landing climb back down for free", () => {
    const id = lockedTower();
    enter(id, [0, 1], "2F");
    const landing = dungeons.getRoom(id, [0, 1], "2F")!;

    const sheet = roomActions(landing, contextAt(id, [0, 1]));

    expect(labels(sheet)).toEqual(["Climb"]);
  });

  it("finds rubble before it asks anything when the stairs lead to no floor", () => {
    const id = makeTemple({ E: { type: "entrance" }, U: { type: "stairs-up", content: { locked: "floorCleared" } } }, [["E", "U"]]);
    enter(id, [0, 1]);

    const outcome = climb(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1], { floorCleared: true }), "up");

    expect(outcome).toEqual({ message: "The stairs are blocked by rubble.", sound: "error" });
  });

  it("says its line in each voice of the hero", () => {
    expect(copyFor("temple.floorClearedLock", "adventure")).toBe(FLOOR_LINE);
    const simple = copyFor("temple.floorClearedLock", "simple");
    const classic = copyFor("temple.floorClearedLock", "classic");
    expect(simple).not.toBe(FLOOR_LINE);
    expect(classic).not.toBe(FLOOR_LINE);
    for (const voice of VOICES) expect(copyFor("temple.floorClearedLock", voice)).not.toMatch(/[{}]|—/);

    for (const [voice, line] of [["simple", simple], ["classic", classic]] as const) {
      const { room, ctx } = standAtStairs();
      (hero() as { voice?: string }).voice = voice;
      expect(stairsSheet(room, ctx, "up").subHeader).toBe(line);
    }
  });
});

describe("unlockClimb with a floor-cleared lock", () => {
  it("returns false and writes nothing: the climb is never stored as unlocked", () => {
    const { id } = standAtStairs({ floorCleared: true });
    temples.addKey(id);
    temples.grantMasterKey(id);

    expect(temples.unlockClimb(id, "1F", [0, 1], "floorCleared")).toBe(false);

    expect(temples.isClimbUnlocked(id, "1F", [0, 1])).toBe(false);
    expect(temples.getTempleState(id)?.openedDoors?.size ?? 0).toBe(0);
    expect(temples.getTempleState(id)).toMatchObject({ playerKeys: 1 });
    expect(temples.hasMasterKey(id)).toBe(true);
  });
});
