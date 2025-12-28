<template>
  <!-- WORLD MAP MODAL -->
  <xp-world-map-modal 
    :is-open="worldMapActive" 
    @close="closeWorldMap"
  />

  <!-- QUICK DRAW FAB MENU -->
  <ion-fab
    vertical="bottom"
    horizontal="center"
    v-if="user.stats"
    class="icon-colors quick-draw-fab"
  >
    <!-- CENTER: Class Icon -->
    <ion-fab-button color="light">
      <i class="fad fa-2x" :class="userClassIcon"></i>
    </ion-fab-button>

    <!-- TOP: Static Shortcuts (Equipment, Wind Whistle, Menu) -->
    <ion-fab-list side="top" class="static-top">
      <ion-fab-button
        color="light"
        @click="$emit('openHud')"
        title="Equipment"
      >
        <i class="fad fa-dumbbell fa-lg"></i>
      </ion-fab-button>
      <ion-fab-button
        v-if="hasWindWhistle"
        color="light"
        @click="toggleWorldMap"
        title="Wind Whistle - Pegasus Travel"
      >
        <i class="fad fa-atom fa-lg"></i>
      </ion-fab-button>
      <ion-fab-button>
        <ion-menu-button color="primary"></ion-menu-button>
      </ion-fab-button>
    </ion-fab-list>

    <!-- BOTTOM: Static Slot (Pegasus Boots) -->
    <ion-fab-list side="bottom" class="static-bottom" v-if="hasPegasusBoots">
      <ion-fab-button
        color="light"
        @click="toggleMenuStyle"
        title="Pegasus Boots - Toggle Menu Style"
      >
        <i class="fad fa-boot fa-lg"></i>
      </ion-fab-button>
    </ion-fab-list>

    <!-- START (Left): Customizable Shortcuts -->
    <ion-fab-list side="start" class="customizable-slots">
      <ion-fab-button
        v-for="(item, index) in leftSlots"
        :key="'left-' + index"
        color="light"
        @click="handleItemClick(item)"
        :class="{ 'slot-locked': !item }"
      >
        <i 
          v-if="item" 
          class="fad fa-2x" 
          :class="`fa-${item.faIcon}`"
        ></i>
        <i v-else class="fad fa-plus fa-lg slot-empty"></i>
      </ion-fab-button>
    </ion-fab-list>

    <!-- END (Right): Customizable Shortcuts -->
    <ion-fab-list side="end" class="customizable-slots icon-colors">
      <ion-fab-button
        v-for="(item, index) in rightSlots"
        :key="'right-' + index"
        color="light"
        @click="handleItemClick(item)"
        :class="{ 'slot-locked': !item }"
      >
        <i 
          v-if="item" 
          class="fad fa-2x" 
          :class="`fa-${item.faIcon}`"
        ></i>
        <i v-else class="fad fa-plus fa-lg slot-empty"></i>
      </ion-fab-button>
    </ion-fab-list>
  </ion-fab>
</template>

<style lang="scss" scoped>
.quick-draw-fab {
  .slot-empty {
    opacity: 0.3;
  }
  .slot-locked {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

<script>
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";
  import { JOB_CLASS_OPTIONS } from "@/constants";
  import XpWorldMapModal from "./XpWorldMapModal.vue";
  import { useGameStore } from "@/lib/store/stores/game";

  export default defineComponent({
    name: "XpFabQuickDraw",
    props: ["user", "equipment"],
    mixins: [ionic],
    components: {
      XpWorldMapModal
    },
    computed: {
      // Check if user has unlocked Pegasus items
      hasPegasusBoots() {
        // TODO: Check actual unlock status from user.stats.pegasi
        // For now, default to true for development
        return this.user?.stats?.pegasi?.[0] ?? true;
      },
      hasWindWhistle() {
        // TODO: Check actual unlock status from user.stats.pegasi
        // For now, default to true for development
        return this.user?.stats?.pegasi?.[7] ?? true;
      },

      // Number of unlocked shortcut slots per side (1-3)
      unlockedSlotCount() {
        const stats = this.user?.stats;
        // Default: 1 slot, unlock more via progression
        // quickDrawSlots: 1 (default), 2 (first unlock), 3 (second unlock)
        return stats?.quickDrawSlots ?? 1;
      },

      // Left side customizable slots
      leftSlots() {
        const slots = [];
        const leftEquipped = this.equipment.filter(item => item.hand === 'left');
        
        for (let i = 0; i < this.unlockedSlotCount; i++) {
          slots.push(leftEquipped[i] || null);
        }
        return slots;
      },

      // Right side customizable slots
      rightSlots() {
        const slots = [];
        const rightEquipped = this.equipment.filter(item => item.hand === 'right');
        
        for (let i = 0; i < this.unlockedSlotCount; i++) {
          slots.push(rightEquipped[i] || null);
        }
        return slots;
      },

      userClassIcon() {
        const className = this.user?.jobClass;
        if (!className) return "fa-shield-alt";
        const job = JOB_CLASS_OPTIONS.find((j) => j.name === className);
        return job?.icon || "fa-shield-alt";
      },
    },
    setup() {
      const gameStore = useGameStore();
      const worldMapActive = ref(false);

      const toggleWorldMap = () => {
        worldMapActive.value = !worldMapActive.value;
      };

      const closeWorldMap = () => {
        worldMapActive.value = false;
      };

      const toggleMenuStyle = () => {
        const newStyle = gameStore.fabStyle === 'retro' ? 'modern' : 'retro';
        gameStore.setFabStyle(newStyle);
      };

      return {
        worldMapActive,
        toggleWorldMap,
        closeWorldMap,
        toggleMenuStyle,
        gameStore
      };
    },
    methods: {
      handleItemClick(item) {
        if (!item) {
          // Empty slot - could open slot configuration
          this.play$fx('denied');
          return;
        }
        
        if (item.click && typeof item.click === 'function') {
          item.click();
        } else if (item.mpCost) {
          this.play$fx('spell');
        }
      }
    },
  });
</script>

