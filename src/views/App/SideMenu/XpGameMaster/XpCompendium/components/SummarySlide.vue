<!-- SummarySlide.vue -->
<template>
  <swiper-slide class="summary-slide">
    <div class="slide-content">
      <h2>Ready to Configure Your Game?</h2>
      <p>Choose a section to begin customizing your XP system:</p>
      
      <div class="menu-grid">
        <ion-button
          v-for="route in routes"
          :key="route.path"
          fill="outline"
          class="menu-button"
          @click="$emit('navigate', route.path)"
        >
          <i :class="route.icon" class="mr-2"></i>
          {{ route.text }}
        </ion-button>
      </div>
    </div>
  </swiper-slide>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

interface RouteItem {
  text: string;
  icon: string;
  path: string;
}

export default defineComponent({
  name: 'SummarySlide',
  props: {
    routes: {
      type: Array as PropType<RouteItem[]>,
      required: true
    }
  },
  emits: ['navigate']
});
</script>

<style scoped>
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 600px;
  margin-top: 1rem;
}

.menu-button {
  width: 100%;
  text-transform: none;
  --padding-start: 1rem;
  --padding-end: 1rem;
}
</style>