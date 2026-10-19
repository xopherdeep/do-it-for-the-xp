/**
 * The hand-made Wind Temple (src/lib/engine/temples/wind-temple.ts): one 6x6 floor, entered at [row, col] = [5, 2].
 *
 * Its run, as authored: the small key west of the entrance opens the locked door north, the shop on the west of the
 * hub sells a Bomb, the Bomb blows the cracked wall north of the monster room at (1,2), the small-key chest behind it
 * stands beside the teleporter, which pairs with the circle in the far corner, where the Boss Key lies past the second
 * mini-boss. Back through the circle, the first mini-boss guards the boss door, and the Master Room is behind the boss.
 */
import windTemple from "@/lib/engine/temples/wind-temple";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { teleportTargetFor } from "@/lib/engine/core/dungeons/teleportPairing";
import { buildTempleGraph, reachableFrom, solveTemple } from "@/lib/engine/dungeons/generator";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";

const temple = windTemple as any;
const grid: string[][] = temple.maze["1F"];

/** The token at a cell */
const at = (row: number, col: number) => grid[row][col];

/** The engine's copy of the temple, optionally with every cracked wall blown */
const engineLayout = (blowWalls: boolean) => {
  registerTemple("wind-temple", temple, { force: true });
  const dungeon = DungeonManager.getInstance().getDungeon("wind-temple")!;
  const rooms = Object.fromEntries(
    Object.entries(dungeon.rooms).map(([key, room]: [string, any]) => {
      const barriers = blowWalls && room.barriers ? Object.fromEntries(Object.entries(room.barriers).filter(([, kind]) => kind !== "bombable")) : room.barriers;
      return [key, { ...room, barriers }];
    })
  );
  return { entrance: dungeon.entrance, maze: dungeon.maze, rooms };
};

const kindAt = (graph: ReturnType<typeof buildTempleGraph>, row: number, col: number) => graph.rooms.get(`1F:${row},${col}`)?.kind;

describe("the Wind Temple", () => {
  it("is a single 6x6 floor whose every token has a room", () => {
    expect(Object.keys(temple.maze)).toEqual(["1F"]);
    expect(grid).toHaveLength(6);
    for (const row of grid) expect(row).toHaveLength(6);
    const missing = grid.flat().filter((token) => !temple.rooms[token]);
    expect(missing).toEqual([]);
  });

  it("uses every room it defines", () => {
    const placed = new Set(grid.flat());
    expect(Object.keys(temple.rooms).filter((token) => !placed.has(token))).toEqual([]);
  });

  it("reads its entrance as [row, col]: row 5, column 2 is the entrance room", () => {
    expect(temple.entrance).toEqual([5, 2]);
    const [row, col] = temple.entrance;
    expect(temple.rooms[at(row, col)].type).toBe("entrance");
  });

  it("binds every combat room to a library beast of the wind theme", () => {
    const quests = Object.values(temple.rooms as Record<string, any>).flatMap((room) => (room.content?.quest ? [room.content.quest] : []));
    expect(quests).toHaveLength(9);
    for (const { beastId } of quests) {
      const beast = BEAST_LIBRARY.find((entry) => entry.id === beastId);
      expect({ beastId, theme: beast?.theme }).toEqual({ beastId, theme: "wind" });
    }
  });

  it("pairs its two teleport circles with each other (the editor's zero target is no pick)", () => {
    const registered = engineLayout(false);
    expect(teleportTargetFor(registered, "1F", [0, 1])).toEqual({ level: "1F", position: [5, 5] });
    expect(teleportTargetFor(registered, "1F", [5, 5])).toEqual({ level: "1F", position: [0, 1] });
  });

  it("holds a small key for every small lock, a compass, a map and the Boss Key", () => {
    const chests = Object.values(temple.rooms as Record<string, any>).filter((room) => room.type === "loot").map((room) => room.content.dungeon);
    expect(chests.sort()).toEqual(["compass", "key", "map", "master-key", "small-key"]);
    expect(missingNames(auditTemple(temple))).toEqual([]);
  });

  describe("with the cracked wall left as it is", () => {
    const layout = engineLayout(false);
    const graph = buildTempleGraph(layout);
    const bombDoors = new Set(graph.doors.filter((door) => door.lock === "bomb").map((door) => door.id));
    const reach = reachableFrom(graph, graph.entrance!, new Set(), bombDoors);

    it("reaches the shop that sells a Bomb before any wall is blown", () => {
      expect(kindAt(graph, 2, 0)).toBe("shop");
      expect(graph.rooms.get("1F:2,0")!.bombs).toBe(true);
      expect(reach).toContain("1F:2,0");
    });

    it("cannot reach the Boss Key without a Bomb: the cracked wall at (1,2) guards it", () => {
      expect(bombDoors.size).toBeGreaterThan(0);
      expect(reach).not.toContain("1F:3,5");
    });

    it("is cleared all the same: the Bomb from the shop opens the wall", () => {
      expect(solveTemple(layout).solvable).toBe(true);
    });

    it("is not cleared when no Bomb is to be had: take the shop away and the wall holds", () => {
      const rooms = Object.fromEntries(Object.entries(layout.rooms).map(([token, room]: [string, any]) => [token, room.type === "shop" ? { type: "empty" } : room]));

      expect(solveTemple({ ...layout, rooms }).solvable).toBe(false);
    });
  });

  describe("with the cracked wall blown", () => {
    const layout = engineLayout(true);
    const graph = buildTempleGraph(layout);
    const verdict = solveTemple(layout);

    it("reaches every room", () => {
      expect(reachableFrom(graph, graph.entrance!).sort()).toEqual([...graph.rooms.keys()].sort());
    });

    it("is cleared through the boss into the Master Room", () => {
      expect(verdict.solvable).toBe(true);
      const path = verdict.criticalPath.map(({ row, col }) => `${row},${col}`);
      expect(path).toEqual(expect.arrayContaining(["5,2", "3,5", "1,4", "1,5"]));
      expect(path.indexOf("3,5")).toBeLessThan(path.indexOf("1,4"));
      expect(path.indexOf("1,4")).toBeLessThan(path.indexOf("1,5"));
    });
  });
});
