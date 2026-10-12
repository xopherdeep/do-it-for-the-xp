/**
 * The temple audit: can this temple be finished? The Temple Creator runs it on the room layout the Game Master has
 * drawn so far and shows what is still missing (the Attributes audit tab, the banner under the title, the toast on
 * save). Nothing here blocks anything: a draft may be saved at any time.
 *
 * Seven checks, always in this order: Entrance, Exit, Boss, Boss Key, Master Room, Dungeon Map, Compass. The first
 * five are what a temple needs to be finished; the map and the compass are nice to have, so they are listed and
 * counted in the summary but never fail `passed`.
 *
 * Rooms are read the way the editor draws them: every cell of every floor of the maze, looked up in the room
 * definitions (a token a hundred cells share counts a hundred times; a definition no cell uses counts for nothing).
 * Each room goes through `asChestRoom` first, the step play takes, so a Master Room (or its older name, the Dragon
 * Egg) is the Pegasus chest and the editor's "dungeon-map" is the map. Pure: no Vue, no storage.
 */
import { asChestRoom, dungeonItemId } from '@/lib/services/temples/ChestLoot';
import { VOID } from '@/lib/engine/dungeons/roomTypes';
import { isWallToken } from '@/lib/engine/dungeons/SpatialPalette';

export type AuditCheckId = 'entrance' | 'exit' | 'boss' | 'bossKey' | 'masterRoom' | 'map' | 'compass';

export interface AuditCheck {
  id: AuditCheckId;
  /** What the audit calls it: the name in the grid, the banner and the toast */
  label: string;
  ok: boolean;
  /** One short line for the grid: "Placed", what is wrong, or what to do */
  detail: string;
  /** Nice to have: listed and counted in the summary, but it never fails `passed` */
  optional?: true;
}

export interface AuditResult {
  checks: AuditCheck[];
  /** Every required check is ok: the temple can be finished */
  passed: boolean;
}

/** The part of a temple the audit reads. A saved temple, the editor's copy and a bare layout all fit. */
export interface AuditableTemple {
  dungeonLayout?: AuditableLayout | null;
  /** Older temples keep the maze and the rooms at the top */
  maze?: AuditableMaze | null;
  rooms?: Record<string, AuditableRoom> | null;
}

export interface AuditableLayout {
  maze?: AuditableMaze | null;
  rooms?: Record<string, AuditableRoom> | null;
}

export type AuditableMaze = string[][] | Record<string, string[][]>;

export interface AuditableRoom {
  type?: string;
  content?: Record<string, any>;
  [key: string]: any;
}

/** The room types that hold a chest */
const CHEST_ROOM_TYPES: readonly string[] = ['loot', 'chest', 'treasure'];

/** The id the take path knows for the key that opens the boss door (the Boss Key to the player) */
const BOSS_KEY_ID = 'master-key';

const typeOf = (room: AuditableRoom): string => String(room?.type ?? '').trim().toLowerCase();

/** "Two bosses: keep one", "3 bosses: keep one" */
const tooMany = (count: number, many: string): string => `${count === 2 ? 'Two' : count} ${many}: keep one`;

/** Every grid of the maze, one per floor, whether the temple has one floor or many */
const floorsOf = (maze: AuditableMaze | null | undefined): string[][][] => {
  if (!maze) return [];
  if (Array.isArray(maze)) return [maze];
  return Object.values(maze).filter(Array.isArray);
};

/**
 * The rooms of a temple as play sees them (`asChestRoom`), one entry per cell of the maze on every floor; walls,
 * voids and tokens with no room are left out.
 */
const placedRooms = (temple: AuditableTemple | null | undefined): AuditableRoom[] => {
  const layout: AuditableLayout | null | undefined = temple?.dungeonLayout ?? temple;
  const definitions = layout?.rooms;
  if (!definitions) return [];

  const rooms: AuditableRoom[] = [];
  for (const floor of floorsOf(layout?.maze)) {
    for (const row of floor) {
      for (const token of row ?? []) {
        if (!token || isWallToken(token) || token === VOID) continue;
        const room = definitions[token];
        if (room && typeOf(room) !== 'wall') rooms.push(asChestRoom(room));
      }
    }
  }
  return rooms;
};

/** The dungeon item a chest holds, by the id the take path knows ("dungeon-map" is "map"), or '' for any other room */
const chestItem = (room: AuditableRoom): string => {
  if (!CHEST_ROOM_TYPES.includes(typeOf(room))) return '';
  const held = room.content?.dungeon;
  return typeof held === 'string' ? dungeonItemId(held) : '';
};

/**
 * Whether a room hands the hero the Boss Key: a chest holding it, a mini-boss room whose own chest holds it (the
 * generator's older temples kept it there), or the older Key room whose key is the master key (the Water Temple
 * still had one; play gives the Boss Key for it just the same).
 */
const holdsBossKey = (room: AuditableRoom): boolean =>
  chestItem(room) === BOSS_KEY_ID ||
  (typeOf(room) === 'miniboss' && room.content?.chest === 'dungeon' && dungeonItemId(String(room.content.dungeon ?? '')) === BOSS_KEY_ID) ||
  (typeOf(room) === 'key' && room.content?.keyId === 'master');

/** Whether a room is the Master Room: the Pegasus Egg chamber, which play turns into the Pegasus chest whatever name the layout gave it */
const isMasterRoom = (room: AuditableRoom): boolean => typeOf(room) === 'loot' && room.content?.pegasus === true;

const countOf = (rooms: AuditableRoom[], test: (room: AuditableRoom) => boolean): number => rooms.filter(test).length;

/** "Placed" when there is one, "Missing" when there is none, otherwise "Two <many>: keep one" */
const oneOf = (count: number, many: string): string => {
  if (count === 1) return 'Placed';
  if (count === 0) return 'Missing';
  return tooMany(count, many);
};

/** Can this temple be finished? Runs the seven checks over the layout the temple holds. */
export const auditTemple = (temple: AuditableTemple | null | undefined): AuditResult => {
  const rooms = placedRooms(temple);

  const entrances = countOf(rooms, (room) => typeOf(room) === 'entrance');
  const gates = countOf(rooms, (room) => typeOf(room) === 'gate');
  const bosses = countOf(rooms, (room) => typeOf(room) === 'boss');
  const bossKeys = countOf(rooms, holdsBossKey);
  const masters = countOf(rooms, isMasterRoom);
  const maps = countOf(rooms, (room) => chestItem(room) === 'map');
  const compasses = countOf(rooms, (room) => chestItem(room) === 'compass');

  // A temple without a gate ends where it began: the entrance is also the way out (how the generator builds them)
  const exitDetail = gates > 0 ? 'Placed' : entrances > 0 ? 'Entrance doubles as exit' : 'Missing';

  const checks: AuditCheck[] = [
    { id: 'entrance', label: 'Entrance', ok: entrances === 1, detail: oneOf(entrances, 'entrances') },
    { id: 'exit', label: 'Exit', ok: gates > 0 || entrances > 0, detail: exitDetail },
    { id: 'boss', label: 'Boss', ok: bosses === 1, detail: oneOf(bosses, 'bosses') },
    {
      id: 'bossKey',
      label: 'Boss Key',
      ok: bossKeys > 0,
      detail: bossKeys > 0 ? 'Placed' : 'Place a Chest holding the Boss Key before the boss door',
    },
    {
      id: 'masterRoom',
      label: 'Master Room',
      ok: masters === 1,
      detail: masters === 0 ? 'The Pegasus Egg chamber. Goes right after the boss.' : oneOf(masters, 'Master Rooms'),
    },
    { id: 'map', label: 'Dungeon Map', ok: maps > 0, detail: maps > 0 ? 'Placed' : 'Missing', optional: true },
    { id: 'compass', label: 'Compass', ok: compasses > 0, detail: compasses > 0 ? 'Placed' : 'Missing', optional: true },
  ];

  return { checks, passed: checks.every((check) => check.ok || check.optional === true) };
};

/** "6 of 7 checks passed" */
export const auditSummary = (result: AuditResult): string => {
  const passed = result.checks.filter((check) => check.ok).length;
  return `${passed} of ${result.checks.length} checks passed`;
};

/** The detail line of every check that failed, in audit order */
export const missingLines = (result: AuditResult): string[] => result.checks.filter((check) => !check.ok).map((check) => check.detail);

/** The names of what keeps the temple from being finished: the failed checks that are required, in audit order */
export const missingNames = (result: AuditResult): string[] =>
  result.checks.filter((check) => !check.ok && check.optional !== true).map((check) => check.label);

/** "Entrance, Master Room" for two names, "Entrance, Master Room +2 more" past that: the banner's short list */
export const shortList = (names: string[], show = 2): string => {
  const shown = names.slice(0, show).join(', ');
  const rest = names.length - show;
  return rest > 0 ? `${shown} +${rest} more` : shown;
};
