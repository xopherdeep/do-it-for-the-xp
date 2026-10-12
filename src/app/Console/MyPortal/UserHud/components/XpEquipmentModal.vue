<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    @didDismiss="close"
    class="user-profile-modal xp-equipment-modal"
    :breakpoints="[0, 1]"
    :initialBreakpoint="1"
    :handle="false"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <div class="header-title-wrapper icon-colors">
            <i class="fad fa-dumbbell mr-2"></i>
            Equipment
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <xp-close-button size="lg" color="light" @click="dismiss" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="icon-colors bg-slide bg-slide-equipment">
      <ion-grid>
        <ion-row>
          <ion-col size="12" class="ion-flex ion-flex-column">
            <equipment-grid
              :items="specialItems"
              :equipped-items="equippedItemsArray"
              :locked-items="lockedItemsArray"
              :lock-hint="lockHint"
              :no-drag="isBattle"
              @display-info="openItemInfo"
              @equip-item="equipItem"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <div class="equipment-dock icon-colors">
      <equipped-items-card
        :equipment="equipment"
        :left-hand-items="equipmentOnLeft"
        :right-hand-items="equipmentOnRight"
        :job-class="user?.jobClass"
        :readonly="isBattle"
        @equip="handleEquipRequest"
        @select-item="openItemInfo"
        @change-class="openClassSelector"
      />
    </div>

    <!-- Item Info Modal - only mount when needed -->
    <item-info-modal
      v-if="selectedItem"
      :is-open="itemInfoOpen"
      :item="selectedItem"
      :is-equipped="isSelectedItemEquipped"
      :left-hand-slots="leftHandSlots"
      :right-hand-slots="rightHandSlots"
      :mode="mode"
      :battle-card="selectedBattleCard"
      @close="closeItemInfo"
      @equip="handleEquipFromModal"
      @unequip="handleUnequipFromModal"
      @use="useSelectedItem"
    />

    <!-- Class Codex: the full-screen class guide and picker -->
    <xp-class-codex
      :is-open="classSelectorOpen"
      :user="user"
      @close="classSelectorOpen = false"
      @chosen="onClassSelect"
    />
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, watch, PropType } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { useEquipmentItems, EquipmentItem } from "./equipment/EquipmentItems";
  import EquipmentGrid from "./equipment/EquipmentGrid.vue";
  import EquippedItemsCard from "./equipment/EquippedItemsCard.vue";
  import ItemInfoModal from "./equipment/ItemInfoModal.vue";
  import XpClassCodex from "./ClassCodex/XpClassCodex.vue";
  import { toastController } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { useUserStore } from "@/lib/store/stores/user";
  import { play$fx } from "@/assets/fx";
  import { isItemUnlocked, unlockHintOf } from "@/lib/services/quests/ItemEffects";
  import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

  export default defineComponent({
    name: "xp-equipment-modal",
    components: {
      EquipmentGrid,
      EquippedItemsCard,
      ItemInfoModal,
      XpClassCodex,
      XpCloseButton,
    },
    props: {
      isOpen: {
        type: Boolean,
        required: true,
      },
      equipment: {
        type: Array as () => EquipmentItem[],
        required: true,
      },
      user: {
        type: Object,
        default: () => ({}),
      },
      // 'battle' is the Goods bag in a fight: Use instead of Equip, hands read-only
      mode: {
        type: String as PropType<"equip" | "battle">,
        default: "equip",
      },
      // The fight page answers these, so the bag holds no battle rules
      battleCard: {
        type: Function as PropType<((item: EquipmentItem) => BattleItemCard | null) | null>,
        default: null,
      },
      opensDirectly: {
        type: Function as PropType<(item: EquipmentItem) => boolean>,
        default: () => false,
      },
    },
    emits: ["close", "equip-item", "open-pegasus-modal", "use-item"],
    mixins: [ionic],
    setup(props, { emit }) {
      const equipmentItems = useEquipmentItems({
        onOpenPegasusModal: () => emit("open-pegasus-modal"),
      });
      const userStore = useUserStore();
      const modal = ref<any>(null);

      // Class selector state
      const classSelectorOpen = ref(false);

      // Item Info Modal state
      const itemInfoOpen = ref(false);
      const selectedItem = ref<EquipmentItem | null>(null);

      // Equipment slots
      const leftHandSlots = ref<(EquipmentItem | null)[]>([null, null]);
      const rightHandSlots = ref<(EquipmentItem | null)[]>([null, null]);
      const equippedItems = ref(new Set<string>());

      const isBattle = computed(() => props.mode === "battle");

      // Equip mode keeps the hands it edits; battle mode only shows what the hero already holds
      watch(
        () => (isBattle.value ? (props.equipment as (EquipmentItem & { slotIndex?: number })[]) : null),
        (held) => {
          if (!held) return;
          const hands: Record<string, (EquipmentItem | null)[]> = { left: [null, null], right: [null, null] };
          equippedItems.value = new Set<string>();
          held.forEach((entry) => {
            const slots = hands[entry.hand ?? ""];
            const index = entry.slotIndex ?? 0;
            if (!slots || index > 1) return;
            slots[index] = equipmentItems.specialItems.find((item) => item.faIcon === entry.faIcon) ?? entry;
            equippedItems.value.add(entry.faIcon);
          });
          leftHandSlots.value = hands.left;
          rightHandSlots.value = hands.right;
        },
        { immediate: true, deep: true }
      );

      const equipmentOnLeft = computed(
        () =>
          leftHandSlots.value.filter((item) => item !== null) as EquipmentItem[]
      );

      const equipmentOnRight = computed(
        () =>
          rightHandSlots.value.filter(
            (item) => item !== null
          ) as EquipmentItem[]
      );

      const specialItems = computed(() => equipmentItems.specialItems);

      const equippedItemsArray = computed(() =>
        Array.from(equippedItems.value)
      );

      const isSelectedItemEquipped = computed(() => {
        if (!selectedItem.value) return false;
        return equippedItems.value.has(selectedItem.value.faIcon);
      });

      // Items the hero has not unlocked yet (a profile without an unlockedItems list holds everything)
      const lockedItemsArray = computed(() =>
        specialItems.value
          .filter((item) => !isItemUnlocked(props.user, item.name))
          .map((item) => item.faIcon)
      );
      const isLocked = (item: EquipmentItem) => lockedItemsArray.value.includes(item.faIcon);
      const lockHint = (item: EquipmentItem) => unlockHintOf(item.name);

      // A locked item says how it is earned instead of opening or equipping
      const refuseLocked = async (item: EquipmentItem) => {
        play$fx("no");
        const toast = await toastController.create({
          message: lockHint(item),
          duration: 2200,
          position: "top",
          cssClass: "rpg-toast",
        });
        await toast.present();
      };

      const openItemInfo = (item: EquipmentItem) => {
        if (isBattle.value) {
          // Bottles, Goods and the Book Of Spells open their own sheet on the fight page; a locked one
          // opens its card instead, where the page says why it cannot be used
          if (!isLocked(item) && props.opensDirectly(item)) {
            emit("use-item", item);
            return;
          }
        } else if (isLocked(item)) {
          void refuseLocked(item);
          return;
        }
        selectedItem.value = item;
        itemInfoOpen.value = true;
      };

      const closeItemInfo = () => {
        itemInfoOpen.value = false;
      };

      // The host can close the bag with a card or the codex still up (a beast's strike, hardware back,
      // leaving the view). Ionic does not dismiss nested modals with their parent, so close them here,
      // or they stay on screen cut off from the bag and the stale card pops up again next time
      watch(
        () => props.isOpen,
        (open) => {
          if (open) return;
          itemInfoOpen.value = false;
          classSelectorOpen.value = false;
        }
      );

      const selectedBattleCard = computed(() =>
        isBattle.value && props.battleCard && selectedItem.value ? props.battleCard(selectedItem.value) : null
      );

      const useSelectedItem = () => {
        if (!selectedItem.value) return;
        emit("use-item", selectedItem.value);
        closeItemInfo();
      };

      const handleEquipFromModal = async (
        item: EquipmentItem,
        hand: string,
        index: number
      ) => {
        await performEquip(item, hand, index);
      };

      const handleUnequipFromModal = async (
        item: EquipmentItem,
        hand: string,
        index: number
      ) => {
        await performUnequip(hand, index);
      };

      const handleEquipRequest = async (
        item: EquipmentItem | null,
        hand?: string,
        index?: number
      ) => {
        if (isBattle.value) return; // the hands are read-only in a fight
        if (item === null && !hand) return;

        if (item) {
          if (isLocked(item) && !equippedItems.value.has(item.faIcon)) {
            await refuseLocked(item);
            return;
          }
          if (equippedItems.value.has(item.faIcon)) {
            // Already equipped - unequip it
            const leftIndex = leftHandSlots.value.findIndex(
              (slot) => slot?.faIcon === item.faIcon
            );
            const rightIndex = rightHandSlots.value.findIndex(
              (slot) => slot?.faIcon === item.faIcon
            );
            if (leftIndex !== -1) await performUnequip("left", leftIndex);
            if (rightIndex !== -1) await performUnequip("right", rightIndex);
            return;
          }

          if (hand !== undefined && index !== undefined) {
            if (index === 0) {
              await performEquip(item, hand, index);
            }
          } else {
            // Auto-equip logic: find first available primary slot
            if (leftHandSlots.value[0] === null) {
              await performEquip(item, "left", 0);
            } else if (rightHandSlots.value[0] === null) {
              await performEquip(item, "right", 0);
            } else {
              await performEquip(item, "left", 0); // Replace left by default
            }
          }
        }
      };

      const performEquip = async (
        item: EquipmentItem,
        hand: string,
        index: number
      ) => {
        const targetSlots = hand === "left" ? leftHandSlots : rightHandSlots;
        let replacedItemName: string | null = null;

        // Check if already equipped elsewhere
        if (equippedItems.value.has(item.faIcon)) {
          const otherHand = hand === "left" ? "right" : "left";
          const otherSlots = hand === "left" ? rightHandSlots : leftHandSlots;
          const otherIndex = otherSlots.value.findIndex(
            (slot) => slot?.faIcon === item.faIcon
          );
          if (otherIndex !== -1) {
            await performUnequip(otherHand, otherIndex, false);
          }
        }

        // Check if replacing
        const currentItemInSlot = targetSlots.value[index];
        if (currentItemInSlot) {
          replacedItemName = currentItemInSlot.name;
          equippedItems.value.delete(currentItemInSlot.faIcon);
        }

        // Equip
        targetSlots.value[index] = { ...item };
        equippedItems.value.add(item.faIcon);
        emit("equip-item", targetSlots.value[index], hand, index);

        const message = replacedItemName
          ? `${replacedItemName} replaced with ${item.name}`
          : `${item.name} equipped to ${hand} hand`;
        const color = replacedItemName ? "warning" : "success";
        const toast = await toastController.create({
          message,
          duration: 2000,
          position: "bottom",
          color,
          cssClass: "rpg-toast",
        });
        await toast.present();
      };

      const performUnequip = async (
        hand: string,
        index: number,
        showToast = true
      ) => {
        const targetSlots = hand === "left" ? leftHandSlots : rightHandSlots;
        const itemToUnequip = targetSlots.value[index];

        if (itemToUnequip) {
          targetSlots.value[index] = null;
          equippedItems.value.delete(itemToUnequip.faIcon);
          emit("equip-item", null, hand, index);

          if (showToast) {
            const toast = await toastController.create({
              message: `${itemToUnequip.name} unequipped`,
              duration: 2000,
              position: "bottom",
              color: "medium",
              cssClass: "rpg-toast",
            });
            await toast.present();
          }
        }
      };

      const equipItem = (item: EquipmentItem) => {
        handleEquipRequest(item);
      };

      const close = () => {
        emit("close");
      };

      const dismiss = async () => {
        await modal.value?.$el?.dismiss();
      };

      const openClassSelector = () => {
        classSelectorOpen.value = true;
      };

      // The store refuses a sealed class and saves the hero
      const onClassSelect = (val: string) => {
        if (props.user?.id) userStore.setJobClass(props.user.id, val);
        classSelectorOpen.value = false;
      };

      return {
        equipmentItems,
        equipmentOnLeft,
        equipmentOnRight,
        specialItems,
        itemInfoOpen,
        selectedItem,
        equippedItemsArray,
        lockedItemsArray,
        lockHint,
        isSelectedItemEquipped,
        leftHandSlots,
        rightHandSlots,
        isBattle,
        selectedBattleCard,
        openItemInfo,
        closeItemInfo,
        useSelectedItem,
        handleEquipFromModal,
        handleUnequipFromModal,
        handleEquipRequest,
        equipItem,
        close,
        classSelectorOpen,
        openClassSelector,
        onClassSelect,
        modal,
        dismiss,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-equipment-modal {
    ion-header ion-toolbar {
      --background: #230828;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    ion-content {
      --background: transparent;
      overflow: visible;

      ion-grid {
        padding: 2.5%;
        padding-bottom: 120px; // Space for the dock
      }
    }

    .equipment-dock {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.05);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
      padding: 0.25rem 1rem;
      z-index: 100;
    }
  }
</style>
