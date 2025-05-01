<template>
  <ion-grid class="icon-colors w-full ion-no-margin">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="totalAwarded" label="AP Unlocked" iconName="fa-hand-holding-magic" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="avgPerQuest" label="Avg AP per Q" iconName="fa-hand-holding-seedling" iconColor="tertiary" />
      </ion-col>
      
      <ion-col size="4">
        <XpStatBox :value="dailyStreaks" label="AP Today" iconName="fa-calendar-day" iconColor="primary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="weeklyAchievements" label="AP This Week" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="monthlyMilestones" label="AP This Month" iconName="fa-calendar-alt" iconColor="danger" />
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
  },
  data() {
    return {
      // Mock data - these would be replaced with actual values from APSystem when available
      totalAwarded: 750, // Total AP awarded over time
      currentBalance: 225, // Current AP balance
      avgPerQuest: 15, // Average AP earned per quest
      dailyStreaks: 25, // AP earned today
      weeklyAchievements: 120, // AP earned this week
      monthlyMilestones: 450 // AP earned this month
    };
  }
  // TODO: Implement methods to fetch real data from the APSystem
  // These methods would replace the mock data above
  /*
  created() {
    const apSystem = getAPSystem();
    // Example of how we might implement this with real data:
    // this.totalAwarded = apSystem.getTotalAPAwarded();
    // this.currentBalance = apSystem.getCurrentAPBalance();
    // etc.
  }
  */
});
</script>

<style scoped>
/* Add any specific styles for the AbilityPointsDashboard here */
.icon-colors {
  padding: 10px;
}
</style>