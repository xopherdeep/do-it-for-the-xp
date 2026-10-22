/**
 * The rooms of a dressed dungeon: each slot of the board as one room of ours, with a token of its own, the content
 * its kind implies (the design's room table), the sides drawn for it, and the maze of tokens per floor trimmed of the
 * empty rows and columns the converter left at the end of a grid. Stairs and circles name the floor and the cell they
 * land on, following a flight or a circle that moved; a flight is locked as the dungeon keyed it, and the climb to the
 * boss's floor is locked with the Boss Key when the boss sat on its landing (the handoff's rule for Hera, Skull and Ice).
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { floorHeight } from "@/lib/engine/core/dungeons/floorOrder";
import { allSlots, linkedSlot, sameCell, slotsOf, type Board, type CellRef, type Item, type ItemKind, type Slot } from "./dressBoard";
import { sidesKey, type Sides } from "./dressDoors";
import { templateDifficulty, type FightRole } from "./dressChores";
import type { ClassicPlan } from "./dressPlans";

/** One room of the dressed temple, for the report: where it is, what it is, and the converted cell it came from */
export interface ClassicPlacement {
  token: string;
  type: string;
  at: CellRef;
  /** The converted cell the room's content came from; none for a room the dressing added of its own */
  origin?: CellRef;
  /** The LTTP room the content belongs to */
  room?: string;
  /** The room stands where the dungeon had no cell: a wall position, or a grown row or column */
  grown: boolean;
}

export interface BuiltRooms {
  maze: Record<string, string[][]>;
  rooms: Record<string, Room>;
  entrance: number[];
  placements: ClassicPlacement[];
}

const WALL = "_";

/** The letter each room type is spelled with in the maze; a counter follows it */
const TOKEN_LETTER: Record<string, string> = {
  entrance: "E",
  boss: "B",
  miniboss: "b",
  "must-clear": "M",
  side: "m",
  "boss-key": "K",
  key: "k",
  relic: "R",
  loot: "O",
  master: "X",
  "stairs-up": "U",
  "stairs-down": "D",
  teleport: "T",
  pit: "H",
  puzzle: "Z",
  shop: "P",
  save: "V",
  camp: "C",
  empty: "N",
};

/** What a chest holds: the Boss Key, the relic, a Bomb, 25 gold for an "other" chest, else the dungeon item of its kind */
const chestOf = (item: Item, plan: ClassicPlan): RoomContent => {
  const isBossKey = item.kind === "bigKey";
  if (isBossKey) return { chest: "dungeon", dungeon: "master-key" };
  const isRelic = item.kind === "bigChest";
  if (isRelic) return { chest: "dungeon", dungeon: plan.relic };
  const isBomb = item.kind === "bombChest";
  if (isBomb) return { chest: "consumable", items: ["Bomb"] };
  const isGold = item.chest === "other";
  if (isGold) return { chest: "gold", gold: 25 };
  return { chest: "dungeon", dungeon: item.chest === "small-key" ? "key" : String(item.chest) };
};

/** Where a flight lands now: the twin flight of the cell its link names, wherever that flight moved to, else that cell */
const landingOf = (board: Board, item: Item): CellRef | undefined => {
  const link = item.link;
  if (!link) return undefined;
  const named = { floor: link.to, row: link.row, col: link.col };
  const moved = allSlots(board).find((slot) => slot.item?.kind === "stairs" && slot.item.link && sameCell(slot.item.origin, named));
  return moved?.at ?? linkedSlot(board, link)?.at ?? named;
};

/** Where a pit drops: the cell the dressing gave it, else the cell its hole named (the antechamber when that is the boss's) */
const dropTarget = (board: Board, item: Item): CellRef | undefined => {
  if (item.target) return item.target;
  const landing = linkedSlot(board, item.link);
  if (!landing) return item.link ? { floor: item.link.to, row: item.link.row, col: item.link.col } : undefined;
  const isOntoBoss = landing.item?.kind === "boss" && Boolean(board.antechamber);
  return isOntoBoss ? board.antechamber!.at : landing.at;
};

/**
 * The circle a circle leads to: the one the dressing paired it with, else the cell its link names when that is a
 * circle (the antechamber when it is the boss's), else the circle on that floor that leads back here, else that
 * floor's first circle
 */
const circleTarget = (board: Board, item: Item): CellRef | undefined => {
  if (item.target) return item.target;
  const link = item.link;
  if (!link) return undefined;
  const landing = linkedSlot(board, link);
  const isOntoCircle = landing?.item?.kind === "teleport";
  if (isOntoCircle) return landing!.at;
  const isOntoBoss = landing?.item?.kind === "boss" && Boolean(board.antechamber);
  if (isOntoBoss) return board.antechamber!.at;
  const circles = allSlots(board).filter((slot) => slot.item?.kind === "teleport" && slot.at.floor === link.to);
  const back = circles.find((slot) => slot.item!.link && sameCell({ floor: slot.item!.link.to, row: slot.item!.link.row, col: slot.item!.link.col }, item.origin));
  return (back ?? circles[0])?.at;
};

const coordsOf = (at: CellRef): RoomContent => ({ targetLevel: at.floor, targetCoords: { x: at.col, y: at.row } });

/** A flight is locked as the dungeon keyed it; the climb onto the boss's floor is locked with the Boss Key when the boss sat on its landing */
const climbLock = (board: Board, item: Item): RoomContent["locked"] => {
  const boss = allSlots(board).find((slot) => slot.item?.kind === "boss");
  const landsOnBoss = Boolean(boss) && Boolean(item.link) && sameCell({ floor: item.link!.to, row: item.link!.row, col: item.link!.col }, boss!.item!.origin);
  if (landsOnBoss) return "master";
  const isSmallLock = item.link?.lock === "small-key";
  if (isSmallLock) return "small";
  const isBossLock = item.link?.lock === "big-key";
  return isBossLock ? "master" : undefined;
};

interface RoomShape {
  type: string;
  letter: string;
  content?: RoomContent;
}

/** What a fight hands out, counted: its one Dungeon Item, its small keys and its gold */
interface Handouts {
  dungeon?: string;
  keys: number;
  gold: number;
}

/** Add one chest or key a boxed-in fight holds (dressPlace) to what it hands out */
const handOut = (sum: Handouts, held: Item, plan: ClassicPlan): Handouts => {
  const isSmallKey = held.kind === "potKey" || held.chest === "small-key";
  if (isSmallKey) return { ...sum, keys: sum.keys + 1 };
  const chest = chestOf(held, plan);
  return { ...sum, dungeon: chest.dungeon ?? sum.dungeon, gold: sum.gold + Number(chest.gold ?? 0) };
};

/**
 * What a fight hands out once won (its drops), read as a chest is: the key its room dropped in LTTP, and the chests
 * and keys of its cell it was left holding when it was boxed in. One Dungeon Item (a small key when there is none),
 * any further keys as "key" rows, the gold summed.
 */
const dropsOf = (item: Item, plan: ClassicPlan): RoomContent => {
  const dropped: Handouts = { dungeon: item.keyDrop === "big" ? "master-key" : undefined, keys: item.keyDrop === "small" ? 1 : 0, gold: 0 };
  const sum = (item.holds ?? []).reduce((total, held) => handOut(total, held, plan), dropped);
  const isNothing = !sum.dungeon && sum.keys === 0 && sum.gold === 0;
  if (isNothing) return {};
  const dungeon = sum.dungeon ?? (sum.keys > 0 ? "key" : undefined);
  const rows = sum.keys - (sum.dungeon ? 0 : Math.min(1, sum.keys));
  const drops: RoomContent = { chest: dungeon ? "dungeon" : "gold" };
  if (dungeon) drops.dungeon = dungeon;
  const hasKeyRows = rows > 0;
  if (hasKeyRows) drops.items = Array.from({ length: rows }, () => "key");
  const hasGold = sum.gold > 0;
  if (hasGold) drops.gold = sum.gold;
  return { drops };
};

const fightShape = (role: FightRole | undefined, item: Item, plan: ClassicPlan): RoomShape => {
  // Before the chores are dealt a fight is a plain room of its kind, enough for the graph to walk (the boss stays the boss: its doors are Boss doors)
  const isUndealtBoss = !role && item.kind === "boss";
  if (isUndealtBoss) return { type: "boss", letter: "boss", content: { lockOnEnter: true, difficulty: "boss", element: plan.element } };
  if (!role) return { type: "monster", letter: item.kind === "mustClearFight" ? "must-clear" : "side", content: { difficulty: "easy", theme: plan.theme } };
  const drops = dropsOf(item, plan);
  const sealed: RoomContent = role.sealed ? { lockOnEnter: true } : {};
  switch (role.type) {
    case "boss":
      return { type: "boss", letter: "boss", content: { lockOnEnter: true, difficulty: "boss", element: plan.element, quest: role.template, ...drops } };
    case "miniboss":
      return { type: "miniboss", letter: "miniboss", content: { lockOnEnter: true, difficulty: "hard", quest: role.template, ...drops } };
    default:
      return { type: "monster", letter: role.sealed ? "must-clear" : "side", content: { ...sealed, difficulty: templateDifficulty(role.template), theme: plan.theme, quest: role.template, ...drops } };
  }
};

/** What a room's shape is read from: the board, the slot, the thing in it, the plan and the fight's role when dealt */
interface ShapeInput {
  board: Board;
  slot: Slot;
  item: Item;
  plan: ClassicPlan;
  role?: FightRole;
}

const stairsShape = ({ board, slot, item }: ShapeInput): RoomShape => {
  const landing = landingOf(board, item);
  const isUp = floorHeight(item.link!.to) > floorHeight(slot.at.floor);
  const type = isUp ? "stairs-up" : "stairs-down";
  const locked = climbLock(board, item);
  return { type, letter: type, content: { ...(landing ? coordsOf(landing) : { targetLevel: item.link!.to }), ...(locked ? { locked } : {}) } };
};

const circleShape = ({ board, item }: ShapeInput): RoomShape => {
  const target = circleTarget(board, item);
  if (target) return { type: "teleport", letter: "teleport", content: coordsOf(target) };
  // A circle with no circle to lead to names its floor and fizzles (R8 says so in the solver)
  if (item.link) return { type: "teleport", letter: "teleport", content: { targetLevel: item.link.to } };
  return { type: "teleport", letter: "teleport" };
};

/** A pit names where it drops (the engine and the solver read it as they read a flight's landing) */
const pitShape = ({ board, item }: ShapeInput): RoomShape => {
  const target = dropTarget(board, item);
  return { type: "pit", letter: "pit", content: target ? coordsOf(target) : undefined };
};

const fightShapeOf = ({ role, item, plan }: ShapeInput): RoomShape => fightShape(role, item, plan);

const lootShape = (letter: string) => ({ item, plan }: ShapeInput): RoomShape => ({ type: "loot", letter, content: chestOf(item, plan) });

/** The room each kind of thing becomes (the design's room table) */
const SHAPES: Record<ItemKind, (input: ShapeInput) => RoomShape> = {
  entrance: () => ({ type: "entrance", letter: "entrance" }),
  boss: fightShapeOf,
  mustClearFight: fightShapeOf,
  sideFight: fightShapeOf,
  stairs: stairsShape,
  teleport: circleShape,
  hole: pitShape,
  bigKey: lootShape("boss-key"),
  bigChest: lootShape("relic"),
  chest: ({ item, plan }) => ({ type: "loot", letter: item.chest === "small-key" ? "key" : "loot", content: chestOf(item, plan) }),
  bombChest: lootShape("loot"),
  potKey: () => ({ type: "key", letter: "key" }),
  puzzle: ({ plan }) => ({ type: "puzzle", letter: "puzzle", content: { puzzleType: plan.puzzle } }),
  master: () => ({ type: "master", letter: "master", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } }),
  shop: ({ plan }) => ({ type: "shop", letter: "shop", content: plan.shop ? { specialItem: plan.shop } : undefined }),
  save: () => ({ type: "save", letter: "save" }),
  camp: () => ({ type: "camp", letter: "camp", content: { healthPoints: 15 } }),
  empty: () => ({ type: "empty", letter: "empty" }),
};

const shapeOf = (board: Board, slot: Slot, plan: ClassicPlan, role: FightRole | undefined): RoomShape => {
  const item = slot.item;
  // A converted cell with nothing in it yet (the extras come last) is an empty room, so the graph walks through it
  if (!item) return SHAPES.empty({ board, slot, item: { kind: "empty", origin: slot.at, room: "" }, plan, role });
  return SHAPES[item.kind]({ board, slot, item, plan, role });
};

/** The grid without the empty rows and columns at its end (the converter sizes a floor to the dungeon's extent) */
const trimmed = (grid: string[][]): string[][] => {
  const isEmptyRow = (row: string[]): boolean => row.every((token) => token === WALL);
  let rows = grid.length;
  while (rows > 1 && isEmptyRow(grid[rows - 1])) rows -= 1;
  const kept = grid.slice(0, rows);
  let cols = kept[0]?.length ?? 0;
  while (cols > 1 && kept.every((row) => row[cols - 1] === WALL)) cols -= 1;
  return kept.map((row) => row.slice(0, cols));
};

/** Every slot of the board as a room of the temple, with the maze that places them */
export const buildRooms = (board: Board, plan: ClassicPlan, sides: Map<string, Sides>, roles: Map<string, FightRole> = new Map()): BuiltRooms => {
  const counters = new Map<string, number>();
  const rooms: Record<string, Room> = { [WALL]: { type: "wall" } };
  const maze: Record<string, string[][]> = {};
  const placements: ClassicPlacement[] = [];
  let entrance: number[] = [0, 0, 0];

  board.floors.forEach((floor, floorIndex) => {
    const grid: string[][] = Array.from({ length: floor.rows }, () => Array.from({ length: floor.cols }, () => WALL));
    for (const slot of slotsOf(floor)) {
      const item = slot.item;
      const shape = shapeOf(board, slot, plan, roles.get(sidesKey(slot.at)));
      const letter = TOKEN_LETTER[shape.letter];
      const count = (counters.get(letter) ?? 0) + 1;
      counters.set(letter, count);
      const token = `${letter}${String(count).padStart(3, "0")}`;
      const room: Room = { type: shape.type };
      if (shape.content) room.content = shape.content;
      const isEntrance = shape.type === "entrance";
      if (isEntrance) {
        room.visited = true;
        entrance = [floorIndex, slot.at.row, slot.at.col];
      }
      room.sides = { ...sides.get(sidesKey(slot.at))! };
      rooms[token] = room;
      grid[slot.at.row][slot.at.col] = token;
      const isAddedOfItsOwn = item?.kind === "master";
      placements.push({ token, type: shape.type, at: slot.at, origin: isAddedOfItsOwn ? undefined : item?.origin ?? slot.at, room: item?.room || slot.cell?.room, grown: !slot.cell });
    }
    maze[floor.name] = trimmed(grid);
  });
  return { maze, rooms, entrance, placements };
};
