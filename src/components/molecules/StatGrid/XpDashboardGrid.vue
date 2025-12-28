<template>
  <ion-grid class="icon-colors w-full p-0">
    <ion-row 
      class="flex flex-wrap space-between justify-center gap-[10px] w-full"
      :class="{ 'use-grid': cols > 0 }"
      :style="cols > 0 ? { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', width: '100%' } : {}"
    >
      <slot></slot>
    </ion-row>
  </ion-grid>
</template>

<script setup lang="ts">
import { IonGrid, IonRow } from '@ionic/vue';

defineProps({
  cols: {
    type: Number,
    default: 0
  }
});

defineOptions({
  name: 'XpDashboardGrid'
});
</script>
