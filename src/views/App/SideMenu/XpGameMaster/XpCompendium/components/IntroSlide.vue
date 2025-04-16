<!-- IntroSlide.vue -->
<template>
  <swiper-slide class="intro-slide">
    <div class="slide-content">
      <h1>Game Master Compendium</h1>
      <p>Configure the core elements of your XP system</p>
      <ion-button fill="outline" @click="$emit('next')">
        Begin Tour <i class="fas fa-arrow-right ml-1" />
      </ion-button>
    </div>
  </swiper-slide>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'IntroSlide',
  emits: ['next']
});
</script>