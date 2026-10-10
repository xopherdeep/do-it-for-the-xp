/**
 * Temple graph: a `Dungeon` layout (floors of room tokens, a `rooms` table) read as rooms joined by doors.
 *
 * This is the shape the solver and the generator share (docs/Temple-Generation-Contract.md). It follows the
 * engine's rules of movement, not an idealised version of them:
 * - two orthogonally adjacent non-wall cells on a floor are joined by a door;
 * - `room.locked[direction]` locks the door in that direction only (the engine checks the room the hero stands
 *   in), so a door is a directed edge and a key opens one direction;
 * - every door into a boss room that carries `locked.master` is the boss door and needs the master key;
 * - stairs up lead to the next floor in the layout's order, stairs down to the previous one, landing on the
 *   requested coordinates, else the first matching stairs on that floor, else the same cell (R8 wants pairs at
 *   the same row and column);
 * - teleports pair up in reading order (floors, rows, columns);
 * - a pit drops the hero to the previous floor (same cell, else that floor's first stairs up) when there is one,
 *   and is an ordinary room otherwise.
 *
 * A `rooms` entry is shared by every cell that uses its token (the authored temples do this), so a lock on a
 * token locks every room spelled with it. Generated temples give each room a token of its own.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";

export type Direction = "north" | "south" | "east" | "west";

/** Clockwise from the top of the map, the order the screen looks at sides. */
export const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

export const OPPOSITE: Record<Direction, Direction> = { north: "south", south: "north", east: "west", west: "east" };

export const STEP: Record<Direction, [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

/** The part of a `Dungeon` the solver reads. Authored temples and TempleDb layouts fit it as they are. */
export interface TempleLayout {
  id?: string;
  name?: string;
  /** `[row, col]` on the first floor, or `[floorIndex, row, col]` */
  entrance?: number[];
  maze: string[][] | Record<string, string[][]>;
  rooms: Record<string, Room>;
}

/** One cell of a temple. */
export interface RoomRef {
  floor: string;
  row: number;
  col: number;
}

export type LockKind = "none" | "small" | "master";

export type DoorKind = "door" | "stairs" | "teleport" | "pit";

/** A one-way passage from one room to another. Walking doors come in both directions, pits only down. */
export interface Door {
  /** `${from}>${to}`: what the solver stores when the door was opened */
  id: string;
  from: string;
  to: string;
  kind: DoorKind;
  lock: LockKind;
  /** Which way the hero walks, for walking doors */
  direction?: Direction;
}

export interface GraphRoom {
  key: string;
  ref: RoomRef;
  /** The token in the maze grid */
  token: string;
  room: Room;
  /** The normalised room type ("stairs-up", "entrance", "boss", ...) */
  kind: string;
  /** Small keys this room hands out when the hero enters it */
  smallKeys: number;
  /** The master key is in this room */
  masterKey: boolean;
  /** The Pegasus chest, the prize behind the boss */
  prize: boolean;
}

/** Something the layout got wrong while being read, filed under the rule it breaks. */
export interface GraphIssue {
  rule: "R1" | "R8";
  text: string;
}

export interface TempleGraph {
  floors: string[];
  grids: Record<string, string[][]>;
  rooms: Map<string, GraphRoom>;
  doors: Door[];
  /** Doors leaving each room */
  out: Map<string, Door[]>;
  /** Key of the entrance room, if the layout has a usable one */
  entrance?: string;
  issues: GraphIssue[];
}

/** The layouts and the DSL spell a few kinds differently from ROOM_ICONS. */
const KIND_ALIASES: Record<string, string> = {
  exit: "entrance",
  savepoint: "save",
  stairs_up: "stairs-up",
  stairs_down: "stairs-down",
  dungeon_map: "map",
  "dungeon-map": "map",
};

const IMPASSABLE = new Set(["wall", "void"]);

export const roomKey = (ref: RoomRef): string => `${ref.floor}:${ref.row},${ref.col}`;

/** "1F (2,4) boss": how a room is named in a reason. */
export const describeRoom = (room: GraphRoom): string => `${room.ref.floor} (${room.ref.row},${room.ref.col}) ${room.kind}`;

export const kindOf = (room: Room | undefined): string => {
  const type = room?.type ?? "wall";
  return KIND_ALIASES[type] ?? type;
};

/** A floor map whatever the layout's shape: a single grid is the floor "1F". */
export const floorsOf = (maze: TempleLayout["maze"]): Record<string, string[][]> =>
  Array.isArray(maze) ? { "1F": maze } : maze;

/** How many small keys a room hands out: key chests, key rooms, and `items` holding keys. */
const smallKeysIn = (room: Room, kind: string): number => {
  const content = room.content ?? {};
  if (kind === "key") return content.keyId === "master" ? 0 : 1;
  if (content.dungeon === "key") return 1;
  const items: unknown[] = Array.isArray(content.items) ? content.items : [];
  return items.filter((item) => item === "key").length;
};

const hasMasterKey = (room: Room, kind: string): boolean => {
  const content = room.content ?? {};
  return kind === "master" || content.dungeon === "master-key" || (kind === "key" && content.keyId === "master");
};

/** The Pegasus chest: flagged `content.pegasus`, or a chest whose prize is named after the Pegasus. */
const isPrize = (room: Room): boolean => {
  const content = room.content ?? {};
  return content.pegasus === true || /pegasus/i.test(String(content.dungeon ?? ""));
};

const makeRoom = (ref: RoomRef, token: string, room: Room): GraphRoom => {
  const kind = kindOf(room);
  return {
    key: roomKey(ref),
    ref,
    token,
    room,
    kind,
    smallKeys: smallKeysIn(room, kind),
    masterKey: hasMasterKey(room, kind),
    prize: isPrize(room),
  };
};

/** Every standable cell of every floor, in reading order. Unknown tokens count as walls and are reported. */
const collectRooms = (layout: TempleLayout, floors: string[], grids: Record<string, string[][]>, issues: GraphIssue[]): Map<string, GraphRoom> => {
  const rooms = new Map<string, GraphRoom>();
  for (const floor of floors) {
    grids[floor].forEach((line, row) =>
      line.forEach((token, col) => {
        const room = layout.rooms[token];
        if (!room) {
          if (token !== "_") issues.push({ rule: "R1", text: `unknown room token "${token}" at ${floor} (${row},${col})` });
          return;
        }
        if (IMPASSABLE.has(kindOf(room))) return;
        const ref = { floor, row, col };
        rooms.set(roomKey(ref), makeRoom(ref, token, room));
      })
    );
  }
  return rooms;
};

/** The first room of a kind on a floor, in reading order (the engine's landing fallback). */
const firstOfKind = (graph: Pick<TempleGraph, "rooms" | "grids">, floor: string, kind: string): GraphRoom | undefined => {
  const grid = graph.grids[floor] ?? [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const room = graph.rooms.get(roomKey({ floor, row, col }));
      if (room?.kind === kind) return room;
    }
  }
  return undefined;
};

const addDoor = (graph: TempleGraph, door: Omit<Door, "id">): void => {
  const full: Door = { id: `${door.from}>${door.to}`, ...door };
  graph.doors.push(full);
  const list = graph.out.get(door.from);
  if (list) list.push(full);
  else graph.out.set(door.from, [full]);
};

/** The lock on walking from `from` to `to`: the boss door needs the master key, a locked side a small key. */
const lockBetween = (from: GraphRoom, to: GraphRoom, direction: Direction): LockKind => {
  if (to.kind === "boss" && (to.room.locked?.master || from.room.locked?.master)) return "master";
  return from.room.locked?.[direction] ? "small" : "none";
};

/** Walking doors: each room to each standable neighbour, one directed door per way. */
const linkNeighbours = (graph: TempleGraph): void => {
  for (const from of graph.rooms.values()) {
    for (const direction of DIRECTIONS) {
      const [dr, dc] = STEP[direction];
      const to = graph.rooms.get(roomKey({ floor: from.ref.floor, row: from.ref.row + dr, col: from.ref.col + dc }));
      if (!to) continue;
      addDoor(graph, { from: from.key, to: to.key, kind: "door", lock: lockBetween(from, to, direction), direction });
    }
  }
};

/** Where a flight of stairs lands, the engine's way: requested coordinates, the floor's first matching stairs, the same cell. */
const stairsLanding = (graph: TempleGraph, stairs: GraphRoom, target: string, wantedKind: string): GraphRoom | undefined => {
  const coords = stairs.room.content?.targetCoords;
  const requested = coords ? graph.rooms.get(roomKey({ floor: target, row: Number(coords.y), col: Number(coords.x) })) : undefined;
  return requested ?? firstOfKind(graph, target, wantedKind) ?? graph.rooms.get(roomKey({ floor: target, row: stairs.ref.row, col: stairs.ref.col }));
};

/** Stairs: up goes to the next floor of the layout, down to the previous one. R8 wants the twin on the same cell. */
const linkStairs = (graph: TempleGraph): void => {
  for (const stairs of graph.rooms.values()) {
    if (stairs.kind !== "stairs-up" && stairs.kind !== "stairs-down") continue;
    const up = stairs.kind === "stairs-up";
    const index = graph.floors.indexOf(stairs.ref.floor);
    const target = (stairs.room.content?.targetLevel as string | undefined) ?? graph.floors[index + (up ? 1 : -1)];
    const twinKind = up ? "stairs-down" : "stairs-up";
    if (!target || !graph.floors.includes(target) || target === stairs.ref.floor) {
      graph.issues.push({ rule: "R8", text: `${describeRoom(stairs)} leads to no floor` });
      continue;
    }
    const twin = graph.rooms.get(roomKey({ floor: target, row: stairs.ref.row, col: stairs.ref.col }));
    if (twin?.kind !== twinKind) graph.issues.push({ rule: "R8", text: `${describeRoom(stairs)} has no ${twinKind} at ${target} (${stairs.ref.row},${stairs.ref.col})` });
    const landing = stairsLanding(graph, stairs, target, twinKind);
    if (landing) addDoor(graph, { from: stairs.key, to: landing.key, kind: "stairs", lock: "none" });
  }
};

/** Teleports pair up in reading order; an odd one out goes nowhere. */
const linkTeleports = (graph: TempleGraph): void => {
  const pads = [...graph.rooms.values()].filter((room) => room.kind === "teleport");
  for (let i = 0; i + 1 < pads.length; i += 2) {
    addDoor(graph, { from: pads[i].key, to: pads[i + 1].key, kind: "teleport", lock: "none" });
    addDoor(graph, { from: pads[i + 1].key, to: pads[i].key, kind: "teleport", lock: "none" });
  }
  if (pads.length % 2 === 1) graph.issues.push({ rule: "R8", text: `${describeRoom(pads[pads.length - 1])} has no partner` });
};

/**
 * Pits: with a floor below, the hero drops as they walk in, so the pit's walking doors are replaced by the drop
 * (the same cell below, else that floor's first stairs up). With no floor below the pit is a bruise, not a door.
 */
const linkPits = (graph: TempleGraph): void => {
  for (const pit of graph.rooms.values()) {
    if (pit.kind !== "pit") continue;
    const below = graph.floors[graph.floors.indexOf(pit.ref.floor) - 1];
    if (!below) continue;
    const sameCell = graph.rooms.get(roomKey({ floor: below, row: pit.ref.row, col: pit.ref.col }));
    if (!sameCell) graph.issues.push({ rule: "R8", text: `${describeRoom(pit)} drops onto a wall at ${below} (${pit.ref.row},${pit.ref.col})` });
    const landing = sameCell ?? firstOfKind(graph, below, "stairs-up");
    if (!landing) continue;
    const walking = graph.out.get(pit.key) ?? [];
    graph.doors = graph.doors.filter((door) => !walking.includes(door));
    graph.out.set(pit.key, []);
    addDoor(graph, { from: pit.key, to: landing.key, kind: "pit", lock: "none" });
  }
};

/** The entrance: the layout's coordinates when they point at a room, else the first entrance room, else nothing. */
const findEntrance = (layout: TempleLayout, graph: TempleGraph): string | undefined => {
  const given = layout.entrance;
  if (given && given.length >= 2) {
    const floor = given.length >= 3 ? graph.floors[given[0]] ?? graph.floors[0] : graph.floors.includes("1F") ? "1F" : graph.floors[0];
    const [row, col] = given.length >= 3 ? [given[1], given[2]] : [given[0], given[1]];
    const room = graph.rooms.get(roomKey({ floor, row, col }));
    if (room) return room.key;
    graph.issues.push({ rule: "R1", text: `the entrance [${given.join(",")}] is not a room` });
  }
  for (const room of graph.rooms.values()) if (room.kind === "entrance") return room.key;
  return undefined;
};

/** Read a layout into rooms and doors. Never throws: what cannot be read is listed in `issues`. */
export const buildTempleGraph = (layout: TempleLayout): TempleGraph => {
  const grids = floorsOf(layout.maze ?? []);
  const floors = Object.keys(grids);
  const issues: GraphIssue[] = [];
  const graph: TempleGraph = { floors, grids, rooms: collectRooms(layout, floors, grids, issues), doors: [], out: new Map(), issues };
  linkNeighbours(graph);
  linkStairs(graph);
  linkTeleports(graph);
  linkPits(graph);
  graph.entrance = findEntrance(layout, graph);
  return graph;
};

/** Rooms of a kind, in reading order. */
export const roomsOfKind = (graph: TempleGraph, kind: string): GraphRoom[] => [...graph.rooms.values()].filter((room) => room.kind === kind);

/**
 * Rooms reachable from `start`, treating every door as open except the ones `closed` names and never entering
 * `blocked` rooms. Pits still drop one way. Returns the room keys in the order they were reached.
 */
export const reachableFrom = (graph: TempleGraph, start: string, blocked: ReadonlySet<string> = new Set(), closed: ReadonlySet<string> = new Set()): string[] => {
  if (!graph.rooms.has(start) || blocked.has(start)) return [];
  const seen = new Set<string>([start]);
  const order = [start];
  for (let i = 0; i < order.length; i++) {
    for (const door of graph.out.get(order[i]) ?? []) {
      if (seen.has(door.to) || blocked.has(door.to) || closed.has(door.id)) continue;
      seen.add(door.to);
      order.push(door.to);
    }
  }
  return order;
};
