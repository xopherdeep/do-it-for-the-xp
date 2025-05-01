<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="5000" label="Total GP Earned" iconName="fa-coins" iconColor="warning" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="1200" label="GP in Savings" iconName="fa-piggy-bank" iconColor="success" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="500" label="GP in Wallet" iconName="fa-wallet" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="10" label="Avg GP per Quest" iconName="fa-treasure-chest" iconColor="tertiary" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';

export default defineComponent({
  name: 'GoldPointsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the GoldPointsDashboard here */
</style>