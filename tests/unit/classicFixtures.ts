/**
 * Fixtures for the classic dungeon dress step (tools/temples/classic/dress.ts):
 * - `stormBeforeHera`: the Storm Temple as tools/temples/regenerate.ts wrote it before the Tower of Hera replaced it,
 *   an unedited copy of the old seed, for the layout-switch test (a hero's saved run on the old rooms);
 * - hand-made ClassicDungeon fixtures, small enough to reason about, one per dress rule.
 */
import type { ClassicCell, ClassicDungeon, ClassicFloor, ClassicSide } from "../../tools/temples/classic/classicDungeon";
import type { ClassicPlan } from "../../tools/temples/classic/dressPlans";

/** The Storm Temple seed from before the Tower of Hera (src/lib/engine/temples/storm-temple.ts at 337a2dd0), verbatim */
export const stormBeforeHera = {
  id: "storm-temple",
  name: "Storm Temple",
  entrance: [0, 0, 0],
  maze: {
    "1F": [
      ["E001", "V001", "_", "_", "_"],
      ["O001", "k001", "_", "_", "_"],
      ["O002", "_", "_", "_", "_"],
      ["T001", "_", "_", "_", "_"],
      ["s001", "s002", "S001", "U001", "_"],
      ["_", "_", "_", "_", "_"],
    ],
    "2F": [
      ["_", "_", "O003", "B001", "_"],
      ["_", "_", "_", "O004", "S002"],
      ["_", "_", "_", "C001", "K001"],
      ["_", "_", "_", "b001", "s003"],
      ["_", "_", "Z001", "D001", "_"],
      ["_", "_", "P001", "O005", "_"],
    ],
  },
  rooms: {
    _: { type: "wall" },
    E001: { type: "entrance", visited: true },
    V001: { type: "save" },
    O001: { type: "loot", content: { chest: "dungeon", dungeon: "map" }, locked: { south: true } },
    k001: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    O002: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
    T001: { type: "trap", content: { trapType: "lightning", damage: 6 } },
    s001: { type: "monster", content: { difficulty: "easy", theme: "clouds", quest: { beastId: "beast-bed-basilisk", difficulty: 1, basicSchedule: "daily", dueByTime: "08:00" } } },
    s002: { type: "monster", content: { difficulty: "easy", theme: "clouds", quest: { beastId: "beast-shoe-shrew", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" } } },
    S001: { type: "monster", content: { difficulty: "normal", theme: "clouds", quest: { beastId: "beast-mess-hog", difficulty: 2, basicSchedule: "daily", dueByTime: "19:00" } } },
    U001: { type: "stairs-up" },
    O003: { type: "master", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } },
    B001: { type: "boss", content: { lockOnEnter: true, difficulty: "boss", element: "storm", quest: { beastId: "beast-clutter-chimera", difficulty: 8, basicSchedule: "weekly", dueByTime: "18:00" } }, locked: { master: true } },
    O004: { type: "loot", content: { chest: "consumable", items: ["potion"] }, locked: { north: true } },
    S002: { type: "monster", content: { difficulty: "normal", theme: "clouds", quest: { beastId: "beast-piece-poltergeist", difficulty: 2, basicSchedule: "weekly", dueByTime: "18:00" } } },
    C001: { type: "camp", content: { healthPoints: 15 } },
    K001: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    b001: { type: "miniboss", content: { lockOnEnter: true, difficulty: "hard", quest: { beastId: "beast-under-bed-bogey", difficulty: 5, basicSchedule: "weekly", dueByTime: "18:00" } } },
    s003: { type: "monster", content: { difficulty: "easy", theme: "clouds", quest: { beastId: "beast-toybox-troll", difficulty: 2, basicSchedule: "daily", dueByTime: "19:00" } } },
    Z001: { type: "puzzle", content: { puzzleType: "generic" } },
    D001: { type: "stairs-down" },
    P001: { type: "shop" },
    O005: { type: "loot", content: { chest: "dungeon", dungeon: "Lightning Rod" } },
  },
};

// --- hand-made dungeons ---------------------------------------------------------------------------------------------

type Sides = ClassicCell["sides"];

const WALLS: Sides = { north: "wall", east: "wall", south: "wall", west: "wall" };

/** One converted cell: walls unless a side is named, no enemies unless `extra` says so */
export const cell = (row: number, col: number, room: string, sides: Partial<Sides>, extra: Partial<ClassicCell> = {}): ClassicCell => ({
  row,
  col,
  room,
  sides: { ...WALLS, ...sides },
  enemies: 0,
  ...extra,
});

/** A floor sized to its cells (rows and cols are the grid the converter would write) */
export const floor = (name: string, rows: number, cols: number, cells: ClassicCell[]): ClassicFloor => ({ name, rows, cols, cells });

/** A dungeon with an honest report (the counts the converter writes), so the JSON spec's rules would hold for it too */
export const dungeon = (id: string, floors: ClassicFloor[]): ClassicDungeon => {
  const cells = floors.flatMap((level) => level.cells);
  const sideEnds = cells.flatMap((entry) => Object.values(entry.sides).filter((side: ClassicSide) => side === "small-key")).length;
  return {
    id,
    source: "Fixture",
    floors,
    report: {
      cellsPerFloor: Object.fromEntries(floors.map((level) => [level.name, level.cells.length])),
      mustClear: 0,
      side: 0,
      smallKeys: cells.filter((entry) => entry.chest === "small-key" || entry.keyDrop === "small" || entry.potKey).length,
      smallLocks: sideEnds / 2,
    },
  };
};

/** The Storm plan's shape with the library's storm beasts: three starters first (bed, shoes, toys), then two more */
export const plan = (overrides: Partial<ClassicPlan> = {}): ClassicPlan => ({
  name: "Fixture Temple",
  theme: "clouds",
  element: "storm",
  relic: "Lightning Rod",
  trap: ["lightning", 6],
  puzzle: "generic",
  mustClear: [["bed-basilisk", 1, "daily am"], ["shoe-shrew", 1, "daily"], ["toybox-troll", 2, "daily"], ["mess-hog", 2, "daily"], ["piece-poltergeist", 2, "weekly"]],
  minibosses: [["under-bed-bogey", 5, "weekly"]],
  boss: ["clutter-chimera", 8, "weekly"],
  ...overrides,
});

/**
 * CORRIDOR, one floor 2x4: the entrance, a shutter guard that drops a small key and opens on the Boss Key vault, then
 * the boss. Under the guard a key lies in the open; a cracked wall off that room hides a chest of gold that no one
 * needs to pass. Every door rule but stairs shows up once.
 *
 *   E  G  V  B
 *   .  P  C  .
 */
export const corridor = (): ClassicDungeon =>
  dungeon("corridor", [
    floor("1F", 2, 4, [
      cell(0, 0, "Hall", { east: "open" }, { entrance: true }),
      cell(0, 1, "Guard", { west: "open", east: "small-key", south: "open" }, { enemies: 2, shutter: true, keyDrop: "small" }),
      cell(0, 2, "Vault", { west: "small-key", east: "open" }, { chest: "big-key" }),
      cell(0, 3, "Throne", { west: "open" }, { boss: true }),
      cell(1, 1, "Pots", { north: "open", east: "bomb" }, { potKey: true }),
      cell(1, 2, "Cellar", { west: "bomb" }, { chest: "other" }),
    ]),
  ]);

/**
 * TOWER, two floors 1x4 joined by stairs at the east end. 1F: the entrance, a hall (a side fight, or a shutter fight
 * when asked), a shutter fight, the stairs. 2F: the boss, an empty gallery, a shutter keep that holds the Boss Key
 * chest in the same screen, the stairs down. The keep's chest has to move into the gallery, which makes the keep the
 * mini-boss guarding it. The converter wrote 2F five columns wide with nothing in the last one.
 *
 *   1F:  E  h  M  U        2F:  B  .  K  D  _
 */
export const tower = (hallShuts = false): ClassicDungeon =>
  dungeon("tower", [
    floor("1F", 1, 4, [
      cell(0, 0, "Gate", { east: "open" }, { entrance: true }),
      cell(0, 1, "Hall", { west: "open", east: "open" }, { enemies: 1, ...(hallShuts ? { shutter: true } : {}) }),
      cell(0, 2, "Shutter", { west: "open", east: "open" }, { enemies: 2, shutter: true }),
      cell(0, 3, "Stairs", { west: "open" }, { stairs: { to: "2F", row: 0, col: 3 } }),
    ]),
    floor("2F", 1, 5, [
      cell(0, 0, "Throne", { east: "open" }, { boss: true }),
      cell(0, 1, "Gallery", { west: "open", east: "open" }),
      cell(0, 2, "Keep", { west: "open", east: "open" }, { enemies: 3, shutter: true, chest: "big-key" }),
      cell(0, 3, "Landing", { west: "open" }, { stairs: { to: "1F", row: 0, col: 3 } }),
    ]),
  ]);

/**
 * CRACK, one floor 1x5: the only way from the entrance to the boss passes a cracked wall between an empty anteroom and
 * the shutter guard of the Boss Key vault.
 *
 *   E  .  |G  V  B
 */
export const crack = (): ClassicDungeon =>
  dungeon("crack", [
    floor("1F", 1, 5, [
      cell(0, 0, "Gate", { east: "open" }, { entrance: true }),
      cell(0, 1, "Ante", { west: "open", east: "bomb" }),
      cell(0, 2, "Guard", { west: "bomb", east: "open" }, { enemies: 2, shutter: true }),
      cell(0, 3, "Vault", { west: "open", east: "open" }, { chest: "big-key" }),
      cell(0, 4, "Throne", { west: "open" }, { boss: true }),
    ]),
  ]);

/**
 * DROP, three floors. 1F: the entrance, stairs up sharing their cell with the Boss Key chest, an empty landing, a fairy
 * circle. 2F: a lone hole over the entrance, stairs down sharing their cell with a riddle, a shutter fight sharing its
 * cell with the stairs to the boss floor and a hole into the fairy circle, an empty nook. 3F: the boss alone in its
 * cell with the stairs down (the Tower of Hera's shape).
 *
 *   1F:  E  U  .  T        2F:  H  D  M  .        3F:  B
 */
export const drop = (): ClassicDungeon =>
  dungeon("drop", [
    floor("1F", 1, 4, [
      cell(0, 0, "Gate", { east: "open" }, { entrance: true }),
      cell(0, 1, "Stairs", { west: "open", east: "open" }, { stairs: { to: "2F", row: 0, col: 1 }, chest: "big-key" }),
      cell(0, 2, "Landing", { west: "open", east: "open" }),
      cell(0, 3, "Fairies", { west: "open" }, { teleport: { to: "2F", row: 0, col: 2 } }),
    ]),
    floor("2F", 1, 4, [
      cell(0, 0, "Hole", { east: "open" }, { hole: { to: "1F", row: 0, col: 0 } }),
      cell(0, 1, "Riddle", { west: "open", east: "open" }, { puzzle: true, stairs: { to: "1F", row: 0, col: 1 } }),
      cell(0, 2, "Climb", { west: "open", east: "open" }, { enemies: 2, shutter: true, stairs: { to: "3F", row: 0, col: 0 }, hole: { to: "1F", row: 0, col: 3 } }),
      cell(0, 3, "Nook", { west: "open" }),
    ]),
    floor("3F", 1, 1, [cell(0, 0, "Throne", {}, { boss: true, stairs: { to: "2F", row: 0, col: 2 } })]),
  ]);

/**
 * EXTRAS, a floor 2x5 and a basement 1x3: more empty cells than the dressing has extras for, side fights on both
 * floors, one must-clear hall and the mini-boss guard of the vault. Nearest the entrance first: the north nook gets the
 * shop, the cellar's east end the save (a basement cell wins a tie), the north end the 1F camp; the antechamber stays
 * empty and the basement has no cell left for a camp.
 *
 *   1F:  E  D  .  .  h        B1:  h  U  .
 *        M  m  V  .  B
 */
export const extras = (): ClassicDungeon =>
  dungeon("extras", [
    floor("B1", 1, 3, [
      cell(0, 0, "Cellar West", { east: "open" }, { enemies: 1 }),
      cell(0, 1, "Cellar Stairs", { west: "open", east: "open" }, { stairs: { to: "1F", row: 0, col: 1 } }),
      cell(0, 2, "Cellar East", { west: "open" }),
    ]),
    floor("1F", 2, 5, [
      cell(0, 0, "Gate", { east: "open", south: "open" }, { entrance: true }),
      cell(0, 1, "North Hall", { west: "open", east: "open" }, { stairs: { to: "B1", row: 0, col: 1 } }),
      cell(0, 2, "North Nook", { west: "open", east: "open" }),
      cell(0, 3, "North End", { west: "open", east: "open" }),
      cell(0, 4, "Attic", { west: "open" }, { enemies: 1 }),
      cell(1, 0, "South Hall", { north: "open", east: "open" }, { enemies: 1, shutter: true }),
      cell(1, 1, "Guard", { west: "open", east: "open" }, { enemies: 2, shutter: true }),
      cell(1, 2, "Vault", { west: "open", east: "open" }, { chest: "big-key" }),
      cell(1, 3, "Ante", { west: "open", east: "open" }),
      cell(1, 4, "Throne", { west: "open" }, { boss: true }),
    ]),
  ]);
