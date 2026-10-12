/**
 * The words every room interaction shares: the shapes the screen deals in (context, outcome, sheet), the
 * sound keys, the compass directions, the names room kinds go by, and the two text helpers for toasts.
 */
import type { Room } from '@/lib/engine/core/dungeons/types';
import { isPegasusRoom } from '../ChestLoot';

export type Direction = 'north' | 'south' | 'east' | 'west';

/** Look order for "the first locked side" and "the first hazard": clockwise from the top of the map. */
export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west'];

/** Keys of `play$fx` (src/assets/fx). The secret sting is stored as `shhh`; the table has no teleport sound. */
export const SFX = {
  restoreHP: 'restoreHP',
  restoreMP: 'restoreMP',
  restoreAll: 'restoreAll',
  damage: 'damage',
  error: 'error',
  secret: 'shhh',
  teleport: 'okdesuka',
  buy: 'buyItem',
  yes: 'yes',
  loot: 'loot',
  takeItem: 'takeItem',
  key: 'key',
  useKey: 'useKey',
  gainGP: 'gainGP',
  steps: 'steps',
} as const;

// --- the shapes the screen deals in ----------------------------------------------------------------

export interface RoomContext {
  userId: string;
  templeId: string;
  level: string;
  position: [number, number];
  /** Dice. Tests pass a fixed one; the game uses Math.random. */
  rng?: () => number;
}

/** A multiple-choice riddle as the screen shows it: the answer stays here. */
export interface Riddle {
  id: string;
  question: string;
  choices: string[];
}

export interface Ware {
  id: string;
  name: string;
  price: number;
  blurb: string;
  soldOut?: boolean;
}

/** What the screen has to open or do beyond a toast and a sound. */
export type RoomIntent = 'leave' | 'fight' | 'openChest' | 'emptyChest' | 'teleport' | 'riddle' | 'shop' | 'sheet';

export interface RoomOutcome {
  /** A toast, in the temple's voice */
  message?: string;
  /** A `play$fx` key */
  sound?: string;
  /** Shake the game area for 400 ms */
  shake?: boolean;
  intent?: RoomIntent;
  riddle?: Riddle;
  wares?: Ware[];
  /** The hero's wallet, for the shop */
  gp?: number;
  /** The hero fell to 0 HP: HP is back to full already, the screen sends them to game over */
  defeated?: boolean;
  /** The hero is in another room (or floor) now: the screen runs the entry check for it */
  moved?: boolean;
  /** The temple was just cleared: the screen celebrates with this reward before the hero walks out (the toast stays unsaid) */
  cleared?: ClearedReward;
}

/** What the temple paid for being cleared: the coins as paid (with the hero's bonuses), and whether the XP levelled them up. */
export interface ClearedReward {
  xp: number;
  gp: number;
  ap: number;
  levelUp: boolean;
}

export interface RoomAction {
  label: string;
  run: () => RoomOutcome | Promise<RoomOutcome>;
}

export interface RoomSheet {
  header: string;
  subHeader?: string;
  /** The room's own actions; the screen adds Cancel */
  actions: RoomAction[];
  /** An encounter's first beast (a Bestiary id): the screen looks up its picture and name for the reveal */
  beastId?: string;
  /**
   * A chest: the screen opens the chest itself instead of this sheet (a shut chest to open, or an open empty one).
   * The sheet's action is the same thing for a caller with no chest to show: `openChest` / `emptyChest`.
   */
  chest?: 'closed' | 'empty';
}

// --- room kinds and toast text ---------------------------------------------------------------------

/** Room kinds go by the names ROOM_ICONS uses; layouts and the DSL spell a few of them differently. */
const TYPE_ALIASES: Record<string, string> = {
  exit: 'entrance',
  savepoint: 'save',
  stairs_up: 'stairs-up',
  stairs_down: 'stairs-down',
  dungeon_map: 'map',
  'dungeon-map': 'map',
};
export const roomKind = (room: Room | undefined): string => {
  // A Dragon Egg or `master` room is the temple's Pegasus chest (ChestLoot.asPegasusChest)
  if (isPegasusRoom(room)) return 'loot';
  const type = room?.type ?? '';
  return TYPE_ALIASES[type] ?? type;
};

/** "blindingFlash" -> "blinding flash" */
export const words = (value: string): string =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();

export const titleWords = (value: string): string => words(value).replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
