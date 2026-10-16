// Boobeedeedle's roadside stall, drawn as pixel maps: one character per pixel, "." is empty.
// The pixels are merged into runs by spriteRuns, so each sprite is a few hundred <rect>s drawn once.

export const STALL_PALETTE: Record<string, string> = {
  B: "#6b4320",
  C: "#2e467c",
  G: "#5b5f68",
  H: "#2c5a36",
  L: "#ffc94a",
  M: "#b84a3a",
  N: "#8a3328",
  R: "#7e2626",
  S: "#c98e5c",
  T: "#a8814a",
  W: "#c9c2ad",
  Y: "#9a6f22",
  b: "#9a6a34",
  c: "#4a6aae",
  e: "#1a1020",
  g: "#9aa0aa",
  h: "#4a8a52",
  k: "#2a1a12",
  l: "#fff2a8",
  m: "#e9dcb8",
  n: "#e8835a",
  o: "#3a2418",
  p: "#5a4672",
  r: "#c0443c",
  s: "#f2c28f",
  t: "#d8b27a",
  w: "#f4efe0",
  y: "#e3b04b",
};

export const STALL_SPRITES = {
  /** The peddler, facing right, under a pack taller than he is (a bedroll on top, a pan and a pot on the side) */
  peddler: [
    "...kkkkkkkkkkkkkkkkkkk................",
    "..krrrrrrtrrrrrrtrrrrrk...............",
    ".kRrrrrrrtrrrrrrtrrrrrRk..............",
    ".kRrrrrrrtrrrrrrtrrrrrRk........k.....",
    ".kRrrrrrrtrrrrrrtrrrrrRk.......knk....",
    ".kRRRRRRRtRRRRRRtRRRRRRk......knk.....",
    "..kRRRRRRtRRRRRRtRRRRRk.kkkkkknk......",
    "...kBBbbbbbbbbbbbbbbbk.khhhhhkknk.....",
    "...kBBbbbbbbbbbbbbbbbkkhhhhhhhkk......",
    "...kBBBBBBBBBBBBBBBbbkHHhhhhhhhk......",
    "...kBBBBBBBBBBBBBBBbbkHHhhhhhhhk......",
    "..kkBBbBBBBBBBBBBBbbbkHHhhhhhhhk......",
    ".kGkBBbBbbbbbbbbbBbbbkrrrrrrrrrkkkkk..",
    ".kGkBBbBbbbbbbbbbBbhhhhhhhhhhhhhhhhhk.",
    ".kGkBBbBbbbbybbbbBbHHHHHHHHHHHHHHHHHk.",
    ".kGkBBbBbbbbYbbbbBbbbkkSSsssHHHsskkk..",
    ".kGkBBbBbbbbbbbbbBbbbkkSSsssssesskk...",
    ".kGGBBbBBBBBBBBBBBbbbkkSSsssssessssk..",
    ".kGGBBbbbbbbbbbbbbbbbkkSSsssssssssssk.",
    "..kkBBbbbbbbbbbbbbbbbkkSSsssssssnnSk..",
    "...kBBbbbbbbbbbbbbbbbkkWWwwwwwwsskk...",
    "..kkBBbbbbbbbbbbbbbbbkkWWwwwwwwwwk....",
    ".ktkBBbbbbbbbbbbbbbbbkkWWwwwwwwwwk....",
    ".ktkBBbbbbbbbbbbbbbbbtCCccccccccck....",
    ".ktkBtttttttyyttttttttCCccccccccck....",
    ".ktkBTTTTTTTYYTTTTTTTCtCcCCCCcccck....",
    ".ktkBBbbbbbbbbbbbbbbbCtCCCCCCcccck....",
    ".ktkBBbbbbbbbbbbbbbbbCCtcCCCCcccCk....",
    ".kYYBBBBBBBBBBBBBBBbbCCtcCCCCcccCk....",
    ".kyyBBBbbbbbbbbbbbBbbCCCcCCCCcccCk....",
    ".kyyBBBbbbbbbbbbbbBbbTTTTCCCCTTTCk....",
    ".kyyBBBbbbbbbbbbbbBbbCCCcCCCccccssk...",
    ".kYYBBBbbbbbbbbbbbBbbCCCcCCCccccssk...",
    "..kkBBBBBBBBBBBBBBBbbCCCccccccccCk....",
    "...kBBbbbbbbbbbbbbbbbCCCccccccccCk....",
    "...kBBbbbbbbbbbbbbbbCCCccccccccccck...",
    "...kBBBBBBBBBBBBBBBbCCCccccccccccck...",
    "....kBBBBBBBBBBBBBBkkkkpppkkpppkkk....",
    ".....kkkkkkkkkkkkkk...kpppkkpppk......",
    "......................kpppkkpppk......",
    "......................kpppkkpppk......",
    "......................kpppkkpppk......",
    "......................kpppkkpppk......",
    "......................kpppkkpppkk.....",
    ".....................koooooooooook....",
    ".....................koooooooooook....",
    ".....................koooooooooook....",
    "......................kkkkkkkkkkk.....",
  ],
  /** A crooked post with a lantern hanging off its arm */
  post: [
    "............kBbbk.",
    "............kBbbk.",
    "..kkkkkkkkkkkBbbk.",
    ".kbbbbbbbbbbbbbbk.",
    ".kBBBBBBBBBBBBBBk.",
    "..kkGkkkkkkkbBbbk.",
    "...kGk....kbbBbbk.",
    "..kkGkk....kkBbbk.",
    ".kGGGGGk....kBbbk.",
    ".kGGGGGk....kBbbk.",
    "kGGGGGGGk...kBbbk.",
    "kGLLGLLGk...kBbbk.",
    "kLLlllLLk...kBbbk.",
    "kLLlllLLk...kBbbk.",
    "kLLlllLLk...kBbbk.",
    "kLLlllLLk...kBbbk.",
    "kLLlllLLk...kBbbk.",
    "kLLLGLLLk...kBbbk.",
    "kGGGGGGGk...kBbbk.",
    ".kGGGGGk....kBbbk.",
    "..kkkkk.....kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "............kBbbk.",
    "...........kkBbbkk",
    "..........kBBBBBBB",
    "..........kBBBBBBB",
  ],
  /** The blanket his wares sit on, its near edge fringed */
  blanket: [
    ".......kNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk.......",
    "......kmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMk......",
    ".....kMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmk.....",
    "....kmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMk....",
    "....kMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmk....",
    "...kMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmk...",
    "..kmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMk..",
    ".kmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMMMmmmmmmMMMMk.",
    "kNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk",
    ".kmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkmkk.",
    "..k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k.k...",
  ],
  /** A red potion */
  potion: [
    "...kTTk..",
    "...kggk..",
    "..kkggkk.",
    ".krrrrrrk",
    ".krwrrrrk",
    ".krwrrrrk",
    ".krrrrrrk",
    ".kRRRRRRk",
    "..krrrrk.",
    "...kkkk..",
  ],
  /** A sealed scroll */
  scroll: [
    ".kkkkkkkkkk",
    "kWwwwwwwwwW",
    "kWwTTTTTwwW",
    "kWwwwrrwwwW",
    "kWwTTrrwwwW",
    "kWwwwrrwwwW",
    ".kkkkkkkkkk",
    "...........",
  ],
  /** A coin pouch */
  pouch: [
    "..kbbbk..",
    "..kbbbk..",
    ".ktttttk.",
    "kbbbbbbbk",
    "kbbbbbbbk",
    "kbbbybbbk",
    "kbbbbbbbk",
    "kBBBBBBBk",
    ".kBBBBBk.",
  ],
  /** A gold ring with a blue stone */
  ring: [
    "..kwck..",
    "..kcck..",
    ".kyyyyk.",
    "kykkkkyk",
    "kyk..kyk",
    "kykkkkyk",
    ".kYYYYk.",
    "..kkkk..",
  ],
} as const;

export type StallSpriteName = keyof typeof STALL_SPRITES;

/** One horizontal run of same-coloured pixels */
export interface SpriteRun {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** A pixel map as runs of colour, ready to draw as <rect>s */
export const spriteRuns = (rows: readonly string[], palette: Record<string, string> = STALL_PALETTE): SpriteRun[] => {
  const runs: SpriteRun[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      const fill = palette[key];
      if (fill) runs.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return runs;
};

/** How big a pixel map is, in pixels */
export const spriteSize = (rows: readonly string[]) => ({ w: rows[0]?.length ?? 0, h: rows.length });
