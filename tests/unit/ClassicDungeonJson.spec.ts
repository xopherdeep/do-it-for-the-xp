import fs from "fs";
import path from "path";
import type { ClassicCell, ClassicDungeon, ClassicFloor, ClassicSide } from "../../tools/temples/classic/classicDungeon";

/**
 * Every classic dungeon JSON written by tools/temples/classic/convert.py is a sound maze: cells fit their floor,
 * both ends of a side agree, the dungeon items are all there exactly once, every link lands on a real cell, a hall's
 * cells touch through open sides, the key count in the report is honest, and the hero can reach every cell from the
 * entrance (Review Focus 3). The Big Key and big chest checks only apply to LTTP sources: the Zelda 1 Eagle has none.
 */
const DUNGEON_DIR = path.resolve(__dirname, "../../tools/temples/classic/dungeons");
const LTTP_IDS = [
  "storm-temple",
  "earth-temple",
  "light-temple",
  "water-temple",
  "shadow-temple",
  "ice-temple",
  "fire-temple",
  "moon-temple",
];
const SIDES: ClassicSide[] = ["open", "small-key", "big-key", "bomb", "shutter", "item", "wall"];
const CHESTS = ["map", "compass", "big-key", "big-chest", "small-key", "other"];
const DIRS = ["north", "east", "south", "west"] as const;
type Dir = (typeof DIRS)[number];
const OPPOSITE: Record<Dir, Dir> = { north: "south", south: "north", east: "west", west: "east" };
const STEP: Record<Dir, [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

function loadDungeons(): ClassicDungeon[] {
  if (!fs.existsSync(DUNGEON_DIR)) return [];
  return fs
    .readdirSync(DUNGEON_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(DUNGEON_DIR, name), "utf8")) as ClassicDungeon);
}

const key = (floor: string, row: number, col: number) => `${floor}@${row},${col}`;

function cellIndex(dungeon: ClassicDungeon): Map<string, ClassicCell> {
  const index = new Map<string, ClassicCell>();
  for (const floor of dungeon.floors) {
    for (const cell of floor.cells) index.set(key(floor.name, cell.row, cell.col), cell);
  }
  return index;
}

function neighbour(floor: ClassicFloor, cell: ClassicCell, dir: Dir): ClassicCell | undefined {
  const [dr, dc] = STEP[dir];
  return floor.cells.find((other) => other.row === cell.row + dr && other.col === cell.col + dc);
}

function flatCells(dungeon: ClassicDungeon): { floor: ClassicFloor; cell: ClassicCell }[] {
  return dungeon.floors.flatMap((floor) => floor.cells.map((cell) => ({ floor, cell })));
}

const dungeons = loadDungeons();

describe("classic dungeon JSON", () => {
  it("has one JSON per LTTP temple", () => {
    const ids = dungeons.map((dungeon) => dungeon.id);
    expect(ids).toEqual(expect.arrayContaining(LTTP_IDS));
  });

  for (const dungeon of dungeons) {
    const isLttp = dungeon.source.startsWith("LTTP");
    const all = flatCells(dungeon);

    describe(dungeon.id, () => {
      it("names itself, its source and its floors bottom to top", () => {
        expect(dungeon.id).toMatch(/^[a-z]+-temple$/);
        expect(dungeon.source.length).toBeGreaterThan(0);
        expect(dungeon.floors.length).toBeGreaterThan(0);
        const names = dungeon.floors.map((floor) => floor.name);
        expect(new Set(names).size).toBe(names.length);
        expect(dungeon.report.cellsPerFloor).toEqual(
          Object.fromEntries(dungeon.floors.map((floor) => [floor.name, floor.cells.length]))
        );
      });

      it("keeps every cell inside its floor and never repeats a position", () => {
        for (const floor of dungeon.floors) {
          expect(floor.cells.length).toBeGreaterThan(0);
          const seen = new Set<string>();
          for (const cell of floor.cells) {
            expect(cell.row).toBeGreaterThanOrEqual(0);
            expect(cell.col).toBeGreaterThanOrEqual(0);
            expect(cell.row).toBeLessThan(floor.rows);
            expect(cell.col).toBeLessThan(floor.cols);
            const at = `${cell.row},${cell.col}`;
            expect(seen.has(at)).toBe(false);
            seen.add(at);
          }
        }
      });

      it("uses only the schema's side, chest and key words", () => {
        for (const { cell } of all) {
          expect(cell.room.length).toBeGreaterThan(0);
          expect(Number.isInteger(cell.enemies) && cell.enemies >= 0).toBe(true);
          for (const dir of DIRS) expect(SIDES).toContain(cell.sides[dir]);
          if (cell.chest !== undefined) expect(CHESTS).toContain(cell.chest);
          if (cell.keyDrop !== undefined) expect(["small", "big"]).toContain(cell.keyDrop);
          for (const flag of ["potKey", "boss", "puzzle", "shutter", "entrance"] as const) {
            if (cell[flag] !== undefined) expect(cell[flag]).toBe(true);
          }
          for (const link of ["stairs", "hole", "teleport"] as const) {
            const lock = cell[link]?.lock;
            if (lock !== undefined) expect(["small-key", "big-key"]).toContain(lock);
          }
        }
      });

      it("agrees on both ends of every side and walls off the edges", () => {
        for (const floor of dungeon.floors) {
          for (const cell of floor.cells) {
            for (const dir of DIRS) {
              const other = neighbour(floor, cell, dir);
              const where = `${floor.name} (${cell.row},${cell.col}) ${dir}`;
              if (!other) {
                expect(`${where}: ${cell.sides[dir]}`).toBe(`${where}: wall`);
              } else {
                expect(`${where}: ${cell.sides[dir]}`).toBe(`${where}: ${other.sides[OPPOSITE[dir]]}`);
              }
            }
          }
        }
      });

      it("has exactly one entrance and one boss", () => {
        expect(all.filter(({ cell }) => cell.entrance).length).toBe(1);
        expect(all.filter(({ cell }) => cell.boss).length).toBe(1);
      });

      it("holds each dungeon item exactly once", () => {
        const chests = (kind: ClassicCell["chest"]) => all.filter(({ cell }) => cell.chest === kind).length;
        expect(chests("map")).toBe(1);
        expect(chests("compass")).toBe(1);
        if (isLttp) {
          const bigKeys = chests("big-key") + all.filter(({ cell }) => cell.keyDrop === "big").length;
          expect(bigKeys).toBe(1);
          expect(chests("big-chest")).toBe(1);
        }
      });

      it("points every stairs, hole and teleport at a real cell", () => {
        const index = cellIndex(dungeon);
        for (const { floor, cell } of all) {
          for (const link of ["stairs", "hole", "teleport"] as const) {
            const target = cell[link];
            if (!target) continue;
            const where = `${floor.name} (${cell.row},${cell.col}) ${link} -> ${target.to} (${target.row},${target.col})`;
            expect(index.has(key(target.to, target.row, target.col)) ? where : `missing: ${where}`).toBe(where);
          }
        }
      });

      it("joins the cells of one room through open sides", () => {
        const rooms = new Map<string, { floor: ClassicFloor; cell: ClassicCell }[]>();
        for (const entry of all) {
          const list = rooms.get(entry.cell.room) ?? [];
          list.push(entry);
          rooms.set(entry.cell.room, list);
        }
        for (const [room, members] of rooms) {
          const want = new Set(members.map(({ floor, cell }) => key(floor.name, cell.row, cell.col)));
          const seen = new Set<string>();
          const queue = [members[0]];
          seen.add(key(members[0].floor.name, members[0].cell.row, members[0].cell.col));
          while (queue.length) {
            const { floor, cell } = queue.shift() as { floor: ClassicFloor; cell: ClassicCell };
            for (const dir of DIRS) {
              if (cell.sides[dir] !== "open") continue;
              const other = neighbour(floor, cell, dir);
              if (!other || other.room !== room) continue;
              const id = key(floor.name, other.row, other.col);
              if (seen.has(id)) continue;
              seen.add(id);
              queue.push({ floor, cell: other });
            }
          }
          expect(`${room}: ${seen.size}/${want.size}`).toBe(`${room}: ${want.size}/${want.size}`);
        }
      });

      it("reports as many small keys as there are key sources", () => {
        const sources = all.filter(
          ({ cell }) => cell.chest === "small-key" || cell.keyDrop === "small" || cell.potKey === true
        ).length;
        expect(dungeon.report.smallKeys).toBe(sources);
        expect(dungeon.report.mustClear).toBeGreaterThanOrEqual(0);
        expect(dungeon.report.side).toBeGreaterThanOrEqual(0);
      });

      it("reports as many small locks as there are small-key sides and locked links", () => {
        const sideEnds = all.flatMap(({ cell }) => DIRS.filter((dir) => cell.sides[dir] === "small-key")).length;
        expect(sideEnds % 2).toBe(0); // both ends of a pair agree, so each pair shows twice
        const lockedLinks = all.flatMap(({ cell }) =>
          (["stairs", "hole", "teleport"] as const).filter((link) => cell[link]?.lock === "small-key")
        ).length;
        expect(dungeon.report.smallLocks).toBe(sideEnds / 2 + lockedLinks);
      });

      it("lets the hero reach every cell from the entrance", () => {
        const index = cellIndex(dungeon);
        const floorOf = new Map(dungeon.floors.map((floor) => [floor.name, floor]));
        const start = all.find(({ cell }) => cell.entrance);
        expect(start).toBeDefined();
        if (!start) return;
        const seen = new Set<string>([key(start.floor.name, start.cell.row, start.cell.col)]);
        const queue = [start];
        while (queue.length) {
          const { floor, cell } = queue.shift() as { floor: ClassicFloor; cell: ClassicCell };
          const next: { floor: ClassicFloor; cell: ClassicCell }[] = [];
          for (const dir of DIRS) {
            if (cell.sides[dir] === "wall") continue;
            const other = neighbour(floor, cell, dir);
            if (other) next.push({ floor, cell: other });
          }
          for (const link of ["stairs", "hole", "teleport"] as const) {
            const target = cell[link];
            if (!target) continue;
            const targetFloor = floorOf.get(target.to);
            const targetCell = index.get(key(target.to, target.row, target.col));
            if (targetFloor && targetCell) next.push({ floor: targetFloor, cell: targetCell });
          }
          for (const entry of next) {
            const id = key(entry.floor.name, entry.cell.row, entry.cell.col);
            if (seen.has(id)) continue;
            seen.add(id);
            queue.push(entry);
          }
        }
        const unreachable = all
          .filter(({ floor, cell }) => !seen.has(key(floor.name, cell.row, cell.col)))
          .map(({ floor, cell }) => `${floor.name} (${cell.row},${cell.col}) ${cell.room}`);
        expect(unreachable).toEqual([]);
      });
    });
  }
});

/**
 * The Wind Temple's JSON (convert.py wind-temple): Zelda 1 Level 1, the Eagle, matched from TheVGLC's LoZ_1.dot onto the
 * 17 cells of today's Wind outline that are not the owner's four east rooms. The checks above run on it as on any other
 * dungeon (it is not LTTP, so the Big Key and the one-big-chest rule skip it); these pin what is Wind's own.
 */
const EAGLE_CELLS: [number, number][] = [
  [0, 1], [0, 2],
  [1, 2], [1, 4], [1, 5],
  [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
  [3, 1], [3, 2], [3, 3],
  [4, 2],
  [5, 1], [5, 2], [5, 3],
];
const OWNERS_FOUR: [number, number][] = [[3, 5], [4, 4], [4, 5], [5, 5]];
const wind = dungeons.find((dungeon) => dungeon.id === "wind-temple");
const windFloor = wind?.floors.find((floor) => floor.name === "1F");
const windAt = (row: number, col: number): ClassicCell | undefined =>
  windFloor?.cells.find((cell) => cell.row === row && cell.col === col);
/** The side between two orthogonal Eagle cells, read from the first one */
const windSide = (a: [number, number], b: [number, number]): ClassicSide | undefined => {
  const dir = DIRS.find((d) => a[0] + STEP[d][0] === b[0] && a[1] + STEP[d][1] === b[1]);
  return dir ? windAt(a[0], a[1])?.sides[dir] : undefined;
};

describe("the Wind Temple's JSON (the Eagle)", () => {
  it("is Zelda 1 Level 1: a 6x6 floor 1F with exactly the 17 Eagle cells, not the owner's four", () => {
    expect(wind).toBeDefined();
    expect(wind?.source).toBe("Zelda 1 Level 1 (Eagle)");
    expect(windFloor?.rows).toBe(6);
    expect(windFloor?.cols).toBe(6);
    const placed = (windFloor?.cells ?? []).map((cell) => [cell.row, cell.col]);
    expect(placed).toEqual(expect.arrayContaining(EAGLE_CELLS));
    expect(placed).toHaveLength(EAGLE_CELLS.length);
    for (const [row, col] of OWNERS_FOUR) expect(windAt(row, col)).toBeUndefined();
  });

  it("enters at (5,2), fights the boss at (1,4) and keeps the Triforce room at (1,5) for the Master Room", () => {
    expect(windAt(5, 2)?.entrance).toBe(true);
    expect(windAt(1, 4)?.boss).toBe(true);
    expect(windAt(1, 5)?.room).toMatch(/Triforce/);
    const triforce = flatCells(wind as ClassicDungeon).filter(({ cell }) => /Triforce/.test(cell.room));
    expect(triforce.map(({ floor, cell }) => `${floor.name}@${cell.row},${cell.col}`)).toEqual(["1F@1,5"]);
  });

  it("has 6 small keys (all enemy drops) and 6 small-key doors, and no Big Key", () => {
    const all = flatCells(wind as ClassicDungeon);
    expect(wind?.report.smallKeys).toBe(6);
    expect(wind?.report.smallLocks).toBe(6);
    expect(all.filter(({ cell }) => cell.keyDrop === "small")).toHaveLength(6);
    expect(all.filter(({ cell }) => cell.chest === "small-key")).toHaveLength(0);
    const pairs = all.flatMap(({ cell }) => DIRS.filter((dir) => cell.sides[dir] === "small-key")).length / 2;
    expect(pairs).toBe(6);
    expect(all.filter(({ cell }) => cell.chest === "big-key" || cell.keyDrop === "big")).toHaveLength(0);
  });

  it("holds one map at (3,3) and one compass at (2,2), in graph order", () => {
    const all = flatCells(wind as ClassicDungeon);
    expect(all.filter(({ cell }) => cell.chest === "map").map(({ cell }) => [cell.row, cell.col])).toEqual([[3, 3]]);
    expect(all.filter(({ cell }) => cell.chest === "compass").map(({ cell }) => [cell.row, cell.col])).toEqual([[2, 2]]);
  });

  it("keeps all 18 doors of the graph between orthogonal neighbours, with Level 1's locks", () => {
    const pairs: [[number, number], [number, number], ClassicSide][] = [
      [[5, 2], [4, 2], "small-key"], [[3, 1], [2, 1], "small-key"], [[2, 2], [2, 3], "small-key"],
      [[0, 2], [0, 1], "small-key"], [[1, 2], [0, 2], "small-key"], [[2, 4], [1, 4], "small-key"],
      [[2, 1], [2, 0], "bomb"], [[3, 3], [2, 3], "bomb"], [[3, 2], [2, 2], "bomb"],
      [[3, 2], [3, 1], "shutter"], [[1, 4], [1, 5], "shutter"],
      [[5, 2], [5, 1], "open"], [[5, 2], [5, 3], "open"], [[3, 2], [3, 3], "open"], [[3, 2], [4, 2], "open"],
      [[1, 2], [2, 2], "open"], [[2, 2], [2, 1], "open"], [[2, 3], [2, 4], "open"],
    ];
    for (const [a, b, kind] of pairs) {
      expect(`${a} ${b}: ${windSide(a, b)}`).toBe(`${a} ${b}: ${kind}`);
      expect(`${b} ${a}: ${windSide(b, a)}`).toBe(`${b} ${a}: ${kind}`);
    }
    const doors = (windFloor?.cells ?? []).flatMap((cell) => DIRS.filter((dir) => cell.sides[dir] !== "wall")).length;
    expect(doors).toBe(pairs.length * 2);
    expect(windAt(3, 2)?.shutter).toBe(true); // the key-drop room whose own door shuts
    expect(windAt(1, 5)?.shutter).toBe(true);
  });

  it("drops the bow in the stairway basement (the big-chest) and the boomerang in an ordinary chest", () => {
    const all = flatCells(wind as ClassicDungeon);
    const bigChests = all.filter(({ cell }) => cell.chest === "big-chest");
    expect(bigChests).toHaveLength(1);
    const basement = bigChests[0];
    expect(basement.floor.name).not.toBe("1F");
    const down = windAt(0, 1)?.teleport; // the push-block room
    expect(down).toBeDefined();
    expect(down?.to).toBe(basement.floor.name);
    expect([down?.row, down?.col]).toEqual([basement.cell.row, basement.cell.col]);
    expect(basement.cell.teleport).toEqual({ to: "1F", row: 0, col: 1 });
    expect(windAt(0, 1)?.puzzle).toBe(true);
    expect(windAt(2, 3)?.chest).toBe("other");
    expect(all.filter(({ cell }) => cell.chest === "other")).toHaveLength(1);
  });
});
