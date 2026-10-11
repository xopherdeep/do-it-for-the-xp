/**
 * The painter behind the temple's pixel sprites (the chest, the doors): paint cells on a grid, ink the outline, then
 * merge each row into runs of one colour that an SVG draws as rects with crisp edges.
 */

export interface PixelRun {
  x: number;
  y: number;
  w: number;
  fill: string;
}

export type Grid = (string | null)[][];

export const createGrid = (width: number, rows: number): Grid =>
  Array.from({ length: rows }, () => Array<string | null>(width).fill(null));

export const paint = (g: Grid, x: number, y: number, fill: string): void => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[y].length) g[y][x] = fill;
};

/** Merge each row into runs of one colour, shifted down by `top` rows into the sprite's frame. */
export const gridRuns = (g: Grid, top = 0): PixelRun[] => {
  const runs: PixelRun[] = [];
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = row[x];
      if (!fill) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === fill) end++;
      runs.push({ x, y: y + top, w: end - x, fill });
      x = end;
    }
  });
  return runs;
};

/** The outermost painted pixels become `ink`, so the shape has a one-pixel outline. */
export const outlineGrid = (g: Grid, ink: string): void => {
  const painted = g.map((row) => row.map((cell) => cell !== null && cell !== ink));
  painted.forEach((row, y) =>
    row.forEach((isPainted, x) => {
      if (!isPainted) return;
      const edge =
        x === 0 || x === row.length - 1 || y === 0 || y === g.length - 1 ||
        !painted[y - 1]?.[x] || !painted[y + 1]?.[x] || !row[x - 1] || !row[x + 1];
      if (edge) g[y][x] = ink;
    }),
  );
};

/** How far a row is pulled in from each side by a rounded corner of radius `r` (row 0 is the top). */
export const cornerInset = (row: number, r: number): number => {
  if (row >= r) return 0;
  const dy = r - row - 0.5;
  return Math.max(0, Math.round(r - Math.sqrt(r * r - dy * dy)));
};
