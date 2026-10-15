import type { Ref } from 'vue';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { MapVisibility } from '@/lib/engine/core/dungeons/TempleSystem';

type CellTest<T> = (row: number, col: number) => T;

/** What the temple map knows about a cell, from useTemple. */
export interface MapCellSources {
  rooms: Ref<Record<string, { type?: string; isEmpty?: boolean } | undefined>>;
  hasCompass: Ref<boolean>;
  getRoomVisibility: CellTest<MapVisibility>;
  isCurrentRoom: CellTest<boolean>;
  showRoomDetails: CellTest<boolean>;
  getRoomIcon: CellTest<string>;
  isRoomVisited: CellTest<boolean>;
}

/**
 * The icon classes of one temple map cell: nothing without the map, the walking hero where they stand, a dim wall,
 * the room's own icon once the compass or a visit shows it (a faint one for a compass room not yet visited, a light one
 * for an emptied chest), else a dimmed question mark for a room known to exist.
 */
export const mapCellIconOf = (sources: MapCellSources) => (row: number, col: number, cell: string): string[] => {
  const isUnmapped = sources.getRoomVisibility(row, col) === MapVisibility.NONE;
  if (isUnmapped) return ['fad', 'fa-2x', 'fa-solid', 'opacity-0'];
  const isHeroHere = sources.isCurrentRoom(row, col);
  if (isHeroHere) return ['fad', 'fa-2x', 'fa-walking', 'pulse-animation'];
  const room = sources.rooms.value[cell];
  const isWall = room?.type === 'wall';
  if (isWall) return ['fad', 'fa-2x', ROOM_ICONS.wall, 'opacity-10'];
  const isOnlyKnown = !sources.showRoomDetails(row, col);
  if (isOnlyKnown) return ['fad', 'fa-2x', 'fa-question-circle', 'opacity-40'];
  const isEmptyChest = room?.type === 'loot' && Boolean(room.isEmpty);
  const isFaint = !sources.isRoomVisited(row, col) && sources.hasCompass.value;
  return [sources.getRoomIcon(row, col), isEmptyChest ? 'fal' : 'fad', ...(isFaint ? ['opacity-45'] : []), 'fa-2x'];
};
