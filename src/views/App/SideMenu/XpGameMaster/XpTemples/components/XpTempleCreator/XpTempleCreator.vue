<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar :style="{ '--background': getTempleColor() }">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/temples/${templeId}`" />
        </ion-buttons>
        <ion-title>Temple Creator</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showPreview = !showPreview">
            <i class="fas fa-code" />
            {{ showPreview ? 'Editor' : 'Preview' }}
          </ion-button>
          <ion-button @click="saveTemple">
            <i class="fas fa-save" />
            Save
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Preview Mode -->
      <div v-if="showPreview" class="tab-content">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Temple Preview</ion-card-title>
            <ion-card-subtitle>See how your temple will look in-game</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="preview-container">
              <pre class="code-preview">{{ templeCodePreview }}</pre>
            </div>
            <ion-button expand="block" @click="copyToClipboard">
              <i class="fas fa-copy"></i>
              Copy Code
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Unified Editor Mode -->
      <div v-else class="editor-content">
        <ion-grid class="editor-grid">
          <ion-row>
            <!-- Left Side: Grid Layout -->
            <ion-col size="12" size-md="7" class="layout-column">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Temple Layout</ion-card-title>
                  <ion-card-subtitle>Design your temple maze</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="layout-controls">
                    <ion-item>
                      <ion-label>Grid Size</ion-label>
                      <ion-select v-model="gridSize" interface="popover" @ionChange="resizeGrid">
                        <ion-select-option value="5x5">5 x 5</ion-select-option>
                        <ion-select-option value="6x6">6 x 6</ion-select-option>
                        <ion-select-option value="7x7">7 x 7</ion-select-option>
                        <ion-select-option value="8x8">8 x 8</ion-select-option>
                        <ion-select-option value="10x10">10 x 10</ion-select-option>
                      </ion-select>
                    </ion-item>
                    <ion-item>
                      <ion-label>Entrance Position</ion-label>
                      <ion-input type="text" v-model="entrancePosition" placeholder="row,col (e.g. 5,2)" />
                    </ion-item>
                  </div>

                  <div class="grid-container">
                    <div class="temple-grid">
                      <div 
                        v-for="(row, rowIndex) in templeMaze" 
                        :key="`row-${rowIndex}`" 
                        class="grid-row"
                      >
                        <div 
                          v-for="(cell, colIndex) in row" 
                          :key="`cell-${rowIndex}-${colIndex}`" 
                          class="grid-cell"
                          :class="{
                            'cell-wall': getCellType(cell) === 'wall',
                            'cell-entrance': getCellType(cell) === 'entrance',
                            'cell-monster': getCellType(cell) === 'monster',
                            'cell-loot': getCellType(cell) === 'loot',
                            'cell-boss': getCellType(cell) === 'boss',
                            'cell-teleport': getCellType(cell) === 'teleport',
                            'cell-shop': getCellType(cell) === 'shop',
                            'entrance-position': isEntrancePosition(rowIndex, colIndex),
                            'selected-cell': selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex
                          }"
                          @click="showQuickEditPopover($event, rowIndex, colIndex)"
                          @contextmenu.prevent="showQuickEditPopover($event, rowIndex, colIndex)"
                        >
                          <i 
                            v-if="getCellType(cell) !== 'wall'" 
                            :class="[ROOM_ICONS[getCellType(cell)]]" 
                            class="fad"
                          ></i>
                          <span class="cell-coords">{{rowIndex}},{{colIndex}}</span>
                          
                          <!-- Door lock indicators -->
                          <div v-if="hasDoorLock(cell, 'north')" class="door-lock north">
                            <i class="fas fa-lock"></i>
                          </div>
                          <div v-if="hasDoorLock(cell, 'east')" class="door-lock east">
                            <i class="fas fa-lock"></i>
                          </div>
                          <div v-if="hasDoorLock(cell, 'south')" class="door-lock south">
                            <i class="fas fa-lock"></i>
                          </div>
                          <div v-if="hasDoorLock(cell, 'west')" class="door-lock west">
                            <i class="fas fa-lock"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Right Side: Room Properties -->
            <ion-col size="12" size-md="5" class="properties-column">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Room Properties</ion-card-title>
                  <ion-card-subtitle v-if="selectedCell">
                    Editing room at [{{selectedCell.row}}, {{selectedCell.col}}]
                  </ion-card-subtitle>
                  <ion-card-subtitle v-else>
                    Select a room from the grid to edit
                  </ion-card-subtitle>
                </ion-card-header>
                <ion-card-content v-if="selectedCell">
                  <ion-item>
                    <ion-label>Room Type</ion-label>
                    <ion-select v-model="selectedRoomType" interface="popover">
                      <ion-select-option value="wall">Wall</ion-select-option>
                      <ion-select-option value="empty">Empty Room</ion-select-option>
                      <ion-select-option value="entrance">Entrance</ion-select-option>
                      <ion-select-option value="monster">Monster</ion-select-option>
                      <ion-select-option value="loot">Treasure Chest</ion-select-option>
                      <ion-select-option value="boss">Boss</ion-select-option>
                      <ion-select-option value="miniboss">Mini Boss</ion-select-option>
                      <ion-select-option value="teleport">Teleport</ion-select-option>
                      <ion-select-option value="shop">Shop</ion-select-option>
                      <ion-select-option value="health">Health Restore</ion-select-option>
                    </ion-select>
                  </ion-item>

                  <!-- Content options based on room type -->
                  <div v-if="selectedRoomType === 'loot'" class="room-content-options">
                    <ion-item>
                      <ion-label>Chest Type</ion-label>
                      <ion-select v-model="selectedChestType" interface="popover">
                        <ion-select-option value="dungeon">Dungeon Item</ion-select-option>
                        <ion-select-option value="loot">Random Loot</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item v-if="selectedChestType === 'dungeon'">
                      <ion-label>Dungeon Item</ion-label>
                      <ion-select v-model="selectedDungeonItem" interface="popover">
                        <ion-select-option value="map">Map</ion-select-option>
                        <ion-select-option value="compass">Compass</ion-select-option>
                        <ion-select-option value="key">Key</ion-select-option>
                        <ion-select-option value="boss-key">Boss Key</ion-select-option>
                        <ion-select-option value="special-item">Special Item</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item v-if="selectedChestType === 'loot'">
                      <ion-label>Loot Items</ion-label>
                      <ion-select v-model="selectedLootItems" multiple="true" interface="popover">
                        <ion-select-option value="potion">Potion</ion-select-option>
                        <ion-select-option value="ether">Ether</ion-select-option>
                        <ion-select-option value="elixir">Elixir</ion-select-option>
                        <ion-select-option value="gold">Gold</ion-select-option>
                        <ion-select-option value="equipment">Equipment</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>

                  <div v-if="selectedRoomType === 'monster' || selectedRoomType === 'boss' || selectedRoomType === 'miniboss'" class="room-content-options">
                    <ion-item>
                      <ion-label>Monster Type</ion-label>
                      <ion-select v-model="selectedMonsterType" interface="popover">
                        <ion-select-option value="small">Small Enemy</ion-select-option>
                        <ion-select-option value="medium">Medium Enemy</ion-select-option>
                        <ion-select-option value="large">Large Enemy</ion-select-option>
                        <ion-select-option value="boss">Boss</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>

                  <div class="door-locks">
                    <ion-item-divider>Door Locks</ion-item-divider>
                    <ion-item>
                      <ion-label>North Door Locked</ion-label>
                      <ion-checkbox v-model="northLocked"></ion-checkbox>
                    </ion-item>
                    <ion-item>
                      <ion-label>East Door Locked</ion-label>
                      <ion-checkbox v-model="eastLocked"></ion-checkbox>
                    </ion-item>
                    <ion-item>
                      <ion-label>South Door Locked</ion-label>
                      <ion-checkbox v-model="southLocked"></ion-checkbox>
                    </ion-item>
                    <ion-item>
                      <ion-label>West Door Locked</ion-label>
                      <ion-checkbox v-model="westLocked"></ion-checkbox>
                    </ion-item>
                  </div>

                  <ion-button expand="block" @click="applyRoomChanges" class="apply-button">
                    Apply Changes
                  </ion-button>
                </ion-card-content>
                <ion-card-content v-else class="no-selection-content">
                  <div class="select-prompt">
                    <i class="fas fa-hand-pointer fa-2x"></i>
                    <p>Click on a cell in the grid to edit its properties</p>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
    
    <!-- Quick Edit Popover -->
    <ion-popover
      :is-open="quickEditPopoverOpen"
      :event="popoverEvent"
      @didDismiss="quickEditPopoverOpen = false"
      class="quick-edit-popover"
      :dismiss-on-select="false"
      size="auto"
    >
      <ion-content class="ion-padding">
        <ion-list lines="none">
          <ion-item-divider>
            <ion-label>Quick Edit Room</ion-label>
          </ion-item-divider>

          <!-- Room Type Selection -->
          <ion-item>
            <ion-label>Type</ion-label>
          </ion-item>
          <ion-grid class="room-type-grid">
            <ion-row>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('wall')" :class="{ 'selected': quickEditType === 'wall' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['wall']"></i><span>Wall</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('empty')" :class="{ 'selected': quickEditType === 'empty' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['empty']"></i><span>Empty</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('monster')" :class="{ 'selected': quickEditType === 'monster' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['monster']"></i><span>Monster</span>
                  </div>
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('loot')" :class="{ 'selected': quickEditType === 'loot' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['loot']"></i><span>Chest</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('boss')" :class="{ 'selected': quickEditType === 'boss' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['boss']"></i><span>Boss</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('teleport')" :class="{ 'selected': quickEditType === 'teleport' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['teleport']"></i><span>Teleport</span>
                  </div>
                </ion-button>
              </ion-col>
            </ion-row>
             <ion-row>
              <ion-col size="4">
                <ion-button fill="clear" @click="quickSetRoomType('shop')" :class="{ 'selected': quickEditType === 'shop' }">
                  <div class="button-content">
                    <i :class="ROOM_ICONS['shop']"></i><span>Shop</span>
                  </div>
                </ion-button>
              </ion-col>
               <ion-col size="4">
                 <ion-button fill="clear" @click="quickSetRoomType('health')" :class="{ 'selected': quickEditType === 'health' }">
                   <div class="button-content">
                     <i :class="ROOM_ICONS['health']"></i><span>Health</span>
                   </div>
                 </ion-button>
               </ion-col>
               <ion-col size="4">
                 <ion-button fill="clear" @click="quickSetRoomType('miniboss')" :class="{ 'selected': quickEditType === 'miniboss' }">
                   <div class="button-content">
                     <i :class="ROOM_ICONS['miniboss']"></i><span>MiniBoss</span>
                   </div>
                 </ion-button>
               </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Conditional Content Options -->
          <ion-item v-if="quickEditType === 'loot'">
            <ion-label>Chest Content</ion-label>
            <ion-segment v-model="quickLootType">
              <ion-segment-button value="key">Key</ion-segment-button>
              <ion-segment-button value="map">Map</ion-segment-button>
              <ion-segment-button value="compass">Compass</ion-segment-button>
            </ion-segment>
          </ion-item>

          <ion-item v-if="quickEditType === 'monster'">
            <ion-label>Monster Size</ion-label>
            <ion-segment v-model="quickMonsterType">
              <ion-segment-button value="small">Small</ion-segment-button>
              <ion-segment-button value="medium">Medium</ion-segment-button>
              <ion-segment-button value="large">Large</ion-segment-button>
            </ion-segment>
          </ion-item>

          <!-- Door Locks -->
          <ion-item-divider>
            <ion-label>Door Locks</ion-label>
          </ion-item-divider>
          <ion-item>
            <ion-label>North</ion-label>
            <ion-checkbox slot="end" v-model="quickNorthLock"></ion-checkbox>
          </ion-item>
          <ion-item>
            <ion-label>East</ion-label>
            <ion-checkbox slot="end" v-model="quickEastLock"></ion-checkbox>
          </ion-item>
          <ion-item>
            <ion-label>South</ion-label>
            <ion-checkbox slot="end" v-model="quickSouthLock"></ion-checkbox>
          </ion-item>
          <ion-item>
            <ion-label>West</ion-label>
            <ion-checkbox slot="end" v-model="quickWestLock"></ion-checkbox>
          </ion-item>
        </ion-list>

        <!-- Action Buttons -->
        <ion-footer class="ion-no-border ion-padding-top">
           <ion-toolbar>
             <ion-buttons slot="primary">
               <ion-button fill="outline" @click="quickEditPopoverOpen = false">
                 Cancel
               </ion-button>
             </ion-buttons>
             <ion-buttons slot="secondary">
               <ion-button @click="applyQuickEdit">
                 Apply
               </ion-button>
             </ion-buttons>
           </ion-toolbar>
        </ion-footer>
      </ion-content>
    </ion-popover>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import ionic from "@/mixins/ionic";
import { ROOM_ICONS, _00_, ____, TELE, SHOP } from "@/dungeons/roomTypes";
import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";
import { toastController } from "@ionic/vue";

export default defineComponent({
  props: ["templeId"],
  name: "xp-temple-creator",
  mixins: [ionic],

  setup(props) {
    const templeDb = new TempleDb(templeStorage);
    const activeTab = ref("layout");
    const gridSize = ref("6x6");
    const entrancePosition = ref("5,2");
    const showPreview = ref(false);

    // Grid and cell selection
    const templeMaze = ref<string[][]>([]);
    const selectedCell = ref<{row: number, col: number} | null>(null);
    
    // Room editing properties
    const selectedRoomType = ref("wall");
    const selectedChestType = ref("dungeon");
    const selectedDungeonItem = ref("map");
    const selectedLootItems = ref(["potion"]);
    const selectedMonsterType = ref("small");
    
    // Door locking
    const northLocked = ref(false);
    const eastLocked = ref(false);
    const southLocked = ref(false);
    const westLocked = ref(false);

    // Room symbols mapping
    const roomSymbols = {
      wall: ____,
      entrance: _00_,
      empty: "O__O",
      monster: "q__q",
      loot: "$__$",
      boss: "X__X",
      miniboss: "x__x",
      teleport: TELE,
      shop: SHOP,
      health: "H__P",
    };

    // Room data storage
    const roomsData = ref<Record<string, any>>({
      [____]: { type: "wall" },
      [_00_]: { type: "entrance", visited: true }
    });

    // Initialize grid with default size
    const initializeGrid = () => {
      const [rows, cols] = gridSize.value.split("x").map(Number);
      templeMaze.value = [];
      
      // Initialize with walls
      for (let i = 0; i < rows; i++) {
        const row: string[] = [];
        for (let j = 0; j < cols; j++) {
          row.push(____);
        }
        templeMaze.value.push(row);
      }

      // Set entrance
      const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
      if (entranceRow >= 0 && entranceRow < rows && entranceCol >= 0 && entranceCol < cols) {
        templeMaze.value[entranceRow][entranceCol] = _00_;
      }
    };

    // Resize grid when size changes
    const resizeGrid = () => {
      initializeGrid();
    };

    // Get type of cell from the room symbol
    const getCellType = (cellSymbol: string) => {
      for (const [type, symbol] of Object.entries(roomSymbols)) {
        if (symbol === cellSymbol) {
          return type;
        }
      }
      return "wall"; // Default to wall
    };

    // Check if cell is the entrance position
    const isEntrancePosition = (row: number, col: number) => {
      const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
      return row === entranceRow && col === entranceCol;
    };

    // Select a cell for editing
    const selectCell = (row: number, col: number) => {
      selectedCell.value = { row, col };
      const cellSymbol = templeMaze.value[row][col];
      selectedRoomType.value = getCellType(cellSymbol);
      
      // Load existing room data
      if (roomsData.value[cellSymbol]) {
        const roomData = roomsData.value[cellSymbol];
        
        // Set locked doors
        northLocked.value = !!roomData.locked?.north;
        eastLocked.value = !!roomData.locked?.east;
        southLocked.value = !!roomData.locked?.south;
        westLocked.value = !!roomData.locked?.west;
        
        // Set content data
        if (roomData.content) {
          if (roomData.type === "loot") {
            selectedChestType.value = roomData.content.chest || "dungeon";
            if (selectedChestType.value === "dungeon") {
              selectedDungeonItem.value = roomData.content.dungeon || "map";
            } else if (selectedChestType.value === "loot") {
              selectedLootItems.value = roomData.content.items || ["potion"];
            }
          } else if (roomData.type === "monster" || roomData.type === "boss" || roomData.type === "miniboss") {
            selectedMonsterType.value = roomData.content.monsterType || "small";
          }
        }
      }
    };

    // Apply room changes
    const applyRoomChanges = () => {
      if (!selectedCell.value) return;
      
      const { row, col } = selectedCell.value;
      const cellSymbol = roomSymbols[selectedRoomType.value];
      templeMaze.value[row][col] = cellSymbol;
      
      // Create room data
      const roomData: any = { type: selectedRoomType.value };
      
      // Add locked doors if any
      if (northLocked.value || eastLocked.value || southLocked.value || westLocked.value) {
        roomData.locked = {
          north: northLocked.value,
          east: eastLocked.value,
          south: southLocked.value,
          west: westLocked.value
        };
      }
      
      // Add content based on room type
      if (selectedRoomType.value === "loot") {
        if (selectedChestType.value === "dungeon") {
          roomData.content = {
            chest: "dungeon",
            dungeon: selectedDungeonItem.value
          };
        } else {
          roomData.content = {
            chest: "loot",
            items: selectedLootItems.value
          };
        }
      } else if (selectedRoomType.value === "monster" || selectedRoomType.value === "boss" || selectedRoomType.value === "miniboss") {
        roomData.content = {
          monsterType: selectedMonsterType.value
        };
      } else if (selectedRoomType.value === "health") {
        roomData.content = {
          healthPoints: 10
        };
      }
      
      // Store room data
      roomsData.value[cellSymbol] = roomData;
      
      showToast("Room updated");
    };

    // Check if a specific door is locked in a room
    const hasDoorLock = (cellSymbol: string, direction: 'north' | 'south' | 'east' | 'west') => {
      if (!roomsData.value[cellSymbol]) return false;
      
      const roomData = roomsData.value[cellSymbol];
      return roomData.locked && roomData.locked[direction] === true;
    };

    // Generate code preview
    const templeCodePreview = computed(() => {
      const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
      
      let code = `const ${props.templeId.replace(/-/g, "")} = {\n`;
      code += `  entrance: [${entranceRow}, ${entranceCol}], // [row, column]\n`;
      code += `  maze: [\n`;
      
      // Add maze rows
      templeMaze.value.forEach((row, rowIndex) => {
        code += `    [${row.join(", ")}],${rowIndex < templeMaze.value.length - 1 ? "" : ""} // y: ${rowIndex}\n`;
      });
      
      // Add x-coordinates comment
      code += `    //`;
      for (let i = 0; i < templeMaze.value[0].length; i++) {
        code += `x:${i}, `;
      }
      code = code.slice(0, -2) + '\n';
      
      code += `  ],\n`;
      code += `  rooms: {\n`;
      
      // Add room definitions
      Object.entries(roomsData.value).forEach(([symbol, data], index, array) => {
        const isLast = index === array.length - 1;
        
        code += `    [${symbol}]: `;
        code += JSON.stringify(data);
        code += isLast ? '\n' : ',\n';
      });
      
      code += `  },\n`;
      code += `}\n\n`;
      code += `export default ${props.templeId.replace(/-/g, "")}`;
      
      return code;
    });

    // Copy code to clipboard
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(templeCodePreview.value);
        showToast("Code copied to clipboard");
      } catch (err) {
        showToast("Failed to copy: " + err);
      }
    };

    // Temple color (based on temple settings)
    const getTempleColor = () => {
      const colors = {
        "wind-temple": "#90caf9",
        "earth-temple": "#795548",
        "water-temple": "#2196f3",
        "fire-fortress": "#f44336",
        "frozen-fortress": "#42a5f5",
        "sun-temple": "#ffd700",
        "moon-temple": "#673ab7",
      };
      return colors[props.templeId] || "#9e9e9e";
    };

    // Show toast
    const showToast = async (message: string) => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: "bottom"
      });
      toast.present();
    };

    // Save temple
    const saveTemple = async () => {
      try {
        const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
        
        // Get the existing temple data
        const existingTemple = await templeDb.getTempleById(props.templeId);
        
        if (existingTemple) {
          // Create the dungeon layout object
          const dungeonLayout = {
            entrance: [entranceRow, entranceCol],
            maze: templeMaze.value,
            rooms: roomsData.value
          };
          
          // Update the temple with the new dungeon layout
          await templeDb.setTemple({
            ...existingTemple,
            dungeonLayout
          });
          
          showToast("Temple layout saved successfully!");
        } else {
          showToast("Could not find temple to save layout");
        }
      } catch (error) {
        console.error("Error saving temple layout:", error);
        showToast("Error saving temple layout");
      }
    };

    // Load existing temple layout
    const loadTempleLayout = async () => {
      try {
        // Get the existing temple data
        const existingTemple = await templeDb.getTempleById(props.templeId);
        
        if (existingTemple && existingTemple.dungeonLayout) {
          // Update the entrance position
          if (existingTemple.dungeonLayout.entrance) {
            entrancePosition.value = existingTemple.dungeonLayout.entrance.join(',');
          }
          
          // Load the maze layout
          if (existingTemple.dungeonLayout.maze) {
            templeMaze.value = existingTemple.dungeonLayout.maze;
            
            // Update grid size based on the loaded maze
            const rows = templeMaze.value.length;
            const cols = templeMaze.value[0]?.length || 0;
            gridSize.value = `${rows}x${cols}`;
          }
          
          // Load the room data
          if (existingTemple.dungeonLayout.rooms) {
            roomsData.value = existingTemple.dungeonLayout.rooms;
          }
          
          showToast("Temple layout loaded successfully!");
        } else {
          // If no layout exists, initialize with default grid
          initializeGrid();
        }
      } catch (error) {
        console.error("Error loading temple layout:", error);
        showToast("Error loading temple layout");
        initializeGrid();
      }
    };

    // Quick Edit Popover
    const quickEditPopoverOpen = ref(false);
    const popoverEvent = ref<Event | null>(null);
    const quickEditType = ref("");
    const quickLootType = ref("key");
    const quickMonsterType = ref("small");
    const quickNorthLock = ref(false);
    const quickEastLock = ref(false);
    const quickSouthLock = ref(false);
    const quickWestLock = ref(false);

    const showQuickEditPopover = (event: Event, row: number, col: number) => {
      popoverEvent.value = event;
      selectCell(row, col); // Load the data for the clicked cell first

      // Reset popover state based on the selected cell's data
      quickEditType.value = selectedRoomType.value;
      quickNorthLock.value = northLocked.value;
      quickEastLock.value = eastLocked.value;
      quickSouthLock.value = southLocked.value;
      quickWestLock.value = westLocked.value;

      // Reset conditional content types based on loaded data
      if (selectedRoomType.value === 'loot' && selectedChestType.value === 'dungeon') {
        // Map detailed dungeon item to simpler popover options if possible
        if (['key', 'map', 'compass'].includes(selectedDungeonItem.value)) {
          quickLootType.value = selectedDungeonItem.value;
        } else {
          quickLootType.value = 'key'; // Default if no direct match
        }
      } else {
        quickLootType.value = 'key'; // Default for non-dungeon loot or other types
      }

      if (selectedRoomType.value === 'monster') {
        // Map detailed monster type to simpler popover options if possible
        if (['small', 'medium', 'large'].includes(selectedMonsterType.value)) {
          quickMonsterType.value = selectedMonsterType.value;
        } else {
          quickMonsterType.value = 'small'; // Default if no direct match (e.g., 'boss')
        }
      } else {
        quickMonsterType.value = 'small'; // Default for non-monster types
      }
       
      quickEditPopoverOpen.value = true; // Now open the popover
    };
 
    const quickSetRoomType = (type: string) => {
      quickEditType.value = type;
      selectedRoomType.value = type;
    };

    const applyQuickEdit = () => {
      northLocked.value = quickNorthLock.value;
      eastLocked.value = quickEastLock.value;
      southLocked.value = quickSouthLock.value;
      westLocked.value = quickWestLock.value;
      applyRoomChanges();
      quickEditPopoverOpen.value = false;
    };

    onMounted(() => {
      // First try to load any existing layout
      loadTempleLayout();
      
      // If no layout is found, initialize with default grid
      if (templeMaze.value.length === 0) {
        initializeGrid();
      }
    });

    return {
      activeTab,
      gridSize,
      entrancePosition,
      templeMaze,
      selectedCell,
      selectedRoomType,
      selectedChestType,
      selectedDungeonItem,
      selectedLootItems,
      selectedMonsterType,
      northLocked,
      eastLocked,
      southLocked,
      westLocked,
      ROOM_ICONS,
      initializeGrid,
      resizeGrid,
      getCellType,
      isEntrancePosition,
      selectCell,
      applyRoomChanges,
      hasDoorLock,
      templeCodePreview,
      copyToClipboard,
      getTempleColor,
      saveTemple,
      showPreview,
      quickEditPopoverOpen,
      popoverEvent,
      quickEditType,
      quickLootType,
      quickMonsterType,
      quickNorthLock,
      quickEastLock,
      quickSouthLock,
      quickWestLock,
      showQuickEditPopover,
      quickSetRoomType,
      applyQuickEdit
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-temple-creator {
  ion-content {
    --padding-start: 10px;
    --padding-end: 10px;
    --padding-top: 10px;
    --padding-bottom: 10px;
  }

  .tab-content {
    margin-bottom: 20px;
  }

  .grid-container {
    overflow-x: auto;
    margin: 20px 0;
  }

  .temple-grid {
    display: inline-block;
    border: 2px solid #444;
    background: #222;
  }

  .grid-row {
    display: flex;
  }

  .grid-cell {
    width: 60px;
    height: 60px;
    border: 1px solid #666;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: #333;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: #444;
    }

    i {
      font-size: 1.5rem;
      z-index: 2;
    }

    .cell-coords {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 0.6rem;
      opacity: 0.7;
    }
    
    // Door lock indicators
    .door-lock {
      position: absolute;
      width: 16px;
      height: 16px;
      background: rgba(255, 0, 0, 0.7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3;
      
      i {
        font-size: 0.7rem;
        color: white;
      }
      
      &.north {
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      &.east {
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      &.south {
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      &.west {
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
      }
    }
    
    &.selected-cell {
      border: 3px solid #00c3ff !important;
      box-shadow: 0 0 8px #00c3ff;
      z-index: 4;
    }
  }

  // Cell type styling
  .cell-wall {
    background: #222;
  }

  .cell-entrance {
    background: #4CAF50;
  }

  .cell-monster {
    background: #f44336;
  }

  .cell-loot {
    background: #FFD700;
  }

  .cell-boss {
    background: #9C27B0;
  }

  .cell-teleport {
    background: #2196F3;
  }

  .cell-shop {
    background: #FF9800;
  }

  .entrance-position {
    border: 2px solid white;
  }

  .room-content-options {
    margin-top: 10px;
  }

  .door-locks {
    margin-top: 20px;
  }

  .preview-container {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 15px;
    overflow-x: auto;
  }

  .code-preview {
    font-family: 'Courier New', monospace;
    white-space: pre;
    margin: 0;
  }

  .editor-content {
    margin-bottom: 20px;
  }

  .editor-grid {
    --ion-grid-padding: 0;
  }

  .layout-column {
    padding-right: 10px;
  }

  .properties-column {
    padding-left: 10px;
  }

  .apply-button {
    margin-top: 20px;
  }

  .no-selection-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .select-prompt {
    text-align: center;
    color: #888;
  }
}
</style>
