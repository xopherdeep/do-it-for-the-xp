import type { WallSide } from '../templeWalls';

/** What the cracked wall's sheet shows: what the wall says and whether the hero can blow it open, from what is held. */
export interface BombView {
  /** The wall the hero tapped: the Bomb tries this one first */
  side: WallSide;
  canBomb: boolean;
  header: string;
  line: string;
  /** The Bombs in the pack: the count on the sheet */
  bombs: number;
}

/** What the hero holds: the Bombs in a hand (the item) and the Bomb stack in the pack (what it spends) */
export interface BombStock {
  holdsBombs: boolean;
  bombs: number;
}

/** How the page answers the Bomb: the wall is down and the sheet plays the crumble, or the temple refused and the sheet goes. */
export type BombResult = 'blown' | 'refused';

export const CRACKED_WALL_HEADER = 'Cracked Wall';

const CRACKED_LINE = 'The wall is cracked.';

/** The sentence under the header: only a hero with the Bombs in a hand and a Bomb to spend hears nothing more. */
const lineFor = ({ holdsBombs, bombs }: BombStock): string => {
  if (holdsBombs && bombs > 0) return CRACKED_LINE;
  if (holdsBombs) return `${CRACKED_LINE} You are out of Bombs.`;
  if (bombs > 0) return `${CRACKED_LINE} Hold the Bombs in a hand and a Bomb would do it.`;
  return `${CRACKED_LINE} A Bomb would do it.`;
};

export const bombView = (side: WallSide, stock: BombStock): BombView => ({
  side,
  canBomb: stock.holdsBombs && stock.bombs > 0,
  header: CRACKED_WALL_HEADER,
  line: lineFor(stock),
  bombs: stock.bombs
});
