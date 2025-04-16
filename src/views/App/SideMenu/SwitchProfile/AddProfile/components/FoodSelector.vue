<template>
  <ion-popover 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    :arrow="false"
    class="food-selector"
  >
    <ion-content class="ion-padding icon-colors">
      <ion-list>
        <ion-item 
          v-for="food in foodOptions" 
          :key="food.value"
          button
          :class="{ active: food.value === modelValue }"
          @click="$emit('update:modelValue', food.value)"
        >
          <i :class="`fad ${food.icon} fa-2x mr-3`"></i>
          <ion-label>{{ food.value }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { FOOD_OPTIONS } from "@/constants";

export default defineComponent({
  name: 'FoodSelector',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close'],
  setup() {
    const foodOptions = ref(FOOD_OPTIONS);
    return {
      foodOptions
    };
  }
});
</script>

<style lang="scss" scoped>
.food-selector {
  --width: 300px;
}

ion-item {
  --padding-start: 1rem;
  --inner-padding-end: 1rem;
  transition: all 0.2s ease;

  &.active {
    --background: var(--ion-color-primary-tint);
    --color: var(--ion-color-primary);
    i {
      color: var(--ion-color-primary);
    }
  }

  &:hover {
    --background: var(--ion-color-light-tint);
  }
}
</style>