/**
 * The nine temples that ship with the app (src/lib/engine/temples) can all be finished.
 *
 * Each one is registered the way the engine registers it (TempleAdapter.registerTemple, so a Master Room becomes the
 * Pegasus chest and the editor's door sides become locks), then read by the temple audit and the solver. The eight
 * temples written by the generator (tools/temples/regenerate.ts) must also keep to the shape they were made in:
 * two or three floors joined by stairs, a short critical path, every rule of the Temple Generation Contract.
 * The Wind Temple is authored by hand and only has to be finishable.
 */
import temples from "@/lib/engine/temples";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { buildTempleGraph, generateTemple, roomKey, solveTemple, type TempleGraph } from "@/lib/engine/dungeons/generator";
import { auditSummary, auditTemple, missingNames } from "@/lib/services/temples/templeAudit";
import { generateShipped, renderModule } from "../../tools/temples/regenerate";
import { readFileSync } from "fs";
import { join } from "path";

const shipped = temples as Record<string, any>;
const IDS = Object.keys(shipped);
const HAND_MADE = ["wind-temple"];
const REGENERATED = IDS.filter((id) => !HAND_MADE.includes(id));

/** Floors each regenerated temple was spread over */
const FLOORS: Record<string, number> = {
  "earth-temple": 2,
  "fire-temple": 2,
  "ice-temple": 2,
  "light-temple": 2,
  "storm-temple": 2,
  "water-temple": 2,
  "moon-temple": 3,
  "shadow-temple": 3,
};

/** The relics each regenerated temple keeps in a chest */
const RELICS: Record<string, string[]> = {
  "earth-temple": ["Gaia's Hammer"],
  "fire-temple": ["Flame Shield"],
  "ice-temple": ["Frost Wand"],
  "light-temple": ["Dawnbreaker Bow"],
  "storm-temple": ["Lightning Rod"],
  "water-temple": ["Trident of Tides"],
  "moon-temple": ["Lunar Pendant", "Moon Shard"],
  "shadow-temple": ["Void Dagger"],
};

/** The temple as the engine holds it after registration */
const registered = (id: string) => {
  registerTemple(id, shipped[id], { force: true });
  const dungeon = DungeonManager.getInstance().getDungeon(id)!;
  return { id, entrance: dungeon.entrance, maze: dungeon.maze, rooms: dungeon.rooms };
};

const roomsOn = (graph: TempleGraph, floor: string) => [...graph.rooms.values()].filter((room) => room.ref.floor === floor);

describe("the shipped temples", () => {
  it("are the nine of the registry", () => {
    expect(IDS.sort()).toEqual(Object.keys(TEMPLE_METADATA).sort());
    expect(IDS).toHaveLength(9);
  });

  describe.each(IDS)("%s", (id) => {
    const layout = registered(id);
    const graph = buildTempleGraph(layout);
    const rooms = [...graph.rooms.values()];
    const verdict = solveTemple(layout);
    const audit = auditTemple(layout);

    it("passes the audit, map and compass included", () => {
      expect(missingNames(audit)).toEqual([]);
      expect(audit.passed).toBe(true);
      expect(auditSummary(audit)).toBe("7 of 7 checks passed");
    });

    it("has one entrance, one boss, one Master Room and a Boss Key chest", () => {
      expect(rooms.filter((room) => room.kind === "entrance")).toHaveLength(1);
      expect(rooms.filter((room) => room.kind === "boss")).toHaveLength(1);
      expect(rooms.filter((room) => room.prize)).toHaveLength(1);
      expect(rooms.filter((room) => room.masterKey).length).toBeGreaterThanOrEqual(1);
    });

    it("puts the Master Room right behind the boss", () => {
      const boss = rooms.find((room) => room.kind === "boss")!;
      const master = rooms.find((room) => room.prize)!;
      expect(graph.doors.some((door) => door.from === boss.key && door.to === master.key)).toBe(true);
    });

    it("can be cleared: the hero reaches the boss and the Master Room", () => {
      expect(verdict.solvable).toBe(true);
      const path = verdict.criticalPath.map(roomKey);
      expect(path).toContain(rooms.find((room) => room.kind === "boss")!.key);
      expect(path).toContain(rooms.find((room) => room.prize)!.key);
      expect(path).toContain(graph.entrance);
    });

    it("is filed under the id the registry knows it by", () => {
      expect(TEMPLE_METADATA[id].id).toBe(id);
      expect(shipped[id].id ?? id).toBe(id);
    });
  });
});

describe("the eight regenerated temples", () => {
  it("are every shipped temple but the hand-made Wind Temple", () => {
    expect(REGENERATED).toHaveLength(8);
  });

  describe.each(REGENERATED)("%s", (id) => {
    const layout = registered(id);
    const graph = buildTempleGraph(layout);
    const rooms = [...graph.rooms.values()];

    it("is spread over several floors with a short run on each", () => {
      expect(graph.floors).toHaveLength(FLOORS[id]);
      for (const floor of graph.floors) {
        const count = roomsOn(graph, floor).length;
        expect(count).toBeGreaterThanOrEqual(8);
        expect(count).toBeLessThanOrEqual(14);
      }
    });

    it("starts on the ground floor, and a flight of stairs joins each floor to the next", () => {
      expect(shipped[id].entrance).toHaveLength(3);
      expect(shipped[id].entrance[0]).toBe(0);
      graph.floors.slice(0, -1).forEach((floor, index) => {
        const next = graph.floors[index + 1];
        const up = graph.doors.filter((door) => door.kind === "stairs" && graph.rooms.get(door.from)!.ref.floor === floor && graph.rooms.get(door.to)!.ref.floor === next);
        const down = graph.doors.filter((door) => door.kind === "stairs" && graph.rooms.get(door.from)!.ref.floor === next && graph.rooms.get(door.to)!.ref.floor === floor);
        expect(up.length).toBeGreaterThanOrEqual(1);
        expect(down.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("keeps the Master Room under its own name and the mini-boss on the way", () => {
      const placed = Object.values(shipped[id].maze as Record<string, string[][]>)
        .flat(2)
        .map((token) => shipped[id].rooms[token]?.type);
      expect(placed.filter((type) => type === "master")).toHaveLength(1);
      expect(placed.filter((type) => type === "miniboss")).toHaveLength(1);
      expect(placed.filter((type) => type === "boss")).toHaveLength(1);
    });

    it("hands out at least as many small keys as it has small locks", () => {
      const keys = rooms.reduce((sum, room) => sum + room.smallKeys, 0);
      const locks = graph.doors.filter((door) => door.lock === "small").length;
      expect(locks).toBeGreaterThanOrEqual(1);
      expect(keys).toBeGreaterThanOrEqual(locks);
    });

    it("keeps the registry's element on its boss and a beast type on every monster room", () => {
      const boss = rooms.find((room) => room.kind === "boss")!;
      expect(boss.room.content?.element).toBe(TEMPLE_METADATA[id].element);
      const monsters = rooms.filter((room) => room.kind === "monster");
      expect(monsters.length).toBeGreaterThanOrEqual(3);
      for (const room of monsters) expect(room.room.content?.monsterType).toEqual(expect.any(String));
    });

    it("keeps its relic in a chest", () => {
      const held = rooms.filter((room) => room.room.type === "loot" && room.room.content?.chest === "dungeon").map((room) => room.room.content?.dungeon);
      expect(held).toEqual(expect.arrayContaining(RELICS[id]));
    });

    it("is exactly what tools/temples/regenerate.ts writes from its seed", () => {
      const file = readFileSync(join(__dirname, "../../src/lib/engine/temples", `${id}.ts`), "utf8");
      expect(file).toBe(renderModule(id, generateShipped(id)));
      expect(file).toContain(`// seed: "${id}"`);
    });

    it("breaks no rule of the Temple Generation Contract", () => {
      expect(solveTemple(layout).reasons).toEqual([]);
    });
  });
});

describe("the generator options the shipped temples are made with", () => {
  const options = { theme: "Kitchen", size: "small" as const, floors: 2 as const, locks: 1 as const };
  const typed = (temple: { rooms: Record<string, { type: string }> }, type: string) => Object.values(temple.rooms).filter((room) => room.type === type);

  it("name the Pegasus chamber a Master Room, and leave it a loot room otherwise", () => {
    const named = generateTemple("master-room", { ...options, masterRoom: true });
    const plain = generateTemple("master-room", options);
    expect(typed(named, "master")).toHaveLength(1);
    expect(typed(named, "master")[0]).toMatchObject({ content: { chest: "dungeon", pegasus: true } });
    expect(typed(plain, "master")).toHaveLength(0);
    expect(Object.values(plain.rooms).filter((room) => room.content?.pegasus)).toHaveLength(1);
    expect(plain.criticalPath).toEqual(named.criticalPath);
  });

  it("put the Boss Key in a chest of its own, so the audit finds it", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const temple = generateTemple(`boss-key-${seed}`, { ...options, bossKeyChest: true, masterRoom: true });
      expect(Object.values(temple.rooms).some((room) => room.type === "miniboss" && room.content?.dungeon === "master-key")).toBe(false);
      expect({ seed, passed: auditTemple(temple).passed }).toEqual({ seed, passed: true });
    }
  });

  it("carve as many rooms a floor as asked, loops and the Master Room on top", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const temple = generateTemple(`rooms-${seed}`, { ...options, roomsPerFloor: 9, bossKeyChest: true });
      for (const grid of Object.values(temple.maze)) {
        const count = grid.flat().filter((token) => token !== "_").length;
        expect(count).toBeGreaterThanOrEqual(8);
        expect(count).toBeLessThanOrEqual(14);
      }
    }
  });

  it("give the same temple for the same seed", () => {
    const all = { ...options, roomsPerFloor: 9, bossKeyChest: true, masterRoom: true };
    expect(generateTemple("again", all)).toEqual(generateTemple("again", all));
  });
});
