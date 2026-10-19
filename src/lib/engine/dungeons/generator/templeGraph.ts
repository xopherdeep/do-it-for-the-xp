/**
 * Temple graph: a `Dungeon` layout (floors of room tokens, a `rooms` table) read as rooms joined by doors.
 *
 * This is the shape the solver and the generator share (docs/Temple-Generation-Contract.md). It follows the
 * engine's rules of movement, not an idealised version of them:
 * - two orthogonally adjacent non-wall cells on a floor are joined by a door, unless a room draws a wall
 *   (`room.barriers`, either end) on the side between them: that side is no door at all. A side drawn as a cracked wall
 *   is a door that only a Bomb opens (`lock: "bomb"`): the solver opens it once the hero has reached a room that gives
 *   out a Bomb (a shop, a Bomb chest, a fight room's Bomb drop, see roomGrants.isBombSource), never before;
 * - `room.locked[direction]` locks the door in that direction only (the engine checks the room the hero stands
 *   in), so a door is a directed edge and a key opens one direction;
 * - every door into a boss room is the boss door and needs the master key (the engine's `doorKind` reads the room it
 *   steps into, not `locked.master`, which the generator keeps as a note); walking out is not barred;
 * - a room hands out keys only as play does (roomGrants): loot rooms with a Dungeon Item chest, their "key" rows, Key
 *   rooms, and what a monster, mini-boss or boss drops (`content.drops`); a key written into a mini-boss room's chest
 *   is never handed out;
 * - Bombs never open a locked door: a cracked wall into a boss room is still the boss door (the Bomb breaks the wall,
 *   the master key opens the door), and a small lock still wants its key;
 * - stairs up lead to the next floor up in the climbing order (floorOrder: B1, 1F, 2F), stairs down to the next one
 *   down, landing on the requested coordinates, else the first matching stairs on that floor, else the same cell
 *   (R8 wants pairs at the same row and column);
 * - a teleport leads where `teleportTargetFor` sends the hero: the author's target, else the next circle on its
 *   floor (wrapping), else the temple's next circle; a circle with none leads nowhere (R8);
 * - a pit drops the hero to the floor below (same cell, else that floor's first stairs up) when there is one,
 *   and is an ordinary room otherwise.
 *
 * A `rooms` entry is shared by every cell that uses its token (the authored temples do this), so a lock on a
 * token locks every room spelled with it. Generated temples give each room a token of its own.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import { teleportTargetFor } from "@/lib/engine/core/dungeons/teleportPairing";
import { neighbourFloorOf } from "@/lib/engine/core/dungeons/floorOrder";
import { barrierBetween, isBossRoom } from "@/lib/services/temples/authoredDoors";
import { grantsBossKey, isBombSource, smallKeysGranted } from "@/lib/services/temples/roomGrants";

export type Direction = "north" | "south" | "east" | "west";

/** Clockwise from the top of the map, the order the screen looks at sides. */
export const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

export const OPPOSITE: Record<Direction, Direction> = { north: "south", south: "north", east: "west", west: "east" };

export const STEP: Record<Direction, [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

/** The part of a `Dungeon` the solver reads. Authored temples and TempleDb layouts fit it as they are. */
export interface TempleLayout {
  id?: string;
  name?: string;
  /** `[row, col]` on the first floor of the layout's order, or `[floorIndex, row, col]` */
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

/** What opens a door: nothing, a small key, the master key (boss doors), or a Bomb (a cracked wall) */
export type LockKind = "none" | "small" | "master" | "bomb";

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
  /** A hero who reaches this room can take a Bomb: a shop, a Bomb chest, a fight room that drops one */
  bombs: boolean;
  /** The Pegasus chest, the prize behind the boss */
  prize: boolean;
}

/** Something the layout got wrong while being read, filed under the rule it breaks. */
export interface GraphIssue {
  rule: "R1" | "R8";
  text: string;
}

export interface TempleGraph {
  /** The floors in the order the maze map holds them (the entrance's floor index counts in it), not the climbing order */
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

/** The Master Room (`master`, or its older name the Dragon Egg) is the Pegasus chamber, whatever it was edited from. */
const MASTER_ROOM_KINDS = new Set(["master", "dragon-egg", "dragon_egg"]);

/** The Pegasus chest: a Master Room, a room flagged `content.pegasus`, or a chest whose prize is named after the Pegasus. */
const isPrize = (room: Room, kind: string): boolean => {
  const content = room.content ?? {};
  return MASTER_ROOM_KINDS.has(kind) || content.pegasus === true || /pegasus/i.test(String(content.dungeon ?? ""));
};

const makeRoom = (ref: RoomRef, token: string, room: Room): GraphRoom => {
  const kind = kindOf(room);
  return {
    key: roomKey(ref),
    ref,
    token,
    room,
    kind,
    // What play hands out (roomGrants), not what the layout says: a key in a mini-boss room never reaches the hero
    smallKeys: smallKeysGranted(room),
    masterKey: grantsBossKey(room),
    bombs: isBombSource(room),
    prize: isPrize(room, kind),
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
          const isUnknownToken = token !== "_";
          if (isUnknownToken) issues.push({ rule: "R1", text: `unknown room token "${token}" at ${floor} (${row},${col})` });
          return;
        }
        const isImpassable = IMPASSABLE.has(kindOf(room));
        if (isImpassable) return;
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
      const isOfKind = room?.kind === kind;
      if (isOfKind) return room;
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

/**
 * The lock on walking from `from` to `to`: any door into a boss room needs the master key (the engine's rule, so
 * a boss room drawn without `locked.master` is just as barred), a locked side a small key.
 */
const lockBetween = (from: GraphRoom, to: GraphRoom, direction: Direction): LockKind => {
  const isMasterDoor = isBossRoom(to.room);
  if (isMasterDoor) return "master";
  return from.room.locked?.[direction] ? "small" : "none";
};

/**
 * Walking doors: each room to each standable neighbour, one directed door per way. A side drawn as a wall is no door.
 * A side drawn bombable is a door that only a Bomb opens (`lock: "bomb"`), one way each: the solver opens it once the hero
 * has reached a room that gives out a Bomb inside the temple (a shop, a Bomb chest, a Bomb drop), and never before, so a
 * temple counts on a Bomb only when it hands one out. A Bomb never opens a locked door: a cracked wall into a boss room is
 * still the boss door (`master`, the Bomb breaks the wall and the master key opens the door). The engine's doorKind asks
 * the same barrierBetween.
 */
const linkNeighbours = (graph: TempleGraph): void => {
  for (const from of graph.rooms.values()) {
    for (const direction of DIRECTIONS) {
      const [dr, dc] = STEP[direction];
      const to = graph.rooms.get(roomKey({ floor: from.ref.floor, row: from.ref.row + dr, col: from.ref.col + dc }));
      if (!to) continue;
      const barrier = barrierBetween(from.room, to.room, direction);
      const isWall = barrier === "wall";
      if (isWall) continue;
      const isCrackedWall = barrier === "bombable" && !isBossRoom(to.room);
      const lock = isCrackedWall ? "bomb" : lockBetween(from, to, direction);
      addDoor(graph, { from: from.key, to: to.key, kind: "door", lock, direction });
    }
  }
};

/** Where a flight of stairs lands, the engine's way: requested coordinates, the floor's first matching stairs, the same cell. */
const stairsLanding = (graph: TempleGraph, stairs: GraphRoom, target: string, wantedKind: string): GraphRoom | undefined => {
  const coords = stairs.room.content?.targetCoords;
  const requested = coords ? graph.rooms.get(roomKey({ floor: target, row: Number(coords.y), col: Number(coords.x) })) : undefined;
  return requested ?? firstOfKind(graph, target, wantedKind) ?? graph.rooms.get(roomKey({ floor: target, row: stairs.ref.row, col: stairs.ref.col }));
};

/** Stairs: up goes to the next floor up in the climbing order (basements below 1F), down to the one below. R8 wants the twin on the same cell. */
const linkStairs = (graph: TempleGraph): void => {
  for (const stairs of graph.rooms.values()) {
    const isNotStaircase = stairs.kind !== "stairs-up" && stairs.kind !== "stairs-down";
    if (isNotStaircase) continue;
    const up = stairs.kind === "stairs-up";
    const target = (stairs.room.content?.targetLevel as string | undefined) ?? neighbourFloorOf(graph.floors, stairs.ref.floor, up ? 1 : -1);
    const twinKind = up ? "stairs-down" : "stairs-up";
    const isDeadEndStairs = !target || !graph.floors.includes(target) || target === stairs.ref.floor;
    if (isDeadEndStairs) {
      graph.issues.push({ rule: "R8", text: `${describeRoom(stairs)} leads to no floor` });
      continue;
    }
    const twin = graph.rooms.get(roomKey({ floor: target, row: stairs.ref.row, col: stairs.ref.col }));
    const isTwinMissing = twin?.kind !== twinKind;
    if (isTwinMissing) graph.issues.push({ rule: "R8", text: `${describeRoom(stairs)} has no ${twinKind} at ${target} (${stairs.ref.row},${stairs.ref.col})` });
    const landing = stairsLanding(graph, stairs, target, twinKind);
    if (landing) addDoor(graph, { from: stairs.key, to: landing.key, kind: "stairs", lock: "none" });
  }
};

/**
 * Teleports: each circle leads where the engine sends the hero (teleportTargetFor: the author's target, else the
 * next circle on its floor wrapping, else the temple's next circle). Circles are not pairs, so a ride one way
 * need not come back; a circle the engine finds no target for leads nowhere.
 */
const linkTeleports = (graph: TempleGraph, layout: TempleLayout): void => {
  for (const pad of graph.rooms.values()) {
    const isTeleport = pad.kind === "teleport";
    if (!isTeleport) continue;
    const destination = teleportTargetFor(layout, pad.ref.floor, [pad.ref.row, pad.ref.col]);
    const landing = destination && graph.rooms.get(roomKey({ floor: destination.level, row: destination.position[0], col: destination.position[1] }));
    if (!landing) {
      graph.issues.push({ rule: "R8", text: `${describeRoom(pad)} leads nowhere` });
      continue;
    }
    addDoor(graph, { from: pad.key, to: landing.key, kind: "teleport", lock: "none" });
  }
};

/**
 * Pits: with a floor below, the hero drops as they walk in, so the pit's walking doors are replaced by the drop
 * (the same cell below, else that floor's first stairs up). With no floor below the pit is a bruise, not a door.
 */
const linkPits = (graph: TempleGraph): void => {
  for (const pit of graph.rooms.values()) {
    const isPit = pit.kind === "pit";
    if (!isPit) continue;
    const below = neighbourFloorOf(graph.floors, pit.ref.floor, -1);
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

/** The floor an entrance names, as the engine starts the hero (startAt): [floorIndex, row, col] picks by place in the order, [row, col] is the first floor. */
const resolveEntranceFloor = (given: number[], graph: TempleGraph): string => {
  const hasFloorIndex = given.length === 3;
  if (hasFloorIndex) {
    return graph.floors[given[0]] ?? graph.floors[0];
  }
  return graph.floors[0];
};

/** The entrance: the layout's coordinates when they point at a room, else the first entrance room, else nothing. */
const findEntrance = (layout: TempleLayout, graph: TempleGraph): string | undefined => {
  const given = layout.entrance;
  const hasEntranceCoords = given && given.length >= 2;
  if (hasEntranceCoords) {
    const floor = resolveEntranceFloor(given, graph);
    const [row, col] = given.length === 3 ? [given[1], given[2]] : [given[0], given[1]];
    const room = graph.rooms.get(roomKey({ floor, row, col }));
    if (room) return room.key;
    graph.issues.push({ rule: "R1", text: `the entrance [${given.join(",")}] is not a room` });
  }
  for (const room of graph.rooms.values()) {
    const isEntrance = room.kind === "entrance";
    if (isEntrance) return room.key;
  }
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
  linkTeleports(graph, layout);
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
  const isStartUnreachable = !graph.rooms.has(start) || blocked.has(start);
  if (isStartUnreachable) return [];
  const seen = new Set<string>([start]);
  const order = [start];
  for (let i = 0; i < order.length; i++) {
    for (const door of graph.out.get(order[i]) ?? []) {
      const shouldSkipDoor = seen.has(door.to) || blocked.has(door.to) || closed.has(door.id);
      if (shouldSkipDoor) continue;
      seen.add(door.to);
      order.push(door.to);
    }
  }
  return order;
};
