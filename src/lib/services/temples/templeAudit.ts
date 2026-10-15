/**
 * The temple audit: can this temple be finished? The Temple Creator runs it on the room layout the Game Master has
 * drawn so far and shows what is still missing (the Attributes audit tab, the banner under the title, the toast on
 * save). Nothing here blocks anything: a draft may be saved at any time.
 *
 * Seven checks, always in this order: Entrance, Exit, Boss, Boss Key, Master Room, Dungeon Map, Compass. The first
 * five are what a temple needs to be finished; the map and the compass are nice to have, so they are listed and
 * counted in the summary but never fail `passed`. A caller that knows the quests behind the rooms can hand over a
 * difficulty lookup (`options.sizeOf`) and the audit adds an eighth, just as optional, check: the temple's size
 * ("Size 17 of 21", docs/Quest-Rooms-Spec.md section 9). A temple with stairs gets one more optional check, last: every
 * stairway leads to another floor ("Stairs on 2F (1,3) lead nowhere" otherwise).
 *
 * Rooms are read the way the editor draws them: every cell of every floor of the maze, looked up in the room
 * definitions (a token a hundred cells share counts a hundred times; a definition no cell uses counts for nothing).
 * Each room goes through `asChestRoom` first, the step play takes, so a Master Room (or its older name, the Dragon
 * Egg) is the Pegasus chest and the editor's "dungeon-map" is the map. Pure: no Vue, no storage.
 */
import { asChestRoom } from '@/lib/services/temples/ChestLoot';
import { chestDungeonItem, grantsBossKey } from '@/lib/services/temples/roomGrants';
import { VOID } from '@/lib/engine/dungeons/roomTypes';
import { isWallToken } from '@/lib/engine/dungeons/SpatialPalette';
import { neighbourFloorOf } from '@/lib/engine/core/dungeons/floorOrder';
import { TEMPLE_FULL_SIZE, templeSize, type SizedRoom, type TempleSize } from '@/lib/services/temples/questRooms';

export type AuditCheckId = 'entrance' | 'exit' | 'boss' | 'bossKey' | 'masterRoom' | 'map' | 'compass' | 'size' | 'stairs';

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

/**
 * What one room adds to the temple's size: a quest's difficulty, a SizedRoom when the room is dormant (its template's
 * difficulty, "if woken"), or nothing for a room that holds no quest (a trap, a classic beast room, a chest).
 */
export type SizeShare = SizedRoom | number | null | undefined;

export interface AuditOptions {
  /**
   * The difficulty lookup: what each room of the maze adds to the temple's size. Without it the audit has no size
   * check. It is called once for every cell of the maze, with the room as the audit reads it.
   */
  sizeOf?: (room: AuditableRoom) => SizeShare;
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
        const isRoomlessCell = !token || isWallToken(token) || token === VOID;
        if (isRoomlessCell) continue;
        const room = definitions[token];
        const isPlayableRoom = room && typeOf(room) !== 'wall';
        if (isPlayableRoom) rooms.push(asChestRoom(room));
      }
    }
  }
  return rooms;
};

/** Whether a room is the Master Room: the Pegasus Egg chamber, which play turns into the Pegasus chest whatever name the layout gave it */
const isMasterRoom = (room: AuditableRoom): boolean => typeOf(room) === 'loot' && room.content?.pegasus === true;

const countOf = (rooms: AuditableRoom[], test: (room: AuditableRoom) => boolean): number => rooms.filter(test).length;

/** "Placed" when there is one, "Missing" when there is none, otherwise "Two <many>: keep one" */
const oneOf = (count: number, many: string): string => {
  const isSingle = count === 1;
  if (isSingle) return 'Placed';
  const isNone = count === 0;
  if (isNone) return 'Missing';
  return tooMany(count, many);
};

/** "Size 17 of 21", with the part that sleeps when some does: "Size 17 of 21 · 9 if woken" */
export const describeTempleSize = (size: Pick<TempleSize, 'total' | 'dormant'>): string =>
  `Size ${size.total} of ${TEMPLE_FULL_SIZE}${size.dormant > 0 ? ` · ${size.dormant} if woken` : ''}`;

/** The size check: the lookup's share of every room added up. Optional: a small temple is a draft, not a mistake. */
const sizeCheck = (rooms: AuditableRoom[], sizeOf: (room: AuditableRoom) => SizeShare): AuditCheck => {
  const shares = rooms
    .map((room): SizedRoom | null => {
      const share = sizeOf(room);
      const hasNoShare = share === null || share === undefined;
      if (hasNoShare) return null;
      return typeof share === 'number' ? { difficulty: share } : share;
    })
    .filter((share): share is SizedRoom => share !== null);
  const size = templeSize(shares);
  return { id: 'size', label: 'Size', ok: size.isFull, detail: describeTempleSize(size), optional: true };
};

/** Which way a stairs room climbs along the order floors are climbed in (the engine reads both spellings) */
const STAIRS_STEP: Record<string, 1 | -1> = { 'stairs-up': 1, stairs_up: 1, 'stairs-down': -1, stairs_down: -1 };

/**
 * The stairs check, or null for a temple with no stairs. Stairs lead where their `targetLevel` says, else to the
 * neighbouring floor in the order floors are climbed (how play climbs them); a stairway to the floor it stands on,
 * to a floor the temple lacks, or past the first or last floor is "blocked by rubble" and strands the hero. A cell is
 * written "floor (row,col)". Optional: a draft with its stairs half placed is not a mistake.
 */
const stairsCheck = (temple: AuditableTemple | null | undefined): AuditCheck | null => {
  const layout: AuditableLayout | null | undefined = temple?.dungeonLayout ?? temple;
  const definitions = layout?.rooms;
  const maze = layout?.maze;
  const hasNoMaze = !definitions || !maze;
  if (hasNoMaze) return null;

  const floors: Array<[string, string[][]]> = Array.isArray(maze) ? [['1F', maze]] : Object.entries(maze).filter(([, grid]) => Array.isArray(grid));
  const floorNames = floors.map(([name]) => name);
  let stairsCount = 0;
  const stranded: string[] = [];

  for (const [name, grid] of floors) {
    grid.forEach((row, rowIndex) =>
      (row ?? []).forEach((token, colIndex) => {
        const isRoomlessCell = !token || isWallToken(token) || token === VOID;
        const room = isRoomlessCell ? undefined : definitions[token];
        const step = room ? STAIRS_STEP[typeOf(room)] : undefined;
        const isNotStairs = !room || !step;
        if (isNotStairs) return;

        stairsCount += 1;
        const target = room.content?.targetLevel ?? neighbourFloorOf(floorNames, name, step);
        const leadsToAnotherFloor = !!target && floorNames.includes(target) && target !== name;
        if (!leadsToAnotherFloor) stranded.push(`${name} (${rowIndex},${colIndex})`);
      })
    );
  }

  const hasNoStairs = stairsCount === 0;
  if (hasNoStairs) return null;
  const detail = stranded.length === 0 ? 'Placed' : `Stairs on ${shortList(stranded)} lead nowhere`;
  return { id: 'stairs', label: 'Stairs', ok: stranded.length === 0, detail, optional: true };
};

/**
 * Can this temple be finished? Runs the seven checks over the layout the temple holds, and the size check as an
 * eighth when `options.sizeOf` is given.
 */
export const auditTemple = (temple: AuditableTemple | null | undefined, options: AuditOptions = {}): AuditResult => {
  const rooms = placedRooms(temple);

  const entrances = countOf(rooms, (room) => typeOf(room) === 'entrance');
  const gates = countOf(rooms, (room) => typeOf(room) === 'gate');
  const bosses = countOf(rooms, (room) => typeOf(room) === 'boss');
  const bossKeys = countOf(rooms, grantsBossKey);
  const masters = countOf(rooms, isMasterRoom);
  const maps = countOf(rooms, (room) => chestDungeonItem(room) === 'map');
  const compasses = countOf(rooms, (room) => chestDungeonItem(room) === 'compass');

  // A temple without a gate ends where it began: the entrance is also the way out (how the generator builds them)
  let exitDetail = 'Missing';
  const hasGate = gates > 0;
  const hasEntrance = entrances > 0;
  if (hasGate) exitDetail = 'Placed';
  else if (hasEntrance) exitDetail = 'Entrance doubles as exit';

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
  const { sizeOf } = options;
  if (sizeOf) checks.push(sizeCheck(rooms, sizeOf));
  const stairs = stairsCheck(temple);
  if (stairs) checks.push(stairs);

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
