<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpStatBox 
        :value="85" 
        label="Avg HP/Users" 
        iconName="fa-heartbeat" 
        iconColor="danger" 
        :progress="0.85"
        :forecast="0.60"
        direction="rtl"
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    
    <XpDashboardTile>
      <XpStatBox 
        :value="70" 
        label="Avg MP/Users" 
        iconName="fa-spa" 
        iconColor="tertiary" 
        :progress="0.70"
        :forecast="0.90"
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>

    <XpDashboardTile>
      <XpStatBox 
        :value="12" 
        label="HP Drop Rate" 
        ribbon="To 0: 5h 30m"
        ribbonColor="danger"
        iconName="fa-heart-rate" 
        iconColor="warning" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="8" 
        label="MP Regen Rate" 
        ribbon="To Max: 2h 15m"
        ribbonColor="success"
        iconName="fa-cauldron" 
        iconColor="secondary" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    

  </XpDashboardGrid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent } from 'vue';
import XpStatBox from '@/components/molecules/StatBox/XpStatBox.vue';
import XpDashboardGrid from '@/components/molecules/StatGrid/XpDashboardGrid.vue';
import XpDashboardTile from '@/components/molecules/StatGrid/XpDashboardTile.vue';

export default defineComponent({
  name: 'CharacterStatsDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox,
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