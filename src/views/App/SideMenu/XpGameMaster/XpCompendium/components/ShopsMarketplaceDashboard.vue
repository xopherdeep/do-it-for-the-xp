<template>
  <ion-grid class="icon-colors w-full">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="10" label="Total Shops" iconName="fa-store" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="50" label="Items Available" iconName="fa-boxes" iconColor="success" />
      </ion-col>
    </ion-row>
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="20" label="Avg Items per Shop" iconName="fa-box" iconColor="tertiary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="100" label="Purchases Made" iconName="fa-shopping-cart" iconColor="warning" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'ShopsMarketplaceDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
  /* Add any specific styles for the ShopsMarketplaceDashboard here */
</style>
