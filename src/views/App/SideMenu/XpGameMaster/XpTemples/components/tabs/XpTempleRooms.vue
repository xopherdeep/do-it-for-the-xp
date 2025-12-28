<template>
  <ion-page class="xp-temple-rooms">
    <ion-content class="transparent-content">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="loading-wrapper-centered"
      >
        <XpLoading />
      </div>

      <div
        v-else
        class="content-wrapper"
      >
        <!-- Summary Header -->
        <div
          class="summary-header"
          v-if="roomList.length > 0"
        >
          <div class="stat-pills">
            <div class="stat-pill">
              <i class="fad fa-door-open"></i>
              <span>{{ roomList.length }} Rooms</span>
            </div>
            <div
              class="stat-pill"
              v-if="composition.monsters.length"
            >
              <i class="fad fa-dragon text-danger"></i>
              <span>{{ totalMonsters }} Threats</span>
            </div>
            <div
              class="stat-pill"
              v-if="composition.keyItems.length"
            >
              <i class="fad fa-treasure-chest text-warning"></i>
              <span>{{ composition.keyItems.length }} Items</span>
            </div>
          </div>
          <div
            class="sort-toggle"
            @click="toggleSortOrder"
          >
            <i :class="['fad', sortDescending ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-wide-short']"></i>
          </div>
        </div>

        <!-- Rooms Grouped by Floor -->
        <ion-accordion-group
          v-if="Object.keys(roomsByFloor).length > 0"
          :value="defaultOpenFloors"
          :multiple="true"
        >
          <ion-accordion
            v-for="(rooms, floorId) in roomsByFloor"
            :key="floorId"
            :value="floorId"
            class="floor-accordion"
          >
            <ion-item
              slot="header"
              class="floor-header"
            >
              <div class="floor-icon">
                <i :class="['fad', getFloorIcon(floorId)]"></i>
              </div>
              <ion-label>
                <h2>{{ formatFloorName(floorId) }}</h2>
                <p>{{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }}</p>
              </ion-label>
            </ion-item>

            <div
              slot="content"
              class="room-list"
            >
              <div
                v-for="room in rooms"
                :key="room.symbol"
                class="room-card"
                :class="[`room-type-${room.type}`]"
                @click="navigateToRoom(room)"
              >
                <div
                  class="room-icon-wrapper"
                  :class="[`type-${room.type}`]"
                >
                  <i :class="['fad', getRoomTypeIcon(room.type)]"></i>
                </div>

                <div class="room-info">
                  <div class="room-title">
                    <span class="room-type">{{ formatRoomType(room.type) }}</span>
                    <span class="room-coords">{{ room.coords }}</span>
                  </div>
                  <div class="room-details">
                    <span
                      v-if="room.beasts && room.beasts.length"
                      class="detail-badge beasts"
                    >
                      <i class="fad fa-skull"></i> {{ room.beasts.length }}
                    </span>
                    <span
                      v-if="room.hasLoot"
                      class="detail-badge loot"
                    >
                      <i class="fad fa-treasure-chest"></i>
                    </span>
                    <span
                      v-if="room.isLocked"
                      class="detail-badge locked"
                    >
                      <i class="fas fa-lock"></i>
                    </span>
                  </div>
                </div>

                <div class="room-arrow">
                  <i class="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <!-- Empty State -->
        <div
          class="glass-card empty-state"
          v-else
        >
          <ion-icon
            :icon="homeOutline"
            class="empty-icon"
          ></ion-icon>
          <h2>No Rooms Yet</h2>
          <p>Head to the Layout tab to design your dungeon and add rooms.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { useRoute } from "vue-router";
import { IonPage, IonContent, IonIcon, IonAccordionGroup, IonAccordion, IonItem, IonLabel, useIonRouter } from "@ionic/vue";
import { homeOutline } from 'ionicons/icons';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { TempleDataInjectionKey } from "../../composables/useTempleData";
import { inject } from "vue";
import { ____ as ROOM_WALL, VOID as ROOM_VOID } from "@/lib/engine/dungeons/roomTypes";

interface RoomListItem {
  symbol: string;
  type: string;
  floor: string;
  row: number;
  col: number;
  coords: string;
  beasts?: string[];
  hasLoot: boolean;
  isLocked: boolean;
  content?: any;
}

export default defineComponent({
  name: "xp-temple-rooms",
  components: { IonPage, IonContent, IonIcon, IonAccordionGroup, IonAccordion, IonItem, IonLabel, XpLoading },
  setup() {
    const route = useRoute();
    const ionRouter = useIonRouter();
    const templeId = route.params.templeId as string;
    
    // Sort order toggle state
    const sortDescending = ref(true); // true = top to bottom (2F, 1F, B1...)
    
    const toggleSortOrder = () => {
      sortDescending.value = !sortDescending.value;
    };
    
    const { 
      temple,
      composition, 
      getRoomTypeIcon, 
      getMonsterIcon,
      isLoading
    } = inject(TempleDataInjectionKey)!;

    // Build a flat list of all rooms from the maze
    const roomList = computed((): RoomListItem[] => {
      const rooms: RoomListItem[] = [];
      
      if (!temple.value.dungeonLayout?.maze || !temple.value.dungeonLayout?.rooms) {
        return rooms;
      }

      const maze = temple.value.dungeonLayout.maze;
      const roomDefs = temple.value.dungeonLayout.rooms;

      const processFloor = (grid: string[][], floorId: string) => {
        grid.forEach((row, rowIndex) => {
          row.forEach((cellSymbol, colIndex) => {
            if (!cellSymbol || cellSymbol === ROOM_WALL || cellSymbol === ROOM_VOID) return;
            
            const roomData = roomDefs[cellSymbol];
            if (!roomData || roomData.type === 'wall' || roomData.type === 'empty') return;

            rooms.push({
              symbol: cellSymbol,
              type: roomData.type,
              floor: floorId,
              row: rowIndex,
              col: colIndex,
              coords: `${colIndex + 1}x ${rowIndex + 1}y`,
              beasts: roomData.content?.beasts || [],
              hasLoot: roomData.type === 'loot' || !!roomData.content?.dungeon,
              isLocked: roomData.sides?.north === 'locked' || 
                       roomData.sides?.south === 'locked' || 
                       roomData.sides?.east === 'locked' || 
                       roomData.sides?.west === 'locked',
              content: roomData.content
            });
          });
        });
      };

      if (Array.isArray(maze)) {
        processFloor(maze, '1F');
      } else {
        Object.entries(maze).forEach(([floorId, grid]) => {
          processFloor(grid as string[][], floorId);
        });
      }

      // Sort by priority within each floor
      const typePriority: Record<string, number> = {
        boss: 1,
        miniboss: 2,
        monster: 3,
        loot: 4,
        shop: 5,
        teleport: 6,
        health: 7,
        entrance: 8
      };

      return rooms.sort((a, b) => {
        const aPriority = typePriority[a.type] || 99;
        const bPriority = typePriority[b.type] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });
    });

    // Group rooms by floor
    const roomsByFloor = computed((): Record<string, RoomListItem[]> => {
      const grouped: Record<string, RoomListItem[]> = {};
      
      // Get floor order (surface floors ascending, then basement floors descending)
      const getFloorValue = (f: string): number => {
        if (f.endsWith('F')) return parseInt(f);
        if (f.startsWith('B')) return -parseInt(f.replace('B', ''));
        return 0;
      };

      // First, collect all floors
      const floors = new Set<string>();
      roomList.value.forEach(room => floors.add(room.floor));
      
      // Sort floors based on toggle
      const sortedFloors = Array.from(floors).sort((a, b) => 
        sortDescending.value 
          ? getFloorValue(b) - getFloorValue(a)  // Top to bottom
          : getFloorValue(a) - getFloorValue(b)  // Bottom to top
      );
      
      // Group rooms
      sortedFloors.forEach(floor => {
        grouped[floor] = roomList.value.filter(r => r.floor === floor);
      });

      return grouped;
    });

    // Default open floors (all floors with rooms)
    const defaultOpenFloors = computed(() => Object.keys(roomsByFloor.value));

    const totalMonsters = computed(() => {
      return composition.value.monsters.reduce((sum, m) => sum + m.count, 0);
    });

    const formatRoomType = (type: string): string => {
      const labels: Record<string, string> = {
        boss: 'Boss Chamber',
        miniboss: 'Mini-Boss',
        monster: 'Battle Room',
        loot: 'Treasure',
        shop: 'Shop',
        teleport: 'Warp Zone',
        health: 'Recovery',
        entrance: 'Entrance'
      };
      return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
    };

    const formatFloorName = (floorId: string): string => {
      if (floorId.endsWith('F')) {
        const num = parseInt(floorId);
        if (num === 1) return 'Ground Floor';
        return `Floor ${num}`;
      }
      if (floorId.startsWith('B')) {
        const num = parseInt(floorId.replace('B', ''));
        return `Basement ${num}`;
      }
      return floorId;
    };

    const getFloorIcon = (floorId: string): string => {
      if (floorId.startsWith('B')) return 'fa-dungeon';
      if (floorId === '1F') return 'fa-dungeon-door';
      return 'fa-clouds';
    };

    const navigateToRoom = (room: RoomListItem) => {
      ionRouter.push(`/game-master/compendium/setup/temples/${templeId}/rooms/${room.row}/${room.col}`);
    };

    return {
      roomList,
      roomsByFloor,
      defaultOpenFloors,
      sortDescending,
      toggleSortOrder,
      composition,
      totalMonsters,
      isLoading,
      getRoomTypeIcon,
      getMonsterIcon,
      formatRoomType,
      formatFloorName,
      getFloorIcon,
      navigateToRoom,
      homeOutline
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-temple-rooms {
    --background: transparent;
  }

  .transparent-content {
    --background: transparent;
  }

  .loading-wrapper-centered {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    padding: 40px;
  }

  .content-wrapper {
    padding: 0 16px 40px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* Summary Header */
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .stat-pills {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sort-toggle {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    i {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.7);
    }

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .stat-pills {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);

    i {
      font-size: 1rem;
    }
  }

  /* Floor Accordion */
  .floor-accordion {
    margin-bottom: 12px;
    border-radius: 16px;
    overflow: hidden;
    background: transparent;

    &::part(header) {
      background: rgba(25, 27, 46, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
    }

    &::part(content) {
      background: transparent;
      padding: 0;
    }

    &.accordion-expanded::part(header) {
      border-radius: 16px 16px 0 0;
    }
  }

  .floor-header {
    --background: transparent;
    --color: white;
    --padding-start: 16px;
    --inner-padding-end: 16px;

    .floor-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      margin-right: 14px;

      i {
        font-size: 1.2rem;
        color: var(--ion-color-tertiary);
      }
    }

    ion-label {
      h2 {
        font-family: var(--xp-font-heading);
        font-size: 1rem;
        color: white;
        margin: 0 0 2px;
      }

      p {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
      }
    }
  }

  /* Room List */
  .room-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(15, 17, 30, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-top: none;
    border-radius: 0 0 16px 16px;
  }

  .room-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(35, 37, 56, 0.8);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateX(4px);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  .room-icon-wrapper {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;

    i {
      font-size: 1.3rem;
      color: rgba(255, 255, 255, 0.8);
    }

    &.type-boss {
      background: rgba(255, 69, 58, 0.2);
      border-color: rgba(255, 69, 58, 0.4);

      i {
        color: #ff453a;
      }
    }

    &.type-miniboss {
      background: rgba(255, 159, 10, 0.2);
      border-color: rgba(255, 159, 10, 0.4);

      i {
        color: #ff9f0a;
      }
    }

    &.type-monster {
      background: rgba(175, 82, 222, 0.2);
      border-color: rgba(175, 82, 222, 0.4);

      i {
        color: #af52de;
      }
    }

    &.type-loot {
      background: rgba(255, 214, 10, 0.2);
      border-color: rgba(255, 214, 10, 0.4);

      i {
        color: #ffd60a;
      }
    }

    &.type-shop {
      background: rgba(48, 209, 88, 0.2);
      border-color: rgba(48, 209, 88, 0.4);

      i {
        color: #30d158;
      }
    }

    &.type-teleport {
      background: rgba(10, 132, 255, 0.2);
      border-color: rgba(10, 132, 255, 0.4);

      i {
        color: #0a84ff;
      }
    }
  }

  .room-info {
    flex: 1;
    min-width: 0;
  }

  .room-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .room-type {
    font-family: var(--xp-font-heading);
    font-size: 0.9rem;
    color: white;
  }

  .room-coords {
    font-family: "StatusPlz";
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .room-details {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .detail-badge {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.65rem;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);

    i {
      font-size: 0.65rem;
    }

    &.beasts {
      background: rgba(175, 82, 222, 0.2);
      color: #af52de;
    }

    &.loot {
      background: rgba(255, 214, 10, 0.2);
      color: #ffd60a;
    }

    &.locked {
      background: rgba(255, 159, 10, 0.2);
      color: #ff9f0a;
    }
  }

  .room-arrow {
    color: rgba(255, 255, 255, 0.3);
    transition: transform 0.2s ease;

    .room-card:hover & {
      transform: translateX(4px);
      color: rgba(255, 255, 255, 0.6);
    }
  }

  /* Empty State */
  .glass-card {
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    text-align: center;

    &.empty-state {
      .empty-icon {
        font-size: 3rem;
        color: rgba(255, 255, 255, 0.3);
        margin-bottom: 16px;
      }

      h2 {
        font-family: var(--xp-font-heading);
        font-size: 1.1rem;
        color: white;
        margin: 0 0 8px;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.5;
      }
    }
  }
</style>
