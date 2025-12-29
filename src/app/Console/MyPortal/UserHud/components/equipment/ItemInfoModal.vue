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
              class="meta-pill status"
              :class="{ equipped: isEquipped }"
            >
              <span class="label">{{ isEquipped ? 'Equipped' : 'Unequipped' }}</span>
              <i :class="isEquipped ? 'fad fa-check-circle' : 'fal fa-circle'"></i>
            </div>
          </div>
        </div>

        <div class="description-box">
          <p>{{ item.desc }}</p>
        </div>
      </div>

      <div class="action-container">
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
import { defineComponent, PropType, ref } from 'vue';
import { IonModal } from '@ionic/vue';
import { EquipmentItem } from './EquipmentItems';
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
    }
  },
  emits: ['close', 'equip', 'unequip'],
  setup(props, { emit }) {
    const modal = ref<any>(null);

    const dismiss = async () => {
      play$fx('no');
      await modal.value?.$el?.dismiss();
    };

    const isEquippedAt = (hand: string, index: number) => {
      const slots = hand === 'left' ? props.leftHandSlots : props.rightHandSlots;
      return slots[index]?.faIcon === props.item?.faIcon;
    };

    const handleEquipAt = (hand: string, index: number) => {
      if (index > 0) return;
      
      if (isEquippedAt(hand, index)) {
        emit('unequip', props.item, hand, index);
      } else {
        emit('equip', props.item, hand, index);
      }
      dismiss();
    };

    const getSlotIcon = (hand: string, index: number) => {
      if (index > 0) return 'fa-lock';
      const slots = hand === 'left' ? props.leftHandSlots : props.rightHandSlots;
      const itemInSlot = slots[index];
      if (itemInSlot) return `fa-${itemInSlot.faIcon}`;
      return 'fa-hand-holding-magic';
    };

    return {
      handleEquipAt,
      isEquippedAt,
      getSlotIcon,
      modal,
      dismiss
    };
  }
});
</script>

<style lang="scss" scoped>
  .item-info-modal {
    --width: 95%;
    --max-width: 420px;
    --height: auto;
    --max-height: 85vh;
    --border-radius: 32px;
    --background: transparent;

    &::part(content) {
      background: transparent;
      border-radius: 32px;
    }
  }

  .modal-content {
    background: rgba(15, 15, 25, 0.85);
    backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 32px;
    padding: 28px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), inset 0 0 1px 1px rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 24px;
    letter-spacing: 2px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-spacer {
      width: 48px;
    }

    .modal-title {
      font-family: "Apple Kid", sans-serif;
      font-size: 2.2rem;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 5px;
      flex: 1;
      text-align: center;
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--ion-color-primary-rgb), 0.3);
    }

    .close-btn {
      --padding-start: 0;
      --padding-end: 0;
      margin: 0;
      width: 48px;
      height: 48px;
      --color: rgba(255, 255, 255, 0.5);
      transition: all 0.3s ease;

      &:hover {
        --color: #fff;
        transform: rotate(90deg) scale(1.1);
      }
    }
  }

  .item-showcase {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: 10px 0;

    .glow-effect {
      position: absolute;
      width: 160px;
      height: 160px;
      background: radial-gradient(circle, rgba(var(--ion-color-primary-rgb), 0.2) 0%, transparent 70%);
      z-index: 0;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: all 0.5s ease;
    }

    .item-icon-wrapper {
      width: 140px;
      height: 140px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 1;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);

      i {
        color: rgba(255, 255, 255, 0.85);
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
        transform: translateZ(0);
      }

      &:hover {
        transform: translateY(-5px) scale(1.02);
        border-color: rgba(255, 255, 255, 0.3);
      }
    }

    .mp-cost-badge {
      position: absolute;
      bottom: -5px;
      background: linear-gradient(135deg, #3880ff, #1e3a8a);
      color: #fff;
      padding: 8px 18px;
      border-radius: 14px;
      font-family: 'StatusPlz', sans-serif;
      font-size: 1.1rem;
      font-weight: 900;
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 2;
    }
  }

  .description-container {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .consolidated-meta-header {
      display: flex;
      align-items: stretch;
      gap: 10px;
      padding: 0 5px;

      .header-left {
        flex: 0 0 40%;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;

        .item-icon-wrapper {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 1rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
          position: relative;

          &::after {
            content: '';
            position: absolute;
            inset: -10px;
            background: radial-gradient(circle, rgba(var(--ion-color-primary-rgb), 0.2) 0%, transparent 70%);
            z-index: -1;
            pointer-events: none;
          }

          i {
            color: rgba(255, 255, 255, 0.85);
            filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
            transform: translateZ(0);
          }

          &:hover {
            transform: translateY(-5px) scale(1.05);
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);

            &::after {
              opacity: 1;
              transform: scale(1.2);
            }
          }
        }
      }

      .header-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
        justify-content: space-between;
      }

      .meta-pill {
        display: flex;
        flex: 1;
        align-items: center;
        width: 100%;
        justify-content: space-between;
        padding: 0 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-family: 'StatusPlz', sans-serif;
        text-transform: uppercase;
        font-size: 0.9rem;

        .label {
          opacity: 0.4;
          font-size: 0.75rem;
        }

        .value {
          color: var(--ion-color-primary);
          font-weight: 900;
        }

        &.status {
          color: rgba(255, 255, 255, 0.5);

          &.equipped {
            color: var(--ion-color-success);
            background: rgba(var(--ion-color-success-rgb), 0.1);
            border-color: rgba(var(--ion-color-success-rgb), 0.2);
          }
        }
      }
    }

    .description-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 20px;
      box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.4);

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.4rem;
        line-height: 1.2;
        font-family: 'Apple Kid', sans-serif;
        text-align: left;
      }

      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }
    }
  }

  .action-container {
    margin-top: 15px;
  }

  .slot-selection-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hand-group {
    display: flex;
    gap: 8px;
  }

  .center-action {
    flex: 1;
    text-align: center;

    .equip-status-label {
      font-family: 'StatusPlz', sans-serif;
      font-size: 1.4rem;
      letter-spacing: 2px;
      color: var(--ion-color-success);
      text-shadow: 0 0 10px rgba(var(--ion-color-success-rgb), 0.5);

      &.is-equipped {
        color: var(--ion-color-danger);
      }
    }
  }

  .slot-btn {
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
    position: relative;

    i {
      font-size: 1.2rem;
      margin-bottom: 2px;
      opacity: 0.6;
    }

    .slot-label {
      font-family: 'Twoson', sans-serif;
      font-size: 0.7rem;
      opacity: 0.4;
      font-weight: bold;
    }

    &:hover:not(.locked) {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-color: var(--ion-color-primary);
      transform: scale(1.1);

      i {
        opacity: 1;
        color: var(--ion-color-primary);
      }

      .slot-label {
        opacity: 1;
        color: var(--ion-color-primary);
      }
    }

    &.occupied {
      i {
        opacity: 0.8;
        color: var(--ion-color-secondary);
        filter: drop-shadow(0 0 5px rgba(var(--ion-color-secondary-rgb), 0.3));
      }
    }

    &.active {
      background: rgba(var(--ion-color-success-rgb), 0.15);
      border-color: var(--ion-color-success);
      box-shadow: 0 0 15px rgba(var(--ion-color-success-rgb), 0.3);

      i {
        color: var(--ion-color-success);
        opacity: 1;
      }

      .slot-label {
        color: var(--ion-color-success);
        opacity: 1;
      }
    }

    &.locked {
      background: rgba(0, 0, 0, 0.3);
      border-style: dashed;
      cursor: not-allowed;
      opacity: 0.3;

      i {
        color: #555;
      }
    }
  }
</style>
