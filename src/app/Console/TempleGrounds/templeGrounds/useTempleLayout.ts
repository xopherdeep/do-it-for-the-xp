import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { TEMPLE_METADATA } from '@/lib/engine/temples/templeRegistry';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { isBossRoom } from '@/lib/services/temples/authoredDoors';
import type { ExitKind, WallSide } from '../templeWalls';
import type { TempleGroundsProps, TempleState } from './useTempleMeta';

export interface TempleLayoutDeps extends Pick<TempleState, 'currentPosition' | 'maze' | 'rooms'> {
  props: TempleGroundsProps;
  templeSystem: TempleSystem;
}

/**
 * The game area and the rooms drawn in it: one room fills the area, the floor slides to the hero's room, and the
 * rooms near the hero carry their walls, doors and gates.
 */
export const useTempleLayout = (deps: TempleLayoutDeps) => {
  const { props, currentPosition, maze, rooms, templeSystem } = deps;

  // Background position state for CSS transforms - initialize with default values
  const backgroundPosition = ref({ x: 0, y: 0 });

  // Tile dimensions for the background grid: one room fills the game area exactly,
  // so its north wall sits below the header hairlines and south wall sits on the bottom nav
  const gameArea = ref<{ $el: HTMLElement } | null>(null);
  const tileWidth = ref(window.innerWidth);
  const tileHeight = ref(window.innerHeight - 172);
  let gameAreaObserver: ResizeObserver | null = null;

  // Re-measure whenever the game area changes: a window resize, or the header/footer changing size
  onMounted(() => {
    const el = gameArea.value?.$el;
    const updateDimensions = () => {
      const box = el?.getBoundingClientRect();
      const isGameAreaMeasurable = box !== undefined && box.height > 0;
      if (isGameAreaMeasurable) {
        tileWidth.value = box.width;
        tileHeight.value = box.height;
      }
      const [row, col] = currentPosition.value;
      updateBg(col, row);
    };

    if (el) {
      gameAreaObserver = new ResizeObserver(updateDimensions);
      gameAreaObserver.observe(el);
    }
    updateDimensions(); // Initial setup
  });
  onBeforeUnmount(() => gameAreaObserver?.disconnect());

  // Calculate valid room coordinates for background images
  const validRoomCoords = computed(() => {
    const coords: string[] = [];

    const mazeData = maze.value;
    for (let row = 0; row < mazeData.length; row++) {
      for (let col = 0; col < mazeData[row].length; col++) {
        const roomKey = mazeData[row][col];
        if (rooms.value[roomKey]?.type !== 'wall') {
          coords.push(`[${row},${col}]`);
        } else {
          coords.push(`[0,0]`);
        }
      }
    }

    return coords;
  });

  // Helper to get background images: only shipped temples have pre-rendered assets
  const getBgImage = (xy: string) => {
    if (!props.temple || !(props.temple in TEMPLE_METADATA)) return '';
    try {
      return require(`@/assets/images/backgrounds/${props.temple}/${xy}.webp`);
    } catch {
      return '';
    }
  };

  // Update the background position visually
  const updateBg = (x: number, y: number) => {
    // Calculate translate values - invert for proper positioning
    const translateX = -x * tileWidth.value;
    const translateY = -y * tileHeight.value;

    // Update the background position directly in our reactive state
    backgroundPosition.value = { x: translateX, y: translateY };
  };

  // What each side of a room is, for the wall layer: solid stone, an open door, or a locked one
  const exitsAt = (row: number, col: number): Record<WallSide, ExitKind> => {
    const roomAt = (r: number, c: number) => {
      const key = maze.value?.[r]?.[c];
      return key ? rooms.value?.[key] : undefined;
    };
    const here = roomAt(row, col);
    const kind = (side: WallSide, r: number, c: number): ExitKind => {
      const there = roomAt(r, c);
      const isSolidStone = !there || there.type === 'wall';
      if (isSolidStone) return 'wall';
      const door = templeSystem.doorKind(props.temple, [row, col], side);
      // What the Game Master drew instead of a door: a wall, or a cracked wall a Bomb opens
      if (door === 'wall' || door === 'bombable') return door;
      if (door === 'master') return 'master';
      // The way into the boss room is the Boss door or an open one: the boss room's fight seal is no small lock on it
      if (isBossRoom(there)) return door === 'locked' ? 'locked' : 'door';
      const lockedHere = Boolean(here?.locked?.[side]);
      const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' }[side] as WallSide;
      const lockedThere = Boolean(there.locked?.[opposite]);
      return lockedHere || lockedThere ? 'locked' : 'door';
    };
    return {
      north: kind('north', row - 1, col),
      south: kind('south', row + 1, col),
      west: kind('west', row, col - 1),
      east: kind('east', row, col + 1),
    };
  };
  // Only the hero's room and its neighbours carry a wall layer: enough to scroll into, cheap to keep
  const isNearHero = (row: number, col: number) => {
    const [r, c] = currentPosition.value || [0, 0];
    return Math.abs(r - row) + Math.abs(c - col) <= 2;
  };

  return {
    layout: { backgroundPosition, gameArea, tileWidth, tileHeight, validRoomCoords },
    updateBg,
    getBgImage,
    getExitsAt: exitsAt,
    isNearHero
  };
};
