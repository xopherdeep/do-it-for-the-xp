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
