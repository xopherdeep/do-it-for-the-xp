<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="150" label="Total Quests" iconName="fa-staff quest" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="15" label="Avg Quests per User" iconName="fa-users" iconColor="warning" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="30" label="Active Quests" iconName="fa-running" iconColor="success" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="120" label="Completed Quests" iconName="fa-check-circle" iconColor="tertiary" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';

export default defineComponent({
  name: 'QuestsAdventuresDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the QuestsAdventuresDashboard here */
</style>