/**
 * The shape of `tools/temples/classic/dungeons/<id>.json`: one classic dungeon (an LTTP palace, later the
 * Zelda 1 Eagle) as floors of screen-sized cells. `convert.py` writes exactly this; the dress step reads it.
 * The names here are a contract between the converter, the spec and the dress step: keep them verbatim.
 */
export type ClassicSide = "open" | "small-key" | "big-key" | "bomb" | "shutter" | "item" | "wall";
export interface ClassicLink { to: string; row: number; col: number } // floor name, then the arrival cell
export interface ClassicCell {
  row: number; col: number;
  room: string; // the LTTP room this screen belongs to; cells of one hall share it
  sides: Record<"north" | "east" | "south" | "west", ClassicSide>;
  enemies: number;
  chest?: "map" | "compass" | "big-key" | "big-chest" | "small-key" | "other";
  keyDrop?: "small" | "big";
  potKey?: true; boss?: true; puzzle?: true; shutter?: true; entrance?: true;
  stairs?: ClassicLink; hole?: ClassicLink; teleport?: ClassicLink;
}
export interface ClassicFloor { name: string; rows: number; cols: number; cells: ClassicCell[] }
export interface ClassicDungeon {
  id: string; source: string; // "LTTP Tower of Hera"
  floors: ClassicFloor[]; // bottom to top
  report: { cellsPerFloor: Record<string, number>; mustClear: number; side: number; smallKeys: number; smallLocks: number };
}
