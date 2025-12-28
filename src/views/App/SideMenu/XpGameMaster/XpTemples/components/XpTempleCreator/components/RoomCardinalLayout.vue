<template>
  <div class="cardinal-section">
    <div class="cardinal-grid">
      <!-- Row 1: Adjacent North -->
      <div
        v-if="adjacentRooms.north"
        class="adjacent-room grid-adj-n icon-colors"
        :class="'type-' + getAdjacentRoomType('north')"
        @click="$emit('room-click', 'north')"
      >
        <i
          :class="['fad', getAdjacentRoomIcon('north') === 'DYNAMIC_WALL' ? roomIcons.wall : getAdjacentRoomIcon('north')]"></i>
        <span
          class="adj-label"
          v-if="getAdjacentRoomLabel('north')"
        >{{ getAdjacentRoomLabel('north') }}</span>
      </div>
      <div
        v-else
        class="grid-adj-n edge-void"
      ></div>

      <!-- Row 2: Door North -->
      <div
        :class="['door-trigger', 'grid-door-n', 'icon-colors', getDoorClass('north')]"
        @click="handleDoorTriggerClick('north')"
      >
        <i :class="[getDoorIcon('north') === 'DYNAMIC_WALL' ? 'fad ' + roomIcons.wall : getDoorIcon('north')]"></i>
      </div>

      <!-- Row 3: Adjacent West, Door West, CENTER, Door East, Adjacent East -->
      <div
        v-if="adjacentRooms.west"
        class="adjacent-room grid-adj-w icon-colors"
        :class="'type-' + getAdjacentRoomType('west')"
        @click="$emit('room-click', 'west')"
      >
        <i
          :class="['fad', getAdjacentRoomIcon('west') === 'DYNAMIC_WALL' ? roomIcons.wall : getAdjacentRoomIcon('west')]"></i>
        <span
          class="adj-label"
          v-if="getAdjacentRoomLabel('west')"
        >{{ getAdjacentRoomLabel('west') }}</span>
      </div>
      <div
        v-else
        class="grid-adj-w edge-void"
      ></div>

      <div
        :class="['door-trigger', 'grid-door-w', 'icon-colors', getDoorClass('west')]"
        @click="handleDoorTriggerClick('west')"
      >
        <i :class="[getDoorIcon('west') === 'DYNAMIC_WALL' ? 'fad ' + roomIcons.wall : getDoorIcon('west')]"></i>
      </div>

      <!-- Center Room -->
      <div
        class="center-room icon-colors"
        :class="'type-' + roomData?.type"
        @click="$emit('center-click')"
      >
        <i :class="['fad', roomIcons[roomData?.type || 'empty']]"></i>
        <div class="center-hint">
          <i class="fas fa-edit"></i>
        </div>
      </div>

      <div
        :class="['door-trigger', 'grid-door-e', 'icon-colors', getDoorClass('east')]"
        @click="handleDoorTriggerClick('east')"
      >
        <i :class="[getDoorIcon('east') === 'DYNAMIC_WALL' ? 'fad ' + roomIcons.wall : getDoorIcon('east')]"></i>
      </div>

      <div
        v-if="adjacentRooms.east"
        class="adjacent-room grid-adj-e icon-colors"
        :class="'type-' + getAdjacentRoomType('east')"
        @click="$emit('room-click', 'east')"
      >
        <i
          :class="['fad', getAdjacentRoomIcon('east') === 'DYNAMIC_WALL' ? roomIcons.wall : getAdjacentRoomIcon('east')]"></i>
        <span
          class="adj-label"
          v-if="getAdjacentRoomLabel('east')"
        >{{ getAdjacentRoomLabel('east') }}</span>
      </div>
      <div
        v-else
        class="grid-adj-e edge-void"
      ></div>

      <!-- Row 4: Door South -->
      <div
        :class="['door-trigger', 'grid-door-s', 'icon-colors', getDoorClass('south')]"
        @click="handleDoorTriggerClick('south')"
      >
        <i :class="[getDoorIcon('south') === 'DYNAMIC_WALL' ? 'fad ' + roomIcons.wall : getDoorIcon('south')]"></i>
      </div>

      <!-- Row 5: Adjacent South -->
      <div
        v-if="adjacentRooms.south"
        class="adjacent-room grid-adj-s icon-colors"
        :class="'type-' + getAdjacentRoomType('south')"
        @click="$emit('room-click', 'south')"
      >
        <i
          :class="['fad', getAdjacentRoomIcon('south') === 'DYNAMIC_WALL' ? roomIcons.wall : getAdjacentRoomIcon('south')]"></i>
        <span
          class="adj-label"
          v-if="getAdjacentRoomLabel('south')"
        >{{ getAdjacentRoomLabel('south') }}</span>
      </div>
      <div
        v-else
        class="grid-adj-s edge-void"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Room } from '@/lib/engine/core/dungeons/types';
import { AdjacentRooms } from '../hooks';

export default defineComponent({
  name: 'RoomCardinalLayout',
  props: {
    roomData: {
      type: Object as PropType<Room | null>,
      default: null
    },
    adjacentRooms: {
      type: Object as PropType<AdjacentRooms>,
      required: true
    },
    lockOnEnter: {
      type: Boolean,
      default: false
    },
    roomIcons: {
      type: Object as PropType<Record<string, string>>,
      required: true
    },
    // Functions passed from parent (from navigation hook)
    getDoorIcon: {
      type: Function as PropType<(dir: string) => string>,
      required: true
    },
    getDoorClass: {
      type: Function as PropType<(dir: string) => string>,
      required: true
    },
    getAdjacentRoomIcon: {
      type: Function as PropType<(dir: string) => string>,
      required: true
    },
    getAdjacentRoomLabel: {
      type: Function as PropType<(dir: string) => string>,
      required: true
    },
    getAdjacentRoomType: {
      type: Function as PropType<(dir: string) => string>,
      required: true
    }
  },
  emits: ['center-click', 'room-click', 'door-toggle'],
  setup(props, { emit }) {
    const handleDoorTriggerClick = (dir: string) => {
      const hasAccess = props.adjacentRooms[dir as keyof AdjacentRooms];
      if (hasAccess && !props.lockOnEnter) {
        emit('door-toggle', dir);
      }
    };
    
    return {
      handleDoorTriggerClick
    };
  }
});
</script>

<style lang="scss" scoped>
  .cardinal-section {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .cardinal-grid {
    --grid-gap: 8px;
    --center-size: clamp(80px, 25vw, 120px);
    --adj-size: clamp(48px, 15vw, 64px);
    --door-size: clamp(36px, 12vw, 48px);

    display: grid;
    grid-template-columns: auto auto auto auto auto;
    grid-template-rows: auto auto auto auto auto;
    grid-template-areas:
      ".       .       adj-n   .       ."
      ".       .       door-n  .       ."
      "adj-w   door-w  center  door-e  adj-e"
      ".       .       door-s  .       ."
      ".       .       adj-s   .       .";
    gap: var(--grid-gap);
    align-items: center;
    justify-items: center;
    justify-content: center;
  }

  .edge-void {
    width: var(--adj-size);
    height: var(--adj-size);
    border-radius: 14px;
    border: 6px double rgba(255, 255, 255, 0.15);
    background: transparent;
    opacity: 0.3;
  }

  // Grid area assignments - apply to both adjacent-room AND edge-void
  .grid-adj-n {
    grid-area: adj-n;
  }

  .grid-adj-e {
    grid-area: adj-e;
  }

  .grid-adj-s {
    grid-area: adj-s;
  }

  .grid-adj-w {
    grid-area: adj-w;
  }

  .center-room {
    grid-area: center;
    width: var(--center-size);
    height: var(--center-size);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(2rem, 8vw, 3rem);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
    position: relative;

    &.type-monster,
    &.type-boss,
    &.type-miniboss {
      color: #ff5252;
      border-color: rgba(255, 82, 82, 0.5);
      box-shadow: 0 0 30px rgba(255, 82, 82, 0.2);
    }

    &.type-loot {
      color: #ffd740;
      border-color: rgba(255, 215, 64, 0.5);
      box-shadow: 0 0 30px rgba(255, 215, 64, 0.2);
    }

    &.type-shop {
      color: #69f0ae;
      border-color: rgba(105, 240, 174, 0.5);
    }

    &.type-teleport {
      color: #40c4ff;
      border-color: rgba(64, 196, 255, 0.5);
    }

    .center-hint {
      position: absolute;
      bottom: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 6px;
      opacity: 0;
      transition: opacity 0.2s;

      i {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.8);
      }
    }

    &:hover .center-hint {
      opacity: 1;
    }
  }

  .adjacent-room {
    width: var(--adj-size);
    height: var(--adj-size);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.5;

    >i {
      font-size: clamp(1rem, 4vw, 1.2rem);
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.3s;
    }

    .adj-label {
      font-family: "StatusPlz";
      font-size: 0.45rem;
      color: rgba(255, 255, 255, 0.4);
      text-transform: capitalize;
      max-width: 52px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.08);
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);

      >i {
        color: rgba(255, 255, 255, 0.9);
      }

      .adj-label {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    /* Room Type Colors on hover */
    &.type-monster:hover,
    &.type-boss:hover,
    &.type-miniboss:hover,
    &.type-trap:hover {
      border-color: rgba(255, 82, 82, 0.6);
      background: rgba(255, 82, 82, 0.15);
      box-shadow: 0 0 25px rgba(255, 82, 82, 0.3);

      >i {
        color: #ff5252;
      }
    }

    &.type-loot:hover,
    &.type-key:hover {
      border-color: rgba(255, 215, 64, 0.6);
      background: rgba(255, 215, 64, 0.15);
      box-shadow: 0 0 25px rgba(255, 215, 64, 0.3);

      >i {
        color: #ffd740;
      }
    }

    &.type-entrance:hover,
    &.type-teleport:hover {
      border-color: rgba(64, 196, 255, 0.6);
      background: rgba(64, 196, 255, 0.15);
      box-shadow: 0 0 25px rgba(64, 196, 255, 0.3);

      >i {
        color: #40c4ff;
      }
    }

    &.type-shop:hover {
      border-color: rgba(105, 240, 174, 0.6);
      background: rgba(105, 240, 174, 0.15);
      box-shadow: 0 0 25px rgba(105, 240, 174, 0.3);

      >i {
        color: #69f0ae;
      }
    }
  }

  .door-trigger {
    width: var(--door-size);
    height: var(--door-size);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(8px);
    border: 2px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &.grid-door-n {
      grid-area: door-n;
    }

    &.grid-door-e {
      grid-area: door-e;
    }

    &.grid-door-s {
      grid-area: door-s;
    }

    &.grid-door-w {
      grid-area: door-w;
    }

    >i {
      font-size: clamp(1rem, 4vw, 1.3rem);
      color: rgba(255, 255, 255, 0.5);
      transition: all 0.25s;
    }

    &:not(.state-wall):hover {
      transform: scale(1.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    &.state-wall {
      opacity: 1;
      cursor: pointer;
      border: 4px double rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.1);

      >i {
        color: rgba(255, 255, 255, 0.8);
        font-size: clamp(1rem, 4vw, 1.2rem);
      }

      &:hover {
        opacity: 1;
        background: rgba(var(--ion-color-medium-rgb), 0.25);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.15);

        >i {
          color: rgba(255, 255, 255, 0.7);
        }
      }

      &.state-banned {
        cursor: not-allowed;
        border: 6px double rgba(255, 255, 255, 0.15);

        &:hover {
          opacity: 0.7;
          transform: none;
          background: rgba(var(--ion-color-medium-rgb), 0.15);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: none;

          >i {
            color: rgba(255, 255, 255, 0.5);
          }
        }
      }
    }

    &.state-locked {
      background: linear-gradient(135deg, rgba(var(--ion-color-warning-rgb), 0.2), rgba(var(--ion-color-warning-rgb), 0.1));
      border-color: var(--ion-color-warning);
      box-shadow: 0 0 12px rgba(var(--ion-color-warning-rgb), 0.3);

      >i {
        color: var(--ion-color-warning);
        font-size: clamp(1.1rem, 4.5vw, 1.4rem);
      }

      &:hover {
        background: linear-gradient(135deg, rgba(var(--ion-color-warning-rgb), 0.3), rgba(var(--ion-color-warning-rgb), 0.15));
        box-shadow: 0 0 20px rgba(var(--ion-color-warning-rgb), 0.5);
      }
    }

    &.state-unlocked,
    &.state-door {
      background: linear-gradient(135deg, rgba(var(--ion-color-success-rgb), 0.2), rgba(var(--ion-color-success-rgb), 0.1));
      border-color: var(--ion-color-success);
      box-shadow: 0 0 12px rgba(var(--ion-color-success-rgb), 0.3);

      >i {
        color: var(--ion-color-success);
        font-size: clamp(1.1rem, 4.5vw, 1.4rem);
      }

      &:hover {
        background: linear-gradient(135deg, rgba(var(--ion-color-success-rgb), 0.3), rgba(var(--ion-color-success-rgb), 0.15));
        box-shadow: 0 0 20px rgba(var(--ion-color-success-rgb), 0.5);
      }
    }

    &.state-bombable {
      background: linear-gradient(135deg, rgba(var(--ion-color-secondary-rgb), 0.25), rgba(var(--ion-color-secondary-rgb), 0.1));
      border: 4px dashed var(--ion-color-secondary);
      box-shadow: 0 0 15px rgba(var(--ion-color-secondary-rgb), 0.4);

      >i {
        color: var(--ion-color-secondary);
        font-size: clamp(1.1rem, 4.5vw, 1.4rem);
      }

      &:hover {
        background: linear-gradient(135deg, rgba(var(--ion-color-secondary-rgb), 0.35), rgba(var(--ion-color-secondary-rgb), 0.15));
        box-shadow: 0 0 25px rgba(var(--ion-color-secondary-rgb), 0.6);
        animation: pulse-bombable 0.6s ease-in-out;
      }
    }

    &.state-trapped,
    &.state-locked-on-enter {
      background: rgba(0, 0, 0, 0.2);
      border: 2px solid #8B0000;
      cursor: pointer;
      animation: pulse-danger 2.5s infinite;
      box-shadow: 0 0 10px rgba(139, 0, 0, 0.3);

      >i {
        font-size: clamp(1.2rem, 5vw, 1.5rem);
        color: #ff4b2b;
      }

      &:hover {
        background: rgba(139, 0, 0, 0.1);
        box-shadow: 0 0 20px rgba(139, 0, 0, 0.5);
      }
    }
  }

  @keyframes pulse-danger {
    0% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse-bombable {
    0% {
      transform: scale(1.1);
    }

    50% {
      transform: scale(1.15);
      box-shadow: 0 0 30px rgba(var(--ion-color-secondary-rgb), 0.8);
    }

    100% {
      transform: scale(1.1);
    }
  }
</style>
