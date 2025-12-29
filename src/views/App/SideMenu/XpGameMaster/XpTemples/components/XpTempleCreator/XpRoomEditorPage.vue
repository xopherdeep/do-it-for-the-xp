<template>
  <ion-page class="xp-room-editor-page">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors transparent-header">
        <ion-buttons slot="start">
          <ion-button
            @click="goBack"
            class="back-btn"
          >
            <i class="fas fa-chevron-left fa-lg"></i>
          </ion-button>
        </ion-buttons>
        <div class="header-content">
          <div
            class="room-icon-wrapper"
            :class="'type-' + roomData?.type"
          >
            <i :class="['fad', dynamicRoomIcons[roomData?.type || 'empty']]"></i>
          </div>
          <div class="room-info">
            <div class="room-name">{{ capitalizedType }}</div>
            <div class="room-nav">
              <i
                class="fas fa-caret-left nav-arrow"
                :class="{ disabled: !canNavigate('prev') }"
                @click.stop="navigateRoom('prev')"
              ></i>
              <span class="room-coords">{{ row }}x {{ col }}y</span>
              <i
                class="fas fa-caret-right nav-arrow"
                :class="{ disabled: !canNavigate('next') }"
                @click.stop="navigateRoom('next')"
              ></i>
            </div>
          </div>
        </div>
        <ion-buttons slot="end">
          <ion-button
            @click="testFight"
            class="test-fight-header-btn"
            title="Test Fight"
          >
            <i class="fas fa-gamepad fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding transparent-content">
      <div
        v-if="roomData"
        class="editor-container"
      >
        <!-- Cardinal Layout Section -->
        <RoomCardinalLayout
          :room-data="roomData"
          :adjacent-rooms="adjacentRooms"
          :lock-on-enter="roomData?.content?.lockOnEnter || false"
          :get-door-icon="getDoorIcon"
          :get-door-class="getDoorClass"
          :get-adjacent-room-icon="getAdjacentRoomIcon"
          :get-adjacent-room-label="getAdjacentRoomLabel"
          :get-adjacent-room-type="getAdjacentRoomType"
          :room-icons="dynamicRoomIcons"
          @center-click="openTypeModal"
          @room-click="handleDoorClick"
          @door-toggle="toggleLock"
        />
      </div>
      <div
        v-else
        class="loading-container"
      >
        <XpLoading />
        <p>Loading Room Data...</p>
      </div>

      <!-- Room Type Selection Modal -->
      <RoomTypeModal
        :is-open="showTypeModal"
        :step="modalStep"
        :selected-category="selectedCategory"
        :current-type="roomData?.type || ''"
        @close="closeTypeModal"
        @back="backModalStep"
        @select-category="goToTypes"
        @select-type="selectType"
        @confirm="confirmConfig"
      >
        <template #config>
          <!-- Monster Configuration -->
          <RoomMonsterConfig
            v-if="isMonsterRoom"
            :selected-beasts="selectedBeastsData"
            :lock-on-enter="roomData?.content?.lockOnEnter || false"
            :is-boss="isBossRoom"
            @open-beast-selector="openBeastSelector"
            @remove-beast="removeBeast"
            @toggle-auto-lock="toggleAutoLock"
          />

          <!-- Loot Configuration -->
          <RoomLootConfig
            v-if="isLootRoom"
            :selected-chest-type="roomData?.content?.chest || ''"
            :selected-dungeon-item="roomData?.content?.dungeon || ''"
            :selected-items="roomData?.content?.items || []"
            :gold-amount="roomData?.content?.gold || 50"
            :is-mimic="roomData?.content?.isMimic || false"
            :mimic-type="roomData?.content?.mimicType || 'random'"
            :mimic-beast="mimicBeastData"
            @select-chest-type="selectChestType"
            @select-dungeon-item="selectDungeonItem"
            @toggle-consumable="selectConsumableItem"
            @update-gold="updateAmount"
            @toggle-mimic="toggleMimicHeader"
            @update-mimic="(checked) => { if (roomData?.content) roomData.content.isMimic = checked }"
            @select-mimic-type="selectMimicType"
            @open-mimic-selector="openMimicBeastSelector"
          />

          <!-- Dragon Egg Configuration -->
          <RoomEggConfig
            v-if="isEggRoom"
            :selected-pegasus-id="roomData?.content?.dungeon || ''"
            @select-pegasus="selectEggPegasus"
          />

          <!-- Travel Configuration -->
          <RoomTravelConfig
            v-if="isTravelRoom"
            :floors="floors"
            :target-level="roomData?.content?.targetLevel || store.currentLevelId"
            :target-x="roomData?.content?.targetCoords?.x ?? 0"
            :target-y="roomData?.content?.targetCoords?.y ?? 0"
            @update:target-level="setTargetLevel"
            @update:target-x="(val) => setTargetCoord('x', val)"
            @update:target-y="(val) => setTargetCoord('y', val)"
          />

          <!-- Shop Configuration -->
          <RoomShopConfig
            v-if="isShopRoom"
            :shops="allShops"
            :selected-shop-id="roomData?.content?.shopId || ''"
            @select-shop="selectShop"
          />
        </template>
      </RoomTypeModal>



      <div
        slot="fixed"
        class="map-fixed-wrapper"
      >
        <RoomEditorMiniMap
          v-if="maze"
          :maze="maze"
          :current-row="rowIdx"
          :current-col="colIdx"
        />
      </div>

      <!-- Floating Action Buttons -->
      <ion-fab
        vertical="top"
        horizontal="end"
        slot="fixed"
        class="mt-4"
      >
        <ion-fab-button
          color="danger"
          @click="resetRoom"
          size="small"
        >
          <i class="fal fa-trash-alt"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        vertical="center"
        horizontal="end"
        slot="fixed"
      >
        <ion-fab-button
          :color="hasChanges ? 'success' : 'medium'"
          @click="saveAndGoBack"
          :class="{ 'faded-fab': !hasChanges }"
        >
          <i class="fal fa-save"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, 
  IonContent, onIonViewWillEnter,
  IonFab, IonFabButton, useIonRouter
} from '@ionic/vue';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

// Import hooks
import { useTempleRoomEditor, useTempleRoomNavigation } from './hooks';

// Import components
import { 
  RoomCardinalLayout, 
  RoomTypeModal, 
  RoomMonsterConfig, 
  RoomLootConfig, 
  RoomTravelConfig,
  RoomShopConfig,
  RoomEditorMiniMap 
} from './components';

export default defineComponent({
  name: 'XpRoomEditorPage',
  components: {
    IonPage, IonHeader, IonToolbar, IonButtons, IonButton, 
    IonContent, IonFab, IonFabButton,
    RoomCardinalLayout, RoomTypeModal, RoomMonsterConfig, RoomLootConfig, RoomTravelConfig, RoomShopConfig,
    XpLoading,
    RoomEditorMiniMap
  },
  props: {
    templeId: { type: String, required: true },
    row: { type: String, required: true },
    col: { type: String, required: true }
  },
  setup(props) {
    // Room Editor Hook
    const editor = useTempleRoomEditor({
      templeId: props.templeId,
      row: props.row,
      col: props.col
    });

    // Room Navigation Hook
    const navigation = useTempleRoomNavigation({
      templeId: props.templeId,
      rowIdx: editor.rowIdx,
      colIdx: editor.colIdx,
      roomData: editor.roomData,
      saveToStore: editor.saveToStore
    });

    // Initialize on mount
    onMounted(() => {
      editor.loadRoomData();
      editor.loadBestiary();
      editor.loadShops();
      navigation.calculateAdjacency();
    });
    
    // Ionic lifecycle - reload when page enters view
    onIonViewWillEnter(() => {
      editor.loadRoomData();
      editor.loadBestiary();
      editor.loadShops();
      navigation.calculateAdjacency();
      
      // If we just came back from selecting beasts, re-open the config modal
      if (editor.isReturningFromSelection.value) {
        editor.openTypeModal();
        editor.isReturningFromSelection.value = false;
      }
    });

    // Watch for coordinate changes (in-page navigation) and recalculate adjacency
    watch(
      [() => editor.rowIdx.value, () => editor.colIdx.value],
      () => {
        navigation.calculateAdjacency();
      }
    );

    return {
      // Constants
      dynamicRoomIcons: editor.dynamicRoomIcons,
      
      // From Editor Hook
      roomData: editor.roomData,
      store: editor.store,
      maze: editor.maze,
      rowIdx: editor.rowIdx,
      colIdx: editor.colIdx,
      showTypeModal: editor.showTypeModal,
      modalStep: editor.modalStep,
      selectedCategory: editor.selectedCategory,
      hasChanges: editor.hasChanges,
      capitalizedType: editor.capitalizedType,
      isMonsterRoom: editor.isMonsterRoom,
      isBossRoom: editor.isBossRoom,
      isLootRoom: editor.isLootRoom,
      isTravelRoom: editor.isTravelRoom,
      isShopRoom: editor.isShopRoom,
      isEggRoom: editor.isEggRoom, // NEW
      floors: editor.floors,
      selectedBeastsData: editor.selectedBeastsData,
      mimicBeastData: editor.mimicBeastData,
      allShops: editor.allShops,
      selectShop: editor.selectShop,
      
      // Editor Methods
      selectEggPegasus: editor.selectEggPegasus, // NEW
      openTypeModal: editor.openTypeModal,
      closeTypeModal: editor.closeTypeModal,
      goToTypes: editor.goToTypes,
      selectType: editor.selectType,
      backModalStep: editor.backModalStep,
      confirmConfig: editor.confirmConfig,
      toggleAutoLock: editor.toggleAutoLock,
      toggleMimicHeader: editor.toggleMimicHeader,
      selectMimicType: editor.selectMimicType,
      selectChestType: editor.selectChestType,
      selectDungeonItem: editor.selectDungeonItem,
      selectConsumableItem: editor.selectConsumableItem,
      updateAmount: (val: number) => {
        if (editor.roomData.value?.content) {
          editor.roomData.value.content.gold = val;
        }
      },
      setTargetCoord: editor.setTargetCoord,
      setTargetLevel: editor.setTargetLevel,
      openBeastSelector: editor.openBeastSelector,
      openMimicBeastSelector: editor.openMimicBeastSelector,
      removeBeast: editor.removeBeast,
      resetRoom: editor.resetRoom,
      
      // Test Fight - Navigate to battle with configured beasts
      testFight: () => {
        const beastIds = editor.roomData.value?.content?.beasts || [];
        if (beastIds.length === 0) return;
        
        const ionRouter = useIonRouter();
        // Navigate to battle field with the configured beasts
        ionRouter.push(`/battle-field?type=test&beastIds=${beastIds.join(',')}`);
      },
      
      // From Navigation Hook
      adjacentRooms: navigation.adjacentRooms,
      canNavigate: navigation.canNavigate,
      navigateRoom: navigation.navigateRoom,
      handleDoorClick: navigation.handleDoorClick,
      toggleLock: navigation.toggleLock,
      getDoorIcon: navigation.getDoorIcon,
      getDoorClass: navigation.getDoorClass,
      getAdjacentRoomIcon: navigation.getAdjacentRoomIcon,
      getAdjacentRoomLabel: navigation.getAdjacentRoomLabel,
      getAdjacentRoomType: navigation.getAdjacentRoomType,
      goBack: navigation.goBack,
      
      // Save and go back
      saveAndGoBack: async () => {
        await editor.saveToStore();
        navigation.goBack();
      }
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-room-editor-page {
    --background: transparent;

    .transparent-header {
      --background: transparent;
      --border-color: transparent;
    }

    .transparent-content {
      --background: transparent;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-left: 8px;

      .room-icon-wrapper {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        font-size: 1.6rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

        &.type-monster,
        &.type-boss,
        &.type-miniboss {
          color: #ff5252;
          background: rgba(255, 82, 82, 0.2);
          border-color: rgba(255, 82, 82, 0.4);
        }

        &.type-loot {
          color: #ffd740;
          background: rgba(255, 215, 64, 0.2);
          border-color: rgba(255, 215, 64, 0.4);
        }

        &.type-shop {
          color: #69f0ae;
          background: rgba(105, 240, 174, 0.2);
          border-color: rgba(105, 240, 174, 0.4);
        }

        &.type-teleport {
          color: #40c4ff;
          background: rgba(64, 196, 255, 0.2);
          border-color: rgba(64, 196, 255, 0.4);
        }
      }

      .room-info {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .room-name {
          font-family: "Press Start 2P";
          font-size: 0.7rem;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .room-coords {
          font-family: "StatusPlz";
          font-size: 0.9rem;
          color: var(--ion-color-primary);
          font-weight: bold;
          letter-spacing: 1px;
        }
      }
    }

    .back-btn {
      --color: #fff;
    }

    .reset-btn {
      --color: rgba(255, 255, 255, 0.4);
      transition: all 0.2s;

      &:hover {
        --color: var(--ion-color-danger);
        transform: scale(1.1);
      }
    }

    .test-fight-header-btn {
      --color: var(--ion-color-danger);
      transition: all 0.2s;

      i {
        font-size: 1.3rem;
      }

      &:hover {
        --color: #ff416c;
        transform: scale(1.1);
      }
    }
  }

  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding-bottom: 20px;
  }

  /* Header Navigation & Lock Toggle */
  .room-nav {
    display: flex;
    align-items: center;
    gap: 8px;

    .nav-arrow {
      font-size: 1.2rem;
      color: var(--ion-color-primary);
      cursor: pointer;
      padding: 4px;
      transition: all 0.2s;

      &:hover:not(.disabled) {
        transform: scale(1.2);
        color: var(--ion-color-primary-shade);
      }

      &.disabled {
        opacity: 0.2;
        cursor: not-allowed;
      }
    }
  }

  .header-trap-toggle {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    margin-left: 8px;

    i {
      font-size: 1.1rem;
      color: var(--ion-color-success);
      transition: all 0.2s;
    }

    span {
      display: none;
    }

    &.active {
      background: rgba(var(--ion-color-danger-rgb), 0.2);
      border-color: rgba(var(--ion-color-danger-rgb), 0.5);
      animation: pulse-danger 2s infinite;

      i {
        color: var(--ion-color-danger);
      }
    }

    &.mimic-trap {
      i {
        color: #ffd740;
      }

      &.active {
        background: rgba(255, 82, 82, 0.2);
        border-color: rgba(255, 82, 82, 0.5);

        i {
          color: #ff5252;
        }
      }
    }

    &:hover {
      transform: scale(1.05);
    }
  }

  .faded-fab {
    opacity: 0.5;
    filter: grayscale(1);
  }

  @keyframes pulse-danger {
    0% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 80%;
    gap: 25px;

    p {
      font-family: "Press Start 2P";
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 1px;
    }
  }


</style>
