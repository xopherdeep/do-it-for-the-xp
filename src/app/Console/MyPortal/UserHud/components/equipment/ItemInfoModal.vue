<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    @did-dismiss="$emit('close')"
    class="item-info-modal"
  >
    <div
      class="modal-content dialpad-modal icon-colors"
      v-if="item"
    >
      <div class="modal-header">
        <span class="header-spacer"></span>
        <span class="modal-title">{{ item.name }}</span>
        <xp-close-button
          size="lg"
          color="light"
          @click="dismiss"
        />
      </div>

      <div class="description-container">
        <div class="consolidated-meta-header">
          <div class="header-left">
            <div class="item-icon-wrapper">
              <i
                class="fad fa-4x"
                :class="`fa-${item.faIcon}`"
              ></i>
            </div>
          </div>
          <div class="header-right">
            <div class="meta-pill">
              <span class="label">TYPE</span>
              <span class="value">{{ item.mpCost ? 'Ability' : 'Special' }}</span>
            </div>
            <div
              v-if="!isBattle"
              class="meta-pill status"
              :class="{ equipped: isEquipped }"
            >
              <span class="label">{{ isEquipped ? 'Equipped' : 'Unequipped' }}</span>
              <i :class="isEquipped ? 'fad fa-check-circle' : 'fal fa-circle'"></i>
            </div>
          </div>
        </div>

        <!-- The lore is for the equip card; in a fight the card's effect line is the truth -->
        <div class="description-box" v-if="!isBattle">
          <p>{{ item.desc }}</p>
        </div>
      </div>

      <!-- Battle mode: what it does, what it costs and a Use button instead of the hand slots -->
      <div class="action-container battle-card" v-if="isBattle">
        <!-- An item with no fight use has one line, the reason; the effect row would repeat it -->
        <div class="battle-effect-row" v-if="!sameLine">
          <p class="battle-effect" data-cy="item-effect">{{ battleCard?.effect }}</p>
          <span class="mp-pill" data-cy="item-mp" v-if="battleCard && battleCard.mp > 0">{{ battleCard.mp }} MP</span>
        </div>
        <button
          class="use-btn"
          data-cy="item-use"
          :disabled="!canUse"
          @click.stop="handleUse"
        >
          Use
        </button>
        <p class="battle-reason" data-cy="item-reason" v-if="battleCard?.reason">{{ battleCard.reason }}</p>
      </div>

      <div class="action-container" v-else>
        <div class="slot-selection-row">
          <!-- LEFT SLOTS (L2, L1) -->
          <div class="hand-group left">
            <button
              v-for="idx in [1, 0]"
              :key="`l-${idx}`"
              class="slot-btn"
              :class="{ locked: idx > 0, active: isEquippedAt('left', idx), occupied: !!leftHandSlots[idx] && !isEquippedAt('left', idx) }"
              @click.stop="handleEquipAt('left', idx)"
              :disabled="idx > 0"
            >
              <i
                class="fad"
                :class="getSlotIcon('left', idx)"
              ></i>
              <span class="slot-label">L{{ idx + 1 }}</span>
            </button>
          </div>

          <!-- CENTER ACTION -->
          <div class="center-action">
            <div
              class="equip-status-label"
              :class="{ 'is-equipped': isEquipped }"
            >
              {{ isEquipped ? 'UNEQUIP' : 'EQUIP' }}
            </div>
          </div>

          <!-- RIGHT SLOTS (R1, R2) -->
          <div class="hand-group right">
            <button
              v-for="idx in [0, 1]"
              :key="`r-${idx}`"
              class="slot-btn"
              :class="{ locked: idx > 0, active: isEquippedAt('right', idx), occupied: !!rightHandSlots[idx] && !isEquippedAt('right', idx) }"
              @click.stop="handleEquipAt('right', idx)"
              :disabled="idx > 0"
            >
              <i
                class="fad"
                :class="getSlotIcon('right', idx)"
              ></i>
              <span class="slot-label">R{{ idx + 1 }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, watch } from 'vue';
import { IonModal } from '@ionic/vue';
import { EquipmentItem } from './EquipmentItems';
import type { BattleItemCard } from '@/lib/services/battle/BattleItems';
import { play$fx } from '@/assets/fx';
import XpCloseButton from '@/components/atoms/CloseButton/XpCloseButton.vue';

export default defineComponent({
  name: 'ItemInfoModal',
  components: { IonModal, XpCloseButton },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    item: {
      type: Object as PropType<EquipmentItem | null>,
      default: null
    },
    isEquipped: {
      type: Boolean,
      default: false
    },
    // Pass existing slots to check occupancy/active state
    leftHandSlots: {
      type: Array as PropType<(EquipmentItem | null)[]>,
      default: () => [null, null]
    },
    rightHandSlots: {
      type: Array as PropType<(EquipmentItem | null)[]>,
      default: () => [null, null]
    },
    // 'battle' swaps the hand slots for the card's effect, MP and a Use button
    mode: {
      type: String as PropType<'equip' | 'battle'>,
      default: 'equip'
    },
    battleCard: {
      type: Object as PropType<BattleItemCard | null>,
      default: null
    }
  },
  emits: ['close', 'equip', 'unequip', 'use'],
  setup(props, { emit }) {
    const modal = ref<any>(null);
    const isBattle = computed(() => props.mode === 'battle');
    const canUse = computed(() => !!props.battleCard && !props.battleCard.reason);
    // The effect and the reason are the same line ("Can't use that in a fight."): show it once, as the reason
    const sameLine = computed(() => !!props.battleCard?.reason && props.battleCard.reason === props.battleCard.effect);

    // One tap uses the item: a second tap before the card closes does nothing. A new card (another item,
    // or the same one opened again) starts fresh.
    const isBusy = ref(false);
    watch(() => props.item, () => { isBusy.value = false; });
    watch(() => props.isOpen, (open) => { if (open) isBusy.value = false; });
    const handleUse = () => {
      const isUseBlocked = isBusy.value || !canUse.value;
      if (isUseBlocked) return;
      isBusy.value = true;
      emit('use');
    };

    const dismiss = async () => {
      play$fx('no');
      await modal.value?.$el?.dismiss();
    };

    const isEquippedAt = (hand: string, index: number) => {
      const slots = hand === 'left' ? props.leftHandSlots : props.rightHandSlots;
      return slots[index]?.faIcon === props.item?.faIcon;
    };

    const handleEquipAt = (hand: string, index: number) => {
      const isLockedSlot = index > 0;
      if (isLockedSlot) return;
      
      if (isEquippedAt(hand, index)) {
        emit('unequip', props.item, hand, index);
      } else {
        emit('equip', props.item, hand, index);
      }
      dismiss();
    };

    const getSlotIcon = (hand: string, index: number) => {
      const isLockedSlot = index > 0;
      if (isLockedSlot) return 'fa-lock';
      const slots = hand === 'left' ? props.leftHandSlots : props.rightHandSlots;
      const itemInSlot = slots[index];
      if (itemInSlot) return `fa-${itemInSlot.faIcon}`;
      return 'fa-hand-holding-magic';
    };

    return {
      handleEquipAt,
      isEquippedAt,
      getSlotIcon,
      isBattle,
      canUse,
      sameLine,
      handleUse,
      modal,
      dismiss
    };
  }
});
</script>

<style lang="scss" scoped src="./_ItemInfoModal.scss" />
