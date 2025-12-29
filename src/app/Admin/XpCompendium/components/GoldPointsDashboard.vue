<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile 
        label="Stock Shops" 
        iconName="fa-hand-holding-box" 
        color="warning"
        @click="goToShops" 
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="3300"
        label="World Treasury" 
        ribbon="Circulating: 1.7k"
        ribbonColor="danger"
        iconName="fa-piggy-bank" 
        iconColor="success" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="avgPerQuest" 
        label="Avg GP/Quest" 
        iconName="fa-coin" 
        iconColor="warning" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="250" 
        label="Avg GP/User" 
        iconName="fa-sack-dollar" 
        iconColor="warning" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
  </XpDashboardGrid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import XpStatBox from '@/components/molecules/StatBox/XpStatBox.vue';
import XpNavTile from '@/components/molecules/StatGrid/XpNavTile.vue';
import XpDashboardGrid from '@/components/molecules/StatGrid/XpDashboardGrid.vue';
import XpDashboardTile from '@/components/molecules/StatGrid/XpDashboardTile.vue';

export default defineComponent({
  name: 'GoldPointsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox,
    XpNavTile,
    XpDashboardGrid,
    XpDashboardTile
  },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    animationKey: {
      type: [Number, String],
      default: 0
    }
  },
  setup() {
    const router = useRouter();
    const goToShops = () => {
      router.push({ name: 'xp-economy-dashboard-root' });
    };
    return { goToShops };
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
});
</script>

<style scoped>
/* Add any specific styles for the GoldPointsDashboard here */
.icon-colors {
  padding: 10px;
}
</style>