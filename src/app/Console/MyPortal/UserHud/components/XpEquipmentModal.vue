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

    <ion-content class="icon-colors bg-slide bg-slide-equipment" :class="{ 'is-equip-mode': !isBattle }">
      <!-- Equip mode: the hands and the hero holding them stay on top while the bag scrolls under them -->
      <equipment-stage
        v-if="!isBattle"
        class="equipment-stage-bar"
        :left-item="leftHandSlots[0]"
        :right-item="rightHandSlots[0]"
        :look="user?.look"
        :job-class="user?.jobClass"
        :selected="selectedItem?.faIcon ?? null"
        :retro="isRetro"
        @select-hand="selectHand"
        @change-class="openClassSelector"
        @drop="onStageDrop"
      />
      <ion-grid>
        <ion-row>
          <ion-col size="12" class="ion-flex ion-flex-column">
            <equipment-grid
              :items="specialItems"
              :equipped-items="equippedItemsArray"
              :locked-items="lockedItemsArray"
              :lock-hint="lockHint"
              :no-drag="isBattle"
              :selected="isBattle ? null : selectedItem?.faIcon ?? null"
              :hand-of="handOf"
              :retro="isRetro"
              @display-info="openItemInfo"
              @equip-item="equipItem"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <!-- Equip mode: the card under the cursor, with a button per hand -->
    <ion-footer v-if="!isBattle" class="equipment-detail-footer icon-colors" :class="{ 'is-retro': isRetro }">
      <equipment-detail
        :item="infoItem"
        :held-in="selectedHand"
        :locked="isSelectedLocked"
        :lock-hint="selectedItem ? lockHint(selectedItem) : ''"
        :retro="isRetro"
        @equip="equipSelected"
        @unequip="unequipSelected"
      />
    </ion-footer>

    <div class="equipment-dock icon-colors" v-if="isBattle">
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

    <!-- The fight's item card: what it does now and a Use button -->
    <item-info-modal
      v-if="selectedItem && isBattle"
      :is-open="itemInfoOpen"
      :item="infoItem"
      :is-equipped="isSelectedItemEquipped"
      :left-hand-slots="leftHandSlots"
      :right-hand-slots="rightHandSlots"
      :mode="mode"
      :battle-card="selectedBattleCard"
      @close="closeItemInfo"
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
  import EquipmentStage from "./equipment/EquipmentStage.vue";
  import EquipmentDetail from "./equipment/EquipmentDetail.vue";
  import { useEquipHands } from "./equipment/useEquipHands";
  import { useGameStore } from "@/lib/store/stores/game";
  import ItemInfoModal from "./equipment/ItemInfoModal.vue";
  import XpClassCodex from "./ClassCodex/XpClassCodex.vue";
  import { toastController } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { useUserStore } from "@/lib/store/stores/user";
  import { play$fx } from "@/assets/fx";
  import { isItemUnlocked, unlockHintOf } from "@/lib/services/quests/ItemEffects";
  import type { BattleItemCard } from "@/lib/services/battle/BattleItems";
  import { describeItem, itemRule } from "@/lib/services/items/ItemRules";

  export default defineComponent({
    name: "xp-equipment-modal",
    components: {
      EquipmentGrid,
      EquippedItemsCard,
      EquipmentStage,
      EquipmentDetail,
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

      const isBattle = computed(() => props.mode === "battle");

      const gameStore = useGameStore();
      const isRetro = computed(() => gameStore.fabStyle === "retro");

      const specialItems = computed(() => equipmentItems.specialItems);

      // The hands as this screen edits them; each change goes to the page, which saves it
      const {
        leftHandSlots, rightHandSlots, equippedIcons: equippedItemsArray, setHandItem: performEquip, clearHandItem: performUnequip,
      } = useEquipHands(
        () => props.equipment as EquipmentItem[],
        () => specialItems.value,
        (item, hand, index) => emit("equip-item", item, hand, index)
      );
      const isEquippedIcon = (faIcon: string) => equippedItemsArray.value.includes(faIcon);
      const filled = (slots: (EquipmentItem | null)[]) => slots.filter((item) => item !== null) as EquipmentItem[];
      const equipmentOnLeft = computed(() => filled(leftHandSlots.value));
      const equipmentOnRight = computed(() => filled(rightHandSlots.value));

      /** The hand holding an item, for the tile's L / R badge and the card's Take off */
      const handOf = (faIcon: string): "left" | "right" | null => {
        const isInLeftHand = leftHandSlots.value[0]?.faIcon === faIcon;
        if (isInLeftHand) return "left";
        const isInRightHand = rightHandSlots.value[0]?.faIcon === faIcon;
        return isInRightHand ? "right" : null;
      };

      const isSelectedItemEquipped = computed(() => {
        if (!selectedItem.value) return false;
        return isEquippedIcon(selectedItem.value.faIcon);
      });

      // Items the hero has not unlocked yet (a profile without an unlockedItems list holds everything)
      const lockedItemsArray = computed(() =>
        specialItems.value
          .filter((item) => !isItemUnlocked(props.user, item.name))
          .map((item) => item.faIcon)
      );
      const isLocked = (item: EquipmentItem) => lockedItemsArray.value.includes(item.faIcon);
      const lockHint = (item: EquipmentItem) => unlockHintOf(item.name);

      const selectedHand = computed(() => {
        const item = selectedItem.value;
        return item ? handOf(item.faIcon) : null;
      });
      const isSelectedLocked = computed(() => {
        const item = selectedItem.value;
        return item ? isLocked(item) : false;
      });
      const catalogueEntry = (item: EquipmentItem) =>
        specialItems.value.find((entry) => entry.faIcon === item.faIcon) ?? item;

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
          const canUseDirectly = !isLocked(item) && props.opensDirectly(item);
          if (canUseDirectly) {
            emit("use-item", item);
            return;
          }
        } else {
          // Equip mode has no popup: the cursor moves to the tile and the card below shows it. A second tap on
          // the same tile equips it to a free hand; a locked tile shows as ??? with how it is earned
          const isSecondTap = selectedItem.value?.faIcon === item.faIcon;
          selectedItem.value = item;
          if (isLocked(item)) {
            play$fx("no");
            return;
          }
          const shouldQuickEquip = isSecondTap && !isEquippedIcon(item.faIcon);
          if (shouldQuickEquip) {
            void handleEquipRequest(item);
            return;
          }
          play$fx("cursor");
          return;
        }
        selectedItem.value = item;
        itemInfoOpen.value = true;
      };

      /** A hand tapped on the stage: the cursor goes to what it holds */
      const selectHand = (hand: "left" | "right") => {
        const held = (hand === "left" ? leftHandSlots : rightHandSlots).value[0];
        if (!held) {
          play$fx("no");
          return;
        }
        selectedItem.value = catalogueEntry(held);
        play$fx("cursor");
      };

      const equipInto = async (item: EquipmentItem, hand: "left" | "right") => {
        if (isLocked(item)) {
          await refuseLocked(item);
          return;
        }
        await performEquip(catalogueEntry(item), hand, 0);
      };
      const equipSelected = (hand: "left" | "right") => selectedItem.value && equipInto(selectedItem.value, hand);
      const unequipSelected = (hand: "left" | "right") => performUnequip(hand, 0);
      // A tile dragged onto a hand (a mouse; a phone taps the card's buttons)
      const onStageDrop = (item: EquipmentItem, hand: "left" | "right") => {
        selectedItem.value = catalogueEntry(item);
        return equipInto(item, hand);
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
          if (open) {
            // Equip mode opens with the cursor on the left hand's item, else the first item
            const shouldPlaceCursor = !isBattle.value && !selectedItem.value;
            if (shouldPlaceCursor) {
              const first = leftHandSlots.value[0] ?? rightHandSlots.value[0] ?? specialItems.value[0];
              selectedItem.value = first ? catalogueEntry(first) : null;
            }
            return;
          }
          itemInfoOpen.value = false;
          classSelectorOpen.value = false;
        }
      );

      // The card reads the rules table, not the text a hero's old copy of the item stored; the grid and the dock keep their items
      const infoItem = computed(() => {
        const item = selectedItem.value;
        if (!item) return null;
        return { ...item, desc: describeItem(item.name) ?? item.desc, mpCost: itemRule(item.name)?.mp ?? item.mpCost };
      });

      const selectedBattleCard = computed(() =>
        isBattle.value && props.battleCard && selectedItem.value ? props.battleCard(selectedItem.value) : null
      );

      const useSelectedItem = () => {
        if (!selectedItem.value) return;
        emit("use-item", selectedItem.value);
        closeItemInfo();
      };

      const handleEquipRequest = async (
        item: EquipmentItem | null,
        hand?: string,
        index?: number
      ) => {
        if (isBattle.value) return; // the hands are read-only in a fight
        const isUnequipWithoutHand = item === null && !hand;
        if (isUnequipWithoutHand) return;

        if (item) {
          const shouldRefuseLockedItem = isLocked(item) && !isEquippedIcon(item.faIcon);
          if (shouldRefuseLockedItem) {
            await refuseLocked(item);
            return;
          }
          const isEquipped = isEquippedIcon(item.faIcon);
          if (isEquipped) {
            // Already equipped - unequip it
            const leftIndex = leftHandSlots.value.findIndex((slot) => slot?.faIcon === item.faIcon);
            const rightIndex = rightHandSlots.value.findIndex((slot) => slot?.faIcon === item.faIcon);
            const isInLeftHand = leftIndex !== -1;
            if (isInLeftHand) await performUnequip("left", leftIndex);
            const isInRightHand = rightIndex !== -1;
            if (isInRightHand) await performUnequip("right", rightIndex);
            return;
          }

          const isHandSlotChosen = hand !== undefined && index !== undefined;
          if (isHandSlotChosen) {
            const isPrimarySlot = index === 0;
            if (isPrimarySlot) {
              await performEquip(item, hand, index);
            }
          } else {
            // Auto-equip logic: find first available primary slot
            const isLeftFree = leftHandSlots.value[0] === null;
            const isRightFree = rightHandSlots.value[0] === null;
            if (isLeftFree) {
              await performEquip(item, "left", 0);
            } else if (isRightFree) {
              await performEquip(item, "right", 0);
            } else {
              await performEquip(item, "left", 0); // Replace left by default
            }
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
        const heroId = props.user?.id;
        if (heroId) userStore.setJobClass(heroId, val);
        // The class screen celebrates first, then closes itself with `close`
      };

      return {
        equipmentItems,
        equipmentOnLeft,
        equipmentOnRight,
        specialItems,
        itemInfoOpen,
        selectedItem,
        infoItem,
        equippedItemsArray,
        lockedItemsArray,
        lockHint,
        isSelectedItemEquipped,
        leftHandSlots,
        rightHandSlots,
        isBattle,
        isRetro,
        handOf,
        selectedHand,
        isSelectedLocked,
        selectHand,
        equipSelected,
        unequipSelected,
        onStageDrop,
        selectedBattleCard,
        openItemInfo,
        closeItemInfo,
        useSelectedItem,
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

<style lang="scss" scoped src="./_XpEquipmentModal.scss"></style>
