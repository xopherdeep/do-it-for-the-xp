<template>
  <ion-page class="xp-temple-layout">
    <!-- Temple Header with Controls -->
    <xp-temple-creator-header
      v-if="!showPreview"
      v-model:gridSize="gridSize"
      v-model:currentLevelId="currentLevelId"
      :temple-id="templeId"
      :temple-name="templeName"
      :temple-icon="templeIcon"
      :entrance-display="entranceDisplay"
      :show-preview="showPreview"
      :floors="floors"
      @resize="resizeGrid"
      @toggle-preview="showPreview = !showPreview"
      @save="saveTemple"
      @floor-change="setLevel"
      @add-floor="addFloor"
      @remove-floor="removeFloor"
    />
    <ion-content
      class="transparent-content"
      :fullscreen="true"
    >
      <!-- Editor Mode: Show interactive grid when layout exists -->
      <div
        v-if="hasLayout && !isLoading"
        class="editor-wrapper"
      >


        <!-- Preview Mode -->
        <div
          v-if="showPreview"
          class="tab-content w-full max-w-4xl"
        >
          <ion-card>
            <ion-card-header>
              <div class="flex justify-between items-center">
                <div>
                  <ion-card-title>Temple Preview</ion-card-title>
                  <ion-card-subtitle>See how your temple will look in-game</ion-card-subtitle>
                </div>
                <ion-button
                  fill="clear"
                  @click="showPreview = false"
                >
                  <i class="fas fa-times"></i>
                  Close
                </ion-button>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="preview-container">
                <pre class="code-preview">{{ templeCodePreview }}</pre>
              </div>
              <div class="flex gap-2 mt-4">
                <ion-button
                  expand="block"
                  class="flex-1"
                  @click="copyToClipboard"
                >
                  <i class="fas fa-copy mr-2"></i>
                  Copy Code
                </ion-button>
                <ion-button
                  expand="block"
                  class="flex-1"
                  color="medium"
                  @click="showPreview = false"
                >
                  <i class="fas fa-edit mr-2"></i>
                  Return to Editor
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Maze Configuration View -->
        <div
          v-if="showMazeConfig"
          class="tab-content w-full max-w-4xl"
        >
          <ion-card class="maze-config-card">
            <ion-card-header>
              <div class="flex justify-between items-center">
                <div>
                  <ion-card-title>Maze Configuration</ion-card-title>
                  <ion-card-subtitle>Active room tokens and their definitions</ion-card-subtitle>
                </div>
                <ion-button
                  fill="clear"
                  @click="showMazeConfig = false"
                >
                  <i class="fas fa-times"></i>
                  Close
                </ion-button>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="config-grid">
                <div
                  v-for="room in uniqueRooms"
                  :key="room.key"
                  class="config-item glass-panel"
                  @click="focusRoom(room.key)"
                >
                  <div class="token-badge">{{ room.key }}</div>
                  <div class="room-info">
                    <div class="type-row">
                      <i :class="['fas', getRoomTypeIcon(room.type), 'mr-2']"></i>
                      <span class="capitalize">{{ room.type }}</span>
                    </div>
                    <div class="content-preview text-xs opacity-60">
                      {{ formatRoomContent(room) }}
                    </div>
                  </div>
                  <div class="action-arrow">
                    <i class="fas fa-chevron-right"></i>
                  </div>
                </div>
              </div>
              <div
                v-if="uniqueRooms.length === 0"
                class="empty-config p-8 text-center opacity-50"
              >
                No active rooms configured in this maze yet.
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Grid Editor -->
        <div
          v-else
          class="grid-wrapper"
        >
          <xp-temple-creator-grid
            :maze="currentMazeSlice"
            :rooms-data="roomsData"
            :room-icons="dynamicRoomIcons"
            :side-type-info="SIDE_TYPE_INFO"
            :selected-cell="selectedCell"
            :entrance-position="entrancePosition"
            :current-level-id="currentLevelId"
            @cell-click="onCellClick"
            @cell-contextmenu="({ row, col, event }) => showQuickEditPopover(event, row, col)"
          />
        </div>
      </div>

      <!-- Empty State: Show when no layout exists -->
      <div
        v-else-if="!hasLayout && !isLoading"
        class="empty-state-wrapper"
      >
        <div class="glass-card empty-state">
          <ion-icon
            :icon="gridOutline"
            class="empty-icon"
          ></ion-icon>
          <h2>No Dungeon Layout</h2>
          <p>Create your temple's dungeon structure to begin designing rooms and challenges.</p>
          <ion-button
            color="primary"
            @click="initializeNewLayout"
          >
            <i class="fad fa-dungeon mr-2"></i>
            Create Layout
          </ion-button>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="loading-overlay"
      >
        <div class="loading-spinner-box">
          <XpLoading />
          <span class="loading-text">Summoning Layout...</span>
        </div>
      </div>

      <!-- Action FABs -->
      <ion-fab
        v-if="hasLayout && !isLoading"
        vertical="top"
        horizontal="end"
        slot="fixed"
        class="mt-4"
      >
        <ion-fab-button
          color="danger"
          @click="resetFloor"
          size="small"
          title="Clear Current Floor"
        >
          <i class="fal fa-trash-alt"></i>
        </ion-fab-button>
        <ion-fab-button
          color="warning"
          @click="resetTempleToDefault"
          size="small"
          class="mt-2"
          title="Reset Temple to Factory Defaults"
        >
          <i class="fal fa-history"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="hasLayout && !isLoading"
        vertical="center"
        horizontal="end"
        slot="fixed"
      >
        <ion-fab-button
          :color="hasUnsavedChanges ? 'success' : 'medium'"
          @click="saveTemple"
          :class="{ 'faded-fab': !hasUnsavedChanges }"
        >
          <i class="fal fa-save"></i>
        </ion-fab-button>
      </ion-fab>

      <!-- Floor Switcher FAB -->
      <ion-fab
        v-if="hasLayout && floors.length > 0 && !isLoading"
        vertical="bottom"
        horizontal="end"
        slot="fixed"
      >
        <ion-fab-button
          color="rpg"
          class="floor-fab-trigger"
        >
          <span class="floor-label">{{ currentLevelId }}</span>
        </ion-fab-button>

        <!-- Floor Selection List -->
        <ion-fab-list
          side="top"
          v-if="floors.length > 1"
        >
          <ion-fab-button
            v-for="floor in floors"
            :key="floor"
            @click="setLevel(floor)"
            class="floor-fab-option"
            :color="currentLevelId === floor ? 'primary' : 'light'"
          >
            <span class="floor-label-small">{{ floor }}</span>
          </ion-fab-button>
        </ion-fab-list>

        <!-- Add Floor Action -->
        <ion-fab-list side="start">
          <ion-fab-button
            color="success"
            @click="promptAddFloor"
          >
            <i class="fal fa-plus"></i>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
      <!-- JSON Editor FAB -->
      <ion-fab
        v-if="hasLayout && !isLoading"
        vertical="bottom"
        horizontal="start"
        slot="fixed"
        class="mb-4"
      >
        <ion-fab-button
          color="primary"
          @click="isJsonEditorOpen = true"
          size="small"
        >
          <i class="fad fa-brackets-curly"></i>
        </ion-fab-button>
      </ion-fab>

      <!-- Maze Config Trigger FAB -->
      <ion-fab
        v-if="hasLayout && !isLoading"
        vertical="bottom"
        horizontal="start"
        slot="fixed"
        class="ml-12 mb-4"
      >
        <ion-fab-button
          color="secondary"
          @click="showMazeConfig = !showMazeConfig"
          size="small"
        >
          <i class="fad fa-list-ul"></i>
        </ion-fab-button>
      </ion-fab>

      <!-- JSON Editor Modal -->
      <XpJsonEditorModal
        v-if="templeData"
        :is-open="isJsonEditorOpen"
        :initial-data="templeData.temple.value"
        @close="isJsonEditorOpen = false"
        @apply="handleJsonApply"
      />

    </ion-content>

    <!-- Add Floor Modal -->
    <ion-modal
      :is-open="showAddFloorModal"
      class="add-floor-modal"
      @didDismiss="showAddFloorModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Expand Temple</h2>
          <ion-button
            fill="clear"
            @click="showAddFloorModal = false"
          ><i class="fas fa-times"></i></ion-button>
        </div>

        <div class="level-choice-container">
          <!-- Build Up -->
          <div
            class="level-choice-card surface"
            @click="confirmAddFloor(nextFloorOptions.surface)"
          >
            <div class="icon-box">
              <i class="fad fa-clouds"></i>
            </div>
            <div class="choice-info">
              <div class="choice-title">Build Up</div>
            </div>
            <div class="action-group">
              <span class="floor-name">{{ nextFloorOptions.surface }}</span>
              <i class="fas fa-arrow-up action-icon"></i>
            </div>
          </div>

          <div class="choice-divider">or</div>

          <!-- Dig Down -->
          <div
            class="level-choice-card basement"
            @click="confirmAddFloor(nextFloorOptions.basement)"
          >
            <div class="icon-box">
              <i class="fad fa-dungeon"></i>
            </div>
            <div class="choice-info">
              <div class="choice-title">Dig Down</div>
            </div>
            <div class="action-group">
              <span class="floor-name">{{ nextFloorOptions.basement }}</span>
              <i class="fas fa-arrow-down action-icon"></i>
            </div>
          </div>
        </div>

        <div
          class="custom-name-trigger"
          @click="promptCustomFloorName"
        >
          <span>Use a custom name instead...</span>
        </div>
      </div>
    </ion-modal>

    <!-- Quick Edit Popover -->
    <xp-temple-creator-popovers
      v-model="quickEditState"
      :room-icons="ROOM_ICONS"
      :dungeon-items="dungeonItems"
      @apply-type="applyQuickType"
      @apply-content="({ roomType, content, sides }) => applyRoomChanges(roomType, content, sides)"
      @clear="clearCellFromQuickEdit"
    />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, watch, ref, inject } from "vue";
import { useRoute } from "vue-router";
import { 
  IonPage, IonContent, IonButton, IonIcon, 
  IonFab, IonFabButton, IonFabList, IonModal,
  onIonViewWillEnter, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent
} from "@ionic/vue";
import { gridOutline } from 'ionicons/icons';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpTempleCreatorGrid from "../XpTempleCreator/XpTempleCreatorGrid.vue";
import XpTempleCreatorPopovers from "../XpTempleCreator/XpTempleCreatorPopovers.vue";
import { useTempleCreator } from "../XpTempleCreator/hooks";
import XpTempleCreatorHeader from "../XpTempleCreator/XpTempleCreatorHeader.vue";
import XpJsonEditorModal from "@/components/organisms/XpJsonEditor/XpJsonEditorModal.vue";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";

export default defineComponent({
  name: "xp-temple-layout",
  components: { 
    IonPage, IonContent, IonButton, IonIcon,
    IonFab, IonFabButton, IonFabList, IonModal,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    XpTempleCreatorGrid,
    XpTempleCreatorPopovers,
    XpLoading,
    XpTempleCreatorHeader,
    XpJsonEditorModal
  },
  setup() {
    const route = useRoute();
    const templeId = route.params.templeId as string;
    
    // Use the temple creator hook for full editing capabilities
    const creator = useTempleCreator({ templeId });
    
    // Inject templeData for JSON editor
    const templeData = inject(TempleDataInjectionKey, null);
    const isJsonEditorOpen = ref(false);
    const showMazeConfig = ref(false);

    // Initialize on mount
    onMounted(() => {
      creator.loadTempleLayout();
    });

    // Reload when page enters view (Ionic lifecycle)
    onIonViewWillEnter(() => {
      creator.loadTempleLayout();
    });

    // Watch for templeId changes
    watch(() => route.params.templeId, (newId) => {
      if (newId && typeof newId === 'string' && creator.store.templeId !== newId) {
        creator.store.templeId = newId;
        creator.loadTempleLayout();
      }
    });

    // Check if layout exists
    const hasLayout = computed(() => {
      const maze = creator.currentMazeSlice.value;
      return maze && maze.length > 0 && maze.some(row => row.some(cell => cell !== '____'));
    });

    // Initialize a new empty layout
    const initializeNewLayout = () => {
      creator.initializeGrid();
    };

    // Handle quick edit popover from context menu
    const showQuickEditPopover = (event: Event, row: number, col: number) => {
      creator.showQuickEditPopover(event, row, col);
    };
    
    // JSON Editor logic
    const handleJsonApply = async (jsonStr: string) => {
      if (templeData) {
        const result = await templeData.applyRawJson(jsonStr);
        if (result.success) {
          isJsonEditorOpen.value = false;
          // Trigger a reload of the layout in the creator hook
          creator.loadTempleLayout();
        }
      }
    };

    const formatRoomContent = (room: any) => {
      if (!room.content) return 'Standard room';
      if (room.type === 'monster') return `${room.content.difficulty || 'Normal'} difficulty`;
      if (room.type === 'loot') return room.content.chest === 'treasure' ? 'Treasure Chest' : 'Gold/Items';
      if (room.type === 'shop') return 'Active Shop';
      return 'Custom config';
    };

    const focusRoom = (token: string) => {
      // Find where this token exists in the maze and navigate to it?
      // For now, just close the config view and tell user we focused it
      showMazeConfig.value = false;
      creator.showToast(`Selected room ${token}`);
    };

    return {
      // State
      templeId,
      hasLayout,
      isLoading: creator.isLoading,
      showAddFloorModal: creator.showAddFloorModal,
      nextFloorOptions: creator.nextFloorOptions,
      quickEditState: creator.quickEditState,
      hasUnsavedChanges: creator.hasUnsavedChanges,
      
      // Grid data
      currentMazeSlice: creator.currentMazeSlice,
      roomsData: creator.roomsData,
      dynamicRoomIcons: creator.dynamicRoomIcons,
      selectedCell: creator.selectedCell,
      entrancePosition: creator.entrancePosition,
      currentLevelId: creator.currentLevelId,
      floors: creator.floors,
      
      // Header & Preview Props
      gridSize: creator.gridSize,
      templeName: creator.templeName,
      showPreview: creator.showPreview,
      entranceDisplay: creator.entranceDisplay,
      templeIcon: creator.templeIcon,
      templeCodePreview: creator.templeCodePreview,
      
      // Constants
      ROOM_ICONS: creator.ROOM_ICONS,
      SIDE_TYPE_INFO: creator.SIDE_TYPE_INFO,
      
      // Floor management
      promptAddFloor: creator.promptAddFloor,
      confirmAddFloor: creator.confirmAddFloor,
      promptCustomFloorName: creator.promptCustomFloorName,
      addFloor: creator.addFloor,
      removeFloor: creator.removeFloor,
      setLevel: creator.setLevel,
      
      // Grid management
      resizeGrid: creator.resizeGrid,
      
      // Cell/Room actions
      onCellClick: creator.onCellClick,
      showQuickEditPopover,
      applyQuickType: creator.applyQuickType,
      applyRoomChanges: creator.applyRoomChanges,
      clearCellFromQuickEdit: creator.clearCellFromQuickEdit,
      getRoomTypeIcon: (type: string) => (creator.ROOM_ICONS as any)[type] || 'fa-square',
      
      // Save/Load
      saveTemple: creator.saveTemple,
      copyToClipboard: creator.copyToClipboard,
      resetFloor: creator.resetFloor,
      resetTempleToDefault: creator.resetTempleToDefault,
      initializeNewLayout,
      dungeonItems: creator.dungeonItems,
      
      // JSON Editor
      templeData,
      isJsonEditorOpen,
      handleJsonApply,
      showMazeConfig,
      formatRoomContent,
      focusRoom,
      uniqueRooms: creator.uniqueRooms,
      
      // Icons
      gridOutline
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-temple-layout {
    --background: transparent;
  }

  .transparent-content {
    --background: transparent;
  }

  .editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
  }

  .grid-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    padding-bottom: 120px; // Space for FABs
    min-height: 0;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .loading-spinner-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .loading-text {
      font-family: "Apple Kid", sans-serif;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 1px;
    }
  }

  .empty-state-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    padding: 24px;
  }

  .glass-card {
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    text-align: center;

    &.empty-state {
      .empty-icon {
        font-size: 4rem;
        color: rgba(255, 255, 255, 0.3);
        margin-bottom: 20px;
      }

      h2 {
        font-family: var(--xp-font-heading);
        font-size: 1.2rem;
        color: white;
        margin: 0 0 10px;
      }

      p {
        color: rgba(255, 255, 255, 0.6);
        margin: 0 0 24px;
        line-height: 1.5;
      }
    }
  }

  /* Floor FAB Styling */
  .floor-fab-trigger {
    --background: var(--ion-color-rpg);
    --color: #fff;

    .floor-label {
      font-family: "Press Start 2P";
      font-size: 0.7rem;
      letter-spacing: 1px;
    }
  }

  .floor-fab-option {
    .floor-label-small {
      font-family: "StatusPlz";
      font-size: 0.8rem;
      font-weight: bold;
    }
  }

  .faded-fab {
    opacity: 0.5;
  }

  /* Add Floor Modal */
  .add-floor-modal {
    --width: 90%;
    --max-width: 400px;
    --height: auto;
    --border-radius: 24px;
    --background: transparent;

    &::part(content) {
      background: transparent;
    }
  }

  .modal-content {
    background: rgba(20, 20, 30, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    h2 {
      font-family: "Press Start 2P";
      font-size: 0.8rem;
      color: #fff;
      margin: 0;
    }

    ion-button {
      --color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }
  }

  .level-choice-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .level-choice-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.02);
      background: rgba(255, 255, 255, 0.1);
    }

    &.surface {
      border-color: rgba(64, 196, 255, 0.3);

      &:hover {
        border-color: #40c4ff;
        box-shadow: 0 0 20px rgba(64, 196, 255, 0.3);
      }

      .icon-box {
        background: rgba(64, 196, 255, 0.15);

        i {
          color: #40c4ff;
        }
      }

      .action-icon {
        color: #40c4ff;
      }
    }

    &.basement {
      border-color: rgba(179, 136, 255, 0.3);

      &:hover {
        border-color: #b388ff;
        box-shadow: 0 0 20px rgba(179, 136, 255, 0.3);
      }

      .icon-box {
        background: rgba(179, 136, 255, 0.15);

        i {
          color: #b388ff;
        }
      }

      .action-icon {
        color: #b388ff;
      }
    }

    .icon-box {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;

      i {
        font-size: 1.5rem;
      }
    }

    .choice-info {
      flex: 1;

      .choice-title {
        font-family: "Press Start 2P";
        font-size: 0.6rem;
        color: #fff;
        text-transform: uppercase;
      }
    }

    .action-group {
      display: flex;
      align-items: center;
      gap: 8px;

      .floor-name {
        font-family: "StatusPlz";
        font-size: 1.2rem;
        font-weight: bold;
        color: #fff;
      }

      .action-icon {
        font-size: 1rem;
      }
    }
  }

  .choice-divider {
    text-align: center;
    font-family: "StatusPlz";
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.3);
    padding: 8px 0;
  }

  .custom-name-trigger {
    text-align: center;
    padding: 16px;
    cursor: pointer;

    span {
      font-family: "StatusPlz";
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.4);
      text-decoration: underline;
      transition: color 0.2s;
    }

    &:hover span {
      color: var(--ion-color-primary);
    }
  }

  /* Maze Config Styles */
  .maze-config-card {
    background: rgba(25, 27, 46, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    margin: 16px;

    ion-card-title {
      font-family: var(--xp-font-heading);
      font-size: 1.4rem;
      color: #fff;
    }
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
      border-color: var(--ion-color-secondary);
    }

    .token-badge {
      font-family: "StatusPlz";
      font-size: 0.75rem;
      background: var(--ion-color-secondary);
      color: #000;
      padding: 4px 8px;
      border-radius: 6px;
      min-width: 50px;
      text-align: center;
      font-weight: bold;
    }

    .room-info {
      flex: 1;

      .type-row {
        display: flex;
        align-items: center;
        font-family: var(--xp-font-heading);
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .action-arrow {
      opacity: 0.3;
      font-size: 0.8rem;
    }
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    backdrop-filter: blur(5px);
  }
</style>
