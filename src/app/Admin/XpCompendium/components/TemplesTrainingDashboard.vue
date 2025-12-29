<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile 
        label="Layout Temples" 
        iconName="fa-hand-holding-water" 
        color="secondary"
        @click="goToTemples" 
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="3" 
        label="Total Temples" 
        iconName="fa-place-of-worship" 
        iconColor="primary" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="12" 
        label="Avg. Beast/Temple" 
        iconName="fa-skull" 
        iconColor="danger" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="250" 
        label="Avg. GP/Chests" 
        iconName="fa-treasure-chest" 
        iconColor="warning" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
  </XpDashboardGrid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import XpStatBox from '@/components/molecules/StatBox/XpStatBox.vue';
import XpNavTile from '@/components/molecules/StatGrid/XpNavTile.vue';
import XpDashboardGrid from '@/components/molecules/StatGrid/XpDashboardGrid.vue';
import XpDashboardTile from '@/components/molecules/StatGrid/XpDashboardTile.vue';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'TemplesTrainingDashboard',
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
    const goToTemples = () => {
      router.push({ name: 'xp-compendium-temples' });
    };
    return { goToTemples };
  }
});
</script>

<style scoped>
/* Add any specific styles for the TemplesTrainingDashboard here */
</style>
