<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="totalHPLost" label="Total HP Lost" iconName="fa-heart-broken" iconColor="danger" />
      </ion-col>
      
      <ion-col size="6">
        <XpStatBox :value="avgHPLostPerQuest" label="Avg HP/Quest" iconName="fa-hand-holding-medical" iconColor="warning" />
      </ion-col>
      
      <ion-col size="4">
        <XpStatBox :value="hpLostToday" label="HP Lost Today" iconName="fa-calendar-day" iconColor="primary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="hpLostThisWeek" label="This Week" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="hpLostThisMonth" label="This Month" iconName="fa-calendar-alt" iconColor="tertiary" />
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
  },
  data() {
    return {
      // Mock data - these would be replaced with actual values when connected to character systems
      avgHP: 85,
      avgMP: 70,
      avgHPRegen: 10,
      avgMPRegen: 8,
      totalHPLost: -12500,
      avgHPLostPerQuest: -25,
      hpLostToday: -175,
      hpLostThisWeek: -625,
      hpLostThisMonth: -2250
    };
  }
  // TODO: Implement methods to fetch real data from character systems
  // Example:
  /*
  created() {
    // Example implementation when we have a character tracking system
    const characterStats = getCharacterTrackingSystem();
    this.totalHPLost = characterStats.getTotalHPLost();
    this.avgHPLostPerQuest = characterStats.getAverageHPLostPerQuest();
    this.hpLostToday = characterStats.getHPLostToday();
    this.hpLostThisWeek = characterStats.getHPLostThisWeek();
    this.hpLostThisMonth = characterStats.getHPLostThisMonth();
  }
  */
});
</script>

<style scoped>
/* Add any specific styles for the CharacterStatsDashboard here */
.icon-colors {
  padding: 10px;
}
</style>