<template>
  <div class="icon-colors equipped-loadout">
    <!-- Wings Layout: Equipment Loadout -->
    <div class="loadout-organism">
      
      <!-- LEFT WING: Equipment Slots -->
      <div class="loadout-wing left">
        <div
          v-for="(_, index) in slotsPerWing"
          :key="`left-${index}`"
          @drop="drop($event, 'left', index)"
          @dragover="allowDrop"
          class="equipment-slot"
          :class="{
            'is-locked': index > 0,
            'has-item': leftSlots[index] && index === 0
          }"
          @click="handleSlotClick(leftSlots[index], index)"
        >
          <div class="slot-inner">
            <i
              v-if="leftSlots[index] && index === 0"
              :class="`fa-${leftSlots[index].faIcon}`"
              class="fad fa-2x item-icon"
            ></i>
            <div v-else-if="index === 0" class="slot-placeholder">
              <i class="fad fa-plus"></i>
            </div>
            <div v-else class="slot-lock">
              <i class="fad fa-lock"></i>
            </div>
          </div>
          <div class="slot-glow" v-if="leftSlots[index] && index === 0"></div>
        </div>
      </div>

      <!-- CENTER: Class Icon -->
      <div class="loadout-center">
        <div class="class-icon-wrapper" @click="$emit('change-class')">
          <i class="fad fa-3x" :class="classIcon"></i>
        </div>
      </div>

      <!-- RIGHT WING: Equipment Slots -->
      <div class="loadout-wing right">
        <div
          v-for="(_, index) in slotsPerWing"
          :key="`right-${index}`"
          @drop="drop($event, 'right', index)"
          @dragover="allowDrop"
          class="equipment-slot"
          :class="{
            'is-locked': index > 0,
            'has-item': rightSlots[index] && index === 0
          }"
          @click="handleSlotClick(rightSlots[index], index)"
        >
          <div class="slot-inner">
            <i
              v-if="rightSlots[index] && index === 0"
              :class="`fa-${rightSlots[index].faIcon}`"
              class="fad fa-2x item-icon"
            ></i>
            <div v-else-if="index === 0" class="slot-placeholder">
              <i class="fad fa-plus"></i>
            </div>
            <div v-else class="slot-lock">
              <i class="fad fa-lock"></i>
            </div>
          </div>
          <div class="slot-glow" v-if="rightSlots[index] && index === 0"></div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, PropType, computed } from "vue";
  import { EquipmentItem } from "./EquipmentItems";
  import { toastController } from "@ionic/vue";
  import { JOB_CLASS_OPTIONS } from "@/constants";

  export default defineComponent({
    name: "equipped-items-card",
    props: {
      equipment: {
        type: Array as PropType<EquipmentItem[]>,
        required: true,
      },
      leftHandItems: {
        type: Array as PropType<EquipmentItem[]>,
        required: true,
        default: () => [],
      },
      rightHandItems: {
        type: Array as PropType<EquipmentItem[]>,
        required: true,
        default: () => [],
      },
      jobClass: {
        type: String,
        default: "",
      },
      // Configurable slots per wing (default 2, can be increased later)
      slotsPerWing: {
        type: Number,
        default: 2,
      },
    },
    emits: ["equip", "select-item", "change-class"],
    setup(props) {
      const classIcon = computed(() => {
        const className = props.jobClass;
        if (!className) return "fa-shield-alt";
        const job = JOB_CLASS_OPTIONS.find((j) => j.name === className);
        return job?.icon || "fa-shield-alt";
      });

      return {
        classIcon,
      };
    },
    data() {
      return {
        leftSlots: [] as (EquipmentItem | null)[],
        rightSlots: [] as (EquipmentItem | null)[],
      };
    },
    watch: {
      leftHandItems() {
        this.updateSlots();
      },
      rightHandItems() {
        this.updateSlots();
      },
      slotsPerWing: {
        immediate: true,
        handler() {
          this.initSlots();
        }
      }
    },
    methods: {
      initSlots() {
        this.leftSlots = Array(this.slotsPerWing).fill(null);
        this.rightSlots = Array(this.slotsPerWing).fill(null);
        this.updateSlots();
      },
      updateSlots() {
        // Reset slots based on slotsPerWing
        this.leftSlots = Array(this.slotsPerWing).fill(null);
        this.rightSlots = Array(this.slotsPerWing).fill(null);
        
        // Fill slots with items
        this.leftHandItems.forEach((item, index) => {
          if (index < this.slotsPerWing) this.leftSlots[index] = item;
        });

        this.rightHandItems.forEach((item, index) => {
          if (index < this.slotsPerWing) this.rightSlots[index] = item;
        });
      },
      allowDrop(event: DragEvent) {
        event.preventDefault();
      },
      async drop(event: DragEvent, hand: string, index: number) {
        event.preventDefault();

        if (index > 0) {
          const toast = await toastController.create({
            message: "This slot is locked. Unlock more slots as you level up.",
            duration: 2000,
            position: "bottom",
            color: "warning",
            cssClass: "rpg-toast",
          });
          await toast.present();
          return;
        }

        if (event.dataTransfer) {
          const data = event.dataTransfer.getData("item");
          const item = JSON.parse(data);
          this.$emit("equip", item, hand, index);
        }
      },
      handleSlotClick(item: EquipmentItem | null, index: number) {
        if (index > 0) return; // Locked slots
        if (item) {
          this.$emit("select-item", item);
        }
      },
    },
    created() {
      this.initSlots();
    }
  });
</script>

<style lang="scss" scoped>
  .equipped-loadout {
    // No background - transparent container
    // margin-bottom: 1rem;

    // === WINGS LAYOUT ===
    .loadout-organism {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin: 0;
      padding: 0;
    }

    .loadout-wing {
      display: flex;
      align-items: center;
      gap: 10px;

      &.left {
        flex-direction: row-reverse;
      }

      &.right {
        flex-direction: row;
      }

      .equipment-slot {
        width: 54px;
        height: 54px;
        background: rgba(20, 20, 30, 0.7);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        position: relative;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        flex-shrink: 0;

        .slot-inner {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          position: relative;

          .item-icon {
            color: var(--ion-color-secondary-tint);
            filter: drop-shadow(0 0 8px rgba(var(--ion-color-secondary-rgb), 0.4));
          }

          .slot-placeholder {
            color: rgba(255, 255, 255, 0.15);
            font-size: 1rem;
          }

          .slot-lock {
            color: rgba(255, 255, 255, 0.08);
            font-size: 0.9rem;
          }
        }

        .slot-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: radial-gradient(circle, rgba(var(--ion-color-secondary-rgb), 0.25) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          transition: all 0.3s ease;
          z-index: 1;
        }

        &.has-item:hover .slot-glow {
          width: 150%;
          height: 150%;
        }

        &.is-locked {
          background: rgba(0, 0, 0, 0.5);
          border-style: dashed;
          border-color: rgba(255, 255, 255, 0.06);
          cursor: not-allowed;
        }

        &:hover:not(.is-locked) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
          transform: scale(1.06);
        }
      }
    }

    .loadout-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      .class-icon-wrapper {
        width: 72px;
        height: 72px;
        background: rgba(20, 20, 30, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.12);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        cursor: pointer;

        i {
          color: var(--ion-color-primary);
          filter: drop-shadow(0 0 12px rgba(var(--ion-color-primary-rgb), 0.5));
        }

        &:hover {
          border-color: var(--ion-color-primary);
          background: rgba(var(--ion-color-primary-rgb), 0.1);
          transform: scale(1.08);
        }
      }
    }
  }
</style>

