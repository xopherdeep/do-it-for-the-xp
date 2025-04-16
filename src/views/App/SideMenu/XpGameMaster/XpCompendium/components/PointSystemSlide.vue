<!-- PointSystemSlide.vue -->
<template>
  <swiper-slide class="point-system-slide">
    <div class="slide-content">
      <h2>{{ title }}</h2>
      <div :class="['point-icon-container', colorClass]">
        <i :class="icon"></i>
      </div>
      <p>{{ description }}</p>
      <ion-button fill="outline" @click="$emit('navigate', route)">
        {{ buttonText }} <i class="fas fa-arrow-right ml-1" />
      </ion-button>
    </div>
  </swiper-slide>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PointSystemSlide',
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    colorClass: { type: String, required: true },
    buttonText: { type: String, required: true },
    route: { type: String, required: true }
  },
  emits: ['navigate']
});
</script>