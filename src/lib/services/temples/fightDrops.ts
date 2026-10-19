/**
 * What a beaten fight room leaves behind. A monster, mini-boss or boss room may carry `content.drops`, which holds the
 * same four fields a chest does (`chest`, `dungeon`, `items`, `gold`) and is read the same way: a Dungeon Item drop
 * (`chest: 'dungeon'`) hands out a key, the map or the compass, and `items` rows hand out whatever they name, a Bomb
 * included. The grants (roomGrants), the audit and the solver all ask `roomDrops`, so a key a monster drops is a key
 * the temple counts and a hero can finish with.
 *
 * Only a fight room drops anything: `drops` written under a loot, key or any other room is never handed out, as a key
 * written into a mini-boss room's chest never is (see roomGrants). Pure: no Vue, no storage.
 */
import type { RoomDrops } from '@/lib/engine/core/dungeons/types';
import { roomPositionKey } from '@/lib/engine/core/dungeons/roomPosition';
import type { GrantingRoom } from '@/lib/services/temples/roomGrants';

/** The rooms that fight the hero, and so the only rooms whose drops are played */
export const FIGHT_ROOM_TYPES: readonly string[] = ['monster', 'miniboss', 'boss'];

/** The item that blows a cracked wall open; a Bomb found inside the temple is all the solver needs to pass one */
export const BOMB_ITEM = 'Bomb';

/** Whether a drop holds anything: a dungeon item, a row of `items`, or gold. */
const holdsSomething = (drops: Record<string, unknown>): boolean => {
  const hasDungeonItem = typeof drops.dungeon === 'string' && drops.dungeon !== '';
  const hasItems = Array.isArray(drops.items) && drops.items.length > 0;
  const hasGold = typeof drops.gold === 'number' && drops.gold > 0;
  return hasDungeonItem || hasItems || hasGold;
};

/** The non-empty `content.drops` of a fight room, or null (no drops, empty drops, or a room that does not fight). */
export const roomDrops = (room: GrantingRoom | null | undefined): RoomDrops | null => {
  const isFightRoom = FIGHT_ROOM_TYPES.includes(room?.type ?? '');
  if (!isFightRoom) return null;

  const drops = room?.content?.drops;
  const isDropsObject = typeof drops === 'object' && drops !== null && !Array.isArray(drops);
  if (!isDropsObject) return null;
  return holdsSomething(drops as Record<string, unknown>) ? (drops as RoomDrops) : null;
};

/**
 * How a room's drop is remembered with the hero's progress (taken or not), beside the chest's own key for the room:
 * "1F:2,3:drop". Same floor-first key as `roomPositionKey`, so two floors never share a drop.
 */
export const dropKey = (level: string, position: readonly number[]): string => `${roomPositionKey(level, position)}:drop`;
