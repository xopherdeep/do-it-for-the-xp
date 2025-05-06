<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dev"></ion-back-button>
        </ion-buttons>
        <ion-title>Dungeon Background Designer</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleControlsModal">
            <ion-icon :icon="settingsOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="dungeon-designer">
        <canvas
          ref="dungeonCanvas"
          :width="canvasWidth"
          :height="canvasHeight"
          class="dungeon-canvas"
        ></canvas>

        <RoomInfoDisplay 
          :roomType="currentRoomType" 
          :position="currentPosition" 
        />
      </div>

      <!-- Navigation buttons -->
      <NavigationControls 
        :canMoveUp="canMoveUp"
        :canMoveDown="canMoveDown"
        :canMoveLeft="canMoveLeft"
        :canMoveRight="canMoveRight"
        :isDoorLocked="isDoorLocked"
        @move="handleMove"
      />

      <RoomActionButton 
        :roomIcon="getRoomIcon()" 
        @showDetails="showRoomDetails" 
      />
    </ion-content>

    <!-- Controls Modal -->
    <SettingsModal 
      :isOpen="showControlsModal"
      @close="showControlsModal = false"
      :selectedTemple="selectedTemple"
      :currentPosition="currentPosition"
      :currentRoomType="currentRoomType"
      :styles="styles"
      :lockedDoors="lockedDoors"
      @templeChanged="loadSelectedTemple"
      @styleChanged="redrawRoom"
      @toggleDoorLock="toggleDoorLock"
      @exportBackground="exportBackground"
      @resetToEntrance="resetToEntrance"
    />

    <!-- Alert for locked doors -->
    <ion-alert
      :is-open="showLockedDoorAlert"
      header="Locked Door"
      message="This door is locked! You need a key to proceed."
      :buttons="[{ text: 'OK', handler: () => showLockedDoorAlert = false }]"
      @didDismiss="showLockedDoorAlert = false"
    ></ion-alert>

    <!-- Toast for displaying messages -->
    <ion-toast
      :is-open="showMessage"
      :message="currentMessage"
      position="middle"
      :duration="2000"
    ></ion-toast>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon, IonAlert, IonToast,
  actionSheetController, alertController
} from '@ionic/vue';
import {
  settingsOutline} from 'ionicons/icons';

// Import components
import RoomInfoDisplay from './components/RoomInfoDisplay.vue';
import NavigationControls from './components/NavigationControls.vue';
import RoomActionButton from './components/RoomActionButton.vue';
import SettingsModal from './components/SettingsModal.vue';

// Import custom hooks
import { useTempleData } from './hooks/useTempleData';
import { useDoorLocks } from './hooks/useDoorLocks';
import { useNavigation } from './hooks/useNavigation';
import { useStyleConfig } from './hooks/useStyleConfig';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';

// Import utilities
import { ROOM_ICONS } from './utils/roomIcons';
import { Direction, RoomDefinition } from './types';
import debug from '@/lib/utils/debug';

// Initialize temple data hook
const { 
  templeData, 
  selectedTemple, 
  currentPosition, 
  currentRoomType, 
  loadSelectedTemple,
  resetToEntrance, 
  updateRoomInfo, 
  getCurrentRoom,
  isValidRoom
} = useTempleData();

// UI state
const showControlsModal = ref(false);

// Message display system
const currentMessage = ref('');
const showMessage = ref(false);

const displayMessage = (message: string) => {
  currentMessage.value = message;
  showMessage.value = true;
  
  setTimeout(() => {
    showMessage.value = false;
  }, 2000);
};

// Initialize door locks hook
const {
  lockedDoors,
  showLockedDoorAlert,
  updateLockedDoorsFromRoom,
  isDoorLocked,
  toggleDoorLock
} = useDoorLocks();

const styleConfig = useStyleConfig();

// Use the styleConfig object directly rather than spreading it
// This maintains reactivity of all the ref values
const styles = styleConfig;

const {
  dungeonCanvas,
  canvasWidth,
  canvasHeight,
  drawRoom,
  exportBackground,
  initCanvasResizeHandling,
  resizeCanvas
} = useCanvasRenderer();

// Get appropriate header for each room type
const getRoomTypeHeader = (roomType: string): string => {
  switch (roomType) {
    case 'entrance': return 'Temple Entrance';
    case 'loot': return 'Treasure Chest';
    case 'monster': return 'A Monster approaches!';
    case 'boss': return 'Boss Battle!';
    case 'miniboss': return 'Mini Boss!';
    case 'shop': return 'Can I interest you in my wares?';
    case 'teleport': return 'You found a teleport!';
    default: return `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
  }
};

// Redraw the current room
const redrawRoom = () => {
  const ctx = dungeonCanvas.value?.getContext('2d');
  if (!ctx) return;

  const temple = templeData.value[selectedTemple.value];
  const room = getCurrentRoom();
  
  drawRoom(ctx, temple, currentPosition.value, room, isDoorLocked);
};

// Get room icon based on its type
const getRoomIcon = () => {
  const room = getCurrentRoom();
  if (!room) return ROOM_ICONS.default;
  return ROOM_ICONS[room.type as keyof typeof ROOM_ICONS] || ROOM_ICONS.default;
};

// Show empty chest alert
const showEmptyChestAlert = async () => {
  const alert = await alertController.create({
    header: 'Chest is empty!',
    buttons: [{ text: 'Ok', role: 'cancel' }]
  });
  await alert.present();
};

// Process items from a chest
const processChestItems = (items: string[], room: RoomDefinition) => {
  debug.log('Looted items:', items);
  
  // Mark the chest as empty
  if (room) {
    room.isEmpty = true;
  }
  
  // Display success message
  displayMessage(`Looted ${items.length} items!`);
};

// Show chest contents dialog
const showChestContentsDialog = async (room: RoomDefinition) => {
  // Extract chest contents from room definition
  const chestContents = room.content?.items || [
    { name: 'Gold', value: '50', type: 'checkbox', label: '50 Gold', checked: true },
    { name: 'Potion', value: 'potion', type: 'checkbox', label: 'Health Potion', checked: true }
  ];
  
  const alert = await alertController.create({
    header: 'Chest Contents',
    inputs: chestContents.map(item => ({
      name: item.name,
      type: 'checkbox',
      label: item.label,
      value: item.value,
      checked: true
    })),
    buttons: [
      { text: 'Leave', role: 'cancel' },
      {
        text: 'Loot',
        handler: (selectedItems) => {
          if (selectedItems && selectedItems.length > 0) {
            processChestItems(selectedItems, room);
          }
        }
      }
    ]
  });
  
  await alert.present();
};

// Handle teleportation between rooms
const handleTeleport = () => {
  // In a real app, this would teleport the player to another location
  // For now, just go to a random valid position
  const temple = templeData.value[selectedTemple.value];
  if (!temple) return false;
  
  // Get the current room for context
  const currentRoom = getCurrentRoom();
  if (!currentRoom || currentRoom.type !== 'teleport') return false;
  
  // Find all teleport rooms
  const teleportRooms: [number, number][] = [];
  temple.maze.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellRoom = temple.rooms[cell];
      if (cellRoom && cellRoom.type === 'teleport' && 
          !(rowIndex === currentPosition.value[0] && colIndex === currentPosition.value[1])) {
        teleportRooms.push([rowIndex, colIndex]);
      }
    });
  });
  
  if (teleportRooms.length > 0) {
    // Choose a random teleport destination
    const destination = teleportRooms[Math.floor(Math.random() * teleportRooms.length)];
    currentPosition.value = destination;
    updateRoomInfo();
    redrawRoom();
    displayMessage('Teleported!');
    return true;
  }
  
  displayMessage('Teleport failed!');
  return false;
};

// Show room details and actions based on room type
const showRoomDetails = async () => {
  const room = getCurrentRoom();
  if (!room) return;
  
  // Create an action sheet with options based on room type
  const header = getRoomTypeHeader(room.type);
  
  // Define button types that match Ionic's types
  const buttons: any[] = [{ text: 'Cancel', role: 'cancel' }];
  
  // Add room-specific buttons based on type
  switch (room.type) {
    case 'entrance': {
      buttons.unshift({
        text: 'Leave Temple',
        handler: () => {
          debug.log('Leaving temple');
          // In a real app, would navigate to world map
        }
      });
      break;
    }
    case 'loot': {
      const isChestEmpty = room.isEmpty || false;
      buttons.unshift({
        text: isChestEmpty ? 'Inspect Empty Chest' : 'Open Chest',
        handler: () => {
          if (isChestEmpty) {
            showEmptyChestAlert();
          } else {
            showChestContentsDialog(room);
          }
        }
      });
      break;
    }
    case 'monster':
    case 'boss':
    case 'miniboss': {
      buttons.unshift({
        text: 'Fight',
        handler: () => {
          debug.log(`Starting battle with ${room.type}`);
          // In a real app, would start a battle
        }
      });
      break;
    }
    case 'shop': {
      buttons.unshift({
        text: 'View Wares',
        handler: () => {
          debug.log('Opening shop');
          // In a real app, would open shop interface
        }
      });
      break;
    }
    case 'teleport': {
      buttons.unshift({
        text: 'Teleport',
        handler: () => {
          handleTeleport();
        }
      });
      break;
    }
    default: {
      buttons.unshift({
        text: `Explore ${room.type} room`,
        handler: () => {
          debug.log(`Exploring ${room.type} room`);
        }
      });
    }
  }
  
  // Create and present the action sheet
  const actionSheet = await actionSheetController.create({
    header,
    buttons
  });
  await actionSheet.present();
};

// Initialize navigation hook with temple data
const {
  canMoveUp,
  canMoveDown,
  canMoveLeft,
  canMoveRight,
  moveDirection
} = useNavigation(templeData, selectedTemple, currentPosition, isValidRoom);

// Handle movement between rooms
const handleMove = (direction: Direction) => {
  // Check for locked door first
  if (isDoorLocked(direction)) {
    showLockedDoorAlert.value = true;
    return;
  }

  // Attempt to move
  const success = moveDirection(direction, isDoorLocked);
  
  // If movement was successful, update room info and redraw
  if (success) {
    const room = updateRoomInfo();
    updateLockedDoorsFromRoom(room);
    redrawRoom();
  }
};

// Toggle the controls modal
const toggleControlsModal = () => {
  showControlsModal.value = !showControlsModal.value;
};

// Note: handleToggleDoorLock removed as it's not being used
// Instead, use toggleDoorLock directly from the hook

// Initialize
onMounted(() => {
  // Set up the canvas resize handler
  const cleanup = initCanvasResizeHandling();
  
  // Resize canvas to fit current window dimensions
  resizeCanvas();
  
  // Load the initial temple and draw the room
  loadSelectedTemple().then(() => {
    const room = updateRoomInfo();
    updateLockedDoorsFromRoom(room);
    redrawRoom();
  });
  
  // Cleanup function
  onUnmounted(() => {
    cleanup();
  });
});
</script>

<style scoped>
.dungeon-designer {
  position: relative;
  width: 100%;
  height: 100%;
}

.dungeon-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
}
</style>