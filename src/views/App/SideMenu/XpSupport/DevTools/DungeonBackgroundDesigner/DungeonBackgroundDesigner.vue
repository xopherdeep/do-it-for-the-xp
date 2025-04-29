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

        <div class="room-info-display">
          <ion-chip>
            <ion-label>Room: {{ currentRoomType }}</ion-label>
          </ion-chip>
          <ion-chip>
            <ion-label>Position: [{{ currentPosition[0] }}, {{ currentPosition[1] }}]</ion-label>
          </ion-chip>
        </div>
      </div>

      <!-- Navigation buttons using ion-fab like in TempleGroundsEngine.vue -->
      <ion-fab
        v-if="canMoveUp"
        vertical="top"
        horizontal="center"
      >
        <ion-fab-button @click="moveDirection('north')">
          <ion-icon :icon="isDoorLocked('north') ? lockClosedOutline : chevronUpOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveDown"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button @click="moveDirection('south')">
          <ion-icon :icon="isDoorLocked('south') ? lockClosedOutline : chevronDownOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveLeft"
        vertical="center"
        horizontal="start"
      >
        <ion-fab-button @click="moveDirection('west')">
          <ion-icon :icon="isDoorLocked('west') ? lockClosedOutline : chevronBackOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveRight"
        vertical="center"
        horizontal="end"
      >
        <ion-fab-button @click="moveDirection('east')">
          <ion-icon :icon="isDoorLocked('east') ? lockClosedOutline : chevronForwardOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        vertical="center"
        horizontal="center"
        id="room-action"
      >
        <ion-fab-button @click="showRoomDetails">
          <ion-icon :icon="getRoomIcon()"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Controls Modal -->
    <ion-modal
      :is-open="showControlsModal"
      @didDismiss="showControlsModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Room Designer Controls</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showControlsModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-list>
          <ion-item>
            <ion-label>Temple</ion-label>
            <ion-select
              v-model="selectedTemple"
              interface="popover"
              @ionChange="loadSelectedTemple"
            >
              <ion-select-option value="wind-temple">Wind Temple</ion-select-option>
              <ion-select-option value="water-temple">Water Temple</ion-select-option>
              <ion-select-option value="fire-temple">Fire Temple</ion-select-option>
              <ion-select-option value="earth-temple">Earth Temple</ion-select-option>
              <ion-select-option value="ice-temple">Ice Temple</ion-select-option>
              <ion-select-option value="light-temple">Light Temple</ion-select-option>
              <ion-select-option value="shadow-temple">Shadow Temple</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Visual Era Style</ion-label>
            <ion-select
              v-model="selectedEraStyle"
              interface="popover"
              @ionChange="redrawRoom"
            >
              <ion-select-option
                v-for="style in visualEraStyles"
                :key="style.id"
                :value="style.id"
              >
                {{ style.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-text>
              <p>{{visualEraStyles.find(s => s.id === selectedEraStyle)?.description}}</p>
            </ion-text>
          </ion-item>

          <ion-item>
            <ion-label>Floor Style</ion-label>
            <ion-select
              v-model="floorStyle"
              interface="popover"
              @ionChange="redrawRoom"
            >
              <ion-select-option value="stone">Stone</ion-select-option>
              <ion-select-option value="wood">Wood</ion-select-option>
              <ion-select-option value="dirt">Dirt</ion-select-option>
              <ion-select-option value="marble">Marble</ion-select-option>
              <ion-select-option value="grass">Grass</ion-select-option>
              <ion-select-option value="tile">Tile</ion-select-option>
              <ion-select-option value="mosaic">Mosaic</ion-select-option>
              <ion-select-option value="crystal">Crystal</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Floor Pattern</ion-label>
            <ion-select
              v-model="floorPatternType"
              interface="popover"
              @ionChange="redrawRoom"
            >
              <ion-select-option
                v-for="pattern in floorPatterns"
                :key="pattern.id"
                :value="pattern.id"
              >
                {{ pattern.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Wall Style</ion-label>
            <ion-select
              v-model="wallStyle"
              interface="popover"
              @ionChange="redrawRoom"
            >
              <ion-select-option value="brick">Brick</ion-select-option>
              <ion-select-option value="stone">Stone</ion-select-option>
              <ion-select-option value="rock">Rock</ion-select-option>
              <ion-select-option value="marble">Marble</ion-select-option>
              <ion-select-option value="ice">Ice</ion-select-option>
              <ion-select-option value="timber">Timber</ion-select-option>
              <ion-select-option value="temple">Temple</ion-select-option>
              <ion-select-option value="ornate">Ornate</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Wall Pattern</ion-label>
            <ion-select
              v-model="wallPatternType"
              interface="popover"
              @ionChange="redrawRoom"
            >
              <ion-select-option
                v-for="pattern in wallPatterns"
                :key="pattern.id"
                :value="pattern.id"
              >
                {{ pattern.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Show Room Type Label</ion-label>
            <ion-toggle
              v-model="showRoomTypeLabel"
              @ionChange="redrawRoom"
            ></ion-toggle>
          </ion-item>

          <ion-item lines="none">
            <ion-label>Locked Door Controls</ion-label>
          </ion-item>

          <ion-item>
            <ion-label>Toggle Lock North</ion-label>
            <ion-toggle
              v-model="lockedDoors.north"
              @ionChange="toggleDoorLock('north')"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Toggle Lock South</ion-label>
            <ion-toggle
              v-model="lockedDoors.south"
              @ionChange="toggleDoorLock('south')"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Toggle Lock East</ion-label>
            <ion-toggle
              v-model="lockedDoors.east"
              @ionChange="toggleDoorLock('east')"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Toggle Lock West</ion-label>
            <ion-toggle
              v-model="lockedDoors.west"
              @ionChange="toggleDoorLock('west')"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>Current Position</ion-label>
            <ion-text>Row: {{ currentPosition[0] }}, Col: {{ currentPosition[1] }}</ion-text>
          </ion-item>

          <ion-item>
            <ion-label>Room Type</ion-label>
            <ion-text>{{ currentRoomType }}</ion-text>
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              @click="exportBackground"
            >
              <ion-icon
                slot="start"
                :icon="downloadOutline"
              ></ion-icon>
              Export Background
            </ion-button>
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              @click="resetToEntrance"
            >
              <ion-icon
                slot="start"
                :icon="refreshOutline"
              ></ion-icon>
              Return to Entrance
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- Alert for locked doors -->
    <ion-alert
      :is-open="showLockedDoorAlert"
      header="Locked Door"
      message="This door is locked! You need a key to proceed."
      :buttons="[{ text: 'OK', handler: () => showLockedDoorAlert = false }]"
      @didDismiss="showLockedDoorAlert = false"
    ></ion-alert>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from 'vue';
  import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonButton, IonModal, IonItem, IonLabel,
    IonSelect, IonSelectOption, IonText, IonIcon, IonList,
    IonToggle, IonChip, IonFab, IonFabButton, IonAlert
  } from '@ionic/vue';
  import debug from '@/lib/utils/debug';

  import {
    cubeOutline,
    skullOutline, storefrontOutline, prismOutline, flaskOutline,
    fingerPrintOutline,
    settingsOutline,
    chevronUpOutline,
    chevronDownOutline,
    chevronBackOutline,
    chevronForwardOutline,
    downloadOutline,
    refreshOutline,
    lockClosedOutline,
    keyOutline
  } from 'ionicons/icons';

  // Import the temple data
  import windTemple from '@/lib/engine/temples/wind-temple';
  import { mount } from '@vue/test-utils';

  // Define temple type interface
  interface Temple {
    entrance: number[];
    maze: string[][];
    rooms: Record<string, RoomDefinition>;
  }

  interface RoomDefinition {
    type: string;
    visited?: boolean;
    locked?: Record<string, boolean>;
    content?: Record<string, any>;
  }

  // Room icons mapping
  const ROOM_ICONS = {
    entrance: fingerPrintOutline,
    empty: cubeOutline,
    wall: cubeOutline,
    monster: skullOutline,
    boss: skullOutline,
    miniboss: skullOutline,
    loot: prismOutline,
    shop: storefrontOutline,
    teleport: flaskOutline,
    health: flaskOutline,
    default: cubeOutline
  };

  export default defineComponent({
    name: 'DungeonBackgroundDesigner',
    components: {
      IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
      IonButtons, IonBackButton, IonButton, IonModal, IonItem, IonLabel,
      IonSelect, IonSelectOption, IonText, IonIcon, IonList,
      IonToggle, IonChip, IonFab, IonFabButton, IonAlert
    },
    setup() {
      const dungeonCanvas = ref<HTMLCanvasElement | null>(null);
      const canvasWidth = ref(640);
      const canvasHeight = ref(480);
      const showControlsModal = ref(false);
      const showRoomTypeLabel = ref(true);
      const showLockedDoorAlert = ref(false);

      // Temple and room properties
      const selectedTemple = ref('wind-temple');
      const currentPosition = ref<[number, number]>([5, 2]); // Default to entrance
      const floorStyle = ref('stone');
      const wallStyle = ref('brick');
      const currentRoomType = ref('entrance');

      // Track locked doors for the current room
      const lockedDoors = ref({
        north: false,
        south: false,
        east: false,
        west: false
      });

      // Temple data storage with proper typing
      const templeData = ref<Record<string, Temple>>({
        'wind-temple': windTemple as Temple,
        // Others will be loaded dynamically
      });

      // Colors for different styles
      const styleColors = {
        floor: {
          stone: '#868686',
          wood: '#8B4513',
          dirt: '#8B5A2B',
          marble: '#D3D3D3',
          grass: '#228B22',
          tile: '#A0A0A0',
          mosaic: '#7D9CA0',
          crystal: '#A5D8F3',
        },
        wall: {
          brick: '#A52A2A',
          stone: '#708090',
          rock: '#4D4D4D',
          marble: '#F5F5F5',
          ice: '#ADD8E6',
          timber: '#CD853F',
          temple: '#8A6642',
          ornate: '#B8860B',
        }
      };

      // Floor and wall pattern types
      const floorPatterns = ref([
        { id: 'basic', name: 'Basic' },
        { id: 'grid', name: 'Grid' },
        { id: 'dots', name: 'Dots' },
        { id: 'checkerboard', name: 'Checkerboard' },
        { id: 'herringbone', name: 'Herringbone' },
        { id: 'hexagonal', name: 'Hexagonal Tiles' },
        { id: 'random', name: 'Random Cracks' }
      ]);

      const wallPatterns = ref([
        { id: 'plain', name: 'Plain' },
        { id: 'blocks', name: 'Blocks' },
        { id: 'bricks', name: 'Bricks' },
        { id: 'cracks', name: 'Cracked' },
        { id: 'detailed', name: 'Detailed' },
        { id: 'engraved', name: 'Engraved' },
      ]);

      // Selected pattern types
      const floorPatternType = ref('grid');
      const wallPatternType = ref('blocks');

      // Era-specific visual style options
      const visualEraStyles = ref([
        { id: 'retro80s', name: '80\'s Adventure', description: 'Limited colors, blocky textures (Atari/NES era)' },
        { id: '16bit90s', name: '90\'s SNES Zelda', description: '16-bit style with detailed pixel art' },
        { id: 'rpg00s', name: '00\'s Final Fantasy', description: 'Detailed textures with lighting effects' },
        { id: 'modern', name: 'Modern RPG', description: 'High detail with advanced lighting and effects' }
      ]);

      const selectedEraStyle = ref('16bit90s'); // Default to SNES style

      // Define pixel sizes for different eras (for pixelation effect)
      const eraPixelSizes = {
        'retro80s': 8,  // Large pixels for 8-bit era
        '16bit90s': 4,  // Medium pixels for 16-bit era
        'rpg00s': 2,    // Small pixels for early 3D era
        'modern': 1     // No pixelation for modern
      };

      // Color palettes for different eras
      const eraPalettes = {
        'retro80s': {
          floor: {
            stone: '#777777',
            wood: '#8B4513',
            dirt: '#7a5c3d',
            marble: '#AAAAAA',
            grass: '#228B22',
            tile: '#999999',
            mosaic: '#7D9CA0',
            crystal: '#6495ED',
          },
          wall: {
            brick: '#8B0000',
            stone: '#696969',
            rock: '#4D4D4D',
            marble: '#CCCCCC',
            ice: '#ADD8E6',
            timber: '#A0522D',
            temple: '#8A6642',
            ornate: '#B8860B',
          }
        },
        '16bit90s': {
          floor: {
            stone: '#868686',
            wood: '#9b6a4c',
            dirt: '#8B5A2B',
            marble: '#D3D3D3',
            grass: '#3cb43c',
            tile: '#A0A0A0',
            mosaic: '#7D9CA0',
            crystal: '#A5D8F3',
          },
          wall: {
            brick: '#A52A2A',
            stone: '#708090',
            rock: '#4D4D4D',
            marble: '#F5F5F5',
            ice: '#ADD8E6',
            timber: '#CD853F',
            temple: '#8A6642',
            ornate: '#B8860B',
          }
        },
        'rpg00s': {
          floor: {
            stone: '#969696',
            wood: '#a06841',
            dirt: '#9c7852',
            marble: '#e8e8e8',
            grass: '#4eca4e',
            tile: '#b8b8b8',
            mosaic: '#92b7bc',
            crystal: '#b9e5ff',
          },
          wall: {
            brick: '#c44242',
            stone: '#879cb0',
            rock: '#666666',
            marble: '#ffffff',
            ice: '#d0ebf5',
            timber: '#d9965e',
            temple: '#a37d53',
            ornate: '#dcac36',
          }
        },
        'modern': {
          floor: {
            stone: '#a6a6a6',
            wood: '#b37846',
            dirt: '#ad8c66',
            marble: '#f0f0f0',
            grass: '#5ee25e',
            tile: '#c9c9c9',
            mosaic: '#a7ccd1',
            crystal: '#cceeff',
          },
          wall: {
            brick: '#d25454',
            stone: '#99aec3',
            rock: '#777777',
            marble: '#ffffff',
            ice: '#e0f5ff',
            timber: '#e8a769',
            temple: '#b88d5e',
            ornate: '#f0bc40',
          }
        }
      };

      const toggleControlsModal = () => {
        showControlsModal.value = !showControlsModal.value;
      };

      // Check if there's a valid room in the specified direction
      const canMoveUp = computed(() => {
        const [row, col] = currentPosition.value;
        return isValidRoom(templeData.value[selectedTemple.value], row - 1, col);
      });

      const canMoveDown = computed(() => {
        const [row, col] = currentPosition.value;
        return isValidRoom(templeData.value[selectedTemple.value], row + 1, col);
      });

      const canMoveLeft = computed(() => {
        const [row, col] = currentPosition.value;
        return isValidRoom(templeData.value[selectedTemple.value], row, col - 1);
      });

      const canMoveRight = computed(() => {
        const [row, col] = currentPosition.value;
        return isValidRoom(templeData.value[selectedTemple.value], row, col + 1);
      });

      const resetToEntrance = () => {
        const temple = templeData.value[selectedTemple.value];
        if (temple && temple.entrance) {
          // Ensure entrance is treated as a tuple of numbers
          currentPosition.value = [temple.entrance[0], temple.entrance[1]];
          updateRoomInfo();
          redrawRoom();
        }
      };

      // Check if a door is locked in the specified direction
      const isDoorLocked = (direction: string) => {
        return lockedDoors.value[direction as keyof typeof lockedDoors.value];
      };

      // Toggle door lock status
      const toggleDoorLock = (direction: string) => {
        const temple = templeData.value[selectedTemple.value];
        if (!temple) return;

        const [row, col] = currentPosition.value;
        const roomKey = temple.maze[row][col];
        const room = temple.rooms[roomKey];

        // Ensure the locked property exists
        if (!room.locked) {
          room.locked = {};
        }

        // Update the locked status for this direction
        room.locked[direction] = lockedDoors.value[direction as keyof typeof lockedDoors.value];

        // Redraw to show the locked door
        redrawRoom();
      };

      // Load a specific temple
      const loadSelectedTemple = async () => {
        if (!templeData.value[selectedTemple.value]) {
          try {
            // Dynamic import based on selected temple
            const templeModule = await import(`@/views/Console/MyPortal/HomeTown/TempleGrounds/temples/${selectedTemple.value}`);
            templeData.value[selectedTemple.value] = templeModule.default as Temple;
          } catch (error) {
            debug.error(`Failed to load temple: ${selectedTemple.value}`, error);
          }
        }

        // Set current position to temple entrance
        const temple = templeData.value[selectedTemple.value];
        if (temple && temple.entrance) {
          // Ensure entrance is treated as a tuple of numbers
          currentPosition.value = [temple.entrance[0], temple.entrance[1]];
        } else {
          currentPosition.value = [0, 0]; // Default if no entrance specified
        }

        // Reset locked doors
        resetLockedDoors();

        // Update room info and redraw
        updateRoomInfo();
        redrawRoom();
      };

      const updateRoomInfo = () => {
        const temple = templeData.value[selectedTemple.value];
        if (!temple) return;

        const [row, col] = currentPosition.value;
        if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
          currentRoomType.value = 'unknown';
          return;
        }

        const roomKey = temple.maze[row][col];
        const room = temple.rooms[roomKey];

        currentRoomType.value = room ? room.type : 'unknown';

        // Update locked doors from room data
        resetLockedDoors();

        if (room && room.locked) {
          Object.keys(room.locked).forEach(direction => {
            if (room.locked && room.locked[direction]) {
              lockedDoors.value[direction as keyof typeof lockedDoors.value] = true;
            }
          });
        }
      };

      // Reset locked doors state
      const resetLockedDoors = () => {
        lockedDoors.value = {
          north: false,
          south: false,
          east: false,
          west: false
        };
      };

      // Get room icon based on its type
      const getRoomIcon = () => {
        const temple = templeData.value[selectedTemple.value];
        if (!temple) return ROOM_ICONS.default;

        const [row, col] = currentPosition.value;
        const roomKey = temple.maze[row][col];
        const room = temple.rooms[roomKey];

        if (!room) return ROOM_ICONS.default;

        return ROOM_ICONS[room.type as keyof typeof ROOM_ICONS] || ROOM_ICONS.default;
      };

      // Show the room details or info
      const showRoomDetails = () => {
        // Could be extended with a modal showing more details about the current room
        debug.log(`Room type: ${currentRoomType.value}`);
      };

      // Draw the room based on its type and current styles
      const drawRoom = (ctx: CanvasRenderingContext2D) => {
        const temple = templeData.value[selectedTemple.value];
        if (!temple) return;

        const [row, col] = currentPosition.value;
        if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
          drawEmptyRoom(ctx);
          return;
        }

        const roomKey = temple.maze[row][col];
        const room = temple.rooms[roomKey];

        if (!room || room.type === 'wall') {
          drawEmptyRoom(ctx);
          return;
        }

        // Create an offscreen canvas for era-specific rendering
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvasWidth.value;
        offscreenCanvas.height = canvasHeight.value;
        const offCtx = offscreenCanvas.getContext('2d');

        if (!offCtx) return;

        // Draw the floor to offscreen canvas
        drawFloor(offCtx);

        // Draw the walls with doors based on adjacent rooms
        drawWallsWithDoors(offCtx, temple, row, col);

        // Add room-type specific details
        drawRoomDetails(offCtx, room);

        // Apply era-specific styling
        applyEraStyle(ctx, offscreenCanvas);
      };

      // Apply era-specific visual effects to the rendered scene
      const applyEraStyle = (ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement) => {
        const era = selectedEraStyle.value;

        switch (era) {
          case 'retro80s':
            apply80sRetroStyle(ctx, sourceCanvas);
            break;
          case '16bit90s':
            apply90sSnesStyle(ctx, sourceCanvas);
            break;
          case 'rpg00s':
            apply00sFinalFantasyStyle(ctx, sourceCanvas);
            break;
          case 'modern':
            applyModernStyle(ctx, sourceCanvas);
            break;
          default:
            // Just copy the canvas directly if no era selected
            ctx.drawImage(sourceCanvas, 0, 0);
            break;
        }
      };

      // Apply 80's retro style with limited colors and large pixels
      const apply80sRetroStyle = (ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement) => {
        const pixelSize = eraPixelSizes['retro80s'];
        const width = canvasWidth.value;
        const height = canvasHeight.value;

        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return;

        // Apply color palette adjustment (limited colors)
        tempCtx.drawImage(sourceCanvas, 0, 0);

        // Get image data to manipulate pixels
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // The 80's palette had very limited colors - convert to an 8-color palette
        // This simulates the NES/Atari color limitations
        const colorLevels = 3; // Just 3 levels per channel (low, mid, high)
        const colorStep = 255 / (colorLevels - 1);

        // Color quantization - reduce to limited palette
        for (let i = 0; i < data.length; i += 4) {
          // Convert each RGB component to limited palette
          data[i] = Math.round(Math.round(data[i] / colorStep) * colorStep);     // R
          data[i + 1] = Math.round(Math.round(data[i + 1] / colorStep) * colorStep); // G
          data[i + 2] = Math.round(Math.round(data[i + 2] / colorStep) * colorStep); // B
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Create another canvas for pixelation effect
        const pixelCanvas = document.createElement('canvas');
        pixelCanvas.width = Math.floor(width / pixelSize);
        pixelCanvas.height = Math.floor(height / pixelSize);
        const pixelCtx = pixelCanvas.getContext('2d');

        if (!pixelCtx) return;

        // Draw downscaled image (pixelation effect) - using the canvas, not the context
        pixelCtx.drawImage(tempCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);

        // Clear the target canvas
        ctx.clearRect(0, 0, width, height);

        // Draw the pixelated image back to the target canvas with nearest-neighbor scaling
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pixelCanvas, 0, 0, width, height);

        // Add scanlines for CRT effect
        for (let y = 0; y < height; y += 4) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(0, y, width, 1);
        }
      };

      // Apply 90's SNES style with 16-bit colors and medium pixels
      const apply90sSnesStyle = (ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement) => {
        const pixelSize = eraPixelSizes['16bit90s'];
        const width = canvasWidth.value;
        const height = canvasHeight.value;

        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return;

        // Draw the source image to the temporary canvas
        tempCtx.drawImage(sourceCanvas, 0, 0);

        // Get image data to manipulate pixels
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 16-bit style uses 5-6-5 bit RGB color (32 levels for R and B, 64 for G)
        const colorLevelsR = 32;
        const colorLevelsG = 64;
        const colorLevelsB = 32;

        const colorStepR = 255 / (colorLevelsR - 1);
        const colorStepG = 255 / (colorLevelsG - 1);
        const colorStepB = 255 / (colorLevelsB - 1);

        // Color quantization for 16-bit style
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(Math.round(data[i] / colorStepR) * colorStepR);     // R
          data[i + 1] = Math.round(Math.round(data[i + 1] / colorStepG) * colorStepG); // G
          data[i + 2] = Math.round(Math.round(data[i + 2] / colorStepB) * colorStepB); // B
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Create another canvas for pixelation effect
        const pixelCanvas = document.createElement('canvas');
        pixelCanvas.width = Math.floor(width / pixelSize);
        pixelCanvas.height = Math.floor(height / pixelSize);
        const pixelCtx = pixelCanvas.getContext('2d');

        if (!pixelCtx) return;

        // Draw downscaled image (pixelation effect) - using the canvas, not the context
        pixelCtx.drawImage(tempCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);

        // Clear the target canvas
        ctx.clearRect(0, 0, width, height);

        // Draw the pixelated image back to the target canvas with nearest-neighbor scaling
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pixelCanvas, 0, 0, width, height);

        // Make colors slightly more saturated like SNES games
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = 'rgba(255, 220, 220, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      };

      // Apply 00's Final Fantasy style with soft lighting and subtle effects
      const apply00sFinalFantasyStyle = (ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement) => {
        const pixelSize = eraPixelSizes['rpg00s']; // Much smaller pixelation for early 3D era
        const width = canvasWidth.value;
        const height = canvasHeight.value;

        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return;

        // Draw the source image to the temporary canvas
        tempCtx.drawImage(sourceCanvas, 0, 0);

        // Apply a subtle pixelation effect for PS1-era look
        if (pixelSize > 1) {
          const pixelCanvas = document.createElement('canvas');
          pixelCanvas.width = Math.floor(width / pixelSize);
          pixelCanvas.height = Math.floor(height / pixelSize);
          const pixelCtx = pixelCanvas.getContext('2d');

          if (pixelCtx) {
            // Draw using the canvas, not the context
            pixelCtx.drawImage(tempCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
            tempCtx.clearRect(0, 0, width, height);
            tempCtx.imageSmoothingEnabled = true; // Allow smooth scaling for PS1 era
            tempCtx.drawImage(pixelCanvas, 0, 0, width, height);
          }
        }

        // Draw the base image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);

        // Add a subtle vignette effect common in early 3D RPGs
        const gradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 1.5
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add a slight color enhancement for the early 3D era look
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(100, 100, 120, 0.2)'; // Bluish tint characteristic of PS1 era
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      };

      // Apply modern style with advanced lighting and smoothing
      const applyModernStyle = (ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement) => {
        const width = canvasWidth.value;
        const height = canvasHeight.value;

        // Draw the base image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(sourceCanvas, 0, 0);

        // Apply ambient occlusion simulation around corners
        ctx.globalCompositeOperation = 'multiply';

        // Create corner shadows for depth
        const cornerSize = 60;
        const cornerGradient = ctx.createRadialGradient(
          cornerSize, cornerSize, 0,
          cornerSize, cornerSize, cornerSize * 1.5
        );
        cornerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        cornerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Apply to each corner
        ctx.fillStyle = cornerGradient;
        ctx.fillRect(0, 0, cornerSize * 2, cornerSize * 2);

        const cornerGradient2 = ctx.createRadialGradient(
          width - cornerSize, cornerSize, 0,
          width - cornerSize, cornerSize, cornerSize * 1.5
        );
        cornerGradient2.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        cornerGradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = cornerGradient2;
        ctx.fillRect(width - cornerSize * 2, 0, cornerSize * 2, cornerSize * 2);

        const cornerGradient3 = ctx.createRadialGradient(
          cornerSize, height - cornerSize, 0,
          cornerSize, height - cornerSize, cornerSize * 1.5
        );
        cornerGradient3.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        cornerGradient3.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = cornerGradient3;
        ctx.fillRect(0, height - cornerSize * 2, cornerSize * 2, cornerSize * 2);

        const cornerGradient4 = ctx.createRadialGradient(
          width - cornerSize, height - cornerSize, 0,
          width - cornerSize, height - cornerSize, cornerSize * 1.5
        );
        cornerGradient4.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        cornerGradient4.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = cornerGradient4;
        ctx.fillRect(width - cornerSize * 2, height - cornerSize * 2, cornerSize * 2, cornerSize * 2);

        ctx.globalCompositeOperation = 'source-over';

        // Add a subtle directional light from top-left
        ctx.globalCompositeOperation = 'overlay';
        const lightGradient = ctx.createLinearGradient(0, 0, width, height);
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height);

        // Add a subtle highlight for reflective surfaces
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
        ctx.fillRect(0, height - 100, width, 100); // Floor reflection

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
      };

      // Get the color for the current era and style
      const getEraColor = <T extends 'floor' | 'wall'>(type: T, style: string): string => {
        const era = selectedEraStyle.value;
        const eraColors = eraPalettes[era as keyof typeof eraPalettes];

        if (eraColors && eraColors[type] && typeof eraColors[type][style as any] === 'string') {
          return eraColors[type][style as any] as string;
        }

        // Fallback to default colors
        if (styleColors[type] && typeof styleColors[type][style as any] === 'string') {
          return styleColors[type][style as any] as string;
        }

        return '#868686'; // Default fallback color
      };

      debug.log('Dungeon Background Designer initialized', getEraColor('floor', floorStyle.value));

      const drawEmptyRoom = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
      };

      const drawFloor = (ctx: CanvasRenderingContext2D) => {
        // Draw the floor background
        ctx.fillStyle = styleColors.floor[floorStyle.value as keyof typeof styleColors.floor] || '#868686';
        ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

        // Get the pattern type
        const patternType = floorPatternType.value;

        // Add floor texture pattern based on selected type
        switch (patternType) {
          case 'grid':
            drawGridPattern(ctx);
            break;
          case 'dots':
            drawDotsPattern(ctx);
            break;
          case 'checkerboard':
            drawCheckerboardPattern(ctx);
            break;
          case 'herringbone':
            drawHerringbonePattern(ctx);
            break;
          case 'hexagonal':
            drawHexagonalTiles(ctx);
            break;
          case 'random':
            drawRandomCracks(ctx);
            break;
          case 'basic':
          default:
            // No pattern for basic
            break;
        }
      };

      // Various floor pattern drawing functions
      const drawGridPattern = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x <= canvasWidth.value; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight.value);
          ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= canvasHeight.value; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth.value, y);
          ctx.stroke();
        }
      };

      const drawDotsPattern = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';

        // Create dots in a more organized pattern
        const spacing = 40;
        for (let x = spacing / 2; x < canvasWidth.value; x += spacing) {
          for (let y = spacing / 2; y < canvasHeight.value; y += spacing) {
            const size = Math.random() * 2 + 1;

            ctx.beginPath();
            ctx.arc(x + (Math.random() * 6 - 3), y + (Math.random() * 6 - 3), size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      const drawCheckerboardPattern = (ctx: CanvasRenderingContext2D) => {
        const tileSize = 40;
        const darkColor = 'rgba(0, 0, 0, 0.15)';

        for (let x = 0; x < canvasWidth.value; x += tileSize) {
          for (let y = 0; y < canvasHeight.value; y += tileSize) {
            if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
              ctx.fillStyle = darkColor;
              ctx.fillRect(x, y, tileSize, tileSize);
            }
          }
        }
      };

      const drawHerringbonePattern = (ctx: CanvasRenderingContext2D) => {
        const tileWidth = 20;
        const tileHeight = 40;
        const darkColor = 'rgba(0, 0, 0, 0.15)';
        const lightColor = 'rgba(0, 0, 0, 0.05)';

        for (let y = 0; y < canvasHeight.value + tileHeight; y += tileHeight * 2) {
          for (let x = 0; x < canvasWidth.value + tileWidth * 2; x += tileWidth * 4) {
            // Draw dark tiles
            ctx.fillStyle = darkColor;
            // Vertical tile
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + tileWidth, y);
            ctx.lineTo(x + tileWidth, y + tileHeight * 2);
            ctx.lineTo(x, y + tileHeight * 2);
            ctx.closePath();
            ctx.fill();

            // Horizontal tile
            ctx.beginPath();
            ctx.moveTo(x + tileWidth, y + tileHeight);
            ctx.lineTo(x + tileWidth * 3, y + tileHeight);
            ctx.lineTo(x + tileWidth * 3, y + tileHeight * 2);
            ctx.lineTo(x + tileWidth, y + tileHeight * 2);
            ctx.closePath();
            ctx.fill();

            // Light tiles
            ctx.fillStyle = lightColor;
            // Horizontal tile
            ctx.beginPath();
            ctx.moveTo(x + tileWidth, y);
            ctx.lineTo(x + tileWidth * 3, y);
            ctx.lineTo(x + tileWidth * 3, y + tileHeight);
            ctx.lineTo(x + tileWidth, y + tileHeight);
            ctx.closePath();
            ctx.fill();

            // Vertical tile
            ctx.beginPath();
            ctx.moveTo(x + tileWidth * 3, y);
            ctx.lineTo(x + tileWidth * 4, y);
            ctx.lineTo(x + tileWidth * 4, y + tileHeight * 2);
            ctx.lineTo(x + tileWidth * 3, y + tileHeight * 2);
            ctx.closePath();
            ctx.fill();
          }
        }
      };

      const drawHexagonalTiles = (ctx: CanvasRenderingContext2D) => {
        const radius = 25;
        const darkColor = 'rgba(0, 0, 0, 0.15)';

        const drawHexagon = (x: number, y: number) => {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            const hx = x + radius * Math.cos(angle);
            const hy = y + radius * Math.sin(angle);

            if (i === 0) {
              ctx.moveTo(hx, hy);
            } else {
              ctx.lineTo(hx, hy);
            }
          }
          ctx.closePath();
          ctx.stroke();
        };

        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;

        // Calculate hexagon height and width for offset positioning
        const h = radius * Math.sqrt(3);

        for (let y = radius; y < canvasHeight.value + h; y += h) {
          // Offset every other row
          const offset = (Math.floor(y / h) % 2) * (1.5 * radius);
          for (let x = radius + offset; x < canvasWidth.value + radius; x += 3 * radius) {
            drawHexagon(x, y);
          }
        }
      };

      const drawRandomCracks = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        const drawCrack = (x: number, y: number, length: number, angle: number, branches: number) => {
          if (length < 5 || branches <= 0) return;

          const endX = x + Math.cos(angle) * length;
          const endY = y + Math.sin(angle) * length;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Create branches with random angles
          if (branches > 0) {
            const branchCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < branchCount; i++) {
              const branchAngle = angle + (Math.random() * Math.PI / 2 - Math.PI / 4);
              const branchLength = length * (0.3 + Math.random() * 0.4);
              drawCrack(endX, endY, branchLength, branchAngle, branches - 1);
            }
          }
        };

        // Create several starting cracks
        for (let i = 0; i < 8; i++) {
          const x = Math.random() * canvasWidth.value;
          const y = Math.random() * canvasHeight.value;
          const angle = Math.random() * Math.PI * 2;
          const length = 30 + Math.random() * 50;
          drawCrack(x, y, length, angle, 3);
        }
      };

      const drawWallsWithDoors = (ctx: CanvasRenderingContext2D, temple: any, row: number, col: number) => {
        const wallColor = styleColors.wall[wallStyle.value as keyof typeof styleColors.wall] || '#A52A2A';

        // Wall thickness
        const thickness = 40;

        // Check for adjacent rooms to determine where to put doors
        const hasNorth = row > 0 && isValidRoom(temple, row - 1, col);
        const hasSouth = row < temple.maze.length - 1 && isValidRoom(temple, row + 1, col);
        const hasEast = col < temple.maze[row].length - 1 && isValidRoom(temple, row, col + 1);
        const hasWest = col > 0 && isValidRoom(temple, row, col - 1);

        // Draw the four walls with potential doors
        // First fill with base color
        ctx.fillStyle = wallColor;

        // Draw walls with doors
        // Top wall
        drawWallSection(ctx, 0, 0, canvasWidth.value, thickness, hasNorth, 'north');

        // Bottom wall
        drawWallSection(ctx, 0, canvasHeight.value - thickness, canvasWidth.value, thickness, hasSouth, 'south');

        // Left wall
        drawWallSection(ctx, 0, 0, thickness, canvasHeight.value, hasWest, 'west');

        // Right wall
        drawWallSection(ctx, canvasWidth.value - thickness, 0, thickness, canvasHeight.value, hasEast, 'east');
      };

      // Draw a wall section with the selected pattern and optional door
      const drawWallSection = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        hasDoor: boolean,
        direction: string
      ) => {
        const wallColor = styleColors.wall[wallStyle.value as keyof typeof styleColors.wall] || '#A52A2A';
        ctx.fillStyle = wallColor;

        // If there's a door, need to draw wall in two parts
        if (hasDoor) {
          const isHorizontal = direction === 'north' || direction === 'south';
          const doorSize = 100; // door width/height
          const doorStart = isHorizontal
            ? (width - doorSize) / 2 // center door horizontally
            : (height - doorSize) / 2; // center door vertically

          if (isHorizontal) {
            // Draw left and right sections of wall
            ctx.fillRect(x, y, doorStart, height);
            ctx.fillRect(x + doorStart + doorSize, y, width - doorStart - doorSize, height);

            // Draw door frame
            ctx.fillStyle = '#8B4513'; // Door frame color
            ctx.fillRect(x + doorStart - 5, y, 5, height);
            ctx.fillRect(x + doorStart + doorSize, y, 5, height);

            // Draw lock if the door is locked
            if (isDoorLocked(direction)) {
              drawLock(ctx, x + doorStart + doorSize / 2, y + height / 2, direction);
            }

            // Apply texture pattern to wall sections
            applyWallPattern(ctx, x, y, doorStart, height);
            applyWallPattern(ctx, x + doorStart + doorSize, y, width - doorStart - doorSize, height);

          } else {
            // Draw top and bottom sections of wall
            ctx.fillRect(x, y, width, doorStart);
            ctx.fillRect(x, y + doorStart + doorSize, width, height - doorStart - doorSize);

            // Draw door frame
            ctx.fillStyle = '#8B4513'; // Door frame color
            ctx.fillRect(x, y + doorStart - 5, width, 5);
            ctx.fillRect(x, y + doorStart + doorSize, width, 5);

            // Draw lock if the door is locked
            if (isDoorLocked(direction)) {
              drawLock(ctx, x + width / 2, y + doorStart + doorSize / 2, direction);
            }

            // Apply texture pattern to wall sections
            applyWallPattern(ctx, x, y, width, doorStart);
            applyWallPattern(ctx, x, y + doorStart + doorSize, width, height - doorStart - doorSize);
          }
        } else {
          // Solid wall with no door
          ctx.fillRect(x, y, width, height);

          // Apply texture pattern to the entire wall
          applyWallPattern(ctx, x, y, width, height);
        }
      };

      // Apply the selected wall pattern to a section of wall
      const applyWallPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        const patternType = wallPatternType.value;

        switch (patternType) {
          case 'blocks':
            drawBlockPattern(ctx, x, y, width, height);
            break;
          case 'bricks':
            drawBrickPattern(ctx, x, y, width, height);
            break;
          case 'cracks':
            drawCrackedPattern(ctx, x, y, width, height);
            break;
          case 'detailed':
            drawDetailedPattern(ctx, x, y, width, height);
            break;
          case 'engraved':
            drawEngravedPattern(ctx, x, y, width, height);
            break;
          case 'plain':
          default:
            // No pattern for plain walls
            break;
        }
      };

      // Wall pattern drawing functions
      const drawBlockPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;

        // Draw vertical lines for large blocks
        const blockSizeX = width > height ? 40 : 20;
        const blockSizeY = height > width ? 40 : 20;

        // Draw horizontal lines
        for (let posY = y; posY <= y + height; posY += blockSizeY) {
          ctx.beginPath();
          ctx.moveTo(x, posY);
          ctx.lineTo(x + width, posY);
          ctx.stroke();
        }

        // Draw vertical lines
        for (let posX = x; posX <= x + width; posX += blockSizeX) {
          ctx.beginPath();
          ctx.moveTo(posX, y);
          ctx.lineTo(posX, y + height);
          ctx.stroke();
        }

        // Add some random darker patches for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';

        for (let i = 0; i < Math.max(width, height) / 20; i++) {
          const blockX = x + Math.random() * width;
          const blockY = y + Math.random() * height;
          const blockW = Math.random() * blockSizeX * 0.8 + blockSizeX * 0.2;
          const blockH = Math.random() * blockSizeY * 0.8 + blockSizeY * 0.2;

          ctx.fillRect(blockX, blockY, blockW, blockH);
        }
      };

      const drawBrickPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;

        const brickHeight = 15;
        const brickWidth = 30;

        // Draw horizontal lines
        for (let posY = y; posY <= y + height; posY += brickHeight) {
          ctx.beginPath();
          ctx.moveTo(x, posY);
          ctx.lineTo(x + width, posY);
          ctx.stroke();
        }

        // Draw vertical lines for odd rows
        for (let posY = y; posY <= y + height; posY += brickHeight * 2) {
          for (let posX = x; posX <= x + width; posX += brickWidth) {
            ctx.beginPath();
            ctx.moveTo(posX, posY);
            ctx.lineTo(posX, posY + brickHeight);
            ctx.stroke();
          }
        }

        // Draw vertical lines for even rows (offset)
        for (let posY = y + brickHeight; posY <= y + height; posY += brickHeight * 2) {
          for (let posX = x + brickWidth / 2; posX <= x + width; posX += brickWidth) {
            ctx.beginPath();
            ctx.moveTo(posX, posY);
            ctx.lineTo(posX, posY + brickHeight);
            ctx.stroke();
          }
        }

        // Add brick texture with random coloring
        for (let rowY = y; rowY < y + height; rowY += brickHeight) {
          const isOffset = Math.floor((rowY - y) / brickHeight) % 2 === 1;
          const startX = isOffset ? x + brickWidth / 2 : x;

          for (let brickX = startX; brickX < x + width; brickX += brickWidth) {
            // Add some random darkness to each brick
            const darkenAmount = Math.random() * 0.15 + 0.05; // 5-20% darker
            ctx.fillStyle = `rgba(0, 0, 0, ${darkenAmount})`;
            const brickW = Math.min(brickWidth, x + width - brickX);
            ctx.fillRect(brickX, rowY, brickW, brickHeight);
          }
        }
      };

      const drawCrackedPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;

        // Add base block pattern
        drawBlockPattern(ctx, x, y, width, height);

        // Add cracks to the wall
        const crackCount = Math.max(2, Math.floor((width * height) / 5000));

        for (let i = 0; i < crackCount; i++) {
          const crackX = x + Math.random() * width;
          const crackY = y + Math.random() * height;

          // Draw a crack starting from this point
          drawWallCrack(ctx, crackX, crackY, Math.random() * 40 + 20, Math.random() * Math.PI * 2, 3);
        }
      };

      const drawWallCrack = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        length: number,
        angle: number,
        branches: number
      ) => {
        if (length < 5) return;

        // Calculate end point
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        // Draw the crack line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Create branches
        if (branches > 0 && Math.random() > 0.3) {
          const numBranches = Math.floor(Math.random() * 3) + 1;

          for (let i = 0; i < numBranches; i++) {
            const branchAngle = angle + (Math.random() * Math.PI / 2 - Math.PI / 4);
            const branchLength = length * (0.4 + Math.random() * 0.4);

            drawWallCrack(
              ctx,
              endX,
              endY,
              branchLength,
              branchAngle,
              branches - 1
            );
          }
        }
      };

      const drawDetailedPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        // Start with the block pattern for structure
        drawBlockPattern(ctx, x, y, width, height);

        // Add some shading for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';

        // Top-left lighting
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Add some small details/dots for texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        const detailCount = Math.floor((width * height) / 200);
        for (let i = 0; i < detailCount; i++) {
          const dotX = x + Math.random() * width;
          const dotY = y + Math.random() * height;
          const dotSize = Math.random() * 3 + 1;

          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add some highlight specks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

        for (let i = 0; i < detailCount / 3; i++) {
          const speckX = x + Math.random() * width;
          const speckY = y + Math.random() * height;
          const speckSize = Math.random() * 2 + 0.5;

          ctx.beginPath();
          ctx.arc(speckX, speckY, speckSize, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const drawEngravedPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        // Start with blocks for the basic structure
        drawBlockPattern(ctx, x, y, width, height);

        // Add engravings - decorative lines and shapes
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;

        // Determine if this is a horizontal or vertical wall
        const isHorizontal = width > height;

        if (isHorizontal) {
          // Horizontal wall engravings (centered pattern)
          const centerY = y + height / 2;
          const patternWidth = Math.min(300, width * 0.8);
          const startX = x + (width - patternWidth) / 2;

          // Draw centerline
          ctx.beginPath();
          ctx.moveTo(startX, centerY);
          ctx.lineTo(startX + patternWidth, centerY);
          ctx.stroke();

          // Draw decorative elements along the line
          for (let i = 0; i < 5; i++) {
            const elementX = startX + (patternWidth / 4) * i;

            // Draw a decorative element (circle, square, or triangle)
            const elementType = Math.floor(Math.random() * 3);

            switch (elementType) {
              case 0: // Circle
                ctx.beginPath();
                ctx.arc(elementX, centerY, 8, 0, Math.PI * 2);
                ctx.stroke();
                break;
              case 1: // Square
                ctx.strokeRect(elementX - 6, centerY - 6, 12, 12);
                break;
              case 2: // Triangle
                ctx.beginPath();
                ctx.moveTo(elementX, centerY - 8);
                ctx.lineTo(elementX + 8, centerY + 4);
                ctx.lineTo(elementX - 8, centerY + 4);
                ctx.closePath();
                ctx.stroke();
                break;
            }
          }
        } else {
          // Vertical wall engravings (pattern running down)
          const centerX = x + width / 2;
          const patternHeight = Math.min(300, height * 0.8);
          const startY = y + (height - patternHeight) / 2;

          // Draw centerline
          ctx.beginPath();
          ctx.moveTo(centerX, startY);
          ctx.lineTo(centerX, startY + patternHeight);
          ctx.stroke();

          // Draw decorative elements along the line
          for (let i = 0; i < 5; i++) {
            const elementY = startY + (patternHeight / 4) * i;

            // Draw a decorative element (circle, square, or triangle)
            const elementType = Math.floor(Math.random() * 3);

            switch (elementType) {
              case 0: // Circle
                ctx.beginPath();
                ctx.arc(centerX, elementY, 8, 0, Math.PI * 2);
                ctx.stroke();
                break;
              case 1: // Square
                ctx.strokeRect(centerX - 6, elementY - 6, 12, 12);
                break;
              case 2: // Triangle
                ctx.beginPath();
                ctx.moveTo(centerX, elementY - 8);
                ctx.lineTo(centerX + 8, elementY + 4);
                ctx.lineTo(centerX - 8, elementY + 4);
                ctx.closePath();
                ctx.stroke();
                break;
            }
          }
        }
      };

      const isValidRoom = (temple: any, row: number, col: number) => {
        if (!temple || row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
          return false;
        }

        const roomKey = temple.maze[row][col];
        const room = temple.rooms[roomKey];

        return room && room.type !== 'wall';
      };

      const drawRoomDetails = (ctx: CanvasRenderingContext2D, room: any) => {
        // Only show room type label if enabled
        if (showRoomTypeLabel.value) {
          ctx.fillStyle = '#FFF';
          ctx.font = '24px Arial';

          const roomTypeDisplay = `${room.type.charAt(0).toUpperCase() + room.type.slice(1)} Room`;
          ctx.fillText(roomTypeDisplay, canvasWidth.value / 2 - 80, canvasHeight.value / 2);
        }

        // Draw additional elements based on room type
        switch (room.type) {
          case 'entrance':
            drawEntranceRoom(ctx);
            break;
          case 'monster':
            drawMonsterRoom(ctx);
            break;
          case 'boss':
            drawBossRoom(ctx);
            break;
          case 'miniboss':
            drawMiniBossRoom(ctx);
            break;
          case 'loot':
            drawLootRoom(ctx, room);
            break;
          case 'shop':
            drawShopRoom(ctx);
            break;
          case 'teleport':
            drawTeleportRoom(ctx);
            break;
          case 'empty':
          default:
            // Basic room is already drawn
            break;
        }
      };

      const drawEntranceRoom = (ctx: CanvasRenderingContext2D) => {
        // Draw entrance symbol (stairs down)
        ctx.fillStyle = '#333';
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 50;
        const stairWidth = 120;
        const stairHeight = 80;

        // Draw stairs
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(
            centerX - stairWidth / 2 + i * 10,
            centerY - stairHeight / 2 + i * 20,
            stairWidth - i * 20,
            20
          );
        }
      };

      const drawMonsterRoom = (ctx: CanvasRenderingContext2D) => {
        // Draw monster symbols (footprints/tracks)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

        for (let i = 0; i < 8; i++) {
          const x = Math.random() * (canvasWidth.value - 100) + 50;
          const y = Math.random() * (canvasHeight.value - 100) + 50;

          // Draw a footprint-like shape
          ctx.beginPath();
          ctx.ellipse(x, y, 10, 15, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(x + 5, y + 20, 5, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(x - 5, y + 20, 5, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const drawBossRoom = (ctx: CanvasRenderingContext2D) => {
        // Draw boss room symbol (skull)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 50;

        // Draw skull shape
        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - 15, centerY - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX + 15, centerY - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw mouth
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 15, 20, 10, 0, 0, Math.PI);
        ctx.fill();
      };

      const drawMiniBossRoom = (ctx: CanvasRenderingContext2D) => {
        // Similar to boss room but smaller
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 50;

        // Draw mini-boss symbol (skull)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - 10, centerY - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX + 10, centerY - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw mouth
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 10, 15, 8, 0, 0, Math.PI);
        ctx.fill();
      };

      const drawLootRoom = (ctx: CanvasRenderingContext2D, room: any) => {
        // Draw treasure chest
        ctx.fillStyle = '#8B4513'; // Brown
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 50;
        const chestWidth = 80;
        const chestHeight = 60;

        // Chest base
        ctx.fillRect(centerX - chestWidth / 2, centerY - chestHeight / 2, chestWidth, chestHeight);

        // Chest top
        ctx.fillStyle = '#A0522D'; // Darker brown
        ctx.beginPath();
        ctx.moveTo(centerX - chestWidth / 2, centerY - chestHeight / 2);
        ctx.lineTo(centerX + chestWidth / 2, centerY - chestHeight / 2);
        ctx.lineTo(centerX + chestWidth / 2, centerY - chestHeight / 2 - 20);
        ctx.lineTo(centerX - chestWidth / 2, centerY - chestHeight / 2 - 20);
        ctx.closePath();
        ctx.fill();

        // Lock
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.fillRect(centerX - 10, centerY - 10, 20, 20);

        // Display special loot content if available
        if (room.content && room.content.dungeon) {
          ctx.fillStyle = '#FFD700';
          ctx.font = '18px Arial';
          ctx.fillText(`Contains: ${room.content.dungeon}`, centerX - 80, centerY + chestHeight / 2 + 30);
        }
      };

      const drawShopRoom = (ctx: CanvasRenderingContext2D) => {
        // Draw shop counter
        ctx.fillStyle = '#8B4513'; // Brown
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 80;
        const counterWidth = 200;
        const counterHeight = 40;

        // Counter
        ctx.fillRect(centerX - counterWidth / 2, centerY - counterHeight / 2, counterWidth, counterHeight);

        // Sign
        ctx.fillStyle = '#A0522D'; // Darker brown
        ctx.fillRect(centerX - 50, centerY - counterHeight / 2 - 60, 100, 40);

        // Sign text
        ctx.fillStyle = '#FFD700';
        ctx.font = '20px Arial';
        ctx.fillText('SHOP', centerX - 30, centerY - counterHeight / 2 - 30);

        // Items on counter
        ctx.fillStyle = '#FF0000'; // Red item
        ctx.fillRect(centerX - 70, centerY, 30, 15);
        // Items on counter
        ctx.fillStyle = '#FF0000'; // Red item
        ctx.fillRect(centerX - 70, centerY - counterHeight / 2 - 15, 30, 15);

        ctx.fillStyle = '#0000FF'; // Blue item
        ctx.fillRect(centerX - 20, centerY - counterHeight / 2 - 20, 20, 20);

        ctx.fillStyle = '#00FF00'; // Green item
        ctx.fillRect(centerX + 20, centerY - counterHeight / 2 - 10, 25, 10);
      };

      const drawTeleportRoom = (ctx: CanvasRenderingContext2D) => {
        // Draw teleport circle
        const centerX = canvasWidth.value / 2;
        const centerY = canvasHeight.value / 2 + 50;
        const radius = 60;

        // Draw concentric circles
        for (let i = 0; i < 5; i++) {
          const circleRadius = radius - i * 10;
          ctx.beginPath();
          ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100, 100, 255, ${(5 - i) / 5})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Add some particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * radius;
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
          ctx.fill();
        }
      };

      const redrawRoom = () => {
        if (!dungeonCanvas.value) return;

        const ctx = dungeonCanvas.value.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

        // Draw the room
        drawRoom(ctx);
      };

      // Handle movement between rooms
      const moveDirection = (direction: 'north' | 'south' | 'east' | 'west') => {
        // Check if the door is locked
        if (isDoorLocked(direction)) {
          // Show locked door alert
          showLockedDoorAlert.value = true;
          return;
        }

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
          case 'east':
            newCol = col + 1;
            break;
          case 'west':
            newCol = col - 1;
            break;
        }

        // Check if the new position is valid
        const temple = templeData.value[selectedTemple.value];
        if (!temple) return;

        if (newRow < 0 || newRow >= temple.maze.length ||
          newCol < 0 || newCol >= temple.maze[0].length) {
          return; // Out of bounds
        }

        const roomKey = temple.maze[newRow][newCol];
        const room = temple.rooms[roomKey];

        if (!room || room.type === 'wall') {
          return; // Can't move into a wall
        }

        // Update position
        currentPosition.value = [newRow, newCol];

        // Update room info and redraw
        updateRoomInfo();
        redrawRoom();
      };

      const exportBackground = () => {
        if (!dungeonCanvas.value) return;

        try {
          const imageData = dungeonCanvas.value.toDataURL('image/png');

          // Create a download link
          const downloadLink = document.createElement('a');
          downloadLink.href = imageData;
          downloadLink.download = `${selectedTemple.value}-room-${currentPosition.value[0]}-${currentPosition.value[1]}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (error) {
          debug.error('Failed to export background:', error);
        }
      };

      // Initialize everything when the component is mounted
      mount(() => {
        // Resize canvas based on container size
        const resizeCanvas = () => {
          if (!dungeonCanvas.value) return;

          // Make the canvas fill the entire content area
          canvasWidth.value = window.innerWidth;
          canvasHeight.value = window.innerHeight - 56; // Subtract header height

          // Redraw the room with new canvas dimensions
          redrawRoom();
        };

        // Initial resize and setup
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initial room draw
        loadSelectedTemple();
      });

      return {
        dungeonCanvas,
        canvasWidth,
        canvasHeight,
        showControlsModal,
        toggleControlsModal,
        selectedTemple,
        currentPosition,
        floorStyle,
        wallStyle,
        currentRoomType,
        showRoomTypeLabel,
        showLockedDoorAlert,
        lockedDoors,
        canMoveUp,
        canMoveDown,
        canMoveLeft,
        canMoveRight,
        moveDirection,
        loadSelectedTemple,
        redrawRoom,
        exportBackground,
        resetToEntrance,
        isDoorLocked,
        toggleDoorLock,
        showRoomDetails,
        getRoomIcon,
        floorPatterns,
        wallPatterns,
        floorPatternType,
        wallPatternType,
        visualEraStyles,
        selectedEraStyle,
        // Icons
        settingsOutline, chevronUpOutline, chevronDownOutline,
        chevronBackOutline, chevronForwardOutline, downloadOutline,
        refreshOutline, lockClosedOutline, keyOutline
      };
    }
  });

  // Draw a lock icon on a door
  const drawLock = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: string) => {
    ctx.fillStyle = '#FFD700'; // Gold color for lock

    // Draw lock body
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw lock shackle
    ctx.beginPath();
    ctx.arc(x, y - 8, 6, Math.PI, Math.PI * 2);
    ctx.fill();

    // Draw keyhole
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();

    debug.log(`Lock drawn at ${x}, ${y} for direction ${direction}`);
  };
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

  .room-info-display {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
    display: flex;
    gap: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    padding: 5px;
  }

  /* Fix for FAB buttons to ensure they are properly positioned */
  ion-fab-button {
    --size: 56px;
  }
</style>