/**
 * A temple drawn as text and counted: what the Temple Creator shows before a generated layout is saved, and what
 * a spec can compare without a DOM. Pure functions over the `Dungeon` shape (contract section 1).
 */
import type { Dungeon } from "@/lib/engine/core/dungeons/types";
import { floorsOf, kindOf, type RoomRef } from "./templeGraph";

/** One character per room kind; a wall is a space so the maze reads as corridors. */
export const PREVIEW_CHARS: Record<string, string> = {
  wall: " ",
  void: " ",
  empty: ".",
  entrance: "E",
  gate: "G",
  boss: "B",
  miniboss: "b",
  monster: "s",
  loot: "O",
  key: "k",
  master: "K",
  shop: "P",
  health: "H",
  mana: "M",
  camp: "C",
  save: "V",
  trap: "T",
  puzzle: "Z",
  pit: "v",
  teleport: "Y",
  "stairs-up": "U",
  "stairs-down": "D",
  secret: "?",
};

/** Marks the rooms of a highlighted path when they are plain rooms, so the route reads through the maze. */
export const PATH_CHAR = "+";

export interface FloorPreview {
  floor: string;
  rows: string[];
}

export interface TempleSummary {
  floors: number;
  rows: number;
  cols: number;
  /** Standable rooms over every floor */
  rooms: number;
  byKind: Record<string, number>;
  monsters: number;
  /** Small keys placed in chests */
  keys: number;
  /** Doors locked with a small key (one per locked side) */
  locks: number;
  hasMasterKey: boolean;
  hasPegasus: boolean;
  chests: number;
}

const isPegasusChest = (item: string, room: Dungeon["rooms"][string] | undefined): boolean => item === "pegasus" || Boolean(room?.content?.pegasus);

/** The character a room shows: a key or master-key chest by its item, a Pegasus chest or Master Room with a star, else by kind. */
export const previewChar = (dungeon: Pick<Dungeon, "rooms">, token: string): string => {
  const room = dungeon.rooms[token];
  const kind = kindOf(room);
  if (kind === "master") return "*";
  if (kind === "loot") {
    const item = String(room?.content?.dungeon ?? "").toLowerCase();
    if (item === "key") return PREVIEW_CHARS.key;
    if (item === "master-key") return PREVIEW_CHARS.master;
    if (isPegasusChest(item, room)) return "*";
  }
  return PREVIEW_CHARS[kind] ?? "?";
};

/**
 * Each floor as rows of characters. Rooms on `highlight` (the solver's critical path) that would otherwise draw
 * as plain rooms draw as `+` instead, so the route stands out while every special room keeps its letter.
 */
export const previewRows = (dungeon: Pick<Dungeon, "maze" | "rooms">, highlight: RoomRef[] = []): FloorPreview[] => {
  const floors = floorsOf(dungeon.maze);
  const marked = new Set(highlight.map((ref) => `${ref.floor}:${ref.row},${ref.col}`));
  return Object.entries(floors).map(([floor, grid]) => ({
    floor,
    rows: grid.map((row, r) =>
      row
        .map((token, c) => {
          const char = previewChar(dungeon, token);
          return char === PREVIEW_CHARS.empty && marked.has(`${floor}:${r},${c}`) ? PATH_CHAR : char;
        })
        .join("")
    ),
  }));
};

/** Counts of what the temple holds, for the creator's verdict card and for specs. */
export const summarize = (dungeon: Pick<Dungeon, "maze" | "rooms">): TempleSummary => {
  const floors = floorsOf(dungeon.maze);
  const grids = Object.values(floors);
  const summary: TempleSummary = {
    floors: grids.length,
    rows: grids[0]?.length ?? 0,
    cols: grids[0]?.[0]?.length ?? 0,
    rooms: 0,
    byKind: {},
    monsters: 0,
    keys: 0,
    locks: 0,
    hasMasterKey: false,
    hasPegasus: false,
    chests: 0,
  };
  for (const grid of grids) {
    for (const row of grid) {
      for (const token of row) {
        const room = dungeon.rooms[token];
        const kind = kindOf(room);
        const isUnstandable = kind === "wall" || kind === "void";
        if (isUnstandable) continue;
        summary.rooms++;
        summary.byKind[kind] = (summary.byKind[kind] ?? 0) + 1;
        const isFoeRoom = kind === "monster" || kind === "miniboss" || kind === "boss";
        if (isFoeRoom) summary.monsters++;
        if (room?.locked) {
          for (const [side, locked] of Object.entries(room.locked)) {
            const isSmallKeyLock = locked && side !== "master";
            if (isSmallKeyLock) summary.locks++;
          }
        }
        if (room?.content?.chest) {
          summary.chests++;
          const item = String(room.content.dungeon ?? "").toLowerCase();
          if (item === "key") summary.keys++;
          if (item === "master-key") summary.hasMasterKey = true;
          if (isPegasusChest(item, room)) summary.hasPegasus = true;
        }
      }
    }
  }
  return summary;
};
