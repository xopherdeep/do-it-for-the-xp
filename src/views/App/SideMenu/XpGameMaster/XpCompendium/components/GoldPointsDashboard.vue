<template>
  <ion-grid class="icon-colors w-full ion-no-margin ">
    <ion-row>
      <ion-col size="4">
        <XpStatBox :value="totalRewarded" label="GP Paid" iconName="fa-trophy" iconColor="warning" />
      </ion-col>
      <!-- <ion-col size="4">
        <XpStatBox :value="totalSavings" label="Total Savings" iconName="fa-piggy-bank" iconColor="success" />
      </ion-col> -->
      <ion-col size="4">
        <XpStatBox :value="bankBalance" label="Bank Balance" iconName="fa-hand-holding-usd" iconColor="success" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="avgPerQuest" label="Avg GP per Q" iconName="fa-hand-holding-seedling" iconColor="tertiary" />
      </ion-col>
      <!-- Day, Week, Month -->
    
      <ion-col size="3">
        <XpStatBox :value="totalDaily" label="GP Today" iconName="fa-calendar-day" iconColor="primary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="totalWeekly" label="GP This Week" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col size="5">
        <XpStatBox :value="totalMonthly" label="GP This Month" iconName="fa-calendar-alt" iconColor="tertiary" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
// import { getGPSystem } from '@/lib/engine/core/GPSystem';

export default defineComponent({
  name: 'GoldPointsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  },
  data() {
    return {
      // Mock data - these would be replaced with actual values from GPSystem when available
      bankBalance: 3300, // Current GP in the bank - this is the total GP in the system
      totalRewarded: 5000, // Total GP that has been rewarded/paid out
      totalSavings: 1200, // Total GP in all savings accounts
      avgPerQuest: 10, // Average GP earned per quest
      totalDaily: 0, // Total GP earned today
      totalWeekly: 0, // Total GP earned this week
      totalMonthly: 0 // Total GP earned this month
    
    };
  }
  // TODO: Implement methods to fetch real data from the GPSystem
  // These methods would replace the mock data above
  /*
  created() {
    const gpSystem = getGPSystem();
    // Example of how we might implement this with real data:
    // this.totalSavings = gpSystem.getTotalSavingsInSystem();
    // this.bankBalance = gpSystem.getBankBalance();
    // this.totalRewarded = gpSystem.getTotalGPRewarded();
  }
  */
});
</script>

<style scoped>
/* Add any specific styles for the GoldPointsDashboard here */
.icon-colors {
  padding: 10px;
}
</style>