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
                    <XpCoordBadge
                      plain
                      :x="room.col"
                      :y="room.row"
                      class="room-coords"
                    />
                  </div>
                  <XpTempleRoomBadges
                    class="room-details"
                    :beasts="room.beasts?.length ?? 0"
                    :has-loot="room.hasLoot"
                    :is-locked="room.isLocked"
                  />
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
import XpCoordBadge from "@/components/atoms/Coord/XpCoordBadge.vue";
import XpTempleRoomBadges from "./XpTempleRoomBadges.vue";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";
import { inject } from "vue";
import { VOID as ROOM_VOID } from "@/lib/engine/dungeons/roomTypes";
import { isWallToken } from "@/lib/engine/dungeons/SpatialPalette";

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
  components: { IonPage, IonContent, IonIcon, IonAccordionGroup, IonAccordion, IonItem, IonLabel, XpLoading, XpCoordBadge, XpTempleRoomBadges },
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
      
      const maze = temple.value.dungeonLayout?.maze;
      const roomDefs = temple.value.dungeonLayout?.rooms;
      const isMissingLayout = !maze || !roomDefs;
      if (isMissingLayout) {
        return rooms;
      }

      const processFloor = (grid: string[][], floorId: string) => {
        grid.forEach((row, rowIndex) => {
          row.forEach((cellSymbol, colIndex) => {
            const isNonRoomCell = !cellSymbol || isWallToken(cellSymbol) || cellSymbol === ROOM_VOID;
            if (isNonRoomCell) return;
            
            const roomData = roomDefs[cellSymbol];
            const isUnlistedRoom = !roomData || roomData.type === 'wall' || roomData.type === 'empty';
            if (isUnlistedRoom) return;

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
        return aPriority - bPriority || a.row - b.row || a.col - b.col;
      });
    });

    // Group rooms by floor
    const roomsByFloor = computed((): Record<string, RoomListItem[]> => {
      const grouped: Record<string, RoomListItem[]> = {};
      
      // Get floor order (surface floors ascending, then basement floors descending)
      const getFloorValue = (f: string): number => {
        const isUpperFloor = f.endsWith('F');
        const isBasement = f.startsWith('B');
        if (isUpperFloor) return parseInt(f);
        if (isBasement) return -parseInt(f.replace('B', ''));
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
      const isUpperFloor = floorId.endsWith('F');
      const isBasement = floorId.startsWith('B');
      if (isUpperFloor) {
        const num = parseInt(floorId);
        const isGroundFloor = num === 1;
        if (isGroundFloor) return 'Ground Floor';
        return `Floor ${num}`;
      }
      if (isBasement) {
        const num = parseInt(floorId.replace('B', ''));
        return `Basement ${num}`;
      }
      return floorId;
    };

    const getFloorIcon = (floorId: string): string => {
      const isBasement = floorId.startsWith('B');
      const isGroundFloor = floorId === '1F';
      if (isBasement) return 'fa-dungeon';
      if (isGroundFloor) return 'fa-dungeon-door';
      return 'fa-clouds';
    };

    // The address names the room's floor: the list shows every floor, and the editor opens the cell on the floor named
    const navigateToRoom = (room: RoomListItem) => {
      ionRouter.push(`/game-master/compendium/temples/${templeId}/rooms/${room.floor}/${room.row}/${room.col}`);
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

<style lang="scss" scoped src="./_XpTempleRooms.scss" />
