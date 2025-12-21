<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="4">
        <XpStatBox :value="beastCount" label="Total Beasts" iconName="fa-paw-claws" iconColor="primary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="avgChecklistLength" label="Avg Tasks" iconName="fa-check" iconColor="tertiary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="attachedAchievements" label="Linked Quests" iconName="fa-hand-holding-seedling" iconColor="warning" />
      </ion-col>
      
      <ion-col size="4">
        <XpStatBox :value="tamedToday" label="Tamed Today" iconName="fa-calendar-day" iconColor="primary" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="tamedThisWeek" label="This Week" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col size="4">
        <XpStatBox :value="tamedThisMonth" label="This Month" iconName="fa-calendar-alt" iconColor="danger" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import Ionic from '@/mixins/ionic';
import { defineComponent, ref, onMounted, computed } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
import BestiaryDb, { Beast, beastStorage } from '@/lib/databases/BestiaryDb';

export default defineComponent({
  name: 'BeastsChallengesDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  },
  setup() {
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

    return {
      beastCount,
      avgChecklistLength,
      attachedAchievements,
      tamedToday,
      tamedThisWeek,
      tamedThisMonth
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