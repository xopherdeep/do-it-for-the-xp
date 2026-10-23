/**
 * The Wind Temple follows Zelda 1's Level 1, the Eagle (tools/temples/classic/dungeons/wind-temple.json), dressed by the
 * classic dress step under its plan (tools/temples/classic/dressPlans.ts), with the owner's four east rooms kept as he
 * drew them (src/lib/engine/temples/wind-temple.ts at 61d7b718): his way to his Boss Key, which the Eagle does not have.
 * Two floors: B1, the bow's basement, under 1F, the Eagle's 17 cells on a 6x6 floor, entered at (5,2).
 *
 * The route: the Eagle's key drops open its locked doors up to the push-block steps at (0,1), whose circle rides down
 * to the Big Chest in the basement (treasure: the Wind Whistle stays the Pegasus chest's prize); a second circle there
 * rides on to the owner's circle at (5,5), and past the Cobweb Widow lies his Boss Key at (3,5). Back the same way, the
 * Dust Bunny King guards the boss door at (2,4), the Fluffalo waits at (1,4) and the Master Room at (1,5), the Eagle's
 * Triforce room. The old man's room at (2,0) is the shop, its cracked wall opened: the owner's shop was reached without
 * a Bomb. ClassicTemples.spec.ts holds Wind to the dressing's rules as it holds the other eight.
 */
import windTemple from "@/lib/engine/temples/wind-temple";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { teleportTargetFor } from "@/lib/engine/core/dungeons/teleportPairing";
import { buildTempleGraph, reachableFrom, solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { roomDrops } from "@/lib/services/temples/fightDrops";
import { grantedDungeonItems, grantsBossKey } from "@/lib/services/temples/roomGrants";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";
import { WIND_TEMPLE_ID, WIND_WHISTLE, asChestRoom } from "@/lib/services/temples/ChestLoot";
import { CLASSIC_PLANS, classicReport, loadDungeon } from "../../tools/temples/classic/dress";
import { templateFor } from "../../tools/temples/questPlan";

type Maze = Record<string, string[][]>;
const temple = windTemple as unknown as TempleLayout & { maze: Maze; rooms: Record<string, Room>; name: string };
const plan = CLASSIC_PLANS["wind-temple"];
const DIRS = ["north", "east", "south", "west"] as const;

const at = (floor: string, row: number, col: number): Room | undefined => temple.rooms[temple.maze[floor]?.[row]?.[col]];

/** The layout as registration reads it: the editor's door sides become locks and barriers */
const layout: TempleLayout = { ...temple, rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])) };

/** "1F (0,1)": where a report entry stands */
const where = (cell: { floor: string; row: number; col: number }): string => `${cell.floor} (${cell.row},${cell.col})`;

/** Today's nine quests of the Wind Temple, as the owner set them (61d7b718): six monsters, two mini-bosses, the boss */
const TODAYS_QUESTS = [
  { beastId: "beast-cushion-croc", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" },
  { beastId: "beast-fluffalo", difficulty: 8, basicSchedule: "weekly", dueByTime: "18:00" },
  { beastId: "beast-gravel-gnome", difficulty: 2, basicSchedule: "weekly", dueByTime: "18:00" },
  { beastId: "beast-crumb-crawler", difficulty: 2, basicSchedule: "daily", dueByTime: "19:00" },
  { beastId: "beast-dust-bunny-king", difficulty: 3, basicSchedule: "weekly", dueByTime: "18:00" },
  { beastId: "beast-mailbox-mimic", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" },
  { beastId: "beast-spill-sprite", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" },
  { beastId: "beast-cobweb-widow", difficulty: 3, basicSchedule: "weekly", dueByTime: "18:00" },
  { beastId: "beast-mustwisp", difficulty: 1, basicSchedule: "daily", dueByTime: "08:00" },
];

/** What a room hands out: its chest's or its fight's dungeon item, or its gold */
const handsOut = (room: Room | undefined): string | undefined => {
  const hasGold = Boolean(room?.content?.gold) || Boolean(roomDrops(room)?.gold);
  return grantedDungeonItems(room)[0] ?? (hasGold ? "gold" : undefined);
};

/**
 * Each of the Eagle's 17 cells dressed: its room and what it hands out. Six key drops (the one before the boss door a
 * mini-boss's), the compass, the map and the boomerang's gold under the enemies of their rooms, the stairway to the bow
 * a circle, the Triforce room the Master Room, the old man's room the shop.
 */
const EAGLE: Array<[row: number, col: number, type: string, hands?: string]> = [
  [0, 1, "teleport"],
  [0, 2, "monster", "key"],
  [1, 2, "monster", "key"],
  [1, 4, "boss"],
  [1, 5, "master"],
  [2, 0, "shop"],
  [2, 1, "monster"],
  [2, 2, "monster", "compass"],
  [2, 3, "monster", "gold"],
  [2, 4, "miniboss", "key"],
  [3, 1, "monster"],
  [3, 2, "monster", "key"],
  [3, 3, "monster", "map"],
  [4, 2, "monster"],
  [5, 1, "monster", "key"],
  [5, 2, "entrance"],
  [5, 3, "monster", "key"],
];

describe("the Wind Temple, Zelda's Eagle", () => {
  it("is the bow's basement under the Eagle's 6x6 floor, entered on 1F at (5,2)", () => {
    expect(temple.name).toBe("Wind Temple");
    expect(Object.keys(temple.maze)).toEqual(["B1", "1F"]);
    expect(temple.maze["1F"]).toHaveLength(6);
    for (const line of temple.maze["1F"]) expect(line).toHaveLength(6);
    expect(temple.entrance).toEqual([1, 5, 2]);
  });

  it("keeps the Eagle's 17 cells at their places, each holding what Zelda put there", () => {
    const cells = loadDungeon("wind-temple").floors.find((floor) => floor.name === "1F")!.cells;
    expect(cells.map((cell) => `${cell.row},${cell.col}`).sort()).toEqual(EAGLE.map(([row, col]) => `${row},${col}`).sort());
    for (const [row, col, type, hands] of EAGLE) {
      const room = at("1F", row, col);
      expect({ cell: `${row},${col}`, type: room?.type, hands: handsOut(room) }).toEqual({ cell: `${row},${col}`, type, hands });
    }
    // The six key drops seal their rooms; the six other fights are side rooms
    const keyDrops = cells.filter((cell) => cell.keyDrop).map((cell) => at("1F", cell.row, cell.col)?.content?.lockOnEnter);
    expect(keyDrops).toEqual([true, true, true, true, true, true]);
    const sides = cells.filter((cell) => cell.enemies && !cell.keyDrop).map((cell) => at("1F", cell.row, cell.col)?.content?.lockOnEnter);
    expect(sides).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
  });

  it("keeps the Big Chest in the basement, gold and a Potion, between the circle down from (0,1) and the circle on to (5,5)", () => {
    expect(temple.maze["B1"]).toHaveLength(2);
    expect(at("B1", 0, 0)).toEqual(expect.objectContaining({ type: "loot", content: { chest: "gold", gold: 50, items: ["Potion"] } }));
    expect(plan.relic).toBeUndefined();
    expect(plan.treasure).toEqual({ gold: 50, items: ["Potion"] });
    expect(at("B1", 0, 1)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: 1, y: 0 } } });
    expect(at("B1", 1, 0)).toMatchObject({ type: "teleport", content: { targetLevel: "1F", targetCoords: { x: 5, y: 5 } } });
    expect(at("1F", 0, 1)).toMatchObject({ content: { targetLevel: "B1", targetCoords: { x: 1, y: 0 } } });
    expect(at("1F", 5, 5)).toMatchObject({ content: { targetLevel: "B1", targetCoords: { x: 0, y: 1 } } });
    // The report records the basement's two added circles, and the push blocks left behind as dropped riddles
    const report = classicReport("wind-temple");
    expect(report.moves.map((move) => `${move.what} ${where(move.from)} -> ${where(move.to)}`)).toEqual(["teleport B1 (0,0) -> B1 (0,1)", "landing circle B1 (0,0) -> B1 (1,0)"]);
    expect(report.dropped.map((drop) => `${drop.what} ${where(drop.at)}`).sort()).toEqual(["puzzle 1F (0,1)", "puzzle 1F (1,2)"]);
  });

  it("keeps the owner's four east rooms as he drew them, every side a door: the Boss Key, the key room, the Cobweb Widow, the circle", () => {
    expect(at("1F", 3, 5)).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "master-key" } });
    expect(at("1F", 4, 4)?.type).toBe("key");
    expect(at("1F", 4, 5)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: TODAYS_QUESTS[7] } });
    expect(at("1F", 5, 5)?.type).toBe("teleport");
    for (const [row, col] of [[3, 5], [4, 4], [4, 5], [5, 5]]) {
      expect({ cell: `${row},${col}`, sides: at("1F", row, col)?.sides }).toEqual({ cell: `${row},${col}`, sides: { north: "door", east: "door", south: "door", west: "door" } });
    }
  });

  it("draws Zelda's doors: a lock on one end of each small-key door, the two cracked walls left, the Boss doors", () => {
    const drawn = (word: string): string[] =>
      Object.entries(temple.maze).flatMap(([floor, grid]) =>
        grid.flatMap((line, row) => line.flatMap((_token, col) => DIRS.filter((dir) => at(floor, row, col)?.sides?.[dir] === word).map((dir) => `${floor} (${row},${col}) ${dir}`)))
      );
    // Six small-key doors in the Eagle: the one into the boss's room is his Boss door
    expect(drawn("locked").sort()).toEqual(["1F (0,2) west", "1F (1,2) north", "1F (2,2) east", "1F (3,1) north", "1F (5,2) north"]);
    // The third, before the old man's room, the plan opens (the owner's shop was reached without a Bomb)
    expect(drawn("bombable").sort()).toEqual(["1F (2,2) south", "1F (2,3) south", "1F (3,2) north", "1F (3,3) north"]);
    expect(plan.opens).toEqual([{ floor: "1F", row: 2, col: 0, side: "east" }]);
    expect(drawn("masterlocked").sort()).toEqual(["1F (1,4) east", "1F (1,4) south", "1F (1,5) west", "1F (2,4) north"]);
  });

  it("makes the Dust Bunny King the mini-boss of the Eagle's key room before the boss door, as the plan names it", () => {
    expect(plan.minibossRooms).toContain("Eagle (2,4)");
    expect(at("1F", 2, 4)).toMatchObject({ type: "miniboss", content: { lockOnEnter: true, quest: TODAYS_QUESTS[4], drops: { chest: "dungeon", dungeon: "key" } } });
    expect(at("1F", 1, 4)).toMatchObject({ type: "boss", content: { lockOnEnter: true, element: "wind", quest: TODAYS_QUESTS[1] } });
  });

  it("binds every combat room to a wind beast and keeps all nine of today's quests, the plan listing exactly those", () => {
    const quests = Object.values(temple.rooms).flatMap((room) => (room.content?.quest ? [room.content.quest] : []));
    for (const { beastId } of quests) expect({ beastId, theme: BEAST_LIBRARY.find((beast) => beast.id === beastId)?.theme }).toEqual({ beastId, theme: "wind" });
    const distinct = [...new Set(quests.map((quest) => JSON.stringify(quest)))].sort();
    expect(distinct).toEqual(TODAYS_QUESTS.map((quest) => JSON.stringify(quest)).sort());
    const planned = [...plan.mustClear, ...plan.minibosses, plan.boss].map((quest) => JSON.stringify(templateFor(quest)));
    expect(planned.sort()).toEqual(TODAYS_QUESTS.map((quest) => JSON.stringify(quest)).sort());
  });

  describe("the owner's route to his Boss Key", () => {
    const graph = buildTempleGraph(layout);
    const reachedWithout = (...blocked: string[]): string[] => reachableFrom(graph, graph.entrance!, new Set(blocked));

    it("runs through the steps at (0,1), down to the basement, on to (5,5) and past the Cobweb Widow, and no other way", () => {
      expect(reachedWithout()).toContain("1F:3,5");
      for (const step of ["1F:0,1", "B1:0,0", "B1:1,0", "1F:5,5", "1F:4,5"]) expect({ step, reached: reachedWithout(step).includes("1F:3,5") }).toEqual({ step, reached: false });
    });

    it("rides each circle in the engine where the module names it", () => {
      registerTemple("wind-temple", temple, { force: true });
      const registered = DungeonManager.getInstance().getDungeon("wind-temple")!;
      const engine = { entrance: registered.entrance, maze: registered.maze, rooms: registered.rooms };
      expect(teleportTargetFor(engine, "1F", [0, 1])).toEqual({ level: "B1", position: [0, 1] });
      expect(teleportTargetFor(engine, "B1", [0, 1])).toEqual({ level: "1F", position: [0, 1] });
      expect(teleportTargetFor(engine, "B1", [1, 0])).toEqual({ level: "1F", position: [5, 5] });
      expect(teleportTargetFor(engine, "1F", [5, 5])).toEqual({ level: "B1", position: [1, 0] });
    });
  });

  describe("cleared", () => {
    it("by the solver with no reasons and by the audit, no Bomb needed: take the shop away and it still clears", () => {
      expect(solveTemple(layout)).toMatchObject({ solvable: true, reasons: [] });
      expect(missingNames(auditTemple(temple))).toEqual([]);
      const rooms = Object.fromEntries(Object.entries(layout.rooms).map(([token, room]) => [token, room.type === "shop" ? { ...room, type: "empty" } : room]));
      expect(solveTemple({ ...layout, rooms }).solvable).toBe(true);
    });

    it("only with the Boss Key", () => {
      const rooms = Object.fromEntries(Object.entries(layout.rooms).map(([token, room]) => [token, grantsBossKey(room) ? { ...room, content: { chest: "gold", gold: 1 } } : room]));
      expect(solveTemple({ ...layout, rooms }).solvable).toBe(false);
    });

    it("sells at the old man's room, reached from the entrance without a Bomb (keys and seals on the way)", () => {
      expect(at("1F", 2, 0)).toMatchObject({ type: "shop", sides: { east: "door" } });
      expect(at("1F", 2, 1)?.sides?.west).toBe("door");
      const graph = buildTempleGraph(layout);
      const cracks = new Set(graph.doors.filter((door) => door.lock === "bomb").map((door) => door.id));
      expect(reachableFrom(graph, graph.entrance!, new Set(), cracks)).toContain("1F:2,0");
    });

    it("hands out the Wind Whistle from the Pegasus chest alone, as the temple plays its chests", () => {
      expect(JSON.stringify(temple.rooms)).not.toContain(WIND_WHISTLE);
      const played = Object.values(temple.rooms).map((room) => asChestRoom(room, WIND_TEMPLE_ID));
      const whistles = played.filter((room) => (room.content?.items ?? []).includes(WIND_WHISTLE) || room.content?.dungeon === WIND_WHISTLE);
      expect(whistles).toEqual([expect.objectContaining({ content: expect.objectContaining({ pegasus: true }) })]);
    });
  });
});
