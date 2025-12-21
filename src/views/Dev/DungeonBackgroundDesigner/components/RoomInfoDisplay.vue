<template>
  <div class="room-info">
    <div class="room-type">{{ formattedRoomType }}</div>
    <div class="position">Position: [{{ position[1] + 1 }}, {{ position[0] + 1 }}]</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue';

export default defineComponent({
  name: 'RoomInfoDisplay',
  props: {
    roomType: {
      type: String,
      required: true
    },
    position: {
      type: Array as unknown as PropType<[number, number]>,
      required: true
    }
  },
  setup(props) {
    const formattedRoomType = computed(() => {
      // Capitalize first letter and format room type
      return props.roomType.charAt(0).toUpperCase() + props.roomType.slice(1) + ' Room';
    });

    return {
      formattedRoomType
    };
  }
});
</script>

<style scoped>
.room-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  border-radius: 4px;
  color: white;
  font-family: Arial, sans-serif;
  z-index: 1;
}

.room-type {
  font-size: 18px;
  font-weight: bold;
}

.position {
  font-size: 14px;
  opacity: 0.8;
}
</style>