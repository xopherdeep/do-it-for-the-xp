<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="end">
          <ion-button color="rpg">
            <i class="fad fa-key-skeleton m-0 mr-2 fa-2x ion-float-right" />
            {{ playerKeys }}
          </ion-button>
        </ion-buttons>
        <!-- <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
          <i class="fad fa-2x fa-place-of-worship" />
        </ion-buttons> -->
        <!-- <ion-title v-html="templeName" /> -->
        <ion-buttons slot="start">

          <ion-button
            v-if="hasMap"
            @click="openMap"
            color="rpg"
          >
            <i
              class="fad fa-2x"
              :class="{
                'fa-map': !hasCompass,
                'fa-map-marked': hasCompass,
              }"
            />
          </ion-button>
          <ion-button
            v-if="hasCompass"
            color="rpg"
          >
            <i class="fad fa-compass fa-2x" />
          </ion-button>


          <ion-button
            color="rpg"
            :disabled="true"
            v-if="hasCompass"
          >
            <i class="fad fa-walking fa-2x mr-2" />
            <ion-title>{{
              currentPosition
              }}
            </ion-title>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :style="{
        overflow: 'hidden',
        position: 'relative'
      }"
      id="game-area"
    >
      <!-- Background grid container with all rooms -->
      <div
        id="background-container"
        class="background-container"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${backgroundPosition.x}px, ${backgroundPosition.y}px)`,
          transition: 'transform 0.5s ease-in-out'
        }"
      >
        <!-- Create background cells -->
        <template
          v-for="(row, rowIndex) in maze"
          :key="`row-${rowIndex}`"
        >
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            :style="{
              position: 'absolute',
              top: `${rowIndex * tileHeight}px`,
              left: `${colIndex * tileWidth}px`,
              width: `${tileWidth}px`,
              height: `${tileHeight}px`,
              backgroundImage: `url(${getBgImage(`[${rowIndex},${colIndex}]`)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }"
          ></div>
        </template>
      </div>

      <ion-fab
        vertical="center"
        horizontal="center"
        id="room-action"
        @click="showRoomActions"
      >
        <ion-fab-button :color="actionColor">
          <i
            class="fad fa-2x"
            :class="ROOM_ICONS[currentRoom?.type]"
          />
        </ion-fab-button>
      </ion-fab>

      <!-- Navigation buttons and other UI components -->
      <ion-fab
        vertical="bottom"
        horizontal="start"
        v-if="hasMap"
      >
        <ion-fab-button @click="openMap">
          <i
            class="fad fa-2x"
            :class="{ 'fa-map': !hasCompass, 'fa-map-marked': hasCompass }"
          />
        </ion-fab-button>
        <ion-modal
          :isOpen="isMapOpen"
          @didDismiss="closeMap"
          backdropDismiss="true"
        >
          <ion-card class="maze-container icon-colors">
            <ion-grid>
              <ion-row
                v-for="(row, rowIndex) in maze"
                :key="rowIndex"
                class="maze-row"
              >
                <ion-col
                  v-for="(cell, colIndex) in row"
                  :key="colIndex"
                  :class="getMapTileClass(rowIndex, colIndex)"
                >
                  <!-- Show appropriate content based on map/compass state -->
                  <template v-if="getRoomVisibility(rowIndex, colIndex) !== 'none'">
                    <!-- Current position always shows the player icon when we have a map -->
                    <i
                      v-if="isCurrentRoom(rowIndex, colIndex)"
                      class="fad fa-2x fa-walking"
                      :class="{ 'pulse-animation': true }"
                    />
                    <!-- Walls are always visible with the map, using the thematic icon with increased dimness -->
                    <i
                      v-else-if="rooms[cell]?.type === 'wall'"
                      class="fad fa-2x"
                      :class="{ 
                        [ROOM_ICONS.wall]: true,
                        'opacity-10': true 
                      }"
                    ></i>
                    <!-- Show room details if we have compass or have visited the room -->
                    <i
                      v-else-if="showRoomDetails(rowIndex, colIndex)"
                      :class="{ 
                        [getRoomIcon(rowIndex, colIndex)]: true,
                        'fal': rooms[cell]?.type === 'loot' && rooms[cell]?.isEmpty,
                        'fad': !(rooms[cell]?.type === 'loot' && rooms[cell]?.isEmpty),
                        'opacity-45': !isRoomVisited(rowIndex, colIndex) && hasCompass 
                      }"
                      class="fa-2x"
                    ></i>
                    <!-- Show a dimmed question mark for rooms we know exist but haven't visited -->
                    <i
                      v-else
                      class="fad fa-2x fa-question-circle opacity-40"
                    ></i>
                  </template>
                  <!-- Show nothing if we don't have the map -->
                  <template v-else>
                    <i class="fad fa-2x fa-solid opacity-0"></i>
                  </template>
                </ion-col>
              </ion-row>
            </ion-grid>
            <div class="map-legend float-right flex flex-row">
              <ion-chip
                class="legend-item"
                v-if="hasMap"
              >
                <i class="fad fa-walking fa-lg mr-2"></i>
                <span>You are here</span>
              </ion-chip>
              <ion-chip
                class="legend-item"
                v-if="hasCompass"
              >
                <i class="fad fa-compass fa-lg mr-2"></i>
                <span>Reveals rooms</span>
              </ion-chip>
            </div>
            <ion-buttons>
              <ion-button
                @click="closeMap"
                class="rounded"
              >
                Close Map
              </ion-button>
            </ion-buttons>
          </ion-card>
        </ion-modal>
      </ion-fab>

      <ion-fab
        v-if="canMoveRight"
        vertical="center"
        horizontal="end"
      >
        <ion-fab-button @click.stop="moveWithUpdate('east')">
          <i
            class="fad fa-2x"
            :class="
              isDoorLocked(currentPosition[0], currentPosition[1] + 1)
                ? 'fa-lock'
                : 'fa-arrow-alt-right'
            "
          />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveLeft"
        vertical="center"
        horizontal="start"
      >
        <ion-fab-button @click.stop="moveWithUpdate('west')">
          <i
            class="fad fa-2x"
            :class="
              isDoorLocked(currentPosition[0], currentPosition[1] - 1)
                ? 'fa-lock'
                : ' fa-arrow-alt-left'
            "
          />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveDown"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button @click="moveWithUpdate('south')">
          <i
            class="fad fa-2x"
            :class="
              isDoorLocked(currentPosition[0] + 1, currentPosition[1])
                ? 'fa-lock'
                : 'fa-arrow-alt-down'
            "
          />
        </ion-fab-button>
      </ion-fab>

      <xp-fab-user-hud
        :user="user"
        :isUserFabOn="true"
      />
      <ion-fab
        v-if="canMoveUp"
        vertical="top"
        horizontal="center"
      >
        <ion-fab-button @click="moveWithUpdate('north')">
          <i
            class="fad fa-2x"
            :class="
              isDoorLocked(currentPosition[0] - 1, currentPosition[1])
                ? 'fa-lock'
                : ' fa-arrow-alt-up'
            "
          />
        </ion-fab-button>
      </ion-fab>


      <!-- 
      <XpUserPointsHud
        v-if="user && user.stats"
        :stats="user.stats"
      /> -->

      <!-- Toast for messages -->
      <ion-toast
        :is-open="showMessage"
        :message="currentMessage"
        position="middle"
        :duration="2000"
      ></ion-toast>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option> Left Handed </ion-item-option>
          </ion-item-options>
          <ion-item-options side="end">
            <ion-item-option> Right Handed </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-avatar
              slot="start"
              v-if="user"
            >
              <ion-img :src="$getUserAvatar(user)" />
            </ion-avatar>
            <ion-label slot="start">
              <i class="fad fa-heart ion-float-right" />
              HP
              <ion-progress-bar color="danger" />
              <p class="pt-2">
                <i class="fad fa-magic ion-float-right" />
                MP
                <ion-progress-bar color="secondary" />
              </p>
            </ion-label>
            <ion-buttons class="icon-colors">
              <ion-button @click="$router.push(`/my-abilities/${userId}`)">
                <i class="fad fa-book-spells fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-inventory/${userId}`)">
                <i class="fad fa-backpack fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-tasks/${userId}`)">
                <i class="fad fa-medal fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-gold-points/${userId}`)">
                <i class="fad fa-wallet fa-2x" />
              </ion-button>
            </ion-buttons>
            <i
              class="fad fa-grip-vertical text-xs m-0"
              slot="end"
            />
          </ion-item>
        </ion-item-sliding>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, computed, ref } from 'vue';
import ionic from '@/mixins/ionic';
import { actionSheetController, alertController } from '@ionic/vue';
import { mapGetters } from 'vuex';
import { ROOM_ICONS } from '@/dungeons/roomTypes';
import { useRouter } from 'vue-router';
import { useTemple } from '@/hooks/useTemple';
import { registerAllTemples, registerCustomTemples } from '@/engine/core/TempleAdapter';
import { importAllTempleLayouts } from '@/engine/core/importAllTemples';
import temples from './temples';
import XpFabUserHud from '../../components/XpFabUserHud.vue';
import debug from '@/utils/debug';

export default defineComponent({
  props: ['userId', 'temple', 'x', 'y'],
  name: 'temple-grounds-engine',
  mixins: [ionic],
  components: {
    XpFabUserHud,
  },
  setup(props) {
    // Register predefined temples with the engine
    registerAllTemples(temples);
    
    // Import all temple layouts into the database
    importAllTempleLayouts()
      .then(() => debug.log('All temple layouts imported into TempleDb'))
      .catch(err => debug.error('Failed to import temple layouts:', err));
    
    // Register custom temples from the TempleDb
    registerCustomTemples().catch(err => debug.error('Failed to register custom temples:', err));

    // Get temple features from the composable
    const {
      currentPosition,
      hasMap,
      hasCompass,
      playerKeys,
      isMapOpen,
      currentRoom,
      maze,
      rooms,
      actionColor,
      currentMessage,
      showMessage,
      canMoveUp,
      canMoveDown,
      canMoveLeft,
      canMoveRight,
      move,
      isDoorLocked,
      unlockDoor,
      processChestItems,
      handleTeleport,
      toggleMap,
      displayMessage,
      chestContents,
      isChestEmpty,
      openMap,
      closeMap,
      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      isCurrentRoom,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited
    } = useTemple(props.temple, props.x && props.y ? [Number(props.y), Number(props.x)] : undefined);

    const router = useRouter();

    // Background position state for CSS transforms - initialize with default values
    const backgroundPosition = ref({ x: 0, y: 0 });
    
    // Tile dimensions for the background grid
    const tileWidth = ref(window.innerWidth);
    const tileHeight = ref(window.innerHeight - 140);
    
    // Update tile dimensions when window resizes
    onMounted(() => {
      const updateDimensions = () => {
        tileWidth.value = window.innerWidth;
        tileHeight.value = window.innerHeight - 140;
        const [row, col] = currentPosition.value;
        updateBg(col, row);
      };
      
      window.addEventListener('resize', updateDimensions);
      updateDimensions(); // Initial setup
    });

    // Format the temple name for display
    const templeName = computed(() => {
      return props.temple.replace(/-/g, ' ');
    });

    // Calculate valid room coordinates for background images
    const validRoomCoords = computed(() => {
      const coords: string[] = [];
      
      for (let row = 0; row < maze.value.length; row++) {
        for (let col = 0; col < maze.value[row].length; col++) {
          const roomKey = maze.value[row][col];
          if (rooms.value[roomKey]?.type !== 'wall') {
            coords.push(`[${row},${col}]`);
          } else {
            coords.push(`[0,0]`);
          }
        }
      }
      
      return coords;
    });

    // Helper to get background images
    const getBgImage = (xy: string) => {
      try {
        return require(`@/assets/images/backgrounds/${props.temple}/${xy}.jpg`);
      } catch {
        return '';
      }
    };

    // Update the background position visually
    const updateBg = (x: number, y: number) => {
      // Get dimensions of a single image tile
      const tileWidth = window.innerWidth; // Full viewport width
      const tileHeight = window.innerHeight - 140; // Account for header/footer

      // Calculate translate values - invert for proper positioning
      const translateX = -x * tileWidth;
      const translateY = -y * tileHeight;

      // Update the background position directly in our reactive state
      backgroundPosition.value = { x: translateX, y: translateY };
    };

    // Show the unlock door alert
    const showUnlockDoorAlert = async (direction: 'north' | 'south' | 'east' | 'west') => {
      const buttons = playerKeys.value
        ? [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Unlock (-1 Key)',
              handler: () => {
                if (playerKeys.value > 0) {
                  unlockDoor(direction);
                  displayMessage('Door unlocked!');
                }
              }
            }
          ]
        : [{ text: 'Ok', role: 'cancel' }];

      const alert = await alertController.create({
        header: 'Locked Door',
        message:
          playerKeys.value > 0
            ? 'Would you like to use a key to unlock this door?'
            : 'You need a key to unlock this door!',
        buttons
      });

      await alert.present();
    };

    // Handle showing room actions
    const showRoomActions = async () => {
      if (!currentRoom.value) return;

      const actions = {
        header: 'What would you like to do?',
        buttons: [{ text: 'Cancel', role: 'cancel' } as any]
      };

      switch (currentRoom.value.type) {
        case 'entrance':
          actions.header = 'Temple Entrance';
          actions.buttons.unshift({
            text: 'Leave Temple',
            role: 'leave',
            handler: () => {
              // Get the world location for this temple
              const templeWorldMap = getTempleWorldLocation(props.temple);
              
              // Navigate to the appropriate world map location
              router.push({
                name: templeWorldMap.route,
                params: { userId: props.userId }
              });
            }
          } as any);
          break;
        case 'loot':
          // Check the chest state using our improved isChestEmpty computed property
          if (isChestEmpty.value) {
            actions.buttons.unshift({
              text: 'Inspect Empty Chest',
              role: 'open',
              handler: () => {
                showEmptyChestAlert();
              }
            } as any);
          } else {
            actions.buttons.unshift({
              text: 'Open Chest',
              role: 'open',
              handler: () => {
                showChestContentsDialog();
              }
            } as any);
          }
          break;
        case 'monster':
          actions.header = 'A Monster approaches!';
          actions.buttons.unshift({
            text: 'Fight',
            role: 'fight',
            handler: () => {
              router.push({
                name: 'battle-ground',
                params: { userId: props.userId }
              });
            }
          } as any);
          break;
        case 'shop':
          actions.header = 'Can I interest you in my wares?';
          actions.buttons.unshift({
            text: 'View Wares',
            role: 'view',
            handler: () => {
              // handle shop
            }
          } as any);
          break;
        case 'teleport':
          actions.header = 'You found a teleport!';
          actions.buttons.unshift({
            text: 'Teleport',
            role: 'teleport',
            handler: () => {
              if (handleTeleport()) {
                // Update UI after teleport
                setTimeout(() => {
                  updateBg(currentPosition.value[1], currentPosition.value[0]);
                }, 100);
              }
            }
          } as any);
          break;
      }

      const actionSheet = await actionSheetController.create(actions);
      actionSheet.present();
    };

    // Get the appropriate world location for a temple
    const getTempleWorldLocation = (templeId: string) => {
      // Map temples to their world locations and route names
      const templeWorldMap: Record<string, {world: string, route: string}> = {
        'wind-temple': { world: 'plains', route: 'world-plains' },
        'water-temple': { world: 'islands', route: 'world-islands' },
        'earth-temple': { world: 'forest', route: 'world-forest' },
        'fire-temple': { world: 'mountains', route: 'world-mountains' },
        'ice-temple': { world: 'ice', route: 'world-ice' },
        'light-temple': { world: 'desert', route: 'world-desert' },
        'shadow-temple': { world: 'moon', route: 'world-moon' },
        'lightning-temple': { world: 'clouds', route: 'world-clouds' }
      };

      // Return the world location or default to home-town if not found
      return templeWorldMap[templeId] || { world: 'plains', route: 'home-town' };
    };

    // Handle movement with UI updates
    const moveWithUpdate = (direction: 'north' | 'south' | 'east' | 'west') => {
      const [row, col] = currentPosition.value;
      let newRow = row;
      let newCol = col;

      switch (direction) {
        case 'north':
          newRow = row - 1;
          break;
        case 'south':
          newRow = row + 1;
          break;
        case 'west':
          newCol = col - 1;
          break;
        case 'east':
          newCol = col + 1;
          break;
      }

      // Check if door is locked
      if (isDoorLocked(newRow, newCol)) {
        showUnlockDoorAlert(direction);
        return;
      }
      
      // Update the background FIRST to create the immediate visual feedback
      // This makes the transition feel responsive right away
      updateBg(newCol, newRow);
      
      // THEN attempt to move in the game state
      const result = move(direction);
      
      // If movement failed for some reason, revert the background position
      if (!result) {
        updateBg(col, row);
      }
    };

    // Show a dialog with chest contents
    const showChestContentsDialog = async () => {
      // Play chest opening sound effect
      if (typeof window.$play$fx === 'function') {
        window.$play$fx('openChest');
      }
      
      const inputs = chestContents.value;
      
      if (inputs.length === 0) {
        showEmptyChestAlert();
        return;
      }
      
      const alert = await alertController.create({
        header: 'Chest Contents',
        inputs,
        buttons: [
          {
            text: 'Leave',
            role: 'cancel',
          },
          {
            text: 'Loot',
            handler: (selectedItems) => {
              if (typeof window.$play$fx === 'function') {
                window.$play$fx('yes');
              }
              if (selectedItems && selectedItems.length > 0) {
                processChestItems(selectedItems);
              }
            },
          },
        ],
      });
      
      await alert.present();
    };
    
    // Show an alert for an empty chest
    const showEmptyChestAlert = async () => {
      // Play chest opening sound effect
      if (typeof window.$play$fx === 'function') {
        window.$play$fx('openChest');
      }
      
      const alert = await alertController.create({
        header: 'Chest is empty!',
        buttons: [
          {
            text: 'Ok',
            role: 'cancel',
            handler: () => {
              if (typeof window.$play$fx === 'function') {
                window.$play$fx('yes');
              }
            },
          },
        ],
      });
      
      await alert.present();
    };

    // Set up initial background position
    onMounted(() => {
      const [row, col] = currentPosition.value;
      updateBg(col, row);
    });

    return {
      // From useTemple
      currentPosition,
      hasMap,
      hasCompass,
      playerKeys,
      isMapOpen,
      currentRoom,
      maze,
      rooms,
      actionColor,
      currentMessage,
      showMessage,
      canMoveUp,
      canMoveDown,
      canMoveLeft,
      canMoveRight,
      toggleMap,
      isCurrentRoom,
      
      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited,
      
      // Local functions
      moveWithUpdate,
      isDoorLocked,
      showRoomActions,
      getBgImage,
      validRoomCoords,
      templeName,
      backgroundPosition,
      updateBg,
      
      // Tile dimensions for grid
      tileWidth,
      tileHeight,
      
      // Constants
      ROOM_ICONS,
      openMap,
      closeMap
    };
  },
  computed: {
    ...mapGetters(['getUserById']),
    user() {
      return this.getUserById(this.userId);
    },
    currentBgImage() {
      const [row, col] = this.currentPosition;
      try {
        return require(`@/assets/images/backgrounds/${this.temple}/[${row},${col}].jpg`);
      } catch {
        return '';
      }
    }
  }
});
</script>

<style lang="scss" src="./_TempleGrounds.scss" />