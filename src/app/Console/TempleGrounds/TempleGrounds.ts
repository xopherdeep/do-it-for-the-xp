import { defineComponent, onMounted, computed, ref } from 'vue';
import ionic from '@/mixins/ionic';
import { actionSheetController, alertController } from '@ionic/vue';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { useRouter } from 'vue-router';
import { useTemple } from '@/hooks/useTemple';
import { registerAllTemples, registerCustomTemples } from '@/lib/engine/core/dungeons/TempleAdapter';
import { importAllTempleLayouts } from '@/lib/engine/core/dungeons/importAllTemples';
import temples from '../../../lib/engine/temples';
import XpFabUserHud from '../MyPortal/UserHud/components/XpFabUserHud.vue';
import XpXpBar from '../MyPortal/UserHud/components/XpXpBar.vue';
import XpMainHud from '../MyPortal/UserHud/components/XpMainHud.vue';
import debug from '@/lib/utils/debug';
import { useUserStore } from '@/lib/store/stores/user';
import { play$fx } from "@/assets/fx"

export default defineComponent({
  props: ['userId', 'temple', 'x', 'y'],
  name: 'temple-grounds-engine',
  mixins: [ionic],
  components: {
    XpFabUserHud,
    XpXpBar,
    XpMainHud
  },
  setup(props) {
    const userStore = useUserStore();
    
    // Ensure users are loaded
    if (Object.keys(userStore.users).length === 0) {
      userStore.loadUsers();
    }

    const user = computed(() => {
      return userStore.getUserById(props.userId);
    });

    // Register predefined temples with the engine (for gameplay, not editing)
    registerAllTemples(temples);

    // Import all temple layouts into the database if they don't exist
    importAllTempleLayouts()
      .then(() => debug.log('Temple layouts checked/syncing with TempleDb'))
      .catch(err => debug.error('Failed to sync temple layouts:', err));

    // Register custom temples from the TempleDb (user-created content)
    registerCustomTemples().catch(err => debug.error('Failed to register custom temples:', err));

    // Get temple features from the composable
    const {
      currentPosition,
      currentLevel,
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
        case 'miniboss':
        case 'boss':
          actions.header = currentRoom.value.type === 'boss' 
            ? 'A Powerful Boss appears!' 
            : 'A Monster approaches!';
          actions.buttons.unshift({
            text: 'Fight',
            role: 'fight',
            handler: () => {
              // Navigate using URL path format - BattleField will look up the room data
              const [row, col] = currentPosition.value;
              const level = currentLevel.value;
              
              router.push({
                name: 'battle-field-temple',
                params: {
                  templeId: props.temple,
                  level: level,
                  x: col.toString(),
                  y: row.toString()
                }
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
      const templeWorldMap: Record<string, { world: string, route: string }> = {
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
      if (typeof play$fx === 'function') {
        play$fx('openChest');
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
              if (typeof play$fx === 'function') {
                play$fx('yes');
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
      play$fx('openChest');


      const alert = await alertController.create({
        header: 'Chest is empty!',
        buttons: [
          {
            text: 'Ok',
            role: 'cancel',
            handler: () => {
              if (typeof play$fx === 'function') {
                play$fx('yes');
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

    // Computed properties for equipped items
    const leftHandItem = computed(() => {
      const currentUser = user.value;
      if (!currentUser?.equipment?.leftHand) return null;
      return currentUser.equipment.leftHand[0] || null;
    });

    const rightHandItem = computed(() => {
      const currentUser = user.value;
      if (!currentUser?.equipment?.rightHand) return null;
      return currentUser.equipment.rightHand[0] || null;
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
      closeMap,
      user,
      leftHandItem,
      rightHandItem
    };
  },
  computed: {
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