<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile 
        label="View Bestiary" 
        iconName="fa-hand-holding-heart" 
        color="primary"
        @click="goToBestiary" 
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="beastCount" 
        label="Total Beasts" 
        iconName="fa-dragon" 
        iconColor="primary" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="avgChecklistLength" 
        label="Avg Tasks" 
        iconName="fa-claw-marks" 
        iconColor="danger" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox 
        :value="attachedAchievements" 
        label="Linked Quests" 
        iconName="fa-link" 
        iconColor="primary" 
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
  </XpDashboardGrid>

</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import XpStatBox from '@/components/molecules/StatBox/XpStatBox.vue';
import XpNavTile from '@/components/molecules/StatGrid/XpNavTile.vue';
import XpDashboardGrid from '@/components/molecules/StatGrid/XpDashboardGrid.vue';
import XpDashboardTile from '@/components/molecules/StatGrid/XpDashboardTile.vue';
import BestiaryDb, { Beast, beastStorage } from '@/lib/databases/BestiaryDb';

export default defineComponent({
  name: 'BeastsChallengesDashboard',
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
    const beasts = ref<Beast[]>([]);
    const bestiary = new BestiaryDb(beastStorage);

    // Mock data for time-based stats
    const tamedToday = ref(2);
    const tamedThisWeek = ref(5);
    const tamedThisMonth = ref(12);

    onMounted(async () => {
      await loadBeasts();
    });

    const loadBeasts = async () => {
      beasts.value = await bestiary.getBeasts();
      
      // In the future, if 'createdAt' gets added to the Beast interface,
      // we can replace these with dynamic calculations
      // For now, we just use mock values that make sense based on total beasts
      if (beasts.value.length > 0) {
        tamedToday.value = Math.min(Math.max(1, Math.floor(beasts.value.length * 0.1)), 5);
        tamedThisWeek.value = Math.min(Math.max(2, Math.floor(beasts.value.length * 0.3)), 12);
        tamedThisMonth.value = Math.min(Math.max(4, Math.floor(beasts.value.length * 0.6)), 25);
      }
    };

    const beastCount = computed(() => beasts.value.length);
    const avgChecklistLength = computed(() => {
      if (beasts.value.length === 0) return 0;
      const totalChecklistLength = beasts.value.reduce((sum, beast) => sum + beast.checklist.length, 0);
      return Math.round(totalChecklistLength / beasts.value.length);
    });
    const attachedAchievements = computed(() => {
      return beasts.value.reduce((sum, beast) => sum + (beast.achievementIds?.length || 0), 0);
    });

    const goToBestiary = () => {
      router.push({ name: 'xp-bestiary' });
    };

    return {
      beastCount,
      avgChecklistLength,
      attachedAchievements,
      tamedToday,
      tamedThisWeek,
      tamedThisMonth,
      goToBestiary
    };
  }
});
</script>

<style scoped>
/* Add any specific styles for the BeastsChallengesDashboard here */
.icon-colors {
  padding: 10px;
}
</style>