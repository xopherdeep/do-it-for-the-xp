import { ref } from 'vue';
import { MapVisibility } from '@/lib/engine/core/dungeons/TempleSystem';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { mapCellIconOf, type MapCellSources } from '@/app/Console/TempleGrounds/templeGrounds/mapCellIcon';

/**
 * The temple map's cell icon: nothing without the map, the walking hero on their cell, a dim wall, the room's icon
 * once shown (faint for a compass room not yet visited, light for an emptied chest), else a dimmed question mark.
 */

const cellIcon = (overrides: Partial<MapCellSources> = {}) =>
  mapCellIconOf({
    rooms: ref({ w: { type: 'wall' }, c: { type: 'loot', isEmpty: true }, b: { type: 'monster' } }),
    hasCompass: ref(false),
    getRoomVisibility: () => MapVisibility.FULL_DETAILS,
    isCurrentRoom: () => false,
    showRoomDetails: () => true,
    getRoomIcon: () => 'fa-dragon',
    isRoomVisited: () => true,
    ...overrides,
  });

describe('mapCellIconOf', () => {
  it('draws nothing on a cell the map does not show', () => {
    expect(cellIcon({ getRoomVisibility: () => MapVisibility.NONE })(0, 0, 'b')).toEqual(['fad', 'fa-2x', 'fa-solid', 'opacity-0']);
  });

  it('puts the walking hero on their own cell, wall or not', () => {
    expect(cellIcon({ isCurrentRoom: () => true })(0, 0, 'w')).toEqual(['fad', 'fa-2x', 'fa-walking', 'pulse-animation']);
  });

  it('dims a wall', () => {
    expect(cellIcon()(0, 0, 'w')).toEqual(['fad', 'fa-2x', ROOM_ICONS.wall, 'opacity-10']);
  });

  it('shows a question mark for a room known only from the map', () => {
    expect(cellIcon({ showRoomDetails: () => false })(0, 0, 'b')).toEqual(['fad', 'fa-2x', 'fa-question-circle', 'opacity-40']);
  });

  it("shows the room's icon, light for an emptied chest and faint for a compass room not yet visited", () => {
    expect(cellIcon()(0, 0, 'b')).toEqual(['fa-dragon', 'fad', 'fa-2x']);
    expect(cellIcon()(0, 0, 'c')).toEqual(['fa-dragon', 'fal', 'fa-2x']);
    expect(cellIcon({ hasCompass: ref(true), isRoomVisited: () => false })(0, 0, 'b')).toEqual(['fa-dragon', 'fad', 'opacity-45', 'fa-2x']);
  });
});
