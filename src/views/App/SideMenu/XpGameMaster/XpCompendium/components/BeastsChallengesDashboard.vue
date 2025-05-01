<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="beastCount" label="Total Beasts" iconName="fa-paw" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="activeBeastCount" label="Active Beasts" iconName="fa-fire" iconColor="danger" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="avgChecklistLength" label="Avg Tasks per Beast" iconName="fa-check" iconColor="tertiary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="attachedAchievements" label="Achievements Attached" iconName="fa-link" iconColor="warning" />
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

    onMounted(async () => {
      await loadBeasts();
    });

    const loadBeasts = async () => {
      beasts.value = await bestiary.getBeasts();
    };

    const beastCount = computed(() => beasts.value.length);
    const activeBeastCount = computed(() => beasts.value.filter(beast => beast.checklist.length > 0).length);
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
      activeBeastCount,
      avgChecklistLength,
      attachedAchievements
    };
  }
});
</script>

<style scoped>
/* Add any specific styles for the BeastsChallengesDashboard here */
</style>