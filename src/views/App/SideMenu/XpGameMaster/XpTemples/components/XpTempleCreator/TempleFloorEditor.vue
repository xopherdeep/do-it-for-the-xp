<template>
  <ion-page :class="$options.name">
    <xp-temple-creator-header
      v-model:gridSize="gridSize"
      v-model:currentLevelId="currentLevelId"
      :temple-id="templeId"
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

    <ion-content class="transparent-content">
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
        <!-- Temple Header above the grid -->
        <div class="temple-header">
          <i :class="[templeIcon, 'temple-header-icon']"></i>
          <span class="temple-header-name">{{ templeName }}</span>
        </div>

        <!-- Centered Grid Container -->
        <div class="grid-wrapper">
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

      <!-- Action FABs -->
      <ion-fab
        vertical="bottom"
        horizontal="start"
        slot="fixed"
      >
        <ion-fab-button
          color="danger"
          @click="resetFloor"
        >
          <i class="fal fa-trash-alt"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        vertical="bottom"
        horizontal="center"
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

      <!-- Floating Floor Switcher & Actions -->
      <ion-fab
        vertical="bottom"
        horizontal="end"
        slot="fixed"
        v-if="floors.length > 0"
      >
        <ion-fab-button
          color="rpg"
          class="floor-fab-trigger"
        >
          <span class="floor-label">{{ currentLevelId }}</span>
        </ion-fab-button>

        <!-- Floor Selection List (Up) -->
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

        <!-- Add Floor Action (Left) -->
        <ion-fab-list side="start">
          <ion-fab-button
            color="success"
            @click="promptAddFloor"
          >
            <i class="fal fa-plus"></i>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
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
          <!-- Go Closer to Surface (e.g. 2F) -->
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

          <!-- Divider -->
          <div class="choice-divider">or</div>

          <!-- Go Deeper (e.g. B1) -->
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

    <!-- Quick Edit Popover (Reimagined Context Menu) -->
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
import { defineComponent, onMounted, watch } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import ionic from "@/mixins/ionic";
import XpTempleCreatorHeader from "./XpTempleCreatorHeader.vue";
import XpTempleCreatorGrid from "./XpTempleCreatorGrid.vue";
import XpTempleCreatorPopovers from "./XpTempleCreatorPopovers.vue";
import { useTempleCreator } from "./hooks";

export default defineComponent({
  props: ["templeId"],
  name: "temple-floor-editor",
  mixins: [ionic],
  components: {
    XpTempleCreatorHeader,
    XpTempleCreatorGrid,
    XpTempleCreatorPopovers
  },

  setup(props) {
    // Use the temple creator hook
    const creator = useTempleCreator({
      templeId: props.templeId
    });

    // Initialize on mount
    onMounted(() => {
      creator.loadTempleLayout();
    });

    // Ionic lifecycle - reload when page enters view
    onIonViewWillEnter(() => {
      creator.loadTempleLayout();
    });

    // Sync templeId prop changes
    watch(() => props.templeId, (newId) => {
      if (newId && creator.store.templeId !== newId) {
        creator.store.templeId = newId;
        creator.loadTempleLayout();
      }
    });

    return {
      // State
      showPreview: creator.showPreview,
      showAddFloorModal: creator.showAddFloorModal,
      nextFloorOptions: creator.nextFloorOptions,
      quickEditState: creator.quickEditState,
      
      // Computed
      gridSize: creator.gridSize,
      templeName: creator.templeName,
      entrancePosition: creator.entrancePosition,
      templeMaze: creator.templeMaze,
      roomsData: creator.roomsData,
      selectedCell: creator.selectedCell,
      currentLevelId: creator.currentLevelId,
      floors: creator.floors,
      currentMazeSlice: creator.currentMazeSlice,
      templeIcon: creator.templeIcon,
      dynamicRoomIcons: creator.dynamicRoomIcons,
      entranceDisplay: creator.entranceDisplay,
      templeCodePreview: creator.templeCodePreview,
      hasUnsavedChanges: creator.hasUnsavedChanges,
      
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
      
      // Cell/Room management
      applyRoomChanges: creator.applyRoomChanges,
      
      // Quick edit
      showQuickEditPopover: creator.showQuickEditPopover,
      applyQuickEdit: creator.applyQuickEdit,
      applyQuickType: creator.applyQuickType,
      clearCellFromQuickEdit: creator.clearCellFromQuickEdit,
      openBeastSelectorForQuickEdit: creator.openBeastSelectorForQuickEdit,
      
      // Navigation
      navigateToRoomEditor: creator.navigateToRoomEditor,
      onCellClick: creator.onCellClick,
      
      // Save/Load
      saveTemple: creator.saveTemple,
      copyToClipboard: creator.copyToClipboard,
      resetFloor: creator.resetFloor,
      dungeonItems: creator.dungeonItems
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-temple-creator {
    --background: transparent;
  }

  .tab-content {
    padding: 16px;
  }

  .preview-container {
    background: #1a1a2e;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .code-preview {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.75rem;
    color: #a9dc76;
    margin: 0;
    white-space: pre;
  }

  .editor-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .grid-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    min-height: 0;
    /* Allow shrinking for scroll */
  }

  /* Temple Header above grid */
  .temple-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .temple-header-icon {
      font-size: 1.4rem;
      color: var(--ion-color-primary);
      text-shadow: 0 0 8px var(--ion-color-primary-shade);
    }

    .temple-header-name {
      font-family: "Press Start 2P";
      font-size: 0.75rem;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 1px;
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
</style>
