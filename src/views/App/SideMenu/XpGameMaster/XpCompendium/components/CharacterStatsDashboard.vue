<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="85" label="Avg HP" iconName="fa-heart" iconColor="danger" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="70" label="Avg MP" iconName="fa-bolt" iconColor="tertiary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="10" label="Avg HP Regen Rate" iconName="fa-battery-half" iconColor="warning" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="8" label="Avg MP Regen Rate" iconName="fa-battery-quarter" iconColor="medium" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';

export default defineComponent({
  name: 'CharacterStatsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the CharacterStatsDashboard here */
</style>