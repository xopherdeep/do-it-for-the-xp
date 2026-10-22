/**
 * The guards of the dress step (tools/temples/classic/dress.ts) for the temples that follow Storm: every classic JSON
 * dressed in memory under the Storm plan as a stand-in (Task 8 writes each temple's own plan and module), checked
 * against its own converted dungeon:
 * - every must-clear fight that blocks the boss in the dungeon still blocks him in the temple (the seals pin);
 * - whatever the dressing pushes out of a sealed fight is reached only through that fight, a warp that lands on a
 *   sealed fight lands in front of it, and a chest or a key that leaves its cell is reached from that cell with
 *   nothing in hand (no key, no Bomb, no seal);
 * - what each temple builds and solves today, pinned, for Task 8 to flip temple by temple.
 * The shipped classic temples are checked in ClassicTemples.spec.ts, the rules on hand-made dungeons in
 * ClassicDress.spec.ts.
 */
import { readdirSync } from "fs";
import { join } from "path";
import type { ClassicDungeon } from "../../tools/temples/classic/classicDungeon";
import { CLASSIC_IDS, CLASSIC_PLANS, dressDungeon, loadDungeon, type DressedTemple } from "../../tools/temples/classic/dress";
import { DUNGEON_DIR } from "../../tools/temples/classic/dressPlans";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, reachableFrom, roomKey, solveTemple, type TempleGraph, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { roomDrops } from "@/lib/services/temples/fightDrops";
import { grantedDungeonItems, grantsBossKey, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";

const DIRS = ["north", "east", "south", "west"] as const;
const STEP: Record<(typeof DIRS)[number], [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };
const ALL_NINE = ["storm-temple", "earth-temple", "ice-temple", "wind-temple", "fire-temple", "light-temple", "moon-temple", "shadow-temple", "water-temple"];

interface At {
  floor: string;
  row: number;
  col: number;
}

const sameCell = (a: At, b: At): boolean => a.floor === b.floor && a.row === b.row && a.col === b.col;
const keyOf = (at: At): string => `${at.floor}:${at.row},${at.col}`;

/** The layout as registration reads it: the editor's door sides become locks and barriers */
const asRegistered = (temple: TempleLayout): TempleLayout => ({
  ...temple,
  rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
});

/** Each JSON dressed once, under the Storm plan as a stand-in */
const dressed = new Map<string, DressedTemple>();
const dressedIn = (id: string): DressedTemple => {
  const known = dressed.get(id);
  if (known) return known;
  const made = dressDungeon(loadDungeon(id), { ...CLASSIC_PLANS["storm-temple"], name: `${id} (in memory)` });
  dressed.set(id, made);
  return made;
};

// --- the converted dungeon, read on its own --------------------------------------------------------------------

/**
 * The converted dungeon as a graph, locks ignored: every side but a wall a way through, stairs both ways (each end
 * names the other), holes and warps one way, from their own cell to their landing, as LTTP's floors and warp tiles go
 */
const jsonGraph = (dungeon: ClassicDungeon): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  const cells = new Set(dungeon.floors.flatMap((level) => level.cells.map((cell) => keyOf({ floor: level.name, row: cell.row, col: cell.col }))));
  for (const level of dungeon.floors) {
    for (const cell of level.cells) {
      const here = keyOf({ floor: level.name, row: cell.row, col: cell.col });
      const ways = DIRS.filter((dir) => cell.sides[dir] !== "wall").map((dir) => keyOf({ floor: level.name, row: cell.row + STEP[dir][0], col: cell.col + STEP[dir][1] }));
      const links = [cell.stairs, cell.hole, cell.teleport].filter(Boolean).map((link) => keyOf({ floor: link!.to, row: link!.row, col: link!.col }));
      out.set(here, [...ways, ...links].filter((key) => cells.has(key)));
    }
  }
  return out;
};

const reachedFrom = (graph: Map<string, string[]>, start: string, blocked: string): Set<string> => {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    for (const next of graph.get(queue.shift()!) ?? []) {
      const isNew = !seen.has(next) && next !== blocked;
      if (isNew) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

/** The fight of each must-clear LTTP room (a screen shuts or drops a key, and it has enemies): its screen with the most enemies, first in floor and reading order */
const mustClearFights = (dungeon: ClassicDungeon): At[] => {
  const most = new Map<string, { at: At; enemies: number }>();
  const sealed = new Set<string>();
  for (const level of dungeon.floors) {
    for (const cell of [...level.cells].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const isMore = cell.enemies > (most.get(cell.room)?.enemies ?? 0);
      if (isMore) most.set(cell.room, { at: { floor: level.name, row: cell.row, col: cell.col }, enemies: cell.enemies });
      const shutsOrDrops = Boolean(cell.shutter) || Boolean(cell.keyDrop);
      if (shutsOrDrops) sealed.add(cell.room);
    }
  }
  return [...most.entries()].filter(([room]) => sealed.has(room)).map(([, fight]) => fight.at);
};

/** The must-clear fights the boss cannot be reached without, in the converted dungeon */
const sealsOnTheWay = (dungeon: ClassicDungeon): At[] => {
  const graph = jsonGraph(dungeon);
  const cells = dungeon.floors.flatMap((level) => level.cells.map((cell) => ({ at: { floor: level.name, row: cell.row, col: cell.col }, cell })));
  const entrance = keyOf(cells.find(({ cell }) => cell.entrance)!.at);
  const boss = keyOf(cells.find(({ cell }) => cell.boss)!.at);
  return mustClearFights(dungeon).filter((fight) => !reachedFrom(graph, entrance, keyOf(fight)).has(boss));
};

// --- the dressed temple ------------------------------------------------------------------------------------------

interface Dressed {
  graph: TempleGraph;
  rooms: (at: At) => Room | undefined;
  boss: string;
  /** Where the fight converted at a cell stands now */
  fightFrom: (cell: At) => At | undefined;
  /** The sealed fights, by where they stand now */
  sealed: Set<string>;
}

const readDressed = (id: string): Dressed => {
  const { temple, report } = dressedIn(id);
  const maze = temple.maze as Record<string, string[][]>;
  const all = temple.rooms as Record<string, Room>;
  const rooms = (at: At): Room | undefined => all[maze[at.floor]?.[at.row]?.[at.col]];
  const graph = buildTempleGraph(asRegistered(temple));
  const boss = [...graph.rooms.values()].find((room) => room.kind === "boss")!.key;
  const fightFrom = (cell: At): At | undefined => report.placements.find((entry) => (entry.type === "monster" || entry.type === "miniboss") && entry.origin && sameCell(entry.origin, cell))?.at;
  const sealed = new Set(report.placements.filter((entry) => (entry.type === "monster" || entry.type === "miniboss") && rooms(entry.at)?.content?.lockOnEnter).map((entry) => keyOf(entry.at)));
  return { graph, rooms, boss, fightFrom, sealed };
};

/** The doors a link takes into a room (a flight, a circle, a fall): closed when asking what reaches it on foot */
const arrivalsInto = (graph: TempleGraph, key: string): Set<string> => new Set(graph.doors.filter((door) => door.to === key && door.kind !== "door").map((door) => door.id));

const reachedOnFootWithout = (graph: TempleGraph, key: string, blocked: string): boolean => reachableFrom(graph, graph.entrance!, new Set([blocked]), arrivalsInto(graph, key)).includes(key);

/**
 * Rooms reached from `start` with nothing in hand: doors a key or a Bomb opens are shut, and no sealed fight or boss is
 * entered; `onFoot` keeps to walking doors (no flight, circle or fall)
 */
const reachedEmptyHanded = (dressedTemple: Dressed, start: string, onFoot = false): Set<string> => {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    for (const door of dressedTemple.graph.out.get(queue.shift()!) ?? []) {
      const isWay = !onFoot || door.kind === "door";
      const isOpen = isWay && door.lock === "none" && !dressedTemple.sealed.has(door.to) && door.to !== dressedTemple.boss;
      const isNew = isOpen && !seen.has(door.to);
      if (isNew) {
        seen.add(door.to);
        queue.push(door.to);
      }
    }
  }
  return seen;
};

/** The rooms the dressing added of its own accord (not something moved out of a cell) */
const ADDED_OF_ITS_OWN = new Set(["landing circle", "circle back from the boss", "Bomb chest", "shop", "antechamber"]);
/** What must stay before its lock when it leaves its cell (the lead's ruling): a key, the Big Key, the map, the compass, the Big Chest */
const KEPT_IN_REACH = new Set(["small-key chest", "pot key", "big-key chest", "map chest", "compass chest", "big-chest"]);

/**
 * Whether a room stands in front of a sealed fight: it opens on the fight alone, or only on the fight and rooms of its
 * entry side (walked to from the fight's doors with nothing in hand, and reached from the entrance without the fight)
 */
const standsInFront = (dressedTemple: Dressed, room: string, fight: string): boolean => {
  const before = new Set(reachableFrom(dressedTemple.graph, dressedTemple.graph.entrance!, new Set([fight])));
  const entrySide = [...reachedEmptyHanded(dressedTemple, fight, true)].filter((key) => before.has(key));
  const opensOn = (dressedTemple.graph.out.get(room) ?? []).filter((door) => door.kind === "door").map((door) => door.to);
  return opensOn.length > 0 && opensOn.every((key) => key === fight || entrySide.includes(key));
};

/** A flight or a circle whose other end (the twin flight, the circle it rides to and back from) the hero reaches without the fight */
const arrivesFromBefore = (dressedTemple: Dressed, room: string, fight: string): boolean => {
  const ends = (dressedTemple.graph.out.get(room) ?? []).filter((door) => door.kind === "stairs" || door.kind === "teleport").map((door) => door.to);
  const before = new Set(reachableFrom(dressedTemple.graph, dressedTemple.graph.entrance!, new Set([fight])));
  return ends.some((key) => before.has(key));
};

describe("the classic JSONs, dressed in memory under the stand-in plan", () => {
  it("are every JSON the converter wrote, the shipped classic temples among them", () => {
    const written = readdirSync(join(process.cwd(), DUNGEON_DIR)).filter((name) => name.endsWith(".json")).map((name) => name.replace(/\.json$/, ""));
    expect([...written].sort()).toEqual([...ALL_NINE].sort());
    expect(ALL_NINE).toEqual(expect.arrayContaining(CLASSIC_IDS));
  });

  describe.each(ALL_NINE)("%s", (id) => {
    const dungeon = loadDungeon(id);
    const { report } = dressedIn(id);
    const temple = readDressed(id);

    it("keeps every must-clear fight that blocks the boss in its dungeon between the hero and the boss", () => {
      const seals = sealsOnTheWay(dungeon);
      const lost = seals.filter((seal) => {
        const now = temple.fightFrom(seal);
        return !now || reachableFrom(temple.graph, temple.graph.entrance!, new Set([keyOf(now)])).includes(temple.boss);
      });
      expect({ id, lost: lost.map(keyOf) }).toEqual({ id, lost: [] });
    });

    it("puts whatever leaves a sealed fight's cell where the hero walks only through that fight, or in front of it when a link brings the hero in", () => {
      for (const move of report.moves.filter((entry) => !ADDED_OF_ITS_OWN.has(entry.what) && temple.sealed.has(keyOf(entry.from)))) {
        const [fight, room] = [keyOf(move.from), keyOf(move.to)];
        // Handed out by the fight itself (a boxed-in fight's drops), or a flight or a circle that LTTP landed the hero in the fight by
        const isHandedOut = room === fight;
        const facesTheFight = !isHandedOut && arrivesFromBefore(temple, room, fight);
        const placed = isHandedOut || (facesTheFight ? standsInFront(temple, room, fight) : !reachedOnFootWithout(temple.graph, room, fight));
        expect({ what: move.what, fight, room, facesTheFight, placed }).toEqual({ what: move.what, fight, room, facesTheFight, placed: true });
      }
    });

    it("lands a warp onto a sealed fight in front of it: beside the fight, or beside a room on its entry side", () => {
      for (const move of report.moves.filter((entry) => entry.what === "landing circle" && temple.sealed.has(keyOf(entry.from)))) {
        const [fight, landing] = [keyOf(move.from), keyOf(move.to)];
        expect({ fight, landing, inFront: standsInFront(temple, landing, fight) }).toEqual({ fight, landing, inFront: true });
      }
    });

    it("sells on the entrance floor before any key, Bomb or seal", () => {
      const shops = report.placements.filter((entry) => entry.type === "shop");
      expect(shops).toHaveLength(1);
      const entrance = temple.graph.rooms.get(temple.graph.entrance!)!;
      expect({ floor: shops[0].at.floor, reached: reachedEmptyHanded(temple, temple.graph.entrance!).has(keyOf(shops[0].at)) }).toEqual({ floor: entrance.ref.floor, reached: true });
    });

    it("lists a dropped warp under dropped alone: every move lands on the thing it moved", () => {
      for (const move of report.moves) expect({ what: move.what, to: keyOf(move.to), type: temple.rooms(move.to)?.type }).not.toMatchObject({ type: "empty" });
    });

    it("hands out every chest and key of its dungeon exactly once, a boxed-in fight's drops among them", () => {
      const all = Object.values(dressedIn(id).temple.rooms as Record<string, Room>);
      const cells = dungeon.floors.flatMap((level) => level.cells);
      const relic = CLASSIC_PLANS["storm-temple"].relic;
      const holding = (item: string): number => all.filter((room) => grantedDungeonItems(room).includes(item)).length;
      const goldOf = (room: Room): number => Number(room.type === "loot" && room.content?.chest === "gold" ? room.content.gold : 0) + Number(roomDrops(room)?.gold ?? 0);
      const handedOut = {
        map: holding("map"),
        compass: holding("compass"),
        bossKey: all.filter(grantsBossKey).length,
        relic: all.filter((room) => (room.type === "loot" && room.content?.dungeon === relic) || roomDrops(room)?.dungeon === relic).length,
        smallKeys: all.reduce((sum, room) => sum + smallKeysGranted(room), 0),
        gold: all.reduce((sum, room) => sum + goldOf(room), 0),
      };
      expect(handedOut).toEqual({
        map: cells.filter((cell) => cell.chest === "map").length,
        compass: cells.filter((cell) => cell.chest === "compass").length,
        bossKey: cells.filter((cell) => cell.chest === "big-key" || cell.keyDrop === "big").length,
        relic: cells.filter((cell) => cell.chest === "big-chest").length,
        smallKeys: cells.filter((cell) => cell.chest === "small-key" || cell.keyDrop === "small" || cell.potKey).length,
        gold: 25 * cells.filter((cell) => cell.chest === "other").length,
      });
    });

    it("keeps a key, the Big Key, the map, the compass or the Big Chest that left its cell within reach of that cell with nothing in hand", () => {
      for (const move of report.moves.filter((entry) => KEPT_IN_REACH.has(entry.what))) {
        const reached = reachedEmptyHanded(temple, keyOf(move.from)).has(keyOf(move.to));
        expect({ what: move.what, from: keyOf(move.from), to: keyOf(move.to), reached }).toEqual({ what: move.what, from: keyOf(move.from), to: keyOf(move.to), reached: true });
      }
    });
  });

  it("Moon: the flight out of the 5F Frozen Over fight up to Agahnim opens on that fight alone", () => {
    const { report } = dressedIn("moon-temple");
    const temple = readDressed("moon-temple");
    const fight = temple.fightFrom({ floor: "5F", row: 2, col: 0 })!;
    const flight = report.placements.find((entry) => entry.type === "stairs-up" && entry.origin && sameCell(entry.origin, { floor: "5F", row: 2, col: 0 }))!;
    expect(Math.abs(flight.at.row - fight.row) + Math.abs(flight.at.col - fight.col)).toBe(1);
    const open = DIRS.filter((dir) => temple.rooms(flight.at)?.sides?.[dir] !== "wall").map((dir) => keyOf({ floor: flight.at.floor, row: flight.at.row + STEP[dir][0], col: flight.at.col + STEP[dir][1] }));
    expect(open).toEqual([keyOf(fight)]);
  });

  it("Water: the entrance's key chest waits beside the locked flight it opens, never behind it", () => {
    const { report } = dressedIn("water-temple");
    const temple = readDressed("water-temple");
    const chest = report.moves.find((entry) => entry.what === "small-key chest" && sameCell(entry.from, { floor: "1F", row: 0, col: 8 }))!;
    expect(Math.abs(chest.to.row - 0) + Math.abs(chest.to.col - 8)).toBe(1);
    expect(reachedEmptyHanded(temple, temple.graph.entrance!).has(keyOf(chest.to))).toBe(true);
  });

  it("Earth: the warp from the West Lobby lands in front of the East Lobby fight, which still guards Skull Woods' third section", () => {
    const temple = readDressed("earth-temple");
    const fight = temple.fightFrom({ floor: "1F", row: 4, col: 2 })!;
    expect(reachableFrom(temple.graph, temple.graph.entrance!, new Set([keyOf(fight)])).includes(temple.boss)).toBe(false);
  });
});

/**
 * What the tool makes of each JSON under the stand-in plan, pinned per temple (builds, solves, the solver's exact
 * reasons, the audit's missing names). Task 8 flips each line to clean as it dresses that temple with its own plan;
 * any regression of the tool turns a line red. The Wind JSON is the Eagle (Zelda 1): no Big Key, so no Boss Key chest
 * under any plan. The R4 notes are the mini-boss of each plan, still to choose.
 */
describe("every classic JSON, dressed in memory under the stand-in plan", () => {
  const PINNED: Record<string, { solvable: boolean; reasons: string[]; audit: string[] }> = {
    "wind-temple": {
      solvable: false,
      audit: ["Boss Key"],
      reasons: [
        "R2: the master key is out of reach after opening 1F (5,2) entrance -> 1F (4,2) monster, then 1F (1,2) monster -> 1F (0,2) miniboss, then 1F (0,2) miniboss -> 1F (0,1) puzzle, then 1F (2,2) loot -> 1F (2,3) loot, then 1F (3,1) monster -> 1F (2,1) monster: 1 key in hand, no locked door in reach",
        "R4: no master key",
      ],
    },
    "earth-temple": { solvable: true, audit: [], reasons: [] },
    "light-temple": { solvable: true, audit: [], reasons: [] },
    // The entrance's key chest waits beside the locked flight it opens (it took the Swamp Attic, behind that flight, before)
    "water-temple": { solvable: true, audit: [], reasons: ["R4: the master key at B1 (5,2) loot can be reached without passing the mini-boss"] },
    "shadow-temple": { solvable: true, audit: [], reasons: ["R4: the master key at 1F (4,0) loot can be reached without passing the mini-boss"] },
    "ice-temple": { solvable: true, audit: [], reasons: ["R4: the master key at B1 (0,3) loot can be reached without passing the mini-boss"] },
    "fire-temple": { solvable: true, audit: [], reasons: ["R4: the master key at B1 (3,1) loot can be reached without passing the mini-boss"] },
    "moon-temple": { solvable: true, audit: [], reasons: ["R4: the master key at B2 (0,1) loot can be reached without passing the mini-boss"] },
  };

  describe.each(Object.keys(PINNED))("%s", (id) => {
    it("builds, and solves exactly as pinned", () => {
      const { temple } = dressedIn(id);
      const verdict = solveTemple(asRegistered(temple));
      expect({ solvable: verdict.solvable, reasons: verdict.reasons, audit: missingNames(auditTemple(temple)) }).toEqual(PINNED[id]);
    });
  });
});

/**
 * The tool on the two temples that follow Storm (Task 8 writes their plans and modules): their JSON dressed in memory
 * under a stand-in plan must build, clear the solver and the audit, and keep the Boss Key between the hero and the
 * boss. A boss reached by a fall (both) lands the hero beside him, and the ride back lands beside the room they fell
 * from.
 */
describe("the next temples, dressed in memory", () => {
  describe.each(["earth-temple", "ice-temple"])("%s", (id) => {
    const dungeon = loadDungeon(id);
    const { temple, report } = dressedIn(id);
    const layout = asRegistered(temple);

    it("builds, clears the solver and the audit", () => {
      const verdict = solveTemple(layout);
      expect(verdict.solvable).toBe(true);
      expect(verdict.reasons.filter((reason) => reason.startsWith("R1"))).toEqual([]);
      const audit = auditTemple(temple);
      expect(missingNames(audit)).toEqual([]);
      expect(audit.passed).toBe(true);
    });

    it("needs the Boss Key to reach the boss", () => {
      const keyless: TempleLayout = { ...layout, rooms: Object.fromEntries(Object.entries(layout.rooms).map(([token, room]) => [token, grantsBossKey(room) ? { ...room, content: { chest: "gold", gold: 1 } } : room])) };
      expect(solveTemple(keyless).solvable).toBe(false);
    });

    it("lands the fall onto the boss beside him and rides back beside the room the hero fell from", () => {
      const cells = dungeon.floors.flatMap((level) => level.cells.map((cell) => ({ floor: level.name, cell })));
      const boss = cells.find(({ cell }) => cell.boss)!;
      const falls = cells.filter(({ cell }) => cell.hole && cell.hole.to === boss.floor && cell.hole.row === boss.cell.row && cell.hole.col === boss.cell.col);
      expect(falls.length).toBeGreaterThanOrEqual(1);
      const antechamber = report.placements.find((entry) => entry.type === "teleport" && entry.at.floor === boss.floor)!;
      const rooms = temple.rooms as Record<string, Room>;
      const maze = temple.maze as Record<string, string[][]>;
      const back = rooms[maze[antechamber.at.floor][antechamber.at.row][antechamber.at.col]].content!;
      const landing = { floor: String(back.targetLevel), row: Number(back.targetCoords?.y), col: Number(back.targetCoords?.x) };
      const [fall] = falls;
      const at = { floor: fall.floor, row: fall.cell.row, col: fall.cell.col };
      const shift = report.shifted.find((entry) => entry.floor === fall.floor) ?? { rows: 0, cols: 0 };
      const source = report.compacted.find((entry) => sameCell(entry.from, at))?.to ?? { floor: at.floor, row: at.row - shift.rows, col: at.col - shift.cols };
      expect(landing.floor).toBe(source.floor);
      expect(Math.abs(landing.row - source.row) + Math.abs(landing.col - source.col)).toBeLessThanOrEqual(2);
    });
  });
});

describe("the converted dungeons' own seals", () => {
  it("are read from the JSON alone: Earth's East Lobby and Moon's Frozen Over block their bosses", () => {
    const earth = sealsOnTheWay(loadDungeon("earth-temple")).map(keyOf);
    const moon = sealsOnTheWay(loadDungeon("moon-temple")).map(keyOf);
    expect(earth).toContain("1F:4,2");
    expect(moon).toContain("5F:2,0");
    expect(roomKey({ floor: "1F", row: 4, col: 2 })).toBe("1F:4,2");
  });
});
