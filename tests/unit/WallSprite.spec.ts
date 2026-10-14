import { WALL_H, WALL_W, wallBricks, wallCrack, wallHole } from "@/app/Console/TempleGrounds/components/wallSprite";

// The cracked wall the Bomb sheet draws: a wall of stone blocks with a fissure down it. The blocks around the fissure are
// the ones that let go, so the sheet can drop them one by one and leave the opening.

describe("wallBricks", () => {
  it("tiles the whole wall, every cell in exactly one block", () => {
    const covered = Array.from({ length: WALL_H }, () => Array<number>(WALL_W).fill(0));
    wallBricks("wind").forEach((brick) =>
      brick.runs.forEach((run) => {
        for (let x = run.x; x < run.x + run.w; x++) covered[run.y][x] += 1;
      })
    );

    expect(covered.flat().every((count) => count === 1)).toBe(true);
  });

  it("lets go of the blocks around the fissure and keeps the rest as a frame", () => {
    const bricks = wallBricks("wind");
    const falling = bricks.filter((brick) => brick.falls);

    expect(falling.length).toBeGreaterThanOrEqual(6);
    expect(falling.length).toBeLessThan(bricks.length / 2);
    // The top and bottom courses hold, so the opening has a lintel and a sill
    const frameRows = bricks.filter((brick) => !brick.falls).flatMap((brick) => brick.runs.map((run) => run.y));
    expect(frameRows).toEqual(expect.arrayContaining([0, WALL_H - 1]));
    falling.forEach((brick) => expect(brick.runs.every((run) => run.y >= 8 && run.y < WALL_H - 8)).toBe(true));
  });

  it("drops the blocks one after another, nearest the fissure's heart first, each with its own drift", () => {
    const falling = wallBricks("wind").filter((brick) => brick.falls);

    expect(falling.map((brick) => brick.order).sort((a, b) => a - b)).toEqual(falling.map((_, i) => i));
    const first = falling.find((brick) => brick.order === 0)!;
    const xs = first.runs.map((run) => run.x + run.w / 2);
    expect(Math.abs(xs.reduce((sum, x) => sum + x, 0) / xs.length - WALL_W / 2)).toBeLessThan(8);
    expect(new Set(falling.map((brick) => `${brick.drift}/${brick.turn}`)).size).toBeGreaterThan(3);
  });

  it("is the same wall every time, in the colours of the temple's stone", () => {
    expect(wallBricks("ice")).toEqual(wallBricks("ice"));
    const fills = (element: string) => new Set(wallBricks(element).flatMap((brick) => brick.runs.map((run) => run.fill)));
    expect(fills("fire")).not.toEqual(fills("ice"));
    expect(fills("unheard-of")).toEqual(fills("wind"));
  });
});

describe("wallHole", () => {
  it("is the box around the blocks that fall, inside the wall", () => {
    const hole = wallHole();
    const falling = wallBricks("wind").filter((brick) => brick.falls);
    const runs = falling.flatMap((brick) => brick.runs);

    expect(hole.top).toBe(Math.min(...runs.map((run) => run.y)));
    expect(hole.bottom).toBe(Math.max(...runs.map((run) => run.y)));
    expect(hole.left).toBe(Math.min(...runs.map((run) => run.x)));
    expect(hole.right).toBe(Math.max(...runs.map((run) => run.x + run.w - 1)));
    expect(hole.left).toBeGreaterThan(0);
    expect(hole.right).toBeLessThan(WALL_W - 1);
  });
});

describe("wallCrack", () => {
  it("runs the fissure unbroken from the top of the wall to the bottom, through the heart of the opening", () => {
    const { dark } = wallCrack();
    const rows = new Set(dark.map((run) => run.y));

    for (let y = 0; y < WALL_H; y++) expect(rows.has(y)).toBe(true);
    dark.forEach((run) => {
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.x + run.w).toBeLessThanOrEqual(WALL_W);
    });
    const middle = dark.filter((run) => run.y === WALL_H / 2);
    expect(middle.some((run) => run.x <= WALL_W / 2 && run.x + run.w > WALL_W / 2 - 4)).toBe(true);
  });

  it("lights it from behind: a glow pixel sits beside the dark one on every row", () => {
    const { dark, glow } = wallCrack();

    for (let y = 0; y < WALL_H; y++) {
      const darkRuns = dark.filter((run) => run.y === y);
      const touches = glow.filter((run) => run.y === y).some((lit) => darkRuns.some((run) => lit.x + lit.w === run.x || lit.x === run.x + run.w));
      expect(touches).toBe(true);
    }
  });
});
