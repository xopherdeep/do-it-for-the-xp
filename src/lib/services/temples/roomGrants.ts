/**
 * What a room hands the hero in play: the one answer the engine's chest setup (`DungeonManager.initializeChests`),
 * the temple audit and the solver's graph all read, so a temple they call finishable is one play can finish.
 *
 * Play gives out a key or any other dungeon item from two places only:
 * - a loot room whose chest is a Dungeon Item chest (`chest: 'dungeon'`), which holds `content.dungeon`; its `items`
 *   rows of "key" are small keys too, whatever the chest is called;
 * - a Key room: a small key, or the Boss Key when its `keyId` is "master".
 * A mini-boss or boss room has no chest (its fight pays through the quest), so a key written into one is never
 * handed out, and a loot room that names `dungeon: 'key'` under another chest gives nothing. Pure.
 */
import { dungeonItemId } from '@/lib/services/temples/ChestLoot';

/** The part of a room these rules read; an engine room, the editor's room and a layout's room all fit. */
export interface GrantingRoom {
  type?: string;
  content?: { chest?: unknown; dungeon?: unknown; items?: unknown; keyId?: unknown } | null;
}

/** The id the take path knows for the Boss Key (the Boss Key to the player) */
export const BOSS_KEY_ID = 'master-key';

/** The id of the small key, as chests and the take path spell it */
export const SMALL_KEY_ID = 'key';

/**
 * The dungeon item a room's chest holds, by the id the take path knows ("small-key" is "key"), or '' when it holds
 * none. Only a loot room whose chest is a Dungeon Item chest holds one.
 */
export const chestDungeonItem = (room: GrantingRoom | null | undefined): string => {
  const content = room?.content;
  const isDungeonItemChest = room?.type === 'loot' && content?.chest === 'dungeon' && typeof content.dungeon === 'string';
  return isDungeonItemChest ? dungeonItemId(content.dungeon as string) : '';
};

/** How many small keys a room hands out: a key chest, a loot room's "key" rows, a Key room that is not the master's. */
export const smallKeysGranted = (room: GrantingRoom | null | undefined): number => {
  if (room?.type === 'key') return room.content?.keyId === 'master' ? 0 : 1;

  const isLoot = room?.type === 'loot';
  const rows: unknown[] = isLoot && Array.isArray(room?.content?.items) ? (room?.content?.items as unknown[]) : [];
  return (chestDungeonItem(room) === SMALL_KEY_ID ? 1 : 0) + rows.filter((row) => row === SMALL_KEY_ID).length;
};

/** Whether a room hands the hero the Boss Key: a chest holding it, or a Key room whose key is the master key. */
export const grantsBossKey = (room: GrantingRoom | null | undefined): boolean =>
  chestDungeonItem(room) === BOSS_KEY_ID || (room?.type === 'key' && room.content?.keyId === 'master');
