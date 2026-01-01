<template>
  <ion-modal
    :is-open="isOpen"
    class="room-legend-modal"
    @didDismiss="$emit('close')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Room Key Legend</h2>
        <ion-button
          fill="clear"
          @click="$emit('close')"
        >
          <i class="fas fa-times"></i>
        </ion-button>
      </div>

      <div class="legend-grid">
        <div
          v-for="item in legendItems"
          :key="item.prefix"
          class="legend-item"
        >
          <div
            class="icon-wrapper"
            :class="item.class"
          >
            <i :class="['fad', item.icon]"></i>
          </div>
          <div class="item-info">
            <span class="token-prefix">{{ item.prefix }}</span>
            <span class="item-label">{{ item.label }}</span>
            <span class="item-desc">{{ item.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonModal, IonButton } from '@ionic/vue';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';

export default defineComponent({
  name: 'RoomLegendModal',
  components: {
    IonModal,
    IonButton
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close'],
  setup() {
    const legendItems = [
      {
        prefix: 'Rxxx',
        label: 'Empty Room',
        description: 'Standard walkable room (e.g., R001)',
        icon: ROOM_ICONS.empty,
        class: 'type-empty'
      },
      {
        prefix: '____',
        label: 'Wall',
        description: 'Solid wall, cannot be traversed',
        icon: ROOM_ICONS.wall,
        class: 'type-wall'
      },
      {
        prefix: 'Mxxx',
        label: 'Monster',
        description: 'Room with enemies (e.g., M001)',
        icon: ROOM_ICONS.monster,
        class: 'type-monster'
      },
      {
        prefix: 'MINI',
        label: 'Miniboss',
        description: 'Challenging mid-level enemy',
        icon: ROOM_ICONS.miniboss,
        class: 'type-miniboss'
      },
      {
        prefix: 'BOSS',
        label: 'Boss',
        description: 'Dungeon boss encounter',
        icon: ROOM_ICONS.boss,
        class: 'type-boss'
      },
      {
        prefix: '$xxx',
        label: 'Loot',
        description: 'Treasure chests & items',
        icon: ROOM_ICONS.loot,
        class: 'type-loot'
      },
      {
        prefix: 'Kxxx',
        label: 'Key',
        description: 'Small or Boss keys',
        icon: ROOM_ICONS.key,
        class: 'type-key'
      },
      {
        prefix: 'Pxxx',
        label: 'Shop',
        description: 'Merchant or store',
        icon: ROOM_ICONS.shop,
        class: 'type-shop'
      },
      {
        prefix: 'Txxx',
        label: 'Teleport',
        description: 'Warps to another location',
        icon: ROOM_ICONS.teleport,
        class: 'type-teleport'
      },
      {
        prefix: 'EXIT',
        label: 'Entrance/Exit',
        description: 'Dungeon entry point',
        icon: ROOM_ICONS.entrance,
        class: 'type-entrance'
      }
    ];

    return {
      legendItems
    };
  }
});
</script>

<style lang="scss" scoped>
  .room-legend-modal {
    --width: 90%;
    --max-width: 500px;
    --height: auto;
    --max-height: 80vh;
    --border-radius: 24px;
    --background: transparent;
    --backdrop-opacity: 0.6;

    &::part(content) {
      background: transparent;
      box-shadow: none;
    }
  }

  .modal-content {
    background: rgba(20, 20, 30, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    h2 {
      font-family: "Press Start 2P";
      font-size: 0.9rem;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    ion-button {
      --color: rgba(255, 255, 255, 0.5);
      margin: 0;

      &:hover {
        --color: #fff;
      }
    }
  }

  .legend-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    overflow-y: auto;
    padding-right: 8px;

    /* Scrollbar styling */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateX(4px);
    }
  }

  .icon-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 1.2rem;
    background: rgba(255, 255, 255, 0.1);

    &.type-empty {
      color: #fff;
    }

    &.type-wall {
      color: #666;
      background: rgba(0, 0, 0, 0.3);
    }

    &.type-monster,
    &.type-boss,
    &.type-miniboss {
      color: var(--ion-color-danger);
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    &.type-loot {
      color: var(--ion-color-warning);
      background: rgba(var(--ion-color-warning-rgb), 0.1);
    }

    &.type-key {
      color: var(--ion-color-tertiary);
      background: rgba(var(--ion-color-tertiary-rgb), 0.1);
    }

    &.type-shop {
      color: var(--ion-color-success);
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    &.type-teleport {
      color: var(--ion-color-secondary);
      background: rgba(var(--ion-color-secondary-rgb), 0.1);
    }

    &.type-entrance {
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .token-prefix {
    font-family: "StatusPlz";
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    letter-spacing: 1px;
  }

  .item-label {
    font-family: "Apple Kid";
    font-size: 0.8rem;
    color: #fff;
    text-transform: uppercase;
  }

  .item-desc {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }
</style>
