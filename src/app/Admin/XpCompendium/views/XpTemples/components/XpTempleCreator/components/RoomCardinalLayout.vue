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
      const canToggleDoor = hasAccess && !props.lockOnEnter;
      if (canToggleDoor) {
        emit('door-toggle', dir);
      }
    };
    
    return {
      handleDoorTriggerClick
    };
  }
});
</script>

<style lang="scss" scoped src="./_RoomCardinalLayout.scss" />
