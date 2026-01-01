<template>
  <div class="egg-config config-box">
    <!-- Header / Preview -->
    <div class="egg-preview">
      <div class="egg-visual">
        <!-- Show Egg Icon (maybe colored if we have that logic, but keeping simple for now) -->
        <i
          class="fad fa-dragon fa-3x"
          style="color: #6c5ce7; margin-bottom: -10px; z-index: 1;"
        ></i>
        <i class="fad fa-egg fa-5x"></i>
      </div>
      <div class="egg-info">
        <h3>Dragon Egg</h3>
        <p>Defeating the dungeon guardian allows the hero to rescue this Pegasus.</p>
      </div>
    </div>

    <div class="config-label mt-20">Select Prisoner</div>

    <!-- Pegasus Grid -->
    <div class="pegasus-grid">
      <div
        v-for="pegasus in pegasusItems"
        :key="pegasus.id"
        class="pegasus-option"
        :class="{ active: selectedPegasusId === pegasus.id }"
        @click="$emit('select-pegasus', pegasus.id)"
      >
        <div class="icon-wrapper">
          <i :class="['fad', pegasus.icon || 'fa-pegasus']"></i>
        </div>
        <span>{{ pegasus.label }}</span>

        <!-- Selection Indicator -->
        <div
          class="check-mark"
          v-if="selectedPegasusId === pegasus.id"
        >
          <i class="fas fa-check"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { KEY_ITEMS } from '../hooks';

export default defineComponent({
  name: 'RoomEggConfig',
  props: {
    selectedPegasusId: { type: String, default: '' }
  },
  emits: ['select-pegasus'],
  setup() {
    // Filter KEY_ITEMS to only show Pegasus items (assuming they have specific IDs or we filter by convention)
    // Based on user request/context, we likely want items that are actually Pegasi.
    // The previous code showed `getPegasusItems()` is merged into KEY_ITEMS.
    // We can filter by ID convention or just show all KEY_ITEMS if they are mostly pegasus/narrative.
    // However, looking at XpWorldMapModal, IDs are 'ventus', 'ignis', etc.
    // Let's assume KEY_ITEMS contains these.
    
    // For safety, let's filter for items that might be pegasus or just use all key items for now as the 'Master' room usually held key items.
    // But the user specific asked for "Pegasus".
    // Let's try to identify them. Usually valid pegasus IDs might be known constants.
    // Or we simply display all KEY_ITEMS as potential "Prisoners".
    const pegasusItems = computed(() => KEY_ITEMS);

    return {
      pegasusItems
    };
  }
});
</script>

<style lang="scss" scoped>
  .config-box {
    padding: 10px;
  }

  .egg-preview {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);

    .egg-visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      position: relative;

      i.fa-egg {
        color: #ffd740;
        filter: drop-shadow(0 0 10px rgba(255, 215, 64, 0.3));
      }
    }

    .egg-info {
      flex: 1;

      h3 {
        margin: 0 0 5px;
        font-family: "Press Start 2P";
        font-size: 0.8rem;
        color: #ffd740;
        text-transform: uppercase;
      }

      p {
        margin: 0;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.4;
      }
    }
  }

  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.65rem;
    color: #fff;
    opacity: 0.7;
    margin-bottom: 12px;
    letter-spacing: 0.5px;

    &.mt-20 {
      margin-top: 20px;
    }
  }

  .pegasus-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .pegasus-option {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 15px 10px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;

    .icon-wrapper {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;

      i {
        font-size: 1.5rem;
        color: rgba(255, 255, 255, 0.5);
        transition: all 0.2s;
      }
    }

    span {
      font-family: "StatusPlz";
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
    }

    /* Selection State */
    &.active {
      background: rgba(108, 92, 231, 0.2);
      border-color: #6c5ce7;
      box-shadow: 0 0 15px rgba(108, 92, 231, 0.2);

      .icon-wrapper {
        background: #6c5ce7;

        i {
          color: #fff;
        }
      }

      span {
        color: #fff;
      }
    }

    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .check-mark {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 18px;
      height: 18px;
      background: #6c5ce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: #fff;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    }
  }
</style>
