/**
 * What a room hands the hero in play: the one answer the engine's chest setup (`DungeonManager.initializeChests`),
 * the temple audit and the solver's graph all read, so a temple they call finishable is one play can finish.
 *
 * Play gives out a key or any other dungeon item from three places only:
 * - a loot room whose chest is a Dungeon Item chest (`chest: 'dungeon'`), which holds `content.dungeon`; its `items`
 *   rows of "key" are small keys too, whatever the chest is called;
 * - a Key room: a small key, or the Boss Key when its `keyId` is "master";
 * - a fight room's drops (`content.drops`, see fightDrops): a monster, mini-boss or boss that drops a Dungeon Item or
 *   rows of "key" hands them out when it is beaten, read exactly as a chest is.
 * A mini-boss or boss room has no chest (its fight pays through the quest), so a key written into one's `content.dungeon`
 * is never handed out, and a loot room that names `dungeon: 'key'` under another chest gives nothing. A Bomb has three
 * sources, a shop, a loot chest with a Bomb row and a fight room dropping one (`isBombSource`): the solver lets a hero who
 * has reached one blow a cracked wall. Pure.
 */
import { dungeonItemId } from '@/lib/services/temples/ChestLoot';
import { BOMB_ITEM, roomDrops } from '@/lib/services/temples/fightDrops';

/** The part of a room these rules read; an engine room, the editor's room and a layout's room all fit. */
export interface GrantingRoom {
  type?: string;
  content?: { chest?: unknown; dungeon?: unknown; items?: unknown; keyId?: unknown; drops?: unknown } | null;
}

/** The id the take path knows for the Boss Key (the Boss Key to the player) */
export const BOSS_KEY_ID = 'master-key';

/** The id of the small key, as chests and the take path spell it */
export const SMALL_KEY_ID = 'key';

/** The rows of an `items` list, or none when it is not a list. */
const rowsOf = (items: unknown): unknown[] => (Array.isArray(items) ? items : []);

/**
 * The dungeon item a room's chest holds, by the id the take path knows ("small-key" is "key"), or '' when it holds
 * none. Only a loot room whose chest is a Dungeon Item chest holds one; a fight room's drop joins it in `grantedDungeonItems`.
 */
export const chestDungeonItem = (room: GrantingRoom | null | undefined): string => {
  const content = room?.content;
  const isDungeonItemChest = room?.type === 'loot' && content?.chest === 'dungeon' && typeof content.dungeon === 'string';
  return isDungeonItemChest ? dungeonItemId(content.dungeon as string) : '';
};

/** The dungeon item a fight room drops, by the id the take path knows, or '' (no drop, or a drop that is not a Dungeon Item). */
const dropDungeonItem = (room: GrantingRoom | null | undefined): string => {
  const drops = roomDrops(room);
  const isDungeonItemDrop = drops?.chest === 'dungeon' && typeof drops.dungeon === 'string';
  return isDungeonItemDrop ? dungeonItemId(drops.dungeon as string) : '';
};

/** Every dungeon item a room hands out: its chest's, then a fight room's drop. Empty for a room that gives none. */
export const grantedDungeonItems = (room: GrantingRoom | null | undefined): string[] =>
  [chestDungeonItem(room), dropDungeonItem(room)].filter((item) => item !== '');

/** The `items` rows a room hands out: a loot room's chest rows and a fight room's drop rows. */
const grantedRows = (room: GrantingRoom | null | undefined): unknown[] => {
  const isLoot = room?.type === 'loot';
  return [...(isLoot ? rowsOf(room?.content?.items) : []), ...rowsOf(roomDrops(room)?.items)];
};

/**
 * How many small keys a room hands out: a key chest, a loot room's "key" rows, a Key room that is not the master's, and
 * a fight room's drop of the same (a Dungeon Item drop of a key, "key" rows).
 */
export const smallKeysGranted = (room: GrantingRoom | null | undefined): number => {
  const isKeyRoom = room?.type === 'key';
  if (isKeyRoom) return room.content?.keyId === 'master' ? 0 : 1;

  const keyChests = grantedDungeonItems(room).filter((item) => item === SMALL_KEY_ID).length;
  return keyChests + grantedRows(room).filter((row) => row === SMALL_KEY_ID).length;
};

/** Whether a room hands the hero the Boss Key: a chest or a fight's drop holding it, or a Key room whose key is the master key. */
export const grantsBossKey = (room: GrantingRoom | null | undefined): boolean =>
  grantedDungeonItems(room).includes(BOSS_KEY_ID) || (room?.type === 'key' && room.content?.keyId === 'master');

/**
 * Whether a hero who reaches this room can come away with a Bomb: a shop sells them, a loot chest with a Bomb row holds
 * one, a fight room can drop one. A Bomb written into any other room (or into a fight room outside its `drops`) is
 * never handed out. The solver opens a cracked wall once the hero has reached any such room.
 */
export const isBombSource = (room: GrantingRoom | null | undefined): boolean => {
  const isShop = room?.type === 'shop';
  return isShop || grantedRows(room).includes(BOMB_ITEM);
};
