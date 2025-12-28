<template>
  <ion-col 
    size="auto" 
    class="flex flex-col flex-1 min-w-[100px] p-0"
    :style="fullWidth ? { gridColumn: '1 / -1' } : {}"
  >
    <slot></slot>
  </ion-col>
</template>

<script setup lang="ts">
import { IonCol } from '@ionic/vue';

defineProps({
  fullWidth: {
    type: Boolean,
    default: false
  }
});

defineOptions({
  name: 'XpDashboardTile'
});
</script>
