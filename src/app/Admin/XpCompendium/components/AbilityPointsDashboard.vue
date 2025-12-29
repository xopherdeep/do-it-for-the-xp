<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile 
        label="Control Powers" 
        iconName="fa-hand-holding-magic" 
        color="tertiary"
        @click="goToAbilities" 
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="totalAwarded" 
        label="AP Unlocked" 
        iconName="fa-atom" 
        iconColor="primary" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="avgPerQuest" 
        label="Avg AP/Quest" 
        iconName="fa-atom-alt" 
        iconColor="danger" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="75" 
        label="Avg AP/User" 
        iconName="fa-user-visor" 
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
  name: 'AbilityPointsDashboard',
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
    const goToAbilities = () => {
      router.push({ name: 'xp-abilities' });
    };
    return { goToAbilities };
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