<template>
  <div class="monster-config-selector">
    <div class="config-label">Select Monster Config</div>
    <p class="config-hint">
      Choose an existing config to share monsters across rooms, or create a new config.
    </p>

    <div class="config-grid">
      <!-- Existing configs in use -->
      <button
        v-for="config in existingConfigs"
        :key="config.token"
        class="config-btn existing"
        :class="{ 'has-beasts': config.hasBeasts }"
        @click="$emit('select', config.token)"
      >
        <div class="config-icon">
          <i
            v-if="config.hasBeasts"
            class="fad fa-paw-claws"
          ></i>
          <i
            v-else
            class="fad fa-bat"
          ></i>
        </div>
        <div class="config-info">
          <span class="config-token">{{ config.token }}</span>
          <span class="config-name">{{ config.name || 'Not configured' }}</span>
        </div>
        <div
          v-if="config.count > 0"
          class="config-count"
        >
          <i class="fas fa-clone"></i> {{ config.count }}
        </div>
      </button>

      <!-- New Config Option -->
      <button
        class="config-btn new-config"
        @click="$emit('select', 'NEW')"
      >
        <div class="config-icon">
          <i class="fad fa-plus-circle"></i>
        </div>
        <div class="config-info">
          <span class="config-token">NEW</span>
          <span class="config-name">Unique Config</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export interface MonsterConfigOption {
  token: string;
  name: string;
  hasBeasts: boolean;
  count: number;
}

export default defineComponent({
  name: 'RoomMonsterConfigSelector',
  props: {
    existingConfigs: {
      type: Array as PropType<MonsterConfigOption[]>,
      default: () => []
    }
  },
  emits: ['select']
});
</script>

<style lang="scss" scoped>
  .monster-config-selector {
    padding: 4px;
  }

  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .config-hint {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 16px;
    line-height: 1.4;
    letter-spacing: 1px;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 10px;

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

  .config-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    &.existing {
      &:hover {
        border-color: rgba(255, 82, 82, 0.5);
        background: rgba(255, 82, 82, 0.1);
      }

      &.has-beasts {
        border-color: rgba(255, 82, 82, 0.3);

        .config-icon i {
          color: #ff5252;
        }
      }
    }

    &.new-config {
      border-style: dashed;

      &:hover {
        border-color: rgba(var(--ion-color-primary-rgb), 0.6);
        background: rgba(var(--ion-color-primary-rgb), 0.1);

        .config-icon i {
          color: var(--ion-color-primary);
        }
      }
    }
  }

  .config-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 10px;

    i {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.5);
      transition: color 0.2s;
    }
  }

  .config-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .config-token {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    color: #fff;
    text-transform: uppercase;
  }

  .config-name {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 1px;
  }

  .config-count {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 8px;
    border-radius: 6px;

    i {
      font-size: 0.55rem;
    }
  }
</style>
