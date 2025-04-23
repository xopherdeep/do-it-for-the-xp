<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/temples/${templeId}`" />
        </ion-buttons>
        <ion-title>Temple Creator</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showPreview = !showPreview" color="rpg">
            <i class="fas fa-code" />
            {{ showPreview ? 'Editor' : 'Preview' }}
          </ion-button>
          <ion-button @click="saveTemple" color="rpg">
            <i class="fas fa-save" />
            Save
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide">
      <!-- Preview Mode -->
      <div
        v-if="showPreview"
        class="tab-content"
      >
        <ion-card>
          <ion-card-header>
            <ion-card-title>Temple Preview</ion-card-title>
            <ion-card-subtitle>See how your temple will look in-game</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="preview-container">
              <pre class="code-preview">{{ templeCodePreview }}</pre>
            </div>
            <ion-button
              expand="block"
              @click="copyToClipboard"
            >
              <i class="fas fa-copy"></i>
              Copy Code
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Unified Editor Mode -->
      <div
        v-else
        class="editor-content"
      >
        <ion-grid class="editor-grid">
          <ion-row>
            <!-- Left Side: Grid Layout -->
            <ion-col
              size="12"
              size-md="7"
              class="layout-column"
            >
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Temple Layout</ion-card-title>
                  <ion-card-subtitle>Design your temple maze</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="layout-controls">
                    <ion-item>
                      <ion-label>Grid Size</ion-label>
                      <ion-select
                        v-model="gridSize"
                        interface="popover"
                        @ionChange="resizeGrid"
                      >
                        <ion-select-option value="5x5">5 x 5</ion-select-option>
                        <ion-select-option value="6x6">6 x 6</ion-select-option>
                        <ion-select-option value="7x7">7 x 7</ion-select-option>
                        <ion-select-option value="8x8">8 x 8</ion-select-option>
                        <ion-select-option value="10x10">10 x 10</ion-select-option>
                      </ion-select>
                    </ion-item>
                    <ion-item>
                      <ion-label>Entrance Position</ion-label>
                      <ion-input
                        type="text"
                        v-model="entrancePosition"
                        placeholder="row,col (e.g. 5,2)"
                      />
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
                            :class="[ROOM_ICONS[getCellType(cell)]]"
                            class="fad"
                          ></i>
                          <span class="cell-coords">{{rowIndex}},{{colIndex}}</span>

                          <!-- Side Configuration Indicators -->
                          <!-- North -->
                          <div
                            v-if="getSideConfiguration(cell, 'north') !== 'door'"
                            :class="['side-indicator', 'north', `indicator-${getSideConfiguration(cell, 'north')}`]"
                          >
                            <i :class="SIDE_TYPE_INFO[getSideConfiguration(cell, 'north')].icon"></i>
                          </div>
                          <!-- East -->
                          <div
                            v-if="getSideConfiguration(cell, 'east') !== 'door'"
                            :class="['side-indicator', 'east', `indicator-${getSideConfiguration(cell, 'east')}`]"
                          >
                            <i :class="SIDE_TYPE_INFO[getSideConfiguration(cell, 'east')].icon"></i>
                          </div>
                          <!-- South -->
                          <div
                            v-if="getSideConfiguration(cell, 'south') !== 'door'"
                            :class="['side-indicator', 'south', `indicator-${getSideConfiguration(cell, 'south')}`]"
                          >
                            <i :class="SIDE_TYPE_INFO[getSideConfiguration(cell, 'south')].icon"></i>
                          </div>
                          <!-- West -->
                          <div
                            v-if="getSideConfiguration(cell, 'west') !== 'door'"
                            :class="['side-indicator', 'west', `indicator-${getSideConfiguration(cell, 'west')}`]"
                          >
                            <i :class="SIDE_TYPE_INFO[getSideConfiguration(cell, 'west')].icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Right Side: Room Properties -->
            <ion-col
              size="12"
              size-md="5"
              class="properties-column"
            >
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
                    <ion-select
                      v-model="selectedRoomType"
                      interface="popover"
                    >
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
                  <div
                    v-if="selectedRoomType === 'loot'"
                    class="room-content-options"
                  >
                    <ion-item>
                      <ion-label>Chest Type</ion-label>
                      <ion-select
                        v-model="selectedChestType"
                        interface="popover"
                      >
                        <ion-select-option value="dungeon">Dungeon Item</ion-select-option>
                        <ion-select-option value="loot">Random Loot</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item v-if="selectedChestType === 'dungeon'">
                      <ion-label>Dungeon Item</ion-label>
                      <ion-select
                        v-model="selectedDungeonItem"
                        interface="popover"
                      >
                        <ion-select-option value="map">Map</ion-select-option>
                        <ion-select-option value="compass">Compass</ion-select-option>
                        <ion-select-option value="key">Key</ion-select-option>
                        <ion-select-option value="boss-key">Boss Key</ion-select-option>
                        <ion-select-option value="special-item">Special Item</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item v-if="selectedChestType === 'loot'">
                      <ion-label>Loot Items</ion-label>
                      <ion-select
                        v-model="selectedLootItems"
                        multiple="true"
                        interface="popover"
                      >
                        <ion-select-option value="potion">Potion</ion-select-option>
                        <ion-select-option value="ether">Ether</ion-select-option>
                        <ion-select-option value="elixir">Elixir</ion-select-option>
                        <ion-select-option value="gold">Gold</ion-select-option>
                        <ion-select-option value="equipment">Equipment</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </div>

                  <div
                    v-if="selectedRoomType === 'monster' || selectedRoomType === 'boss' || selectedRoomType === 'miniboss'"
                    class="room-content-options"
                  >
                    <ion-item>
                      <ion-label>Monster Type</ion-label>
                      <ion-select
                        v-model="selectedMonsterType"
                        interface="popover"
                      >
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

                  <ion-button
                    expand="block"
                    @click="applyRoomChanges"
                    class="apply-button"
                  >
                    Apply Changes
                  </ion-button>
                </ion-card-content>
                <ion-card-content
                  v-else
                  class="no-selection-content"
                >
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
      <ion-header>
        <ion-toolbar>
          <ion-segment
            v-model="quickEditTab"
            value="type"
          >
            <ion-segment-button value="type">
              <ion-label>Type</ion-label>
            </ion-segment-button>

            <ion-segment-button value="locks">
              <ion-label>Sides</ion-label> <!-- Changed label -->
            </ion-segment-button>
            <ion-segment-button
              value="content"
              :disabled="!['loot', 'monster'].includes(quickEditType)"
            >
              <ion-label>Content</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <!-- Tab Content: Type -->
        <div v-if="quickEditTab === 'type'">
          <ion-grid class="room-type-grid ion-padding-top">
            <ion-row>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('wall')"
                  :class="{ 'selected': quickEditType === 'wall' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['wall']"
                    ></i><span>Wall</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('empty')"
                  :class="{ 'selected': quickEditType === 'empty' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['empty']"
                    ></i><span>Empty</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('monster')"
                  :class="{ 'selected': quickEditType === 'monster' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['monster']"
                    ></i><span>Monster</span>
                  </div>
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('loot')"
                  :class="{ 'selected': quickEditType === 'loot' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['loot']"
                    ></i><span>Chest</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('boss')"
                  :class="{ 'selected': quickEditType === 'boss' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['boss']"
                    ></i><span>Boss</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('teleport')"
                  :class="{ 'selected': quickEditType === 'teleport' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['teleport']"
                    ></i><span>Teleport</span>
                  </div>
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('shop')"
                  :class="{ 'selected': quickEditType === 'shop' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['shop']"
                    ></i><span>Shop</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('health')"
                  :class="{ 'selected': quickEditType === 'health' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['health']"
                    ></i><span>Health</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('miniboss')"
                  :class="{ 'selected': quickEditType === 'miniboss' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['miniboss']"
                    ></i><span>MiniBoss</span>
                  </div>
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  fill="clear"
                  @click="quickSetRoomType('entrance')"
                  :class="{ 'selected': quickEditType === 'entrance' }"
                >
                  <div class="button-content">
                    <i
                      class="fas"
                      :class="ROOM_ICONS['entrance']"
                    ></i><span>Entrance</span>
                  </div>
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>

        <!-- Tab Content: Content -->
        <div v-if="quickEditTab === 'content'">
          <ion-list
            lines="none"
            class="ion-padding-top"
          >
            <!-- Loot Content Options -->
            <div v-if="quickEditType === 'loot'">
              <ion-item>
                <ion-label>Chest Type</ion-label>
                <ion-segment v-model="quickChestType">
                  <ion-segment-button value="dungeon">Dungeon Item</ion-segment-button>
                  <ion-segment-button value="loot">Random Loot</ion-segment-button>
                </ion-segment>
              </ion-item>

              <ion-item v-if="quickChestType === 'dungeon'">
                <ion-label>Dungeon Item</ion-label>
                <ion-segment v-model="quickDungeonItem">
                  <ion-segment-button value="key">Key</ion-segment-button>
                  <ion-segment-button value="map">Map</ion-segment-button>
                  <ion-segment-button value="compass">Compass</ion-segment-button>
                  <ion-segment-button value="boss-key">Boss Key</ion-segment-button>
                  <ion-segment-button value="special-item">Special</ion-segment-button>
                </ion-segment>
              </ion-item>

              <ion-item v-if="quickChestType === 'loot'">
                <ion-label>Random Items</ion-label>
                <ion-select
                  v-model="quickRandomLootItems"
                  multiple="true"
                  interface="popover"
                  placeholder="Select Items"
                >
                  <ion-select-option value="potion">Potion</ion-select-option>
                  <ion-select-option value="ether">Ether</ion-select-option>
                  <ion-select-option value="elixir">Elixir</ion-select-option>
                  <ion-select-option value="gold">Gold</ion-select-option>
                  <ion-select-option value="equipment">Equipment</ion-select-option>
                </ion-select>
              </ion-item>
            </div>

            <!-- Monster Content Options -->
            <ion-item v-if="['monster', 'miniboss', 'boss'].includes(quickEditType)">
              <ion-label>Monster Type</ion-label>
              <ion-segment v-model="quickMonsterType">
                <ion-segment-button value="small">Small</ion-segment-button>
                <ion-segment-button value="medium">Medium</ion-segment-button>
                <ion-segment-button value="large">Large</ion-segment-button>
                <ion-segment-button value="boss">Boss</ion-segment-button>
              </ion-segment>
            </ion-item>

            <!-- Add other content types here if needed (e.g., Health amount) -->

          </ion-list>
        </div>

        <!-- Tab Content: Locks -->
        <div v-if="quickEditTab === 'locks'">
          <ion-list
            lines="full"
            class="ion-padding-top"
          >
            <!-- <ion-item-divider> Removed redundant title
               <ion-label>Side Configuration</ion-label>
             </ion-item-divider> -->
            <!-- North Side -->
            <ion-item
              button
              detail="false"
              @click="showSideSelectPopover($event, 'north')"
            >
              <ion-label>North</ion-label>
              <ion-button
                fill="clear"
                slot="end"
                class="side-type-button"
              >
                <i
                  :class="getSideTypeDisplay(quickNorthSideType).icon"
                  slot="start"
                ></i>
                {{ getSideTypeDisplay(quickNorthSideType).label }}
              </ion-button>
            </ion-item>

            <!-- East Side -->
            <ion-item
              button
              detail="false"
              @click="showSideSelectPopover($event, 'east')"
            >
              <ion-label>East</ion-label>
              <ion-button
                fill="clear"
                slot="end"
                class="side-type-button"
              >
                <i
                  :class="getSideTypeDisplay(quickEastSideType).icon"
                  slot="start"
                ></i>
                {{ getSideTypeDisplay(quickEastSideType).label }}
              </ion-button>
            </ion-item>

            <!-- South Side -->
            <ion-item
              button
              detail="false"
              @click="showSideSelectPopover($event, 'south')"
            >
              <ion-label>South</ion-label>
              <ion-button
                fill="clear"
                slot="end"
                class="side-type-button"
              >
                <i
                  :class="getSideTypeDisplay(quickSouthSideType).icon"
                  slot="start"
                ></i>
                {{ getSideTypeDisplay(quickSouthSideType).label }}
              </ion-button>
            </ion-item>

            <!-- West Side -->
            <ion-item
              button
              detail="false"
              @click="showSideSelectPopover($event, 'west')"
            >
              <ion-label>West</ion-label>
              <ion-button
                fill="clear"
                slot="end"
                class="side-type-button"
              >
                <i
                  :class="getSideTypeDisplay(quickWestSideType).icon"
                  slot="start"
                ></i>
                {{ getSideTypeDisplay(quickWestSideType).label }}
              </ion-button>
            </ion-item>
          </ion-list>
        </div>

        <!-- Action Buttons (Remain outside tabs) -->
        <ion-footer class="ion-no-border ion-padding-top">
          <ion-toolbar>
            <ion-buttons slot="secondary">
              <ion-button @click="quickEditPopoverOpen = false">
                Cancel
              </ion-button>
            </ion-buttons>
            <ion-buttons slot="primary">
              <ion-button
                fill="outline"
                @click="applyQuickEdit"
              >
                Apply
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-content>
    </ion-popover>

    <!-- Popover for Side Type Selection -->
    <ion-popover
      :is-open="sideSelectPopoverOpen"
      :event="sideSelectEvent"
      @didDismiss="sideSelectPopoverOpen = false"
      :dismiss-on-select="true"
      side="end"
      alignment="center"
      class="side-select-sub-popover"
    >
      <ion-content>
        <ion-list lines="none">
          <ion-item
            button
            @click="setSideType('door')"
          >
            <i
              :class="SIDE_TYPE_INFO.door.icon"
              slot="start"
            ></i>
            <ion-label>{{ SIDE_TYPE_INFO.door.label }}</ion-label>
          </ion-item>
          <ion-item
            button
            @click="setSideType('wall')"
          >
            <i
              :class="SIDE_TYPE_INFO.wall.icon"
              slot="start"
            ></i>
            <ion-label>{{ SIDE_TYPE_INFO.wall.label }}</ion-label>
          </ion-item>
          <ion-item
            button
            @click="setSideType('bombable')"
          >
            <i
              :class="SIDE_TYPE_INFO.bombable.icon"
              slot="start"
            ></i>
            <ion-label>{{ SIDE_TYPE_INFO.bombable.label }}</ion-label>
          </ion-item>
          <ion-item
            button
            @click="setSideType('locked')"
          >
            <i
              :class="SIDE_TYPE_INFO.locked.icon"
              slot="start"
            ></i>
            <ion-label>{{ SIDE_TYPE_INFO.locked.label }}</ion-label>
          </ion-item>
        </ion-list>
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
    
    // Unique Symbol Generation State
    const symbolCounter = ref(0);
    const usedSymbols = ref<Set<string>>(new Set([____, _00_, TELE, SHOP])); // Initialize with fixed symbols

    // Room editing properties (These might become less relevant as primary state)
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
      health: "H__P", // Keep this mapping for reference/initial symbol suggestion? Maybe remove later.
    };

    // Room data storage (keyed by unique symbols)
    const roomsData = ref<Record<string, any>>({
      [____]: { type: "wall" }, // Fixed wall data
      [_00_]: { type: "entrance", visited: true } // Fixed entrance data
      // Other room data will be added dynamically with unique keys like 'R001'
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

    // Generate a unique symbol for a new room
    const generateUniqueSymbol = (): string => {
      let newSymbol = '';
      do {
        symbolCounter.value++;
        // Format: R + 3 digits (e.g., R001, R010, R100)
        newSymbol = `R${symbolCounter.value.toString().padStart(3, '0')}`; 
      } while (usedSymbols.value.has(newSymbol)); // Ensure uniqueness
      usedSymbols.value.add(newSymbol);
      return newSymbol;
    };

    // Resize grid while preserving existing cells
    const resizeGrid = () => {
      const oldMaze = JSON.parse(JSON.stringify(templeMaze.value)); // Deep copy old maze
      const oldRows = oldMaze.length;
      const oldCols = oldMaze[0]?.length || 0;
      
      const [newRows, newCols] = gridSize.value.split("x").map(Number);
      const newMaze: string[][] = [];

      // Create new grid filled with walls
      for (let i = 0; i < newRows; i++) {
        const row: string[] = [];
        for (let j = 0; j < newCols; j++) {
          row.push(____); // Default to wall
        }
        newMaze.push(row);
      }

      // Copy old cells into the new grid
      for (let i = 0; i < newRows; i++) {
        for (let j = 0; j < newCols; j++) {
          if (i < oldRows && j < oldCols) {
            // If coordinates exist in the old grid, copy the symbol
            // But don't copy the old entrance symbol if it's not the current entrance
            const oldSymbol = oldMaze[i][j];
            if (oldSymbol !== _00_) { // Don't copy old entrance markers directly
               newMaze[i][j] = oldSymbol;
            } else {
               // If it was the old entrance, check if it's still the entrance
               const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
               if (i !== entranceRow || j !== entranceCol) {
                 // If it's not the *current* entrance, make it an empty room instead of wall
                 newMaze[i][j] = roomSymbols['empty']; 
               }
               // If it *is* the current entrance, it will be set below
            }
          }
          // Otherwise, it remains a wall (____) from initialization
        }
      }
      
      // Ensure the current entrance position is set correctly in the new maze
      const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
      if (entranceRow >= 0 && entranceRow < newRows && entranceCol >= 0 && entranceCol < newCols) {
        newMaze[entranceRow][entranceCol] = _00_;
      } else {
        // If entrance is outside new bounds, reset it to default and show warning?
        console.warn("Entrance position is outside the new grid bounds!");
        // Optionally reset entrancePosition.value to a default valid position
      }

      templeMaze.value = newMaze; // Update the main maze ref
    };

    // Get type of cell by looking up its unique symbol in roomsData
    const getCellType = (cellSymbol: string): string => {
      const roomData = roomsData.value[cellSymbol];
      return roomData?.type || "wall"; // Default to wall if symbol not found or has no type
    };

    // Check if cell is the entrance position
    const isEntrancePosition = (row: number, col: number) => {
      const [entranceRow, entranceCol] = entrancePosition.value.split(",").map(Number);
      return row === entranceRow && col === entranceCol;
    };

    // Select a cell for editing (popover reads state from here)
    const selectCell = (row: number, col: number) => {
      selectedCell.value = { row, col };
      // No need to load data into intermediate state (selectedRoomType, northLocked etc.) here anymore.
      // The showQuickEditPopover function will directly read from roomsData based on the symbol in the maze.
    };

    // Apply room changes (now accepts data from popover)
    const applyRoomChanges = (roomType: string, contentData: any, sideData: any) => {
      if (!selectedCell.value) return;
      
      const { row, col } = selectedCell.value;
      const currentSymbol = templeMaze.value[row][col];
      const currentType = getCellType(currentSymbol); // Get type based on current symbol's data
      const newType = roomType; // The type selected in the popover

      let symbolToUse = currentSymbol;
      let needsNewSymbol = false;

      // Determine if a new unique symbol is needed
      if (newType !== currentType || currentSymbol === ____) {
         // Changing type OR changing from a wall requires symbol update
         if (newType === 'wall') {
            symbolToUse = ____;
         } else if (newType === 'entrance') {
            symbolToUse = _00_;
         } else if (currentSymbol === ____ || currentSymbol === _00_ || !currentSymbol.startsWith('R')) {
            // If current is fixed or not a unique symbol, generate a new one
            needsNewSymbol = true;
            symbolToUse = generateUniqueSymbol();
         } else {
             // If changing type from one unique symbol to another type, reuse is complex.
             // For simplicity, let's generate a new one for now.
             // TODO: Potentially reuse if the old symbol is now orphaned.
             needsNewSymbol = true;
             symbolToUse = generateUniqueSymbol();
         }
      }
      
      // If the symbol changed from a unique one, remove its old data
      if (symbolToUse !== currentSymbol && currentSymbol.startsWith('R')) {
         delete roomsData.value[currentSymbol];
         usedSymbols.value.delete(currentSymbol);
         // TODO: Consider symbol reuse logic here later
      }

      // Update the maze grid
      templeMaze.value[row][col] = symbolToUse;
      
      // Create or update room data in roomsData using the determined symbol
      const roomData: any = { type: newType }; // Always store the type
      
      // Add side configuration (replacing old 'locked' structure)
      // Only add the 'sides' object if at least one side is not the default 'door'
      if (Object.values(sideData).some(type => type !== 'door')) {
         roomData.sides = sideData;
      }
      
      // Add content data if it's not empty
      if (Object.keys(contentData).length > 0) {
        roomData.content = contentData;
      }
      
      // Store room data using the symbolToUse as the key
      // Only store data for non-wall types (wall data is implicit via ____ symbol)
      if (symbolToUse !== ____) {
         roomsData.value[symbolToUse] = roomData;
      }
      
      // TODO: Implement garbage collection for unused 'R###' symbols in roomsData later if needed.
      
      showToast("Room updated");
    };

    // Get the configuration of a specific side ('door', 'wall', 'bombable', 'locked')
    const getSideConfiguration = (cellSymbol: string, direction: 'north' | 'south' | 'east' | 'west'): string => {
      const roomData = roomsData.value[cellSymbol];
      // Default to 'door' if no specific side data exists
      return roomData?.sides?.[direction] || 'door'; 
    };

    // Check if a specific door is locked in a room (Keep for now if needed elsewhere, but grid display will use getSideConfiguration)
    const hasDoorLock = (cellSymbol: string, direction: 'north' | 'south' | 'east' | 'west') => {
      const roomData = roomsData.value[cellSymbol];
      // Check both the old locked structure and the new sides structure for backward compatibility during transition
      return (roomData?.locked?.[direction] === true) || (roomData?.sides?.[direction] === 'locked');
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
            
            // Populate usedSymbols and find max counter from loaded data
            usedSymbols.value.clear();
            usedSymbols.value.add(____).add(_00_).add(TELE).add(SHOP); // Add fixed symbols
            let maxCounter = 0;
            Object.keys(roomsData.value).forEach(symbol => {
              usedSymbols.value.add(symbol);
              if (symbol.startsWith('R')) {
                const num = parseInt(symbol.substring(1), 10);
                if (!isNaN(num) && num > maxCounter) {
                  maxCounter = num;
                }
              }
            });
            symbolCounter.value = maxCounter; // Set counter beyond the max loaded
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
    const quickEditType = ref(""); // e.g., 'wall', 'loot', 'monster'
    
    // Content Refs (replaces quickLootType)
    const quickChestType = ref("dungeon"); // 'dungeon' or 'loot'
    const quickDungeonItem = ref("key"); // 'key', 'map', 'compass', 'boss-key', 'special-item'
    const quickRandomLootItems = ref<string[]>(['potion']); // Array for multi-select
    const quickMonsterType = ref("small"); // 'small', 'medium', 'large', 'boss' - Keep this one
    
    // Remove old lock refs (Keep these commented out or remove entirely if preferred, but they are already commented)
    // const quickNorthLock = ref(false);
    // const quickEastLock = ref(false);
    // const quickSouthLock = ref(false);
    // const quickWestLock = ref(false);
    
    // Add new side type refs for popover
    const quickNorthSideType = ref('door');
    const quickEastSideType = ref('door');
    const quickSouthSideType = ref('door');
    const quickWestSideType = ref('door');
    
    const quickEditTab = ref('type'); // State for active tab

    // Side Select Popover State
    const sideSelectPopoverOpen = ref(false);
    const sideSelectEvent = ref<Event | null>(null);
    const sideSelectDirection = ref<'north' | 'east' | 'south' | 'west'>('north');

    // Helper to get side type display info (icon and label) - Still needed for trigger button
    const SIDE_TYPE_INFO = {
      door: { icon: 'fas fa-door-open', label: 'Door' },
      wall: { icon: 'fas fa-square', label: 'Wall' },
      bombable: { icon: 'fas fa-bomb', label: 'Bomb' },
      locked: { icon: 'fas fa-lock', label: 'Lock' }
    };
    const getSideTypeDisplay = (type: string) => {
      return SIDE_TYPE_INFO[type] || SIDE_TYPE_INFO['door']; // Default to door
    };

    const showQuickEditPopover = (event: Event, row: number, col: number) => {
      popoverEvent.value = event;
      selectCell(row, col); // Load the data for the clicked cell first
      quickEditTab.value = 'type'; // Reset to the 'type' tab

      // Reset popover state based on the selected cell's data
      const cellSymbol = templeMaze.value[row][col];
      const loadedRoomData = roomsData.value[cellSymbol] || {};
      const loadedRoomType = getCellType(cellSymbol); // Use getCellType here
      
      quickEditType.value = loadedRoomType;

      // Reset Side Types (using loadedRoomData.sides if available, else default/map from locked)
      // TODO: Fully transition to using loadedRoomData.sides once data structure is updated
      quickNorthSideType.value = loadedRoomData.sides?.north || (loadedRoomData.locked?.north ? 'locked' : 'door');
      quickEastSideType.value = loadedRoomData.sides?.east || (loadedRoomData.locked?.east ? 'locked' : 'door');
      quickSouthSideType.value = loadedRoomData.sides?.south || (loadedRoomData.locked?.south ? 'locked' : 'door');
      quickWestSideType.value = loadedRoomData.sides?.west || (loadedRoomData.locked?.west ? 'locked' : 'door');
      // --- End of temporary mapping ---

      // Reset Content Types based on loaded data
      if (loadedRoomType === 'loot') {
        quickChestType.value = loadedRoomData.content?.chest || 'dungeon';
        if (quickChestType.value === 'dungeon') {
          quickDungeonItem.value = loadedRoomData.content?.dungeon || 'key';
        } else { // 'loot'
          quickRandomLootItems.value = loadedRoomData.content?.items || ['potion'];
        }
      } else {
        // Default values for non-loot types
        quickChestType.value = 'dungeon';
        quickDungeonItem.value = 'key';
        quickRandomLootItems.value = ['potion'];
      }

      if (['monster', 'miniboss', 'boss'].includes(loadedRoomType)) {
         quickMonsterType.value = loadedRoomData.content?.monsterType || 'small';
      } else {
         // Default value for non-monster types
         quickMonsterType.value = 'small';
      }
       
      quickEditPopoverOpen.value = true; // Now open the popover
    };
 
    const quickSetRoomType = (type: string) => {
      quickEditType.value = type;
      selectedRoomType.value = type;
    };

    const applyQuickEdit = () => {
      // TODO: Update this when main state uses side types
      // Map new types back to old boolean lock temporarily
      northLocked.value = quickNorthSideType.value === 'locked';
      eastLocked.value = quickEastSideType.value === 'locked';
      southLocked.value = quickSouthSideType.value === 'locked';
      westLocked.value = quickWestSideType.value === 'locked';
      // --- End of temporary mapping ---
      
      // Apply the main room type change
      selectedRoomType.value = quickEditType.value; 
      
      // Apply content changes based on quick edit state
      const contentData: any = {};
      if (quickEditType.value === 'loot') {
        contentData.chest = quickChestType.value;
        if (quickChestType.value === 'dungeon') {
          contentData.dungeon = quickDungeonItem.value;
        } else { // 'loot'
          contentData.items = quickRandomLootItems.value;
        }
      } else if (['monster', 'miniboss', 'boss'].includes(quickEditType.value)) {
        contentData.monsterType = quickMonsterType.value;
      } else if (quickEditType.value === 'health') {
         contentData.healthPoints = 10; // Example default
      }
      
      // Prepare side data (TODO: Fully transition applyRoomChanges to use this)
      const sideData = {
         north: quickNorthSideType.value,
         east: quickEastSideType.value,
         south: quickSouthSideType.value,
         west: quickWestSideType.value,
      };

      // Apply all changes using the main apply function
      // Pass quick edit state to applyRoomChanges
      applyRoomChanges(quickEditType.value, contentData, sideData); 
      quickEditPopoverOpen.value = false;
    };

    // --- Side Select Popover Logic ---
    const showSideSelectPopover = (event: Event, direction: 'north' | 'east' | 'south' | 'west') => {
      sideSelectEvent.value = event;
      sideSelectDirection.value = direction;
      sideSelectPopoverOpen.value = true;
    };

    const setSideType = (type: string) => {
      switch (sideSelectDirection.value) {
        case 'north': quickNorthSideType.value = type; break;
        case 'east': quickEastSideType.value = type; break;
        case 'south': quickSouthSideType.value = type; break;
        case 'west': quickWestSideType.value = type; break;
      }
      // Popover closes automatically due to dismiss-on-select="true"
      // sideSelectPopoverOpen.value = false; 
    };
    // --- End Side Select Popover Logic ---


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
      getSideConfiguration, // Add new function
      hasDoorLock, // Keep old one for now if needed
      templeCodePreview,
      copyToClipboard,
      getTempleColor,
      saveTemple,
      showPreview,
      quickEditPopoverOpen,
      popoverEvent,
      quickEditType, // Keep
      // quickLootType, // Removed
      quickChestType, // Added
      quickDungeonItem, // Added
      quickRandomLootItems, // Added
      quickMonsterType, // Keep
      // quickNorthLock, // Removed
      // quickEastLock, // Removed
      // quickSouthLock, // Removed
      // quickWestLock, // Removed
      quickNorthSideType, // Added
      quickEastSideType, // Added
      quickSouthSideType, // Added
      quickWestSideType, // Added
      quickEditTab, // Expose tab state
      showQuickEditPopover,
      quickSetRoomType,
      applyQuickEdit,
      // Unique Symbols (if needed in template/debug)
      // symbolCounter, 
      // usedSymbols,
      // generateUniqueSymbol, 
      // Side Select Popover related
      sideSelectPopoverOpen,
      sideSelectEvent,
      showSideSelectPopover,
      setSideType, // Make sure setSideType is exposed
      getSideTypeDisplay,
      SIDE_TYPE_INFO // Expose for popover list rendering
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
    
    // Side configuration indicators (replaces .door-lock)
    .side-indicator {
      position: absolute;
      width: 18px; // Slightly larger?
      height: 18px;
      background: rgba(255, 0, 0, 0.7);
      border-radius: 4px; // Square or rounded square
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);

      i {
        font-size: 0.8rem; // Adjust icon size
        color: white;
      }
      
      // Default background (can be overridden)
      background: rgba(100, 100, 100, 0.8); 

      // Specific types
      &.indicator-locked {
        background: rgba(255, 0, 0, 0.7); // Red for locked
      }
      &.indicator-wall {
         background: rgba(80, 80, 80, 0.9); // Dark grey for wall
      }
       &.indicator-bombable {
         background: rgba(255, 165, 0, 0.8); // Orange for bombable
       }

      // Positioning
      &.north {
        top: -9px; // Adjust for new size
        left: 50%;
        transform: translateX(-50%);
      }
      
      &.east {
        right: -9px; // Adjust for new size
        top: 50%;
        transform: translateY(-50%);
      }
      
      &.south {
        bottom: -9px; // Adjust for new size
        left: 50%;
        transform: translateX(-50%);
      }
      
      &.west {
        left: -9px; // Adjust for new size
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
    i {
      opacity: 0.3; // Make wall icon less prominent
    }
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
