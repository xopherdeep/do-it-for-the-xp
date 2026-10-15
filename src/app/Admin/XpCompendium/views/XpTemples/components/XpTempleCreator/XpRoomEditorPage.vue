<template>
  <ion-page class="xp-room-editor-page">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors transparent-header">
        <ion-buttons slot="start">
          <ion-button @click="goBack" class="back-btn">
            <i class="fas fa-chevron-left fa-lg"></i>
          </ion-button>
        </ion-buttons>
        <div class="header-content">
          <div class="room-icon-wrapper" :class="'type-' + roomData?.type">
            <i :class="['fad', dynamicRoomIcons[roomData?.type || 'empty']]"></i>
          </div>
          <div class="room-info">
            <div class="room-name">{{ capitalizedType }}</div>
            <div class="room-nav">
              <i class="fas fa-caret-left nav-arrow" :class="{ disabled: !canNavigate('prev') }"
                @click.stop="navigateRoom('prev')"></i>
              <span class="room-coords">{{ row }}x {{ col }}y</span>
              <i class="fas fa-caret-right nav-arrow" :class="{ disabled: !canNavigate('next') }"
                @click.stop="navigateRoom('next')"></i>
            </div>
          </div>
        </div>
        <ion-buttons slot="end">
          <ion-button @click="showLegendModal = true" class="help-btn" title="Room Legend">
            <i class="fas fa-question-circle fa-lg"></i>
          </ion-button>
          <ion-button @click="testFight" class="test-fight-header-btn" title="Test Fight">
            <i class="fas fa-gamepad fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding transparent-content" v-if="roomData">
      <div class="editor-container">
        <!-- Cardinal Layout Section -->
        <RoomCardinalLayout :room-data="roomData" :adjacent-rooms="adjacentRooms"
          :lock-on-enter="roomData?.content?.lockOnEnter || false" :get-door-icon="getDoorIcon"
          :get-door-class="getDoorClass" :get-adjacent-room-icon="getAdjacentRoomIcon"
          :get-adjacent-room-label="getAdjacentRoomLabel" :get-adjacent-room-type="getAdjacentRoomType"
          :room-icons="dynamicRoomIcons" @center-click="openTypeModal" @room-click="handleDoorClick"
          @door-toggle="toggleLock" />
      </div>

      <!-- Room Type Selection Modal -->
      <RoomTypeModal :is-open="showTypeModal" :step="modalStep" :selected-category="selectedCategory"
        :current-type="pickerType" @close="closeTypeModal" @back="backModalStep" @select-category="goToTypes"
        @select-type="selectType" @confirm="confirmConfig">
        <template #config-selector>
          <!-- Monster Config Selector -->
          <RoomMonsterConfigSelector :existing-configs="availableMonsterConfigs" @select="selectMonsterConfig" />
        </template>
        <template #config>
          <!-- Quest Room Configuration -->
          <RoomQuestConfig v-if="isQuestRoom" :holding="questHolding" :card="questCard" :dormant-text="dormantText"
            :lock-on-enter="roomData?.content?.lockOnEnter || false" :can-test-fight="canTestFight"
            @change-quest="openQuestPicker" @edit-quest="editQuest" @toggle-auto-lock="toggleAutoLock"
            @test-fight="testFight" />

          <!-- Monster Configuration (classic beast rooms) -->
          <RoomMonsterConfig v-else-if="isMonsterRoom" :selected-beasts="selectedBeastsData"
            :lock-on-enter="roomData?.content?.lockOnEnter || false" :is-boss="isBossRoom" :reward-index="rewardIndex"
            @open-beast-selector="openBeastSelector" @remove-beast="removeBeast" @toggle-auto-lock="toggleAutoLock"
            @update:reward-index="handleRewardIndexChange" @update:rewards="handleRewardsUpdate" />

          <!-- Loot Configuration -->
          <RoomLootConfig v-if="isLootRoom" :selected-chest-type="roomData?.content?.chest || ''"
            :selected-dungeon-item="roomData?.content?.dungeon || ''" :selected-items="roomData?.content?.items || []"
            :gold-amount="roomData?.content?.gold || 50" :is-mimic="roomData?.content?.isMimic || false"
            :mimic-type="roomData?.content?.mimicType || 'random'" :mimic-beast="mimicBeastData"
            @select-chest-type="selectChestType" @select-dungeon-item="selectDungeonItem"
            @toggle-consumable="selectConsumableItem" @update-gold="updateAmount" @toggle-mimic="toggleMimicHeader"
            @update-mimic="(checked) => { if (roomData?.content) roomData.content.isMimic = checked }"
            @select-mimic-type="selectMimicType" @open-mimic-selector="openMimicBeastSelector" />

          <!-- Dragon Egg Configuration -->
          <RoomEggConfig v-if="isEggRoom" :selected-pegasus-id="roomData?.content?.dungeon || ''"
            @select-pegasus="selectEggPegasus" />

          <!-- Travel Configuration -->
          <!-- Circles pair themselves: the controls appear only when pairing cannot guess -->
          <RoomTravelConfig v-if="isTravelRoom && travel.controls" :circle-hint="travel.circle" :floors="floors"
            :target-level="roomData?.content?.targetLevel || (automaticFloor ? '' : store.currentLevelId)"
            :automatic-floor="automaticFloor"
            :target-x="roomData?.content?.targetCoords?.x ?? 0" :target-y="roomData?.content?.targetCoords?.y ?? 0"
            @update:target-level="setTargetLevel" @update:target-x="(val) => setTargetCoord('x', val)"
            @update:target-y="(val) => setTargetCoord('y', val)" />
          <p v-else-if="isTravelRoom" class="circle-note">{{ travel.note }}</p>

          <!-- Shop Configuration -->
          <RoomShopConfig v-if="isShopRoom" :shops="allShops" :selected-shop-id="roomData?.content?.shopId || ''"
            @select-shop="selectShop" />
        </template>
      </RoomTypeModal>

      <!-- Quest picker: opens from the Quest room type and from Change quest -->
      <RoomQuestPicker :is-open="showQuestPicker" :rows="questRows" :quests="quests" :heroes="questHeroes"
        :theme="questTheme" :theme-info="questThemeInfo" :size="questSize"
        :selected-id="questSelectedId" :create-quest="createLibraryQuest" @close="closeQuestPicker"
        @confirm="pickQuest" />

      <div slot="fixed" class="map-fixed-wrapper">
        <RoomEditorMiniMap v-if="maze" :maze="maze" :current-row="rowIdx" :current-col="colIdx"
          @cell-click="navigateToCell" />
      </div>

      <RoomLegendModal :is-open="showLegendModal" @close="showLegendModal = false" />

      <!-- Floating Action Buttons -->
      <ion-fab vertical="top" horizontal="end" slot="fixed" class="mt-4">
        <ion-fab-button color="danger" @click="resetRoom" size="small">
          <i class="fal fa-trash-alt"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-fab vertical="center" horizontal="end" slot="fixed">
        <ion-fab-button :color="hasChanges ? 'success' : 'medium'" @click="saveAndGoBack"
          :class="{ 'faded-fab': !hasChanges }">
          <i class="fad fa-save fa-lg"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <XpLoading v-else />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch, ref, computed, toRef } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton,
  IonContent, onIonViewWillEnter,
  IonFab, IonFabButton, useIonRouter, toastController
} from '@ionic/vue';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { useUserStore } from '@/lib/store/stores/user';
import { freeBattleRoute } from '@/app/Console/BattleField/battle/battleContext';
import { dormantLine, questCardOf } from '@/lib/services/temples/questRoomPicker';
import { needsTravelControls, pairingNote, withRoomAt } from '@/lib/engine/core/dungeons/teleportPairing';

import { useTempleRoomEditor, useTempleRoomNavigation } from './hooks';

// Import components
import {
  RoomCardinalLayout,
  RoomTypeModal,
  RoomMonsterConfig,
  RoomMonsterConfigSelector,
  RoomQuestConfig,
  RoomQuestPicker,
  RoomLootConfig,
  RoomTravelConfig,
  RoomShopConfig,
  RoomEditorMiniMap,
  RoomLegendModal
} from './components';

export default defineComponent({
  name: 'XpRoomEditorPage',
  components: {
    IonPage, IonHeader, IonToolbar, IonButtons, IonButton,
    IonContent, IonFab, IonFabButton,
    RoomCardinalLayout, RoomTypeModal, RoomMonsterConfig, RoomMonsterConfigSelector, RoomQuestConfig, RoomQuestPicker,
    RoomLootConfig, RoomTravelConfig, RoomShopConfig,
    XpLoading,
    RoomEditorMiniMap,
    RoomLegendModal
  },
  props: {
    templeId: { type: String, required: true },
    // The floor the room is on; an old two-part address has none and keeps the floor the creator was on
    floor: { type: String, required: false },
    row: { type: String, required: true },
    col: { type: String, required: true }
  },
  setup(props) {
    // Injected from the router, so it has to be taken here and not inside a click handler
    const ionRouter = useIonRouter();
    const userStore = useUserStore();

    // Room Editor Hook
    const editor = useTempleRoomEditor({
      templeId: props.templeId,
      row: props.row,
      col: props.col
    });

    const showLegendModal = ref(false);

    // Stairs always ask where they lead. A circle asks only when pairing cannot guess (teleportPairing).
    const travel = computed(() => {
      const room = editor.roomData.value;
      if (room?.type !== 'teleport') return { controls: true, circle: false, note: '' };

      // The room on screen has not reached the store yet: count it as the circle it is
      const temple = withRoomAt(
        { maze: editor.store.templeMaze, rooms: editor.store.roomsData },
        editor.store.currentLevelId,
        [editor.rowIdx.value, editor.colIdx.value],
        room
      );
      return {
        controls: needsTravelControls(temple, editor.store.currentLevelId),
        circle: true,
        note: pairingNote(temple, editor.store.currentLevelId)
      };
    });

    // Stairs with no target climb to the neighbouring floor in play: say so, rather than showing the room's own floor
    const automaticFloor = computed(() => {
      const type = String(editor.roomData.value?.type ?? '');
      if (/^stairs[-_]up$/.test(type)) return 'Next floor (automatic)';
      if (/^stairs[-_]down$/.test(type)) return 'Previous floor (automatic)';
      return '';
    });

    // Room Navigation Hook
    const navigation = useTempleRoomNavigation({
      templeId: props.templeId,
      rowIdx: editor.rowIdx,
      colIdx: editor.colIdx,
      roomData: editor.roomData,
      saveToStore: editor.saveToStore,
      floor: toRef(props, 'floor')
    });

    // The quest room's card: the quest, or the live quest that fills a shipped template
    const questCard = computed(() => (editor.questRooms.heldRow.value ? questCardOf(editor.questRooms.heldRow.value) : null));
    const dormantText = computed(() => {
      const holding = editor.questRooms.holding.value;
      const isWaiting = holding.kind === 'template' && !holding.filler;
      return isWaiting ? dormantLine(holding.template, editor.allBeasts.value) : '';
    });

    // Initialize on mount
    onMounted(() => {
      editor.loadRoomData();
      editor.loadBestiary();
      editor.loadShops();
      editor.questRooms.loadQuests();
      navigation.updateAdjacency();
    });

    // Ionic lifecycle - reload when page enters view
    onIonViewWillEnter(async () => {
      const roomLoaded = editor.loadRoomData();
      editor.loadBestiary();
      editor.loadShops();
      editor.questRooms.loadQuests();
      navigation.updateAdjacency();

      // If we just came back from selecting beasts or editing the room's quest, re-open the config modal. The page
      // may have been rebuilt on the way back, so the room has to be loaded before the modal reads its type.
      await roomLoaded;
      if (editor.claimReturnToConfig()) {
        editor.openTypeModal();
      }
    });

    // Watch for coordinate changes (in-page navigation) and recalculate adjacency
    watch(
      [() => editor.rowIdx.value, () => editor.colIdx.value],
      () => {
        navigation.updateAdjacency();
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
      travel,
      automaticFloor,
      isShopRoom: editor.isShopRoom,
      isEggRoom: editor.isEggRoom, // NEW
      isQuestRoom: editor.isQuestRoom,
      pickerType: editor.pickerType,
      floors: editor.floors,
      selectedBeastsData: editor.selectedBeastsData,
      mimicBeastData: editor.mimicBeastData,
      allShops: editor.allShops,
      selectShop: editor.selectShop,

      // Quest rooms
      showQuestPicker: editor.questRooms.showPicker,
      quests: editor.questRooms.quests,
      questRows: editor.questRooms.rows,
      questHeroes: editor.questRooms.heroes,
      questTheme: editor.questRooms.theme,
      questThemeInfo: editor.questRooms.themeInfo,
      questSize: editor.questRooms.size,
      questHolding: editor.questRooms.holding,
      questSelectedId: editor.questRooms.selectedId,
      questCard,
      dormantText,
      canTestFight: editor.questRooms.canTestFight,
      openQuestPicker: editor.questRooms.openPicker,
      closeQuestPicker: editor.questRooms.closePicker,
      pickQuest: editor.questRooms.selectQuest,
      createLibraryQuest: editor.questRooms.createLibraryQuest,
      editQuest: editor.editQuest,

      // Editor Methods
      selectEggPegasus: editor.selectEggPegasus, // NEW
      openTypeModal: editor.openTypeModal,
      closeTypeModal: editor.closeTypeModal,
      goToTypes: editor.showRoomTypes,
      selectType: editor.selectType,
      selectMonsterConfig: editor.selectMonsterConfig,
      availableMonsterConfigs: editor.availableMonsterConfigs,
      backModalStep: editor.prevModalStep,
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

      // Reward handling for monster rooms
      rewardIndex: computed(() => {
        // Convert room.content.xp back to fibonacci index
        const fibonacciArray = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
        const xp = editor.roomData.value?.content?.xp || 0;
        const difficulty = Math.round(xp / 100) || 5; // Default to 5 (moderate)
        const index = fibonacciArray.indexOf(difficulty);
        return index >= 0 ? index : 3; // Default to index 3 (difficulty 5)
      }),
      handleRewardIndexChange: (_index: number) => {
        // This is handled via update:rewards, but we can store the index if needed
      },
      handleRewardsUpdate: (rewards: { xp: number; gp: number; ap: number; difficulty: number }) => {
        if (editor.roomData.value?.content) {
          editor.roomData.value.content.xp = rewards.xp;
          editor.roomData.value.content.gp = rewards.gp;
          editor.roomData.value.content.ap = rewards.ap;
        }
      },

      // Test Fight - Navigate to battle with configured beasts (a quest room fights its quest's beast)
      testFight: async () => {
        const beastIds = editor.isQuestRoom.value
          ? await editor.questRooms.loadTestFightBeastIds()
          : editor.roomData.value?.content?.beasts || [];
        if (beastIds.length === 0) return;

        // The battle belongs to a hero (rewards and the HUD read it), so a profile must be chosen
        const heroId = userStore.currentUser.id;
        if (!heroId) {
          const toast = await toastController.create({
            message: 'Choose a profile first',
            duration: 2000,
            position: 'top',
            color: 'warning'
          });
          await toast.present();
          return;
        }

        ionRouter.push(freeBattleRoute(heroId, beastIds));
      },

      // From Navigation Hook
      adjacentRooms: navigation.adjacentRooms,
      canNavigate: navigation.canNavigate,
      navigateRoom: navigation.stepRoom,
      handleDoorClick: navigation.handleDoorClick,
      toggleLock: navigation.toggleLock,
      getDoorIcon: navigation.getDoorIcon,
      getDoorClass: navigation.getDoorClass,
      getAdjacentRoomIcon: navigation.getAdjacentRoomIcon,
      getAdjacentRoomLabel: navigation.getAdjacentRoomLabel,
      getAdjacentRoomType: navigation.getAdjacentRoomType,
      goBack: navigation.stepBack,

      // Save and go back
      saveAndGoBack: async () => {
        await editor.saveToStore();
        navigation.stepBack();
      },

      // Mini-map navigation
      navigateToCell: ({ row, col }: { row: number; col: number }) => {
        // Save current room first, then navigate
        editor.saveToStore();
        // Use navigation hook's navigateRoom pattern with noAnimation
        navigation.selectCell(row, col);
      },

      showLegendModal
    };
  }
});
</script>

<style lang="scss" scoped>
// The config slot is shown inside the type modal, which Ionic may move out of the page
.circle-note {
  margin: 12px 0 0;
  font-family: "StatusPlz";
  font-size: 1rem;
  color: #40c4ff;
}

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

  .help-btn {
    --color: rgba(255, 255, 255, 0.6);
    transition: all 0.2s;

    &:hover {
      --color: var(--ion-color-secondary);
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
