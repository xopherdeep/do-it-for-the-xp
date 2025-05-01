<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="750" label="Total AP Awarded" iconName="fa-award" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="15" label="Daily Streaks Triggered" iconName="fa-calendar-check" iconColor="tertiary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="8" label="Weekly Achievements Unlocked" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="3" label="Monthly Milestones Reached" iconName="fa-calendar-alt" iconColor="danger" />
      </ion-col>
    </ion-row>
    <ion-row>
      <ion-col size="12">
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';

export default defineComponent({
  name: 'AbilityPointsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the AbilityPointsDashboard here */
</style>