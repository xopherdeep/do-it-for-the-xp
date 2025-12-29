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

    <!-- <ion-content class="icon-colors bg-slide bg-slide-modal"> -->
    <ion-content class="icon-colors bg-slide bg-slide-dark">
      <ion-grid>
        <ion-row>
          <ion-col size="12" class="ion-flex ion-flex-column">
            <equipment-grid
              :items="specialItems"
              :equipped-items="equippedItemsArray"
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
      @close="closeItemInfo"
      @equip="handleEquipFromModal"
      @unequip="handleUnequipFromModal"
    />

    <!-- Class Selector Modal -->
    <xp-stat-selector-modal
      :is-open="classSelectorOpen"
      title="Choose Your Class"
      :options="classOptions"
      :columns="2"
      :fullscreen="false"
      height="55vh"
      :selected-value="user?.jobClass || 'Adventurer'"
      @close="classSelectorOpen = false"
      @select="onClassSelect"
    />
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { useEquipmentItems, EquipmentItem } from "./equipment/EquipmentItems";
  import EquipmentGrid from "./equipment/EquipmentGrid.vue";
  import EquippedItemsCard from "./equipment/EquippedItemsCard.vue";
  import ItemInfoModal from "./equipment/ItemInfoModal.vue";
  import XpStatSelectorModal from "./XpStatSelectorModal.vue";
  import { toastController } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { JOB_CLASS_OPTIONS } from "@/constants";
  import { useUserStore } from "@/lib/store/stores/user";

  export default defineComponent({
    name: "xp-equipment-modal",
    components: {
      EquipmentGrid,
      EquippedItemsCard,
      ItemInfoModal,
      XpStatSelectorModal,
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
    },
    emits: ["close", "equip-item", "open-pegasus-modal"],
    mixins: [ionic],
    setup(props, { emit }) {
      const equipmentItems = useEquipmentItems({
        onOpenPegasusModal: () => emit("open-pegasus-modal"),
      });
      const userStore = useUserStore();
      const modal = ref<any>(null);

      // Class selector state
      const classSelectorOpen = ref(false);
      const classOptions = JOB_CLASS_OPTIONS;

      // Item Info Modal state
      const itemInfoOpen = ref(false);
      const selectedItem = ref<EquipmentItem | null>(null);

      // Equipment slots
      const leftHandSlots = ref<(EquipmentItem | null)[]>([null, null]);
      const rightHandSlots = ref<(EquipmentItem | null)[]>([null, null]);
      const equippedItems = ref(new Set<string>());

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

      const openItemInfo = (item: EquipmentItem) => {
        selectedItem.value = item;
        itemInfoOpen.value = true;
      };

      const closeItemInfo = () => {
        itemInfoOpen.value = false;
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
        if (item === null && !hand) return;

        if (item) {
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

      const onClassSelect = (val: string) => {
        if (props.user?.id && userStore.users[props.user.id]) {
          userStore.users[props.user.id].jobClass = val;
        }
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
        isSelectedItemEquipped,
        leftHandSlots,
        rightHandSlots,
        openItemInfo,
        closeItemInfo,
        handleEquipFromModal,
        handleUnequipFromModal,
        handleEquipRequest,
        equipItem,
        close,
        classSelectorOpen,
        classOptions,
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
