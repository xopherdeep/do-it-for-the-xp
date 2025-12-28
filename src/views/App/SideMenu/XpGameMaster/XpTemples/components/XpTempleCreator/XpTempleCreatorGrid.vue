```
<template>
  <div class="grid-container icon-colors">
    <div class="temple-grid">
      <div 
        v-for="(row, rowIndex) in maze" 
        :key="rowIndex" 
        class="maze-row"
      >
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="maze-cell"
          :class="{
            'cell-wall': getCellType(cell) === 'wall',
            'entrance-position': isEntrancePosition(rowIndex, colIndex),
            'selected-cell': selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex
          }"
          @click="$emit('cell-click', { row: rowIndex, col: colIndex, event: $event })"
          @contextmenu.prevent="$emit('cell-contextmenu', { row: rowIndex, col: colIndex, event: $event })"
        >
          <i
            :class="[roomIcons[getCellType(cell)]]"
            class="fad"
          ></i>
          <span class="cell-coords">{{rowIndex}},{{colIndex}}</span>

          <!-- Side Configuration Indicators -->
          <template v-for="dir in directions" :key="dir">
            <!-- Only show indicators if there is a valid connection in that direction -->
            <template v-if="hasValidNeighbor(rowIndex, colIndex, dir)">
              <!-- Trapped State (Either room is boss/miniboss/lockOnEnter) -->
              <div
                v-if="isEdgeTrapped(rowIndex, colIndex, dir) && getEffectiveEdge(rowIndex, colIndex, dir) === 'door'"
                :class="['side-indicator', dir, 'indicator-trapped', 'icon-colors']"
              >
                <i class="fad fa-dungeon trap-variant"></i>
              </div>
              <!-- Explicit Side Config (Locked, Bombable, Wall) -->
              <div
                v-else-if="getEffectiveEdge(rowIndex, colIndex, dir) !== 'door'"
                :class="['side-indicator', dir, `indicator-${getEffectiveEdge(rowIndex, colIndex, dir)}`, 'icon-colors']"
              >
                <i :class="[sideTypeInfo[getEffectiveEdge(rowIndex, colIndex, dir)].icon === 'DYNAMIC_WALL' ? roomIcons.wall : sideTypeInfo[getEffectiveEdge(rowIndex, colIndex, dir)].icon]"></i>
              </div>
              <!-- Open Passage (door state) - green tombstone -->
              <div
                v-else
                :class="['side-indicator', dir, 'indicator-door', 'icon-colors']"
              >
                <i class="fal fa-tombstone-alt"></i>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { getSideState } from '@/lib/engine/dungeons/roomIcons';

type Direction = 'north' | 'east' | 'south' | 'west';

export default defineComponent({
  name: 'XpTempleCreatorGrid',
  props: {
    maze: {
      type: Array as PropType<string[][]>,
      required: true
    },
    roomsData: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    roomIcons: {
      type: Object as PropType<Record<string, string>>,
      required: true
    },
    sideTypeInfo: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    selectedCell: {
      type: Object as PropType<{row: number, col: number} | null>,
      default: null
    },
    entrancePosition: {
      type: String,
      default: '0,0'
    },
    currentLevelId: {
      type: String,
      default: '1F'
    }
  },
  emits: ['cell-click', 'cell-contextmenu'],
  setup(props) {
    // Only show east and south edge indicators since edges are bidirectionally synced.
    // This way each connection between rooms shows exactly one indicator (not duplicated).
    const directions: Direction[] = ['east', 'south'];

    const getCellType = (cellSymbol: string): string => {
      const roomData = props.roomsData[cellSymbol];
      return roomData?.type || "wall";
    };

    const isEntrancePosition = (row: number, col: number) => {
      const [entranceRow, entranceCol] = props.entrancePosition.split(",").map(Number);
      return row === entranceRow && col === entranceCol;
    };

    const getSideConfiguration = (cellSymbol: string, direction: Direction): string => {
      const roomData = props.roomsData[cellSymbol];
      return getSideState(direction, roomData);
    };

    const isRoomTrapped = (cellSymbol: string): boolean => {
      const roomData = props.roomsData[cellSymbol];
      if (!roomData) return false;
      const type = roomData.type;
      return roomData.content?.lockOnEnter || type === 'boss' || type === 'miniboss';
    };

    const hasValidNeighbor = (row: number, col: number, dir: Direction): boolean => {
      // First check if CURRENT cell is a non-wall room
      const currentSymbol = props.maze[row]?.[col];
      const currentType = getCellType(currentSymbol);
      if (currentType === 'wall') return false;
      
      // Then check if neighbor exists and is non-wall
      let nRow = row;
      let nCol = col;
      
      if (dir === 'north') nRow--;
      else if (dir === 'south') nRow++;
      else if (dir === 'east') nCol++;
      else if (dir === 'west') nCol--;
      
      if (nRow < 0 || nRow >= props.maze.length || nCol < 0 || nCol >= props.maze[0].length) {
        return false;
      }
      
      const neighborSymbol = props.maze[nRow][nCol];
      const neighborType = getCellType(neighborSymbol);
      return neighborType !== 'wall';
    };

    // Get effective edge configuration - checks both rooms and returns the
    // most restrictive edge type (wall > bombable > locked > door)
    const getEffectiveEdge = (row: number, col: number, dir: Direction): string => {
      const currentSymbol = props.maze[row]?.[col];
      const currentEdge = getSideConfiguration(currentSymbol, dir);
      
      // Get neighbor's opposite edge
      let nRow = row;
      let nCol = col;
      const oppositeDir: Record<string, Direction> = {
        north: 'south',
        south: 'north',
        east: 'west',
        west: 'east'
      };
      
      if (dir === 'north') nRow--;
      else if (dir === 'south') nRow++;
      else if (dir === 'east') nCol++;
      else if (dir === 'west') nCol--;
      
      const neighborSymbol = props.maze[nRow]?.[nCol];
      const neighborEdge = neighborSymbol ? getSideConfiguration(neighborSymbol, oppositeDir[dir]) : 'door';
      
      // Priority: wall > bombable > locked > door
      const priority: Record<string, number> = { wall: 4, bombable: 3, locked: 2, door: 1 };
      return priority[currentEdge] >= priority[neighborEdge] ? currentEdge : neighborEdge;
    };

    // Check if either room in the connection is trapped (boss/miniboss/lockOnEnter)
    const isEdgeTrapped = (row: number, col: number, dir: Direction): boolean => {
      const currentSymbol = props.maze[row]?.[col];
      if (isRoomTrapped(currentSymbol)) return true;
      
      // Check neighbor
      let nRow = row;
      let nCol = col;
      
      if (dir === 'north') nRow--;
      else if (dir === 'south') nRow++;
      else if (dir === 'east') nCol++;
      else if (dir === 'west') nCol--;
      
      const neighborSymbol = props.maze[nRow]?.[nCol];
      return neighborSymbol ? isRoomTrapped(neighborSymbol) : false;
    };

    return {
      directions,
      getCellType,
      isEntrancePosition,
      getSideConfiguration,
      isRoomTrapped,
      hasValidNeighbor,
      getEffectiveEdge,
      isEdgeTrapped
    };
  }
});
</script>

<style lang="scss" scoped>
.grid-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  width: 100%;
}

.temple-grid {
  display: inline-block;
  background: #1a1a1a;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.maze-row {
  display: flex;
}

.maze-cell {
  width: 50px;
  height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #2a2a2a;
  cursor: pointer;
  margin: 1px;
  border-radius: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #3a3a3a;
    transform: scale(1.08);
    z-index: 5;
    box-shadow: 0 4px 15px rgba(0,0,0,0.6);
  }

  i {
    font-size: 1.5rem;
    z-index: 2;
    transition: transform 0.15s ease;
  }

  &:hover i {
    transform: scale(1.1);
  }

  .cell-coords {
    position: absolute;
    bottom: 2px;
    right: 2px;
    font-size: 0.55rem;
    opacity: 0.5;
    color: #888;
  }
  
  .side-indicator {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);

    i {
      font-size: 0.85rem;
      // Default color if NOT using fad/icon-colors
      color: #ccc;
    }
    
    &.indicator-locked { 
      background: rgba(var(--ion-color-warning-rgb), 0.25);
      i { color: var(--ion-color-warning); }
    }

    &.indicator-trapped { 
      background: rgba(0, 0, 0, 0.4); 
      border: 1.5px solid #8B0000;
      width: 20px;
      height: 20px;

      i {
        font-size: 0.95rem;
        color: #ff4b2b;
      }
    }
    
    &.indicator-wall { 
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #555;
      i { color: #888; }
    }

    &.indicator-bombable { 
      background: rgba(var(--ion-color-secondary-rgb), 0.25);
      i { color: var(--ion-color-secondary-tint); }
    }

    &.indicator-door { 
      background: transparent;
      border: none;
      box-shadow: none;
      i { color: var(--ion-color-success); }
    }

    &.north {
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
    }
    &.east {
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
    }
    &.south {
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
    }
    &.west {
      left: -10px;
      top: 50%;
      transform: translateY(-50%);
    }
  }
  
  &.selected-cell {
    border: 3px solid #00c3ff !important;
    box-shadow: 0 0 8px #00c3ff;
    z-index: 4;
  }

  // Wall style - subtle and faded
  &.cell-wall {
    background: #1e1e1e;
    i { 
      opacity: 0.25;
    }
  }
  
  // Entrance marker
  &.entrance-position { 
    border: 2px solid rgba(255, 255, 255, 0.7);
    box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.15);
  }
}
</style>
