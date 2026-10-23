/**
 * The classic dungeon temples: each `src/lib/engine/temples/<id>.ts` in CLASSIC_IDS is exactly what the dress step
 * (tools/temples/classic/dress.ts) writes from its JSON (tools/temples/classic/dungeons/<id>.json), and the dressing
 * keeps to the rules of the design (docs/superpowers/specs/2026-10-18-classic-dungeon-temples-design.md, "Dressing"):
 * every converted cell is a room at the same place, every side follows the side table, one fight per LTTP room, a
 * seal on every must-clear room, distinct theme beasts in the must-clear rooms and repeats of them in the side rooms,
 * key drops in `drops`, the Boss door on every way into the boss, and a temple the audit and the solver both clear with
 * no wall blown by hand. A converted cell here is the JSON's as the plan has it (asPlanned: the sides it opens open) or
 * one of the plan's own rooms (Wind's owner's four). The rules are checked on hand-made dungeons in
 * ClassicDress(Eagle).spec.ts, the JSONs' guards in ClassicDungeonGuards, the Storm and Wind Temples in their own specs.
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { ClassicCell, ClassicDungeon, ClassicSide } from "../../tools/temples/classic/classicDungeon";
import { CLASSIC_IDS, CLASSIC_PLANS, asPlanned, classicReport, dressClassic, loadDungeon, renderClassicModule } from "../../tools/temples/classic/dress";
import type { ClassicPlacement } from "../../tools/temples/classic/dress";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, reachableFrom, roomKey, solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { climbLockOf, lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { roomDrops } from "@/lib/services/temples/fightDrops";
import { grantedDungeonItems, grantsBossKey, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";

const DIRS = ["north", "east", "south", "west"] as const;
type Dir = (typeof DIRS)[number];
const OPPOSITE: Record<Dir, Dir> = { north: "south", south: "north", east: "west", west: "east" };
const STEP: Record<Dir, [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };
const FIGHTS = ["monster", "miniboss", "boss"];

/**
 * The side table of the design: what each converted side is drawn as (a small-key side is `locked` on one end only;
 * a big-key side is the Boss lock into the boss room and a plain door between two ordinary rooms)
 */
const SIDE_RULE: Record<ClassicSide, string[]> = {
  open: ["door"],
  shutter: ["door"],
  item: ["door"],
  "small-key": ["locked", "door"],
  "big-key": ["masterlocked", "door"],
  bomb: ["bombable"],
  wall: ["wall"],
};

const sameCell = (a: { floor: string; row: number; col: number }, b: { floor: string; row: number; col: number }): boolean => a.floor === b.floor && a.row === b.row && a.col === b.col;

/** The layout as registration reads it: the editor's door sides become locks and barriers */
const asRegistered = (temple: TempleLayout): TempleLayout => ({
  ...temple,
  rooms: Object.fromEntries(Object.entries(temple.rooms).map(([token, room]) => [token, lockedFromSides(room)])),
});

const starterBeasts = new Set(STARTER_QUESTS.map((quest) => quest.beastId).filter(Boolean));
const slugOf = (beastId: string): string => beastId.replace(/^beast-/, "");

describe("the classic dungeon temples", () => {
  it("are dressed from a JSON and a plan each", () => {
    expect(CLASSIC_IDS.length).toBeGreaterThanOrEqual(1);
    expect(CLASSIC_IDS).toContain("storm-temple");
    for (const id of CLASSIC_IDS) {
      expect(CLASSIC_PLANS[id]).toBeDefined();
      expect(loadDungeon(id).id).toBe(id);
    }
  });

  describe.each(CLASSIC_IDS)("%s", (id) => {
    const plan = CLASSIC_PLANS[id];
    const dungeon: ClassicDungeon = asPlanned(loadDungeon(id), plan); // the converter's cells as the plan has them, and its own rooms
    const temple = dressClassic(id);
    const report = classicReport(id);
    const maze = temple.maze as Record<string, string[][]>;
    const rooms = temple.rooms as Record<string, Room>;
    const theme = id.replace("-temple", "");
    const cells = dungeon.floors.flatMap((level) => level.cells.map((cell) => ({ floor: level.name, cell })));
    const roomAt = (floor: string, row: number, col: number): Room | undefined => rooms[maze[floor]?.[row]?.[col]];
    const placed = (where: { floor: string; row: number; col: number }) => report.placements.find((entry) => entry.at.floor === where.floor && entry.at.row === where.row && entry.at.col === where.col);
    /**
     * Where a converted cell stands now: its own place less its floor's shift (empty leading rows and columns cut), unless
     * it was a far-off island the dressing moved next to the floor's used cells
     */
    const nowAt = (floor: string, row: number, col: number): { floor: string; row: number; col: number } => {
      const moved = report.compacted.find((entry) => sameCell(entry.from, { floor, row, col }))?.to;
      const shift = report.shifted.find((entry) => entry.floor === floor) ?? { rows: 0, cols: 0 };
      return moved ?? { floor, row: row - shift.rows, col: col - shift.cols };
    };
    const bossCell = cells.find(({ cell }) => cell.boss)!;
    const bossAt = nowAt(bossCell.floor, bossCell.cell.row, bossCell.cell.col);
    const byRoom = (name: string): ClassicPlacement[] => report.placements.filter((entry) => entry.room === name);
    const lttpRooms = [...new Set(cells.map(({ cell }) => cell.room))];
    const cellsOf = (name: string): ClassicCell[] => cells.filter(({ cell }) => cell.room === name).map(({ cell }) => cell);
    /** An LTTP room is must-clear when a cell of it shuts its doors or drops a key, and it has enemies to beat */
    const isMustClearRoom = (name: string): boolean => cellsOf(name).some((cell) => cell.shutter || cell.keyDrop) && cellsOf(name).some((cell) => cell.enemies > 0);
    const fightOf = (name: string): ClassicPlacement | undefined => byRoom(name).find((entry) => FIGHTS.includes(entry.type));
    const roomOf = (entry: ClassicPlacement): Room => roomAt(entry.at.floor, entry.at.row, entry.at.col)!;
    const layout = asRegistered(temple);
    const graph = buildTempleGraph(layout);
    const verdict = solveTemple(layout);

    it("is exactly what tools/temples/classic/dress.ts writes from its JSON", () => {
      const file = readFileSync(join(__dirname, "../../src/lib/engine/temples", `${id}.ts`), "utf8");
      expect(file).toBe(renderClassicModule(id, temple));
      expect(file).toContain("tools/temples/classic/dress.ts");
      expect(file).toContain(dungeon.source);
    });

    it("keeps every converted cell as a room at the same place on a floor of the same name (a far-off island moves beside the floor's used cells), and enters on 1F", () => {
      expect(Object.keys(maze)).toEqual(dungeon.floors.map((level) => level.name));
      for (const { floor, cell } of cells) {
        const here = nowAt(floor, cell.row, cell.col);
        const room = roomAt(here.floor, here.row, here.col);
        expect({ at: `${floor} (${cell.row},${cell.col})`, type: room?.type ?? "missing" }).not.toMatchObject({ type: expect.stringMatching(/^(missing|wall)$/) });
      }
      for (const moved of report.compacted) {
        const island = cells.find(({ floor, cell }) => sameCell({ floor, row: cell.row, col: cell.col }, moved.from))!;
        expect(DIRS.every((dir) => island.cell.sides[dir] === "wall")).toBe(true);
        expect(moved.to.floor).toBe(moved.from.floor);
      }
      const entrance = cells.find(({ cell }) => cell.entrance)!;
      expect(entrance.floor).toBe("1F");
      const entranceAt = nowAt("1F", entrance.cell.row, entrance.cell.col);
      expect(temple.entrance).toEqual([Object.keys(maze).indexOf("1F"), entranceAt.row, entranceAt.col]);
      expect(roomAt("1F", entranceAt.row, entranceAt.col)?.type).toBe("entrance");
    });

    it("draws every side by the side table: doors, one-ended small locks, Boss locks, cracked walls and walls", () => {
      for (const { floor, cell } of cells) {
        const here = nowAt(floor, cell.row, cell.col);
        const room = roomAt(here.floor, here.row, here.col)!;
        for (const dir of DIRS) {
          const drawn = room.sides?.[dir] ?? "door";
          const [dr, dc] = STEP[dir];
          const there = { floor: here.floor, row: here.row + dr, col: here.col + dc };
          const beyond = roomAt(there.floor, there.row, there.col);
          const beyondPlacement = placed(there);
          const where = `${floor} (${cell.row},${cell.col}) ${dir}: ${cell.sides[dir]}`;
          // A wall the dressing grew a room behind is a door to it (or the Boss door); every other side keeps the table
          const isGrownBehind = cell.sides[dir] === "wall" && Boolean(beyondPlacement?.grown);
          const isIntoBoss = beyond?.type === "boss" || room.type === "boss";
          const allowed = isGrownBehind ? ["door", "masterlocked", "wall"] : isIntoBoss && cell.sides[dir] !== "wall" ? ["masterlocked"] : SIDE_RULE[cell.sides[dir]];
          expect({ where, drawn: allowed.includes(drawn) ? "ok" : drawn }).toEqual({ where, drawn: "ok" });
          // A small-key door into the boss (Zelda 1 keys the Eagle's so) is his Boss door, held to it just above
          const isSmallLock = cell.sides[dir] === "small-key" && !isIntoBoss;
          if (isSmallLock) {
            const facing = beyond?.sides?.[OPPOSITE[dir]];
            expect({ where, ends: [drawn, facing].sort() }).toEqual({ where, ends: ["door", "locked"] });
          }
          // The Boss lock stays on the boss's doors; between two ordinary rooms a Big-Key door is a plain door, and listed
          const isBigKey = cell.sides[dir] === "big-key";
          if (isBigKey) {
            const touchesBoss = sameCell(here, bossAt) || sameCell(there, bossAt);
            expect({ where, drawn }).toEqual({ where, drawn: touchesBoss ? "masterlocked" : "door" });
            const isListed = report.plainBigKeyDoors.some((door) => (sameCell(door.at, here) && door.direction === dir) || (sameCell(door.at, there) && door.direction === OPPOSITE[dir]));
            expect({ where, listed: isListed }).toEqual({ where, listed: !touchesBoss });
          }
        }
      }
    });

    it("drops through every hole of its dungeon exactly once, where the dungeon says (a fall onto the boss lands beside him, behind the Boss door)", () => {
      for (const { floor, cell } of cells.filter(({ cell }) => cell.hole)) {
        const pits = report.placements.filter((entry) => entry.type === "pit" && entry.origin && sameCell(entry.origin, { floor, row: cell.row, col: cell.col }));
        expect({ at: `${floor} (${cell.row},${cell.col})`, pits: pits.length }).toEqual({ at: `${floor} (${cell.row},${cell.col})`, pits: 1 });
        const content = roomOf(pits[0]).content!;
        const link = cell.hole!;
        expect(content.targetLevel).toBe(link.to);
        const landing = { floor: String(content.targetLevel), row: Number(content.targetCoords?.y), col: Number(content.targetCoords?.x) };
        const landsOnBoss = sameCell(nowAt(link.to, link.row, link.col), bossAt);
        if (landsOnBoss) {
          expect(Math.abs(landing.row - bossAt.row) + Math.abs(landing.col - bossAt.col)).toBe(1);
          const toward = DIRS.find((dir) => landing.row + STEP[dir][0] === bossAt.row && landing.col + STEP[dir][1] === bossAt.col)!;
          expect(roomAt(landing.floor, landing.row, landing.col)?.sides?.[toward]).toBe("masterlocked");
        } else {
          expect(landing).toEqual(nowAt(link.to, link.row, link.col));
        }
      }
    });

    it("names a landing on a stairs room of the opposite kind for every flight", () => {
      const flights = report.placements.filter((entry) => /^stairs-/.test(entry.type));
      // One flight per stairway of the dungeon (Skull Woods has none: its basement is reached by a fall)
      expect(flights).toHaveLength(cells.filter(({ cell }) => cell.stairs).length);
      for (const flight of flights) {
        const content = roomOf(flight).content!;
        const landing = roomAt(String(content.targetLevel), Number(content.targetCoords?.y), Number(content.targetCoords?.x));
        expect({ at: flight.at, lands: landing?.type }).toEqual({ at: flight.at, lands: flight.type === "stairs-up" ? "stairs-down" : "stairs-up" });
      }
    });

    /** The converted cells the JSON reaches from the entrance, never entering `blocked` (locks ignored, stairs both ways, holes and warps one way) */
    const jsonReach = (blocked: ReadonlySet<string>): Set<string> => {
      const byKey = new Map(cells.map((entry) => [roomKey({ floor: entry.floor, row: entry.cell.row, col: entry.cell.col }), entry]));
      const start = cells.find(({ cell }) => cell.entrance)!;
      const seen = new Set([roomKey({ floor: start.floor, row: start.cell.row, col: start.cell.col })]);
      const queue = [...seen];
      while (queue.length) {
        const { floor, cell } = byKey.get(queue.shift()!)!;
        const ways = DIRS.filter((dir) => cell.sides[dir] !== "wall").map((dir) => ({ floor, row: cell.row + STEP[dir][0], col: cell.col + STEP[dir][1] }));
        const links = [cell.stairs, cell.hole, cell.teleport].filter((link) => Boolean(link)).map((link) => ({ floor: link!.to, row: link!.row, col: link!.col }));
        for (const next of [...ways, ...links].map(roomKey)) {
          const isNew = byKey.has(next) && !seen.has(next) && !blocked.has(next);
          if (isNew) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      return seen;
    };

    // The Palace of Darkness's Middle Cage opens both its screens on the lobby: its second screen and the stairs in it
    // are reached without the fight in the JSON itself, so the dressed temple is held to the JSON, not to a sealed room
    it("seals a many-screen must-clear room at the screen that fights: blocking that screen opens no more of the dungeon around the room than the JSON does", () => {
      // The converted cell each room stands for: its own, or for a room added to hold what moved, the cell it left (a room added of its own, its origin itself, stands for none)
      const movedInto = report.placements.filter((entry) => entry.grown && entry.origin && !sameCell(entry.origin, entry.at)).map((entry) => [roomKey(entry.at), roomKey(entry.origin!)] as const);
      const convertedOf = new Map([...cells.map(({ floor, cell }) => [roomKey(nowAt(floor, cell.row, cell.col)), roomKey({ floor, row: cell.row, col: cell.col })] as const), ...movedInto]);
      const dressedReach = (blocked: Set<string>): Set<string> =>
        new Set(reachableFrom(graph, graph.entrance!, blocked).flatMap((key) => (convertedOf.has(key) ? [convertedOf.get(key)!] : [])));
      for (const name of lttpRooms.filter(isMustClearRoom)) {
        const screens = cells.filter(({ cell }) => cell.room === name);
        const isOneScreen = screens.length === 1;
        if (isOneScreen) continue;
        const own = screens.map(({ floor, cell }) => roomKey({ floor, row: cell.row, col: cell.col }));
        const fight = fightOf(name)!;
        const around = (withoutFight: Set<string>, withoutRoom: Set<string>): string[] => [...withoutFight].filter((key) => !withoutRoom.has(key) && !own.includes(key));
        const dressed = around(dressedReach(new Set([roomKey(fight.at)])), dressedReach(new Set(screens.map(({ floor, cell }) => roomKey(nowAt(floor, cell.row, cell.col))))));
        const converted = around(jsonReach(new Set([roomKey(fight.origin!)])), jsonReach(new Set(own)));
        expect({ room: name, beyond: dressed.filter((key) => !converted.includes(key)).sort() }).toEqual({ room: name, beyond: [] });
      }
    });

    it("holds at most one fight per LTTP room, in the screen with the most enemies", () => {
      for (const name of lttpRooms) {
        const fights = byRoom(name).filter((entry) => FIGHTS.includes(entry.type));
        expect({ room: name, fights: fights.length }).toEqual({ room: name, fights: Math.min(1, fights.length) });
        const most = Math.max(...cellsOf(name).map((cell) => cell.enemies));
        const hasFight = most > 0 && fights.length === 1;
        if (hasFight) expect(cellsOf(name).find((cell) => cell.row === fights[0].origin?.row && cell.col === fights[0].origin?.col)?.enemies).toBe(most);
      }
    });

    it("seals every must-clear room on entry, and every room the plan names as a mini-boss's, and no side room", () => {
      const named = plan.minibossRooms ?? [];
      for (const name of named) expect({ room: name, type: fightOf(name)?.type }).toEqual({ room: name, type: "miniboss" });
      for (const name of lttpRooms) {
        const fight = fightOf(name);
        const isFightless = !fight || fight.type === "boss";
        if (isFightless) continue;
        const sealed = roomOf(fight).content?.lockOnEnter === true;
        const isSealedRoom = isMustClearRoom(name) || named.includes(name);
        expect({ room: name, sealed }).toEqual({ room: name, sealed: isSealedRoom });
        const isSide = !isSealedRoom;
        if (isSide) expect({ room: name, type: fight.type }).toEqual({ room: name, type: "monster" });
      }
      expect(report.mustClear).toBe(report.placements.filter((entry) => entry.type === "monster" && roomOf(entry).content?.lockOnEnter).length);
    });

    it("gives the must-clear rooms distinct beasts of the theme, and the side rooms the beasts of their must-clear rooms", () => {
      const gated = report.placements.filter((entry) => FIGHTS.includes(entry.type) && roomOf(entry).content?.lockOnEnter);
      const gatedBeasts = gated.map((entry) => roomOf(entry).content!.quest!.beastId);
      const once = gatedBeasts.filter((beastId) => !report.repeats.includes(slugOf(beastId)));
      expect(new Set(once).size).toBe(once.length);
      for (const beastId of gatedBeasts) {
        const beast = BEAST_LIBRARY.find((entry) => entry.id === beastId);
        expect({ beastId, theme: beast?.theme }).toEqual({ beastId, theme });
      }
      const mustClearBeasts = new Set(gated.filter((entry) => entry.type === "monster").map((entry) => roomOf(entry).content!.quest!.beastId));
      const sides = report.placements.filter((entry) => entry.type === "monster" && !roomOf(entry).content?.lockOnEnter);
      for (const side of sides) {
        const beastId = roomOf(side).content!.quest!.beastId;
        const isOverflow = report.overflow.includes(slugOf(beastId)) && (starterBeasts.has(beastId) || Boolean(plan.keepsEveryChore));
        expect({ at: side.at, beastId, fromMustClear: mustClearBeasts.has(beastId) || isOverflow }).toEqual({ at: side.at, beastId, fromMustClear: true });
      }
      for (const slug of report.overflow) expect(starterBeasts.has(`beast-${slug}`) || Boolean(plan.keepsEveryChore)).toBe(true);
    });

    it("hands out every key drop in the fight's drops, and loses no chest, key, map, compass, Boss Key or relic", () => {
      for (const { floor, cell } of cells.filter(({ cell }) => cell.keyDrop)) {
        const fight = fightOf(cell.room)!;
        expect({ at: `${floor} (${cell.row},${cell.col})`, drops: roomOf(fight).content?.drops }).toEqual({
          at: `${floor} (${cell.row},${cell.col})`,
          drops: { chest: "dungeon", dungeon: cell.keyDrop === "big" ? "master-key" : "key" },
        });
      }
      const all = Object.values(rooms);
      const holding = (item: string) => all.filter((room) => grantedDungeonItems(room).includes(item)).length;
      expect(holding("map")).toBe(cells.filter(({ cell }) => cell.chest === "map").length);
      expect(holding("compass")).toBe(cells.filter(({ cell }) => cell.chest === "compass").length);
      expect(all.filter(grantsBossKey)).toHaveLength(1);
      // A fight boxed in on every side hands its cell's chests out as its drops (dressPlace): they count where they are handed out
      const relicChests = plan.relic ? all.filter((room) => (room.type === "loot" && room.content?.dungeon === plan.relic) || roomDrops(room)?.dungeon === plan.relic) : [];
      // A plan with no relic of its own (Wind's whistle is its Pegasus chest's prize) fills the Big Chest with its treasure
      const treasureChests = all.filter((room) => room.type === "loot" && Boolean(plan.treasure) && JSON.stringify(room.content?.items) === JSON.stringify(plan.treasure!.items));
      const bigChests = cells.filter(({ cell }) => cell.chest === "big-chest").length;
      expect({ relics: relicChests.length, treasures: treasureChests.length }).toEqual(plan.relic ? { relics: 1, treasures: 0 } : { relics: 0, treasures: bigChests });
      // The plan's relics beyond the first each take an `other` chest's gold
      const extraRelics = plan.extraRelics ?? [];
      for (const relic of extraRelics) expect({ relic, chests: all.filter((room) => grantedDungeonItems(room).includes(relic)).length }).toEqual({ relic, chests: 1 });
      const smallKeys = cells.filter(({ cell }) => cell.chest === "small-key" || cell.keyDrop === "small" || cell.potKey).length;
      expect(all.reduce((sum, room) => sum + smallKeysGranted(room), 0)).toBe(smallKeys);
      const goldOf = (room: Room): number => Number(room.type === "loot" && room.content?.chest === "gold" ? room.content.gold : 0) + Number(roomDrops(room)?.gold ?? 0);
      const treasureGold = plan.relic ? 0 : (plan.treasure?.gold ?? 0) * bigChests;
      expect(all.reduce((sum, room) => sum + goldOf(room), 0)).toBe(25 * (cells.filter(({ cell }) => cell.chest === "other").length - extraRelics.length) + treasureGold);
      expect(report.dropped.map((entry) => entry.what)).not.toEqual(expect.arrayContaining([expect.stringMatching(/chest|key|map|compass|relic/)]));
    });

    it("locks every way into the boss with the Boss Key, and the Pegasus waits right behind", () => {
      const boss = report.placements.find((entry) => entry.type === "boss")!;
      const bossRoom = roomOf(boss);
      let ways = 0;
      for (const dir of DIRS) {
        const [dr, dc] = STEP[dir];
        const beyond = roomAt(boss.at.floor, boss.at.row + dr, boss.at.col + dc);
        const isWay = beyond && beyond.type !== "wall" && bossRoom.sides?.[dir] !== "wall";
        if (!isWay) continue;
        ways += 1;
        expect({ dir, side: bossRoom.sides?.[dir], facing: beyond.sides?.[OPPOSITE[dir]] }).toEqual({ dir, side: "masterlocked", facing: "masterlocked" });
      }
      expect(ways).toBeGreaterThanOrEqual(2); // the way in and the Master Room
      const master = report.placements.filter((entry) => entry.type === "master");
      expect(master).toHaveLength(1);
      expect(Math.abs(master[0].at.row - boss.at.row) + Math.abs(master[0].at.col - boss.at.col)).toBe(1);
      expect(master[0].at.floor).toBe(boss.at.floor);
    });

    it("passes the audit and the solver with no wall blown by hand", () => {
      const audit = auditTemple(temple);
      expect(missingNames(audit)).toEqual([]);
      expect(audit.passed).toBe(true);
      expect(verdict.solvable).toBe(true);
      expect(verdict.reasons).toEqual([]);
    });

    it("needs the Boss Key to reach the boss", () => {
      const keyless: TempleLayout = { ...layout, rooms: Object.fromEntries(Object.entries(layout.rooms).map(([token, room]) => [token, grantsBossKey(room) ? { ...room, content: { chest: "gold", gold: 1 } } : room])) };
      const stuck = solveTemple(keyless);
      expect(stuck.solvable).toBe(false);
      expect(stuck.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/^R2: the master key is out of reach/)]));
    });

    it("lets the hero reach every chest and every fight from the entrance", () => {
      const reach = new Set(reachableFrom(graph, graph.entrance!));
      const wanted = report.placements.filter((entry) => FIGHTS.includes(entry.type) || ["loot", "key", "master"].includes(entry.type));
      for (const entry of wanted) {
        expect({ at: entry.at, type: entry.type, reached: reach.has(roomKey(entry.at)) }).toEqual({ at: entry.at, type: entry.type, reached: true });
      }
      expect(reach.size).toBe(graph.rooms.size);
    });

    it("gives a locked flight its own token and leaves its landing free to climb back", () => {
      const flights = report.placements.filter((entry) => /^stairs-/.test(entry.type) && climbLockOf(roomOf(entry)));
      const lockedLinks = cells.filter(({ cell }) => cell.stairs?.lock).length;
      expect(flights.length).toBeGreaterThanOrEqual(lockedLinks);
      for (const flight of flights) {
        const room = roomOf(flight);
        const uses = Object.values(maze).flat(2).filter((token) => token === flight.token).length;
        expect({ at: flight.at, uses }).toEqual({ at: flight.at, uses: 1 });
        const target = room.content!.targetCoords!;
        const landing = roomAt(room.content!.targetLevel!, Number(target.y), Number(target.x))!;
        expect({ at: flight.at, landing: landing.type, lock: climbLockOf(landing) }).toEqual({ at: flight.at, landing: expect.stringMatching(/^stairs-/), lock: undefined });
      }
    });

    it("has the mini-bosses of its plan, one boss with the registry's element and a template on every fight, and as many small keys as its dungeon", () => {
      const kinds = [...graph.rooms.values()];
      expect(kinds.filter((room) => room.kind === "miniboss")).toHaveLength(plan.minibosses.length);
      expect(kinds.filter((room) => room.kind === "boss")).toHaveLength(1);
      expect(kinds.find((room) => room.kind === "boss")!.room.content?.element).toBe(TEMPLE_METADATA[id].element);
      for (const room of kinds.filter((room) => FIGHTS.includes(room.kind))) expect(room.room.content?.quest?.beastId).toEqual(expect.any(String));
      const keys = kinds.reduce((sum, room) => sum + room.smallKeys, 0);
      expect(keys).toBe(dungeon.report.smallKeys);
      expect(keys).toBeGreaterThanOrEqual(graph.doors.filter((door) => door.lock === "small").length);
    });

    it("drops nothing but riddles and warps whose ride back would go around a seal, and every pit lies in a dead end", () => {
      expect(report.dropped.map((entry) => entry.what).filter((what) => what !== "puzzle" && what !== "teleport")).toEqual([]);
      for (const pit of report.placements.filter((entry) => entry.type === "pit")) {
        const open = DIRS.filter((dir) => roomOf(pit).sides?.[dir] !== "wall").length;
        expect({ at: pit.at, openSides: open }).toEqual({ at: pit.at, openSides: 1 });
      }
    });

    it("keeps every must-clear room that blocks the boss when warps ride one way: no kept warp opens a way around it", () => {
      const boss = [...graph.rooms.values()].find((room) => room.kind === "boss")!;
      const sealed = report.placements.filter((entry) => FIGHTS.includes(entry.type) && entry.type !== "boss" && roomOf(entry).content?.lockOnEnter).map((entry) => roomKey(entry.at));
      // LTTP's warps ride one way: a converted circle whose landing is no circle takes no ride back in the comparison
      const isCircleCell = (link: { to: string; row: number; col: number }) => cells.some(({ floor, cell }) => floor === link.to && cell.row === link.row && cell.col === link.col && Boolean(cell.teleport));
      const oneWayWarps = cells.filter(({ cell }) => cell.teleport && !isCircleCell(cell.teleport!));
      const warpRooms = new Set(oneWayWarps.flatMap(({ floor, cell }) => report.placements.filter((entry) => entry.type === "teleport" && entry.origin && sameCell(entry.origin, { floor, row: cell.row, col: cell.col })).map((entry) => roomKey(entry.at))));
      const rideBacks = new Set(graph.doors.filter((door) => door.kind === "teleport" && warpRooms.has(door.to)).map((door) => door.id));
      const blocks = (room: string, closed: Set<string>) => !reachableFrom(graph, graph.entrance!, new Set([room]), closed).includes(boss.key);
      for (const room of sealed) {
        const blocksOneWay = blocks(room, rideBacks);
        if (blocksOneWay) expect({ room, blocksTheBoss: blocks(room, new Set()) }).toEqual({ room, blocksTheBoss: true });
      }
    });

    it("reports what moved, what merged and what was dropped, each to or from a real cell, and no move to its own cell", () => {
      // A chest a boxed-in fight hands out stays in its cell, in the fight's drops: no move
      expect(report.moves.filter((move) => sameCell(move.from, move.to)).map((move) => `${move.what} ${roomKey(move.from)}`)).toEqual([]);
      for (const move of report.moves) {
        expect(roomAt(move.to.floor, move.to.row, move.to.col)?.type).not.toBe("wall");
        expect(roomAt(move.from.floor, move.from.row, move.from.col)?.type).not.toBe("wall");
      }
      for (const entry of [...report.dropped, ...report.merged]) expect(roomAt(entry.at.floor, entry.at.row, entry.at.col)?.type).not.toBe("wall");
      for (const entry of report.placements) expect(roomAt(entry.at.floor, entry.at.row, entry.at.col)?.type).toBe(entry.type);
    });
  });
});
